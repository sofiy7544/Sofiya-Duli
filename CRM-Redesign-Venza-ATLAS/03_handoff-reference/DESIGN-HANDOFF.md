# MaybSrm CRM — Design Handoff Package

**Scope:** frontend `apps/web` (Next.js) of the monorepo `/root/mycrm`.
**Method:** read-only code analysis. No screenshots, no running app, and no changes to the project.
**Date of analysis:** 2026-09-15.

**Package contents**

| File | What it contains |
|---|---|
| `DESIGN-HANDOFF.md` | This document (sections 1–13) |
| `SCREEN-MAP.md` | Whole interface as one tree: nav → pages → sub-pages → modals |
| `Components/COMPONENT-INVENTORY.md` | Every reusable component: variants, states, props, duplicates |
| `Documentation/DESIGN-TOKENS.md` | Colors per theme (hex), type, radius, shadows, spacing, layout, breakpoints, motion |
| `Documentation/USER-FLOWS.md` | Step chains for auth, leads/funnel, client, property + PDF, users, settings |
| `Assets/` | Copied static assets + `ASSETS-LIST.md` + `FONTS.md` |

---

## 1. What the CRM is

MaybSrm is a **self-hosted CRM for real-estate agencies**. The root `package.json` describes it as *"Self-hosted CRM for real estate agencies (UA/RU)"*; the app metadata title is `MaybSrm`. The code models a **sale-only** workflow; rentals were removed, leaving `DealIntent = BUY` only.

Realtors do the following in it:
- capture **leads**, often in the field through a one-shot "Quick Capture";
- move leads through a **buyer funnel kanban** (New → Contacted → Qualified → Selection → Showing → Negotiation → Won/Lost, with a required loss reason);
- keep **contacts/clients** with preferences, rich-text notes and voice notes;
- manage a shared **property inventory** with photos and video, and export **branded presentation PDFs** in five languages with manually reviewed description translations;
- schedule **showings**, **tasks** and **calendar** events;
- close **deals** with commission, payments, documents and contract templates.

Administrators additionally get company analytics (funnel, channels, agents, lost reasons, source ROI), user management, presentation branding (logo and watermark), message templates and lead-routing automation rules.

Omnichannel messaging (Telegram, WhatsApp, Instagram, Email) and a lead-qualification inbox are fully coded but **hidden behind `NEXT_PUBLIC_INTEGRATIONS_ENABLED`**, which is `false` in the current `.env`.

The UI ships in **5 locales** (en default, uk, ru, fr, it) and **10 color themes**.

---

## 2. Frontend tech stack (from `apps/web/package.json`, confirmed by usage)

| Concern | Library (declared → installed) | Confirmed usage |
|---|---|---|
| Framework | **Next.js** `^15.0.1` → **15.5.18**, App Router | `src/app/**`, route group `(app)`, `middleware.ts`, server redirects, rewrites in `next.config.ts` |
| UI runtime | **React** `^19.0.0-rc` → **19.2.6** | almost all pages are `'use client'` |
| Language | TypeScript `^5.6.3` | |
| Styling | **Tailwind CSS** `^3.4.13` → **3.4.19** + `tailwindcss-animate`, PostCSS/autoprefixer | `tailwind.config.ts`, `globals.css` with CSS-variable themes and component classes (`.surface-card`, `.glass`) |
| CSS Modules | built into Next | **only** `app/login/login.module.css` |
| Component primitives | **Radix UI**: dialog, dropdown-menu, label, select, slot | wrapped in `components/ui/*` |
| Component pattern | **shadcn-style** hand-maintained wrappers: `class-variance-authority`, `clsx`, `tailwind-merge` (`cn()`) | `ui/button.tsx`, `ui/badge.tsx` use `cva`. No shadcn CLI registry file was found. |
| Command palette | `cmdk` | `components/command-palette.tsx` |
| Toasts | `sonner` | `ui/sonner-toaster.tsx`, `toast.*` everywhere |
| Icons | `lucide-react` ^0.451.0 | global stroke width 1.75 in `globals.css` |
| Motion | `framer-motion` | notes list, media lightbox |
| Drag & drop | `@dnd-kit/core`, `@dnd-kit/sortable` | leads kanban, deals board, photo reorder |
| Rich text | `@tiptap/*` (starter-kit, task list, image, placeholder) | `notes/note-editor.tsx` |
| Media | `blurhash`, `react-zoom-pan-pinch` | `media/blur-image.tsx`, `media/media-lightbox.tsx` |
| Hotkeys | `react-hotkeys-hook` | `hotkeys-provider.tsx` |
| **i18n** | **`next-intl`** `^3.21.1` → 3.26.5 | Locale read from cookie `NEXT_LOCALE` (no locale in URL); messages in `src/messages/{en,uk,ru,fr,it}.json` (1,149 keys) |
| **Forms** | **No form library** | Controlled `useState` forms + HTML validation (`required`, `minLength`, `type=email`) + manual checks. Validation authority is the API. |
| Validation schemas | `zod` (dependency) + `@crm/shared` (workspace) | Shared Zod schemas live in `packages/shared/src/schemas`. None of the reviewed web page/component files import them. |
| **Charts** | **No chart library** | Funnel bars, channel bars, month bars and load bars are hand-built `div`s (`reports`, `insights/lost-reasons`, `team`) |
| Server state | `@tanstack/react-query` | `QueryClientProvider` is mounted, but the reviewed screens fetch with `useEffect` + `lib/api.ts` directly |
| Client state | `zustand` | `stores/ui-store.ts` (overlays), `lib/auth-store.ts` (current user), confirm-dialog store |
| Theming | custom `ThemeProvider` | 10 themes via `data-theme` + `.dark` class |
| Fonts | none loaded | system-ui (see `Assets/FONTS.md`) |

---

## 3. Interface structure — route tree

Walked from `apps/web/src/app`. `(app)` is a **route group**: it adds no URL segment and supplies the authenticated shell layout. `*.bak` files in the tree are gitignored backups and are not routes.

```
src/app/
├── layout.tsx                      Root: <html>, no-flash theme script, NextIntlClientProvider, Providers
├── globals.css
├── error.tsx                       Root error boundary (dark, inline styles)
├── page.tsx                        "/"  → redirect /today or /login (cookie check)
├── login/
│   ├── page.tsx                    "/login"
│   └── login.module.css
└── (app)/                          ROUTE GROUP — authenticated shell
    ├── layout.tsx                  Sidebar + Topbar + MobileNav + global overlays
    ├── error.tsx                   Segment error boundary (keeps shell)
    ├── not-found.tsx
    ├── today/page.tsx              "/today"
    ├── tasks/page.tsx              "/tasks"
    ├── calendar/page.tsx           "/calendar"
    ├── notes/page.tsx              "/notes"
    ├── pipeline/page.tsx           "/pipeline"            ⇒ /leads  (alias, keeps query)
    ├── pipeline/[id]/page.tsx      "/pipeline/:id"        ⇒ /leads/:id
    ├── leads/page.tsx              "/leads"               kanban / mobile list
    ├── leads/new/page.tsx          "/leads/new"
    ├── leads/[id]/page.tsx         "/leads/:id"           lead workspace   (dynamic)
    ├── pool/page.tsx               "/pool"                ⇒ /pipeline (client redirect)
    ├── inbox/page.tsx              "/inbox"               ⇒ /pool while integrations flag is off
    ├── qualify/page.tsx            "/qualify"             re-exports inbox page
    ├── contacts/page.tsx           "/contacts"            ⇒ /clients (keeps query)
    ├── contacts/[id]/page.tsx      "/contacts/:id"        ⇒ /clients/:id
    ├── clients/page.tsx            "/clients"
    ├── clients/new/page.tsx        "/clients/new"
    ├── clients/[id]/page.tsx       "/clients/:id"         (dynamic)
    ├── clients/[id]/edit/page.tsx  "/clients/:id/edit"    (dynamic, nested)
    ├── inventory/page.tsx          "/inventory"           ⇒ /properties (keeps query)
    ├── inventory/[id]/page.tsx     "/inventory/:id"       ⇒ /properties/:id
    ├── properties/page.tsx         "/properties"
    ├── properties/new/page.tsx     "/properties/new"
    ├── properties/[id]/page.tsx    "/properties/:id"      (dynamic)
    ├── properties/[id]/edit/page.tsx "/properties/:id/edit" (dynamic, nested)
    ├── deals/page.tsx              "/deals"
    ├── deals/new/page.tsx          "/deals/new"
    ├── deals/[id]/page.tsx         "/deals/:id"           (dynamic)
    ├── insights/page.tsx           "/insights"            ⇒ /reports (keeps query)
    ├── insights/lost-reasons/page.tsx "/insights/lost-reasons"
    ├── reports/page.tsx            "/reports"
    ├── team/page.tsx               "/team"
    ├── admin/page.tsx              "/admin"
    ├── profile/page.tsx            "/profile"
    └── settings/
        ├── page.tsx                "/settings"
        ├── automation/page.tsx     "/settings/automation"
        ├── templates/page.tsx      "/settings/templates"
        ├── integrations/page.tsx   "/settings/integrations"
        ├── branding/page.tsx       "/settings/branding"
        └── users/page.tsx          "/settings/users"
```

`next.config.ts` adds `/dashboard` and `/dashboard/*` ⇒ `/today`, plus same-origin rewrites `/api/*` and `/uploads/*` → backend.

**Grouping by section** (sidebar name → canonical URL → physical route):

| Section | Sidebar URL | Real pages | Legacy aliases |
|---|---|---|---|
| Today | `/today` | `/today`, `/tasks` | `/dashboard` |
| Pipeline | `/pipeline` | `/leads`, `/leads/new`, `/leads/:id`, `/deals`, `/deals/new`, `/deals/:id` | `/pipeline`, `/pool`, `/inbox`, `/qualify` |
| Contacts | `/contacts` | `/clients`, `/clients/new`, `/clients/:id`, `/clients/:id/edit` | `/contacts/*` |
| Inventory | `/inventory` | `/properties`, `/properties/new`, `/properties/:id`, `/properties/:id/edit` | `/inventory/*` |
| Notes | `/notes` | `/notes` | — |
| Calendar | `/calendar` | `/calendar` | — |
| Insights (ADMIN) | `/insights` | `/reports`, `/insights/lost-reasons`, `/team` | `/insights` |
| Settings | `/settings` | `/settings`, `/settings/{automation,templates,integrations,branding,users}`, `/admin` | — |
| User menu | — | `/profile` | — |
| Public | — | `/login`, `/` | — |

---

## 4. Full screen list

Access legend: **All** = any logged-in user · **ADMIN** = client-side redirect or hide for others · API role gates are listed in §11.

| Route | Purpose | Main components rendered | Access |
|---|---|---|---|
| `/` | Entry redirect | — | Public |
| `/login` | Sign in | video stage layers, glass form, `Input`, `Label`, `LanguageSwitcher`, error box | Public |
| `/today` | Daily command center: date, KPIs, AI briefing placeholder, today's tasks (complete inline), showings in next 3h, funnel pulse, recent activity, revenue | `Card`, `Button`, `Badge`, `Avatar`, toasts | All |
| `/tasks` | Task list with status/period/assignee filters, inline create form | `StatusPill`, `PeriodPill`, `DueChip`, `TaskRowView`, `WheelTimePicker`, `Select`, `Input`, `Card`, `Badge`, `Avatar` | All (assignee tools ADMIN/MANAGER) |
| `/calendar` | Month/Week/Day/Agenda of showings, tasks, contracts, payments; drag/resize; create/edit | `MonthView`, `TimeGridView`, `AgendaView`, `EventPill`, `EventForm` (Sheet), `Select` | All |
| `/notes` | Personal notes (Apple-Notes style), pin, trash, restore | `NoteEditor` (Tiptap), framer-motion list | All |
| `/pipeline`, `/pipeline/:id` | Aliases | — | All |
| `/leads` | Funnel: desktop kanban with drag & drop, LOST drop zone, admin bulk actions; mobile tabbed card list with action sheet | inline `KanbanColumn`/`LeadCardView`, `LeadsMobile`, `LeadCardMobile`, `LeadActionSheet`, `LostReasonDialog`, `PeriodPill`, `Select`, `Badge`, `Avatar`, `SourceIcon`, `PageSkeleton` | All (bulk + assignee filter ADMIN) |
| `/leads/new` | Create lead | `LeadForm`, `QuickClientDialog`, `PropertyForm` dialog, `VoiceRecorder`, `AudioPlayer` | All |
| `/leads/:id` | Lead workspace: lead list, notes/activity(/chat), quick actions, stage/priority/assignee panel | `LeadMiniCard`, `ChatPanel`{flag}, `NotesPanel`, `ActivityTimeline`, `PersonQuickActions`, `CallDispositionDialog`, `LostReasonDialog`, `PropertyForm` dialog, `AudioPlayer`, `Select` | All |
| `/pool` | Removed feature → redirect | `PageSkeleton` | All |
| `/inbox`, `/qualify` | Omnichannel inbox + qualification → create lead {flag}; otherwise redirect | contact list, timeline, send bar, qualify panel, custom duplicate modal | All (assign ADMIN/MANAGER) |
| `/contacts`, `/contacts/:id` | Aliases | — | All |
| `/clients` | Client list: Active/Archive/Blacklist, search, pagination | `Input`, `Avatar`, `Badge`, `SourceIcon`, `EmptyState`, `Button` | All |
| `/clients/new` | Create client | `ClientForm` (`PhoneInput`, `NoteEditor`, `VoiceRecorder`, `Select`) | All |
| `/clients/:id` | Client card: header, archive/blacklist/merge/delete, funnel banner, preferences, contacts, quick actions, note | `Card`, `Avatar`, `Badge`, `DropdownMenu`, `ClientChat`{flag} / `ClientContactsCard`, `PersonQuickActions`, `ClientNote`, `ScheduleShowingDialog`, `CallDispositionDialog`, `MergeClientDialog` | All (reassign/merge ADMIN/MANAGER) |
| `/clients/:id/edit` | Edit client | `ClientForm` | All |
| `/inventory`, `/inventory/:id` | Aliases | — | All |
| `/properties` | Property catalog grid with filters, pagination | `Input`, `Select`, `Badge`, `EmptyState`, cards with cover image | All |
| `/properties/new` | Create property | `PropertyForm` (`PhoneInput`, `VoiceRecorder`, `AudioPlayer`) | All |
| `/properties/:id` | Property card: gallery, price/address/stats, reservation, description/voice, seller, owner, PDF download, share, photo manager | `PropertyGallery`, `MediaLightbox`, `DownloadPresentation`, `SendPresentation`, `PropertyPhotos`, `AudioPlayer`, `Card`, `Badge` | All (edit/delete owner/ADMIN) |
| `/properties/:id/edit` | Edit property + description translations | `PropertyForm`, `PropertyTranslations` | All (translations owner/ADMIN) |
| `/deals` | Deals list with totals, or board by lead stage | `DealsListView`, `DealsBoard`, `DealCard`, `ViewPill`, `Select`, `LostReasonDialog` | All |
| `/deals/new` | Create deal from lead | `Card`, `Select`, `Input`, conflict alert | All |
| `/deals/:id` | Deal: status, payments, contract print, documents | `Card`, `Badge`, `Select`, `Input`, `Button` | All (delete/payments ADMIN/MANAGER) |
| `/insights` | Alias | — | ADMIN (target) |
| `/reports` | Company analytics: KPIs, funnel, channels, agents, lost reasons, source ROI | `KPI`, `FunnelRow`, tables, `Card`, `PageSkeleton` | ADMIN |
| `/insights/lost-reasons` | Lost-lead deep dive | `Card`, bars, table | All (no UI gate) |
| `/team` | Team workload table | `Card`, `Badge`, table | ADMIN |
| `/admin` | Legacy user management (unlinked) | table, `UserFormSheet`, `ResetPasswordDialog`, `UserActivitySheet`, `IconBtn` | ADMIN |
| `/profile` | Own profile + password | `Card`, `Input`, `PhoneInput`, `Select` | All |
| `/settings` | Settings index cards | `Card` | All (Branding, Users cards ADMIN) |
| `/settings/automation` | Lead routing & automation rules | `Card`, `Select`, `Input`, `Badge` | All (edit ADMIN/MANAGER) |
| `/settings/templates` | Message/contract templates | `Card`, `Input`, `Textarea`, `Select`, `Badge` | All (edit ADMIN/MANAGER) |
| `/settings/integrations` | Static integration info | `Card`, `Badge`, disabled `Button` | All |
| `/settings/branding` | Presentation logo, agency name, watermark | `Card`, `Input`, native checkbox/range, `ConfirmDialog` | ADMIN |
| `/settings/users` | User management (current) | table, `CreateRealtorSheet`, `ResetPasswordDialog`, `UserActivitySheet`, `IconBtn` | ADMIN |
| (segment) error / not-found | Error and 404 | `EmptyState`, `Button` | — |

---

## 5. Component inventory (summary)

Full detail, including where each component is used, its variants, states, props and duplicates, is in **`Components/COMPONENT-INVENTORY.md`**.

- **UI kit (`components/ui`, 18 files):** Button (6 variants × 5 sizes), Input, Textarea, Label, Select, DropdownMenu, Dialog, ConfirmDialog (+ imperative `useConfirm`), Sheet (left/right/bottom), SlideOver (sm/md/lg/xl), Card family, Badge (8 variants), Avatar (4 sizes), PhoneInput, Skeleton/PageSkeleton (4 variants), EmptyState (3 variants), PeriodPill, Toaster.
- **Shell:** Sidebar, Topbar, MobileNav, MobileDrawer, UserMenu, NotificationBell, ThemeToggle, LanguageSwitcher.
- **Overlays:** CommandPalette, QuickCreate, QuickCaptureDialog, HotkeysHelpDialog.
- **Domain:** LeadForm, ClientForm, PropertyForm, ShowingForm, Quick{Client,Property}Dialog, ScheduleShowingDialog, CallDispositionDialog, LostReasonDialog, MergeClientDialog, PersonQuickActions, NotesPanel, ClientNote, ActivityTimeline, ClientChat, ClientContactsCard, DownloadPresentation, SendPresentation, PropertyTranslations, PropertyGallery, PropertyPhotos, AudioPlayer, VoiceRecorder, BlurImage, MediaLightbox, calendar views, kanban/deals board, admin sheets.
- **Not present as components:** Checkbox, Radio, Switch, Tabs, Tooltip, Table, Pagination, Alert, Popover/Combobox (all hand-built inline; see inventory §10).

---

## 6. Design tokens (summary)

Full tables are in **`Documentation/DESIGN-TOKENS.md`**.

- **Colors:** HSL CSS variables per theme (`--background`, `--surface`, `--surface-2`, `--foreground`, `--primary`, `--primary-soft`, `--accent`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--ring`, glass and shadow vars). Light primary is `#007BFF`.
  - The themes are light, dark, sepia, midnight, arctic, graphite, ocean, lavender and rose, plus a system option.
  - Static extras: `primary-50…700` (Tailwind blue), `success #22C55E`, `warning #F59E0B`, `danger #EF4444`.
  - Domain palettes cover stages, priority, urgency, calendar kinds and source brands.
- **Type:** system-ui; sizes 10/11/12/14/16/18/20/24/30px; base headings 28/22/18/15px at weight 600; tracking tokens `tightish` -0.011em, `tight2` -0.02em, `eyebrow` 0.06em.
- **Radius:** `xl` 14px, `2xl` 18px, `3xl` 24px (custom); the rest are Tailwind defaults.
- **Shadows:** `soft` / `card` / `lift` / `glow` / `glow-strong` (static) plus theme-aware `--shadow-card` / `--shadow-lift`.
- **Spacing:** Tailwind 4px scale; content padding 12/20/28px; touch target 44px; safe-area-aware bottom padding.
- **Shell:** sidebar 208px, topbar 56px, bottom nav 54–64px items; kanban columns 288/224px; lead workspace side panels 224/288px.
- **Breakpoints:** Tailwind defaults `sm` 640, `md` 768, `lg` 1024, `xl` 1280.

---

## 7. User flows (summary)

Full chains are in **`Documentation/USER-FLOWS.md`**.

- **Auth:** protected URL → `/login?next=` → submit → cookies → `next` or `/today`; 401 → silent refresh → else back to login.
- **Lead capture & funnel:** Quick Capture (⌘⇧N) or LeadForm → `/leads/:id` → kanban drag between stages (LOST requires a reason, Undo toast) → "ready to buy" → `/deals/new` → `/deals/:id`.
- **Client create:** `/clients/new` (name*, phone*) → `/clients/:id` → add to funnel, quick actions, auto-saved note.
- **Property + PDF:** `/properties/new` → `/properties/:id` → upload photos → Download PDF (logo, watermark, language with translation status) → edit translations.
- **User management:** `/settings` → Users → add realtor / reset password / archive ZIP / deactivate / delete.
- **Settings/branding:** logo upload/remove, agency name, watermark opacity → affects PDF defaults.

---

## 8. Responsive rules actually present

**Breakpoints used:** only Tailwind defaults. Occurrences in `src`: `sm:` 132 · `md:` 27 · `lg:` 12 · `xl:` 1 · `2xl:` 0. No `max-*:` variants. One CSS media query: `login.module.css @media (max-width: 640px)`.

| Area | Rule in code |
|---|---|
| App shell | `Sidebar` is `hidden md:flex`. Below 768px navigation is `MobileNav` (fixed floating bottom bar, `md:hidden`, 4 items) plus a hamburger `MobileDrawer` (Sheet left, `md:hidden`) in the Topbar. |
| Shell spacing | Outer `p-2` → `md:py-4 md:pr-4 md:pl-3`. Content `p-3` → `sm:p-5` → `md:p-7`; bottom `pb-mobile-nav` = `max(6rem, safe-area + 5.25rem)` at all widths. Container radius `rounded-lg` → `md:rounded-xl`. |
| Safe areas | Topbar `padding-top: env(safe-area-inset-top)`; MobileNav bottom `max(.75rem, safe-area + .5rem)`; drawer footer and bottom sheet add `safe-area-inset-bottom`; login header/center use `env()` padding. |
| Topbar | Quick-capture button: full "Захопити лід" label `hidden sm:inline-flex`; icon-only 36px `sm:hidden`. Language switcher shows name ≥ sm, flag only < sm. User email ≥ sm only. |
| Touch sizing | Button heights: default 44px < sm → 40px ≥ sm; `sm` 40 → 32; `icon` 44 → 40. Input/Select 44px + `text-base` (16px, prevents iOS zoom) < sm → 40px + 14px ≥ sm. `min-h-touch` (44px) in drawer and action sheet. |
| Leads | `LeadsMobile` (`md:hidden`): stage tabs + vertical card list + bottom action sheet, no drag & drop. Desktop kanban `hidden md:block`; kanban toolbar controls `hidden md:flex`. |
| Lead workspace | Left lead list `hidden md:flex` (≥ 768). Right edit panel `hidden lg:flex` (≥ 1024). Back button `md:hidden`. |
| Notes | List/editor master–detail: < md only one pane is visible (`selectedId ? hidden md:flex : flex`); back chevron `md:hidden`. |
| Inbox {flag} | Same master–detail pattern; list widths `md:w-96 lg:w-[26rem] xl:w-[32rem]` (the only `xl:` usage); qualify panel `hidden md:flex`. |
| Dialogs | `w-[92vw] max-w-md`; footer buttons stacked reverse < sm, row ≥ sm; QuickCapture `max-w-md sm:max-w-2xl`. |
| Sheets / SlideOver | SlideOver `w-[92vw]` < sm → fixed px widths ≥ sm. Left Sheet `90vw max 320px` → `sm:w-[280px]`. Right admin sheets `w-full` → `sm:w-[400/420px]`. |
| Grids | Common patterns: `grid-cols-2 sm:grid-cols-4` (Today KPI); `sm:grid-cols-2 lg:grid-cols-3` (property cards); `lg:grid-cols-3` detail layouts; `sm:grid-cols-2` forms; `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (reports KPI); Today funnel `grid-cols-3 sm:grid-cols-6`. |
| Property media | Gallery `grid-cols-1 sm:grid-cols-4` with side tiles `hidden sm:grid`; mobile thumbnail strip `sm:hidden`. Photo tile controls always visible < sm, hover-reveal ≥ sm (`sm:opacity-0 sm:group-hover:opacity-100`). |
| Tables | Wrapped in `overflow-x-auto` (reports, team, admin, users). |
| Kanban columns | `w-[80vw] max-w-72 sm:w-72` + `snap-x` < sm (the kanban itself is hidden < md). |
| Login | ≤ 640px: card padding 26/22px, radius 20px, blur 16px, no grain layer, no ambient float, no video zoom. |
| Motion | `prefers-reduced-motion` disables animations globally; login jumps straight to the settled state. |
| Not found | No mobile-specific layout for Calendar (month grid stays 7 columns with 110px cells), Reports, Deals board, Deal detail, Settings pages beyond generic `flex-wrap`. No landscape/tablet-specific rules. No container queries. |

---

## 9. Interface states that actually exist

Key: **P** = PRESENT (where/how) · **—** = ABSENT (not implemented; not invented here).

### 9.1 Reusable components

| Component | Default | Hover | Active (pressed) | Selected | Focus | Disabled | Loading | Empty | Success | Warning | Error |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Button | P | P per variant | P `scale .98` | — | P ring-2 | P opacity 50 | — (caller adds spinner) | n/a | — | — | — (`destructive` is an action style) |
| Input / Textarea | P | — | — | — | P border-primary + glow | P | — | n/a | — | — | — |
| Select | P | P trigger border | — | P check icon | P | P trigger + item | — | — | — | — | — |
| PhoneInput | P | P country button | — | P country row | P input | — (no prop) | — | P "no country" | — | — | — |
| DropdownMenu | P | P item `bg-muted` | — | P (caller check icon) | P item | — | — | P (NotificationBell) | — | — | — |
| Badge | P 8 variants | — | — | — | — | — | — | — | P `success` | P `warning` | P `destructive` |
| Card / `.surface-card` | P | P only with `surface-hover` | — | — | — | — | — | — | — | — | — |
| Dialog / ConfirmDialog | P | P close btn | — | — | P close btn | P busy buttons | P confirm "loading" label | — | — | — | — |
| Sheet / SlideOver | P | P close | — | — | — | — | — | — | — | — | — |
| Sidebar / MobileNav / Drawer items | P | P | P mobile `scale-95` | P active route | P global outline | — | — | — | — | — | — |
| PeriodPill & other pills | P | P | — | P primary + glow | global outline | — | — | — | — | P `tone=danger` | — |
| Avatar | P | — | — | — | — | — | — | P initials fallback | — | — | P image-error fallback |
| Skeleton / PageSkeleton | — | — | — | — | — | — | P | — | — | — | — |
| EmptyState | — | — | — | — | — | — | — | P | — | — | P used by error.tsx |
| Toaster | — | — | — | — | — | — | — | — | P | P | P (+ Undo/View action) |
| AudioPlayer | P | P scale 1.05 | P scale .95 | P playing (pause icon) | — | P while starting | — (no spinner) | n/a | — | — | — |
| VoiceRecorder | P idle | P (Button) | — | P recording (red pulse) | P (Button) | — | P uploading spinner | — | — (returns to idle) | — | P toasts |
| Kanban column / card | P | P card lift | P dragging overlay | P admin ring | — | — | P kanban skeleton | P dashed "empty stage" | P toast + Undo | P stale amber dot | P toast + rollback |
| PropertyPhotos | P | P reveal controls | P drag ring | P cover star | — | — | P progress ring | P dropzone | P toast | — | P toast |
| DownloadPresentation | P | P rows | — | P radio/checkbox | — | P while downloading | P "downloading" | — | — | P amber translation warning | P text (not red: undefined token) |
| NotesPanel / ClientNote | P | P pin reveal | — | P pinned (amber) | P textarea | P save btn | P spinner / "Saving…" | P empty text | P "Updated" check / toast | — | P "Not saved" / toast |
| ScheduleShowingDialog | P | P | — | P property chosen | P | P submit | P saving | P "not found" | P toast | P red conflict box (non-blocking) | P toast |
| LeadForm | P | P tiles/chips | — | P purpose/urgency/priority | P fields | P submit | P saving spinner | — | — (navigates) | P duplicate-lead amber box | P blacklist box, error text |
| EventForm | P | P chips | — | — | P | P read-only events | P saving | — | — | P amber read-only notice | — (no catch) |

### 9.2 Screens

| Screen | Loading | Empty | Error | Success feedback | Warning | Disabled |
|---|---|---|---|---|---|---|
| Login | P button spinner, inputs disabled | n/a | P error box (invalid / 429) | P redirect | — | P while submitting |
| Today | P KPI pulse, task skeleton rows | P "all done", "no showings"; funnel/activity/revenue sections hidden when empty | — (all fetch errors silently ignored) | P "task done" toast | P overdue rows red, stale leads amber text | P complete button while saving |
| Leads board | P kanban skeleton | P "empty" card + per-column dashed | P toast on move failure (initial load error unhandled) | P toast with Undo | P stale dot | — |
| Lead detail | P page skeleton | P "nothing found" in list | P not-found view, toasts | P toasts | P stale days, stale-property box | P selects while saving |
| Clients list | P skeleton rows | P EmptyState | — (on failure the subtitle stays "Loading…") | — | — | P pagination buttons |
| Client detail | P page skeleton | P "not found" text | P toasts | P toasts | P blacklisted/archived badges | P assignee while saving |
| Client / Property / Lead forms | P saving spinner | — | P error text line | P navigate / toast | P discard confirm, lead-form warnings | P submit |
| Properties list | P skeleton cards | P EmptyState | — | — | — | P pagination |
| Property detail | P page skeleton | P gallery placeholder, photo dropzone | P not-found text, download error | P toasts (cover, removed + Undo) | P reservation box, translation warnings | P download while loading |
| Property translations | — (renders nothing) | P "missing" badges, no-description warning | P toasts | P toasts | P outdated/will-delete amber | P draft/save buttons |
| Deals list/board | P list skeleton | P empty card | — | — | — | — |
| Deal new | — | — | P error text | P navigate | P property conflict box | P submit |
| Deal detail | P skeleton (**stays forever if fetch fails**) | P "no payments", "no docs" | — | — | P remaining amount amber | P add payment |
| Tasks | — (**shows empty state while loading**) | P empty card | — | — | P overdue badge/row | P row while busy |
| Calendar | P "Loading" card | P agenda empty | — (partial failures silent) | — | P overdue red pills | P read-only events |
| Notes | P spinner | P "no notes"/"trash empty", "select a note" | P toasts | P toasts | — | — |
| Reports | P skeleton (**stays forever on fetch failure**) | P "no data" per card | — | — | — | — |
| Lost reasons | P skeleton | P "no lost leads" (**also shown on fetch failure**) | — | — | — | — |
| Team | P skeleton | P "no agents" | — | — | P overdue red, overload bar red/amber | — |
| Admin (legacy) | P spinner card | P empty card | — | — | — | — |
| Settings → Users | P spinner card | — | P toasts (409 message) | — (reload only) | — | P self / last-admin actions |
| Settings → Branding | P spinner card | P "no logo" icon | P toasts | P toasts | — | P during upload/remove |
| Settings → Templates / Automation | — (**empty card until loaded**) | P empty card | — | — | — | P save until required fields |
| Settings → Integrations | n/a (static) | — | — | — | status badges | P connect buttons (always) |
| Profile | P page skeleton | — | P toasts (password too short / mismatch / API) | P toasts | — | P save when not dirty |
| App error / 404 | — | — | P EmptyState + Retry/Home | — | — | — |

---

## 10. Known UX/UI problems visible in code (factual)

Each item cites where it happens. "No CSS" claims were checked against the CSS of the existing build in `apps/web/.next/static/css` (build dated 2026-08-19).

**Styling defects**
1. **Classes that generate no CSS:**
   - `bg-card` in `leads/leads-mobile.tsx`, `leads/lead-card-mobile.tsx`, `leads/lead-action-sheet.tsx`, so mobile lead cards, tabs and action groups have no background fill.
   - `text-destructive` in `settings/branding/page.tsx:145` ("Remove logo") and `download-presentation.tsx:230` (download error), so they render non-red.
   - `bg-primary/8`, `bg-violet-500/8`, `bg-amber-500/8`, `bg-emerald-500/8` (Today KPI icon tiles, WheelTimePicker band), so there is no tint.
   - `h-4.5 w-4.5` (notes "+" icon), so the icon is not sized.
   - `bg-surface-2/40` (notes list): `--surface-2` is not mapped in Tailwind.
2. **Theme bootstrap mismatch:**
   - `app/layout.tsx`'s no-flash script only accepts `light, dark, sepia, midnight, system`, but `ThemeProvider` offers 10 themes. Users on arctic, graphite, ocean, lavender or rose get the system theme painted first, then a switch after hydration.
   - `graphite` is dark-like in the provider but not in the script.
   - `ui/sonner-toaster.tsx` maps only `dark`/`midnight` to dark toasts, so graphite shows light toasts.
3. **Two shadow systems:** `<Card>` uses static Tailwind `shadow-card` (rgba 16,24,40); `.surface-card` uses theme-aware `--shadow-card`. Cards and surface-cards look different in dark and premium themes.
4. **Brand color defined in several unrelated places:**
   - CSS `--primary` (`#007BFF` light);
   - Tailwind `primary-50…700` = Tailwind blue (`#2563EB`/`#1D4ED8`), used for the logo gradient and Badge default text;
   - `favicon.svg` `#1d4ed8`;
   - root `error.tsx` button `#7c3aed`;
   - login submit gradient `#6366f1→#a855f7`;
   - `.env` `EMAIL_BRAND_COLOR=#7c3aed`.
   On top of that, 534 raw palette class uses bypass theme tokens.
5. **Light-only colors on dark themes:**
   - `bg-white` (leads bulk bar `leads/page.tsx:233,246`; `client-chat.tsx:127,164`);
   - `bg-blue-50` unread notifications;
   - Badge `success/warning/destructive/accent`, `EVENT_KIND_TONE` (calendar) and tasks `TYPE_TONE`, all `*-50` without dark variants;
   - deal card next-action boxes;
   - lead detail intent badge `bg-slate-100` and lost reason `bg-red-50`;
   - EventForm read-only notice;
   - reset-password icon tile.
6. **Checkbox styling that does nothing:** `rounded text-primary focus:ring-primary` on native checkboxes (kanban select, `UserFormSheet`) are forms-plugin classes, and `@tailwindcss/forms` is not installed, so the browser-default checkbox renders. Other checkboxes use `accent-primary`, so checkboxes are inconsistent.
7. **Font:** `--font-inter` is never defined (`layout.tsx` sets `inter = { variable: '' }`), so the UI renders in system-ui while `body` applies Inter-only features `cv11/ss01/ss03`.

**Localization**
8. **Hardcoded strings in mixed languages** despite 5-locale i18n. Lines containing Cyrillic per file:
   - integrations 38 (uk), inbox 32 (uk), lead-action-sheet 29 (ru), notes 23 (uk), client detail 21 (uk), lead-form 17 (ru), automation 16 (uk/ru), lost-reasons 11 (uk), client-note 10 (ru/uk);
   - smaller counts: person-quick-actions, lead-card-mobile, client-form, property-form, note-editor, schedule-showing, leads-mobile and others.
   - Examples: Topbar "Захопити лід"; `stage-style.ts STAGE_LABEL` (uk) used on Today, lead detail, client detail and quick actions; kanban client type in Ukrainian vs mobile card in Russian; "Premium", "v0.7 · self-hosted", "AI Briefing", "Beta", "Cover" in English.
   - `fr.json`/`it.json` are missing 6 keys (`leads.stages.CONTACTED/QUALIFIED/WON/LOST`, `deals.stagesShort.CONTACTED/QUALIFIED`).
9. **Hardcoded date locales:**
   - `ru-RU` in NotificationBell, ActivityTimeline times and admin last login;
   - `uk-UA` in notes, ClientNote, schedule-showing conflicts and mobile lead cards;
   - `formatters.ts` defaults to `en-GB`/`en-US`;
   - calendar week/day titles use only `uk-UA` or `ru-RU`.
10. **Two "language" settings:** `/profile` saves `user.locale` through the API, but the interface language is the `NEXT_LOCALE` cookie set only by LanguageSwitcher. Profile edits do not change the UI language. Template language and UserFormSheet locale offer only ru/uk.

**Duplicate or divergent UI**
11. **Duplicated components with different looks** (details in inventory §11):
    - `/admin` + UserFormSheet (roles ADMIN/MANAGER/EMPLOYEE) vs `/settings/users` + CreateRealtorSheet (REALTOR only; opens from the left);
    - Sheet vs SlideOver right panels;
    - ~11 segmented-control variants;
    - leads KanbanColumn vs deals BoardColumn;
    - 5 priority-picker designs (warm = Star vs Sparkles);
    - AudioPlayer vs native `<audio controls>`;
    - three error-text colors (`text-danger` / `text-red-600` / undefined `text-destructive`);
    - tables with different header size and padding;
    - unused `client-actions.tsx`.
12. **Inconsistent stage lists:**
    - kanban (buyer funnel) and mobile tabs include `SELECTION`;
    - lead detail stage select, Today funnel, Reports funnel and Deals board exclude it;
    - PersonQuickActions stage select excludes `LOST`;
    - seller-funnel stages (APPRAISAL, AGREEMENT, LISTING) have colors but no UI entry point.
13. **ConfirmDialog default label is "Delete"** for non-delete confirmations that pass no `confirmLabel`: admin activate/deactivate and client blacklist toggle.

**Navigation and routing**
14. **Nav highlighting gaps:**
    - MobileNav's legacy map lacks `/clients`, so "Contacts" is not active on client pages.
    - MobileDrawer has no legacy map, so no item is active on `/leads`, `/clients`, `/properties` or `/reports`.
    - The Sidebar Settings icon stays muted when active.
15. **Topbar title map:**
    - `/notes`, `/team`, `/admin` have an empty title;
    - `/tasks` shows "Today" and `/deals` shows "Pipeline";
    - every page renders two `<h1>` elements (Topbar and page heading).
16. **Query parameters sent but ignored:** `/pipeline?stage=` (Today funnel chips; `/leads` reads only `assignee`), `/tasks?leadId=` (lead detail), `/deals?agentId=` (reports agents table).
17. **Redirect chains and dead ends:**
    - `/qualify` → `/pool` → `/pipeline` → `/leads`;
    - palette item "New requests" and hotkey G I lead to the pipeline;
    - admin guards redirect to `/dashboard` → `/today`;
    - `/team` and `/admin` have no link anywhere in the UI.
18. **MobileNav has 4 items** although its doc comment specifies 5 with "More". Inventory and Notes are reachable on mobile only through the drawer.

**Layout, states and data display**
19. **Lead workspace layout:** negative margins `-mx-4 -my-4 lg:-mx-6 lg:-my-6` assume 16/24px padding, but the content padding is 12/20/28px. Height is `calc(100vh - 3.5rem)`.
20. **Today "complete task" button:** its check icon uses `group-hover:opacity-100`, but the row has no `group` class, so the button stays an empty circle.
21. **Error handling that produces misleading states:**
    - Reports and Deal detail stay on skeleton forever if the fetch fails;
    - Lost-reasons shows "no lost leads" on failure;
    - the clients-list subtitle stays "Loading…";
    - Tasks, Templates and Automation show the empty state while still loading;
    - Today swallows all errors.
22. **No field-level validation UI.** Errors appear as one red line or a toast. The required `*` marker is inconsistent (missing in CreateRealtorSheet). Client-side `required` allows 1-character names that the API rejects (min 2).
23. **Missing input:** ClientForm has no field for client **type** (BUYER/SELLER/INVESTOR), although the funnel model depends on it. PersonQuickActions shows priority as raw `hot/warm/cold`.
24. **Technical text shown to users:** Automation rule list prints `JSON.stringify(rule.action)`; the Team page footer shows `PATCH /api/users/[id] { isAvailable: false }`.
25. **Keyboard shortcuts** ⌘N / ⌘L / ⌘O / ⌘S override the browser's new window, address bar, open and save.
26. **Overlays outside Radix** (inbox duplicate modal, WheelTimePicker, MediaLightbox, phone country list) have no focus trap or shared close behavior.

---

## 11. Technical constraints

### 11.1 Required fields (shared Zod schemas, `packages/shared/src/schemas`) — enforced by the API

| Entity (schema) | Required | Optional (with limits) | UI notes |
|---|---|---|---|
| **Login** `loginSchema` | `email` (valid email), `password` 8–128 chars | — | UI `minLength=8` |
| **Client** `createClientSchema` | `fullName` 2–200 · `primaryPhone` 6–32, only `+ 0-9 ( ) - space` | `type` BUYER/SELLER/INVESTOR (default BUYER) · `email` valid · `avatarUrl` · `sourceId` · `assignedUserId` · `notes` ≤ 50,000 (HTML) · `noteAttachments` ≤ 20 (audio/photo/file) · `marketingConsent` · `contacts[]` (channel + identifier 1–255) · `preferences` (propertyType, dealIntent BUY, currency 3 letters, districts[], rooms/price/area min/max ≥ 0) | Update schema adds `isArchived`, `isBlacklisted` |
| **Property** `createPropertySchema` | `type` APARTMENT/HOUSE/COMMERCIAL/LAND · `district` 1–120 · `address` 1–300 · `area` > 0 and ≤ 100,000 · `price` ≥ 0 | `dealIntent` (BUY) · `rooms` 0–50 int · `floor` 0–200 · `totalFloors` 0–200 · `currency` exactly 3 (default EUR) · `status` (default AVAILABLE) · `ownerUserId` · `sellerClientId` · `sellerName` ≤ 200 · `sellerPhone` ≤ 40 · `sellerNote` ≤ 5,000 · `description` ≤ 10,000 · `descriptionVoiceUrl` · `features` | UI floor `min=1`; QuickCapture sends `area: 1` |
| **Lead** `createLeadSchema` | `clientId` | `sourceId` · `assignedUserId` (null = unassigned) · `stage` (default NEW) · `dealIntent` · `interestPropertyId` · `interestNote` ≤ 2,000 · `interestPhotoUrl` / `interestVoiceUrl` (http(s) or `/…`) · `priority` hot/warm/cold · `purpose` · `urgency` · `budgetMin/Max` ≥ 0 · `budgetCurrency` 3 · `nextActionAt` ISO | |
| **Lead stage change** `updateLeadStageSchema` | `stage` | `lostReason` ≤ 500, **required and non-blank when stage = LOST** | Transition rules in `enums.ts isStageTransitionAllowed`: target must be in the client-type funnel; LOST from any active stage; reopen from LOST/WON; **WON only from NEGOTIATION** |
| **Bulk reassign** | `leadIds` 1–200 · `assignedUserId` | — | ADMIN UI |
| **Deal** `createDealSchema` | `leadId` · `amount` > 0 · `commissionPercent` 0–100 | `propertyId` · `agentId` | UI default commission 3 |
| **Payment** | `dealId` · `amount` > 0 · `paidAt` ISO with offset | `userId` · `type` (default COMMISSION) · `note` ≤ 500 | |
| **Task** `createTaskSchema` | `title` 1–200 · `dueAt` ISO with offset | `userId` · `clientId` · `leadId` · `description` ≤ 2,000 · `type` CALL/SHOWING/FOLLOWUP/CUSTOM (default CUSTOM) | |
| **Showing** `createShowingSchema` | `propertyId` · `clientId` · `scheduledAt` ISO with offset | `agentId` · `durationMin` 5–480 (default 60) | UI min 15 step 15 in ScheduleShowing |
| **Register / invite accept** | email, password 8–128, fullName 2–120 | phone 6–32 | no UI |
| UI-only rules (no shared schema found) | User create: fullName, email, password ≥ 8 · Profile: fullName (max 120), new password ≥ 8 = confirm · Template: name + content · Automation: name · Branding: opacity 5–35 step 5 | | |

### 11.2 Permissions and role gates

Shared enum `UserRole`: ADMIN, REALTOR, ASSISTANT, ANALYST, MANAGER, EMPLOYEE. The current admin UI treats the model as **ADMIN + REALTOR**, but many UI checks still accept MANAGER. The API uses a `RolesGuard` with `@Roles`. Middleware checks only that the auth cookie exists.

| Capability | UI gate (where) | API gate found |
|---|---|---|
| Sidebar/drawer "Insights" | ADMIN (`sidebar.tsx`, `mobile-drawer.tsx`) | — |
| `/reports` | ADMIN (redirect to /today) | `@Roles(ADMIN)`: `GET /api/reports/leads-by-channel`, `/agents`, `/team-workload`, `/source-roi`. **Not gated:** dashboard, funnel, recent-activity, upcoming-showings, recent-leads, today-tasks, lead-health, lost-reasons (used by /today). |
| `/insights/lost-reasons` | none | none on `lost-reasons` |
| `/team` | ADMIN | `team-workload` ADMIN |
| `/admin`, `/settings/users` | ADMIN (redirect to /dashboard) | `@Roles(ADMIN)`: `POST /api/users`, `POST /api/users/:id/activate`, `GET /api/users/:id/archive`, `DELETE /api/users/:id`; `PATCH /api/users/:id` and `reset-password` have no decorator (service-level checks exist in `users.service.ts`, not reviewed in detail). API forces REALTOR on create. |
| `/settings/branding` | ADMIN | `@Roles(ADMIN)`: PATCH /api/branding, POST/DELETE logo, POST/DELETE watermark. `GET /api/branding` open to all authenticated users. |
| Settings index Branding/Users cards | ADMIN | — |
| Templates create/edit/delete | ADMIN or MANAGER | role checks present in `templates.service.ts` (not detailed) |
| Automation create/toggle/delete | ADMIN or MANAGER | role checks present in `automation.controller.ts` (not detailed) |
| Invitations | no UI | `@Roles(ADMIN)` on create/list/delete |
| Leads board bulk select/reassign/priority, assignee filter | **ADMIN only** | — |
| Lead detail right-panel assignee | **no gate** (all users) | — |
| PersonQuickActions assignee | ADMIN or MANAGER | — |
| Client reassign + merge | ADMIN or MANAGER | — |
| Property edit/delete, translation edit link/card | ADMIN or owner (`property.owner.id`) | code comments: API enforces owner-or-admin (`assertCanMutate`) |
| Deal delete, add/remove payments | ADMIN or MANAGER | — |
| Task assignee picker/filter, Schedule-showing agent picker, Inbox assign | ADMIN or MANAGER | — |
| Everything else | all authenticated | — |

### 11.3 API contracts the UI depends on (`src/lib/api.ts`)

All calls go to same-origin `/api/*` with `credentials: 'include'`. Error bodies are expected to be `{ message }`, which is shown in toasts or text. Lists are `{ items, total, page, pageSize }` where paginated.

| Group | Endpoints used |
|---|---|
| Auth | `POST /api/auth/login` · `/refresh` · `/logout` · `GET /api/users/me` |
| Clients | `GET/POST /api/clients` (search, status active/archived/blacklisted, page, pageSize) · `GET/PATCH/DELETE /api/clients/:id` · `POST /:id/merge {loserId}` · `POST /:id/log-call {outcome ANSWERED/NO_ANSWER/BUSY, note}` · `POST /:id/note {content, voice?}` · `POST /:id/send-email` · `GET/POST /:id/messages` |
| Properties | `GET/POST /api/properties` (search, type, status, mine, includeInactive, page…) · `GET/PATCH/DELETE /:id` · photos `POST /:id/photos`, `DELETE /:id/photos/:pid`, `PATCH /:id/photos/reorder {ids}`, `PATCH /:id/photos/:pid/cover` · translations `GET /:id/translations`, `PUT /:id/translations/:locale {text}`, `POST /:id/translations/:locale/draft` |
| Presentation | `GET /api/properties/:id/presentation?lang=` (HTML preview/link) · `GET /api/properties/:id/presentation.pdf?logo=0/1&watermark=0/1&lang=` · `POST /:id/presentation/send {clientId, lang}` |
| Uploads | `POST /api/uploads/image` · `/media` (returns url, kind, thumbnailUrl, posterUrl, blurhash, width, height, durationMs) · `/file` · `/audio` · `POST /api/documents/upload` (multipart + type/dealId/clientId) |
| Leads | `GET /api/leads` (full list, no pagination) · `GET/PATCH/DELETE /:id` · `PATCH /:id/stage {stage, lostReason}` · `POST /bulk-reassign` · `GET /stats` |
| Tasks / Showings | `GET/POST /api/tasks` · `PATCH/DELETE /:id` · `POST /:id/complete` · `GET/POST /api/showings` (from/to) · `GET /api/showings/conflicts` · `PATCH/DELETE /:id` |
| Activities / Notes / Notifications | `GET /api/activities/client/:id` and `/lead/:id` (cursor, types) · `POST /api/activities` · `PATCH /:id/pin` · `/api/notes` CRUD + `restore` + `permanent` · `/api/notifications`, `unread-count`, `:id/read`, `read-all` |
| Deals | `/api/deals` CRUD · `/api/payments` · `/api/documents` · `GET /api/contracts/deal/:id?templateId=` (fetched with absolute `NEXT_PUBLIC_API_URL`, opened as HTML in a new window) |
| Settings | `/api/templates` CRUD · `/api/automation-rules` CRUD · `/api/branding` GET/PATCH, `/logo` POST/DELETE · `/api/sources` |
| Users / Reports | `/api/users` list/get/create/update/activate/deactivate/`?hard=true`/archive/reset-password/activity · `/api/reports/*` (dashboard, funnel, leads-by-channel, agents, team-workload, source-roi, recent-activity, upcoming-showings, recent-leads, today-tasks, lost-reasons) |

### 11.4 Behaviors that must not break

1. **Auth cookie scheme:**
   - The API sets httpOnly `access_token` (15 min) and `refresh_token` (30 d), sameSite=lax.
   - The web sets and clears a readable **`crm_auth=1`** flag (30 d) that `middleware.ts` uses to gate 21 route prefixes and redirect to `/login?next=`.
   - `/` also reads it. 401 triggers one refresh then a retry.
   - Same-origin `/api` + `/uploads` rewrites exist so cookies stay first-party (mobile Safari ITP).
2. **`NEXT_PUBLIC_INTEGRATIONS_ENABLED`** is baked in at build time. When not `'true'` the following are hidden: `/inbox` & `/qualify` (redirect), lead chat tab, WhatsApp/Telegram/Email quick actions, ClientChat (replaced by ClientContactsCard), presentation email send, mobile card "Write" action. Designs must cover both states.
3. **Phone value format:** PhoneInput stores one string = dial prefix + typed digits/spaces/parens/hyphens (e.g. `+38067 123 45 67`). There is no separate dial-code field. The country is derived from the value, and the value is never rewritten on mount. Validation is the `phoneSchema` regex, **not strict E.164**. Do not split the field or change the stored format without API work.
4. **Lead stage rules:** LOST always requires a reason (dialog before API call); WON only from NEGOTIATION (the mobile "won" action bridges through NEGOTIATION); stage moves are optimistic with rollback and Undo.
5. **Legacy URLs keep working:** `/dashboard`, `/pipeline`, `/contacts`, `/inventory`, `/insights`, `/pool`, `/qualify` (bookmarks, notifications' `link`, palette, hotkeys).
6. **i18n:** every user-visible string should be a `next-intl` key present in all 5 `messages/*.json` files. Locale comes from the `NEXT_LOCALE` cookie; switching reloads the page.
7. **Themes:** `localStorage['crm-theme']` values, `data-theme` attribute + `.dark` class, and the no-flash inline script. Any new color must be defined for all 9 palettes (or derive from tokens).
8. **Presentation PDF:** query params `logo`, `watermark`, `lang` (ru/uk/en/fr/it); the default language is the UI locale; branding GET supplies the defaults. Translation states (translated = manual and current; outdated; missing) determine what the PDF contains. "Generate draft" never saves.
9. **Media pipeline:** uploads return blurhash/thumbnail/poster metadata consumed by BlurImage and the gallery; the first uploaded photo becomes the cover; delete is deferred 4.5 s for Undo.
10. **Destructive and dirty-form confirmations** (`useConfirm`): discard-changes on Client/Property/Lead/Deal forms; delete, blacklist, merge, deactivate, remove logo.
11. **Hotkeys and global overlays** are mounted once in `(app)/layout.tsx` and controlled by `stores/ui-store.ts`.
12. **Admin safety:** cannot deactivate or delete yourself or the last active admin; 409 on hard delete means "deactivate instead".
13. **Accessibility hooks:** Radix dialogs require a Title (sr-only titles are passed); 44px touch targets and 16px mobile input font are intentional.

---

## 12. What designers CAN freely change

These are presentational and have no effect on data, API or permissions (a developer still implements them):

- **Visual language:** color palettes and theme values (all 9), brand color unification, gradients, glass/blur intensity, shadows, radii, borders, iconography (lucide set or replacement), illustration and empty-state art, logo and wordmark.
- **Typography:** typeface choice (currently none loaded), type scale, weights, letter-spacing, heading hierarchy (including resolving the duplicate Topbar/page H1).
- **Layout and composition:** page grids, card groupings, section order, density (compact vs detailed), spacing scale, page max-widths, sidebar/topbar dimensions, whether side panels are panels or tabs, kanban column widths, dashboard widget arrangement, chart visual style (all charts are hand-drawn divs).
- **Component design:** a unified Tabs/Segmented control, Table, Alert, Pagination, Checkbox/Radio/Switch, Tooltip, Empty/Loading/Error patterns, badge and chip styles, field-level error presentation.
- **UX presentation:** microcopy and labels (via i18n keys), toast placement and wording, confirmation wording, motion and transitions, responsive behavior and mobile navigation composition (bottom-nav items, drawer), onboarding hints, ordering of fields within a form.
- **Login screen art direction:** video, poster and card style.

---

## 13. What must NOT change without a developer — per major screen

| Screen | Designers CAN | CANNOT change without a developer |
|---|---|---|
| **Login** | Background media, card style, layout, copy, animation | Email + password fields and minimum length 8; `next` redirect; 429/invalid error distinction; cookie flag; language switcher behavior (cookie + reload) |
| **App shell (sidebar, topbar, mobile nav, drawer)** | Visual design, order, icons, grouping, labels, which items appear in the bottom bar | Route targets and legacy aliases; ADMIN-only visibility of Insights; global overlays and hotkeys; notification polling; logout sequence |
| **Today** | Widget layout, KPI visuals, funnel chip style, empty-state art | Data sources (`/api/reports/*`, today-tasks with local end-of-day); task completion action; 3-hour showing window logic |
| **Leads board (desktop + mobile)** | Kanban/card visual design, column width, filters placement, mobile tab and card design, action-sheet look | Stage set and order, drag-to-change semantics, LOST requiring a reason, WON-only-from-NEGOTIATION, optimistic Undo, ADMIN-only bulk reassign/priority, priority fallback heuristic |
| **Lead workspace `/leads/:id`** | Panel arrangement (3-column/tabs), header, quick-action bar design, stale warnings style | Actions and their API calls (stage, priority, assignee, delete, call log with follow-up task, notes with voice, create property from note + link); integrations-flag gating of chat |
| **Lead form / Quick Capture** | Field grouping, tile/chip visuals, step order presentation, hint styling | Required client; blacklisted/archived blocking; duplicate warning; fields sent (purpose, urgency, budget, next action, interest property/note/photo/voice, priority); Quick Capture multi-entity create sequence and blocked-reason rules |
| **Clients list / Client card** | List/card layout, header design, menus, preferences presentation | Required fullName (2+) and phone; status filter values; archive/blacklist/merge/delete semantics and confirmations; ADMIN/MANAGER reassign + merge; auto-saved note; attachment kinds |
| **Client form** | Layout, source chip presentation, section design | Field set and validation (phone format, email), preferences payload shape (districts as array, numbers), dirty-discard confirm. Adding a client **type** field needs a developer. |
| **Properties list / Property card** | Grid/card design, gallery layout, lightbox look, badges, download menu design | Filters (type, status, mine, includeInactive), owner-or-ADMIN edit/delete, photo upload/reorder/cover/undo behavior, accepted MIME types |
| **Presentation PDF / translations** | Menu and status-marker design, translation card layout, the PDF look (server template, separate from this frontend) | Query params (logo, watermark, lang), 5 languages, default language rule, translation state meanings, draft-never-saves rule, owner/ADMIN gating |
| **Property form** | Layout, grouping, seller section design | Required type/status/district/address/area/price; currency 3 letters; numeric limits; voice description; seller fields |
| **Deals (list, board, new, detail)** | Visuals, totals presentation, board style | Amount > 0, commission 0–100, lead required, property conflict warning, stage change via the linked lead, WON → COMPLETED / LOST → CANCELLED side effects, ADMIN/MANAGER payments & delete, contract print, document types |
| **Tasks / Calendar** | List/pill design, calendar grid visuals, event colors, time picker design | Task/showing required fields, due-date quick presets, event kind → entity mapping, editable vs read-only events, drag/resize snapping, conflict check |
| **Notes** | Master–detail visuals, editor toolbar design | Auto-save, pin, soft delete/restore/permanent delete, rich-text (HTML) format |
| **Reports / Team / Lost reasons** | Chart and table visuals, KPI tiles, layout | ADMIN gating, metrics definitions, currency separation (never summing different currencies), drill-down links |
| **Settings → Users** | Table/sheet design, action iconography | ADMIN only; create forces REALTOR; password ≥ 8; self / last-admin protections; 409 handling; archive ZIP; activate/deactivate vs hard delete |
| **Settings → Branding** | Page layout, preview styling | ADMIN only; logo MIME types; opacity range 5–35 step 5; centered watermark; remove-logo confirmation; its role as PDF default |
| **Settings → Templates / Automation / Integrations** | Presentation, rule-builder UX | Template fields (name, language, content); rule modes, condition keys (sourceType, district, dealIntent), priority semantics; integration setup requirements |
| **Profile** | Layout | Editable vs read-only fields, password rules, API used; the separate UI-language cookie mechanism |
