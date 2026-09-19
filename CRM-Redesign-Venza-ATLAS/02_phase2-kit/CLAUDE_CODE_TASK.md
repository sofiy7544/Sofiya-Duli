# Поручение для Claude Code на сервере — Phase 0 → Phase 2

Контекст: редизайн CRM, 6 тем (Стандарт, Светлая, Тёмная, Сепия, ATLAS, Venza). ТЗ — пакет CRM_REDESIGN_COMPLETE_FOR_CLAUDE.
Архитектор подготовил код в `redesign-phase2-kit/` в изолированном окружении. **В CRM ничего не внедрено, пока ты не применишь это в настоящем репозитории.**

## Источники истины
- **Функциональность** (маршруты, API, роли, флаги, валидация, стадии): реальный код репозитория.
- **Дизайн** (токены, типографика, motion, композиция): MASTER_HANDOFF + PREMIUM_POLISH_DIRECTIVE.
- При расхождении с документацией адаптируй код пакета под реальный код и запиши расхождение в отчёт.

## Утверждённые решения пользователя
1. **Контраст — строго WCAG AA.** Токены уже скорректированы минимально (Светлая primary #006FE5, Сепия primary #A6541D и accent #B85227, ATLAS danger #C94848, Venza muted-fg #6A6F6A и danger #C44D47, текстовые `*-text` для статусов). Любое изменение цвета → `python3 tools/contrast-gate.py` должен вывести `AA FAILS: 0`.
2. **Темы: только ATLAS (по умолчанию), Сепия и Venza.** «Стандарт», «Светлая» и «Тёмная» удалены из селектора; сохранённые значения мигрируют в ATLAS; класс `.dark` больше не выставляется.
3. **Мобильная навигация одинакова во всех темах:** Сегодня · Лиды · Объекты · Задачи · Ещё. «Ещё»: Клиенты, Сделки, Календарь, Заметки, Коммуникации, Команда, Отчёты, Настройки. Отличается только оформление. Гейты — как в реальном коде (по документации: Отчёты и Команда — ADMIN, Коммуникации — `NEXT_PUBLIC_INTEGRATIONS_ENABLED`). Если в коде гейты другие, бери реальные и укажи в отчёте.

## ЗАПРЕЩЕНО
push, merge, deploy, pm2 restart продакшена, `git reset --hard`, `git clean -fd`, изменения в `apps/api`, `packages/shared`, Prisma schema, `.env`.

## Шаг 0 — read-only аудит (ничего не менять). Вывести ВЕСЬ вывод:
```bash
cd <корень монорепо>
git status
git branch --show-current
git log -1 --oneline
git diff --stat; git diff --staged --stat
git stash list
cat apps/web/package.json | head -60
ls apps/web/src/components apps/web/src/components/ui apps/web/src/lib
sed -n 1,200p apps/web/src/components/theme-provider.tsx
sed -n 1,120p apps/web/src/components/theme-toggle.tsx
sed -n 1,120p apps/web/src/app/layout.tsx
cat apps/web/tailwind.config.ts
sed -n 1,60p apps/web/src/app/globals.css
grep -rn "useTheme" apps/web/src --include=*.tsx | head -40
grep -rn "midnight\|graphite\|arctic\|lavender" apps/web/src --include=*.ts* | grep -v messages | head
grep -rn "themes\|theme" apps/web/src/messages/ru.json | head
```
Если есть незакоммиченные изменения — ОСТАНОВИСЬ и сообщи, ничего не коммить.
Сравни реальные файлы с путями из `docs/PHASE0_AUDIT.md`; расхождения — в отчёт.

## Шаг 1 — ветка
```bash
git switch -c redesign/venza-atlas || git switch -c redesign/venza-atlas-$(date +%Y%m%d)
```

## Шаг 2 — применить фундамент тем
1. Скопировать новые файлы: `src/lib/theme/themes.ts`, `src/lib/theme/bootstrap.ts`, `src/styles/themes.css`, `src/components/theme-picker.tsx`.
2. `theme-provider.tsx`: заменить. **Сохранить публичный API**, который реально используется (по grep `useTheme`): если потребители читают поля с другими именами — добавить алиасы в контекст, а не менять потребителей массово.
3. `theme-toggle.tsx`: заменить; проверить реальные экспорты `ui/dropdown-menu` и `ui/button` (имена/size="icon").
4. `layout.tsx`: по `app/layout.patch.md` (bootstrap + next/font). Если build не может скачать шрифт — `next/font/local` и сообщить.
5. `tailwind.config.ts`: влить `tailwind.theme-extend.ts` в `theme.extend` (не удалять существующие ключи, кроме конфликтующих одноимённых — их заменить).
6. `globals.css`: подключить `styles/themes.css` ПОСЛЕ существующих блоков тем. Легаси-блоки не удалять в этой фазе.
7. `sonner-toaster.tsx`: по `ui/sonner-toaster.patch.md`.
8. `messages/*.json`: добавить неймспейс `themes` из `i18n/themes.messages.json` во все 5 локалей.
9. Settings: если есть раздел темы/профиля — встроить `<ThemePicker />`.
10. Навигация: `src/lib/navigation/mobile-nav.ts` + `src/components/navigation/mobile-nav.tsx`. В `(app)/layout.tsx` заменить старый `MobileNav` на новый, передав роль из текущего auth-store (`<MobileNav role={user?.role} />`). Сверь маршруты и гейты с `sidebar.tsx` / `mobile-drawer.tsx`. Старый `mobile-nav.tsx` не удалять до конца QA — только отключить импорт. Проверь, что `/tasks` существует, а контент не перекрывается (`pb-mobile-nav`).
11. `messages/*.json`: добавить неймспейс `mobileNav` из `i18n/mobile-nav.messages.json`.

## Шаг 3 — проверки
```bash
pnpm --filter web lint
pnpm --filter web exec tsc --noEmit
pnpm --filter web build        # в отдельной папке сборки / НЕ перезапускать PM2
pnpm --filter web test || echo "тестов нет"
```
Память VPS 3.8 ГБ: если build падает по OOM — `NODE_OPTIONS=--max-old-space-size=2048`, не останавливать прод.

Ручной smoke (dev-сервер на свободном порту, не 3000 прода): Стандарт → Светлая → Тёмная → Сепия → ATLAS → Venza → reload. Проверить: маршрут не меняется, `.dark` снимается на ATLAS/Venza, выбор переживает reload, в селекторе ровно 6 тем, в localStorage с `graphite` → становится `dark`.

Дополнительно:
```bash
python3 redesign-phase2-kit/tools/contrast-gate.py   # AA FAILS: 0
node redesign-phase2-kit/docs/theme-model.test.js    # логика тем (после сборки build/ — см. комментарий в файле)
```
Smoke навигации на 390px: 5 пунктов во всех 6 темах; REALTOR не видит Команду и Отчёты; с выключенным флагом нет Коммуникаций; `/clients/1` подсвечивает «Ещё»; `/pipeline` подсвечивает «Лиды».

## Шаг 4 — коммит (без push)
```bash
git status && git diff --stat
git diff --cached | grep -niE "api[_-]?key|secret|password=|token=|BEGIN .*PRIVATE" && echo "STOP: секрет" 
git add apps/web/src apps/web/tailwind.config.ts
git commit -m "feat(theme): add six-theme CRM design system"
git log -1 --oneline
```

## Шаг 5 — если всё зелёное, продолжай без остановки на мелких шагах
Phase 3 → 4 → 5 → 6 → 7 → 8 по MASTER HANDOFF §23. Каждая фаза = отдельный коммит (§27), перед каждым коммитом: lint + tsc + build + contrast-gate.
- **Phase 3 (примитивы):** Button, Input/Textarea, Select, DropdownMenu, Dialog, Sheet→единый BottomSheet/SidePanel, Card (одна система теней), Badge с dark-вариантами и `*-text`, Skeleton, EmptyState/ErrorState, Toast. Новые: SegmentedControl (заменить ~11 вариантов), Checkbox, Switch, Alert, Table. **Публичные props сохранять.** Сырые палитры (`bg-white`, `*-50`) в затронутых файлах → токены.
- **Phase 4 (оболочки):** Classic — текущий shell без регрессий; ATLAS — тёмный сайдбар 220–240px; Venza — светлый rail 230–240px. Topbar на мобиле разгрузить (тема и язык — в «Ещё/Настройки»). Один H1 на страницу.
- **Phase 5+:** экраны в порядке §23, формы, оверлеи, motion, reduced motion, responsive 320–1440.
Остановиться и спросить пользователя только если: нужна правка backend/schema/API; конфликт дизайна с обязательной функциональностью без очевидного решения; build на VPS не проходит по ресурсам.

## Отчёт архитектору (строго)
baseline branch · baseline commit · были ли незакоммиченные изменения · расхождения документации с кодом · новый коммит · diff --stat · результаты lint/tsc/build/test · что не удалось · `NOT DEPLOYED`.
