# Design Tokens (extracted from code)

Sources: `apps/web/tailwind.config.ts`, `apps/web/src/app/globals.css`, `apps/web/src/app/login/login.module.css`, `apps/web/src/lib/stage-style.ts`, `apps/web/src/lib/calendar.ts`, `apps/web/src/lib/lead-urgency.ts`, `apps/web/src/components/**`.
Tailwind CSS **3.4.19** with `tailwindcss-animate`. No custom `screens`, `spacing` or `fontWeight` scales exist, so Tailwind defaults apply wherever this document says "default".
Hex values were computed from the HSL triplets defined in `globals.css`.

---

## 1. Theming mechanism

| Item | Value |
|---|---|
| Color token format | CSS custom properties holding **HSL triplets** (e.g. `--primary: 211 100% 50%`), consumed as `hsl(var(--primary))` in `tailwind.config.ts` |
| Dark mode | `darkMode: ['class']`. The `.dark` class is added to `<html>` for dark-like themes. |
| Palette switch | `data-theme="<name>"` on `<html>` |
| Theme options (`components/theme-provider.tsx`) | `light`, `dark`, `sepia`, `midnight`, `arctic`, `graphite`, `ocean`, `lavender`, `rose`, `system` |
| Dark-like themes (get `.dark`) | provider: `dark`, `midnight`, `graphite` · no-flash script in `layout.tsx`: only `dark`, `midnight` |
| Persistence | `localStorage['crm-theme']` |
| Opacity modifier support | Works for tokens mapped in Tailwind (`bg-primary/10`, `border-primary/30` …) |

---

## 2. Semantic color tokens

### 2.1 Token → Tailwind class mapping

| CSS variable | Tailwind class | Purpose (from usage) |
|---|---|---|
| `--background` | `bg-background` | Page background (body also carries 2 radial glows) |
| `--surface` | `bg-surface` | Cards, inputs, dialogs, sheets |
| `--surface-2` | **not mapped** | Defined for every theme but has no Tailwind color. `bg-surface-2/40` in `notes/page.tsx` generates no CSS. |
| `--foreground` | `text-foreground` | Primary text |
| `--primary` | `bg-primary`, `text-primary`, `border-primary`, `ring-primary` | Brand/action color, active nav, selected pills |
| `--primary-foreground` | `text-primary-foreground` | Text on primary |
| `--primary-soft` | **not mapped** | Defined, but no Tailwind color |
| `--accent` | `bg-accent`, `to-accent` | Secondary brand hue (reports channel bars gradient) |
| `--accent-foreground` | `text-accent-foreground` | |
| `--muted` | `bg-muted` | Hover backgrounds, chips, skeletons |
| `--muted-foreground` | `text-muted-foreground` | Secondary text, icons |
| `--border` | `border-border` (also applied to `*` globally) | Hairlines |
| `--input` | `border-input` | Defined; used only in `inbox/page.tsx` |
| `--ring` | `ring-ring` | Focus ring on Button / Dialog close |
| `--radius` | used by `.surface-card` | `0.875rem` |

### 2.2 Values per theme (hex, computed)

| Token | light (`:root`) | dark (`.dark`) | sepia | midnight | arctic | graphite | ocean | lavender | rose |
|---|---|---|---|---|---|---|---|---|---|
| background | `#FAFBFD` | `#0D1017` | `#F2EDE3` | `#000000` | `#F7F9FB` | `#17181C` | `#EFF6FA` | `#F7F4FA` | `#FBF6F4` |
| surface | `#FFFFFF` | `#151923` | `#F9F6F0` | `#0B0C0F` | `#FDFEFE` | `#202227` | `#FDFEFE` | `#FEFDFE` | `#FEFEFD` |
| surface-2 | `#F3F6F9` | `#1D222D` | `#ECE5DA` | `#14161A` | `#EFF3F5` | `#2A2C32` | `#E7F0F6` | `#F2EEF7` | `#F7F0EE` |
| foreground | `#101728` | `#F5F7FA` | `#3C2D20` | `#F6F7F8` | `#1B2736` | `#EBEDF0` | `#172940` | `#34254B` | `#462B33` |
| primary | `#007BFF` | `#429EFF` | `#B65C20` | `#52A5FF` | `#1A91D5` | `#5FA8F2` | `#0E7BE1` | `#8D56E6` | `#CC5C78` |
| primary-foreground | `#FFFFFF` | `#0B111E` | `#FBF8F4` | `#000000` | `#FFFFFF` | `#14171F` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| primary-soft | `#EBF4FF` | `#0F3257` | `#F0E0D1` | `#04284E` | `#E5F3FB` | `#1C3854` | `#DFEEFB` | `#F0E9FB` | `#FAEAEE` |
| accent | `#794FF8` | `#A588FC` | `#D25E2D` | `#DA8FFF` | `#21B3CA` | `#9C96EE` | `#14AAC8` | `#D56CE5` | `#DC9260` |
| accent-foreground | `#FFFFFF` | `#FFFFFF` | `#FBF8F4` | `#000000` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| muted | `#F2F5F8` | `#1F232E` | `#E7E0D5` | `#191B1F` | `#EFF3F5` | `#2A2C32` | `#E6EEF4` | `#F1EDF5` | `#F5EFEC` |
| muted-foreground | `#657286` | `#AEB8C7` | `#72604F` | `#A2A9B3` | `#607080` | `#ABB1BA` | `#4F6A87` | `#71608A` | `#83636B` |
| border / input | `#E3E7EE` | `#2D323E` | `#D3C9BB` | `#22252B` | `#DCE3EA` | `#37393F` | `#CEDDE9` | `#E3DBEB` | `#ECDFD9` |
| ring | = primary | = primary | = primary | = primary | = primary | = primary | = primary | = primary | = primary |

HSL source values (light): background `210 40% 98.5%`, surface `0 0% 100%`, surface-2 `210 32% 96.5%`, foreground `222 44% 11%`, primary `211 100% 50%`, primary-soft `211 100% 96%`, accent `255 92% 64%`, muted `210 30% 96%`, muted-foreground `216 14% 46%`, border `214 24% 91%`. Every other theme's HSL is listed in `globals.css` lines 42–247.

### 2.3 Glass tokens (`.glass`, `.glass-strong`)

| Theme | `--glass-bg` | `--glass-strong-bg` | `--glass-border` |
|---|---|---|---|
| light | `rgba(255,255,255,.72)` | `rgba(255,255,255,.86)` | `rgba(255,255,255,.65)` |
| dark | `rgba(18,24,36,.62)` | `rgba(18,24,36,.82)` | `rgba(255,255,255,.08)` |
| sepia | `rgba(250,244,232,.78)` | `rgba(250,244,232,.9)` | `rgba(120,90,50,.14)` |
| midnight | `rgba(6,8,12,.6)` | `rgba(6,8,12,.82)` | `rgba(255,255,255,.07)` |
| arctic | `rgba(247,251,253,.7)` | `rgba(247,251,253,.87)` | `rgba(255,255,255,.7)` |
| graphite | `rgba(30,33,38,.62)` | `rgba(30,33,38,.82)` | `rgba(255,255,255,.09)` |
| ocean | `rgba(238,247,253,.7)` | `rgba(238,247,253,.87)` | `rgba(255,255,255,.62)` |
| lavender | `rgba(250,247,254,.72)` | `rgba(250,247,254,.87)` | `rgba(255,255,255,.62)` |
| rose | `rgba(253,247,245,.72)` | `rgba(253,247,245,.87)` | `rgba(255,255,255,.6)` |

`.glass` = `backdrop-filter: saturate(180%) blur(20px)`; `.glass-strong` = `saturate(200%) blur(28px)`. Both have a 1px `--glass-border`. Used by the Topbar, MobileNav, kanban column headers, client chat tabs and the leads bulk bar.

### 2.4 Static (non-theme) colors in `tailwind.config.ts`

| Class | Value | Note |
|---|---|---|
| `primary-50` | `#EFF6FF` | Tailwind blue scale. Does **not** follow theme. |
| `primary-100` | `#DBEAFE` | |
| `primary-500` | `#3B82F6` | |
| `primary-600` | `#2563EB` | Sidebar/drawer logo gradient start |
| `primary-700` | `#1D4ED8` | Badge `default` text |
| `success` | `#22C55E` | Defined; badges use raw `emerald-*` instead |
| `warning` | `#F59E0B` | Defined; badges use raw `amber-*` instead |
| `danger` | `#EF4444` | Button `destructive`, `text-danger` |

**Not defined** (classes using them produce no CSS; confirmed absent from the existing build's CSS): `destructive` (`text-destructive`), `card` (`bg-card`), `popover`, `secondary`. The non-default opacity step `/8` (`bg-primary/8`, `bg-violet-500/8` …) and spacing `4.5` (`h-4.5 w-4.5`) are also not generated.

### 2.5 Raw palette usage
534 class occurrences use Tailwind's built-in palette directly (`red-*`, `amber-*`, `emerald-*`, `sky-*`, `violet-*`, `blue-*`, `slate-*` …). They are theme-independent. The main semantic groups follow.

---

## 3. Domain color systems

### 3.1 Lead stage (`lib/stage-style.ts`, "single source of truth")

| Stage | Label (hardcoded uk) | Dot `STAGE_DOT` | ≈ hex | Soft chip `STAGE_SOFT` | Column bar `STAGE_BAR` | Funnel `STAGE_GRADIENT` |
|---|---|---|---|---|---|---|
| NEW | Новий | `bg-blue-500` | `#3B82F6` | `bg-blue-500/10 text-blue-700 dark:text-blue-300` | `from-blue-500/80 to-blue-500/0` | `from-blue-500 to-blue-500/70` |
| CONTACTED | Контакт | `bg-sky-500` | `#0EA5E9` | sky … | sky … | sky … |
| QUALIFIED | Кваліф. | `bg-cyan-500` | `#06B6D4` | cyan … | | |
| SELECTION | Підбір | `bg-indigo-500` | `#6366F1` | indigo … | | |
| APPRAISAL | Оцінка | `bg-orange-500` | `#F97316` | orange … | | |
| AGREEMENT | Договір | `bg-fuchsia-500` | `#D946EF` | fuchsia … | | |
| LISTING | Лістинг | `bg-lime-500` | `#84CC16` | lime … | | |
| SHOWING | Показ | `bg-amber-500` | `#F59E0B` | amber … | | |
| NEGOTIATION | Переговори | `bg-violet-500` | `#8B5CF6` | violet … | | |
| WON | Виграно | `bg-emerald-500` | `#10B981` | emerald … | | |
| LOST | Програно | `bg-red-500` | `#EF4444` | red … | | |

(`components/deals/deals-board.tsx` redeclares the same map locally as `STAGE_ACCENT`.)

### 3.2 Priority

| Priority | Icon | Color | Kanban card left bar |
|---|---|---|---|
| hot | `Flame` | `text-red-500` | `before:bg-red-500` |
| warm | `Star` (kanban, lead form, inbox) / `Sparkles` (lead detail) | `text-amber-500` | `before:bg-amber-500` |
| cold | `Snowflake` | `text-sky-400` / `text-sky-500` | `before:bg-sky-500` |

### 3.3 Lead urgency (mobile, `lib/lead-urgency.ts`)

| Urgency | Label (hardcoded ru) | Chip | Dot |
|---|---|---|---|
| overdue | Просрочено | `bg-red-500/15 text-red-600 dark:text-red-400` | `bg-red-500` |
| today | Сегодня | `bg-amber-500/15 text-amber-700 dark:text-amber-300` | `bg-amber-500` |
| hot | Горячий | `bg-orange-500/15 text-orange-600 dark:text-orange-400` | `bg-orange-500` |
| stale | Без контакта | `bg-slate-400/20 text-slate-600 dark:text-slate-300` | `bg-slate-400` |
| normal | — | — | transparent |

### 3.4 Calendar event kinds (`lib/calendar.ts EVENT_KIND_TONE`; no dark variants)

| Kind | Icon | bg | text | dot | border |
|---|---|---|---|---|---|
| SHOWING | Eye | `amber-50` | `amber-700` | `amber-500` | `amber-200` |
| MEETING | Users | `violet-50` | `violet-700` | `violet-500` | `violet-200` |
| CALL | Phone | `blue-50` | `blue-700` | `blue-500` | `blue-200` |
| TASK | FileText | `sky-50` | `sky-700` | `sky-500` | `sky-200` |
| DEADLINE | AlertTriangle | `red-50` | `red-700` | `red-500` | `red-200` |
| CONTRACT | FileSignature | `emerald-50` | `emerald-700` | `emerald-500` | `emerald-200` |
| PAYMENT | Wallet | `indigo-50` | `indigo-700` | `indigo-500` | `indigo-200` |

### 3.5 Other semantic mappings

| Domain | Mapping |
|---|---|
| Property status → Badge variant | AVAILABLE `success` · IN_SHOWING `warning` · RESERVED `warning` · SOLD `secondary` · ARCHIVED `destructive` |
| Deal status → Badge variant | IN_PROGRESS `warning` · COMPLETED `success` · CANCELLED `destructive` |
| User role → Badge variant | ADMIN `warning` · MANAGER `default` · EMPLOYEE `success` · REALTOR/ASSISTANT/ANALYST `secondary` |
| Task type tone (`/tasks`) | CALL `text-blue-600 bg-blue-50` · SHOWING `text-violet-600 bg-violet-50` · FOLLOWUP `text-amber-600 bg-amber-50` · CUSTOM `text-muted-foreground bg-muted` |
| Call outcome tone | ANSWERED emerald · NO_ANSWER amber · BUSY slate (each with dark variants) |
| Source brand colors | FB `#1877F2` · IG `#E4405F` · TG `#26A5E4` · WA `#25D366` · WEBSITE `blue-600/blue-100` · REFERRAL `emerald-600/emerald-100` · MANUAL/CSV muted |
| Reports KPI tones | sky / violet / amber / emerald `from-X-500/15` gradients |
| Source ROI conversion pill | ≥30% emerald · ≥10% amber · else slate |
| Notifications | unread badge `bg-red-500` · unread row `bg-blue-50` |

### 3.6 Login page palette (`login.module.css`, dark-only, independent of theme)

| Element | Value |
|---|---|
| Shell background | `#050608`; text `#f4f6fb` |
| Card | gradient `rgba(20,22,30,.62→.48)`, `blur(32px) saturate(180%)` (mobile 16px), border `rgba(255,255,255,.12)`, radius `1.5rem` (mobile `1.25rem`), padding `2.25rem` (mobile `1.625rem 1.375rem`) |
| Input | h `2.875rem`, radius `.75rem`, bg `rgba(255,255,255,.06)`, border `rgba(255,255,255,.12)`; hover bg `.08` border `.22`; focus border `rgba(165,180,252,.7)` + ring `0 0 0 3px rgba(99,102,241,.2)`; caret `#a5b4fc` |
| Submit | gradient `#6366f1 → #8b5cf6 → #a855f7` (200% size, animates position on hover), shadow `0 8px 24px -8px rgba(99,102,241,.7)`; disabled opacity .7 |
| Error box | bg `rgba(239,68,68,.12)`, border `rgba(239,68,68,.25)`, text `#fca5a5`, 13px, shake-in animation |
| Aurora glows | `rgba(99,102,241,.18)` and `rgba(56,189,248,.14)` |
| Brand icon | gradient `#5b8cff → #8b5cf6 → #d946ef` |

### 3.7 Root error page (`app/error.tsx`, inline styles)
Background `#0a0a0a`, text `#e4e4e7`, icon tile `#27272a` with `#fbbf24` icon, secondary text `#a1a1aa`, code chip `#18181b`, button `#7c3aed` with radius 8px.

---

## 4. Typography

### 4.1 Families
See `Assets/FONTS.md`. **sans** = `var(--font-inter), system-ui, sans-serif`. `--font-inter` is never set, so system-ui renders. **mono** = Tailwind default.

### 4.2 Size scale

| Token / class | Size | Line height | Letter spacing | Source |
|---|---|---|---|---|
| `text-3xs` | 10px (0.625rem) | 14px | 0 | custom |
| `text-2xs` | 11px (0.6875rem) | 16px | -0.005em | custom |
| `text-xs` | 12px | 16px | — | default |
| `text-sm` | 14px | 20px | — | default (desktop body/control size) |
| `text-base` | 16px | 24px | — | default (mobile input size) |
| `text-lg` | 18px | 28px | — | default |
| `text-xl` | 20px | 28px | — | default |
| `text-2xl` | 24px | 32px | — | default |
| `text-3xl` | 30px | 36px | — | default (property price) |
| arbitrary `text-[10px]` ×9, `text-[11px]` ×19, `text-[0.6875rem]` ×1 | — | — | — | should map to 3xs/2xs |

### 4.3 Heading base styles (`globals.css @layer base`)

| Element | Size | Line height | Letter spacing | Weight |
|---|---|---|---|---|
| h1 | 28px (1.75rem) | 1.15 | -0.022em | 600 |
| h2 | 22px (1.375rem) | 1.2 | -0.02em | 600 |
| h3 | 18px (1.125rem) | 1.25 | -0.015em | 600 |
| h4 | 15px (0.9375rem) | 1.3 | -0.011em | 600 |

### 4.4 Semantic typography classes (`globals.css @layer components`)

| Class | Definition | Used for |
|---|---|---|
| `.heading-page` | `text-2xl sm:text-3xl font-semibold tracking-[-0.022em] leading-[1.15]` (24px → 30px) | Page H1 |
| `.heading-section` | `text-lg sm:text-xl font-semibold tracking-[-0.02em] leading-[1.2]` | defined |
| `.heading-card` | `text-base font-semibold tracking-[-0.015em] leading-[1.25]` | defined |
| `.label-eyebrow` | 11px, 600, uppercase, `tracking-[0.06em]`, muted | defined (many places inline `text-xs uppercase tracking-wide` instead) |
| `.text-meta` | `text-sm text-muted-foreground tracking-[-0.005em]` | defined |
| `.text-micro` | 11px, `leading-tight`, muted | defined |
| `.text-numeric` | `font-variant-numeric: tabular-nums` | numbers |

### 4.5 Weights and tracking

| Token | Value |
|---|---|
| Weights in use | `font-medium` 500 · `font-semibold` 600 · `font-bold` 700 (Today KPI numbers, note editor) |
| `tracking-tightish` | -0.011em (body) |
| `tracking-tight2` | -0.02em (titles) |
| `tracking-eyebrow` | 0.06em (uppercase labels) |
| also used | Tailwind defaults `tracking-wide` (0.025em), `tracking-wider` (0.05em), `tracking-tight` |
| Body | `letter-spacing: -0.011em`; `font-feature-settings: 'cv11','ss01','ss03'` |

---

## 5. Radius

| Class | Value | Customized? | Typical use | Occurrences |
|---|---|---|---|---|
| `rounded-sm` | 0.125rem (2px) | default | Select/Dropdown items | 2 |
| `rounded` | 0.25rem (4px) | default | small chips, kbd | 31 |
| `rounded-md` | 0.375rem (6px) | default | DropdownMenu content, photo tiles, event blocks | 37 |
| `rounded-lg` | 0.5rem (8px) | default | Button `sm`/`iconSm`, nav items, pills, icon buttons | 96 |
| `rounded-xl` | **0.875rem (14px)** | **custom** | Button, Input, Select, Card, surface blocks | 69 |
| `rounded-2xl` | **1.125rem (18px)** | **custom** | Dialog, MobileNav, empty-state icon tile, gallery | 18 |
| `rounded-3xl` | **1.5rem (24px)** | **custom** | defined | — |
| `rounded-full` | 9999px | default | Badge, avatar, chips | 72 |
| `--radius` | 0.875rem | CSS var | `.surface-card` | — |
| App content container | `rounded-lg md:rounded-xl` | — | `(app)/layout.tsx` | — |

---

## 6. Shadows / elevation

### 6.1 Tailwind tokens (static, not theme-aware)

| Class | Value | Occurrences |
|---|---|---|
| `shadow-soft` | `0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.05)` | 27 |
| `shadow-card` | `0 1px 2px rgba(16,24,40,.04), 0 4px 12px rgba(16,24,40,.05)` | 2 (+ `<Card>` base) |
| `shadow-lift` | `0 4px 8px rgba(16,24,40,.04), 0 12px 32px rgba(16,24,40,.10)` | 16 |
| `shadow-glow` | `0 0 0 4px rgba(37,99,235,.10)` | 28 (focus/active/selected halo) |
| `shadow-glow-strong` | `0 0 0 6px rgba(37,99,235,.15), 0 8px 24px rgba(37,99,235,.20)` | defined |
| defaults used | `shadow-md` (DropdownMenu), `shadow`, `shadow-sm`, `shadow-xl` (inbox modal), `shadow-2xl` (lightbox) | |

### 6.2 CSS variable shadows (theme-aware; used by `.surface-card` / `.surface-hover`)

| Theme | `--shadow-card` | `--shadow-lift` | `--shadow-glow` |
|---|---|---|---|
| light | `0 1px 2px rgba(15,23,42,.04), 0 6px 20px rgba(15,23,42,.06)` | `0 8px 24px rgba(15,23,42,.08), 0 24px 48px rgba(15,23,42,.10)` | `0 0 0 4px hsl(primary / .12)` |
| dark | `0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.4)` | `0 16px 40px rgba(0,0,0,.6), 0 6px 16px rgba(0,0,0,.45)` | `… / .28` |
| sepia | `rgba(83,48,16,.06) / .07` | `.10 / .10` | `… / .14` |
| midnight | `rgba(0,0,0,.6) / .55` | `.8 / .6` | `… / .3` |
| arctic | `rgba(30,58,80,.05) / .07` | `.10 / .10` | `… / .12` |
| graphite | `rgba(0,0,0,.5) / .45` | `.6 / .45` | `… / .26` |
| ocean | `rgba(12,52,92,.06) / .08` | `.12 / .12` | `… / .13` |
| lavender | `rgba(76,40,110,.05) / .08` | `.11 / .11` | `… / .13` |
| rose | `rgba(120,50,60,.05) / .08` | `.12 / .12` | `… / .14` |

Note: `--shadow-glow` is defined but not referenced by any class; the `shadow-glow` utility uses the static rgba.

### 6.3 Overlays / scrims

| Overlay | Value |
|---|---|
| Dialog | `bg-black/45 backdrop-blur-sm` |
| Sheet, SlideOver, Command palette, WheelTimePicker | `bg-black/40 backdrop-blur-sm` |
| Inbox duplicate-lead modal | `bg-black/40` (no blur) |
| Media lightbox | `bg-black/90` |

---

## 7. Spacing

| Item | Value |
|---|---|
| Scale | Tailwind default 4px scale (0.5 = 2px … 12 = 48px); no custom steps |
| Custom `padding.mobile-nav` (`pb-mobile-nav`) | `max(6rem, calc(env(safe-area-inset-bottom) + 5.25rem))` |
| Custom `inset.safe-bottom` | `max(0.75rem, env(safe-area-inset-bottom, 0.75rem))` |
| Custom `min-h-touch` / `min-w-touch` | 44px (WCAG 2.5.5) |
| App outer gutter | `p-2` (8px) → `md:py-4 md:pr-4 md:pl-3` (16/16/12px) |
| Main content padding | `p-3` (12px) → `sm:p-5` (20px) → `md:p-7` (28px); bottom always `pb-mobile-nav` |
| Card header/content | `p-5` (20px) → `sm:p-6` (24px); content `pt-0` |
| Dialog content | `p-5`, `gap-4` |
| SlideOver header/body/footer | `px-5 py-4` / `px-5 py-4` / `px-5 py-3` |
| Sheet headers (hand-built) | `p-5`; footers `p-4` |
| Page vertical rhythm | `space-y-4` / `space-y-5` / `space-y-6` (varies per page) |
| Form field gap | `space-y-1` / `space-y-1.5` / `space-y-2` (varies per form) |
| Grid gaps | `gap-2` / `gap-3` / `gap-4` / `gap-5` |

---

## 8. Layout, containers and grid

### 8.1 Containers

| Item | Value |
|---|---|
| `container` (Tailwind) | `center: true, padding: '1rem'` (defined) |
| Page max-widths in use | `max-w-xl` 36rem (lead form, new deal) · `max-w-2xl` 42rem (profile, branding) · `max-w-3xl` 48rem (client/property forms, settings, deal detail, integrations) · `max-w-4xl` 56rem (templates, automation) · `max-w-5xl` 64rem (today, property detail, users, lost reasons) · `max-w-6xl` 72rem (reports) · none (lists, kanban, calendar) |
| Dialog | `w-[92vw] max-w-md` (28rem) default; overrides `max-w-sm`, `max-w-lg`, `sm:max-w-2xl`, `max-w-3xl` + `max-h-[90vh]` |
| SlideOver widths | mobile `w-[92vw]`; `sm` 420px · `md` 560px (default) · `lg` 720px · `xl` 880px |
| Sheet | left: `w-[90vw] max-w-[320px] sm:w-[280px]` · right: width from caller (`sm:w-[400px]`, `sm:w-[420px]`, `sm:max-w-md`) · bottom: `max-h-[90vh]`, `rounded-t-2xl` |
| Command palette | `w-[92vw] max-w-[640px]`, top `12vh`, list `max-h-[60vh]` |
| Login card | `max-width: 26rem` |
| Phone country dropdown | `w-72`, `max-h-80` |

### 8.2 Grids in use

| Screen | Grid |
|---|---|
| Today KPI | `grid-cols-2 sm:grid-cols-4`; sections `lg:grid-cols-2`; funnel `grid-cols-3 sm:grid-cols-6` |
| Reports KPI | `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` |
| Properties list | `sm:grid-cols-2 lg:grid-cols-3`, image `aspect-[16/10]` |
| Property / client detail | `lg:grid-cols-3` (main `lg:col-span-2`) |
| Property gallery | `h-[360px] grid-cols-1 sm:grid-cols-4` (cover `sm:col-span-3`) |
| Photo manager | `grid-cols-2 sm:grid-cols-3`, tiles `aspect-video` |
| Forms | `sm:grid-cols-2`; property rooms row `sm:grid-cols-3` |
| Calendar month | `grid-cols-7`, cell `min-h-[110px]` |
| Calendar week/day | `56px` time column + N day columns; hour row 48px; visible 07:00–23:00; snap 15 min |

### 8.3 App shell dimensions

| Element | Value |
|---|---|
| Sidebar | `w-[208px]`, wrapper `py-4 pl-4`, inner `.surface-card py-3 px-2.5`; hidden below `md` |
| Sidebar logo row | `h-11`, tile 28px (`h-7 w-7`) |
| Sidebar nav item | `px-2.5 py-2`, `text-sm font-medium`, icon 16px, `gap-2.5`, `rounded-lg`; active = `bg-primary text-primary-foreground shadow-glow` + 6px dot |
| Topbar | row `h-14` (56px) + `padding-top: env(safe-area-inset-top)`; `px-3 sm:px-6`; `sticky top-0 z-30 glass-strong`; title `text-base sm:text-lg` |
| Topbar controls | Quick capture `h-9` (icon-only `h-9 w-9` < sm); other buttons `Button size=sm` (h-10 < sm, h-8 ≥ sm) |
| MobileNav | `fixed left-3 right-3`, bottom `max(0.75rem, safe-area + 0.5rem)`, `rounded-2xl glass-strong shadow-lift z-50`; item `min-h-[54px] max-h-[64px]`, icon 20px, label 10px |
| MobileDrawer | Sheet left (see 8.1); items `min-h-touch` 44px, icon 20px |
| Kanban column | `w-72` (288px) / compact `w-56` (224px); `min-h-[120px]` body; 2px gradient top bar |
| Lead workspace | left list `w-56` (≥ md) · right panel `w-72` (≥ lg) · header `h-12` · page `h-[calc(100vh-3.5rem)]` |
| Notes | list `md:w-[320px]`; page `h-[calc(100dvh-8.5rem)] min-h-[480px]` |
| Inbox | list `md:w-96 lg:w-[26rem] xl:w-[32rem]`; qualify panel `w-72` |
| Client chat | `h-[480px] sm:h-[560px]` |

---

## 9. Breakpoints

| Name | Min width | Source | Usage count in `src` |
|---|---|---|---|
| `sm` | 640px | Tailwind default | 132 |
| `md` | 768px | Tailwind default | 27 |
| `lg` | 1024px | Tailwind default | 12 |
| `xl` | 1280px | Tailwind default | 1 |
| `2xl` | 1536px | Tailwind default | 0 |
| login mobile | `max-width: 640px` | `login.module.css` | 1 media query |
| motion | `prefers-reduced-motion: reduce` | `globals.css`, `login.module.css` | global |

---

## 10. Z-index layers

| Layer | Class | Used by |
|---|---|---|
| 1 | `z-[1]` | photo tile click layer |
| 10 | `z-10` | sticky kanban headers, gallery controls, wheel masks |
| 20 | `z-20` | combobox dropdowns, mobile stage tabs, now-line |
| 30 | `z-30` | Topbar; phone picker click-away |
| 40 | `z-40` | phone country list |
| 50 | `z-50` | Dialog, Sheet, SlideOver, Select/Dropdown content, Command palette, MobileNav, WheelTimePicker |
| 60 | `z-[60]` | MediaLightbox |

---

## 11. Motion

| Token | Value |
|---|---|
| `animate-fade-in` | `fade-in 200ms ease-out` |
| `animate-slide-up` | `slide-up 220ms cubic-bezier(0.16,1,0.3,1)` (translateY 8px → 0) — page entrance |
| `animate-scale-in` | `scale-in 180ms cubic-bezier(0.16,1,0.3,1)` (0.96 → 1) |
| `.surface-hover` | box-shadow/transform 200ms `cubic-bezier(0.22,1,0.36,1)`, hover `translateY(-1px)` + `--shadow-lift` + `border-primary/28` |
| Press feedback | global `button:active` → `translateY(0.5px) scale(0.992)`; Button `active:scale-[0.98]` |
| Skeleton | `.animate-pulse` overridden to a 1.6s shimmer gradient |
| Reduced motion | all animations/transitions → 0.01ms |
| Login easings | `--ease-out-cinema: cubic-bezier(.16,1,.3,1)` · `--ease-out-luxury: cubic-bezier(.22,1,.36,1)` · `--ease-in-out-cinema: cubic-bezier(.65,0,.35,1)`; card materialize 1200ms; field stagger 620ms + i×80ms; ambient float 7s |
| Framer Motion | notes list items (180ms), lightbox slides (spring 300/30) |

---

## 12. Iconography and misc

| Item | Value |
|---|---|
| Icon set | lucide-react ^0.451.0, global `stroke-width: 1.75` |
| Icon sizes | `h-3 w-3` (12) · `h-3.5` (14) · `h-4` (16, default in controls) · `h-5` (20, mobile nav) · `h-6` (24) |
| Focus ring (global) | `:focus-visible { outline: 2px solid hsl(primary / .45); outline-offset: 2px }`; form fields drop the outline (border-primary + `shadow-glow` instead) |
| Button focus | `ring-2 ring-ring ring-offset-1` |
| Selection | `hsl(primary / .22)` background |
| Scrollbar (WebKit) | 10px, thumb `hsl(foreground / .14)` → hover `.26`, radius 6px |
| Links | `text-underline-offset: 2px` |

---

## 13. Not defined in code

- A font file or brand typeface (system-ui renders).
- Color tokens for `destructive`, `card`, `popover`, `secondary`, `info`, and theme-aware success/warning.
- Tailwind mappings for `--surface-2` and `--primary-soft`.
- Dark variants for Badge success/warning/destructive/accent, calendar event tones, and task type tones.
- A spacing/sizing token scale beyond Tailwind defaults.
- Custom breakpoints.
- Elevation naming beyond soft/card/lift/glow.
- An icon size token.
- Semantic z-index tokens (raw numbers only).
- Content max-width tokens (per-page `max-w-*` choices).
