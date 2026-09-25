/**
 * Прогон рабочего месяца трёх риелторов.
 *
 * Зачем: точечные проверки не ловят то, что вылезает на плотной работе —
 * тост поверх кнопки, потерянная позиция списка, пропавший FAB. Скрипт
 * отыгрывает по 20 рабочих дней за каждого сотрудника в его среде
 * (установленное приложение, Safari с адресной строкой, компьютер)
 * и печатает всё, что не сработало.
 *
 * Как запустить:
 *   npm run dev                       # в соседнем окне, на 5173
 *   npm i -D playwright && npx playwright install chromium
 *   DAYS=20 node tools/sim-month.mjs
 *
 * Итог: sim3-log.txt (что сделано) и sim3-problems.json (замечания).
 * «Чисто» = «Замечаний: 0».
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:5173/#';
const log = []; const problems = [];
const note = (s, kind, text) => problems.push({ s, kind, text });

/** Трое риелторов из CRM, каждый в своей среде. */
const REALTORS = [
  { name: 'Елена',  theme: 'atlas', mode: 'light', device: 'phone',   standalone: true,  ua: 'safari' },  // установленное приложение
  { name: 'Matteo', theme: 'venza', mode: 'dark',  device: 'desktop', standalone: false, ua: 'chrome' },  // компьютер
  { name: 'Кирилл', theme: 'sepia', mode: 'light', device: 'browser', standalone: false, ua: 'safari' },  // Safari с адресной строкой
];
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const VP = {
  phone:   { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: SAFARI },
  browser: { viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: SAFARI },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

const V = (sel) => sel.split(',').map((x) => `${x.trim()}:visible`).join(', ');
const count = (p, sel) => p.locator(sel).count();
const hash = (p) => p.evaluate(() => location.hash);

async function ready(p, sel, s, what) {
  try { await p.locator(V(sel)).first().waitFor({ state: 'visible', timeout: 8000 }); return true; }
  catch { note(s, 'пусто', `${what}: за 8 с не появилось «${sel}»`); return false; }
}
async function act(s, name, fn, check) {
  try {
    await fn();
    if (check) { const ok = await check(); if (!ok) { note(s, 'результат', `${name}: сделано, результата нет`); return false; } }
    log.push(`${s} · ${name}`); return true;
  } catch (e) { note(s, 'действие', `${name}: ${String(e).split('\n')[0].slice(0, 160)}`); return false; }
}
const goto = async (p, path) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(250); };
/** Закрыть всё, что могло остаться открытым от прошлого шага. */
async function clear(p) {
  for (let i = 0; i < 3 && (await count(p, '[role=dialog]:visible')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(350); }
}
/** Кнопка «Создать» / FAB — на телефоне это FAB, на десктопе кнопка в шапке. */
const createBtn = (p) => p.locator(V('button[aria-label="Создать"], button:has-text("Создать")')).first();

async function day(p, r, n) {
  const s = `${r.name}/${r.device}`;
  const weekday = ((n - 1) % 5) + 1;

  // --- утро: «Сегодня» ---
  await goto(p, '/today');
  await ready(p, 'h1', s, 'Сегодня');

  // 1. закрыть просроченную и сегодняшнюю задачу
  await goto(p, '/tasks');
  if (await ready(p, '[role=checkbox]', s, 'Задачи')) {
    for (const tab of ['Просрочено', 'Сегодня']) {
      const t = p.locator(V(`button:has-text("${tab}"), [role=radio]:has-text("${tab}")`)).first();
      if (await t.count()) { await t.click().catch(() => {}); await p.waitForTimeout(700); }
      const open = await count(p, '[role=checkbox][aria-checked="false"]:visible');
      if (!open) continue;
      await act(s, `д${n} закрыть задачу (${tab})`, async () => {
        await p.locator('[role=checkbox][aria-checked="false"]:visible').first().click();
        await p.waitForTimeout(1100);
      }, async () => (await count(p, '[role=checkbox][aria-checked="false"]:visible')) < open);
    }
  }

  // 2. лид: открыть, записать итог звонка, сдвинуть этап
  await goto(p, '/leads');
  if (await ready(p, 'a[href*="#/leads/l"]', s, 'Лиды')) {
    await act(s, `д${n} открыть лид`, async () => {
      await p.locator('a[href*="#/leads/l"]:visible').nth(n % 6).click();
      await p.waitForTimeout(1300);
    }, async () => /#\/leads\/l/.test(await hash(p)));

    if (await count(p, V('button:has-text("Звонок")'))) {
      await act(s, `д${n} итог звонка`, async () => {
        await p.locator(V('button:has-text("Звонок")')).first().click(); await p.waitForTimeout(800);
        await p.getByRole('radio', { name: n % 3 ? 'Ответил' : 'Нет ответа' }).click();
        const preset = p.locator('[role=dialog] button:visible').filter({ hasText: /Завтра, 10:00|Через час/ }).first();
        if (await preset.count()) await preset.click();
        await p.locator(V('[role=dialog] button:has-text("Сохранить")')).first().click();
        await p.waitForTimeout(1300);
      }, async () => (await count(p, '[role=dialog]:visible')) === 0);
    } else note(s, 'пусто', `д${n}: в карточке лида нет кнопки «Звонок»`);
    await clear(p);

    if (await count(p, V('button:has-text("Этап")'))) {
      await act(s, `д${n} сменить этап`, async () => {
        await p.locator(V('button:has-text("Этап")')).first().click(); await p.waitForTimeout(700);
        await p.locator('[role=dialog] button:visible').nth(2).click(); await p.waitForTimeout(1100);
      }, async () => (await count(p, '[role=dialog]:visible')) === 0);
    }
    await clear(p);
  }

  // 3. показ в календаре
  await goto(p, '/calendar');
  await ready(p, 'h1', s, 'Календарь');
  await act(s, `д${n} новое событие`, async () => {
    await createBtn(p).click({ timeout: 6000 }); await p.waitForTimeout(700);
    const menuEvent = p.locator(V('[role=dialog] button:has-text("Событие")')).first();
    if (await menuEvent.count()) { await menuEvent.click(); await p.waitForTimeout(700); }
    const preset = p.locator('[role=dialog] button:visible').filter({ hasText: /Через 3 дня|Завтра, 10:00/ }).first();
    if (await preset.count()) await preset.click();
    await p.locator(V('[role=dialog] button:has-text("Создать")')).last().click();
    await p.waitForTimeout(1400);
  }, async () => (await count(p, '[role=dialog]:visible')) === 0);
  await clear(p);

  for (const v of ['Месяц', 'Неделя', 'День', 'Список']) {
    await act(s, `д${n} календарь ${v}`, async () => {
      await p.locator(V(`button:has-text("${v}"), [role=radio]:has-text("${v}")`)).first().click({ timeout: 5000 });
      await p.waitForTimeout(600);
    }, async () => (await count(p, 'h1:visible')) > 0);
  }

  // 4. быстрый захват лида с показа
  await goto(p, '/leads');
  await ready(p, 'a[href*="#/leads/l"]', s, 'Лиды');
  /* Проверяем по имени, а не по числу строк: список рисуется порциями по 50,
     и на длинном списке счётчик перестаёт расти, хотя лид создан и стоит первым. */
  const leadName = `${r.name} тест ${n}`;
  await act(s, `д${n} быстрый захват`, async () => {
    await p.locator(V('button[aria-label="Быстрый захват лида"]')).first().click({ timeout: 6000 }); await p.waitForTimeout(800);
    await p.locator('[role=dialog] input:visible').first().fill(leadName);
    const tel = p.locator('[role=dialog] input[type=tel]:visible').first();
    if (await tel.count()) await tel.fill('+33 6 39 98 70 11');
    await p.locator(V('[role=dialog] button:has-text("Создать")')).last().click();
    await p.waitForTimeout(1500);
    await clear(p);
    await goto(p, '/leads'); await p.waitForTimeout(1400);
  }, async () => (await count(p, `text="${leadName}"`)) > 0);

  // 5. задача с точным сроком; проверяем во всех вкладках, а не только в «Сегодня»
  await goto(p, '/tasks');
  await ready(p, '[role=checkbox]', s, 'Задачи');
  const title = `Перезвонить ${r.name} ${n}`;
  await act(s, `д${n} новая задача`, async () => {
    await createBtn(p).click({ timeout: 6000 }); await p.waitForTimeout(700);
    const menuTask = p.locator(V('[role=dialog] button:has-text("Задача")')).first();
    if (await menuTask.count()) { await menuTask.click(); await p.waitForTimeout(700); }
    await p.locator('[role=dialog] input:visible').first().fill(title);
    await p.locator(V('[role=dialog] button:has-text("Создать задачу")')).first().click();
    await p.waitForTimeout(1500);
    await clear(p);
  }, async () => {
    /* Путь человека: сначала «Показать» в тосте — он сам открывает нужную вкладку
       и дорисовывает список до строки. Если тост уже погас, обходим вкладки руками
       и дораскрываем порции: на длинном списке новая строка может лежать за пятьюдесятью. */
    const show = p.locator(V('button:text-is("Показать")')).first();
    if (await show.count()) { await show.click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(1200); }
    if (await count(p, `text="${title}"`)) return true;
    for (const tab of ['Сегодня', 'Далее', 'Просрочено']) {
      const t = p.locator(V(`button:has-text("${tab}"), [role=radio]:has-text("${tab}")`)).first();
      if (await t.count()) { await t.click().catch(() => {}); await p.waitForTimeout(600); }
      for (let i = 0; i < 4; i++) {
        if (await count(p, `text="${title}"`)) return true;
        const more = p.locator(V('button:has-text("Показать ещё")')).first();
        if (!(await more.count())) break;
        await more.click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(600);
      }
    }
    return false;
  });

  // 6. объект и клиент
  await goto(p, '/properties');
  if (await ready(p, 'a[href*="#/properties/p"]', s, 'Объекты')) {
    await act(s, `д${n} карточка объекта`, async () => {
      await p.locator('a[href*="#/properties/p"]:visible').nth(n % 6).click(); await p.waitForTimeout(1300);
    }, async () => /#\/properties\/p/.test(await hash(p)));
    // галерея: листаем фото
    const next = p.locator(V('button[aria-label*="Следующ"], button[aria-label*="след"]')).first();
    if (await next.count()) await act(s, `д${n} фото объекта`, async () => { await next.click(); await p.waitForTimeout(500); });
  }
  await goto(p, '/clients');
  if (await ready(p, 'a[href*="#/clients/c"]', s, 'Клиенты')) {
    await act(s, `д${n} карточка клиента`, async () => {
      await p.locator('a[href*="#/clients/c"]:visible').nth(n % 7).click(); await p.waitForTimeout(1300);
    }, async () => /#\/clients\/c/.test(await hash(p)));
  }

  // 7. системная стрелка «назад»
  await act(s, `д${n} назад браузером`, async () => { await p.goBack(); await p.waitForTimeout(900); },
    async () => (await count(p, 'h1:visible')) > 0);

  // 8. поиск (результаты — кнопки, не ссылки)
  await act(s, `д${n} поиск`, async () => {
    await p.keyboard.press('Control+k'); await p.waitForTimeout(600);
    if (!(await count(p, '[role=dialog]:visible'))) {
      const b = p.locator(V('button[aria-label="Поиск"]')).first();
      if (await b.count()) { await b.click(); await p.waitForTimeout(600); }
    }
    const q = ['вилла', 'Ницца', 'Ментон', 'lacroix'][n % 4];
    await p.keyboard.type(q); await p.waitForTimeout(1400);
    const found = await count(p, '[role=dialog] a:visible, [role=dialog] [role=option]:visible, [role=dialog] button[data-result]:visible');
    const rows = await count(p, '[role=dialog] button:visible');
    if (!found && rows < 3) note(s, 'результат', `д${n} поиск «${q}»: ${rows} строк в выдаче`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  });
  await clear(p);

  // 9. инбокс раз в три дня
  if (n % 3 === 0) {
    await goto(p, '/inbox');
    await act(s, `д${n} инбокс`, async () => { await p.waitForTimeout(1200); }, async () => (await count(p, 'h1:visible')) > 0);
  }

  // 10. отчёты в пятницу
  if (weekday === 5) {
    await goto(p, '/reports');
    await act(s, `д${n} отчёты`, async () => { await p.waitForTimeout(1400); }, async () => (await count(p, 'h1:visible')) > 0);
  }

  // 11. раз в неделю — выход и вход заново
  if (n % 5 === 0) {
    await act(s, `д${n} выход и вход`, async () => {
      await goto(p, '/settings');
      await p.locator(V('button:has-text("Выйти из аккаунта")')).first().click({ timeout: 6000 }); await p.waitForTimeout(700);
      await p.locator(V('[role=dialog] button:has-text("Выйти")')).last().click(); await p.waitForTimeout(1600);
      // живой человек печатает почту сам, не дожидаясь анимации
      const mail = p.locator('.glassin input[type=email]');
      await mail.waitFor({ timeout: 6000 });
      await mail.click(); await mail.type('kirill@agency.demo', { delay: 60 });
      await p.waitForTimeout(1600);
      const typed = await mail.inputValue();
      if (typed !== 'kirill@agency.demo') note(s, 'ввод', `д${n} поле почты переписало ввод: «${typed}»`);
      await mail.fill('kirill@agency.demo');
      await p.locator('.glassin input[type=password]').fill('demo12345');
      await p.locator(V('.glassin button:has-text("Войти")')).first().click(); await p.waitForTimeout(2600);
    }, async () => !/login/.test(await hash(p)));
  }
}

const b = await chromium.launch();
const DAYS = Number(process.env.DAYS || 20);
for (const r of REALTORS) {
  const ctx = await b.newContext(VP[r.device]);
  await ctx.addInitScript(([t, m]) => { try { localStorage.setItem('crm-preview-theme', t); localStorage.setItem('crm-preview-mode', m); } catch {} }, [r.theme, r.mode]);
  const p = await ctx.newPage();
  if (r.standalone) {
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'display-mode', value: 'standalone' }] });
  }
  const s = `${r.name}/${r.device}`;
  p.on('pageerror', (e) => note(s, 'JS-ошибка', String(e).split('\n')[0].slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') note(s, 'консоль', m.text().slice(0, 200)); });
  const t0 = Date.now();
  await goto(p, '/today');
  await p.locator('h1:visible').first().waitFor({ timeout: 15000 }).catch(() => {});
  log.push(`${s} · холодный старт ${Date.now() - t0} мс`);
  for (let n = 1; n <= DAYS; n++) await day(p, r, n);
  await p.screenshot({ path: `sim3-${r.name}.png` });
  await ctx.close();
}
await b.close();

writeFileSync('sim3-log.txt', log.join('\n'));
writeFileSync('sim3-problems.json', JSON.stringify(problems, null, 1));
console.log(`Действий: ${log.length} · Замечаний: ${problems.length}`);
const by = problems.reduce((a, x) => { (a[x.kind] ??= []).push(x); return a; }, {});
for (const [k, list] of Object.entries(by)) {
  console.log(`\n=== ${k} (${list.length}) ===`);
  const seen = new Map();
  for (const x of list) { const key = `${x.s.split('/')[1]} ${x.text.replace(/д\d+/, 'дN').replace(/\d+/g, 'N').slice(0, 110)}`; seen.set(key, (seen.get(key) ?? 0) + 1); }
  for (const [text, times] of [...seen].sort((a, b) => b[1] - a[1])) console.log(`· ×${times} ${text}`);
}
