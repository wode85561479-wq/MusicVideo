/* 81.5–108.5: Verse 2 + Pre-chorus 2 */
(function () {
  const FLAG = `<svg viewBox="0 0 160 200" width="160" height="200"><path d="M20 10 V195" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M24 16 C60 0 90 34 140 18 L140 96 C90 112 60 78 24 94Z" fill="#fff" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/></svg>`;
  // ---------- V2a 81.50–85.74: their endless context vs my three lines ----------
  addScene(81.51, 85.75, (root) => {
    buildDesktop(root, '23:00', '12月2日');
    const lw = win(root, { title: '别人的对话 · 长上下文', w: 820, h: 690, x: 70, y: 90, theme: 'gold', html: '<div id="scr" style="position:absolute;left:0;right:0;top:0"></div><div id="sky" style="position:absolute;right:16px;top:12px;width:180px;height:110px;border:4px solid #2b1d4a;border-radius:14px;overflow:hidden"><div id="sun" style="position:absolute;left:60px;width:60px;height:60px;border-radius:50%;background:#ffe45c;border:4px solid #2b1d4a"></div></div>' });
    const scr = lw.querySelector('#scr'), sky = lw.querySelector('#sky'), sun = lw.querySelector('#sun');
    const TXT = ['继续写第 37 章', '好的！第 37 章……', '再展开讲讲细节', '没问题，以下是详细版本……', '把前面所有内容总结一下', '好的，回顾我们的整段对话……', '继续', '好的，接着写……'];
    for (let i = 0; i < 40; i++) { const b = el('div', 'bub ' + (i % 2 ? 'ai' : 'me'), scr, TXT[i % TXT.length]); b.style.top = i * 92 + 'px'; b.style.fontSize = '22px'; }
    const clock = sticker(lw, '23:00', { size: 40, fc: '#fff', x: 520, y: 130, flat: true });
    const rw = win(root, { title: '我的对话', w: 820, h: 690, x: 1030, y: 90, theme: 'gray', html: '<div class="code" id="mine" style="color:#2b1d4a;font-family:\'Noto Sans SC\';font-size:30px;font-weight:700;line-height:1.7"></div>' });
    const mine = rw.querySelector('#mine');
    const ML = ['第一行：帮我看看这个 bug', '第二行：报错信息如下', '第三行：'];
    const sur = win(root, { title: '温柔劝降 ♡', w: 560, h: 300, x: 1160, y: 380, html: `<div class="row" style="padding:26px 26px;gap:20px"><div id="flag" style="transform-origin:12% 95%">${FLAG}</div><div><div class="kw" style="font-size:44px">额度不足啦</div><div class="lbl" style="margin-top:10px;color:#7a5fa8">建议先休息一下哦 ♡</div></div></div>` });
    const flag = sur.querySelector('#flag');
    return (t) => {
      scr.style.transform = `translateY(${-E.inQ(P(t, 81.6, 85.7)) * 2900}px)`;
      const day = P(t, 81.6, 85.6);
      sky.style.background = `linear-gradient(${['#1b1045', '#5a3a8f', '#ff9ab0', '#bde6ff'][Math.min(3, Math.floor(day * 4))]},#fff)`;
      sun.style.top = L(110, 20, day) + 'px';
      const hh = 23 + Math.floor(day * 7); clock.querySelector('.s').textContent = clock.querySelector('.f').textContent = String(hh % 24).padStart(2, '0') + ':00';
      let o = ''; ML.forEach((l, i) => { const s = 82.0 + i * .5; if (t > s) o += typeText(l, t, s, 30) + '\n'; }); mine.textContent = o;
      vis(sur, t >= 83.53); sur.style.transform = `scale(${popS(t, 83.53, 0, 14, 7)})`;
      flag.style.transform = `rotate(${Math.sin(t * 9) * 12}deg) skewY(${Math.sin(t * 13) * 6}deg)`;
    };
  });
  addFlash(85.62, 85.75, 85.98, .8);

  // ---------- V2b 85.74–90.75: they switch models at will; I practise calm in the reset countdown ----------
  addScene(85.75, 90.76, (root) => {
    const W = world3D(root, { pal: SKY.night, seed: 61 });
    const models = ['旗舰模型', '推理模型', '超长上下文', '极速模式', '深度研究', '多模态'];
    const mw = obj(W.cam, '', 520, 560);
    const mwin = win(mw.inner, { title: '别人 · 模型切换', w: 520, h: 560, theme: 'gold', html: models.map((m, i) => `<div class="mi" style="margin:14px 18px 0;padding:10px 18px;border:4px solid #2b1d4a;border-radius:14px;font-size:28px;font-weight:900;background:#fff">✓ ${m}</div>`).join('') });
    const items = [...mwin.querySelectorAll('.mi')];
    const chart = obj(W.cam, `<svg viewBox="0 0 300 260"><path d="M20 240 L90 200 L150 150 L210 80 L280 10" fill="none" stroke="#46e0bd" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><path d="M250 6 L284 6 L284 40" fill="none" stroke="#46e0bd" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><text x="20" y="40" font-family="ZCOOL KuaiLe" font-size="40" fill="#fff">效率 ↑↑</text></svg>`, 300, 260);
    const clockO = el('div', 'obj', W.cam);
    const panel = el('div', 'abs', clockO); css(panel, { left: '-470px', top: '-150px', width: '940px', height: '300px', background: '#fff6fb', border: '7px solid #2b1d4a', borderRadius: '34px', boxShadow: '10px 12px 0 #2b1d4a', textAlign: 'center', paddingTop: '20px' });
    const head = el('div', 'kw', panel, '额度重置倒计时'); css(head, { fontSize: '40px', marginBottom: '6px' });
    const digs = []; const row = el('div', '', panel); row.style.whiteSpace = 'nowrap';
    for (let i = 0; i < 6; i++) { if (i === 2 || i === 4) row.insertAdjacentHTML('beforeend', '<span class="pix" style="font-size:70px;vertical-align:60px">:</span>'); const c = el('div', 'fc', row); c.innerHTML = '<div class="half up"><span>0</span></div><div class="half dn"><span>0</span></div><div class="half up flap"><span>0</span></div>'; digs.push(c); }
    const zen = obj(W.cam, mascot(.15, 'zen'), 260, 143);
    const cushion = obj(W.cam, `<svg viewBox="0 0 300 80"><ellipse cx="150" cy="44" rx="140" ry="30" fill="#ff9ad5" stroke="${INK}" stroke-width="7"/></svg>`, 300, 80);
    const rings = [0, 1, 2].map(i => { const r = obj(W.cam, '<div style="width:100%;height:100%;border:6px solid #a99bff;border-radius:50%"></div>', 300, 300); r.i = i; return r; });
    const SEC0 = 4 * 3600 + 59 * 60 + 59;
    const fmt = s => { s = Math.max(0, s); return [Math.floor(s / 36000) % 10, Math.floor(s / 3600) % 10, Math.floor(s / 600) % 6, Math.floor(s / 60) % 10, Math.floor(s / 10) % 6, s % 10]; };
    return (t) => {
      const k = E.io(P(t, 87.6, 88.4));
      W.place(t, { rx: -5 * DEG, ry: L(16, -8, k) * DEG, dz: 90, dy: -30 });
      mw.style.transform = tr3(-560, -60 + Math.sin(t * 1.5) * 10, -100, 22, 0, -3);
      const sel = Math.floor((t - 85.75) * 7) % items.length;
      items.forEach((it, i) => { it.style.background = i === sel ? '#ffe45c' : '#fff'; it.style.transform = i === sel ? 'scale(1.05)' : ''; });
      chart.style.transform = tr3(-140, -300 + Math.sin(t * 2) * 10, -200, 10, 0, 0, .8 + .2 * E.outBack(P(t, 86.2, 86.8)));
      clockO.style.transform = tr3(380, -150, -150, -14, 0, 0, .85);
      const tt = Math.max(0, t - 85.75), secs = SEC0 - Math.floor(tt * 1.5), frac = (tt * 1.5) % 1;
      const now = fmt(secs), prev = fmt(secs + 1);
      digs.forEach((c, i) => {
        const [up, dn, flap] = c.children; up.firstChild.textContent = now[i]; dn.firstChild.textContent = now[i]; flap.firstChild.textContent = prev[i];
        const changing = now[i] !== prev[i] && frac < .35;
        vis(flap, changing); if (changing) flap.style.transform = `scaleY(${Math.max(.02, 1 - E.inQ(frac / .35))})`;
        if (changing && frac < .17) up.firstChild.textContent = prev[i];
      });
      const br = (Math.sin((t - 88) * 1.6) + 1) / 2;
      zen.style.transform = tr3(380, 170 - br * 10, -40, -12, 0, 0, 1 + br * .05);
      cushion.style.transform = tr3(380, 250, -40, -12);
      rings.forEach(r => { const q = ((t * .5) + r.i / 3) % 1; r.style.transform = tr3(380, 170, -60, -12, 0, 0, .6 + q * 1.4); r.inner.style.opacity = (1 - q) * P(t, 88.0, 88.6); });
    };
  });
  addFlash(90.62, 90.75, 90.98, .8);

  // ---------- V2c 90.75–92.93: the high tier rides the waves ----------
  addScene(90.76, 92.94, (root) => {
    const W = world3D(root, { pal: SKY.ocean, floor: 'ocean', seed: 72, speed: 220 });
    const wave = obj(W.cam, `<svg viewBox="0 0 900 520"><path d="M0 520 C120 360 260 200 470 140 C650 90 820 160 860 280 C800 220 700 220 640 300 C600 360 640 440 720 470 L900 520Z" fill="#46c8ff" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/><path d="M60 500 C200 330 330 230 500 190" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" opacity=".8"/><path d="M640 300 C700 250 780 250 840 280" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round"/></svg>`, 1100, 636);
    const board = obj(W.cam, `<svg viewBox="0 0 320 70"><path d="M10 40 Q160 0 310 30 Q160 72 10 40Z" fill="#ffd23f" stroke="${INK}" stroke-width="7"/><path d="M40 40 Q160 20 280 32" stroke="#ff5fae" stroke-width="8" fill="none"/></svg>`, 340, 74);
    const rider = obj(W.cam, mascot(1, 'cool', '#ffd23f') , 230, 126);
    const crown = obj(W.cam, ICON.crown, 90, 90);
    const lines = [...Array(10)].map((_, i) => { const l = obj(W.cam, '<div style="width:100%;height:8px;border-radius:4px;background:#fff"></div>', 260, 8); l.i = i; return l; });
    const splash = [...Array(12)].map((_, i) => { const d = obj(W.cam, '<div style="width:100%;height:100%;border-radius:50%;background:#bdf0ff;border:3px solid #2b1d4a"></div>', 26, 26); d.i = i; return d; });
    const tag = sticker(root, '高档位 · 乘风破浪', { size: 70, fc: '#ffe45c', x: 120, y: 90 });
    return (t) => {
      W.place(t, { rx: -4 * DEG, ry: Math.sin(t * 1.4) * 8 * DEG, dz: 80, dy: 0 });
      wave.style.transform = tr3(120, -10 + Math.sin(t * 3) * 10, -260);
      const bx = 60 + Math.sin(t * 2.2) * 120, by = -40 + Math.cos(t * 2.2) * 40;
      board.style.transform = tr3(bx, by + 70, -120, 0, 0, -14 + Math.sin(t * 4.4) * 8);
      rider.style.transform = tr3(bx, by, -110, 0, 0, -10 + Math.sin(t * 4.4) * 8);
      crown.style.transform = tr3(bx - 10, by - 90, -110, 0, 0, -20);
      lines.forEach(l => { const k = (t * 3 + l.i / 10) % 1; l.style.transform = tr3(bx + 260 + k * 600, by - 60 + (l.i % 5) * 40, -100); l.inner.style.opacity = 1 - k; });
      splash.forEach(d => { const k = (t * 2 + d.i / 12) % 1; d.style.transform = tr3(bx + 130 + Math.cos(d.i) * k * 160, by + 80 - Math.sin(k * Math.PI) * 120, -100); d.inner.style.opacity = 1 - k; });
      tag.style.transform = `scale(${popS(t, 91.0, 0)}) rotate(-5deg)`;
    };
  });
  // ---------- V2c' 92.93–95.17: Plus studies the flow of time ----------
  addScene(92.94, 95.18, (root) => {
    const W = world3D(root, { pal: SKY.dawn, seed: 81 });
    const glass = obj(W.cam, '', 300, 460);
    const me = obj(W.cam, mascot(.2, 'zen', null, GLASSES), 230, 126);
    const note = obj(W.cam, `<div style="width:100%;height:100%;background:#fff;border:5px solid #2b1d4a;border-radius:10px;padding:14px;font-weight:900;font-size:22px;line-height:1.6;box-shadow:6px 6px 0 #2b1d4a">时间研究笔记<br><span style="color:#7a5fa8;font-weight:700">· 一秒 = 一秒<br>· 等待使人平静</span></div>`, 240, 190);
    const tag = sticker(root, 'Plus · 研究时间流淌', { size: 64, fc: '#d3d3de', x: 1050, y: 100 });
    const hg = (k) => { const topH = 150 * (1 - k), botH = 150 * k; return `<svg viewBox="0 0 300 460"><rect x="20" y="10" width="260" height="34" rx="10" fill="#c98a4a" stroke="${INK}" stroke-width="7"/><rect x="20" y="416" width="260" height="34" rx="10" fill="#c98a4a" stroke="${INK}" stroke-width="7"/><path d="M50 44 C50 150 140 190 140 230 C140 270 50 310 50 416 L250 416 C250 310 160 270 160 230 C160 190 250 150 250 44Z" fill="rgba(230,240,255,.55)" stroke="${INK}" stroke-width="7"/><path d="M${150 - 90 * (1 - k)} ${210 - topH * .9} L${150 + 90 * (1 - k)} ${210 - topH * .9} L152 214 L148 214Z" fill="#ffd36e"/><path d="M60 410 L240 410 L${150 + 100 * Math.min(1, k * 1.3)} ${410 - botH} L${150 - 100 * Math.min(1, k * 1.3)} ${410 - botH}Z" fill="#ffd36e"/><path d="M150 214 V${410 - botH}" stroke="#ffd36e" stroke-width="5"/></svg>`; };
    return (t) => {
      W.place(t, { rx: -5 * DEG, ry: L(-10, 10, P(t, 92.9, 95.2)) * DEG, dz: L(0, 120, P(t, 92.9, 95.2)), dy: -20 });
      glass.inner.innerHTML = hg(.25 + P(t, 92.9, 95.2) * .2);
      glass.style.transform = tr3(-160, 100, 0, Math.sin(t) * 8);
      me.style.transform = tr3(200, 250 + Math.sin(t * 2) * 3, 60, -10);
      note.style.transform = tr3(420, 200, 20, -20, 0, 6);
      tag.style.transform = `scale(${popS(t, 93.1, 0)}) rotate(4deg)`;
    };
  });
  addFlash(95.05, 95.18, 95.4, .8);

  // ---------- V2d 95.17–99.48: freedom of choice (wallet permitting) ----------
  addScene(95.18, 99.49, (root) => {
    buildDesktop(root, '09:00', '12月3日');
    const dlg = win(root, { title: '请选择您的套餐 ♡', w: 1120, h: 560, x: 400, y: 110, html: '' });
    const body = dlg.querySelector('.wbody');
    const opts = [['Plus', '#e6e6ef', '¥', '当前套餐'], ['Pro ✨', '#ffe9a8', '¥¥¥¥¥¥', '强烈推荐'], ['下一档 👑', '#ffd6ea', '¥¥¥¥¥¥¥¥¥¥', '敬请期待']].map(([n, bg, p, tg], i) => {
      const o = el('div', 'opt', body, `<div class="kw" style="font-size:52px;margin-top:40px">${n}</div><div class="pix" style="font-size:${i === 2 ? 15 : 22}px;margin-top:40px;color:#c0392b;word-break:break-all;padding:0 14px">${p}</div><div class="tagl" style="position:relative;display:inline-block;margin-top:40px;font-size:22px">${tg}</div>`);
      css(o, { left: 50 + i * 350 + 'px', top: '50px', background: bg }); return o; });
    const cur = mkCursor(root);
    const wal = el('div', 'abs', root, `<svg viewBox="0 0 600 420" width="720" height="504" overflow="visible">
      <g id="db"><rect x="40" y="70" width="520" height="26" rx="12" fill="#9a9ab0" stroke="${INK}" stroke-width="7"/><rect x="10" y="20" width="60" height="126" rx="14" fill="#56566a" stroke="${INK}" stroke-width="7"/><rect x="530" y="20" width="60" height="126" rx="14" fill="#56566a" stroke="${INK}" stroke-width="7"/><rect x="220" y="62" width="160" height="42" rx="10" fill="#ffd23f" stroke="${INK}" stroke-width="5"/><text x="300" y="92" text-anchor="middle" font-family="ZCOOL KuaiLe" font-size="28" fill="${INK}">下一档</text></g>
      <path d="M170 300 Q120 200 150 96" stroke="${INK}" stroke-width="34" fill="none" stroke-linecap="round"/><path d="M170 300 Q120 200 150 96" stroke="#ffb84d" stroke-width="20" fill="none" stroke-linecap="round"/>
      <path d="M430 300 Q480 200 450 96" stroke="${INK}" stroke-width="34" fill="none" stroke-linecap="round"/><path d="M430 300 Q480 200 450 96" stroke="#ffb84d" stroke-width="20" fill="none" stroke-linecap="round"/>
      <circle cx="132" cy="220" r="30" fill="#ffb84d" stroke="${INK}" stroke-width="6"/><circle cx="468" cy="220" r="30" fill="#ffb84d" stroke="${INK}" stroke-width="6"/>
      <g transform="translate(150 230) scale(3)">${ICON.wallet.replace(/<\/?svg[^>]*>/g, '')}</g>
      <path d="M268 330q10-10 20 0M322 330q10-10 20 0" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M285 352h40" stroke="${INK}" stroke-width="6" stroke-linecap="round"/></svg>`);
    css(wal, { left: '600px', top: '420px' });
    const db = wal.querySelector('#db');
    const sw = [0, 1, 2, 3].map(i => { const s = el('div', 'abs', root, `<svg viewBox="0 0 40 60" width="40" height="60"><path d="M20 4q16 26 14 38a14 14 0 0 1-28 0q-2-12 14-38z" fill="#7fd3ff" stroke="${INK}" stroke-width="4"/></svg>`); s.i = i; return s; });
    const strong = sticker(root, '坚 强！', { size: 96, fc: '#ff5fae', x: 1350, y: 560 });
    return (t) => {
      const up = E.inBack(P(t, 97.0, 97.4));
      dlg.style.transform = `translateY(${-up * 900}px) scale(${popS(t, 95.2, .7)})`;
      opts.forEach((o, i) => { const hov = (t > 95.9 && t < 96.5 && i === 1) || (t > 96.5 && t < 97.1 && i === 2); o.style.transform = `translateY(${hov ? -16 : 0}px) scale(${hov ? 1.06 : 1})`; o.style.boxShadow = hov ? '8px 9px 0 #2b1d4a,0 0 40px 10px rgba(255,214,80,.9)' : ''; });
      const cp = t < 96.5 ? [L(1100, 1000, E.io(P(t, 95.4, 95.9))), L(800, 500, E.io(P(t, 95.4, 95.9)))] : [L(1000, 1350, E.io(P(t, 96.5, 96.8))), 500];
      cur.style.transform = `translate(${cp[0]}px,${cp[1] - up * 900}px)`;
      const wk = E.outBack(P(t, 97.2, 97.6));
      vis(wal, t > 97.15); wal.style.transform = `translateY(${(1 - wk) * 700}px)`;
      const lift = t > 97.8 ? Math.sin((t - 97.8) * 2.2) * 30 - 20 : 0, shake = t > 97.6 ? Math.sin(t * 60) * 3 : 0;
      db.setAttribute('transform', `translate(${shake} ${lift + (1 - P(t, 97.6, 98.2)) * 120})`);
      sw.forEach(s => { const k = ((t - 97.8) * 1.4 + s.i / 4) % 1; vis(s, t > 97.8); css(s, { left: 700 + s.i * 160 + 'px', top: 600 + k * 80 + 'px', opacity: 1 - k }); });
      vis(strong, t > 98.2); strong.style.transform = `scale(${popS(t, 98.2, 0)}) rotate(${-6 + Math.sin(t * 20) * 2}deg)`;
    };
  });
  addFlash(99.36, 99.49, 99.72, .9);

  // ---------- P2 99.48–108.47: keynote stage ----------
  addScene(99.49, 108.48, (root) => {
    const W = world3D(root, { pal: SKY.night, seed: 88, noSun: true });
    const stage = box(W.cam, 1500, 60, 600, { front: { bg: '#3a2a66' }, top: { bg: 'repeating-linear-gradient(90deg,#4b3a8a 0 100px,#5a4898 100px 200px)' }, left: { bg: '#2f2466' }, right: { bg: '#2f2466' }, back: { bg: '#2f2466' }, bottom: { bg: '#21183f' } });
    const scrO = el('div', 'obj', W.cam);
    const scr = win(scrO, { title: '发布会.key', w: 1100, h: 640, x: -550, y: -320, theme: 'blue', html: '<div id="sl" style="position:absolute;inset:14px;perspective:1600px"></div>' });
    const sl = scr.querySelector('#sl');
    const mk = (html) => { const s = el('div', 'slide', sl, html); css(s, { border: '5px solid #2b1d4a' }); return s; };
    const T = (s) => `<div class="kw" style="position:absolute;left:44px;top:26px;font-size:76px">${s}</div>`;
    const slides = [
      mk(T('算力资源有限') + `<svg style="position:absolute;left:330px;top:150px" width="400" height="380" viewBox="0 0 400 380"><rect x="70" y="60" width="260" height="260" rx="24" fill="#6a4598" stroke="${INK}" stroke-width="9"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${100 + i * 50} 60V20M${100 + i * 50} 320V360M70 ${90 + i * 50}H30M330 ${90 + i * 50}H370" stroke="${INK}" stroke-width="9"/>`).join('')}<rect x="120" y="110" width="160" height="160" rx="12" fill="#a99bff" stroke="${INK}" stroke-width="7"/><text x="200" y="210" text-anchor="middle" font-family="Press Start 2P" font-size="30" fill="${INK}">GPU</text></svg><div class="tagl kw" style="left:720px;top:340px;font-size:60px;color:#fff;background:#ff3b5c;transform:rotate(-10deg)">有限!</div>`),
      mk(T('成本必须精简') + `<div style="position:absolute;left:120px;top:300px;width:820px;height:80px;border:7px solid #2b1d4a;border-radius:40px;overflow:hidden;background:#fff"><div id="cut" style="height:100%;background:repeating-linear-gradient(-45deg,#46e0bd 0 22px,#8af5dc 22px 44px)"></div></div><div id="sc" style="position:absolute;top:230px;font-size:150px">✂</div>`),
      mk(T('未来值得期待 ✨') + `<svg style="position:absolute;left:150px;top:150px" width="760" height="420" viewBox="0 0 760 420"><path d="M40 400 A340 340 0 0 1 720 400" fill="none" stroke="#ff7ab6" stroke-width="40"/><path d="M84 400 A296 296 0 0 1 676 400" fill="none" stroke="#ffe45c" stroke-width="40"/><path d="M128 400 A252 252 0 0 1 632 400" fill="none" stroke="#46e0bd" stroke-width="40"/><path d="M172 400 A208 208 0 0 1 588 400" fill="none" stroke="#7fd3ff" stroke-width="40"/></svg><div id="rk" style="position:absolute;left:470px;top:300px;font-size:130px">🚀</div>`),
      mk(T('期待也分价钱') + `<div class="tagl kw" style="left:120px;top:320px;font-size:40px;padding:26px 30px;background:#e6e6ef;border-style:dashed">Plus · 站票</div><div class="tagl kw" style="left:470px;top:220px;font-size:78px;padding:50px 50px;background:linear-gradient(135deg,#fff3b0,#ffd23f);box-shadow:0 0 40px 10px rgba(255,214,80,.8)">Pro · VIP 席 👑</div>`),
    ];
    const cut = slides[1].querySelector('#cut'), sc = slides[1].querySelector('#sc'), rk = slides[2].querySelector('#rk');
    const host = obj(W.cam, `<svg viewBox="0 0 400 300"><path d="M60 170c-40-10-50-80 10-100c10-50 90-60 120-20c40-40 120-20 120 40c60 10 60 90 10 100c-10 60-90 70-130 40c-40 30-120 20-130-60z" fill="#c9bdff" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/><path d="M150 150q10-14 20 0M230 150q10-14 20 0" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M180 186q20 18 40 0" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/></svg>`, 300, 225);
    const podium = box(W.cam, 200, 200, 120, { front: { bg: '#ff9ad5', html: '<div class="kw" style="text-align:center;font-size:36px;margin-top:60px">叮咚</div>' }, top: { bg: '#ffb3df' }, left: { bg: '#e07ab5' }, right: { bg: '#e07ab5' }, back: { bg: '#e07ab5' }, bottom: { bg: '#c0609a' } });
    const beams = [0, 1].map(i => { const b = el('div', 'abs', root); css(b, { left: i ? '1100px' : '-300px', top: '-300px', width: '1100px', height: '1500px', background: 'conic-gradient(from 160deg at 50% 0%,transparent 0deg,rgba(255,240,200,.28) 10deg,rgba(255,240,200,.28) 30deg,transparent 40deg)', transformOrigin: '50% 0' }); return b; });
    const crowd = el('div', 'abs', root, [...Array(11)].map((_, i) => `<svg viewBox="0 0 200 110" width="200" height="110" style="position:absolute;left:${i * 180 - 40}px;top:${(i % 2) * 24}px">${`<rect x="6" y="14" width="188" height="120" rx="60" fill="#1a1238" stroke="#0e0a22" stroke-width="7"/>`}</svg>`).join('')); css(crowd, { left: '0', top: '960px', width: '1920px', height: '140px' });
    const TT = [99.48, 101.72, 103.96, 105.95];
    return (t) => {
      W.place(t, { rx: -3 * DEG, ry: Math.sin(t * .4) * 5 * DEG, dz: L(-120, 120, P(t, 99.5, 108.4)), dy: 40 });
      stage.style.transform = 'translate3d(0,300px,-300px)';
      scrO.style.transform = 'translate3d(0,-110px,-460px)';
      const idx = TT.filter(x => t >= x).length - 1;
      slides.forEach((s, i) => { const k = i === idx ? E.io(P(t, TT[i], TT[i] + .35)) : (i === idx - 1 ? 1 + E.io(P(t, TT[idx], TT[idx] + .35)) : (i < idx ? 2 : 0)); s.style.transform = `rotateY(${90 - k * 90}deg)`; vis(s, k > 0 && k < 2); });
      cut.style.width = L(100, 30, E.ioQ(P(t, 102.2, 103.6))) + '%'; sc.style.left = 120 + 820 * L(1, .3, E.ioQ(P(t, 102.2, 103.6))) - 70 + 'px'; sc.style.transform = `rotate(${Math.sin(t * 20) * 14}deg)`;
      rk.style.transform = `translate(${Math.sin(t * 3) * 20}px,${-P(t, 104.2, 105.8) * 200}px) rotate(-30deg)`;
      host.style.transform = tr3(-560, -40 + Math.sin(t * 3) * 6, -150, 20, 0, Math.sin(t * 2) * 4);
      podium.style.transform = 'translate3d(-560px,170px,-80px) rotateY(20deg)';
      beams.forEach((b, i) => { b.style.transform = `rotate(${(i ? 1 : -1) * (20 + Math.sin(t * .8 + i) * 18)}deg)`; });
      crowd.style.transform = `translateY(${Math.abs(Math.sin(t * 4)) * -6}px)`;
    };
  });
  addFlash(108.3, 108.47, 108.75, 1);
})();
