# Fonts — how typography is loaded (apps/web)

## Summary

| Question | Answer from code |
|---|---|
| Google Fonts? | **No.** No `fonts.googleapis.com` link and no `next/font/google` import. |
| `next/font` (local or Google)? | **No.** `src/app/layout.tsx` has `const inter = { variable: '' }` with the comment *"Font: system-ui stack — no external fetch needed"*. |
| Local font files in the repo? | **None.** A repo-wide search for `*.woff`, `*.woff2`, `*.ttf` and `*.otf` (excluding node_modules) found nothing, so no font files were copied. |
| `@font-face` rules? | **None** in `globals.css` or `login.module.css`. |

## Font families actually in effect

| Role | Declared in | Declared value | What renders |
|---|---|---|---|
| Sans (whole UI) | `tailwind.config.ts` → `theme.extend.fontFamily.sans`; applied by `<body className="font-sans">` | `var(--font-inter), system-ui, sans-serif` | **The OS system UI font.** `--font-inter` is never defined, so the var is invalid and the browser falls through to `system-ui` (San Francisco on Apple, Segoe UI on Windows, Roboto on Android). Inter is **not** loaded. |
| Mono | Tailwind default `font-mono` (not overridden) | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` | Used by `<kbd>` hotkey hints (command palette, hotkeys help), phone dial-code prefixes (PhoneInput), template/automation previews, generated password (ResetPasswordDialog). |
| Root error page | `src/app/error.tsx` inline style | `system-ui, -apple-system, sans-serif` | System font |
| Login page | `login.module.css` (no font-family set) | inherits body | System font |

## Global typographic settings (`src/app/globals.css`)

| Setting | Value | Note |
|---|---|---|
| `body` letter-spacing | `-0.011em` | also available as Tailwind `tracking-tightish` |
| `body` font-feature-settings | `'cv11', 'ss01', 'ss03'` | These are **Inter** stylistic sets. They have no effect on system fonts that lack those features. |
| `html` rendering | `text-rendering: optimizeLegibility`, `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale` | |
| Tables | `font-variant-numeric: tabular-nums` | `.text-numeric` utility does the same |
| Heading base scale | h1 28px/1.15/600, h2 22px/1.2/600, h3 18px/1.25/600, h4 15px/1.3/600 | See `Documentation/DESIGN-TOKENS.md` for the full type scale |

## Designer-relevant consequences

- The rendered typeface differs per OS. Mockups made in Inter will not match production unless a developer adds a font loader.
- Adding a brand font is a **developer change** (`next/font` or `@font-face`, plus defining `--font-inter` or renaming the variable). It is purely presentational: no API or business-logic impact.
- Cyrillic (uk/ru) and Latin (en/fr/it) are both required, so any new font must cover both scripts.
