'use strict';
// =====================================================================
// Batch A: clock, street (dawn), door, phone, elevator, faucet
// =====================================================================

// ---------- CLOCK close-up ----------
SCENES.clock = {
  init(sh) {
    const c = sh.c = {}; const r = mulberry32(12); c.bok = [];
    for (let i = 0; i < 26; i++) c.bok.push([1250 + r() * 700, 160 + r() * 420, 14 + r() * 40, r() < 0.7 ? '#ffcf96' : '#a9c4ff', 0.08 + r() * 0.2]);
  },
  draw(g, lt, sh, t) {
    const P = sh.p, c = sh.c;
    const z = 1 + 0.06 * eio(clamp(lt / sh.d));
    g.translate(960, 520); g.scale(z, z); g.translate(-960, -520);
    vgrad(g, -60, -60, W + 120, 700, [[0, '#262a37'], [1, '#1d2029']]);
    glow(g, 240, 330, 1000, '#ffad6a', 0.5, 'screen', 0.5);
    softDisc(g, 260, 320, 130, '#ffe6c4', 0.6, 'screen');
    glow(g, 1700, 300, 900, '#4f6ab0', 0.4, 'screen');
    for (const [x, y, rr, col, a] of c.bok) softDisc(g, x, y, rr, col, a, 'screen');
    // table
    vgrad(g, -60, 650, W + 120, H + 60, [[0, '#5a4130'], [0.4, '#40302a'], [1, '#2a201a']]);
    g.fillStyle = 'rgba(255,200,140,0.35)'; g.fillRect(-60, 650, W + 120, 2);
    for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(0,0,0,${0.05 + (i % 3) * 0.03})`; g.fillRect(-60, 668 + i * 34 + (i % 2) * 7, W + 120, 1.5); }
    glow(g, 280, 690, 760, '#ffae6a', 0.3, 'screen');
    // clock
    const bx = 540, by = 360, bw = 840, bh = 300;
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(960, 662, 470, 22, 0, 0, TAU); g.fill();
    const bg = g.createLinearGradient(0, by, 0, by + bh); bg.addColorStop(0, '#3a3a40'); bg.addColorStop(0.08, '#26262b'); bg.addColorStop(1, '#141417');
    g.fillStyle = bg; rrect(g, bx, by, bw, bh, 44); g.fill();
    g.fillStyle = 'rgba(255,214,170,0.35)'; rrect(g, bx + 30, by + 2, bw * 0.35, 3, 2); g.fill();
    const fg = g.createLinearGradient(bx, by, bx + bw, by + bh); fg.addColorStop(0, '#0e0e11'); fg.addColorStop(0.5, '#09090b'); fg.addColorStop(1, '#0c0c0f');
    g.fillStyle = fg; rrect(g, bx + 34, by + 34, bw - 68, bh - 68, 22); g.fill();
    // time
    let hh = P.a[0], mm = P.a[1];
    if (P.flip && t >= P.flip) { hh = P.b[0]; mm = P.b[1]; }
    let a = 0.95;
    if (P.flip) a *= 1 + 0.5 * Math.exp(-Math.max(0, t - P.flip) / 0.35) * (t >= P.flip ? 1 : 0);
    if (P.alarm) a *= (t % 0.5) < 0.3 ? 1 : 0.25;
    const col = '#ff5c34';
    seg7time(g, hh, mm, 662, 418, 150, col, Math.min(1, a), (t % 1) < 0.5 ? 1 : 0);
    glow(g, 960, 510, 520, '#ff4a2a', 0.22 * a, 'screen');
    if (P.alarm || (P.flip && t >= P.flip)) {
      const ap = P.alarm ? ((t % 0.5) < 0.3 ? 1 : 0.3) : 0.9;
      txt(g, 'ALARM', 1330, 455, '500 20px Mono', hx(col), 0.85 * ap, 'right', 3);
      g.fillStyle = rgba(hx(col), 0.9 * ap); g.beginPath(); g.arc(1310, 482, 6, 0, TAU); g.fill();
    }
    // reflection on table
    g.save(); g.globalAlpha = 0.14; g.translate(0, 662 * 2 + 30); g.scale(1, -1); seg7time(g, hh, mm, 662, 418, 150, col, Math.min(1, a), 1); g.restore();
    glow(g, 960, 700, 380, '#ff5a32', 0.12 * a, 'screen');
  }
};

// ---------- STREET at dawn: breakfast shop lights up ----------
SCENES.street = {
  init(sh) {
    const c = sh.c = {};
    c.strip = buildStreetStrip(23, 4200, 790);
    // paint a breakfast shop on the building that will be centred
    const tx = 1500; let b = c.strip.blds[0]; for (const q of c.strip.blds) if (Math.abs(q.x + q.w / 2 - tx) < Math.abs(b.x + b.w / 2 - tx)) b = q;
    c.shop = b; const g = c.strip.cv.getContext('2d');
    g.fillStyle = '#3a2c22'; g.fillRect(b.sx, b.sy + 8, b.sw, b.gh - 8);
    g.fillStyle = '#e8e2d6'; g.fillRect(b.sx, b.sy + 8, b.sw, 44);
    g.font = '500 28px Serif'; g.textAlign = 'center'; g.letterSpacing = '14px'; g.fillStyle = '#9a2a22'; g.fillText('早 点', b.sx + b.sw / 2, b.sy + 41);
    c.towers = makeCity({ w: 3000, h: 520, base: 520, minH: 160, maxH: 430, minW: 70, maxW: 150, gap: 26, seed: 66, col: '#5d6684', winProb: 0.05, winW: 3, winH: 3, winGX: 7, winGY: 9, winA: 0.8, scale: 1, edge: 'rgba(255,214,190,0.25)', keepWins: false });
    const r = mulberry32(8); c.lit = c.strip.wins.filter(() => r() < 0.28);
    c.steam = []; for (let i = 0; i < 40; i++) c.steam.push([r(), r(), r()]);
  },
  draw(g, lt, sh, t) {
    const c = sh.c, p = clamp(lt / sh.d);
    const day = ss(0, sh.d + 1, lt);
    const pan = 1500 - 960 / 0.75 + 140 - lt * 9;
    const sc = 0.75, base = 806;
    drawSky(g, 100, 640, skyCols('bluehour', 'dawn', day));
    glow(g, 1500, 640, 900, '#f2b48c', 0.15 + 0.3 * day, 'screen');
    g.drawImage(c.towers.sil, -400 - lt * 3, base - 110 - 520); g.drawImage(c.towers.win, -400 - lt * 3, base - 110 - 520);
    haze(g, 260, base - 80, '#8d8fae', 0.35 + 0.15 * day);
    // facades (scaled)
    g.drawImage(c.strip.cv, pan, 0, W / sc + 40, 800, -20, base - 790 * sc, W + 40 * sc, 800 * sc);
    // dawn light on facades: cool multiply, warming with time
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = rgba(mix([118, 126, 168], [196, 194, 206], day)); g.fillRect(-40, 0, W + 80, base + 4); g.restore();
    const X = (wx) => (wx - pan) * sc - 20, Yy = (wy) => base - 790 * sc + wy * sc;
    // lit windows fade as daylight comes
    g.save(); g.globalCompositeOperation = 'screen';
    for (const [wx, wy, ww, wh, k] of c.lit) { const off = k * 1.1 < day ? 0 : 1; if (!off) continue; const x = X(wx); if (x < -100 || x > W + 50) continue; g.fillStyle = `rgba(255,190,120,${0.55 * (1 - day * 0.6)})`; g.fillRect(x, Yy(wy), ww * sc, wh * sc); }
    g.restore();
    // breakfast shop: warm interior & sign
    const b = c.shop, sx = X(b.sx), sw = b.sw * sc, dy = Yy(b.dy), dh = b.dh * sc, signY = Yy(b.sy + 8);
    g.save(); g.globalCompositeOperation = 'screen';
    const ig = g.createLinearGradient(0, dy, 0, dy + dh); ig.addColorStop(0, 'rgba(255,190,120,0.75)'); ig.addColorStop(1, 'rgba(255,160,90,0.35)'); g.fillStyle = ig; g.fillRect(sx, dy, sw, dh);
    g.restore();
    g.fillStyle = 'rgba(60,40,30,0.6)'; g.fillRect(sx + 14, dy + dh * 0.55, sw - 28, 6); // counter
    // steamer stack + owner
    const stx = sx + sw * 0.72, sty = dy + dh;
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#b98f5e' : '#a37b4e'; rrect(g, stx - 30, sty - 16 - i * 14, 60, 14, 3); g.fill(); }
    g.fillStyle = '#8a6a44'; rrect(g, stx - 34, sty - 74, 68, 8, 4); g.fill();
    drawFigure(g, { x: sx + sw * 0.35, y: sty, h: 66, view: 'side', pose: 'stand', facing: 1, outfit: { top: '#e9e4da', pants: '#3a3a40', shoes: '#222', skin: '#d6ae94', hair: '#1c1714' }, light: { amb: [255, 214, 170], keyA: 0.2, rimA: 0.3, dir: [1, -0.2] }, detail: false, headDown: 0.3 + 0.1 * Math.sin(t * 1.3) });
    // sign: flickers on at ~52.26
    const on = t < 52.26 ? 0 : (t < 52.7 ? ((Math.floor((t - 52.26) * 18) % 3) ? 1 : 0.2) : 1);
    if (on > 0) {
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(255,236,210,${0.55 * on})`; g.fillRect(sx, signY, sw, 44 * sc); g.restore();
      txt(g, '早 点', sx + sw / 2, signY + 33 * sc, '500 21px Serif', [200, 40, 30], on, 'center', 10);
      glow(g, sx + sw / 2, signY + 16, 260, '#ffe2c0', 0.4 * on, 'screen');
    }
    glow(g, sx + sw / 2, dy + dh * 0.6, 280, '#ffb070', 0.35, 'screen');
    // steam
    g.save(); g.globalCompositeOperation = 'screen';
    for (const [a1, a2, a3] of c.steam) { const life = (t * 0.35 + a1) % 1; const x = stx + (a2 - 0.5) * 40 + Math.sin(t * 1.5 + a3 * 9) * 8 * life + life * 20; const y = sty - 78 - life * 180; softDisc(g, x, y, 14 + life * 46, '#fff1e2', 0.22 * (1 - life) * ss(0, 0.1, life), 'screen'); }
    g.restore();
    // far sidewalk + road
    g.fillStyle = rgba(mix([92, 96, 118], [176, 172, 168], day)); g.fillRect(-40, base, W + 80, 18);
    vgrad(g, -40, base + 18, W + 80, 1000, [[0, mix(hx('#3e4256'), hx('#6a6c72'), day)], [1, mix(hx('#2c2f3d'), hx('#55575c'), day)]]);
    g.fillStyle = `rgba(230,228,220,${0.35 + 0.3 * day})`; for (let x = -((lt * 6) % 200); x < W + 200; x += 200) g.fillRect(x, 900, 100, 6);
    // early pedestrians
    drawFigure(g, { x: 300 + lt * 22, y: base + 12, h: 64, view: 'side', pose: 'walk', ph: (lt * 1.0) % 1, outfit: randOutfit(mulberry32(5)), light: { amb: mix([150, 155, 185], [220, 214, 210], day), keyA: 0.1, rimA: 0.2 }, detail: false });
    drawFigure(g, { x: 1700 - lt * 18, y: base + 12, h: 60, view: 'side', pose: 'walk', facing: -1, ph: (lt * 0.95 + 0.4) % 1, outfit: randOutfit(mulberry32(9)), light: { amb: mix([150, 155, 185], [220, 214, 210], day), keyA: 0.1, rimA: 0.2 }, detail: false });
    // street lamp (foreground right), switches off ~55s
    const lampOn = t < 55.2 ? 1 : (t < 55.6 ? (Math.floor(t * 20) % 2) : 0);
    g.fillStyle = '#2a2d35'; g.fillRect(1560 - lt * 14, 260, 12, 760); g.fillRect(1560 - lt * 14 - 110, 262, 122, 8);
    g.fillStyle = lampOn ? '#ffd9a0' : '#8a8f9a'; rrect(g, 1560 - lt * 14 - 130, 266, 60, 12, 4); g.fill();
    if (lampOn) { glow(g, 1560 - lt * 14 - 100, 280, 420, '#ffb46a', 0.45, 'screen'); shaft(g, [[1560 - lt * 14 - 128, 278], [1560 - lt * 14 - 72, 278], [1560 - lt * 14 + 80, 960], [1560 - lt * 14 - 300, 960]], '#ffb46a', 0.12, 'screen'); }
  }
};

// ---------- DOOR: closing with the light slit ----------
SCENES.door = {
  draw(g, lt, sh, t) {
    const fast = !!sh.p.fast;
    const close = fast ? eio(clamp((lt - 0.15) / 1.3)) : eio(clamp((lt - 0.2) / 2.6));
    const z = 1 + 0.04 * clamp(lt / sh.d);
    g.translate(960, 560); g.scale(z, z); g.translate(-960, -560);
    // hallway walls
    vgrad(g, -60, -60, W + 120, 640, [[0, '#cfcbc2'], [1, '#bfbab0']]);
    vgrad(g, -60, 640, W + 120, 860, [[0, '#9da3a8'], [1, '#8e9499']]);
    g.fillStyle = 'rgba(0,0,0,0.06)'; for (let x = -60; x < W + 60; x += 60) g.fillRect(x, 640, 1.5, 220); for (let y = 640; y < 860; y += 60) g.fillRect(-60, y, W + 120, 1.5);
    g.fillStyle = '#e4e0d8'; g.fillRect(-60, 632, W + 120, 10);
    vgrad(g, -60, 860, W + 120, H + 60, [[0, '#8b8a86'], [1, '#6f6e6a']]);
    // stairwell window (left) with cool morning light
    vgrad(g, 160, 260, 220, 560, [[0, '#cfe0f0'], [1, '#a9bfd6']]);
    g.strokeStyle = '#e8e6e0'; g.lineWidth = 10; g.strokeRect(160, 260, 220, 300); g.fillStyle = '#e8e6e0'; g.fillRect(266, 260, 8, 300);
    glow(g, 270, 420, 700, '#d8e6f8', 0.35, 'screen');
    shaft(g, [[160, 560], [380, 560], [760, 1000], [300, 1000]], '#dfe9f6', 0.18, 'screen');
    // door frame + interior gap
    const fx = 760, fy = 250, fw = 420, fh = 610;
    g.fillStyle = '#d6d2c9'; g.fillRect(fx - 26, fy - 26, fw + 52, fh + 26);
    const gap = (1 - close) * 300;
    // interior (warm morning inside the apartment)
    const ig = g.createLinearGradient(fx, fy, fx, fy + fh); ig.addColorStop(0, '#f6e6cc'); ig.addColorStop(1, '#e2c39a');
    g.fillStyle = ig; g.fillRect(fx + fw - gap, fy, gap, fh);
    g.fillStyle = 'rgba(120,96,70,0.5)'; g.fillRect(fx + fw - gap + gap * 0.3, fy + fh * 0.35, Math.max(0, gap * 0.25), fh * 0.65); // coat rack shadow
    // door panel (security door)
    const dw = fw - gap;
    const dg = g.createLinearGradient(fx, 0, fx + dw, 0); dg.addColorStop(0, '#5b3a30'); dg.addColorStop(1, '#4a2e26');
    g.fillStyle = dg; g.fillRect(fx, fy, dw, fh);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.strokeRect(fx + 40 * dw / fw, fy + 60, dw - 80 * dw / fw, 210); g.strokeRect(fx + 40 * dw / fw, fy + 320, dw - 80 * dw / fw, 230);
    g.strokeStyle = 'rgba(255,220,190,0.12)'; g.lineWidth = 2; g.strokeRect(fx + 44 * dw / fw, fy + 64, dw - 88 * dw / fw, 210);
    // handle + peephole
    g.fillStyle = '#c9c4ba'; rrect(g, fx + dw - 60, fy + 330, 16, 70, 6); g.fill(); g.fillRect(fx + dw - 90, fy + 350, 40, 10);
    g.fillStyle = '#222'; g.beginPath(); g.arc(fx + dw / 2, fy + 170, 6, 0, TAU); g.fill();
    // red couplet / 福 sign on the door
    g.fillStyle = '#b8352c'; g.save(); g.translate(fx + dw / 2, fy + 250); g.rotate(Math.PI / 4); g.fillRect(-34, -34, 68, 68); g.restore();
    txt(g, '福', fx + dw / 2, fy + 265, '700 40px Serif', [232, 196, 120], 0.9, 'center');
    // light wedge on floor
    if (gap > 1) {
      g.save(); g.globalCompositeOperation = 'screen';
      const lg = g.createLinearGradient(0, fy + fh, 0, 1040); lg.addColorStop(0, 'rgba(255,214,160,0.55)'); lg.addColorStop(1, 'rgba(255,214,160,0)');
      g.fillStyle = lg; poly(g, [[fx + fw - gap, fy + fh], [fx + fw, fy + fh], [fx + fw + gap * 1.5 + 60, 1040], [fx + fw - gap * 0.6, 1040]]); g.fill();
      glow(g, fx + fw - gap / 2, fy + fh * 0.5, 200 + gap, '#ffd8a0', 0.25 * (gap / 300), 'screen');
      g.restore();
    }
    // doormat + shoes
    g.fillStyle = '#5a5047'; g.beginPath(); g.ellipse(fx + fw / 2, fy + fh + 50, 230, 26, 0, 0, TAU); g.fill();
    // sensor light: switches on at the click
    const clickT = fast ? 1.45 : 2.85;
    const lit = lt > clickT ? (lt < clickT + 0.25 ? (Math.floor(lt * 30) % 2) : 1) : 0;
    g.fillStyle = '#efece6'; g.beginPath(); g.arc(970, 120, 30, 0, Math.PI); g.fill();
    if (lit) { glow(g, 970, 130, 900, '#ffe2b0', 0.4, 'screen', 0.5); g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,214,160,0.35)'; g.fillRect(-60, -60, W + 120, H + 120); g.restore(); }
  }
};

// ---------- PHONE (alarms -> off -> bills) and FINANCE ----------
function phoneBokeh(seed, warm) {
  const c = mk(W, H), g = c.getContext('2d'), r = mulberry32(seed);
  vgrad(g, 0, 0, W, H, warm ? [[0, '#9cb4d0'], [0.45, '#d8d2c6'], [1, '#77777a']] : [[0, '#5a6680'], [1, '#2a2d38']]);
  const facs = warm ? ['#c9bba6', '#b8b3aa', '#a69686', '#d3cdbf', '#8f969c'] : ['#3c4256', '#2e3446', '#4a4f66'];
  for (let i = 0; i < 16; i++) { const x = r() * W, w = 140 + r() * 320, y = 120 + r() * 260; g.fillStyle = facs[i % facs.length]; g.fillRect(x, y, w, 900);
    for (let k = 0; k < 30; k++) { g.fillStyle = warm ? 'rgba(90,110,140,0.5)' : 'rgba(255,200,140,0.5)'; g.fillRect(x + 10 + (k % 4) * (w / 4), y + 20 + Math.floor(k / 4) * 70, w / 6, 36); } }
  g.fillStyle = warm ? '#6a6c70' : '#1d2029'; g.fillRect(0, H * 0.72, W, H * 0.3);
  for (const [x, y, c] of [[1500, 420, '#ff3a2a'], [1500, 470, '#3a2a2a'], [380, 640, '#ffd27a'], [1700, 700, '#ff5a3a'], [260, 700, '#fff2d8']]) { g.fillStyle = c; g.beginPath(); g.arc(x, y, 30, 0, TAU); g.fill(); }
  for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H * 0.9, rr = 20 + r() * 60; const col = r() < 0.5 ? '#ffd7a0' : r() < 0.5 ? '#ffffff' : '#ff8a6a'; g.globalCompositeOperation = 'screen'; g.fillStyle = col; g.globalAlpha = 0.08 + r() * 0.18; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  return blurred(c, 18, 0.5);
}
function uiToggle(g, x, y, on) { g.fillStyle = on > 0.5 ? '#3eaa66' : '#3a3a40'; rrect(g, x, y, 92, 54, 27); g.fill(); g.fillStyle = '#f4f4f2'; g.beginPath(); g.arc(x + 27 + 38 * on, y + 27, 22, 0, TAU); g.fill(); }
function drawPhoneUI(g, mode, t, opt = {}) {
  const w = 540, h = 1140;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (mode === 'alarms') {
    g.fillStyle = '#0c0c0f'; g.fillRect(0, 0, w, h);
    txt(g, opt.clock || '06:45', 44, 58, '500 26px Sans', [240, 240, 240], 1);
    g.fillStyle = '#eee'; g.fillRect(450, 40, 46, 22); g.fillRect(497, 46, 4, 10);
    txt(g, '闹钟', 44, 170, '400 58px Sans', [245, 245, 245], 1);
    const rows = [['06:00', '起床'], ['06:10', ''], ['06:20', '再不起就迟到了'], ['06:30', '真的要起了'], ['06:40', '最后一个']];
    rows.forEach(([tm, lb], i) => {
      const y = 230 + i * 170, off = ss(76.55 + i * 0.16, 76.7 + i * 0.16, t);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(44, y + 150, w - 44, 1.5);
      txt(g, tm, 44, y + 92, '300 80px Sans', [245, 245, 245], 1 - 0.55 * off);
      if (lb) txt(g, lb, 46, y + 134, '400 24px Sans', [170, 170, 176], 1 - 0.4 * off);
      uiToggle(g, w - 140, y + 52, 1 - off);
    });
  } else if (mode === 'lock') {
    const lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, '#2e3e5e'); lg.addColorStop(0.6, '#7b7f9a'); lg.addColorStop(1, '#d6a888'); g.fillStyle = lg; g.fillRect(0, 0, w, h);
    txt(g, '11月3日 星期一', w / 2, 168, '400 28px Sans', [255, 255, 255], 0.9, 'center', 2);
    txt(g, opt.clock || '06:47', w / 2, 300, '300 140px Sans', [255, 255, 255], 0.95, 'center');
    const cards = opt.cards || [];
    cards.forEach((cd, i) => {
      const a = eo(clamp((t - cd.t) / 0.45)); if (a <= 0) return;
      const y = 380 + i * 168 - (1 - a) * 60;
      g.globalAlpha = a; g.fillStyle = 'rgba(245,244,240,0.82)'; rrect(g, 24, y, w - 48, 148, 30); g.fill();
      g.fillStyle = cd.col; rrect(g, 48, y + 24, 40, 40, 10); g.fill();
      txt(g, cd.app, 104, y + 54, '400 22px Sans', [90, 90, 96], 1); txt(g, '现在', w - 52, y + 54, '400 20px Sans', [120, 120, 126], 1, 'right');
      txt(g, cd.title, 48, y + 98, '500 26px Sans', [30, 30, 34], 1); txt(g, cd.body, 48, y + 130, '400 22px Sans', [70, 70, 76], 1);
      g.globalAlpha = 1;
    });
  } else if (mode === 'bank') {
    g.fillStyle = '#f3f1ec'; g.fillRect(0, 0, w, h);
    txt(g, opt.clock || '07:26', 44, 58, '500 26px Sans', [30, 30, 30], 1);
    g.fillStyle = '#2f4f6e'; g.fillRect(0, 90, w, 330);
    txt(g, '账户余额（元）', 44, 170, '400 26px Sans', [220, 228, 236], 0.9);
    const items = opt.items, start = opt.start; let bal = start;
    items.forEach(it => { bal -= it.v * eo(clamp((t - it.t) / 0.5)); });
    const s = bal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    txt(g, '¥ ' + s, 44, 290, '300 74px Mono', [255, 255, 255], 1);
    txt(g, '本月收支明细', 44, 500, '500 28px Sans', [40, 40, 44], 1);
    items.forEach((it, i) => {
      const a = eo(clamp((t - it.t) / 0.35)); if (a <= 0) return;
      const y = 540 + i * 118; g.globalAlpha = a;
      g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(44, y + 104, w - 88, 1.5);
      g.fillStyle = it.col; g.beginPath(); g.arc(78, y + 52, 30, 0, TAU); g.fill();
      txt(g, it.name, 126, y + 46, '500 27px Sans', [36, 36, 40], 1); txt(g, it.sub, 126, y + 82, '400 21px Sans', [130, 130, 136], 1);
      txt(g, '-' + it.v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','), w - 44, y + 62, '400 32px Mono', [176, 60, 50], 1, 'right');
      g.globalAlpha = 1;
    });
  }
}
function drawPhoneInHand(g, scr, scrA, cx, cy, ph, rot, light) {
  const pw = ph * 0.474;
  g.save(); g.translate(cx, cy); g.rotate(rot);
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.filter = 'blur(20px)'; rrect(g, -pw / 2 + 20, -ph / 2 + 30, pw, ph, 60); g.fill(); g.filter = 'none';
  // body
  const bg = g.createLinearGradient(-pw / 2, 0, pw / 2, 0); bg.addColorStop(0, '#3a3c42'); bg.addColorStop(0.5, '#1b1c20'); bg.addColorStop(1, '#2c2e33');
  g.fillStyle = bg; rrect(g, -pw / 2 - 8, -ph / 2 - 8, pw + 16, ph + 16, 62); g.fill();
  g.fillStyle = '#050506'; rrect(g, -pw / 2, -ph / 2, pw, ph, 54); g.fill();
  g.save(); rrect(g, -pw / 2 + 10, -ph / 2 + 10, pw - 20, ph - 20, 46); g.clip();
  g.globalAlpha = scrA; g.drawImage(scr, -pw / 2 + 10, -ph / 2 + 10, pw - 20, ph - 20); g.globalAlpha = 1;
  // glass reflection
  const rg = g.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2); rg.addColorStop(0, 'rgba(255,255,255,0.10)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.02)'); rg.addColorStop(0.36, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(255,255,255,0.05)');
  g.fillStyle = rg; g.fillRect(-pw / 2, -ph / 2, pw, ph);
  g.restore();
  g.fillStyle = '#000'; rrect(g, -50, -ph / 2 + 22, 100, 28, 14); g.fill(); // island
  // hand: fingertips over the right edge, thumb along the left edge, palm below
  const skin = hx('#d9b39a'), sk2 = hx('#c08f74');
  const hg = g.createLinearGradient(-pw / 2 - 60, 0, pw / 2 + 60, 0); hg.addColorStop(0, rgba(mix(skin, light || [255, 255, 255], 0.12))); hg.addColorStop(1, rgba(sk2));
  g.fillStyle = hg;
  g.beginPath(); g.ellipse(0, ph / 2 + 70, pw * 0.66, 190, 0, 0, TAU); g.fill();
  for (let i = 0; i < 4; i++) { const fy = ph * (0.06 + i * 0.1); g.beginPath(); g.ellipse(pw / 2 + 4, fy, 26, ph * 0.043, 0.1, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,235,225,0.35)'; g.beginPath(); g.ellipse(pw / 2 - 6, fy - 4, 9, 14, 0.1, 0, TAU); g.fill(); g.fillStyle = hg; }
  g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 4; i++) g.fillRect(pw / 2 - 4, ph * (0.06 + i * 0.1) + ph * 0.035, 30, 3);
  g.fillStyle = hg; g.save(); g.translate(-pw / 2 - 6, ph * 0.3); g.rotate(0.22);
  g.beginPath(); g.ellipse(0, 0, 34, ph * 0.2, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,235,225,0.4)'; g.beginPath(); g.ellipse(8, -ph * 0.16, 12, 18, 0, 0, TAU); g.fill(); g.restore();
  // sleeve
  g.fillStyle = '#3d424b'; g.beginPath(); g.moveTo(-pw / 2 - 80, ph / 2 + 160); g.quadraticCurveTo(0, ph / 2 + 110, pw / 2 + 110, ph / 2 + 150); g.lineTo(pw / 2 + 120, ph / 2 + 400); g.lineTo(-pw / 2 - 90, ph / 2 + 400); g.closePath(); g.fill();
  g.restore();
}
SCENES.phone = {
  init(sh) { const c = sh.c = {}; c.bok = phoneBokeh(3, true); c.scr = mk(540, 1140); c.sg = c.scr.getContext('2d'); },
  draw(g, lt, sh, t) {
    const c = sh.c;
    g.drawImage(c.bok, -40 + lt * 3, -40, W + 80, H + 80);
    let mode = 'alarms', a = 1;
    if (t >= 77.55 && t < 81.46) { a = 1 - ss(77.55, 77.85, t); }
    if (t >= 81.46) { mode = 'lock'; a = ss(81.46, 81.75, t); }
    drawPhoneUI(c.sg, mode, t, { clock: fmtClock(hudMin(t)), cards: [
      { t: 81.8, app: '信用卡', col: '#c0443a', title: '本期账单 ¥3,486.20', body: '最后还款日 11月15日，请按时还款' },
      { t: 82.9, app: '房租提醒', col: '#3d6fa8', title: '本月房租 ¥2,800.00', body: '将于 3 天后自动扣款' },
      { t: 84.4, app: '消费贷', col: '#d08a2c', title: '本月应还 ¥1,120.00', body: '剩余 9 期' }] });
    const z = 1 + 0.05 * clamp(lt / sh.d);
    g.translate(1000, 560); g.scale(z, z); g.translate(-1000, -560);
    drawPhoneInHand(g, c.scr, a, 1000, 560, 760, -0.07 + 0.01 * Math.sin(t * 0.7), [255, 255, 255]);
    // screen glow onto surroundings
    glow(g, 1000, 560, 600, mode === 'lock' ? '#b8a8c0' : '#556070', 0.18 * a, 'screen');
    // reflections while screen is off
    if (a < 1) { g.save(); g.translate(1000, 560); g.rotate(-0.07); const rg = g.createLinearGradient(-180, -380, 180, 380); rg.addColorStop(0, `rgba(200,215,235,${0.16 * (1 - a)})`); rg.addColorStop(1, 'rgba(200,215,235,0)'); g.fillStyle = rg; rrect(g, -170, -370, 340, 740, 46); g.fill(); g.restore(); }
  }
};
SCENES.finance = {
  init(sh) { const c = sh.c = {}; c.bok = phoneBokeh(21, false); c.scr = mk(540, 1140); c.sg = c.scr.getContext('2d'); },
  draw(g, lt, sh, t) {
    const c = sh.c;
    g.drawImage(c.bok, -40 - lt * 30, -40, W + 80, H + 80);
    for (let i = 0; i < 5; i++) { const x = ((i * 520 - lt * 900) % 2600 + 2600) % 2600 - 300; streak(g, x, 300 + i * 90, 420, 18, [255, 230, 200], 0.12); }
    drawPhoneUI(c.sg, 'bank', t, { clock: fmtClock(hudMin(t)), start: 8532.6, items: [
      { t: 225.0, name: '房租', sub: '自动扣款', v: 2800, col: '#3d6fa8' },
      { t: 225.9, name: '信用卡还款', sub: '本期账单', v: 3486.2, col: '#c0443a' },
      { t: 226.8, name: '消费贷', sub: '第 3/12 期', v: 1120, col: '#d08a2c' },
      { t: 227.6, name: '水电燃气', sub: '生活缴费', v: 368, col: '#5a8a6a' }] });
    const z = 1.05 + 0.04 * clamp(lt / sh.d);
    g.translate(980, 560); g.scale(z, z); g.translate(-980, -560);
    drawPhoneInHand(g, c.scr, 1, 980, 600, 760, 0.05 + 0.012 * Math.sin(t * 2.1), [200, 210, 230]);
    glow(g, 980, 560, 600, '#e8e4dc', 0.18, 'screen');
  }
};

// ---------- ELEVATOR panel ----------
SCENES.elevator = {
  init(sh) {
    const c = sh.c = {}; const tx = mk(W, H), q = tx.getContext('2d'), r = mulberry32(4);
    vgrad(q, 0, 0, W, H, [[0, '#a9adb2'], [1, '#868a90']]);
    for (let y = 0; y < H; y += 2) { q.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.05})`; q.fillRect(0, y, W, 1); }
    for (let i = 0; i < 5; i++) { const x = 200 + i * 380 + r() * 100; const gr = q.createLinearGradient(x - 120, 0, x + 120, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = gr; q.fillRect(x - 120, 0, 240, H); }
    c.steel = tx;
  },
  draw(g, lt, sh, t) {
    const c = sh.c;
    const z = 1 + 0.08 * eio(clamp(lt / sh.d));
    g.translate(860, 760); g.scale(z, z); g.translate(-860, -760);
    g.drawImage(c.steel, -40, -40, W + 80, H + 80);
    glow(g, 960, 0, 1100, '#fff6ea', 0.25, 'screen');
    // panel
    const px = 700, py = 150, pw = 420, ph = 720;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px - 4, py - 4, pw + 8, ph + 8);
    const pg = g.createLinearGradient(px, 0, px + pw, 0); pg.addColorStop(0, '#b8bcc1'); pg.addColorStop(0.5, '#d3d6da'); pg.addColorStop(1, '#a8acb2'); g.fillStyle = pg; g.fillRect(px, py, pw, ph);
    // display
    g.fillStyle = '#0b0b0d'; rrect(g, px + 90, py + 26, 240, 104, 10); g.fill();
    const pressT = 89.0;
    let fl = 16; if (t > pressT + 0.6) fl = Math.max(1, 16 - Math.floor((t - pressT - 0.6) / 0.42));
    const s = String(fl).padStart(2, '0');
    seg7(g, +s[0], px + 150, py + 40, 58, '#ff4a2a', 0.95); seg7(g, +s[1], px + 212, py + 40, 58, '#ff4a2a', 0.95);
    if (t > pressT + 0.6) { g.fillStyle = '#ff4a2a'; g.beginPath(); g.moveTo(px + 112, py + 80); g.lineTo(px + 138, py + 80); g.lineTo(px + 125, py + 100); g.closePath(); g.fill(); }
    glow(g, px + 210, py + 100, 160, '#ff4a2a', 0.18, 'screen');
    // buttons 1..18 (2 cols), 1 at bottom-left
    let b1 = null;
    for (let i = 0; i < 18; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = px + 140 + col * 140, by = py + ph - 70 - row * 58;
      const lit = (i === 0 && t > pressT) ? 1 : 0;
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(bx + 1.5, by + 2, 26, 0, TAU); g.fill();
      const bgd = g.createRadialGradient(bx - 8, by - 8, 2, bx, by, 26); bgd.addColorStop(0, '#eceef0'); bgd.addColorStop(1, '#9ea2a8'); g.fillStyle = bgd; g.beginPath(); g.arc(bx, by, 24, 0, TAU); g.fill();
      g.strokeStyle = lit ? 'rgba(255,170,90,1)' : 'rgba(80,84,90,0.6)'; g.lineWidth = lit ? 4 : 2; g.beginPath(); g.arc(bx, by, 25, 0, TAU); g.stroke();
      txt(g, String(i + 1), bx, by + 9, '500 24px Sans', lit ? [255, 150, 70] : [60, 62, 66], 1, 'center');
      if (lit) glow(g, bx, by, 90, '#ff9a4a', 0.6, 'screen');
      if (i === 0) b1 = [bx, by];
    }
    // finger pressing "1"
    const k = ss(88.3, 88.95, t) * (1 - ss(89.45, 90.1, t));
    if (k > 0) {
      const fx = lerp(b1[0] + 420, b1[0] + 16, k), fy = lerp(b1[1] + 260, b1[1] + 30, k);
      g.save(); g.translate(fx, fy); g.rotate(-0.55);
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.filter = 'blur(10px)'; rrect(g, 10, 10, 60, 400, 30); g.fill(); g.filter = 'none';
      const fg = g.createLinearGradient(-30, 0, 30, 0); fg.addColorStop(0, '#e6c3aa'); fg.addColorStop(1, '#c4977c'); g.fillStyle = fg;
      rrect(g, -26, -10, 54, 230, 27); g.fill(); rrect(g, -60, 190, 150, 260, 60); g.fill();
      g.fillStyle = '#3d424b'; g.fillRect(-90, 400, 220, 300);
      g.fillStyle = 'rgba(255,240,230,0.5)'; rrect(g, -14, -4, 30, 34, 12); g.fill();
      g.restore();
    }
  }
};

// ---------- FAUCET (washing face) ----------
SCENES.faucet = {
  draw(g, lt, sh, t) {
    vgrad(g, -60, -60, W + 120, H + 120, [[0, '#dfe5ea'], [1, '#c7cfd6']]);
    g.fillStyle = 'rgba(0,0,0,0.06)'; for (let x = -60; x < W + 60; x += 120) g.fillRect(x, -60, 2, H + 120); for (let y = -60; y < H; y += 120) g.fillRect(-60, y, W + 120, 2);
    glow(g, 200, 200, 1200, '#f4f8ff', 0.4, 'screen');
    // basin
    g.fillStyle = '#f3f3f1'; g.beginPath(); g.ellipse(960, 860, 760, 260, 0, 0, TAU); g.fill();
    const bg = g.createRadialGradient(980, 820, 40, 960, 840, 600); bg.addColorStop(0, '#d7dbde'); bg.addColorStop(1, '#f6f6f4'); g.fillStyle = bg; g.beginPath(); g.ellipse(960, 840, 640, 190, 0, 0, TAU); g.fill();
    g.fillStyle = '#9aa0a6'; g.beginPath(); g.ellipse(980, 860, 30, 10, 0, 0, TAU); g.fill();
    // faucet
    const fg = g.createLinearGradient(0, 120, 0, 300); fg.addColorStop(0, '#f2f4f6'); fg.addColorStop(0.5, '#8d939a'); fg.addColorStop(1, '#d9dde1');
    g.fillStyle = fg; rrect(g, 1300, 120, 90, 380, 30); g.fill(); rrect(g, 940, 150, 420, 80, 40); g.fill();
    g.fillStyle = '#7b8188'; rrect(g, 948, 220, 70, 30, 10); g.fill();
    // water
    const wx = 983;
    g.save(); g.globalCompositeOperation = 'source-over';
    const wg = g.createLinearGradient(wx - 22, 0, wx + 22, 0); wg.addColorStop(0, 'rgba(190,210,225,0.35)'); wg.addColorStop(0.5, 'rgba(240,248,255,0.8)'); wg.addColorStop(1, 'rgba(170,195,215,0.35)');
    g.fillStyle = wg; g.beginPath(); g.moveTo(wx - 18, 248); g.lineTo(wx + 18, 248); g.lineTo(wx + 14, 820); g.lineTo(wx - 14, 820); g.closePath(); g.fill();
    for (let i = 0; i < 14; i++) { const y = 260 + ((i * 47 + t * 900) % 560); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(wx - 6 + Math.sin(i) * 6, y, 3, 30); }
    g.restore();
    // splash + ripples
    for (let i = 0; i < 4; i++) { const k = ((t * 1.6 + i / 4) % 1); g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(wx, 830, 30 + k * 220, 8 + k * 60, 0, 0, TAU); g.stroke(); }
    const r = mulberry32(Math.floor(t * 24));
    for (let i = 0; i < 20; i++) { const a = r() * Math.PI, d = r() * 120; g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(wx + Math.cos(a) * d, 820 - Math.sin(a) * d * 0.6, 2 + r() * 3, 0, TAU); g.fill(); }
    // mirror edge, cup + toothbrush, towel
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-60, -60, W + 120, 150); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-60, 90, W + 120, 4);
    g.fillStyle = '#9fb6c4'; rrect(g, 360, 560, 90, 130, 14); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(372, 570, 10, 110);
    g.fillStyle = '#e9e4da'; g.save(); g.translate(420, 560); g.rotate(-0.3); rrect(g, -6, -170, 12, 190, 6); g.fill(); g.fillStyle = '#5a8aa8'; rrect(g, -9, -200, 18, 50, 6); g.fill(); g.restore();
    const tw = g.createLinearGradient(1560, 0, 1760, 0); tw.addColorStop(0, '#d9cfc0'); tw.addColorStop(1, '#b8ad9c'); g.fillStyle = tw; rrect(g, 1560, 300, 200, 420, 18); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.08)'; for (let y = 320; y < 700; y += 16) g.fillRect(1570, y, 180, 2);
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(200,210,222,1)'; g.fillRect(-60, -60, W + 120, H + 120); g.restore();
    shaft(g, [[-60, 120], [400, 120], [1400, 1000], [200, 1000]], '#fff6e8', 0.16, 'screen');
  }
};
