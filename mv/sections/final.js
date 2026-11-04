/* 171.3–218.4: Final chorus + Outro */
(function () {
  const HAIR = `<svg viewBox="0 0 200 80"><path d="M20 70 q10-60 80-60 q70 0 80 60 q-20-24-40-20 q-10-26-40-14 q-30-12-40 14 q-20-4-40 20z" fill="#f2f2f8" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/></svg>`;
  const SPECS = `<svg viewBox="0 0 200 70"><circle cx="60" cy="35" r="26" fill="rgba(255,255,255,.35)" stroke="${INK}" stroke-width="7"/><circle cx="140" cy="35" r="26" fill="rgba(255,255,255,.35)" stroke="${INK}" stroke-width="7"/><path d="M86 35h28" stroke="${INK}" stroke-width="7"/></svg>`;
  function fireworks(g, t, list) {
    for (const [t0, x, y, col, seed] of list) {
      const d = t - t0; if (d < 0 || d > 1.6) continue; const r = rng(seed);
      for (let i = 0; i < 46; i++) {
        const a = i / 46 * Math.PI * 2 + r() * .1, sp = 260 + r() * 140, k = (1 - Math.exp(-2.6 * d)) / 2.6;
        const px = x + Math.cos(a) * sp * k, py = y + Math.sin(a) * sp * k + 90 * d * d;
        g.globalAlpha = clamp(1.4 - d); g.fillStyle = i % 3 ? col : '#fff';
        g.beginPath(); g.arc(px, py, 5.5 - d * 2.4, 0, 6.283); g.fill();
      }
      g.globalAlpha = 1;
    }
  }
  // ---------- F1 171.33–175.91: Chat & Codex, growing old together ----------
  addScene(171.34, 175.92, (root) => {
    const W = world3D(root, { pal: SKY.dawn, seed: 171, speed: 8 });
    const seat = box(W.cam, 640, 30, 180, { bg: '#c98a4a', top: { bg: 'repeating-linear-gradient(90deg,#d99a5a 0 60px,#c98a4a 60px 64px)' } });
    const back = box(W.cam, 640, 120, 24, { bg: '#c98a4a', front: { bg: 'repeating-linear-gradient(0deg,#d99a5a 0 36px,#b97a3a 36px 40px)' } });
    const legs = [-260, 260].map(x => { const l = box(W.cam, 30, 130, 150, { bg: '#7a4a1e' }); l.x = x; return l; });
    const a = obj(W.cam, ICON.chat, 220, 220), b = obj(W.cam, ICON.code, 220, 220);
    const ha = obj(W.cam, HAIR, 210, 84), hb = obj(W.cam, HAIR, 210, 84), sa = obj(W.cam, SPECS, 170, 60), sb = obj(W.cam, SPECS, 170, 60);
    const heart = obj(W.cam, ICON.heart, 110, 110);
    const leaves = [...Array(12)].map((_, i) => { const l = obj(W.cam, `<svg viewBox="0 0 60 40"><path d="M4 20 C20 0 46 0 56 20 C46 40 20 40 4 20Z" fill="${['#ffb84d', '#ff7a5c', '#ffd23f'][i % 3]}" stroke="${INK}" stroke-width="4"/></svg>`, 60, 40); l.i = i; return l; });
    const tag = sticker(root, '白头到老 ♡', { size: 80, fc: '#fff', x: 760, y: 70 });
    const C = mkCanvas(root);
    return (t) => {
      W.place(t, { rx: -4 * DEG, ry: L(-12, 10, E.io(P(t, 171.3, 175.9))) * DEG, dz: L(0, 140, E.io(P(t, 171.3, 175.9))), dy: -20 });
      seat.style.transform = 'translate3d(0,200px,0)'; back.style.transform = 'translate3d(0,120px,-80px)'; legs.forEach(l => l.style.transform = `translate3d(${l.x}px,270px,0)`);
      const sway = Math.sin(t * 2) * 4;
      a.style.transform = tr3(-140, 80, -20, 0, 0, 6 + sway); b.style.transform = tr3(140, 80, -20, 0, 0, -6 + sway);
      ha.style.transform = tr3(-148, -20, -5, 0, 0, 6 + sway); hb.style.transform = tr3(132, -20, -5, 0, 0, -6 + sway);
      sa.style.transform = tr3(-140, 50, 0, 0, 0, 6 + sway); sb.style.transform = tr3(140, 50, 0, 0, 0, -6 + sway);
      heart.style.transform = tr3(0, -90 + Math.sin(t * 3) * 14, 0, 0, 0, 0, 1 + .12 * Math.abs(Math.sin(t * 5)));
      leaves.forEach(l => { const k = (t * .25 + l.i / 12) % 1; l.style.transform = tr3(-800 + (l.i * 151) % 1600 + Math.sin(t + l.i) * 60, -500 + k * 900, -200 + (l.i % 4) * 100, 0, 0, t * 80 + l.i * 30); });
      tag.style.transform = `scale(${popS(t, 172.0, 0)}) rotate(-3deg)`;
      const g = ctx2d(C); confetti(g, t, 171.33, 960, 300, 171, 140, 1.6, true);
    };
  });
  addFlash(175.8, 175.92, 176.15, .8);

  // ---------- F2 175.91–180.24: one burns quota, one runs alongside; my progress smiles in place ----------
  addScene(175.92, 180.25, (root) => {
    const W = world3D(root, { pal: SKY.night, seed: 176, speed: 260 });
    const tread = box(W.cam, 520, 40, 260, { front: { bg: '#3a2a66' }, top: { bg: 'repeating-linear-gradient(90deg,#2b1d4a 0 30px,#4b3a8a 30px 60px)' }, left: { bg: '#2f2466' }, right: { bg: '#2f2466' }, back: { bg: '#2f2466' }, bottom: { bg: '#21183f' } });
    const rail = box(W.cam, 30, 220, 30, { bg: '#a99bff' });
    const runner = obj(W.cam, ICON.chat, 200, 200), jogger = obj(W.cam, ICON.code, 180, 180);
    const flag = obj(W.cam, `<div class="tagl kw" style="position:relative;font-size:32px;background:#ffe45c">陪跑 ♪</div>`, 160, 56);
    const eatTag = obj(W.cam, `<div class="tagl kw" style="position:relative;font-size:32px;background:#ff9ad5">消耗中…</div>`, 170, 56);
    const coins = [...Array(6)].map((_, i) => { const c = coin(W.cam, 70, '额'); c.i = i; return c; });
    const prog = obj(W.cam, '', 300, 165);
    const progT = obj(W.cam, `<div class="kw" style="font-size:44px;color:#fff;-webkit-text-stroke:2px #2b1d4a;white-space:nowrap;text-align:center">工作进度 0%</div>`, 300, 60);
    const lines = [...Array(8)].map((_, i) => { const l = el('div', 'abs', root); css(l, { height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,.7)', width: 200 + (i % 3) * 120 + 'px' }); l.i = i; return l; });
    return (t) => {
      W.place(t, { rx: -5 * DEG, ry: L(14, -6, E.io(P(t, 175.9, 180.2))) * DEG, dz: 60, dy: -30 });
      tread.style.transform = 'translate3d(-180px,250px,-100px)'; tread.faces.top.style.backgroundPosition = `${(t * 500) % 60}px 0`;
      rail.style.transform = 'translate3d(-420px,140px,-100px)';
      const run = Math.abs(Math.sin(t * 14));
      runner.style.transform = tr3(-180, 130 - run * 40, -100, 0, 0, -8 + run * 4);
      eatTag.style.transform = tr3(-180, -40, -100);
      coins.forEach(c => { const k = ((t * 1.2) + c.i / 6) % 1; c.style.transform = `translate3d(${-180 + 600 * (1 - k)}px,${180 - Math.sin(k * Math.PI) * 30}px,-100px) rotateY(${t * 400}deg) scale(${k > .85 ? (1 - k) / .15 : 1})`; });
      const jog = Math.abs(Math.sin(t * 7));
      jogger.style.transform = tr3(260, 170 - jog * 26, 60, -10, 0, Math.sin(t * 7) * 6);
      flag.style.transform = tr3(260, 30 - jog * 26, 60, -10, 0, Math.sin(t * 7) * 6);
      vis(prog, t > 178.0); vis(progT, t > 178.0);
      prog.inner.innerHTML = mascot(0, 'smile');
      prog.style.transform = tr3(-560, 200, 300, 15, 0, Math.sin(t * 2) * 3, popS(t, 178.0, 0, 12, 7));
      progT.style.transform = tr3(-560, 85, 300, 15, 0, 0, popS(t, 178.1, 0, 12, 7));
      lines.forEach(l => { const k = (t * 2.4 + l.i / 8) % 1; css(l, { left: 1920 - k * 2400 + 'px', top: 160 + l.i * 90 + 'px', opacity: Math.sin(k * Math.PI) * .8 }); });
    };
  });
  addFlash(180.12, 180.25, 180.45, .8);

  // ---------- F3 180.24–184.77: the upgrade-window tunnel ----------
  addScene(180.25, 184.78, (root) => {
    const sky = el('div', 'full', root); sky.style.background = 'radial-gradient(circle at 50% 50%,#fff3c0 0,#ffb84d 18%,#c2408f 55%,#2b1d4a 100%)';
    const world = el('div', 'world', root), cam = el('div', 'cam', world);
    const ws = [];
    for (let ring = 0; ring < 9; ring++) for (let j = 0; j < 7; j++) {
      const o = el('div', 'obj', cam);
      const w = win(o, { title: '✨ 升级 Pro', w: 420, h: 220, x: -210, y: -110, theme: 'gold', html: `<div style="padding:18px 24px"><div class="kw" style="font-size:38px">${['更多额度', '更快速度', '不用排队', '尊享特权', '立即升级', '限时优惠', '下一档'][(ring + j) % 7]}</div><div class="btnx" style="margin-top:12px;height:48px;font-size:24px;background:#ffd23f">升级</div></div>` });
      o.ring = ring; o.a = j / 7 * Math.PI * 2 + ring * .4; ws.push(o);
    }
    const btnO = el('div', 'obj', cam);
    const btn = el('div', 'abs', btnO, '<div class="kw" style="width:760px;height:220px;display:flex;align-items:center;justify-content:center;font-size:110px;background:linear-gradient(#ffe680,#ffb84d);border:10px solid #2b1d4a;border-radius:110px;box-shadow:0 18px 0 #2b1d4a,0 0 80px 30px rgba(255,230,140,.9)">立即升级</div>'); css(btn, { left: '-380px', top: '-110px' });
    const cur = mkCursor(root);
    const done = sticker(root, '烦恼 −100%', { size: 110, fc: '#46e0bd', x: 600, y: 120 });
    const C = mkCanvas(root);
    return (t) => {
      const fly = (t - 180.25) * 1500 * (1 - .75 * E.io(P(t, 182.2, 182.9)));
      cam.style.transform = `rotateZ(${t * 12}deg)`;
      ws.forEach(o => { const z = -o.ring * 700 - 300 + fly; const vis2 = z < 1100 && z > -6500; vis(o, vis2); if (vis2) o.style.transform = `rotateZ(${o.a}rad) translate3d(0,-700px,${z}px) rotateX(-12deg)`; });
      const bk = E.outC(P(t, 182.3, 183.0));
      vis(btnO, t > 182.3); btnO.style.transform = `rotateZ(${-t * 12}deg) translateZ(${L(-4000, -300, bk)}px) scale(${1 + (t > 183.2 && t < 183.35 ? -.06 : 0)})`;
      vis(cur, t > 182.7); cur.style.transform = `translate(${L(1400, 990, E.io(P(t, 182.7, 183.15)))}px,${L(900, 560, E.io(P(t, 182.7, 183.15)))}px)`;
      vis(done, t > 183.35); done.style.transform = `scale(${popS(t, 183.35, 0)}) rotate(-6deg)`;
      const g = ctx2d(C); confetti(g, t, 183.3, 960, 540, 181, 120, 1.6);
    };
  });
  addFlash(184.66, 184.78, 185.0, .8);

  // ---------- F4 184.77–189.24: Plus's dream burns slowly; Pro's world, always sunny ----------
  addScene(184.78, 189.25, (root) => {
    const halves = [['night', 'grid', 'inset(0 50% 0 0)', -1], ['gold', 'gold', 'inset(0 0 0 50%)', 1]].map(([pal, fl, clip, side]) => {
      const h = el('div', 'full', root); h.style.clipPath = clip;
      const W = world3D(h, { pal: SKY[pal], floor: fl, seed: 185 + side, noSun: true });
      const thing = obj(W.cam, '', side < 0 ? 300 : 560, side < 0 ? 520 : 560);
      return { W, thing, side };
    });
    const div = el('div', 'abs', root); css(div, { left: '954px', top: '0', width: '12px', height: '1080px', background: '#fff', border: '4px solid #2b1d4a' });
    const labs = [['Plus 的梦想', 200, 184.9, '#d3d3de'], ['Pro 的世界', 1180, 186.98, '#ffe45c']].map(([s, x, t0, fc]) => { const e = sticker(root, s, { size: 70, fc, x, y: 70 }); e.t0 = t0; return e; });
    const candle = k => { const h = 300 * (1 - k * .75); return `<svg viewBox="0 0 300 520" overflow="visible"><ellipse cx="150" cy="500" rx="130" ry="18" fill="#ffd6ea" stroke="${INK}" stroke-width="6"/><rect x="95" y="${490 - h}" width="110" height="${h}" rx="14" fill="#fff0f8" stroke="${INK}" stroke-width="7"/><path d="M110 ${490 - h} q0 ${40 + k * 60} 10 ${60 + k * 80}" stroke="#ffd6ea" stroke-width="14" stroke-linecap="round" fill="none"/><rect x="118" y="${490 - h + 60}" width="64" height="30" rx="6" fill="#d3d3de" stroke="${INK}" stroke-width="4"/><text x="150" y="${490 - h + 82}" text-anchor="middle" font-family="ZCOOL KuaiLe" font-size="20" fill="${INK}">Plus</text><path d="M150 ${490 - h} v-24" stroke="${INK}" stroke-width="5"/><path id="fl" d="M150 ${490 - h - 110} C182 ${490 - h - 60} 176 ${490 - h - 30} 150 ${490 - h - 20} C124 ${490 - h - 30} 118 ${490 - h - 60} 150 ${490 - h - 110}Z" fill="#ffb84d" stroke="${INK}" stroke-width="5"/></svg>`; };
    const SUN = `<svg viewBox="0 0 560 560" overflow="visible"><g id="ry">${[...Array(16)].map((_, i) => `<path d="M280 280 L${280 + Math.cos(i / 16 * 6.283 - .1) * 280} ${280 + Math.sin(i / 16 * 6.283 - .1) * 280} L${280 + Math.cos(i / 16 * 6.283 + .1) * 280} ${280 + Math.sin(i / 16 * 6.283 + .1) * 280}Z" fill="#fff3a0" opacity=".9"/>`).join('')}</g><circle cx="280" cy="280" r="150" fill="#ffd23f" stroke="${INK}" stroke-width="9"/><rect x="170" y="235" width="94" height="52" rx="20" fill="${INK}"/><rect x="296" y="235" width="94" height="52" rx="20" fill="${INK}"/><path d="M264 255h32" stroke="${INK}" stroke-width="9"/><path d="M190 248h26" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M230 330q50 40 100 0" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/></svg>`;
    halves[1].thing.inner.innerHTML = SUN;
    const ry = halves[1].thing.inner.querySelector('#ry');
    return (t) => {
      halves.forEach(({ W, thing, side }) => {
        W.place(t, { rx: -4 * DEG, ry: Math.sin(t * .5) * 4 * DEG, dz: 40, dy: 0 });
        if (side < 0) { thing.inner.innerHTML = candle(E.inQ(P(t, 184.8, 189.2))); const f = thing.inner.querySelector('#fl'); f.style.transformOrigin = '150px 480px'; f.style.transform = `scale(${1 + Math.sin(t * 23) * .08},${1 + Math.sin(t * 17) * .12})`; thing.style.transform = tr3(-470, 70, 0); }
        else { thing.style.transform = tr3(470, -140, -200, 0, 0, Math.sin(t * 2) * 4, t < 186.98 ? .45 + .03 * Math.sin(t * 3) : popS(t, 186.98, .45, 10, 6)); ry.setAttribute('transform', `rotate(${t * 30} 280 280)`); }
      });
      labs.forEach(e => { vis(e, t >= e.t0); e.style.transform = `scale(${popS(t, e.t0, 0)}) rotate(-3deg)`; });
    };
  });
  addFlash(189.12, 189.25, 189.5, .9);

  // ---------- F5 189.24–194.06: 啦啦啦 + 谢谢老板 fireworks ----------
  addScene(189.25, 194.07, (root) => {
    const W = world3D(root, { pal: SKY.night, seed: 190, speed: 120 });
    const cols = ['#46e0bd', '#ff9ad5', '#ffd23f', '#a99bff', '#7fd3ff'];
    const ms = cols.map((c, i) => { const m = obj(W.cam, mascot(1, i === 2 ? 'cool' : i % 2 ? 'love' : 'happy', c), 240, 132); m.i = i; return m; });
    const neon = el('div', 'abs', root, '<div class="kw" style="font-size:150px;color:#fff;padding:20px 60px;border:12px solid #ff5fae;border-radius:40px;white-space:nowrap">谢谢老板！</div>'); css(neon, { left: '540px', top: '90px' });
    const C = mkCanvas(root);
    const FW = [[189.4, 400, 260, '#ff5fae', 1], [189.9, 1500, 220, '#ffe45c', 2], [190.5, 960, 160, '#46e0bd', 3], [191.0, 300, 300, '#a99bff', 4], [191.6, 1650, 320, '#ff9ad5', 5], [192.2, 700, 200, '#ffe45c', 6], [192.8, 1250, 250, '#7fd3ff', 7], [193.4, 500, 180, '#ff5fae', 8]];
    return (t) => {
      W.place(t, { rx: -6 * DEG, ry: Math.sin(t * 1.2) * 10 * DEG, dz: 40, dy: -20 });
      ms.forEach(m => { const ph = ((t - 189.24) / BEAT + (m.i % 2) * .5) % 1; const hop = Math.sin(ph * Math.PI); m.style.transform = tr3(-560 + m.i * 280, 230 - hop * 90, 0, 0, 0, (m.i % 2 ? 1 : -1) * Math.sin(t * 7) * 10); });
      const on = t > 191.48;
      vis(neon, on);
      const fl = Math.sin(t * 40) > -.7 ? 1 : .6;
      neon.firstChild.style.textShadow = `0 0 ${20 * fl}px #ff5fae,0 0 ${50 * fl}px #ff5fae`; neon.firstChild.style.boxShadow = `0 0 ${30 * fl}px 6px #ff5fae,inset 0 0 ${30 * fl}px 4px #ff5fae`;
      neon.style.transform = `scale(${popS(t, 191.48, .4, 14, 6)})`;
      const g = ctx2d(C); fireworks(g, t, FW);
    };
  });

  // ---------- F6 194.06–199.79: everyone can use it — tickets just differ in height ----------
  addScene(194.07, 199.8, (root) => {
    const W = world3D(root, { pal: SKY.dawn, seed: 194 });
    const gate = obj(W.cam, `<svg viewBox="0 0 1000 620"><rect x="60" y="120" width="70" height="500" fill="#ff9ad5" stroke="${INK}" stroke-width="9"/><rect x="870" y="120" width="70" height="500" fill="#ff9ad5" stroke="${INK}" stroke-width="9"/><rect x="20" y="60" width="960" height="130" rx="40" fill="#fff6d6" stroke="${INK}" stroke-width="9"/><text x="500" y="148" text-anchor="middle" font-family="ZCOOL KuaiLe" font-size="70" fill="${INK}">AI 乐园 · 人人都能用到 ♡</text>${[...Array(9)].map((_, i) => `<circle cx="${80 + i * 105}" cy="40" r="18" fill="${['#ffe45c', '#46e0bd', '#ff5fae'][i % 3]}" stroke="${INK}" stroke-width="5"/>`).join('')}</svg>`, 1000, 620);
    const T = [['Plus', 160, '#e6e6ef', '#c9c9d6', -330], ['Pro', 620, '#ffd23f', '#e0a800', 0], ['下一档', 1500, '#ffd6ea', '#ff9ad5', 330]];
    const tickets = T.map(([lab, h, f, s, x]) => { const b = box(W.cam, 230, h, 60, { front: { bg: `repeating-linear-gradient(0deg,${f} 0 60px,${s} 60px 64px)`, html: `<div class="tagl kw" style="left:14px;top:14px;font-size:30px">${lab} 门票</div>` }, back: { bg: s }, left: { bg: f }, right: { bg: s }, top: { bg: f }, bottom: { bg: s } }); b.h = h; b.x = x; return b; });
    const clouds = [[-300, -1100], [400, -1300], [0, -1500]].map(([x, y]) => { const c = obj(W.cam, `<svg viewBox="-60 -50 320 140">${cloud(0, 0, 1)}</svg>`, 460, 200); c.p = [x, y]; return c; });
    const me = obj(W.cam, mascot(.3, 'shock'), 200, 110);
    const C = mkCanvas(root);
    const FW = [[194.3, 300, 200, '#ff5fae', 11], [195.0, 1600, 240, '#ffe45c', 12], [196.4, 500, 160, '#46e0bd', 13], [197.2, 1400, 140, '#a99bff', 14], [198.0, 900, 120, '#ff9ad5', 15], [198.8, 300, 220, '#ffe45c', 16]];
    return (t) => {
      const up = E.io(P(t, 196.2, 199.5));
      W.place(t, { rx: L(-4, 14, up) * DEG, ry: Math.sin(t * .6) * 6 * DEG, dz: L(0, -200, up), dy: L(-20, 700, up) });
      gate.style.transform = tr3(0, -20, -700);
      tickets.forEach((b, i) => { const k = E.outBack(P(t, 195.94 + i * .25, 196.9 + i * .35), 1.2); const h = Math.max(1, b.h * k); b.style.transform = `translate3d(${b.x}px,${330 - h / 2}px,-100px) scale3d(1,${Math.max(.001, k)},1)`; vis(b, k > 0); });
      clouds.forEach(c => c.style.transform = tr3(c.p[0] + Math.sin(t * .4 + c.p[0]) * 30, c.p[1], -150));
      me.style.transform = tr3(-330, 330 - 160 * E.outBack(P(t, 195.94, 196.9), 1.2) - 58, -100, 0, 0, Math.sin(t * 3) * 4);
      const g = ctx2d(C); fireworks(g, t, FW);
    };
  });
  addFlash(199.68, 199.8, 200.1, .9);

  // ---------- Outro O1 199.79–204.26: December snow ----------
  const SANTA = `<svg viewBox="0 0 120 90"><path d="M10 70 C30 10 80 0 108 40 L96 46 C80 24 50 30 40 70Z" fill="#ff3b5c" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><rect x="4" y="62" width="76" height="22" rx="11" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="104" cy="46" r="12" fill="#fff" stroke="${INK}" stroke-width="5"/></svg>`;
  function snow(root, n = 60) { const fl = [...Array(n)].map((_, i) => { const f = el('div', 'abs', root); const s = 6 + (i % 4) * 4; css(f, { width: s + 'px', height: s + 'px', borderRadius: '50%', background: '#fff', border: '2px solid rgba(43,29,74,.5)' }); f.i = i; return f; }); return t => fl.forEach(f => { const k = (t * (.08 + (f.i % 5) * .02) + f.i / n) % 1; css(f, { left: (f.i * 197) % 1920 + Math.sin(t + f.i) * 40 + 'px', top: -20 + k * 1110 + 'px' }); }); }
  addScene(199.8, 204.27, (root) => {
    buildDesktop(root, '20:00', '12月31日', 'snow');
    const cal = win(root, { title: '日历', w: 520, h: 460, x: 280, y: 200, theme: 'red', html: '<div class="kw" style="text-align:center;font-size:190px;line-height:1.2;color:#ff3b5c;margin-top:20px">12月</div><div class="lbl" style="text-align:center">额度合并纪念月 ♡</div>' });
    const m = el('div', 'abs', root, mascot(.5, 'happy') + `<div style="position:absolute;left:30px;top:-46px;width:130px;height:98px;transform:rotate(-14deg)">${SANTA}</div>`); css(m, { left: '1060px', top: '420px', width: '360px', height: '198px' });
    const tree = el('div', 'abs', root, `<svg viewBox="0 0 240 320" width="300" height="400"><path d="M120 10 L40 130 H80 L20 230 H220 L160 130 H200Z" fill="#5fcf6a" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/><rect x="100" y="230" width="40" height="60" fill="#c98a4a" stroke="${INK}" stroke-width="7"/>${[[90, 110, '#ff5fae'], [150, 170, '#ffe45c'], [100, 200, '#7fd3ff'], [130, 80, '#ff3b5c']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="10" fill="${c}" stroke="${INK}" stroke-width="4"/>`).join('')}<path d="M120 0l8 14 16 2-12 11 3 16-15-8-15 8 3-16-12-11 16-2z" fill="#ffe45c" stroke="${INK}" stroke-width="4"/></svg>`); css(tree, { left: '1500px', top: '420px' });
    const sn = snow(root);
    return (t) => {
      cal.style.transform = `scale(${popS(t, 199.85, .5, 12, 7)}) rotate(-3deg)`;
      m.style.transform = `rotate(${Math.sin(t * 3) * 8}deg) translateY(${-Math.abs(Math.sin(t * 3)) * 14}px)`;
      tree.style.transform = `scale(${popS(t, 200.3, .5, 12, 7)})`;
      sn(t);
    };
  });
  // ---------- O2 204.26–208.51: save a little today, upgrade tomorrow ----------
  addScene(204.27, 208.52, (root) => {
    buildDesktop(root, '20:30', '12月31日', 'snow');
    const pig = el('div', 'abs', root, `<svg viewBox="0 0 360 280" width="460" height="358"><ellipse cx="180" cy="160" rx="150" ry="110" fill="#ffb3d9" stroke="${INK}" stroke-width="9"/><circle cx="320" cy="150" r="40" fill="#ff9ad5" stroke="${INK}" stroke-width="8"/><circle cx="310" cy="146" r="6" fill="${INK}"/><circle cx="330" cy="146" r="6" fill="${INK}"/><path d="M110 50 L130 10 L160 54Z" fill="#ff9ad5" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><circle cx="250" cy="120" r="9" fill="${INK}"/><rect x="140" y="48" width="70" height="14" rx="7" fill="${INK}"/>${[90, 150, 220, 270].map(x => `<rect x="${x}" y="250" width="30" height="34" rx="8" fill="#ff9ad5" stroke="${INK}" stroke-width="7"/>`).join('')}</svg>`); css(pig, { left: '250px', top: '400px' });
    const c1 = el('div', 'abs', root, `<div class="coinL" style="position:relative;width:90px;height:90px;background:radial-gradient(circle at 35% 30%,#fff7b8,#ffd23f 45%,#ffaa00)"><span style="font-size:46px">¥</span></div>`);
    const save = sticker(root, '今天省一点', { size: 70, fc: '#ff9ad5', x: 260, y: 230 });
    const arrow = el('div', 'abs', root, `<svg viewBox="0 0 300 120" width="320" height="128"><path d="M10 60 H230" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M10 60 H230" stroke="#ffe45c" stroke-width="10" stroke-linecap="round"/><path d="M210 16 L290 60 L210 104Z" fill="#ffe45c" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/></svg>`); css(arrow, { left: '800px', top: '520px' });
    const tom = win(root, { title: '明天 · 1月1日', w: 520, h: 420, x: 1180, y: 300, theme: 'gold', html: '<div class="kw" style="text-align:center;font-size:56px;margin-top:40px">明天再升级 ✨</div><div style="text-align:center;margin-top:40px"><div class="btnx" style="background:#ffd23f;font-size:40px;height:84px;padding:0 50px">升级 Pro</div></div>' });
    const sn = snow(root);
    return (t) => {
      const k = P(t, 204.5, 205.1);
      vis(c1, t > 204.4 && k < 1); css(c1, { left: '440px', top: L(60, 390, E.inQ(k)) + 'px', transform: `rotateY(${t * 600}deg)` });
      pig.style.transform = `scale(${1 + (t > 205.1 && t < 205.5 ? Math.sin((t - 205.1) * 30) * .04 : 0)})`;
      vis(save, t > 205.1); save.style.transform = `scale(${popS(t, 205.1, 0)}) rotate(-4deg)`;
      vis(arrow, t > 206.2); arrow.style.transform = `scaleX(${E.outBack(P(t, 206.2, 206.6))})`; arrow.style.transformOrigin = '0 50%';
      vis(tom, t > 206.5); tom.style.transform = `scale(${popS(t, 206.5, 0, 13, 7)}) rotate(3deg)`;
      sn(t);
    };
  });
  // ---------- O3 208.51–214.05: hope everyone can afford it ----------
  addScene(208.52, 214.06, (root) => {
    buildDesktop(root, '23:59', '12月31日', 'snow');
    const card = win(root, { title: '贺卡.png', w: 1240, h: 640, x: 340, y: 110, theme: 'red', html: `<div style="position:absolute;inset:16px;border-radius:14px;background:linear-gradient(#fff0f8,#e2d4ff);text-align:center"><div class="kw" style="font-size:90px;margin-top:40px">祝大家都能用得起 ♡</div><div id="cast" style="position:absolute;left:0;right:0;bottom:60px;height:240px"></div></div>` });
    const cast = card.querySelector('#cast');
    const who = [mascot(.4, 'happy'), mascot(1, 'cool', '#ffd23f'), ICON.chat, ICON.code].map((s, i) => { const e = el('div', 'abs', cast, s); css(e, { left: 90 + i * 270 + 'px', bottom: '0', width: i < 2 ? '240px' : '170px', height: i < 2 ? '132px' : '170px' }); e.i = i; return e; });
    const sn = snow(root, 80);
    const C = mkCanvas(root);
    return (t) => {
      card.style.transform = `scale(${popS(t, 208.55, .5, 11, 6)})`;
      who.forEach(e => { e.style.transform = `translateY(${-Math.abs(Math.sin(t * 4 + e.i)) * 30}px) rotate(${Math.sin(t * 4 + e.i) * 8}deg)`; });
      sn(t);
      const g = ctx2d(C); confetti(g, t, 208.6, 960, 300, 208, 100, 1.2, true);
    };
  });
  addFlash(213.92, 214.06, 214.4, .8);
  // ---------- O4 214.05–218.3: end card + 嘻嘻，谢谢老板！ ----------
  addScene(214.06, 218.4, (root) => {
    const W = world3D(root, { pal: SKY.night, seed: 214, speed: 20 });
    const title = text3D(W.cam, '尊贵的下一档', 190, '#ffe45c', 14, 5);
    const sub = el('div', 'gl', W.cam, '♪ made with Suno · 献给每一位 Plus 用户'); css(sub, { fontSize: '40px', fontWeight: '900', color: '#fff', textShadow: '3px 3px 0 #2b1d4a' });
    const me = obj(W.cam, mascot(.5, 'love'), 260, 143);
    const pro = obj(W.cam, mascot(1, 'cool', '#ffd23f'), 260, 143);
    const crown = obj(W.cam, ICON.crown, 100, 100);
    const C = mkCanvas(root);
    const FW = [[214.2, 400, 200, '#ff5fae', 21], [214.8, 1500, 180, '#ffe45c', 22], [215.5, 960, 140, '#46e0bd', 23], [216.3, 300, 260, '#a99bff', 24], [217.0, 1600, 240, '#ff9ad5', 25]];
    return (t) => {
      W.place(t, { rx: -4 * DEG, ry: Math.sin(t * .6) * 8 * DEG, dz: L(-100, 60, P(t, 214, 218.3)), dy: -20 });
      title.style.transform = `translate3d(0,${-180 + Math.sin(t * 2) * 8}px,100px) rotateY(${Math.sin(t * 1.3) * 12}deg) scale(${popS(t, 214.15, 0, 12, 6)})`;
      sub.style.transform = `translate(-50%,-50%) translate3d(0,-30px,100px)`; sub.style.opacity = P(t, 214.8, 215.2);
      const wave = Math.sin(t * 8) * 14;
      me.style.transform = tr3(-260, 180 - Math.abs(Math.sin(t * 5)) * 24, 120, 10, 0, wave);
      pro.style.transform = tr3(260, 180 - Math.abs(Math.sin(t * 5 + 1)) * 24, 120, -10, 0, -wave);
      crown.style.transform = tr3(260, 90 - Math.abs(Math.sin(t * 5 + 1)) * 24, 125, -10, 0, -wave - 12);
      const g = ctx2d(C); fireworks(g, t, FW);
    };
  });
})();
