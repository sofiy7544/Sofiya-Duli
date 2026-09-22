const { chromium } = require('playwright');
const path = require('path');
const dir = __dirname;
// запуск: з кореня репозиторію `python3 -m http.server 8777`, потім `node print/car-magnet/export.js`
const base = process.env.MAGNET_URL || 'http://127.0.0.1:8777/print/car-magnet/magnet.html';
// 610mm x 410mm at 96 css px/in = 2305.5 x 1549.6 px
const W = 2306, H = 1550;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  for (const side of ['left', 'right']) {
    // preview (guides on, low res)
    const ctx1 = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 0.5 });
    const p1 = await ctx1.newPage();
    await p1.goto(base + '?side=' + side + '&guides=1', { waitUntil: 'networkidle' });
    await p1.evaluate(() => document.fonts.ready);
    await p1.screenshot({ path: path.join(dir, 'preview-' + side + '.png'), fullPage: false, omitBackground: true });
    await ctx1.close();

    // print PNG 150 dpi -> 150/96 = 1.5625
    const ctx2 = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1.5625 });
    const p2 = await ctx2.newPage();
    await p2.goto(base + '?side=' + side, { waitUntil: 'networkidle' });
    await p2.evaluate(() => document.fonts.ready);
    await p2.screenshot({ path: path.join(dir, 'DULI-magnet-' + side + '-610x410mm-150dpi.png'), fullPage: false, omitBackground: true });
    await p2.pdf({ path: path.join(dir, 'DULI-magnet-' + side + '-610x410mm.pdf'), width: '610mm', height: '410mm', printBackground: true, preferCSSPageSize: true });
    await ctx2.close();
  }
  await browser.close();
  console.log('done');
})();
