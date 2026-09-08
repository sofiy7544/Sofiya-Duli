#!/usr/bin/env python3
"""Генератор статичних сторінок DULI Service.

Запуск:  python3 build/render.py
Результат: index.html, robots.txt, sitemap.xml, 404.html у корені репозиторію.
Ніяких залежностей — тільки стандартна бібліотека.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data import (SITE, CLAIMS, TYPES, OBJECTS, EXTRAS, FREQUENCY, ZONES,
                  SERVICES, PACKAGES, STEPS, WHY, BEFORE_AFTER, FAQ, B2B_OBJECTS,
                  PRICE_LIST, CHECKLISTS, GUARANTEES, EQUIPMENT, B2B_INCLUDED, FAQ_FULL)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "/Sofiya-Duli/"          # префікс проєктного сайту GitHub Pages
TG = "https://t.me/" + SITE["telegram"]
TEL = "tel:" + SITE["phone_href"]

# ─────────────────────────────── іконки ───────────────────────────────
_SVG = {
    "check": '<path d="m4 12.5 5 5L20 6.5"/>',
    "shield": '<path d="M12 3 5 6v6c0 4.2 2.9 7.8 7 9 4.1-1.2 7-4.8 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    "box": '<path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7Z"/><path d="m3 8.5 9 4.5 9-4.5M12 13v7"/>',
    "list": '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
    "users": '<path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19"/><circle cx="10" cy="8" r="3.2"/><path d="M20 19v-1.4a3.4 3.4 0 0 0-2.6-3.3M15.4 5.2a3.2 3.2 0 0 1 0 5.9"/>',
    "clock": '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3 1.8"/>',
    "phone": '<path d="M6.2 3.5h3l1.5 3.8-2 1.4a11.5 11.5 0 0 0 5.1 5.1l1.4-2 3.8 1.5v3a1.7 1.7 0 0 1-1.9 1.7A16.2 16.2 0 0 1 4.5 5.4 1.7 1.7 0 0 1 6.2 3.5Z"/>',
    "menu": '<path d="M4 7h16M4 12h16M4 17h16"/>',
    "close": '<path d="m6 6 12 12M18 6 6 18"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "arrow": '<path d="M5 12h13M12.5 6l6 6-6 6"/>',
    "back": '<path d="M19 12H6M11.5 18l-6-6 6-6"/>',
    "image": '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17 4.2-4 3 2.6 3.3-3.4 4.5 4.4"/>',
    "swap": '<path d="M8 7 4.5 10.5 8 14M16 10 19.5 13.5 16 17"/><path d="M4.5 10.5H14M10 13.5h9.5"/>',
    "spark": '<path d="M12 4.5 13.7 9l4.5 1.7-4.5 1.7L12 17l-1.7-4.6L5.8 10.7 10.3 9 12 4.5Z"/>',
}


def ic(name, cls=""):
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
            + (' class="%s"' % cls if cls else '') + '>' + _SVG[name] + '</svg>')


def uah(n):
    return "{:,}".format(int(n)).replace(",", " ")


# ─────────────────────────────── каркас ───────────────────────────────
NAV = [
    ("Послуги", BASE + "services/"),
    ("Ціни", BASE + "pricing/"),
    ("Як це працює", BASE + "how-it-works/"),
    ("Про нас", BASE + "about/"),
    ("Питання", BASE + "faq/"),
]


def head(title, desc, path="/", extra_ld=None):
    url = SITE["base_url"] + path
    ld = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": SITE["base_url"] + "/#business",
        "name": SITE["brand"],
        "description": desc,
        "url": SITE["base_url"] + "/",
        "telephone": SITE["phone"],
        "image": SITE["base_url"] + "/assets/og.jpg",
        "priceRange": "₴₴",
        "areaServed": {"@type": "City", "name": "Одеса"},
        "address": {"@type": "PostalAddress", "addressLocality": "Одеса", "addressCountry": "UA"},
        "openingHours": "Mo-Su 08:00-21:00",
    }
    blocks = [ld] + (extra_ld or [])
    ga = ""
    if SITE["ga4"]:
        ga = ('<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>'
              '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}'
              'gtag("js",new Date());gtag("config","%s");</script>' % (SITE["ga4"], SITE["ga4"]))
    return f"""<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#FBFBF8">
<meta property="og:type" content="website">
<meta property="og:locale" content="uk_UA">
<meta property="og:site_name" content="{SITE['brand']}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE['base_url']}/assets/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/Sofiya-Duli/assets/mark.png">
<link rel="apple-touch-icon" href="/Sofiya-Duli/assets/mark.png">
<link rel="stylesheet" href="/Sofiya-Duli/assets/css/site.css">
<script type="application/ld+json">{json.dumps(blocks, ensure_ascii=False)}</script>
{ga}
</head>
<body>"""


def header(cta="#calc"):
    nav = "".join('<a href="%s">%s</a>' % (h, t) for t, h in NAV)
    menu_links = "".join('<a href="%s">%s</a>' % (h, t) for t, h in NAV)
    return f"""
<header class="hdr">
  <div class="wrap hdr__in">
    <a class="brand" href="/Sofiya-Duli/" aria-label="{SITE['brand']} — на головну">
      <span class="brand__mark"><img src="/Sofiya-Duli/assets/mark.jpg" alt="" width="38" height="38"></span>
      <span class="brand__txt"><b>DULI Service</b><span>Клінінг · Одеса</span></span>
    </a>
    <nav class="nav">{nav}</nav>
    <div class="hdr__cta">
      <a class="hdr__tel" href="{TEL}">{SITE['phone']}</a>
      <a class="btn btn--primary" href="{cta}">Розрахувати вартість</a>
      <button class="burger" data-menu aria-label="Меню" aria-controls="menu">{ic('menu')}</button>
    </div>
  </div>
</header>

<div class="menu" id="menu">
  <div class="wrap menu__top">
    <span class="brand__txt"><b>DULI Service</b><span>Клінінг · Одеса</span></span>
    <button class="burger" data-menu aria-label="Закрити меню">{ic('close')}</button>
  </div>
  <div class="wrap menu__list">{menu_links}</div>
  <div class="wrap menu__foot">
    <a class="btn btn--primary btn--block btn--lg" href="{cta}">Розрахувати вартість</a>
    <a class="btn btn--ghost btn--block" href="{TEL}">{SITE['phone']}</a>
  </div>
</div>"""


def hero():
    segs = "".join(
        '<button type="button" data-qtype="%s" aria-pressed="%s">%s</button>'
        % (t["id"], "true" if t["id"] == "general" else "false", t["name"])
        for t in TYPES[:3]
    )
    trust = [
        ("clock", "Приїжджаємо вчасно"),
        ("box", "Своя хімія та техніка"),
        ("shield", "Ціна фіксується до виїзду"),
        ("check", "Гарантія %d години" % CLAIMS["guarantee_hours"]),
    ]
    trust_html = "".join('<div>%s<span>%s</span></div>' % (ic(i), t) for i, t in trust)
    return f"""
<section class="hero">
  <div class="wrap hero__grid">
    <div>
      <h1>Повертайтеся<br>в <em>чистий дім</em></h1>
      <p class="lead hero__lead">Прибирання квартир, будинків і офісів в Одесі. Ціну ви дізнаєтесь тут і зараз — без дзвінків і очікування менеджера.</p>
      <div class="hero__cta">
        <a class="btn btn--primary btn--lg" href="#calc">Розрахувати вартість {ic('arrow')}</a>
        <a class="btn btn--ghost btn--lg" href="{TEL}">{ic('phone')} {SITE['phone']}</a>
      </div>
      <div class="hero__trust">{trust_html}</div>
    </div>

    <div class="quick" id="quick">
      <span class="quick__label">Порахувати за 15 секунд</span>
      <div class="quick__row">
        <h4>Тип прибирання</h4>
        <div class="seg">{segs}</div>
      </div>
      <div class="quick__row">
        <div class="quick__area"><h4>Площа</h4><b><span id="qAreaV">60</span> м²</b></div>
        <input class="range" id="qArea" type="range" min="20" max="300" step="5" value="60" aria-label="Площа, м²">
      </div>
      <div class="quick__out">
        <div>
          <span class="quick__label">Орієнтовно</span>
          <div class="quick__price"><span id="qPrice">5 400</span> <small>₴</small></div>
        </div>
        <button class="btn btn--primary" id="qGo" type="button">Уточнити</button>
      </div>
      <p class="quick__note">Мінімальне замовлення — {uah(CLAIMS['min_order_uah'])} ₴. Точну суму порахуємо за 5 кроків нижче.</p>
    </div>
  </div>
</section>"""


def strip():
    items = [
        ("shield", "Фіксована ціна", "Сума відома до виїзду бригади"),
        ("box", "Усе своє", "Хімія, техніка, витратники"),
        ("list", "Робота за чек-листом", "Приймаєте за списком, не на око"),
        ("clock", "Гарантія %d год" % CLAIMS["guarantee_hours"], "Переробимо безкоштовно"),
    ]
    html = "".join(
        '<div class="strip__i">%s<div><b>%s</b><span>%s</span></div></div>' % (ic(i), t, s)
        for i, t, s in items
    )
    return '<section class="strip"><div class="wrap"><div class="strip__in">%s</div></div></section>' % html


def services():
    cards = []
    for s in SERVICES:
        inc = "".join("<li>%s</li>" % x for x in s["includes"][:4])
        btn = ('<a class="btn btn--ghost btn--sm" href="' + BASE + 'services/%s/" data-service="%s">Детальніше</a>'
               % (s["slug"], s["slug"]))
        cards.append(f"""
    <article class="svc__c">
      <a class="svc__link" href="/Sofiya-Duli/services/{s['slug']}/" aria-label="{s['name']}"></a>
      <div class="svc__img"><div class="ph">{ic('image')}<span>фото послуги</span></div></div>
      <div class="svc__b">
        <h3>{s['name']}</h3>
        <p>{s['lead']}</p>
        <ul class="svc__inc">{inc}</ul>
        <div class="svc__f">
          <div class="svc__price">від {s['from']} ₴ <span>/ {s['unit']}</span></div>
          {btn}
        </div>
      </div>
    </article>""")
    return f"""
<section class="section" id="services">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Послуги</span>
      <h2>Оберіть, що прибрати</h2>
      <p class="lead muted">Кожна послуга має фіксовану ставку й перелік робіт. Натисніть «Розрахувати» — калькулятор відкриється з готовим вибором.</p>
    </div>
    <div class="svc rv">{''.join(cards)}</div>
  </div>
</section>"""


def calculator(title="Скільки коштуватиме у вас",
               sub="П’ять кроків і дата. Ціна перераховується одразу — нічого не треба вгадувати."):
    obj = "".join(
        '<button class="opt" type="button" data-set="object" data-val="%s" aria-pressed="false">'
        '<span class="opt__t"><b>%s</b></span></button>' % (o["id"], o["name"])
        for o in OBJECTS
    )
    typ = "".join(
        '<button class="opt" type="button" data-set="type" data-val="%s" aria-pressed="false">'
        '<span class="opt__t"><b>%s</b><span>%s</span></span>'
        '<span class="opt__p">від %d ₴/м²</span></button>' % (t["id"], t["name"], t["for"], t["rate"])
        for t in TYPES
    )
    baths = "".join(
        '<button class="opt" type="button" data-set="baths" data-val="%d" aria-pressed="false">'
        '<span class="opt__t"><b>%d</b></span></button>' % (n, n) for n in (1, 2, 3)
    )
    extras = "".join(
        '<button class="opt" type="button" data-set="extras" data-val="%s" aria-pressed="false">'
        '<span class="opt__tick">%s</span>'
        '<span class="opt__t"><b>%s</b>%s</span>'
        '<span class="opt__p">+%d ₴</span></button>'
        % (e["id"], ic("check"), e["name"],
           ('<span>%s</span>' % e["note"]) if e.get("note") else "", e["price"])
        for e in EXTRAS
    )
    freq = "".join(
        '<button class="opt" type="button" data-set="freq" data-val="%s" aria-pressed="false">'
        '<span class="opt__t"><b>%s</b></span>%s</button>'
        % (f["id"], f["name"], ('<span class="opt__p">%s</span>' % f["note"]) if f["note"] else "")
        for f in FREQUENCY
    )
    zones = "".join('<option value="%s">%s%s</option>'
                    % (z["id"], z["name"], (" · +%d ₴" % z["fee"]) if z["fee"] else "")
                    for z in ZONES)
    times = "".join(
        '<button class="chip" type="button" data-set="time" data-val="%s" aria-pressed="false"><b>%s</b></button>' % (t, t)
        for t in ("09:00—12:00", "12:00—15:00", "15:00—18:00")
    )

    return f"""
<section class="section section--surface" id="calc">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Розрахунок</span>
      <h2>{title}</h2>
      <p class="lead muted">{sub}</p>
    </div>

    <div class="calc rv">
      <div class="calc__grid">
        <div class="calc__main">
          <div class="calc__bar" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i><i></i><i></i></div>

          <div class="calc__step on" data-group>
            <span class="calc__kicker">Крок 1 із 6</span>
            <h3 class="calc__q">Що прибираємо?</h3>
            <p class="calc__hint">Від типу об’єкта залежить тарифна сітка.</p>
            <div class="opts opts--2">{obj}</div>
            <div class="calc__nav"><button class="btn btn--primary" type="button" data-next>Далі {ic('arrow')}</button></div>
          </div>

          <div class="calc__step" data-group>
            <span class="calc__kicker">Крок 2 із 6</span>
            <h3 class="calc__q">Який тип прибирання?</h3>
            <p class="calc__hint">Якщо сумніваєтесь — беріть генеральне: воно охоплює все.</p>
            <div class="opts">{typ}</div>
            <div class="calc__nav">
              <button class="btn btn--ghost calc__back" type="button" data-back aria-label="Назад">{ic('back')}</button>
              <button class="btn btn--primary" type="button" data-next>Далі {ic('arrow')}</button>
            </div>
          </div>

          <div class="calc__step" data-group>
            <span class="calc__kicker">Крок 3 із 6</span>
            <h3 class="calc__q">Яка площа?</h3>
            <p class="calc__hint">Приблизно — цього достатньо для розрахунку.</p>
            <div class="calc__area">
              <b><span id="cAreaV">60</span> м²</b>
              <input id="cAreaN" type="number" inputmode="numeric" min="10" max="500" value="60" aria-label="Площа, м²">
            </div>
            <input class="range" id="cArea" type="range" min="10" max="500" step="5" value="60" aria-label="Площа повзунком">
            <h4 style="margin:22px 0 10px;font-size:.94rem">Санвузлів</h4>
            <div class="opts opts--2">{baths}</div>
            <div class="calc__nav">
              <button class="btn btn--ghost calc__back" type="button" data-back aria-label="Назад">{ic('back')}</button>
              <button class="btn btn--primary" type="button" data-next>Далі {ic('arrow')}</button>
            </div>
          </div>

          <div class="calc__step" data-group>
            <span class="calc__kicker">Крок 4 із 6</span>
            <h3 class="calc__q">Додати щось окремо?</h3>
            <p class="calc__hint">Необов’язково. Ціна кожної позиції — одразу на кнопці.</p>
            <div class="opts opts--2">{extras}</div>
            <div class="calc__nav">
              <button class="btn btn--ghost calc__back" type="button" data-back aria-label="Назад">{ic('back')}</button>
              <button class="btn btn--primary" type="button" data-next>Далі {ic('arrow')}</button>
            </div>
          </div>

          <div class="calc__step" data-group>
            <span class="calc__kicker">Крок 5 із 6</span>
            <h3 class="calc__q">Як часто прибирати?</h3>
            <p class="calc__hint">Регулярне обслуговування дешевше — знижка враховується одразу.</p>
            <div class="opts opts--2">{freq}</div>
            <div class="field" style="margin-top:20px">
              <label for="cZone">Район</label>
              <select id="cZone">{zones}</select>
            </div>
            <div class="calc__nav">
              <button class="btn btn--ghost calc__back" type="button" data-back aria-label="Назад">{ic('back')}</button>
              <button class="btn btn--primary" type="button" data-next>Обрати дату {ic('arrow')}</button>
            </div>
          </div>

          <div class="calc__step" data-group>
            <div id="cFormWrap">
              <span class="calc__kicker">Крок 6 із 6</span>
              <h3 class="calc__q">Коли вам зручно?</h3>
              <p class="calc__hint">Підтвердимо час дзвінком протягом 15 хвилин.</p>
              <div class="chips" id="cDates"></div>
              <h4 style="margin:20px 0 10px;font-size:.94rem">Час</h4>
              <div class="chips">{times}</div>
              <form id="cForm" style="margin-top:24px">
                <div class="field-row">
                  <div class="field"><label for="fName">Ім’я</label><input id="fName" name="name" required autocomplete="name" placeholder="Як до вас звертатися"></div>
                  <div class="field"><label for="fPhone">Телефон</label><input id="fPhone" name="phone" type="tel" required autocomplete="tel" placeholder="+380 __ ___ __ __"></div>
                </div>
                <div class="field"><label for="fAddr">Адреса</label><input id="fAddr" name="address" required placeholder="Вулиця, будинок, квартира"></div>
                <div class="calc__nav">
                  <button class="btn btn--ghost calc__back" type="button" data-back aria-label="Назад">{ic('back')}</button>
                  <button class="btn btn--primary" type="submit">Забронювати прибирання</button>
                </div>
              </form>
            </div>
            <div class="calc__done" id="cDone" hidden>
              {ic('check')}
              <h3 class="calc__q">Заявку прийнято</h3>
              <p class="calc__hint">Передзвонимо протягом 15 хвилин у робочі години, щоб підтвердити час і адресу.</p>
              <a class="btn btn--ghost" href="{TEL}">{ic('phone')} Зателефонувати зараз</a>
            </div>
          </div>
        </div>

        <aside class="calc__side">
          <span class="lbl">Орієнтовна вартість</span>
          <div class="calc__sum" id="cSum">0 <small>₴</small></div>
          <span class="calc__save" id="cSave" hidden></span>
          <div class="calc__rows" id="cRows"></div>
          <p class="foot">Ціна фіксується до виїзду. Якщо роботи виявиться більше — узгодимо до початку, а не за фактом.</p>
        </aside>
      </div>
    </div>
  </div>
</section>"""


def before_after():
    tabs = "".join(
        '<button type="button" data-ba-tab="%s" aria-pressed="%s">%s</button>'
        % (b["id"], "true" if i == 0 else "false", b["name"])
        for i, b in enumerate(BEFORE_AFTER)
    )
    boxes = []
    for i, b in enumerate(BEFORE_AFTER):
        hidden = "" if i == 0 else " hidden"
        before_bg = (' style="background-image:url(%s)"' % b["before"]) if b["before"] else ""
        after_bg = (' style="background-image:url(%s)"' % b["after"]) if b["after"] else ""
        empty_b = "" if b["before"] else ('<span class="ba__empty">%s фото «до» · %s</span>' % (ic("image"), b["name"].lower()))
        empty_a = "" if b["after"] else ('<span class="ba__empty">%s фото «після» · %s</span>' % (ic("image"), b["name"].lower()))
        boxes.append(f"""
    <div class="ba" data-ba="{b['id']}"{hidden}>
      <div class="ba__pane ba__pane--b"{before_bg}><span class="ba__tag">До</span>{empty_b}</div>
      <div class="ba__pane ba__pane--a"{after_bg}><span class="ba__tag">Після</span>{empty_a}</div>
      <input type="range" min="0" max="100" value="50" aria-label="Порівняння до і після">
      <span class="ba__handle">{ic('swap')}</span>
    </div>""")
    return f"""
<section class="section" id="result">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Результат</span>
      <h2>Різниця, яку видно</h2>
      <p class="lead muted">Потягніть повзунок. Тут будуть фотографії з реальних об’єктів DULI — знятих з однієї точки до і після роботи.</p>
    </div>
    <div class="ba__tabs rv">{tabs}</div>
    <div class="rv">{''.join(boxes)}</div>
  </div>
</section>"""


def how():
    items = "".join(
        '<div class="steps__i"><div class="steps__n">0%d</div><h4>%s</h4><p>%s</p></div>' % (i + 1, t, d)
        for i, (t, d) in enumerate(STEPS)
    )
    return f"""
<section class="section section--surface" id="how">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Як це працює</span>
      <h2>П’ять кроків, у яких від вас — два</h2>
      <p class="lead muted">Решту робимо ми: привозимо хімію й техніку, працюємо за чек-листом, прибираємо за собою.</p>
    </div>
    <div class="steps rv">{items}</div>
  </div>
</section>"""


def why():
    items = "".join(
        '<div class="why__i">%s<h4>%s</h4><p>%s</p></div>' % (ic(i), t, d) for i, t, d in WHY
    )
    return f"""
<section class="section" id="why">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Чому DULI</span>
      <h2>Обіцянки, які можна перевірити</h2>
      <p class="lead muted">Жодного «індивідуального підходу». Тільки те, що ви побачите під час замовлення.</p>
    </div>
    <div class="why rv">{items}</div>
  </div>
</section>"""


def packages():
    cards = []
    for p in PACKAGES:
        items = "".join("<li>%s</li>" % x for x in p["items"])
        cls = " pk__c--best" if p["best"] else ""
        btn = "btn--primary" if p["best"] else "btn--ghost"
        cards.append(f"""
    <div class="pk__c{cls}">
      <span class="pk__tag">{p['tag']}</span>
      <div class="pk__n">{p['name']}</div>
      <div class="pk__p">від {p['from']} ₴ <span>/ м²</span></div>
      <p class="muted" style="font-size:.93rem">{p['lead']}</p>
      <ul class="pk__l">{items}</ul>
      <a class="btn {btn} btn--block" href="#calc">Розрахувати</a>
    </div>""")

    rows = []
    for f in FREQUENCY:
        example = 60 * 90 * f["k"]
        on = " on" if f["id"] == "biweekly" else ""
        note = f["note"] or "базова ціна"
        rows.append('<div class="reg__r%s"><div><b>%s</b><br><span>%s</span></div>'
                    '<div class="reg__v">%s ₴</div></div>' % (on, f["name"], note, uah(example)))

    return f"""
<section class="section section--surface" id="packages">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Пакети</span>
      <h2>Три рівні глибини</h2>
      <p class="lead muted">Якщо не знаєте, що обрати — беріть STANDARD. Його замовляють найчастіше.</p>
    </div>
    <div class="pk rv">{''.join(cards)}</div>

    <div class="reg rv" style="margin-top:clamp(48px,6vw,84px)">
      <div>
        <span class="eyebrow">Регулярно</span>
        <h2 style="margin:12px 0 14px">Один раз добре.<br>Регулярно — дешевше</h2>
        <p class="lead muted">Що частіше приїжджаємо, то менше роботи за візит. Знижка застосовується автоматично й видно її одразу в калькуляторі.</p>
        <p class="muted" style="font-size:.9rem;margin-top:16px">У прикладі — генеральне прибирання 60 м². Ваша сума залежить від площі й типу.</p>
        <a class="btn btn--primary" href="#calc" style="margin-top:22px">Порахувати свою {ic('arrow')}</a>
        <a class="btn btn--quiet" href="{BASE}pricing/" style="margin-top:22px;margin-left:18px">Повний прайс {ic('arrow')}</a>
      </div>
      <div class="reg__tbl">{''.join(rows)}</div>
    </div>
  </div>
</section>"""


def b2b():
    tags = "".join("<span>%s</span>" % t for t in B2B_OBJECTS)
    return f"""
<section class="section">
  <div class="wrap">
    <div class="b2b rv">
      <div>
        <span class="eyebrow" style="color:#8FD3AC">Для бізнесу</span>
        <h2 style="margin-top:12px">Обслуговування комерційних приміщень</h2>
        <p>Працюємо за договором з ФОП і ТОВ: рахунки, акти, безготівковий розрахунок. Прибираємо до відкриття або після закриття, щоб не заважати роботі.</p>
        <div class="b2b__tags">{tags}</div>
      </div>
      <div style="display:grid;gap:12px">
        <a class="btn btn--primary btn--lg btn--block" href="{BASE}business/">Умови для бізнесу</a>
        <a class="btn btn--ghost btn--block" href="{TEL}" style="border-color:rgba(255,255,255,.28);color:#fff">{SITE['phone']}</a>
      </div>
    </div>
  </div>
</section>"""


def faq():
    items = "".join(
        '<div class="faq__i"><button class="faq__q" type="button" aria-expanded="false">%s%s</button>'
        '<div class="faq__a"><div><p>%s</p></div></div></div>' % (q, ic("plus"), a)
        for q, a in FAQ
    )
    return f"""
<section class="section section--surface" id="faq">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Питання</span>
      <h2>Що зазвичай запитують</h2>
    </div>
    <div class="faq rv">{items}</div>
  </div>
</section>"""


def final():
    links = ['<a href="%s">%s</a>' % (TEL, SITE["phone"]), '<a href="%s" target="_blank" rel="noopener">Telegram</a>' % TG]
    if SITE["instagram"]:
        links.append('<a href="%s" target="_blank" rel="noopener">Instagram</a>' % SITE["instagram"])
    return f"""
<section class="section">
  <div class="wrap">
    <div class="final rv">
      <span class="eyebrow" style="color:#8FD3AC">Почнімо</span>
      <h2 style="margin-top:14px">Поверніть собі вечір, а дому — чистоту</h2>
      <p>Розрахунок займає менше хвилини й ні до чого не зобов’язує.</p>
      <a class="btn btn--primary btn--lg" href="#calc">Розрахувати вартість {ic('arrow')}</a>
      <div class="final__links">{''.join(links)}</div>
    </div>
  </div>
</section>"""


def footer(cta="#calc"):
    svc_links = "".join('<a href="%sservices/%s/">%s</a>' % (BASE, s["slug"], s["name"]) for s in SERVICES[:5])
    nav_links = "".join('<a href="%s">%s</a>' % (h, t) for t, h in NAV)
    nav_links += '<a href="%sbusiness/">Для бізнесу</a>' % BASE
    legal = SITE["legal"] or ""
    return f"""
<footer class="ftr">
  <div class="wrap">
    <div class="ftr__grid">
      <div class="ftr__brand">
        <a class="brand" href="/Sofiya-Duli/">
          <span class="brand__mark"><img src="/Sofiya-Duli/assets/mark.jpg" alt="" width="38" height="38"></span>
          <span class="brand__txt"><b>DULI Service</b><span>Клінінг · Одеса</span></span>
        </a>
        <p>Прибирання квартир, будинків і офісів в Одесі та передмісті. Свій інвентар, професійна хімія, фіксована ціна та гарантія {CLAIMS['guarantee_hours']} години.</p>
      </div>
      <div class="ftr__col"><h5>Послуги</h5>{svc_links}</div>
      <div class="ftr__col"><h5>Компанія</h5>{nav_links}</div>
      <div class="ftr__col">
        <h5>Контакти</h5>
        <a href="{TEL}">{SITE['phone']}</a>
        <a href="{TG}" target="_blank" rel="noopener">Telegram</a>
        <p>{SITE['hours']}</p>
        <p>Одеса та передмістя</p>
      </div>
    </div>
    <div class="ftr__bot">
      <span>© 2026 {SITE['brand']}{(' · ' + legal) if legal else ''}</span>
      <span>Готівка · Картка · Безготівковий розрахунок</span>
    </div>
  </div>
</footer>

<div class="bar">
  <a class="btn btn--primary" href="{cta}">Розрахувати вартість</a>
  <a class="bar__call" href="{TEL}" aria-label="Зателефонувати">{ic('phone')}</a>
</div>"""


def scripts():
    payload = {
        "types": [{"id": t["id"], "name": t["name"], "rate": t["rate"], "min": t["min"], "speed": t["speed"]} for t in TYPES],
        "objects": OBJECTS,
        "extras": [{"id": e["id"], "name": e["name"], "price": e["price"]} for e in EXTRAS],
        "frequency": FREQUENCY,
        "zones": ZONES,
        "telegram": SITE["telegram"],
        "formEndpoint": SITE["form_endpoint"],
    }
    return ('<script>window.DULI=%s;</script>\n'
            '<script src="/Sofiya-Duli/assets/js/site.js" defer></script>\n'
            '<script src="/Sofiya-Duli/assets/js/calc.js" defer></script>\n'
            '</body>\n</html>\n' % json.dumps(payload, ensure_ascii=False))


# ─────────────────────────────── внутрішні сторінки ───────────────────────────────
def crumbs(items):
    """items: [(назва, url|None)] — останній без посилання."""
    parts = []
    for i, (name, url) in enumerate(items):
        if url:
            parts.append('<a href="%s">%s</a>' % (url, name))
        else:
            parts.append('<span aria-current="page">%s</span>' % name)
    ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n,
             **({"item": SITE["base_url"] + u.replace(BASE, "/")} if u else {})}
            for i, (n, u) in enumerate(items)
        ],
    }
    return '<nav class="crumbs" aria-label="Навігація"><div class="wrap">%s</div></nav>' % "".join(parts), ld


def page_hero(h1, intro, price_from=None, unit=None, note=None):
    price = ""
    if price_from:
        price = ('<div class="phero__price"><span>від</span><b>%d ₴</b><span>/ %s</span></div>' % (price_from, unit))
    return f"""
<section class="phero">
  <div class="wrap phero__in">
    <div>
      <h1>{h1}</h1>
      <p class="lead phero__lead">{intro}</p>
      <div class="hero__cta">
        <a class="btn btn--primary btn--lg" href="#calc">Розрахувати вартість {ic('arrow')}</a>
        <a class="btn btn--ghost btn--lg" href="{TEL}">{ic('phone')} {SITE['phone']}</a>
      </div>
      {('<p class="phero__note">%s</p>' % note) if note else ''}
    </div>
    {price}
  </div>
</section>"""


def service_page(s):
    inc = "".join('<li>%s</li>' % x for x in s["includes"])
    exc = ""
    if s["excludes"]:
        exc = ('<div class="note"><b>Не входить, замовляється окремо:</b><ul class="note__l">%s</ul></div>'
               % "".join('<li>%s</li>' % x for x in s["excludes"]))
    rows = "".join(
        '<tr><td>%s</td><td class="pt__v">%s</td><td class="pt__u">%s</td></tr>' % r
        for r in s["price_rows"]
    )
    faq_items = "".join(
        '<div class="faq__i"><button class="faq__q" type="button" aria-expanded="false">%s%s</button>'
        '<div class="faq__a"><div><p>%s</p></div></div></div>' % (q, ic("plus"), a)
        for q, a in s["faq"]
    )
    other = "".join(
        '<a class="rel__c" href="%sservices/%s/"><b>%s</b><span>від %d ₴/%s</span>%s</a>'
        % (BASE, x["slug"], x["name"], x["from"], x["unit"], ic("arrow"))
        for x in SERVICES if x["slug"] != s["slug"]
    )

    crumb_html, crumb_ld = crumbs([
        ("Головна", BASE),
        ("Послуги", BASE + "services/"),
        (s["name"], None),
    ])
    ld_service = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": s["name"],
        "serviceType": s["name"],
        "description": s["seo_desc"],
        "provider": {"@id": SITE["base_url"] + "/#business"},
        "areaServed": {"@type": "City", "name": "Одеса"},
        "offers": {"@type": "Offer", "price": s["from"], "priceCurrency": "UAH",
                   "description": "від %d ₴ за %s" % (s["from"], s["unit"])},
    }
    ld_faq = {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q,
                        "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in s["faq"]],
    }

    prefill = '<script>window.DULI_PREFILL={type:"%s"};</script>' % s["calc"]

    return (head(s["seo_title"], s["seo_desc"], "/services/%s/" % s["slug"],
                 [crumb_ld, ld_service, ld_faq])
            + header() + crumb_html
            + page_hero(s["h1"], s["intro"], s["from"], s["unit"],
                        "Мінімальне замовлення — %s ₴. Виїзд по Одесі безкоштовний." % uah(CLAIMS["min_order_uah"]))
            + f"""
<section class="section section--surface">
  <div class="wrap inc__grid">
    <div>
      <span class="eyebrow">Склад робіт</span>
      <h2 style="margin:12px 0 16px">Що входить</h2>
      <p class="lead muted">Це робочий чек-лист бригади. Ви приймаєте роботу за цим списком, а не на око.</p>
      {exc}
    </div>
    <ul class="inc__l">{inc}</ul>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Ціни</span>
      <h2>Скільки це коштує</h2>
      <p class="lead muted">Ціни фіксуються до виїзду. Якщо роботи виявиться більше — узгоджуємо до початку.</p>
    </div>
    <div class="pt__wrap rv">
      <table class="pt">
        <thead><tr><th>Позиція</th><th>Ціна</th><th>Одиниця</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  </div>
</section>"""
            + calculator("Порахуйте свою вартість",
                         "Калькулятор уже відкритий на потрібній послузі — залишилось вказати площу.")
            + how()
            + f"""
<section class="section">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Питання</span>
      <h2>Про цю послугу</h2>
    </div>
    <div class="faq rv">{faq_items}</div>
    <p class="muted" style="margin-top:22px;font-size:.95rem">Решта питань — у <a href="{BASE}#faq" style="color:var(--brand)">загальному розділі</a>.</p>
  </div>
</section>

<section class="section section--surface">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Інші послуги</span>
      <h2>Що ще ми робимо</h2>
    </div>
    <div class="rel rv">{other}</div>
  </div>
</section>"""
            + final() + footer() + prefill + scripts())


def services_hub():
    cards = []
    for s in SERVICES:
        inc = "".join("<li>%s</li>" % x for x in s["includes"][:4])
        cards.append(f"""
    <article class="svc__c">
      <a class="svc__link" href="{BASE}services/{s['slug']}/" aria-label="{s['name']}"></a>
      <div class="svc__img"><div class="ph">{ic('image')}<span>фото послуги</span></div></div>
      <div class="svc__b">
        <h3>{s['name']}</h3>
        <p>{s['lead']}</p>
        <ul class="svc__inc">{inc}</ul>
        <div class="svc__f">
          <div class="svc__price">від {s['from']} ₴ <span>/ {s['unit']}</span></div>
          <span class="btn btn--ghost btn--sm">Детальніше</span>
        </div>
      </div>
    </article>""")

    crumb_html, crumb_ld = crumbs([("Головна", BASE), ("Послуги", None)])
    title = "Послуги клінінгу в Одесі — прибирання квартир, офісів, після ремонту | DULI Service"
    desc = ("Усі послуги DULI Service в Одесі: підтримуюче та генеральне прибирання, після ремонту, "
            "миття вікон, офіси, хімчистка меблів. Ціни та онлайн-розрахунок.")
    return (head(title, desc, "/services/", [crumb_ld])
            + header() + crumb_html
            + page_hero("Послуги клінінгу в Одесі",
                        "Шість напрямків із фіксованими ставками. Оберіть свій — на сторінці буде повний "
                        "склад робіт, ціни та калькулятор.",
                        note="Працюємо 7 днів на тиждень, виїзд у день звернення.")
            + f"""
<section class="section section--surface">
  <div class="wrap"><div class="svc rv">{''.join(cards)}</div></div>
</section>"""
            + calculator() + why() + final() + footer() + scripts())


def pricing_page():
    groups = "".join(
        f"""
    <div class="pg rv" id="pg-{i}">
      <h3 class="pg__h">{name}</h3>
      <div class="pt__wrap">
        <table class="pt">
          <thead><tr><th>Послуга</th><th>Ціна</th><th>Одиниця</th></tr></thead>
          <tbody>{''.join('<tr><td>%s</td><td class="pt__v">%s</td><td class="pt__u">%s</td></tr>' % r for r in rows)}</tbody>
        </table>
      </div>
    </div>"""
        for i, (name, rows) in enumerate(PRICE_LIST)
    )
    jump = "".join('<a href="#pg-%d">%s</a>' % (i, name) for i, (name, _) in enumerate(PRICE_LIST))
    zones_rows = "".join(
        '<tr><td>%s</td><td class="pt__v">%s</td></tr>'
        % (z["name"], ("+%d ₴" % z["fee"]) if z["fee"] else "безкоштовно")
        for z in ZONES
    )
    crumb_html, crumb_ld = crumbs([("Головна", BASE), ("Ціни", None)])
    title = "Ціни на клінінг в Одесі — прайс-лист 2026 | DULI Service"
    desc = ("Повний прайс-лист DULI Service: прибирання квартир від 45 ₴/м², генеральне від 90 ₴/м², "
            "після ремонту від 130 ₴/м², миття вікон, хімчистка меблів, офіси. 75 позицій.")
    return (head(title, desc, "/pricing/", [crumb_ld])
            + header(BASE + "#calc") + crumb_html
            + page_hero("Ціни на клінінг в Одесі",
                        "Повний прайс без зірочок і дрібного шрифту. Ціна фіксується до виїзду — "
                        "якщо роботи виявиться більше, узгоджуємо це до початку, а не за фактом.",
                        note="Мінімальне замовлення — %s ₴. Виїзд у межах міста безкоштовний."
                             % uah(CLAIMS["min_order_uah"]))
            + packages()
            + f"""
<section class="section">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Прайс-лист</span>
      <h2>Усі послуги та ціни</h2>
      <p class="lead muted">Розділи прайсу — перейдіть до потрібного або порахуйте вартість у калькуляторі.</p>
    </div>
    <div class="jump rv">{jump}</div>
    <div class="pg__list">{groups}</div>

    <div class="section-head rv" style="margin-top:clamp(48px,6vw,84px)">
      <span class="eyebrow">Виїзд</span>
      <h2>Райони Одеси</h2>
      <p class="lead muted">У межах міста виїзд безкоштовний. Для передмістя — фіксована доплата за дорогу.</p>
    </div>
    <div class="pt__wrap pt__wrap--narrow rv">
      <table class="pt">
        <thead><tr><th>Район</th><th>Доплата</th></tr></thead>
        <tbody>{zones_rows}</tbody>
      </table>
    </div>
  </div>
</section>"""
            + final() + footer(BASE + "#calc") + scripts())


def how_page():
    steps_html = "".join(
        f"""
    <div class="hstep">
      <div class="hstep__n">0{i + 1}</div>
      <div class="hstep__b"><h3>{t}</h3><p>{d}</p></div>
    </div>"""
        for i, (t, d) in enumerate(STEPS)
    )
    checks = "".join(
        f"""
    <div class="chk">
      <h3>{name}</h3>
      <p class="chk__s">{sub}</p>
      {''.join('<div class="chk__r"><b>%s</b><ul>%s</ul></div>' % (room, ''.join('<li>%s</li>' % x for x in items)) for room, items in rooms)}
    </div>"""
        for name, sub, rooms in CHECKLISTS
    )
    nots = ["купувати хімію та інвентар", "звільняти квартиру на весь день",
            "стояти поруч і контролювати", "домовлятися про вивіз сміття окремо",
            "гадати, скільки це коштуватиме"]
    crumb_html, crumb_ld = crumbs([("Головна", BASE), ("Як це працює", None)])
    title = "Як ми прибираємо — процес і чек-листи | DULI Service"
    desc = ("Як влаштоване прибирання DULI Service: п’ять кроків від заявки до приймання роботи "
            "та повні чек-листи для кожного типу прибирання.")
    return (head(title, desc, "/how-it-works/", [crumb_ld])
            + header(BASE + "#calc") + crumb_html
            + page_hero("Як це працює",
                        "П’ять кроків, у яких від вас — два: сказати, що прибрати, і прийняти роботу. "
                        "Решту робимо ми.")
            + f"""
<section class="section section--surface">
  <div class="wrap"><div class="hsteps rv">{steps_html}</div></div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Чого вам не треба робити</span>
      <h2>Ми беремо на себе побут цілком</h2>
    </div>
    <ul class="nots rv">{''.join('<li>%s</li>' % n for n in nots)}</ul>
  </div>
</section>

<section class="section section--surface">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Чек-листи</span>
      <h2>За чим працює бригада</h2>
      <p class="lead muted">Це робочий документ, а не маркетинг. Ви можете звірити результат по пунктах
      і не приймати роботу, поки все не виконано.</p>
    </div>
    <div class="chk__grid rv">{checks}</div>
  </div>
</section>"""
            + calculator() + final() + footer() + scripts())


def business_page():
    tags = "".join('<div class="b2o"><b>%s</b></div>' % t for t in B2B_OBJECTS)
    inc = "".join('<div class="why__i"><h4>%s</h4><p>%s</p></div>' % (t, d) for t, d in B2B_INCLUDED)
    rows = "".join(
        '<tr><td>%s</td><td class="pt__v">%s</td><td class="pt__u">%s</td></tr>' % r
        for r in dict(PRICE_LIST)["Офіси та комерція"]
    )
    crumb_html, crumb_ld = crumbs([("Головна", BASE), ("Для бізнесу", None)])
    title = "Клінінг для бізнесу в Одесі — офіси, кафе, магазини | DULI Service"
    desc = ("Прибирання офісів, кафе, магазинів і салонів в Одесі за договором. Рахунки, акти, "
            "безготівковий розрахунок, постійна бригада та підміна персоналу. Від 22 ₴/м².")
    return (head(title, desc, "/business/", [crumb_ld])
            + header(BASE + "#calc") + crumb_html
            + page_hero("Клінінг для бізнесу",
                        "Постійна бригада, фіксований графік і документи в порядку. Прибираємо до відкриття "
                        "або після закриття, щоб не заважати вашій команді.",
                        note="Працюємо з ФОП і ТОВ: договір, рахунки, акти, безготівковий розрахунок.")
            + f"""
<section class="section section--surface">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Об’єкти</span>
      <h2>Кого ми обслуговуємо</h2>
    </div>
    <div class="b2o__grid rv">{tags}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Що входить</span>
      <h2>Не лише прибирання</h2>
    </div>
    <div class="why rv">{inc}</div>
  </div>
</section>

<section class="section section--surface">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Ціни</span>
      <h2>Тарифи для комерційних приміщень</h2>
      <p class="lead muted">Для регулярного обслуговування — знижка до 25 % залежно від частоти візитів.</p>
    </div>
    <div class="pt__wrap rv">
      <table class="pt">
        <thead><tr><th>Тип об’єкта</th><th>Ціна</th><th>Одиниця</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Комерційна пропозиція</span>
      <h2>Порахуємо КП за один робочий день</h2>
      <p class="lead muted">Залиште дані про об’єкт — надішлемо розрахунок із варіантами графіка та вартістю за місяць.</p>
    </div>
    <div class="formcard rv">
      <form id="b2bForm">
        <div class="field-row">
          <div class="field"><label for="bc">Компанія</label><input id="bc" name="company" required placeholder="Назва"></div>
          <div class="field"><label for="bp">Контактна особа</label><input id="bp" name="person" required placeholder="Ім’я"></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="bt">Телефон</label><input id="bt" name="phone" type="tel" required placeholder="+380 __ ___ __ __"></div>
          <div class="field"><label for="bo">Тип об’єкта</label>
            <select id="bo" name="obj">{''.join('<option>%s</option>' % o for o in B2B_OBJECTS)}<option>Інше</option></select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label for="ba">Площа, м²</label><input id="ba" name="area" type="number" inputmode="numeric" placeholder="180"></div>
          <div class="field"><label for="bs">Графік</label>
            <select id="bs" name="sched"><option>Щодня</option><option>2 рази на тиждень</option><option>Щотижня</option><option>Разово</option><option>Ще не визначились</option></select>
          </div>
        </div>
        <div class="field"><label for="bm">Коментар</label><textarea id="bm" name="msg" rows="3" placeholder="Адреса, час доступу, особливості об’єкта"></textarea></div>
        <button class="btn btn--primary btn--block btn--lg" type="submit">Отримати КП</button>
      </form>
    </div>
  </div>
</section>"""
            + final() + footer(BASE + "#calc") + scripts())


def about_page():
    guarantees = "".join(
        '<div class="why__i">%s<h4>%s</h4><p>%s</p></div>' % (ic(i), t, d) for i, t, d in GUARANTEES
    )
    equip = "".join(
        '<div class="eq"><b>%s</b><span>%s</span></div>' % (t, d) for t, d in EQUIPMENT
    )
    team = "".join(
        '<div class="team__c"><div class="team__ph">%s<span>фото команди</span></div></div>' % ic("image")
        for _ in range(4)
    )
    crumb_html, crumb_ld = crumbs([("Головна", BASE), ("Про нас", None)])
    title = "Про DULI Service — клінінгова компанія в Одесі"
    desc = ("DULI Service — клінінгова служба в Одесі. Постійні бригади, професійна хімія та обладнання, "
            "фіксована ціна й гарантія 24 години.")
    return (head(title, desc, "/about/", [crumb_ld])
            + header(BASE + "#calc") + crumb_html
            + page_hero("Служба, яка працює на результат, а не на години",
                        "Ми свідомо відмовились від оплати «за присутність». Клієнт платить за результат: "
                        "обсяг робіт зафіксовано в чек-листі, ціна — до виїзду, а якщо щось зроблено погано, "
                        "ми повертаємось і переробляємо.")
            + f"""
<section class="section section--surface">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Команда</span>
      <h2>За кожним прибиранням стоять люди</h2>
      <p class="lead muted">Клінер заходить до вас додому, тож ви маєте знати, хто приїде. Усі працюють у нас
      постійно й проходять навчання роботі з хімією та поверхнями — це не випадкові люди під замовлення.</p>
    </div>
    <div class="team rv">{team}</div>
    <p class="muted rv" style="font-size:.88rem;margin-top:16px">Тут будуть фотографії бригад DULI у формі.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Обладнання</span>
      <h2>Що бригада привозить із собою</h2>
      <p class="lead muted">Вам не треба купувати нічого — ані хімії, ані ганчірок.</p>
    </div>
    <div class="eq__grid rv">{equip}</div>
  </div>
</section>

<section class="section section--surface">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Гарантії</span>
      <h2>За що ми відповідаємо</h2>
    </div>
    <div class="why rv">{guarantees}</div>
  </div>
</section>"""
            + final() + footer(BASE + "#calc") + scripts())


def faq_page():
    groups = "".join(
        f"""
    <div class="fgroup rv">
      <h3 class="fgroup__h">{name}</h3>
      <div class="faq">{''.join(
          '<div class="faq__i"><button class="faq__q" type="button" aria-expanded="false">%s%s</button>'
          '<div class="faq__a"><div><p>%s</p></div></div></div>' % (q, ic("plus"), a) for q, a in items)}</div>
    </div>"""
        for name, items in FAQ_FULL
    )
    ld_faq = {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q,
                        "acceptedAnswer": {"@type": "Answer", "text": a}}
                       for _, items in FAQ_FULL for q, a in items],
    }
    crumb_html, crumb_ld = crumbs([("Головна", BASE), ("Питання", None)])
    title = "Питання та відповіді про клінінг | DULI Service"
    desc = ("Відповіді на питання про прибирання: ціни, оплата, хімія, гарантії, робота з бізнесом. "
            "17 питань, на які ми відповідаємо найчастіше.")
    return (head(title, desc, "/faq/", [crumb_ld, ld_faq])
            + header(BASE + "#calc") + crumb_html
            + page_hero("Питання та відповіді",
                        "Зібрали те, що запитують найчастіше. Якщо вашого питання тут немає — "
                        "зателефонуйте або напишіть, відповімо швидко.")
            + '<section class="section section--surface"><div class="wrap"><div class="fgroups">%s</div></div></section>' % groups
            + final() + footer(BASE + "#calc") + scripts())


# ─────────────────────────────── збірка ───────────────────────────────
def build_home():
    ld_faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ
        ],
    }
    title = "Клінінг в Одесі — прибирання квартир, будинків і офісів | DULI Service"
    desc = ("Прибирання квартир, будинків та офісів в Одесі. Розрахунок вартості онлайн за хвилину, "
            "фіксована ціна до виїзду, своя хімія та обладнання, гарантія 24 години.")
    return (head(title, desc, "/", [ld_faq]) + header() + hero() + strip() + services()
            + calculator() + before_after() + how() + why() + packages() + b2b()
            + faq() + final() + footer() + scripts())


def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    print("  %-16s %6.1f KB" % (path, len(content.encode()) / 1024))


def main():
    print("Збірка DULI Service:")
    write("index.html", build_home())
    write("services/index.html", services_hub())
    write("pricing/index.html", pricing_page())
    write("how-it-works/index.html", how_page())
    write("business/index.html", business_page())
    write("about/index.html", about_page())
    write("faq/index.html", faq_page())
    for s in SERVICES:
        write("services/%s/index.html" % s["slug"], service_page(s))

    write("robots.txt", "User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % SITE["base_url"])

    urls = ([("/", "1.0"), ("/services/", "0.9"), ("/pricing/", "0.9")]
            + [("/services/%s/" % s["slug"], "0.8") for s in SERVICES]
            + [("/how-it-works/", "0.7"), ("/business/", "0.8"), ("/about/", "0.6"), ("/faq/", "0.7")])
    body = "".join(
        '  <url><loc>%s%s</loc><changefreq>weekly</changefreq><priority>%s</priority></url>\n'
        % (SITE["base_url"], u, pr) for u, pr in urls
    )
    write("sitemap.xml",
          '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % body)

    nf = (head("Сторінку не знайдено | DULI Service", "Такої сторінки немає.", "/404.html")
          + header(BASE + "#calc")
          + '<section class="section"><div class="wrap" style="text-align:center;padding:60px 0">'
            '<span class="eyebrow">404</span>'
            '<h2 style="margin:14px 0">Такої сторінки немає</h2>'
            '<p class="lead muted" style="max-width:44ch;margin:0 auto 28px">Можливо, посилання застаріло. '
            'Поверніться на головну — там є калькулятор і всі послуги.</p>'
            '<a class="btn btn--primary btn--lg" href="/Sofiya-Duli/">На головну</a>'
            '</div></section>'
          + footer(BASE + "#calc") + scripts())
    write("404.html", nf)
    print("Готово.")


if __name__ == "__main__":
    main()
