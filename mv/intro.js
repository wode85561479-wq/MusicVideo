/* intro 0–17.8s (from the approved 10s preview) */
// ======================= SCENE A: 3D space + CRT =======================
const A = document.getElementById('A');
const Asky = sky3D(A);
const Aworld = el('div', 'world', A);
const Acam = el('div', 'cam', Aworld);
const Afloor = floor3D(Acam, 330, -2000, 5800);
const crt = el('div', 'obj', Acam);
const LAV = { f: '#efe6ff', s: '#cdbdf5', s2: '#d9cbfa', t: '#fbf7ff', b: '#a996e6' };
const crtBody = box(crt, 720, 560, 110, { front: { bg: LAV.f, r: 26 }, back: { bg: LAV.s }, right: { bg: LAV.s }, left: { bg: LAV.s2 }, top: { bg: LAV.t }, bottom: { bg: LAV.b } });
const scr = el('div', 'scr', crtBody.faces.front, `<div class="glare"></div><div class="on"></div>`);
const scrOn = scr.querySelector('.on');
el('div', 'abs kw', crtBody.faces.front, '叮咚OS').style.cssText = 'left:60px;top:494px;font-size:30px;color:#7a5fa8';
const led = el('div', 'abs', crtBody.faces.front); led.style.cssText = 'left:636px;top:500px;width:24px;height:24px;border-radius:50%;border:4px solid #2b1d4a;background:#46e0bd';
for (let i = 0; i < 5; i++) el('div', 'abs', crtBody.faces.front).style.cssText = `left:${420 + i * 34}px;top:500px;width:20px;height:24px;border-radius:6px;background:#cdbdf5;border:3px solid #2b1d4a`;
const hood = box(crt, 560, 440, 300, { front: false, back: { bg: LAV.s }, right: { bg: LAV.s }, left: { bg: LAV.s2 }, top: { bg: LAV.t }, bottom: { bg: LAV.b } });
hood.style.transform = 'translate3d(0,-10px,-205px)';
const neck = box(crt, 220, 50, 200, { front: { bg: LAV.s2 }, back: { bg: LAV.s }, right: { bg: LAV.s }, left: { bg: LAV.s2 }, top: { bg: LAV.t }, bottom: { bg: LAV.b } });
neck.style.transform = 'translate3d(0,305px,-80px)';
const base = box(crt, 440, 34, 320, { front: { bg: LAV.f }, back: { bg: LAV.s }, right: { bg: LAV.s }, left: { bg: LAV.s2 }, top: { bg: LAV.t }, bottom: { bg: LAV.b } });
base.style.transform = 'translate3d(0,346px,-80px)';
const Acoins = [[-640, -190, -350, 0], [660, -250, -520, 1], [-560, 170, 120, 2], [600, 130, 60, 3], [80, -380, -900, 4], [-1100, -420, -1400, 5]].map(([x, y, z, i]) => { const c = coin(Acam, 130); c.p = [x, y, z, i]; return c; });

// ======================= SCENE B: kawaii desktop =======================
const B = document.getElementById('B');
const Bworld = el('div', 'world', B); Bworld.style.perspective = '1600px';
const desk = el('div', 'full', Bworld); desk.style.transformOrigin = '50% 100%';
const deskB = buildDesktop(desk, '23:59', '11月30日');
const toast = el('div', '', desk, `<div class="bell">${ICON.bell}</div><div><h4>叮咚～ 新通知</h4><p>亲爱的 Plus 用户您好 ♡</p></div>`); toast.id = 'toast';
const bell = toast.querySelector('.bell');
const trail = el('div', 'full', desk);
const DRAG0 = 2.95, DRAG1 = 4.22, STAMP = 0.042, NTRAIL = Math.ceil((DRAG1 - DRAG0) / STAMP);
const trailEls = []; for (let i = 0; i < NTRAIL; i++) { const w = el('div', 'win dlg', trail, dialogInner()); trailEls.push(w); }
const dlg = el('div', 'win dlg', desk, dialogInner());
const tip = el('div', '', desk, '没有第二个选项哦～'); tip.id = 'tip';
const dd = el('div', 'burst', desk, starburst(14, 205, 150, '#ffe45c') + `<div style="position:relative;transform:rotate(-8deg)">${stroked('叮咚！', 'kw ext', '--sw:14px;--fc:#ff5fae;font-size:110px')}</div>`);
const cursor = el('div', '', desk, ICON.cursor); cursor.id = 'cursor';
const DLGX = 580, DLGY = 300;
function dragPos(tt) {
  const u = E.ioQ(P(tt, DRAG0, DRAG1));
  return { x: DLGX + 540 * Math.sin(2 * Math.PI * u), y: DLGY - 230 * Math.sin(4 * Math.PI * u) };
}
const CUR = [[1.06, 1240, 1110], [1.5, 1290, 760], [1.85, 1600, 905], [2.3, 1600, 905], [2.62, 1173, 615], [2.86, 1173, 615], [DRAG0, DLGX + 339, DLGY + 59]];
function curAt(t) {
  if (t >= DRAG0) { const p = dragPos(Math.min(t, DRAG1)); return { x: p.x + 339, y: p.y + 59 }; }
  for (let i = 0; i < CUR.length - 1; i++) { const [t0, x0, y0] = CUR[i], [t1, x1, y1] = CUR[i + 1]; if (t <= t1) { const k = E.io(P(t, t0, t1)); return { x: L(x0, x1, k), y: L(y0, y1, k) }; } }
  return { x: CUR[0][1], y: CUR[0][2] };
}

// ======================= SCENE C: 3D "good news" =======================
const C = document.getElementById('C');
const Csky = sky3D(C);
const Cworld = el('div', 'world', C);
const Ccam = el('div', 'cam', Cworld);
const Cfloor = floor3D(Ccam, 330, -2050, 5900);
// debris: little dialogs floating in space
const debris = [[-1350, -520, -2300], [-650, -800, -2800], [950, -700, -2500], [1600, -380, -2100], [180, -900, -3200], [-1750, -150, -1700], [1900, -60, -1500]].map((p, i) => {
  const o = el('div', 'obj', Ccam);
  const w = el('div', 'win mini', o, `<div class="tb"><span>系统通知 ♡</span>${tbb()}</div><div class="mb kw">${['亲爱的用户您好～', '额度已合并 ♡', '升级 Pro 吗？', '亲，该下班了喔', '叮咚！', '感谢理解 ♡', '共享额度中…'][i]}</div>`);
  css(w, { left: '-190px', top: '-110px' }); o.p = p; o.i = i; return o;
});
const Ccoins = [[-900, -300, -900, 7], [1000, -120, -1100, 8], [750, -560, -1600, 9]].map(([x, y, z, i]) => { const c = coin(Ccam, 120); c.p = [x, y, z, i]; return c; });
// calendar
const cal = el('div', 'obj', Ccam);
const calPage = (m, en, d, yi, ji, red) => `<div class="cp"><div class="cpm"><span class="kw">${m}</span><span class="pix">${en}</span></div><div class="cpd kw" style="color:${red ? '#ff3b5c' : INK}">${d}</div><div class="cpy"><div><b class="yi">宜</b>${yi}</div><div><b class="ji">忌</b>${ji}</div></div></div>`;
const STACK = 'repeating-linear-gradient(0deg,#fffdf6 0 5px,#e3d8c8 5px 7px)';
const STACKV = 'repeating-linear-gradient(90deg,#fffdf6 0 5px,#e3d8c8 5px 7px)';
const pages = box(cal, 520, 560, 80, { front: { bg: '#fffdf6', html: calPage('十二月', 'DEC', '1', '合并额度', '算账', true) }, back: { bg: '#f0e6d6' }, right: { bg: STACKV }, left: { bg: STACKV }, top: { bg: STACK }, bottom: { bg: '#e3d8c8' } });
const binding = box(cal, 548, 76, 104, { front: { bg: '#ff5f7e', html: `<div class="kw" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:40px;text-shadow:3px 3px 0 #2b1d4a">叮咚日历 ♡</div>` }, back: { bg: '#d9405f' }, right: { bg: '#e04a69' }, left: { bg: '#e8536f' }, top: { bg: '#ff7d95' }, bottom: { bg: '#c23352' } });
binding.style.transform = 'translate3d(0,-318px,0)';
const page11 = el('div', 'obj', cal);
const p11f = el('div', 'face', page11, calPage('十一月', 'NOV', '30', '写代码', '下班', false));
css(p11f, { width: '520px', height: '560px', left: '-260px', top: '0px', background: '#fffdf6' });
const p11b = el('div', 'face', page11); css(p11b, { width: '520px', height: '560px', left: '-260px', top: '0px', background: 'repeating-linear-gradient(0deg,#f6efe2 0 38px,#e6dccb 38px 41px)', transform: 'rotateY(180deg)' });
// 3D extruded headline
function text3D(parent, txt, size, front, n = 12, gap = 4.5) {
  const o = el('div', 'obj', parent);
  for (let i = n; i >= 0; i--) {
    const g = el('div', 'gl kw', o, i === 0 ? stroked(txt, '', `--sw:14px;--fc:${front}`) : stroked(txt, '', `--sw:14px;--fc:${i < 3 ? '#9a3db0' : '#5b2683'}`));
    css(g, { fontSize: size + 'px', transform: `translate(-50%,-50%) translateZ(${-i * gap}px)`, lineHeight: '1' });
  }
  return o;
}
const gn = text3D(Ccam, '好消息！', 190, '#ffe45c');
const gnStar = el('div', 'gl kw', gn, stroked('*', '', '--sw:10px;--fc:#ff5fae')); css(gnStar, { fontSize: '120px', transform: 'translate(300px,-150px) translateZ(4px)' });
const gn2 = text3D(Ccam, '要宣布咯～', 108, '#ff9ad5', 9, 4);
const fine = el('div', 'gl', Ccam); css(fine, { whiteSpace: 'pre', lineHeight: '1.45', fontSize: '28px', fontWeight: '900', color: '#fff', textShadow: '2px 2px 0 #2b1d4a' });
const FINE = '*本次好消息仅对 Pro 会员生效\n*Plus 用户请耐心排队 · 最终解释权归本公司所有';
// gifts: huge golden Pro gift vs. tiny Plus gift
const BOW = `<svg viewBox="0 0 200 110" width="200" height="110"><path d="M100 70C70 20 20 10 22 50s50 30 78 20z" fill="#ffe45c" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M100 70C130 20 180 10 178 50s-50 30-78 20z" fill="#ffe45c" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><circle cx="100" cy="68" r="16" fill="#ffd23f" stroke="${INK}" stroke-width="7"/></svg>`;
function makeGift(parent, W, H, c, label, lsz) {
  const g = el('div', 'obj', parent);
  const R = bg => `linear-gradient(90deg,transparent 42%,${c.rib} 42%,${c.rib} 58%,transparent 58%),${bg}`;
  const tag = label ? `<div class="gtag kw" style="font-size:${lsz}px">${label}</div>` : '';
  box(g, W, H, W, { front: { bg: R(c.body), html: tag }, back: { bg: R(c.dark) }, right: { bg: R(c.dark) }, left: { bg: R(c.body) }, top: { bg: '#3a1a40' }, bottom: { bg: c.dark } });
  const lid = el('div', 'obj', g), lw = W * 1.1, lh = Math.max(26, H * .26);
  box(lid, lw, lh, lw, { front: { bg: R(c.lid) }, back: { bg: R(c.dark) }, right: { bg: R(c.dark) }, left: { bg: R(c.lid) }, top: { bg: `linear-gradient(90deg,transparent 42%,${c.rib} 42% 58%,transparent 58%),linear-gradient(0deg,transparent 42%,${c.rib} 42% 58%,transparent 58%),${c.lid}` }, bottom: { bg: c.dark } });
  g.lid = lid; g.H = H; g.lh = lh; g.W = W;
  return g;
}
const proGift = makeGift(Ccam, 440, 360, { body: '#ffd23f', dark: '#d9a400', lid: '#ffe270', rib: '#ff3b5c' }, 'PRO 尊享', 54);
proGift.lid.style.transform = `translateY(${-proGift.H / 2 - proGift.lh / 2}px)`;
const proCrown = el('div', 'abs', proGift.lid, ICON.crown); css(proCrown, { width: '190px', height: '190px', left: '-95px', top: -proGift.lh / 2 - 178 + 'px' });
const rays = el('div', 'abs', proGift); css(rays, { width: '1500px', height: '1500px', left: '-750px', top: '-750px', borderRadius: '50%', background: 'repeating-conic-gradient(from 0deg,rgba(255,236,140,.9) 0 7deg,rgba(255,236,140,0) 7deg 20deg)', WebkitMaskImage: 'radial-gradient(circle,#000 0,#000 16%,transparent 60%)' });
const gift = makeGift(Ccam, 170, 140, { body: '#ff8fcb', dark: '#de6aac', lid: '#ffaedb', rib: '#ffe45c' }, 'Plus', 30);
const lid = gift.lid;
const bow = el('div', 'abs', lid, BOW); css(bow, { left: '-100px', top: -gift.lh / 2 - 92 + 'px', width: '200px', height: '110px', transform: 'scale(.5)', transformOrigin: '50% 100%' });
const flyA = el('div', 'abs', Ccam, ICON.chat), flyB = el('div', 'abs', Ccam, ICON.code);
[flyA, flyB].forEach(f => css(f, { width: '220px', height: '220px', left: '-110px', top: '-110px' }));
const Cconf = mkCanvas(C);

// ======================= SCENE D: the merge =======================
const D = document.getElementById('D');
const Dshake = el('div', 'full', D);
const deskD = buildDesktop(Dshake, '00:01', '12月1日');
const Dconf = mkCanvas(Dshake);
const Dworld = el('div', 'world', Dshake); Dworld.style.perspective = '1500px';
const Dburst = el('div', 'burst', Dworld, starburst(18, 205, 165, '#fff6b0', 6)); css(Dburst, { left: '560px', top: '340px' });
const appWin = (name, icon) => `<div class="tb"><span>${name} · Plus</span>${tbb()}</div><div class="abody"><div class="aicon">${icon}</div><div><div class="aname kw">${name}</div><div class="alabel">本月额度</div><div class="bar"><div class="fill" style="width:100%"></div><span class="pct">100%</span></div></div></div>`;
const wGPT = el('div', 'win appw', Dworld, appWin('ChatGPT', ICON.chat)); css(wGPT, { left: '170px', top: '380px' });
const wCdx = el('div', 'win appw', Dworld, appWin('Codex', ICON.code)); css(wCdx, { left: '830px', top: '380px' });
const wM = el('div', 'win mergew', Dworld, `<div class="tb"><span>Plus 共享额度 · ChatGPT ♡ Codex</span>${tbb()}</div>
  <div class="mrow"><div class="ic">${ICON.chat}</div><div class="heart">${ICON.heart}</div><div class="ic">${ICON.code}</div></div>
  <div class="mlabel">本月共享额度（两边一起用）</div>
  <div class="mbar"><div class="fill"></div><div class="mface abs" style="width:120px;height:66px;top:2px"></div><span class="pct">100%</span></div>
  <div class="mnote">合并前 100% + 100%　→　合并后 <span style="color:#ff3b5c">100%</span></div><div class="mfine">* 额度用完可随时升级 Pro 继续畅聊 ♡</div><div id="mwarn">⚠ 额度即将耗尽</div>`);
css(wM, { left: '270px', top: '300px' });
const mFill = wM.querySelector('.mbar .fill'), mPct = wM.querySelector('.mbar .pct'), mFace = wM.querySelector('.mface'), mHeart = wM.querySelector('.heart'), mWarn = wM.querySelector('#mwarn');
const eq = el('div', 'abs', Dworld, stroked('1 + 1 = 1 ?!', 'kw ext', '--sw:16px;--fc:#ffe45c;font-size:120px')); css(eq, { left: '300px', top: '110px' });
const wPro = el('div', 'win prow', Dworld, `<div class="tb"><span><span class="tcrown">${ICON.crown}</span>Pro 尊享会员</span>${tbb()}</div>
  <div class="pbody"><div class="pmas"></div><div><div class="pname kw">Pro 额度</div><div class="pbar">${stroked('∞', 'kw', '--sw:10px')}</div><div class="pnote">不限量 · 不排队 · 不提醒</div></div></div>`);
css(wPro, { left: '1345px', top: '70px' });
const pMas = wPro.querySelector('.pmas'), pBar = wPro.querySelector('.pbar');
pMas.innerHTML = mascot(1, 'cool', '#ffd23f') + `<div class="crown">${ICON.crown}</div>`;
const proSpk = [[1320, 60, 34], [1880, 120, 26], [1860, 380, 30], [1330, 360, 22], [1600, 40, 20]].map(([x, y, r], i) => { const e = el('div', 'abs', Dworld, `<svg viewBox="-40 -40 80 80" width="80" height="80">${sparkle(0, 0, r, i % 2 ? '#fff' : '#ffe45c')}</svg>`); css(e, { left: x - 40 + 'px', top: y - 40 + 'px' }); return e; });
const cursorD = el('div', '', Dshake, ICON.cursor); cursorD.id = 'cursorD';

// ======================= render =======================
const flash = document.getElementById('flash'), fade = document.getElementById('fade'), offline = document.getElementById('offline'), all = document.getElementById('all');
function flashAt(t) {
  let v = 0;
  v = Math.max(v, t < 1.1 ? E.inQ(P(t, .9, 1.06)) : 1 - E.outQ(P(t, 1.1, 1.42)));
  v = Math.max(v, t < 8.6 ? E.inQ(P(t, 8.4, 8.58)) : 1 - E.outQ(P(t, 8.6, 8.86)));
  if (t >= 9.47) v = Math.max(v, .85 * (1 - P(t, 9.47, 9.62)));
  if (t >= 4.95 && t < 5.3) v = Math.max(v, .35 * (1 - P(t, 5.0, 5.2)) * (t >= 5.0 ? 1 : 0));
  return v;
}

function renderA(t) {
  const cam = { rx: -3 * DEG, ry: L(20, 4, E.outQ(P(t, 0, .85))) * DEG * (1 - E.io(P(t, .8, 1.0))), dz: 0 };
  Acam.style.transform = camCSS(cam);
  const h = horizon(cam); placeSky(Asky, h.y, h.x, t, 11);
  Afloor.style.backgroundPosition = `0 ${(t * 60) % 40}px`;
  const k = E.inC(P(t, .78, 1.06));
  const bob = Math.sin(t * 3) * 8 * (1 - k);
  crt.style.transform = `translate3d(0,${L(-30, 18, k) + bob}px,${L(-80, 930, k)}px) rotateY(${L(-12, 0, E.outQ(P(t, 0, 1))) }deg) rotateX(${L(4, 0, k)}deg)`;
  // CRT power-on: line then open
  const a = P(t, .76, .84), b = P(t, .84, .96);
  if (t < .76) { scrOn.style.opacity = 0; }
  else { scrOn.style.opacity = 1; css(scrOn, { transform: `translate(-50%,-50%) scale(${Math.max(.01, E.outC(a))},${Math.max(.012, E.outQ(b))})` }); }
  led.style.background = t > .76 ? '#46e0bd' : (Math.sin(t * 18) > 0 ? '#ff5fae' : '#7a3b5e');
  Acoins.forEach(c => { const [x, y, z, i] = c.p; c.style.transform = `translate3d(${x}px,${y + Math.sin(t * 2 + i) * 18}px,${z}px) rotateY(${t * (110 + i * 25) + i * 40}deg) rotateZ(${Math.sin(i) * 20}deg)`; });
  fade.style.opacity = 1 - E.outQ(P(t, 0, .35));
}

function renderB(t) {
  const fall = E.inQ(P(t, 4.37, 4.86));
  desk.style.transform = `rotateX(${fall * 90}deg) scale(${L(1.05, 1, E.outC(P(t, 1.06, 1.6)))})`;
  desk.style.opacity = 1 - P(t, 4.7, 4.86);
  // toast
  const kt = P(t, 1.08, 1.45);
  toast.style.transformOrigin = '100% 100%';
  toast.style.transform = `translateX(${(1 - E.outBack(kt, 1.6)) * 560}px) scale(${WS})`;
  bell.style.transform = `rotate(${Math.sin((t - 1.08) * 28) * 22 * Math.exp(-2.2 * Math.max(0, t - 1.08))}deg)`;
  // 叮咚 burst
  const kd = P(t, 1.08, 1.32), ko = P(t, 1.95, 2.18);
  vis(dd, t >= 1.08 && t < 2.18);
  css(dd, { left: '1350px', top: '470px', transform: `scale(${E.outBack(kd, 2.4) * (1 - E.inBack(ko))}) rotate(${L(-30, 6, E.outC(kd)) + Math.sin(t * 9) * 3}deg)` });
  // dialog
  const kp = P(t, 2.2, 2.55);
  vis(dlg, t >= 2.2);
  const p = t >= DRAG0 ? dragPos(Math.min(t, DRAG1)) : { x: DLGX, y: DLGY };
  css(dlg, { left: p.x + 'px', top: p.y + 'px', transform: `scale(${Math.max(.001, E.outBack(kp, 2.2)) * WS}) rotate(${L(-8, 0, E.outC(kp))}deg)` });
  // window trail (the classic "stuck dialog" glitch)
  trailEls.forEach((w, i) => { const ts = DRAG0 + i * STAMP; const on = t >= ts + STAMP; vis(w, on); if (on) { const q = dragPos(ts); css(w, { left: q.x + 'px', top: q.y + 'px', transform: `scale(${WS})` }); } });
  // tooltip
  const ktp = P(t, 2.62, 2.72);
  vis(tip, t >= 2.62 && t < 2.98);
  css(tip, { left: '1112px', top: '664px', transform: `scale(${E.outBack(ktp)})`, transformOrigin: '20% 0' });
  // cursor
  const c = curAt(t);
  const press = t >= 2.9 && t < DRAG1 ? .9 : 1;
  css(cursor, { transform: `translate(${c.x}px,${c.y}px) scale(${press})` });
  // clock rolls into December
  const midnight = t >= 4.22;
  deskB.clockB.textContent = midnight ? '00:00' : '23:59';
  deskB.clockS.textContent = midnight ? '12月1日' : '11月30日';
  const kr = P(t, 4.22, 4.5);
  deskB.ring.style.opacity = midnight ? 1 - kr : 0; deskB.ring.style.transform = `scale(${1 + kr * .5})`;
  deskB.batt.style.width = '86%';
}

function camC(t) {
  const ry = t < 7.4 ? L(-16, 10, E.ioQ(P(t, 4.37, 7.4))) : L(10, 0, E.io(P(t, 7.4, 8.6)));
  let dz = t < 4.95 ? L(160, 0, E.outC(P(t, 4.37, 4.95))) : t < 7.5 ? L(0, -60, P(t, 4.95, 7.5)) : L(-60, 330, E.inC(P(t, 7.5, 8.6)));
  const dy = L(0, -190, E.io(P(t, 7.3, 8.5)));
  return { rx: -4.5 * DEG, ry: ry * DEG, dz, dy };
}
function renderC(t) {
  const cam = camC(t);
  Ccam.style.transform = camCSS(cam);
  const h = horizon(cam); placeSky(Csky, h.y, h.x, t, 23);
  Cfloor.style.backgroundPosition = `0 ${(t * 40) % 40}px`;
  debris.forEach(o => { const [x, y, z] = o.p, i = o.i; o.style.transform = `translate3d(${x + Math.sin(t * .7 + i) * 40}px,${y - (t - 4.37) * 25 + Math.cos(t + i) * 20}px,${z}px) rotateY(${Math.sin(t * .9 + i * 2) * 35}deg) rotateZ(${Math.sin(t * .6 + i) * 12}deg)`; });
  Ccoins.forEach(c => { const [x, y, z, i] = c.p; c.style.transform = `translate3d(${x}px,${y + Math.sin(t * 2 + i) * 18}px,${z}px) rotateY(${t * (120 + i * 15)}deg)`; });
  // calendar rises from the grid floor
  const kc = P(t, 4.45, 5.0);
  const calY = L(1000, 50, E.outBack(kc, 1.3)) + E.inBack(P(t, 7.15, 7.5)) * 1150;
  cal.style.transform = `translate3d(-430px,${calY}px,-160px) rotateY(${26 + Math.sin(t * 1.3) * 3}deg)`;
  // tear-off 11/30
  const lift = E.outQ(P(t, 4.86, 5.0)), kt = P(t, 5.0, 5.62), ke = E.outQ(kt);
  vis(page11, t < 5.62);
  page11.style.transform = `translate3d(${ke * 980}px,${-280 - ke * 520 + kt * kt * 380}px,${41 + ke * 700}px) rotateX(${lift * 16 + ke * 250}deg) rotateY(${-ke * 90}deg) rotateZ(${-lift * 4 - ke * 140}deg)`;
  page11.style.transformOrigin = '0 0';
  p11f.style.opacity = p11b.style.opacity = 1 - P(kt, .7, 1);
  // headline
  const kg = P(t, 5.56, 5.9);
  vis(gn, t >= 5.56);
  const gs = Math.max(.001, spring(t - 5.56, 0, 13, 6));
  gn.style.transform = `translate3d(${400 - 280 * E.io(P(t, 7.15, 7.6))}px,${-170 - 150 * E.io(P(t, 7.15, 7.6)) + Math.sin(t * 2.4) * 10}px,-120px) rotateY(${-20 + Math.sin(t * 1.7) * 14}deg) rotateX(${L(-70, 0, E.outC(kg)) + Math.sin(t * 2.1) * 5}deg) scale(${gs})`;
  vis(gnStar, t >= 6.68);
  gnStar.style.transform = `translate(300px,-150px) translateZ(4px) scale(${E.outBack(P(t, 6.68, 6.85))})`;
  const kg2 = P(t, 6.12, 6.45);
  const away = E.inBack(P(t, 7.25, 7.55));
  vis(gn2, t >= 6.12 && t < 7.55); vis(fine, t < 7.55);
  gn2.style.transform = `translate3d(${420 + away * 700}px,${30 - away * 500 + Math.sin(t * 2.4 + 1) * 8}px,-80px) rotateY(${-16 + Math.sin(t * 1.5 + 1) * 10}deg) scale(${Math.max(.001, spring(t - 6.12, 0, 13, 6))}) rotateZ(${L(14, -3, E.outC(kg2))}deg)`;
  const nf = Math.floor(P(t, 6.68, 7.15) * FINE.length);
  fine.textContent = FINE.slice(0, nf) + (nf < FINE.length && t > 6.68 && Math.sin(t * 30) > 0 ? '▌' : '');
  fine.style.transform = `translate3d(${150 + away * 900}px,${140 - away * 420}px,-80px) rotateY(${-16 + Math.sin(t * 1.5 + 1) * 10}deg)`;
  // Pro gift lands with a thud and glows; then the tiny Plus gift plops in front
  const kp = P(t, 7.23, 7.5);
  vis(proGift, t >= 7.23);
  const pThud = t > 7.36 ? 1 + .07 * Math.exp(-12 * (t - 7.36)) * Math.sin((t - 7.36) * 34) : 1;
  proGift.style.transform = `translate3d(-160px,${L(-1700, 330 - 180, E.outBounce(kp))}px,-560px) rotateY(${L(-60, -18, E.outC(kp)) + Math.sin(t * 1.6) * 3}deg) scale3d(${2 - pThud},${pThud},${2 - pThud})`;
  vis(rays, t >= 7.36);
  rays.style.transform = `translate3d(0,-60px,-240px) rotateY(18deg) rotate(${t * 30}deg) scale(${E.outBack(P(t, 7.36, 7.6))})`;
  proCrown.style.transform = `rotate(${Math.sin(t * 5) * 6}deg) translateY(${Math.sin(t * 4) * 6}px)`;
  const kd = P(t, 7.45, 7.72);
  vis(gift, t >= 7.45);
  const gy = L(-1300, 330 - 70, E.outBounce(kd));
  const squash = t > 7.5 && t < 7.79 ? 1 + .16 * Math.exp(-14 * (t - 7.55)) * Math.sin((t - 7.55) * 44) : 1;
  gift.style.transform = `translate3d(90px,${gy}px,330px) rotateY(${L(140, 20, E.outC(kd)) + Math.sin(t * 2) * 4}deg) scale3d(${2 - squash},${squash},${2 - squash})`;
  const kl = P(t, 7.79, 8.25);
  const pre = t < 7.79 ? Math.max(0, Math.sin((t - 7.65) * 60)) * 6 * P(t, 7.65, 7.79) : 0;
  lid.style.transform = `translate3d(${-kl * 260}px,${-70 - gift.lh / 2 - pre - E.outC(kl) * 300 + kl * kl * 160}px,${kl * 80}px) rotateZ(${-kl * 70}deg) rotateX(${kl * 40}deg)`;
  const kf = E.inQ(P(t, 8.0, 8.58));
  vis(flyA, t >= 8.0); vis(flyB, t >= 8.0);
  flyA.style.transform = `translate3d(${90 - kf * 610}px,${L(190, -40, kf)}px,${L(330, 1150, kf)}px) rotateZ(${-kf * 300}deg) rotateY(${kf * 40}deg) scale(${L(.35, 1, kf)})`;
  flyB.style.transform = `translate3d(${90 + kf * 560}px,${L(190, 0, kf)}px,${L(330, 1150, kf)}px) rotateZ(${kf * 300}deg) rotateY(${-kf * 40}deg) scale(${L(.35, 1, kf)})`;
  // confetti
  const g = ctx2d(Cconf);
  const c1 = project(-430, -200, -160, camC(5.0)); confetti(g, t, 5.0, c1.x, c1.y, 5, 110, 1.1);
  const c2 = project(90, 180, 330, camC(7.79)); confetti(g, t, 7.79, c2.x, c2.y, 9, 70, .8, true);
  const c3 = project(-160, -260, -560, camC(7.4)); confetti(g, t, 7.4, c3.x, c3.y, 13, 90, 1.0);
  C.style.opacity = 1;
}

function renderD(t) {
  const imp = 9.47;
  const sh = t >= imp ? 26 * Math.exp(-11 * (t - imp)) : 0;
  Dshake.style.transform = `translate(${Math.sin(t * 97) * sh}px,${Math.cos(t * 83) * sh}px)`;
  const ke = P(t, 8.6, 8.98), kr = E.inC(P(t, 9.2, imp));
  const bob = Math.sin(t * 9) * 7 * P(t, 8.9, 9.0);
  const merged = t >= imp;
  vis(wGPT, !merged); vis(wCdx, !merged); vis(wM, merged); vis(eq, t >= 9.55); vis(Dburst, merged && t < 9.8);
  if (!merged) {
    const x = (1 - E.outBack(ke, 1.5)) * -1300, ry = L(70, 0, E.outC(ke)) + kr * 28;
    wGPT.style.transform = `translate3d(${x + kr * 320}px,${bob}px,${kr * 140}px) rotateY(${ry}deg) rotateZ(${-kr * 4}deg) scale(${WS})`;
    wCdx.style.transform = `translate3d(${-x - kr * 340}px,${-bob}px,${kr * 140}px) rotateY(${-ry}deg) rotateZ(${kr * 4}deg) scale(${WS})`;
  } else {
    const dt = t - imp;
    const s = spring(dt, 1.35, 16, 7);
    wM.style.transform = `scale(${s * WS}) rotateX(${8 * Math.exp(-7 * dt) * Math.sin(dt * 18)}deg) rotateY(${6 * Math.exp(-6 * dt) * Math.sin(dt * 14)}deg)`;
    Dburst.style.transform = `scale(${L(.4, 2.4, E.outC(P(t, imp, 9.8)))}) rotate(${dt * 60}deg)`;
    Dburst.style.opacity = 1 - P(t, 9.6, 9.8);
    const f = 1 - .94 * E.ioQ(P(t, 11.0, 13.1));
    const col = f > .5 ? '#46e0bd' : f > .22 ? '#ffe45c' : '#ff3b5c';
    css(mFill, { width: (f * 100).toFixed(2) + '%', background: `repeating-linear-gradient(-45deg,${col} 0 22px,rgba(255,255,255,.35) 22px 44px),${col}` });
    mPct.textContent = Math.round(f * 100) + '%';
    mFace.innerHTML = mascot(f, f > .45 ? 'happy' : 'sad');
    css(mFace, { left: Math.max(0, f * 808 - 128) + 'px', display: 'block' });
    mHeart.style.transform = `scale(${1 + .18 * Math.abs(Math.sin(t * 9))})`;
    vis(mWarn, t >= 12.5 && Math.sin(t * 22) > -.3);
    eq.style.transform = `scale(${E.outBack(P(t, 9.55, 9.72), 2.5)}) rotate(${-10 + Math.sin(t * 12) * 2}deg)`;
  }
  // the Pro window just floats above it all
  const kpw = P(t, 8.62, 9.0), smug = t > 12.6 ? Math.exp(-4 * (t - 12.6)) * Math.sin((t - 12.6) * 18) : 0;
  wPro.style.transform = `translate3d(0,${(1 - E.outBack(kpw, 1.6)) * -560 + Math.sin(t * 2.6) * 10 - smug * 16}px,-60px) rotateY(${-16 + Math.sin(t * 1.8) * 4}deg) rotateZ(${3 + smug * 4}deg) scale(${WS})`;
  pBar.style.backgroundPosition = `${(t * 260) % 520}px 0`;
  proSpk.forEach((e, i) => { e.style.transform = `scale(${P(t, 8.8, 9.0) * (.55 + .45 * Math.abs(Math.sin(t * 5 + i * 1.3)))}) rotate(${t * 40 + i * 20}deg)`; });
  css(cursorD, { transform: `translate(${L(1100, 1140, P(t, 8.6, 10))}px,${L(840, 870, P(t, 8.6, 10))}px)` });
  vis(cursorD, t < 13.6);
  deskD.batt.style.width = (merged ? 86 * (1 - .9 * P(t, 11.0, 13.1)) : 86) + '%';
  deskD.batt.style.background = merged && t > 12.4 ? '#ff3b5c' : '';
  const g = ctx2d(Dconf);
  confetti(g, t, imp, 770, 360, 31, 110, 1.5, true);
}

