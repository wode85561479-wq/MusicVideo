/* 13.6–17.9: "是不是听起来特别划算呀？" poll + title card 尊贵的下一档 */
(function () {
  // --- poll popup over the merge scene ---
  addScene(13.6, 15.42, (root) => {
    const dim = el('div', 'full', root); dim.style.background = 'rgba(43,29,74,.28)';
    const w = win(root, { title: '用户调研 ♡', w: 680, h: 410, x: 620, y: 230, html: `
      <div style="padding:22px 34px"><div class="kw" style="font-size:44px;margin-bottom:10px">这次合并划算吗？</div>
      <div class="radio" id="r0"><i><b></b></i>划算</div><div class="radio" id="r1"><i><b></b></i>特别划算</div><div class="radio" id="r2"><i><b></b></i>非常特别划算</div></div>
      <div class="btnx" style="position:absolute;right:30px;bottom:26px">提交</div>` });
    const dots = [0, 1, 2].map(i => w.querySelector('#r' + i + ' b'));
    const stamp = sticker(root, '感谢您的认可 ♡', { size: 72, fc: '#ff5fae', x: 760, y: 430 });
    const cur = mkCursor(root);
    return (t) => {
      dim.style.opacity = P(t, 13.6, 13.9);
      w.style.transform = `scale(${popS(t, 13.7, 0, 14, 7)}) rotate(${L(-6, 0, E.outC(P(t, 13.7, 14)))}deg)`;
      const sel = t < 14.45 ? -1 : t < 14.75 ? 1 : 2;
      dots.forEach((d, i) => d.style.transform = `scale(${i === sel ? E.outBack(P(t, i === 1 ? 14.45 : 14.75, (i === 1 ? 14.45 : 14.75) + .15)) : 0})`);
      const cp = t < 14.45 ? [L(1250, 700, E.io(P(t, 13.8, 14.4))), L(860, 400, E.io(P(t, 13.8, 14.4)))] : t < 14.75 ? [700, L(400, 448, E.io(P(t, 14.5, 14.7)))] : [L(700, 1215, E.io(P(t, 14.8, 15.05))), L(448, 600, E.io(P(t, 14.8, 15.05)))];
      cur.style.transform = `translate(${cp[0]}px,${cp[1]}px)`;
      vis(stamp, t >= 15.05);
      stamp.style.transform = `scale(${E.outBack(P(t, 15.05, 15.25), 2.6)}) rotate(-8deg)`;
    };
  }, 1);
  addFlash(15.22, 15.4, 15.7, 1);

  // --- title card: the staircase of tiers ---
  addScene(15.4, 17.95, (root) => {
    const W = world3D(root, { pal: SKY.night, seed: 41 });
    const steps = [
      ['FREE', 110, '#d6d6e2', '#b3b3c6', '#ececf3', -560],
      ['PLUS', 250, '#dcd3ff', '#b7a9f0', '#eee9ff', -200],
      ['PRO', 420, '#ffd23f', '#dba500', '#ffe680', 160],
    ].map(([lab, h, f, s, tp, x]) => {
      const b = box(W.cam, 360, h, 300, { front: { bg: f, html: `<div class="steplab">${lab}</div>` }, back: { bg: s }, right: { bg: s }, left: { bg: f }, top: { bg: tp }, bottom: { bg: s } });
      b.style.transform = `translate3d(${x}px,${330 - h / 2}px,-200px)`; return b;
    });
    const next = el('div', 'obj', W.cam);
    const rays = el('div', 'abs', next); css(rays, { width: '1200px', height: '1200px', left: '-600px', top: '-600px', borderRadius: '50%', background: 'repeating-conic-gradient(from 0deg,rgba(255,240,160,.85) 0 6deg,rgba(255,240,160,0) 6deg 18deg)', WebkitMaskImage: 'radial-gradient(circle,#000 0,#000 12%,transparent 60%)' });
    const plat = box(next, 380, 70, 300, { front: { bg: 'linear-gradient(90deg,#fff6c8,#ffe45c,#fff6c8)', html: '<div class="steplab" style="top:14px;font-size:24px">下一档 ???</div>' }, back: { bg: '#ffd23f' }, right: { bg: '#f0c000' }, left: { bg: '#ffe680' }, top: { bg: '#fffbe0' }, bottom: { bg: '#e0b000' } });
    const crown = obj(next, ICON.crown, 170, 170); crown.style.transform = 'translate3d(0,-130px,0)';
    const clouds = [[-260, 40], [250, 50], [0, 80]].map(([x, y]) => { const c = obj(next, `<svg viewBox="-60 -50 320 140">${cloud(0, 0, .9)}</svg>`, 300, 130); c.style.transform = `translate3d(${x}px,${y}px,80px)`; return c; });
    const plus = obj(W.cam, mascot(.6, 'shock'), 170, 94);
    const lock = obj(W.cam, `<div class="tagl" style="font-size:22px;left:0;top:0">Plus 止步 🚧</div>`, 210, 50);
    const title = text3D(W.cam, '尊贵的下一档', 170, '#ffe45c', 14, 5);
    const sub = el('div', 'gl', W.cam, '♪ 一首献给 Plus 用户的甜蜜情歌'); css(sub, { fontSize: '38px', fontWeight: '900', color: '#fff', textShadow: '3px 3px 0 #2b1d4a' });
    const spks = [[300, 200, 30], [1640, 260, 26], [1500, 120, 20], [420, 420, 18], [1760, 520, 22]].map(([x, y, r], i) => spk(root, x, y, r, i % 2 ? '#ffe45c' : '#fff'));
    return (t) => {
      const k = E.io(P(t, 15.4, 17.95));
      W.place(t, { rx: -4.5 * DEG, ry: L(-22, 12, k) * DEG, dz: L(-150, 60, k), dy: L(80, -30, k) });
      next.style.transform = `translate3d(560px,${-470 + Math.sin(t * 2) * 14}px,-260px)`;
      rays.style.transform = `translateZ(-120px) rotate(${t * 25}deg)`;
      crown.style.transform = `translate3d(0,${-140 + Math.sin(t * 3) * 10}px,0) rotateY(${Math.sin(t * 2) * 25}deg)`;
      plus.style.transform = `translate3d(-200px,${330 - 250 - 52 + Math.abs(Math.sin(t * 6)) * -8}px,-200px) rotateY(20deg)`;
      lock.style.transform = `translate3d(-200px,${330 - 250 + 70}px,-40px) rotateY(10deg)`;
      vis(title, t >= 15.95);
      title.style.transform = `translate3d(0,${-235 + Math.sin(t * 2.2) * 8}px,220px) rotateY(${Math.sin(t * 1.4) * 10}deg) rotateX(${L(-80, 0, E.outC(P(t, 15.95, 16.35)))}deg) scale(${popS(t, 15.95, 0, 12, 6)})`;
      sub.style.opacity = P(t, 16.5, 16.9); sub.style.transform = `translate3d(-50%,0,0) translate3d(0,${-125 + (1 - E.outC(P(t, 16.5, 16.9))) * 20}px,220px)`;
      twinkle(spks, t);
    };
  });
  addFlash(17.7, 17.84, 18.05, .9);
})();
