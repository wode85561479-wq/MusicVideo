import React from 'react';
import {random} from 'remotion';
import {f} from '../rig/math';

export interface Palette {
  top: string;
  bottom: string;
  accent: string;
  floorA: string;
  floorB: string;
  shadow: string;
}
export const PALETTES: Palette[] = [
  {top: '#ffcfe2', bottom: '#fff3dc', accent: '#ff7fae', floorA: '#ffd9e6', floorB: '#f5aecb', shadow: '#c95f8c'},
  {top: '#c6d6ff', bottom: '#fff0fa', accent: '#6d8cff', floorA: '#dfe7ff', floorB: '#aebcf5', shadow: '#5568b8'},
  {top: '#dcd2ff', bottom: '#ffe4f3', accent: '#9a7bff', floorA: '#e6dcff', floorB: '#c2aef2', shadow: '#6f58b8'},
  {top: '#ffeeb5', bottom: '#ffe1d3', accent: '#ffa63d', floorA: '#fff0c9', floorB: '#ffcf96', shadow: '#c9813a'},
];

export const STAR = 'M 0 -1 Q 0.14 -0.14 1 0 Q 0.14 0.14 0 1 Q -0.14 0.14 -1 0 Q -0.14 -0.14 0 -1 Z';
export const HEART = 'M 0 0.9 C -1.35 -0.1, -0.7 -1.15, 0 -0.38 C 0.7 -1.15, 1.35 -0.1, 0 0.9 Z';
export const NOTE =
  'M -0.1 0.62 a 0.36 0.27 -20 1 1 -0.02 -0.3 L -0.12 -0.9 L 0.62 -0.66 L 0.62 -0.2 L 0.08 -0.4 L 0.08 0.4 Z';

const FLOATERS = Array.from({length: 30}, (_, i) => ({
  x: random(`fx${i}`) * 1920,
  y0: random(`fy${i}`),
  speed: 0.02 + random(`fs${i}`) * 0.035,
  size: 16 + random(`fz${i}`) * 34,
  kind: Math.floor(random(`fk${i}`) * 4),
  spin: (random(`fr${i}`) - 0.5) * 30,
  accent: random(`fa${i}`) > 0.55,
}));

/** Screen-space backdrop: gradient, rotating sunburst, halftone, pulsing disc, drifting shapes. */
export const Backdrop: React.FC<{beat: number; pal: Palette}> = ({beat, pal}) => {
  const pulse = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * beat), 3);
  const rays = [];
  const N = 18;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = a0 + (Math.PI / N) * 0.9;
    const R = 1700;
    rays.push(
      <path key={i} d={`M 0 0 L ${f(Math.cos(a0) * R)} ${f(Math.sin(a0) * R)} L ${f(Math.cos(a1) * R)} ${f(Math.sin(a1) * R)} Z`} />,
    );
  }
  return (
    <g>
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.top} />
          <stop offset="1" stopColor={pal.bottom} />
        </linearGradient>
        <pattern id="dots" width={30} height={30} patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <circle cx={15} cy={15} r={6} fill={pal.accent} />
        </pattern>
        <linearGradient id="dotFadeA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.55} />
          <stop offset="0.38" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.7" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#fff" stopOpacity={0.45} />
        </linearGradient>
        <mask id="dotMask">
          <rect x={-400} y={-400} width={2720} height={1880} fill="url(#dotFadeA)" />
        </mask>
        <radialGradient id="discGrad">
          <stop offset="0" stopColor="#fff" stopOpacity={0.95} />
          <stop offset="0.7" stopColor="#fff" stopOpacity={0.7} />
          <stop offset="1" stopColor="#fff" stopOpacity={0.35} />
        </radialGradient>
      </defs>
      <rect x={-400} y={-400} width={2720} height={1880} fill="url(#bgGrad)" />
      <g transform={`translate(960 500) rotate(${f(beat * 4)})`} fill="#ffffff" opacity={0.26}>
        {rays}
      </g>
      <rect x={-400} y={-400} width={2720} height={1880} fill="url(#dots)" mask="url(#dotMask)" />
      <g transform="translate(960 500)">
        <circle r={f(372 * (1 + 0.035 * pulse))} fill="url(#discGrad)" />
        <circle r={f(418 * (1 + 0.035 * pulse))} fill="none" stroke="#ffffff" strokeWidth={7} opacity={0.75} />
        <circle r={470} fill="none" stroke={pal.accent} strokeWidth={5} strokeDasharray="6 26" strokeLinecap="round" opacity={0.7} transform={`rotate(${f(-beat * 7)})`} />
        <circle r={560} fill="none" stroke="#ffffff" strokeWidth={3} strokeDasharray="80 40" opacity={0.5} transform={`rotate(${f(beat * 5)})`} />
      </g>
      {FLOATERS.map((fl, i) => {
        const yy = (((fl.y0 - beat * fl.speed) % 1) + 1) % 1;
        const y = -80 + yy * 1240;
        const x = fl.x + Math.sin(beat * 0.6 + i) * 24;
        const d = fl.kind === 0 ? STAR : fl.kind === 1 ? HEART : fl.kind === 2 ? NOTE : null;
        const sc = fl.size * (1 + 0.12 * pulse);
        return d ? (
          <path
            key={i}
            d={d}
            transform={`translate(${f(x)} ${f(y)}) rotate(${f(fl.spin + Math.sin(beat * 0.8 + i) * 12)}) scale(${f(sc)})`}
            fill={fl.accent ? pal.accent : '#ffffff'}
            opacity={fl.accent ? 0.55 : 0.8}
          />
        ) : (
          <circle key={i} cx={f(x)} cy={f(y)} r={f(sc * 0.5)} fill="none" stroke={fl.accent ? pal.accent : '#ffffff'} strokeWidth={4} opacity={0.6} />
        );
      })}
    </g>
  );
};

const BARS = Array.from({length: 56}, (_, i) => ({a: random(`ba${i}`), b: random(`bb${i}`)}));

/** Stage-space floor (y >= 0) with an equaliser skyline standing on the horizon. */
export const Floor: React.FC<{beat: number; pal: Palette}> = ({beat, pal}) => {
  const pulse = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * beat), 2);
  return (
    <g>
      <defs>
        <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="420" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={pal.floorB} />
          <stop offset="0.25" stopColor={pal.floorA} />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <g fill="#ffffff" opacity={0.55}>
        {BARS.map((b, i) => {
          const x = -1960 + i * 70;
          const wob = 0.5 + 0.5 * Math.sin(beat * Math.PI * (1 + b.b) + b.a * 20);
          const h = 26 + (40 + 150 * b.a) * (0.35 + 0.65 * pulse) * (0.5 + 0.5 * wob);
          return <rect key={i} x={x} y={f(-h)} width={44} height={f(h + 2)} rx={10} />;
        })}
      </g>
      <rect x={-4000} y={0} width={8000} height={1200} fill="url(#floorGrad)" />
      <rect x={-4000} y={-3} width={8000} height={7} fill="#ffffff" opacity={0.9} />
    </g>
  );
};
