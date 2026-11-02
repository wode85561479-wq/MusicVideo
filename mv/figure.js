'use strict';
// =====================================================================
// Character system: shaded, clothed figures built from a skeleton.
// Pose space: units of body height, origin at feet, y up, +x = facing.
// =====================================================================
const D2R = Math.PI / 180;
const dirv = (th) => [Math.sin(th), -Math.cos(th)]; // angle from straight-down, +forward
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const rot2 = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
function bump(p, c, w) { const d = ((p - c) % 1 + 1.5) % 1 - 0.5; return Math.exp(-(d / w) * (d / w)); }

const LT = 0.235, LS = 0.228, LUA = 0.165, LFA = 0.14, SPINE = 0.30;

// ---------- path helpers ----------
function orientPts(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a < 0 ? pts.slice().reverse() : pts; }
function smoothInto(path, pts) {
  pts = orientPts(pts); const n = pts.length; const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const s = m(pts[n - 1], pts[0]); path.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = m(p, pts[(i + 1) % n]); path.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
  path.closePath();
}
function ellInto(path, x, y, rx, ry, r = 0) { path.moveTo(x + rx * Math.cos(r), y + rx * Math.sin(r)); path.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), r, 0, TAU); }

// chain outline: samples [{p:[x,y](screen), f, b}] ; sgn picks which screen normal is "front"
function chainPts(S, sgn) {
  const L = [], R = [];
  for (let i = 0; i < S.length; i++) {
    const a = S[Math.max(0, i - 1)].p, b = S[Math.min(S.length - 1, i + 1)].p;
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const nx = -dy * sgn, ny = dx * sgn;
    L.push([S[i].p[0] + nx * S[i].f, S[i].p[1] + ny * S[i].f]);
    R.push([S[i].p[0] - nx * S[i].b, S[i].p[1] - ny * S[i].b]);
  }
  const e = S[S.length - 1], s0 = S[0];
  const ed = [e.p[0] - S[S.length - 2].p[0], e.p[1] - S[S.length - 2].p[1]]; const el = Math.hypot(ed[0], ed[1]) || 1;
  const sd = [s0.p[0] - S[1].p[0], s0.p[1] - S[1].p[1]]; const sl = Math.hypot(sd[0], sd[1]) || 1;
  const endP = [e.p[0] + ed[0] / el * (e.f + e.b) * 0.35, e.p[1] + ed[1] / el * (e.f + e.b) * 0.35];
  const startP = [s0.p[0] + sd[0] / sl * (s0.f + s0.b) * 0.35, s0.p[1] + sd[1] / sl * (s0.f + s0.b) * 0.35];
  return L.concat([endP], R.reverse(), [startP]);
}

// ---------- outfits ----------
const OUTFITS = {
  protHome: { top: '#8e959f', pants: '#2c3039', shoes: '#d8d4cc', skin: '#d9b39a', hair: '#1c1714' },
  protOut: { coat: '#3d424b', collar: '#4a505a', top: '#cfc8bb', pants: '#24262c', shoes: '#e9e6df', sole: '#f6f4ef', skin: '#d9b39a', hair: '#1c1714', pack: '#2b2d31', packStrap: '#1e1f22' },
  protOffice: { top: '#b7c4d4', pants: '#2b2f38', shoes: '#2a2624', sole: '#3b3633', skin: '#d9b39a', hair: '#1c1714', belt: '#1e1d1c' },
};
const CROWD_COATS = ['#2b2e35', '#3d424b', '#22252c', '#4b4f56', '#6b6157', '#8a7360', '#3a4250', '#4a4d42', '#5a5f68', '#1d1e22', '#7d8288', '#6d5a4a', '#2f3a48', '#9a8f80'];
const CROWD_PANTS = ['#1f2126', '#2a2d33', '#33363c', '#24272f', '#3e3a36', '#4a4e57', '#2b3140'];
const SKINS = ['#e0bda4', '#d6ae94', '#caa085', '#e6c6af', '#c79a7e', '#d9b39a'];
const HAIRS = ['#15110f', '#1c1714', '#241b16', '#2e221b', '#120f0e', '#3a2b22'];
function randOutfit(r) {
  const pick = a => a[Math.floor(r() * a.length)];
  const coat = pick(CROWD_COATS);
  return { coat: r() < 0.82 ? coat : null, collar: coat, top: pick(['#cfc8bb', '#e2dfd8', '#9aa3ad', '#3a3d44', '#b9a891']), pants: pick(CROWD_PANTS), shoes: pick(['#1c1b1a', '#e9e6df', '#2b2826', '#5a4a3c']), sole: '#d8d4cc', skin: pick(SKINS), hair: pick(HAIRS), pack: r() < 0.32 ? pick(['#2b2d31', '#3a3f46', '#4f4a44', '#1d2026']) : null, packStrap: '#1a1b1e', bag: r() < 0.2 ? pick(['#3a2e26', '#1d1d1f', '#6b5644']) : null };
}

// ---------- joints ----------
function gait(p) {
  return {
    hip: (7 + 19 * Math.cos(TAU * (p - 0.88))) * D2R,
    knee: (4 + 13 * bump(p, 0.13, 0.07) + 58 * bump(p, 0.72, 0.11)) * D2R,
    foot: (9 * bump(p, 0.0, 0.05) - 30 * bump(p, 0.6, 0.07) + 5 * bump(p, 0.86, 0.06)) * D2R,
  };
}
const SOLE = [[-0.032, -0.042], [0.104, -0.042]];
function sideJoints(o) {
  const pose = o.pose || 'stand';
  let lean = o.lean ?? 0.05, hd = o.headDown ?? 0.1;
  let legs, arms, hip;
  if (pose === 'walk' || pose === 'stand' || pose === 'strap' || pose === 'phone') {
    const p = o.ph || 0;
    legs = [0, 1].map(k => {
      let th, kn, ft;
      if (pose === 'walk') { const G = gait(p + k * 0.5); th = G.hip; kn = G.knee; ft = G.foot; }
      else { th = k ? -0.06 : 0.07; kn = 0.04; ft = 0; }
      const knee = add([0, 0], dirv(th), LT), ankle = add(knee, dirv(th - kn), LS);
      return { knee, ankle, foot: ft };
    });
    let minY = 9;
    for (const l of legs) for (const s of SOLE) { const q = rot2(s, l.foot); minY = Math.min(minY, l.ankle[1] + q[1]); }
    hip = [0, -minY];
    legs.forEach(l => { l.knee = add(l.knee, hip); l.ankle = add(l.ankle, hip); });
    if (pose === 'walk') {
      arms = [0, 1].map(k => { const G = gait(p + k * 0.5); const ua = -(G.hip - 7 * D2R) * 0.62; return { ua, fa: ua + (14 + 16 * Math.max(0, ua / 0.2)) * D2R }; });
      lean = o.lean ?? 0.06;
    } else if (pose === 'strap') { arms = [{ ua: Math.PI - 0.38, fa: Math.PI - 0.12 }, { ua: 0.06, fa: 0.16 }]; hd = o.headDown ?? 0.35; }
    else if (pose === 'phone') { arms = [{ ua: 0.12, fa: 2.35 }, { ua: 0.18, fa: 2.15 }]; hd = o.headDown ?? 0.55; }
    else arms = [{ ua: 0.05, fa: 0.14 }, { ua: -0.04, fa: 0.06 }];
  } else if (pose === 'sit') {
    hip = [0, 0.27];
    legs = [{ knee: [0.232, 0.285], ankle: [0.262, 0.045], foot: 0 }, { knee: [0.222, 0.28], ankle: [0.228, 0.045], foot: 0 }];
    lean = o.lean ?? 0.5; hd = o.headDown ?? 0.45;
    arms = [{ ua: 0.36, fa: 0.92 }, { ua: 0.3, fa: 1.0 }];
  } else if (pose === 'desk') {
    hip = [0, 0.27];
    legs = [{ knee: [0.232, 0.275], ankle: [0.25, 0.045], foot: 0 }, { knee: [0.228, 0.27], ankle: [0.2, 0.045], foot: 0 }];
    lean = o.lean ?? 0.12; hd = o.headDown ?? 0.15;
    arms = [{ ua: 0.42, fa: 1.5 }, { ua: 0.38, fa: 1.45 }];
  } else if (pose === 'ledge') {
    hip = [0, 0.03];
    const k1 = add(hip, dirv(2.5), LT), a1 = add(k1, dirv(0.55), LS);
    const k2 = add(hip, dirv(2.32), LT), a2 = add(k2, dirv(0.42), LS);
    legs = [{ knee: k1, ankle: a1, foot: 0.25 }, { knee: k2, ankle: a2, foot: 0.15 }];
    lean = o.lean ?? -0.2; hd = o.headDown ?? -0.08;
    arms = [{ ua: 0.5, fa: 2.25 }, { ua: 0.46, fa: 2.0 }];
  }
  if (o.arms) arms = o.arms;
  const u = [Math.sin(lean), Math.cos(lean)], fr = [u[1], -u[0]];
  const neck = add(hip, u, SPINE);
  const sho = add(add(hip, u, SPINE * 0.9), fr, -0.012);
  const ha = lean + hd;
  const head = add(add(neck, u, 0.012), [Math.sin(ha), Math.cos(ha)], 0.07);
  return {
    hip, neck, sho, head, u, fr, lean, hd, ha,
    legs: legs.map(l => ({ ...l, foot: l.foot || 0 })),
    arms: arms.map(a => { const elb = add(sho, dirv(a.ua), LUA), wri = add(elb, dirv(a.fa), LFA); return { elb, wri, fa: a.fa, ua: a.ua }; }),
  };
}

// ---------- scratch buffers ----------
const FB = { c: null, t: null };
function fbuf(w, h) {
  w = Math.ceil(w); h = Math.ceil(h);
  if (!FB.c || FB.c.width < w || FB.c.height < h) {
    const nw = Math.max(w, FB.c ? FB.c.width : 0), nh = Math.max(h, FB.c ? FB.c.height : 0);
    FB.c = mk(nw, nh); FB.t = mk(nw, nh); FB.g = FB.c.getContext('2d'); FB.tg = FB.t.getContext('2d');
  }
  for (const k of ['g', 'tg']) { const q = FB[k]; q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'source-over'; q.globalAlpha = 1; q.filter = 'none'; q.clearRect(0, 0, w + 2, h + 2); }
  return FB;
}

// ---------- main draw ----------
const DEFAULT_LIGHT = { amb: [150, 160, 185], key: [255, 240, 220], keyA: 0.25, dir: [1, -0.3], rim: [200, 215, 255], rimA: 0.6, rimW: 0.012, shadowA: 0.35 };
function drawFigure(g, o) {
  const h = o.h, fx = o.facing ?? 1;
  const OF = o.outfit || OUTFITS.protOut;
  const Lg = Object.assign({}, DEFAULT_LIGHT, o.light || {});
  const pad = Math.ceil(h * 0.06);
  const bx = o.x - h * 0.62, by = o.y - h * 1.32, bw = h * 1.24, bh = h * 1.38;
  const BW = Math.ceil(bw + pad * 2), BH = Math.ceil(bh + pad * 2);
  const B = fbuf(BW, BH), fg = B.g;
  const ox = -bx + pad, oy = -by + pad;
  const X = (p) => o.x + ox + p[0] * h * fx, Y = (p) => o.y + oy - p[1] * h;
  const S = (p) => [X(p), Y(p)];
  const R = (v) => v * h;
  const sgn = fx;
  const union = new Path2D();
  const info = {};
  const parts = [];
  const part = (col, build, shade = 1) => { const p = new Path2D(); build(p); union.addPath(p); parts.push([p, col, shade]); return p; };
  const lines = [];
  const detail = o.detail ?? (h > 140);
  const mid = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];

  if (o.view === 'back') {
    const walk = o.pose === 'walk', p = o.ph || 0;
    const bwm = o.bw || 1;
    const legInfo = [0, 1].map(k => { if (!walk) return { lift: 0, sw: 7 * D2R }; const G = gait(p + k * 0.5); return { lift: Math.max(0, Math.sin(G.knee) * 0.07 - 0.004), sw: G.hip }; });
    const bob = walk ? (Math.cos(TAU * 2 * p) * 0.006) : 0, sway = walk ? 0.007 * Math.sin(TAU * p) : 0;
    const P = (x, y) => S([x * bwm + sway, y + bob]);
    const hd = o.headDown ?? 0;
    [-1, 1].forEach((s, k) => {
      const L = legInfo[k];
      const hipP = P(s * 0.05, 0.5), kneeP = P(s * 0.047, 0.275 + L.lift * 0.45), ank = S([s * 0.045 * bwm + sway, 0.045 + L.lift]);
      const samples = [{ p: hipP, f: R(0.06 * bwm), b: R(0.06 * bwm) }, { p: mid(hipP, kneeP, 0.5), f: R(0.053 * bwm), b: R(0.053 * bwm) }, { p: kneeP, f: R(0.043 * bwm), b: R(0.043 * bwm) }, { p: mid(kneeP, ank, 0.4), f: R(0.042 * bwm), b: R(0.042 * bwm) }, { p: ank, f: R(0.036 * bwm), b: R(0.036 * bwm) }];
      part(OF.pants, pp => smoothInto(pp, chainPts(samples, 1)), 0.92);
      const sh = 0.04 - L.lift * 0.25;
      part(OF.shoes, pp => { pp.moveTo(ank[0] - R(0.032 * bwm), ank[1]); pp.roundRect(ank[0] - R(0.032 * bwm), ank[1] - R(0.006), R(0.064 * bwm), R(sh + 0.006), R(0.014)); });
      if (OF.sole) part(OF.sole, pp => { pp.moveTo(ank[0], ank[1]); pp.rect(ank[0] - R(0.031 * bwm), ank[1] + R(sh - 0.008), R(0.062 * bwm), R(0.008)); });
    });
    const coat = !!OF.coat;
    const hem = coat ? (o.coatLen ?? 0.3) : 0.46;
    const side = coat ? [[0.112, hem], [0.104, 0.42], [0.096, 0.56], [0.102, 0.68], [0.118, 0.765], [0.106, 0.818], [0.048, 0.84]]
      : [[0.098, hem], [0.092, 0.55], [0.088, 0.62], [0.103, 0.71], [0.116, 0.78], [0.1, 0.822], [0.045, 0.838]];
    const tor = side.map(([x, y]) => P(x, y)).concat(side.slice().reverse().map(([x, y]) => P(-x, y)));
    part(coat ? OF.coat : OF.top, pp => smoothInto(pp, tor));
    if (!coat && OF.belt) part(OF.belt, pp => { const a = P(-0.094, 0.5), b = P(0.094, 0.485); pp.moveTo(a[0], a[1]); pp.rect(a[0], b[1], b[0] - a[0], a[1] - b[1]); });
    if (detail) {
      const sp = new Path2D(); const a = P(0, 0.82), b = P(0, hem + 0.01); sp.moveTo(a[0], a[1]); sp.lineTo(b[0], b[1]);
      if (coat) { const c1 = P(-0.07, 0.72), c2 = P(0.07, 0.72), cm = P(0, 0.70); sp.moveTo(c1[0], c1[1]); sp.quadraticCurveTo(cm[0], cm[1], c2[0], c2[1]); }
      lines.push([sp, 'rgba(0,0,0,0.2)', R(0.004)]);
    }
    part(OF.collar || OF.coat || OF.top, pp => smoothInto(pp, [P(-0.055, 0.835), P(-0.04, 0.868), P(0.04, 0.868), P(0.055, 0.835), P(0, 0.826)]), 1.05);
    if (OF.pack) {
      const a = P(-0.092, 0.555), b = P(0.092, 0.79);
      part(OF.pack, pp => { pp.moveTo(a[0], b[1]); pp.roundRect(Math.min(a[0], b[0]), b[1], Math.abs(b[0] - a[0]), a[1] - b[1], R(0.032)); });
      if (detail) {
        const t1 = P(-0.03, 0.79), t2 = P(0.03, 0.79), tm = P(0, 0.815);
        const sp = new Path2D(); sp.moveTo(t1[0], t1[1]); sp.quadraticCurveTo(tm[0], tm[1], t2[0], t2[1]);
        const z1 = P(-0.07, 0.6), z2 = P(0.07, 0.6); sp.moveTo(z1[0], z1[1]); sp.lineTo(z2[0], z2[1]);
        lines.push([sp, 'rgba(0,0,0,0.35)', R(0.005)]);
        const st = new Path2D(); const s1 = P(-0.082, 0.79), s2 = P(-0.096, 0.822), s3 = P(0.082, 0.79), s4 = P(0.096, 0.822);
        st.moveTo(s1[0], s1[1]); st.lineTo(s2[0], s2[1]); st.moveTo(s3[0], s3[1]); st.lineTo(s4[0], s4[1]);
        lines.push([st, OF.packStrap || '#111', R(0.016)]);
      }
    }
    if (OF.bag) {
      const a = P(-0.16, 0.4), b = P(-0.08, 0.52);
      part(OF.bag, pp => smoothInto(pp, [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]]));
      const st = new Path2D(); const s1 = P(0.1, 0.81), s2 = P(-0.13, 0.52); st.moveTo(s1[0], s1[1]); st.lineTo(s2[0], s2[1]); lines.push([st, 'rgba(10,10,12,0.9)', R(0.008)]);
    }
    [-1, 1].forEach((s, k) => {
      const sw = walk ? -(legInfo[k].sw - 7 * D2R) * 0.62 : 0;
      let sh = P(s * 0.106, 0.785), el = P(s * 0.124, 0.635 - Math.abs(sw) * 0.03), wr = P(s * (0.118 - 0.01 * sw), 0.505 + sw * 0.06);
      const ph = o.phoneArm && s === 1;
      if (ph) { el = P(0.11, 0.63); wr = P(0.045, 0.665); info.phone = wr; }
      const samples = [{ p: sh, f: R(0.043), b: R(0.043) }, { p: el, f: R(0.034), b: R(0.034) }, { p: wr, f: R(0.028), b: R(0.028) }];
      part(OF.coat || OF.top, pp => smoothInto(pp, chainPts(samples, 1)), 0.96);
      if (!ph) part(OF.skin, pp => ellInto(pp, wr[0], wr[1] + R(0.034), R(0.019), R(0.034)), 0.95);
    });
    const hc = P(0, 0.928 - hd * 0.02);
    part(OF.skin, pp => { const a = P(-0.026, 0.84), b = P(0.026, 0.9); pp.moveTo(a[0], b[1]); pp.rect(a[0], b[1], b[0] - a[0], a[1] - b[1]); }, 0.85);
    part(OF.skin, pp => { ellInto(pp, hc[0] - R(0.049), hc[1] + R(0.006), R(0.01), R(0.017)); ellInto(pp, hc[0] + R(0.049), hc[1] + R(0.006), R(0.01), R(0.017)); }, 0.9);
    const hs = o.hairStyle || OF.hairStyle || 'short';
    part(OF.hair, pp => {
      if (hs === 'long') smoothInto(pp, [[hc[0] - R(0.054), hc[1]], [hc[0] - R(0.05), hc[1] - R(0.05)], [hc[0], hc[1] - R(0.07)], [hc[0] + R(0.05), hc[1] - R(0.05)], [hc[0] + R(0.054), hc[1]], [hc[0] + R(0.058), hc[1] + R(0.13)], [hc[0], hc[1] + R(0.14)], [hc[0] - R(0.058), hc[1] + R(0.13)]]);
      else {
        const hp = [[-0.054, 0.008], [-0.055, -0.03], [-0.04, -0.06], [-0.012, -0.074], [0.016, -0.073], [0.042, -0.058], [0.056, -0.028], [0.054, 0.01], [0.046, 0.038], [0.036, 0.05], [0.024, 0.044], [0.012, 0.056], [0.0, 0.048], [-0.012, 0.057], [-0.024, 0.045], [-0.036, 0.052], [-0.046, 0.038]];
        smoothInto(pp, hp.map(([x, y]) => [hc[0] + R(x), hc[1] + R(y)]));
        if (hs === 'bun') ellInto(pp, hc[0], hc[1] - R(0.07), R(0.026), R(0.022));
      }
    });
    if (o.earphones) part('#f2f0ea', pp => { ellInto(pp, hc[0] - R(0.053), hc[1] + R(0.012), R(0.006), R(0.008)); ellInto(pp, hc[0] + R(0.053), hc[1] + R(0.012), R(0.006), R(0.008)); });
    info.head = hc;
  } else {
    const J = sideJoints(o);
    const seat = o.pose === 'sit' || o.pose === 'desk' || o.pose === 'ledge';
    const legDraw = (l, far) => {
      const hp = S(J.hip), k = S(l.knee), a = S(l.ankle);
      const samples = [{ p: hp, f: R(0.058), b: R(seat ? 0.07 : 0.064) }, { p: mid(hp, k, 0.5), f: R(0.052), b: R(0.054) }, { p: k, f: R(0.041), b: R(0.04) }, { p: mid(k, a, 0.35), f: R(0.037), b: R(0.041) }, { p: mid(k, a, 0.92), f: R(0.034), b: R(0.034) }];
      part(OF.pants, pp => smoothInto(pp, chainPts(samples, sgn)), far ? 0.8 : 1);
      const sp = [[-0.03, -0.04], [-0.032, -0.006], [-0.02, 0.016], [0.014, 0.018], [0.048, 0.004], [0.084, -0.01], [0.104, -0.022], [0.108, -0.034], [0.1, -0.042]].map(q => { const r = rot2(q, l.foot); return S([l.ankle[0] + r[0], l.ankle[1] + r[1]]); });
      part(OF.shoes || OF.skin, pp => smoothInto(pp, sp), far ? 0.8 : 1);
      if (OF.sole) { const so = [[-0.031, -0.044], [0.102, -0.044], [0.107, -0.035], [-0.032, -0.035]].map(q => { const r = rot2(q, l.foot); return S([l.ankle[0] + r[0], l.ankle[1] + r[1]]); }); part(OF.sole, pp => { pp.moveTo(so[0][0], so[0][1]); for (const q of so.slice(1)) pp.lineTo(q[0], q[1]); pp.closePath(); }, far ? 0.8 : 1); }
    };
    const armDraw = (a, far) => {
      const sh = S(J.sho), e = S(a.elb), w = S(a.wri);
      const samples = [{ p: sh, f: R(0.046), b: R(0.048) }, { p: mid(sh, e, 0.5), f: R(0.037), b: R(0.037) }, { p: e, f: R(0.032), b: R(0.033) }, { p: mid(e, w, 0.5), f: R(0.031), b: R(0.03) }, { p: w, f: R(0.027), b: R(0.027) }];
      part(OF.coat || OF.top, pp => smoothInto(pp, chainPts(samples, sgn)), far ? 0.78 : 1);
      const d = dirv(a.fa), ang = Math.atan2(d[1], d[0]);
      const hp = [[0.0, 0.018], [0.03, 0.024], [0.06, 0.02], [0.082, 0.01], [0.086, -0.004], [0.06, -0.016], [0.02, -0.02], [0.0, -0.016]].map(q => { const r = rot2(q, ang); return S([a.wri[0] + r[0], a.wri[1] + r[1]]); });
      part(OF.skin, pp => smoothInto(pp, hp), far ? 0.78 : 1);
      return S(add(a.wri, d, 0.06));
    };
    if (OF.pack && o.pose !== 'sit') {
      const T = (s, f) => S(add(add(J.hip, J.u, s), J.fr, f));
      part(OF.pack, pp => smoothInto(pp, [T(0.17, -0.055), T(0.165, -0.15), T(0.18, -0.176), T(0.215, -0.18), T(0.33, -0.162), T(0.365, -0.135), T(0.372, -0.06)]));
      const st = new Path2D(); const a = T(0.37, -0.07), b = T(0.29, 0.02), c = T(0.2, 0.07); st.moveTo(a[0], a[1]); st.quadraticCurveTo(b[0], b[1], c[0], c[1]);
      lines.push([st, OF.packStrap || '#111', R(0.012)]);
      const zp = new Path2D(); const z1 = T(0.19, -0.168), z2 = T(0.3, -0.158); zp.moveTo(z1[0], z1[1]); zp.lineTo(z2[0], z2[1]); lines.push([zp, 'rgba(0,0,0,0.3)', R(0.004)]);
    }
    const hand1 = armDraw(J.arms[1], true);
    legDraw(J.legs[1], true);
    legDraw(J.legs[0], false);
    const u = J.u, fr = J.fr, coat = !!OF.coat;
    const prof = [[0, 0.085, 0.068], [0.15, 0.076, 0.064], [0.35, 0.064, 0.06], [0.55, 0.066, 0.066], [0.74, 0.07, 0.074], [0.88, 0.064, 0.062], [1, 0.036, 0.032]];
    const fp = [], bp = [];
    const th = coat ? 0.01 : 0;
    for (const [s, b, fw] of prof) { const c = add(J.hip, u, s * SPINE); fp.push(S(add(c, fr, fw + th))); bp.push(S(add(c, fr, -(b + th)))); }
    part(coat ? OF.coat : OF.top, pp => smoothInto(pp, fp.concat(bp.reverse())));
    if (coat && !seat) {
      const ks = J.legs.map(l => l.knee[0]);
      const hb = add(add(J.hip, u, 0.12), fr, -0.09), hf = add(add(J.hip, u, 0.12), fr, 0.078);
      const hemY = J.hip[1] - (o.coatLen ?? 0.2);
      const fmax = Math.max(...ks), bmin = Math.min(...ks);
      part(OF.coat, pp => smoothInto(pp, [S(hb), S(hf), S(add(J.hip, fr, 0.074)), S([fmax + 0.022, hemY + 0.012]), S([fmax + 0.012, hemY - 0.004]), S([bmin - 0.05, hemY - 0.004]), S([bmin - 0.058, hemY + 0.01]), S(add(J.hip, fr, -0.088))]), 0.97);
      if (detail) { const sp = new Path2D(); const a = S(add(J.hip, fr, 0.0)), b = S([lerp(fmax, bmin, 0.45), hemY]); sp.moveTo(a[0], a[1]); sp.quadraticCurveTo(a[0], (a[1] + b[1]) / 2, b[0], b[1]); lines.push([sp, 'rgba(0,0,0,0.16)', R(0.004)]); }
    } else if (coat) {
      const kn = J.legs[0].knee; const hb = add(add(J.hip, u, 0.1), fr, -0.098);
      part(OF.coat, pp => smoothInto(pp, [S(hb), S(add(J.hip, fr, 0.06)), S([kn[0] - 0.06, kn[1] + 0.05]), S([kn[0] - 0.08, kn[1] - 0.03]), S([J.hip[0] - 0.09, J.hip[1] - 0.04])]), 0.97);
    }
    if (detail) {
      const sp = new Path2D();
      if (coat) { const a = S(add(add(J.hip, u, 0.92), fr, 0.05)), b = S(add(add(J.hip, u, seat ? 0.02 : -0.18), fr, 0.084)); sp.moveTo(a[0], a[1]); sp.lineTo(b[0], b[1]); }
      const p1 = S(add(add(J.hip, u, 0.06), fr, -0.02)), p2 = S(add(add(J.hip, u, 0.06), fr, 0.05));
      sp.moveTo(p1[0], p1[1]); sp.lineTo(p2[0], p2[1]);
      const k1 = S(add(J.legs[0].knee, [0.0, 0.03])), k2 = S(add(J.legs[0].knee, [-0.03, -0.01]));
      sp.moveTo(k1[0], k1[1]); sp.lineTo(k2[0], k2[1]);
      lines.push([sp, 'rgba(0,0,0,0.2)', R(0.004)]);
    }
    if (coat) { const c0 = add(J.neck, fr, -0.04), c1 = add(add(J.neck, u, 0.035), fr, -0.03), c2 = add(add(J.neck, u, 0.02), fr, 0.01), c3 = add(J.neck, fr, 0.03); part(OF.collar || OF.coat, pp => smoothInto(pp, [S(c0), S(c1), S(c2), S(c3), S(add(J.neck, u, -0.02))]), 1.05); }
    else { const c0 = add(J.neck, fr, -0.036), c3 = add(J.neck, fr, 0.03); part(OF.top, pp => smoothInto(pp, [S(c0), S(add(add(J.neck, u, 0.016), fr, -0.03)), S(add(add(J.neck, u, 0.012), fr, 0.026)), S(c3), S(add(J.neck, u, -0.02))]), 1.04); }
    const nb = S(add(J.neck, u, -0.01)), nt = S(add(J.head, [Math.sin(J.ha + Math.PI), Math.cos(J.ha + Math.PI)], 0.035));
    part(OF.skin, pp => smoothInto(pp, chainPts([{ p: nb, f: R(0.026), b: R(0.03) }, { p: nt, f: R(0.024), b: R(0.026) }], sgn)), 0.82);
    const hc = J.head, ha = J.ha;
    const HP = (q) => { const r = rot2([q[0], q[1]], -ha); return S([hc[0] + r[0], hc[1] + r[1]]); };
    const face = [[-0.052, 0.0], [-0.046, 0.035], [-0.02, 0.06], [0.015, 0.063], [0.04, 0.047], [0.05, 0.022], [0.047, 0.009], [0.052, 0.001], [0.065, -0.016], [0.054, -0.023], [0.055, -0.03], [0.05, -0.035], [0.053, -0.041], [0.047, -0.048], [0.046, -0.057], [0.03, -0.066], [0.0, -0.062], [-0.022, -0.045], [-0.04, -0.03], [-0.05, -0.015]];
    part(OF.skin, pp => smoothInto(pp, face.map(HP)));
    part(OF.skin, pp => { const e = HP([-0.008, -0.006]); ellInto(pp, e[0], e[1], R(0.011), R(0.017), -ha * fx); }, 0.86);
    const hs = o.hairStyle || OF.hairStyle || 'short';
    const hairPts = hs === 'long'
      ? [[0.044, 0.04], [0.05, 0.03], [0.04, 0.06], [0.01, 0.075], [-0.032, 0.066], [-0.06, 0.035], [-0.064, -0.02], [-0.06, -0.09], [-0.03, -0.1], [-0.025, -0.03], [-0.014, 0.006], [0.01, 0.022], [0.03, 0.034]]
      : [[0.048, 0.026], [0.054, 0.036], [0.047, 0.052], [0.03, 0.069], [0.0, 0.079], [-0.032, 0.074], [-0.056, 0.052], [-0.066, 0.016], [-0.061, -0.016], [-0.05, -0.04], [-0.043, -0.05], [-0.036, -0.034], [-0.026, -0.014], [-0.012, 0.012], [0.004, 0.012], [-0.002, -0.012], [0.008, -0.012], [0.014, 0.022], [0.032, 0.034]];
    part(OF.hair, pp => { smoothInto(pp, hairPts.map(HP)); if (hs === 'bun') { const b = HP([-0.05, 0.055]); ellInto(pp, b[0], b[1], R(0.026), R(0.024)); } });
    if (detail) { // strands + sheen
      const hl = new Path2D();
      for (const [a, b, c] of [[[-0.05, 0.05], [-0.01, 0.075], [0.04, 0.05]], [[-0.058, 0.02], [-0.02, 0.06], [0.03, 0.06]], [[-0.055, -0.01], [-0.03, 0.04], [0.01, 0.07]]]) { const A = HP(a), Bq = HP(b), Cq = HP(c); hl.moveTo(A[0], A[1]); hl.quadraticCurveTo(Bq[0], Bq[1], Cq[0], Cq[1]); }
      lines.push([hl, 'rgba(255,240,225,0.10)', R(0.004)]);
    }
    if (detail && h > 220) {
      const sp = new Path2D(); const e1 = HP([0.034, 0.004]), e2 = HP([0.046, 0.0]); sp.moveTo(e1[0], e1[1]); sp.lineTo(e2[0], e2[1]);
      lines.push([sp, 'rgba(30,20,18,0.75)', R(0.0035)]);
      const br = new Path2D(); const b1 = HP([0.031, 0.02]), b2 = HP([0.05, 0.02]); br.moveTo(b1[0], b1[1]); br.lineTo(b2[0], b2[1]);
      lines.push([br, OF.hair, R(0.005)]);
    }
    if (o.earphones) part('#f2f0ea', pp => { const e = HP([-0.004, -0.008]); ellInto(pp, e[0], e[1], R(0.007), R(0.009)); });
    const hand0 = armDraw(J.arms[0], false);
    info.hands = [hand0, hand1];
    info.face = HP([0.06, 0.0]);
    info.head = S(hc);
    info.J = J;
  }

  // ---- paint base colours
  for (const [p, col, shade] of parts) {
    fg.fillStyle = typeof col === 'string' ? col : rgba(col);
    fg.fill(p);
    if (shade !== 1) { fg.fillStyle = shade < 1 ? `rgba(0,0,0,${(1 - shade) * 0.9})` : `rgba(255,255,255,${(shade - 1) * 0.9})`; fg.fill(p); }
  }
  for (const [p, col, w] of lines) { fg.strokeStyle = col; fg.lineWidth = Math.max(0.6, w); fg.lineCap = 'round'; fg.stroke(p); }
  // ---- lighting
  const cx = o.x + ox, cy = o.y + oy - h * 0.5;
  const dl = Math.hypot(Lg.dir[0], Lg.dir[1]) || 1, lx = Lg.dir[0] / dl, ly = Lg.dir[1] / dl;
  fg.save();
  fg.clip(union);
  fg.globalCompositeOperation = 'multiply'; fg.fillStyle = rgba(Lg.amb); fg.fillRect(0, 0, BW, BH);
  const gx0 = cx - lx * h * 0.16, gy0 = cy - ly * h * 0.16, gx1 = cx + lx * h * 0.16, gy1 = cy + ly * h * 0.16;
  let gr = fg.createLinearGradient(gx0, gy0, gx1, gy1);
  gr.addColorStop(0, `rgba(0,0,0,${Lg.shadowA})`); gr.addColorStop(0.55, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  fg.globalCompositeOperation = 'source-over'; fg.fillStyle = gr; fg.fillRect(0, 0, BW, BH);
  gr = fg.createLinearGradient(gx0, gy0, gx1, gy1);
  gr.addColorStop(0, rgba(Lg.key, 0)); gr.addColorStop(0.5, rgba(Lg.key, 0)); gr.addColorStop(1, rgba(Lg.key, Lg.keyA));
  fg.globalCompositeOperation = 'screen'; fg.fillStyle = gr; fg.fillRect(0, 0, BW, BH);
  gr = fg.createLinearGradient(0, o.y + oy - h, 0, o.y + oy);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${Lg.footA ?? 0.25})`);
  fg.globalCompositeOperation = 'source-over'; fg.fillStyle = gr; fg.fillRect(0, 0, BW, BH);
  if (o.glow) {
    for (const [gx, gy, rr, col, a] of o.glow) { const q = fg.createRadialGradient(gx + ox, gy + oy, 0, gx + ox, gy + oy, rr); q.addColorStop(0, rgba(C(col), a)); q.addColorStop(1, rgba(C(col), 0)); fg.globalCompositeOperation = 'screen'; fg.fillStyle = q; fg.fillRect(0, 0, BW, BH); }
  }
  fg.restore();
  if (Lg.rimA > 0) {
    const tg = B.tg, rw = Math.max(1.2, h * Lg.rimW);
    const rd = Lg.rimDir || Lg.dir, rl = Math.hypot(rd[0], rd[1]) || 1, rx = rd[0] / rl, ry = rd[1] / rl;
    tg.fillStyle = rgba(Lg.rim); tg.fill(union);
    tg.globalCompositeOperation = 'destination-out'; tg.translate(-rx * rw, -ry * rw); tg.fill(union); tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    fg.globalCompositeOperation = 'screen'; fg.globalAlpha = Lg.rimA; if (h > 200) fg.filter = 'blur(0.8px)';
    fg.drawImage(B.t, 0, 0, BW, BH, 0, 0, BW, BH);
    fg.filter = 'none'; fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-over';
  }
  if (o.shadow) { // cast shadow on the ground from the figure's own alpha
    const tg = B.tg; tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'copy'; tg.drawImage(B.c, 0, 0);
    tg.globalCompositeOperation = 'source-in'; tg.fillStyle = o.shadow.col || '#000'; tg.fillRect(0, 0, BW, BH); tg.globalCompositeOperation = 'source-over';
    g.save(); g.globalAlpha = o.shadow.a ?? 0.35; if (h > 160) g.filter = `blur(${o.shadow.blur ?? Math.max(1, h * 0.012)}px)`;
    g.translate(o.x, o.y); g.transform(1, 0, o.shadow.k ?? -1.2, -(o.shadow.sy ?? 0.25), 0, 0);
    g.drawImage(B.t, 0, 0, BW, BH, bx - pad - o.x, by - pad - o.y, BW, BH); g.restore();
  }
  g.save();
  if (o.alpha !== undefined) g.globalAlpha = o.alpha;
  if (o.blur) g.filter = `blur(${o.blur}px)`;
  g.drawImage(B.c, 0, 0, BW, BH, bx - pad, by - pad, BW, BH);
  g.restore();
  const back = (p) => p ? [p[0] - ox, p[1] - oy] : p;
  if (info.hands) info.hands = info.hands.map(back);
  info.face = back(info.face); info.head = back(info.head); info.phone = back(info.phone);
  return info;
}

function makeCrowd(n, seed, opts = {}) {
  const r = mulberry32(seed); const P = [];
  for (let i = 0; i < n; i++) {
    P.push({
      x: lerp(opts.x0 ?? -4, opts.x1 ?? 4, r()), z: lerp(opts.z0 ?? 3, opts.z1 ?? 40, r()),
      hm: lerp(1.58, 1.84, r()), sp: lerp(opts.sp0 ?? 1.1, opts.sp1 ?? 1.5, r()), ph: r(),
      outfit: randOutfit(r), hairStyle: r() < 0.62 ? 'short' : r() < 0.6 ? 'long' : 'bun', bw: lerp(0.94, 1.1, r()),
      headDown: r() < 0.4 ? 1 : 0, dx: (r() - 0.5) * 0.15, phone: r() < 0.35,
    });
  }
  return P;
}
