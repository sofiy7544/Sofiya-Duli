# Component Inventory — apps/web/src/components

Source of truth: the component files themselves. "Used in" lists come from grepping import statements (`.bak` files excluded).
State vocabulary: Default · Hover · Active/pressed · Selected · Focus · Disabled · Loading · Empty · Success · Warning · Error.

Contents
1. UI kit (`components/ui`)
2. App shell and navigation
3. Global overlays
4. Forms and pickers
5. Domain display components
6. Media and audio
7. Calendar
8. Leads and deals
9. Admin
10. Requested components that do not exist (and what is used instead)
11. Duplicates and visual inconsistencies

---

## 1. UI kit (`components/ui`)

### Button — `ui/button.tsx`
- **Used in:** 52 files (practically every screen).
- **Built on:** `@radix-ui/react-slot` (`asChild`) + `class-variance-authority`.
- **Variants (`variant`):**

  | Variant | Classes |
  |---|---|
  | `default` | `bg-primary text-primary-foreground shadow-soft hover:shadow-glow hover:bg-primary/95` |
  | `outline` | `border border-border bg-surface text-foreground shadow-soft hover:bg-muted hover:border-primary/30` |
  | `ghost` | `text-foreground hover:bg-muted` |
  | `link` | `text-primary underline-offset-4 hover:underline` |
  | `destructive` | `bg-danger text-white shadow-soft hover:bg-danger/90` |
  | `glass` | `glass text-foreground hover:bg-white/85` (light-only hover color; defined but not used anywhere — verified by grep) |
- **Sizes (`size`):** `default` h-11 (sm: h-10) px-4 · `sm` h-10 (sm: h-8) px-3 text-xs rounded-lg · `lg` h-12 (sm: h-11) px-6 text-base · `icon` 44 (sm: 40) · `iconSm` 40 (sm: 32) rounded-lg.
- **States:**

  | State | Status |
  |---|---|
  | Default | PRESENT |
  | Hover | PRESENT (per variant) |
  | Active | PRESENT (`active:scale-[0.98]` + global press) |
  | Focus | PRESENT (`ring-2 ring-ring ring-offset-1`) |
  | Disabled | PRESENT (`opacity-50 pointer-events-none`) |
  | Selected | ABSENT (callers switch `variant` default/outline) |
  | Loading | ABSENT in the component; callers insert `<Loader2 className="animate-spin">` and set `disabled` |
  | Success/Warning | ABSENT (one ad-hoc `bg-emerald-600` "Готовий купити" button in PersonQuickActions) |
- **Appearance props:** `variant`, `size`, `asChild`, `className`.
- **Inconsistencies:**
  - Many screens bypass Button with raw `<button>`: Topbar quick capture, kanban toolbar toggles, calendar nav, all pills/segmented controls, icon buttons in admin tables (`IconBtn`, 32px), notes toolbar.
  - Radius differs: Button `rounded-xl`, raw buttons `rounded-lg`/`rounded-md`.

### Input — `ui/input.tsx`
- **Used in:** 30 files.
- **Look:** `h-11 sm:h-10 rounded-xl border-border bg-surface px-3.5 text-base sm:text-sm shadow-soft`.
- **States:**

  | State | Status |
  |---|---|
  | Default | PRESENT |
  | Focus | PRESENT (`border-primary shadow-glow`, no outline) |
  | Disabled | PRESENT (`opacity-50 cursor-not-allowed`) |
  | Hover | ABSENT |
  | Error/invalid | ABSENT (schedule-showing adds `border-red-400` ad hoc on time conflicts) |
  | Success, Loading | ABSENT |
- **Appearance props:** `className`, native `type`/`disabled`.
- **Inconsistencies:**
  - Login overrides all styling via CSS Module (46px, dark glass).
  - Callers force `h-8`/`h-9` (lead detail search, admin search, deals board search), breaking the 44px mobile touch height.
  - Raw `<input>`/`<textarea>` elsewhere with different styles: notes search `rounded-xl bg-background focus:ring-2 ring-primary/30`; client chat composer `bg-muted/40 focus:bg-white`; lead chat composer; LostReasonDialog textarea `rounded-lg focus:ring-2 ring-ring`; inbox textarea `rounded-md border-input focus:ring-1`.

### Textarea — `ui/textarea.tsx`
- **Used in:** 10 files.
- **Look:** `min-h-[88px] rounded-xl px-3.5 py-2.5 text-sm shadow-soft`.
- **States:** Focus PRESENT (border-primary + glow) · Disabled PRESENT · Hover, Error ABSENT.
- **Inconsistencies:** always `text-sm`, including on mobile (Input switches to `text-base` < sm to avoid iOS zoom; Textarea does not).

### Label — `ui/label.tsx`
- **Used in:** 23 files.
- **Built on:** Radix Label; `text-sm font-medium leading-none`.
- **States:** none beyond default.
- **Inconsistencies:** callers restyle labels three different ways:
  - `text-xs uppercase tracking-wide text-muted-foreground` (tasks, event form, user form, quick capture);
  - plain `Label` (client/property/lead forms);
  - `text-[11px] uppercase tracking-wider` raw `<label>` (lead detail right panel).
  - The required marker is text appended to the label (`" *"`) and is inconsistent (CreateRealtorSheet has required fields without `*`).

### Select — `ui/select.tsx`
- **Used in:** 25 files.
- **Built on:** Radix Select, `position="popper"`.
- **Parts:**
  - Trigger: `h-11 sm:h-10 rounded-xl bg-surface shadow-soft`, chevron 16px at 50% opacity.
  - Content: `rounded-xl border bg-surface shadow-lift max-h-96`.
  - Item: `py-2 pl-8 text-sm`, check indicator on the left.
- **States:**

  | State | Status |
  |---|---|
  | Trigger hover | PRESENT (`border-primary/30`) |
  | Trigger focus | PRESENT |
  | Trigger disabled | PRESENT |
  | Item focus/highlight | PRESENT (`bg-muted`) |
  | Item selected | PRESENT (Check icon) |
  | Item disabled | PRESENT (`opacity-50`) |
  | Open-state styling | ABSENT |
  | Error | ABSENT |
  | Empty list | ABSENT (QuickCapture renders a custom "no properties" div inside) |
- **Appearance props:** `className` on Trigger (callers set `h-8`/`h-9`, widths 88–180px, `bg-white` in the leads bulk bar).
- **Inconsistencies:** Content uses `bg-surface rounded-xl shadow-lift`, while DropdownMenu content uses `bg-background rounded-md shadow-md`.

### DropdownMenu — `ui/dropdown-menu.tsx`
- **Used in:** 6 files (ThemeToggle, LanguageSwitcher, NotificationBell, UserMenu, DownloadPresentation, client detail "…" and assignee menus).
- **Parts:** Content `min-w-[10rem] rounded-md border bg-background p-1 shadow-md`; Item `px-3 py-2 text-sm rounded-sm focus:bg-muted`; Label `text-xs font-semibold muted`; Separator; `DropdownMenuCheck` (= lucide Check).
- **States:**

  | State | Status |
  |---|---|
  | Item hover/focus | PRESENT (`bg-muted`) |
  | Selected | PRESENT (callers render a Check icon) |
  | Disabled item | ABSENT (no `data-[disabled]` style) |
  | Destructive item | ad hoc (`text-danger focus:text-danger` on client delete) |
  | Loading | ABSENT |
  | Empty | ad hoc (NotificationBell "empty" paragraph) |
- **Inconsistencies:** see Select. DownloadPresentation embeds native checkbox/radio `<label>` rows (`hover:bg-muted/60 rounded-md px-2 py-1.5`) that look different from menu items.

### Dialog — `ui/dialog.tsx`
- **Used in:** 11 files.
- **Built on:** Radix Dialog.
- **Parts:**
  - Overlay `bg-black/45 backdrop-blur-sm`.
  - Content `w-[92vw] max-w-md rounded-2xl bg-surface p-5 shadow-lift gap-4`, fade-in.
  - Close button 32px top-right (`showCloseButton`, default true).
  - Header `pr-8 gap-1`; Title `text-base font-semibold`; Description `text-xs muted`.
  - Footer: stacked `flex-col-reverse` below sm, right-aligned row ≥ sm.
- **States:** Open/closed fade PRESENT · Close hover/focus PRESENT · Loading/Error: inside content only (caller).
- **Appearance props:** `className` (width overrides: `max-w-sm`, `max-w-lg`, `sm:max-w-2xl`, `max-w-3xl`, `max-h-[90vh] overflow-y-auto`), `showCloseButton`.
- **Inconsistencies:** hand-rolled modals bypass it: inbox "duplicate lead" (`fixed inset-0 bg-black/40`, `rounded-xl shadow-xl p-6 max-w-sm`) and WheelTimePicker (`surface-card animate-scale-in max-w-xs`).

### ConfirmDialog / useConfirm / ConfirmDialogHost — `ui/confirm-dialog.tsx`
- **Used in:** 16 files (host mounted in `(app)/layout.tsx`).
- **Variants:** `destructive` (confirm button variant destructive vs default).
- **States:** Busy PRESENT (both buttons disabled, confirm label becomes "loading"). A second concurrent request resolves `false` (no stacking).
- **Appearance props:** `title`, `description`, `confirmLabel`, `cancelLabel`, `destructive`, `busy`.
- **Inconsistencies:** the default confirm label is "Delete" even for non-delete confirmations when no `confirmLabel` is passed (admin activate/deactivate, client blacklist toggle).

### Sheet — `ui/sheet.tsx`
- **Used in:** 7 files (MobileDrawer, LeadActionSheet, EventForm, UserFormSheet, ResetPasswordDialog, UserActivitySheet, CreateRealtorSheet).
- **Built on:** Radix Dialog.
- **Sides (`side`):**
  - `left` (default): `w-[90vw] max-w-[320px] sm:w-[280px]`
  - `right`: full height, width from caller
  - `bottom`: `max-h-[90vh] rounded-t-2xl`, safe-area padding
- **Other parts:** overlay `bg-black/40 blur-sm`; `SheetCloseIcon` 32px; optional `title` rendered sr-only.
- **States:** open/close translate PRESENT. Header, footer and scroll layout are ABSENT from the component, so every caller builds its own.
- **Appearance props:** `side`, `className`, `title`.
- **Inconsistencies:**
  - `CreateRealtorSheet` calls `SheetContent` without `side`, so it defaults to **left** while every other admin sheet opens on the right.
  - Header close buttons differ: 32px icon in admin sheets vs `h-11 px-3` icon + "Cancel" text in EventForm.
  - Right-sheet widths vary: 400 / 420 / `sm:max-w-md`.

### SlideOver — `ui/slide-over.tsx`
- **Used in:** 1 file (QuickCreate).
- **Look:** right panel `w-[92vw]`; widths `sm` 420 · `md` 560 (default) · `lg` 720 · `xl` 880; overlay `bg-black/40`.
- **Parts:** `SlideOverHeader` (title, description, optional expand button, close; `px-5 py-4 border-b border-border/60`), `SlideOverBody` (scroll, `px-5 py-4`), `SlideOverFooter` (`px-5 py-3`, right-aligned).
- **States:** open/close translate PRESENT.
- **Appearance props:** `width`, `className`; header `title`/`description`/`onExpand`.
- **Inconsistencies:** it is a second right-panel system parallel to Sheet, with its own header/footer anatomy, different widths and a different border opacity.

### Card family — `ui/card.tsx`
- **Used in:** 31 files.
- **Parts:** `Card` `rounded-xl border bg-surface shadow-card`; `CardHeader` `p-5 sm:p-6 space-y-1.5`; `CardTitle` h3 `font-semibold tracking-tight2` (size from h3 base, 18px, unless overridden); `CardDescription` `text-sm muted`; `CardContent` `p-5 pt-0 sm:p-6`; `CardFooter`.
- **States:** Default PRESENT · Hover ABSENT (callers add `surface-hover` or `hover:border-primary/50`).
- **Appearance props:** `className` only.
- **Inconsistencies:**
  - Parallel `.surface-card` CSS class (radius `var(--radius)` = same 14px, but **theme-aware** `--shadow-card`), used in 20+ places.
  - `<Card>` uses the static Tailwind `shadow-card`, so Cards and surface-cards have different shadows in dark and premium themes.
  - CardTitle sizes are overridden inconsistently (`text-sm`, `text-base`, `text-2xl`, `text-base sm:text-lg`).

### Badge — `ui/badge.tsx`
- **Used in:** 18 files.
- **Base:** `rounded-full border px-2.5 py-0.5 text-xs font-medium`.
- **Variants:**

  | Variant | Classes |
  |---|---|
  | `default` | `bg-primary/10 text-primary-700` (static blue text) |
  | `secondary` | `bg-muted text-foreground/80` |
  | `outline` | `border-border bg-surface` |
  | `success` | `bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100` |
  | `warning` | `bg-amber-50 text-amber-700 ring-amber-100` |
  | `destructive` | `bg-red-50 text-red-700 ring-red-100` |
  | `accent` | `bg-violet-50 text-violet-700 ring-violet-100` |
  | `dot` | transparent, `px-1.5` |
- **States:** non-interactive; no hover/focus. Status meaning comes only from the variant.
- **Appearance props:** `variant`, `className` (callers shrink to `text-3xs`).
- **Inconsistencies:**
  - success/warning/destructive/accent have **no dark variants** (light pastel chips on dark themes).
  - Kanban/mobile stage chips don't use Badge (`STAGE_SOFT` spans, `text-[11px]`).
  - Inbox status chips use raw `bg-amber-100 text-amber-700`.
  - The `dot` variant is defined but never used.

### Avatar — `ui/avatar.tsx`
- **Used in:** 16 files.
- **Sizes (`size`):** `xs` 24px/10px text · `sm` 32/12 · `md` 40/14 (default) · `lg` 48/16.
- **Look:** image or initials on one of 8 hashed gradients; `ring-2 ring-surface shadow-soft`.
- **States:** image-error fallback to initials PRESENT; loading (lazy img) no placeholder.
- **Appearance props:** `name`, `size`, `src` / `avatarUrl`, `className`.
- **Inconsistencies:** callers resize ad hoc (`h-4 w-4 text-[10px] ring-1` in tasks and deal cards, `h-20 w-20 text-2xl ring-4` on client detail). User avatars use **email** as the name seed (UserMenu, MobileDrawer), so initials are email letters.

### PhoneInput — `ui/phone-input.tsx`
- **Used in:** 7 files (ClientForm, PropertyForm seller phone, QuickClientDialog, QuickCaptureDialog, Profile, CreateRealtorSheet, UserFormSheet).
- **Anatomy:** country button (flag + dial code in mono + chevron; `rounded-l-xl`) joined to a tel input (`rounded-r-xl`), both `h-11 sm:h-10`. The dropdown (`w-72 max-h-80 rounded-xl shadow-lift`) has a sticky search, pinned countries, a divider and the rest sorted by name.
- **States:**

  | State | Status |
  |---|---|
  | Button hover | PRESENT |
  | Input focus | PRESENT |
  | Selected country | PRESENT (`bg-primary/5 text-primary`) |
  | Empty search | PRESENT ("noCountry") |
  | Disabled | style defined but no `disabled` prop exposed |
  | Error | ABSENT |
  | Keyboard navigation in list | ABSENT (only Escape closes) |
- **Appearance props:** `className`, `placeholder`, `required`, `autoFocus`, `id`, `locale` (sets the default country and sort order).
- **Inconsistencies:** it is a custom popover rather than Radix; its click-away layer sits at `z-30` and the list at `z-40`, below dialogs (z-50). The picker works inside dialogs because it is rendered inline, not portaled.

### Skeleton / PageSkeleton — `ui/skeleton.tsx`
- **Used in:** 13 files.
- **Look:** `Skeleton` `animate-pulse rounded-md bg-muted/70` (shimmer via globals).
- **Variants:** `PageSkeleton variant=` `detail` (default) · `list` · `kanban` · `form`.
- **States:** Loading only.
- **Inconsistencies:** other loading patterns coexist: inline pulse divs (clients/properties/today), `Loader2` spinner cards (admin, users, branding, notes, inbox), plain "…" text (UserActivitySheet), "Loading" text card (calendar), rendering `null` (ActivityTimeline, PropertyTranslations), and no loading state at all (tasks, templates, automation).

### EmptyState — `ui/empty-state.tsx`
- **Used in:** 4 files (clients list, properties list, app error, app not-found).
- **Variants:** `card` (default, wrapped in Card) · `inline` · `compact`.
- **Look:** 56px (compact 40px) muted rounded-2xl icon tile, title, description, action.
- **Appearance props:** `icon`, `title`, `description`, `action`, `variant`, `className`.
- **Inconsistencies:** most empty states are hand-built instead:
  - leads `Card p-12` text only;
  - tasks emerald gradient tile + text;
  - deals Briefcase icon;
  - lost reasons emerald tile;
  - calendar agenda CalendarRange icon;
  - notes StickyNote icon + link;
  - kanban columns dashed boxes;
  - today "allDone" CheckCircle2 emerald.

### PeriodPill — `ui/period-pill.tsx`
- **Used in:** 2 files (leads board, tasks).
- **Tones (`tone`):** `default`, `danger`.
- **States:** Active/selected PRESENT (`bg-primary` or `bg-danger` + `shadow-glow`) · Hover PRESENT · Focus: global outline only · Disabled ABSENT.
- **Appearance props:** `label`, `active`, `tone`.
- **Inconsistencies:** near-identical copies live elsewhere as `StatusPill` (tasks, adds count bubble), `ViewPill` (deals, adds icon), calendar view switch, admin status filter and `ModeBtn` (reset password). See §11.

### Toaster — `ui/sonner-toaster.tsx`
- **Used in:** `providers.tsx` (mounted once).
- **Config:** `position="bottom-right"`, `richColors`, `closeButton`; toast `rounded-xl border shadow-lift bg-surface text-sm`.
- **States:** success / error / warning / info PRESENT via sonner `richColors` · action button (Undo / View) PRESENT · loading toasts not used.
- **Inconsistencies:** the theme mapping sends only `dark`/`midnight` to sonner dark, so `graphite` (a dark theme) gets light toasts.

---

## 2. App shell and navigation

| Component | File | Used in | Variants / states | Appearance props | Notes / inconsistencies |
|---|---|---|---|---|---|
| **Sidebar** | `sidebar.tsx` | `(app)/layout.tsx` | Items: default, hover (`bg-muted`), active (`bg-primary` + glow + 6px dot), role-filtered (Insights ADMIN). Hidden < md. | none | 7 items + Settings. Settings icon keeps `text-muted-foreground` when active (other items switch). Hardcoded "MaybSrm", "Premium", "v0.7 · self-hosted". Legacy URL map highlights e.g. /leads under Pipeline. |
| **Topbar** (Header) | `topbar.tsx` | layout | Sticky glass bar; quick capture full label ≥ sm, icon-only < sm | none | Title from `TITLE_KEY` map; no entry for `/notes`, `/team`, `/admin` → empty title. `/tasks` shows "Today", `/deals` shows "Pipeline". Renders an `<h1>` while pages also render an `<h1>`. Quick-capture label and tooltip hardcoded in Ukrainian. Uses raw buttons, not `Button`. |
| **MobileNav** (bottom nav) | `mobile-nav.tsx` | layout | 4 items; active `bg-primary` + glow; `active:scale-95`; `md:hidden` | none | Doc comment says 5 items incl. "More" — only 4 exist. Legacy map covers `/dashboard`, `/leads`, `/deals` only, so **Contacts is not highlighted on `/clients/*`**. |
| **MobileDrawer** | `mobile-drawer.tsx` | Topbar | Sheet left; items active/hover; profile row; sign out (ghost, hover danger) | none | Active match has no legacy map → **nothing highlighted on `/leads`, `/clients`, `/properties`, `/reports`**. Sheet title "Меню" hardcoded. |
| **UserMenu** | `user-menu.tsx` | Topbar | Dropdown; trigger outline sm with avatar (email shown ≥ sm) | none | Redirects to /login if `/users/me` fails. |
| **NotificationBell** | `notification-bell.tsx` | Topbar | Count badge (`bg-red-500`, "9+"), unread row `bg-blue-50`, empty text, "mark all read" link | none | Polls unread count 15 s → backs off to 5 min. Dates formatted with hardcoded `ru-RU`. Unread row color is light-only. No loading state while the list fetches. |
| **ThemeToggle** | `theme-toggle.tsx` | Topbar | Dropdown: Classic (4) + Premium (5) + System; Check on current | none | Trigger icon reflects the resolved theme. |
| **LanguageSwitcher** | `language-switcher.tsx` | Topbar, Login | Dropdown; flag + name ≥ sm, flag only < sm; disabled while pending | none | Full page reload on change. |
| **ThemeProvider** | `theme-provider.tsx` | providers, toggle, toaster | — | — | 10 themes; see DESIGN-HANDOFF §10 for the mismatch with the no-flash script. |
| **Providers** | `providers.tsx` | root layout | — | — | QueryClient (not used by the reviewed screens), ThemeProvider, Toaster. |
| **HotkeysProvider** | `hotkeys-provider.tsx` | layout | ⌘K, ⌘⇧N, ⌘N/L/O/S, G→T/I/P/C, Shift+? | — | Overrides browser shortcuts ⌘N/⌘L/⌘O/⌘S. |

---

## 3. Global overlays

| Component | File | Used in | Variants / states | Notes / inconsistencies |
|---|---|---|---|---|
| **CommandPalette** | `command-palette.tsx` | layout | cmdk Dialog; search ≥ 2 chars (250 ms debounce) → Contacts/Leads/Inventory groups; Navigate/Create/Other; selected `bg-muted`; empty text | Own overlay/content styling (`rounded-2xl`, `bg-black/40`) rather than `ui/dialog`. "Швидке захоплення (нічний flow)" and property "Продаж" hardcoded. Group headings use `text-[11px] tracking-eyebrow`. No loading indicator while searching. |
| **QuickCreate** | `quick-create.tsx` | layout | SlideOver: client (lg), lead (md), property (lg), showing (md) | Success toast with "View" action. Mixes `bare` LeadForm/ShowingForm with full-card ClientForm/PropertyForm, so card chrome appears inside the panel for client/property only. |
| **QuickCaptureDialog** | `quick-capture-dialog.tsx` | layout | Dialog `max-w-md sm:max-w-2xl`; 3 sections with `SegTabs`; `ActionCard` selectable tiles; time chips; blocked-reason hint (amber); saving spinner | `SegTabs` is its own segmented control (`rounded-md border text-xs`). Presets depend on i18n. |
| **HotkeysHelpDialog** | `hotkeys-help-dialog.tsx` | layout | Dialog `max-w-lg`; kbd chips | Shows ⌘ symbols on every OS. |
| **ConfirmDialogHost** | `ui/confirm-dialog.tsx` | layout | see §1 | |

---

## 4. Forms and pickers

| Component | File | Used in | Key states present | Appearance props | Notes / inconsistencies |
|---|---|---|---|---|---|
| **LeadForm** | `lead-form.tsx` | `/leads/new`, QuickCreate | Blacklist (red) / archived (slate) / duplicate (amber) warning boxes; purpose tile selected; urgency chip selected; saving spinner; error text (`text-danger`); dirty-cancel confirm; photo uploading; submit disabled if no client or client blocked | `bare`, `submitLabel`, `defaultClientId` | Purpose/urgency/budget/next-contact labels **hardcoded Russian**. Priority chips colored per level with dark variants. Contains inline `PropertyCombobox` (custom dropdown `z-20 rounded-xl shadow-lift`). |
| **ClientForm** | `client-form.tsx` | `/clients/new`, `/clients/[id]/edit`, QuickCreate | Source quick chips selected (`bg-primary shadow-glow`); attachment uploading spinner; saving; error text (`text-red-600`); dirty confirm | `existing`, `submitLabel` | No input for client **type** (BUYER/SELLER/INVESTOR) although the form state has it. Attachment labels/tooltips hardcoded Russian. Uses browser `<audio controls>` for voice previews (AudioPlayer elsewhere). |
| **PropertyForm** | `property-form.tsx` | `/properties/new`, `/properties/[id]/edit`, QuickCreate, LeadForm dialog, lead detail dialog | Saving; error text (`text-red-600`); dirty confirm | `existing`, `defaults`, `submitLabel` | Seller card titles/placeholders hardcoded Ukrainian, attachment tooltips Russian. Currency is a free 3-letter text input (other forms use a Select of currencies). Floor input `min=1`, schema allows 0. |
| **ShowingForm** | `showing-form.tsx` | QuickCreate | Saving; error text | `bare` | Separate date + time inputs; duration Select 30–120. |
| **QuickClientDialog** | `quick-client-dialog.tsx` | LeadForm, EventForm | Saving; submit disabled until name + phone | `initialName`, `initialPhone` | Dialog `max-w-sm`. |
| **QuickPropertyDialog** | `quick-property-dialog.tsx` | ScheduleShowingDialog, EventForm | Saving; disabled logic | `initialAddress`, `initialDealIntent` | Submit-disabled check omits `area` (only HTML `required`). |
| **ScheduleShowingDialog** | `schedule-showing-dialog.tsx` | client detail, PersonQuickActions | Property combobox; **conflict warning** (red box, inputs `border-red-400`); agent picker (ADMIN/MANAGER); saving | `client` | Conflict texts hardcoded Ukrainian; date `uk-UA`. Duration input min 15 step 15. |
| **CallDispositionDialog** | `call-disposition-dialog.tsx` | lead detail, client detail, PersonQuickActions | Outcome tiles selected (emerald/amber/slate with dark variants); follow-up chip selected; custom datetime; "will create task" hint; saving | ids / name / phone | "або точний час:" hardcoded. |
| **LostReasonDialog** | `lost-reason-dialog.tsx` | leads board, lead detail, deals board, LeadActionSheet, PersonQuickActions | Radio rows selected (`border-primary bg-primary/5`); "Other" textarea; confirm disabled until valid; saving label | — | 6 i18n reasons (priceTooHigh, boughtElsewhere, changedMind, noFinancing, badLocation, other) that differ from the shared enum `LostReason` codes. Sends translated text. Raw textarea styling. |
| **MergeClientDialog** | `merge-client-dialog.tsx` | client detail | Amber warning; search; list item selected; loading spinner; empty text; merging spinner | `winner` | Merge confirm is a stacked ConfirmDialog over this dialog. |
| **PersonQuickActions** | `person-quick-actions.tsx` | lead detail, client detail | Mode panels (note / remind / email); lead controls (stage select, priority buttons, assignee); saving spinner; error text | `showLeadControls`, `showNote` | Priority buttons show raw `hot/warm/cold` (capitalized, not translated). "Нагадати", reminder presets, "Готовий купити" (emerald button) hardcoded Ukrainian. Stage select lacks **LOST** and uses buyer stages incl. SELECTION. |
| **ClientActions** | `client-actions.tsx` | **not imported anywhere** | call/note/email modes | — | Superseded by PersonQuickActions; dead UI. |
| **WheelTimePicker** | `wheel-time-picker.tsx` | `/tasks` | iOS-style wheels (44px rows, 5-min steps), selection band, fade masks | — | Hand-rolled full-screen overlay (not Dialog). `bg-primary/8` band doesn't compile (no tint). |
| **NoteEditor** | `notes/note-editor.tsx` | `/notes`, ClientForm, ClientNote | Toolbar button active (`bg-primary`); loading spinner until the editor mounts | `minHeightClass` | Toolbar tooltips hardcoded Ukrainian, placeholder hardcoded Russian ("Начните писать…"). Content styles in `globals.css .note-content`. |
| **EventForm** | `calendar/event-form.tsx` | `/calendar` | Kind icon tile colored by kind; quick time chips; read-only notice (amber) for non-editable events; disabled fields; delete; saving | `event`, `initialDate` | Sheet right `sm:w-[420px]`. Close button differs from other sheets (44px tall + "Cancel" text). Amber notice has no dark variant. |

---

## 5. Domain display components

| Component | File | Used in | Variants / states | Notes |
|---|---|---|---|---|
| **SourceIcon** (source badge) | `source-badge.tsx` | clients list/detail, leads board/detail, ClientForm | 20px rounded-md tile with brand-tinted bg and 12px icon | Callers override size to 12px. Unknown types fall back to MANUAL. |
| **ActivityTimeline** | `activity-timeline.tsx` | lead detail | Card list with 32px icon circles; metadata lines (stage from→to, assignment, voice player); empty text | Loading renders **nothing** (`null`). Time format hardcoded `ru-RU`. Hides auto-assignment events. |
| **NotesPanel** | `notes-panel.tsx` | lead detail | Composer (amber gradient); voice preview; pinned section (amber, max 3); note items (violet tint if voice); pin button hover-reveal; loading spinner; empty text | "Закріплені", pin tooltips hardcoded Ukrainian. |
| **ClientNote** | `client-note.tsx` | client detail | Save status: Saving… (spinner) / Not saved (danger) / Updated <date> (emerald check); attachments list | Title "Заметка" and status texts hardcoded, mixed Russian and Ukrainian. Date `uk-UA`. |
| **ClientChat** | `client-chat.tsx` | client detail {flag} | Channel tabs (active `bg-primary`, green dot if contact exists); bubbles out/in; empty state; loading; info line; disabled composer if no contact | Incoming bubble `bg-white`, input `focus:bg-white` (light-only). |
| **ClientContactsCard** | `client-contacts-card.tsx` | client detail (flag off) | tel/mailto rows; "—" when empty | |
| **DownloadPresentation** | `download-presentation.tsx` | property detail | Trigger loading ("downloading" + spinner); menu checkboxes/radios; translation markers ✓ (emerald) ⚠ (amber) – (muted); edit pencil (owner/ADMIN); warning text (amber-700); error text | Error uses `text-destructive` (**undefined token → not red**). |
| **SendPresentation** | `send-presentation.tsx` | property detail | Preview / Copy link; {flag} client select + send; info text | |
| **PropertyTranslations** | `property-translations.tsx` | property edit | Coverage badge (success when complete); per-language badges success/warning/outline/accent("unsaved"); draft generating spinner; will-delete warning (amber); save count | Renders `null` while loading. |
| **PropertyGallery** | `property-gallery.tsx` | property detail | Empty gradient placeholder; cover + 2 side tiles (+N overlay); "Cover" chip; video play badge + duration; mobile thumbnail strip | Fixed `h-[360px]`. "Cover" hardcoded English. |
| **PropertyPhotos** | `property-photos.tsx` | property detail | Empty dropzone; drag-over highlight; upload progress ring; sortable tiles (dragging ring); hover-reveal controls ≥ sm (always visible < sm); cover star selected; add tile; undo toast | ARIA labels in English ("Set as cover", "delete"). |

---

## 6. Media and audio

| Component | File | Used in | Variants / states | Appearance props | Notes |
|---|---|---|---|---|---|
| **AudioPlayer** | `audio-player.tsx` | 7 files | `compact` (28px button, 120px bar, 11px time) / regular (36px, 180–220px, 12px); play/pause; hover scale; loading = disabled button (no spinner); seek by click | `compact`, `className`, `src`, `durationMs`, `mime` | Gradient button `from-primary to-violet-500` (violet is static). **Error state ABSENT** (play failure silently resets). Single-playback policy. Some places still use browser `<audio controls>` (ClientForm, PersonQuickActions note preview, VoiceRecorder preview, ClientActions). |
| **VoiceRecorder** | `voice-recorder.tsx` | 7 files | idle (outline Mic button; `compact` hides label) → recording (red pulsing dot, timer, Stop destructive) → previewing (native `<audio controls>`, Save, discard) → uploading (spinner); errors via toast (permission denied / start failed / upload failed) | `compact` | Auto-stop at 10 min. The preview uses the browser player, not AudioPlayer. |
| **BlurImage** | `media/blur-image.tsx` | lightbox, gallery, photos | blurhash canvas placeholder → 500 ms fade-in; muted bg fallback | `className`, `imgClassName`, `eager` | |
| **MediaLightbox** | `media/media-lightbox.tsx` | gallery, photos | fullscreen `bg-black/90 z-[60]`; counter pill; download; close; prev/next 44px round buttons; swipe; pinch/wheel/double-tap zoom; video autoplay | — | Fully custom (framer-motion); not Dialog, so no focus trap. |

---

## 7. Calendar

| Component | File | Variants / states | Notes |
|---|---|---|---|
| **MonthView** | `calendar/month-view.tsx` | 7-col grid; today (primary date chip + tint); out-of-month muted; weekend tint; hover "+" create; max 3 events + "more" | "+" aria-label "Создать" hardcoded. |
| **TimeGridView** | `calendar/time-grid-view.tsx` | week/day; now-line (red); drag-move & resize with snap preview (`border-primary/60 bg-primary/10`); lanes for overlaps; today tint | Hours 7–23 only; mouse events only (no touch drag). |
| **AgendaView** | `calendar/agenda-view.tsx` | grouped by day with sticky headers; empty card | "Завтра" hardcoded for both uk and ru. |
| **EventPill** | `calendar/event-pill.tsx` | `variant`: `compact` (month) · `block` (grid) · `inline` (agenda); overdue (red border/badge); done (opacity + line-through) | Tones from `EVENT_KIND_TONE` (light-only). |
| **EventForm** | see §4 | | |

---

## 8. Leads and deals

| Component | File | Used in | Variants / states | Notes |
|---|---|---|---|---|
| **KanbanColumn / LeadCardDraggable / LeadCardView / LostDropTarget** | inline in `app/(app)/leads/page.tsx` | leads board | Column drop-hover ring; compact width; empty dashed box; card priority left bar; stale pulsing amber dot; dragging overlay (rotate, lift); selected ring (ADMIN checkbox); LOST bar hover/over (danger) | Not reusable components. Client type label hardcoded **Ukrainian** ("Продавець/Інвестор/Покупець"). Checkbox is the browser default. |
| **LeadsMobile** | `leads/leads-mobile.tsx` | leads board (< md) | Stage tabs with counts (active primary); Detailed/Compact toggle; empty dashed box | Labels hardcoded **Russian** ("Подробно", "Компактно", "Все", "лид(ов)"). `bg-card` undefined → no background. |
| **LeadCardMobile** | `leads/lead-card-mobile.tsx` | LeadsMobile | `compact` row / detailed card; urgency chip; overdue/today colored next action; action bar Call / Write {flag} / Action; disabled call if no phone | Hardcoded Russian. `bg-card` undefined. |
| **LeadActionSheet** | `leads/lead-action-sheet.tsx` | LeadsMobile | Bottom sheet; grouped action rows (44px min); stage picker step; busy overlay spinner; toasts | 29 hardcoded Russian strings. `bg-card` undefined. |
| **DealsBoard / BoardColumn** | `deals/deals-board.tsx` | `/deals` | Toolbar search/agent/compact/scroll; column totals by currency; drop-hover ring; empty dashed; LOST dialog | Redeclares `STAGE_ACCENT` (stage-style says not to); columns exclude SELECTION; fixed `w-72`/`w-56` (leads uses `w-[80vw] max-w-72`). |
| **DealCard / DealCardDraggable** | `deals/deal-card.tsx` | DealsBoard | Left bar primary/40 or red if overdue; next-action box amber / red (overdue) / dashed muted (none); dragging | Light-only amber/red boxes. |

---

## 9. Admin

| Component | File | Used in | States | Notes |
|---|---|---|---|---|
| **UserFormSheet** | `admin/user-form-sheet.tsx` | `/admin` only | create/edit; email disabled on edit; password hint; error text; saving | Roles offered **ADMIN/MANAGER/EMPLOYEE**, while `/admin` filters show ADMIN/REALTOR and `/settings/users` creates REALTOR. Locale ru/uk only. Browser-default checkbox. |
| **ResetPasswordDialog** | `admin/reset-password-dialog.tsx` | `/admin`, `/settings/users` | Mode segmented (generate/manual); result with copy → "copied" (emerald check); saving | It is a **Sheet** despite the name. Sheet title "Сброс пароля" and error "Ошибка" hardcoded Russian. Amber icon tile light-only. |
| **UserActivitySheet** | `admin/user-activity-sheet.tsx` | `/admin`, `/settings/users` | counter cards; recent tasks with status badges; loading "…"; empty | |
| **CreateRealtorSheet** | inline in `settings/users/page.tsx` | `/settings/users` | fields; saving; disabled until valid | Opens from the **left** (no `side`). Password field is `type="text"`. No `*` on required fields. |
| **IconBtn** | inline in `admin/page.tsx` and `settings/users/page.tsx` (duplicated) | tables | 32px icon button; hover; disabled (`opacity-40`, users page only) | Two copies with different disabled support. |

---

## 10. Requested components that do not exist

| Requested | Status | What is used instead (where) |
|---|---|---|
| **Checkbox** | ABSENT | Native `<input type="checkbox">` with `accent-primary` (branding, download menu) or unrendered forms-plugin classes (`rounded text-primary focus:ring-primary`; kanban, UserFormSheet). Tiptap task-list checkbox styled in `globals.css`. |
| **Radio** | ABSENT | Native radio with `accent-primary` (LostReasonDialog, download language, inbox share mode) |
| **Switch / Toggle** | ABSENT | Checkboxes (branding "enabled"), outline/default buttons, custom toggles (kanban "compact", "show lost", properties "show sold/archived") |
| **Tabs** | ABSENT | ~11 hand-built segmented controls/tab rows: PeriodPill, StatusPill, ViewPill, calendar view switch, admin status filter, ModeBtn, SegTabs (quick capture), clients status segmented, properties scope, notes Notes/Trash, lead-form interest mode, lead detail Chat/Notes/Activity text tabs, lead chat channel tabs (underline style), client chat channel tabs, mobile stage tabs (pills) |
| **Tooltip** | ABSENT | Native `title` attributes only |
| **Popover / Combobox** | ABSENT | Custom absolute dropdowns: PropertyCombobox (LeadForm), ScheduleShowing property picker, PhoneInput country list |
| **Table** | ABSENT | Raw `<table>` in reports (agents, ROI), team, admin, settings/users, lost reasons. Header `text-2xs` (reports/team) vs `text-xs` (admin/users); cell padding `py-2.5`/`py-3` vs `px-4 py-3`. |
| **Pagination** | ABSENT | Inline Prev / "page X of Y" / Next outline buttons on `/clients` and `/properties` (duplicated code) |
| **Alert / Callout** | ABSENT | Hand-built bordered boxes: amber (duplicate lead, deal conflict, merge warning, event read-only, stale property, reservation, quick-capture blocked), red (blacklisted, showing conflicts, lost reason), slate (archived). Radius and padding vary (`rounded-lg px-3.5 py-3`, `rounded-xl px-3 py-2.5`, `rounded-md px-2.5 py-1.5`). |
| **Progress** | ABSENT | Inline SVG `ProgressRing` (property photos); load bars in team table; funnel/channel bars |
| **Breadcrumbs** | ABSENT | "← Back to list" ghost buttons |
| **Header** | PRESENT as Topbar (§2) | Page headers are inline markup per page (`heading-page` + `text-sm muted` subtitle + action button), not a component |

---

## 11. Duplicates and visual inconsistencies (consolidated)

1. **Right-hand panels:** `Sheet side="right"` (5 usages, custom headers, widths 400/420/`max-w-md`) vs `SlideOver` (1 usage, 560/720, built-in header/footer). CreateRealtorSheet opens on the left.
2. **Modals:** `ui/dialog` vs cmdk Dialog styling vs the hand-rolled inbox modal vs the WheelTimePicker overlay. Overlay opacity 45% vs 40%.
3. **Menus:** DropdownMenu `bg-background rounded-md shadow-md` vs Select `bg-surface rounded-xl shadow-lift` vs custom comboboxes `rounded-xl shadow-lift`.
4. **Cards:** `<Card>` (static `shadow-card`) vs `.surface-card` (theme `--shadow-card`) vs mobile lead cards (`rounded-2xl border bg-card shadow-soft`, `bg-card` undefined).
5. **Segmented controls:** ~11 variants with different radius (`rounded-lg`/`rounded-md`/`rounded-full`/`rounded-xl` containers), active styles (with/without `shadow-glow`) and heights.
6. **Priority pickers:** 5 designs — LeadForm colored chips, lead detail 3-col grid (warm icon = Sparkles), PersonQuickActions default/outline buttons with raw English words, inbox tiles, LeadActionSheet row "mark hot".
7. **Kanban:** leads `KanbanColumn` vs deals `BoardColumn` (different widths, deals adds totals, stage map duplicated).
8. **User admin:** `/admin` + UserFormSheet (roles ADMIN/MANAGER/EMPLOYEE) vs `/settings/users` + CreateRealtorSheet (REALTOR only). `IconBtn` duplicated.
9. **Quick actions:** ClientActions (unused) vs PersonQuickActions.
10. **Audio:** AudioPlayer vs native `<audio controls>` in 4 places.
11. **Loading / empty / alert:** see §1 Skeleton, EmptyState and §10 Alert.
12. **Error text color:** `text-danger` (LeadForm, ShowingForm, UserFormSheet) vs `text-red-600` (ClientForm, PropertyForm, deals/new, PersonQuickActions) vs `text-destructive` (undefined; branding, download).
13. **Stage labels:** hardcoded Ukrainian `STAGE_LABEL` (today, lead detail, client detail, quick actions) vs i18n `leads.stages.*` (board, reports) vs `useLabels().stage` (mobile, dialogs).
14. **Client type labels:** Ukrainian on desktop kanban, Russian on mobile card; not editable in ClientForm.
