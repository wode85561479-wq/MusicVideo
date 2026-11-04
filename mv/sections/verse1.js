/* 17.8–45.7: Verse 1 + Pre-chorus 1 */
(function () {
  const CODE1 = [
    ['<span class="k">def</span> <span class="f">十一月</span>():', 0],
    ['    <span class="k">while</span> 开心:', 0],
    ['        敲代码()          <span class="c"># 哒哒哒 ♪</span>', 0],
    ['        额度 -= <span class="s">0.01</span>     <span class="c"># 毫无压力</span>', 0],
    ['        灵感 += <span class="s">100</span>', 0],
    ['    <span class="k">return</span> <span class="s">"快乐 ♡"</span>', 0],
  ];
  function codeAt(lines, t, t0, perLine) {
    const n = (t - t0) / perLine; let out = '';
    lines.forEach(([l], i) => { if (n > i) out += l + '\n'; });
    return out + (Math.sin(t * 16) > 0 ? '<span class="s">▌</span>' : ' ');
  }
  function cupSVG(level, label, straws, col = '#ffb3d9') {
    const top = 70, bot = 240, ly = bot - clamp(level) * (bot - top - 10);
    const xl = y => 30 + (y - top) / (bot - top) * 20, xr = y => 170 - (y - top) / (bot - top) * 20;
    const liq = level > .01 ? `<path d="M${xl(ly)} ${ly}L${xr(ly)} ${ly}L${xr(bot - 4)} ${bot - 4}L${xl(bot - 4)} ${bot - 4}Z" fill="${col}"/>` : '';
    const pearls = [50, 75, 100, 125, 150].map((x, i) => `<circle cx="${x}" cy="${bot - 16 - (i % 2) * 14}" r="9" fill="#5b3a29"/>`).join('');
    const st = straws.map(([x, rot]) => `<rect x="${x - 7}" y="10" width="14" height="200" rx="6" fill="#ff5fae" stroke="${INK}" stroke-width="4" transform="rotate(${rot} ${x} 200)"/>`).join('');
    return `<svg viewBox="0 0 200 260" overflow="visible">${st}<path d="M30 ${top}H170L150 ${bot}H50Z" fill="rgba(255,255,255,.75)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>${liq}${pearls}<path d="M30 ${top}H170L150 ${bot}H50Z" fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><rect x="18" y="56" width="164" height="22" rx="10" fill="#fff" stroke="${INK}" stroke-width="6"/><rect x="48" y="140" width="104" height="40" rx="10" fill="#fff" stroke="${INK}" stroke-width="4"/><text x="100" y="168" text-anchor="middle" font-family="ZCOOL KuaiLe" font-size="${label.length > 3 ? 20 : 24}" fill="${INK}">${label}</text></svg>`;
  }

  // ---------- V1a 17.82–22.61: happily coding in November, then December packs the quota ----------
  addScene(17.82, 22.62, (root) => {
    const d = buildDesktop(root, '23:30', '11月30日');
    const ed = win(root, { title: 'Codex · 十一月.py', w: 960, h: 520, x: 300, y: 150, theme: 'dark', html: '<div class="code"></div>' });
    const code = ed.querySelector('.code');
    const mas = el('div', 'abs', root, mascot(1, 'happy')); css(mas, { width: '190px', height: '104px', left: '1060px', top: '60px' });
    const cal = el('div', 'abs', root); css(cal, { left: '1440px', top: '70px', width: '300px', height: '230px', perspective: '700px' });
    const calA = win(cal, { title: '日历', w: 300, h: 230, theme: 'red', html: '<div class="kw" style="text-align:center;font-size:96px;line-height:150px">11月</div>' });
    const calB = win(cal, { title: '日历', w: 300, h: 230, theme: 'red', html: '<div class="kw" style="text-align:center;font-size:96px;line-height:150px;color:#ff3b5c">12月</div>' });
    const q1 = win(root, { title: 'Chat 额度', w: 330, h: 150, x: 1440, y: 360, theme: 'mint', html: `<div style="padding:22px 20px">${barHTML()}</div>` });
    const q2 = win(root, { title: 'Codex 额度', w: 330, h: 150, x: 1440, y: 540, theme: 'blue', html: `<div style="padding:22px 20px">${barHTML()}</div>` });
    [q1, q2].forEach(q => { const b = q.querySelector('.bar'); b.style.width = '280px'; setBar(b, 1); });
    // cardboard box
    const bw = el('div', 'world', root); css(bw, { perspectiveOrigin: '1600px 820px' });
    const bo = el('div', 'obj', bw); bo.style.left = '1600px'; bo.style.top = '820px';
    const BR = '#d9a066', BRD = '#b98248';
    const bx = box(bo, 280, 180, 220, { front: { bg: BR, html: '<div class="kw" style="text-align:center;font-size:30px;margin-top:60px;color:#7a4a1e">易碎 · 轻放</div>' }, back: { bg: BRD }, right: { bg: BRD }, left: { bg: BR }, top: false, bottom: { bg: BRD } });
    const inner = el('div', 'face', bo); css(inner, { width: '280px', height: '220px', left: '-140px', top: '-110px', background: '#7a4a1e', transform: 'translateY(88px) rotateX(90deg)' });
    const fl = [1, -1].map(s => { const h = el('div', 'obj', bo); const f = el('div', 'face', h); css(f, { width: '280px', height: '110px', left: '-140px', top: '-110px', background: BR, backfaceVisibility: 'visible' }); h.s = s; return h; });
    const tape = el('div', 'abs', root, `<div class="tagl kw" style="font-size:30px;background:#ffe45c;transform:rotate(-6deg)">12月 · 合并装</div>`); css(tape, { left: '1490px', top: '600px' });
    const cur = mkCursor(root);
    return (t) => {
      code.innerHTML = codeAt(CODE1, t, 17.9, .38);
      mas.style.transform = `translateY(${-Math.abs(Math.sin((t - 17.82) * Math.PI / BEAT)) * 26}px) rotate(${Math.sin(t * 5) * 4}deg)`;
      const kf = E.io(P(t, 20.15, 20.6));
      calA.style.transform = `rotateX(${kf * 180}deg)`; calA.style.backfaceVisibility = 'hidden';
      calB.style.transform = `rotateX(${kf * 180 - 180}deg)`; calB.style.backfaceVisibility = 'hidden';
      d.clockB.textContent = t < 20.21 ? '23:59' : '00:00'; d.clockS.textContent = t < 20.21 ? '11月30日' : '12月1日';
      [q1, q2].forEach((q, i) => {
        const k = E.inQ(P(t, 20.7 + i * .25, 21.25 + i * .25));
        q.style.transform = `translate(${k * (120 - i * 10)}px,${k * (420 - i * 180)}px) scale(${Math.max(.001, 1 - k * .95)}) rotate(${k * (i ? 30 : -30)}deg)`;
        vis(q, k < 1);
      });
      bo.style.transform = `translateY(${(1 - E.outBack(P(t, 20.3, 20.7))) * 500}px) rotateY(-28deg) rotateX(-12deg)`;
      fl.forEach(h => { const k = E.outBack(P(t, 21.7, 22.05), 1.4); const a = L(-35, 90, k) * h.s; h.style.transform = `translate3d(0,-90px,${110 * h.s}px) rotateX(${a}deg)`; });
      vis(tape, t >= 22.05); tape.style.transform = `scale(${popS(t, 22.05, 1.6)})`;
      cur.style.transform = `translate(${L(1000, 1080, P(t, 17.8, 22.6))}px,${640 + Math.sin(t * 3) * 10}px)`;
    };
  });
  addFlash(22.5, 22.62, 22.85, .8);

  // ---------- V1b 22.61–24.93: Chat & Codex on a date ----------
  addScene(22.62, 24.95, (root) => {
    const W = world3D(root, { pal: SKY.dawn, seed: 7 });
    const table = box(W.cam, 520, 24, 300, { front: { bg: '#ffffff' }, back: { bg: '#e6dcff' }, left: { bg: '#f3eeff' }, right: { bg: '#e6dcff' }, top: { bg: 'repeating-linear-gradient(90deg,#ffd6ea 0 40px,#fff 40px 80px)' }, bottom: { bg: '#d6c9ff' } });
    const leg = box(W.cam, 40, 200, 40, { bg: '#d6c9ff' });
    const a = obj(W.cam, ICON.chat, 220, 220), b = obj(W.cam, ICON.code, 220, 220);
    const c1 = obj(W.cam, cupSVG(.8, '奶茶', [[110, 12]]), 110, 143), c2 = obj(W.cam, cupSVG(.8, '奶茶', [[90, -12]]), 110, 143);
    const sign = obj(W.cam, `<div class="tagl kw" style="font-size:52px;left:0;top:0;background:#ff9ad5;color:#fff;text-shadow:3px 3px 0 #2b1d4a">相亲角 ♡</div>`, 320, 90);
    const hearts = [...Array(9)].map((_, i) => { const h = obj(W.cam, ICON.heart, 70, 70); h.i = i; return h; });
    return (t) => {
      W.place(t, { rx: -5 * DEG, ry: L(-18, 14, E.io(P(t, 22.6, 24.95))) * DEG, dz: L(0, 160, E.io(P(t, 22.6, 24.95))), dy: -40 });
      table.style.transform = 'translate3d(0,170px,0)'; leg.style.transform = 'translate3d(0,282px,0)';
      const lean = E.io(P(t, 23.4, 24.2)) * 12;
      a.style.transform = tr3(-300 + lean * 2, 60 - Math.abs(Math.sin(t * 6)) * 14, 0, 20, 0, lean);
      b.style.transform = tr3(300 - lean * 2, 60 - Math.abs(Math.sin(t * 6 + 1.5)) * 14, 0, -20, 0, -lean);
      c1.style.transform = tr3(-110, 95, 40); c2.style.transform = tr3(110, 95, 40);
      sign.style.transform = tr3(0, -260 + Math.sin(t * 2) * 10, -100, 0, 0, Math.sin(t * 1.5) * 4);
      hearts.forEach(h => { const ph = (t * .6 + h.i / 9) % 1; h.style.transform = tr3(Math.sin(h.i * 2.3) * 260 + Math.sin(t * 2 + h.i) * 30, 120 - ph * 520, -60 + (h.i % 3) * 60, 0, 0, Math.sin(t * 3 + h.i) * 15, .5 + .6 * Math.sin(ph * Math.PI)); h.inner.style.opacity = Math.sin(ph * Math.PI); });
    };
  });

  // ---------- V1b' 24.93–27.71: my wallet's heart starts racing ----------
  addScene(24.95, 27.72, (root) => {
    buildDesktop(root, '00:12', '12月1日');
    const wal = el('div', 'abs', root, ICON.wallet); css(wal, { left: '300px', top: '250px', width: '400px', height: '400px', filter: 'drop-shadow(10px 12px 0 rgba(43,29,74,.9))' });
    const sweat = [0, 1, 2].map(i => { const s = el('div', 'abs', root, `<svg viewBox="0 0 40 60" width="40" height="60"><path d="M20 4q16 26 14 38a14 14 0 0 1-28 0q-2-12 14-38z" fill="#7fd3ff" stroke="${INK}" stroke-width="4"/></svg>`); s.i = i; return s; });
    const mon = win(root, { title: '钱包健康监测.exe', w: 860, h: 520, x: 820, y: 200, theme: 'red', html: `<canvas width="${820 * DPR}" height="${330 * DPR}" style="position:absolute;left:16px;top:16px;width:820px;height:330px;background:#14102e;border-radius:12px"></canvas><div class="row" style="position:absolute;left:26px;bottom:22px;gap:26px"><div class="pix" id="bpm" style="font-size:40px;color:#ff3b5c">72 BPM</div><div class="tagl" id="warn" style="position:relative;background:#ff3b5c;color:#fff;font-size:24px">⚠ 心跳过速</div></div>` });
    const cv = mon.querySelector('canvas'), bpmEl = mon.querySelector('#bpm'), warn = mon.querySelector('#warn');
    const bpmAt = t => L(72, 196, E.inQ(P(t, 25.0, 27.4)));
    return (t) => {
      // heartbeat phase: integrate bpm
      let ph = 0; for (let x = 24.95; x < t; x += 1 / 60) ph += bpmAt(x) / 60 / 60;
      const beatF = ph % 1, pulse = Math.exp(-beatF * 9);
      wal.style.transform = `scale(${1 + pulse * L(.06, .2, P(t, 25, 27.4))}) rotate(${Math.sin(t * 30) * P(t, 26, 27.5) * 4}deg)`;
      sweat.forEach(s => { const k = ((t - 25.5) * 1.3 + s.i / 3) % 1; vis(s, t > 25.5); css(s, { left: 330 + s.i * 150 + 'px', top: 240 + k * 90 + 'px', opacity: 1 - k }); });
      const g = cv.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, 820, 330);
      g.strokeStyle = 'rgba(70,224,189,.18)'; g.lineWidth = 1; for (let x = 0; x < 820; x += 41) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 330); g.stroke(); } for (let y = 0; y < 330; y += 41) { g.beginPath(); g.moveTo(0, y); g.lineTo(820, y); g.stroke(); }
      g.strokeStyle = '#46e0bd'; g.lineWidth = 5; g.lineJoin = 'round'; g.shadowColor = '#46e0bd'; g.shadowBlur = 12; g.beginPath();
      for (let x = 0; x <= 820; x += 3) {
        const tt = t - (820 - x) / 820 * 2.2; let p2 = 0; for (let z = 24.95; z < tt; z += 1 / 20) p2 += bpmAt(z) / 60 / 20;
        const f = p2 % 1; let y = 0;
        if (tt > 24.95) { if (f < .04) y = -f / .04 * 20; else if (f < .08) y = -20 + (f - .04) / .04 * 140; else if (f < .12) y = 120 - (f - .08) / .04 * 260; else if (f < .16) y = -140 + (f - .12) / .04 * 140; else if (f > .4 && f < .5) y = -Math.sin((f - .4) / .1 * Math.PI) * 24; }
        if (x === 0) g.moveTo(x, 165 + y); else g.lineTo(x, 165 + y);
      }
      g.stroke(); g.shadowBlur = 0;
      bpmEl.textContent = Math.round(bpmAt(t)) + ' BPM';
      vis(warn, t > 26.2 && Math.sin(t * 16) > -.4);
      mon.style.transform = `scale(${popS(t, 24.97, .7)})`;
    };
  });
  addFlash(27.6, 27.72, 27.95, .8);

  // ---------- V1c 27.71–31.81: two cups -> one shared cup, two straws ----------
  addScene(27.72, 31.82, (root) => {
    const W = world3D(root, { pal: SKY.night, seed: 19 });
    const L1 = obj(W.cam, '', 220, 286), R1 = obj(W.cam, '', 220, 286), M = obj(W.cam, '', 340, 442);
    const ia = obj(W.cam, ICON.chat, 170, 170), ib = obj(W.cam, ICON.code, 170, 170);
    const notes = [...Array(6)].map((_, i) => { const n = obj(W.cam, `<div class="kw" style="font-size:60px;color:#ffe45c;-webkit-text-stroke:3px #2b1d4a">${i % 2 ? '♪' : '♫'}</div>`, 60, 70); n.i = i; return n; });
    const bubbles = [...Array(8)].map((_, i) => { const n = obj(W.cam, `<div class="kw" style="font-size:34px;color:#fff;-webkit-text-stroke:2px #2b1d4a;white-space:nowrap">咕噜</div>`, 80, 40); n.i = i; return n; });
    return (t) => {
      W.place(t, { rx: -4 * DEG, ry: Math.sin(t * .6) * 10 * DEG, dz: 60, dy: -60 });
      const m = E.io(P(t, 29.55, 30.0)); // merge
      const lv = t < 29.6 ? .92 - P(t, 27.7, 29.6) * .08 : L(.86, .03, E.inQ(P(t, 30.0, 31.75)));
      if (t < 29.6 || m < 1) {
        L1.inner.innerHTML = cupSVG(.92 - P(t, 27.7, 29.6) * .08, 'Chat 额度', [[120, 14]], '#9ff0d6');
        R1.inner.innerHTML = cupSVG(.92 - P(t, 27.7, 29.6) * .08, 'Codex额度', [[80, -14]], '#c9bdff');
      }
      vis(L1, m < 1); vis(R1, m < 1); vis(M, m > 0);
      L1.style.transform = tr3(L(-400, 0, m), 120, 160, 0, 0, 0, 1.5 - m * .5); R1.style.transform = tr3(L(400, 0, m), 120, 160, 0, 0, 0, 1.5 - m * .5);
      if (m > 0) M.inner.innerHTML = cupSVG(lv, '共享额度', [[78, -16], [122, 16]], '#ffb3d9');
      M.style.transform = tr3(0, 70, 160, 0, 0, 0, 1.3 * Math.max(.001, m < 1 ? m : spring(t - 30.0, .8, 14, 6)));
      const sip = t > 30 ? Math.sin(t * 14) * 5 : 0;
      ia.style.transform = tr3(m < 1 ? L(-400 - 190, -250, m) : -250, -200 + sip, 160, 15, 0, L(-10, 18, m));
      ib.style.transform = tr3(m < 1 ? L(400 + 190, 250, m) : 250, -200 - sip, 160, -15, 0, L(10, -18, m));
      notes.forEach(n => { const k = (t * .7 + n.i / 6) % 1; vis(n, t < 29.6); n.style.transform = tr3((n.i % 2 ? 1 : -1) * (560 + Math.sin(t * 2 + n.i) * 40), -250 - k * 260, 0, 0, 0, Math.sin(t * 4 + n.i) * 20, .6 + .4 * Math.sin(k * Math.PI)); n.inner.style.opacity = Math.sin(k * Math.PI); });
      bubbles.forEach(n => { const k = (t * 1.2 + n.i / 8) % 1; vis(n, t > 30.1); n.style.transform = tr3(Math.sin(n.i * 2.1) * 200, -120 - k * 300, 60, 0, 0, Math.sin(t * 5 + n.i) * 12, .5 + .6 * Math.sin(k * Math.PI)); n.inner.style.opacity = Math.sin(k * Math.PI); });
    };
  });
  addFlash(31.7, 31.82, 32.05, .7);

  // ---------- V1d 31.81–36.93: work hits its peak... "亲，该下班了喔" ----------
  addScene(31.82, 36.94, (root) => {
    const d = buildDesktop(root, '10:24', '12月1日');
    const rays = el('div', 'abs', root); css(rays, { left: '-40px', top: '-500px', width: '2000px', height: '2000px', borderRadius: '50%', background: 'repeating-conic-gradient(from 0deg,rgba(255,255,255,.55) 0 4deg,rgba(255,255,255,0) 4deg 12deg)', WebkitMaskImage: 'radial-gradient(circle,transparent 0,transparent 18%,#000 45%)' });
    const ed = win(root, { title: 'Codex · 大项目.py', w: 980, h: 560, x: 470, y: 130, theme: 'dark', html: `<div class="code" id="cd"></div><div style="position:absolute;left:24px;right:24px;bottom:22px" class="row"><span class="lbl" style="color:#fff;margin-right:16px">构建中</span>${barHTML()}</div>` });
    const cd = ed.querySelector('#cd'), bb = ed.querySelector('.bar'); bb.style.width = '760px';
    const CODE = ['<span class="k">async def</span> <span class="f">冲刺</span>():', '    <span class="k">for</span> 想法 <span class="k">in</span> 灵感池:', '        <span class="k">await</span> 实现(想法)   <span class="c"># 状态绝佳!!</span>', '        测试.全部通过()', '    部署(<span class="s">"马上就好"</span>)'];
    const mas = el('div', 'abs', root, mascot(1, 'love')); css(mas, { width: '200px', height: '110px', left: '1290px', top: '40px' });
    const hot = sticker(root, '冲鸭！', { size: 96, fc: '#ff5fae', x: 210, y: 140 });
    const dim = el('div', 'full', root); dim.style.background = 'rgba(30,18,60,.55)';
    const lock = el('div', 'abs', root, `<svg viewBox="0 0 100 110" width="220" height="242"><path d="M28 50V34a22 22 0 0 1 44 0v16" fill="none" stroke="${INK}" stroke-width="12"/><path d="M28 50V34a22 22 0 0 1 44 0v16" fill="none" stroke="#c9bdff" stroke-width="5"/><rect x="14" y="48" width="72" height="56" rx="12" fill="#ffd23f" stroke="${INK}" stroke-width="7"/><circle cx="50" cy="72" r="8" fill="${INK}"/><path d="M50 72v16" stroke="${INK}" stroke-width="7" stroke-linecap="round"/></svg>`); css(lock, { left: '850px', top: '300px' });
    const dl = win(root, { title: '温馨提示 ♡', w: 760, h: 380, x: 580, y: 260, html: `<div class="dbody" style="padding-top:26px"><div class="dav">${mascot(0, 'happy')}</div><div><div class="d1 kw">亲，该下班了喔～</div><div class="d2">额度用完啦～ <span class="pix" id="cdn" style="font-size:22px;color:#ff3b5c">04:59:59</span> 后再来</div></div></div><div class="dbtns"><div class="btn b1">好的</div><div class="btn b2">好的</div></div>` });
    const cdn = dl.querySelector('#cdn');
    const sun = sticker(root, '☀ 上午 10:24', { size: 40, fc: '#fff', x: 1520, y: 880, flat: true });
    return (t) => {
      const stop = t >= 33.84;
      rays.style.transform = `rotate(${t * 30}deg)`; rays.style.opacity = stop ? 0 : .8;
      if (!stop) { let o = ''; CODE.forEach((l, i) => { if ((t - 31.9) / .32 > i) o += l + '\n'; }); cd.innerHTML = o + '<span class="s">▌</span>'; }
      setBar(bb, stop ? .92 : L(.35, .92, E.outQ(P(t, 31.85, 33.8))));
      ed.style.filter = stop ? `grayscale(${P(t, 33.84, 34.2)}) brightness(${1 - .25 * P(t, 33.84, 34.2)})` : '';
      ed.style.transform = stop ? '' : `translate(${Math.sin(t * 50) * 3}px,${Math.cos(t * 43) * 3}px)`;
      mas.innerHTML = stop ? mascot(0, 'dead') : mascot(1, 'love');
      mas.style.transform = stop ? `translateY(${E.outBounce(P(t, 33.84, 34.4)) * 40}px) rotate(${-12 * P(t, 33.84, 34.2)}deg)` : `translateY(${-Math.abs(Math.sin(t * 10)) * 20}px)`;
      vis(hot, !stop && t > 32.2); hot.style.transform = `scale(${popS(t, 32.2, 0)}) rotate(${-10 + Math.sin(t * 12) * 4}deg)`;
      dim.style.opacity = stop ? P(t, 33.84, 34.1) : 0;
      vis(lock, stop); lock.style.transform = `translateY(${(1 - E.outBounce(P(t, 33.95, 34.45))) * -700}px) rotate(${Math.sin(t * 3) * 4}deg)`;
      vis(dl, t >= 34.25); dl.style.transform = `scale(${popS(t, 34.25, 0, 13, 7)})`;
      const left = 4 * 3600 + 59 * 60 + 59 - Math.floor(Math.max(0, t - 34.25) * 7);
      cdn.textContent = `0${Math.floor(left / 3600)}:${String(Math.floor(left / 60) % 60).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      vis(sun, stop); sun.style.transform = `scale(${popS(t, 34.6, 0)})`;
    };
  });

  // ---------- P1a 36.93–41.06: keynote: "生态的拥抱" / "体验的升高" ----------
  addScene(36.94, 41.07, (root) => {
    buildDesktop(root, '10:30', '12月1日');
    const ppt = win(root, { title: '生态大会.ppt', w: 1260, h: 720, x: 330, y: 110, theme: 'blue', html: '<div class="slides" style="position:absolute;inset:14px;perspective:1400px"></div>' });
    const sl = ppt.querySelector('.slides');
    const mk = (html) => { const s = el('div', 'abs', sl, html); css(s, { inset: '0', background: '#fffdf6', border: '5px solid #2b1d4a', borderRadius: '14px', backfaceVisibility: 'hidden', transformOrigin: '50% 50% -300px' }); return s; };
    const s1 = mk(`<div class="kw" style="position:absolute;left:50px;top:30px;font-size:80px">生态的拥抱 ♡</div>`);
    const blob = el('div', 'abs', s1, `<svg viewBox="0 0 400 300" width="560" height="420"><path d="M60 170c-40-10-50-80 10-100c10-50 90-60 120-20c40-40 120-20 120 40c60 10 60 90 10 100c-10 60-90 70-130 40c-40 30-120 20-130-60z" fill="#c9bdff" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/><path d="M150 150q10-14 20 0M230 150q10-14 20 0" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M180 186q20 18 40 0" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><text x="200" y="110" text-anchor="middle" font-family="ZCOOL KuaiLe" font-size="34" fill="${INK}">生态</text></svg>`); css(blob, { left: '330px', top: '150px' });
    const small = el('div', 'abs', s1, mascot(.5, 'shock')); css(small, { left: '520px', top: '400px', width: '180px', height: '100px' });
    const arms = el('div', 'abs', s1, `<svg viewBox="0 0 600 200" width="600" height="200"><path d="M40 60q100 160 260 120" fill="none" stroke="${INK}" stroke-width="40" stroke-linecap="round"/><path d="M40 60q100 160 260 120" fill="none" stroke="#c9bdff" stroke-width="26" stroke-linecap="round"/><path d="M560 60q-100 160-260 120" fill="none" stroke="${INK}" stroke-width="40" stroke-linecap="round"/><path d="M560 60q-100 160-260 120" fill="none" stroke="#c9bdff" stroke-width="26" stroke-linecap="round"/></svg>`); css(arms, { left: '310px', top: '330px' });
    const coinsOut = [...Array(5)].map((_, i) => { const c = el('div', 'abs', s1, `<div class="coinL" style="position:relative;width:60px;height:60px;background:radial-gradient(circle at 35% 30%,#fff7b8,#ffd23f 45%,#ffaa00)"><span style="font-size:30px">额</span></div>`); c.i = i; return c; });
    const s2 = mk(`<div class="kw" style="position:absolute;left:50px;top:30px;font-size:80px">体验的升高 ↑</div><svg style="position:absolute;left:80px;top:150px" width="1060" height="460" viewBox="0 0 1060 460"><path d="M40 20V420H1040" fill="none" stroke="${INK}" stroke-width="6"/><path id="up" d="M60 400 C 300 380, 600 300, 1000 60" fill="none" stroke="#46e0bd" stroke-width="16" stroke-linecap="round"/><path id="dn" d="M60 300 C 400 320, 700 380, 1000 410" fill="none" stroke="#ff9ad5" stroke-width="6" stroke-dasharray="12 12" stroke-linecap="round"/><text x="1000" y="40" text-anchor="end" font-family="ZCOOL KuaiLe" font-size="48" fill="#1f9e80">体验 ✨</text><text x="1000" y="380" text-anchor="end" font-family="Noto Sans SC" font-weight="700" font-size="20" fill="#c06a9a">（额度）</text></svg>`);
    const up = s2.querySelector('#up'), dn = s2.querySelector('#dn'), UPL = 1150, DNL = 1000;
    up.setAttribute('stroke-dasharray', UPL); dn.style.opacity = 1;
    const laser = el('div', 'abs', sl); css(laser, { width: '26px', height: '26px', borderRadius: '50%', background: '#ff3b5c', boxShadow: '0 0 18px 8px rgba(255,59,92,.6)' });
    return (t) => {
      ppt.style.transform = `scale(${popS(t, 36.94, .85)})`;
      const k = E.io(P(t, 38.2, 38.6));
      s1.style.transform = `rotateY(${-k * 90}deg)`; s2.style.transform = `rotateY(${90 - k * 90}deg)`;
      const sq = 1 - .12 * Math.abs(Math.sin(t * 5));
      arms.style.transform = `scaleX(${sq})`; small.style.transform = `scaleX(${sq * .95}) scaleY(${1 + (1 - sq) * .5})`;
      coinsOut.forEach(c => { const p = ((t - 37.2) * .9 + c.i / 5) % 1; vis(c, t > 37.2); css(c, { left: 580 + Math.sin(c.i * 2.4) * p * 260 + 'px', top: 420 - p * 260 + p * p * 300 + 'px', opacity: 1 - p }); });
      up.setAttribute('stroke-dashoffset', UPL * (1 - E.outC(P(t, 38.7, 40.4))));
      dn.style.opacity = P(t, 39.6, 40.2);
      const lp = t < 38.4 ? [L(300, 640, E.io(P(t, 37, 38))), 420] : [L(200, 1060, E.io(P(t, 38.8, 40.4))), L(560, 220, E.io(P(t, 38.8, 40.4)))];
      css(laser, { left: lp[0] + Math.sin(t * 23) * 4 + 'px', top: lp[1] + Math.cos(t * 19) * 4 + 'px' });
    };
  });
  addFlash(40.95, 41.07, 41.3, .8);

  // ---------- P1b 41.06–45.67: the progress-bar runway shrinks; "统一标准" stamp ----------
  addScene(41.07, 45.8, (root) => {
    const W = world3D(root, { pal: SKY.night, seed: 5 });
    const run = el('div', 'obj', W.cam);
    const RW = 360, RL = 3200;
    const track = el('div', 'face', run); css(track, { width: RW + 'px', height: RL + 'px', left: -RW / 2 + 'px', top: -RL / 2 + 'px', background: '#fff', borderWidth: '8px', borderRadius: '180px', backfaceVisibility: 'visible' });
    const fill = el('div', 'abs', track); css(fill, { left: '10px', right: '10px', bottom: '10px', borderRadius: '170px', background: 'repeating-linear-gradient(0deg,#46e0bd 0 60px,#8af5dc 60px 120px)' });
    const me = obj(W.cam, mascot(.3, 'sad'), 200, 110);
    const stamp = el('div', 'obj', W.cam);
    const handle = box(stamp, 90, 240, 90, { bg: '#ff5f7e', front: { bg: '#ff5f7e' }, top: { bg: '#ff8aa0' } }); handle.style.transform = 'translateY(-200px)';
    const knob = box(stamp, 170, 70, 170, { bg: '#ff8aa0', top: { bg: '#ffb3c2' } }); knob.style.transform = 'translateY(-330px)';
    const base = box(stamp, 520, 80, 300, { front: { bg: '#8a5a3a' }, back: { bg: '#6e4630' }, left: { bg: '#7a4f34' }, right: { bg: '#6e4630' }, top: { bg: '#a06a46' }, bottom: { bg: '#ff3b5c', html: '<div class="kw" style="text-align:center;font-size:110px;line-height:300px;color:#fff;transform:scaleX(-1)">统一标准</div>' } });
    const ink = el('div', 'obj', W.cam); const inkF = el('div', 'face', ink, '<div class="kw" style="text-align:center;font-size:110px;line-height:290px;color:#ff3b5c">统一标准</div>'); css(inkF, { width: '540px', height: '310px', left: '-270px', top: '-155px', border: '10px solid #ff3b5c', background: 'transparent', borderRadius: '24px', backfaceVisibility: 'visible' });
    const C = mkCanvas(root);
    return (t) => {
      const slam = 44.0, sh = t > slam ? 30 * Math.exp(-9 * (t - slam)) : 0;
      W.place(t, { rx: -12 * DEG, ry: Math.sin(t * .5) * 6 * DEG, dz: L(0, 220, E.inC(P(t, 44.6, 45.8))) + Math.sin(t * 90) * sh, dy: -20 + Math.cos(t * 77) * sh });
      run.style.transform = 'translate3d(0,322px,-1500px) rotateX(90deg)';
      fill.style.height = `${(1 - E.ioQ(P(t, 41.2, 44.4)) * .88) * (RL - 20)}px`;
      me.style.transform = tr3(-60, 240 - Math.abs(Math.sin(t * 4)) * 6, 260, 0, 0, Math.sin(t * 2) * 4);
      const kd = P(t, 43.3, slam);
      vis(stamp, t > 43.2);
      const sy = t < slam ? L(-1400, 230, E.inC(kd)) : 230 - (t > 44.6 ? E.outC(P(t, 44.6, 45.2)) * 900 : 0);
      stamp.style.transform = `translate3d(0,${sy}px,-200px) rotateY(${L(40, 0, kd)}deg) scale3d(${t > slam && t < 44.3 ? 1.06 : 1},${t > slam && t < 44.3 ? .9 : 1},1)`;
      vis(ink, t > slam); ink.style.transform = 'translate3d(0,318px,-200px) rotateX(90deg)';
      const g = ctx2d(C); confetti(g, t, slam, 960, 760, 77, 70, 1.3);
    };
  });
  addFlash(45.45, 45.67, 45.95, 1);
})();
