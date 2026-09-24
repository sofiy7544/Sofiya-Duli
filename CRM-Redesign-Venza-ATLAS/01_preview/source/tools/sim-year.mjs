import { chromium } from 'playwright';
import { fillYear } from './sim-year-data.mjs';
import { writeFileSync } from 'fs';

/**
 * Агентство из 40 сотрудников, год работы.
 *
 * В превью нет сервера, поэтому «одновременность» здесь — это 40 независимых
 * сессий браузера, каждая со своей копией данных. Это проверяет клиентскую
 * часть под объёмом и параллельной работой; блокировки, очереди и запросы
 * к базе так не проверить — там нужен настоящий бэкенд.
 */
const BASE = 'http://localhost:5173/#';
const USERS = Number(process.env.USERS || 40), DAYS = Number(process.env.DAYS || 4), POOL = Number(process.env.POOL || 4);
const THEMES = [['atlas','light'],['venza','dark'],['sepia','light'],['atlas','dark'],['venza','light']];
const VP = [
  { name: 'приложение', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'Safari',     viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'компьютер',  viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];

const problems = [], timings = [];
const note = (who, kind, text) => problems.push({ who, kind, text });
const time = (who, step, ms) => timings.push({ who, step, ms });

const V = (sel) => sel.split(',').map((x) => `${x.trim()}:visible`).join(', ');
const count = (p, sel) => p.locator(sel).count();

async function step(p, who, name, fn, check) {
  const t = Date.now();
  try {
    await fn();
    const ms = Date.now() - t;
    if (check && !(await check())) { note(who, 'результат', `${name}: сделано, результата нет`); return; }
    time(who, name, ms);
  } catch (e) { note(who, 'действие', `${name}: ${String(e).split('\n')[0].slice(0, 120)}`); }
}
const goto = async (p, path) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded' }); };
/** Ждём, пока экран действительно отрисуется: под объёмом это не мгновенно. */
async function screen(p, who, path, sel, label) {
  const t = Date.now();
  await goto(p, path);
  try {
    await p.locator(V(sel)).first().waitFor({ timeout: 45000 });
    // Заголовок рисуется сразу; данные приходят позже — ждём, пока уйдут скелетоны.
    await p.locator('.skeleton').first().waitFor({ state: 'detached', timeout: 45000 }).catch(() => {});
  } catch { note(who, 'пусто', `${label}: за 45 с не отрисовался`); return null; }
  const ms = Date.now() - t;
  time(who, `экран ${label}`, ms);
  return ms;
}
async function clear(p) { for (let i = 0; i < 3 && (await count(p, '[role=dialog]:visible')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } }

async function session(browser, idx) {
  const [theme, mode] = THEMES[idx % THEMES.length];
  const dev = VP[idx % VP.length];
  const who = `#${idx + 1}/${dev.name}`;
  const ctx = await browser.newContext({ ...dev, name: undefined });
  await ctx.addInitScript(([t, m]) => { try { localStorage.setItem('crm-preview-theme', t); localStorage.setItem('crm-preview-mode', m); } catch {} }, [theme, mode]);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => note(who, 'JS-ошибка', String(e).split('\n')[0].slice(0, 160)));
  p.on('console', (m) => { if (m.type() === 'error') note(who, 'консоль', m.text().slice(0, 160)); });

  await goto(p, '/today');
  await p.locator('h1:visible').first().waitFor({ timeout: 30000 }).catch(() => {});
  const filled = await p.evaluate(fillYear, idx + 1);
  if (filled.ошибка) { note(who, 'данные', filled.ошибка); await ctx.close(); return; }

  const heap0 = await p.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);

  for (let d = 1; d <= DAYS; d++) {
    await screen(p, who, '/today', 'h1', 'Сегодня');

    if (await screen(p, who, '/tasks', '[role=checkbox]', 'Задачи')) {
      const open = await count(p, '[role=checkbox][aria-checked="false"]:visible');
      if (open) await step(p, who, 'закрыть задачу', async () => {
        await p.locator('[role=checkbox][aria-checked="false"]:visible').first().click({ timeout: 15000 });
        await p.waitForTimeout(900);
      }, async () => (await count(p, '[role=checkbox][aria-checked="false"]:visible')) < open);
    }

    if (await screen(p, who, '/leads', 'a[href*="#/leads/"]', 'Лиды')) {
      await step(p, who, 'открыть лид', async () => {
        await p.locator('a[href*="#/leads/"]:visible').nth(d % 5).click({ timeout: 15000 });
        await p.locator('h1:visible').first().waitFor({ timeout: 25000 });
      }, async () => /#\/leads\//.test(await p.evaluate(() => location.hash)));

      if (await count(p, V('button:has-text("Звонок")'))) {
        await step(p, who, 'итог звонка', async () => {
          await p.locator(V('button:has-text("Звонок")')).first().click({ timeout: 15000 }); await p.waitForTimeout(600);
          await p.getByRole('radio', { name: 'Ответил' }).click({ timeout: 10000 });
          await p.locator(V('[role=dialog] button:has-text("Сохранить")')).first().click({ timeout: 10000 });
          await p.locator('[role=dialog]:visible').first().waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
        }, async () => (await count(p, '[role=dialog]:visible')) === 0);
        await clear(p);
      }
    }

    await screen(p, who, '/calendar', 'h1', 'Календарь');
    await step(p, who, 'новое событие', async () => {
      await p.locator(V('button[aria-label="Создать"], button:has-text("Создать")')).first().click({ timeout: 15000 }); await p.waitForTimeout(600);
      const menu = p.locator(V('[role=dialog] button:has-text("Событие")')).first();
      if (await menu.count()) { await menu.click(); await p.waitForTimeout(600); }
      await p.locator(V('[role=dialog] button:has-text("Создать")')).last().click({ timeout: 10000 });
      // Под объёмом сохранение занимает секунды — ждём закрытия листа, а не «на глазок».
      await p.locator('[role=dialog]:visible').first().waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    }, async () => (await count(p, '[role=dialog]:visible')) === 0);
    await clear(p);

    await screen(p, who, '/clients', 'a[href*="#/clients/"]', 'Клиенты');
    await step(p, who, 'карточка клиента', async () => {
      await p.locator('a[href*="#/clients/"]:visible').nth(d % 6).click({ timeout: 15000 });
      await p.locator('h1:visible').first().waitFor({ timeout: 25000 });
    }, async () => /#\/clients\//.test(await p.evaluate(() => location.hash)));

    await step(p, who, 'назад браузером', async () => { await p.goBack(); await p.waitForTimeout(900); },
      async () => (await count(p, 'h1:visible')) > 0);

    await step(p, who, 'поиск', async () => {
      await p.keyboard.press('Control+k'); await p.waitForTimeout(500);
      if (!(await count(p, '[role=dialog]:visible'))) {
        const btn = p.locator(V('button[aria-label="Поиск"]')).first();
        if (await btn.count()) { await btn.click(); await p.waitForTimeout(500); }
      }
      await p.keyboard.type(['вилла','Ницца','ковал','мель'][d % 4]); await p.waitForTimeout(1600);
      const rows = await count(p, '[role=dialog] [role=option]:visible');
      if (!rows) note(who, 'результат', `поиск д${d}: пусто`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    });
    await clear(p);
  }

  const heap1 = await p.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
  time(who, 'память в начале, МБ', Math.round(heap0 / 1048576));
  time(who, 'память в конце, МБ', Math.round(heap1 / 1048576));
  await ctx.close();
}

const browser = await chromium.launch();
let next = 0;
const worker = async () => { while (next < USERS) { const i = next++; try { await session(browser, i); } catch (e) { note(`#${i + 1}`, 'сессия', String(e).split('\n')[0].slice(0, 140)); } process.stdout.write(`\r готово сессий: ${Math.min(next, USERS)}/${USERS}   `); } };
const started = Date.now();
await Promise.all(Array.from({ length: POOL }, worker));
await browser.close();

writeFileSync('year40-problems.json', JSON.stringify(problems, null, 1));
writeFileSync('year40-timings.json', JSON.stringify(timings, null, 1));

const by = {};
for (const t of timings) (by[t.step] ??= []).push(t.ms);
const pct = (a, q) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * q))];
console.log(`\n\nСессий: ${USERS} · дней у каждого: ${DAYS} · параллельно: ${POOL} · за ${Math.round((Date.now() - started) / 60000)} мин`);
console.log('\n=== Сколько ждут экраны и действия (мс) ===');
console.log('шаг'.padEnd(26), 'медиана'.padStart(8), '90%'.padStart(8), 'худший'.padStart(8), 'раз'.padStart(6));
for (const [k, a] of Object.entries(by).sort((x, y) => pct(y[1], 0.5) - pct(x[1], 0.5)))
  console.log(k.padEnd(26), String(pct(a, 0.5)).padStart(8), String(pct(a, 0.9)).padStart(8), String(Math.max(...a)).padStart(8), String(a.length).padStart(6));
console.log(`\n=== Замечаний: ${problems.length} ===`);
const seen = new Map();
for (const x of problems) { const k = `${x.kind}: ${x.text.replace(/д\d+/, 'дN').replace(/\d+/g, 'N').slice(0, 110)}`; seen.set(k, (seen.get(k) ?? 0) + 1); }
for (const [text, n] of [...seen].sort((a, b) => b[1] - a[1])) console.log(`×${n} ${text}`);
