'use strict';
// ---------- timeline ----------
const SCENES = {};
const SHOTS_DEF = [
  [0, 'intro', {}],
  [16.28, 'bedroom', {}, ['fade', 2.0]],
  [35.35, 'clock', { a: [5, 59], b: [6, 0], flip: 38.38, day: '星期一' }, ['fade', 1.0]],
  [44.76, 'street', {}, ['fade', 1.2]],
  [57.77, 'door', {}, ['fade', 0.7]],
  [61.12, 'walk', {}, ['fade', 0.8]],
  [70.93, 'phone', {}, ['fade', 1.0]],
  [86.57, 'elevator', {}, ['fade', 0.5]],
  [91.44, 'platform', {}, ['cut']],
  [99.65, 'trainIn', { mode: 'tunnel' }, ['cut']],
  [106.76, 'elevated', { tod: 'morning' }, ['cut']],
  [113.38, 'trainIn', { mode: 'city', close: true }, ['cut']],
  [121.12, 'tunnel', { doors: 126.94 }, ['cut']],
  [127.58, 'corridor', {}, ['white', 0.7]],
  [143.46, 'chat', {}, ['white', 1.4]],
  [158.14, 'office', { mode: 'day' }, ['fade', 0.9]],
  [170.59, 'wallclock', {}, ['fade', 0.9]],
  [177.69, 'chatInput', {}, ['fade', 0.9]],
  [188.30, 'office', { mode: 'night' }, ['fade', 1.4]],
  [202.58, 'trainIn', { mode: 'night' }, ['cut']],
  [209.28, 'clock', { a: [6, 0], b: [6, 0], day: '星期二', alarm: true }, ['cut']],
  [211.52, 'bedroom', { mode: 'blinds' }, ['cut']],
  [212.87, 'faucet', {}, ['cut']],
  [214.23, 'door', { fast: true }, ['cut']],
  [217.18, 'elevated', { tod: 'morning2' }, ['cut']],
  [224.52, 'finance', {}, ['cut']],
  [230.90, 'concourse', {}, ['fade', 0.6]],
  [252.85, 'dream', { bloom: 0.45 }, ['white', 2.4]],
  [270.40, 'windowSeat', { buzz: 289.07 }, ['fade', 1.8]],
  [296.33, 'cityTL', {}, ['fade', 1.4]],
  [309.44, 'tunnel', { build: true }, ['fade', 0.6]],
  [314.28, 'trainIn', { mode: 'tunnel', intense: true }, ['white', 0.4]],
  [321.14, 'corridor', { forward: true }, ['cut']],
  [328.80, 'elevated', { tod: 'river', river: true }, ['cut']],
  [336.54, 'stairs', {}, ['fade', 0.6]],
  [345.88, 'sunrise', {}, ['white', 1.2]],
  [351.86, 'avenue', {}, ['fade', 1.2]],
  [367.82, 'crosswalk', {}, ['fade', 1.4]],
  [391.2, 'end', {}, ['black', 2.4]],
];
const DURATION = 396.76;
const SHOTS = SHOTS_DEF.map((d, i) => ({ i, s: d[0], e: i + 1 < SHOTS_DEF.length ? SHOTS_DEF[i + 1][0] : DURATION + 1, sc: d[1], p: d[2] || {}, tin: d[3] || ['cut'] }));
SHOTS.forEach(s => { s.d = s.e - s.s; });

// corner clock keyframes [t, day, minutes]  (null day hides)
const CLOCK = [
  [0, '星期一', 340], [16.28, '星期一', 352], [35.35, '星期一', 359], [38.38, '星期一', 360], [44.2, '星期一', 361], [44.76, '星期一', 381], [57.77, '星期一', 394], [61.12, '星期一', 398],
  [70.93, '星期一', 405], [86.57, '星期一', 411], [91.44, '星期一', 432], [121.12, '星期一', 451], [127.58, '星期一', 466], [143.46, '星期一', 542], [157.9, '星期一', 581],
  [158.14, '星期一', 827], [170.4, '星期一', 842], [170.59, '星期一', 1020], [174.10, '星期一', 1080], [177.69, '星期一', 1100], [188.1, '星期一', 1112], [188.30, '星期一', 1296], [202.4, '星期一', 1312], [202.58, '星期一', 1335],
  [209.28, '星期二', 360], [212.87, '星期二', 372], [214.23, '星期二', 391], [217.18, '星期二', 440], [230.90, '星期二', 485], [252.85, null, 0],
  [296.33, '星期日', 1392], [298.2, '星期日', 1439], [298.21, '星期一', 1440], [309.0, '星期一', 340 + 1440], [309.44, '星期一', 432], [328.80, '星期一', 458], [345.88, '星期一', 478], [367.82, '星期一', 488], [391.2, null, 0],
];
const CHAPTERS = [[0, 'I', '清晨'], [91.44, 'II', '早高峰'], [143.46, 'III', '工位'], [202.58, 'IV', '循环'], [252.85, 'V', '如果有一天'], [309.44, 'VI', '继续走'], [391.2, '', '']];

let cv, ctx, bufA, gA, bufB, gB, bl0, gb0, bl1, gb1, bl2, gb2;
const MV = {
  async init() {
    const fonts = ['500 40px Serif', '300 40px Serif', '700 40px Serif', '300 20px Sans', '400 20px Sans', '300 20px Mono', '500 20px Mono', 'italic 400 20px Garamond'];
    await Promise.all(fonts.map(f => document.fonts.load(f, '感觉好累但还是要上班星期一二0123456789:ⅠⅡ')));
    AUD = window.AUDIO; initGrain();
    cv = document.getElementById('c'); ctx = cv.getContext('2d');
    bufA = mk(W, H); gA = bufA.getContext('2d'); bufB = mk(W, H); gB = bufB.getContext('2d');
    bl0 = mk(480, 270); gb0 = bl0.getContext('2d', { willReadFrequently: true }); bl1 = mk(480, 270); gb1 = bl1.getContext('2d'); bl2 = mk(160, 90); gb2 = bl2.getContext('2d');
    return true;
  },
  frame(f, q = 0.94) { renderAt(f / FPS); return cv.toDataURL('image/jpeg', q); },
  still(t) { renderAt(t); return cv.toDataURL('image/png'); },
};
window.MV = MV;

function shotAt(t) { let i = 0; while (i < SHOTS.length - 1 && SHOTS[i + 1].s <= t) i++; return i; }

function renderShot(g, sh, t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const lt = t - sh.s;
  // handheld camera drift
  const k = sh.p.shake ?? 1;
  const dx = fbm(t * 0.35, 3) * 6 * k, dy = fbm(t * 0.31, 9) * 4 * k, rot = fbm(t * 0.22, 21) * 0.0025 * k;
  g.translate(W / 2, H / 2); g.rotate(rot); g.scale(1.022, 1.022); g.translate(-W / 2 + dx, -H / 2 + dy);
  const S = SCENES[sh.sc];
  if (!S) { g.fillStyle = '#222'; g.fillRect(0, 0, W, H); txt(g, sh.sc, W / 2, H / 2, '40px Mono', [255, 255, 255], 1, 'center'); return; }
  if (S.init && !sh._init) { S.init(sh); sh._init = true; }
  g.save(); S.draw(g, lt, sh, t); g.restore();
  g.setTransform(1, 0, 0, 1, 0, 0);
}

function renderAt(t) {
  const i = shotAt(t), sh = SHOTS[i];
  renderShot(gA, sh, t);
  // transitions
  const nx = SHOTS[i + 1], pv = SHOTS[i - 1];
  let blendWith = null, amt = 0, type = 'cut';
  if (nx && nx.tin[0] !== 'cut') { const d = nx.tin[1]; if (t > nx.s - d / 2) { blendWith = nx; type = nx.tin[0]; amt = inv(nx.s - d / 2, nx.s + d / 2, t); } }
  if (!blendWith && pv && sh.tin[0] !== 'cut') { const d = sh.tin[1]; if (t < sh.s + d / 2) { blendWith = pv; type = sh.tin[0]; amt = inv(sh.s - d / 2, sh.s + d / 2, t); } }
  if (blendWith) {
    // gA holds the current shot; render other into gB
    renderShot(gB, blendWith, t);
    const cur = bufA, oth = bufB;
    // amt = weight of the later shot
    const early = blendWith === nx ? cur : oth, late = blendWith === nx ? oth : cur;
    const a = sm(amt);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    if (type === 'fade') { ctx.drawImage(early, 0, 0); ctx.globalAlpha = a; ctx.drawImage(late, 0, 0); ctx.globalAlpha = 1; }
    else if (type === 'black' || type === 'white') {
      const col = type === 'black' ? '#000' : '#fff8ee';
      if (amt < 0.5) { ctx.drawImage(early, 0, 0); ctx.globalAlpha = sm(amt * 2); } else { ctx.drawImage(late, 0, 0); ctx.globalAlpha = sm((1 - amt) * 2); }
      if (type === 'white') { ctx.globalCompositeOperation = 'screen'; }
      ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  } else { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(bufA, 0, 0); }
  post(t);
}

function post(t) {
  const g = ctx;
  // bloom / halation
  const shp = (SHOTS[shotAt(t)] || { p: {} }).p;
  const bs = shp.bloom ?? 1;
  // true threshold bloom on a small copy; threshold adapts to frame brightness
  gb0.globalCompositeOperation = 'copy'; gb0.drawImage(cv, 0, 0, 480, 270);
  const id = gb0.getImageData(0, 0, 480, 270), d = id.data;
  let sum = 0; for (let i = 0; i < d.length; i += 16) sum += d[i] + d[i + 1] + d[i + 2];
  const mean = sum / (d.length / 16) / 765;
  const th = shp.bloomTh ?? clamp(0.56 + mean * 0.5, 0.6, 0.9), inv1 = 1 / (1 - th);
  for (let i = 0; i < d.length; i += 4) {
    const m = Math.max(d[i], d[i + 1], d[i + 2]) / 255; let k = (m - th) * inv1; if (k <= 0) { d[i] = d[i + 1] = d[i + 2] = 0; continue; } k = k * k;
    d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
  }
  gb0.putImageData(id, 0, 0);
  gb1.filter = 'blur(4px)'; gb1.globalCompositeOperation = 'copy'; gb1.drawImage(bl0, 0, 0);
  gb2.filter = 'blur(5px)'; gb2.globalCompositeOperation = 'copy'; gb2.drawImage(bl0, 0, 0, 160, 90);
  g.globalCompositeOperation = 'screen'; g.globalAlpha = Math.min(1, 0.85 * bs); g.drawImage(bl1, 0, 0, W, H); g.globalAlpha = Math.min(1, 0.7 * bs); g.drawImage(bl2, 0, 0, W, H);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  // gentle filmic grade: lift blacks a touch toward blue, warm highlights
  g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(6,8,14,1)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  // vignette
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // grain
  const gi = Math.floor(t * FPS) % GRAIN.length; const pat = g.createPattern(GRAIN[gi], 'repeat');
  const r = mulberry32(Math.floor(t * FPS) * 7 + 3); pat.setTransform(new DOMMatrix([1, 0, 0, 1, r() * 320, r() * 320]));
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.085; g.fillStyle = pat; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  // global fade in/out
  const fin = ss(0, 3.0, t), fout = 1 - ss(DURATION - 2.5, DURATION - 0.3, t);
  if (fin * fout < 1) { g.fillStyle = `rgba(0,0,0,${1 - fin * fout})`; g.fillRect(0, 0, W, H); }
  // letterbox
  g.fillStyle = '#000'; g.fillRect(0, 0, W, BAR); g.fillRect(0, H - BAR, W, BAR);
  drawHUD(g, t);
  drawLyrics(g, t);
}

function fmtClock(m) { m = ((Math.floor(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
function drawHUD(g, t) {
  // clock (top-left)
  let k = 0; while (k < CLOCK.length - 1 && CLOCK[k + 1][0] <= t) k++;
  const c0 = CLOCK[k], c1 = CLOCK[k + 1];
  const appear = ss(13.5, 16, t) * (1 - ss(DURATION - 6, DURATION - 3, t));
  if (c0[1]) {
    let m = c0[2];
    if (c1 && c1[1]) m = lerp(c0[2], c1[2], inv(c0[0], c1[0], t));
    const s = `${c0[1]}   ${fmtClock(m)}`;
    // fade around null sections
    let a = 0.5 * appear;
    if (c1 && !c1[1]) a *= 1 - ss(c1[0] - 1.0, c1[0], t);
    if (k > 0 && !CLOCK[k - 1][1]) a *= ss(c0[0], c0[0] + 1.0, t);
    txt(g, s, 84, 80, '300 21px Mono, Sans', [226, 222, 214], a, 'left', 3);
  } else if (t > 252 && t < 296.4) {
    const a = 0.5 * ss(253.5, 255.5, t) * (1 - ss(295.3, 296.3, t));
    txt(g, '某一天   --:--', 84, 80, '300 21px Mono, Sans', [236, 226, 210], a, 'left', 3);
  }
  // chapter (top-right)
  let ci = 0; while (ci < CHAPTERS.length - 1 && CHAPTERS[ci + 1][0] <= t) ci++;
  const ch = CHAPTERS[ci];
  if (ch[1]) {
    const tin = ss(ch[0] + (ci === 0 ? 13.5 : 0.6), ch[0] + (ci === 0 ? 16 : 2.4), t);
    const nxt = CHAPTERS[ci + 1]; const tout = nxt ? 1 - ss(nxt[0] - 0.8, nxt[0], t) : 1;
    const a = tin * tout;
    txt(g, ch[2], W - 84, 80, '300 22px Serif', [226, 222, 214], 0.55 * a, 'right', 6);
    g.save(); g.font = '300 22px Serif'; g.letterSpacing = '6px'; const w = g.measureText(ch[2]).width; g.restore();
    txt(g, ch[1] + '.', W - 84 - w - 22, 81, 'italic 400 27px Garamond', [226, 222, 214], 0.5 * a, 'right', 1);
  }
}

function drawLyrics(g, t) {
  const Ls = window.LYRICS;
  // soft dark gradient at the bottom of the picture while lyrics are on screen (readability)
  let pres = 0;
  for (const L of Ls) { if (t < L.ds - 0.6 || t > L.de + 0.8) continue; pres = Math.max(pres, ss(L.ds - 0.5, L.ds, t) * (1 - ss(L.de, L.de + 0.7, t))); }
  if (pres > 0.001) {
    const gr = g.createLinearGradient(0, IB - 260, 0, IB);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, `rgba(0,0,0,${0.2 * pres})`); gr.addColorStop(1, `rgba(0,0,0,${0.46 * pres})`);
    g.fillStyle = gr; g.fillRect(0, IB - 260, W, 260);
  }
  for (const L of Ls) {
    if (t < L.ds - 0.05 || t > L.de + 0.05) continue;
    const main = !L.echo;
    const font = main ? '500 44px Serif' : '300 35px Serif';
    const ls = main ? 6 : 10;
    g.save(); g.font = font; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.letterSpacing = '0px';
    const items = []; let x = 0; const gap = main ? 32 : 36;
    L.parts.forEach((p, pi) => {
      if (pi > 0) x += gap;
      [...p.text].forEach((ch, ci) => { const w = g.measureText(ch).width; items.push({ ch, x, w, t0: p.t + ci * (main ? 0.045 : 0.07) }); x += w + ls; });
      x -= ls;
    });
    const total = Math.max(1, x), x0 = W / 2 - total / 2, y = IB - 64;
    // exit: a soft gradient wipe sweeping left -> right, characters drifting up as they dissolve
    const wd = clamp((L.de - L.ds) * 0.38, 0.32, 0.75), ws = L.de - wd;
    const col = main ? [244, 238, 228] : [228, 222, 212];
    g.shadowColor = 'rgba(0,0,0,0.72)'; g.shadowBlur = 18; g.shadowOffsetY = 2;
    for (const it of items) {
      const u = (it.x + it.w / 2) / total;
      const o0 = ws + u * wd * 0.55, o1 = o0 + wd * 0.45;
      const out = ss(o0, o1, t);
      const a = ss(it.t0, it.t0 + (main ? 0.36 : 0.6), t) * (1 - out) * (main ? 1 : 0.68);
      if (a <= 0.003) continue;
      const yo = (1 - eo(inv(it.t0, it.t0 + 0.5, t))) * 10 - out * 9;
      g.fillStyle = rgba(col, a); g.fillText(it.ch, x0 + it.x, y + yo);
    }
    g.restore();
  }
}
// debug: render a single scene at local time
MV.sceneStill = function (name, lt, p = {}) {
  const sh = { i: -1, s: 0, e: 999, d: 30, sc: name, p, tin: ['cut'] };
  renderShot(gA, sh, lt); ctx.drawImage(bufA, 0, 0); post(lt + 100);
  return cv.toDataURL('image/png');
};
