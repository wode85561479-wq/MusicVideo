import React from 'react';
import {Composition} from 'remotion';
import {DURATION, FPS} from './dance/choreo';
import {Scene} from './Scene';

export const Root: React.FC = () => (
  <Composition id="MikuDance" component={Scene} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
);
