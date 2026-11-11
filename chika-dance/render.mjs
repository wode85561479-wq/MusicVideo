// Renders index.html frame-by-frame with headless Chromium and muxes it with the synthesized
// soundtrack via ffmpeg.  Usage:
//   node render.mjs                      -> miku-chika-dance.mp4 (1280x720, 30 fps, 60 s)
//   node render.mjs --preview 1,5.5,20   -> PNG stills at those times, into --out-dir
// Env: FPS, W, H, SECONDS, OUT, CRF
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const FPS = +(process.env.FPS || 30), Wv = +(process.env.W || 1280), Hv = +(process.env.H || 720);
const SECONDS = +(process.env.SECONDS || 60), CRF = process.env.CRF || '18';
const out = process.env.OUT || path.join(here, 'miku-chika-dance.mp4');
const previewTimes = flag('--preview'), outDir = flag('--out-dir') || here;

const html = fs.readFileSync(path.join(here, 'index.html'), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Wv, height: Hv }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('page error:', e.message));
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`, { waitUntil: 'load' });
await Promise.race([page.evaluate(() => document.fonts.ready), new Promise(r => setTimeout(r, 8000))]).catch(() => {});
await page.evaluate(([w, h]) => window.__prepareRender(w, h), [Wv, Hv]);

if (previewTimes) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const ts of previewTimes.split(',')) {
    const t = parseFloat(ts);
    const b64 = await page.evaluate(t => window.__renderFrame(t), t);
    const f = path.join(outDir, `frame_${t.toFixed(2).replace('.', '_')}.png`);
    fs.writeFileSync(f, Buffer.from(b64, 'base64')); console.log('wrote', f);
  }
  await browser.close(); process.exit(0);
}

const wavPath = path.join(outDir, 'miku-chika-dance.wav');
const t1 = Date.now();
const wavB64 = await page.evaluate(() => window.__renderWav(44100));
fs.writeFileSync(wavPath, Buffer.from(wavB64, 'base64'));
console.log(`soundtrack: ${wavPath} (${(Date.now() - t1) / 1000}s)`);

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', wavPath,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '192k', '-t', String(SECONDS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
const total = Math.round(FPS * SECONDS), t2 = Date.now();
for (let i = 0; i < total; i++) {
  const b64 = await page.evaluate(t => window.__renderFrame(t), i / FPS);
  if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 300 === 0) console.log(`frame ${i}/${total} (${((Date.now() - t2) / 1000).toFixed(0)}s)`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exited ' + c))));
await browser.close();
console.log(`done: ${out} in ${((Date.now() - t2) / 1000).toFixed(0)}s`);
