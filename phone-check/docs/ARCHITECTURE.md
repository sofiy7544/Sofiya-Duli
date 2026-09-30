# Архитектура Phone Check

## 1. Контекст и изученный проект

Репозиторий `Sofiya-Duli` — статический сайт на GitHub Pages (`build/*.py` → HTML) и
собранный клиентский SPA `crm/`. Серверной части, базы данных и API в репозитории нет.
Поэтому приложение живёт отдельно, в каталоге `phone-check/`, и не влияет на выкладку сайта
(каталог исключён из workflow Pages). CRM-данные приложение хранит в своих таблицах
`customers*`. Их наполняет импорт из CRM бизнеса (`npm run crm:import`) или seed для демо.

```
┌────────────┐   HTTPS    ┌──────────────────────┐  SQL   ┌──────────────┐
│  Браузер   │──────────▶│ web: Next.js 16       │──────▶│ PostgreSQL 16 │
│ React 19   │◀──────────│ UI + Route Handlers   │       │  app schema   │
└────────────┘           └──────────┬───────────┘       │  pgboss schema│
                                    │ pg-boss.send       └──────▲───────┘
                                    ▼                           │
                         ┌──────────────────────┐   SQL          │
                         │ worker: Node 22       │───────────────┘
                         │ разбор файла, матчинг │   (нет доступа в интернет)
                         └──────────────────────┘
```

* **web**: Next.js App Router, TypeScript. Страницы и API (`src/app/api/**`). Бизнес-логика
  лежит в `src/server/**` и не зависит от HTTP, поэтому её покрывают тесты.
* **worker**: отдельный процесс, очередь pg-boss (в той же PostgreSQL, Redis не нужен).
  Разбирает файлы, нормализует номера, сопоставляет их с CRM и чистит данные по расписанию.
* **PostgreSQL**: единственное хранилище, включая очередь заданий.

## 2. Структура БД

Все персональные данные зашифрованы на уровне приложения (AES-256-GCM, колонки `*_enc`).
Поиск по телефону работает через слепой индекс `phone_hash = HMAC-SHA256(BLIND_INDEX_KEY, E.164)`.

| Таблица | Назначение | Ключевые поля |
|---|---|---|
| `users` | Сотрудники | `email` (unique, citext), `password_hash` (scrypt), `role` ∈ admin/manager/viewer, `is_active` |
| `sessions` | Сессии | `token_hash` (sha256 от cookie), `user_id`, `expires_at`, `last_seen_at` |
| `login_attempts` | Защита от перебора | `email`, `ip`, `success`, `at` |
| `customers` | Клиенты из CRM | `customer_ref` (Customer ID, unique), `full_name_enc`, `email_enc`, `status` ∈ active/merged/deleted, `source`, `consent_status` ∈ granted/withdrawn/unknown, `consent_at`, `consent_source`, `updated_by` |
| `customer_phones` | Телефоны клиента | `customer_id`, `phone_hash` (index), `phone_enc`, `country`, `is_verified`, `is_active`, `source`, `collected_at`; unique(`customer_id`,`phone_hash`) |
| `customer_channels` | Каналы, которые клиент дал сам | `customer_id`, `channel` ∈ facebook/messenger/telegram/viber/whatsapp, `value_enc`, `source`, `consent_status`, `consent_at`; unique(`customer_id`,`channel`) |
| `batches` | Загрузки | `created_by`, `file_name`, `file_size`, `status` ∈ queued/processing/completed/failed/expired, `total_rows`, `processed_rows`, `unique_phones`, `duplicate_rows`, `error`, `expires_at` |
| `upload_blobs` | Временный файл | `batch_id`, `content_enc`. Удаляется сразу после разбора; страховочная очистка по TTL |
| `check_results` | Строка результата | `batch_id`, `row_number`, `occurrences`, `raw_input_enc`, `phone_enc`, `phone_hash`, `country`, `status`, `confidence`, `customer_id`, `candidate_ids uuid[]`, `match_reason`, `review_decision`, `reviewed_by`, `reviewed_at`, `review_note_enc` |
| `audit_log` | Журнал аудита (append-only) | `at`, `actor_id`, `actor_email`, `action`, `entity_type`, `entity_id`, `details jsonb`, `ip`, `user_agent` |
| `audit_batch_items` | Какие номера проверялись и что найдено | `audit_id`, `batch_id`, `phone_masked`, `phone_hash`, `status`, `customer_id` (append-only, переживает удаление результатов) |

Триггеры запрещают `UPDATE`/`DELETE` в `audit_log` и `audit_batch_items`.
Удаление возможно только при сознательном отключении триггера администратором БД.

Статусы результата: `exact_match`, `multiple_matches`, `not_found`, `invalid_phone`, `needs_review`.

### Правила сопоставления и уверенность (Match confidence)

| Ситуация | Статус | Confidence |
|---|---|---|
| Номер не разобран или невалиден для страны | Invalid phone | — |
| Нет активного клиента с таким `phone_hash` | Not found | 0 |
| Один клиент, телефон подтверждён и активен | Exact match | 100 (95, если страна взята по умолчанию, а не из номера) |
| Один клиент, телефон не подтверждён | Needs manual review | 75 |
| Один клиент, телефон помечен как неактуальный | Needs manual review | 60 |
| Несколько разных клиентов | Multiple matches | 100 / N |
| Ручное подтверждение менеджером | Exact match | 100 (`review_decision = confirmed`) |
| Ручное отклонение | Not found | 0 (`review_decision = rejected`) |

Клиенты со статусом `merged`/`deleted` в сопоставлении не участвуют.
Каналы с `consent_status = withdrawn` не показываются в таблице и не попадают в экспорт.

## 3. Data flow

1. **Загрузка.** `POST /api/batches` (роль Admin/Manager, проверка Origin). Проверяются
   размер (≤ `MAX_UPLOAD_MB`), расширение и сигнатура (XLSX = ZIP `PK\x03\x04`, CSV = текст
   без NUL-байтов). Файл шифруется и пишется в `upload_blobs`. В той же транзакции создаются
   `batches` (queued) и запись аудита `batch.uploaded`. После коммита задание уходит в pg-boss.
2. **Разбор (worker).** Файл расшифровывается в память, `upload_blobs` удаляется сразу.
   CSV читается потоково (`csv-parse`), разделитель определяется автоматически. XLSX читается
   потоково (`exceljs` WorkbookReader). Колонка телефона находится по заголовку
   (phone/телефон/тел/номер/mobile/whatsapp…), иначе берётся первая колонка.
3. **Нормализация.** `libphonenumber-js/max`: E.164, страна, валидность. Номер без `+`
   разбирается с `DEFAULT_REGION`; `00…` превращается в `+…`. Дубликаты считаются по E.164,
   невалидные — по очищенной строке. Для дубликата сохраняется первая строка и число повторов.
4. **Сопоставление.** Пачками по 1000 хешей: `customer_phones ⨝ customers`
   `WHERE phone_hash = ANY($1) AND customers.status = 'active'`.
5. **Запись.** Результаты вставляются пачками по 1000 строк, вместе с ними пишется
   `audit_batch_items`. Прогресс обновляется в `batches`, UI опрашивает его раз в 1,5 с.
6. **Итог.** `batch.processed` в аудит (счётчики по статусам). При ошибке `batch.failed`,
   а файл удаляется в любом случае.
7. **Просмотр.** `GET /api/batches/:id/results?offset&limit&status&q` — постраничная выдача
   по 200 строк. Расшифровка идёт только для видимой страницы. Таблица виртуализирована
   (`@tanstack/react-virtual`): в DOM держится около 40 строк при любом объёме.
8. **Ручная проверка.** `GET /api/results/:id` показывает все данные кандидатов (аудит
   `customer.viewed`). `POST /api/results/:id/review` подтверждает или отклоняет
   (аудит `match.confirmed` / `match.rejected`).
9. **Экспорт.** `GET /api/batches/:id/export` отдаёт потоковый XLSX (`exceljs` stream writer),
   данные читаются курсором по 2000 строк. Аудит `batch.exported`.
10. **Очистка (cron в worker, каждые 10 минут).** Удаляются просроченные `upload_blobs`
    (> `UPLOAD_BLOB_TTL_MINUTES`) и результаты пакетов старше `RESULT_RETENTION_DAYS`
    (пакет становится `expired`). Удаляются истёкшие сессии. Аудит не удаляется.

## 4. Потенциальные проблемы безопасности и меры

| Риск | Мера |
|---|---|
| Утечка ПДн из БД или бэкапа | AES-256-GCM для ФИО, email, телефонов, каналов, заметок и файлов; ключи только в env; версия ключа в шифротексте для ротации |
| Поиск по зашифрованному телефону | Слепой индекс HMAC с отдельным ключом, без детерминированного шифрования |
| Долгое хранение загруженных файлов | Файл удаляется сразу после разбора; TTL-очистка; результаты удаляются по сроку |
| Перебор паролей | scrypt (N=2^15), блокировка после 5 неудач за 15 минут по email и по IP, одинаковое сообщение об ошибке |
| Кража сессии | Случайный 256-битный токен, в БД хранится только sha256; `HttpOnly`, `SameSite=Lax`, `Secure` за HTTPS; скользящее истечение; выход удаляет сессию |
| CSRF | SameSite cookie + проверка `Origin`/`Host` на всех изменяющих запросах |
| XSS | React-экранирование; строгий CSP с nonce; ссылки на каналы строятся только из сохранённого значения и только со схемой `https:` к известным доменам (facebook.com, m.me, t.me, wa.me, viber) |
| Эскалация привилегий | Проверка роли на сервере в каждом обработчике (`requireRole`); Viewer только читает; экспорт, загрузка и проверка — Admin/Manager; пользователи и аудит — Admin |
| IDOR | UUID-идентификаторы; каждый запрос проверяет сессию и роль; все объекты — внутри одного магазина (одна организация на инсталляцию); удаление пакета — только Admin |
| Вредоносный файл (zip-бомба, огромный CSV) | Лимит размера, лимит строк (`MAX_ROWS`), потоковый разбор, лимит длины ячейки |
| Formula/CSV injection при экспорте | XLSX пишет значения строго как строки; значения, начинающиеся с `= + - @`, дополнительно экранируются апострофом (кроме E.164 в колонке Phone) |
| Подмена аудита | append-only триггеры; актор и IP фиксируются на сервере |
| Нецелевое использование (reverse lookup) | Сопоставление только с собственной CRM; в коде нет исходящих HTTP-запросов (это проверяет тест); worker в Docker-сети без выхода в интернет; каналы только из CRM; отозванное согласие скрывает канал |
| Утечка через логи | В логи не пишутся телефоны и ФИО, только идентификаторы и счётчики |
| SQL-инъекции | Только параметризованные запросы `pg` |

## 5. Что приложение принципиально не делает

* Не обращается к Facebook/Meta, Telegram, Viber, WhatsApp и другим внешним сервисам.
* Не ищет владельца номера во внешних источниках, утечках или неофициальных базах.
* Не создаёт и не обогащает профили: показывает только то, что уже есть в CRM.
