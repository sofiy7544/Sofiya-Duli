# Screen Map — MaybSrm CRM (apps/web)

This is a single-tree view of the whole interface, built from the navigation components (`sidebar.tsx`, `mobile-nav.tsx`, `mobile-drawer.tsx`, `topbar.tsx`), the route folders in `apps/web/src/app`, and the dialogs, sheets and drawers each screen mounts.

Legend:
`→` link or navigation · `⇒` server/client redirect · `[Dialog]` centered modal · `[Sheet]` side/bottom panel · `[SlideOver]` right panel · `[Dropdown]` menu · `(ADMIN)` visible only to role ADMIN · `(ADMIN/MANAGER)` visible to ADMIN or MANAGER · `(owner/ADMIN)` visible to the record owner or ADMIN · `{flag}` visible only when `NEXT_PUBLIC_INTEGRATIONS_ENABLED=true` (currently `false` in `.env`)

```
PUBLIC
├── /                      ⇒ /today (has crm_auth cookie) | ⇒ /login
└── /login                 Cinematic video background + glass login card
    ├── LanguageSwitcher   [Dropdown] en / uk / ru / fr / it (sets NEXT_LOCALE cookie, reloads)
    └── submit             → ?next= path or /today

APP SHELL  (route group (app) — every page below renders inside it)
├── Sidebar (≥ md)                             Mobile bottom nav (< md)
│   Today · Pipeline · Contacts · Inventory    Today · Pipeline · Contacts · Calendar
│   Notes · Calendar · Insights (ADMIN)
│   ── Settings
├── Topbar (all widths)
│   ├── ☰ MobileDrawer (< md)       [Sheet left]  full nav + Profile link + Sign out
│   ├── Page title (from URL prefix; blank for /notes, /team, /admin)
│   ├── "Захопити лід" / ⚡ button   → [Dialog] QuickCaptureDialog
│   ├── NotificationBell            [Dropdown] last 8 notifications, "mark all read" → notification.link
│   ├── ThemeToggle                 [Dropdown] Light/Dark/Sepia/Midnight + Premium: Arctic/Graphite/Ocean/Lavender/Rose + System
│   ├── LanguageSwitcher            [Dropdown] 5 locales
│   └── UserMenu                    [Dropdown] Profile → /profile · Sign out → /login
└── Global overlays (mounted once in (app)/layout.tsx)
    ├── [Dialog]    CommandPalette (⌘K)   live search (contacts/leads/properties) + Navigate + Create + Hotkeys
    ├── [SlideOver] QuickCreate           ⌘N client (lg 720px) · ⌘L lead (md 560px) · ⌘O property (lg) · ⌘S showing (md)
    ├── [Dialog]    QuickCaptureDialog    ⌘⇧N — contact + property + interest/showing in one submit
    ├── [Dialog]    HotkeysHelpDialog     Shift+?
    ├── [Dialog]    ConfirmDialogHost     imperative useConfirm() used by delete/discard/blacklist actions
    └── Toaster (sonner, bottom-right)

SIDEBAR: TODAY
└── /today                          Day command center
    ├── "Add lead"                  → /leads/new
    ├── "Pipeline"                  → /pipeline
    ├── Today's tasks card          "See all" → /tasks ; ✓ complete task (inline)
    ├── Upcoming showings (next 3h) "Calendar" → /calendar
    ├── Pipeline pulse chips        → /pipeline?stage=<STAGE>
    ├── Recent activity             (read-only)
    └── Revenue strip               (shown only when completed deals > 0)
    Not in the sidebar, but reachable:
    └── /tasks                      Task list (from Today "See all" and lead detail "Lead tasks")
        ├── Create form (inline card)
        │   └── [overlay] WheelTimePicker (custom fixed overlay)
        └── Row actions: complete / reopen

SIDEBAR: PIPELINE
└── /pipeline  ⇒ /leads (query string preserved)      /pipeline/[id] ⇒ /leads/[id]
    ├── /leads                      Desktop: kanban (drag & drop) · Mobile: stage tabs + card list
    │   ├── "Add new"               → /leads/new
    │   ├── Drag to LOST bar/column → [Dialog] LostReasonDialog
    │   ├── Bulk bar (ADMIN)        reassign [Select] · priority hot/warm/cold · cancel
    │   ├── Mobile card "Action"    → [Sheet bottom] LeadActionSheet
    │   │                              ├── stage picker (inline step)
    │   │                              └── "Close as lost" → [Dialog] LostReasonDialog
    │   └── Card click              → /leads/[id]
    ├── /leads/new                  LeadForm (card)
    │   ├── "+ New contact"         → [Dialog] QuickClientDialog
    │   └── "+ Create property" / "Create card from note" → [Dialog] PropertyForm (max-w-3xl)
    └── /leads/[id]                 3-panel lead workspace
        ├── Left (≥ md)             searchable lead list → /leads/[otherId]
        ├── Center                  tabs: Chat {flag} · Notes (NotesPanel) · Activity (ActivityTimeline)
        │   ├── phone link          → [Dialog] CallDispositionDialog
        │   └── PersonQuickActions
        │       ├── Log call        → [Dialog] CallDispositionDialog
        │       ├── Add note        (inline: textarea + VoiceRecorder)
        │       ├── Remind          (inline: presets + datetime)
        │       ├── Schedule showing→ [Dialog] ScheduleShowingDialog → [Dialog] QuickPropertyDialog
        │       ├── "Готовий купити" → /deals/new?leadId=
        │       ├── Stage [Select] (LOST → [Dialog] LostReasonDialog) · priority · assignee (ADMIN/MANAGER)
        │       └── WhatsApp / Telegram / Email {flag}
        └── Right (≥ lg)            stage [Select] (LOST → LostReasonDialog) · priority · assignee
            ├── "Create card from note" → [Dialog] PropertyForm
            ├── Client card         → /clients/[clientId]
            ├── Lead tasks          → /tasks?leadId=
            ├── Interest property   → /properties/[id]
            └── Delete              → [Dialog] Confirm → /leads
    Not in the sidebar (reached from Reports, the lead quick action, and calendar events):
    └── /deals                      List | Board toggle
        ├── Board: drag to LOST     → [Dialog] LostReasonDialog
        ├── /deals/new              (?leadId= prefill) — Cancel with changes → [Dialog] Confirm discard
        └── /deals/[id]             status buttons · payments (ADMIN/MANAGER) · contract print (opens new window) · documents upload
            └── Delete (ADMIN/MANAGER) / remove doc → [Dialog] Confirm

SIDEBAR: CONTACTS
└── /contacts  ⇒ /clients (query preserved)           /contacts/[id] ⇒ /clients/[id]
    ├── /clients                    Active / Archive / Blacklist segmented · search · pagination
    ├── /clients/new                ClientForm (Cancel dirty → Confirm discard)
    ├── /clients/[id]               Client card
    │   ├── Edit                    → /clients/[id]/edit (ClientForm)
    │   ├── "…" [Dropdown]          Archive/Restore · Blacklist (→ Confirm) · Merge (ADMIN/MANAGER) → [Dialog] MergeClientDialog → Confirm · Delete → Confirm
    │   ├── Avatar click            file picker (upload)
    │   ├── Assignee [Dropdown]     (ADMIN/MANAGER)
    │   ├── Active lead banner      → /leads/[id]   |  "Add to funnel" → /leads/new?clientId=
    │   ├── Preferences (collapsible)
    │   ├── ClientChat {flag}  |  ClientContactsCard (flag off)
    │   ├── PersonQuickActions      (same as the lead workspace, without lead controls and note button)
    │   │   └── [Dialog] CallDispositionDialog · [Dialog] ScheduleShowingDialog
    │   └── ClientNote              Rich-text editor (auto-save) + voice/photo/file attachments
    └── /clients/[id]/edit

SIDEBAR: INVENTORY
└── /inventory ⇒ /properties (query preserved)        /inventory/[id] ⇒ /properties/[id]
    ├── /properties                 All/Mine · search · type · status · "show sold/archived" · pagination · card grid
    ├── /properties/new             PropertyForm
    ├── /properties/[id]            Property card
    │   ├── PropertyGallery         → [overlay] MediaLightbox (fullscreen, swipe/zoom)
    │   ├── "Download PDF" [Dropdown] logo / watermark toggles · language radio (translation status) · Download
    │   │                              └── ✎ (owner/ADMIN) → /properties/[id]/edit#translations
    │   ├── Edit / Delete (owner/ADMIN) → /properties/[id]/edit · [Dialog] Confirm
    │   ├── SendPresentation        Preview (new tab) · Copy link · send to client {flag}
    │   └── PropertyPhotos          upload / reorder / cover / delete-with-undo → [overlay] MediaLightbox
    └── /properties/[id]/edit       PropertyForm + PropertyTranslations (owner/ADMIN)

SIDEBAR: NOTES
└── /notes                          Master–detail notes (Notes / Trash), Tiptap editor, pin, restore, delete forever

SIDEBAR: CALENDAR
└── /calendar                       Month / Week / Day / Agenda · type filter · prev/today/next
    ├── "Add" / empty slot / "+"    → [Sheet right] EventForm (create) → [Dialog] QuickClientDialog / QuickPropertyDialog
    └── Event click                 → [Sheet right] EventForm (edit/view) → Delete → [Dialog] Confirm

SIDEBAR: INSIGHTS (ADMIN)
└── /insights  ⇒ /reports (query preserved)
    ├── /reports                    KPIs · funnel · channels · agents table (→ /leads?assignee= , /deals?agentId=) · lost reasons · source ROI
    │   └── "Details →"             → /insights/lost-reasons
    └── /insights/lost-reasons      Top reasons · by source · by month · recent lost (→ /leads/[id])

SIDEBAR: SETTINGS
└── /settings                       Card index
    ├── /settings/automation        rules list; create form (ADMIN/MANAGER); delete → Confirm
    ├── /settings/templates         templates list; create/edit form (ADMIN/MANAGER); delete → Confirm
    ├── /settings/integrations      static info cards (connect buttons disabled)
    ├── /settings/branding (ADMIN)  logo upload/remove (→ Confirm) · agency name · watermark on/opacity · Save
    └── /settings/users (ADMIN)     users table
        ├── "Add user"              → [Sheet right] CreateRealtorSheet
        ├── Activity icon           → [Sheet right] UserActivitySheet
        ├── Key icon                → [Sheet right] ResetPasswordDialog (named "Dialog", renders a Sheet)
        ├── Archive icon            → ZIP download
        └── Deactivate / Delete     → [Dialog] Confirm

USER MENU
└── /profile                        Personal info form + change password form

ROUTES WITH NO LINK IN THE NAV UI (reachable only by URL)
├── /team (ADMIN)                   Team workload table (→ /leads?assignee=)
├── /admin (ADMIN)                  Legacy user admin: role cards, filters, table
│   ├── [Sheet right] UserFormSheet (create/edit)
│   ├── [Sheet right] ResetPasswordDialog
│   └── [Sheet right] UserActivitySheet
├── /dashboard, /dashboard/*        ⇒ /today (next.config redirect)
├── /pool                           ⇒ /pipeline ⇒ /leads   (still linked from the palette "New requests" and hotkey G I)
├── /inbox {flag}                   Omnichannel inbox + qualification panel + hand-made "duplicate lead" modal; flag off ⇒ /pool
└── /qualify                        Re-exports /inbox (same behavior)

ERROR / SYSTEM SCREENS
├── (app)/error.tsx                 EmptyState: Retry · Go home (keeps the shell)
├── (app)/not-found.tsx             EmptyState: Go home
└── app/error.tsx                   Bare dark full-page error (inline styles, no theme)
```
