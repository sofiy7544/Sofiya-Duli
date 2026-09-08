/* DULI Service — покроковий розрахунок і бронювання.
   Дані приходять із window.DULI (генеруються з build/data.py). */
(function () {
  'use strict';
  var D = window.DULI;
  if (!D) return;

  var root = document.getElementById('calc');
  if (!root) return;

  var fmt = function (n) { return new Intl.NumberFormat('uk-UA').format(Math.round(n)); };
  var byId = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; };
  var track = window.duliTrack || function () {};

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
    date: '',
    time: '',
    started: false
  };

  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved) { for (var k in saved) if (k in state && k !== 'step') state[k] = saved[k]; }
  } catch (e) {}

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }

  /* ── розрахунок ───────────────────────────────────────── */
  function price() {
    var t = byId(D.types, state.type),
        o = byId(D.objects, state.object),
        f = byId(D.frequency, state.freq),
        z = byId(D.zones, state.zone);

    var base = Math.max(state.area * t.rate * o.k, t.min * o.k);
    var baths = Math.max(0, state.baths - 1) * 350;
    var extras = 0;
    state.extras.forEach(function (id) {
      var e = byId(D.extras, id);
      if (e && e.id === id) extras += e.price;
    });

    var work = base + baths + extras;
    var total = work * f.k + z.fee;
    var saving = work * (1 - f.k);

    var hours = state.area / t.speed + state.extras.length * 0.5 + state.baths * 0.4;
    var crew = Math.min(4, Math.max(1, Math.ceil(state.area / 70)));
    var onsite = Math.max(2, hours / crew);

    return {
      base: base, baths: baths, extras: extras, zone: z.fee, saving: saving,
      total: total, once: work + z.fee, crew: crew, hours: onsite,
      type: t, object: o, freq: f, zoneObj: z
    };
  }

  /* ── бічна панель ─────────────────────────────────────── */
  var elSum = document.getElementById('cSum'),
      elRows = document.getElementById('cRows'),
      elSave = document.getElementById('cSave');

  function renderSide() {
    var p = price();
    elSum.innerHTML = fmt(p.total) + ' <small>₴</small>';

    if (p.saving > 1) {
      elSave.hidden = false;
      elSave.textContent = 'Економія ' + fmt(p.saving) + ' ₴ проти разової';
    } else {
      elSave.hidden = true;
    }

    var rows = [
      [p.type.name + ', ' + fmt(state.area) + ' м²', fmt(p.base) + ' ₴']
    ];
    if (p.baths) rows.push(['Додаткові санвузли', fmt(p.baths) + ' ₴']);
    if (p.extras) rows.push(['Додаткові роботи', fmt(p.extras) + ' ₴']);
    if (p.zone) rows.push(['Виїзд, ' + p.zoneObj.name, fmt(p.zone) + ' ₴']);
    rows.push(['Час на об’єкті', p.hours.toFixed(1).replace('.0', '') + ' год']);
    rows.push(['Клінерів', String(p.crew)]);

    elRows.innerHTML = rows.map(function (r) {
      return '<div class="calc__r"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
    }).join('');
  }

  /* ── кроки ────────────────────────────────────────────── */
  var steps = Array.prototype.slice.call(root.querySelectorAll('.calc__step'));
  var bars = Array.prototype.slice.call(root.querySelectorAll('.calc__bar i'));
  var LAST = steps.length - 1;

  function show(n, silent) {
    state.step = Math.max(0, Math.min(LAST, n));
    steps.forEach(function (s, i) { s.classList.toggle('on', i === state.step); });
    bars.forEach(function (b, i) { b.classList.toggle('on', i <= state.step); });
    if (!silent) {
      var y = root.getBoundingClientRect().top + window.scrollY - 86;
      if (window.scrollY > y + 260 || window.scrollY < y - 260) window.scrollTo({ top: y, behavior: 'smooth' });
      track('calc_step', { step: state.step + 1 });
    }
    if (state.step === 5) buildDates();
  }

  root.addEventListener('click', function (e) {
    var next = e.target.closest('[data-next]');
    if (next) {
      if (!state.started) { state.started = true; track('calc_start', {}); }
      show(state.step + 1);
      return;
    }
    var back = e.target.closest('[data-back]');
    if (back) { show(state.step - 1); return; }

    var opt = e.target.closest('.opt,[data-set]');
    if (!opt) return;
    var key = opt.dataset.set, val = opt.dataset.val;
    if (!key) return;

    if (key === 'extras') {
      var i = state.extras.indexOf(val);
      if (i > -1) state.extras.splice(i, 1); else state.extras.push(val);
      opt.setAttribute('aria-pressed', i > -1 ? 'false' : 'true');
    } else {
      state[key] = key === 'baths' ? parseInt(val, 10) : val;
      var group = opt.closest('[data-group]');
      if (group) {
        group.querySelectorAll('[data-set="' + key + '"]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === opt));
        });
      }
      if (key === 'date' || key === 'time') { /* чипи дати/часу */ }
    }
    save();
    renderSide();
  });

  /* район — окремий елемент, слухаємо change */
  var zoneSel = document.getElementById('cZone');
  if (zoneSel) {
    zoneSel.value = state.zone;
    zoneSel.addEventListener('change', function () {
      state.zone = zoneSel.value;
      save();
      renderSide();
    });
  }

  /* площа */
  var rng = document.getElementById('cArea'), inp = document.getElementById('cAreaN'), out = document.getElementById('cAreaV');
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
    var box = document.getElementById('cDates');
    if (!box || box.dataset.built) return;
    box.dataset.built = '1';
    var days = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    var months = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
    var html = '';
    for (var i = 1; i <= 14; i++) {
      var d = new Date(); d.setDate(d.getDate() + i);
      var v = d.toISOString().slice(0, 10);
      var lbl = i === 1 ? 'Завтра' : d.getDate() + ' ' + months[d.getMonth()];
      html += '<button type="button" class="chip" data-set="date" data-val="' + v + '" aria-pressed="false">' +
              '<b>' + lbl + '</b><span>' + days[d.getDay()] + '</span></button>';
    }
    box.innerHTML = html;
  }

  /* ── відправлення ─────────────────────────────────────── */
  var form = document.getElementById('cForm');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var p = price();
    var g = function (n) { return (form.elements[n].value || '').trim(); };

    if (!state.date || !state.time) {
      alert('Оберіть дату та зручний час.');
      return;
    }

    var extrasNames = state.extras.map(function (id) { return byId(D.extras, id).name; });
    var lines = [
      '🧾 ЗАМОВЛЕННЯ · DULI Service',
      '',
      'Послуга: ' + p.type.name,
      'Об’єкт: ' + p.object.name + ', ' + state.area + ' м²',
      'Санвузлів: ' + state.baths,
      'Додатково: ' + (extrasNames.length ? extrasNames.join(', ') : 'немає'),
      'Періодичність: ' + p.freq.name,
      'Район: ' + p.zoneObj.name,
      'Дата: ' + state.date + ', ' + state.time,
      '',
      'Орієнтовна вартість: ' + fmt(p.total) + ' ₴',
      'Час: ' + p.hours.toFixed(1).replace('.0', '') + ' год · ' + p.crew + ' клінер(и)',
      '',
      'Ім’я: ' + g('name'),
      'Телефон: ' + g('phone'),
      'Адреса: ' + g('address')
    ];
    var text = lines.join('\n');

    track('booking_submit', { total: Math.round(p.total), service: state.type, freq: state.freq });

    if (D.formEndpoint) {
      fetch(D.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, phone: g('phone'), name: g('name') })
      }).catch(function () {});
      done();
    } else {
      window.open('https://t.me/' + D.telegram + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      done();
    }
  });

  function done() {
    show(LAST, true);
    var d = document.getElementById('cDone');
    if (d) { d.hidden = false; document.getElementById('cFormWrap').hidden = true; }
    try { localStorage.removeItem(STORE); } catch (e) {}
  }

  /* ── старт ────────────────────────────────────────────── */
  root.querySelectorAll('[data-set]').forEach(function (b) {
    var key = b.dataset.set, val = b.dataset.val;
    if (key === 'extras') b.setAttribute('aria-pressed', String(state.extras.indexOf(val) > -1));
    else if (key in state) b.setAttribute('aria-pressed', String(String(state[key]) === val));
  });
  if (rng) setArea(state.area);
  renderSide();
  show(0, true);

  /* швидкий розрахунок у геро передає параметри сюди */
  window.duliPrefill = function (type, area) {
    if (type) state.type = type;
    if (area) state.area = area;
    save();
    root.querySelectorAll('[data-set="type"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.val === state.type));
    });
    if (rng) setArea(state.area);
    renderSide();
    show(2);
  };
})();
