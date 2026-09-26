/**
 * Аудит раскладки: то, что видно глазами, а не селектором.
 *
 * Прогон месяца нажимает кнопки по селектору, axe проверяет разметку — где
 * элемент нарисован, не смотрит никто. Так в проекте прожили: модальные окна,
 * съехавшие на пол-экрана, цели по 26 px под палец и два события календаря,
 * нарисованные друг на друге.
 *
 * Проверяет на каждом экране в трёх темах и двух размерах:
 *  — горизонтальную прокрутку всей страницы (содержимое обрезано);
 *  — цели меньше 44×44 на телефоне (на компьютере мышь точнее, правило не для неё);
 *  — элементы за краем экрана, кроме рядов с горизонтальной прокруткой;
 *  — элементы, перекрытые другим слоем (кроме скрытых и панели превью);
 *  — текст, обрезанный не нарочно (без truncate и line-clamp).
 *
 * Запуск:
 *   npm run dev                       # в соседнем окне, на 5173
 *   node tools/layout-audit.mjs
 * «Чисто» = «ВСЕГО ЗАМЕЧАНИЙ: 0».
 */
import { chromium, devices } from 'playwright';

const BASE = 'http://localhost:5173/#';
const ROUTES = ['/today','/leads','/leads/l1','/clients','/clients/c1','/properties','/properties/p1','/properties/p4','/tasks','/calendar','/deals','/deals/d1','/notes','/reports','/insights/lost-reasons','/team','/inbox','/briefing','/settings','/settings/users','/settings/templates','/settings/automation','/settings/branding','/settings/notifications','/settings/integrations','/profile','/leads/new','/clients/new','/properties/new','/deals/new'];

const CHECK = () => {
  const out = [];
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 34);

  // 1. горизонтальная прокрутка всей страницы
  if (document.documentElement.scrollWidth > vw + 1) out.push(['страница', `горизонтальная прокрутка: ${document.documentElement.scrollWidth} при ширине ${vw}`]);

  const touch = vw < 900;                                          // правило 44×44 — про палец, мышь точнее
  const hidden = (el) => el.classList.contains('sr-only') || el.closest('.sr-only') || el.getBoundingClientRect().width <= 2;
  const scrollable = (el) => {                                      // карусели, канбан, широкие таблицы листаются
    for (let n = el.parentElement; n; n = n.parentElement) {
      const o = getComputedStyle(n).overflowX;
      if (o === 'auto' || o === 'scroll') return true;
      if (n.hasAttribute('data-hscroll')) return true;
    }
    return false;
  };
  const preview = (el) => !!el.closest('[data-preview-panel]') || (el.getAttribute('aria-label') || '').startsWith('Настройки превью');

  const interactive = [...document.querySelectorAll('button, a[href], input, select, textarea, [role=button], [role=checkbox], [role=radio], [role=switch], [role=tab]')];
  for (const el of interactive) {
    if (el.closest('[aria-hidden="true"]') || hidden(el) || preview(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;                 // скрытые
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    if (r.bottom < 0 || r.top > vh) continue;                       // вне текущего экрана по вертикали — норм, прокрутится

    // 2. цель меньше 44×44
    if (touch && (r.width < 44 || r.height < 44)) out.push(['мелкая цель', `«${label(el)}» ${Math.round(r.width)}×${Math.round(r.height)}`]);

    // 3. вылезает за правый/левый край экрана
    if ((r.left < -1 || r.right > vw + 1) && !scrollable(el)) out.push(['за краем', `«${label(el)}» ${Math.round(r.left)}…${Math.round(r.right)} при ширине ${vw}`]);

    // 4. перекрыто другим слоем
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1);
    const y = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1);
    const top = document.elementFromPoint(x, y);
    if (top && top !== el && !el.contains(top) && !top.contains(el)) {
      const blocker = top.closest('[role=dialog], [role=status], [role=alert], nav, aside, header, footer') || top;
      out.push(['перекрыто', `«${label(el)}» закрыт ${blocker.tagName}.${(blocker.className || '').toString().slice(0, 30)}`]);
    }
  }

  // 5. текст обрезан не нарочно (без truncate / line-clamp / overflow-hidden в предках)
  for (const el of document.querySelectorAll('h1, h2, h3, p, span, div, td, th, label, legend')) {
    if (el.children.length || el.classList.contains('sr-only') || el.closest('.sr-only') || el.clientWidth <= 2) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > vh) continue;
    const cs = getComputedStyle(el);
    if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') continue;
    if (el.scrollWidth > el.clientWidth + 1 && cs.overflow !== 'visible') out.push(['текст обрезан', `«${(el.textContent || '').trim().slice(0, 30)}» ${el.scrollWidth} в ${el.clientWidth}`]);
  }
  return out;
};

const run = async (theme, mode, size, dev) => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...dev, viewport: size });
  await ctx.addInitScript(([t, m]) => { try { localStorage.setItem('crm-preview-theme', t); localStorage.setItem('crm-preview-mode', m); } catch {} }, [theme, mode]);
  const page = await ctx.newPage();
  const found = [];
  for (const rt of ROUTES) {
    await page.goto(BASE + rt, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const rows = await page.evaluate(CHECK);
    for (const [kind, text] of rows) found.push(`${theme}/${size.width} ${rt} · ${kind}: ${text}`);
  }
  await browser.close();
  return found;
};

const all = [];
for (const theme of ['atlas', 'sepia', 'venza']) {
  all.push(...await run(theme, 'light', { width: 390, height: 844 }, devices['iPhone 13']));
  all.push(...await run(theme, 'light', { width: 1280, height: 900 }, {}));
}
console.log(`ВСЕГО ЗАМЕЧАНИЙ: ${all.length}`);
console.log(all.join('\n'));
