# Assets List

Every static design asset found in the repository was **copied** (not moved) into `Assets/public/`.
The search covered `*.svg, *.png, *.jpg, *.jpeg, *.webp, *.gif, *.ico, *.woff*, *.ttf, *.otf` across the whole monorepo, excluding `node_modules` and `.next` build output. Only `apps/web/public` contains design assets. `apps/api` has no image or font files: its PDF and email templates are code.

## Copied files

| File (in `Assets/public/`) | Original path | Type | Size | Properties | What it is / where used |
|---|---|---|---|---|---|
| `favicon.svg` | `apps/web/public/favicon.svg` | SVG | 292 B | viewBox 32×32; rounded square `rx=8`, fill `#1d4ed8`; white house outline (stroke 2) with a white door rect | App mark / favicon artwork. **No code references it**: no `icons` in `layout.tsx` metadata and no `<link rel="icon">`, and the Next App Router does not auto-link `public/favicon.svg`. Treat it as an unused brand mark. |
| `login-bg-poster.jpg` | `apps/web/public/login-bg-poster.jpg` | JPEG | 38.5 KB | 706 × 710 px, baseline | Poster frame of the login background video (`<video poster>` in `app/login/page.tsx`). Shows before or instead of the video. |
| `login-bg.webm` | `apps/web/public/login-bg.webm` | WebM video | 1.01 MB | duration/resolution not determinable (no ffprobe on host) | First `<source>` of the login background video. Autoplay, muted, plays once, and holds its last frame as a still. |
| `login-bg.mp4` | `apps/web/public/login-bg.mp4` | MP4 video | 1.28 MB | duration/resolution not determinable (no ffprobe on host) | Fallback `<source>` of the same login video. |

## Brand elements that are code, not files (designers will need to redraw or replace these)

| Element | Where | How it is built |
|---|---|---|
| App logo tile (sidebar, mobile drawer) | `components/sidebar.tsx`, `components/mobile-drawer.tsx` | lucide `Building2` icon (white) inside a 28px (sidebar) / 32px (drawer) rounded tile with `bg-gradient-to-br from-primary-600 to-violet-600` (`#2563EB → #7C3AED`) and `shadow-glow` |
| Wordmark | same files | Text "MaybSrm" (semibold) with subtitle "Premium" (10px, muted). Sidebar footer: "v0.7 · self-hosted". |
| Login brand icon | `app/login/page.tsx` + `login.module.css .brandIcon` | lucide `Building2` in a 36px tile, radius 14px, gradient `#5b8cff → #8b5cf6 → #d946ef`, shadow `0 8px 24px rgba(91,140,255,.4)` |
| App title | `app/layout.tsx` metadata | `title: 'MaybSrm'`, description "Self-hosted CRM для агентств недвижимости" |
| Login grain texture | `login.module.css .grain` | Inline SVG `feTurbulence` noise as a data-URI (desktop only) |
| Channel/source brand colors | `components/source-badge.tsx` | Facebook `#1877F2`, Instagram `#E4405F`, Telegram `#26A5E4`, WhatsApp `#25D366` (icons are generic lucide glyphs, not official logos) |
| Avatar placeholders | `components/ui/avatar.tsx` | Initials on 8 gradient pairs (blue, violet, emerald, amber, rose, cyan, indigo, fuchsia; 400→600) picked by hashing the name |

## Icon library

- **lucide-react `^0.451.0`**. A global CSS rule sets `svg.lucide { stroke-width: 1.75 }`.
- **132 distinct icons** are imported across `src/` (counted by parsing every `import { … } from 'lucide-react'`, including multi-line imports and `as` aliases; `.bak` files excluded):
  Activity, AlertCircle, AlertTriangle, Archive, ArchiveRestore, ArrowDown, ArrowLeft, ArrowRight, ArrowRightLeft, ArrowUpRight, Ban, BarChart3, BedDouble, Bell, BellPlus, Bold, BookOpen, Briefcase, Building2, Calendar, CalendarPlus, CalendarRange, Camera, Check, CheckCheck, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, Circle, Clock, Coffee, Compass, Copy, Download, Droplets, ExternalLink, Eye, Facebook, FileDown, FileSignature, FileText, Filter, Flame, Flower2, Gem, GitMerge, Globe, GripVertical, Handshake, Heading1, Heading2, HelpCircle, History, Home, ImageIcon, ImageOff, ImagePlus, Inbox, Instagram, Italic, KanbanSquare, KeyRound, LayoutList, Link2, List, ListChecks, Loader2, Lock, LogOut, Mail, MapPin, Maximize, Maximize2, Menu, MessageCircle, MessageSquare, Mic, Minus, Monitor, Moon, MoonStar, MoreHorizontal, Palette, Paperclip, Pause, PenLine, Pencil, Phone, PhoneCall, PhoneMissed, PhoneOff, Pin, PinOff, Play, Plug, Plus, Printer, RefreshCw, RotateCcw, Rows3, Save, Search, Send, Settings, ShieldCheck, ShieldOff, Snowflake, Sparkles, Square, Star, StickyNote, Sun, Trash2, TrendingDown, TrendingUp, TriangleAlert, Trophy, Undo2, Upload, User, User2, UserCog, UserPlus, Users, Video, Wallet, X, XCircle, Zap, ZapOff
- Two warning glyphs coexist: `AlertTriangle` and `TriangleAlert`, which are the same shape under the old and new lucide names.
- Emoji are used as UI glyphs in a few places: lead purpose tiles 🏢 🔎 💬 👀, locale flags 🇬🇧 🇺🇦 🇷🇺 🇫🇷 🇮🇹, and ⚠️ / 🔥 in text.

## Runtime assets (not in the repo, so not copied)

| Asset | Source |
|---|---|
| Agency logo on presentations | Uploaded by ADMIN in `/settings/branding` → `POST /api/branding/logo` (png/jpeg/webp/svg), stored by the API storage provider |
| Property photos / videos, thumbnails, posters, blurhash | Uploaded via `/api/uploads/media`, served under `/uploads/*` or S3/MinIO |
| User / client avatars | `/api/uploads/image` |
| Presentation PDF / HTML preview design | Rendered server-side by `apps/api/src/modules/property-presentation-pdf/pdf-template.ts` (code; outside this frontend handoff) |

## Not found in the repository
- Illustrations, empty-state artwork, onboarding images, app-store / PWA icons, `manifest.json`, Open Graph images, a raster logo.
- Local font files (see `FONTS.md`).
