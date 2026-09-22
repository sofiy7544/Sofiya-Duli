const { chromium } = require('playwright');
const path = require('path');
const dir = __dirname;
// запуск: з кореня репозиторію `python3 -m http.server 8777`, потім `node print/car-magnet/export-shield.js`
const base = process.env.SHIELD_URL || 'http://127.0.0.1:8777/print/car-magnet/shield.html';
// 410mm x 510mm при 96 css px/in = 1549.6 x 1927.6 px
const W = 1550, H = 1928;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const shot = async (url, file, scale, pdf) => {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    if (file.endsWith('.png')) await p.screenshot({ path: path.join(dir, file), fullPage: false, omitBackground: true });
    if (pdf) await p.pdf({ path: path.join(dir, pdf), width: '410mm', height: '510mm', printBackground: true, preferCSSPageSize: true });
    await ctx.close();
  };
  await shot(base + '?guides=1', 'preview-shield.png', 0.6);
  await shot(base, 'DULI-magnet-shield-410x510mm-150dpi.png', 1.5625, 'DULI-magnet-shield-410x510mm.pdf');
  await shot(base + '?contour=1', 'x.png', 0.2, 'DULI-magnet-shield-cut-contour.pdf');
  await browser.close();
  console.log('done');
})();
