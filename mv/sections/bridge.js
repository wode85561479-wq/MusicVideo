/* 135.6–171.3: Bridge (half-time), System Announcement, Breakdown */
(function () {
  // ---------- B1 135.61–144.31: a thank-you letter, love = waiting, "多喝热水" care ----------
  addScene(135.62, 144.32, (root) => {
    const W = world3D(root, { pal: SKY.dream, seed: 131, speed: 10 });
    const env = obj(W.cam, '', 560, 380);
    const letterO = el('div', 'obj', W.cam);
    const letter = win(letterO, { title: '致 OpenAI 的感谢信 ♡', w: 760, h: 470, x: -380, y: -235, html: '<div id="lt" class="kw" style="padding:24px 34px;font-size:36px;line-height:1.55;white-space:pre-wrap"></div>' });
    const lt = letter.querySelector('#lt');
    const LETTER = '亲爱的 OpenAI：\n    见字如面。\n    谢谢你，让我学会了等待，\n    也学会了心平气和。\n                    —— 一位 Plus 用户 ♡';
    const loadO = obj(W.cam, `<svg viewBox="0 0 200 190" overflow="visible"><path id="hp" d="M100 175C40 130 10 100 10 60a45 45 0 0 1 90-12a45 45 0 0 1 90 12c0 40-30 70-90 115z" fill="rgba(255,255,255,.85)" stroke="#ffb3d9" stroke-width="16" stroke-linejoin="round"/><path id="hd" d="M100 175C40 130 10 100 10 60a45 45 0 0 1 90-12a45 45 0 0 1 90 12c0 40-30 70-90 115z" fill="none" stroke="#ff5fae" stroke-width="16" stroke-linecap="round" stroke-dasharray="120 480"/><text x="100" y="110" text-anchor="middle" font-family="ZCOOL KuaiLe" font-size="30" fill="#2b1d4a">排队中…</text></svg>`, 260, 247);
    const hd = loadO.inner.querySelector('#hd');
    const care = win(root, { title: '关怀提示 ♡', w: 640, h: 300, x: 1180, y: 520, theme: 'mint', html: `<div class="row" style="padding:26px 26px;gap:22px"><svg viewBox="0 0 120 140" width="120" height="140"><path d="M30 50h50v70a10 10 0 0 1-10 10H40a10 10 0 0 1-10-10z" fill="#ff9ad5" stroke="${INK}" stroke-width="6"/><path d="M80 66h12a14 14 0 0 1 0 28H80" fill="none" stroke="${INK}" stroke-width="6"/><path id="st" d="M45 40q-8-12 0-24M60 40q-8-12 0-24" stroke="#c9bdff" stroke-width="5" fill="none" stroke-linecap="round"/></svg><div><div class="kw" style="font-size:42px">额度用完啦～</div><div class="kw" style="font-size:42px;color:#ff5fae">记得多喝热水哦 ♡</div></div></div>` });
    const steam = care.querySelector('#st');
    const hearts = [...Array(12)].map((_, i) => { const h = obj(W.cam, ICON.heart, 80, 80); h.i = i; return h; });
    return (t) => {
      W.place(t, { rx: -3 * DEG, ry: Math.sin(t * .3) * 6 * DEG, dz: L(-80, 80, P(t, 135.6, 144.3)), dy: 0 });
      const op = E.io(P(t, 135.9, 136.6));
      env.inner.innerHTML = `<svg viewBox="0 0 560 380" overflow="visible"><rect x="10" y="80" width="540" height="290" rx="18" fill="#fff0f8" stroke="${INK}" stroke-width="8"/><path d="M10 ${80} L280 ${80 + 170 * (1 - op) - 160 * op} L550 80" fill="#ffd6ea" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/><path d="M10 370 L280 220 L550 370" fill="none" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/><path d="M280 236c-14-10-22-16-22-24a11 11 0 0 1 22-3a11 11 0 0 1 22 3c0 8-8 14-22 24z" fill="#ff5fae" stroke="${INK}" stroke-width="4"/></svg>`;
      const rise = E.outBack(P(t, 136.5, 137.5), 1.2);
      env.style.transform = tr3(0, 220 + rise * 120, 60, 0, 0, 0, 1 - rise * .2);
      letterO.style.transform = tr3(0, 200 - rise * 330 + Math.sin(t * 1.2) * 8, 0, Math.sin(t * .8) * 6, 0, 0, Math.max(.001, .3 + rise * .7));
      lt.textContent = typeText(LETTER, t, 137.4, 12);
      vis(loadO, t > 139.85 && t < 141.9); loadO.style.transform = tr3(330, -230, 120, 0, 0, 0, popS(t, 139.85, 0, 12, 7));
      hd.setAttribute('stroke-dashoffset', -t * 300);
      vis(care, t >= 141.81); care.style.transform = `scale(${popS(t, 141.81, 0, 12, 7)}) rotate(-2deg)`;
      steam.style.transform = `translateY(${-((t * 20) % 8)}px)`;
      hearts.forEach(h => { const k = (t * .12 + h.i / 12) % 1; h.style.transform = tr3(-900 + (h.i * 173) % 1800, 400 - k * 1100, -600 - (h.i % 4) * 200, 0, 0, Math.sin(t + h.i) * 20, .6 + .5 * Math.sin(k * Math.PI)); h.inner.style.opacity = Math.sin(k * Math.PI) * .9; });
    };
  });
  addFlash(144.2, 144.32, 144.6, .6);

  // ---------- B2 144.31–153.38: gentle hints, upsell hints, "再多付一次" ----------
  addScene(144.32, 153.39, (root) => {
    const d = buildDesktop(root, '23:40', '12月8日', 'night');
    const toasts = [[144.4, '温柔提示 ♡', '额度剩余 10%', 'mint'], [145.4, '温柔提示 ♡', '额度剩余 3%', 'red'], [146.6, '✨ 小提示', 'Pro 不用等哦', 'gold'], [147.6, '✨ 悄悄告诉你', '升级只需一步', 'gold']].map(([t0, a, b, th], i) => {
      const w = win(root, { title: a, w: 520, h: 150, x: 1370, y: 800 - i * 170, theme: th, html: `<div class="kw" style="padding:20px 26px;font-size:40px">${b}</div>` }); w.t0 = t0; return w; });
    const dl = win(root, { title: '温柔的选择 ♡', w: 760, h: 380, x: 380, y: 300, html: `<div class="dbody" style="padding-top:26px"><div class="dav">${mascot(.05, 'love')}</div><div><div class="d1 kw">要不要……</div><div class="d2">再多付一次？♡</div></div></div><div class="dbtns"><div class="btn b1">好的</div><div class="btn b2">好的</div></div>` });
    const b2 = dl.querySelector('.b2');
    const ok = sticker(root, '支付成功 ♡', { size: 96, fc: '#ff9ad5', x: 470, y: 160 });
    const cur = mkCursor(root);
    const flyC = [...Array(7)].map((_, i) => { const c = el('div', 'abs', root, `<div class="coinL" style="position:relative;width:70px;height:70px;background:radial-gradient(circle at 35% 30%,#fff7b8,#ffd23f 45%,#ffaa00)"><span style="font-size:36px">¥</span></div>`); c.i = i; return c; });
    const moon = [...Array(10)].map((_, i) => spk(root, 200 + (i * 167) % 1500, 60 + (i * 71) % 300, 12 + (i % 3) * 5, '#fff6d6'));
    return (t) => {
      toasts.forEach(w => { const k = E.outBack(P(t, w.t0, w.t0 + .6), 1.3); vis(w, t >= w.t0); w.style.transform = `translateX(${(1 - k) * 600}px)`; w.style.opacity = 1 - P(t, 148.5, 149.2) * .55; });
      vis(dl, t >= 148.79); dl.style.transform = `scale(${popS(t, 148.79, .5, 9, 6)})`;
      const cp = [L(1200, 1045, E.io(P(t, 149.3, 151.3))), L(860, 615, E.io(P(t, 149.3, 151.3)))];
      cur.style.transform = `translate(${cp[0]}px,${cp[1]}px) scale(${t > 151.5 && t < 151.75 ? .85 : 1})`; vis(cur, t > 149.0);
      b2.style.transform = `scale(${t > 151.5 && t < 151.8 ? .9 : 1})`;
      vis(ok, t >= 151.8); ok.style.transform = `scale(${popS(t, 151.8, 0, 10, 6)}) rotate(-4deg)`;
      flyC.forEach(c => { const k = P(t, 151.9 + c.i * .14, 152.9 + c.i * .14); vis(c, k > 0 && k < 1); css(c, { left: L(70, 900, k) + 'px', top: L(500, 300, k) - Math.sin(k * Math.PI) * 220 + 'px' }); });
      twinkle(moon, t * .5);
    };
  });
  addFlash(153.28, 153.39, 153.6, .9);

  // ---------- SA 153.38–162.36: 叮咚 ×4 system announcements stacking in 3D ----------
  addScene(153.39, 162.37, (root) => {
    buildDesktop(root, '23:59', '12月8日');
    const red = el('div', 'full', root); red.style.background = 'radial-gradient(circle,rgba(255,59,92,0),rgba(255,59,92,.35))';
    const st = el('div', 'world', root); st.style.perspective = '1300px'; st.style.perspectiveOrigin = '960px 420px';
    const BAT = `<svg viewBox="0 0 120 70" width="130" height="76"><rect x="6" y="8" width="96" height="54" rx="10" fill="#fff" stroke="${INK}" stroke-width="7"/><rect x="104" y="24" width="10" height="22" rx="3" fill="${INK}"/><rect x="14" y="16" width="16" height="38" rx="4" fill="#ff3b5c"/></svg>`;
    const SHARE = `<svg viewBox="0 0 120 80" width="130" height="86"><circle cx="40" cy="40" r="28" fill="#46e0bd" stroke="${INK}" stroke-width="7"/><circle cx="80" cy="40" r="28" fill="rgba(169,155,255,.85)" stroke="${INK}" stroke-width="7"/></svg>`;
    const CALC = `<svg viewBox="0 0 90 110" width="90" height="110"><rect x="6" y="6" width="78" height="98" rx="12" fill="#ffb84d" stroke="${INK}" stroke-width="7"/><rect x="18" y="18" width="54" height="24" rx="5" fill="#fff" stroke="${INK}" stroke-width="5"/>${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${18 + c * 20}" y="${52 + r * 17}" width="14" height="12" rx="3" fill="#fff"/>`).join('')).join('')}</svg>`;
    const cards = [[153.38, 'red', BAT, 'Plus 额度 · 即将耗尽'], [155.62, 'blue', SHARE, 'Codex 额度 · 共享中'], [157.86, 'gold', `<div style="width:120px;height:120px">${ICON.crown}</div>`, 'Pro 权益 · 加量中 ✨'], [160.11, 'mint', CALC, '理性消费 · 感谢理解 ♡']].map(([t0, th, ic, s]) => {
      const w = win(st, { title: '📢 系统通知', w: 980, h: 230, x: 470, y: 330, theme: th, html: `<div class="row" style="padding:22px 34px;gap:30px">${ic}<div class="kw" style="font-size:58px">${s}</div></div>` });
      w.t0 = t0; return w; });
    const dings = cards.map((c, i) => { const s = el('div', 'burst', root, starburst(14, 205, 150, '#ffe45c') + `<div style="position:relative;transform:rotate(-8deg)">${stroked('叮咚！', 'kw ext', '--sw:14px;--fc:#ff5fae;font-size:96px')}</div>`); css(s, { left: i % 2 ? '1400px' : '60px', top: '40px' }); s.t0 = c.t0; return s; });
    return (t) => {
      red.style.opacity = .6 + .4 * Math.sin(t * 6);
      const n = cards.filter(c => t >= c.t0).length;
      cards.forEach((c, i) => {
        vis(c, t >= c.t0); if (t < c.t0) return;
        const drop = E.outBounce(P(t, c.t0, c.t0 + .55)), depth = n - 1 - i;
        const dk = depth > 0 ? E.io(P(t, cards[i + depth].t0, cards[i + depth].t0 + .4)) + depth - 1 : 0;
        const jit = (t - cards[n - 1].t0) < .25 ? Math.sin(t * 120) * 6 : 0;
        c.style.transform = `translate3d(${jit}px,${(1 - drop) * -900 - dk * 120}px,${-dk * 260}px) rotateX(${dk * 8}deg) rotateZ(${(i % 2 ? 2 : -2) * (1 - drop * .5)}deg)`;
        c.style.filter = depth > 0 ? `brightness(${1 - dk * .12})` : (jit ? 'drop-shadow(6px 0 0 rgba(255,0,80,.6)) drop-shadow(-6px 0 0 rgba(0,220,255,.6))' : '');
      });
      dings.forEach(s => { vis(s, t >= s.t0 && t < s.t0 + .9); s.style.transform = `scale(${popS(t, s.t0, 0, 16, 6) * (1 - P(t, s.t0 + .65, s.t0 + .9)) * .8}) rotate(${Math.sin(t * 9) * 4}deg)`; });
    };
  });
  addFlash(162.25, 162.37, 162.7, .7);

  // ---------- BD 162.36–171.33: don't ask, don't compare (dark, whisper) ----------
  addScene(162.37, 171.34, (root) => {
    buildDesktop(root, '02:00', '12月9日', 'night');
    const dim = el('div', 'full', root); dim.style.background = 'rgba(10,6,30,.45)';
    const fb = win(root, { title: '意见反馈', w: 860, h: 420, x: 120, y: 220, theme: 'dark', html: `<div style="margin:24px 30px;height:150px;border:4px solid #6a4598;border-radius:14px;padding:16px 20px;font-size:34px;font-weight:700" id="q"></div><div class="row" style="margin:0 30px;gap:18px"><div style="width:150px;height:82px">${mascot(.3, 'zen')}</div><div class="bub ai" id="rep" style="position:relative;left:0;color:#2b1d4a;font-size:30px">资源有安排哦 ♡</div></div>` });
    const q = fb.querySelector('#q'), rep = fb.querySelector('#rep');
    const shh = sticker(root, '嘘～', { size: 90, fc: '#c9bdff', x: 820, y: 150 });
    const ROWS = [['额度', '有限', '∞'], ['速度', '排队中', '优先'], ['模型', '部分', '全部'], ['等待', '常有', '没有']];
    const tb = win(root, { title: 'Plus vs Pro 对比表', w: 860, h: 560, x: 960, y: 200, theme: 'gray', html: `<table style="margin:18px 26px;border-collapse:separate;border-spacing:0 10px;width:800px;font-size:34px;font-weight:900;text-align:center"><tr><td></td><td class="pl">Plus</td><td class="pr">Pro</td></tr>${ROWS.map(r => `<tr><td style="text-align:left">${r[0]}</td><td class="pl" style="background:#e6e6ef;border:4px solid #2b1d4a;border-radius:12px">${r[1]}</td><td class="pr" style="background:#fff3c8;border:4px solid #2b1d4a;border-radius:12px">${r[2]}</td></tr>`).join('')}</table>` });
    const pls = [...tb.querySelectorAll('.pl')], prs = [...tb.querySelectorAll('.pr')];
    const tapes = [[-12, 380], [9, 520]].map(([r, y]) => { const e = el('div', 'abs', root, '<div class="kw" style="width:1100px;height:84px;background:repeating-linear-gradient(-45deg,#ffe45c 0 40px,#2b1d4a 40px 80px);border:5px solid #2b1d4a;display:flex;align-items:center;justify-content:center;gap:90px;font-size:44px;color:#fff;-webkit-text-stroke:2px #2b1d4a"><span style="background:#2b1d4a;padding:0 14px">请勿比较</span><span style="background:#2b1d4a;padding:0 14px">请勿比较</span><span style="background:#2b1d4a;padding:0 14px">请勿比较</span></div>'); css(e, { left: '840px', top: y + 'px' }); e.r = r; return e; });
    const bling = [...Array(8)].map((_, i) => spk(root, 1500 + (i % 4) * 80, 300 + i * 50, 20, i % 2 ? '#fff' : '#ffe45c'));
    const QS = '为什么额度……';
    return (t) => {
      dim.style.opacity = .7 + .3 * Math.sin(t * .8);
      const typed = t < 163.8 ? typeText(QS, t, 162.6, 6) : QS.slice(0, Math.max(0, QS.length - Math.floor((t - 163.8) * 14)));
      q.textContent = typed + (Math.sin(t * 10) > 0 ? '▌' : '');
      vis(rep, t >= 164.4); rep.style.transform = `scale(${popS(t, 164.4, .3, 12, 7)})`;
      vis(shh, t >= 164.6 && t < 166.8); shh.style.transform = `scale(${popS(t, 164.6, 0)}) rotate(-6deg)`;
      fb.style.opacity = 1 - P(t, 166.5, 167.0) * .5;
      vis(tb, t >= 166.6); tb.style.transform = `scale(${popS(t, 166.6, .5, 12, 7)})`;
      tapes.forEach((e, i) => { const t0 = 167.1 + i * .35; vis(e, t >= t0); e.style.transform = `translateX(${(1 - E.outC(P(t, t0, t0 + .2))) * 1200}px) rotate(${e.r}deg)`; e.style.opacity = 1 - P(t, 168.6, 168.9); });
      const glow = P(t, 168.73, 169.2);
      prs.forEach(c => { c.style.boxShadow = glow ? `0 0 ${30 * glow}px ${10 * glow}px rgba(255,214,80,.9)` : ''; c.style.background = glow ? '#ffd23f' : '#fff3c8'; });
      pls.forEach(c => { c.style.opacity = 1 - glow * .55; });
      twinkle(bling, t, glow);
      // dive into the Pro sparkle -> final chorus
      const dive = E.inC(P(t, 170.3, 171.33));
      root.style.transform = `scale(${1 + dive * 3})`; root.style.transformOrigin = '1560px 420px';
    };
  });
  addFlash(170.9, 171.33, 171.75, 1);
})();
