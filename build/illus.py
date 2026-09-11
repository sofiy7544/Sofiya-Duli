#!/usr/bin/env python3
"""Фірмові ілюстрації DULI Service — 7 сцен у єдиному стилі.

Запуск: python3 build/illus.py  →  assets/illus/*.svg
Стиль: плоска геометрія, молочний фон, шавлієвий та піщаний тон, зелений — лише акцент.
Кожна сцена 640×400 (16:10), як і слоти карток.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "illus")

# палітра
BG1, BG2 = "#F6F7F2", "#E9EFE9"      # фон-градієнт
WALL = "#EEF0EA"                       # стіна
FLOOR = "#E3DDD0"                      # підлога, пісок
FLOOR2 = "#D8D1C2"
SAGE = "#CFE0D4"                       # шавлія
SAGE2 = "#B9D1C1"
WHITE = "#FFFFFF"
INK = "#12150F"
GREEN = "#1F6B41"
GREEN2 = "#2F8F5B"
SAND = "#E8DFCF"
SAND2 = "#D9CDB6"
GLASS = "#DCEAF0"
GLASS2 = "#C9DEE8"
OP35 = "opacity='.35'"


def head(name):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400" '
            f'role="img" aria-label="{name}">\n'
            f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
            f'<stop offset="0" stop-color="{BG1}"/><stop offset="1" stop-color="{BG2}"/></linearGradient>'
            f'<linearGradient id="light" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{WHITE}" stop-opacity=".9"/><stop offset="1" stop-color="{WHITE}" stop-opacity="0"/></linearGradient>'
            f'</defs>\n<rect width="640" height="400" fill="url(#bg)"/>\n')


def sparkle(x, y, s=12, color=GREEN2, op=1):
    """Чотирипроменева іскра — фірмовий знак чистоти."""
    return (f'<path d="M{x} {y-s} Q{x} {y} {x+s} {y} Q{x} {y} {x} {y+s} Q{x} {y} {x-s} {y} Q{x} {y} {x} {y-s}Z" '
            f'fill="{color}" opacity="{op}"/>')


def rr(x, y, w, h, r, fill, extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" {extra}/>'


def window(x, y, w, h, sill=True):
    parts = [rr(x, y, w, h, 10, WHITE),
             rr(x + 8, y + 8, w - 16, h - 16, 6, GLASS),
             f'<path d="M{x+8} {y+8} L{x+w-8} {y+h-16} L{x+w-8} {y+8}Z" fill="{GLASS2}" opacity=".55"/>',
             f'<line x1="{x+w/2}" y1="{y+8}" x2="{x+w/2}" y2="{y+h-8}" stroke="{WHITE}" stroke-width="6"/>',
             f'<line x1="{x+8}" y1="{y+h/2}" x2="{x+w-8}" y2="{y+h/2}" stroke="{WHITE}" stroke-width="6"/>']
    if sill:
        parts.append(rr(x - 10, y + h, w + 20, 12, 4, SAND2))
    return "\n".join(parts)


def plant(x, y, h=70):
    return (f'{rr(x-14, y-10, 28, 30, 6, SAND2)}'
            f'<path d="M{x} {y-10} C{x-30} {y-40} {x-26} {y-h} {x} {y-h+6} C{x+26} {y-h} {x+30} {y-40} {x} {y-10}Z" fill="{SAGE2}"/>'
            f'<path d="M{x} {y-10} C{x-6} {y-36} {x-4} {y-h+16} {x} {y-h+18}" stroke="{GREEN}" stroke-width="2" fill="none" opacity=".6"/>')


def floor(y=300):
    return rr(0, y, 640, 400 - y, 0, FLOOR) + f'<rect x="0" y="{y}" width="640" height="3" fill="{FLOOR2}"/>'


def spray(x, y, scale=1.0, color=GREEN):
    s = scale
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'{rr(-14, 0, 28, 62, 8, WHITE)}'
            f'{rr(-14, 22, 28, 40, 8, color)}'
            f'{rr(-8, -18, 16, 22, 4, INK)}'
            f'<path d="M-6 -10 L-26 -6 L-26 2 L-6 0Z" fill="{INK}"/>'
            f'{rr(-12, 30, 24, 10, 3, WHITE, OP35)}'
            f'</g>')


def cloth(x, y, w=64, h=40, color=SAGE2):
    return (f'<path d="M{x} {y+10} Q{x+w*0.3} {y-6} {x+w*0.55} {y+8} Q{x+w*0.8} {y+20} {x+w} {y+6} '
            f'L{x+w-6} {y+h} Q{x+w*0.5} {y+h+10} {x+4} {y+h-4}Z" fill="{color}"/>'
            f'<path d="M{x+10} {y+18} Q{x+w*0.5} {y+8} {x+w-12} {y+16}" stroke="{WHITE}" stroke-width="3" fill="none" opacity=".6"/>')


def glove_hand(x, y, angle=-20):
    """Спрощена рука в рукавичці, тримає щось у точці (x,y)."""
    return (f'<g transform="translate({x} {y}) rotate({angle})">'
            f'{rr(-16, 0, 32, 70, 14, GREEN)}'
            f'{rr(-14, -6, 28, 22, 10, GREEN2)}'
            f'{rr(-20, 60, 40, 22, 8, SAND)}'
            f'</g>')


# ─────────────────────────────── сцени ───────────────────────────────
def hero():
    s = head("Світла вітальня після прибирання")
    s += rr(0, 0, 640, 300, 0, WALL)
    s += floor(300)
    s += window(360, 52, 210, 190)
    # промінь світла
    s += f'<path d="M370 60 L560 60 L640 300 L300 300Z" fill="url(#light)" opacity=".7"/>'
    # диван
    s += rr(60, 190, 250, 110, 18, SAGE)
    s += rr(60, 170, 250, 40, 16, SAGE2)
    s += rr(46, 200, 30, 100, 12, SAGE2)
    s += rr(294, 200, 30, 100, 12, SAGE2)
    s += rr(90, 210, 90, 34, 10, WHITE, "opacity='.7'")
    s += rr(190, 210, 90, 34, 10, WHITE, "opacity='.7'")
    # столик і ваза
    s += rr(350, 250, 120, 12, 4, SAND2)
    s += rr(360, 262, 10, 38, 3, SAND2)
    s += rr(450, 262, 10, 38, 3, SAND2)
    s += plant(590, 300, 90)
    s += rr(380, 216, 22, 36, 6, WHITE)
    s += sparkle(300, 120, 14) + sparkle(330, 90, 8, GREEN2, .7) + sparkle(200, 140, 6, GREEN2, .5)
    return s + "</svg>"


def kitchen():
    s = head("Чиста кухня")
    s += rr(0, 0, 640, 300, 0, WALL)
    # фартух
    s += rr(0, 120, 640, 90, 0, SAGE)
    for i in range(0, 640, 80):
        s += f'<line x1="{i}" y1="120" x2="{i}" y2="210" stroke="{WHITE}" stroke-width="2" opacity=".5"/>'
    s += f'<line x1="0" y1="165" x2="640" y2="165" stroke="{WHITE}" stroke-width="2" opacity=".5"/>'
    # верхні шафи
    s += rr(0, 30, 640, 80, 0, WHITE)
    for i in range(20, 640, 150):
        s += rr(i, 40, 130, 60, 8, SAND, "opacity='.8'")
    # стільниця та нижні шафи
    s += rr(0, 210, 640, 16, 0, WHITE)
    s += rr(0, 226, 640, 74, 0, SAND)
    for i in range(20, 640, 150):
        s += rr(i, 238, 130, 50, 8, SAND2, "opacity='.7'")
    s += floor(300)
    # мийка і кран
    s += rr(250, 200, 140, 18, 6, GLASS2)
    s += f'<path d="M320 200 L320 168 Q320 152 336 152 L352 152" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/>'
    # спрей і серветка
    s += spray(120, 150, 1.0)
    s += cloth(440, 176)
    s += sparkle(470, 150, 12) + sparkle(200, 190, 7, GREEN2, .7) + sparkle(560, 120, 8, GREEN2, .6)
    return s + "</svg>"


def deep():
    s = head("Генеральне прибирання: техніка всередині")
    s += rr(0, 0, 640, 300, 0, WALL)
    s += floor(300)
    # холодильник відкритий
    s += rr(70, 60, 150, 240, 14, WHITE)
    s += rr(84, 74, 122, 212, 8, GLASS)
    for y in (120, 170, 220):
        s += rr(90, y, 110, 6, 3, WHITE)
    s += rr(200, 60, 12, 240, 6, WHITE)
    # духова шафа
    s += rr(270, 150, 180, 150, 14, WHITE)
    s += rr(284, 166, 152, 100, 8, INK, "opacity='.75'")
    s += rr(300, 180, 120, 72, 6, GLASS2, "opacity='.5'")
    s += rr(284, 276, 152, 10, 4, SAND2)
    for i in range(3):
        s += f'<circle cx="{300+i*26}" cy="281" r="4" fill="{WHITE}"/>'
    # рука з губкою
    s += glove_hand(520, 140, -30)
    s += rr(492, 116, 46, 30, 8, GREEN2)
    s += rr(492, 116, 46, 12, 8, SAGE2)
    s += sparkle(360, 120, 16) + sparkle(150, 40, 9, GREEN2, .7) + sparkle(470, 90, 7, GREEN2, .5)
    return s + "</svg>"


def renovation():
    s = head("Квартира після ремонту")
    s += rr(0, 0, 640, 300, 0, WALL)
    # захисна плівка знята — чиста стіна праворуч, ліворуч ще пил
    s += rr(0, 0, 320, 300, 0, SAND, "opacity='.55'")
    for i, (x, y, r) in enumerate([(60, 80, 3), (120, 140, 2), (90, 200, 2.5), (200, 60, 2), (240, 170, 3), (160, 250, 2), (280, 110, 2)]):
        s += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{SAND2}"/>'
    s += floor(300)
    s += rr(320, 300, 320, 100, 0, FLOOR2, "opacity='.35'")
    # драбина
    s += f'<path d="M110 300 L150 90 M210 300 L170 90" stroke="{SAND2}" stroke-width="8" stroke-linecap="round"/>'
    for y in (130, 170, 210, 250):
        t = (y - 90) / 210
        s += f'<line x1="{150 + (110-150)*t}" y1="{y}" x2="{170 + (210-170)*t}" y2="{y}" stroke="{SAND2}" stroke-width="8" stroke-linecap="round"/>'
    # відро та фарба
    s += rr(250, 250, 44, 50, 6, WHITE)
    s += rr(250, 250, 44, 12, 6, GREEN2)
    # чистий бік: вікно й пилосос
    s += window(380, 60, 190, 160)
    s += rr(470, 230, 110, 70, 26, WHITE)
    s += f'<circle cx="500" cy="300" r="12" fill="{INK}" opacity=".6"/><circle cx="556" cy="300" r="12" fill="{INK}" opacity=".6"/>'
    s += f'<path d="M470 250 Q430 250 420 290 L400 300" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>'
    s += sparkle(420, 40, 14) + sparkle(600, 250, 9, GREEN2, .7) + sparkle(350, 250, 7, GREEN2, .5)
    return s + "</svg>"


def windows():
    s = head("Миття вікон")
    s += rr(0, 0, 640, 300, 0, WALL)
    s += floor(300)
    s += window(120, 30, 400, 250, sill=True)
    # ліва половина ще з розводами, права вже чиста
    s += rr(128, 38, 192, 234, 4, GLASS2, "opacity='.7'")
    for y in (70, 110, 150, 190, 230):
        s += f'<path d="M140 {y} q30 -8 60 0 t60 0" stroke="{WHITE}" stroke-width="3" fill="none" opacity=".5"/>'
    # склоочисник
    s += rr(300, 120, 14, 110, 6, INK, "opacity='.8'")
    s += rr(270, 108, 74, 16, 5, GREEN)
    s += f'<path d="M272 124 L342 124 L342 132 Q307 140 272 132Z" fill="{INK}" opacity=".7"/>'
    # небо за вікном: сонце
    s += f'<circle cx="440" cy="90" r="26" fill="{WHITE}" opacity=".85"/>'
    s += plant(590, 300, 80)
    s += sparkle(430, 180, 16) + sparkle(470, 230, 9, GREEN2, .7) + sparkle(400, 130, 7, GREEN2, .5)
    return s + "</svg>"


def office():
    s = head("Чистий офіс")
    s += rr(0, 0, 640, 300, 0, WALL)
    s += floor(300)
    s += window(420, 40, 190, 150)
    # два столи з моніторами
    for x in (50, 240):
        s += rr(x, 200, 160, 14, 5, WHITE)
        s += rr(x + 10, 214, 10, 86, 3, SAND2)
        s += rr(x + 140, 214, 10, 86, 3, SAND2)
        s += rr(x + 40, 140, 80, 54, 6, INK, "opacity='.8'")
        s += rr(x + 46, 146, 68, 42, 4, GLASS)
        s += rr(x + 74, 194, 12, 8, 2, INK, "opacity='.6'")
        s += rr(x + 60, 200, 40, 4, 2, INK, "opacity='.5'")
        # крісло
        s += rr(x + 50, 236, 60, 40, 12, SAGE)
        s += rr(x + 58, 276, 44, 8, 3, SAGE2)
    s += plant(600, 300, 100)
    s += spray(470, 230, .85)
    s += sparkle(300, 90, 14) + sparkle(120, 100, 8, GREEN2, .6) + sparkle(560, 240, 7, GREEN2, .5)
    return s + "</svg>"


def extras():
    s = head("Хімчистка дивана")
    s += rr(0, 0, 640, 300, 0, WALL)
    s += floor(300)
    # диван
    s += rr(90, 160, 380, 140, 22, SAGE)
    s += rr(90, 130, 380, 50, 18, SAGE2)
    s += rr(70, 176, 34, 124, 14, SAGE2)
    s += rr(456, 176, 34, 124, 14, SAGE2)
    s += rr(120, 190, 100, 40, 10, WHITE, "opacity='.65'")
    s += rr(230, 190, 100, 40, 10, WHITE, "opacity='.65'")
    s += rr(340, 190, 100, 40, 10, WHITE, "opacity='.65'")
    # піна там, де чистять
    for cx, cy, r in [(365, 210, 10), (384, 202, 8), (352, 198, 7), (376, 220, 6)]:
        s += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{WHITE}"/>'
    # насадка екстрактора зі шлангом
    s += rr(392, 150, 30, 60, 8, INK, "opacity='.8'")
    s += rr(384, 204, 46, 14, 5, GREEN)
    s += f'<path d="M407 150 Q420 90 500 90 T600 140" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/>'
    s += rr(560, 130, 70, 90, 16, WHITE)
    s += rr(575, 145, 40, 20, 6, GREEN2)
    s += sparkle(300, 100, 16) + sparkle(200, 120, 8, GREEN2, .6) + sparkle(520, 250, 7, GREEN2, .5)
    return s + "</svg>"


SCENES = {
    "hero": hero,
    "uborka-kvartir": kitchen,
    "generalna-pryburannya": deep,
    "pislya-remontu": renovation,
    "myttya-vikon": windows,
    "pryburannya-ofisu": office,
    "dodatkovi-poslugy": extras,
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in SCENES.items():
        path = os.path.join(OUT, name + ".svg")
        with open(path, "w", encoding="utf-8") as f:
            f.write(fn())
        print("  %-26s %5.1f KB" % (name + ".svg", os.path.getsize(path) / 1024))
