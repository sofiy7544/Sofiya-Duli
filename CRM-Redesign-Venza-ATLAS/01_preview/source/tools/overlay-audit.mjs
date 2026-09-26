/**
 * Геометрия всплывающих окон: подтверждения, листы, меню, формы.
 *
 * Дополняет tools/layout-audit.mjs: окна нельзя увидеть, просто открыв экран,
 * их надо чем-то вызвать. Проверяет 17 окон в двух темах на телефоне и
 * компьютере: окно целиком на экране, кнопки не мельче 44×44 на телефоне и не
 * перекрыты другим слоем.
 *
 * Отсюда вышли: подтверждение, уезжавшее на пол-экрана; «Создать» в быстром
 * захвате, спрятанный в конце прокрутки; чипы и кнопка в тосте по 36 px.
 *
 * Запуск:
 *   npm run dev                       # в соседнем окне, на 5173
 *   node tools/overlay-audit.mjs
 * «Чисто» = «ВСЕГО ЗАМЕЧАНИЙ: 0».
 */
import { chromium, devices } from 'playwright';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/* Картинка для проверки загрузки: держать фото в репозитории ради одного теста незачем. */
const SAMPLE = join(mkdtempSync(join(tmpdir(), 'crm-')), 'sample.png');
writeFileSync(SAMPLE, Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
));
const BASE = 'http://localhost:5173/#';

/** Те же проверки, но внутри открытого окна. */
/**
 * Проверку перекрытий делаем на прокрученном до низа листе: пока лист не
 * долистан, под закреплённым рядом кнопок закономерно оказывается содержимое —
 * это не дефект. Дефект — если элемент остаётся под ним и внизу.
 */
const CHECK_IN = (sel) => {
  const root = document.querySelector(sel);
  if (!root) return [['окно', 'не открылось']];
  const area = root.querySelector('.overflow-y-auto');
  if (area) area.scrollTop = area.scrollHeight;
  const out = [];
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  const touch = vw < 900;                                   // 44×44 — правило про палец
  const inScroller = (el) => {                              // внутри прокручиваемой области листа
    for (let n = el.parentElement; n && n !== root.parentElement; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if (o === 'auto' || o === 'scroll') return n;
    }
    return null;
  };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 30);
  const r0 = root.getBoundingClientRect();
  if (r0.left < -1 || r0.right > vw + 1) out.push(['окно за краем', `${Math.round(r0.left)}…${Math.round(r0.right)} при ширине ${vw}`]);
  if (r0.top < -1 || r0.bottom > vh + 1) out.push(['окно не помещается', `${Math.round(r0.top)}…${Math.round(r0.bottom)} при высоте ${vh}`]);
  for (const el of root.querySelectorAll('button, a[href], input, select, textarea, [role=button], [role=checkbox], [role=switch], [role=radio]')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    if (touch && (r.width < 44 || r.height < 44)) out.push(['мелкая цель', `«${label(el)}» ${Math.round(r.width)}×${Math.round(r.height)}`]);
    const scroller = inScroller(el);
    if (!scroller && (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1)) out.push(['кнопка за экраном', `«${label(el)}»`]);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cx > vw || cy < 0 || cy > vh) continue;   // центр вне экрана: прокрутится
    if (scroller) { const sr = scroller.getBoundingClientRect(); if (cy < sr.top || cy > sr.bottom) continue; }
    const top = document.elementFromPoint(cx, cy);
    if (top && top !== el && !el.contains(top) && !top.contains(el)) out.push(['перекрыто', `«${label(el)}» закрыт ${top.tagName}.${(top.className || '').toString().slice(0, 28)}`]);
  }
  return out;
};

/** Как открыть каждое окно: маршрут и шаги. */
const OVERLAYS = [
  ['меню создания', '/today', async (p) => { await p.locator('button[aria-label="Создать"]:visible, button:visible:has-text("Создать")').first().click(); }],
  ['быстрый захват', '/today', async (p) => { await p.locator('button[aria-label="Быстрый захват лида"]:visible').first().click(); }],
  ['уведомления', '/today', async (p) => { await p.locator('button[aria-label^="Уведомления"]:visible').first().click(); }],
  ['поиск', '/leads', async (p, size) => { if (size.width >= 1024) await p.keyboard.press('Meta+k'); else await p.locator('button[aria-label="Поиск"]:visible').first().click(); }],
  ['фильтры', '/leads', async (p) => { await p.locator('button:visible').filter({ hasText: 'Фильтры' }).first().click(); }],
  ['смена этапа', '/leads/l1', async (p) => { await p.locator('button[aria-label^="Сменить этап"]:visible, button[aria-label^="Этап:"]:visible').first().click(); }],
  ['итог звонка', '/leads/l1', async (p) => { await p.locator('main button:visible').filter({ hasText: /^Звонок$/ }).first().click(); }],
  ['назначить показ', '/properties/p1', async (p) => { await p.locator('button:visible').filter({ hasText: 'Назначить показ' }).first().click(); }],
  ['PDF-презентация', '/properties/p1', async (p) => { await p.locator('button:visible').filter({ hasText: /^PDF$/ }).first().click(); }],
  ['действия объекта', '/properties/p1', async (p) => { await p.locator('button[aria-label="Действия"]:visible').first().click(); }],
  ['прикрепить объект', '/clients/c1', async (p) => { await p.locator('button:visible').filter({ hasText: 'Прикрепить' }).first().click(); }],
  ['действия клиента', '/clients/c1', async (p) => { await p.locator('button[aria-label="Действия"]:visible').first().click(); }],
  ['новое событие', '/calendar', async (p) => { await p.locator('button:visible').filter({ hasText: /Создать|Событие/ }).first().click(); }],
  ['приглашение сотрудника', '/settings/users', async (p) => { await p.locator('button[aria-label="Пригласить сотрудника"]:visible').first().click(); }],
  ['новое правило', '/settings/automation', async (p) => { await p.locator('button[aria-label="Новое правило"]:visible').first().click(); }],
  ['шаблон', '/settings/templates', async (p) => { await p.locator('button:visible').filter({ hasText: 'Изменить' }).first().click(); }],
  ['платёж по сделке', '/deals/d1', async (p) => { await p.locator('button:visible').filter({ hasText: /Добавить платёж|Платёж/ }).first().click(); }],
  /* Удаление файла из просмотра: подтверждение однажды открывалось ПОД лайтбоксом
     (слой 81 против 85) — человек нажимал и не видел ничего. */
  ['удаление файла', '/properties/p1', async (p) => {
    await p.locator('input[type=file]').setInputFiles(SAMPLE);
    await p.waitForTimeout(1800);
    await p.locator('section', { hasText: 'Фото и видео' }).first().locator('li').last().locator('button')
      .first()
      .click();
    await p.waitForTimeout(900);
    await p.locator('button[aria-label="Удалить файл"]').click();
  }],
];

const run = async (theme, size, dev) => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...dev, viewport: size });
  await ctx.addInitScript((t) => { try { localStorage.setItem('crm-preview-theme', t); localStorage.setItem('crm-preview-mode', 'light'); } catch {} }, theme);
  const page = await ctx.newPage();
  const found = [];
  for (const [name, route, open] of OVERLAYS) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    try { await open(page, size); } catch { found.push(`${theme}/${size.width} ${name}: не удалось открыть`); continue; }
    await page.waitForTimeout(1100);
    if (!(await page.locator('[role=dialog]').count())) { found.push(`${theme}/${size.width} ${name}: окно не появилось`); continue; }
    if (name === 'удаление файла') {
      const ask = await page.locator('[role=dialog]').filter({ hasText: 'Удалить файл?' }).count();
      if (!ask) found.push(`${theme}/${size.width} ${name}: подтверждение не появилось`);
      const top = await page.evaluate(() => {
        const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        return el?.closest('[role=dialog]')?.textContent?.slice(0, 20) ?? el?.tagName ?? 'null';
      });
      if (!/Удалить файл/.test(top)) found.push(`${theme}/${size.width} ${name}: в центре экрана не подтверждение, а «${top}»`);
    }
    await page.evaluate((sel) => { const a = document.querySelector(sel)?.querySelector('.overflow-y-auto'); if (a) a.scrollTop = a.scrollHeight; }, '[role=dialog]');
    await page.waitForTimeout(400);
    const rows = await page.evaluate(CHECK_IN, '[role=dialog]');
    for (const [kind, text] of rows) found.push(`${theme}/${size.width} ${name} · ${kind}: ${text}`);
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(400);
  }
  await browser.close();
  return found;
};

const all = [];
for (const theme of ['atlas', 'venza']) {
  all.push(...await run(theme, { width: 390, height: 844 }, devices['iPhone 13']));
  all.push(...await run(theme, { width: 1280, height: 900 }, {}));
}
console.log(`ВСЕГО ЗАМЕЧАНИЙ: ${all.length}`);
console.log(all.join('\n'));
