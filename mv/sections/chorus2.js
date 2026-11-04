/* 108.5–135.6: Chorus 2 (bigger, more sarcastic) */
(function () {
  const VEIL = `<svg viewBox="0 0 240 200"><path d="M40 40 C20 120 30 180 70 200 L170 200 C210 180 220 120 200 40 Z" fill="rgba(255,255,255,.75)" stroke="${INK}" stroke-width="5"/><circle cx="120" cy="34" r="26" fill="#ff9ad5" stroke="${INK}" stroke-width="5"/><circle cx="92" cy="40" r="16" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="148" cy="40" r="16" fill="#fff" stroke="${INK}" stroke-width="4"/></svg>`;
  const BOW = `<svg viewBox="0 0 120 60"><path d="M60 30 L10 6 L10 54Z M60 30 L110 6 L110 54Z" fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="60" cy="30" r="12" fill="#ff5fae" stroke="${INK}" stroke-width="4"/></svg>`;
  // ---------- C2a 108.47–112.94: the wedding ----------
  addScene(108.48, 112.95, (root) => {
    const W = world3D(root, { pal: SKY.dawn, seed: 95 });
    const arch = obj(W.cam, `<svg viewBox="0 0 900 760"><path d="M120 760 V330 A330 330 0 0 1 780 330 V760" fill="none" stroke="${INK}" stroke-width="64"/><path d="M120 760 V330 A330 330 0 0 1 780 330 V760" fill="none" stroke="#fff" stroke-width="46"/>${[...Array(22)].map((_, i) => { const a = Math.PI * (i / 21), x = 450 - Math.cos(a) * 330, y = 330 - Math.sin(a) * 330; return `<circle cx="${x}" cy="${y}" r="26" fill="${['#ff9ad5', '#ffe45c', '#ffb3df', '#c9bdff'][i % 4]}" stroke="${INK}" stroke-width="5"/>`; }).join('')}${[...Array(8)].map((_, i) => `<circle cx="${i % 2 ? 780 : 120}" cy="${400 + Math.floor(i / 2) * 90}" r="24" fill="${['#ff9ad5', '#ffe45c'][i % 2]}" stroke="${INK}" stroke-width="5"/>`).join('')}</svg>`, 900, 760);
    const bride = obj(W.cam, ICON.chat, 230, 230), groom = obj(W.cam, ICON.code, 230, 230);
    const veil = obj(W.cam, VEIL, 260, 216), bow = obj(W.cam, BOW, 120, 60);
    const bells = [0, 1].map(i => obj(W.cam, ICON.bell, 130, 130));
    const ring = obj(W.cam, `<div style="width:100%;height:100%;border:16px solid #ffd23f;border-radius:50%;box-shadow:0 0 0 6px #2b1d4a,inset 0 0 0 6px #2b1d4a,0 0 40px 10px rgba(255,214,80,.8)"></div>`, 300, 110);
    const ringT = obj(W.cam, `<div class="kw" style="font-size:36px;color:#fff;-webkit-text-stroke:2px #2b1d4a;text-align:center;white-space:nowrap">共享额度</div>`, 220, 50);
    const banner = sticker(root, 'Chat ♡ Codex 合并典礼', { size: 76, fc: '#ff5fae', x: 520, y: 40 });
    const C = mkCanvas(root);
    return (t) => {
      W.place(t, { rx: -4 * DEG, ry: Math.sin(t * .5) * 8 * DEG, dz: L(-60, 140, E.io(P(t, 108.5, 112.9))), dy: -10 });
      arch.style.transform = tr3(0, -50, -300);
      const lean = E.io(P(t, 110.7, 111.3));
      const hop = Math.abs(Math.sin((t - 108.47) * Math.PI / BEAT)) * 14 * (1 - lean);
      bride.style.transform = tr3(-170 + lean * 50, 140 - hop, -150, 0, 0, lean * 14, 1.35);
      groom.style.transform = tr3(170 - lean * 50, 140 - hop, -150, 0, 0, -lean * 14, 1.35);
      veil.style.transform = tr3(-170 + lean * 50, 50 - hop, -140, 0, 0, lean * 14, 1.35);
      bow.style.transform = tr3(170 - lean * 50, 300 - hop, -140, 0, 0, -lean * 14, 1.35);
      bells.forEach((b, i) => { b.style.transform = tr3(i ? 230 : -230, -420, -280, 0, 0, Math.sin(t * 7 + i * 3) * 24); });
      vis(ring, t > 110.9); vis(ringT, t > 110.9);
      ring.style.transform = tr3(0, -90 + Math.sin(t * 3) * 8, -140, 0, 70, 0, popS(t, 110.9, 0)); ringT.style.transform = tr3(0, -160 + Math.sin(t * 3) * 8, -140, 0, 0, 0, popS(t, 111.0, 0));
      banner.style.transform = `scale(${popS(t, 108.6, 0)}) rotate(-3deg)`;
      const g = ctx2d(C); confetti(g, t, 108.5, 960, 120, 41, 110, 1.0, true); confetti(g, t, 110.75, 960, 380, 42, 80, 1.2, true);
    };
  });
  addFlash(112.82, 112.95, 113.2, .8);

  // ---------- C2b 112.94–117.37: everyone needs it... then "环保" ----------
  addScene(112.95, 117.38, (root) => {
    const d1 = buildDesktop(root, '15:00', '12月5日');
    const d2 = buildDesktop(root, '15:01', '12月5日', 'eco');
    const left = win(root, { title: 'Codex · 写代码', w: 760, h: 470, x: 120, y: 260, theme: 'dark', html: '<div class="code" id="c"></div>' });
    const right = win(root, { title: 'ChatGPT · 聊天下', w: 760, h: 470, x: 1040, y: 260, html: '<div id="chat" style="position:absolute;inset:0"></div>' });
    const cd = left.querySelector('#c'), chat = right.querySelector('#chat');
    const B = ['今天吃什么好呢', '推荐三道家常菜～', '再帮我写首小诗', '好的，这是一首……'].map((s, i) => { const b = el('div', 'bub ' + (i % 2 ? 'ai' : 'me'), chat, s); b.style.top = 20 + i * 96 + 'px'; return b; });
    const shared = win(root, { title: '共享额度', w: 900, h: 150, x: 510, y: 60, theme: 'gold', html: `<div style="padding:22px 30px">${barHTML()}</div>` });
    const sb = shared.querySelector('.bar'); sb.style.width = '840px';
    const trash = el('div', 'abs', root, ICON.trash); css(trash, { left: '1500px', top: '520px', width: '320px', height: '320px', filter: 'drop-shadow(8px 10px 0 rgba(43,29,74,.9))' });
    const eco = win(root, { title: '🌱 环保模式已开启', w: 780, h: 300, x: 300, y: 300, theme: 'green', html: '<div style="padding:30px 36px"><div class="kw" style="font-size:54px">今日算力节约 100% ♡</div><div class="lbl" style="margin-top:16px;color:#4a8a4a">感谢您为地球做出的贡献</div></div>' });
    const leaves = [...Array(14)].map((_, i) => { const l = el('div', 'abs', root, `<svg viewBox="0 0 60 40" width="66" height="44"><path d="M4 20 C20 0 46 0 56 20 C46 40 20 40 4 20Z" fill="${i % 2 ? '#8fe08a' : '#5fcf6a'}" stroke="${INK}" stroke-width="4"/><path d="M8 20 H50" stroke="${INK}" stroke-width="3"/></svg>`); l.i = i; return l; });
    const CODE = ['<span class="k">def</span> <span class="f">需求</span>():', '    写代码()', '    改需求()', '    再写代码()', '    <span class="c"># 大家都需要</span>'];
    return (t) => {
      const ecoK = P(t, 115.1, 115.5);
      d2.style.opacity = ecoK;
      let o = ''; CODE.forEach((l, i) => { if ((t - 113.0) / .4 > i) o += l + '\n'; }); cd.innerHTML = o + '<span class="s">▌</span>';
      B.forEach((b, i) => { vis(b, t > 113.1 + i * .45); b.style.transform = `scale(${popS(t, 113.1 + i * .45, .5)})`; });
      setBar(sb, L(1, 0, E.inQ(P(t, 113.0, 115.1))));
      [left, right, shared].forEach((w, i) => { const k = E.inBack(P(t, 115.3 + i * .15, 115.8 + i * .15)); const x0 = parseFloat(w.style.left), y0 = parseFloat(w.style.top); w.style.transform = `translate(${k * (1580 - x0 - 200)}px,${k * (640 - y0 - 100)}px) scale(${Math.max(.001, 1 - k)}) rotate(${k * 200}deg)`; vis(w, k < 1); });
      trash.style.transform = `scale(${1 + (t > 115.3 && t < 116.3 ? Math.abs(Math.sin((t - 115.3) * 14)) * .12 : 0)})`; vis(trash, t > 115.0); trash.style.opacity = P(t, 115.0, 115.3);
      vis(eco, t >= 116.0); eco.style.transform = `scale(${popS(t, 116.0, 0)})`;
      leaves.forEach(l => { const k = ((t - 115.2) * .35 + l.i / 14) % 1; vis(l, t > 115.2); css(l, { left: (l.i * 139) % 1900 + Math.sin(t * 2 + l.i) * 40 + 'px', top: -60 + k * 1100 + 'px', transform: `rotate(${t * 90 + l.i * 40}deg)` }); });
    };
  });
  addFlash(117.25, 117.38, 117.6, .8);

  // ---------- C2c 117.37–122.03: climb one more tier and the world gets better ----------
  addScene(117.38, 122.04, (root) => {
    const W = world3D(root, { pal: SKY.gray, floor: 'gray', seed: 101, noSun: true });
    const S = [['FREE', 110, '#d6d6e2', '#b3b3c6', -620], ['PLUS', 230, '#dcd3ff', '#b7a9f0', -300], ['PRO', 370, '#ffd23f', '#dba500', 20], ['下一档', 530, '#fff3b0', '#f0c000', 340]];
    S.forEach(([lab, h, f, s, x]) => { const b = box(W.cam, 320, h, 280, { front: { bg: f, html: `<div class="steplab" style="font-size:${lab.length > 3 ? 26 : 30}px">${lab}</div>` }, back: { bg: s }, right: { bg: s }, left: { bg: f }, top: { bg: f }, bottom: { bg: s } }); b.style.transform = `translate3d(${x}px,${330 - h / 2}px,-200px)`; });
    const me = obj(W.cam, '', 200, 110);
    const rain = [...Array(30)].map((_, i) => { const d = obj(W.cam, '<div style="width:7px;height:56px;border-radius:4px;background:#a8d8ff;border:2px solid #2b1d4a"></div>', 11, 60); d.i = i; return d; });
    const rays = el('div', 'abs', root); css(rays, { left: '-40px', top: '-460px', width: '2000px', height: '2000px', borderRadius: '50%', background: 'repeating-conic-gradient(from 0deg,rgba(255,250,210,.5) 0 5deg,rgba(255,250,210,0) 5deg 15deg)', WebkitMaskImage: 'radial-gradient(circle,#000 0,transparent 60%)' });
    const spks = [[300, 200, 30], [1640, 260, 26], [1500, 120, 20], [420, 420, 18], [1760, 520, 22], [900, 120, 24]].map(([x, y, r], i) => spk(root, x, y, r, i % 2 ? '#ffe45c' : '#fff'));
    const better = sticker(root, '世界变好了 ✨', { size: 80, fc: '#ffe45c', x: 1120, y: 150 });
    const hops = [[117.4, 0, 1], [118.5, 1, 2], [119.62, 2, 3]];
    const stepTop = i => 330 - S[i][1];
    return (t) => {
      const gold = t >= 119.64;
      W.sky.pal = gold ? SKY.gold : SKY.gray;
      W.floor.style.backgroundColor = gold ? FLOOR.gold.bg : FLOOR.gray.bg; W.floor.style.backgroundImage = gold ? FLOOR.gold.img : FLOOR.gray.img;
      vis(W.sky.sunW, gold); vis(W.sky.glowSun, gold);
      W.place(t, { rx: -4 * DEG, ry: L(-14, 8, E.io(P(t, 117.4, 122))) * DEG, dz: 40, dy: L(60, 160, E.io(P(t, 117.4, 122))) });
      let pos = S[0][4], py = stepTop(0);
      for (const [h0, a, b] of hops) { if (t >= h0) { const k = P(t, h0, h0 + .4); pos = L(S[a][4], S[b][4], E.io(k)); py = L(stepTop(a), stepTop(b), k) - Math.sin(k * Math.PI) * 160; } }
      me.inner.innerHTML = mascot(gold ? 1 : .35, gold ? 'love' : 'sad', gold ? '#ffd23f' : null);
      me.style.transform = tr3(pos, py - 58, -200, 0, 0, 0);
      rain.forEach(d => { vis(d, !gold); const k = (t * 1.5 + d.i / 30) % 1; d.style.transform = tr3(-900 + (d.i * 61) % 1800, -500 + k * 900, -400 + (d.i % 5) * 80, 0, 0, 10); });
      vis(rays, gold); rays.style.transform = `rotate(${t * 20}deg)`; rays.style.opacity = P(t, 119.64, 120.0);
      twinkle(spks, t, gold ? 1 : 0);
      vis(better, t > 120.2); better.style.transform = `scale(${popS(t, 120.2, 0)}) rotate(4deg)`;
    };
  });
  addFlash(119.5, 119.64, 119.9, .9);
  addFlash(121.92, 122.04, 122.25, .8);

  // ---------- C2d 122.03–126.48: Plus tears sparkle; Pro's smile is always lovely ----------
  addScene(122.04, 126.49, (root) => {
    buildDesktop(root, '16:20', '12月6日');
    const pa = win(root, { title: '📷 Plus.jpg', w: 760, h: 620, x: 130, y: 150, theme: 'gray', html: `<div style="position:absolute;inset:16px;border-radius:14px;background:linear-gradient(#cfd3e6,#aeb3cc)"><div id="m" style="position:absolute;left:110px;top:150px;width:520px;height:286px"></div><div class="kw" style="position:absolute;left:0;right:0;bottom:24px;text-align:center;font-size:44px;color:#56566a">Plus 的眼泪 ✨</div></div>` });
    pa.querySelector('#m').innerHTML = mascot(.2, 'cry');
    const pb = win(root, { title: '📷 Pro.jpg', w: 760, h: 620, x: 1030, y: 150, theme: 'gold', html: `<div style="position:absolute;inset:16px;border-radius:14px;overflow:hidden;background:radial-gradient(circle,#fff6c8,#ffd23f)"><div id="r" style="position:absolute;left:-200px;top:-300px;width:1100px;height:1100px;border-radius:50%;background:repeating-conic-gradient(rgba(255,255,255,.6) 0 6deg,transparent 6deg 18deg)"></div><div id="m" style="position:absolute;left:110px;top:150px;width:520px;height:286px"></div><div class="kw" style="position:absolute;left:0;right:0;bottom:24px;text-align:center;font-size:44px">Pro 的笑容 ✨</div></div>` });
    pb.querySelector('#m').innerHTML = mascot(1, 'smile', '#ffd23f') ;
    const pr = pb.querySelector('#r');
    const crown = el('div', 'abs', pb, ICON.crown); css(crown, { left: '300px', top: '120px', width: '150px', height: '150px' });
    const glit = [...Array(8)].map((_, i) => spk(pa, 140 + (i * 83) % 480, 300 + (i % 3) * 90, 14 + (i % 3) * 6, i % 2 ? '#fff' : '#bdf0ff'));
    const bling = [...Array(6)].map((_, i) => spk(pb, 160 + (i * 97) % 440, 160 + (i % 3) * 130, 22, i % 2 ? '#fff' : '#ffe45c'));
    return (t) => {
      pa.style.transform = `scale(${popS(t, 122.1, .4, 13, 7)}) rotate(-3deg)`;
      vis(pb, t >= 124.15); pb.style.transform = `scale(${popS(t, 124.15, .4, 13, 7)}) rotate(3deg)`;
      pr.style.transform = `rotate(${t * 30}deg)`;
      crown.style.transform = `rotate(${Math.sin(t * 4) * 8}deg)`;
      glit.forEach((g, i) => { const k = ((t - 122.2) * .8 + i / 8) % 1; g.style.transform = `translateY(${k * 120}px) scale(${Math.sin(k * Math.PI)})`; });
      twinkle(bling, t);
    };
  });
  addFlash(126.36, 126.49, 126.7, .8);

  // ---------- C2e 126.48–129.99: the spending-power sorting conveyor ----------
  addScene(126.49, 130.0, (root) => {
    const W = world3D(root, { pal: SKY.night, seed: 111 });
    const belt = box(W.cam, 2400, 40, 260, { front: { bg: '#3a2a66' }, back: { bg: '#2b1d4a' }, left: { bg: '#2b1d4a' }, right: { bg: '#2b1d4a' }, top: { bg: 'repeating-linear-gradient(90deg,#56566a 0 40px,#77778c 40px 80px)' }, bottom: { bg: '#21183f' } });
    const mach = box(W.cam, 420, 360, 340, { front: { bg: '#a99bff', html: '<div class="kw" style="text-align:center;font-size:44px;margin-top:40px;line-height:1.2">消费能力<br>评估仪</div><div id="lt" style="position:absolute;left:150px;bottom:40px;width:120px;height:40px;border:5px solid #2b1d4a;border-radius:20px"></div>' }, back: { bg: '#7a6ad0' }, left: { bg: '#8b7be0' }, right: { bg: '#7a6ad0' }, top: { bg: '#c9bdff' }, bottom: { bg: '#5a4ab0' } });
    const lt = mach.faces.front.querySelector('#lt');
    const wal = [...Array(7)].map((_, i) => { const w = obj(W.cam, `<div style="position:relative;width:150px;height:150px">${ICON.wallet}<div class="tagl" style="left:20px;top:-30px;font-size:22px;display:none"></div></div>`, 150, 150); w.i = i; w.tag = w.inner.querySelector('.tagl'); return w; });
    const notes = [...Array(8)].map((_, i) => { const n = obj(W.cam, `<div class="kw" style="font-size:64px;color:${['#ff9ad5', '#ffe45c', '#46e0bd'][i % 3]};-webkit-text-stroke:3px #2b1d4a">${i % 2 ? '♪' : '♫'}</div>`, 70, 80); n.i = i; return n; });
    return (t) => {
      W.place(t, { rx: -8 * DEG, ry: Math.sin(t * .5) * 8 * DEG, dz: 80, dy: -40 });
      belt.style.transform = 'translate3d(0,250px,0)'; belt.faces.top.style.backgroundPosition = `${(t * 300) % 80}px 0`;
      mach.style.transform = 'translate3d(0,50px,0)';
      lt.style.background = Math.sin(t * 12) > 0 ? '#ff3b5c' : '#46e0bd';
      wal.forEach(w => { const x = ((t - 126.5) * 300 + w.i * 340) % 2380 - 1190; w.style.transform = tr3(x, 155, 0, 0, 0, Math.sin(t * 6 + w.i) * 4); vis(w, Math.abs(x) > 200); const done = x > 200; w.tag.style.display = done ? 'block' : 'none'; const pro = w.i % 3 === 0; w.tag.textContent = pro ? 'Pro ✨' : 'Plus'; w.tag.style.background = pro ? '#ffd23f' : '#d3d3de'; });
      notes.forEach(n => { const k = (t * .6 + n.i / 8) % 1; n.style.transform = tr3(-800 + n.i * 220, -100 - k * 400, -200, 0, 0, Math.sin(t * 4 + n.i) * 20); n.inner.style.opacity = Math.sin(k * Math.PI); });
    };
  });
  addFlash(129.88, 130.0, 130.2, .8);

  // ---------- C2f 129.99–135.61: even my spending power is arranged ----------
  addScene(130.0, 135.62, (root) => {
    buildDesktop(root, '17:00', '12月7日');
    const days = '一二三四五六日';
    const cal = win(root, { title: '我的日程 · 已为您安排 ♡', w: 1200, h: 720, x: 360, y: 100, theme: 'red', html: `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:10px;padding:18px 22px">${[...days].map(d => `<div class="lbl" style="text-align:center">${d}</div>`).join('')}${[...Array(28)].map((_, i) => `<div class="cell" style="height:120px;border:4px solid #2b1d4a;border-radius:14px;background:#fff;position:relative"><span class="pix" style="position:absolute;left:8px;top:8px;font-size:14px">${i + 1}</span><div class="st kw" style="position:absolute;inset:26px 4px 4px;display:flex;align-items:center;justify-content:center;font-size:30px;color:#fff;background:${['#ff5fae', '#ffb84d', '#a99bff'][i % 3]};border:3px solid #2b1d4a;border-radius:10px">${['续费 ♡', '升级', '再付'][i % 3]}</div></div>`).join('')}</div>` });
    const st = [...cal.querySelectorAll('.st')];
    const big = el('div', 'abs', root, `<div class="kw" style="font-size:120px;color:#ff3b5c;border:14px solid #ff3b5c;border-radius:30px;padding:10px 40px;background:rgba(255,255,255,.85);white-space:nowrap">已为您安排 ✓</div>`); css(big, { left: '530px', top: '360px' });
    const soft = el('div', 'full', root); soft.style.background = 'radial-gradient(circle,#fff0f8,#ffd6ea)';
    return (t) => {
      cal.style.transform = `scale(${popS(t, 130.05, .6, 13, 7)})`;
      st.forEach((s, i) => { const t0 = 130.4 + i * .055; vis(s, t >= t0); s.style.transform = `scale(${popS(t, t0, 0, 18, 8)}) rotate(${(i % 2 ? 6 : -6)}deg)`; });
      vis(big, t >= 132.1); big.style.transform = `scale(${t < 132.25 ? L(2.5, 1, E.inQ(P(t, 132.1, 132.25))) : 1}) rotate(-8deg)`;
      soft.style.opacity = E.ioQ(P(t, 134.4, 135.6));
    };
  });
})();
