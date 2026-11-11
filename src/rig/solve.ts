import {add, clamp, dot, len, mul, norm, perp, rot, sub, V} from './math';
import {Pose} from './pose';

export const DIM = {
  thigh: 160,
  shin: 165,
  torso: 170,
  neck: 28,
  headUp: 62,
  hipW: 29,
  shW: 50,
  upper: 100,
  fore: 92,
  ankle: 26,
};

/** Apparent width of a flat figure turned by `cosT`: stays readable, then flips to the back view. */
export const turnScale = (cosT: number): number => (cosT < 0 ? -1 : 1) * Math.max(Math.pow(Math.abs(cosT), 0.6), 0.3);

export interface Skeleton {
  pose: Pose;
  turn: number;
  spread: number;
  cosT: number;
  pelvis: V;
  pelvisAng: number;
  torsoAng: number;
  chest: V;
  neck: V;
  headC: V;
  headAng: number;
  shL: V;
  shR: V;
  elL: V;
  elR: V;
  haL: V;
  haR: V;
  hipL: V;
  hipR: V;
  knL: V;
  knR: V;
  anL: V;
  anR: V;
  tailL: V;
  tailR: V;
}

/**
 * Two bone IK for a flat rig. `side` < 1 keeps part of the bend "towards the camera",
 * which reads as foreshortening instead of a sideways chicken-wing.
 */
const ik = (a: V, target: V, l1: number, l2: number, pref: V, side: number): {joint: V; end: V} => {
  const d0 = len(sub(target, a));
  const L = l1 + l2;
  const dir = norm(sub(target, a));
  if (d0 >= L * 0.999) {
    return {joint: add(a, mul(dir, l1)), end: add(a, mul(dir, L))};
  }
  const d = Math.max(d0, 1);
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const n = perp(dir);
  const bend = clamp(dot(n, norm(pref)) * 3, -1, 1);
  return {joint: add(add(a, mul(dir, along)), mul(n, h * bend * side)), end: target};
};

export const solve = (pose: Pose, turn = 0, spread = 0): Skeleton => {
  const pelvis: V = [pose.hipX, -pose.hipY];
  const torsoAng = pose.lean;
  const pelvisAng = pose.hipTilt + pose.lean * 0.3;
  const chest = add(pelvis, rot([0, -DIM.torso], torsoAng));
  const neck = add(chest, rot([0, -DIM.neck], torsoAng));
  const headAng = pose.lean * 0.5 + pose.headTilt;
  const headC = add(neck, rot([0, -DIM.headUp], headAng));
  const shL = add(chest, rot([-DIM.shW, 6], torsoAng));
  const shR = add(chest, rot([DIM.shW, 6], torsoAng));
  const hipL = add(pelvis, rot([-DIM.hipW, 8], pelvisAng));
  const hipR = add(pelvis, rot([DIM.hipW, 8], pelvisAng));

  const armL = ik(shL, add(chest, [pose.hLx, -pose.hLy]), DIM.upper, DIM.fore, [pose.eLx, -pose.eLy], 0.92);
  const armR = ik(shR, add(chest, [pose.hRx, -pose.hRy]), DIM.upper, DIM.fore, [pose.eRx, -pose.eRy], 0.92);
  const legL = ik(hipL, [pose.fLx, -(pose.fLy + DIM.ankle)], DIM.thigh, DIM.shin, [Math.sign(pose.knL) || 1, 0.15], 0.42 * Math.min(1, Math.abs(pose.knL)));
  const legR = ik(hipR, [pose.fRx, -(pose.fRy + DIM.ankle)], DIM.thigh, DIM.shin, [Math.sign(pose.knR) || 1, 0.15], 0.42 * Math.min(1, Math.abs(pose.knR)));

  return {
    pose,
    turn,
    spread,
    cosT: Math.cos((turn * Math.PI) / 180),
    pelvis,
    pelvisAng,
    torsoAng,
    chest,
    neck,
    headC,
    headAng,
    shL,
    shR,
    elL: armL.joint,
    elR: armR.joint,
    haL: armL.end,
    haR: armR.end,
    hipL,
    hipR,
    knL: legL.joint,
    knR: legR.joint,
    anL: legL.end,
    anR: legR.end,
    tailL: add(headC, rot([-80, -46], headAng)),
    tailR: add(headC, rot([80, -46], headAng)),
  };
};
