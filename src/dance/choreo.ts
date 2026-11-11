import {ease, EaseName, lerp} from '../rig/math';
import {evalKeys, Key, P, Pose} from '../rig/pose';
import {Skeleton, solve} from '../rig/solve';

export const BPM = 128;
export const FPS = 30;
export const TOTAL_BEATS = 64;
export const DURATION = Math.round(((TOTAL_BEATS * 60) / BPM) * FPS); // 900 frames = 30s
export const beatOf = (frame: number): number => ((frame / FPS) * BPM) / 60;

type PP = Partial<Pose>;

const keys: Key[] = [];
const k = (at: number, o: PP, move = 0.45, e: EaseName = 'snap') => {
  keys.push({at, move, ease: e, pose: P(o)});
};

/** Mirror a pose left <-> right. */
const mir = (o: PP): PP => {
  const p = P(o);
  return {
    ...p,
    hipX: -p.hipX,
    lean: -p.lean,
    hipTilt: -p.hipTilt,
    headTilt: -p.headTilt,
    lookX: -p.lookX,
    hLx: -p.hRx,
    hLy: p.hRy,
    hRx: -p.hLx,
    hRy: p.hLy,
    eLx: -p.eRx,
    eLy: p.eRy,
    eRx: -p.eLx,
    eRy: p.eLy,
    handLRot: -p.handRRot,
    handRRot: -p.handLRot,
    fLx: -p.fRx,
    fLy: p.fRy,
    fRx: -p.fLx,
    fRy: p.fLy,
    knL: -p.knR,
    knR: -p.knL,
    eyeL: p.eyeR,
    eyeR: p.eyeL,
    hsL: p.hsR,
    hsR: p.hsL,
  };
};

const HIPS: PP = {hLx: -50, hLy: -138, hRx: 50, hRy: -138, hsL: 'fist', hsR: 'fist'};
const HIP_L: PP = {hLx: -50, hLy: -138, hsL: 'fist'};

// ───────────────────────── A · entrance (0-8) ─────────────────────────
const FALL: PP = {
  hipY: 1420,
  fLx: -30,
  fRx: 42,
  fLy: 1105,
  fRy: 1080,
  hLx: -104,
  hLy: 150,
  hRx: 104,
  hRy: 150,
  mouth: 0.9,
  lookY: -0.4,
  bounce: 0,
};
k(0, FALL);
k(3.0, {...FALL, hipY: 346, fLy: 0, fRy: 0, fLx: -40, fRx: 44, hLx: -122, hLy: 118, hRx: 122, hRy: 118}, 1.0, 'in');
k(
  3.3,
  {
    hipY: 236,
    fLx: -54,
    fRx: 54,
    hLx: -128,
    hLy: -72,
    hRx: 128,
    hRy: -72,
    squash: 0.93,
    lookY: -0.5,
    mouth: 0.4,
    happy: 1,
    bounce: 0,
  },
  0.3,
  'out',
);
const TADA: PP = {
  ...HIP_L,
  hipX: -10,
  hipTilt: 7,
  lean: -3,
  headTilt: -8,
  hRx: 112,
  hRy: 160,
  fLx: -40,
  fRx: 52,
  mouth: 1,
  blush: 0.8,
  bounce: 10,
};
k(4.0, TADA, 0.5);
for (let i = 0; i < 5; i++) {
  const out = i % 2 === 0;
  k(4.75 + i * 0.5, {...TADA, hRx: out ? 134 : 94, hRy: out ? 150 : 166, handRRot: out ? 22 : -22, headTilt: out ? -5 : -9}, 0.4, 'inOut');
}
k(7.5, {...HIPS, hipY: 322, lookY: -0.2, mouth: 0.3, bounce: 6}, 0.5, 'inOut');

// ───────────────────────── B · hip sway (8-16) ─────────────────────────
for (let i = 0; i < 4; i++) {
  const s = i % 2 === 0 ? -1 : 1;
  k(8 + i, {
    ...HIPS,
    hipX: s * 24,
    hipTilt: s * 10,
    lean: -s * 4,
    headTilt: s * 9,
    lookX: s * 0.35,
    mouth: i % 2 ? 0.9 : 0.5,
    happy: i === 3 ? 1 : 0,
    bounce: 16,
  });
}
for (let i = 0; i < 4; i++) {
  const s = i % 2 === 0 ? -1 : 1;
  const left: PP = {
    hLx: -158,
    hLy: 6,
    hRx: -52,
    hRy: -24,
    hsR: 'fist',
    hsL: 'fist',
    hipX: 24,
    hipTilt: 9,
    lean: -6,
    headTilt: -8,
    lookX: -0.5,
    mouth: 0.8,
    bounce: 16,
  };
  k(12 + i, s < 0 ? left : mir(left));
}

// ───────────────────── C · "chika chika" cheek flick (16-24) ─────────────────────
const stepX = [
  {hipX: -30, fLx: -70, fRx: 36, s: -1},
  {hipX: -38, fLx: -70, fRx: -6, s: -1},
  {hipX: 30, fLx: -70, fRx: 70, s: 1},
  {hipX: 38, fLx: 6, fRx: 70, s: 1},
];
for (let j = 0; j < 8; j++) {
  const st = stepX[j >> 1];
  const flick = j % 2 === 0;
  k(
    16 + j / 2,
    {
      hLx: -98,
      hLy: 70,
      hRx: 98,
      hRy: 70,
      handLRot: flick ? -28 : 14,
      handRRot: flick ? 28 : -14,
      hipX: st.hipX,
      fLx: st.fLx,
      fRx: st.fRx,
      lean: st.s * 6,
      headTilt: st.s * 9,
      hipTilt: -st.s * 6,
      lookX: st.s * 0.3,
      mouth: flick ? 0.95 : 0.5,
      happy: (j >> 1) % 2,
      blush: 0.9,
      bounce: 14,
    },
    flick ? 0.42 : 0.25,
    flick ? 'snap' : 'inOut',
  );
}
const DISCO_UP: PP = {
  ...HIP_L,
  hRx: 150,
  hRy: 122,
  hsR: 'open',
  hipX: -18,
  hipTilt: -8,
  lean: 5,
  headTilt: 6,
  lookX: 0.6,
  lookY: 0.4,
  mouth: 1,
  bounce: 14,
};
const DISCO_DOWN: PP = {
  ...HIP_L,
  hRx: -72,
  hRy: -118,
  hsR: 'open',
  hipX: 14,
  hipTilt: 6,
  lean: -6,
  headTilt: -6,
  lookX: -0.5,
  lookY: -0.4,
  mouth: 0.6,
  bounce: 14,
};
k(20, DISCO_UP, 0.4);
k(21, DISCO_DOWN, 0.4);
k(22, mir(DISCO_UP), 0.4);
k(23, mir(DISCO_DOWN), 0.4);

// ───────────────────────── D · arm roll, jump, claps (24-32) ─────────────────────────
for (let q = 0; q <= 16; q++) {
  const phi = (q * Math.PI) / 2;
  const u = q / 16;
  const crouch = Math.sin(Math.PI * u);
  k(
    24 + q / 4,
    {
      hLx: -24 + 28 * Math.cos(phi),
      hLy: -50 + 24 * Math.sin(phi),
      hRx: 24 - 28 * Math.cos(phi),
      hRy: -50 - 24 * Math.sin(phi),
      hsL: 'fist',
      hsR: 'fist',
      hipY: 338 - 96 * crouch,
      lean: 6 * Math.sin(Math.PI * 4 * u),
      headTilt: -7 * Math.sin(Math.PI * 4 * u),
      lookY: -0.3 * crouch,
      fLx: -48,
      fRx: 48,
      knL: 0.4,
      knR: -0.4,
      mouth: 0.7,
      bounce: 5,
    },
    0.25,
    'linear',
  );
}
k(28.45, {hipY: 286, hLx: -72, hLy: -150, hRx: 72, hRy: -150, hsL: 'fist', hsR: 'fist', fLx: -44, fRx: 44, lookY: -0.3, squash: 0.95, bounce: 0}, 0.4, 'inOut');
k(
  29.0,
  {
    hipY: 446,
    fLx: -52,
    fRx: 46,
    fLy: 138,
    fRy: 118,
    hLx: -98,
    hLy: 165,
    hRx: 98,
    hRy: 165,
    mouth: 1,
    happy: 1,
    squash: 1.05,
    lookY: 0.4,
    bounce: 0,
  },
  0.5,
  'out',
);
k(29.55, {hipY: 288, fLx: -46, fRx: 46, hLx: -122, hLy: -40, hRx: 122, hRy: -40, squash: 0.94, mouth: 0.7, bounce: 0}, 0.5, 'in');
const CLAP: PP = {
  hLx: -128,
  hLy: 52,
  hRx: -104,
  hRy: 48,
  lean: -7,
  hipX: 18,
  hipTilt: 7,
  headTilt: 9,
  lookX: -0.6,
  lookY: 0,
  mouth: 1,
  bounce: 12,
};
const APART: PP = {...CLAP, hLx: -150, hLy: 40, hRx: -62, hRy: 30, mouth: 0.6};
k(30, CLAP, 0.4);
k(30.5, APART, 0.25, 'inOut');
k(31, mir(CLAP), 0.4);
k(31.5, mir(APART), 0.25, 'inOut');

// ───────────────────────── E · march, spin, peace (32-40) ─────────────────────────
for (let i = 0; i < 4; i++) {
  const lift: PP = {
    fLy: 96,
    fLx: -30,
    hipY: 344,
    hRx: 62,
    hRy: -8,
    hLx: -86,
    hLy: -150,
    hsL: 'fist',
    hsR: 'fist',
    lean: 3,
    hipTilt: 5,
    headTilt: -6,
    mouth: 0.85,
    bounce: 0,
  };
  k(32 + i, i % 2 === 0 ? lift : mir(lift), 0.38);
  k(32.5 + i, {hipY: 328, hLx: -74, hLy: -122, hRx: 74, hRy: -122, hsL: 'fist', hsR: 'fist', mouth: 0.5, bounce: 0}, 0.3, 'inOut');
}
k(36.0, {hipY: 320, hLx: 6, hLy: -70, hRx: 92, hRy: -52, lean: -6, lookX: -0.5, mouth: 0.4, bounce: 0}, 0.4, 'inOut');
k(36.8, {hipY: 350, hLx: -150, hLy: -30, hRx: 150, hRy: -30, fLx: -14, fRx: 14, mouth: 0.9, happy: 1, bounce: 0}, 0.6, 'inOut');
const PEACE: PP = {
  ...HIP_L,
  hRx: 90,
  hRy: 84,
  hsR: 'peace',
  handRRot: 24,
  eRx: 1,
  eRy: -0.8,
  eyeL: 0,
  hipX: 14,
  hipTilt: -9,
  lean: 5,
  headTilt: 11,
  lookX: 0.15,
  fLx: -62,
  fRx: 30,
  mouth: 1,
  blush: 1,
  bounce: 8,
};
k(38, PEACE, 0.45);

// ───────────────────────── F · big wave + cat paws (40-48) ─────────────────────────
for (let i = 0; i < 4; i++) {
  const s = i % 2 === 0 ? -1 : 1;
  k(40 + i, {
    hLx: -112 + s * 38,
    hLy: 152,
    hRx: 112 + s * 38,
    hRy: 152,
    handLRot: s * 16,
    handRRot: s * 16,
    lean: s * 7,
    hipX: s * 34,
    fLx: -36 + s * 34,
    fRx: 36 + s * 34,
    headTilt: s * 8,
    happy: 1,
    mouth: 0.9,
    bounce: 14,
  });
}
for (let i = 0; i < 4; i++) {
  const s = i % 2 === 0 ? -1 : 1;
  k(44 + i, {
    hLx: -80,
    hLy: s < 0 ? 72 : 50,
    hRx: 80,
    hRy: s > 0 ? 72 : 50,
    hsL: 'paw',
    hsR: 'paw',
    handLRot: s < 0 ? -30 : 10,
    handRRot: s > 0 ? 30 : -10,
    lean: s * 8,
    headTilt: s * 12,
    hipX: -s * 18,
    hipTilt: -s * 8,
    lookX: s * 0.3,
    happy: i % 2,
    mouth: 0.9,
    blush: 1,
    bounce: 14,
  });
}

// ───────────────────────── G · heart, double spin, final (48-64) ─────────────────────────
k(48.5, {hLx: -15, hLy: -22, hRx: 15, hRy: -22, hsL: 'fist', hsR: 'fist', hipY: 318, knL: 0.5, knR: -0.5, headTilt: 7, lookY: -0.35, happy: 1, mouth: 0.3, blush: 1, bounce: 8}, 0.6, 'inOut');
k(50, {hLx: -128, hLy: 30, hRx: 128, hRy: 30, hipY: 342, lookY: 0.2, mouth: 1, headTilt: -5, bounce: 12}, 0.4);
const SWAY: PP = {hLx: -136, hLy: 62, hRx: 112, hRy: 8, lean: -6, hipX: 12, headTilt: -8, mouth: 0.8, bounce: 12};
k(51, SWAY);
k(52, mir(SWAY));
k(52.8, {hipY: 276, hLx: -38, hLy: -60, hRx: 38, hRy: -60, hsL: 'fist', hsR: 'fist', knL: 0.5, knR: -0.5, lean: -7, lookX: -0.5, lookY: -0.3, mouth: 0.3, squash: 0.96, bounce: 0}, 0.5, 'inOut');
k(54, {hipY: 350, hLx: -150, hLy: -20, hRx: 150, hRy: -20, fLx: -12, fRx: 12, mouth: 0.9, bounce: 0}, 1.0, 'inOut');
k(55.2, {hipY: 346, hLx: -96, hLy: 96, hRx: 96, hRy: 96, fLx: -16, fRx: 16, mouth: 1, happy: 1, bounce: 0}, 0.8, 'inOut');
k(55.72, {hipY: 300, hLx: -30, hLy: -30, hRx: 30, hRy: -30, hsL: 'fist', hsR: 'fist', knL: 0.5, knR: -0.5, lookY: -0.3, squash: 0.95, bounce: 0}, 0.4, 'inOut');
const FINAL: PP = {
  ...HIP_L,
  hRx: 104,
  hRy: 168,
  hsR: 'peace',
  hipX: -14,
  hipTilt: 9,
  lean: -4,
  headTilt: -9,
  lookX: 0.15,
  lookY: 0.2,
  eyeL: 0,
  mouth: 1,
  blush: 0.9,
  fLx: -44,
  fRx: 66,
  bounce: 6,
};
k(56, FINAL, 0.28);
k(60, {
  hLx: -84,
  hLy: 82,
  hRx: 84,
  hRy: 82,
  hsL: 'peace',
  hsR: 'peace',
  handLRot: -24,
  handRRot: 24,
  eLy: -0.8,
  eRy: -0.8,
  headTilt: 8,
  hipTilt: -6,
  lean: 3,
  happy: 1,
  mouth: 1,
  blush: 1,
  bounce: 8,
});
k(TOTAL_BEATS, {
  hLx: -84,
  hLy: 82,
  hRx: 84,
  hRy: 82,
  hsL: 'peace',
  hsR: 'peace',
  handLRot: -24,
  handRRot: 24,
  eLy: -0.8,
  eRy: -0.8,
  headTilt: 8,
  hipTilt: -6,
  lean: 3,
  happy: 1,
  mouth: 1,
  blush: 1,
  bounce: 8,
}, 0.1);

keys.sort((a, b) => a.at - b.at);

// Spins live on their own track so poses never have to "unwind" 360 degrees.
const spins = [
  {start: 36.1, dur: 1.4, turns: 1},
  {start: 53.0, dur: 2.2, turns: 2},
];

const blinkAt = (beat: number): number => {
  // a quick blink roughly every 5 beats, never on a downbeat pose
  const period = 5.3;
  const ph = (((beat + 1.7) % period) + period) % period;
  if (ph > 0.42) return 1;
  return Math.abs(ph - 0.21) / 0.21;
};

export const figureAt = (beat: number): Skeleton => {
  const p = {...evalKeys(keys, beat)};
  const pulse = 0.5 + 0.5 * Math.cos(2 * Math.PI * beat);
  p.hipY -= p.bounce * pulse;
  p.headTilt += p.bounce * 0.06 * Math.sin(2 * Math.PI * beat);
  p.mouth *= 0.72 + 0.28 * Math.abs(Math.sin(Math.PI * beat * 2 + 0.6));
  const bl = blinkAt(beat);
  p.eyeL = Math.min(p.eyeL, bl);
  p.eyeR = Math.min(p.eyeR, bl);

  let turn = 0;
  let spread = 0;
  for (const s of spins) {
    const u = (beat - s.start) / s.dur;
    if (u > 0 && u < 1) {
      turn = 360 * s.turns * ease.inOut(u);
      spread = Math.sin(Math.PI * u);
    }
  }
  return solve(p, turn, spread);
};

// ───────────────────────── camera ─────────────────────────
export interface Cam {
  x: number;
  y: number;
  s: number;
  r: number;
}
const c = (x: number, y: number, s: number, r = 0): Cam => ({x, y, s, r});
interface Shot {
  at: number;
  a: Cam;
  b: Cam;
  palette: number;
}
export const shots: Shot[] = [
  {at: 0, a: c(0, -400, 0.95), b: c(0, -385, 1.05), palette: 0},
  {at: 4, a: c(0, -385, 1.25), b: c(0, -390, 1.33), palette: 0},
  {at: 8, a: c(0, -360, 1.15), b: c(0, -360, 1.2), palette: 1},
  {at: 12, a: c(-30, -365, 1.2, -3), b: c(30, -365, 1.26, -3), palette: 1},
  {at: 16, a: c(0, -520, 1.85), b: c(0, -526, 1.96), palette: 2},
  {at: 20, a: c(0, -385, 1.15, 2), b: c(0, -385, 1.21, 2), palette: 2},
  {at: 24, a: c(0, -330, 1.3), b: c(0, -330, 1.36), palette: 3},
  {at: 28, a: c(0, -420, 1.0), b: c(0, -420, 1.06), palette: 3},
  {at: 32, a: c(0, -360, 1.2), b: c(0, -360, 1.25), palette: 0},
  {at: 36, a: c(0, -372, 1.1), b: c(0, -380, 1.2), palette: 0},
  {at: 38, a: c(22, -584, 2.45, 4), b: c(22, -588, 2.62, 4), palette: 2},
  {at: 40, a: c(0, -400, 1.0), b: c(0, -400, 1.06), palette: 1},
  {at: 44, a: c(0, -530, 1.9, -2), b: c(0, -534, 2.0, -2), palette: 3},
  {at: 48, a: c(0, -500, 1.8), b: c(0, -506, 1.95), palette: 2},
  {at: 50, a: c(0, -385, 1.2), b: c(0, -385, 1.26), palette: 2},
  {at: 52, a: c(0, -392, 1.0), b: c(0, -384, 1.15), palette: 0},
  {at: 56, a: c(12, -402, 1.3, -3), b: c(12, -408, 1.37, -3), palette: 1},
  {at: 60, a: c(0, -582, 2.3, 3), b: c(0, -586, 2.45, 3), palette: 2},
];

export const shotAt = (beat: number): {cam: Cam; index: number; since: number; palette: number} => {
  let i = 0;
  for (let j = 0; j < shots.length; j++) if (shots[j].at <= beat) i = j;
  const sh = shots[i];
  const end = i + 1 < shots.length ? shots[i + 1].at : TOTAL_BEATS;
  const u = Math.min(1, Math.max(0, (beat - sh.at) / (end - sh.at)));
  // impact shake on the landing and on the final pose
  let shake = 0;
  for (const hit of [3.0, 29.55, 56]) {
    const d = beat - hit;
    if (d >= 0 && d < 0.8) shake = Math.max(shake, (1 - d / 0.8) ** 2);
  }
  const sx = Math.sin(beat * 47) * 9 * shake;
  const sy = Math.cos(beat * 61) * 12 * shake;
  return {
    cam: {
      x: lerp(sh.a.x, sh.b.x, u) + sx,
      y: lerp(sh.a.y, sh.b.y, u) + sy,
      s: lerp(sh.a.s, sh.b.s, u),
      r: lerp(sh.a.r, sh.b.r, u),
    },
    index: i,
    since: beat - sh.at,
    palette: sh.palette,
  };
};
