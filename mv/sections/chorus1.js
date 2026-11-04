/* 45.7–81.5: Chorus 1 + Post-chorus */
(function () {
  // ---------- C1a 45.67–50.10: 合并吧! left still typing, right already gone ----------
  addScene(45.67, 50.11, (root) => {
    buildDesktop(root, '10:40', '12月1日');
    const left = win(root, { title: 'Codex', w: 760, h: 500, x: 150, y: 250, theme: 'dark', html: '<div class="code" id="c"></div>' });
    const right = win(root, { title: 'ChatGPT', w: 760, h: 500, x: 1010, y: 250, html: '<div id="chat" style="position:absolute;inset:0"></div><div id="gone" class="kw" style="position:absolute;inset:0;background:#e8e6ee;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:56px;color:#8a86a0">额度已用完<div style="font-size:120px">✕</div></div>' });
    const cd = left.querySelector('#c'), chat = right.querySelector('#chat'), gone = right.querySelector('#gone');
    const B = [['me', '帮我润色一下周报'], ['ai', '好的！这是润色后的版本 ✨'], ['me', '再帮我想个标题'], ['ai', '当然～这里有三个……']].map(([w, s], i) => { const b = el('div', 'bub ' + w, chat, s); b.style.top = 24 + i * 100 + 'px'; return b; });
    const shared = win(root, { title: '共享额度', w: 900, h: 150, x: 510, y: 50, theme: 'gold', html: `<div style="padding:22px 30px">${barHTML()}</div>` });
    const sb = shared.querySelector('.bar'); sb.style.width = '840px';
    const pops = [45.67, 46.79].map(t0 => { const s = sticker(root, '合并！', { size: 110, fc: '#ff5fae', x: 790, y: 420 }); s.t0 = t0; return s; });
    const hearts = [...Array(6)].map((_, i) => { const h = el('div', 'abs', root, ICON.heart); css(h, { width: '80px', height: '80px' }); h.i = i; return h; });
    const poof = el('div', 'abs', root, `<svg viewBox="-60 -50 320 140" width="560" height="245">${cloud(0, 0, 1)}</svg>`); css(poof, { left: '1110px', top: '380px' });
    const CODE = ['<span class="k">def</span> <span class="f">写到一半</span>():', '    数据 = 读取()', '    结果 = 处理(数据)', '    <span class="c"># TODO: 还没写完…</span>', '    <span class="k">return</span>'];
    return (t) => {
      let dx = 0; for (const s of pops) { const d = t - s.t0; if (d >= 0) dx = Math.max(dx, Math.exp(-7 * d) * Math.abs(Math.sin(Math.min(d, .5) * 6.3)) * 130); }
      const k0 = E.outBack(P(t, 45.67, 46.0));
      left.style.transform = `translateX(${(1 - k0) * -900 + dx}px) rotate(${dx * .03}deg)`;
      const goneK = P(t, 49.0, 49.35);
      right.style.transform = `translateX(${(1 - k0) * 900 - dx}px) rotate(${-dx * .03}deg) scale(${Math.max(.001, 1 - E.inBack(goneK))})`;
      vis(right, goneK < 1);
      pops.forEach(s => { vis(s, t >= s.t0 && t < s.t0 + .7); s.style.transform = `scale(${popS(t, s.t0, 0, 16, 6) * (1 - P(t, s.t0 + .5, s.t0 + .7))}) rotate(${-8 + (s.t0 > 46 ? 14 : 0)}deg)`; });
      hearts.forEach(h => { const k = P(t, 47.35, 48.4); vis(h, k > 0 && k < 1); css(h, { left: 920 + Math.cos(h.i) * k * 380 + 'px', top: 440 + Math.sin(h.i * 1.7) * k * 260 - k * 120 + 'px', opacity: 1 - k, transform: `scale(${.6 + k})` }); });
      let o = ''; CODE.forEach((l, i) => { if ((t - 45.8) / .7 > i) o += l + '\n'; }); cd.innerHTML = o + '<span class="s">▌</span>';
      B.forEach((b, i) => { vis(b, t > 46.0 + i * .45); b.style.transform = `scale(${popS(t, 46.0 + i * .45, .5)})`; });
      vis(gone, t >= 47.95); gone.style.opacity = P(t, 47.95, 48.15);
      setBar(sb, t < 47.9 ? 1 - P(t, 46, 47.9) * .25 : L(.75, 0, E.inQ(P(t, 47.9, 49.0))));
      vis(poof, t > 49.15 && t < 49.9); poof.style.transform = `scale(${E.outC(P(t, 49.15, 49.6)) * 1.2})`; poof.style.opacity = 1 - P(t, 49.5, 49.9);
    };
  });
  addFlash(50.0, 50.11, 50.35, .8);

  // ---------- C1b 50.10–54.57: the productivity taximeter ----------
  addScene(50.11, 54.58, (root) => {
    const W = world3D(root, { pal: SKY.night, seed: 3 });
    const meter = el('div', 'obj', W.cam);
    const face = `<div style="position:absolute;inset:0;background:#3a2a66;border-radius:30px"><div class="kw" style="position:absolute;left:0;right:0;top:22px;text-align:center;color:#ffe45c;font-size:52px;text-shadow:3px 3px 0 #2b1d4a">生产力计价器</div>
      <div id="odo" style="position:absolute;left:0;right:0;top:110px;text-align:center"></div><div class="pix" style="position:absolute;left:0;right:0;bottom:30px;text-align:center;color:#fff;font-size:22px">按秒计费 · ¥/s</div></div>`;
    const mb = box(meter, 820, 420, 200, { front: { bg: '#3a2a66', html: face, r: 30 }, back: { bg: '#2b1d4a' }, left: { bg: '#4b3a8a' }, right: { bg: '#2f2466' }, top: { bg: '#6a4598' }, bottom: { bg: '#21183f' } });
    const odo = mb.faces.front.querySelector('#odo');
    const NUM = 7; const strips = [];
    for (let i = 0; i < NUM; i++) { if (i === 5) odo.insertAdjacentHTML('beforeend', '<span class="pix" style="font-size:62px;color:#ff4a3a;vertical-align:top;line-height:118px">.</span>'); const o = el('div', 'odo', odo); const s = el('div', 'strip', o, [...'01234567890'].join('<br>')); strips.push(s); }
    const lamp = box(meter, 260, 70, 120, { front: { bg: '#ffe45c', html: '<div class="kw" style="text-align:center;font-size:40px;line-height:60px">计价中</div>' }, top: { bg: '#fff6a8' }, left: { bg: '#f0c000' }, right: { bg: '#e0b000' }, back: { bg: '#e0b000' }, bottom: { bg: '#c09000' } });
    const heart = obj(W.cam, ICON.heart, 200, 200);
    const coins = [...Array(10)].map((_, i) => { const c = coin(W.cam, 90, '¥'); c.i = i; return c; });
    const me = obj(W.cam, mascot(.5, 'shock'), 220, 121);
    return (t) => {
      W.place(t, { rx: -5 * DEG, ry: L(16, -16, E.io(P(t, 50.1, 54.6))) * DEG, dz: L(-40, 140, E.io(P(t, 50.1, 54.6))), dy: -40 });
      meter.style.transform = `translate3d(0,-60px,-200px) rotateY(${Math.sin(t * 1.3) * 6}deg)`;
      lamp.style.transform = `translate3d(0,-250px,0)`; lamp.faces.front.style.background = Math.sin(t * 14) > 0 ? '#ffe45c' : '#ffb84d';
      const v = Math.pow(Math.max(0, t - 50.1), 2.2) * 38 + (t - 50.1) * 12.37; // money climbs
      let rem = v * 100; // two decimals
      for (let i = NUM - 1; i >= 0; i--) { const place = Math.pow(10, NUM - 1 - i); const dval = (rem / place) % 10; const shown = i === NUM - 1 ? dval : Math.floor(dval) + Math.max(0, (dval % 1 - .85) / .15); strips[i].style.transform = `translateY(${-shown * 118}px)`; }
      const beatK = ((t - 50.1) / BEAT) % 1;
      heart.style.transform = tr3(560, -260, 0, Math.sin(t * 2) * 20, 0, 0, 1 + Math.exp(-beatK * 7) * .35);
      coins.forEach(c => { const t0 = 50.4 + c.i * .4, d = t - t0; vis(c, d > 0); if (d > 0) c.style.transform = `translate3d(${-120 + (c.i % 5) * 60 + d * (c.i % 2 ? 160 : -160)}px,${Math.min(290, 160 - 600 * d + 1300 * d * d)}px,${80 + (c.i % 3) * 40}px) rotateY(${d * 500}deg)`; });
      me.style.transform = tr3(-520, 230 - Math.abs(Math.sin(t * 8)) * 16, 200, 20, 0, Math.sin(t * 10) * 5);
    };
  });
  addFlash(54.45, 54.58, 54.8, .8);

  // ---------- C1c 54.57–59.14: upgrade popup storm; "再多付一点" ----------
  addScene(54.58, 59.15, (root) => {
    const d = buildDesktop(root, '10:52', '12月1日');
    const r = rng(99), pops = [];
    for (let i = 0; i < 18; i++) {
      const w = win(root, { title: '✨ 升级 Pro', w: 400, h: 210, x: 60 + r() * 1400, y: 30 + r() * 640, theme: 'gold', html: `<div style="padding:16px 22px"><div class="kw" style="font-size:36px">更多额度 · 更快速度</div><div class="btnx" style="margin-top:14px;height:50px;font-size:24px;background:#ffd23f">立即升级</div></div>` });
      w.t0 = 54.6 + i * .2 + (i > 5 ? .2 : 0); w.rot = (r() - .5) * 10; pops.push(w);
    }
    const big = win(root, { title: '贴心建议 ♡', w: 780, h: 420, x: 570, y: 220, theme: 'red', html: `<div style="padding:26px 36px"><div class="kw" style="font-size:58px">再多付一点？</div><div class="lbl" style="margin:18px 0 8px">烦恼值</div>${barHTML()}<div class="btnx" id="pay" style="position:absolute;right:36px;bottom:30px;background:#ffd23f;font-size:34px">付！</div></div>` });
    const fb = big.querySelector('.bar'); fb.style.width = '700px';
    const payB = big.querySelector('#pay');
    const cur = mkCursor(root);
    const flyC = [...Array(8)].map((_, i) => { const c = el('div', 'abs', root, `<div class="coinL" style="position:relative;width:70px;height:70px;background:radial-gradient(circle at 35% 30%,#fff7b8,#ffd23f 45%,#ffaa00)"><span style="font-size:36px">¥</span></div>`); c.i = i; return c; });
    return (t) => {
      pops.forEach(w => { const s = popS(t, w.t0, 0, 16, 7); const suck = E.inBack(P(t, 56.8, 57.3)); w.style.transform = `translate(${suck * (900 - parseFloat(w.style.left))}px,${suck * (430 - parseFloat(w.style.top))}px) scale(${s * (1 - suck * .9)}) rotate(${w.rot}deg)`; vis(w, t >= w.t0 && suck < 1); });
      vis(big, t >= 56.8); big.style.transform = `scale(${popS(t, 57.2, 0, 14, 7)})`;
      setBar(fb, 1 - .85 * E.ioQ(P(t, 58.0, 58.9)), '#ff5f7e');
      fb.querySelector('.pct').textContent = Math.round((1 - .85 * E.ioQ(P(t, 58.0, 58.9))) * 100) + '%';
      const cp = t < 56.8 ? [L(1300, 980, E.io(P(t, 55.0, 55.6))), L(700, 330, E.io(P(t, 55.0, 55.6)))] : [L(980, 1300, E.io(P(t, 57.3, 57.8))), L(330, 615, E.io(P(t, 57.3, 57.8)))];
      cur.style.transform = `translate(${cp[0]}px,${cp[1]}px) scale(${t > 57.85 && t < 58 ? .85 : 1})`;
      payB.style.transform = `scale(${t > 57.85 && t < 58.05 ? .92 : 1 + .05 * Math.sin(t * 12)})`;
      flyC.forEach(c => { const k = P(t, 57.95 + c.i * .08, 58.55 + c.i * .08); vis(c, k > 0 && k < 1); css(c, { left: L(70, 1100, k) + 'px', top: L(500, 300, k) - Math.sin(k * Math.PI) * 260 + 'px' }); });
    };
  });
  addFlash(59.0, 59.15, 59.4, .8);

  // ---------- C1d 59.14–63.66: Plus paper boat vs Pro cruise ship to the clouds ----------
  addScene(59.15, 63.67, (root) => {
    const W = world3D(root, { pal: SKY.ocean, floor: 'ocean', seed: 12, speed: 30 });
    const boat = obj(W.cam, `<svg viewBox="0 0 300 200"><path d="M20 110 L280 110 L230 170 L70 170Z" fill="#fff" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M150 20 L150 110 L60 110Z" fill="#eef0ff" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M150 20 L150 110 L230 110Z" fill="#dfe2f5" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><rect x="104" y="124" width="92" height="34" rx="8" fill="#d3d3de" stroke="${INK}" stroke-width="4"/><text x="150" y="150" text-anchor="middle" font-family="ZCOOL KuaiLe" font-size="24" fill="${INK}">Plus</text></svg>`, 340, 227);
    const rainC = obj(W.cam, `<svg viewBox="-60 -50 320 140">${cloud(0, 0, .9).replace(/#fff/g, '#9a9ab0')}</svg>`, 380, 166);
    const drops = [...Array(16)].map((_, i) => { const d = obj(W.cam, '<div style="width:6px;height:46px;border-radius:3px;background:#a8d8ff;border:2px solid #2b1d4a"></div>', 10, 50); d.i = i; return d; });
    const ship = obj(W.cam, `<svg viewBox="0 0 700 380" overflow="visible"><path d="M30 230 L670 230 L600 330 L100 330Z" fill="#fff" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/><path d="M60 270 H640" stroke="#ffd23f" stroke-width="16"/><rect x="130" y="150" width="440" height="80" rx="10" fill="#fff6d6" stroke="${INK}" stroke-width="8"/><rect x="200" y="90" width="300" height="60" rx="10" fill="#fff" stroke="${INK}" stroke-width="8"/>${[160, 220, 280, 340, 400, 460, 520].map(x => `<circle cx="${x}" cy="190" r="13" fill="#7fd3ff" stroke="${INK}" stroke-width="5"/>`).join('')}<rect x="250" y="20" width="60" height="70" fill="#ffd23f" stroke="${INK}" stroke-width="8"/><rect x="390" y="20" width="60" height="70" fill="#ffd23f" stroke="${INK}" stroke-width="8"/><text x="350" y="318" text-anchor="middle" font-family="Press Start 2P" font-size="34" fill="${INK}">PRO</text></svg>`, 700, 380);
    const flame = obj(W.cam, `<svg viewBox="0 0 200 220"><path d="M100 0 C150 60 170 120 100 220 C30 120 50 60 100 0Z" fill="#ffb84d" stroke="${INK}" stroke-width="7"/><path d="M100 50 C130 90 130 140 100 190 C70 140 70 90 100 50Z" fill="#ffe45c"/></svg>`, 160, 176);
    const flame2 = obj(W.cam, flame.inner.innerHTML, 160, 176);
    const clouds = [[-500, -620], [300, -720], [900, -600], [-100, -800]].map(([x, y]) => { const c = obj(W.cam, `<svg viewBox="-60 -50 320 140">${cloud(0, 0, 1)}</svg>`, 420, 184); c.p = [x, y]; return c; });
    const spks = [...Array(6)].map((_, i) => { const s = obj(W.cam, `<svg viewBox="-40 -40 80 80">${sparkle(0, 0, 26, i % 2 ? '#ffe45c' : '#fff')}</svg>`, 70, 70); s.i = i; return s; });
    return (t) => {
      const up = E.inQ(P(t, 61.35, 63.6));
      W.place(t, { rx: L(-4, 4, up) * DEG, ry: Math.sin(t * .7) * 6 * DEG, dz: 0, dy: L(-20, 260, up) });
      boat.style.transform = tr3(-420, 230 + Math.sin(t * 3) * 14, 260, 15, 0, Math.sin(t * 2.6) * 14 + Math.sin(t * 7.3) * 4);
      rainC.style.transform = tr3(-420, -40 + Math.sin(t) * 6, 240);
      drops.forEach(d => { const k = (t * 1.6 + d.i / 16) % 1; d.style.transform = tr3(-560 + (d.i * 37) % 280, -10 + k * 230, 240 + (d.i % 3) * 10, 0, 0, 12); });
      const sy = 150 - up * 1500;
      ship.style.transform = tr3(380, sy + (up ? 0 : Math.sin(t * 2) * 8), -500, -12, 0, Math.sin(t * 1.4) * 2 - up * 6);
      [flame, flame2].forEach((f, i) => { vis(f, t > 61.3); f.style.transform = tr3(380 + (i ? 120 : -120), sy + 260, -500, 0, 0, 180, (.8 + .3 * Math.sin(t * 30 + i)) * P(t, 61.3, 61.6)); });
      clouds.forEach(c => { c.style.transform = tr3(c.p[0] + Math.sin(t * .5 + c.p[0]) * 40, c.p[1], -900); });
      spks.forEach(s => { vis(s, t > 61.4); s.style.transform = tr3(380 + Math.cos(s.i * 1.05 + t) * 420, sy - 100 + Math.sin(s.i * 1.05 + t) * 200, -480, 0, 0, t * 90, .6 + .4 * Math.sin(t * 6 + s.i)); });
    };
  });
  addFlash(63.55, 63.67, 63.9, .8);

  // ---------- C1e 63.66–67.19: 啦啦啦 kick line ----------
  addScene(63.67, 67.2, (root) => {
    const W = world3D(root, { pal: SKY.night, seed: 31, speed: 120 });
    const cols = ['#46e0bd', '#ff9ad5', '#ffe45c', '#a99bff', '#7fd3ff'];
    const ms = cols.map((c, i) => { const m = obj(W.cam, mascot(1, i % 2 ? 'love' : 'happy', c), 240, 132); m.i = i; return m; });
    const ball = obj(W.cam, `<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="#c9cbe0" stroke="${INK}" stroke-width="8"/>${[...Array(36)].map((_, i) => `<rect x="${20 + (i % 6) * 27}" y="${20 + Math.floor(i / 6) * 27}" width="22" height="22" fill="${['#fff', '#e6e8f5', '#b9bcd6', '#ffe9f5'][(i * 7) % 4]}" opacity=".9"/>`).join('')}<circle cx="100" cy="100" r="90" fill="none" stroke="${INK}" stroke-width="8"/></svg>`, 200, 200);
    const beams = el('div', 'abs', root); css(beams, { left: '160px', top: '-900px', width: '1600px', height: '1600px', borderRadius: '50%', background: 'repeating-conic-gradient(from 0deg,rgba(255,154,213,.25) 0 5deg,rgba(255,154,213,0) 5deg 22deg,rgba(127,211,255,.25) 22deg 27deg,rgba(127,211,255,0) 27deg 45deg)', mixBlendMode: 'screen' });
    const notes = [...Array(10)].map((_, i) => { const n = obj(W.cam, `<div class="kw" style="font-size:70px;color:${cols[i % 5]};-webkit-text-stroke:3px #2b1d4a">${i % 2 ? '♪' : '♫'}</div>`, 70, 80); n.i = i; return n; });
    return (t) => {
      W.place(t, { rx: -6 * DEG, ry: Math.sin(t * 1.2) * 10 * DEG, dz: 40, dy: -30 });
      ms.forEach(m => { const ph = ((t - 63.67) / BEAT + (m.i % 2) * .5) % 1; const hop = Math.sin(ph * Math.PI); m.style.transform = tr3(-560 + m.i * 280, 230 - hop * 90, 0, 0, 0, (m.i % 2 ? 1 : -1) * Math.sin(t * 7) * 10, 1 + (1 - hop) * .06); });
      ball.style.transform = tr3(0, -420, -200, t * 80);
      beams.style.transform = `rotate(${t * 25}deg)`;
      notes.forEach(n => { const k = (t * .5 + n.i / 10) % 1; n.style.transform = tr3(-700 + n.i * 150, 160 - k * 600, -100, 0, 0, Math.sin(t * 4 + n.i) * 25, .7 + .4 * Math.sin(k * Math.PI)); n.inner.style.opacity = Math.sin(k * Math.PI); });
    };
  });

  // ---------- C1f 67.19–71.08: certificate "节俭大师" ----------
  addScene(67.2, 71.09, (root) => {
    buildDesktop(root, '11:11', '12月1日');
    const cert = win(root, { title: '荣誉证书.pdf', w: 1000, h: 620, x: 620, y: 130, theme: 'gold', html: `<div style="position:absolute;inset:18px;border:8px double #c99a2e;border-radius:12px;background:#fffaf0;text-align:center">
      <div class="kw" style="font-size:96px;color:#c0392b;margin-top:22px">荣誉证书</div><div style="font-size:32px;font-weight:900;margin-top:18px">恭喜 <span style="background:#e6e6ef;padding:0 10px;border-radius:8px">Plus 用户</span></div>
      <div class="kw" style="font-size:66px;margin-top:20px">荣获「节俭大师」称号</div><div style="font-size:26px;font-weight:700;color:#8a7a5a;margin-top:22px">—— 感谢科技 · 叮咚OS 颁发 ♡</div></div>` });
    const seal = sticker(root, '已节俭', { size: 90, fc: '#fff', x: 1290, y: 520, flat: true });
    seal.style.cssText += ';width:250px;height:250px;border:10px solid #ff3b5c;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,59,92,.85)';
    const wal = el('div', 'abs', root, ICON.wallet); css(wal, { left: '150px', top: '380px', width: '340px', height: '340px', filter: 'drop-shadow(8px 10px 0 rgba(43,29,74,.9))' });
    const moths = [...Array(5)].map((_, i) => { const m = el('div', 'abs', root, `<svg viewBox="0 0 60 40" width="72" height="48"><path d="M30 20 C10 0 0 10 4 22 C8 34 22 30 30 20Z M30 20 C50 0 60 10 56 22 C52 34 38 30 30 20Z" fill="#cfc6b6" stroke="${INK}" stroke-width="3"/><ellipse cx="30" cy="21" rx="3" ry="9" fill="${INK}"/></svg>`); m.i = i; return m; });
    const C = mkCanvas(root);
    return (t) => {
      cert.style.transform = `scale(${popS(t, 67.25, .6, 13, 7)}) rotate(${L(-4, 0, E.outC(P(t, 67.25, 67.7)))}deg)`;
      vis(seal, t >= 68.6); seal.style.transform = `scale(${t < 68.6 ? 0 : t < 68.75 ? L(2.6, 1, E.inQ(P(t, 68.6, 68.75))) : 1}) rotate(-14deg)`;
      wal.style.transform = `rotate(${Math.sin(t * 3) * 4}deg)`;
      moths.forEach(m => { const k = clamp((t - 68.0 - m.i * .3) / 2.2); vis(m, k > 0); css(m, { left: 300 + Math.sin(k * 9 + m.i) * 90 + k * 200 * (m.i % 2 ? 1 : -.4) + 'px', top: 420 - k * 380 + 'px', transform: `scaleX(${Math.abs(Math.sin(t * 18 + m.i)) * .7 + .3})` }); });
      const g = ctx2d(C); confetti(g, t, 68.62, 1410, 640, 21, 70, 1.0);
    };
  });
  addFlash(70.98, 71.09, 71.3, .9);

  // ---------- PCa 71.08–76.23: Pro VIP lane vs Plus queue ----------
  addScene(71.09, 76.24, (root) => {
    buildDesktop(root, '11:20', '12月1日');
    const pro = win(root, { title: '👑 Pro 专属通道', w: 860, h: 640, x: 50, y: 150, theme: 'gold', html: `<div style="position:absolute;inset:0;background:linear-gradient(#fff9e6,#ffe9a8)"><div style="position:absolute;left:300px;width:260px;top:120px;bottom:0;background:linear-gradient(90deg,#c0143c,#ff3b5c,#c0143c);border-left:6px solid #2b1d4a;border-right:6px solid #2b1d4a;clip-path:polygon(30% 0,70% 0,100% 100%,0 100%)"></div><div class="kw" style="position:absolute;left:0;right:0;top:24px;text-align:center;font-size:64px">额度 ∞ · 无需排队</div></div>` });
    const plus = win(root, { title: 'Plus 通道', w: 860, h: 640, x: 1010, y: 150, theme: 'gray', html: `<div style="position:absolute;inset:0;background:#e9e8ef;text-align:center"><div style="margin:40px auto 0;width:560px;background:#2b1d4a;border-radius:20px;padding:20px;color:#ff5f5f" class="pix"><div style="font-size:22px;color:#aaa">当前叫号</div><div style="font-size:66px;margin-top:10px" id="now">A001</div></div><div style="font-size:34px;font-weight:900;margin-top:26px">您的号码：<span class="pix" style="font-size:34px">A999</span></div><div style="font-size:26px;font-weight:700;color:#8a86a0;margin-top:10px">前方还有 <b id="ahead">998</b> 人 · 请您慢慢等着</div></div>` });
    const nowEl = plus.querySelector('#now'), ahead = plus.querySelector('#ahead');
    const snail = el('div', 'abs', root, `<svg viewBox="0 0 200 120" width="220" height="132"><path d="M20 100 H170 Q190 100 186 86 L160 70" fill="#ffe0a8" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><circle cx="100" cy="66" r="40" fill="#d6c9ff" stroke="${INK}" stroke-width="6"/><path d="M100 66 m-22 0 a22 22 0 1 0 22 -22" fill="none" stroke="${INK}" stroke-width="5"/><path d="M170 72 L178 40 M182 74 L196 46" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="178" cy="38" r="5" fill="${INK}"/><circle cx="196" cy="44" r="5" fill="${INK}"/></svg>`);
    const coins = [...Array(14)].map((_, i) => { const c = el('div', 'abs', pro, `<div class="coinL" style="position:relative;width:64px;height:64px;background:radial-gradient(circle at 35% 30%,#fff7b8,#ffd23f 45%,#ffaa00)"><span style="font-size:32px">额</span></div>`); c.i = i; return c; });
    const chips = [[71.08, 'pro', 'Pro', 160], [71.55, 'pro', 'Pro', 330], [72.02, 'pro', 'Pro', 500], [74.0, 'plus', 'Plus', 1180], [74.45, 'plus', 'Plus', 1350], [74.9, 'plus', 'Plus', 1520]].map(([t0, k, s, x]) => { const c = el('div', 'chip ' + k, root, s); css(c, { left: x + 'px', top: '-4px' }); c.t0 = t0; return c; });
    return (t) => {
      pro.style.transform = `translateY(${(1 - E.outBack(P(t, 71.09, 71.4))) * -900}px)`;
      plus.style.transform = `translateY(${(1 - E.outBack(P(t, 73.6, 73.95))) * 900}px)`;
      coins.forEach(c => { const k = (t * .8 + c.i / 14) % 1; css(c, { left: 40 + (c.i * 61) % 760 + 'px', top: -60 + k * 640 + 'px', transform: `rotateY(${t * 300 + c.i * 40}deg)` }); });
      nowEl.textContent = 'A00' + (1 + Math.floor(P(t, 73.9, 76.2) * 2));
      ahead.textContent = 998 - Math.floor(P(t, 73.9, 76.2) * 2);
      css(snail, { left: L(1080, 1180, P(t, 73.9, 76.2)) + 'px', top: '640px' }); vis(snail, t > 73.95);
      chips.forEach(c => { vis(c, t >= c.t0); c.style.transform = `scale(${popS(t, c.t0, 0, 16, 7)}) rotate(${Math.sin(t * 5 + c.t0) * 8}deg)`; });
    };
  });
  addFlash(76.12, 76.24, 76.45, .8);

  // ---------- PCb 76.23–81.50: same dream, different sky; same card, different perks ----------
  addScene(76.24, 81.51, (root) => {
    const halves = [['gold', 'gold', 'inset(0 50% 0 0)', -1], ['gray', 'gray', 'inset(0 0 0 50%)', 1]].map(([pal, fl, clip, side]) => {
      const h = el('div', 'full', root); h.style.clipPath = clip;
      const W = world3D(h, { pal: SKY[pal], floor: fl, seed: 50 + side, noSun: side > 0 });
      const card = el('div', 'obj', W.cam);
      const front = el('div', 'card', card, `<div class="kw" style="position:absolute;left:30px;top:24px;font-size:54px">订阅会员卡 ♡</div><div class="pix" style="position:absolute;left:30px;bottom:30px;font-size:22px">**** **** 2025</div><div style="position:absolute;right:30px;bottom:24px;width:90px;height:66px;border:5px solid #2b1d4a;border-radius:12px;background:linear-gradient(135deg,#ffe45c,#ffb84d)"></div>`);
      css(front, { left: '-260px', top: '-160px', background: 'linear-gradient(135deg,#ffd6ea,#e2d4ff,#c9f0ff)' });
      const back = el('div', 'card', card, side < 0
        ? `<div class="kw" style="position:absolute;left:30px;top:22px;font-size:58px">Pro ✨</div><div style="position:absolute;left:34px;top:110px;font-size:36px;font-weight:900;line-height:1.5">额度 ∞<br>优先 · 尊享 · 不排队</div>`
        : `<div class="kw" style="position:absolute;left:30px;top:22px;font-size:58px;color:#56566a">Plus</div><div style="position:absolute;left:34px;top:110px;font-size:36px;font-weight:900;line-height:1.5;color:#56566a">额度 有限<br>排队 · 稍后再试</div>`);
      css(back, { left: '-260px', top: '-160px', background: side < 0 ? 'linear-gradient(135deg,#fff3b0,#ffd23f,#ffb84d)' : 'linear-gradient(135deg,#eeeef4,#c9c9d6)', transform: 'rotateY(180deg)' });
      const extra = side < 0
        ? obj(W.cam, `<svg viewBox="0 0 600 320"><path d="M40 300 A260 260 0 0 1 560 300" fill="none" stroke="#ff7ab6" stroke-width="34"/><path d="M76 300 A224 224 0 0 1 524 300" fill="none" stroke="#ffe45c" stroke-width="34"/><path d="M112 300 A188 188 0 0 1 488 300" fill="none" stroke="#46e0bd" stroke-width="34"/><path d="M148 300 A152 152 0 0 1 452 300" fill="none" stroke="#7fd3ff" stroke-width="34"/></svg>`, 1000, 533)
        : obj(W.cam, `<svg viewBox="-60 -50 320 140">${cloud(0, 0, 1).replace(/#fff/g, '#8f8fa6')}</svg>`, 700, 306);
      const drops = side > 0 ? [...Array(26)].map((_, i) => { const d = obj(W.cam, '<div style="width:7px;height:56px;border-radius:4px;background:#a8d8ff;border:2px solid #2b1d4a"></div>', 11, 60); d.i = i; return d; }) : [];
      return { W, card, extra, drops, side };
    });
    const divider = el('div', 'abs', root); css(divider, { left: '954px', top: '0', width: '12px', height: '1080px', background: '#fff', border: '4px solid #2b1d4a' });
    const lab = [['同样的月费', 330], ['不同的天空', 1290]].map(([s, x], i) => { const e = sticker(root, s, { size: 64, fc: i ? '#d3d3de' : '#ffe45c', x, y: 70 }); return e; });
    return (t) => {
      const flip = E.io(P(t, 78.9, 79.5));
      halves.forEach(({ W, card, extra, drops, side }) => {
        W.place(t, { rx: -5 * DEG, ry: Math.sin(t * .6) * 5 * DEG, dz: 60, dy: -20 });
        card.style.transform = tr3(side * 470, -60 + Math.sin(t * 2 + side) * 12, 100, flip * 180 + Math.sin(t * 1.5) * 12, 6, 0);
        extra.style.transform = side < 0 ? tr3(-470, -250, -700) : tr3(470, -330, -300);
        drops.forEach(d => { const k = (t * 1.5 + d.i / 26) % 1; d.style.transform = tr3(470 - 330 + (d.i * 53) % 660, -260 + k * 620, -250 + (d.i % 4) * 60, 0, 0, 10); });
      });
      lab.forEach((e, i) => { const t0 = i ? 77.6 : 76.3; vis(e, t >= t0); e.style.transform = `scale(${popS(t, t0, 0)}) rotate(${i ? 4 : -4}deg)`; });
    };
  });
  addFlash(81.38, 81.5, 81.75, .8);
})();
