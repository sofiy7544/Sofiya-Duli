# Phone Check — сверка номеров клиентов с CRM

Веб-приложение для конца рабочего дня. Менеджер загружает CSV/XLSX с телефонами, система
нормализует номера (E.164), убирает дубликаты и находит клиентов в **собственной CRM магазина**.
Для каждого номера она показывает ФИО, Customer ID и каналы связи (Facebook/Messenger, Telegram, Viber, WhatsApp),
которые клиент сам оставил магазину, а также источник данных и дату согласия.

> Приложение не обращается к внешним сервисам: не парсит Facebook, не делает reverse lookup,
> не использует утечки и неофициальные базы и не обогащает профили. Номер сверяется только с данными CRM.
> Это гарантирует тест `tests/unit/no-external-lookups.test.ts`, а в Docker у worker нет выхода в интернет.

Архитектура, структура БД, data flow и разбор рисков описаны в [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Возможности

- Загрузка CSV (`,` `;` `Tab` `|`, UTF-8/UTF-16/cp1251) и XLSX до 25 МБ / 200 000 строк. Колонка телефона
  определяется по заголовку («Телефон», «Phone», «Mobile»…) или по содержимому.
- Нормализация через `libphonenumber-js`: E.164, страна, проверка валидности. Номера без кода страны
  дополняются `DEFAULT_REGION`. Дубликаты считаются по E.164, для каждого сохраняется число повторов.
- Фоновая обработка (pg-boss в той же PostgreSQL). Пакетный поиск по слепому индексу: 100 000 строк
  обрабатываются примерно за 5 секунд.
- Итоговая таблица: Phone, Country, Customer ID, Full Name, Facebook, Telegram, Viber, WhatsApp, Source,
  Consent status, Match confidence, Status. Виртуализация и серверная пагинация: в DOM около 30 строк
  при любом объёме, фильтры по статусу, поиск по номеру и Customer ID.
- Статусы: **Exact match**, **Multiple matches**, **Needs manual review**, **Not found**, **Invalid phone**.
- Экран ручной проверки: все данные кандидатов (телефоны и отметка подтверждения, источники, каналы,
  согласия), подтверждение или отклонение с комментарием, переход к следующей записи в очереди.
- Правка карточки клиента (ФИО, email, согласие, каналы). Каждое изменение пишется в аудит.
- Экспорт XLSX: `Phone | Full Name | Customer ID | Facebook | Telegram | Status`. Потоковая запись,
  учитывает текущий фильтр.
- Журнал аудита (append-only): кто и когда загрузил файл, какие номера проверялись (в маске),
  какие записи найдены, кто подтвердил совпадение, кто изменил данные, экспорт, просмотры карточек, входы.
  Есть поиск «когда проверялся номер».
- Роли **Admin / Manager / Viewer**, светлая и тёмная темы.

### Роли

| Действие | Admin | Manager | Viewer |
|---|:-:|:-:|:-:|
| Смотреть пакеты и результаты, открывать карточку проверки | ✓ | ✓ | ✓ |
| Загружать файлы | ✓ | ✓ | |
| Подтверждать / отклонять совпадения | ✓ | ✓ | |
| Экспорт XLSX | ✓ | ✓ | |
| Изменять данные клиента | ✓ | ✓ | |
| Удалять пакеты | ✓ | | |
| Журнал аудита, пользователи | ✓ | | |

### Как считается Match confidence

| Ситуация | Статус | Confidence |
|---|---|---|
| Один клиент, номер подтверждён | Exact match | 100 (95, если код страны подставлен по умолчанию) |
| Один клиент, номер не подтверждён | Needs manual review | 75 |
| Один клиент, номер помечен неактуальным | Needs manual review | 60 |
| Несколько клиентов с этим номером | Multiple matches | 100 / N |
| Клиента нет (или он удалён/объединён) | Not found | 0 |
| Номер не разобран или не существует | Invalid phone | — |
| Решение менеджера | Exact match / Not found | 100 / 0 |

Каналы с отозванным согласием не показываются в таблице и не попадают в экспорт.

## Быстрый старт (Docker)

```bash
cd phone-check
cp .env.example .env
# Заполните ключи и пароль БД:
#   DATA_ENCRYPTION_KEY=$(openssl rand -base64 32)
#   BLIND_INDEX_KEY=$(openssl rand -base64 32)
#   POSTGRES_PASSWORD=<надёжный пароль>
docker compose up -d --build

# Демо-данные: 2000 вымышленных клиентов и 3 пользователя (пароль demo-Passw0rd-2026)
docker compose --profile demo run --rm seed
# Или первый администратор для боевой установки:
docker compose run --rm web node dist/scripts/create-admin.js admin@shop.ua "Имя" admin 'длинный-пароль-123'
```

Приложение откроется на http://localhost:3000. Демо-вход: `admin@example.com`, `manager@example.com`,
`viewer@example.com`. Для проверки загрузите `samples/phones-demo.csv` или `samples/phones-demo.xlsx`.

Состав: `db` (PostgreSQL 16), `migrate` (одноразовые миграции), `web` (Next.js), `worker` (фоновые задания).
Сеть `backend` внутренняя, поэтому у worker и БД нет выхода в интернет. Контейнеры запускаются read-only, без capabilities.
Если Docker Hub недоступен: `docker compose build --build-arg NODE_IMAGE=<зеркало>/node:22-alpine`.

## Локальная разработка

Нужны Node.js ≥ 22.12 и PostgreSQL ≥ 14.

```bash
cd phone-check
npm ci
cp .env.example .env            # DATABASE_URL и два ключа
set -a; . ./.env; set +a
npm run db:migrate
npm run db:seed                 # демо-клиенты и пользователи
npm run sample:generate         # samples/phones-demo.csv и .xlsx (совпадают с seed)
npm run sample:generate -- 100000   # нагрузочный файл на 100 000 строк
npm run dev                     # http://localhost:3000
npm run worker                  # во втором терминале
```

### Тесты

```bash
npm run typecheck
npm run test:unit               # нормализация, матчинг, шифрование, парсинг файлов, безопасность ссылок
TEST_DATABASE_URL=postgres://app:app@localhost:5432/phonecheck_test npm run test:integration
```

Интеграционные тесты пересоздают схему в тестовой БД и проверяют сквозной сценарий: загрузку, обработку,
результаты, ручную проверку, экспорт, аудит, очистку, роли, CSRF и защиту от перебора паролей.
На GitHub их запускает workflow `.github/workflows/phone-check.yml`.

## Данные CRM

Клиенты хранятся в таблицах `customers`, `customer_phones`, `customer_channels` и синхронизируются из CRM бизнеса:

```bash
npm run crm:import -- export.jsonl    # одна запись на строку (формат CrmCustomerInput)
npm run crm:import -- export.csv      # customer_id, full_name, email, status, source, consent_status,
                                      # consent_at, consent_source, phones ("|" между номерами),
                                      # phone_verified, facebook, messenger, telegram, viber, whatsapp
```

Импорт идемпотентен: upsert по Customer ID. Номера нормализуются так же, как при проверке.
Импортируйте только данные, которые клиент сам предоставил магазину.

## Конфигурация

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `DATABASE_URL` | — | Подключение к PostgreSQL |
| `DATA_ENCRYPTION_KEY` | — | 32 байта base64, AES-256-GCM для ПДн и загруженных файлов |
| `DATA_ENCRYPTION_KEY_VERSION` | `v1` | Версия текущего ключа (для ротации) |
| `DATA_ENCRYPTION_KEYS_OLD` | — | Старые ключи `v1:BASE64,v2:BASE64`: читаются, но не используются для записи |
| `BLIND_INDEX_KEY` | — | 32 байта base64, HMAC для поиска по номеру. **Не менять** без переиндексации |
| `DEFAULT_REGION` | `UA` | Страна для номеров без международного кода |
| `MAX_UPLOAD_MB` / `MAX_ROWS` | `25` / `200000` | Лимиты файла |
| `UPLOAD_BLOB_TTL_MINUTES` | `60` | Страховочный срок хранения необработанного файла |
| `RESULT_RETENTION_DAYS` | `30` | Срок хранения результатов (аудит хранится дольше) |
| `SESSION_TTL_HOURS` | `12` | Скользящий срок сессии |
| `COOKIE_SECURE` | `false` | `true` за HTTPS: cookie `Secure`, CSP `upgrade-insecure-requests` |
| `WORKER_CONCURRENCY` | `2` | Сколько файлов worker обрабатывает параллельно |

## Эксплуатация и безопасность

- **HTTPS обязателен** в продакшене. Ставьте reverse proxy (nginx, Caddy, Traefik) с `COOKIE_SECURE=true`.
  Прокси должен перезаписывать `X-Forwarded-For`, иначе IP в аудите и лимит попыток входа по IP можно подделать.
  Лимит по email при этом работает всегда.
- **Ключи**: храните их в секрет-менеджере, отдельно от бэкапов БД. Без `DATA_ENCRYPTION_KEY` бэкап бесполезен
  для злоумышленника, но и для вас. Сохраните ключи в двух надёжных местах.
- **Ротация ключа шифрования**: новый ключ ставится в `DATA_ENCRYPTION_KEY` с `DATA_ENCRYPTION_KEY_VERSION=v2`,
  старый переносится в `DATA_ENCRYPTION_KEYS_OLD=v1:...`. Новые данные пишутся новым ключом.
- **Хранение**: загруженный файл удаляется сразу после разбора (и по TTL, если обработка не состоялась).
  Результаты удаляются через `RESULT_RETENTION_DAYS`. Журнал аудита и маски номеров остаются.
- **Аудит** защищён триггерами от `UPDATE`/`DELETE`/`TRUNCATE`. Для удаления по регламенту триггер отключает DBA.
- Заголовки: CSP с nonce, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, HSTS.

## Структура

```
phone-check/
  db/migrations/          SQL-миграции
  docs/ARCHITECTURE.md    архитектура, БД, data flow, риски
  samples/                тестовые файлы
  src/app/                страницы и API (Next.js App Router)
  src/components/         оболочка, UI-элементы
  src/lib/                общий код: нормализация, типы, форматирование, ссылки каналов
  src/server/             конфигурация, БД, шифрование, очередь, сервисы
  src/worker/main.ts      фоновый процесс
  src/scripts/            миграции, seed, импорт CRM, создание пользователя, генерация примеров
  tests/unit, tests/integration
```
