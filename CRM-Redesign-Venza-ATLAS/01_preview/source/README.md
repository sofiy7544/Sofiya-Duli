# CRM Design Preview 1 — Venza + ATLAS

Кликабельный frontend-прототип для дизайн-ревью. **Не production.** Backend, API, БД и серверы не затрагиваются: все данные — локальные фикстуры.

## Запуск
```bash
npm install
npm run dev          # http://localhost:5173
```
Сборка: `npm run build` → `dist/`, затем `npm run preview` (http://localhost:4173).
Один самодостаточный HTML: `SINGLE=1 npx vite build`.
Проверка контраста токенов: `npm run contrast` (ожидается `AA FAILS: 0`).

## Как смотреть
- Вход: любой пароль от 8 символов. `wrongpass` — ошибка входа, `toomany12` — лимит попыток.
- Язычок у левого края экрана открывает панель превью: 6 тем, состояние данных (данные / загрузка / пусто / ошибка), роль (администратор / риелтор), флаг интеграций, скорость сети, сброс.
- Тема сохраняется в localStorage (`crm-preview-theme`).

## Для разработчиков: перенос в CRM
| Превью | Реальная CRM |
|---|---|
| `src/lib/mock/api.ts` | `apps/web/src/lib/api.ts` — у каждой функции в комментарии endpoint; формы ответов совпадают |
| `src/lib/mock/types.ts` | `packages/shared` (Zod-схемы, enums) |
| `src/lib/router.tsx` (`Link`, `usePathname`) | `next/link`, `next/navigation` — пути маршрутов совпадают |
| `src/screens/*` | `app/(app)/<route>/page.tsx` |
| `src/lib/labels.ts`, строки в JSX | `next-intl` (ru/uk/en/fr/it) |
| `components/domain/property-media.tsx` | `BlurImage` + медиа из `/api/uploads` |
| `components/shell/ui-state.ts` | `stores/ui-store.ts` (zustand) |
| `lib/use-resource.ts` | существующие хуки загрузки / react-query |
| `lib/theme/*`, `styles/themes.css`, `tailwind.theme-extend.ts` | пакет Phase 2 |
| `lib/navigation/mobile-nav.ts` | тот же файл; флаг — `NEXT_PUBLIC_INTEGRATIONS_ENABLED` |
| `components/overlays/preview-panel.tsx` | **не переносить** — только для превью |

Сделки: `src/lib/mock/deals.ts` (= /api/deals, /api/payments, /api/documents, /api/contracts). COMPLETED → лид WON, CANCELLED → лид LOST (с причиной).

Правила воронки повторяют CRM: WON только из NEGOTIATION, LOST требует причину (`labels.ts → isStageTransitionAllowed`).
