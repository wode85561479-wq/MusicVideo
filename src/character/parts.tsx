import React from 'react';
import {add, angleOf, f, lerpV, mul, norm, perp, pt, rot, smoothThrough, sub, V} from '../rig/math';
import {HandShape} from '../rig/pose';
import {C} from './palette';

/**
 * Cel-animation ink: children are drawn once with a thick dark stroke and once
 * without, so overlapping shapes merge into a single clean outline.
 */
export const Ink: React.FC<{w?: number; children: React.ReactNode}> = ({w = 7, children}) => (
  <>
    <g stroke={C.line} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round">
      {children}
    </g>
    <g stroke="none">{children}</g>
  </>
);

/** Tapered limb segment between two joints. */
export const quadPts = (a: V, b: V, ra: number, rb: number): string => {
  const n = perp(norm(sub(b, a)));
  return [add(a, mul(n, ra)), add(b, mul(n, rb)), sub(b, mul(n, rb)), sub(a, mul(n, ra))].map(pt).join(' ');
};

export const Seg: React.FC<{a: V; b: V; ra: number; rb: number; fill: string; capA?: boolean; capB?: boolean}> = ({
  a,
  b,
  ra,
  rb,
  fill,
  capA = true,
  capB = true,
}) => (
  <>
    <polygon points={quadPts(a, b, ra, rb)} fill={fill} />
    {capA ? <circle cx={f(a[0])} cy={f(a[1])} r={ra} fill={fill} /> : null}
    {capB ? <circle cx={f(b[0])} cy={f(b[1])} r={rb} fill={fill} /> : null}
  </>
);

/** A thin strip along one side of a limb: the cel shadow / rim light. */
export const Strip: React.FC<{a: V; b: V; ra: number; rb: number; side: number; fill: string; width?: number; opacity?: number}> = ({
  a,
  b,
  ra,
  rb,
  side,
  fill,
  width = 0.42,
  opacity = 1,
}) => {
  const n = mul(perp(norm(sub(b, a))), side);
  const p = [add(a, mul(n, ra)), add(b, mul(n, rb)), add(b, mul(n, rb * (1 - width))), add(a, mul(n, ra * (1 - width)))];
  return <polygon points={p.map(pt).join(' ')} fill={fill} opacity={opacity} />;
};

const Finger: React.FC<{x: number; y: number; ang: number; len: number; r?: number}> = ({x, y, ang, len, r = 3.9}) => {
  const tip = add([x, y], rot([len, 0], ang));
  return <Seg a={[x, y]} b={tip} ra={r} rb={r * 0.86} fill={C.skin} />;
};

/** Hand drawn in wrist space: +x points out of the sleeve. `flip` puts the thumb on the other side. */
export const Hand: React.FC<{wrist: V; dir: V; rotDeg: number; shape: HandShape; flip: number}> = ({wrist, dir, rotDeg, shape, flip}) => {
  const ang = angleOf(dir) + rotDeg;
  const t = flip;
  return (
    <g transform={`translate(${pt(wrist)}) rotate(${f(ang)})`}>
      <Ink w={5.5}>
        {shape === 'open' ? (
          <>
            <Finger x={8} y={t * 8} ang={t * 62} len={12} r={4.2} />
            <Finger x={18} y={-8.2} ang={-22} len={14} />
            <Finger x={20} y={-2.8} ang={-7} len={17} />
            <Finger x={20} y={2.8} ang={7} len={16.5} />
            <Finger x={18} y={8.2} ang={22} len={13} />
            <ellipse cx={10} cy={0} rx={13} ry={12} fill={C.skin} />
          </>
        ) : null}
        {shape === 'point' ? (
          <>
            {/* index finger on the thumb side plus an open thumb: an unmistakable "pointing" L */}
            <Finger x={9} y={t * 9} ang={t * 78} len={13} r={4.3} />
            <Finger x={16} y={t * 6.5} ang={-t * 4} len={25} r={4.1} />
            <ellipse cx={10} cy={0} rx={13} ry={12} fill={C.skin} />
          </>
        ) : null}
        {shape === 'peace' ? (
          <>
            <Finger x={16} y={-5} ang={-17} len={24} r={4} />
            <Finger x={16} y={5} ang={17} len={24} r={4} />
            <ellipse cx={10} cy={0} rx={13} ry={12} fill={C.skin} />
          </>
        ) : null}
        {shape === 'fist' || shape === 'paw' ? <ellipse cx={10} cy={0} rx={13.5} ry={12.5} fill={C.skin} /> : null}
      </Ink>
      {shape === 'fist' || shape === 'paw' || shape === 'point' || shape === 'peace' ? (
        <g stroke={C.skinShade} strokeWidth={2} strokeLinecap="round" fill="none">
          <path d="M 17 -6 q 4 3 0 6" />
          <path d="M 17 1 q 4 3 0 6" />
        </g>
      ) : null}
      {shape === 'paw' ? <ellipse cx={11} cy={1} rx={5} ry={4.4} fill="#ffb7c8" opacity={0.9} /> : null}
    </g>
  );
};

/** Ribbon (hair strand) along a spine with per-point half widths. */
export const ribbonPath = (spine: V[], half: number[]): {d: string; left: V[]; right: V[]; dirEnd: V; nEnd: V} => {
  const left: V[] = [];
  const right: V[] = [];
  let lastN: V = [1, 0];
  let lastDir: V = [0, 1];
  for (let i = 0; i < spine.length; i++) {
    const a = spine[Math.max(0, i - 1)];
    const b = spine[Math.min(spine.length - 1, i + 1)];
    const dir = norm(sub(b, a));
    const n = perp(dir);
    lastN = n;
    lastDir = dir;
    left.push(add(spine[i], mul(n, half[i])));
    right.push(sub(spine[i], mul(n, half[i])));
  }
  const end = spine[spine.length - 1];
  const tipA = add(add(end, mul(lastDir, 34)), mul(lastN, 9));
  const notch = add(end, mul(lastDir, 6));
  const tipB = add(sub(end, mul(lastN, 8)), mul(lastDir, 20));
  const d =
    smoothThrough(left) +
    ` L ${pt(tipA)} L ${pt(notch)} L ${pt(tipB)} ` +
    smoothThrough([...right].reverse(), false) +
    ' Z';
  return {d, left, right, dirEnd: lastDir, nEnd: lastN};
};

export const along = (a: V, b: V, t: number): V => lerpV(a, b, t);
