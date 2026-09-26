/**
 * Проверка геометрии всплывающих окон.
 *
 * Зачем отдельная проверка: прогон месяца и прогон тем нажимают кнопки по
 * селектору — им всё равно, где окно нарисовано. Из-за этого месяц прожил
 * дефект, при котором кадр анимации (`transform: none`) затирал центрирование
 * `-translate-x-1/2`, и на телефоне у диалога «Удалить объект?» кнопка
 * «Удалить» уходила за правый край экрана.
 *
 * Здесь смотрим ровно то, что видит человек: окно по центру, целиком на
 * экране, кнопки не мельче 44×44, подтверждение не прячется под лайтбоксом.
 *
 * Запуск:
 *   npm run dev                       # в соседнем окне, на 5173
 *   node tools/overlay-geometry.mjs
 * «Чисто» = «Замечаний: 0».
 */
import { chromium, devices } from 'playwright';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/* Крошечная картинка для проверки загрузки: держать фото в репозитории ради
   одного теста незачем. */
const SAMPLE = join(mkdtempSync(join(tmpdir(), 'crm-')), 'sample.png');
writeFileSync(SAMPLE, Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
));

const BASE = 'http://localhost:5173/#';
const problems = [];
const note = (where, text) => problems.push(`${where}: ${text}`);

/** Окно должно быть по центру и целиком помещаться в экран. */
async function checkBox(page, where, locator, { centered = true } = {}) {
  const box = await locator.boundingBox();
  if (!box) return note(where, 'окно не нарисовано');
  const vp = page.viewportSize();
  if (box.x < -1 || box.x + box.width > vp.width + 1) {
    note(where, `выходит за экран: ${Math.round(box.x)}…${Math.round(box.x + box.width)} при ширине ${vp.width}`);
  }
  if (box.y < -1 || box.y + box.height > vp.height + 1) {
    note(where, `не помещается по высоте: ${Math.round(box.y)}…${Math.round(box.y + box.height)} при высоте ${vp.height}`);
  }
  if (centered && Math.abs(box.x + box.width / 2 - vp.width / 2) > 2) {
    note(where, `не по центру: центр окна ${Math.round(box.x + box.width / 2)}, центр экрана ${vp.width / 2}`);
  }
  return box;
}

/** Кнопки внутри окна — не мельче 44×44 и не перекрыты другим слоем. */
async function checkButtons(page, where, root) {
  for (const b of await root.locator('button:visible').all()) {
    const box = await b.boundingBox();
    if (!box) continue;
    const label = ((await b.innerText()) || (await b.getAttribute('aria-label')) || '?').trim().slice(0, 20);
    if (box.width < 44 || box.height < 44) note(where, `кнопка «${label}» ${Math.round(box.width)}×${Math.round(box.height)}, меньше 44`);
    const hit = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.closest('button')?.textContent?.trim().slice(0, 20) ?? el.tagName : 'null';
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    if (hit === 'null') note(where, `кнопка «${label}» перекрыта другим слоем`);
  }
}

async function run(theme, dev, size) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...dev, viewport: size });
  await ctx.addInitScript((t) => { try { localStorage.setItem('crm-preview-theme', t); } catch { /* ignore */ } }, theme);
  const page = await ctx.newPage();
  const tag = `${theme}/${size.width}`;

  // 1. Подтверждение: самое частое окно и самое болезненное, если уедет.
  await page.goto(`${BASE}/properties/p4`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await page.locator('button[aria-label="Действия"]:visible').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:visible').filter({ hasText: 'Удалить объект' }).first().click();
  await page.waitForTimeout(1200);
  const confirm = page.locator('[role=dialog]').filter({ hasText: 'Удалить объект?' });
  await checkBox(page, `${tag} подтверждение`, confirm);
  await checkButtons(page, `${tag} подтверждение`, confirm);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 2. Лист: на телефоне снизу (центрирование не проверяем), на компьютере по центру.
  await page.goto(`${BASE}/clients/c1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const attach = page.locator('button:visible').filter({ hasText: 'Прикрепить' }).first();
  if (await attach.count()) {
    await attach.click();
    await page.waitForTimeout(1000);
    const sheet = page.locator('[role=dialog]').filter({ hasText: 'Прикрепить объект' });
    await checkBox(page, `${tag} лист`, sheet, { centered: size.width >= 1024 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 3. Удаление файла из просмотра: подтверждение не должно оказаться под лайтбоксом.
  await page.goto(`${BASE}/properties/p1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const file = await page.locator('input[type=file]').count();
  if (file) {
    await page.locator('input[type=file]').setInputFiles(SAMPLE);
    await page.waitForTimeout(1800);
    const tiles = page.locator('section', { hasText: 'Фото и видео' }).first().locator('li');
    await tiles.last().locator('button').first().click();
    await page.waitForTimeout(900);
    await page.locator('button[aria-label="Удалить файл"]').click();
    await page.waitForTimeout(900);
    const ask = page.locator('[role=dialog]').filter({ hasText: 'Удалить файл?' });
    if (!(await ask.count())) note(`${tag} удаление файла`, 'подтверждение не появилось');
    else {
      await checkBox(page, `${tag} удаление файла`, ask);
      const top = await page.evaluate(() => {
        const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        return el?.closest('[role=dialog]')?.textContent?.slice(0, 20) ?? el?.tagName ?? 'null';
      });
      if (!/Удалить файл/.test(top)) note(`${tag} удаление файла`, `в центре экрана не подтверждение, а «${top}»`);
    }
  }

  await browser.close();
}

const SIZES = [['телефон', devices['iPhone 13'], { width: 390, height: 844 }], ['компьютер', {}, { width: 1280, height: 900 }]];
for (const theme of ['atlas', 'sepia', 'venza']) {
  for (const [, dev, size] of SIZES) await run(theme, dev, size);
}

console.log(`Замечаний: ${problems.length}`);
if (problems.length) console.log(problems.join('\n'));
