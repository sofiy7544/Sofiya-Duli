/* DULI Service — поведінка сторінки: меню, панель, поява, FAQ, до/після, події. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  /* ── аналітика ────────────────────────────────────────── */
  window.dataLayer = window.dataLayer || [];
  window.duliTrack = function (name, props) {
    var payload = Object.assign({ event: name }, props || {});
    window.dataLayer.push(payload);
    if (typeof window.gtag === 'function') window.gtag('event', name, props || {});
  };
  var track = window.duliTrack;

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    if (a.href.indexOf('tel:') === 0) track('call_click', {});
    else if (a.href.indexOf('sms:') === 0) track('sms_click', {});
    else if (a.href.indexOf('t.me') > -1) track('telegram_click', {});
    else if (a.href.indexOf('instagram.com') > -1) track('instagram_click', {});
    var svc = e.target.closest('[data-service]');
    if (svc) track('service_click', { service: svc.dataset.service });
  });

  /* ── шапка, нижня панель ──────────────────────────────── */
  var hdr = document.querySelector('.hdr');
  var bar = document.getElementById('bar');
  var hero = document.querySelector('.hero, .phero');
  var calc = document.getElementById('calc');

  function onScroll() {
    var y = window.scrollY;
    if (hdr) hdr.classList.toggle('is-stuck', y > 8);
    if (bar && hero) bar.classList.toggle('is-on', y > hero.offsetTop + hero.offsetHeight * 0.55);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* панель ховається, поки калькулятор на екрані — там своя кнопка */
  if (calc && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      document.body.classList.toggle('calc-in', entries[0].isIntersecting);
    }, { rootMargin: '-40% 0px -20% 0px' }).observe(calc);
  }

  /* ── меню ─────────────────────────────────────────────── */
  var menu = document.getElementById('menu');
  var toggles = document.querySelectorAll('[data-menu]');
  var opener = document.querySelector('.hdr [data-menu]');
  var menuOpen = false;

  function setMenu(open) {
    if (!menu || open === menuOpen) return;
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (opener) opener.setAttribute('aria-expanded', String(open));
    if (open) {
      var first = menu.querySelector('a, button');
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
      track('menu_open', {});
    } else if (opener) {
      opener.focus({ preventScroll: true });
    }
  }
  toggles.forEach(function (b) {
    b.addEventListener('click', function () { setMenu(!menuOpen); });
  });
  if (menu) {
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    /* фокус не виходить за межі меню */
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = menu.querySelectorAll('a[href], button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) setMenu(false);
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });

  /* ── плавна поява ─────────────────────────────────────── */
  var rv = document.querySelectorAll('.rv'), io = null;
  if ('IntersectionObserver' in window && rv.length) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: .04 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }
  /* перед довгим програмним скролом показуємо все одразу — без порожніх «дірок» */
  window.duliRevealAll = function () {
    rv.forEach(function (el) { el.classList.add('in'); if (io) io.unobserve(el); });
  };

  /* ── FAQ ──────────────────────────────────────────────── */
  document.querySelectorAll('.faq__q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.closest('.faq__i');
      var open = item.classList.toggle('on');
      q.setAttribute('aria-expanded', String(open));
      if (open) track('faq_open', { q: q.textContent.trim().slice(0, 60) });
    });
  });

  /* ── до / після ───────────────────────────────────────── */
  document.querySelectorAll('[data-ba]').forEach(function (box) {
    var r = box.querySelector('input[type=range]');
    var pane = box.querySelector('.ba__pane--a');
    var handle = box.querySelector('.ba__handle');
    if (!r) return;
    function sync() {
      var v = r.value + '%';
      pane.style.setProperty('--split', v);
      handle.style.left = v;
    }
    r.addEventListener('input', sync);
    sync();
  });
  var baTabs = document.querySelectorAll('[data-ba-tab]');
  baTabs.forEach(function (t) {
    t.addEventListener('click', function () {
      baTabs.forEach(function (x) { x.setAttribute('aria-pressed', String(x === t)); });
      document.querySelectorAll('[data-ba]').forEach(function (b) {
        b.hidden = b.dataset.ba !== t.dataset.baTab;
      });
    });
  });

  /* ── швидкий розрахунок у геро ────────────────────────── */
  var q = document.getElementById('quick');
  if (q) {
    var qType = 'general', qArea = 60;
    var qRange = q.querySelector('#qArea');
    var qVal = q.querySelector('#qAreaV');
    var qOut = q.querySelector('#qPrice');

    function qCalc() {
      var t = null;
      (window.DULI.types || []).forEach(function (x) { if (x.id === qType) t = x; });
      if (!t) return;
      var v = Math.max(t.min, qArea * t.rate);
      qOut.textContent = new Intl.NumberFormat('uk-UA').format(Math.round(v));
      qRange.style.setProperty('--fill', ((qArea - 20) / 280 * 100) + '%');
      qVal.textContent = qArea;
    }
    q.addEventListener('click', function (e) {
      var b = e.target.closest('[data-qtype]');
      if (!b) return;
      qType = b.dataset.qtype;
      q.querySelectorAll('[data-qtype]').forEach(function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      qCalc();
    });
    qRange.addEventListener('input', function () { qArea = parseInt(qRange.value, 10); qCalc(); });
    q.querySelector('#qGo').addEventListener('click', function () {
      track('quick_calc_continue', { service: qType, area: qArea });
      window.duliRevealAll();
      if (window.duliPrefill) window.duliPrefill(qType, qArea);
      document.getElementById('calc').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    qCalc();
  }

  /* ── форма запиту КП ──────────────────────────────────── */
  var b2b = document.getElementById('b2bForm');
  if (b2b) b2b.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (n) { return (b2b.elements[n].value || '').trim(); };
    var phone = b2b.elements.phone;
    var digits = g('phone').replace(/\D/g, '');
    var okPhone = (digits.length === 12 && digits.indexOf('380') === 0) || (digits.length === 10 && digits.charAt(0) === '0');
    var f = phone.closest('.field');
    if (f) f.classList.toggle('is-err', !okPhone);
    if (!okPhone) { phone.focus(); return; }
    var text = [
      '🏢 ЗАПИТ КП · DULI Service', '',
      'Компанія: ' + g('company'),
      'Контакт: ' + g('person'),
      'Телефон: ' + g('phone'),
      'Об’єкт: ' + g('obj'),
      'Площа: ' + (g('area') || '—') + ' м²',
      'Графік: ' + g('sched'),
      'Коментар: ' + (g('msg') || '—')
    ].join('\n');
    track('b2b_submit', { obj: g('obj'), area: g('area') });
    var ep = (window.DULI && window.DULI.formEndpoint) || '';
    var tg = 'https://t.me/' + window.DULI.telegram + '?text=' + encodeURIComponent(text);
    if (ep) {
      fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: text, phone: g('phone'), name: g('person') }) }).catch(function () {});
    } else {
      window.open(tg, '_blank', 'noopener');
    }
    b2b.innerHTML = '<div class="calc__done">' +
      '<h3 class="calc__q">Запит ' + (ep ? 'надіслано' : 'сформовано') + '</h3>' +
      '<p class="calc__hint">Підготуємо комерційну пропозицію протягом одного робочого дня.' +
      (ep ? '' : ' Ми відкрили Telegram із готовим текстом — натисніть «Надіслати».') + '</p>' +
      '<div class="calc__alt">' +
      (ep ? '' : '<a class="btn btn--primary" href="' + tg + '" target="_blank" rel="noopener">Відкрити Telegram із запитом</a>') +
      '<a class="btn btn--ghost" href="tel:' + window.DULI.phone + '">Зателефонувати</a></div></div>';
  });

  /* ── картка послуги відкриває розрахунок ──────────────── */
  document.querySelectorAll('[data-calc-type]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      track('service_calc', { service: b.dataset.calcType });
      window.duliRevealAll();
      if (window.duliPrefill) window.duliPrefill(b.dataset.calcType, null, b.dataset.calcObject || null);
      document.getElementById('calc').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  document.querySelectorAll('[data-track]').forEach(function (a) {
    a.addEventListener('click', function () {
      track(a.dataset.track, {});
      if (a.getAttribute('href') === '#calc') window.duliRevealAll();
    });
  });
})();
