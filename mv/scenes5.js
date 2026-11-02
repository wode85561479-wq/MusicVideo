'use strict';
// =====================================================================
// Batch C: chat screen, office day/night, wall clock, chat input, concourse
// =====================================================================

// ---------- chat UI renderer (light theme) ----------
const AV_COLS = ['#d0806a', '#6a8fc0', '#7aa86a', '#c9a040', '#8a6ab0', '#3d8a8a', '#b0606a'];
function chatAvatar(g, x, y, r, ch, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); txt(g, ch, x, y + r * 0.36, `500 ${Math.round(r)}px Sans`, [255, 255, 255], 0.95, 'center'); }
function wrapText(g, s, maxW) { const out = []; let line = ''; for (const ch of s) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; } if (line) out.push(line); return out; }
function bubble(g, x, y, text, mine, scale = 1, a = 1) {
  g.save(); g.globalAlpha = a; g.font = `400 ${Math.round(26 * scale)}px Sans`;
  const lines = wrapText(g, text, 420 * scale); const lw = Math.max(...lines.map(l => g.measureText(l).width));
  const bw = lw + 36 * scale, bh = lines.length * 38 * scale + 24 * scale;
  const bx = mine ? x - bw : x;
  g.fillStyle = mine ? '#b9e3c2' : '#ffffff'; rrect(g, bx, y, bw, bh, 10 * scale); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.05)'; rrect(g, bx, y + bh - 2, bw, 2, 1); g.fill();
  g.fillStyle = '#1e2024'; lines.forEach((l, i) => g.fillText(l, bx + 18 * scale, y + (38 * i + 41) * scale - 6 * scale));
  g.restore(); return bh;
}
function drawChatUI(g, t, st) {
  const w = 1280, h = 760;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  g.fillStyle = '#f4f4f3'; g.fillRect(0, 0, w, h);
  // sidebar
  g.fillStyle = '#e7e7e6'; g.fillRect(0, 0, 320, h);
  g.fillStyle = '#d9d9d8'; rrect(g, 20, 20, 280, 40, 8); g.fill(); txt(g, '搜索', 44, 47, '400 20px Sans', [140, 140, 144], 1);
  st.side.forEach((it, i) => {
    const y = 80 + i * 82;
    if (it.sel) { g.fillStyle = '#d4d4d3'; g.fillRect(0, y, 320, 82); }
    chatAvatar(g, 52, y + 41, 26, it.name[0], it.col);
    txt(g, it.name, 92, y + 34, '500 21px Sans', [36, 36, 40], 1);
    txt(g, it.prev, 92, y + 62, '400 17px Sans', [140, 140, 146], 1);
    if (it.n > 0) { g.fillStyle = '#e0483c'; const bw = it.n > 9 ? 34 : 24; rrect(g, 290 - bw, y + 18, bw, 24, 12); g.fill(); txt(g, String(it.n > 99 ? '99+' : it.n), 290 - bw / 2, y + 36, '500 15px Sans', [255, 255, 255], 1, 'center'); }
  });
  // header
  g.fillStyle = '#f4f4f3'; g.fillRect(320, 0, w - 320, 70); g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(320, 70, w - 320, 1.5);
  txt(g, st.title, 350, 46, '500 24px Sans', [30, 30, 34], 1);
  // clock top-right
  const ck = st.clockHi || 0;
  if (ck > 0) { g.fillStyle = `rgba(255,214,120,${0.55 * ck})`; rrect(g, w - 132, 16, 112, 40, 8); g.fill(); }
  txt(g, st.clock, w - 28, 46, `500 ${Math.round(22 + 6 * ck)}px Mono`, [40, 40, 44], 1, 'right');
  // messages (optionally bottom-aligned like a real chat window)
  let y = 96;
  if (st.bottom) { g.save(); g.font = '400 26px Sans'; let tot = 0; for (const m of st.msgs) { if (t < m.t) continue; tot += wrapText(g, m.text, 420).length * 38 + 24 + (st.group && !m.mine ? 44 : 30); } g.restore(); y = h - 170 - tot; }
  for (const m of st.msgs) {
    const a = eo(clamp((t - m.t) / 0.3)); if (a <= 0) continue;
    const yy = y + (1 - a) * 18;
    if (!m.mine) { chatAvatar(g, 362, yy + 24, 22, m.who[0], m.col); if (st.group) txt(g, m.who, 396, yy + 12, '400 16px Sans', [150, 150, 154], a); }
    else chatAvatar(g, w - 42, yy + 24, 22, '我', '#8a9aa8');
    const bh = bubble(g, m.mine ? w - 76 : 396, yy + (st.group && !m.mine ? 20 : 0), m.text, m.mine, 1, a);
    if (m.mine && m.read && t > m.read) txt(g, '已读', w - 80, yy + bh + 22, '400 15px Sans', [150, 150, 154], 1, 'right');
    y += bh + (st.group && !m.mine ? 44 : 30);
  }
  // input
  g.fillStyle = '#ffffff'; g.fillRect(320, h - 150, w - 320, 150); g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(320, h - 150, w - 320, 1.5);
  const typed = st.input || '';
  txt(g, typed, 350, h - 96, '400 26px Sans', [30, 30, 34], 1);
  g.save(); g.font = '400 26px Sans'; const cw = g.measureText(typed).width; g.restore();
  if ((t * 2) % 2 < 1.2) { g.fillStyle = '#2a7ae2'; g.fillRect(352 + cw, h - 122, 2.5, 34); }
  g.fillStyle = typed ? '#3a9a5a' : '#c9c9c9'; rrect(g, w - 130, h - 60, 100, 40, 8); g.fill(); txt(g, '发送', w - 80, h - 33, '500 19px Sans', [255, 255, 255], 1, 'center');
}
function typedAt(t, text, t0, t1) { const n = [...text].length; const k = Math.floor(clamp((t - t0) / (t1 - t0)) * n + 1e-6); return [...text].slice(0, k).join(''); }

// ---------- CHAT: over-the-shoulder monitor ----------
SCENES.chat = {
  init(sh) {
    const c = sh.c = {}; c.ui = mk(1280, 760); c.ug = c.ui.getContext('2d');
    const bg = mk(W, H), q = bg.getContext('2d');
    vgrad(q, 0, 0, W, H, [[0, '#d9dde0'], [1, '#b4b6b4']]);
    q.fillStyle = '#eef3f8'; q.fillRect(1100, 0, 900, 700); q.fillStyle = '#c4ccd6'; for (let x = 1100; x < W; x += 180) q.fillRect(x, 0, 10, 700);
    for (let i = 0; i < 6; i++) { q.fillStyle = ['#5a6b4a', '#4a5a40', '#6a7a52'][i % 3]; q.beginPath(); q.arc(200 + i * 300, 640, 80 + (i % 3) * 30, 0, TAU); q.fill(); }
    q.fillStyle = '#8a8e94'; q.fillRect(0, 700, W, 400);
    c.bg = blurred(bg, 16, 0.5);
  },
  draw(g, lt, sh, t) {
    const c = sh.c;
    g.drawImage(c.bg, -40, -40, W + 80, H + 80);
    glow(g, 1600, 260, 900, '#fff6e6', 0.45, 'screen');
    // UI state
    const groupMsgs = [
      { t: 144.9, who: '王姐', col: AV_COLS[0], text: '早，昨天那版改好了吗？' },
      { t: 145.5, who: '部门群', col: AV_COLS[1], text: '@所有人 十点开会，别迟到' },
      { t: 146.1, who: '小周', col: AV_COLS[2], text: '数据表麻烦再核对一下' },
      { t: 146.8, who: '王姐', col: AV_COLS[0], text: '客户那边又在催了' },
      { t: 147.6, who: '小周', col: AV_COLS[2], text: '[文件] 方案_v7_最终版_改2.pptx' },
      { t: 148.4, who: '部门群', col: AV_COLS[1], text: '收到请回复' },
    ];
    const boss = t >= 149.4;
    const unread = (k) => Math.floor(clamp((t - 144.8) / 4.6) * k);
    const st = {
      title: boss ? '陈经理' : '项目组（12）', group: !boss, clock: fmtClock(hudMin(t)), clockHi: ss(152.9, 153.3, t) * (1 - ss(154.3, 154.9, t)),
      side: [
        { name: '陈经理', prev: boss ? '这个什么时候能交？' : '[文件]', col: AV_COLS[6], n: boss ? 0 : (t > 148 ? 1 : 0), sel: boss },
        { name: '项目组（12）', prev: '收到请回复', col: AV_COLS[1], n: boss ? unread(23) : 0, sel: !boss },
        { name: '王姐', prev: '客户那边又在催了', col: AV_COLS[0], n: unread(4) },
        { name: '部门群', prev: '@所有人 十点开会', col: AV_COLS[3], n: unread(37) },
        { name: '小周', prev: '数据表麻烦再核对一下', col: AV_COLS[2], n: unread(2) },
        { name: '文件传输助手', prev: '', col: AV_COLS[5], n: 0 },
      ],
      msgs: boss ? [{ t: 149.6, who: '陈经理', col: AV_COLS[6], text: '早' }, { t: 150.6, who: '陈经理', col: AV_COLS[6], text: '这个什么时候能交？' }, { t: 156.46, mine: true, text: '今天尽量。', read: 157.4 }] : groupMsgs,
      input: boss ? (t < 156.46 ? typedAt(t, '今天尽量。', 154.6, 156.2) : '') : '', bottom: false,
    };
    drawChatUI(c.ug, t, st);
    // monitor with slight perspective
    const on = ss(143.46, 144.3, t);
    const z = 1 + 0.06 * eio(clamp(lt / sh.d)) + (boss ? 0.04 * eo(clamp((t - 149.4) / 1.5)) : 0);
    g.save(); g.translate(1060, 520); g.scale(z, z); g.translate(-1060, -520);
    g.save(); g.transform(1, -0.035, 0, 1, 0, 40);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.filter = 'blur(24px)'; g.fillRect(520, 190, 1180, 720); g.filter = 'none';
    g.fillStyle = '#1b1c1f'; rrect(g, 490, 150, 1180, 730, 16); g.fill();
    g.globalAlpha = on; g.drawImage(c.ui, 510, 168, 1140, 676); g.globalAlpha = 1;
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(214,216,220)'; g.fillRect(510, 168, 1140, 676); g.restore();
    if (on < 1) { g.fillStyle = `rgba(0,0,0,${0.85 * (1 - on)})`; g.fillRect(510, 168, 1140, 676); }
    g.fillStyle = '#26272b'; g.fillRect(1030, 880, 100, 90); g.fillRect(940, 960, 280, 18);
    g.restore();
    g.restore();
    // foreground shoulder (blurred)
    drawFigure(g, { x: 170, y: 1800, h: 1550, view: 'back', pose: 'stand', outfit: OUTFITS.protOffice, light: { amb: [150, 152, 160], keyA: 0.25, key: [230, 240, 255], dir: [1, -0.2], rimA: 0.35, rim: [230, 240, 255], rimDir: [1, -0.3] }, blur: 9 });
  }
};

// ---------- OFFICE wide (day / night) ----------
SCENES.office = {
  init(sh) {
    const c = sh.c = {}; const night = sh.p.mode === 'night';
    c.city = makeCity({ w: 2600, h: 640, base: 640, minH: 160, maxH: 600, minW: 60, maxW: 180, gap: 16, seed: 91, col: night ? '#121828' : '#93a3b8', winProb: night ? 0.16 : 0, winW: 4, winH: 5, winGX: 8, winGY: 9, winA: 0.9, scale: 1, edge: night ? 'rgba(70,90,140,0.4)' : 'rgba(255,240,220,0.6)', shade: night ? '#1e2640' : '#d2dae4', shadeA: 0.45, stripProb: 0.4, redLights: night });
    const r = mulberry32(17); c.cols = [];
    for (let i = 0; i < 5; i++) c.cols.push({ x: 160 + i * 380 + r() * 60, of: randOutfit(r), facing: r() < 0.5 ? 1 : -1, hs: r() < 0.5 ? 'short' : 'long', on: r() < 0.35 });
    c.cols.forEach(q => { q.of.coat = null; q.of.pack = null; });
  },
  draw(g, lt, sh, t) {
    const c = sh.c, night = sh.p.mode === 'night';
    const z = 1 + (night ? 0.12 : 0.06) * eio(clamp(lt / sh.d));
    g.translate(880, 640); g.scale(z, z); g.translate(-880, -640);
    // window wall
    if (night) drawSky(g, 140, 820, skyCols('night'));
    else drawSky(g, 140, 820, skyCols('day', 'morning', 0.2));
    g.drawImage(c.city.sil, -300 - lt * 2, 820 - 640 + 60); if (night) g.drawImage(c.city.win, -300 - lt * 2, 820 - 640 + 60);
    if (night) for (const w of c.city.wins) if (w[0] === 'red' && ((t + w[3] * 2) % 1.6) < 0.5) glow(g, w[1] - 300 - lt * 2, w[2] + 240, 10, '#ff3a2a', 0.8);
    if (!night) { haze(g, 300, 820, '#e9edf2', 0.4); glow(g, 1500, 220, 700, '#fff4e0', 0.5, 'screen'); }
    for (let x = -60; x < W + 60; x += 300) { g.fillStyle = night ? '#1a1d24' : '#9aa0a8'; g.fillRect(x, 140, 16, 700); }
    g.fillStyle = night ? '#1a1d24' : '#9aa0a8'; g.fillRect(-60, 470, W + 120, 10);
    if (night) { g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.12; g.fillStyle = '#9ab0d8'; g.fillRect(820, 560, 300, 160); g.restore(); }
    // ceiling
    vgrad(g, -60, -60, W + 120, 150, night ? [[0, '#0d0f14'], [1, '#16191f']] : [[0, '#e9eaea'], [1, '#d6d8d9']]);
    for (let x = 60; x < W; x += 320) { g.fillStyle = night ? (x === 1020 ? '#d8dde6' : '#2a2d33') : '#fffdf8'; g.fillRect(x, 120, 200, 10); if (!night) glow(g, x + 100, 126, 220, '#fffaf0', 0.3, 'screen'); }
    // floor
    vgrad(g, -60, 840, W + 120, H + 60, night ? [[0, '#1d2028'], [1, '#14161c']] : [[0, '#8f9399'], [1, '#777b81']]);
    // sun shafts (day)
    if (!night) { for (let i = 0; i < 4; i++) { const x = 1100 + i * 260; shaft(g, [[x, 160], [x + 150, 160], [x - 520, 1000], [x - 760, 1000]], '#fff2da', 0.12, 'screen'); } }
    // background desks + colleagues
    const deskBack = (x, y, s) => { g.fillStyle = night ? '#2a2d34' : '#d9d6d0'; g.fillRect(x - 170 * s, y, 340 * s, 14 * s); g.fillStyle = night ? '#1c1e23' : '#b9b6b0'; g.fillRect(x - 160 * s, y + 14 * s, 10 * s, 130 * s); g.fillRect(x + 150 * s, y + 14 * s, 10 * s, 130 * s); };
    for (const q of c.cols) {
      const s = 0.62, fy = 820;
      if (night && !q.on) { deskBack(q.x, fy - 100, s); g.fillStyle = '#121418'; g.fillRect(q.x - 10, fy - 100 - 90 * s, 70 * s, 90 * s); continue; }
      if (!night) drawFigure(g, { x: q.x - 60 * q.facing, y: fy, h: 380 * s, view: 'side', pose: 'desk', facing: q.facing, outfit: q.of, hairStyle: q.hs, detail: false, light: { amb: [200, 205, 214], keyA: 0.2, dir: [1, -0.4], rimA: 0.4, rim: [255, 246, 230], rimDir: [1, -0.4] } });
      deskBack(q.x, fy - 100, s);
      g.fillStyle = '#26282c'; g.fillRect(q.x + 30 * q.facing - 4, fy - 100 - 92 * s, 8, 92 * s);
    }
    // main desk + protagonist
    const fx = 860, fy = 940, hp = 430;
    const deskY = fy - hp * 0.42;
    const mon = [fx + 190, deskY - 150];
    drawFigure(g, { x: fx, y: fy, h: hp, view: 'side', pose: 'desk', facing: 1, outfit: OUTFITS.protOffice, headDown: night ? 0.25 : 0.12, lean: night ? 0.2 : 0.12,
      light: night ? { amb: [92, 98, 124], key: [190, 215, 255], keyA: 0.55, dir: [1, -0.1], rim: [190, 215, 255], rimA: 0.75, rimDir: [1, -0.1], shadowA: 0.45, footA: 0.5 }
        : { amb: [212, 214, 220], key: [255, 244, 226], keyA: 0.3, dir: [1, -0.5], rim: [255, 246, 230], rimA: 0.55, rimDir: [1, -0.5], shadowA: 0.3 } });
    // chair
    g.fillStyle = night ? '#121318' : '#2c2e33'; rrect(g, fx - 70, fy - hp * 0.27, 120, 16, 6); g.fill(); g.fillRect(fx - 80, fy - hp * 0.62, 18, hp * 0.38); g.fillRect(fx - 16, fy - hp * 0.27, 10, hp * 0.22); g.fillRect(fx - 60, fy - 10, 110, 8);
    // desk
    g.fillStyle = night ? '#24262c' : '#e2ded6'; g.fillRect(fx + 30, deskY, 560, 16); g.fillStyle = night ? '#17181c' : '#bdb9b1'; g.fillRect(fx + 50, deskY + 16, 12, fy - deskY - 16); g.fillRect(fx + 560, deskY + 16, 12, fy - deskY - 16);
    // monitor (side) + glow
    g.fillStyle = '#1a1b1f'; g.fillRect(mon[0], mon[1], 14, 140); g.fillRect(mon[0] + 8, mon[1] + 140, 8, 10); g.fillRect(mon[0] - 20, deskY - 4, 60, 6);
    glow(g, mon[0] - 10, mon[1] + 70, night ? 520 : 260, night ? '#b8d0ff' : '#e8f0ff', night ? 0.45 : 0.15, 'screen');
    // keyboard, mug, lunch box (day)
    g.fillStyle = night ? '#2e3036' : '#cfcbc4'; g.fillRect(fx + 60, deskY - 6, 110, 6);
    g.fillStyle = night ? '#3a3c42' : '#f4f2ee'; rrect(g, fx + 450, deskY - 46, 40, 46, 6); g.fill();
    if (!night) {
      g.fillStyle = '#3a4a5a'; rrect(g, fx + 300, deskY - 34, 120, 34, 6); g.fill(); g.fillStyle = '#f2efe8'; rrect(g, fx + 306, deskY - 38, 108, 12, 5); g.fill();
      g.fillStyle = '#c99a5a'; g.fillRect(fx + 330, deskY - 44, 4, 2); g.save(); g.translate(fx + 380, deskY - 40); g.rotate(-0.15); g.fillStyle = '#8a5a3a'; g.fillRect(0, 0, 90, 4); g.fillRect(0, 7, 90, 4); g.restore();
      dust(g, t, 70, 31, [600, 150, 1300, 700], '#fff0d8', 0.35, 2.2, (x, y) => clamp(1 - Math.abs((x + (y - 160) * 0.9) - 1300) / 500));
    } else {
      // exit sign
      g.fillStyle = '#1e7a4a'; g.fillRect(1640, 170, 110, 40); txt(g, '安全出口', 1695, 198, '400 20px Sans', [220, 255, 230], 0.9, 'center'); glow(g, 1695, 190, 160, '#3ad08a', 0.25, 'screen');
    }
    // foreground desk edge (blurred)
    g.save(); g.filter = 'blur(6px)'; g.fillStyle = night ? '#0c0d10' : '#5d6066'; g.fillRect(-60, 990, W + 120, 120); g.restore();
  }
};

// ---------- WALL CLOCK: 17:00 -> 18:00 ----------
SCENES.wallclock = {
  draw(g, lt, sh, t) {
    const k = clamp(lt / sh.d);
    vgrad(g, -60, -60, W + 120, H + 120, [[0, '#cbbfae'], [1, '#b2a594']]);
    // sunset window light patch moving across the wall
    const warm = mix([255, 210, 150], [255, 150, 90], k);
    const px = 900 + lt * 30, py = 260 - lt * 10;
    g.save(); g.globalCompositeOperation = 'screen';
    const quad = (x, y, w, h) => poly(g, [[x, y], [x + w, y - 60], [x + w + 30, y + h - 60], [x + 30, y + h]]);
    g.fillStyle = rgba(warm, 0.55);
    quad(px, py, 300, 420); g.fill(); quad(px + 330, py - 66, 300, 420); g.fill();
    g.restore();
    // leaf shadow in the patch
    g.save(); g.globalCompositeOperation = 'multiply'; g.filter = 'blur(3px)'; g.fillStyle = 'rgba(150,118,90,0.4)'; g.strokeStyle = 'rgba(150,118,90,0.4)';
    const sw = Math.sin(t * 1.1) * 8; const lr = mulberry32(13);
    g.lineWidth = 6; g.beginPath(); g.moveTo(px + 640, py + 420); g.quadraticCurveTo(px + 420, py + 260 + sw, px + 140, py + 180 + sw); g.stroke();
    for (let i = 0; i < 18; i++) { const u = lr(), bx = lerp(px + 640, px + 140, u), by = lerp(py + 420, py + 180, u) - Math.sin(u * Math.PI) * 60 + sw * u; const ang = lr() * TAU; g.beginPath(); g.ellipse(bx + Math.cos(ang) * 40, by + Math.sin(ang) * 30, 30 + lr() * 14, 11 + lr() * 5, ang, 0, TAU); g.fill(); }
    g.filter = 'none'; g.restore();
    // clock
    const cx = 600, cy = 520, R = 200;
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.filter = 'blur(12px)'; g.beginPath(); g.arc(cx + 18, cy + 20, R + 10, 0, TAU); g.fill(); g.filter = 'none';
    g.fillStyle = '#26272a'; g.beginPath(); g.arc(cx, cy, R + 12, 0, TAU); g.fill();
    g.fillStyle = '#f2efe9'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, l = i % 5 ? 10 : 26; g.strokeStyle = '#2a2a2c'; g.lineWidth = i % 5 ? 2 : 5; g.beginPath(); g.moveTo(cx + Math.sin(a) * (R - 14), cy - Math.cos(a) * (R - 14)); g.lineTo(cx + Math.sin(a) * (R - 14 - l), cy - Math.cos(a) * (R - 14 - l)); g.stroke(); }
    const mk_ = t < 174.1 ? eio(inv(170.59, 174.1, t)) : 1 + (t - 174.1) / 60;
    const ma = mk_ * TAU, ha = (5 + mk_) / 12 * TAU, sa = t * TAU * 1.5;
    const hand = (a, L, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - Math.sin(a) * L * 0.15, cy + Math.cos(a) * L * 0.15); g.lineTo(cx + Math.sin(a) * L, cy - Math.cos(a) * L); g.stroke(); };
    hand(ha, R * 0.55, 10, '#1d1d1f'); hand(ma, R * 0.82, 6, '#1d1d1f'); hand(sa, R * 0.86, 2.5, '#c0392b');
    g.fillStyle = '#1d1d1f'; g.beginPath(); g.arc(cx, cy, 10, 0, TAU); g.fill();
    // warm light wash on clock
    g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = rgba(warm, 0.35); g.fillRect(-60, -60, W + 120, H + 120); g.restore();
    // notification toast
    const a = eo(clamp((t - 175.25) / 0.45));
    if (a > 0) {
      const x = 1240, y = 690 + (1 - a) * 40;
      g.globalAlpha = a; g.fillStyle = 'rgba(248,247,244,0.94)'; rrect(g, x, y, 560, 150, 24); g.fill();
      chatAvatar(g, x + 52, y + 52, 26, '陈', AV_COLS[6]);
      txt(g, '陈经理', x + 96, y + 48, '500 24px Sans', [30, 30, 34], 1); txt(g, '现在', x + 530, y + 48, '400 18px Sans', [130, 130, 136], 1, 'right');
      txt(g, '还有个事，明早九点前给我一版', x + 96, y + 92, '400 22px Sans', [60, 60, 66], 1);
      txt(g, '辛苦', x + 96, y + 124, '400 22px Sans', [60, 60, 66], 1);
      g.globalAlpha = 1;
    }
  }
};

// ---------- CHAT INPUT: type, delete, "好。" ----------
SCENES.chatInput = {
  init(sh) { const c = sh.c = {}; c.ui = mk(1280, 760); c.ug = c.ui.getContext('2d'); },
  draw(g, lt, sh, t) {
    const c = sh.c;
    // typing timeline
    const q = '为什么非得今天';
    let input = '';
    if (t < 181.2) input = typedAt(t, q, 178.1, 180.9);
    else if (t < 182.5) input = q;
    else if (t < 184.6) { const n = [...q].length, k = Math.ceil((1 - clamp((t - 182.5) / 1.9)) * n); input = [...q].slice(0, k).join(''); }
    else if (t < 185.6) input = typedAt(t, '好。', 184.8, 185.3);
    const st = {
      title: '陈经理', group: false, clock: fmtClock(hudMin(t)),
      side: [{ name: '陈经理', prev: '明天一早要用', col: AV_COLS[6], n: 0, sel: true }, { name: '项目组（12）', prev: '[图片]', col: AV_COLS[1], n: 41 }, { name: '王姐', prev: '辛苦了', col: AV_COLS[0], n: 3 }, { name: '部门群', prev: '明天几点？', col: AV_COLS[3], n: 99 }, { name: '小周', prev: '先走啦', col: AV_COLS[2], n: 1 }],
      msgs: [{ t: 0, who: '陈经理', col: AV_COLS[6], text: '还有个事，明早九点前给我一版' }, { t: 0, who: '陈经理', col: AV_COLS[6], text: '今晚加个班把这个弄完吧，明天一早要用' }, { t: 185.65, mine: true, text: '好。', read: 186.8 }],
      input, bottom: true,
    };
    drawChatUI(c.ug, t, st);
    // evening desk ambience
    vgrad(g, -60, -60, W + 120, H + 120, [[0, '#2a2622'], [1, '#1a1715']]);
    glow(g, 160, 260, 900, '#ffb070', 0.35, 'screen');
    const z = 1.0 + 0.05 * eio(clamp(lt / sh.d));
    g.save(); g.translate(1010, 640); g.scale(z, z);
    // zoomed crop of UI around the input + recent messages
    g.save(); g.transform(1, -0.03, 0.02, 1, 0, 0);
    g.fillStyle = '#121214'; rrect(g, -900, -560, 1640, 1000, 18); g.fill();
    g.drawImage(c.ui, 300, 250, 980, 510, -860, -550, 1700, 885);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(222,222,226)'; g.fillRect(-860, -550, 1700, 885); g.globalCompositeOperation = 'source-over';
    g.restore();
    g.restore();
    // foreground keyboard (blurred)
    g.save(); g.filter = 'blur(8px)'; g.fillStyle = '#16171a'; g.fillRect(-60, 960, W + 120, 200); g.fillStyle = '#2c2d31'; for (let i = 0; i < 16; i++) g.fillRect(120 + i * 110, 985, 90, 40); g.restore();
  }
};

// ---------- CONCOURSE time-lapse: everyone moves, he stands still ----------
SCENES.concourse = {
  init(sh) {
    const c = sh.c = {}; const r = mulberry32(55); c.w = [];
    for (let i = 0; i < 26; i++) { const lane = i % 3; c.w.push({ lane, x0: r() * 2600 - 300, dir: r() < 0.5 ? 1 : -1, sp: lerp(0.9, 1.2, r()), of: randOutfit(r), hs: r() < 0.6 ? 'short' : 'long', ph: r(), gone: lerp(245, 252, r()) }); }
  },
  draw(g, lt, sh, t) {
    const c = sh.c;
    const dim = ss(245, 252.5, t);
    // hall
    vgrad(g, -60, -60, W + 120, 760, [[0, '#d7d5cf'], [1, '#c3c0b9']]);
    // big windows at the back
    for (let i = 0; i < 6; i++) { const x = 40 + i * 320; vgrad(g, x, 170, 260, 600, [[0, '#e8eef4'], [1, '#cdd7e2']]); g.fillStyle = 'rgba(120,130,140,0.25)'; g.fillRect(x + 128, 170, 4, 430); }
    glow(g, 960, 380, 1200, mix([255, 250, 240], [255, 200, 150], dim), 0.35, 'screen');
    // columns
    for (let i = 0; i < 5; i++) { const x = 180 + i * 400; const cg = g.createLinearGradient(x, 0, x + 90, 0); cg.addColorStop(0, '#b3b0a9'); cg.addColorStop(0.5, '#d6d3cc'); cg.addColorStop(1, '#a29f98'); g.fillStyle = cg; g.fillRect(x, 120, 90, 640); }
    // hanging signs
    for (const [x, s] of [[520, '出口 A  →'], [1380, '←  2号线 换乘']]) { g.fillStyle = '#2a2d33'; g.fillRect(x - 170, 210, 340, 64); g.fillStyle = '#4a4d53'; g.fillRect(x - 2, 120, 4, 90); txt(g, s, x, 252, '400 28px Sans', [245, 245, 240], 0.95, 'center', 4); }
    // floor
    vgrad(g, -60, 760, W + 120, H + 60, [[0, '#b7b3ab'], [1, '#97938b']]);
    g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 6; i++) { const x = 40 + i * 320; const gr = g.createLinearGradient(0, 760, 0, 1000); gr.addColorStop(0, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x, 760, 260, 240); } g.restore();
    const lanes = [[790, 230], [860, 300], [1010, 420]];
    const drawLane = (L) => {
      for (const w of c.w) {
        if (w.lane !== L) continue;
        const alive = 1 - ss(w.gone - 1.2, w.gone, t);
        if (alive <= 0) continue;
        const [fy, hh] = lanes[L];
        const v = hh * 2.6 * w.sp; // fast (time-lapse)
        const span = W + 600;
        const x = ((w.x0 + w.dir * v * lt) % span + span) % span - 300;
        const ph = (w.ph + lt * 2.6 * w.sp) % 1;
        const Lt = { amb: [205, 205, 208], keyA: 0.15, dir: [0, -1], rimA: 0, rim: [255, 250, 240], rimDir: [0, -1] };
        drawFigure(g, { x: x - w.dir * hh * 0.16, y: fy, h: hh, view: 'side', pose: 'walk', ph: (ph + 0.92) % 1, facing: w.dir, outfit: w.of, hairStyle: w.hs, detail: false, light: Lt, alpha: 0.2 * alive });
        drawFigure(g, { x, y: fy, h: hh, view: 'side', pose: 'walk', ph, facing: w.dir, outfit: w.of, hairStyle: w.hs, detail: false, light: Lt, alpha: 0.55 * alive });
      }
    };
    drawLane(0); drawLane(1);
    // protagonist, still, sharp
    drawFigure(g, { x: 960, y: 980, h: 400, view: 'back', pose: 'stand', outfit: OUTFITS.protOut, headDown: 0.4, light: { amb: mix([205, 206, 210], [200, 180, 170], dim), key: [255, 246, 232], keyA: 0.2, dir: [0, -1], rim: [255, 246, 232], rimA: 0.6, rimDir: [0, -1], rimW: 0.008 }, shadow: { a: 0.25, k: 0, sy: 0.4, blur: 4 } });
    drawLane(2);
    if (dim > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = rgba(mix([255, 255, 255], [200, 170, 150], dim)); g.fillRect(-60, -60, W + 120, H + 120); g.restore(); }
  }
};
