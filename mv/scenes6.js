'use strict';
// =====================================================================
// Batch D: dream, window seat, city time-lapse, stairs, sunrise, avenue, crosswalk, end
// =====================================================================

// soft cumulus cloud sprite
function cloudSprite(w, h, seed, col) {
  const c = mk(w, h), g = c.getContext('2d'), r = mulberry32(seed);
  for (let i = 0; i < 28; i++) { const x = w * (0.15 + 0.7 * r()), y = h * (0.45 + 0.3 * r()) - Math.sin((x / w) * Math.PI) * h * 0.25, rr = h * (0.14 + 0.2 * r()); const gr = g.createRadialGradient(x, y - rr * 0.3, rr * 0.1, x, y, rr); gr.addColorStop(0, rgba(C(col), 0.95)); gr.addColorStop(1, rgba(C(col), 0)); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  return c;
}

// ---------- DREAM: lazy sunlit morning ----------
SCENES.dream = {
  init(sh) { const c = sh.c = {}; c.sheer = makeSheer(260, 700, '#fff6e6', 9); c.dap = mk(480, 270); c.dg = c.dap.getContext('2d'); },
  draw(g, lt, sh, t) {
    const c = sh.c;
    const z = 1.04 + 0.04 * Math.sin(lt * 0.12);
    g.translate(960, 540); g.scale(z, z); g.translate(-960 + lt * 3, -540);
    vgrad(g, -100, -60, W + 200, 860, [[0, '#dcc3a2'], [1, '#cfb390']]);
    // window
    const wx = 1060, wy = 170, ww = 620, wh = 560;
    drawSky(g, wy, wy + wh, skyCols('golden', 'day', 0.3), wx, ww);
    for (let i = 0; i < 3; i++) { const cl = (lt * 6 + i * 300) % 900; softDisc(g, wx + cl - 100, wy + 120 + i * 90, 140, '#fff8ee', 0.45, 'source-over'); }
    glow(g, wx + ww * 0.75, wy + 80, 300, '#fff4dc', 0.6, 'screen');
    g.strokeStyle = '#efe2cc'; g.lineWidth = 16; g.strokeRect(wx, wy, ww, wh); g.fillStyle = '#efe2cc'; g.fillRect(wx + ww / 2 - 7, wy, 14, wh);
    drawSheer(g, c.sheer, wx - 140, wy - 40, t, 28, 0.75); drawSheer(g, c.sheer, wx + ww - 120, wy - 40, t + 2, 24, 0.7);
    // dappled leaf light on the wall (low-res, blurred by upscale)
    const d = c.dg; d.setTransform(1, 0, 0, 1, 0, 0); d.clearRect(0, 0, 480, 270);
    const r = mulberry32(5);
    for (let i = 0; i < 70; i++) { const x = r() * 330 - 20 + Math.sin(t * 0.6 + i) * 3, y = r() * 200 + 10 + Math.cos(t * 0.5 + i * 1.3) * 2, rr = 3 + r() * 9; d.fillStyle = `rgba(255,214,150,${0.35 + r() * 0.4})`; d.beginPath(); d.ellipse(x, y, rr * 1.4, rr, r() * 3, 0, TAU); d.fill(); }
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.6; g.filter = 'blur(6px)'; g.drawImage(c.dap, -40, -20, W + 80, H); g.filter = 'none'; g.restore();
    // sun beams
    for (let i = 0; i < 3; i++) shaft(g, [[wx + 40 + i * 180, wy + 40], [wx + 140 + i * 180, wy + 40], [wx - 500 + i * 180, 1000], [wx - 760 + i * 180, 1000]], '#fff1d6', 0.1, 'screen');
    // bed in the foreground with the sleeper
    vgrad(g, -100, 860, W + 200, H + 60, [[0, '#b89c7c'], [1, '#9c8264']]);
    g.fillStyle = '#d8c6ae'; rrect(g, 120, 640, 1500, 420, 40); g.fill();
    g.fillStyle = '#f1e8da'; rrect(g, 180, 600, 380, 120, 50); g.fill(); g.fillStyle = 'rgba(200,180,150,0.25)'; rrect(g, 180, 670, 380, 50, 30); g.fill();
    // sleeper: head on the pillow (figure rotated to lie on its side)
    g.save(); g.translate(330, 700); g.rotate(-Math.PI / 2 + 0.08);
    drawFigure(g, { x: 0, y: 470, h: 520, view: 'side', pose: 'stand', facing: 1, outfit: OUTFITS.protHome, headDown: 0.2, light: { amb: [255, 238, 214], key: [255, 236, 200], keyA: 0.35, dir: [1, -0.5], rimA: 0.4, rim: [255, 240, 210] } });
    g.restore();
    // duvet over the body
    g.fillStyle = '#f2e9dc'; g.beginPath(); g.moveTo(420, 1080); g.bezierCurveTo(400, 760, 470, 660, 640, 650); g.bezierCurveTo(900, 640, 1100, 700, 1300, 690); g.bezierCurveTo(1500, 690, 1620, 760, 1640, 1080); g.closePath(); g.fill();
    const dg2 = g.createLinearGradient(0, 640, 0, 1000); dg2.addColorStop(0, 'rgba(255,230,190,0.0)'); dg2.addColorStop(1, 'rgba(180,150,120,0.35)'); g.fillStyle = dg2; g.fill();
    g.strokeStyle = 'rgba(190,165,135,0.35)'; g.lineWidth = 5; g.beginPath(); g.moveTo(700, 700); g.quadraticCurveTo(760, 820, 720, 1000); g.moveTo(1050, 690); g.quadraticCurveTo(1120, 840, 1180, 1000); g.stroke();
    dust(g, t, 90, 44, [300, 150, 1400, 800], '#fff4dc', 0.4, 2.4, (x, y) => clamp(1 - Math.abs(x + (y - 200) * 0.9 - 1250) / 520));
  }
};

// ---------- WINDOW SEAT: wasting an afternoon; phone buzz drains the colour ----------
SCENES.windowSeat = {
  init(sh) {
    const c = sh.c = {};
    c.clouds = [cloudSprite(520, 240, 3, '#fff3df'), cloudSprite(640, 260, 7, '#ffeeda'), cloudSprite(420, 200, 11, '#fff6e8')];
    c.roofs = makeCity({ w: 2400, h: 300, base: 300, minH: 50, maxH: 260, minW: 60, maxW: 180, gap: 14, seed: 141, col: '#8a8796', winProb: 0, scale: 1, edge: 'rgba(255,224,180,0.7)', shade: '#f0d6b6', shadeA: 0.45 });
  },
  draw(g, lt, sh, t) {
    const c = sh.c, bz = sh.p.buzz;
    const drain = ss(bz + 0.6, bz + 6.5, t); // golden -> dusk blue
    const z = 1 + 0.06 * eio(clamp(lt / sh.d));
    g.translate(980, 600); g.scale(z, z); g.translate(-980, -600);
    // interior wall
    const wall = mix(mix(hx('#d7b48e'), hx('#c9a07a'), 0.3), hx('#3e4258'), drain);
    vgrad(g, -60, -60, W + 120, H + 120, [[0, wall], [1, mix(wall, [0, 0, 0], 0.25)]]);
    // window
    const wx = 620, wy = 160, ww = 1160, wh = 640;
    g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
    const sky = skyCols('golden', null).map((col, i) => mix(col, skyCols('dusk', 'night', clamp((drain - 0.5) * 2))[i], drain));
    drawSky(g, wy, wy + wh, sky, wx, ww);
    glow(g, wx + ww * 0.8, wy + wh * 0.75, 700, mix([255, 220, 160], [240, 120, 90], drain), 0.5 * (1 - drain * 0.6), 'screen');
    const cs = lt * (12 + 140 * drain);
    c.clouds.forEach((cl, i) => { const x = ((wx - 600 + i * 520 + cs * (0.6 + i * 0.25)) % (ww + 800)) + wx - 400; g.globalAlpha = 0.85 * (1 - drain * 0.5); g.drawImage(cl, x, wy + 40 + i * 70); g.globalAlpha = 1; });
    g.drawImage(c.roofs.sil, wx - 200, wy + wh - 300 + 40);
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = rgba(mix([255, 255, 255], [90, 100, 150], drain)); g.fillRect(wx, wy, ww, wh); g.restore();
    // tree branch outside, swaying
    g.save(); g.translate(wx + 80, wy - 40); g.rotate(Math.sin(t * 0.8) * 0.02);
    g.strokeStyle = mix(hx('#5a4a3a'), hx('#1a1c26'), drain).map(Math.round).join(',').replace(/^/, 'rgb(') + ')'; g.lineWidth = 14; g.beginPath(); g.moveTo(-100, 0); g.quadraticCurveTo(200, 80, 420, 60); g.stroke();
    const lr = mulberry32(8); for (let i = 0; i < 46; i++) { const u = lr(); const bx = lerp(-60, 420, u), by = 40 + Math.sin(u * 3) * 30 + (lr() - 0.3) * 120; g.fillStyle = rgba(mix(mix(hx('#6f7a3e'), hx('#c9b060'), lr() * 0.6), hx('#20242c'), drain), 0.95); g.beginPath(); g.ellipse(bx + Math.sin(t * 1.5 + i) * 3, by, 26, 13, lr() * 3, 0, TAU); g.fill(); }
    g.restore();
    g.restore();
    // frame
    g.fillStyle = mix(hx('#efe3d0'), hx('#555a6c'), drain).map(Math.round).join(',').replace(/^/, 'rgb(') + ')';
    g.fillRect(wx - 18, wy - 18, ww + 36, 18); g.fillRect(wx - 18, wy - 18, 18, wh + 36); g.fillRect(wx + ww, wy - 18, 18, wh + 36); g.fillRect(wx + ww / 2 - 8, wy, 16, wh);
    // golden light patch on the bench/wall
    const sunA = 1 - drain;
    if (sunA > 0) { shaft(g, [[wx + 200, wy + 40], [wx + ww, wy + 40], [wx + 500, 1000], [wx - 400, 1000]], '#ffd9a0', 0.22 * sunA, 'screen'); }
    // window seat (bench + cushion)
    const by = 820;
    g.fillStyle = mix(hx('#e9dccb'), hx('#3a3e50'), drain).map(Math.round).join(',').replace(/^/, 'rgb(') + ')'; g.fillRect(wx - 120, by, ww + 260, 30);
    g.fillStyle = mix(hx('#bfa587'), hx('#2a2d3a'), drain).map(Math.round).join(',').replace(/^/, 'rgb(') + ')'; g.fillRect(wx - 120, by + 30, ww + 260, 300);
    g.fillStyle = mix(hx('#9fb0a0'), hx('#3a4458'), drain).map(Math.round).join(',').replace(/^/, 'rgb(') + ')'; rrect(g, wx - 40, by - 34, 520, 40, 18); g.fill();
    // plant + books
    g.fillStyle = '#b8835a'; g.fillRect(1640, by - 70, 70, 70); for (let i = 0; i < 9; i++) { g.fillStyle = rgba(mix(hx('#5d7a48'), hx('#22262e'), drain)); g.beginPath(); g.ellipse(1675 + Math.cos(i) * 40, by - 110 - (i % 3) * 30, 34, 14, i, 0, TAU); g.fill(); }
    g.fillStyle = rgba(mix(hx('#7a5a4a'), hx('#2a2a34'), drain)); g.fillRect(1180, by - 24, 160, 24); g.fillStyle = rgba(mix(hx('#d8cfc0'), hx('#555'), drain)); g.fillRect(1186, by - 40, 150, 16);
    // phone on the ledge; buzzes
    const px = 1420, ring = t > bz ? 1 : 0;
    const jit = ring && ((t - bz) % 1.2) < 0.6 ? Math.sin(t * 160) * 3 : 0;
    g.fillStyle = '#16171a'; rrect(g, px + jit, by - 12, 120, 12, 4); g.fill();
    if (ring) { const k = ((t - bz) % 1.2) / 1.2; glow(g, px + 60, by - 14, 220, '#cfe0ff', 0.6 * (1 - k * 0.5), 'screen'); g.strokeStyle = `rgba(220,232,255,${0.6 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(px + 60, by - 10, 40 + k * 120, 10 + k * 30, 0, 0, TAU); g.stroke(); }
    // figure on the ledge
    const look = ss(bz + 0.3, bz + 1.6, t);
    const info = drawFigure(g, { x: 760, y: by - 6, h: 460, view: 'side', pose: 'ledge', facing: 1, outfit: OUTFITS.protHome, headDown: lerp(-0.12, 0.42, look), lean: lerp(-0.2, -0.05, look),
      light: { amb: mix([240, 214, 186], [110, 118, 150], drain), key: mix([255, 214, 160], [170, 190, 240], drain), keyA: 0.45, dir: [1, -0.4], rim: mix([255, 222, 170], [180, 200, 255], drain), rimA: 0.7, rimDir: [1, -0.3], rimW: 0.008, shadowA: 0.3 } });
    // mug + steam
    if (info.hands) { const [hx_, hy_] = info.hands[0]; g.fillStyle = rgba(mix(hx('#e9e3d8'), hx('#6a6e80'), drain)); rrect(g, hx_ - 22, hy_ - 40, 44, 50, 8); g.fill(); g.strokeStyle = g.fillStyle; g.lineWidth = 6; g.beginPath(); g.arc(hx_ + 24, hy_ - 16, 12, -1.2, 1.2); g.stroke();
      if (drain < 0.5) for (let i = 0; i < 3; i++) { const k = ((t * 0.4 + i / 3) % 1); softDisc(g, hx_ + Math.sin(t * 2 + i) * 8, hy_ - 50 - k * 120, 16 + k * 20, '#fff8ee', 0.25 * (1 - k) * (1 - drain * 2), 'screen'); } }
    dust(g, t, 50, 77, [wx - 300, wy, ww, 700], '#ffe8c8', 0.3 * (1 - drain), 2.2);
  }
};

// ---------- CITY TIME-LAPSE: windows go dark through the night ----------
SCENES.cityTL = {
  init(sh) {
    const c = sh.c = {};
    c.far = makeCity({ w: 2400, h: 420, base: 420, minH: 40, maxH: 200, minW: 26, maxW: 100, gap: 3, seed: 211, col: '#1e2440', winProb: 0, scale: 0.6, shade: '#3a4268', shadeA: 0.3 });
    c.mid = makeCity({ w: 2400, h: 560, base: 560, minH: 70, maxH: 330, minW: 40, maxW: 130, gap: 6, seed: 223, col: '#10152a', winProb: 0.22, winW: 2.2, winH: 2.4, winGX: 3.6, winGY: 4.4, winA: 0.85, scale: 0.8, keepWins: true, redLights: true, tall: 0.14, edge: 'rgba(90,110,160,0.25)' });
    c.near = makeCity({ w: 2600, h: 760, base: 760, minH: 110, maxH: 400, minW: 70, maxW: 210, gap: 10, seed: 237, col: '#070a14', winProb: 0.2, winW: 3.2, winH: 4, winGX: 5.5, winGY: 6.5, winA: 0.95, scale: 1.1, keepWins: true, redLights: true, tall: 0.2, edge: 'rgba(80,100,150,0.25)' });
    c.stars = makeStars(220, 15, -100, 120, W + 200, 460);
    c.moon = crescent(20, '#ece6d6');
  },
  draw(g, lt, sh, t) {
    const c = sh.c, p = clamp(lt / sh.d);
    const pre = ss(0.72, 1.0, p);
    drawSky(g, 100, 900, skyCols('night', 'predawn', pre));
    drawStars(g, c.stars, t * 3, 0.9 * (1 - pre * 0.5));
    g.drawImage(c.moon, 300 + p * 1300 - 40, 300 - Math.sin(p * Math.PI) * 140 - 40);
    // fast clouds (time-lapse)
    for (let i = 0; i < 5; i++) { const x = ((i * 500 + lt * 260) % 2600) - 400; streak(g, x, 260 + i * 60, 520, 26, [120, 130, 170], 0.18); }
    glow(g, 900, 860, 1000, '#7a5a5a', 0.18 * (1 - p * 0.6), 'screen');
    g.drawImage(c.far.sil, -150, 780 - 420);
    haze(g, 520, 800, '#2e3458', 0.5);
    const drawW = (L, ox, oy) => {
      for (const w of L.wins) {
        if (w[0] === 'red') { if (((t + w[3] * 2) % 1.6) < 0.5) glow(g, w[1] + ox, w[2] + oy, 14, '#ff3a2a', 0.8); continue; }
        const [x, y, ww, wh, col, a, u] = w;
        const off = p * 1.1 > u + 0.06 ? 1 : 0;
        const early = pre > 0.4 && u > 0.93 && u < 0.97;
        if (off && !early) continue;
        g.fillStyle = rgba(col, a); g.fillRect(x + ox, y + oy, ww, wh);
      }
    };
    g.drawImage(c.mid.sil, -160, 860 - 560); drawW(c.mid, -160, 860 - 560);
    haze(g, 640, 880, '#232846', 0.5);
    g.drawImage(c.near.sil, -200, 1010 - 760); drawW(c.near, -200, 1010 - 760);
    // sparse traffic trails
    const hy = 940; g.save(); g.globalCompositeOperation = 'lighter';
    const nCars = Math.round(lerp(14, 3, p));
    for (let i = 0; i < nCars; i++) { const x = ((i * 397 + lt * 900) % 2400) - 240; streak(g, x, hy - (i % 2) * 6, 160, 3, i % 2 ? [255, 70, 50] : [255, 236, 200], 0.7); }
    g.restore();
    vgrad(g, -50, 760, W + 100, 1080, [[0, '#000', 0], [1, '#000', 0.5]]);
  }
};

// ---------- STAIRS up toward the daylight exit ----------
SCENES.stairs = {
  init(sh) { const c = sh.c = {}; c.crowd = makeCrowd(18, 77, { x0: -1.2, x1: 1.2, z0: 0, z1: 30 }); c.crowd.forEach((p, i) => { p.n = 6 + i * 2.2 + (i % 3) * 0.6; }); },
  draw(g, lt, sh, t) {
    const c = sh.c;
    const vx = 960, vy = 600, f = 760, TD = 0.3, RH = 0.16, HWd = 1.7, N = 52;
    const camN = lt * 1.6; // camera climbs
    const camZ = camN * TD - 1.2, camY = camN * RH + 1.55;
    const P = (x, y, z) => { const s = f / Math.max(0.2, z - camZ); return [vx + x * s, vy - (y - camY) * s]; };
    vgrad(g, -60, -60, W + 120, H + 120, [[0, '#8c8e92'], [1, '#5a5c60']]);
    // exit opening (top of stairs) - bright daylight
    const top = N * RH, zt = N * TD;
    const e1 = P(-HWd, top, zt), e2 = P(HWd, top + 3.0, zt);
    vgrad(g, e1[0], e2[1], e2[0] - e1[0], e1[1], [[0, '#cfe0f0'], [0.6, '#fff4e2'], [1, '#ffe2c0']]);
    // ceiling
    g.fillStyle = '#7a7c80'; poly(g, [P(-HWd, camY + 1.6, camZ + 0.3), P(HWd, camY + 1.6, camZ + 0.3), P(HWd, top + 3, zt), P(-HWd, top + 3, zt)]); g.fill();
    for (const lx of [-0.8, 0.8]) { g.strokeStyle = '#fffaf0'; g.lineWidth = 6; g.beginPath(); const a = P(lx, camY + 1.6, camZ + 0.6), b = P(lx, top + 3, zt); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    // side walls
    for (const s of [-1, 1]) { g.fillStyle = s < 0 ? '#9a9c9f' : '#8a8c90'; poly(g, [P(s * HWd, camY - 3, camZ + 0.3), P(s * HWd, camY + 1.6, camZ + 0.3), P(s * HWd, top + 3, zt), P(s * HWd, top, zt)]); g.fill(); }
    // steps far -> near
    for (let n = N - 1; n >= 0; n--) {
      const z0 = n * TD, z1 = (n + 1) * TD; if (z1 - camZ < 0.25) continue;
      const yR0 = n * RH, yR1 = (n + 1) * RH;
      const lit = clamp(1 - (N - n) / 30);
      g.fillStyle = rgba(mix([96, 98, 102], [190, 184, 172], lit)); poly(g, [P(-HWd, yR0, z0), P(HWd, yR0, z0), P(HWd, yR1, z0), P(-HWd, yR1, z0)]); g.fill(); // riser
      g.fillStyle = rgba(mix([150, 150, 150], [245, 238, 224], lit)); poly(g, [P(-HWd, yR1, z0), P(HWd, yR1, z0), P(HWd, yR1, z1), P(-HWd, yR1, z1)]); g.fill(); // tread
      g.fillStyle = 'rgba(214,178,58,0.7)'; poly(g, [P(-HWd, yR1, z0), P(HWd, yR1, z0), P(HWd, yR1, z0 + 0.04), P(-HWd, yR1, z0 + 0.04)]); g.fill();
    }
    // handrails
    for (const s of [-1, 1]) { g.strokeStyle = '#d7dadd'; g.lineWidth = 5; g.beginPath(); const a = P(s * (HWd - 0.08), camN * RH + 0.9 - 2, camZ + 0.3), b = P(s * (HWd - 0.08), top + 0.9, zt); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    glow(g, (e1[0] + e2[0]) / 2, (e1[1] + e2[1]) / 2, 700, '#fff6e6', 0.7, 'screen');
    // climbers
    const people = c.crowd.map(p => ({ p, n: Math.min(N + 2, p.n + lt * 1.5 * p.sp) })).concat([{ p: { x: 0.15, hm: 1.75, outfit: OUTFITS.protOut, hairStyle: 'short', bw: 1, ph: 0, sp: 1 }, n: camN + 9.5 }]);
    people.sort((a, b) => b.n - a.n);
    for (const { p, n } of people) {
      const z = n * TD + 0.15; if (z - camZ < 1.0) continue; if (n > N + 1) continue;
      const s = f / (z - camZ); const [x, y] = P(p.x, Math.floor(n) * RH + RH, z);
      const fog = clamp((n - camN) / 40);
      drawFigure(g, { x, y, h: p.hm * s, view: 'back', pose: 'walk', ph: (n * 0.5) % 1, outfit: p.outfit, hairStyle: p.hairStyle, bw: p.bw, detail: p.hm * s > 140,
        light: { amb: mix([170, 172, 178], [250, 244, 232], fog), key: [255, 248, 236], keyA: 0.1, dir: [0, -1], rim: [255, 246, 230], rimA: 0.7, rimDir: [0, -1], rimW: 0.01, shadowA: 0.2 }, alpha: 1 - fog * 0.4 });
    }
    const wo = ss(sh.d - 1.5, sh.d, lt); if (wo > 0) { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(255,250,240,${wo})`; g.fillRect(-60, -60, W + 120, H + 120); g.restore(); }
  }
};

// ---------- SUNRISE wide ----------
SCENES.sunrise = {
  init(sh) {
    const c = sh.c = {};
    c.far = makeCity({ w: 2600, h: 520, base: 520, minH: 60, maxH: 300, minW: 30, maxW: 120, gap: 4, seed: 311, col: '#8a7f96', winProb: 0, scale: 0.7, shade: '#f2c8a8', shadeA: 0.5 });
    c.mid = makeCity({ w: 2600, h: 620, base: 620, minH: 100, maxH: 460, minW: 50, maxW: 150, gap: 8, seed: 323, col: '#4d4a5e', winProb: 0.06, winW: 3, winH: 3, winGX: 5, winGY: 6, winA: 0.6, winCol: '#ffd9a0', scale: 0.9, tall: 0.2, edge: 'rgba(255,214,160,0.7)', shade: '#c79a88', shadeA: 0.5, stripProb: 0.3 });
    c.near = makeCity({ w: 2800, h: 760, base: 760, minH: 140, maxH: 420, minW: 80, maxW: 220, gap: 10, seed: 337, col: '#2a2836', winProb: 0.05, winW: 4, winH: 5, winGX: 7, winGY: 8, winA: 0.8, winCol: '#ffc98a', scale: 1.1, tall: 0.2, edge: 'rgba(255,200,140,0.8)', shade: '#7a5a5a', shadeA: 0.5 });
  },
  draw(g, lt, sh, t) {
    const c = sh.c;
    const z = 1 + 0.05 * clamp(lt / sh.d);
    g.translate(960, 600); g.scale(z, z); g.translate(-960, -600);
    drawSky(g, 100, 820, skyCols('sunrise', 'morning', ss(0, 8, lt) * 0.3));
    const sy = 700 - lt * 14;
    glow(g, 1180, sy, 1300, '#ffb878', 0.45, 'screen');
    g.drawImage(c.far.sil, -200 - lt * 2, 800 - 520);
    sunFlare(g, 1180, sy, 1.0, [255, 210, 160], 1);
    haze(g, 420, 820, '#f2c4a0', 0.55);
    g.drawImage(c.mid.sil, -220 - lt * 4, 880 - 620); g.drawImage(c.mid.win, -220 - lt * 4, 880 - 620);
    haze(g, 600, 900, '#d8a088', 0.4);
    g.drawImage(c.near.sil, -240 - lt * 8, 1020 - 760); g.drawImage(c.near.win, -240 - lt * 8, 1020 - 760);
    for (let i = 0; i < 9; i++) { const bx = 300 + i * 70 + lt * 50 + Math.sin(i) * 30, by = 380 + Math.sin(i * 2) * 40 - lt * 6, f = Math.sin(t * 8 + i) * 7; g.strokeStyle = 'rgba(60,46,50,0.7)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(bx - 12, by - f); g.lineTo(bx, by); g.lineTo(bx + 12, by - f); g.stroke(); }
  }
};

// ---------- AVENUE toward the sun ----------
SCENES.avenue = {
  init(sh) {
    const c = sh.c = {};
    c.crowd = makeCrowd(40, 911, { x0: -6, x1: 6, z0: 3, z1: 70, sp0: 1.1, sp1: 1.45 });
    c.crowd.push({ x: 0.3, z: 5.2, hm: 1.75, sp: 1.25, ph: 0.4, outfit: OUTFITS.protOut, hairStyle: 'short', bw: 1, prot: true, headDown: 0, dx: 0 });
    const r = mulberry32(4); c.bl = []; for (const s of [-1, 1]) { let z = 0; while (z < 200) { const d = 10 + r() * 16; c.bl.push({ s, z0: z, z1: z + d, h: 14 + r() * 30, col: rgba(mix(hx(['#b9ab98', '#a8a49c', '#c4b6a2', '#9a9fa6'][Math.floor(r() * 4)]), [0, 0, 0], 0.1)) }); z += d + (r() < 0.3 ? 4 : 0); } }
  },
  draw(g, lt, sh, t) {
    const c = sh.c, vx = 960, vy = 470, f = 760, camH = 1.6;
    const camZ = lt * 1.15;
    const P = (x, y, z) => { const s = f / Math.max(0.3, z - camZ); return [vx + x * s, vy + (camH - y) * s]; };
    drawSky(g, 100, vy + 20, skyCols('sunrise', 'morning', 0.4));
    // road + sidewalks
    vgrad(g, -60, vy, W + 120, H + 60, [[0, '#c6b9a8'], [1, '#7d7870']]);
    for (const s of [-1, 1]) { g.fillStyle = '#bdb4a6'; poly(g, [P(s * 6, 0, camZ + 0.5), P(s * 11, 0, camZ + 0.5), P(s * 11, 0, camZ + 300), P(s * 6, 0, camZ + 300)]); g.fill(); }
    for (let k = Math.floor(camZ / 8); k < Math.floor(camZ / 8) + 30; k++) { const z = k * 8; if (z - camZ < 0.6) continue; g.fillStyle = 'rgba(245,240,230,0.8)'; poly(g, [P(-0.1, 0, z), P(0.1, 0, z), P(0.1, 0, z + 3), P(-0.1, 0, z + 3)]); g.fill(); }
    // buildings
    const bls = c.bl.filter(b => b.z1 - camZ > 0.5).sort((a, b) => b.z0 - a.z0);
    for (const b of bls) {
      const s = b.s, x = s * 11;
      const q = [P(x, 0, Math.max(b.z0, camZ + 0.5)), P(x, b.h, Math.max(b.z0, camZ + 0.5)), P(x, b.h, b.z1), P(x, 0, b.z1)];
      g.fillStyle = b.col; poly(g, q); g.fill();
      g.fillStyle = 'rgba(70,80,96,0.35)';
      for (let fl = 1; fl * 3.2 < b.h - 1; fl++) for (let zz = b.z0 + 1; zz < b.z1 - 1; zz += 2.4) { if (zz - camZ < 0.8) continue; poly(g, [P(x, fl * 3.2, zz), P(x, fl * 3.2 + 1.6, zz), P(x, fl * 3.2 + 1.6, zz + 1.4), P(x, fl * 3.2, zz + 1.4)]); g.fill(); }
      // sunlit edge
      g.fillStyle = 'rgba(255,214,160,0.35)'; poly(g, [P(x, b.h - 0.3, Math.max(b.z0, camZ + 0.5)), P(x, b.h, Math.max(b.z0, camZ + 0.5)), P(x, b.h, b.z1), P(x, b.h - 0.3, b.z1)]); g.fill();
    }
    // the sun at the end of the avenue
    sunFlare(g, vx + 20, vy - 40, 1.1, [255, 214, 165], 1);
    haze(g, vy - 160, vy + 40, '#ffd8b0', 0.35);
    // crowd walking away, long shadows toward camera
    const list = c.crowd.map(p => { let z = p.prot ? camZ + 5.2 : p.z + lt * p.sp; if (!p.prot) { const span = 70; z = camZ + 2 + ((((z - camZ - 2) % span) + span) % span); } return { p, z }; }).sort((a, b) => b.z - a.z);
    for (const { p, z } of list) {
      const d = z - camZ; if (d < 1.4) continue;
      const s = f / d; const [x, y] = P(p.x, 0, z);
      const fog = clamp((d - 8) / 55);
      drawFigure(g, { x, y, h: p.hm * s, view: 'back', pose: 'walk', ph: (p.ph + lt * 0.92 * p.sp / 1.25) % 1, outfit: p.outfit, hairStyle: p.hairStyle, bw: p.bw, detail: p.hm * s > 140, earphones: p.prot && t > 364.4,
        light: { amb: mix([196, 186, 182], [255, 232, 206], fog), key: [255, 220, 170], keyA: 0.1, dir: [0, -1], rim: [255, 214, 160], rimA: 0.85, rimDir: [0, -1], rimW: 0.012, shadowA: 0.3 * (1 - fog) },
        shadow: d < 30 ? { a: 0.32 * (1 - fog), k: 0, sy: 1.1, blur: 3 } : null, alpha: 1 - fog * 0.5 });
    }
    g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,200,150,0.3)'; g.fillRect(-60, -60, W + 120, H + 120); g.restore();
  }
};

// ---------- CROSSWALK top-down, camera rising ----------
SCENES.crosswalk = {
  init(sh) {
    const c = sh.c = {}; const r = mulberry32(61);
    c.peds = [];
    for (let i = 0; i < 160; i++) {
      const axis = r() < 0.5 ? 'h' : 'v', side = r() < 0.5 ? -1 : 1, dir = r() < 0.5 ? -1 : 1;
      c.peds.push({ axis, side, dir, off: (r() - 0.5) * 3.2, start: r() * 26, sp: lerp(1.1, 1.6, r()), col: CROWD_COATS[Math.floor(r() * CROWD_COATS.length)], hair: HAIRS[Math.floor(r() * HAIRS.length)], pack: r() < 0.3 });
    }
    c.cars = []; for (let i = 0; i < 16; i++) c.cars.push({ lane: i % 4, k: Math.floor(i / 4), col: ['#e9e9ea', '#2a2c31', '#9aa1a8', '#5b2e2c', '#3d4a5e'][Math.floor(r() * 5)] });
  },
  draw(g, lt, sh, t) {
    const c = sh.c;
    const k = eio(clamp(lt / sh.d));
    const zoom = lerp(1.15, 0.5, k);
    const PX = 30 * zoom;
    g.translate(960, 540); g.rotate(-0.12 + lt * 0.004); g.scale(PX, PX); g.translate(0, lerp(16.5, 0, k));
    const R = 14, Wd = 140;
    // blocks (rooftops) and sidewalks
    g.fillStyle = '#b9b2a6'; g.fillRect(-Wd, -Wd, Wd * 2, Wd * 2);
    g.fillStyle = '#4a4c50'; g.fillRect(-Wd, -R, Wd * 2, R * 2); g.fillRect(-R, -Wd, R * 2, Wd * 2);
    const rr = mulberry32(12);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      for (let i = 0; i < 6; i++) { const bx = sx * (R + 6 + rr() * 50), by = sy * (R + 6 + rr() * 50), bw = 8 + rr() * 16, bh = 8 + rr() * 16; g.fillStyle = rgba(mix(hx('#8f8a84'), hx('#c9c2b6'), rr())); g.fillRect(bx - bw / 2, by - bh / 2, bw, bh); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(bx - bw / 2 + 1.2, by + bh / 2, bw, 2.2); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(bx - 1, by - 1, 2, 1.4); }
      // trees
      for (let i = 0; i < 6; i++) { const tx = sx * (R + 2.2), ty = sy * (R + 6 + i * 7); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(tx + 1.4, ty + 1.4, 2.4, 0, TAU); g.fill(); g.fillStyle = '#6c7a48'; g.beginPath(); g.arc(tx, ty, 2.3, 0, TAU); g.fill(); g.fillStyle = 'rgba(220,210,140,0.35)'; g.beginPath(); g.arc(tx - 0.6, ty - 0.6, 1.2, 0, TAU); g.fill(); }
    }
    // lane lines + crosswalk stripes
    g.fillStyle = 'rgba(240,236,226,0.85)';
    for (let x = R + 6; x < Wd; x += 6) { g.fillRect(x, -0.12, 3, 0.24); g.fillRect(-x - 3, -0.12, 3, 0.24); g.fillRect(-0.12, x, 0.24, 3); g.fillRect(-0.12, -x - 3, 0.24, 3); }
    for (let k = -R + 1; k < R - 1; k += 1.2) { g.fillRect(-R - 4.5, k, 3.6, 0.6); g.fillRect(R + 0.9, k, 3.6, 0.6); g.fillRect(k, -R - 4.5, 0.6, 3.6); g.fillRect(k, R + 0.9, 0.6, 3.6); }
    // cars waiting / moving (phase: horizontal pedestrians walk first)
    const phaseV = lt > 13;
    for (const car of c.cars) {
      const horiz = car.lane < 2, dir = car.lane % 2 ? 1 : -1;
      const moving = horiz ? !phaseV : phaseV;
      let along = -(R + 7 + car.k * 6.5);
      if (moving) along += Math.max(0, (lt - (horiz ? 0 : 13.5))) * 14;
      const lane = dir * 3.5;
      let x, y; if (horiz) { x = along * dir; y = lane; } else { y = along * dir; x = -lane; }
      g.save(); g.translate(x, y); if (!horiz) g.rotate(Math.PI / 2); if (dir < 0) g.rotate(Math.PI);
      g.fillStyle = 'rgba(0,0,0,0.3)'; rrect(g, -2.0, -0.85, 4.4, 2.0, 0.5); g.fill();
      g.fillStyle = car.col; rrect(g, -2.2, -0.95, 4.4, 1.9, 0.55); g.fill();
      g.fillStyle = 'rgba(30,40,55,0.85)'; rrect(g, 0.4, -0.8, 1.1, 1.6, 0.3); g.fill(); g.fillStyle = 'rgba(30,40,55,0.7)'; rrect(g, -1.6, -0.75, 0.7, 1.5, 0.25); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(-0.9, -0.85, 1.2, 1.7);
      g.restore();
    }
    // pedestrians (top-down) with long morning shadows
    for (const p of c.peds) {
      const walkH = p.axis === 'h' ? !phaseV : phaseV;
      const t0 = (p.axis === 'h' ? -2 : 12.5) + p.start * 0.3;
      let u = walkH ? (lt - t0) * p.sp * 2.6 : -1;
      if (u < 0 || u > R * 2 + 8) { // waiting at the corner
        const w = u < 0 ? -1 : 1; u = u < 0 ? -1.5 - (p.start % 3) : R * 2 + 8;
        if (u > R * 2) continue;
      }
      const along = -R - 4 + u;
      let x, y;
      if (p.axis === 'h') { x = along * p.dir; y = p.side * (R + 2.7) + p.off * 0.6; } else { y = along * p.dir; x = p.side * (R + 2.7) + p.off * 0.6; }
      const step = Math.sin((lt * p.sp * 5.5 + p.start) * Math.PI);
      const ang = p.axis === 'h' ? (p.dir > 0 ? 0 : Math.PI) : (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      g.save(); g.translate(x, y);
      g.fillStyle = 'rgba(20,20,30,0.28)'; g.save(); g.rotate(0.6); g.beginPath(); g.ellipse(1.6, 0, 1.7, 0.28, 0, 0, TAU); g.fill(); g.restore();
      g.rotate(ang);
      g.fillStyle = '#26272b'; g.beginPath(); g.ellipse(step * 0.25, 0.14, 0.17, 0.09, 0, 0, TAU); g.ellipse(-step * 0.25, -0.14, 0.17, 0.09, 0, 0, TAU); g.fill();
      g.fillStyle = p.col; g.beginPath(); g.ellipse(0, 0, 0.2, 0.32, 0, 0, TAU); g.fill();
      if (p.pack) { g.fillStyle = '#2b2d31'; rrect(g, -0.32, -0.2, 0.14, 0.4, 0.06); g.fill(); }
      g.fillStyle = p.hair; g.beginPath(); g.arc(0.02, 0, 0.13, 0, TAU); g.fill();
      g.restore();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,214,170,0.3)'; g.fillRect(0, 0, W, H); g.restore();
    glow(g, 200, 140, 1100, '#ffe2b8', 0.25, 'screen');
  }
};

// ---------- END card ----------
SCENES.end = {
  draw(g, lt, sh, t) {
    g.fillStyle = '#000'; g.fillRect(-60, -60, W + 120, H + 120);
    const a = ss(1.2, 2.2, lt) * (1 - ss(4.6, 5.4, lt)) * ((t % 1) < 0.55 ? 1 : 0.25);
    if (a > 0) { seg7time(g, 6, 0, 960 - 101, 500, 50, '#ff5c34', a, 1); glow(g, 960, 525, 220, '#ff4a2a', 0.15 * a, 'screen'); }
  }
};
