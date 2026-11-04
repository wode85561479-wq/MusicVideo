// Usage:
//   node render.js --stills 0.5,1.5,3 --out <dir>     -> PNG stills at given song times
//   node render.js --video out.mp4 [--fps 30] [--from 0] [--to 10] [--audio song.m4a]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const ROOT = __dirname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  const nf = await page.evaluate(() => window.preloadFonts());
  console.log('fonts loaded:', nf);
  // warm-up render pass so every glyph/subset is rasterised once
  for (let t = 0; t < 10; t += 0.5) await page.evaluate(t => window.renderAt(t), t);
  await page.evaluate(() => document.fonts.ready);

  const stills = opt('stills');
  if (stills) {
    const out = opt('out', path.join(ROOT, 'stills'));
    fs.mkdirSync(out, { recursive: true });
    for (const s of stills.split(',')) {
      const t = parseFloat(s);
      await page.evaluate(t => window.renderAt(t), t);
      const f = path.join(out, `t${t.toFixed(2).padStart(5, '0')}.png`);
      await page.screenshot({ path: f });
      console.log(f);
    }
  } else {
    const fps = +opt('fps', 30), from = +opt('from', 0), to = +opt('to', 10);
    const outFile = opt('video', path.join(ROOT, 'out.mp4'));
    const audio = opt('audio');
    const n = Math.round((to - from) * fps);
    const ffArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
    if (audio) ffArgs.push('-ss', String(from), '-t', String(to - from), '-i', audio);
    ffArgs.push('-map', '0:v');
    if (audio) ffArgs.push('-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-af', `afade=t=in:st=0:d=0.05,afade=t=out:st=${(to - from - 0.3).toFixed(2)}:d=0.3`);
    ffArgs.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-shortest', outFile);
    const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const t = from + i / fps;
      await page.evaluate(t => window.renderAt(t), t);
      const buf = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 30 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('wrote', outFile);
  }
  await browser.close();
  srv.close();
})().catch(e => { console.error(e); process.exit(1); });
