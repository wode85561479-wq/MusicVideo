'use strict';
// =====================================================================
// Batch B: platform, train interior, elevated train, tunnel, corridor
// =====================================================================

// ---------- shared: metro car side strip ----------
function makeTrainStrip(cars, carL, carH, stripe, seed, interiorCol, people) {
  const r = mulberry32(seed); const L = cars * carL;
  const cv = mk(L + 40, carH + 20), g = cv.getContext('2d');
  for (let k = 0; k < cars; k++) {
    const x0 = k * carL + 8, w = carL - 16;
    const bg = g.createLinearGradient(0, 0, 0, carH); bg.addColorStop(0, '#eef0f2'); bg.addColorStop(0.5, '#d4d8dc'); bg.addColorStop(1, '#a9aeb4');
    g.fillStyle = bg; rrect(g, x0, 4, w, carH - 8, carH * 0.08); g.fill();
    g.fillStyle = stripe; g.fillRect(x0, carH * 0.66, w, carH * 0.06); g.fillRect(x0, carH * 0.2, w, carH * 0.025);
    const nw = 4, ww = w / (nw * 1.55);
    for (let i = 0; i < nw * 2 - 1; i++) {
      const isDoor = i % 2 === 1; const cx = x0 + w * (i + 1) / (nw * 2);
      if (isDoor) {
        g.fillStyle = '#bfc4c9'; g.fillRect(cx - ww * 0.42, carH * 0.16, ww * 0.84, carH * 0.78);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx - 1, carH * 0.16, 2, carH * 0.78);
        g.fillStyle = interiorCol; g.fillRect(cx - ww * 0.34, carH * 0.24, ww * 0.26, carH * 0.32); g.fillRect(cx + ww * 0.08, carH * 0.24, ww * 0.26, carH * 0.32);
      } else {
        g.fillStyle = '#1e2024'; rrect(g, cx - ww / 2 - 4, carH * 0.24 - 4, ww + 8, carH * 0.38 + 8, 10); g.fill();
        g.fillStyle = interiorCol; rrect(g, cx - ww / 2, carH * 0.24, ww, carH * 0.38, 8); g.fill();
        if (people) for (let p = 0; p < 6; p++) { if (r() < 0.2) continue; const px = cx - ww / 2 + (p + 0.5) * ww / 6, ph = carH * (0.22 + r() * 0.06); g.fillStyle = 'rgba(30,32,40,0.75)'; g.beginPath(); g.ellipse(px, carH * 0.62 - ph + carH * 0.05, carH * 0.035, carH * 0.045, 0, 0, TAU); g.fill(); rrect(g, px - carH * 0.06, carH * 0.62 - ph + carH * 0.1, carH * 0.12, ph, carH * 0.03); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(cx - ww / 2, carH * 0.24, ww, 3);
      }
    }
    g.fillStyle = '#2a2c30'; g.fillRect(x0, carH - 10, w, 10);
  }
  return cv;
}

// ---------- PLATFORM: train arrives behind screen doors ----------
SCENES.platform = {
  init(sh) {
    const c = sh.c = {};
    c.train = makeTrainStrip(5, 1500, 520, '#b8443a', 7, '#f3eee2', true);
    c.blur = blurred(c.train, 0); // placeholder same
    const r = mulberry32(19);
    c.crowd = [];
    const xs = [150, 420, 700, 960, 1230, 1500, 1770];
    xs.forEach((x, i) => c.crowd.push({ x: x + (r() - 0.5) * 60, h: lerp(650, 740, r()), y: 1240 + r() * 40, of: i === 3 ? OUTFITS.protOut : randOutfit(r), hs: i === 3 ? 'short' : (r() < 0.5 ? 'short' : 'long'), ph: r() * 10, bw: lerp(0.95, 1.08, r()) }));
    c.crowd.sort((a, b) => a.y - b.y);
  },
  draw(g, lt, sh, t) {
    const c = sh.c;
    const arr = clamp(lt / 4.8), pos = 1 - Math.pow(1 - arr, 2.4); // 0..1 arrival
    const speed = arr < 1 ? 2.4 * Math.pow(1 - arr, 1.4) : 0;
    const trainX = lerp(W + 400, -1500, pos);
    // tunnel wall behind tracks
    vgrad(g, -60, 160, W + 120, 900, [[0, '#2b2f38'], [1, '#1d2027']]);
    for (let i = 0; i < 5; i++) { const x = 120 + i * 420; g.fillStyle = 'rgba(240,236,226,0.85)'; g.fillRect(x, 420, 260, 150); const ag = g.createLinearGradient(x, 420, x + 260, 570); ag.addColorStop(0, ['#c86a4a', '#4a7ab0', '#7aa86a', '#d0a040', '#8a6ab0'][i]); ag.addColorStop(1, 'rgba(255,255,255,0.4)'); g.fillStyle = ag; g.globalAlpha = 0.55; g.fillRect(x + 8, 428, 244, 134); g.globalAlpha = 1; }
    // train (motion blurred while moving)
    const ty = 270;
    if (trainX < W + 300) {
      const n = speed > 0.05 ? 8 : 1;
      for (let k = 0; k < n; k++) { g.globalAlpha = n > 1 ? 0.22 : 1; g.drawImage(c.train, trainX + k * speed * 28, ty); }
      g.globalAlpha = 1;
      if (speed > 0.05) { streak(g, trainX + 200, ty + 260, 900, 40, [255, 250, 240], 0.25 * speed); }
    }
    // headlights glow at front
    if (trainX > -100 && speed > 0.02) glow(g, trainX + 30, ty + 380, 300, '#fff4dc', 0.5 * Math.min(1, speed * 2));
    // screen doors: frames + glass + header
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(150,170,190,0.10)'; g.fillRect(-60, 220, W + 120, 660); g.restore();
    const doorOpen = ss(97.4, 98.4, t);
    for (let x = -60; x < W + 60; x += 320) {
      g.fillStyle = '#7d848c'; g.fillRect(x, 220, 14, 660);
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.moveTo(x + 40, 230); g.lineTo(x + 90, 230); g.lineTo(x + 30, 860); g.lineTo(x + 18, 860); g.fill();
    }
    // door opening (centre panel)
    if (doorOpen > 0) { const gw = 260 * doorOpen; g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(255,248,236,${0.25 * doorOpen})`; g.fillRect(960 - gw / 2, 230, gw, 640); g.restore(); }
    g.fillStyle = '#5e646c'; g.fillRect(-60, 160, W + 120, 64); g.fillStyle = '#121418'; g.fillRect(560, 176, 800, 34);
    const msg = t < 96 ? '列车进站  请勿靠近站台门' : '开往 城东方向  请先下后上';
    txt(g, msg, 960, 202, '400 24px Sans', [255, 170, 80], 0.95, 'center', 6);
    // ceiling lights
    vgrad(g, -60, 100, W + 120, 160, [[0, '#d9dcdf'], [1, '#b9bdc2']]);
    for (let x = 40; x < W; x += 360) { g.fillStyle = '#fffdf6'; g.fillRect(x, 132, 240, 12); glow(g, x + 120, 140, 260, '#fff8ea', 0.35, 'screen'); }
    // platform floor
    vgrad(g, -60, 870, W + 120, H + 60, [[0, '#bfc0bf'], [1, '#9c9d9c']]);
    g.fillStyle = '#d6b23a'; g.fillRect(-60, 880, W + 120, 26);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = -40; x < W; x += 24) g.fillRect(x, 884, 10, 18);
    // light from the passing train onto the crowd
    const trainLight = trainX < W ? (speed > 0.05 ? 0.5 + 0.5 * Math.abs(Math.sin(lt * 40)) : 0.8) : 0.15;
    for (const p of c.crowd) {
      const sway = Math.sin(t * 0.6 + p.ph) * 4;
      drawFigure(g, { x: p.x + sway, y: p.y, h: p.h, view: 'back', pose: 'stand', outfit: p.of, hairStyle: p.hs, bw: p.bw, headDown: 0.2,
        light: { amb: [205, 208, 216], key: [255, 252, 244], keyA: 0.15, dir: [0, -1], rim: [255, 248, 236], rimA: 0.25 + 0.45 * trainLight, rimW: 0.008, shadowA: 0.25 }, blur: p.y > 1260 ? 1.2 : 0 });
    }
  }
};

// ---------- TRAIN INTERIOR (side view across the car) ----------
SCENES.trainIn = {
  init(sh) {
    const c = sh.c = {}; const mode = sh.p.mode;
    c.city = makeCity({ w: 3200, h: 520, base: 520, minH: 140, maxH: 460, minW: 60, maxW: 170, gap: 18, seed: 41, col: mode === 'night' ? '#141a2e' : '#8f9fb4', winProb: mode === 'night' ? 0.18 : 0, winW: 4, winH: 5, winGX: 7, winGY: 8, winA: 0.9, scale: 1, edge: mode === 'night' ? 'rgba(80,100,150,0.3)' : 'rgba(255,240,220,0.6)', shade: mode === 'night' ? '#202840' : '#c9d2de', shadeA: 0.4 });
    const r = mulberry32(sh.i * 7 + 3);
    const n = mode === 'night' ? 3 : 8;
    c.people = [];
    const xs = mode === 'night' ? [520, 1000, 1480] : [90, 330, 580, 820, 1080, 1330, 1570, 1820];
    xs.forEach((x, i) => {
      const prot = mode === 'night' ? i === 1 : i === 4;
      const of = prot ? Object.assign({}, OUTFITS.protOut) : randOutfit(r); if (!prot) of.pack = null;
      c.people.push({ x: x + (prot ? 0 : (r() - 0.5) * 50), h: prot ? 660 : lerp(610, 690, r()), facing: prot ? 1 : (r() < 0.5 ? 1 : -1), pose: prot ? (mode === 'night' ? 'stand' : 'strap') : (r() < 0.45 ? 'strap' : r() < 0.6 ? 'phone' : 'stand'), of, hs: prot ? 'short' : (r() < 0.55 ? 'short' : r() < 0.5 ? 'long' : 'bun'), ph: r() * 10, prot });
    });
    c.fg = [{ x: -120, h: 900, of: randOutfit(r), facing: 1 }, { x: 2050, h: 920, of: randOutfit(r), facing: -1 }];
  },
  draw(g, lt, sh, t) {
    const c = sh.c, mode = sh.p.mode, night = mode === 'night', intense = !!sh.p.intense;
    const zoom = sh.p.close ? 1.32 : 1.0;
    const rock = Math.sin(t * 1.3) * 0.004 + (intense ? beatPulse(t, 0.15) * 0.003 : 0);
    g.translate(960, 600); g.rotate(rock); g.scale(zoom, zoom); g.translate(-960, -600 + (sh.p.close ? 60 : 0));
    const bp = beatPulse(t, 0.18) * (0.4 + af(t, 'bass'));
    // back wall
    vgrad(g, -100, 0, W + 200, H + 100, night ? [[0, '#3a3f4c'], [1, '#2a2e38']] : [[0, '#c9ccd0'], [1, '#a9adb3']]);
    // windows
    const wins = [[40, 250, 520, 330], [700, 250, 520, 330], [1360, 250, 520, 330]];
    for (const [x, y, w, h] of wins) {
      g.save(); rrect(g, x, y, w, h, 26); g.clip();
      if (mode === 'tunnel') {
        vgrad(g, x, y, w, y + h, [[0, '#1a1d24'], [1, '#0f1116']]);
        const sp = intense ? 3400 : 2600;
        for (let i = 0; i < 8; i++) { const lx = x + w - (((t * sp + i * 400) % 3200)); g.fillStyle = 'rgba(80,86,100,0.6)'; g.fillRect(lx, y + h * 0.3, 260, 3); g.fillRect(lx + 80, y + h * 0.72, 300, 2); }
        const bi = beatIdx(t), ph = bi >= 0 ? (t - AUD.beats[bi]) : 9;
        const lx = x + w + 200 - ph * 6000;
        streak(g, lx, y + h * 0.45, 420, 18, [255, 236, 200], 0.9 * (0.5 + af(t, 'bass')));
      } else {
        const cols = night ? skyCols('night', 'predawn', 0.3) : skyCols('morning', 'day', 0.8);
        drawSky(g, y - 10, y + h + 10, cols, x, w);
        const sx = -((t * (night ? 260 : 380)) % 1600);
        g.drawImage(c.city.sil, sx + x - 200, y + h - 400, 1600, 260); g.drawImage(c.city.sil, sx + x + 1400, y + h - 400, 1600, 260);
        if (night) { g.drawImage(c.city.win, sx + x - 200, y + h - 400, 1600, 260); g.drawImage(c.city.win, sx + x + 1400, y + h - 400, 1600, 260); }
        if (!night) { const sunx = x + w * 0.7, f = 0.5 + 0.5 * Math.sin(t * 9) * Math.sin(t * 3.1); glow(g, sunx, y + 70, 260, '#fff2d8', 0.5 * f, 'screen'); }
        for (let i = 0; i < 5; i++) { const px = x + w - ((t * 1400 + i * 700) % 2800); g.fillStyle = night ? 'rgba(20,22,30,0.9)' : 'rgba(90,96,104,0.9)'; g.fillRect(px, y, 24, h); }
      }
      g.restore();
      g.strokeStyle = night ? '#4a505c' : '#aeb3b8'; g.lineWidth = 10; rrect(g, x, y, w, h, 26); g.stroke();
      // reflection of interior on glass
      g.fillStyle = night ? 'rgba(200,210,230,0.08)' : 'rgba(255,255,255,0.08)'; rrect(g, x, y, w, h, 26); g.fill();
    }
    // ad strip + ceiling
    vgrad(g, -100, 60, W + 200, 190, night ? [[0, '#2a2e38'], [1, '#3e4350']] : [[0, '#eef0f1'], [1, '#d5d8db']]);
    const ads = ['#c06a4a', '#4a7ab0', '#7aa86a', '#d0a040', '#8a6ab0', '#3d8a8a'];
    for (let i = 0; i < 7; i++) { const x = 20 + i * 280; g.fillStyle = ads[i % 6]; g.globalAlpha = night ? 0.45 : 0.7; rrect(g, x, 186, 250, 52, 6); g.fill(); g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x + 16, 200, 120, 6); g.fillRect(x + 16, 214, 80, 5); }
    g.fillStyle = night ? '#e8eef8' : '#fffdf8'; g.fillRect(-100, 96, W + 200, 14);
    glow(g, 960, 103, 1400, night ? '#c8d4f0' : '#fff8ec', night ? 0.25 : 0.3, 'screen');
    // handrail + straps
    g.fillStyle = '#9ea4ab'; g.fillRect(-100, 268, W + 200, 10); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(-100, 268, W + 200, 2);
    for (const x of [200, 900, 1600]) { g.fillStyle = '#9ea4ab'; g.fillRect(x, 120, 8, 150); }
    for (let i = 0; i < 16; i++) {
      const x = 30 + i * 125, a = 0.1 * Math.sin(t * 1.7 + i * 0.5) + rock * 6;
      g.save(); g.translate(x, 276); g.rotate(a);
      g.fillStyle = '#3c4048'; g.fillRect(-5, 0, 10, 100);
      g.strokeStyle = '#e8e6e0'; g.lineWidth = 9; g.beginPath(); g.moveTo(-24, 150); g.lineTo(0, 100); g.lineTo(24, 150); g.closePath(); g.stroke();
      g.restore();
    }
    // seats under the windows (mostly hidden)
    g.fillStyle = night ? '#4a5a7a' : '#5a7090'; g.fillRect(-100, 640, W + 200, 60); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(-100, 700, W + 200, 400);
    // light sweep on beats (tunnel lights passing)
    if (mode === 'tunnel') { const k = bp * (intense ? 1.2 : 0.8); g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(255,236,206,${0.18 * k})`; g.fillRect(-100, -100, W + 200, H + 200); g.restore(); }
    // passengers
    const ambC = night ? [150, 158, 186] : [200, 204, 214];
    const L = (extra) => ({ amb: ambC, key: night ? [190, 210, 255] : [255, 252, 244], keyA: 0.25, dir: [0, -1], rim: mode === 'tunnel' ? [255, 232, 196] : (night ? [160, 190, 255] : [255, 246, 230]), rimA: 0.35 + extra, rimDir: [0, -1], rimW: 0.008, shadowA: 0.3 });
    const rim = mode === 'tunnel' ? 0.5 * bp : 0.25;
    for (const p of c.people) {
      const sway = Math.sin(t * 1.3 + p.ph) * 6 + rock * 900;
      const info = drawFigure(g, { x: p.x + sway, y: 1150, h: p.h, view: 'side', pose: p.pose, facing: p.facing, outfit: p.of, hairStyle: p.hs, headDown: p.prot ? 0.42 : undefined, lean: p.pose === 'stand' ? 0.03 : undefined, light: L(rim), glow: p.pose === 'phone' ? null : null });
      if (p.pose === 'phone' && info.hands) { const hd = info.hands[0]; g.fillStyle = '#16171a'; g.save(); g.translate(hd[0], hd[1]); g.rotate(-0.35 * p.facing); rrect(g, -14, -26, 28, 52, 5); g.fill(); g.fillStyle = 'rgba(200,220,255,0.85)'; rrect(g, -11, -23, 22, 46, 4); g.fill(); g.restore(); glow(g, hd[0], hd[1] - 20, 120, '#b8d0ff', 0.25, 'screen'); }
    }
    // blurred foreground passengers
    for (const p of c.fg) drawFigure(g, { x: p.x + Math.sin(t) * 5, y: 1500, h: p.h, view: 'back', pose: 'stand', outfit: p.of, light: Object.assign(L(0.1), { amb: night ? [90, 96, 120] : [150, 152, 160] }), blur: 7 });
  }
};

// ---------- ELEVATED train exterior ----------
SCENES.elevated = {
  init(sh) {
    const c = sh.c = {}; const tod = sh.p.tod;
    const warm = tod === 'river';
    c.far = makeCity({ w: 3200, h: 520, base: 520, minH: 120, maxH: 470, minW: 60, maxW: 170, gap: 20, seed: 52 + sh.i, col: warm ? '#7e8399' : '#8494aa', winProb: 0, scale: 1, edge: 'rgba(255,236,210,0.7)', shade: warm ? '#e8c8b0' : '#d6dee8', shadeA: 0.45, stripProb: 0.4 });
    c.near = makeCity({ w: 3200, h: 360, base: 360, minH: 60, maxH: 220, minW: 60, maxW: 200, gap: 10, seed: 77 + sh.i, col: warm ? '#7d7f90' : '#8d96a2', winProb: 0.35, winW: 8, winH: 10, winGX: 12, winGY: 14, winA: 0.5, winCol: '#c9d6e4', winCool: '#d8e4f0', scale: 1, edge: 'rgba(255,236,210,0.6)', shade: '#d0d8e2', shadeA: 0.5 });
    c.train = makeTrainStrip(6, 600, 150, sh.p.river ? '#2a8c8c' : '#b8443a', 11 + sh.i, '#f3ead6', true);
  },
  draw(g, lt, sh, t) {
    const c = sh.c, tod = sh.p.tod, river = !!sh.p.river;
    const sky = tod === 'river' ? skyCols('sunrise', 'morning', 0.3) : tod === 'morning2' ? skyCols('morning', 'day', 0.6) : skyCols('morning', 'day', 0.25);
    const horizon = river ? 600 : 640;
    drawSky(g, 100, horizon + 20, sky);
    const sunX = river ? 560 : 420, sunY = river ? 430 : 300;
    const pan = lt * 14;
    g.drawImage(c.far.sil, -300 - pan * 0.3, horizon - 520 + 30);
    haze(g, 300, horizon + 30, river ? '#f0d0b8' : '#dfe5ec', 0.3);
    sunFlare(g, sunX - pan * 0.3, sunY, river ? 0.7 : 0.45, river ? [255, 214, 170] : [255, 236, 210], 0.6);
    const deckY = river ? 520 : 560;
    if (!river) { vgrad(g, -60, horizon, W + 120, H + 60, [[0, '#a7a9a6'], [1, '#7d817f']]); g.drawImage(c.near.sil, -300 - pan * 0.6, H - 360 - 40); haze(g, 640, H, '#b9c2cc', 0.35); }
    else {
      // river with reflections
      vgrad(g, -60, horizon, W + 120, H + 60, [[0, '#c9b9b0'], [0.4, '#8f96a8'], [1, '#5c6578']]);
      g.drawImage(c.far.sil, -300 - pan * 0.3, horizon - 120, 3200, 120); // low far shore
      g.fillStyle = 'rgba(90,96,116,0.6)'; g.fillRect(-60, horizon, W + 120, 6);
      // sun reflection column
      for (let i = 0; i < 40; i++) { const y = horizon + 10 + i * 12, w = 30 + i * 6 + Math.sin(t * 3 + i) * 20; g.fillStyle = `rgba(255,224,180,${0.35 * (1 - i / 40)})`; g.fillRect(sunX - pan * 0.3 - w / 2 + Math.sin(t * 2 + i * 1.7) * 14, y, w, 3); }
      for (let i = 0; i < 60; i++) { const y = horizon + 20 + (i * 37 % 420), x = (i * 211 + t * 30) % W; g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, y, 60 + (i % 5) * 20, 2); }
    }
    // viaduct deck & pillars
    const tx = -c.train.width + (lt / sh.d) * (W + c.train.width + 200);
    g.fillStyle = river ? '#6d6a70' : '#8c8f96'; g.fillRect(-60, deckY + 150, W + 120, 34);
    g.fillStyle = 'rgba(255,240,220,0.35)'; g.fillRect(-60, deckY + 150, W + 120, 3);
    for (let x = -((pan * 0.9) % 520) - 60; x < W + 100; x += 520) { const pg = g.createLinearGradient(x, 0, x + 70, 0); pg.addColorStop(0, '#9a9da4'); pg.addColorStop(1, '#6a6d74'); g.fillStyle = pg; g.fillRect(x, deckY + 184, 70, H - deckY); }
    for (let x = -((pan * 0.9) % 180); x < W + 60; x += 180) { g.fillStyle = '#5a5d64'; g.fillRect(x, deckY + 40, 5, 110); }
    g.fillStyle = '#5a5d64'; g.fillRect(-60, deckY + 40, W + 120, 4);
    // the train
    g.drawImage(c.train, tx, deckY);
    // light on train side + sun glints in windows
    g.save(); g.globalCompositeOperation = 'screen'; const sg = g.createLinearGradient(0, deckY, 0, deckY + 150); sg.addColorStop(0, 'rgba(255,220,180,0.25)'); sg.addColorStop(1, 'rgba(255,220,180,0)'); g.fillStyle = sg; g.fillRect(tx, deckY, c.train.width, 150); g.restore();
    if (river) { // reflection of viaduct + train in water
      g.save(); g.globalAlpha = 0.28; g.translate(0, (deckY + 184) * 2 + 10); g.scale(1, -1); g.drawImage(c.train, tx, deckY); g.fillStyle = '#4a4850'; g.fillRect(-60, deckY + 150, W + 120, 34); g.restore();
    }
    // birds
    for (let i = 0; i < 5; i++) { const bx = ((i * 330 + lt * 60) % (W + 200)) - 100, by = 220 + i * 25 + Math.sin(t + i) * 10, f = Math.sin(t * 9 + i) * 6; g.strokeStyle = 'rgba(60,60,70,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx - 10, by - f); g.lineTo(bx, by); g.lineTo(bx + 10, by - f); g.stroke(); }
  }
};

// ---------- TUNNEL (cab view) + doors opening / build-up ----------
SCENES.tunnel = {
  draw(g, lt, sh, t) {
    const P = sh.p, build = !!P.build;
    const doorPhase = P.doors && t > P.doors - 1.25;
    if (!doorPhase) {
      // speed profile
      let v; if (build) v = lerp(14, 48, ei(clamp(lt / sh.d))); else v = lerp(26, 2, ss(0, (P.doors - 1.25) - sh.s, lt));
      const dist = build ? 14 * lt + 17 * Math.pow(lt, 2) / sh.d : 26 * lt - 0.5 * 24 * lt * lt / ((P.doors - 1.25) - sh.s);
      const vx = 960, vy = 520, f = 520;
      vgrad(g, -60, -60, W + 120, H + 120, [[0, '#07080b'], [1, '#0d0f14']]);
      // station light growing at the end (doors variant)
      if (!build) { const k = ss(0, (P.doors - 1.25) - sh.s, lt); glow(g, vx, vy, 200 + 900 * k, '#fff4e2', 0.2 + 0.7 * k, 'screen'); }
      // tunnel rings
      for (let i = 0; i < 40; i++) {
        const z = 40 - ((dist + i * 6) % 240) / 6 * 1; const zz = ((i * 6 - dist) % 240 + 240) % 240 + 1.5;
        const s = f / zz; const w = 3.2 * s, h = 2.8 * s;
        const a = clamp(1 - zz / 200) * 0.35;
        g.strokeStyle = `rgba(120,128,140,${a})`; g.lineWidth = Math.max(1, s * 0.04); g.beginPath(); g.ellipse(vx, vy - 0.4 * s, w, h, 0, Math.PI, TAU); g.lineTo(vx + w, vy + 1.6 * s); g.lineTo(vx - w, vy + 1.6 * s); g.closePath(); g.stroke();
      }
      // rails
      g.strokeStyle = 'rgba(190,196,206,0.55)'; g.lineWidth = 3;
      for (const rx of [-0.75, 0.75]) { g.beginPath(); g.moveTo(vx + rx * f / 1.2, H + 60); g.lineTo(vx + rx * f / 240, vy + 1.6 * f / 240); g.stroke(); }
      // wall lights streaking toward camera
      const sp = 12;
      for (let i = 0; i < 26; i++) {
        const zz = ((i * sp - dist) % (26 * sp) + 26 * sp) % (26 * sp) + 1.2; const zt = zz + Math.max(0.6, v * 0.05);
        for (const side of [-1, 1]) {
          const x1 = vx + side * 2.4 * f / zz, y1 = vy - 0.9 * f / zz, x2 = vx + side * 2.4 * f / zt, y2 = vy - 0.9 * f / zt;
          const a = clamp(1 - zz / 300);
          g.strokeStyle = `rgba(255,224,170,${0.9 * a})`; g.lineWidth = Math.max(1.5, 22 / zz * 4); g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
          if (zz < 30) glow(g, x1, y1, 400 / zz * 3, '#ffcf8a', 0.25 * a, 'screen');
        }
      }
      if (build) { const bp = beatPulse(t, 0.12) * (0.5 + af(t, 'bass')); g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(255,240,215,${0.3 * bp})`; g.fillRect(-60, -60, W + 120, H + 120); g.restore(); const wo = ss(sh.d - 0.9, sh.d, lt); if (wo > 0) { g.fillStyle = `rgba(255,250,240,${wo})`; g.fillRect(-60, -60, W + 120, H + 120); } }
      // cab frame
      g.fillStyle = '#050608'; g.fillRect(-60, -60, W + 120, 190); g.fillRect(-60, 900, W + 120, 200);
      g.fillRect(-60, -60, 150, H + 120); g.fillRect(W - 90, -60, 150, H + 120);
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(90, 130, W - 180, 3);
    } else {
      // doors close-up opening onto bright platform
      const k = eo(clamp((t - P.doors) / 0.9));
      vgrad(g, -60, -60, W + 120, H + 120, [[0, '#fff8ec'], [1, '#f2e8d8']]);
      glow(g, 960, 520, 900, '#ffffff', 0.6, 'screen');
      const gap = k * 700;
      for (const s of [-1, 1]) {
        const x = s < 0 ? 960 - gap / 2 - 760 : 960 + gap / 2;
        const dg = g.createLinearGradient(x, 0, x + 760, 0); dg.addColorStop(0, '#c5c9ce'); dg.addColorStop(0.5, '#dfe2e5'); dg.addColorStop(1, '#b4b9bf');
        g.fillStyle = dg; g.fillRect(x, 120, 760, 900);
        g.fillStyle = '#2a2d33'; rrect(g, x + (s < 0 ? 300 : 80), 230, 380, 360, 30); g.fill();
        g.fillStyle = 'rgba(255,250,240,0.85)'; rrect(g, x + (s < 0 ? 312 : 92), 242, 356, 336, 24); g.fill();
        g.fillStyle = '#e0a83a'; g.fillRect(x + (s < 0 ? 740 : 0), 120, 20, 900);
      }
      if (k < 0.02) txt(g, '', 0, 0, '10px Sans', [0, 0, 0], 0);
    }
  }
};

// ---------- CORRIDOR: crowd walking toward the bright exit ----------
SCENES.corridor = {
  init(sh) {
    const c = sh.c = {};
    c.crowd = makeCrowd(sh.p.forward ? 46 : 38, 300 + sh.i, { x0: -3.0, x1: 3.0, z0: 3, z1: 60, sp0: 1.1, sp1: 1.45 });
    c.crowd.push({ x: 0.25, z: 4.6, hm: 1.75, sp: 1.25, ph: 0.2, outfit: OUTFITS.protOut, hairStyle: 'short', bw: 1, prot: true, headDown: 1, dx: 0 });
    const r = mulberry32(9); c.ads = []; for (let i = 0; i < 14; i++) c.ads.push(['#c86a4a', '#4a7ab0', '#7aa86a', '#d0a040', '#8a6ab0', '#3d8a8a'][i % 6]);
  },
  draw(g, lt, sh, t) {
    const c = sh.c, fwd = !!sh.p.forward;
    const vx = 960, vy = 470, f = 760, camH = 1.6, HW = 4.2, CH = 3.4;
    const camZ = fwd ? lt * 1.25 : lt * 0.35;
    const P = (x, y, z) => { const s = f / Math.max(0.3, z - camZ); return [vx + x * s, vy + (camH - y) * s]; };
    // base
    vgrad(g, -60, -60, W + 120, H + 120, [[0, '#cfd2d4'], [1, '#a9acaf']]);
    // floor
    const fn = P(-HW, 0, camZ + 0.4), fn2 = P(HW, 0, camZ + 0.4), ff = P(-HW, 0, camZ + 90), ff2 = P(HW, 0, camZ + 90);
    vgrad(g, -60, vy, W + 120, H + 60, [[0, '#d8d4cc'], [1, '#9c9890']]);
    // walls
    const wallL = [P(-HW, 0, camZ + 0.4), P(-HW, CH, camZ + 0.4), P(-HW, CH, camZ + 90), P(-HW, 0, camZ + 90)];
    const wallR = [P(HW, 0, camZ + 0.4), P(HW, CH, camZ + 0.4), P(HW, CH, camZ + 90), P(HW, 0, camZ + 90)];
    g.fillStyle = '#bfc3c6'; poly(g, wallL); g.fill(); poly(g, wallR); g.fill();
    g.fillStyle = '#e6e7e6'; poly(g, [P(-HW, CH, camZ + 0.4), P(HW, CH, camZ + 0.4), P(HW, CH, camZ + 90), P(-HW, CH, camZ + 90)]); g.fill();
    // ceiling light strips
    for (const lx of [-1.6, 0, 1.6]) { const a = P(lx - 0.12, CH - 0.01, camZ + 0.5), b = P(lx + 0.12, CH - 0.01, camZ + 0.5), cc = P(lx + 0.12, CH - 0.01, camZ + 90), d = P(lx - 0.12, CH - 0.01, camZ + 90); g.fillStyle = '#fffdf6'; poly(g, [a, b, cc, d]); g.fill(); }
    // wall ad lightboxes
    for (let i = 0; i < 14; i++) {
      const z0 = Math.floor(camZ / 7) * 7 + i * 7 + 3;
      for (const s of [-1, 1]) {
        const q = [P(s * HW, 0.7, z0), P(s * HW, 2.3, z0), P(s * HW, 2.3, z0 + 3.6), P(s * HW, 0.7, z0 + 3.6)];
        if (z0 - camZ < 0.5) continue;
        g.fillStyle = '#f7f5ef'; poly(g, q); g.fill();
        g.globalAlpha = 0.45; g.fillStyle = c.ads[(i + (s > 0 ? 3 : 0) + Math.floor(camZ / 7)) % 14]; poly(g, q); g.fill(); g.globalAlpha = 1;
      }
    }
    // floor reflections of lights
    g.save(); g.globalCompositeOperation = 'screen';
    for (const lx of [-1.6, 0, 1.6]) { const a = P(lx - 0.2, 0, camZ + 1), b = P(lx + 0.2, 0, camZ + 1), cc = P(lx + 0.05, 0, camZ + 60), d = P(lx - 0.05, 0, camZ + 60); const gr = g.createLinearGradient(0, a[1], 0, cc[1]); gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(1, 'rgba(255,255,255,0.35)'); g.fillStyle = gr; poly(g, [a, b, cc, d]); g.fill(); }
    g.restore();
    // exit (stairs to daylight) at the far end
    const ex = P(-2.2, 0, camZ + 58), ex2 = P(2.2, 3.0, camZ + 58);
    g.fillStyle = '#fffaf0'; g.fillRect(ex[0], ex2[1], ex2[0] - ex[0], ex[1] - ex2[1]);
    glow(g, vx, (ex[1] + ex2[1]) / 2, 520, '#fff6e6', 0.85, 'screen'); glow(g, vx, (ex[1] + ex2[1]) / 2, 140, '#ffffff', 0.9, 'screen');
    // crowd: walking away
    const list = c.crowd.map(p => {
      let z = p.prot ? camZ + 4.6 + Math.sin(lt * 0.3) * 0.1 : p.z + lt * (fwd ? p.sp * 0.95 : p.sp);
      if (!p.prot) { const span = 60; z = camZ + 2 + ((((z - camZ - 2) % span) + span) % span); }
      return { p, z };
    }).sort((a, b) => b.z - a.z);
    for (const { p, z } of list) {
      const d = z - camZ; if (d < 1.2) continue;
      const s = f / d; const [x, y] = P(p.x + p.dx * Math.sin(lt * 0.5), 0, z);
      const fog = clamp((d - 6) / 45);
      drawFigure(g, { x, y, h: p.hm * s, view: 'back', pose: 'walk', ph: (p.ph + lt * 0.92 * p.sp / 1.25) % 1, outfit: p.outfit, hairStyle: p.hairStyle, bw: p.bw, headDown: p.headDown ? 0.3 : 0, detail: p.hm * s > 140,
        light: { amb: mix([186, 190, 198], [250, 246, 238], fog), key: [255, 250, 240], keyA: 0.1, dir: [0, -1], rim: [255, 248, 236], rimA: 0.5 + 0.3 * (1 - fog), rimDir: [0, -1], rimW: 0.01, shadowA: 0.25 * (1 - fog) },
        shadow: d < 25 ? { a: 0.22 * (1 - fog), k: 0, sy: 0.55, blur: 3 } : null, alpha: 1 - fog * 0.55 });
    }
    // haze toward the exit
    glow(g, vx, vy, 700, '#fffaf0', 0.35, 'screen');
    // interlude overexposure
    if (!fwd) { const wo = ss(sh.d - 5.0, sh.d, lt); if (wo > 0) { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(255,250,240,${wo})`; g.fillRect(-60, -60, W + 120, H + 120); g.restore(); } }
  }
};
