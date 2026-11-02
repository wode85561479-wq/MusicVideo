'use strict';
// shared helpers -------------------------------------------------------
function hudMin(t) {
  let k = 0; while (k < CLOCK.length - 1 && CLOCK[k + 1][0] <= t) k++;
  const c0 = CLOCK[k], c1 = CLOCK[k + 1];
  if (c1 && c1[1]) return Math.floor(lerp(c0[2], c1[2], inv(c0[0], c1[0], t)));
  return c0[2];
}
function makeStars(n, seed, x0, y0, w, h) { const r = mulberry32(seed); const s = []; for (let i = 0; i < n; i++) s.push([x0 + r() * w, y0 + Math.pow(r(), 1.6) * h, 0.3 + r() * 1.1, r() * TAU, 0.3 + r() * 0.7]); return s; }
function drawStars(g, st, t, a, dx = 0) {
  if (a <= 0) return;
  for (const [x, y, s, ph, b] of st) { const tw = 0.6 + 0.4 * Math.sin(t * (1.1 + b) + ph); g.fillStyle = `rgba(220,228,255,${a * b * tw})`; g.fillRect(x + dx, y, s, s); }
}
function crescent(r, col) {
  const c = mk(r * 4, r * 4), g = c.getContext('2d');
  g.fillStyle = rgba(C(col)); g.beginPath(); g.arc(r * 2, r * 2, r, 0, TAU); g.fill();
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(r * 2 + r * 0.42, r * 2 - r * 0.22, r * 0.95, 0, TAU); g.fill();
  return c;
}
// sheer curtain texture
function makeSheer(w, h, col, seed) {
  const c = mk(w, h), g = c.getContext('2d'), r = mulberry32(seed);
  const gr = g.createLinearGradient(0, 0, w, 0); const n = 14;
  for (let i = 0; i <= n; i++) { const a = 0.18 + 0.32 * Math.pow(0.5 + 0.5 * Math.sin(i * 1.7 + r() * 2), 1.5); gr.addColorStop(i / n, rgba(C(col), a)); }
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // hem + subtle vertical fade
  g.globalCompositeOperation = 'destination-in'; vgrad(g, 0, 0, w, h, [[0, '#fff', 0.85], [0.85, '#fff', 1], [1, '#fff', 0.6]]);
  return c;
}
function drawSheer(g, cv, x, y, t, amp, a = 1) {
  const sh = 8, sl = Math.floor(cv.height / sh); g.globalAlpha = a;
  for (let i = 0; i < sl; i++) { const f = i / sl; const off = Math.sin(t * 0.7 + f * 2.2) * amp * f * f + Math.sin(t * 1.3 + f * 4) * amp * 0.25 * f; g.drawImage(cv, 0, i * sh, cv.width, sh, x + off, Math.round(y) + i * sh, cv.width, sh); }
  g.globalAlpha = 1;
}
// 7-seg digit
const SEG = { 0: 'abcfed', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function seg7(g, d, x, y, s, col, a, offA = 0.06) {
  const L = 0.62 * s, T = 0.13 * s; // segment length/thickness; digit size ~ s
  const P = { a: [0, 0, 1], b: [L, 0, 0], c: [L, L, 0], d: [0, 2 * L, 1], e: [0, L, 0], f: [0, 0, 0], g: [0, L, 1] };
  for (const k of 'abcdefg') {
    const on = SEG[d].includes(k); const [ox, oy, hz] = P[k];
    g.fillStyle = rgba(C(col), on ? a : a * offA);
    g.save(); g.translate(x + ox, y + oy); g.transform(1, 0, -0.09, 1, 0, 0);
    g.beginPath();
    if (hz) { g.moveTo(T * 0.6, 0); g.lineTo(T * 1.1, -T / 2); g.lineTo(L - T * 1.1, -T / 2); g.lineTo(L - T * 0.6, 0); g.lineTo(L - T * 1.1, T / 2); g.lineTo(T * 1.1, T / 2); }
    else { g.moveTo(0, T * 0.6); g.lineTo(T / 2, T * 1.1); g.lineTo(T / 2, L - T * 1.1); g.lineTo(0, L - T * 0.6); g.lineTo(-T / 2, L - T * 1.1); g.lineTo(-T / 2, T * 1.1); }
    g.closePath(); g.fill(); g.restore();
  }
}
function seg7time(g, hh, mm, x, y, s, col, a, colon = 1) {
  const str = String(hh).padStart(2, '0') + String(mm).padStart(2, '0'); const adv = s * 0.95;
  seg7(g, +str[0], x, y, s, col, a); seg7(g, +str[1], x + adv, y, s, col, a);
  g.fillStyle = rgba(C(col), a * (0.08 + 0.92 * colon)); const cx = x + adv * 2 - s * 0.12;
  g.beginPath(); g.arc(cx, y + s * 0.38, s * 0.065, 0, TAU); g.arc(cx, y + s * 0.86, s * 0.065, 0, TAU); g.fill();
  seg7(g, +str[2], x + adv * 2 + s * 0.12, y, s, col, a); seg7(g, +str[3], x + adv * 3 + s * 0.12, y, s, col, a);
}

// ---------------------------------------------------------------------
// INTRO: pre-dawn city panorama
SCENES.intro = {
  init(sh) {
    const c = sh.c = {};
    c.far = makeCity({ w: 2500, h: 420, base: 420, minH: 40, maxH: 200, minW: 26, maxW: 100, gap: 3, seed: 11, col: '#242b4a', winProb: 0.05, winW: 1.6, winH: 1.6, winGX: 3.2, winGY: 4, winA: 0.45, scale: 0.6, shade: '#535c8a', shadeA: 0.3 });
    c.mid = makeCity({ w: 2500, h: 560, base: 560, minH: 70, maxH: 330, minW: 40, maxW: 130, gap: 6, seed: 23, col: '#131931', winProb: 0.09, winW: 2.2, winH: 2.4, winGX: 3.6, winGY: 4.4, winA: 0.75, scale: 0.8, redLights: true, tall: 0.14, edge: 'rgba(110,125,175,0.22)', shade: '#323b66', shadeA: 0.4, stripProb: 0.3 });
    c.near = makeCity({ w: 2700, h: 760, base: 760, minH: 110, maxH: 400, minW: 70, maxW: 210, gap: 10, seed: 37, col: '#080b15', winProb: 0.075, winW: 3.2, winH: 4, winGX: 5.5, winGY: 6.5, winA: 0.9, scale: 1.1, redLights: true, tall: 0.2, edge: 'rgba(100,118,170,0.26)', shade: '#1f2747', shadeA: 0.55, stripProb: 0.3 });
    c.stars = makeStars(170, 5, -100, 140, W + 200, 420);
    c.moon = crescent(20, '#e9e4d6');
    const r = mulberry32(77); c.cars = []; for (let i = 0; i < 70; i++) c.cars.push([r(), r() < 0.5 ? 1 : -1, 0.6 + r() * 0.8, r()]);
  },
  draw(g, lt, sh, t) {
    const c = sh.c, p = lt / 16;
    const cols = skyCols('predawn', 'bluehour', ss(0, 18, lt) * 0.35);
    drawSky(g, 100, 900, cols);
    drawStars(g, c.stars, t, 0.9 * (1 - 0.4 * p), -lt * 1.5);
    g.drawImage(c.moon, 1430 - lt * 2 - 40, 230 - 40); glow(g, 1430 - lt * 2, 230, 140, '#9aa6c8', 0.12);
    // light pollution glow on horizon
    glow(g, 700 - lt * 3, 820, 900, '#b77a58', 0.16, 'screen'); glow(g, 1500 - lt * 3, 840, 700, '#8a6a7a', 0.12, 'screen');
    const fx = -120 - lt * 3, mx = -160 - lt * 6.5, nx = -200 - lt * 13;
    g.drawImage(c.far.sil, fx, 780 - 420); g.drawImage(c.far.win, fx, 780 - 420);
    haze(g, 520, 800, '#3a4068', 0.55);
    g.drawImage(c.mid.sil, mx, 860 - 560); g.drawImage(c.mid.win, mx, 860 - 560);
    for (const w of c.mid.wins) if (w[0] === 'red') { const on = ((t + w[3] * 2) % 1.6) < 0.5; if (on) glow(g, w[1] + mx, w[2] + 860 - 560, 14, '#ff3a2a', 0.85); }
    haze(g, 640, 880, '#2b3054', 0.5);
    // elevated highway with traffic
    const hy = 842;
    g.fillStyle = '#05070e'; g.fillRect(-50, hy, W + 100, 10);
    for (let i = 0; i < 18; i++) { const px = ((i * 137 - lt * 13) % 2200 + 2200) % 2200 - 100; g.fillRect(px, hy + 8, 9, 60); }
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [u, dir, sp, k] of c.cars) {
      const x = ((u * 2400 + dir * lt * 90 * sp - lt * 13) % 2400 + 2400) % 2400 - 240;
      const col = dir > 0 ? [255, 70, 50] : [255, 236, 200];
      g.fillStyle = rgba(col, 0.75); g.fillRect(x, hy - 3 + (dir > 0 ? 0 : 3), 14, 1.6);
      softDisc(g, x + 7, hy - 2, 10, col, 0.25, 'lighter');
    }
    g.restore();
    g.drawImage(c.near.sil, nx, 1010 - 760); g.drawImage(c.near.win, nx, 1010 - 760);
    for (const w of c.near.wins) if (w[0] === 'red') { const on = ((t + w[3] * 2) % 1.6) < 0.5; if (on) glow(g, w[1] + nx, w[2] + 1010 - 760, 18, '#ff3a2a', 0.9); }
    vgrad(g, -50, 700, W + 100, 1080, [[0, '#000', 0], [1, '#000', 0.55]]);
    // title card: time
    const a = ss(3.2, 6.2, lt) * (1 - ss(11.2, 13.8, lt));
    if (a > 0) {
      const y = CY - 10 - (1 - eo(inv(3.2, 7, lt))) * 10;
      txt(g, '05:40', W / 2, y + 30, '300 120px Serif', [236, 230, 220], a * 0.92, 'center', 14);
      txt(g, '星 期 一', W / 2, y + 96, '300 26px Serif', [236, 230, 220], a * 0.6, 'center', 10);
      g.fillStyle = `rgba(236,230,220,${a * 0.35})`; g.fillRect(W / 2 - 28, y + 55, 56, 1);
    }
  }
};

// ---------------------------------------------------------------------
// BEDROOM: sitting at the edge of the bed before dawn
SCENES.bedroom = {
  init(sh) {
    const c = sh.c = {};
    c.cityFar = makeCity({ w: 760, h: 360, base: 360, minH: 40, maxH: 200, minW: 18, maxW: 60, gap: 2, seed: 61, col: '#1f2744', winProb: 0.05, winW: 1.5, winH: 1.5, winGX: 3, winGY: 4, winA: 0.5, scale: 0.5 });
    c.city = makeCity({ w: 760, h: 420, base: 420, minH: 60, maxH: 330, minW: 26, maxW: 90, gap: 3, seed: 51, col: '#0b1024', winProb: 0.13, winW: 2.4, winH: 3, winGX: 4, winGY: 5, winA: 0.85, scale: 0.6, tall: 0.2, redLights: true });
    c.stars = makeStars(40, 9, 1000, 200, 640, 200);
    c.sheer = makeSheer(150, 640, '#7d8fbb', 3);
    // soft floor light patch (pre-blurred)
    const lp = mk(W / 4, H / 4), lg = lp.getContext('2d'); lg.filter = 'blur(10px)';
    const gr = lg.createLinearGradient(0, 846 / 4, 0, 1000 / 4); gr.addColorStop(0, 'rgba(90,110,165,0.30)'); gr.addColorStop(1, 'rgba(90,110,165,0.0)'); lg.fillStyle = gr;
    poly(lg, [[1030 / 4, 846 / 4], [1630 / 4, 846 / 4], [1400 / 4, 1010 / 4], [700 / 4, 1010 / 4]]); lg.fill(); c.patch = lp;
    const r = mulberry32(4); c.duvet = []; for (let i = 0; i <= 12; i++) c.duvet.push(r());
  },
  draw(g, lt, sh, t) {
    const c = sh.c, p = clamp(lt / sh.d);
    const blinds = sh.p.mode === 'blinds';
    const z = 1 + 0.075 * eio(clamp(lt / 22));
    g.translate(930, 560); g.scale(z, z); g.translate(-930, -560);
    // wall
    vgrad(g, -60, -60, W + 120, H + 60, [[0, '#121726'], [0.55, '#1a2032'], [1, '#161b2a']]);
    // warm bedside lamp pool on the wall
    glow(g, 110, 600, 900, '#ffb070', 0.30, 'screen', 0.55);
    glow(g, 110, 640, 380, '#ffc890', 0.30, 'screen', 0.6);
    const wx = 1010, wy = 196, ww = 640, wh = 524, floorY = 846;
    // window spill on wall
    glow(g, wx + ww / 2, wy + wh * 0.55, 820, '#30436f', 0.26, 'screen', 0.6);
    // ---- outside
    g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
    const sk = skyCols('predawn', 'bluehour', 0.25 + 0.5 * p);
    drawSky(g, wy - 20, wy + wh + 10, sk, wx, ww);
    drawStars(g, c.stars, t, 0.7 * (1 - p * 0.6));
    glow(g, wx + ww * 0.35, wy + wh, 520, '#c08868', 0.16 + 0.08 * p, 'screen');
    const cx = wx - 50 - lt * 1.2;
    g.drawImage(c.cityFar.sil, cx, wy + wh - 360 + 30); g.drawImage(c.cityFar.win, cx, wy + wh - 360 + 30);
    haze(g, wy + wh - 220, wy + wh + 30, '#3c4470', 0.5);
    g.drawImage(c.city.sil, cx - 20, wy + wh - 420 + 90); g.drawImage(c.city.win, cx - 20, wy + wh - 420 + 90);
    for (const w of c.city.wins) if (w[0] === 'red') { if (((t + w[3] * 2) % 1.7) < 0.5) glow(g, w[1] + cx - 20, w[2] + wy + wh - 330, 9, '#ff3a2a', 0.8); }
    // glass sheen
    g.globalCompositeOperation = 'screen';
    const sg = g.createLinearGradient(wx, wy, wx + ww, wy + wh); sg.addColorStop(0, 'rgba(120,140,190,0)'); sg.addColorStop(0.45, 'rgba(120,140,190,0.06)'); sg.addColorStop(0.5, 'rgba(160,180,220,0.0)'); sg.addColorStop(1, 'rgba(120,140,190,0.03)');
    g.fillStyle = sg; g.fillRect(wx, wy, ww, wh); g.globalCompositeOperation = 'source-over';
    g.restore();
    // frame & mullions
    const fc = '#04060b';
    g.fillStyle = fc; g.fillRect(wx - 16, wy - 16, ww + 32, 16); g.fillRect(wx - 16, wy + wh, ww + 32, 22); g.fillRect(wx - 16, wy - 16, 16, wh + 32); g.fillRect(wx + ww, wy - 16, 16, wh + 32);
    g.fillRect(wx + ww / 2 - 6, wy, 12, wh); g.fillRect(wx, wy + wh * 0.3 - 5, ww, 10);
    g.fillStyle = 'rgba(110,130,185,0.35)'; g.fillRect(wx - 16, wy + wh + 0, ww + 32, 2); // sill highlight
    g.fillStyle = 'rgba(110,130,185,0.18)'; g.fillRect(wx + ww / 2 + 6, wy, 1.5, wh); g.fillRect(wx, wy + wh * 0.3 + 5, ww, 1.5);
    // sheer + heavy curtain
    drawSheer(g, c.sheer, wx - 70, wy - 46, t, 9, 0.42);
    vgrad(g, wx + ww - 30, wy - 40, 200, floorY, [[0, '#05070d'], [1, '#03040a']]);
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(80,100,150,${0.05 + 0.04 * (i % 2)})`; g.fillRect(wx + ww - 22 + i * 30, wy - 40, 3, floorY - wy + 40); }
    g.fillStyle = '#020308'; g.fillRect(wx - 120, wy - 52, ww + 360, 8); // rod
    // floor
    vgrad(g, -60, floorY, W + 120, H + 60, [[0, '#1a1c25'], [1, '#0f1118']]);
    glow(g, 200, floorY + 20, 520, '#ffae6a', 0.16, 'screen');
    g.fillStyle = 'rgba(90,110,160,0.12)'; g.fillRect(-60, floorY, W + 120, 1.5);
    // light patch on floor
    g.save(); g.globalCompositeOperation = 'screen'; g.drawImage(c.patch, 0, 0, W, H); g.restore();
    // picture frame on wall
    g.fillStyle = '#2a2622'; g.fillRect(360, 330, 250, 170); const pg = g.createLinearGradient(372, 342, 598, 488); pg.addColorStop(0, '#6d6a72'); pg.addColorStop(0.6, '#8a7a6c'); pg.addColorStop(1, '#4a4652'); g.fillStyle = pg; g.fillRect(372, 342, 226, 146);
    g.fillStyle = 'rgba(40,36,40,0.55)'; g.beginPath(); g.moveTo(372, 470); g.lineTo(450, 410); g.lineTo(510, 445); g.lineTo(560, 400); g.lineTo(598, 430); g.lineTo(598, 488); g.lineTo(372, 488); g.fill();
    glow(g, 470, 380, 70, '#ffe0b0', 0.25, 'screen');
    // bed
    const bx0 = 170, bx1 = 960, top = 706;
    g.fillStyle = '#3a312a'; rrect(g, bx0 - 46, 520, 50, floorY - 520, [10, 10, 0, 0]); g.fill(); g.fillStyle = 'rgba(255,190,130,0.35)'; g.fillRect(bx0 - 46, 528, 2, floorY - 540); // headboard
    g.fillStyle = '#2a2420'; g.fillRect(bx0, top + 58, bx1 - bx0, floorY - top - 58); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(bx0, floorY - 10, bx1 - bx0, 10); // base
    const mg = g.createLinearGradient(bx0, 0, bx1, 0); mg.addColorStop(0, '#5a5550'); mg.addColorStop(1, '#3a3e4c');
    g.fillStyle = mg; rrect(g, bx0, top, bx1 - bx0, 64, 8); g.fill();
    // pillow
    g.fillStyle = '#9a948e'; rrect(g, bx0 + 14, top - 52, 190, 58, 26); g.fill(); g.fillStyle = 'rgba(255,190,120,0.25)'; rrect(g, bx0 + 14, top - 52, 190, 26, 20); g.fill();
    // duvet (rumpled)
    g.beginPath(); g.moveTo(bx0 + 150, top + 104);
    g.bezierCurveTo(bx0 + 110, top + 40, bx0 + 150, top - 30, bx0 + 260, top - 22);
    g.bezierCurveTo(bx0 + 340, top - 16, bx0 + 370, top - 52, bx0 + 450, top - 44);
    g.bezierCurveTo(bx0 + 520, top - 38, bx0 + 560, top - 8, bx0 + 620, top - 12);
    g.bezierCurveTo(bx1 - 150, top - 16, bx1 - 120, top + 30, bx1 - 150, top + 100);
    g.closePath();
    const dg = g.createLinearGradient(0, top - 50, 0, top + 104); dg.addColorStop(0, '#8c8a90'); dg.addColorStop(0.35, '#6c6a74'); dg.addColorStop(1, '#3c3d48'); g.fillStyle = dg; g.fill();
    const dg2 = g.createLinearGradient(bx0, 0, bx1, 0); dg2.addColorStop(0, 'rgba(255,170,100,0.28)'); dg2.addColorStop(0.6, 'rgba(0,0,0,0.15)'); dg2.addColorStop(1, 'rgba(80,100,160,0.18)'); g.fillStyle = dg2; g.fill();
    // fold shadows
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 4; g.beginPath(); g.moveTo(bx0 + 380, top - 30); g.quadraticCurveTo(bx0 + 420, top + 30, bx0 + 400, top + 98); g.moveTo(bx0 + 560, top - 12); g.quadraticCurveTo(bx0 + 600, top + 40, bx0 + 640, top + 96); g.stroke();
    g.fillStyle = 'rgba(120,140,195,0.18)'; g.fillRect(bx1 - 150, top, 150, 1.5);
    // nightstand + clock
    g.fillStyle = '#2b2520'; g.fillRect(20, 712, 140, floorY - 712); g.fillStyle = 'rgba(255,200,140,0.35)'; g.fillRect(20, 712, 140, 3); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(28, 760, 124, 2);
    // lamp
    g.fillStyle = '#3a3330'; g.fillRect(132, 640, 6, 72); g.fillRect(118, 706, 34, 6);
    g.fillStyle = '#f3d6ad'; g.beginPath(); g.moveTo(108, 640); g.lineTo(162, 640); g.lineTo(152, 588); g.lineTo(118, 588); g.closePath(); g.fill();
    glow(g, 135, 640, 240, '#ffbe7a', 0.45); glow(g, 135, 615, 60, '#fff0d8', 0.7);
    const m = hudMin(t);
    g.fillStyle = '#020306'; rrect(g, 46, 668, 92, 44, 6); g.fill();
    seg7time(g, Math.floor(m / 60), m % 60, 58, 678, 18, '#ff6a3d', 0.95, (t % 1) < 0.5 ? 1 : 0);
    glow(g, 92, 690, 150, '#ff5a2a', 0.16); glow(g, 92, 712, 60, '#ff7a3a', 0.1);
    // figure on bed edge
    const br = Math.sin(t * 1.25);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(1020, floorY + 4, 120, 10, 0, 0, TAU); g.fill();
    const info = drawFigure(g, { x: 900, y: floorY, h: 500, pose: 'sit', view: 'side', facing: 1, lean: 0.5 + 0.012 * br, headDown: 0.46 + 0.02 * Math.sin(t * 0.4), outfit: OUTFITS.protHome,
      light: { amb: [128, 132, 156], key: [255, 186, 120], keyA: 0.42, dir: [-1, -0.25], rim: [160, 185, 245], rimA: 0.55, rimDir: [1, -0.35], rimW: 0.006, shadowA: 0.25, footA: 0.2 } });
    // dust in window light
    dust(g, t, 60, 12, [wx - 360, wy, ww + 300, floorY - wy], '#9fb2e0', 0.22, 2.0, (x, y) => clamp(1 - Math.abs(x - (wx + ww / 2 - (y - wy) * 0.4)) / 520));

  }
};
