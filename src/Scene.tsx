import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Miku, MikuDefs} from './character/Miku';
import {beatOf, figureAt, shotAt, TOTAL_BEATS} from './dance/choreo';
import {clamp, ease, f} from './rig/math';
import {turnScale} from './rig/solve';
import {Backdrop, Floor, PALETTES} from './stage/Background';
import {Bursts, FocusLines, StageFx} from './stage/Fx';

const Title: React.FC<{beat: number}> = ({beat}) => {
  const inn = ease.out(clamp((beat - 4.0) / 0.5));
  const out = clamp((beat - 7.4) / 0.5);
  if (inn <= 0 || out >= 1) return null;
  const x = 80 - (1 - inn) * 500 - out * 700;
  return (
    <g transform={`translate(${f(x)} 900) rotate(-4)`} opacity={f(1 - out)}>
      <rect x={-30} y={-92} width={640} height={140} rx={18} fill="#ffffff" opacity={0.88} transform="skewX(-12)" />
      <rect x={-30} y={-92} width={18} height={150} fill="#35c9be" transform="skewX(-12)" />
      <text x={14} y={-28} fontFamily="Inter, sans-serif" fontWeight={900} fontStyle="italic" fontSize={58} fill="#1d3344" letterSpacing={-2}>
        MIKU <tspan fill="#ec4d86">x</tspan> CHIKA DANCE
      </text>
      <text x={18} y={30} fontFamily="Inter, sans-serif" fontWeight={700} fontSize={26} fill="#22a7a6" letterSpacing={5}>
        FAN ANIMATION · 128 BPM
      </text>
    </g>
  );
};

const Opening: React.FC<{beat: number}> = ({beat}) => {
  const inn = ease.snap(clamp((beat - 0.5) / 0.5));
  const out = clamp((beat - 2.5) / 0.4);
  if (inn <= 0 || out >= 1) return null;
  return (
    <g transform={`translate(960 ${f(500 - out * 60)}) rotate(-4) scale(${f(0.6 + 0.4 * inn)})`} opacity={f(Math.min(inn, 1) * (1 - out))}>
      <text textAnchor="middle" y={0} fontFamily="Inter, sans-serif" fontWeight={900} fontStyle="italic" fontSize={150} fill="#ffffff" stroke="#ffffff" strokeWidth={34} strokeLinejoin="round" letterSpacing={-4}>
        MIKU x CHIKA DANCE
      </text>
      <text textAnchor="middle" y={0} fontFamily="Inter, sans-serif" fontWeight={900} fontStyle="italic" fontSize={150} fill="#1d3344" letterSpacing={-4}>
        <tspan fill="#22b3ac">MIKU</tspan> <tspan fill="#ec4d86">x</tspan> CHIKA DANCE
      </text>
      <text textAnchor="middle" y={78} fontFamily="Inter, sans-serif" fontWeight={800} fontSize={38} fill="#ec4d86" letterSpacing={14}>
        FAN ANIMATION
      </text>
    </g>
  );
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = beatOf(frame);
  const shot = shotAt(beat);
  const pal = PALETTES[shot.palette];
  const pulse = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * beat), 4);
  const cam = {...shot.cam, s: shot.cam.s * (1 + 0.008 * pulse)};
  const sk = figureAt(beat);
  const air = Math.min(sk.pose.fLy, sk.pose.fRy);
  const shadowK = clamp(1 - air / 420, 0.15, 1);
  const camT = `translate(960 540) rotate(${f(cam.r)}) scale(${f(cam.s)}) translate(${f(-cam.x)} ${f(-cam.y)})`;
  const bgS = 1 + (cam.s - 1) * 0.16;
  const bgT = `translate(960 540) rotate(${f(cam.r)}) scale(${f(bgS)}) translate(${f(-960 - cam.x * 0.2)} ${f(-540 - (cam.y + 390) * 0.2)})`;
  const cutFlash = shot.index > 0 ? clamp(1 - shot.since / 0.22) * 0.38 : 0;
  const fadeIn = 1 - clamp(beat / 0.8);
  const fadeOut = clamp((beat - (TOTAL_BEATS - 1.6)) / 1.5);
  const white = Math.max(cutFlash, fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{backgroundColor: pal.top}}>
      <Audio src={staticFile('music.wav')} />
      <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
        <MikuDefs />
        <defs>
          <linearGradient id="reflFade" x1="0" y1="0" x2="0" y2="360" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity={0.5} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id="reflMask" maskUnits="userSpaceOnUse" x={-2000} y={0} width={4000} height={400}>
            <rect x={-2000} y={0} width={4000} height={400} fill="url(#reflFade)" />
          </mask>
          <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.6" stopColor="#3a1d4a" stopOpacity={0} />
            <stop offset="1" stopColor="#3a1d4a" stopOpacity={0.28} />
          </radialGradient>
          <g id="mikuFig">
            <Miku beat={beat} />
          </g>
        </defs>

        <g transform={bgT}>
          <Backdrop beat={beat} pal={pal} />
        </g>
        <g transform={camT}>
          <Floor beat={beat} pal={pal} />
          <g mask="url(#reflMask)">
            <use href="#mikuFig" transform="scale(1 -1)" />
          </g>
          <ellipse cx={f(sk.pelvis[0] * turnScale(sk.cosT))} cy={6} rx={f(150 * shadowK)} ry={f(20 * shadowK)} fill={pal.shadow} opacity={f(0.34 * shadowK)} />
          <Bursts beat={beat} pal={pal} />
          <use href="#mikuFig" />
          <StageFx beat={beat} />
        </g>
        <FocusLines beat={beat} frame={frame} />
        <rect width={1920} height={1080} fill="url(#vignette)" />
        <Opening beat={beat} />
        <Title beat={beat} />
        {white > 0 ? <rect width={1920} height={1080} fill="#ffffff" opacity={f(white)} /> : null}
      </svg>
    </AbsoluteFill>
  );
};
