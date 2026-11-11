import React from 'react';
import {figureAt} from '../dance/choreo';
import {add, angleOf, clamp, f, mul, norm, perp, pt, smoothThrough, sub, V} from '../rig/math';
import {Skeleton} from '../rig/solve';
import {Head} from './Head';
import {C} from './palette';
import {along, Hand, Ink, quadPts, ribbonPath, Seg, Strip} from './parts';

const TAIL_N = 10;
const TAIL_SEG = 60;
const TAIL_LAG = 0.085; // beats of delay per segment: the follow-through
const TAIL_HALF = [15, 21, 25, 27, 27, 26, 24, 20, 15, 9];

const Tail: React.FC<{beat: number; side: -1 | 1}> = ({beat, side}) => {
  const spine: V[] = [];
  for (let i = 0; i < TAIL_N; i++) {
    const s = figureAt(beat - i * TAIL_LAG);
    const a = side < 0 ? s.tailL : s.tailR;
    const u = i / (TAIL_N - 1);
    const shape = 12 + 58 * Math.sin(u * 2.5);
    const sway = Math.sin(beat * Math.PI * 0.5 + i * 0.55 + side) * u * 7;
    spine.push([
      a[0] * s.cosT + side * s.cosT * shape * (1 + 2.1 * s.spread * u) + sway,
      a[1] + i * TAIL_SEG * (1 - 0.5 * s.spread * u),
    ]);
  }
  const rb = ribbonPath(spine, TAIL_HALF);
  const inner = (k: number, from: number, to: number): V[] =>
    spine.slice(from, to).map((p, j) => {
      const i = from + j;
      const a = spine[Math.max(0, i - 1)];
      const b = spine[Math.min(TAIL_N - 1, i + 1)];
      return add(p, mul(perp(norm(sub(b, a))), TAIL_HALF[i] * k));
    });
  return (
    <g>
      <Ink>
        <path d={rb.d} fill="url(#tailGrad)" />
      </Ink>
      <path d={smoothThrough(inner(0.25 * side, 0, TAIL_N))} fill="none" stroke={C.hairDeep} strokeWidth={2.4} opacity={0.5} strokeLinecap="round" />
      <path d={smoothThrough(inner(-0.45 * side, 1, TAIL_N))} fill="none" stroke={C.hairDeep} strokeWidth={2} opacity={0.4} strokeLinecap="round" />
      <path d={smoothThrough(inner(0.55 * side, 1, 5))} fill="none" stroke={C.hairLight} strokeWidth={7} opacity={0.8} strokeLinecap="round" />
      <path d={smoothThrough(inner(0.6 * side, 5, 8))} fill="none" stroke={C.hairLight} strokeWidth={4} opacity={0.55} strokeLinecap="round" />
    </g>
  );
};

const Leg: React.FC<{hip: V; knee: V; ankle: V; side: -1 | 1; lift: number}> = ({hip, knee, ankle, side, lift}) => {
  const bootTop = along(hip, knee, 0.52);
  const footAng = angleOf(sub(ankle, knee)) - 90 + side * -10;
  const sy = 1 + clamp(lift / 60) * 0.45;
  return (
    <g>
      <Ink>
        <Seg a={hip} b={knee} ra={24} rb={20} fill={C.skin} />
        <Seg a={bootTop} b={knee} ra={22.6} rb={20.6} fill={C.black} capA={false} />
        <Seg a={knee} b={ankle} ra={20.6} rb={13.5} fill={C.black} />
        <g transform={`translate(${pt(ankle)}) rotate(${f(footAng)}) scale(1 ${f(sy)})`}>
          <path d="M -12.5 -8 L 12.5 -8 L 15.5 17 Q 15.5 26 5 26 L -6 26 Q -16.5 26 -15.5 17 Z" fill={C.black} />
        </g>
      </Ink>
      <Seg a={hip} b={along(hip, knee, 0.42)} ra={24} rb={22.3} fill={C.skinShade} capB={false} />
      <polygon points={quadPts(bootTop, along(hip, knee, 0.6), 22.8, 22.4)} fill={C.teal} />
      <Strip a={along(hip, knee, 0.6)} b={knee} ra={21.6} rb={19.6} side={-1} fill={C.blackLight} width={0.26} opacity={0.9} />
      <Strip a={knee} b={ankle} ra={19.6} rb={12.5} side={-1} fill={C.blackLight} width={0.3} opacity={0.9} />
      <Strip a={knee} b={ankle} ra={19.6} rb={12.5} side={1} fill={C.blackShade} width={0.34} />
      <g transform={`translate(${pt(ankle)}) rotate(${f(footAng)}) scale(1 ${f(sy)})`}>
        <path d="M -13.5 20.5 Q 0 27.5 13.5 20.5" stroke={C.teal} strokeWidth={3.4} fill="none" strokeLinecap="round" />
        <path d="M -9 -2 Q 0 3 9 -2" stroke={C.blackLight} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
};

const Arm: React.FC<{sh: V; el: V; ha: V; side: -1 | 1; shape: Skeleton['pose']['hsL']; handRot: number; mark?: boolean}> = ({
  sh,
  el,
  ha,
  side,
  shape,
  handRot,
  mark,
}) => {
  const dir = norm(sub(ha, el));
  const sleeveTop = along(sh, el, 0.58);
  const cuff = along(el, ha, 0.83);
  const markAt = along(sh, el, 0.3);
  return (
    <g>
      <Ink>
        <Seg a={sh} b={el} ra={15.5} rb={13.5} fill={C.skin} />
        <Seg a={sleeveTop} b={el} ra={16.8} rb={17.6} fill={C.black} capA={false} />
        <Seg a={el} b={ha} ra={17.6} rb={27.5} fill={C.black} capB={false} />
      </Ink>
      <Strip a={sh} b={sleeveTop} ra={15} rb={14} side={1} fill={C.skinShade} width={0.36} />
      <polygon points={quadPts(sleeveTop, along(sh, el, 0.7), 17, 17.2)} fill={C.teal} />
      <polygon points={quadPts(cuff, ha, 25.6, 27.4)} fill={C.teal} />
      <polygon points={quadPts(along(el, ha, 0.3), along(el, ha, 0.62), 12, 14.5)} fill={C.blackLight} opacity={0.75} />
      <polygon points={quadPts(along(el, ha, 0.36), along(el, ha, 0.56), 8, 9.6)} fill={C.teal} opacity={0.9} />
      <Strip a={el} b={cuff} ra={16.6} rb={24.6} side={1} fill={C.blackShade} width={0.3} />
      <ellipse
        cx={f(ha[0])}
        cy={f(ha[1])}
        rx={7.5}
        ry={26.5}
        transform={`rotate(${f(angleOf(dir))} ${pt(ha)})`}
        fill={C.blackShade}
        stroke={C.line}
        strokeWidth={3}
      />
      {mark ? (
        <text
          x={0}
          y={4.5}
          transform={`translate(${pt(markAt)}) rotate(${f(angleOf(sub(el, sh)) - 90)})`}
          fontFamily="Inter, sans-serif"
          fontWeight={800}
          fontSize={12.5}
          textAnchor="middle"
          fill={C.red}
        >
          01
        </text>
      ) : null}
      <Hand wrist={add(ha, mul(dir, -3))} dir={dir} rotDeg={handRot} shape={shape} flip={side} />
    </g>
  );
};

const Skirt: React.FC<{shear: number; flare: number}> = ({shear, flare}) => {
  const W = 84 + flare;
  const hem = 60 - flare * 0.5;
  const N = 16;
  const hemPts: V[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = -W + 2 * W * t + shear;
    const y = hem - (i % 2 ? 8 : 0) - Math.sin(t * Math.PI) * -6;
    hemPts.push([x, y]);
  }
  const outline =
    `M -35 -27 L 35 -27 Q ${f(W * 0.72 + shear * 0.35)} 6 ${pt(hemPts[N])} ` +
    [...hemPts]
      .reverse()
      .slice(1)
      .map((p) => `L ${pt(p)}`)
      .join(' ') +
    ` Q ${f(-W * 0.72 + shear * 0.35)} 6 -35 -27 Z`;
  const trim = hemPts.map((p, i) => `${i ? 'L' : 'M'} ${f(p[0] * 0.985)} ${f(p[1] - 8)}`).join(' ');
  return (
    <g>
      <Ink>
        <path d={outline} fill={C.black} />
      </Ink>
      <g stroke={C.blackShade} strokeWidth={2.4} strokeLinecap="round">
        {hemPts.map((p, i) =>
          i % 2 === 0 && i > 0 && i < N ? (
            <line key={i} x1={f(-33 + (66 * i) / N)} y1={-20} x2={f(p[0])} y2={f(p[1] - 2)} />
          ) : null,
        )}
      </g>
      <g stroke={C.blackLight} strokeWidth={5} strokeLinecap="round" opacity={0.55}>
        <line x1={-22} y1={-14} x2={f(hemPts[3][0] + 6)} y2={f(hemPts[3][1] - 18)} />
        <line x1={-4} y1={-14} x2={f(hemPts[7][0] + 5)} y2={f(hemPts[7][1] - 18)} />
      </g>
      <path d={trim} stroke={C.teal} strokeWidth={4.6} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
};

const TORSO =
  'M -35 -5 C -32 -40, -36 -70, -44 -110 C -48 -135, -53 -150, -51 -163 L -20 -174 L 20 -174 L 51 -163 C 53 -150, 48 -135, 44 -110 C 36 -70, 32 -40, 35 -5 Z';

const Torso: React.FC<{tieSway: number; back: boolean}> = ({tieSway, back}) => (
  <g>
    <Ink>
      <path d={TORSO} fill={C.top} />
    </Ink>
    <path d="M 35 -5 C 32 -40, 36 -70, 44 -110 C 48 -135, 53 -150, 51 -163 L 36 -168 C 38 -140, 33 -112, 29 -90 C 23 -60, 21 -30, 23 -5 Z" fill={C.topShade} />
    {back ? null : (
      <>
        <path d="M -41 -100 Q -21 -86 0 -95 Q 21 -86 41 -100 Q 22 -78 0 -86 Q -22 -78 -41 -100 Z" fill={C.topShade} opacity={0.75} />
        <path d="M -44 -128 Q -30 -140 -22 -156" stroke={C.topLight} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.9} />
      </>
    )}
    <path d="M -35 -8 Q 0 -1 35 -8" stroke={C.teal} strokeWidth={7} fill="none" />
    <path d="M -35 -4.5 Q 0 2.5 35 -4.5" stroke={C.line} strokeWidth={3} fill="none" strokeLinecap="round" />
    {back ? (
      <path d="M -20 -174 Q 0 -166 20 -174" stroke={C.teal} strokeWidth={6} fill="none" />
    ) : (
      <>
        <path d="M -20 -174 L 0 -158 L 20 -174 Z" fill={C.skin} stroke={C.line} strokeWidth={3} strokeLinejoin="round" />
        <g transform={`rotate(${f(tieSway)} 0 -160)`}>
          <path d="M -7.5 -156 L 7.5 -156 L 13 -84 L 0 -66 L -13 -84 Z" fill={C.teal} stroke={C.line} strokeWidth={3} strokeLinejoin="round" />
          <path d="M 0 -156 L 7.5 -156 L 13 -84 L 0 -66 Z" fill={C.tealDark} opacity={0.6} />
          <path d="M -9 -166 L 9 -166 L 7 -152 L -7 -152 Z" fill={C.tealDark} stroke={C.line} strokeWidth={3} strokeLinejoin="round" />
        </g>
        <path d="M -22 -176 L -1 -160 L -9 -148 L -30 -164 Z" fill={C.topLight} stroke={C.line} strokeWidth={3} strokeLinejoin="round" />
        <path d="M 22 -176 L 1 -160 L 9 -148 L 30 -164 Z" fill={C.topLight} stroke={C.line} strokeWidth={3} strokeLinejoin="round" />
        <path d="M -28 -163 L -9 -149" stroke={C.teal} strokeWidth={3.5} strokeLinecap="round" />
        <path d="M 28 -163 L 9 -149" stroke={C.teal} strokeWidth={3.5} strokeLinecap="round" />
      </>
    )}
  </g>
);

export const MikuDefs: React.FC = () => (
  <defs>
    <linearGradient id="hairGrad" x1="0" y1="-120" x2="0" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#52dccf" />
      <stop offset="0.55" stopColor={C.hair} />
      <stop offset="1" stopColor={C.hairShade} />
    </linearGradient>
    <linearGradient id="tailGrad" x1="0" y1="-700" x2="0" y2="-40" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#4fd9cd" />
      <stop offset="0.6" stopColor="#33bfbb" />
      <stop offset="1" stopColor="#2a9fb4" />
    </linearGradient>
    <linearGradient id="irisGrad" x1="0" y1="-18" x2="0" y2="20" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#0c5e70" />
      <stop offset="0.5" stopColor="#17ada8" />
      <stop offset="1" stopColor="#86f3e2" />
    </linearGradient>
  </defs>
);

/** The whole figure in character space: origin on the floor between the feet, y up is negative. */
export const Miku: React.FC<{beat: number}> = ({beat}) => {
  const sk = figureAt(beat);
  const lag = figureAt(beat - 0.2);
  const p = sk.pose;
  const back = sk.cosT < 0;
  const sx = (sk.cosT < 0 ? -1 : 1) * Math.max(Math.abs(sk.cosT), 0.08);
  const shear = clamp((lag.pelvis[0] - sk.pelvis[0]) * 0.5, -18, 18);
  const flare = clamp((sk.pelvis[1] - lag.pelvis[1]) * 0.35, -8, 22) + sk.spread * 26;
  const tieSway = clamp((sk.chest[0] - lag.chest[0]) * 0.6, -24, 24);
  const neckTop = along(sk.neck, sk.headC, 0.55);

  const tails = (
    <>
      <Tail beat={beat} side={-1} />
      <Tail beat={beat} side={1} />
    </>
  );

  return (
    <g transform={`scale(${f(1 / Math.sqrt(p.squash))} ${f(p.squash)})`}>
      {back ? null : tails}
      <g transform={`scale(${f(sx)} 1)`}>
        <Leg hip={sk.hipL} knee={sk.knL} ankle={sk.anL} side={-1} lift={p.fLy} />
        <Leg hip={sk.hipR} knee={sk.knR} ankle={sk.anR} side={1} lift={p.fRy} />
        <g transform={`translate(${pt(sk.pelvis)}) rotate(${f(sk.pelvisAng)})`}>
          <Skirt shear={shear} flare={flare} />
        </g>
        <Ink w={6}>
          <Seg a={sk.chest} b={neckTop} ra={13} rb={12} fill={C.skin} />
        </Ink>
        <Seg a={along(sk.chest, neckTop, 0.45)} b={neckTop} ra={12.4} rb={11.4} fill={C.skinShade} capA={false} />
        <g transform={`translate(${pt(sk.pelvis)}) rotate(${f(sk.torsoAng)})`}>
          <Torso tieSway={tieSway} back={back} />
        </g>
        <g transform={`translate(${pt(sk.headC)}) rotate(${f(sk.headAng)})`}>
          <Head look={[p.lookX, p.lookY]} eyeL={p.eyeL} eyeR={p.eyeR} happy={p.happy} mouth={p.mouth} blush={p.blush} back={back} />
        </g>
        <Arm sh={sk.shL} el={sk.elL} ha={sk.haL} side={-1} shape={p.hsL} handRot={p.handLRot} />
        <Arm sh={sk.shR} el={sk.elR} ha={sk.haR} side={1} shape={p.hsR} handRot={p.handRRot} mark />
      </g>
      {back ? tails : null}
    </g>
  );
};
