// Chunked, parallel, resumable renderer.
//   node render.js --stills 1.5,20,33 [--out dir] [--dpr 1]
//   node render.js --video out/final.mp4 --audio assets/song.m4a [--dpr 2] [--workers 3] [--from 0] [--to 218.36] [--chunk 8]
// Each chunk is encoded to its own H.264 segment (skipped if it already exists), then all are
// concatenated losslessly and muxed with the audio.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const ROOT = __dirname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.png': 'image/png' };
const DPRV = +opt('dpr', 1), FPS = +opt('fps', 30);

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}
async function openPage(url) {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DPRV });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.preloadFonts());
  for (let t = 0; t < 218; t += 2) await page.evaluate(t => window.renderAt(t), t); // warm every scene once
  await page.evaluate(() => document.fonts.ready);
  return { browser, page };
}
const run = (cmd, a) => new Promise((res, rej) => { const p = spawn(cmd, a, { stdio: ['ignore', 'inherit', 'inherit'] }); p.on('close', c => c ? rej(new Error(cmd + ' exit ' + c)) : res()); });

(async () => {
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const stills = opt('stills');
  if (stills) {
    const out = opt('out', path.join(ROOT, 'stills'));
    fs.mkdirSync(out, { recursive: true });
    const { browser, page } = await openPage(url);
    for (const s of stills.split(',')) {
      const t = parseFloat(s);
      await page.evaluate(t => window.renderAt(t), t);
      const f = path.join(out, `t${t.toFixed(2).padStart(6, '0')}.png`);
      await page.screenshot({ path: f });
    }
    console.log('stills ->', out);
    await browser.close(); srv.close(); return;
  }
  const outFile = path.resolve(opt('video', path.join(ROOT, 'out', 'mv.mp4')));
  const audio = opt('audio');
  const from = +opt('from', 0), to = +opt('to', 218.36), chunkSec = +opt('chunk', 8), workers = +opt('workers', 3);
  const segDir = outFile.replace(/\.mp4$/, '') + `_seg_dpr${DPRV}`;
  fs.mkdirSync(segDir, { recursive: true });
  const f0 = Math.round(from * FPS), f1 = Math.floor(to * FPS), per = Math.round(chunkSec * FPS);
  const chunks = []; for (let a = f0; a < f1; a += per) chunks.push([a, Math.min(f1, a + per)]);
  const segName = i => path.join(segDir, `seg_${String(i).padStart(4, '0')}.mp4`);
  const todo = chunks.map((c, i) => i).filter(i => !fs.existsSync(segName(i)));
  console.log(`${chunks.length} chunks, ${todo.length} to render, ${workers} workers, dpr ${DPRV}`);
  const T0 = Date.now(); let done = 0;
  const crf = DPRV > 1 ? '17' : '15';
  async function worker(w) {
    const { browser, page } = await openPage(url);
    while (todo.length) {
      const i = todo.shift(); const [a, b] = chunks[i];
      const tmp = segName(i).replace('.mp4', '.tmp.mp4');
      const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(FPS), '-threads', '2', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = a; f < b; f++) {
        await page.evaluate(t => window.renderAt(t), f / FPS);
        const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
      fs.renameSync(tmp, segName(i));
      done++;
      const el = (Date.now() - T0) / 1000, rate = el / done;
      console.log(`[w${w}] chunk ${i} done  ${done}/${chunks.length - todo.length - (workers - 1) > 0 ? '' : ''}${done} new, ${el.toFixed(0)}s elapsed, ~${(rate * todo.length / 60).toFixed(1)} min left`);
    }
    await browser.close();
  }
  await Promise.all([...Array(workers)].map((_, w) => worker(w)));
  const list = path.join(segDir, 'list.txt');
  fs.writeFileSync(list, chunks.map((c, i) => `file '${segName(i)}'`).join('\n'));
  const fa = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list];
  if (audio) fa.push('-ss', String(from), '-t', String(to - from), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-af', `afade=t=out:st=${(to - from - 0.6).toFixed(2)}:d=0.6`);
  fa.push('-c:v', 'copy', '-movflags', '+faststart', '-shortest', outFile);
  await run('ffmpeg', fa);
  console.log('wrote', outFile, `in ${((Date.now() - T0) / 60000).toFixed(1)} min`);
  srv.close();
})().catch(e => { console.error(e); process.exit(1); });
