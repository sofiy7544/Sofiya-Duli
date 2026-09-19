# apps/web/src/app/layout.tsx — изменения Phase 2

1. Шрифты (сейчас `const inter = { variable: '' }` → Inter не грузится, `--font-inter` не определена).
   Грузим через next/font — self-hosting на этапе build, без запросов к Google в рантайме:

```tsx
import { Inter, Playfair_Display } from 'next/font/google';
const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter-next', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin', 'cyrillic'], weight: ['500', '600'], variable: '--font-playfair-next', display: 'swap' });
```
   `<html lang={locale} suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>`
   Classic-темы остаются на system-ui (регрессия исключена); Inter/Playfair включаются только в ATLAS/Venza через `--font-sans`/`--font-display`.
   ⚠ `next/font/google` скачивает файлы во время `next build` — у VPS должен быть доступ к fonts.gstatic.com. Если нет — fallback: положить woff2 в `public/fonts` и `next/font/local`.

2. Старый no-flash скрипт заменить:
```tsx
import { themeBootstrapScript } from '@/lib/theme/bootstrap';
<head><script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} /></head>
```

3. `globals.css`: в конец файла `@import '../styles/themes.css';` (до @tailwind — если импорт требует верх файла, перенести содержимое в конец `@layer base`). Глобальный `button:active` press оставить.
