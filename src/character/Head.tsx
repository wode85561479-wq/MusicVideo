import React from 'react';
import {f} from '../rig/math';
import {C} from './palette';
import {Ink} from './parts';

const FACE = 'M -72 -25 C -74 20, -50 62, -12 80 Q 0 85 12 80 C 50 62, 74 20, 72 -25 C 72 -95, -72 -95, -72 -25 Z';
const BACK_CAP =
  'M -90 -20 C -96 -126, 96 -126, 90 -20 C 94 30, 86 64, 74 86 L 58 40 L -58 40 L -74 86 C -86 64, -94 30, -90 -20 Z';
const BANGS = `M -84 96
  C -94 60, -98 6, -92 -30
  C -92 -124, 92 -124, 92 -30
  C 98 6, 94 60, 84 96
  C 80 70, 74 44, 68 14
  Q 66 -4, 62 -20
  Q 58 -2, 50 6
  Q 46 -14, 40 -27
  Q 36 -8, 24 2
  Q 22 -16, 14 -31
  Q 10 -6, 0 14
  Q -6 -8, -12 -31
  Q -18 -12, -26 2
  Q -30 -14, -40 -27
  Q -46 -8, -52 6
  Q -58 -6, -62 -20
  Q -66 -4, -68 14
  C -74 44, -80 70, -84 96 Z`;
/** Back of the head: one smooth cap of hair, parted in the middle. */
const BACK_FULL =
  'M -90 -20 C -96 -126, 96 -126, 90 -20 C 94 34, 70 78, 30 92 Q 0 100 -30 92 C -70 78, -94 34, -90 -20 Z';

const Eye: React.FC<{side: -1 | 1; open: number; happy: number}> = ({side, open, happy}) => {
  const id = side < 0 ? 'eyeClipL' : 'eyeClipR';
  const lid = (1 - open) * 27; // how far the upper lid has come down
  if (happy > 0.5) {
    return (
      <g transform={`translate(${side * 33} 14)`} fill="none" stroke={C.line} strokeLinecap="round" strokeLinejoin="round">
        <path d="M -19 9 Q 0 -13 19 9" strokeWidth={5.2} />
        <path d={side < 0 ? 'M -19 9 l -5 -3' : 'M 19 9 l 5 -3'} strokeWidth={3} />
      </g>
    );
  }
  if (open < 0.2) {
    return (
      <g transform={`translate(${side * 33} 14)`} fill="none" stroke={C.line} strokeLinecap="round">
        <path d="M -20 7 Q 0 17 20 7" strokeWidth={4.8} />
        <path d={side < 0 ? 'M -20 7 l -6 4' : 'M 20 7 l 6 4'} strokeWidth={3} />
      </g>
    );
  }
  return (
    <g transform={`translate(${side * 33} 14)`}>
      <clipPath id={id}>
        <ellipse cx={0} cy={0} rx={18.5} ry={20.5} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <ellipse cx={0} cy={0} rx={18.5} ry={20.5} fill="#ffffff" />
        <ellipse cx={0} cy={-13} rx={22} ry={10} fill="#cfe0ee" />
        <ellipse cx={side * -1} cy={2} rx={14} ry={17.5} fill="url(#irisGrad)" stroke="#0b4654" strokeWidth={1.8} />
        <ellipse cx={side * -1} cy={-7} rx={14} ry={9} fill="#0a4f5e" opacity={0.55} />
        <ellipse cx={side * -1} cy={1} rx={5.6} ry={8.6} fill="#06323e" />
        <ellipse cx={side * -1} cy={12} rx={8.5} ry={4.6} fill="#d2fff6" opacity={0.7} />
        <circle cx={-6.5} cy={-8} r={5} fill="#ffffff" />
        <circle cx={6.5} cy={8.5} r={2.4} fill="#ffffff" />
        <rect x={-24} y={-26} width={48} height={f(5 + lid)} fill={C.skin} />
      </g>
      <g transform={`translate(0 ${f(lid)}) scale(${-side} ${f(1 - (1 - open) * 0.55)})`}>
        {/* drawn for the screen-right eye and mirrored: outer corner is at +x */}
        <path
          d="M 23.5 -1 L 19.6 -4.5 C 16 -13, 9 -17.6, 0 -18.4 C -9 -19, -16 -14.6, -19.4 -5 C -15.5 -18, -6 -24.4, 3.5 -23.4 C 13 -22.4, 19.4 -16, 23.5 -1 Z"
          fill={C.line}
        />
        <path d="M 21 -9 l 6 -5" stroke={C.line} strokeWidth={2.6} strokeLinecap="round" />
      </g>
      <path d={side < 0 ? 'M -15 17 Q -5 22.5 7 20.5' : 'M 15 17 Q 5 22.5 -7 20.5'} stroke="#8a5a5c" strokeWidth={1.7} strokeLinecap="round" fill="none" opacity={0.65} />
    </g>
  );
};

const Mouth: React.FC<{m: number}> = ({m}) => {
  if (m < 0.14) {
    return <path d="M -8 56 Q 0 62.5 8 56" stroke={C.line} strokeWidth={2.8} strokeLinecap="round" fill="none" />;
  }
  const w = 7 + 6.5 * m;
  const h = 3 + 16 * m;
  return (
    <g transform="translate(0 54)">
      <path
        d={`M ${f(-w)} 0 Q 0 3 ${f(w)} 0 Q ${f(w * 0.9)} ${f(h)} 0 ${f(h)} Q ${f(-w * 0.9)} ${f(h)} ${f(-w)} 0 Z`}
        fill="#b63b58"
        stroke={C.line}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      {m > 0.45 ? <ellipse cx={0} cy={f(h * 0.74)} rx={f(w * 0.5)} ry={f(h * 0.2)} fill="#ff9db0" /> : null}
      {m > 0.45 ? <path d={`M ${f(-w * 0.72)} 1.6 Q 0 4.4 ${f(w * 0.72)} 1.6 L ${f(w * 0.6)} 3.6 Q 0 6.4 ${f(-w * 0.6)} 3.6 Z`} fill="#ffffff" /> : null}
    </g>
  );
};

const HairTie: React.FC<{side: -1 | 1}> = ({side}) => (
  <g transform={`translate(${side * 82} -47) rotate(${side * 28})`}>
    <rect x={-17} y={-15} width={34} height={30} rx={5} fill={C.black} stroke={C.line} strokeWidth={3.5} />
    <rect x={-17} y={-4.5} width={34} height={9} fill={C.pink} />
    <rect x={-13} y={-12} width={26} height={3} rx={1.5} fill={C.blackLight} />
  </g>
);

export const Head: React.FC<{
  look: [number, number];
  eyeL: number;
  eyeR: number;
  happy: number;
  mouth: number;
  blush: number;
  back: boolean;
}> = ({look, eyeL, eyeR, happy, mouth, blush, back}) => {
  if (back) {
    return (
      <g>
        <Ink>
          <path d={BACK_FULL} fill="url(#hairGrad)" />
        </Ink>
        <g fill="none" stroke={C.hairDeep} strokeWidth={2.2} strokeLinecap="round" opacity={0.6}>
          <path d="M 0 -108 Q -4 -40 0 92" />
          <path d="M -30 -100 Q -62 -30 -44 76" />
          <path d="M 30 -100 Q 62 -30 44 76" />
        </g>
        <path d="M -64 -50 Q -30 -76 0 -70 Q 30 -76 64 -50" stroke={C.hairLight} strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.8} />
        <HairTie side={-1} />
        <HairTie side={1} />
      </g>
    );
  }
  const fx = look[0] * 9;
  const fy = look[1] * 6;
  return (
    <g>
      <defs>
        <clipPath id="faceClip">
          <path d={FACE} />
        </clipPath>
      </defs>
      <Ink>
        <path d={BACK_CAP} fill={C.hairShade} />
      </Ink>
      <Ink w={6}>
        <path d={FACE} fill={C.skin} />
      </Ink>
      <g clipPath="url(#faceClip)">
        {/* cast shadow of the fringe */}
        <path d={BANGS} transform={`translate(${f(fx * 0.4)} ${f(8 + fy * 0.3)})`} fill={C.skinShade} opacity={0.85} />
      </g>

      <g transform={`translate(${f(fx * 0.45)} ${f(fy * 0.35)})`}>
        <Ink>
          <path d={BANGS} fill="url(#hairGrad)" />
        </Ink>
        <g fill="none" stroke={C.hairDeep} strokeWidth={2} strokeLinecap="round" opacity={0.55}>
          <path d="M -40 -27 Q -46 -62 -34 -96" />
          <path d="M -12 -31 Q -18 -66 -8 -104" />
          <path d="M 14 -31 Q 18 -66 10 -104" />
          <path d="M 40 -27 Q 48 -62 36 -96" />
          <path d="M -76 20 Q -84 60 -82 88" />
          <path d="M 76 20 Q 84 60 82 88" />
        </g>
        <g fill="none" stroke={C.hairLight} strokeWidth={8} strokeLinecap="round" opacity={0.85}>
          <path d="M -70 -44 Q -54 -64 -34 -66" />
          <path d="M -20 -70 Q 0 -75 16 -71" />
          <path d="M 32 -67 Q 56 -62 70 -44" />
        </g>
        <g fill="none" stroke="#e3fffa" strokeWidth={3} strokeLinecap="round" opacity={0.9}>
          <path d="M -62 -52 Q -50 -62 -40 -64" />
          <path d="M 40 -64 Q 54 -60 62 -52" />
        </g>
      </g>

      <g transform={`translate(${f(fx)} ${f(fy)})`}>
        <g opacity={f(0.2 + 0.5 * blush)}>
          <ellipse cx={-45} cy={42} rx={14} ry={7.5} fill="#ff8fa3" />
          <ellipse cx={45} cy={42} rx={14} ry={7.5} fill="#ff8fa3" />
          <g stroke="#e9607c" strokeWidth={1.6} strokeLinecap="round">
            <path d="M -51 45 l 3 -6 M -46 45 l 3 -6 M -41 45 l 3 -6" />
            <path d="M 39 45 l 3 -6 M 44 45 l 3 -6 M 49 45 l 3 -6" />
          </g>
        </g>
        <Eye side={-1} open={eyeL} happy={happy} />
        <Eye side={1} open={eyeR} happy={happy} />
        <path d="M -1 39 q 2.5 3 0.5 5" stroke="#d9958a" strokeWidth={2.2} strokeLinecap="round" fill="none" />
        <Mouth m={mouth} />
        <g fill="none" stroke={C.hairDeep} strokeWidth={3} strokeLinecap="round">
          <path d={`M -50 ${f(-13 - happy * 3)} Q -35 ${f(-22 - happy * 3)} -18 ${f(-16 - happy * 3)}`} />
          <path d={`M 50 ${f(-13 - happy * 3)} Q 35 ${f(-22 - happy * 3)} 18 ${f(-16 - happy * 3)}`} />
        </g>
      </g>

      {/* headset */}
      <g>
        <rect x={-88} y={-10} width={15} height={36} rx={6} fill={C.black} stroke={C.line} strokeWidth={3} />
        <rect x={73} y={-10} width={15} height={36} rx={6} fill={C.black} stroke={C.line} strokeWidth={3} />
        <rect x={-86} y={3} width={11} height={5} fill={C.pink} />
        <rect x={75} y={3} width={11} height={5} fill={C.pink} />
        <path d="M -80 24 Q -78 58 -48 64" stroke={C.black} strokeWidth={4} strokeLinecap="round" fill="none" />
        <ellipse cx={-46} cy={64} rx={6.5} ry={4.5} fill={C.black} stroke={C.line} strokeWidth={2} />
      </g>
      <HairTie side={-1} />
      <HairTie side={1} />
    </g>
  );
};
