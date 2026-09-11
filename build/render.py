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
                  PRICE_LIST, CHECKLISTS, GUARANTEES, EQUIPMENT, B2B_INCLUDED, FAQ_FULL,
                  FURNITURE, WINDOW_SASH, REVIEWS)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "/Sofiya-Duli/"          # префікс проєктного сайту GitHub Pages
TG = ("https://t.me/" + SITE["telegram"]) if SITE["telegram"] else ""
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
    "chev": '<path d="m6 9.5 6 6 6-6"/>',
    "chevr": '<path d="m9 6 6 6-6 6"/>',
    "msg": '<path d="M4.5 5.5h15v10.5H9l-4.5 3.5V5.5Z"/><path d="M8 9.5h8M8 12.5h5"/>',
    "send": '<path d="m4 11.5 16-7-4.5 15.5-4-6.5-7.5-2Z"/><path d="m11.5 13.5 8.5-9"/>',
    "star": '<path d="m12 4 2.4 5 5.5.7-4 3.8 1 5.5-4.9-2.7L7.1 19l1-5.5-4-3.8L9.6 9 12 4Z"/>',
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
        "priceRange": "₴₴₴",
        "areaServed": {"@type": "City", "name": "Одеса"},
        "address": {"@type": "PostalAddress", "addressLocality": "Одеса", "addressRegion": "Одеська область", "addressCountry": "UA"},
        "openingHoursSpecification": {"@type": "OpeningHoursSpecification",
                                      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                                      "opens": "08:00", "closes": "21:00"},
        "contactPoint": {"@type": "ContactPoint", "telephone": SITE["phone_href"], "contactType": "customer service",
                         "availableLanguage": ["uk", "ru"]},
        "sameAs": [u for u in (TG, SITE["instagram"]) if u],
        "paymentAccepted": "Cash, Credit Card, Bank transfer",
        "currenciesAccepted": "UAH",
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
<link rel="preload" href="/Sofiya-Duli/assets/fonts/manrope-cyr.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/Sofiya-Duli/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/Sofiya-Duli/assets/css/site.css">
<script type="application/ld+json">{json.dumps(blocks, ensure_ascii=False)}</script>
{ga}
</head>
<body>"""


def header(cta="#calc", cur=""):
    """Шапка + мобільне меню + відкриття <main>. cur — шлях поточної сторінки для aria-current."""
    def link(t, h, arrow=False):
        curattr = ' aria-current="page"' if cur and h == cur else ""
        return '<a href="%s"%s>%s%s</a>' % (h, curattr, t, ic("chevr") if arrow else "")
    nav = "".join(link(t, h) for t, h in NAV)
    menu_links = "".join(link(t, h, True) for t, h in NAV + [("Для бізнесу", BASE + "business/")])
    menu_sub = "".join('<a href="%sservices/%s/">%s</a>' % (BASE, s["slug"], s["name"]) for s in SERVICES)
    return f"""
<a class="skip" href="#main">Перейти до вмісту</a>
<header class="hdr">
  <div class="wrap hdr__in">
    <a class="brand" href="/Sofiya-Duli/" aria-label="{SITE['brand']} — на головну">
      <span class="brand__mark"><img src="/Sofiya-Duli/assets/mark.jpg" alt="" width="38" height="38"></span>
      <span class="brand__txt"><b>DULI Service</b><span>Клінінг · Одеса</span></span>
    </a>
    <nav class="nav" aria-label="Основна навігація">{nav}</nav>
    <div class="hdr__cta">
      <a class="hdr__tel" href="{TEL}">{SITE['phone']}</a>
      <a class="btn btn--primary" href="{cta}">Розрахувати вартість</a>
      <a class="hdr__call" href="{TEL}" aria-label="Зателефонувати {SITE['phone']}">{ic('phone')}</a>
      <button class="burger" type="button" data-menu aria-label="Відкрити меню" aria-expanded="false" aria-controls="menu">{ic('menu')}</button>
    </div>
  </div>
</header>

<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Меню сайту">
  <div class="menu__top">
    <span class="brand__txt"><b>DULI Service</b><span>Клінінг · Одеса</span></span>
    <button class="burger" type="button" data-menu aria-label="Закрити меню">{ic('close')}</button>
  </div>
  <nav class="menu__list" aria-label="Розділи">{menu_links}</nav>
  <div class="menu__sub">{menu_sub}</div>
  <div class="menu__foot">
    <a class="btn btn--primary btn--block btn--lg" href="{cta}" data-track="cta_menu">Розрахувати вартість {ic('arrow')}</a>
    <div class="menu__row">
      <a class="btn btn--ghost btn--block" href="{TEL}">{ic('phone')} Подзвонити</a>
      {('<a class="btn btn--ghost btn--block" href="%s" target="_blank" rel="noopener">%s Telegram</a>' % (TG, ic('send'))) if TG else ('<a class="btn btn--ghost btn--block" href="sms:%s">%s SMS</a>' % (SITE['phone_href'], ic('msg')))}
    </div>
    <p>{SITE['hours']} · Одеса та передмістя</p>
  </div>
</div>
<main id="main">"""


def hero():
    segs = "".join(
        '<button type="button" data-qtype="%s" aria-pressed="%s">%s</button>'
        % (t["id"], "true" if t["id"] == "general" else "false", t["name"])
        for t in TYPES[:3]
    )
    trust = [
        ("shield", "Ціна відома до виїзду — без доплат «за фактом»"),
        ("box", "Своя хімія, техніка й витратники"),
        ("clock", "Гарантія %d години: пропустили — повернемось" % CLAIMS["guarantee_hours"]),
        ("users", "Постійні бригади, а не випадкові люди"),
    ]
    trust_html = "".join('<div>%s<span>%s</span></div>' % (ic(i), t) for i, t in trust)
    return f"""
<section class="hero">
  <div class="wrap hero__grid">
    <div>
      <p class="hero__kicker"><b>DULI Service</b><i></i><span>Клінінг в Одесі</span><i></i><span>Квартири · Будинки · Офіси</span></p>
      <h1>Повертайтеся <em>в чистий дім</em></h1>
      <p class="lead hero__lead">Прибирання квартир, будинків і офісів в Одесі. Ціну бачите одразу на сайті, бригада приїжджає зі своєю хімією та технікою, а за результат відповідаємо {CLAIMS['guarantee_hours']} години.</p>
      <div class="hero__cta">
        <a class="btn btn--primary btn--lg" href="#calc" data-track="cta_hero">Розрахувати вартість {ic('arrow')}</a>
        <a class="btn btn--ghost btn--lg" href="{TEL}">{ic('phone')} Зателефонувати</a>
      </div>
      <p class="hero__hint">15 секунд, без дзвінка й без зобов’язань. Від&nbsp;{uah(CLAIMS['min_order_uah']).replace(' ', '&nbsp;')}&nbsp;₴ за&nbsp;візит.</p>
      <div class="hero__trust">{trust_html}</div>
    </div>

    <div class="quick" id="quick">
      <span class="quick__label">Порахувати за 15 секунд</span>
      <div class="quick__row">
        <span class="quick__t" id="qTypeL">Тип прибирання</span>
        <div class="seg" role="group" aria-labelledby="qTypeL">{segs}</div>
      </div>
      <div class="quick__row">
        <div class="quick__area"><span class="quick__t">Площа</span><b><span id="qAreaV">60</span> м²</b></div>
        <input class="range" id="qArea" type="range" min="20" max="300" step="5" value="60" aria-label="Площа, м²">
      </div>
      <div class="quick__out">
        <div>
          <span class="quick__label">Орієнтовно</span>
          <div class="quick__price"><span id="qPrice">6 900</span> <small>₴</small></div>
        </div>
        <button class="btn btn--primary" id="qGo" type="button">Уточнити {ic('arrow')}</button>
      </div>
      <p class="quick__note">Мінімальне замовлення — {uah(CLAIMS['min_order_uah'])} ₴. Точну суму з доплатами й знижкою порахуємо за 5 кроків нижче.</p>
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


def svc_card(s, eager=False):
    """Картка = потреба → результат → що входить → ціна → розрахунок."""
    inc = "".join("<li>%s</li>" % x for x in s["includes"][:3])
    obj = {"myttya-vikon": "windows", "dodatkovi-poslugy": "furniture", "pryburannya-ofisu": "office"}.get(s["slug"], "flat")
    return f"""
    <article class="svc__c">
      <a class="svc__img" href="{BASE}services/{s['slug']}/" aria-label="{s['name']}">{svc_img(s, eager)}</a>
      <div class="svc__b">
        <span class="svc__need">{s['need']}</span>
        <h3><a href="{BASE}services/{s['slug']}/">{s['outcome']}</a></h3>
        <p class="svc__what">{s['name']} · <b>від {s['from']} ₴/{s['unit']}</b></p>
        <ul class="svc__inc">{inc}</ul>
        <div class="svc__f">
          <button class="btn btn--primary btn--sm" type="button" data-calc-type="{s['calc']}" data-calc-object="{obj}" data-service="{s['slug']}">Розрахувати вартість {ic('arrow')}</button>
        </div>
      </div>
    </article>"""


def svc_img(s, eager=False):
    """Ілюстрація або фото послуги; поки фото немає — фірмова сцена.
    eager=True для карток над згином — не гальмуємо LCP лінивим завантаженням."""
    if s.get("photo"):
        return ('<img src="%s%s" alt="%s" loading="%s"%s width="640" height="400">'
                % (BASE, s["photo"], s["name"], "eager" if eager else "lazy",
                   ' fetchpriority="high"' if eager else ""))
    return '<div class="ph">%s<span>фото послуги</span></div>' % ic("image")


def services():
    cards = "".join(svc_card(s, i == 0) for i, s in enumerate(SERVICES))
    return f"""
<section class="section" id="services">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Оберіть свою ситуацію</span>
      <h2>Який результат вам потрібен?</h2>
      <p class="lead muted">Не «послуга з прайсу», а конкретний результат у вашому домі. Натисніть «Розрахувати» — калькулятор відкриється з готовим вибором, ціну побачите одразу.</p>
    </div>
    <div class="svc rv">{cards}</div>
    <div class="section-cta rv">
      <a class="btn btn--ghost" href="{BASE}services/">Усі послуги {ic('arrow')}</a>
      <p>Не знайшли своєї ситуації? Зателефонуйте — підберемо формат за хвилину.</p>
    </div>
  </div>
</section>"""


def saturday():
    lines = ["Не витрачаєте суботу на прибирання.", "Не купуєте хімію та не шукаєте, де її зберігати.",
             "Не тягаєте пилосос і не миєте вікна на висоті.", "Не тримаєте в голові, що ще залишилось прибрати."]
    return f"""
<section class="section section--surface" id="saturday">
  <div class="wrap sat">
    <div>
      <span class="eyebrow">Що ви отримуєте насправді</span>
      <h2>Поки ви займаєтесь своїми справами, ми займаємось чистотою</h2>
    </div>
    <div>
      <ul class="sat__l">{''.join('<li>%s</li>' % l for l in lines)}</ul>
      <p class="sat__end">Просто повертаєтесь у чистий дім.</p>
      <a class="btn btn--primary btn--lg" href="#calc" data-track="cta_saturday">Хочу вільну суботу {ic('arrow')}</a>
    </div>
  </div>
</section>"""


def trust():
    """Блок довіри. Цифри (рейтинг, кількість замовлень) показуються лише коли заповнені в SITE —
    нічого не вигадуємо. Решта — обіцянки, які клієнт може перевірити на своєму замовленні."""
    facts = []
    if SITE.get("rating"):
        facts.append(("%s / 5" % SITE["rating"],
                      "середня оцінка" + (" · %s відгуків" % SITE["rating_count"] if SITE.get("rating_count") else "")))
    if SITE.get("orders_done"):
        facts.append((SITE["orders_done"], "виконаних прибирань"))
    facts_html = "".join('<div class="tr__i tr__fact"><b>%s</b><span>%s</span></div>' % f for f in facts)
    items = [
        ("shield", "Ціна фіксується до виїзду", "Сума відома до того, як бригада зайшла у двері. Більше робіт — тільки за вашою згодою."),
        ("clock", "Гарантія %d години" % CLAIMS["guarantee_hours"], "Помітили недолік протягом доби — повертаємось і переробляємо безкоштовно."),
        ("box", "Усе своє привозимо", "Хімія, техніка, витратники. Вам не треба нічого купувати й готувати."),
        ("users", "Постійні бригади", "Ті самі навчені клінери, а не випадкові люди під замовлення."),
    ]
    items_html = "".join('<div class="tr__i">%s<b>%s</b><span>%s</span></div>' % (ic(i), t, d) for i, t, d in items)
    slot = ""
    if not REVIEWS:
        slot = ('<div class="tr__slot rv">%s<span>Відгуки клієнтів з’являться тут після перших замовлень. '
                'Публікуємо лише справжні — з іменем і джерелом.</span></div>' % ic("star"))
    return f"""
<section class="section" id="trust">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Довіра</span>
      <h2>Що ви можете перевірити на своєму замовленні</h2>
      <p class="lead muted">Жодних «ми найкращі». Тільки те, що видно під час і після прибирання.</p>
    </div>
    <div class="tr rv">{facts_html}{items_html}</div>
    {slot}
    <div class="section-cta rv">
      <a class="btn btn--primary" href="#calc" data-track="cta_trust">Перевірити на замовленні {ic('arrow')}</a>
    </div>
  </div>
</section>"""


def reviews():
    """Справжні відгуки з data.py. Порожній список — секції немає."""
    if not REVIEWS:
        return ""
    cards = "".join(
        '<div class="rev__c"><p>«%s»</p><div class="rev__m"><b>%s</b><span>· %s</span><span>· %s</span></div></div>'
        % (r["text"], r["name"], r["meta"], r["source"]) for r in REVIEWS
    )
    return f"""
<section class="section section--surface" id="reviews">
  <div class="wrap">
    <div class="section-head rv">
      <span class="eyebrow">Відгуки</span>
      <h2>Що кажуть після прибирання</h2>
    </div>
    <div class="rev rv">{cards}</div>
  </div>
</section>"""


def calculator(title="Скільки коштуватиме у вас",
               sub="П’ять коротких кроків. Ціна перераховується одразу — нічого не треба вгадувати."):
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
    sashes = "".join(
        '<button class="opt" type="button" data-set="sashes" data-val="%d" aria-pressed="false">'
        '<span class="opt__t"><b>%d стулок</b></span><span class="opt__p">%s ₴</span></button>'
        % (n, n, uah(n * WINDOW_SASH)) for n in (2, 4, 6, 8, 10, 14)
    )
    furn = "".join(
        '<div class="cnt__r"><div class="cnt__t"><b>%s</b><span>%s ₴</span></div>'
        '<div class="cnt__c"><button type="button" data-cnt="%s" data-d="-1" aria-label="Менше">−</button>'
        '<output id="cnt-%s" aria-live="polite">0</output><button type="button" data-cnt="%s" data-d="1" aria-label="Більше">+</button></div></div>'
        % (f["name"], uah(f["price"]), f["id"], f["id"], f["id"]) for f in FURNITURE
    )
    zones = "".join('<option value="%s">%s%s</option>'
                    % (z["id"], z["name"], (" · +%d ₴" % z["fee"]) if z["fee"] else "")
                    for z in ZONES)
    times = "".join(
        '<button class="chip" type="button" data-set="time" data-val="%s" aria-pressed="false"><b>%s</b></button>' % (t, t)
        for t in ("09:00—12:00", "12:00—15:00", "15:00—18:00")
    )
    names = ["Об’єкт", "Тип", "Обсяг", "Опції", "Бронювання"]
    steps_html = "".join('<span%s>%s</span>' % (' class="on"' if i == 0 else "", n) for i, n in enumerate(names))
    bars = "".join('<i%s></i>' % (' class="on"' if i == 0 else "") for i in range(5))

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
          <div class="calc__prog">
            <div class="calc__steps" aria-hidden="true">{steps_html}</div>
            <div class="calc__bar" aria-hidden="true">{bars}</div>
            <span class="calc__kicker" id="cKicker" aria-live="polite">Крок 1 із 5 · <b>Об’єкт</b></span>
          </div>

          <div class="calc__step on" data-group>
            <h3 class="calc__q">Що прибираємо?</h3>
            <p class="calc__hint">Від типу об’єкта залежить тарифна сітка.</p>
            <div class="opts opts--2">{obj}</div>
          </div>

          <div class="calc__step" data-group>
            <h3 class="calc__q">Який тип прибирання?</h3>
            <p class="calc__hint">Якщо сумніваєтесь — беріть генеральне: воно охоплює все.</p>
            <div class="opts">{typ}</div>
          </div>

          <div class="calc__step" data-group>
            <div id="pArea">
              <h3 class="calc__q">Яка площа?</h3>
              <p class="calc__hint">Приблизно — цього достатньо для розрахунку.</p>
              <div class="calc__area">
                <b><span id="cAreaV">60</span> м²</b>
                <input id="cAreaN" type="number" inputmode="numeric" min="10" max="500" value="60" aria-label="Площа, м²">
              </div>
              <input class="range" id="cArea" type="range" min="10" max="500" step="5" value="60" aria-label="Площа повзунком">
              <p class="calc__sub" id="cBathsL">Санвузлів</p>
              <div class="opts opts--2" role="group" aria-labelledby="cBathsL">{baths}</div>
            </div>
            <div id="pWin" hidden>
              <h3 class="calc__q">Скільки стулок?</h3>
              <p class="calc__hint">Стулка — одна відкривна частина вікна. Ціна включає скло з обох боків, раму та підвіконня.</p>
              <div class="opts opts--2">{sashes}</div>
            </div>
            <div id="pFurn" hidden>
              <h3 class="calc__q">Що почистити?</h3>
              <p class="calc__hint">Вкажіть кількість — ціна складеться автоматично.</p>
              <div class="cnt">{furn}</div>
            </div>
          </div>

          <div class="calc__step" data-group>
            <h3 class="calc__q">Додати щось і як часто?</h3>
            <p class="calc__hint">Усе необов’язково. Ціна кожної позиції — одразу на кнопці, знижка за регулярність — теж.</p>
            <div id="pExtras">
              <p class="calc__sub" id="cExtrasL" style="margin-top:0">Додаткові роботи</p>
              <div class="opts opts--2" role="group" aria-labelledby="cExtrasL">{extras}</div>
            </div>
            <p class="calc__sub" id="cFreqL">Як часто прибирати?</p>
            <div class="opts opts--2" role="group" aria-labelledby="cFreqL">{freq}</div>
            <div class="field" style="margin-top:20px">
              <label for="cZone">Район</label>
              <select id="cZone">{zones}</select>
            </div>
          </div>

          <div class="calc__step" data-group>
            <div id="cFormWrap">
              <h3 class="calc__q">Коли вам зручно?</h3>
              <p class="calc__hint">Підтвердимо час дзвінком протягом 15 хвилин у робочі години.</p>
              <div class="chips" id="cDates" aria-label="Дата"></div>
              <p class="calc__sub" id="cTimeL">Час</p>
              <div class="chips" id="cTimes" role="group" aria-labelledby="cTimeL">{times}</div>
              <p class="form-err" id="cWhenErr" role="alert">Оберіть дату та зручний час — так ми одразу зарезервуємо бригаду.</p>
              <form id="cForm" style="margin-top:22px" novalidate>
                <div class="field-row">
                  <div class="field"><label for="fName">Ім’я</label><input id="fName" name="name" required autocomplete="name" placeholder="Як до вас звертатися" aria-describedby="fNameErr"><span class="field__err" id="fNameErr">Напишіть, як до вас звертатися.</span></div>
                  <div class="field"><label for="fPhone">Телефон</label><input id="fPhone" name="phone" type="tel" required autocomplete="tel" inputmode="tel" placeholder="+380 __ ___ __ __" aria-describedby="fPhoneErr"><span class="field__err" id="fPhoneErr">Перевірте номер: потрібно 10 цифр, наприклад 063 704 16 17.</span></div>
                </div>
                <div class="field"><label for="fAddr">Адреса <small>· необов’язково, уточнимо при дзвінку</small></label><input id="fAddr" name="address" autocomplete="street-address" placeholder="Вулиця, будинок, квартира"></div>
                <p class="consent">Натискаючи «Замовити прибирання», ви погоджуєтесь на обробку контактних даних для зв’язку щодо замовлення. <a href="{BASE}privacy/">Як ми з ними поводимось</a>.</p>
              </form>
            </div>
            <div class="calc__done" id="cDone" hidden>
              {ic('check')}
              <h3 class="calc__q" id="cDoneT">Заявку сформовано</h3>
              <p class="calc__hint" id="cDoneP">Ми відкрили Telegram із готовим текстом заявки — залишилось натиснути «Надіслати». Підтвердимо час дзвінком протягом 15 хвилин у робочі години.</p>
              <div class="calc__alt">
                <a class="btn btn--primary" id="cTgLink" href="{TG or '#'}" target="_blank" rel="noopener"{'' if TG else ' hidden'}>{ic('send')} Відкрити Telegram із заявкою</a>
                <p id="cAltP">{'Немає Telegram? Текст заявки вже готовий — надішліть його SMS або просто зателефонуйте.' if TG else 'Якщо SMS не відкрилось — просто зателефонуйте, ми все запишемо з ваших слів.'}</p>
                <a class="btn {'btn--ghost' if TG else 'btn--primary'}" id="cSmsLink" href="sms:{SITE['phone_href']}">{ic('msg')} Надіслати SMS</a>
                <a class="btn btn--ghost" href="{TEL}">{ic('phone')} Зателефонувати</a>
              </div>
            </div>
          </div>
        </div>

        <aside class="calc__side" id="cSide">
          <span class="lbl">Орієнтовна вартість</span>
          <div class="calc__sum" id="cSum">0 <small>₴</small></div>
          <span class="calc__save" id="cSave" hidden></span>
          <div class="calc__rows" id="cRows"></div>
          <p class="foot">Ціна фіксується до виїзду. Якщо роботи виявиться більше — узгодимо до початку, а не за фактом.</p>
        </aside>

        <div class="calc__foot" id="cFoot">
          <button class="btn btn--ghost calc__back" type="button" data-back aria-label="Назад" hidden>{ic('back')}</button>
          <button class="calc__tot" type="button" data-side aria-expanded="false" aria-controls="cSide">
            <small>Разом ≈</small><b><span id="cTot">0 ₴</span>{ic('chev')}</b>
          </button>
          <button class="btn btn--primary calc__next" type="button" data-next id="cNext">Далі {ic('arrow')}</button>
        </div>
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
    <div class="section-cta rv">
      <a class="btn btn--primary" href="#calc" data-track="cta_how">Почати з розрахунку {ic('arrow')}</a>
      <a class="btn btn--quiet" href="{BASE}how-it-works/">Чек-листи бригади {ic('arrow')}</a>
    </div>
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
    <div class="section-cta rv">
      <a class="btn btn--ghost" href="{BASE}about/">Хто приїде і що привезе {ic('arrow')}</a>
      <p>Кожна обіцянка — пункт у вашій заявці, а не слоган.</p>
    </div>
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
      <p class="pk__lead">{p['lead']}</p>
      <ul class="pk__l">{items}</ul>
      <a class="btn {btn} btn--block" href="#calc" data-track="cta_package">Розрахувати {p['name']}</a>
    </div>""")

    rows = []
    for f in FREQUENCY:
        example = 60 * TYPES[1]["rate"] * f["k"]
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

    <div class="reg rv">
      <div>
        <span class="eyebrow">Регулярно</span>
        <h2>Один раз добре.<br>Регулярно — дешевше</h2>
        <p class="lead muted">Що частіше приїжджаємо, то менше роботи за візит. Знижка застосовується автоматично й видно її одразу в калькуляторі.</p>
        <p class="reg__note">У прикладі — генеральне прибирання 60 м². Ваша сума залежить від площі й типу.</p>
        <div class="reg__cta">
          <a class="btn btn--primary" href="#calc" data-track="cta_regular">Порахувати свою {ic('arrow')}</a>
          <a class="btn btn--quiet" href="{BASE}pricing/">Повний прайс {ic('arrow')}</a>
        </div>
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
        <span class="eyebrow">Для бізнесу</span>
        <h2>Команда щоранку приходить у чистий офіс</h2>
        <p>Працюємо за договором з ФОП і ТОВ: рахунки, акти, безготівковий розрахунок. Прибираємо до відкриття або після закриття, щоб не заважати роботі.</p>
        <div class="b2b__tags">{tags}</div>
      </div>
      <div class="b2b__cta">
        <a class="btn btn--primary btn--lg btn--block" href="{BASE}business/">Умови та КП за день {ic('arrow')}</a>
        <a class="btn btn--ghost btn--block" href="{TEL}">{ic('phone')} {SITE['phone']}</a>
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
    <div class="section-cta rv">
      <a class="btn btn--ghost" href="{TEL}">{ic('phone')} Запитати телефоном</a>
      <a class="btn btn--quiet" href="{BASE}faq/">Усі 17 відповідей {ic('arrow')}</a>
    </div>
  </div>
</section>"""


def final():
    links = ['<a href="%s">%s</a>' % (TEL, SITE["phone"])]
    if TG:
        links.append('<a href="%s" target="_blank" rel="noopener">Telegram</a>' % TG)
    if SITE["instagram"]:
        links.append('<a href="%s" target="_blank" rel="noopener">Instagram</a>' % SITE["instagram"])
    return f"""
<section class="section">
  <div class="wrap">
    <div class="final rv">
      <span class="eyebrow">Почнімо</span>
      <h2>Поверніть собі вечір, а дому — чистоту</h2>
      <p>Розрахунок — менше хвилини. Ціна фіксується до виїзду й ні до чого не зобов’язує.</p>
      <a class="btn btn--primary btn--lg" href="#calc" data-track="cta_final">Розрахувати вартість {ic('arrow')}</a>
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
</main>
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
        {('<a href="%s" target="_blank" rel="noopener">Telegram</a>' % TG) if TG else ('<a href="sms:%s">SMS</a>' % SITE['phone_href'])}
        <p>{SITE['hours']}</p>
        <p>Одеса та передмістя</p>
      </div>
    </div>
    <div class="ftr__bot">
      <span>© 2026 {SITE['brand']}{(' · ' + legal) if legal else ''} · <a href="{BASE}privacy/">Конфіденційність</a></span>
      <span>Готівка · Картка · Безготівковий розрахунок</span>
    </div>
  </div>
</footer>

<div class="bar" id="bar">
  <a class="btn btn--primary" href="{cta}" data-track="cta_bar">Розрахувати вартість {ic('arrow')}</a>
  <a class="bar__call" href="{TEL}" aria-label="Зателефонувати {SITE['phone']}">{ic('phone')}</a>
</div>"""


def scripts():
    payload = {
        "types": [{"id": t["id"], "name": t["name"], "rate": t["rate"], "min": t["min"], "speed": t["speed"]} for t in TYPES],
        "objects": OBJECTS,
        "extras": [{"id": e["id"], "name": e["name"], "price": e["price"]} for e in EXTRAS],
        "frequency": FREQUENCY,
        "zones": ZONES,
        "furniture": FURNITURE,
        "sash": WINDOW_SASH,
        "telegram": SITE["telegram"],
        "phone": SITE["phone_href"],
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


def page_hero(h1, intro, price_from=None, unit=None, note=None, img=None):
    price = ""
    if img:
        price = '<img class="phero__img" src="%s%s" alt="" width="640" height="400">' % (BASE, img)
    if price_from:
        price = ('<div class="phero__price"><span>від</span><b>%d ₴</b><span>/ %s</span></div>' % (price_from, unit))
    return f"""
<section class="phero">
  <div class="wrap phero__in">
    <div>
      <h1>{h1}</h1>
      <p class="lead phero__lead">{intro}</p>
      <div class="hero__cta">
        <a class="btn btn--primary btn--lg" href="#calc" data-track="cta_page_hero">Розрахувати вартість {ic('arrow')}</a>
        <a class="btn btn--ghost btn--lg" href="{TEL}">{ic('phone')} Зателефонувати</a>
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
            + header(cur=BASE + "services/") + crumb_html
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
    <p class="faq-more">Решта питань — у <a href="{BASE}faq/">загальному розділі</a>, або зателефонуйте: <a href="{TEL}">{SITE['phone']}</a>.</p>
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
    for i, s in enumerate(SERVICES):
        inc = "".join("<li>%s</li>" % x for x in s["includes"][:4])
        cards.append(f"""
    <article class="svc__c">
      <a class="svc__link" href="{BASE}services/{s['slug']}/" aria-label="{s['name']}"></a>
      <div class="svc__img">{svc_img(s, i < 2)}</div>
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
    title = "Послуги клінінгу в Одесі — ціни й розрахунок | DULI"
    desc = ("Усі послуги DULI Service в Одесі: підтримуюче та генеральне прибирання, після ремонту, "
            "миття вікон, офіси, хімчистка меблів. Ціни та онлайн-розрахунок.")
    return (head(title, desc, "/services/", [crumb_ld])
            + header(cur=BASE + "services/") + crumb_html
            + page_hero("Послуги клінінгу в Одесі",
                        "Шість напрямків із фіксованими ставками. Оберіть свій — на сторінці буде повний "
                        "склад робіт, ціни та калькулятор.",
                        note="Працюємо 7 днів на тиждень, виїзд у день звернення.", img=SITE["hero_photo"])
            + f"""
<section class="section section--surface">
  <div class="wrap"><div class="svc svc--hub rv">{''.join(cards)}</div></div>
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
    desc = ("Повний прайс-лист DULI Service: прибирання квартир від 55 ₴/м², генеральне від 115 ₴/м², "
            "після ремонту від 150 ₴/м², миття вікон, хімчистка меблів, офіси. 75 позицій.")
    return (head(title, desc, "/pricing/", [crumb_ld])
            + header(BASE + "#calc", cur=BASE + "pricing/") + crumb_html
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
            + header(BASE + "#calc", cur=BASE + "how-it-works/") + crumb_html
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
    title = "Клінінг для бізнесу в Одесі — офіси, кафе, магазини | DULI"
    desc = ("Прибирання офісів, кафе, магазинів і салонів в Одесі за договором. Рахунки, акти, "
            "безготівковий розрахунок, постійна бригада та підміна персоналу. Від 32 ₴/м².")
    return (head(title, desc, "/business/", [crumb_ld])
            + header(BASE + "#calc", cur=BASE + "business/") + crumb_html
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
            + header(BASE + "#calc", cur=BASE + "about/") + crumb_html
            + page_hero("Служба, яка працює на результат, а не на години",
                        "Ми свідомо відмовились від оплати «за присутність». Клієнт платить за результат: "
                        "обсяг робіт зафіксовано в чек-листі, ціна — до виїзду, а якщо щось зроблено погано, "
                        "ми повертаємось і переробляємо.", img=SITE["hero_photo"])
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
            + header(BASE + "#calc", cur=BASE + "faq/") + crumb_html
            + page_hero("Питання та відповіді",
                        "Зібрали те, що запитують найчастіше. Якщо вашого питання тут немає — "
                        "зателефонуйте або напишіть, відповімо швидко.")
            + '<section class="section section--surface"><div class="wrap"><div class="fgroups">%s</div></div></section>' % groups
            + final() + footer(BASE + "#calc") + scripts())


def privacy_page():
    legal = SITE["legal"] or "DULI Service"
    crumb_html, crumb_ld = crumbs([("Головна", BASE), ("Конфіденційність", None)])
    title = "Політика конфіденційності | DULI Service"
    desc = "Які дані ми отримуємо з форм сайту DULI Service, навіщо, скільки зберігаємо та як їх видалити."
    return (head(title, desc, "/privacy/", [crumb_ld])
            + header(BASE + "#calc") + crumb_html
            + f"""
<section class="section">
  <div class="wrap legal">
    <span class="eyebrow">Персональні дані</span>
    <h1 style="font-size:var(--fs-h1-page);margin:12px 0 18px">Політика конфіденційності</h1>
    <p class="lead">Коротко: ми беремо лише ім’я, телефон і адресу, використовуємо їх тільки щоб домовитись про прибирання, нікому не передаємо і видаляємо на ваш запит.</p>

    <h2>Хто обробляє дані</h2>
    <p>{legal}, Одеса. Зв’язок: <a href="{TEL}">{SITE['phone']}</a>{(', Telegram <a href="%s" target="_blank" rel="noopener">@%s</a>' % (TG, SITE['telegram'])) if TG else ''}.</p>

    <h2>Які дані ми отримуємо</h2>
    <ul>
      <li>Із форми розрахунку та бронювання — ім’я, телефон, адреса (за бажанням), обрані параметри прибирання, дата й час.</li>
      <li>Із форми для бізнесу — назва компанії, контактна особа, телефон, тип і площа об’єкта, коментар.</li>
      <li>Технічні дані — вибір у калькуляторі зберігається у вашому браузері (localStorage), щоб ви не втратили розрахунок; на сервер він не передається.</li>
    </ul>

    <h2>Навіщо</h2>
    <p>Щоб підтвердити замовлення, узгодити час і адресу, виконати прибирання та зв’язатися щодо гарантії. Розсилок і реклами без окремої згоди ми не надсилаємо.</p>

    <h2>Куди потрапляє заявка</h2>
    <p>Форма формує текст заявки й відкриває його у вашому месенджері або SMS для надсилання нам. Ви самі бачите, що саме надсилаєте. Якщо на сайті підключено пряму доставку заявок, вони надходять на наш робочий номер або пошту.</p>

    <h2>Скільки зберігаємо і як видалити</h2>
    <p>Контакти зберігаються на час виконання замовлення та гарантійного періоду. Щоб видалити дані або дізнатись, що ми зберігаємо, — напишіть або зателефонуйте за контактами вище. Виконаємо протягом 10 днів.</p>

    <h2>Cookies та аналітика</h2>
    <p>Сайт не використовує рекламних cookies. Якщо увімкнено Google Analytics, збираються знеособлені дані про відвідування сторінок; їх можна заблокувати в налаштуваннях браузера.</p>

    <p class="muted" style="margin-top:28px;font-size:var(--fs-caption)">Оновлено: вересень 2026. Підстава — Закон України «Про захист персональних даних».</p>
  </div>
</section>"""
            + footer(BASE + "#calc") + scripts())


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
    title = "Клінінг в Одесі — прибирання квартир і офісів | DULI"
    desc = ("Прибирання квартир, будинків та офісів в Одесі. Розрахунок вартості онлайн за хвилину, "
            "фіксована ціна до виїзду, своя хімія та обладнання, гарантія 24 години.")
    return (head(title, desc, "/", [ld_faq]) + header(cur=BASE) + hero() + strip() + services()
            + saturday() + calculator() + trust() + reviews() + how() + why() + packages() + b2b()
            # before_after() повертається, щойно з’являться власні фото: див. BEFORE_AFTER у data.py
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
    write("privacy/index.html", privacy_page())
    for s in SERVICES:
        write("services/%s/index.html" % s["slug"], service_page(s))

    write("robots.txt", "User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % SITE["base_url"])

    urls = ([("/", "1.0"), ("/services/", "0.9"), ("/pricing/", "0.9")]
            + [("/services/%s/" % s["slug"], "0.8") for s in SERVICES]
            + [("/how-it-works/", "0.7"), ("/business/", "0.8"), ("/about/", "0.6"), ("/faq/", "0.7"), ("/privacy/", "0.2")])
    body = "".join(
        '  <url><loc>%s%s</loc><changefreq>weekly</changefreq><priority>%s</priority></url>\n'
        % (SITE["base_url"], u, pr) for u, pr in urls
    )
    write("sitemap.xml",
          '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % body)

    nf = (head("Сторінку не знайдено | DULI Service", "Такої сторінки немає.", "/404.html")
          + header(BASE + "#calc")
          + '<section class="section"><div class="wrap nf">'
            '<span class="eyebrow">404</span>'
            '<h1 style="font-size:var(--fs-h2);margin:12px 0">Такої сторінки немає</h1>'
            '<p class="lead muted">Можливо, посилання застаріло. '
            'Поверніться на головну — там є калькулятор і всі послуги.</p>'
            '<a class="btn btn--primary btn--lg" href="/Sofiya-Duli/">На головну</a>'
            '</div></section>'
          + footer(BASE + "#calc") + scripts())
    write("404.html", nf)
    print("Готово.")


if __name__ == "__main__":
    main()
