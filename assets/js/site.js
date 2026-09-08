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
    else if (a.href.indexOf('t.me') > -1) track('telegram_click', {});
    else if (a.href.indexOf('instagram.com') > -1) track('instagram_click', {});
    var svc = e.target.closest('[data-service]');
    if (svc) track('service_click', { service: svc.dataset.service });
  });

  /* ── шапка й меню ─────────────────────────────────────── */
  var hdr = document.querySelector('.hdr');
  var bar = document.querySelector('.bar');
  var hero = document.querySelector('.hero');

  function onScroll() {
    var y = window.scrollY;
    if (hdr) hdr.classList.toggle('is-stuck', y > 8);
    if (bar && hero) bar.classList.toggle('is-on', y > hero.offsetHeight * 0.6);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var menu = document.getElementById('menu');
  document.querySelectorAll('[data-menu]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      document.body.style.overflow = open ? 'hidden' : '';
    });
  });
  if (menu) menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) { menu.classList.remove('is-open'); document.body.style.overflow = ''; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu && menu.classList.contains('is-open')) {
      menu.classList.remove('is-open'); document.body.style.overflow = '';
    }
  });

  /* ── плавна поява ─────────────────────────────────────── */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && rv.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .05 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── FAQ ──────────────────────────────────────────────── */
  document.querySelectorAll('.faq__q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.closest('.faq__i');
      var open = item.classList.toggle('on');
      q.setAttribute('aria-expanded', String(open));
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
    if (ep) {
      fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: text, phone: g('phone'), name: g('person') }) }).catch(function () {});
    } else {
      window.open('https://t.me/' + window.DULI.telegram + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
    }
    b2b.innerHTML = '<div style="text-align:center;padding:28px 0">' +
      '<h3 style="margin-bottom:8px">Запит надіслано</h3>' +
      '<p class="muted">Підготуємо комерційну пропозицію протягом одного робочого дня.</p></div>';
  });

  /* ── картка послуги відкриває розрахунок ──────────────── */
  document.querySelectorAll('[data-calc-type]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      track('service_calc', { service: b.dataset.calcType });
      if (window.duliPrefill) window.duliPrefill(b.dataset.calcType, null);
      document.getElementById('calc').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
