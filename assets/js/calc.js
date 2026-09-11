/* DULI Service — покроковий розрахунок і бронювання.
   Дані приходять із window.DULI (генеруються з build/data.py).
   5 кроків: об’єкт → тип → обсяг → опції → бронювання.
   Для вікон і меблів крок «тип» пропускається, а в «опціях» ховаються додаткові роботи. */
(function () {
  'use strict';
  var D = window.DULI;
  if (!D) return;

  var root = document.getElementById('calc');
  if (!root) return;

  var fmt = function (n) { return new Intl.NumberFormat('uk-UA').format(Math.round(n)); };
  var byId = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; };
  var track = window.duliTrack || function () {};
  var $ = function (id) { return document.getElementById(id); };

  var STORE = 'duli_calc_v1';
  var state = {
    step: 0,
    object: 'flat',
    type: 'general',
    area: 60,
    baths: 1,
    extras: [],
    freq: 'once',
    zone: 'prym',
    sashes: 4,
    furn: {},
    date: '',
    time: '',
    started: false
  };

  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved) { for (var k in saved) if (k in state && k !== 'step') state[k] = saved[k]; }
  } catch (e) {}

  /* сторінка послуги відкриває калькулятор на своєму типі */
  if (window.DULI_PREFILL && window.DULI_PREFILL.type) state.type = window.DULI_PREFILL.type;

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }

  /* ── розрахунок ───────────────────────────────────────── */
  function mode() { return byId(D.objects, state.object).mode || 'area'; }

  function price() {
    var t = byId(D.types, state.type),
        o = byId(D.objects, state.object),
        f = byId(D.frequency, state.freq),
        z = byId(D.zones, state.zone);
    var m = mode(), base = 0, baths = 0, extras = 0, hours = 0, crew = 1, label = '';

    if (m === 'windows') {
      base = Math.max(state.sashes * D.sash, 1500);
      hours = state.sashes * 0.35;
      label = 'Миття вікон, ' + state.sashes + ' стулок';
    } else if (m === 'furniture') {
      var n = 0;
      D.furniture.forEach(function (it) {
        var c = state.furn[it.id] || 0;
        base += c * it.price; n += c;
      });
      base = Math.max(base, n ? 1500 : 0);
      hours = n * 0.6;
      label = 'Хімчистка та техніка, ' + n + ' поз.';
    } else {
      base = Math.max(state.area * t.rate * o.k, t.min * o.k);
      baths = Math.max(0, state.baths - 1) * 350;
      state.extras.forEach(function (id) {
        var e = byId(D.extras, id);
        if (e && e.id === id) extras += e.price;
      });
      hours = state.area / t.speed + state.extras.length * 0.5 + state.baths * 0.4;
      crew = Math.min(4, Math.max(1, Math.ceil(state.area / 70)));
      label = t.name + ', ' + fmt(state.area) + ' м²';
    }

    var work = base + baths + extras;
    var total = work * f.k + z.fee;
    var saving = work * (1 - f.k);
    var onsite = Math.max(2, hours / crew);

    return {
      base: base, baths: baths, extras: extras, zone: z.fee, saving: saving,
      total: total, once: work + z.fee, crew: crew, hours: onsite, label: label,
      type: t, object: o, freq: f, zoneObj: z, mode: m
    };
  }

  /* ── підсумок: бічна панель + нижня панель ────────────── */
  var elSum = $('cSum'), elRows = $('cRows'), elSave = $('cSave'), elTot = $('cTot');

  function renderSide() {
    var p = price();
    elSum.innerHTML = fmt(p.total) + ' <small>₴</small>';
    if (elTot) elTot.textContent = fmt(p.total) + ' ₴';

    if (p.saving > 1) {
      elSave.hidden = false;
      elSave.textContent = 'Економія ' + fmt(p.saving) + ' ₴ проти разової';
    } else {
      elSave.hidden = true;
    }

    var rows = [[p.label, fmt(p.base) + ' ₴']];
    if (p.baths) rows.push(['Додаткові санвузли', fmt(p.baths) + ' ₴']);
    if (p.extras) rows.push(['Додаткові роботи', fmt(p.extras) + ' ₴']);
    if (p.zone) rows.push(['Виїзд, ' + p.zoneObj.name, fmt(p.zone) + ' ₴']);
    rows.push(['Час на об’єкті', p.hours.toFixed(1).replace('.0', '') + ' год']);
    rows.push(['Клінерів', String(p.crew)]);

    elRows.innerHTML = rows.map(function (r) {
      return '<div class="calc__r"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
    }).join('');
  }

  /* деталі ціни на телефоні */
  var side = $('cSide'), totBtn = root.querySelector('[data-side]');
  if (totBtn) totBtn.addEventListener('click', function () {
    var open = side.classList.toggle('is-open');
    totBtn.setAttribute('aria-expanded', String(open));
    if (open) side.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  /* ── кроки ────────────────────────────────────────────── */
  var steps = Array.prototype.slice.call(root.querySelectorAll('.calc__step'));
  var bars = Array.prototype.slice.call(root.querySelectorAll('.calc__bar i'));
  var labels = Array.prototype.slice.call(root.querySelectorAll('.calc__steps span'));
  var NAMES = ['Об’єкт', 'Тип', 'Обсяг', 'Опції', 'Бронювання'];
  var LAST = steps.length - 1;
  var kicker = $('cKicker'), backBtn = root.querySelector('[data-back]'), nextBtn = $('cNext');
  var nextHTML = nextBtn ? nextBtn.innerHTML : '';

  /* крок «тип» не стосується вікон та меблів */
  function skip(n) { return mode() !== 'area' && n === 1; }
  function nextOf(n) { n = n + 1; while (skip(n) && n < LAST) n++; return n; }
  function prevOf(n) { n = n - 1; while (skip(n) && n > 0) n--; return n; }

  function panels() {
    var m = mode();
    var a = $('pArea'), w = $('pWin'), f = $('pFurn'), x = $('pExtras');
    if (a) a.hidden = m !== 'area';
    if (w) w.hidden = m !== 'windows';
    if (f) f.hidden = m !== 'furniture';
    if (x) x.hidden = m !== 'area';
  }

  function show(n, silent) {
    state.step = Math.max(0, Math.min(LAST, n));
    panels();
    steps.forEach(function (s, i) { s.classList.toggle('on', i === state.step); });
    bars.forEach(function (b, i) { b.classList.toggle('on', i <= state.step); });
    labels.forEach(function (l, i) {
      l.classList.toggle('on', i === state.step);
      l.classList.toggle('done', i < state.step);
    });
    if (kicker) kicker.innerHTML = 'Крок ' + (state.step + 1) + ' із ' + (LAST + 1) + ' · <b>' + NAMES[state.step] + '</b>';
    if (backBtn) backBtn.hidden = state.step === 0;
    if (nextBtn) {
      if (state.step === LAST) {
        nextBtn.innerHTML = 'Замовити прибирання';
        nextBtn.setAttribute('form', 'cForm');
        nextBtn.type = 'submit';
      } else {
        nextBtn.innerHTML = nextHTML;
        nextBtn.removeAttribute('form');
        nextBtn.type = 'button';
      }
    }
    if (!silent) {
      var y = root.getBoundingClientRect().top + window.scrollY - 72;
      if (window.scrollY > y + 200 || window.scrollY < y - 200) window.scrollTo({ top: y, behavior: 'smooth' });
      track('calc_step', { step: state.step + 1 });
    }
    if (state.step === LAST) buildDates();
  }

  root.addEventListener('click', function (e) {
    var next = e.target.closest('[data-next]');
    if (next && next.type !== 'submit') {
      if (!state.started) { state.started = true; track('calc_start', {}); }
      show(nextOf(state.step));
      return;
    }
    var back = e.target.closest('[data-back]');
    if (back) { show(prevOf(state.step)); return; }

    var cnt = e.target.closest('[data-cnt]');
    if (cnt) {
      var id = cnt.dataset.cnt, cur = state.furn[id] || 0;
      cur = Math.max(0, Math.min(20, cur + parseInt(cnt.dataset.d, 10)));
      state.furn[id] = cur;
      $('cnt-' + id).textContent = cur;
      save(); renderSide();
      return;
    }

    var opt = e.target.closest('.opt,[data-set]');
    if (!opt) return;
    var key = opt.dataset.set, val = opt.dataset.val;
    if (!key) return;

    if (key === 'extras') {
      var i = state.extras.indexOf(val);
      if (i > -1) state.extras.splice(i, 1); else state.extras.push(val);
      opt.setAttribute('aria-pressed', i > -1 ? 'false' : 'true');
    } else {
      state[key] = (key === 'baths' || key === 'sashes') ? parseInt(val, 10) : val;
      var group = opt.closest('[data-group]');
      if (group) {
        group.querySelectorAll('[data-set="' + key + '"]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === opt));
        });
      }
      if (key === 'date' || key === 'time') whenError(false);
    }
    save();
    renderSide();
  });

  /* район — окремий елемент, слухаємо change */
  var zoneSel = $('cZone');
  if (zoneSel) {
    zoneSel.value = state.zone;
    zoneSel.addEventListener('change', function () {
      state.zone = zoneSel.value;
      save();
      renderSide();
    });
  }

  /* площа */
  var rng = $('cArea'), inp = $('cAreaN'), out = $('cAreaV');
  function setArea(v, from) {
    v = Math.max(10, Math.min(500, parseInt(v, 10) || 10));
    state.area = v;
    if (from !== 'range') rng.value = v;
    if (from !== 'input') inp.value = v;
    out.textContent = v;
    rng.style.setProperty('--fill', ((v - 10) / 490 * 100) + '%');
    save(); renderSide();
  }
  if (rng) {
    rng.addEventListener('input', function () { setArea(rng.value, 'range'); });
    inp.addEventListener('input', function () { setArea(inp.value, 'input'); });
  }

  /* дати */
  function buildDates() {
    var box = $('cDates');
    if (!box || box.dataset.built) return;
    box.dataset.built = '1';
    var days = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    var months = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
    var html = '';
    for (var i = 1; i <= 14; i++) {
      var d = new Date(); d.setDate(d.getDate() + i);
      var v = d.toISOString().slice(0, 10);
      var lbl = i === 1 ? 'Завтра' : d.getDate() + ' ' + months[d.getMonth()];
      html += '<button type="button" class="chip" data-set="date" data-val="' + v + '" aria-pressed="' + (state.date === v) + '">' +
              '<b>' + lbl + '</b><span>' + days[d.getDay()] + '</span></button>';
    }
    box.innerHTML = html;
  }

  /* ── валідація без alert() ─────────────────────────────── */
  function whenError(on) {
    var err = $('cWhenErr');
    if (err) err.classList.toggle('on', !!on);
    var dates = $('cDates'), times = $('cTimes');
    if (dates) dates.classList.toggle('is-err', !!on && !state.date);
    if (times) times.classList.toggle('is-err', !!on && !state.time);
  }
  function fieldError(input, on) {
    var f = input.closest('.field');
    if (f) f.classList.toggle('is-err', !!on);
    input.setAttribute('aria-invalid', on ? 'true' : 'false');
  }
  /* український номер: +380XXXXXXXXX, 380…, 0XXXXXXXXX — 10 цифр після коду країни */
  function normPhone(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length === 12 && d.indexOf('380') === 0) return '+' + d;
    if (d.length === 10 && d.charAt(0) === '0') return '+38' + d;
    if (d.length === 11 && d.indexOf('80') === 0) return '+3' + d;
    return '';
  }
  function validate(form) {
    var ok = true, first = null;
    var name = form.elements.name, phone = form.elements.phone;
    var badName = name.value.trim().length < 2;
    fieldError(name, badName); if (badName) { ok = false; first = first || name; }
    var normalized = normPhone(phone.value);
    fieldError(phone, !normalized); if (!normalized) { ok = false; first = first || phone; }
    var badWhen = !state.date || !state.time;
    whenError(badWhen);
    if (badWhen) { ok = false; }
    if (!ok) {
      var target = badWhen ? $('cWhenErr') : first;
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (first && !badWhen) first.focus({ preventScroll: true });
    }
    return ok ? normalized : '';
  }
  ['fName', 'fPhone'].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener('input', function () { fieldError(el, false); });
  });

  /* ── відправлення ─────────────────────────────────────── */
  var form = $('cForm');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var phone = validate(form);
    if (!phone) return;
    var p = price();
    var g = function (n) { return (form.elements[n].value || '').trim(); };

    var extrasNames = state.extras.map(function (id) { return byId(D.extras, id).name; });
    var lines = [
      '🧾 ЗАМОВЛЕННЯ · DULI Service',
      '',
      'Послуга: ' + p.label,
      'Об’єкт: ' + p.object.name + (p.mode === 'area' ? ', ' + state.area + ' м², санвузлів: ' + state.baths : ''),
      'Додатково: ' + (extrasNames.length ? extrasNames.join(', ') : 'немає'),
      'Періодичність: ' + p.freq.name,
      'Район: ' + p.zoneObj.name,
      'Дата: ' + state.date + ', ' + state.time,
      '',
      'Орієнтовна вартість: ' + fmt(p.total) + ' ₴',
      'Час: ' + p.hours.toFixed(1).replace('.0', '') + ' год · ' + p.crew + ' клінер(и)',
      '',
      'Ім’я: ' + g('name'),
      'Телефон: ' + phone,
      'Адреса: ' + (g('address') || 'уточнимо при дзвінку')
    ];
    var text = lines.join('\n');

    track('booking_submit', { total: Math.round(p.total), service: state.type, freq: state.freq });

    var tg = 'https://t.me/' + D.telegram + '?text=' + encodeURIComponent(text);
    var sms = 'sms:' + D.phone + (/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?') + 'body=' + encodeURIComponent(text);

    if (D.formEndpoint) {
      fetch(D.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, phone: phone, name: g('name') })
      }).catch(function () {});
      done(true, tg, sms);
    } else {
      var w = window.open(tg, '_blank', 'noopener');
      done(false, tg, sms, !w);
    }
  });

  function done(sent, tg, sms, blocked) {
    show(LAST, true);
    var d = $('cDone');
    if (d) { d.hidden = false; $('cFormWrap').hidden = true; }
    var foot = $('cFoot'); if (foot) foot.hidden = true;
    var t = $('cDoneT'), pEl = $('cDoneP'), tgA = $('cTgLink'), smsA = $('cSmsLink'), alt = $('cAltP');
    if (tgA) tgA.href = tg;
    if (smsA) smsA.href = sms;
    if (sent) {
      if (t) t.textContent = 'Заявку надіслано';
      if (pEl) pEl.textContent = 'Передзвонимо протягом 15 хвилин у робочі години, щоб підтвердити час і адресу.';
      if (tgA) tgA.hidden = true;
      if (alt) alt.textContent = 'Якщо зручніше — напишіть нам самі або зателефонуйте.';
    } else if (blocked) {
      if (pEl) pEl.textContent = 'Браузер не дав відкрити Telegram автоматично. Натисніть кнопку нижче — текст заявки вже підставлено.';
    }
    try { localStorage.removeItem(STORE); } catch (e) {}
    d.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ── старт ────────────────────────────────────────────── */
  root.querySelectorAll('[data-set]').forEach(function (b) {
    var key = b.dataset.set, val = b.dataset.val;
    if (key === 'extras') b.setAttribute('aria-pressed', String(state.extras.indexOf(val) > -1));
    else if (key in state) b.setAttribute('aria-pressed', String(String(state[key]) === val));
  });
  if (rng) setArea(state.area);
  Object.keys(state.furn).forEach(function (id) {
    var el = $('cnt-' + id); if (el) el.textContent = state.furn[id];
  });
  renderSide();
  show(0, true);

  /* швидкий розрахунок у геро / картки послуг передають параметри сюди */
  window.duliPrefill = function (type, area, object) {
    if (type) state.type = type;
    if (area) state.area = area;
    if (object) state.object = object;
    save();
    root.querySelectorAll('[data-set="type"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.val === state.type));
    });
    root.querySelectorAll('[data-set="object"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.val === state.object));
    });
    if (rng) setArea(state.area);
    renderSide();
    show(2);
  };
})();
