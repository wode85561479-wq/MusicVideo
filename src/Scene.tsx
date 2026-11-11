import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Miku, MikuDefs} from './character/Miku';
import {beatOf, shotAt} from './dance/choreo';
import {f} from './rig/math';

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = beatOf(frame);
  const {cam} = shotAt(beat);
  return (
    <AbsoluteFill style={{backgroundColor: '#ffe3ee'}}>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
        <MikuDefs />
        <g transform={`translate(960 540) rotate(${f(cam.r)}) scale(${f(cam.s)}) translate(${f(-cam.x)} ${f(-cam.y)})`}>
          <rect x={-3000} y={0} width={6000} height={800} fill="#f7c9dc" />
          <Miku beat={beat} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
