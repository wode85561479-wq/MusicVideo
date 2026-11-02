// usage: node render.js stills <outdir> t1 t2 ...   |  node render.js frames <outdir> start end
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [mode, outdir, ...rest] = process.argv.slice(2);
  fs.mkdirSync(outdir, { recursive: true });
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => { console.error('[pageerror]', e.message); });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.evaluate(() => MV.init());
  if (mode === 'scene') {
    const [name, ...ts] = rest;
    for (const t of ts) { const d = await page.evaluate(([n, t]) => MV.sceneStill(n, parseFloat(t)), [name, t]); fs.writeFileSync(path.join(outdir, `${name}_${t}.png`), Buffer.from(d.split(',')[1], 'base64')); console.log('scene', name, t); }
  } else if (mode === 'stills') {
    for (const ts of rest) {
      const t = parseFloat(ts); const t0 = Date.now();
      const d = await page.evaluate(t => MV.still(t), t);
      fs.writeFileSync(path.join(outdir, `s_${ts.padStart(7, '0')}.png`), Buffer.from(d.split(',')[1], 'base64'));
      console.log('still', ts, Date.now() - t0, 'ms');
    }
  } else {
    const a = parseInt(rest[0]), b = parseInt(rest[1]); let t0 = Date.now();
    for (let f = a; f < b; f++) {
      const fn = path.join(outdir, `f_${String(f).padStart(6, '0')}.jpg`);
      if (fs.existsSync(fn) && fs.statSync(fn).size > 1000) continue;
      const d = await page.evaluate(f => MV.frame(f), f);
      fs.writeFileSync(fn, Buffer.from(d.split(',')[1], 'base64'));
      if (f % 48 === 0) { console.log('frame', f, ((Date.now() - t0) / 48).toFixed(0), 'ms/f'); t0 = Date.now(); }
    }
  }
  await browser.close();
})();
