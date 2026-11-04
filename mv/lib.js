/* shared toolkit: utils, art, builders */
'use strict';
const INK = '#2b1d4a';

// ---------------- utils ----------------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t, a, b) => clamp((t - a) / (b - a));
const L = (a, b, k) => a + (b - a) * k;
const E = {
  inQ: k => k * k, outQ: k => 1 - (1 - k) * (1 - k),
  inC: k => k * k * k, outC: k => 1 - Math.pow(1 - k, 3),
  io: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  ioQ: k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2,
  inBack: (k, s = 1.7) => (s + 1) * k * k * k - s * k * k,
  outBack: (k, s = 1.9) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
  outBounce: k => { const n = 7.5625, d = 2.75;
    if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + .75;
    if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + .9375; return n * (k -= 2.625 / d) * k + .984375; },
};
// damped spring: value goes from `from` to 1 after time dt (seconds)
const spring = (dt, from, w = 15, z = 7) => dt <= 0 ? from : 1 + (from - 1) * Math.exp(-z * dt) * Math.cos(w * dt);
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
const css = (e, o) => { for (const k in o) e.style[k] = o[k]; return e; };
const vis = (e, v) => { e.style.display = v ? '' : 'none'; };
const stroked = (txt, cls = '', style = '') => `<span class="stk ${cls}" style="${style}"><span class="s">${txt}</span><span class="f">${txt}</span></span>`;
const DEG = Math.PI / 180;
const DPR = window.devicePixelRatio || 1;
function mkCanvas(parent) { const c = el('canvas', 'full', parent); c.width = 1920 * DPR; c.height = 1080 * DPR; return c; }
function ctx2d(c) { const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(DPR, 0, 0, DPR, 0, 0); return g; }
const WS = 0.84; // desktop windows are drawn a bit smaller to keep the frame airy
const BEAT0 = 1.08, BEAT = 0.5595; // ~107 BPM grid measured from the track
const beat = n => BEAT0 + n * BEAT;

// ---------------- art: SVG ----------------
const ICON = {
  chat: `<svg viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" rx="24" fill="#46e0bd" stroke="${INK}" stroke-width="6"/><path d="M26 26h48a10 10 0 0 1 10 10v24a10 10 0 0 1-10 10H50L33 83V70h-7a10 10 0 0 1-10-10V36a10 10 0 0 1 10-10z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><circle cx="36" cy="48" r="5" fill="${INK}"/><circle cx="50" cy="48" r="5" fill="${INK}"/><circle cx="64" cy="48" r="5" fill="${INK}"/></svg>`,
  code: `<svg viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" rx="24" fill="#3a2a66" stroke="${INK}" stroke-width="6"/><path d="M6 31h88" stroke="${INK}" stroke-width="5"/><circle cx="22" cy="18" r="4.5" fill="#ff5fae"/><circle cx="36" cy="18" r="4.5" fill="#ffe45c"/><circle cx="50" cy="18" r="4.5" fill="#46e0bd"/><path d="M24 46l16 13-16 13" fill="none" stroke="#46e0bd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 74h26" stroke="#ff9ad5" stroke-width="8" stroke-linecap="round"/></svg>`,
  wallet: `<svg viewBox="0 0 100 100"><path d="M16 30 L64 12 L74 30" fill="#ffe45c" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><rect x="10" y="28" width="80" height="60" rx="14" fill="#ffb84d" stroke="${INK}" stroke-width="6"/><rect x="58" y="47" width="34" height="22" rx="8" fill="#ffe45c" stroke="${INK}" stroke-width="5"/><path d="M73 63c-6-4-8-6-8-8.5a3.5 3.5 0 0 1 8-1 3.5 3.5 0 0 1 8 1c0 2.5-2 4.5-8 8.5z" fill="#ff5fae"/></svg>`,
  trash: `<svg viewBox="0 0 100 100"><path d="M24 34h52l-6 54H30z" fill="#c9bdff" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><rect x="16" y="22" width="68" height="12" rx="6" fill="#a99bff" stroke="${INK}" stroke-width="6"/><rect x="40" y="12" width="20" height="10" rx="4" fill="#a99bff" stroke="${INK}" stroke-width="5"/><path d="M40 46v30M50 46v30M60 46v30" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></svg>`,
  doc: `<svg viewBox="0 0 100 100"><path d="M22 8h40l18 18v66H22z" fill="#fff" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M62 8v18h18" fill="#ff9ad5" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M33 44h34M33 58h34M33 72h20" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></svg>`,
  bell: `<svg viewBox="0 0 100 100"><path d="M50 10a6 6 0 0 1 6 6v4c14 3 22 15 22 30v16l8 11H14l8-11V50c0-15 8-27 22-30v-4a6 6 0 0 1 6-6z" fill="#ffe45c" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><circle cx="50" cy="86" r="8" fill="#ffb84d" stroke="${INK}" stroke-width="5"/><path d="M32 46c2-8 7-13 13-15" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/></svg>`,
  cursor: `<svg viewBox="0 0 32 44" width="46" height="63"><path d="M3 3 L3 34 L10.5 27.5 L16 40 L22 37.5 L16.5 25.5 L28 25.5 Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></svg>`,
  crown: `<svg viewBox="0 0 100 100"><path d="M12 74 L16 30 L35 50 L50 18 L65 50 L84 30 L88 74Z" fill="#ffd23f" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><rect x="10" y="72" width="80" height="16" rx="5" fill="#ffb84d" stroke="${INK}" stroke-width="6"/><circle cx="50" cy="58" r="7" fill="#ff5fae" stroke="${INK}" stroke-width="4"/><circle cx="16" cy="28" r="6" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="50" cy="16" r="6" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="84" cy="28" r="6" fill="#fff" stroke="${INK}" stroke-width="4"/></svg>`,
  vip: `<svg viewBox="0 0 100 100"><path d="M8 24h30l8 9h46v53H8z" fill="#ffd23f" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M8 40h84" stroke="#ffb84d" stroke-width="5"/><rect x="35" y="52" width="30" height="24" rx="5" fill="#fff" stroke="${INK}" stroke-width="5"/><path d="M41 52v-6a9 9 0 0 1 18 0v6" fill="none" stroke="${INK}" stroke-width="5"/><circle cx="50" cy="63" r="3.5" fill="${INK}"/></svg>`,
  heart: `<svg viewBox="0 0 100 100"><path d="M50 86C22 66 10 52 10 35a20 20 0 0 1 40-6 20 20 0 0 1 40 6c0 17-12 31-40 51z" fill="#ff5fae" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M26 34a10 10 0 0 1 10-9" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/></svg>`,
};
function starburst(n, r1, r2, fill, sw = 8) {
  let d = ''; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 : r1; d += (i ? 'L' : 'M') + (210 + Math.cos(a) * r).toFixed(1) + ' ' + (210 + Math.sin(a) * r).toFixed(1); }
  return `<svg viewBox="0 0 420 420"><path d="${d}Z" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
}
// 额度酱 — the quota-bar mascot
function mascot(fill = 1, mood = 'happy', colOv, extra = '') {
  const w = Math.max(0, 174 * fill);
  const col = colOv || (fill > .5 ? '#46e0bd' : fill > .22 ? '#ffe45c' : '#ff3b5c');
  if (MOOD[mood]) { const m = MOOD[mood];
    return `<svg viewBox="0 0 200 110" overflow="visible"><rect x="6" y="14" width="188" height="82" rx="41" fill="#fff" stroke="${INK}" stroke-width="7"/>` + (w > 4 ? `<rect x="13" y="21" width="${w.toFixed(1)}" height="68" rx="34" fill="${col}"/>` : '') +
      `<ellipse cx="58" cy="68" rx="10" ry="6" fill="#ff9ad5" opacity=".9"/><ellipse cx="142" cy="68" rx="10" ry="6" fill="#ff9ad5" opacity=".9"/>${m}${extra}</svg>`; }
  const eyes = mood === 'cool'
    ? `<rect x="52" y="36" width="42" height="24" rx="10" fill="${INK}"/><rect x="106" y="36" width="42" height="24" rx="10" fill="${INK}"/><path d="M94 45h12" stroke="${INK}" stroke-width="5"/><path d="M60 42h12M114 42h12" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`
    : mood === 'happy'
    ? `<path d="M66 52q8-11 16 0M118 52q8-11 16 0" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>`
    : `<circle cx="74" cy="50" r="6" fill="${INK}"/><circle cx="126" cy="50" r="6" fill="${INK}"/><path d="M156 30q6 10 0 14q-6-4 0-14z" fill="#7fd3ff" stroke="${INK}" stroke-width="3"/>`;
  const mouth = mood === 'cool' ? `<path d="M88 68q14 10 28-4" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>` : mood === 'happy' ? `<path d="M88 64q12 13 24 0" stroke="${INK}" stroke-width="6" fill="#ff7a9c" stroke-linejoin="round"/>` : `<path d="M86 72q7-7 14 0t14 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 200 110"><rect x="6" y="14" width="188" height="82" rx="41" fill="#fff" stroke="${INK}" stroke-width="7"/>` +
    (w > 4 ? `<rect x="13" y="21" width="${w.toFixed(1)}" height="68" rx="34" fill="${col}"/>` : '') +
    `<ellipse cx="58" cy="68" rx="10" ry="6" fill="#ff9ad5" opacity=".9"/><ellipse cx="142" cy="68" rx="10" ry="6" fill="#ff9ad5" opacity=".9"/>${eyes}${mouth}</svg>`;
}
const MOOD = {
  cry: `<path d="M64 50q10 6 20 0M116 50q10 6 20 0" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M70 56v34M130 56v34" stroke="#7fd3ff" stroke-width="9" stroke-linecap="round"/><path d="M88 78q12-10 24 0" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M60 92l4-6 4 6-4 6zM136 96l4-6 4 6-4 6z" fill="#fff" stroke="${INK}" stroke-width="2"/>`,
  zen: `<path d="M64 52q10 5 20 0M116 52q10 5 20 0" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M92 70h16" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
  shock: `<circle cx="74" cy="48" r="9" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="126" cy="48" r="9" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="74" cy="48" r="3" fill="${INK}"/><circle cx="126" cy="48" r="3" fill="${INK}"/><ellipse cx="100" cy="74" rx="9" ry="11" fill="#ff7a9c" stroke="${INK}" stroke-width="5"/>`,
  love: `<path d="M74 58c-9-6-12-9-12-13a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 4-3 7-12 13zM126 58c-9-6-12-9-12-13a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 4-3 7-12 13z" fill="#ff5fae" stroke="${INK}" stroke-width="3"/><path d="M88 66q12 13 24 0" stroke="${INK}" stroke-width="6" fill="#ff7a9c" stroke-linejoin="round"/>`,
  smile: `<path d="M66 52q8-11 16 0M118 52q8-11 16 0" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M84 64q16 14 32 0z" stroke="${INK}" stroke-width="5" fill="#fff" stroke-linejoin="round"/><path d="M146 30l5 8 8 4-8 4-5 8-5-8-8-4 8-4z" fill="#fff" stroke="${INK}" stroke-width="2"/>`,
  dead: `<path d="M66 42l16 16M82 42l-16 16M118 42l16 16M134 42l-16 16" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M86 74q7-6 14 0t14 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
};
const GLASSES = `<circle cx="74" cy="50" r="15" fill="none" stroke="${INK}" stroke-width="4"/><circle cx="126" cy="50" r="15" fill="none" stroke="${INK}" stroke-width="4"/><path d="M89 50h22" stroke="${INK}" stroke-width="4"/>`;
const GRAYHAIR = `<path d="M40 22q20-26 60-18q40-8 60 18q-30-8-60-2q-30-6-60 2z" fill="#eeeef4" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
function cloud(x, y, s) {
  const c = [[0, 0, 58], [62, -30, 74], [140, -6, 62], [80, 22, 56], [-44, 20, 40], [186, 24, 40]];
  const st = c.map(([a, b, r]) => `<circle cx="${x + a * s}" cy="${y + b * s}" r="${r * s + 6}" fill="${INK}"/>`).join('');
  const fl = c.map(([a, b, r]) => `<circle cx="${x + a * s}" cy="${y + b * s}" r="${r * s}" fill="#fff"/>`).join('');
  return st + fl;
}
function sparkle(x, y, r, fill = '#fff') {
  return `<path d="M${x} ${y - r}Q${x + r * .18} ${y - r * .18} ${x + r} ${y}Q${x + r * .18} ${y + r * .18} ${x} ${y + r}Q${x - r * .18} ${y + r * .18} ${x - r} ${y}Q${x - r * .18} ${y - r * .18} ${x} ${y - r}Z" fill="${fill}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
}
let WPID = 0;
const WPT = {
  day: { sky: ['#ffc2e6', '#e2d4ff', '#bde6ff'], sun: '#fff3a0', h1: '#b8f3df', h2: '#d6c9ff', mark: .45, moon: false },
  night: { sky: ['#1b1045', '#3a1f6e', '#6a4598'], sun: '#fff6d6', h1: '#4b3a8a', h2: '#2f2466', mark: .12, moon: true },
  eco: { sky: ['#dff7c8', '#c9f0dc', '#b9e6ff'], sun: '#fff3a0', h1: '#8fe08a', h2: '#bfe9c3', mark: .45, moon: false },
  snow: { sky: ['#dfe7ff', '#efe3ff', '#ffe0ef'], sun: '#fff3a0', h1: '#ffffff', h2: '#e6efff', mark: .45, moon: false },
  gray: { sky: ['#d3d0de', '#c8c4d6', '#bcc2d0'], sun: '#e6e4ee', h1: '#b9bdca', h2: '#aaa7bd', mark: .3, moon: false },
};
function wallpaper(theme = 'day') {
  const id = 'wp' + (WPID++), W = WPT[theme];
  return `<svg class="full" viewBox="0 0 1920 1080"><defs>
  <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${W.sky[0]}"/><stop offset=".55" stop-color="${W.sky[1]}"/><stop offset="1" stop-color="${W.sky[2]}"/></linearGradient>
  <pattern id="${id}dots" width="56" height="56" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="3.2" fill="#fff" opacity=".6"/><circle cx="36" cy="36" r="3.2" fill="#fff" opacity=".6"/></pattern></defs>
  <rect width="1920" height="1080" fill="url(#${id}sky)"/><rect width="1920" height="1080" fill="url(#${id}dots)"/>
  <g transform="translate(1530 280)"><circle r="160" fill="${W.moon ? '#fff6d6' : '#ffd36e'}" opacity="${W.moon ? .15 : .35}"/><circle r="128" fill="${W.sun}" stroke="${INK}" stroke-width="8"/>
   <path d="M-52 -6q14-16 28 0M24 -6q14-16 28 0" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-22 30q22 20 44 0" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/>
   <ellipse cx="-70" cy="30" rx="18" ry="10" fill="#ff9ad5"/><ellipse cx="70" cy="30" rx="18" ry="10" fill="#ff9ad5"/></g>
  ${cloud(420, 210, 1.1)}${cloud(1080, 140, .8)}${cloud(1650, 560, .9)}${cloud(260, 640, .7)}
  <text x="980" y="640" text-anchor="middle" font-family="ZCOOL KuaiLe" font-size="230" fill="#fff" opacity="${W.mark}">叮咚OS</text>
  <path d="M0 880 Q 380 760 820 870 T 1920 850 V1080 H0z" fill="${W.h1}" stroke="${INK}" stroke-width="7"/>
  <path d="M0 960 Q 520 870 1100 950 T 1920 930 V1080 H0z" fill="${W.h2}" stroke="${INK}" stroke-width="7"/>
  ${sparkle(760, 120, 26)}${sparkle(1240, 420, 20, '#ffe45c')}${sparkle(300, 450, 18, '#ff9ad5')}${sparkle(1830, 120, 24)}${sparkle(1300, 760, 22, '#fff')}${sparkle(620, 770, 16, '#ffe45c')}
  </svg>`;
}

// ---------------- builders ----------------
function box(parent, w, h, d, c) {
  const o = el('div', 'obj', parent);
  const F = { front: [w, h, `translateZ(${d / 2}px)`], back: [w, h, `rotateY(180deg) translateZ(${d / 2}px)`], right: [d, h, `rotateY(90deg) translateZ(${w / 2}px)`], left: [d, h, `rotateY(-90deg) translateZ(${w / 2}px)`], top: [w, d, `rotateX(90deg) translateZ(${h / 2}px)`], bottom: [w, d, `rotateX(-90deg) translateZ(${h / 2}px)`] };
  o.faces = {};
  for (const k in F) {
    if (c[k] === false) continue;
    const [fw, fh, tr] = F[k]; const s = c[k] || {};
    const f = el('div', 'face ' + (s.cls || ''), o, s.html || '');
    css(f, { width: fw + 'px', height: fh + 'px', left: -fw / 2 + 'px', top: -fh / 2 + 'px', transform: tr, background: s.bg || c.bg || '#fff', borderRadius: (s.r || 0) + 'px' });
    o.faces[k] = f;
  }
  return o;
}
function coin(parent, size = 130, label = '额') {
  const o = el('div', 'obj', parent), n = 8;
  for (let i = n - 1; i >= 0; i--) {
    const face = i === 0 || i === n - 1;
    const d = el('div', 'coinL', o, face ? `<span>${label}</span>` : '');
    css(d, { width: size + 'px', height: size + 'px', left: -size / 2 + 'px', top: -size / 2 + 'px', transform: `translateZ(${(n / 2 - i) * 3.2}px)`, background: face ? 'radial-gradient(circle at 35% 30%,#fff7b8,#ffd23f 45%,#ffaa00)' : '#d48f00' });
  }
  return o;
}
function tbb() { return `<span class="tbb"><i>–</i><i>□</i><i class="x">×</i></span>`; }
function buildDesktop(parent, clock, date, theme) {
  const d = el('div', 'full', parent);
  d.innerHTML = wallpaper(theme);
  const icons = [['chat', 'ChatGPT'], ['code', 'Codex'], ['wallet', '我的钱包'], ['trash', '回收站'], ['vip', 'Pro 专区']];
  icons.forEach(([k, n], i) => { const ic = el('div', 'dicon', d, `${ICON[k]}<span>${n}</span>`); css(ic, { left: '40px', top: 40 + i * 162 + 'px' }); });
  const tb = el('div', 'taskbar', d, `<div class="start">♡ 开始</div><div class="task">${ICON.chat}ChatGPT</div><div class="task">${ICON.code}Codex</div>
   <div class="tray"><div class="tier">PLUS 会员</div><div class="batt">额度<div class="cell"><b style="width:86%"></b></div></div><div class="clock"><b>${clock}</b><small>${date}</small><div class="ring"></div></div></div>`);
  d.clockB = tb.querySelector('.clock b'); d.clockS = tb.querySelector('.clock small'); d.ring = tb.querySelector('.ring'); d.batt = tb.querySelector('.cell b');
  return d;
}
function dialogInner() {
  return `<div class="tb"><span>系统通知 ♡</span>${tbb()}</div>
  <div class="dbody"><div class="dav">${mascot(1, 'happy')}</div>
  <div><div class="d1 kw">亲爱的用户您好～</div><div class="d2">我们为您准备了一份<span class="hl">大惊喜</span>！</div></div></div>
  <div class="dbtns"><div class="btn b1">好的</div><div class="btn b2">好的</div></div>`;
}
function sky3D(parent, pal) {
  const sky = el('div', 'full', parent);
  const sunW = el('div', 'abs', parent); css(sunW, { width: '560px', height: '280px', overflow: 'hidden' });
  const sun = el('div', 'abs', sunW); css(sun, { left: '0', top: '0', width: '560px', height: '560px', borderRadius: '50%', background: 'linear-gradient(180deg,#fff27a 0%,#ffb35c 35%,#ff5fae 75%)', WebkitMaskImage: 'linear-gradient(180deg,#000 0 44%,transparent 44% 47%,#000 47% 64%,transparent 64% 69%,#000 69% 80%,transparent 80% 87%,#000 87%)', boxShadow: '0 0 0 0 transparent' });
  const glowSun = el('div', 'abs', parent); css(glowSun, { width: '900px', height: '900px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,140,200,.55),rgba(255,140,200,0) 62%)' });
  const glow = el('div', 'abs', parent); css(glow, { left: '0', width: '1920px', height: '220px', background: 'linear-gradient(180deg,rgba(255,120,200,0),rgba(255,120,200,.55) 50%,rgba(255,120,200,0))' });
  const stars = mkCanvas(parent);
  return { sky, sunW, sun, glowSun, glow, stars, pal: pal || SKY.night };
}
function placeSky(s, hy, sx, t, seed) {
  const p = s.pal;
  s.sky.style.background = `linear-gradient(180deg,${p[0]} 0px,${p[1]} ${hy - 380}px,${p[2]} ${hy - 120}px,${p[3]} ${hy}px,${p[4]} ${hy}px,${p[5]} 1080px)`;
  s.stars.style.opacity = p[6] == null ? 1 : p[6];
  css(s.sunW, { left: sx - 280 + 'px', top: hy - 280 + 'px' });
  css(s.glowSun, { left: sx - 450 + 'px', top: hy - 450 + 'px' });
  css(s.glow, { top: hy - 110 + 'px' });
  const g = ctx2d(s.stars);
  const r = rng(seed);
  for (let i = 0; i < 170; i++) {
    const x = r() * 1920, y = r() * Math.max(0, hy - 40), sz = r() < .1 ? 3.2 : 1.6 + r(), ph = r() * 6.28, sp = 2 + r() * 5;
    const a = .45 + .55 * (.5 + .5 * Math.sin(t * sp + ph));
    g.fillStyle = `rgba(255,240,255,${a})`;
    if (sz > 3) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-sz * 1.6, -1, sz * 3.2, 2); g.fillRect(-1, -sz * 1.6, 2, sz * 3.2); g.restore(); }
    g.beginPath(); g.arc(x, y, sz * .7, 0, 6.283); g.fill();
  }
}
const SKY = {
  night: ['#140a3c', '#33156b', '#8e2f8f', '#ff8ac6', '#24104a', '#140a30'],
  ocean: ['#1a1450', '#3b2a8a', '#c25aa8', '#ffb3cf', '#1c2a6b', '#0e1640', .7],
  gold: ['#ffe9a8', '#ffd1e8', '#ffc2dc', '#fff6c8', '#ffd98a', '#e8a94a', 0],
  gray: ['#4a4a5e', '#5d5d72', '#77778c', '#9a9aae', '#3a3a4a', '#2a2a36', 0],
  dawn: ['#2a1a5e', '#6a3a9a', '#e07ab0', '#ffd0a0', '#2a1650', '#140a30', .5],
  dream: ['#3a1f6e', '#8a5ab8', '#ff9ad5', '#ffe0ef', '#4a2a7e', '#24124a', .8],
};
const FLOOR = {
  grid: { bg: '#1a0b3d', img: 'linear-gradient(0deg,#ff4fd8 0 2px,transparent 2px),linear-gradient(90deg,#3ff0ff 0 2px,transparent 2px)' },
  ocean: { bg: '#1b2f7a', img: 'linear-gradient(0deg,#7fe8ff 0 2px,transparent 2px),linear-gradient(0deg,rgba(255,255,255,.18) 0 1px,transparent 1px)' },
  gold: { bg: '#f7c65a', img: 'linear-gradient(0deg,#fff3c0 0 2px,transparent 2px),linear-gradient(90deg,#fff3c0 0 2px,transparent 2px)' },
  gray: { bg: '#2c2c3a', img: 'linear-gradient(0deg,#7a7a90 0 2px,transparent 2px),linear-gradient(90deg,#7a7a90 0 2px,transparent 2px)' },
};
function floor3D(parent, y, zc, depth, style) {
  const fs = FLOOR[style || 'grid'];
  // small element scaled up keeps the raster cheap
  const S = 5, w = 1600, h = depth / S;
  const f = el('div', 'abs', parent);
  css(f, { width: w + 'px', height: h + 'px', left: -w / 2 + 'px', top: -h / 2 + 'px', backgroundColor: fs.bg,
    backgroundImage: fs.img, backgroundSize: style === 'ocean' ? '40px 40px, 40px 13px' : '40px 40px',
    WebkitMaskImage: 'linear-gradient(180deg,transparent 0%,rgba(0,0,0,.35) 18%,#000 45%)', transform: `translate3d(0,${y}px,${zc}px) rotateX(90deg) scale(${S})` });
  return f;
}
// project a world point through a cam {rx,ry,dz} with perspective d
function project(x, y, z, cam, d = 1400) {
  const cy = Math.cos(cam.ry), sy = Math.sin(cam.ry);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  const cx = Math.cos(cam.rx), sx = Math.sin(cam.rx);
  const y2 = y * cx - z1 * sx + (cam.dy || 0); let z2 = y * sx + z1 * cx; z2 += cam.dz;
  const s = d / (d - z2); return { x: 960 + x1 * s, y: 540 + y2 * s, s };
}
function camCSS(c) { return `translateZ(${c.dz}px) translateY(${c.dy || 0}px) rotateX(${c.rx / DEG}deg) rotateY(${c.ry / DEG}deg)`; }
function horizon(c) { const p = project(0, 0, -1e6, c); return p; }

// confetti (deterministic, screen-space with fake depth)
const PAL = ['#ff5fae', '#ffe45c', '#46e0bd', '#a99bff', '#7fd3ff', '#ffffff', '#ffb84d'];
function confetti(g, t, t0, ox, oy, seed, n = 90, power = 1, hearts = false) {
  const dt = t - t0; if (dt < 0 || dt > 2.2) return;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - .5) * 2.4, sp = (500 + r() * 900) * power, depth = .55 + r() * .9;
    const col = PAL[(r() * PAL.length) | 0], spin = (r() - .5) * 26, flip = 6 + r() * 12, ph = r() * 6.28, shape = r();
    const k = 2.2, dr = (1 - Math.exp(-k * dt)) / k;
    const x = ox + Math.cos(a) * sp * dr * depth + Math.sin(dt * 5 + ph) * 18 * dt;
    const y = oy + Math.sin(a) * sp * dr * depth + 420 * dt * dt * depth;
    const alpha = clamp(1.6 - dt * .8);
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(ph + spin * dt); g.scale(depth, depth);
    g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 3;
    if (hearts && shape < .55) {
      g.scale(1.3, 1.3); g.beginPath(); g.moveTo(0, 8); g.bezierCurveTo(-14, -2, -10, -14, 0, -6); g.bezierCurveTo(10, -14, 14, -2, 0, 8); g.fill(); g.stroke();
    } else if (shape < .7) {
      const sy = Math.abs(Math.cos(dt * flip + ph)); g.fillRect(-9, -13 * sy, 18, 26 * sy); g.strokeRect(-9, -13 * sy, 18, 26 * sy);
    } else if (shape < .88) {
      g.beginPath(); g.arc(0, 0, 8, 0, 6.283); g.fill(); g.stroke();
    } else {
      g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? 6 : 15, aa = j / 8 * 6.283; g.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
  }
}


// ---------------- toolkit for the full MV ----------------
function mkCursor(parent) { const c = el('div', 'cur', parent, ICON.cursor); return c; }
function popS(t, t0, from = 0, w = 15, z = 7) { return t < t0 ? .001 : Math.max(.001, spring(t - t0, from, w, z)); }
function win(parent, o) {
  const w = el('div', 'win ' + (o.cls || '') + (o.theme ? ' th-' + o.theme : ''), parent, `<div class="tb"><span>${o.title}</span>${tbb()}</div><div class="wbody">${o.html || ''}</div>`);
  css(w, { width: o.w + 'px', height: o.h + 'px', left: (o.x || 0) + 'px', top: (o.y || 0) + 'px' });
  return w;
}
function sticker(parent, txt, o = {}) {
  const s = el('div', 'abs stkr', parent, stroked(txt, 'kw' + (o.flat ? '' : ' ext'), `--sw:${o.sw || 14}px;--fc:${o.fc || '#ffe45c'};font-size:${o.size || 100}px`));
  css(s, { left: (o.x || 0) + 'px', top: (o.y || 0) + 'px' });
  return s;
}
function barHTML(cls = '') { return `<div class="bar ${cls}"><div class="fill"></div><span class="pct">100%</span></div>`; }
function setBar(b, f, col) {
  const fill = b.querySelector('.fill'), pct = b.querySelector('.pct');
  col = col || (f > .5 ? '#46e0bd' : f > .22 ? '#ffe45c' : '#ff3b5c');
  fill.style.width = (clamp(f) * 100).toFixed(2) + '%';
  fill.style.background = `repeating-linear-gradient(-45deg,${col} 0 18px,rgba(255,255,255,.35) 18px 36px),${col}`;
  fill.style.display = f <= 0.003 ? 'none' : '';
  if (pct) pct.textContent = Math.round(clamp(f) * 100) + '%';
}
function spk(parent, x, y, r, col = '#fff') { const e = el('div', 'abs', parent, `<svg viewBox="-40 -40 80 80" width="80" height="80">${sparkle(0, 0, r, col)}</svg>`); css(e, { left: x - 40 + 'px', top: y - 40 + 'px' }); return e; }
function twinkle(arr, t, on = 1) { arr.forEach((e, i) => { e.style.transform = `scale(${on * (.5 + .5 * Math.abs(Math.sin(t * 4 + i * 1.7)))}) rotate(${t * 40 + i * 30}deg)`; }); }
function world3D(parent, o = {}) {
  const sky = sky3D(parent, o.pal);
  if (o.noSun) { sky.sunW.style.display = 'none'; sky.glowSun.style.display = 'none'; }
  const world = el('div', 'world', parent), cam = el('div', 'cam', world);
  const floor = o.floor === false ? null : floor3D(cam, o.fy == null ? 330 : o.fy, -2050, 5900, o.floor || 'grid');
  return { sky, world, cam, floor, place(t, c) {
    cam.style.transform = camCSS(c); const h = horizon(c); placeSky(sky, h.y, h.x, t, o.seed || 1);
    if (floor) floor.style.backgroundPosition = o.floor === 'ocean' ? `${Math.sin(t) * 10}px ${(t * (o.speed || 40)) % 40}px, 0 ${(t * 60) % 13}px` : `0 ${(t * (o.speed || 40)) % 40}px`;
  } };
}
function obj(parent, html, w, h, cls = '') { const o = el('div', 'obj', parent); const e = el('div', 'abs ' + cls, o, html); css(e, { width: w + 'px', height: h + 'px', left: -w / 2 + 'px', top: -h / 2 + 'px' }); o.inner = e; return o; }
const tr3 = (x, y, z, ry = 0, rx = 0, rz = 0, s = 1) => `translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${s})`;
function typeText(str, t, t0, cps) { const n = Math.floor(clamp((t - t0) * cps, 0, str.length)); return str.slice(0, n); }
