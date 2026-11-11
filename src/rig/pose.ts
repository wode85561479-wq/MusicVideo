import {ease, EaseName, lerp} from './math';

export type HandShape = 'open' | 'fist' | 'point' | 'peace' | 'paw';

/**
 * A full body pose. Authoring space is "y up", ground at y = 0.
 * L / R always mean screen-left / screen-right.
 * Hand targets are relative to the chest (shoulder line centre).
 */
export interface Pose {
  hipX: number;
  hipY: number;
  lean: number; // torso rotation, + leans to screen right
  hipTilt: number;
  headTilt: number;
  lookX: number; // -1..1 fake head turn
  lookY: number;
  hLx: number;
  hLy: number;
  hRx: number;
  hRy: number;
  eLx: number; // preferred elbow direction (y up)
  eLy: number;
  eRx: number;
  eRy: number;
  handLRot: number;
  handRRot: number;
  fLx: number;
  fLy: number;
  fRx: number;
  fRy: number;
  knL: number; // -1 knee out to the left, +1 to the right
  knR: number;
  eyeL: number; // 0 closed .. 1 open
  eyeR: number;
  happy: number; // 0..1  closed "^ ^" eyes
  mouth: number; // 0 small smile .. 1 big open smile
  blush: number;
  squash: number;
  bounce: number; // automatic on-beat knee bounce amplitude
  hsL: HandShape;
  hsR: HandShape;
}

export const REST: Pose = {
  hipX: 0,
  hipY: 338,
  lean: 0,
  hipTilt: 0,
  headTilt: 0,
  lookX: 0,
  lookY: 0,
  hLx: -76,
  hLy: -168,
  hRx: 76,
  hRy: -168,
  eLx: -1,
  eLy: -0.4,
  eRx: 1,
  eRy: -0.4,
  handLRot: 0,
  handRRot: 0,
  fLx: -36,
  fLy: 0,
  fRx: 36,
  fRy: 0,
  knL: -0.6,
  knR: 0.6,
  eyeL: 1,
  eyeR: 1,
  happy: 0,
  mouth: 0.2,
  blush: 0.6,
  squash: 1,
  bounce: 10,
  hsL: 'open',
  hsR: 'open',
};

export const P = (o: Partial<Pose> = {}): Pose => ({...REST, ...o});

const NUM_KEYS = (Object.keys(REST) as (keyof Pose)[]).filter(
  (k) => typeof REST[k] === 'number',
) as Exclude<keyof Pose, 'hsL' | 'hsR'>[];

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const out = {...a} as Pose;
  for (const k of NUM_KEYS) {
    out[k] = lerp(a[k], b[k], t);
  }
  out.hsL = t > 0.5 ? b.hsL : a.hsL;
  out.hsR = t > 0.5 ? b.hsR : a.hsR;
  return out;
};

export interface Key {
  at: number; // beat on which the pose is reached
  move: number; // beats spent travelling into it (the rest is a hold)
  ease: EaseName;
  pose: Pose;
}

/** Pose-to-pose evaluation with holds: travel only during the last `move` beats before a key. */
export const evalKeys = (keys: Key[], beat: number): Pose => {
  if (beat <= keys[0].at) return keys[0].pose;
  const last = keys[keys.length - 1];
  if (beat >= last.at) return last.pose;
  let lo = 0;
  let hi = keys.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (keys[mid].at <= beat) lo = mid;
    else hi = mid;
  }
  const prev = keys[lo];
  const next = keys[hi];
  const move = Math.min(next.move, next.at - prev.at);
  const start = next.at - move;
  if (beat <= start) return prev.pose;
  const u = (beat - start) / move;
  const pose = lerpPose(prev.pose, next.pose, ease[next.ease](u));
  // Feet never slide: a foot that changes place on the ground is picked up in an arc.
  const arc = Math.sin(Math.PI * u);
  const stepL = Math.abs(next.pose.fLx - prev.pose.fLx);
  const stepR = Math.abs(next.pose.fRx - prev.pose.fRx);
  if (stepL > 8 && prev.pose.fLy < 4 && next.pose.fLy < 4) pose.fLy += arc * Math.min(34, stepL * 0.55);
  if (stepR > 8 && prev.pose.fRy < 4 && next.pose.fRy < 4) pose.fRy += arc * Math.min(34, stepR * 0.55);
  return pose;
};
