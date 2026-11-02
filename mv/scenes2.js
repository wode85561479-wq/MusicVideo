'use strict';
// =====================================================================
// Street-level helpers (morning streets)
// =====================================================================
const SIGNS = [['便利店', '#2c4a6e'], ['早点', '#8c3a32'], ['五金建材', '#3d5a48'], ['药房', '#2f6a5a'], ['理发', '#4a3b5c'], ['水果', '#b0802c'], ['复印 · 打字', '#e3ded3'], ['面馆', '#7a2f2a'], ['烟酒茶', '#5c4630'], ['洗衣', '#36577a'], ['眼镜', '#3a3d44'], ['花店', '#6b7a52']];
function buildStreetStrip(seed, SW, base) {
  const r = mulberry32(seed);
  const cv = mk(SW, base + 10), g = cv.getContext('2d');
  const pal = ['#cbbfac', '#bdb6a9', '#ada79d', '#cdc6b7', '#ab9786', '#a1a8a3', '#d6d0c4', '#b9ab9b', '#959ca0', '#c2b19d'];
  const blds = [], gaps = [];
  let x = -40;
  while (x < SW) {
    const w = lerp(330, 640, r()), floors = 3 + (r() * 4 | 0), fh = lerp(102, 118, r()), gh = 156;
    const top = base - (gh + floors * fh + 26);
    const col = hx(pal[r() * pal.length | 0]);
    // facade
    g.fillStyle = rgba(col); g.fillRect(x, top, w, base - top);
    // tile texture lines
    g.fillStyle = 'rgba(0,0,0,0.035)'; for (let yy = top + 6; yy < base - gh; yy += 9) g.fillRect(x, yy, w, 1);
    // parapet / cornice
    g.fillStyle = rgba(mix(col, [255, 255, 255], 0.18)); g.fillRect(x - 4, top, w + 8, 10); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x - 4, top + 10, w + 8, 4);
    if (r() < 0.5) { g.fillStyle = rgba(mix(col, [0, 0, 0], 0.25)); const tw = lerp(40, 80, r()); g.fillRect(x + w * lerp(0.15, 0.7, r()), top - 34, tw, 34); g.fillRect(x + w * 0.3, top - 50, 3, 50); }
    // floors
    const nwin = Math.max(2, Math.floor(w / 150)); const res = r() < 0.6;
    for (let f = 0; f < floors; f++) {
      const fy = top + 26 + f * fh;
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, fy + fh - 6, w, 3); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, fy + fh - 9, w, 3);
      for (let i = 0; i < nwin; i++) {
        const cw = w / nwin, ww = Math.min(92, cw * 0.56), wh = fh * 0.56, wx = x + cw * i + (cw - ww) / 2, wy = fy + fh * 0.16;
        g.fillStyle = rgba(mix(col, [255, 255, 255], 0.35)); g.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
        const gl = g.createLinearGradient(0, wy, 0, wy + wh); const k = r();
        if (k < 0.12) { gl.addColorStop(0, '#e8c48e'); gl.addColorStop(1, '#b98d5c'); }
        else { gl.addColorStop(0, '#a9bfd4'); gl.addColorStop(0.5, '#6d7f93'); gl.addColorStop(1, '#465363'); }
        g.fillStyle = gl; g.fillRect(wx, wy, ww, wh);
        if (k > 0.55) { g.fillStyle = `rgba(235,230,220,${0.35 + r() * 0.3})`; g.fillRect(wx + (r() < 0.5 ? 0 : ww * 0.55), wy, ww * 0.45, wh); }
        g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); g.fillRect(wx, wy + wh * 0.35, ww, 2);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(wx - 5, wy + wh + 5, ww + 10, 4);
        if (res && r() < 0.45) { // balcony rail
          g.fillStyle = 'rgba(60,62,66,0.55)'; g.fillRect(wx - 10, wy + wh * 0.62, ww + 20, 3); for (let q = wx - 8; q < wx + ww + 10; q += 9) g.fillRect(q, wy + wh * 0.62, 1.6, wh * 0.38 + 5);
        }
        if (r() < 0.32) { // AC unit
          const ax = wx + ww + 10, ay = wy + wh - 30; g.fillStyle = '#dcdad4'; g.fillRect(ax, ay, 50, 32); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let q = 0; q < 5; q++) g.fillRect(ax + 6, ay + 6 + q * 5, 26, 1.5);
          g.beginPath(); g.arc(ax + 40, ay + 16, 8, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(ax, ay + 32, 50, 3);
        }
      }
    }
    // drain pipe
    g.fillStyle = 'rgba(70,70,72,0.45)'; g.fillRect(x + w - 14, top + 14, 5, base - top - 14);
    // ground floor shop
    const sy = base - gh;
    g.fillStyle = rgba(mix(col, [0, 0, 0], 0.18)); g.fillRect(x, sy, w, gh);
    const sw = w - 30, sx = x + 15;
    const sg = SIGNS[r() * SIGNS.length | 0];
    const signC = hx(sg[1]);
    g.fillStyle = rgba(signC); g.fillRect(sx, sy + 8, sw, 44);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(sx, sy + 8, sw, 3);
    g.font = '400 27px Sans'; g.textAlign = 'center'; g.letterSpacing = '6px'; g.fillStyle = sg[1] === '#e3ded3' ? '#3a3a3a' : 'rgba(250,246,238,0.92)'; g.fillText(sg[0], sx + sw / 2, sy + 41);
    const open = r() < 0.5;
    const dy = sy + 60, dh = gh - 60;
    if (open) {
      const ig = g.createLinearGradient(0, dy, 0, base); ig.addColorStop(0, '#5a4636'); ig.addColorStop(1, '#2c241e'); g.fillStyle = ig; g.fillRect(sx, dy, sw, dh);
      g.fillStyle = 'rgba(255,214,150,0.28)'; g.fillRect(sx + 10, dy + 6, sw - 20, 10);
      g.fillStyle = 'rgba(30,24,20,0.6)'; for (let q = 0; q < 3; q++) g.fillRect(sx + 20 + q * (sw / 3), dy + 30, sw / 3 - 40, 4);
      g.fillStyle = 'rgba(220,230,240,0.25)'; g.fillRect(sx, dy, 4, dh); g.fillRect(sx + sw - 4, dy, 4, dh);
    } else {
      const up = r() * 0.4;
      g.fillStyle = '#2a2724'; g.fillRect(sx, dy, sw, dh);
      g.fillStyle = '#a7aaad'; g.fillRect(sx, dy, sw, dh * (1 - up));
      g.fillStyle = 'rgba(0,0,0,0.13)'; for (let q = dy; q < dy + dh * (1 - up); q += 6) g.fillRect(sx, q, sw, 1.5);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(sx, dy, sw, 2);
    }
    blds.push({ x, w, top });
    x += w;
    if (r() < 0.38) { const gw = lerp(36, 90, r()); gaps.push([x, gw]); // alley
      const ag = g.createLinearGradient(0, top, 0, base); ag.addColorStop(0, 'rgba(70,78,92,0)'); ag.addColorStop(0.3, 'rgba(70,78,92,0.85)'); ag.addColorStop(1, '#3b414c');
      g.fillStyle = ag; g.fillRect(x, top + 60, gw, base - top - 60); x += gw; }
  }
  return { cv, blds, gaps };
}
function drawPlaneTree(g, x, baseY, s, seed, lightA) {
  const r = mulberry32(seed);
  // trunk
  const tw = 26 * s;
  const tg = g.createLinearGradient(x - tw, 0, x + tw, 0); tg.addColorStop(0, '#8d8a7c'); tg.addColorStop(0.5, '#b4ae9c'); tg.addColorStop(1, '#6d6a60');
  g.fillStyle = tg; g.beginPath(); g.moveTo(x - tw * 0.6, baseY); g.lineTo(x - tw * 0.45, baseY - 700 * s); g.lineTo(x + tw * 0.45, baseY - 700 * s); g.lineTo(x + tw * 0.6, baseY); g.closePath(); g.fill();
  for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '210,205,185' : '90,88,78'},${0.25 + r() * 0.25})`; g.beginPath(); g.ellipse(x + (r() - 0.5) * tw * 0.7, baseY - r() * 650 * s, 6 * s + r() * 8 * s, 12 * s + r() * 16 * s, 0, 0, TAU); g.fill(); }
  // branches
  g.strokeStyle = '#7d796c'; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) { g.lineWidth = (10 - i * 2) * s; g.beginPath(); g.moveTo(x, baseY - (520 + i * 50) * s); g.quadraticCurveTo(x + (i % 2 ? 1 : -1) * 120 * s, baseY - (640 + i * 40) * s, x + (i % 2 ? 1 : -1) * (180 + i * 40) * s, baseY - (760 + i * 30) * s); g.stroke(); }
}
function drawCanopy(g, x, y, s, seed, t, sun) {
  const r = mulberry32(seed);
  // a few hanging branch lines
  g.strokeStyle = 'rgba(70,66,56,0.9)'; g.lineCap = 'round';
  for (let i = 0; i < 5; i++) { g.lineWidth = (6 - i) * s; g.beginPath(); const bx = x + (r() - 0.5) * 500 * s; g.moveTo(bx, y - 140 * s); g.quadraticCurveTo(bx + (r() - 0.5) * 200 * s, y, bx + (r() - 0.5) * 260 * s, y + (40 + r() * 80) * s); g.stroke(); }
  for (let i = 0; i < 150; i++) {
    const ang = r() * TAU, rad = Math.sqrt(r());
    const cx = x + Math.cos(ang) * rad * 380 * s, cy = y - 40 * s + Math.sin(ang) * rad * 120 * s + (r() < 0.3 ? r() * 90 * s : 0), rr = (14 + r() * 26) * s;
    const sw = Math.sin(t * 0.9 + i * 0.7) * 2.5 * s;
    const lit = clamp(0.25 + (x - cx) / (760 * s) + (y - cy) / (400 * s) + r() * 0.35);
    const c = mix(mix(hx('#34472f'), hx('#6f7d45'), lit), hx('#c2b874'), lit * lit * sun * 0.7);
    g.fillStyle = rgba(c, 0.97); g.beginPath(); g.ellipse(cx + sw, cy, rr, rr * 0.62, ang, 0, TAU); g.fill();
  }
}
function drawCar(g, x, y, s, col, dir, seed) {
  const r = mulberry32(seed); const L = 430 * s, Hh = 120 * s;
  g.save(); g.translate(x, y); g.scale(dir, 1);
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(0, 0, L * 0.55, 10 * s, 0, 0, TAU); g.fill();
  const bc = hx(col);
  const bg = g.createLinearGradient(0, -Hh, 0, 0); bg.addColorStop(0, rgba(mix(bc, [255, 255, 255], 0.25))); bg.addColorStop(0.55, rgba(bc)); bg.addColorStop(1, rgba(mix(bc, [0, 0, 0], 0.35)));
  g.fillStyle = bg; g.beginPath();
  g.moveTo(-L / 2, -22 * s); g.lineTo(-L / 2 + 6 * s, -58 * s); g.quadraticCurveTo(-L / 2 + 30 * s, -66 * s, -L * 0.28, -70 * s);
  g.lineTo(-L * 0.17, -Hh); g.lineTo(L * 0.16, -Hh); g.lineTo(L * 0.3, -72 * s); g.quadraticCurveTo(L / 2 - 6 * s, -64 * s, L / 2, -40 * s); g.lineTo(L / 2, -22 * s); g.closePath(); g.fill();
  g.fillStyle = '#3d4a5a'; g.beginPath(); g.moveTo(-L * 0.25, -72 * s); g.lineTo(-L * 0.155, -Hh + 8 * s); g.lineTo(L * 0.145, -Hh + 8 * s); g.lineTo(L * 0.27, -72 * s); g.closePath(); g.fill();
  const wg = g.createLinearGradient(-L * 0.2, -Hh, L * 0.2, -72 * s); wg.addColorStop(0, 'rgba(220,235,255,0.35)'); wg.addColorStop(0.5, 'rgba(220,235,255,0)'); g.fillStyle = wg; g.fill();
  g.fillStyle = rgba(bc); g.fillRect(-2 * s, -Hh + 6 * s, 6 * s, 50 * s);
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(-L / 2 + 10 * s, -60 * s, L - 20 * s, 2 * s);
  for (const wx of [-L * 0.3, L * 0.3]) { g.fillStyle = '#16171a'; g.beginPath(); g.arc(wx, -20 * s, 34 * s, 0, TAU); g.fill(); g.fillStyle = '#8b8e94'; g.beginPath(); g.arc(wx, -20 * s, 16 * s, 0, TAU); g.fill(); }
  g.fillStyle = '#fff4dc'; g.fillRect(L / 2 - 14 * s, -52 * s, 12 * s, 8 * s); g.fillStyle = '#c0362c'; g.fillRect(-L / 2, -52 * s, 8 * s, 10 * s);
  g.restore();
}

// =====================================================================
// WALK: morning street toward the station
// =====================================================================
SCENES.walk = {
  init(sh) {
    const c = sh.c = {};
    c.base = 790; c.SW = 6200;
    c.strip = buildStreetStrip(17, c.SW, c.base);
    c.towers = makeCity({ w: 3000, h: 520, base: 520, minH: 160, maxH: 420, minW: 70, maxW: 160, gap: 30, seed: 88, col: '#a4afbf', winProb: 0, scale: 1, edge: 'rgba(255,236,210,0.6)', shade: '#d3dae3', shadeA: 0.35 });
    const tg = c.towers.sil.getContext('2d'); tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = 'rgba(90,102,122,0.16)';
    for (let y = 0; y < 520; y += 12) tg.fillRect(0, y, 3000, 4);
    c.walkers = [{ x: 1350, sp: 1.04, s: 0.95, dir: 1, of: randOutfit(mulberry32(31)), ph: 0.3, hs: 'long' }, { x: 2900, sp: 1.15, s: 0.97, dir: -1, of: randOutfit(mulberry32(44)), ph: 0.7, hs: 'short' }, { x: -200, sp: 1.22, s: 0.92, dir: 1, of: randOutfit(mulberry32(57)), ph: 0.1, hs: 'bun' }];
    // pre-rendered tree sprites (foreground, blurred) and far trees
    c.fgTrees = [0, 1, 2].map(k => { const cv = mk(1300, 1150), q = cv.getContext('2d'); drawPlaneTree(q, 650, 1120, 1.3, 900 + k, 1); drawCanopy(q, 650, 230, 1.25, 700 + k, 0, 1); return blurred(cv, 2); });
    c.farTrees = [0, 1, 2].map(k => { const cv = mk(420, 320), q = cv.getContext('2d'); q.fillStyle = '#7a7568'; q.fillRect(204, 90, 12, 230); drawCanopy(q, 210, 60, 0.42, 300 + k, 0, 1); return cv; });
    c.cars = [{ x0: -600, v: 520, col: '#d9dadb', dir: 1, s: 0.5 }, { x0: 2600, v: -460, col: '#5b2e2c', dir: -1, s: 0.5 }, { x0: -2600, v: 560, col: '#2a2c31', dir: 1, s: 0.5 }, { x0: 4200, v: -500, col: '#9aa1a8', dir: -1, s: 0.5 }];
  },
  draw(g, lt, sh, t) {
    const c = sh.c;
    const fh = 340, cad = 0.92, v = 0.54 * fh * cad; // near-ground scroll px/s
    const scroll = lt * v;
    const figX = 820 + lt * 3;
    const FB_ = 905; // near sidewalk feet line
    // sky
    drawSky(g, 100, 560, skyCols('morning', 'day', 0.2));
    glow(g, -200, 140, 1100, '#ffe2b8', 0.35, 'screen');
    for (let i = 0; i < 6; i++) { const cx = ((i * 420 - lt * 5) % 2400 + 2400) % 2400 - 240; streak(g, cx, 170 + i * 21, 280 + i * 20, 9, [255, 238, 218], 0.25); }
    // distant towers (very slow)
    g.drawImage(c.towers.sil, -300 - scroll * 0.06, 640 - 520 - 10);
    haze(g, 200, 640, '#dfe3e8', 0.5);
    // far-side buildings scaled 0.8, parallax 0.36
    const fs = 0.8, fsc = 300 + scroll * 0.36, fBase = 648;
    g.drawImage(c.strip.cv, fsc / fs, 0, (W + 80) / fs, c.base + 10, -20, fBase - c.base * fs, W + 80, (c.base + 10) * fs);
    // morning light: upper facades warm, lower in soft shade
    const sg = g.createLinearGradient(0, fBase - 330, 0, fBase - 170);
    sg.addColorStop(0, 'rgba(255,200,140,0.0)'); sg.addColorStop(1, 'rgba(60,74,108,0.28)');
    g.fillStyle = sg; g.fillRect(-40, fBase - 330, W + 80, 160); g.fillStyle = 'rgba(60,74,108,0.28)'; g.fillRect(-40, fBase - 170, W + 80, 170);
    g.save(); g.globalCompositeOperation = 'screen'; const wg = g.createLinearGradient(0, 100, 0, fBase - 220); wg.addColorStop(0, 'rgba(255,196,130,0.26)'); wg.addColorStop(1, 'rgba(255,196,130,0)'); g.fillStyle = wg; g.fillRect(-40, 100, W + 80, fBase - 320); g.restore();
    // far sidewalk + far trees
    g.fillStyle = '#b4afa5'; g.fillRect(-40, fBase, W + 80, 18); g.fillStyle = '#cfcac0'; g.fillRect(-40, fBase + 18, W + 80, 5);
    for (let k = Math.floor((fsc - 300) / 520); k < Math.floor((fsc + W + 300) / 520); k++) { const x = k * 520 + 140 - fsc; g.drawImage(c.farTrees[((k % 3) + 3) % 3], x - 210, fBase - 310); }
    // road
    vgrad(g, -40, fBase + 23, W + 80, 812, [[0, '#6c6e72'], [1, '#5a5c60']]);
    g.fillStyle = 'rgba(240,238,230,0.75)'; for (let x = -((scroll * 0.62) % 160); x < W + 160; x += 160) g.fillRect(x, 724, 80, 5);
    // cars at road depth
    for (const car of c.cars) { const x = ((car.x0 + car.v * lt - scroll * 0.62) % 5200 + 5200) % 5200 - 1200; drawCar(g, x, car.dir > 0 ? 790 : 752, car.s * (car.dir > 0 ? 1.05 : 0.95), car.col, car.dir, 3); }
    // near curb + sidewalk
    g.fillStyle = '#d8d3c8'; g.fillRect(-40, 806, W + 80, 12); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-40, 803, W + 80, 3);
    vgrad(g, -40, 818, W + 80, 1000, [[0, '#b9b4aa'], [1, '#a29d93']]);
    g.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = -(scroll % 90); x < W + 120; x += 90) { g.beginPath(); g.moveTo(x, 818); g.lineTo(x + 40, 1000); g.lineTo(x + 41.5, 1000); g.lineTo(x + 1.5, 818); g.fill(); }
    for (let y = 840; y < 1000; y += 30) g.fillRect(-40, y, W + 80, 1.3);
    // sun patches on near sidewalk (gaps between buildings behind camera)
    const patch = (wx) => { const k = Math.floor(wx / 900); const f = wx / 900 - k; return (hash(k * 7 + 3) > 0.1 ? 1 : 0) * ss(0.18, 0.26, f) * (1 - ss(0.5, 0.58, f)); };
    g.save(); g.globalCompositeOperation = 'screen';
    for (let x = -20; x < W + 40; x += 8) { const a = patch(x + scroll) * 0.4; if (a > 0.01) { g.fillStyle = `rgba(255,205,150,${a})`; g.beginPath(); g.moveTo(x, 818); g.lineTo(x + 8, 818); g.lineTo(x + 8 + 70, 1000); g.lineTo(x + 70, 1000); g.fill(); } }
    g.restore();
    // figures
    const figs = [];
    for (const w of c.walkers) { const wx = w.x + lt * v * w.sp * w.dir - lt * v; figs.push({ x: wx + (figX - 820), dir: w.dir, s: w.s, of: w.of, ph: (w.ph + lt * cad * w.sp) % 1, hs: w.hs, y: FB_ - 18 }); }
    figs.push({ x: figX, dir: 1, s: 1, of: OUTFITS.protOut, ph: (lt * cad) % 1, prot: true, hs: 'short', y: FB_ });
    figs.sort((a, b) => a.y - b.y);
    for (const f of figs) {
      if (f.x < -300 || f.x > W + 300) continue;
      const sun = patch(f.x + scroll + 30);
      drawFigure(g, { x: f.x, y: f.y, h: fh * f.s, view: 'side', pose: 'walk', ph: f.ph, facing: f.dir, outfit: f.of, hairStyle: f.hs, headDown: f.prot ? 0.16 : 0.06,
        light: { amb: mix([196, 202, 218], [255, 240, 222], sun * 0.5), key: [255, 214, 168], keyA: 0.12 + 0.4 * sun, dir: [-1, -0.6], rim: [255, 226, 190], rimA: 0.12 + 0.55 * sun, rimDir: [-1, -0.3], rimW: 0.007, shadowA: 0.28 },
        shadow: { a: 0.16 + 0.22 * sun, k: 1.5, sy: 0.16 } });
    }
    // foreground trees on the near curb (closer to camera: parallax 1.25)
    const ts = scroll * 1.25 + 900;
    for (let k = Math.floor((ts - 600) / 1400); k < Math.floor((ts + W + 800) / 1400); k++) {
      const x = k * 1400 + 300 - ts;
      const sw = Math.sin(t * 0.7 + k) * 3;
      g.drawImage(c.fgTrees[((k % 3) + 3) % 3], x - 650 + sw, 1040 - 1120 + 0);
    }
    g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,214,170,0.22)'; g.fillRect(-40, -40, W + 80, H + 80); g.restore();
  }
};
