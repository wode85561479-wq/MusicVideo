/* 额度合并 · 10s preview — every frame is a pure function of t (seconds, song time) */
(function () {
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
  heart: `<svg viewBox="0 0 100 100"><path d="M50 86C22 66 10 52 10 35a20 20 0 0 1 40-6 20 20 0 0 1 40 6c0 17-12 31-40 51z" fill="#ff5fae" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M26 34a10 10 0 0 1 10-9" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/></svg>`,
};
function starburst(n, r1, r2, fill, sw = 8) {
  let d = ''; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 : r1; d += (i ? 'L' : 'M') + (210 + Math.cos(a) * r).toFixed(1) + ' ' + (210 + Math.sin(a) * r).toFixed(1); }
  return `<svg viewBox="0 0 420 420"><path d="${d}Z" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
}
// 额度酱 — the quota-bar mascot
function mascot(fill = 1, mood = 'happy') {
  const w = Math.max(0, 174 * fill);
  const col = fill > .5 ? '#46e0bd' : fill > .22 ? '#ffe45c' : '#ff3b5c';
  const eyes = mood === 'happy'
    ? `<path d="M66 52q8-11 16 0M118 52q8-11 16 0" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>`
    : `<circle cx="74" cy="50" r="6" fill="${INK}"/><circle cx="126" cy="50" r="6" fill="${INK}"/><path d="M156 30q6 10 0 14q-6-4 0-14z" fill="#7fd3ff" stroke="${INK}" stroke-width="3"/>`;
  const mouth = mood === 'happy' ? `<path d="M88 64q12 13 24 0" stroke="${INK}" stroke-width="6" fill="#ff7a9c" stroke-linejoin="round"/>` : `<path d="M86 72q7-7 14 0t14 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 200 110"><rect x="6" y="14" width="188" height="82" rx="41" fill="#fff" stroke="${INK}" stroke-width="7"/>` +
    (w > 4 ? `<rect x="13" y="21" width="${w.toFixed(1)}" height="68" rx="34" fill="${col}"/>` : '') +
    `<ellipse cx="58" cy="68" rx="10" ry="6" fill="#ff9ad5" opacity=".9"/><ellipse cx="142" cy="68" rx="10" ry="6" fill="#ff9ad5" opacity=".9"/>${eyes}${mouth}</svg>`;
}
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
function wallpaper() {
  const id = 'wp' + (WPID++);
  return `<svg class="full" viewBox="0 0 1920 1080"><defs>
  <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc2e6"/><stop offset=".55" stop-color="#e2d4ff"/><stop offset="1" stop-color="#bde6ff"/></linearGradient>
  <pattern id="${id}dots" width="56" height="56" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="3.2" fill="#fff" opacity=".6"/><circle cx="36" cy="36" r="3.2" fill="#fff" opacity=".6"/></pattern></defs>
  <rect width="1920" height="1080" fill="url(#${id}sky)"/><rect width="1920" height="1080" fill="url(#${id}dots)"/>
  <g transform="translate(1530 280)"><circle r="160" fill="#ffd36e" opacity=".35"/><circle r="128" fill="#fff3a0" stroke="${INK}" stroke-width="8"/>
   <path d="M-52 -6q14-16 28 0M24 -6q14-16 28 0" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-22 30q22 20 44 0" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/>
   <ellipse cx="-70" cy="30" rx="18" ry="10" fill="#ff9ad5"/><ellipse cx="70" cy="30" rx="18" ry="10" fill="#ff9ad5"/></g>
  ${cloud(420, 210, 1.1)}${cloud(1080, 140, .8)}${cloud(1650, 560, .9)}${cloud(260, 640, .7)}
  <text x="980" y="640" text-anchor="middle" font-family="ZCOOL KuaiLe" font-size="230" fill="#fff" opacity=".45">叮咚OS</text>
  <path d="M0 880 Q 380 760 820 870 T 1920 850 V1080 H0z" fill="#b8f3df" stroke="${INK}" stroke-width="7"/>
  <path d="M0 960 Q 520 870 1100 950 T 1920 930 V1080 H0z" fill="#d6c9ff" stroke="${INK}" stroke-width="7"/>
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
function buildDesktop(parent, clock, date) {
  const d = el('div', 'full', parent);
  d.innerHTML = wallpaper();
  const icons = [['chat', 'ChatGPT'], ['code', 'Codex'], ['wallet', '我的钱包'], ['trash', '回收站'], ['doc', '额度说明.txt']];
  icons.forEach(([k, n], i) => { const ic = el('div', 'dicon', d, `${ICON[k]}<span>${n}</span>`); css(ic, { left: '40px', top: 40 + i * 162 + 'px' }); });
  const tb = el('div', 'taskbar', d, `<div class="start">♡ 开始</div><div class="task">${ICON.chat}ChatGPT</div><div class="task">${ICON.code}Codex</div>
   <div class="tray"><div class="batt">额度<div class="cell"><b style="width:86%"></b></div></div><div class="clock"><b>${clock}</b><small>${date}</small><div class="ring"></div></div></div>`);
  d.clockB = tb.querySelector('.clock b'); d.clockS = tb.querySelector('.clock small'); d.ring = tb.querySelector('.ring'); d.batt = tb.querySelector('.cell b');
  return d;
}
function dialogInner() {
  return `<div class="tb"><span>系统通知 ♡</span>${tbb()}</div>
  <div class="dbody"><div class="dav">${mascot(1, 'happy')}</div>
  <div><div class="d1 kw">亲爱的用户您好～</div><div class="d2">我们为您准备了一份<span class="hl">大惊喜</span>！</div></div></div>
  <div class="dbtns"><div class="btn b1">好的</div><div class="btn b2">好的</div></div>`;
}
function sky3D(parent) {
  const sky = el('div', 'full', parent);
  const sunW = el('div', 'abs', parent); css(sunW, { width: '560px', height: '280px', overflow: 'hidden' });
  const sun = el('div', 'abs', sunW); css(sun, { left: '0', top: '0', width: '560px', height: '560px', borderRadius: '50%', background: 'linear-gradient(180deg,#fff27a 0%,#ffb35c 35%,#ff5fae 75%)', WebkitMaskImage: 'linear-gradient(180deg,#000 0 44%,transparent 44% 47%,#000 47% 64%,transparent 64% 69%,#000 69% 80%,transparent 80% 87%,#000 87%)', boxShadow: '0 0 0 0 transparent' });
  const glowSun = el('div', 'abs', parent); css(glowSun, { width: '900px', height: '900px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,140,200,.55),rgba(255,140,200,0) 62%)' });
  const glow = el('div', 'abs', parent); css(glow, { left: '0', width: '1920px', height: '220px', background: 'linear-gradient(180deg,rgba(255,120,200,0),rgba(255,120,200,.55) 50%,rgba(255,120,200,0))' });
  const stars = el('canvas', 'full', parent); stars.width = 1920; stars.height = 1080;
  return { sky, sunW, glowSun, glow, stars };
}
function placeSky(s, hy, sx, t, seed) {
  s.sky.style.background = `linear-gradient(180deg,#140a3c 0px,#33156b ${hy - 380}px,#8e2f8f ${hy - 120}px,#ff8ac6 ${hy}px,#24104a ${hy}px,#140a30 1080px)`;
  css(s.sunW, { left: sx - 280 + 'px', top: hy - 280 + 'px' });
  css(s.glowSun, { left: sx - 450 + 'px', top: hy - 450 + 'px' });
  css(s.glow, { top: hy - 110 + 'px' });
  const g = s.stars.getContext('2d'); g.clearRect(0, 0, 1920, 1080);
  const r = rng(seed);
  for (let i = 0; i < 170; i++) {
    const x = r() * 1920, y = r() * Math.max(0, hy - 40), sz = r() < .1 ? 3.2 : 1.6 + r(), ph = r() * 6.28, sp = 2 + r() * 5;
    const a = .45 + .55 * (.5 + .5 * Math.sin(t * sp + ph));
    g.fillStyle = `rgba(255,240,255,${a})`;
    if (sz > 3) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-sz * 1.6, -1, sz * 3.2, 2); g.fillRect(-1, -sz * 1.6, 2, sz * 3.2); g.restore(); }
    g.beginPath(); g.arc(x, y, sz * .7, 0, 6.283); g.fill();
  }
}
function floor3D(parent, y, zc, depth) {
  // small element scaled up keeps the raster cheap
  const S = 5, w = 1600, h = depth / S;
  const f = el('div', 'abs', parent);
  css(f, { width: w + 'px', height: h + 'px', left: -w / 2 + 'px', top: -h / 2 + 'px', backgroundColor: '#1a0b3d',
    backgroundImage: 'linear-gradient(0deg,#ff4fd8 0 2px,transparent 2px),linear-gradient(90deg,#3ff0ff 0 2px,transparent 2px)', backgroundSize: '40px 40px',
    WebkitMaskImage: 'linear-gradient(180deg,transparent 0%,rgba(0,0,0,.35) 18%,#000 45%)', transform: `translate3d(0,${y}px,${zc}px) rotateX(90deg) scale(${S})` });
  return f;
}
// project a world point through a cam {rx,ry,dz} with perspective d
function project(x, y, z, cam, d = 1400) {
  const cy = Math.cos(cam.ry), sy = Math.sin(cam.ry);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  const cx = Math.cos(cam.rx), sx = Math.sin(cam.rx);
  const y2 = y * cx - z1 * sx; let z2 = y * sx + z1 * cx; z2 += cam.dz;
  const s = d / (d - z2); return { x: 960 + x1 * s, y: 540 + y2 * s, s };
}
function camCSS(c) { return `translateZ(${c.dz}px) rotateX(${c.rx / DEG}deg) rotateY(${c.ry / DEG}deg)`; }
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
const toast = el('div', '', desk, `<div class="bell">${ICON.bell}</div><div><h4>叮咚～ 新通知</h4><p>亲爱的用户您好 ♡</p></div>`); toast.id = 'toast';
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
const CUR = [[1.06, 1240, 1110], [1.5, 1290, 760], [1.85, 1600, 905], [2.3, 1600, 905], [2.62, 1215, 645], [2.86, 1215, 645], [DRAG0, DLGX + 330, DLGY + 28]];
function curAt(t) {
  if (t >= DRAG0) { const p = dragPos(Math.min(t, DRAG1)); return { x: p.x + 330, y: p.y + 28 }; }
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
const fine = el('div', 'gl', Ccam); css(fine, { fontSize: '27px', fontWeight: '900', color: '#fff', textShadow: '2px 2px 0 #2b1d4a' });
const FINE = '*本活动最终解释权归本公司所有';
// gift box
const gift = el('div', 'obj', Ccam);
const RIB = (bg) => `linear-gradient(90deg,transparent 42%,#ffe45c 42%,#ffe45c 58%,transparent 58%),${bg}`;
const giftBody = box(gift, 300, 240, 300, { front: { bg: RIB('#ff6fb8') }, back: { bg: RIB('#e0559c') }, right: { bg: RIB('#e85ea6') }, left: { bg: RIB('#f067ae') }, top: { bg: '#6a1f55' }, bottom: { bg: '#b84485' } });
const lid = el('div', 'obj', gift);
const lidBox = box(lid, 330, 64, 330, { front: { bg: RIB('#ff86c4') }, back: { bg: RIB('#e0559c') }, right: { bg: RIB('#e85ea6') }, left: { bg: RIB('#f574b8') }, top: { bg: 'linear-gradient(90deg,transparent 42%,#ffe45c 42% 58%,transparent 58%),linear-gradient(0deg,transparent 42%,#ffe45c 42% 58%,transparent 58%),#ff9ad0' }, bottom: { bg: '#b84485' } });
const bow = el('div', 'abs', lid, `<svg viewBox="0 0 200 110" width="200" height="110"><path d="M100 70C70 20 20 10 22 50s50 30 78 20z" fill="#ffe45c" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M100 70C130 20 180 10 178 50s-50 30-78 20z" fill="#ffe45c" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><circle cx="100" cy="68" r="16" fill="#ffd23f" stroke="${INK}" stroke-width="7"/></svg>`);
css(bow, { left: '-100px', top: '-140px', width: '200px', height: '110px' });
const rays = el('div', 'abs', gift); css(rays, { width: '1100px', height: '1100px', left: '-550px', top: '-550px', borderRadius: '50%', background: 'repeating-conic-gradient(from 0deg,rgba(255,250,200,.85) 0 7deg,rgba(255,250,200,0) 7deg 20deg)', WebkitMaskImage: 'radial-gradient(circle,#000 0,#000 18%,transparent 62%)' });
const flyA = el('div', 'abs', Ccam, ICON.chat), flyB = el('div', 'abs', Ccam, ICON.code);
[flyA, flyB].forEach(f => css(f, { width: '220px', height: '220px', left: '-110px', top: '-110px' }));
const Cconf = el('canvas', 'full', C); Cconf.width = 1920; Cconf.height = 1080;

// ======================= SCENE D: the merge =======================
const D = document.getElementById('D');
const Dshake = el('div', 'full', D);
const deskD = buildDesktop(Dshake, '00:01', '12月1日');
const Dconf = el('canvas', 'full', Dshake); Dconf.width = 1920; Dconf.height = 1080;
const Dworld = el('div', 'world', Dshake); Dworld.style.perspective = '1500px';
const Dburst = el('div', 'burst', Dworld, starburst(18, 205, 165, '#fff6b0', 6)); css(Dburst, { left: '750px', top: '260px' });
const appWin = (name, icon) => `<div class="tb"><span>${name}</span>${tbb()}</div><div class="abody"><div class="aicon">${icon}</div><div><div class="aname kw">${name}</div><div class="alabel">本月额度</div><div class="bar"><div class="fill" style="width:100%"></div><span class="pct">100%</span></div></div></div>`;
const wGPT = el('div', 'win appw', Dworld, appWin('ChatGPT', ICON.chat)); css(wGPT, { left: '210px', top: '250px' });
const wCdx = el('div', 'win appw', Dworld, appWin('Codex', ICON.code)); css(wCdx, { left: '1110px', top: '250px' });
const wM = el('div', 'win mergew', Dworld, `<div class="tb"><span>ChatGPT ♡ Codex · 共享额度</span>${tbb()}</div>
  <div class="mrow"><div class="ic">${ICON.chat}</div><div class="heart">${ICON.heart}</div><div class="ic">${ICON.code}</div></div>
  <div class="mlabel">本月共享额度（两边一起用）</div>
  <div class="mbar"><div class="fill"></div><div class="mface abs" style="width:120px;height:66px;top:2px"></div><span class="pct">100%</span></div>
  <div class="mnote">合并前 100% + 100%　→　合并后 <span style="color:#ff3b5c">100%</span></div><div class="mfine">* 额度用完可随时升级 Pro 继续畅聊 ♡</div><div id="mwarn">⚠ 额度即将耗尽</div>`);
css(wM, { left: '460px', top: '210px' });
const mFill = wM.querySelector('.mbar .fill'), mPct = wM.querySelector('.mbar .pct'), mFace = wM.querySelector('.mface'), mHeart = wM.querySelector('.heart'), mWarn = wM.querySelector('#mwarn');
const eq = el('div', 'abs', Dworld, stroked('1 + 1 = 1 ?!', 'kw ext', '--sw:16px;--fc:#ffe45c;font-size:120px')); css(eq, { left: '1120px', top: '34px' });
const cursorD = el('div', '', Dshake, ICON.cursor); cursorD.id = 'cursorD';

// ======================= captions =======================
const LYR = [[1.09, 4.30, '叮咚～亲爱的用户您好'], [4.37, 8.80, '十二月有个好消息要宣布咯'], [8.87, 13.6, 'ChatGPT 和 Codex 合并额度啦']];
const capRoot = document.getElementById('cap');
const capLines = LYR.map(([a, b, s]) => {
  const ln = el('div', 'line', capRoot);
  const chs = [...s].map(c => { const sp = el('span', 'ch', ln, stroked(c === ' ' ? ' ' : c)); return sp; });
  return { a, b, ln, chs };
});

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
  toast.style.transform = `translateX(${(1 - E.outBack(kt, 1.6)) * 560}px)`;
  bell.style.transform = `rotate(${Math.sin((t - 1.08) * 28) * 22 * Math.exp(-2.2 * Math.max(0, t - 1.08))}deg)`;
  // 叮咚 burst
  const kd = P(t, 1.08, 1.32), ko = P(t, 1.95, 2.18);
  vis(dd, t >= 1.08 && t < 2.18);
  css(dd, { left: '1350px', top: '470px', transform: `scale(${E.outBack(kd, 2.4) * (1 - E.inBack(ko))}) rotate(${L(-30, 6, E.outC(kd)) + Math.sin(t * 9) * 3}deg)` });
  // dialog
  const kp = P(t, 2.2, 2.55);
  vis(dlg, t >= 2.2);
  const p = t >= DRAG0 ? dragPos(Math.min(t, DRAG1)) : { x: DLGX, y: DLGY };
  css(dlg, { left: p.x + 'px', top: p.y + 'px', transform: `scale(${Math.max(.001, E.outBack(kp, 2.2))}) rotate(${L(-8, 0, E.outC(kp))}deg)` });
  // window trail (the classic "stuck dialog" glitch)
  trailEls.forEach((w, i) => { const ts = DRAG0 + i * STAMP; const on = t >= ts + STAMP; vis(w, on); if (on) { const q = dragPos(ts); css(w, { left: q.x + 'px', top: q.y + 'px' }); } });
  // tooltip
  const ktp = P(t, 2.62, 2.72);
  vis(tip, t >= 2.62 && t < 2.98);
  css(tip, { left: '1150px', top: '700px', transform: `scale(${E.outBack(ktp)})`, transformOrigin: '20% 0' });
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
  let dz = t < 4.95 ? L(160, 0, E.outC(P(t, 4.37, 4.95))) : t < 7.5 ? L(0, -60, P(t, 4.95, 7.5)) : L(-60, 420, E.inC(P(t, 7.5, 8.6)));
  return { rx: -4.5 * DEG, ry: ry * DEG, dz };
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
  const calY = L(1000, 50, E.outBack(kc, 1.3));
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
  gn.style.transform = `translate3d(400px,${-170 + Math.sin(t * 2.4) * 10}px,-120px) rotateY(${-20 + Math.sin(t * 1.7) * 14}deg) rotateX(${L(-70, 0, E.outC(kg)) + Math.sin(t * 2.1) * 5}deg) scale(${gs})`;
  vis(gnStar, t >= 6.68);
  gnStar.style.transform = `translate(300px,-150px) translateZ(4px) scale(${E.outBack(P(t, 6.68, 6.85))})`;
  const kg2 = P(t, 6.12, 6.45);
  vis(gn2, t >= 6.12);
  gn2.style.transform = `translate3d(420px,${30 + Math.sin(t * 2.4 + 1) * 8}px,-80px) rotateY(${-16 + Math.sin(t * 1.5 + 1) * 10}deg) scale(${Math.max(.001, spring(t - 6.12, 0, 13, 6))}) rotateZ(${L(14, -3, E.outC(kg2))}deg)`;
  const nf = Math.floor(P(t, 6.68, 7.15) * FINE.length);
  fine.textContent = FINE.slice(0, nf) + (nf < FINE.length && t > 6.68 && Math.sin(t * 30) > 0 ? '▌' : '');
  fine.style.transform = `translate3d(240px,150px,-80px) rotateY(${-16 + Math.sin(t * 1.5 + 1) * 10}deg)`;
  // gift drops, lid pops, apps fly out
  const kd = P(t, 7.23, 7.62);
  vis(gift, t >= 7.23);
  const gy = L(-1300, 210, E.outBounce(kd));
  const squash = t > 7.3 && t < 7.79 ? 1 + .12 * Math.exp(-14 * (t - 7.37)) * Math.sin((t - 7.37) * 40) : 1;
  gift.style.transform = `translate3d(0,${gy}px,250px) rotateY(${L(160, 24, E.outC(kd)) + Math.sin(t * 2) * 4}deg) scale3d(${2 - squash},${squash},${2 - squash})`;
  const kl = P(t, 7.79, 8.3);
  const pre = t < 7.79 ? Math.max(0, Math.sin((t - 7.6) * 60)) * 10 * P(t, 7.6, 7.79) : 0;
  lid.style.transform = `translate3d(${-kl * 420}px,${-152 - pre - E.outC(kl) * 520 + kl * kl * 260}px,${kl * 120}px) rotateZ(${-kl * 70}deg) rotateX(${kl * 40}deg)`;
  vis(rays, t >= 7.79);
  rays.style.transform = `translate3d(0,-130px,0) rotateY(${-L(160, 24, 1)}deg) rotate(${t * 40}deg) scale(${E.outBack(P(t, 7.79, 8.0))})`;
  rays.style.opacity = .9;
  const kf = E.inQ(P(t, 8.0, 8.58));
  vis(flyA, t >= 8.0); vis(flyB, t >= 8.0);
  flyA.style.transform = `translate3d(${-kf * 620}px,${L(90, -120, kf)}px,${L(250, 1250, kf)}px) rotateZ(${-kf * 300}deg) rotateY(${kf * 40}deg)`;
  flyB.style.transform = `translate3d(${kf * 620}px,${L(90, -60, kf)}px,${L(250, 1250, kf)}px) rotateZ(${kf * 300}deg) rotateY(${-kf * 40}deg)`;
  // confetti
  const g = Cconf.getContext('2d'); g.clearRect(0, 0, 1920, 1080);
  const c1 = project(-430, -200, -160, camC(5.0)); confetti(g, t, 5.0, c1.x, c1.y, 5, 110, 1.1);
  const c2 = project(0, 60, 250, camC(7.79)); confetti(g, t, 7.79, c2.x, c2.y, 9, 120, 1.25, true);
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
    const x = (1 - E.outBack(ke, 1.5)) * -1300 + kr * 420, ry = L(70, 0, E.outC(ke)) + kr * 28;
    wGPT.style.transform = `translate3d(${x}px,${bob}px,${kr * 140}px) rotateY(${ry}deg) rotateZ(${-kr * 4}deg)`;
    wCdx.style.transform = `translate3d(${-x}px,${-bob}px,${kr * 140}px) rotateY(${-ry}deg) rotateZ(${kr * 4}deg)`;
  } else {
    const dt = t - imp;
    const s = spring(dt, 1.35, 16, 7);
    wM.style.transform = `scale(${s}) rotateX(${8 * Math.exp(-7 * dt) * Math.sin(dt * 18)}deg) rotateY(${6 * Math.exp(-6 * dt) * Math.sin(dt * 14)}deg)`;
    Dburst.style.transform = `scale(${L(.4, 2.4, E.outC(P(t, imp, 9.8)))}) rotate(${dt * 60}deg)`;
    Dburst.style.opacity = 1 - P(t, 9.6, 9.8);
    const f = 1 - .94 * E.ioQ(P(t, 9.6, 9.85));
    const col = f > .5 ? '#46e0bd' : f > .22 ? '#ffe45c' : '#ff3b5c';
    css(mFill, { width: (f * 100).toFixed(2) + '%', background: `repeating-linear-gradient(-45deg,${col} 0 22px,rgba(255,255,255,.35) 22px 44px),${col}` });
    mPct.textContent = Math.round(f * 100) + '%';
    mFace.innerHTML = mascot(f, f > .45 ? 'happy' : 'sad');
    css(mFace, { left: Math.max(0, f * 808 - 128) + 'px', display: 'block' });
    mHeart.style.transform = `scale(${1 + .18 * Math.abs(Math.sin(t * 9))})`;
    vis(mWarn, t >= 9.72 && Math.sin(t * 40) > -.3);
    eq.style.transform = `scale(${E.outBack(P(t, 9.55, 9.72), 2.5)}) rotate(${-10 + Math.sin(t * 12) * 2}deg)`;
  }
  // cursor gives up
  css(cursorD, { transform: `translate(${L(1500, 1560, P(t, 8.6, 10))}px,${L(820, 860, P(t, 8.6, 10))}px)` });
  deskD.batt.style.width = (merged ? 86 * (1 - .9 * P(t, 9.6, 9.85)) : 86) + '%';
  deskD.batt.style.background = merged && t > 9.75 ? '#ff3b5c' : '';
  const g = Dconf.getContext('2d'); g.clearRect(0, 0, 1920, 1080);
  confetti(g, t, imp, 960, 300, 31, 110, 1.5, true);
}

function renderCaps(t) {
  capLines.forEach(({ a, b, ln, chs }) => {
    const on = t >= a - .02 && t < b;
    vis(ln, on); if (!on) return;
    const out = E.inQ(P(t, b - .18, b));
    ln.style.opacity = 1 - out; ln.style.transform = `translateY(${out * 40}px)`;
    chs.forEach((c, i) => {
      const ti = a + i * .045, k = P(t, ti, ti + .28);
      const s = t < ti ? 0 : spring(t - ti, 0, 16, 8);
      const wig = Math.sin(t * 6 + i * .8) * 3;
      c.style.transform = `translateY(${(1 - E.outC(k)) * 40 + wig}px) scale(${Math.max(0, s)}) rotate(${(1 - E.outC(k)) * (i % 2 ? 14 : -14)}deg)`;
    });
  });
}

window.renderAt = function (t) {
  vis(A, t < 1.09); vis(B, t >= 1.06 && t < 4.88); vis(C, t >= 4.36 && t < 8.6); vis(D, t >= 8.6);
  fade.style.opacity = 0;
  if (t < 1.09) renderA(t);
  if (t >= 1.06 && t < 4.88) renderB(t);
  if (t >= 4.36 && t < 8.6) renderC(t);
  if (t >= 8.6) renderD(t);
  renderCaps(t);
  flash.style.opacity = flashAt(t);
  // CRT switch-off at the end of the preview
  const k1 = P(t, 9.86, 9.94), k2 = P(t, 9.94, 10.0);
  if (t < 9.86) { all.style.transform = ''; all.style.filter = ''; all.style.opacity = 1; offline.style.opacity = 0; }
  else if (t < 9.94) { all.style.transform = `scale(${1 + k1 * .04},${Math.max(.004, 1 - E.inQ(k1))})`; all.style.filter = `brightness(${1 + k1 * 3})`; offline.style.opacity = 0; }
  else { all.style.opacity = 0; offline.style.opacity = 1; offline.style.transform = `scaleX(${Math.max(.002, 1 - E.outC(k2))}) scaleY(${1 - k2 * .5})`; }
};
window.preloadFonts = async function () {
  const txt = document.getElementById('stage').textContent + LYR.map(l => l[2]).join('') + FINE + '▌0123456789%⚠';
  await Promise.all([
    document.fonts.load('400 40px "ZCOOL KuaiLe"', txt),
    document.fonts.load('700 40px "Noto Sans SC"', txt),
    document.fonts.load('900 40px "Noto Sans SC"', txt),
    document.fonts.load('400 20px "Press Start 2P"', 'DECNOV0123456789%'),
    document.fonts.load('400 36px "VT323"', '0123456789:'),
  ]);
  await document.fonts.ready;
  return [...document.fonts].filter(f => f.status === 'loaded').length;
};
window.renderAt(0);
})();
