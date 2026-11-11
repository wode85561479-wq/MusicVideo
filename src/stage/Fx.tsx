import React from 'react';
import {random} from 'remotion';
import {clamp, ease, f} from '../rig/math';
import {HEART, Palette, STAR} from './Background';

interface Burst {
  at: number;
  x: number;
  y: number;
  n: number;
  r: number;
  heart?: boolean;
}
const BURSTS: Burst[] = [
  {at: 3.0, x: 0, y: -40, n: 10, r: 260},
  {at: 4.0, x: 110, y: -690, n: 9, r: 170},
  {at: 20, x: 150, y: -640, n: 7, r: 130},
  {at: 22, x: -150, y: -640, n: 7, r: 130},
  {at: 29.0, x: 0, y: -700, n: 14, r: 330},
  {at: 30, x: -80, y: -630, n: 6, r: 110},
  {at: 31, x: 80, y: -630, n: 6, r: 110},
  {at: 38, x: 120, y: -640, n: 9, r: 150},
  {at: 45, x: 0, y: -610, n: 8, r: 220, heart: true},
  {at: 47, x: 0, y: -610, n: 8, r: 220, heart: true},
  {at: 50, x: 0, y: -500, n: 16, r: 360, heart: true},
  {at: 56, x: 90, y: -700, n: 18, r: 420},
  {at: 60, x: 0, y: -600, n: 14, r: 300, heart: true},
];

/** Stage-space effects drawn over the character. */
export const StageFx: React.FC<{beat: number; pal: Palette}> = ({beat, pal}) => {
  const items: React.ReactNode[] = [];
  BURSTS.forEach((b, bi) => {
    const u = (beat - b.at) / 1.4;
    if (u <= 0 || u >= 1) return;
    const e = ease.out(u);
    for (let i = 0; i < b.n; i++) {
      const ang = (i / b.n) * Math.PI * 2 + random(`ba${bi}-${i}`) * 0.7;
      const dist = b.r * (0.45 + 0.55 * random(`bd${bi}-${i}`)) * e;
      const size = (10 + 20 * random(`bs${bi}-${i}`)) * (1 - u) * (u < 0.15 ? u / 0.15 : 1);
      const col = i % 3 === 0 ? pal.accent : i % 3 === 1 ? '#ffffff' : '#fff3a8';
      items.push(
        <path
          key={`${bi}-${i}`}
          d={b.heart ? HEART : STAR}
          transform={`translate(${f(b.x + Math.cos(ang) * dist)} ${f(b.y + Math.sin(ang) * dist - e * 30)}) rotate(${f(u * 120 * (i % 2 ? 1 : -1) * (b.heart ? 0.2 : 1))}) scale(${f(size)})`}
          fill={b.heart && i % 3 !== 1 ? '#ff5f93' : col}
          stroke="#ffffff"
          strokeWidth={0.12}
        />,
      );
    }
  });

  // dust rings on landings
  for (const hit of [3.0, 29.55]) {
    const u = (beat - hit) / 0.9;
    if (u > 0 && u < 1) {
      items.push(
        <ellipse key={`ring${hit}`} cx={0} cy={0} rx={f(60 + 330 * ease.out(u))} ry={f(10 + 44 * ease.out(u))} fill="none" stroke="#ffffff" strokeWidth={f(12 * (1 - u))} opacity={f(1 - u)} />,
      );
    }
  }

  // the heart she makes with her hands, then throws to the camera
  const grow = clamp((beat - 48.7) / 1.2);
  const fly = clamp((beat - 50) / 1.6);
  if (grow > 0 && fly < 1) {
    const s = 34 * ease.snap(grow) * (1 + 0.1 * Math.sin(beat * Math.PI * 4)) + 150 * ease.out(fly);
    const y = -474 - 150 * ease.out(fly);
    items.push(
      <g key="heart" transform={`translate(0 ${f(y)}) scale(${f(s)})`} opacity={f(1 - Math.pow(fly, 2))}>
        <path d={HEART} fill="#ff5f93" stroke="#ffffff" strokeWidth={0.14} strokeLinejoin="round" />
        <path d="M -0.55 -0.35 Q -0.5 -0.62 -0.25 -0.62" fill="none" stroke="#ffd0df" strokeWidth={0.12} strokeLinecap="round" />
      </g>,
    );
  }
  return <g>{items}</g>;
};

/** Screen-space anime focus lines for the big accents. */
export const FocusLines: React.FC<{beat: number; frame: number}> = ({beat, frame}) => {
  let amt = 0;
  for (const [at, len] of [
    [38, 1.6],
    [56, 2.2],
  ]) {
    const u = (beat - at) / len;
    if (u >= 0 && u < 1) amt = Math.max(amt, 1 - u * u);
  }
  if (amt <= 0) return null;
  const seed = Math.floor(frame / 2);
  const lines = [];
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 + random(`fl${seed}-${i}`) * 0.08;
    const inner = 520 + random(`fi${seed}-${i}`) * 260 + (1 - amt) * 300;
    const w = 0.006 + random(`fw${seed}-${i}`) * 0.02;
    const R = 1500;
    lines.push(
      <path
        key={i}
        d={`M ${f(Math.cos(a) * inner * 1.25)} ${f(Math.sin(a) * inner * 0.72)} L ${f(Math.cos(a - w) * R)} ${f(Math.sin(a - w) * R)} L ${f(Math.cos(a + w) * R)} ${f(Math.sin(a + w) * R)} Z`}
      />,
    );
  }
  return (
    <g transform="translate(960 540)" fill="#ffffff" opacity={f(0.85 * amt)}>
      {lines}
    </g>
  );
};
