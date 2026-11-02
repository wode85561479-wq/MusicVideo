'use strict';
// ---------- constants ----------
const W = 1920, H = 1080, BAR = 132, FPS = 24, TAU = Math.PI * 2;
const IT = BAR, IB = H - BAR, IH = IB - IT, CY = (IT + IB) / 2;

// ---------- math ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const sm = t => t * t * (3 - 2 * t);
const ss = (a, b, x) => sm(inv(a, b, x));
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eo = t => 1 - Math.pow(1 - t, 3);
const ei = t => t * t * t;
const eo5 = t => 1 - Math.pow(1 - t, 5);
function hash(n) { n = n | 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = n ^ (n >>> 16); return ((n >>> 0) / 4294967296) * 2 - 1; }
function vnoise(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 1013), hash(i + 1 + seed * 1013), u); }
function fbm(x, seed = 0) { return vnoise(x, seed) * 0.6 + vnoise(x * 2.13, seed + 7) * 0.28 + vnoise(x * 4.37, seed + 13) * 0.12; }

// ---------- color ----------
function hx(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function rgba(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
function C(h) { return typeof h === 'string' ? hx(h) : h; }

// ---------- canvas ----------
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function vgrad(g, x, y0, w, y1, stops) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [p, c, a] of stops) gr.addColorStop(p, rgba(C(c), a === undefined ? 1 : a));
  g.fillStyle = gr; g.fillRect(x, y0, w, y1 - y0);
}
function glow(g, x, y, r, c, a = 1, mode = 'lighter', mid = 0.45) {
  if (a <= 0.002 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  c = C(c);
  gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.22, rgba(c, a * mid)); gr.addColorStop(0.55, rgba(c, a * mid * 0.25)); gr.addColorStop(1, rgba(c, 0));
  g.save(); g.globalCompositeOperation = mode; g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
}
function softDisc(g, x, y, r, c, a = 1, mode = 'source-over') {
  if (a <= 0.002) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r); c = C(c);
  gr.addColorStop(0, rgba(c, a)); gr.addColorStop(1, rgba(c, 0));
  g.save(); g.globalCompositeOperation = mode; g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
}
function streak(g, x, y, len, th, c, a = 1) {
  if (a <= 0.002) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.scale(len / th, 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, th); c = C(c);
  gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.3, rgba(c, a * 0.35)); gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr; g.fillRect(-th, -th, 2 * th, 2 * th); g.restore();
}
function sunFlare(g, x, y, s, c, a = 1) {
  glow(g, x, y, 380 * s, c, 0.55 * a);
  glow(g, x, y, 120 * s, [255, 250, 235], 0.9 * a);
  streak(g, x, y, 900 * s, 7 * s, c, 0.55 * a);
  streak(g, x, y, 420 * s, 2.5 * s, [255, 255, 255], 0.5 * a);
  // ghosts along the line to centre
  const dx = W / 2 - x, dy = H / 2 - y;
  const gs = [[0.6, 26, 0.10], [1.25, 50, 0.07], [1.6, 16, 0.12], [1.9, 90, 0.04]];
  for (const [k, r, al] of gs) softDisc(g, x + dx * k, y + dy * k, r * s, mix(C(c), [140, 180, 255], 0.4), al * a, 'lighter');
}
// polygon helper
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// light shaft (quad from a window to floor), soft via gradient
function shaft(g, p, c, a, mode = 'lighter') {
  // p: [[x,y]x4] ; gradient from first edge to last
  g.save(); g.globalCompositeOperation = mode;
  const gr = g.createLinearGradient(p[0][0], p[0][1], p[2][0], p[2][1]); c = C(c);
  gr.addColorStop(0, rgba(c, a)); gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr; poly(g, p); g.fill(); g.restore();
}

// ---------- audio ----------
let AUD = null;
function af(t, key) {
  const a = AUD[key]; const i = t * AUD.fps; const i0 = Math.floor(i);
  if (i0 < 0) return a[0]; if (i0 >= a.length - 1) return a[a.length - 1];
  return lerp(a[i0], a[i0 + 1], i - i0);
}
function beatIdx(t) {
  const b = AUD.beats; if (t < b[0]) return -1; let lo = 0, hi = b.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (b[m] <= t) lo = m; else hi = m - 1; }
  return lo;
}
function beatPulse(t, decay = 0.22) { const i = beatIdx(t); if (i < 0) return 0; return Math.exp(-(t - AUD.beats[i]) / decay); }

// ---------- grain ----------
const GRAIN = [];
function initGrain() {
  for (let k = 0; k < 8; k++) {
    const c = mk(320, 320), g = c.getContext('2d'), id = g.createImageData(320, 320), r = mulberry32(991 + k * 17);
    for (let i = 0; i < id.data.length; i += 4) { const v = (r() + r() + r() + r() - 2) * 95 + 128; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0); GRAIN.push(c);
  }
}

// ---------- sky palettes ----------
const SKY = {
  night: ['#04060d', '#090e1c', '#121a30', '#1d2742'],
  predawn: ['#060a16', '#0e1630', '#222c52', '#454a72'],
  bluehour: ['#0e1838', '#25355f', '#4f5f8a', '#8a87a6'],
  dawn: ['#1f2f55', '#4a5c86', '#9c93ab', '#e7b99c'],
  morning: ['#5a7ca6', '#8fa7c3', '#cdd3da', '#efd9bf'],
  day: ['#6a92c2', '#9fbbd8', '#d3dfea', '#eceee9'],
  golden: ['#7f93ad', '#c9b49c', '#efcc9c', '#ffdcab'],
  dusk: ['#121833', '#35355e', '#9a5d78', '#ee956a'],
  sunrise: ['#33557f', '#7f95b2', '#e8bc98', '#ffd6a2'],
};
function skyCols(a, b, t) { const A = SKY[a].map(hx); if (!b) return A; const B = SKY[b].map(hx); return A.map((c, i) => mix(c, B[i], t)); }
function drawSky(g, y0, y1, cols, x = -40, w = W + 80) {
  vgrad(g, x, y0, w, y1, [[0, cols[0]], [0.42, cols[1]], [0.78, cols[2]], [1, cols[3]]]);
}

// ---------- city generator ----------
// returns {sil, win, wins:[...]} canvases sized w x h ; base = ground y inside canvas
function makeCity(o) {
  const r = mulberry32(o.seed || 1);
  const sil = mk(o.w, o.h), g = sil.getContext('2d');
  const win = mk(o.w, o.h), gw = win.getContext('2d');
  const s = o.scale || 1;
  g.fillStyle = rgba(C(o.col));
  const wins = [];
  let x = -r() * 60;
  const warm = C(o.winCol || '#ffd29a'), cool = C(o.winCool || '#cfe2ff');
  while (x < o.w + 40) {
    const bw = lerp(o.minW, o.maxW, r());
    let bh = lerp(o.minH, o.maxH, Math.pow(r(), o.pw || 1.5));
    if (o.tall && r() < o.tall) bh *= 1.35;
    const top = o.base - bh;
    g.fillRect(x, top, bw, bh + 4);
    if (o.edge) { g.save(); g.fillStyle = o.edge; g.fillRect(x, top, Math.max(1, 1.4 * s), bh); g.fillStyle = o.edgeTop || o.edge; g.fillRect(x, top, bw, Math.max(1, s)); g.restore(); }
    const rr = r();
    if (rr < 0.22) { // setback crown
      const sw = bw * lerp(0.45, 0.75, r()), sh = lerp(10, 34, r()) * s;
      g.fillRect(x + (bw - sw) / 2, top - sh, sw, sh + 1);
      if (r() < 0.6) { const ah = lerp(20, 70, r()) * s; g.fillRect(x + bw / 2 - 1.2 * s, top - sh - ah, 2.4 * s, ah + 1); }
    } else if (rr < 0.40) { // rooftop boxes / water tanks
      const n = 1 + (r() * 3 | 0);
      for (let k = 0; k < n; k++) { const bx = x + r() * bw * 0.8, bww = lerp(6, 22, r()) * s, bhh = lerp(5, 16, r()) * s; g.fillRect(bx, top - bhh, bww, bhh + 1); }
    } else if (rr < 0.48) { // slanted
      g.beginPath(); g.moveTo(x, top); g.lineTo(x + bw, top - lerp(10, 40, r()) * s); g.lineTo(x + bw, top + 2); g.closePath(); g.fill();
    } else if (rr < 0.56) { // thin mast
      const ah = lerp(25, 90, r()) * s; g.fillRect(x + bw * lerp(0.2, 0.8, r()), top - ah, 2 * s, ah);
    }
    if (o.winProb > 0 && bw > 10) {
      const ww = o.winW * s, wh = o.winH * s, gx = o.winGX * s, gy = o.winGY * s;
      const cols = Math.max(1, Math.floor((bw - gx * 2) / (ww + gx)));
      const rows = Math.floor((bh - gy * 3) / (wh + gy));
      const ox = x + (bw - (cols * (ww + gx) - gx)) / 2;
      const lit = Math.pow(r(), 1.6);
      const isCool = r() < (o.coolProb || 0.25);
      const strips = r() < (o.stripProb || 0);
      if (strips) { // office tower: faint horizontal bands
        for (let j = 0; j < rows; j++) if (r() < 0.25 + lit) { gw.fillStyle = rgba(cool, (o.winA || 0.9) * 0.18 * (0.4 + r())); gw.fillRect(x + 2 * s, top + gy * 2 + j * (wh + gy), bw - 4 * s, wh * 0.7); }
      }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        if (r() < o.winProb * (0.15 + lit * 1.6)) {
          const a = (o.winA || 0.9) * (0.35 + 0.65 * r());
          const c = isCool ? mix(cool, warm, r() * 0.3) : mix(warm, [255, 240, 210], r() * 0.4);
          const wx = ox + i * (ww + gx), wy = top + gy * 2 + j * (wh + gy);
          gw.fillStyle = rgba(c, a); gw.fillRect(wx, wy, ww, wh);
          if (o.keepWins) wins.push([wx, wy, ww, wh, c, a, r()]);
        }
      }
    }
    if (o.redLights && bh > o.maxH * 0.7 && r() < 0.5) wins.push(['red', x + bw / 2, top - 6 * s, r()]);
    x += bw + lerp(0, o.gap || 0, r());
  }
  if (o.shade) { // vertical shading: lighter toward the top of the layer
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, o.base - o.maxH * 1.3, 0, o.base);
    gr.addColorStop(0, rgba(C(o.shade), o.shadeA ?? 0.35)); gr.addColorStop(1, rgba(C(o.shade), 0));
    g.fillStyle = gr; g.fillRect(0, 0, o.w, o.h); g.globalCompositeOperation = 'source-over';
  }
  return { sil, win, wins };
}
// draw a city layer with optional parallax wrap
function drawLayer(g, cv, x, y, a = 1) {
  if (a <= 0) return; g.globalAlpha = a; g.drawImage(cv, x, y); g.globalAlpha = 1;
}

// tinted copy of a silhouette canvas (cached)
function tint(cv, col) { const c = mk(cv.width, cv.height), g = c.getContext('2d'); g.drawImage(cv, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = rgba(C(col)); g.fillRect(0, 0, c.width, c.height); return c; }

// haze band
function haze(g, y0, y1, col, a) { vgrad(g, -40, y0, W + 80, y1, [[0, col, 0], [1, col, a]]); }

// soft blurred copy
function blurred(cv, px, scale = 1) { const c = mk(cv.width * scale, cv.height * scale), g = c.getContext('2d'); g.filter = `blur(${px}px)`; g.drawImage(cv, 0, 0, c.width, c.height); return c; }

// ---------- particles: dust motes ----------
function dust(g, t, n, seed, region, col, aMax, sizeMax, inLight) {
  const r = mulberry32(seed);
  const [x0, y0, w, h] = region;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const bx = r(), by = r(), sp = 0.004 + r() * 0.012, ph = r() * 100, sz = (0.4 + r() * 0.6) * sizeMax, tw = r() * 6;
    let x = x0 + ((bx + t * sp * 0.6 + 0.03 * Math.sin(t * 0.3 + ph)) % 1 + 1) % 1 * w;
    let y = y0 + ((by - t * sp * 0.35 + 0.04 * Math.sin(t * 0.21 + ph * 1.3)) % 1 + 1) % 1 * h;
    let a = aMax * (0.5 + 0.5 * Math.sin(t * 1.3 + tw));
    if (inLight) a *= inLight(x, y);
    if (a < 0.01) continue;
    const gr = g.createRadialGradient(x, y, 0, x, y, sz * 2.5); gr.addColorStop(0, rgba(C(col), a)); gr.addColorStop(1, rgba(C(col), 0));
    g.fillStyle = gr; g.fillRect(x - sz * 2.5, y - sz * 2.5, sz * 5, sz * 5);
  }
  g.restore();
}

// ---------- text ----------
function txt(g, s, x, y, font, col, a = 1, align = 'left', ls = 0) {
  g.save(); g.font = font; g.textAlign = align; g.textBaseline = 'alphabetic'; g.letterSpacing = ls + 'px'; g.fillStyle = rgba(C(col), a); g.fillText(s, x, y); g.restore();
}
