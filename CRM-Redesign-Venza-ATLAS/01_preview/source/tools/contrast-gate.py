"""Гейт контраста.

Читает токены прямо из src/styles/themes.css — единственного источника правды.
Раньше палитры дублировались здесь хексами и успели разойтись со стилями,
поэтому гейт проверял не то, что видит пользователь.

Проверяем две группы:
  PAIRS  — текст на чистой поверхности и фоне;
  PLATES — текст на цветной плашке (bg-success/12 и т.п. поверх поверхности).
Вторая группа важнее: именно на плашках контраст и проваливался.
"""
import colorsys, json, re, sys
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / 'src' / 'styles' / 'themes.css'

# Семейства и их тёмные варианты: селектор → имя в отчёте.
SELECTORS = [
    (r":root\[data-theme='atlas'\]\s*\{", 'atlas'),
    (r":root\[data-theme='atlas'\]\.dark\s*\{", 'atlas-dark'),
    (r":root\[data-theme='sepia'\]\s*\{", 'sepia'),
    (r":root\[data-theme='sepia'\]\.dark\s*\{", 'sepia-dark'),
    (r":root\[data-theme='venza'\]\s*\{", 'venza'),
    (r":root\[data-theme='venza'\]\.dark\s*\{", 'venza-dark'),
]

NEEDED = ['background', 'surface', 'surface-2', 'foreground', 'primary', 'primary-foreground',
          'primary-soft', 'primary-text', 'accent', 'accent-foreground', 'muted', 'muted-foreground',
          'border', 'success', 'warning', 'danger', 'info',
          'success-text', 'warning-text', 'danger-text', 'info-text']


def hsl_to_hex(value: str) -> str:
    h, s, l = re.match(r'([\d.]+)\s+([\d.]+)%\s+([\d.]+)%', value.strip()).groups()
    r, g, b = colorsys.hls_to_rgb(float(h) / 360, float(l) / 100, float(s) / 100)
    return '#' + ''.join(f'{round(c * 255):02x}' for c in (r, g, b))


def parse() -> dict:
    css = CSS.read_text(encoding='utf-8')
    out = {}
    for pattern, name in SELECTORS:
        m = re.search(pattern, css)
        if not m:
            continue
        body = css[m.end():css.index('\n}', m.end())]
        tokens = dict(re.findall(r'--([a-z0-9-]+):\s*([^;]+);', body))
        pal = {}
        for key in NEEDED:
            raw = tokens.get(key)
            if raw is None:
                continue
            raw = raw.strip()
            if raw.startswith('var('):                      # ссылка на другой токен
                ref = re.match(r'var\(--([a-z0-9-]+)\)', raw).group(1)
                raw = tokens.get(ref, '').strip()
            if re.match(r'^[\d.]+\s+[\d.]+%\s+[\d.]+%$', raw):
                pal[key] = hsl_to_hex(raw)
        missing = [k for k in NEEDED if k not in pal]
        if missing:
            print(f'{name}: не найдены токены — {", ".join(missing)}')
        out[name] = pal
    return out


def lum(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= .03928 else ((x + .055) / 1.055) ** 2.4 for x in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]


def cr(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + .05) / (lb + .05)


def blend(color, alpha, base):
    """Плашка color/alpha поверх base — реальный фон, на котором лежит текст."""
    c, b = color.lstrip('#'), base.lstrip('#')
    return '#' + ''.join(f'{round(int(c[i:i+2],16)*alpha + int(b[i:i+2],16)*(1-alpha)):02x}' for i in (0, 2, 4))


PAIRS = [('foreground', 'background'), ('foreground', 'surface'), ('foreground', 'surface-2'),
         ('muted-foreground', 'background'), ('muted-foreground', 'surface'),
         ('primary-foreground', 'primary'), ('accent-foreground', 'accent'),
         ('success-text', 'surface'), ('warning-text', 'surface'),
         ('danger-text', 'surface'), ('info-text', 'surface'), ('danger-text', 'background')]

# Прозрачности — как в components/ui/badge.tsx
PLATES = [('success-text', 'success', .12), ('warning-text', 'warning', .14),
          ('danger-text', 'danger', .10), ('info-text', 'info', .10),
          ('primary-text', 'primary-soft', 1.0)]

themes = parse()
fail = 0
for name, pal in themes.items():
    for a, b in PAIRS:
        if a not in pal or b not in pal:
            continue
        c = cr(pal[a], pal[b])
        if c < 4.5:
            fail += 1
            print(f'{name:11s} {a:18s}/{b:12s} {c:5.2f} FAIL')
    for txt, plate, alpha in PLATES:
        if txt not in pal or plate not in pal:
            continue
        bg = blend(pal[plate], alpha, pal['surface']) if alpha < 1 else pal[plate]
        c = cr(pal[txt], bg)
        if c < 4.5:
            fail += 1
            print(f'{name:11s} {txt:18s}/плашка {plate:9s} {c:5.2f} FAIL')

json.dump(themes, open(Path(__file__).parent / 'tokens.json', 'w'), indent=1, ensure_ascii=False)
print(f'Тем проверено: {len(themes)}')
print('AA FAILS:', fail)
sys.exit(1 if fail else 0)
