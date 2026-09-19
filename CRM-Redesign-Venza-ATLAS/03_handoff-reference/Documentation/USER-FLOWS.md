# User Flows (from real routes and handlers)

Each step names the route or component involved and, where it matters, the API call the handler makes. Every API path is same-origin `/api/...`, proxied by Next rewrites to the backend.
Role abbreviations: **ADMIN**, **REALTOR** (MANAGER still appears in several UI checks; see DESIGN-HANDOFF §11).
`{flag}` means the step exists only when `NEXT_PUBLIC_INTEGRATIONS_ENABLED=true` (currently off).

---

## 1. Authentication

```
Any protected URL ──(no crm_auth cookie)──▶ /login?next=<path>
/ ──▶ /today (cookie present) | /login
/login ─▶ enter email + password ─▶ Submit ─▶ /api/auth/login ─┬─ 200 ─▶ router.push(next || /today)
                                                                ├─ 429 ─▶ error box "too many attempts"
                                                                └─ other ─▶ error box "login error"
```

| # | Step | Code facts |
|---|---|---|
| 1 | Gate | `src/middleware.ts` checks only that the `crm_auth` cookie exists, on 21 prefixes (`/today`, `/inbox`, `/dashboard`, `/clients`, `/contacts`, `/properties`, `/inventory`, `/notes`, `/leads`, `/pipeline`, `/profile`, `/tasks`, `/calendar`, `/settings`, `/deals`, `/reports`, `/insights`, `/admin`, `/team`, `/pool`, `/qualify`). No role check happens here. |
| 2 | Login screen | `app/login/page.tsx`: a video background (`/login-bg.webm` → `/login-bg.mp4`, poster `/login-bg-poster.jpg`) and a glass card. Email is `type=email required`; password is `required minLength=8`. The card is interactive from first paint (stage starts at `revealing`). `LanguageSwitcher` sits top-right. |
| 3 | Submit | `POST /api/auth/login`. The API sets httpOnly cookies `access_token` (15 min) and `refresh_token` (30 days), sameSite=lax. The client sets the non-httpOnly flag `crm_auth=1` (30 days) and stores `{id,email,role}` in a zustand store. |
| 4 | Loading | The button shows a spinner and both inputs are disabled. |
| 5 | Session refresh | Any `api()` call returning 401 (outside `/api/auth/*`) triggers a single `POST /api/auth/refresh` and a retry. If refresh fails, the `crm_auth` cookie is cleared and the next navigation lands on /login. |
| 6 | Identity | `UserMenu` calls `GET /api/users/me` on mount. Failure → `router.replace('/login')`. |
| 7 | Logout | UserMenu or MobileDrawer → `POST /api/auth/logout` → clear `crm_auth` → `/login`. |
| — | Not present in UI | Registration, forgot/reset password, email verification, invitation accept. Zod schemas for these exist in `packages/shared/src/schemas/auth.ts`, but no web routes use them. |

---

## 2. Lead capture and funnel

### 2a. Quick Capture (fastest path, from anywhere)
```
Topbar "Захопити лід" / ⌘⇧N / Palette ─▶ [Dialog] QuickCaptureDialog
  1 Contact:  New (name*, phone*) | Existing (select*)
  2 Property: New (district, address, price) | Existing (select) | Skip
  3 Action:   Interest (preset chips + note*; preset "callback" adds date/time) | Showing (date* + time* + chips; needs a property)
  ─▶ amber "blocked" hint names the first missing field; Submit stays disabled until none remain
  ─▶ Submit:  POST /api/clients (if new)
              POST /api/properties (if new; type APARTMENT, area 1, EUR, AVAILABLE)
              POST /api/leads (priority warm)
              POST /api/showings  | POST /api/clients/:id/note (+ POST /api/tasks type CALL if callback time set)
  ─▶ toast ─▶ /leads/:id
```

### 2b. Full lead form
```
/today "Add lead" · /leads "Add new" · client card "Add to funnel" (/leads/new?clientId=) · ⌘L (SlideOver)
 ─▶ LeadForm
     Client* [Select]  (+ "New contact" ─▶ [Dialog] QuickClientDialog: name*, phone* ─▶ auto-selected)
       ├─ blacklisted/archived client ─▶ red/grey warning, Submit disabled
       └─ client already has an active lead ─▶ amber warning with "go to lead" link (non-blocking)
     Purpose tiles · Urgency chips · Budget from/to + currency · Next contact (datetime)
     Interest (only if purpose empty or "specific object"):
       CRM mode: property combobox (+ "create new property" ─▶ [Dialog] PropertyForm ─▶ auto-selected)
       Note mode: textarea + photo upload + voice note + "create card from note" ─▶ [Dialog] PropertyForm
     Priority hot/warm/cold
 ─▶ Save: POST /api/leads ─▶ /leads/:id   (SlideOver: close + toast "View")
 ─▶ Cancel with unsaved input ─▶ [Dialog] Confirm discard
```

### 2c. Working the funnel
```
Sidebar Pipeline ─▶ /pipeline ⇒ /leads
 DESKTOP (≥ md) kanban: NEW → CONTACTED → QUALIFIED → SELECTION → SHOWING → NEGOTIATION → WON  (+ LOST column when toggled)
   filters: period pills · assignee (ADMIN) · compact · show lost · ◀ ▶ scroll
   drag card to column ─▶ optimistic move ─▶ PATCH /api/leads/:id/stage ─▶ toast with "Undo"
                                           └─ error ─▶ rollback + error toast
   drag to LOST bar ─▶ [Dialog] LostReasonDialog (reason required; "Other" needs text) ─▶ PATCH stage LOST + lostReason
   ADMIN: tick cards ─▶ bulk bar ─▶ reassign (POST /api/leads/bulk-reassign) | priority (PATCH each lead)
 MOBILE (< md): stage tabs (All = in progress) · Detailed/Compact · cards sorted by urgency
   card "Call" ─▶ tel:   · card "Action" ─▶ [Sheet bottom] LeadActionSheet
     Contact:  call happened / no answer / wrote client ─▶ POST /api/activities
     Planning: callback tonight / tomorrow 10:00 / in 3 days ─▶ PATCH /api/leads/:id {nextActionAt}; "Schedule showing" ─▶ /leads/:id
     Status:   mark hot · client ready (─▶ NEGOTIATION) · change status (stage list) · won (via NEGOTIATION ─▶ WON) · lost ─▶ LostReasonDialog
 Card click ─▶ /leads/:id (workspace)
```

### 2d. Lead workspace → deal
```
/leads/:id
  phone link / "Call" ─▶ [Dialog] CallDispositionDialog: outcome* (answered/no answer/busy) + note + callback preset or exact time
                        ─▶ POST /api/clients/:id/log-call (+ POST /api/tasks type CALL)
  Notes tab ─▶ NotesPanel (text + voice; Cmd/Ctrl+Enter) ─▶ POST /api/activities (NOTE) · pin (max 3) PATCH /api/activities/:id/pin
  Activity tab ─▶ ActivityTimeline (GET /api/activities/lead/:id)
  Quick actions: Remind (task FOLLOWUP) · Schedule showing ─▶ [Dialog] ScheduleShowingDialog (conflict check GET /api/showings/conflicts)
  Right panel (≥ lg): stage [Select] (LOST ─▶ reason dialog) · priority · assignee · stale-property warning · delete ─▶ Confirm ─▶ /leads
  "Готовий купити" ─▶ PATCH stage NEGOTIATION ─▶ /deals/new?leadId=:id
/deals/new: Lead* · Property (warns if an active deal already exists on it) · Amount* · Commission %* (default 3) ─▶ POST /api/deals ─▶ /deals/:id
/deals/:id: Mark completed / cancelled (PATCH) · payments (ADMIN/MANAGER) · print contract from template · upload documents
```

---

## 3. Client create

```
/clients "Add new" ─▶ /clients/new          (also ⌘N SlideOver, QuickClientDialog, QuickCapture)
 ClientForm
   Main info:   Full name* · Primary phone* (PhoneInput) · Email · Source (3 quick chips + select)
                Notes (rich-text editor) + attachments: voice (VoiceRecorder), photo, file
   Preferences: Property type · Districts (comma-separated) · Currency · Price min/max · Rooms min/max · Area min/max
 ─▶ Save: POST /api/clients ─▶ /clients/:id   (edit: PATCH /api/clients/:id)
    error: API message in red text above the buttons
 ─▶ Cancel with changes ─▶ [Dialog] Confirm discard
```

On the client card (`/clients/:id`):
1. Header: avatar upload (`POST /api/uploads/image` → PATCH avatarUrl), phone (opens CallDispositionDialog), email, assignee (ADMIN/MANAGER dropdown → PATCH assignedUserId).
2. "…" menu: archive/restore (PATCH isArchived) · blacklist (Confirm → PATCH isBlacklisted) · merge (ADMIN/MANAGER → MergeClientDialog → pick duplicate → Confirm → `POST /api/clients/:id/merge`) · delete (Confirm → `DELETE` → /clients).
3. Funnel banner: open active lead, or "Add to funnel" → /leads/new?clientId=.
4. Note card: auto-saves 700 ms after typing (`PATCH notes`) with states Saving… / Updated <date> / Not saved.

---

## 4. Property create + presentation PDF

```
/properties "Add new" ─▶ /properties/new   (also ⌘O, QuickPropertyDialog, LeadForm "create card", QuickCapture)
 PropertyForm
   Main:   Type* · Status* · District* · Address* · Rooms · Floor · Total floors · Area m²* · Price* · Currency (3 letters)
           Description + voice description
   Seller (optional): name · phone (PhoneInput) · note
 ─▶ Save: POST /api/properties ─▶ /properties/:id

/properties/:id
 ├─ Photos card: Upload photos | Upload video | drag-drop | paste
 │     each file: POST /api/uploads/media (progress ring) ─▶ POST /api/properties/:id/photos (first file becomes cover)
 │     reorder (drag) PATCH .../photos/reorder · ★ cover PATCH .../photos/:pid/cover · delete (4.5 s Undo toast, then DELETE)
 ├─ Gallery ─▶ MediaLightbox (swipe, arrows, pinch/wheel zoom, download)
 ├─ "Download PDF" dropdown
 │     Logo ☐ / Watermark ☐ (defaults from GET /api/branding)
 │     Language ◉ ru · uk · en · fr · it (default = UI locale if supported, else en)
 │        per-language marker: ✓ translated · ⚠ outdated · – missing ; amber warning for the selected language
 │        ✎ (owner/ADMIN) ─▶ /properties/:id/edit#translations
 │     Download ─▶ GET /api/properties/:id/presentation.pdf?logo=1|0&watermark=1|0&lang=xx ─▶ file "<address-slug>-presentation.pdf"
 ├─ Send presentation: Preview (new tab /api/properties/:id/presentation?lang=) · Copy link · {flag} send to client with email
 └─ Edit (owner/ADMIN) ─▶ /properties/:id/edit
       PropertyForm (PATCH) + PropertyTranslations card:
         per language textarea · "Generate draft" (POST .../translations/:locale/draft, fills field only) · Save N (PUT per changed locale; empty = delete)
```

---

## 5. User management (ADMIN)

```
Sidebar Settings ─▶ /settings ─▶ "Users" card (ADMIN only) ─▶ /settings/users
  Table: name/email · role badge · active/inactive badge · actions
  ├─ Activity  ─▶ [Sheet] UserActivitySheet (GET /api/users/:id/activity: counts + recent tasks)
  ├─ Reset pwd ─▶ [Sheet] ResetPasswordDialog: Generate | Set manually (≥ 8) ─▶ POST /api/users/:id/reset-password ─▶ shows password + Copy
  ├─ Archive   ─▶ GET /api/users/:id/archive ─▶ downloads archive-<email>.zip
  ├─ Deactivate/Activate ─▶ Confirm ─▶ DELETE /api/users/:id | POST /api/users/:id/activate
  ├─ Delete    ─▶ Confirm ─▶ DELETE /api/users/:id?hard=true ─▶ 409 ─▶ toast "deactivate instead"
  │   (deactivate/delete disabled for yourself and for the last active admin)
  └─ "Add user" ─▶ [Sheet] CreateRealtorSheet: full name · email · phone · password (≥ 8)
                 ─▶ POST /api/users (API forces role REALTOR) ─▶ table reloads
Non-ADMIN opening the page ─▶ client redirect /dashboard ⇒ /today
```
Legacy duplicate: `/admin` (unlinked) has the same table with manager/last-login columns, role cards, filters, and `UserFormSheet` offering roles ADMIN/MANAGER/EMPLOYEE, a manager picker, locale ru/uk and an active toggle.

---

## 6. Settings / branding

```
/settings/branding (ADMIN)
  Logo: preview box ─▶ Upload (png/jpeg/webp/svg) POST /api/branding/logo (saved immediately)
        Remove ─▶ Confirm ─▶ DELETE /api/branding/logo
        ☐ Show logo on presentations · Agency name
  Watermark: ☐ enabled · opacity slider 5–35 % (step 5), always centred
  Save ─▶ PATCH /api/branding {logoEnabled, watermarkEnabled, watermarkOpacity, agencyName}
  Effect: sets the default toggles in every property's "Download PDF" menu.
```
Other settings:
- **Templates** (`/settings/templates`): list. ADMIN/MANAGER can add or edit (name*, language ru|uk, content*) and delete (Confirm). Templates feed contract printing on deals and email {flag}.
- **Automation** (`/settings/automation`): rules list. ADMIN/MANAGER create a rule: name*, mode (Round-robin / Fixed realtor / Welcome email / Follow-up reminder), optional conditions (source type, deal intent, district contains), priority. They can also toggle and delete rules.
- **Integrations** (`/settings/integrations`): informational cards only; all connect buttons are disabled.
- **Profile** (`/profile`, via user menu): full name*, phone, interface language (email, role and created date are read-only) → `PATCH /api/users/:id`. Change password: old*, new* ≥ 8, confirm* must match → `POST /api/users/:id/reset-password`.
- **Theme** (topbar): 10 options stored in `localStorage['crm-theme']`. **Language**: `NEXT_LOCALE` cookie plus a full page reload.

---

## 7. Secondary flows (short)

| Flow | Chain |
|---|---|
| Tasks | /today "See all" → /tasks → "Add" → inline form (title*, type, assignee (ADMIN/MANAGER), client, due chips/date/WheelTimePicker) → `POST /api/tasks` · row ○ → `POST /api/tasks/:id/complete` · ✓ hover → reopen `PATCH status PENDING` |
| Calendar | /calendar → Month/Week/Day/Agenda → click slot/"+"/Add → EventForm sheet (Showing needs client* + property*; other kinds create a Task) → `POST /api/showings` or `/api/tasks`. Week/Day: drag or resize editable events → `PATCH` showing/task. Contracts/payments are read-only events. |
| Notes | /notes → "+" → `POST /api/notes` → editor auto-saves after 600 ms `PATCH` · pin · trash (`DELETE` soft) → Trash view → restore / delete forever |
| Analytics (ADMIN) | Sidebar Insights → /reports → agent row → /leads?assignee=… or /deals?agentId=… · "Details" → /insights/lost-reasons |
| Command palette | ⌘K → type ≥ 2 chars → contacts/leads/properties results → open record; or Navigate/Create groups |
