# Phase 0 — аудит (документация ↔ ТЗ). Статус: ЧАСТИЧНЫЙ

## Что проверено, а что нет
| Пункт | Статус |
|---|---|
| Пакет CRM_REDESIGN_COMPLETE_FOR_CLAUDE.zip (30 файлов) прочитан в порядке 00_START_HERE | ✅ |
| Референсы Venza / ATLAS / запись текущей CRM (кадры видео) просмотрены | ✅ |
| Текущая ветка, baseline commit, `git status`, незакоммиченные изменения | ❌ **нет доступа к репозиторию из чата** — выполняет Claude Code на сервере (см. CLAUDE_CODE_TASK.md, шаг 0) |
| Сверка путей с реальным кодом | ❌ по той же причине; ниже — пути ИЗ ДОКУМЕНТАЦИИ, их нужно подтвердить |

⚠ Риск рассинхрона: документация снята со сборки от 2026-08-19. На сервере были hotfix-патчи, не попавшие в архивы (auth cookie, uploads). Перед правками обязательно `git status` + сверка, что репозиторий = то, что крутится в PM2.

## Frontend-структура (по документации)
pnpm-монорепо → `apps/web` (Next.js 15.5 App Router, React 19, Tailwind 3.4.19 + tailwindcss-animate, Radix, cva, sonner, cmdk, framer-motion, dnd-kit, tiptap, next-intl 3.26, zustand). Общие Zod-схемы — `packages/shared`. API — NestJS (НЕ трогаем).

## Файлы, которые меняются (план)
**Phase 2 — фундамент тем (код готов в этом пакете)**
- `apps/web/src/components/theme-provider.tsx` — 6 тем, family, system-listener, миграция легаси
- `apps/web/src/components/theme-toggle.tsx` — ровно 6 тем
- `apps/web/src/components/theme-picker.tsx` — НОВЫЙ, общий для Topbar и Settings
- `apps/web/src/lib/theme/themes.ts`, `bootstrap.ts` — НОВЫЕ
- `apps/web/src/app/layout.tsx` — bootstrap-скрипт, шрифты
- `apps/web/src/app/globals.css` + НОВЫЙ `src/styles/themes.css`
- `apps/web/tailwind.config.ts` — маппинг токенов
- `apps/web/src/components/ui/sonner-toaster.tsx` — dark по `isDark`
- `apps/web/src/messages/{ru,uk,en,fr,it}.json` — неймспейс `themes`

**Phase 3 — примитивы:** `components/ui/{button,input,textarea,select,dropdown-menu,dialog,sheet,slide-over,card,badge,avatar,skeleton,empty-state,confirm-dialog}.tsx` + новые `tabs/segmented-control`, `checkbox`, `switch`, `alert`, `table`, `bottom-sheet`
**Phase 4 — оболочки:** `(app)/layout.tsx`, `sidebar.tsx`, `topbar.tsx`, `mobile-nav.tsx` (4→5 пунктов с «Ещё»), `mobile-drawer.tsx`
**Phase 5 — экраны:** `app/(app)/{today,leads,clients,properties,deals,tasks,calendar,notes,reports,settings,profile}/**`, `app/login/*`
**Домашние цветовые карты:** `lib/stage-style.ts`, `lib/calendar.ts`, `lib/lead-urgency.ts`

## Расхождения ТЗ ↔ текущий код (из документации)
1. ТЗ: 6 тем. Код: 10 (`light, dark, sepia, midnight, arctic, graphite, ocean, lavender, rose, system`). → миграция сохранённых значений (midnight/graphite→dark, остальные→light), без потери выбора пользователя.
2. No-flash скрипт знает 5 тем, провайдер — 10; graphite тёмная в провайдере, но не в скрипте. → единый источник `themes.ts`.
3. `--surface-2`, `--primary-soft` не смаплены в Tailwind; `bg-card`, `text-destructive`, `/8`, `h-4.5` не генерируют CSS. → исправлено маппингом (проверено сборкой Tailwind).
4. Две системы теней (`<Card>` static vs `.surface-card` var). → одна, через var.
5. Шрифт: Inter не загружается вообще (`--font-inter` не определена). → next/font для ATLAS/Venza; classic остаётся system-ui.
6. ТЗ §11: нижняя навигация «Сегодня · Лиды · Объекты · Задачи · Ещё». Код: 4 пункта «Today · Pipeline · Contacts · Calendar». → в Venza/ATLAS 5 пунктов; все прежние маршруты доступны через «Ещё». Classic — оставить текущий состав (регрессия), либо тоже 5 — **нужно ваше решение**.
7. ТЗ §7.2 Venza: погода — только при реальном источнике. В CRM источника погоды нет → блок погоды не показывается (feature-gate), фейковых данных не будет.
8. ТЗ §7.17 Коммуникации: `NEXT_PUBLIC_INTEGRATIONS_ENABLED=false` → Telegram/WhatsApp из референса ATLAS в сайдбаре НЕ показываются.
9. Референс ATLAS показывает «Аренда» — в CRM сделки только BUY. Не добавляем.
10. Стадии в ТЗ ATLAS (new…lost, 8 шт.) ⊂ стадий кода (11, вкл. APPRAISAL/AGREEMENT/LISTING). Недостающим цветам ATLAS даю производные мягкие тона; набор стадий не меняется.

## Контраст (WCAG AA) — ИСПРАВЛЕНО по решению пользователя
Минимальные коррекции, характер тем сохранён. Автопроверка 70 пар текст/фон × 5 палитр: `tools/contrast-gate.py` → `AA FAILS: 0`.
| Тема | Было | Стало | Причина |
|---|---|---|---|
| Светлая | primary #007BFF | #006FE5 | белый на кнопке 4.0 → 4.8; ссылки на фоне ≥ 4.5 |
| Сепия | primary #B65C20 | #A6541D | текст на кнопке 4.4 → 4.8; primary-текст на фоне 4.3 → 4.6 |
| Сепия | accent #D25E2D | #B85227 | текст на accent 3.7 → 4.6 |
| Тёмная | accent-foreground #FFF | #0B111E | белый на #A588FC 2.8 → 6.8 |
| ATLAS | danger #D45656 | #C94848 (+ текст #C74040) | 4.0 → 4.7 |
| Venza | muted-fg #757B75 | #6A6F6A | 3.9 на фоне → 4.7 |
| Venza | danger #C6534D | #C44D47 (+ текст #C0443E) | 4.4 → 4.6 |
| Все | статусы success/warning | заливка без изменений + токены `*-text` | жёлтый/зелёный текст был 2.3–3.3 |

## Мобильная навигация — РЕШЕНО
Одинаковые 5 пунктов во всех темах; «Ещё» — 8 разделов с текущими гейтами ролей и флагов. Легаси-URL подсвечивают правильный пункт (исправляет баги §10.14 и §10.18). 8 тестов логики пройдены.
