'use strict';
// Silhouette figure system. Poses defined in units of body height, origin at feet, y up, +x = facing direction.

class FP {
  constructor() { this.p = new Path2D(); }
  _orient(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a < 0 ? pts.slice().reverse() : pts; }
  hard(pts) { pts = this._orient(pts); this.p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) this.p.lineTo(pts[i][0], pts[i][1]); this.p.closePath(); }
  smooth(pts) {
    pts = this._orient(pts); const n = pts.length; const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let s = m(pts[n - 1], pts[0]); this.p.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = m(p, pts[(i + 1) % n]); this.p.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
    this.p.closePath();
  }
  cap(x1, y1, x2, y2, r1, r2) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-6, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, N = 6, pts = [];
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI, c = Math.cos(a), s = Math.sin(a); pts.push([x1 + r1 * (nx * c - ux * s), y1 + r1 * (ny * c - uy * s)]); }
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI, c = Math.cos(a), s = Math.sin(a); pts.push([x2 + r2 * (-nx * c + ux * s), y2 + r2 * (-ny * c + uy * s)]); }
    this.hard(pts);
  }
  ell(x, y, rx, ry, rot = 0) { this.p.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); this.p.ellipse(x, y, rx, ry, rot, 0, TAU); }
}

const dirv = (th) => [Math.sin(th), -Math.cos(th)]; // angle from straight-down, +forward
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];

function sideJoints(o) {
  const J = {}; const pose = o.pose || 'stand';
  let lean = o.lean ?? 0.05, hd = o.headDown ?? 0.12;
  let legs, arms, hip;
  if (pose === 'walk' || pose === 'stand' || pose === 'strap' || pose === 'phone') {
    const ph = o.ph || 0;
    legs = [0, 1].map(k => {
      let th, kb;
      if (pose === 'walk') { const f = ph + k * Math.PI; th = 0.36 * Math.sin(f); kb = 0.06 + 0.75 * Math.pow(Math.max(0, Math.cos(f + 1.0)), 2); }
      else { th = k ? -0.05 : 0.06; kb = 0.03; }
      const knee = add([0, 0], dirv(th), 0.245), ankle = add(knee, dirv(th - kb), 0.245);
      return { knee, ankle, swing: pose === 'walk' ? Math.max(0, Math.cos(ph + k * Math.PI + 1.0)) : 0 };
    });
    const minY = Math.min(legs[0].ankle[1], legs[1].ankle[1]);
    hip = [0, 0.018 - minY];
    legs.forEach(l => { l.knee = add(l.knee, hip); l.ankle = add(l.ankle, hip); });
    if (pose === 'walk') {
      arms = [0, 1].map(k => { const ua = -0.3 * Math.sin(ph + k * Math.PI); return { ua, fa: ua + 0.18 + 0.3 * Math.max(0, ua / 0.3) }; });
    } else if (pose === 'strap') {
      arms = [{ ua: Math.PI - 0.32, fa: Math.PI - 0.08 }, { ua: 0.25, fa: 1.75 }];
      hd = o.headDown ?? 0.35;
    } else if (pose === 'phone') {
      arms = [{ ua: 0.18, fa: 1.75 }, { ua: 0.12, fa: 1.6 }]; hd = o.headDown ?? 0.5;
    } else arms = [{ ua: 0.06, fa: 0.14 }, { ua: -0.04, fa: 0.06 }];
  } else if (pose === 'sit') { // edge of bed, hunched
    hip = [0, 0.27];
    legs = [{ knee: [0.235, 0.285], ankle: [0.27, 0.035] }, { knee: [0.225, 0.28], ankle: [0.235, 0.035] }];
    lean = o.lean ?? 0.5; hd = o.headDown ?? 0.5;
    arms = [{ ua: 0.36, fa: 0.92 }, { ua: 0.3, fa: 1.0 }];
  } else if (pose === 'desk') {
    hip = [0, 0.27];
    legs = [{ knee: [0.235, 0.275], ankle: [0.255, 0.035] }, { knee: [0.23, 0.27], ankle: [0.21, 0.035] }];
    lean = o.lean ?? 0.14; hd = o.headDown ?? 0.18;
    arms = [{ ua: 0.42, fa: 1.5 }, { ua: 0.38, fa: 1.45 }];
  } else if (pose === 'ledge') { // sitting on window seat, knees up
    hip = [0, 0.03];
    const k1 = add(hip, dirv(2.5), 0.245), a1 = add(k1, dirv(0.55), 0.245);
    const k2 = add(hip, dirv(2.35), 0.245), a2 = add(k2, dirv(0.45), 0.245);
    legs = [{ knee: k1, ankle: a1 }, { knee: k2, ankle: a2 }];
    lean = o.lean ?? -0.22; hd = o.headDown ?? -0.1;
    arms = [{ ua: 0.55, fa: 2.25 }, { ua: 0.5, fa: 2.0 }];
  }
  const spineL = 0.315;
  const u = [Math.sin(lean), Math.cos(lean)];
  const neck = add(hip, u, spineL);
  const sho = add(add(hip, u, spineL * 0.9), [-u[1], u[0]], -0.005);
  const head = add(neck, [Math.sin(lean + hd), Math.cos(lean + hd)], 0.082);
  J.hip = hip; J.neck = neck; J.sho = sho; J.head = head; J.u = u; J.lean = lean; J.hd = hd;
  J.legs = legs.map(l => {
    const sw = l.swing || 0;
    const fa = -0.35 * sw;
    const heel = add(l.ankle, [Math.cos(fa) * -0.025, Math.sin(fa) * -0.025 - 0.012]);
    const toe = add(l.ankle, [Math.cos(fa) * 0.072, Math.sin(fa) * 0.072 - 0.02]);
    return { ...l, heel, toe };
  });
  J.arms = arms.map(a => { const elb = add(sho, dirv(a.ua), 0.165), wri = add(elb, dirv(a.fa), 0.145), hand = add(wri, dirv(a.fa), 0.035); return { elb, wri, hand }; });
  return J;
}

// main draw. o: {x,y,h,view,pose,ph,facing,coat,hair,pack,bag,color,rim:{c,dx,dy}}
function drawFigure(g, o) {
  const hp = o.h, fx = o.facing ?? 1, X = (p) => o.x + p[0] * hp * fx, Y = (p) => o.y - p[1] * hp;
  const S = (p) => [X(p), Y(p)];
  const f = new FP();
  const R = (v) => v * hp;
  let info = {};
  if (o.view === 'back') {
    const ph = o.ph || 0, walk = o.pose === 'walk';
    const lifts = [0, 1].map(k => walk ? Math.max(0, Math.sin(ph + k * Math.PI)) : 0);
    const bob = walk ? 0.008 * Math.abs(Math.cos(ph)) : 0;
    const sway = walk ? 0.006 * Math.sin(ph) : 0;
    const bw = o.bw || 1; // body width multiplier
    const B = (x, y) => [X([x * bw + sway, y + bob]), Y([0, y + bob])];
    // legs
    [-1, 1].forEach((s, k) => {
      const L = lifts[k];
      const hipP = B(s * 0.048, 0.5), knee = B(s * 0.046, 0.27 + L * 0.03), ank = [X([s * 0.044 * bw + sway, 0]), Y([0, 0.035 + L * 0.055])];
      f.cap(hipP[0], hipP[1], knee[0], knee[1], R(0.056 * bw), R(0.044 * bw));
      f.cap(knee[0], knee[1], ank[0], ank[1], R(0.044 * bw), R(0.028 * bw));
      f.ell(ank[0], ank[1] + R(0.012), R(0.03 * bw), R(0.02 - L * 0.006));
    });
    // torso
    const hem = o.coat ? 0.29 : 0.47;
    const side = o.coat ? [[0.112, hem], [0.102, 0.42], [0.094, 0.56], [0.104, 0.69], [0.12, 0.775], [0.104, 0.822], [0.045, 0.842]]
      : [[0.096, hem], [0.09, 0.56], [0.086, 0.62], [0.104, 0.71], [0.118, 0.78], [0.1, 0.823], [0.042, 0.84]];
    const tor = side.map(([x, y]) => B(x, y)).concat(side.slice().reverse().map(([x, y]) => B(-x, y)));
    f.smooth(tor);
    if (o.pack) { const a = B(-0.098, 0.56), b = B(0.098, 0.79); f.p.moveTo(a[0], a[1]); f.p.roundRect(Math.min(a[0], b[0]), b[1], Math.abs(b[0] - a[0]), a[1] - b[1], R(0.03)); }
    if (o.bag) { const a = B(-0.15, 0.41), b = B(-0.07, 0.53); f.hard([[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]]); const s1 = B(0.09, 0.8), s2 = B(-0.11, 0.53); f.cap(s1[0], s1[1], s2[0], s2[1], R(0.007), R(0.007)); }
    // arms
    [-1, 1].forEach((s, k) => {
      const sw = walk ? Math.sin(ph + k * Math.PI) : 0;
      const sh = B(s * 0.108, 0.785), el = B(s * 0.126, 0.635 + sw * 0.01), wr = B(s * (0.12 - 0.006 * sw), 0.5 + sw * 0.025);
      if (o.phoneArm && s === 1) { const el2 = B(0.1, 0.63), wr2 = B(0.04, 0.66); f.cap(sh[0], sh[1], el2[0], el2[1], R(0.04), R(0.033)); f.cap(el2[0], el2[1], wr2[0], wr2[1], R(0.032), R(0.025)); info.phone = wr2; return; }
      f.cap(sh[0], sh[1], el[0], el[1], R(0.041 * bw), R(0.034 * bw));
      f.cap(el[0], el[1], wr[0], wr[1], R(0.033 * bw), R(0.025 * bw));
      f.ell(wr[0], wr[1] + R(0.03), R(0.02), R(0.032));
    });
    // neck/head
    const hd = o.headDown ?? 0;
    const n0 = B(0, 0.83), hc = B(0, 0.925 - hd * 0.03);
    f.cap(n0[0], n0[1], hc[0], hc[1] + R(0.03), R(0.03), R(0.028));
    f.ell(hc[0], hc[1], R(0.05), R(0.062 - hd * 0.008));
    const hair = o.hair || 'short';
    if (hair === 'short') f.ell(hc[0], hc[1] - R(0.008), R(0.053), R(0.058));
    else if (hair === 'long') { f.ell(hc[0], hc[1] - R(0.006), R(0.056), R(0.062)); const a = B(-0.055, 0.93), b = B(0.055, 0.79); f.p.moveTo(a[0], a[1]); f.p.roundRect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), b[1] - a[1], R(0.025)); }
    else if (hair === 'bun') { f.ell(hc[0], hc[1] - R(0.006), R(0.054), R(0.06)); f.ell(hc[0], hc[1] - R(0.065), R(0.026), R(0.024)); }
    info.head = hc;
  } else {
    const J = sideJoints(o);
    const legsDraw = (l) => {
      const hipP = S(J.hip), k = S(l.knee), a = S(l.ankle), he = S(l.heel), to = S(l.toe);
      f.cap(hipP[0], hipP[1], k[0], k[1], R(0.06), R(0.046));
      f.cap(k[0], k[1], a[0], a[1], R(0.046), R(0.03));
      f.cap(he[0], he[1], to[0], to[1], R(0.024), R(0.016));
    };
    J.legs.forEach(legsDraw);
    // torso along spine
    const u = J.u, fr = [u[1], -u[0]];
    const prof = [[0, 0.09, 0.07], [0.15, 0.078, 0.066], [0.35, 0.064, 0.06], [0.55, 0.066, 0.066], [0.74, 0.07, 0.072], [0.9, 0.06, 0.056], [1, 0.032, 0.03]];
    const L = 0.315, frontPts = [], backPts = [];
    for (const [s, b, fw] of prof) {
      const c = add(J.hip, u, s * L);
      frontPts.push(S(add(c, fr, fw + (o.coat ? 0.008 : 0))));
      backPts.push(S(add(c, fr, -(b + (o.coat ? 0.008 : 0)))));
    }
    f.smooth(frontPts.concat(backPts.reverse()));
    if (o.coat && (o.pose === 'walk' || o.pose === 'stand' || o.pose === 'strap' || o.pose === 'phone')) {
      const ks = J.legs.map(l => l.knee[0]);
      const hb = add(add(J.hip, u, 0.08), fr, -0.095), hf = add(add(J.hip, u, 0.08), fr, 0.078);
      const hemY = J.hip[1] - 0.2;
      f.smooth([S(hb), S(hf), S([Math.max(...ks) + 0.035, hemY]), S([Math.min(...ks) - 0.07, hemY + 0.005])]);
    }
    if (o.pack) { const c = add(add(J.hip, u, 0.2), fr, -0.11), c2 = add(add(J.hip, u, 0.27), fr, -0.11); f.cap(...S(c), ...S(c2), R(0.06), R(0.062)); }
    // arms
    J.arms.forEach((a, i) => {
      const sh = S(J.sho), e = S(a.elb), w = S(a.wri), hnd = S(a.hand);
      f.cap(sh[0], sh[1], e[0], e[1], R(0.043), R(0.035));
      f.cap(e[0], e[1], w[0], w[1], R(0.034), R(0.025));
      f.cap(w[0], w[1], hnd[0], hnd[1], R(0.022), R(0.018));
    });
    info.hands = J.arms.map(a => S(a.hand));
    // neck + head
    const n = S(J.neck), hc = S(J.head);
    const ang = J.lean + J.hd;
    f.cap(n[0], n[1], (n[0] + hc[0]) / 2, (n[1] + hc[1]) / 2, R(0.032), R(0.03));
    const rot = ang * fx;
    f.ell(hc[0], hc[1], R(0.047), R(0.059), rot);
    // face profile: nose + chin
    const fwd = [Math.cos(ang) * fx, Math.sin(ang)]; // forward screen dir rotated
    const dn = [-Math.sin(ang) * fx, Math.cos(ang)]; // down
    const P = (a, b) => [hc[0] + R(a) * fwd[0] + R(b) * dn[0], hc[1] + R(a) * fwd[1] + R(b) * dn[1]];
    f.smooth([P(0.03, -0.03), P(0.046, -0.012), P(0.064, 0.012), P(0.05, 0.02), P(0.053, 0.034), P(0.04, 0.052), P(0.012, 0.062), P(-0.01, 0.04)]);
    const hair = o.hair || 'short';
    f.ell(...P(-0.014, -0.014), R(0.051), R(0.052), rot); f.ell(...P(0.012, -0.036), R(0.04), R(0.026), rot);
    if (hair === 'long') f.cap(...P(-0.035, -0.02), ...P(-0.05, 0.13), R(0.035), R(0.03));
    if (hair === 'bun') f.ell(...P(-0.055, -0.04), R(0.024), R(0.022));
    info.head = hc; info.face = P(0.06, 0.0); info.J = J;
  }
  // render
  if (o.rim) {
    g.save(); g.translate(o.rim.dx, o.rim.dy || 0); g.fillStyle = o.rim.c; g.globalAlpha = o.rim.a ?? 1; g.fill(f.p); g.restore();
  }
  g.fillStyle = o.color || '#05060a'; g.fill(f.p);
  info.path = f.p;
  return info;
}

// perspective crowd: people with world coords. camera at z=0 looking +z.
function makeCrowd(n, seed, opts = {}) {
  const r = mulberry32(seed); const P = [];
  for (let i = 0; i < n; i++) {
    P.push({
      x: lerp(opts.x0 ?? -4, opts.x1 ?? 4, r()), z: lerp(opts.z0 ?? 3, opts.z1 ?? 40, r()),
      hm: lerp(1.58, 1.84, r()), sp: lerp(opts.sp0 ?? 1.1, opts.sp1 ?? 1.5, r()), ph: r() * TAU,
      coat: r() < 0.7, hair: r() < 0.62 ? 'short' : r() < 0.6 ? 'long' : 'bun', pack: r() < 0.3, bag: r() < 0.25, bw: lerp(0.92, 1.12, r()),
      shade: r(), headDown: r() < 0.4 ? 1 : 0, dx: (r() - 0.5) * 0.15,
    });
  }
  return P;
}
