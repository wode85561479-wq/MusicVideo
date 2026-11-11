export type V = [number, number];

export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: V, s: number): V => [a[0] * s, a[1] * s];
export const len = (a: V): number => Math.hypot(a[0], a[1]);
export const norm = (a: V): V => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
/** 90 degree turn (clockwise on screen, y pointing down). */
export const perp = (a: V): V => [-a[1], a[0]];
export const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1];
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpV = (a: V, b: V, t: number): V => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const clamp = (x: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, x));
export const rad = (deg: number): number => (deg * Math.PI) / 180;
export const deg = (r: number): number => (r * 180) / Math.PI;
/** Rotate clockwise on screen by `d` degrees. */
export const rot = (v: V, d: number): V => {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
};
export const angleOf = (v: V): number => deg(Math.atan2(v[1], v[0]));
export const f = (n: number): string => n.toFixed(2);
export const pt = (v: V): string => `${f(v[0])} ${f(v[1])}`;

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t,
  /** Fast attack with a small overshoot - the "pose pop" used in anime dance cuts. */
  snap: (t: number) => {
    const c1 = 1.35;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
} as const;
export type EaseName = keyof typeof ease;

/** Smooth open curve through points (Catmull-Rom converted to cubic Beziers). */
export const smoothThrough = (p: V[], move = true): string => {
  if (p.length < 2) return '';
  let d = move ? `M ${pt(p[0])}` : `L ${pt(p[0])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(p.length - 1, i + 2)];
    const c1 = add(p1, mul(sub(p2, p0), 1 / 6));
    const c2 = sub(p2, mul(sub(p3, p1), 1 / 6));
    d += ` C ${pt(c1)}, ${pt(c2)}, ${pt(p2)}`;
  }
  return d;
};
