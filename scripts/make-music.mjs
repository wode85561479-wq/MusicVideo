// Renders the original backing track (public/music.wav) for the dance.
// Everything is synthesised here from scratch: no samples, no existing melody.
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const SR = 44100;
const BPM = 128;
const BEAT = 60 / BPM;
const TOTAL_BEATS = 64;
const N = Math.round(TOTAL_BEATS * BEAT * SR);
const drums = [new Float32Array(N), new Float32Array(N)];
const music = [new Float32Array(N), new Float32Array(N)];

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296 - 0.5;
};

/** Generic voice: `osc(phase, t)` -> sample, with an ADSR-ish envelope, one-pole low-pass and pan. */
const voice = (bus, beat, durBeats, opts) => {
  const {f = 440, vol = 0.2, pan = 0, a = 0.004, r = 0.06, decay = 0, osc, cutoff = 0, glide = 0} = opts;
  const start = Math.round(beat * BEAT * SR);
  const dur = durBeats * BEAT;
  const len = Math.round((dur + r) * SR);
  let ph = 0;
  let lp = 0;
  const k = cutoff ? 1 - Math.exp((-2 * Math.PI * cutoff) / SR) : 1;
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < len; i++) {
    const n = start + i;
    if (n < 0 || n >= N) continue;
    const t = i / SR;
    const freq = glide ? f * Math.pow(glide, Math.exp(-t * 28)) : f;
    ph += freq / SR;
    let env = Math.min(1, t / a);
    if (decay) env *= Math.exp(-t / decay);
    if (t > dur) env *= Math.max(0, 1 - (t - dur) / r);
    let s = osc(ph, t);
    if (cutoff) {
      lp += k * (s - lp);
      s = lp;
    }
    s *= env * vol;
    bus[0][n] += s * gl;
    bus[1][n] += s * gr;
  }
};

const sq = (duty) => (ph) => (ph % 1 < duty ? 1 : -1);
const saw = (ph) => 2 * (ph % 1) - 1;
const tri = (ph) => 4 * Math.abs((ph % 1) - 0.5) - 1;
const sine = (ph) => Math.sin(2 * Math.PI * ph);

const kick = (beat, vol = 0.95) => {
  const start = Math.round(beat * BEAT * SR);
  let ph = 0;
  for (let i = 0; i < SR * 0.32; i++) {
    const n = start + i;
    if (n >= N) break;
    const t = i / SR;
    ph += (46 + 130 * Math.exp(-t * 38)) / SR;
    const s = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 11) * vol + (t < 0.004 ? rnd() * 0.5 : 0);
    drums[0][n] += s;
    drums[1][n] += s;
  }
};
const noiseHit = (beat, {vol = 0.3, decay = 0.1, hp = 0.9, pan = 0, tone = 0}) => {
  const start = Math.round(beat * BEAT * SR);
  let prev = 0;
  let prevOut = 0;
  let ph = 0;
  const gl = Math.cos(((pan + 1) * Math.PI) / 4) * 1.41;
  const gr = Math.sin(((pan + 1) * Math.PI) / 4) * 1.41;
  for (let i = 0; i < SR * decay * 7; i++) {
    const n = start + i;
    if (n < 0 || n >= N) continue;
    const t = i / SR;
    const x = rnd() * 2;
    const y = hp * (prevOut + x - prev); // one-pole high-pass
    prev = x;
    prevOut = y;
    ph += tone / SR;
    const s = (y + (tone ? Math.sin(2 * Math.PI * ph) * 0.7 * Math.exp(-t * 30) : 0)) * Math.exp(-t / decay) * vol;
    drums[0][n] += s * gl;
    drums[1][n] += s * gr;
  }
};
const clap = (beat, vol = 0.36) => {
  noiseHit(beat, {vol: vol * 0.7, decay: 0.012, hp: 0.6});
  noiseHit(beat + 0.03, {vol: vol * 0.7, decay: 0.012, hp: 0.6});
  noiseHit(beat + 0.06, {vol, decay: 0.07, hp: 0.6, tone: 185});
};
const hat = (beat, open = false, vol = 0.11) => noiseHit(beat, {vol, decay: open ? 0.07 : 0.018, hp: 0.97, pan: 0.25});
const crash = (beat, vol = 0.3) => noiseHit(beat, {vol, decay: 0.55, hp: 0.93});
const riser = (fromBeat, toBeat, vol = 0.2) => {
  const s0 = Math.round(fromBeat * BEAT * SR);
  const s1 = Math.round(toBeat * BEAT * SR);
  let prev = 0;
  let out = 0;
  for (let n = s0; n < s1 && n < N; n++) {
    const u = (n - s0) / (s1 - s0);
    const x = rnd() * 2;
    const hp = 0.3 + 0.68 * u;
    out = hp * (out + x - prev);
    prev = x;
    const s = out * u * u * vol;
    music[0][n] += s * (0.6 + 0.4 * Math.sin(u * 40));
    music[1][n] += s * (0.6 + 0.4 * Math.cos(u * 40));
  }
};

// ── harmony ──────────────────────────────────────────────────────────────
const CH = {
  F: {root: 41, tones: [53, 57, 60]},
  G: {root: 43, tones: [55, 59, 62]},
  Em: {root: 40, tones: [52, 55, 59]},
  Am: {root: 45, tones: [57, 60, 64]},
  C: {root: 36, tones: [55, 60, 64]},
};
const BARS = ['F', 'G', 'F', 'G', 'Em', 'Am', 'F', 'G', 'Em', 'Am', 'F', 'G', 'F', 'G', 'C', 'C'];

// ── original lead melody: 8 eighth-notes per bar, null = rest ───────────────
const PHRASE = [
  [69, null, 72, 69, 72, null, 74, null],
  [71, null, 74, 71, 74, null, 76, null],
  [79, null, 76, null, 74, 76, null, 71],
  [72, null, 69, null, 72, 74, 76, null],
  [77, null, 76, 77, null, 81, null, 77],
  [79, null, 74, 79, null, 83, null, 79],
  [76, 79, 83, null, 81, 79, 76, null],
  [81, null, 79, 76, 74, null, 76, null],
];
const MELODY_BARS = {2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 0, 11: 1, 12: 4, 13: 5};

const lead = (beat, dur, m) => {
  const f = hz(m);
  voice(music, beat, dur, {f, vol: 0.115, osc: (ph, t) => sq(0.5)(ph * (1 + 0.004 * Math.sin(t * 36))) * 0.6 + sq(0.25)(ph) * 0.4, a: 0.006, r: 0.09, cutoff: 5200, pan: -0.1});
  voice(music, beat, dur, {f: f * 2, vol: 0.03, osc: sine, a: 0.004, r: 0.12, decay: 0.2, pan: 0.2});
  // dotted-eighth echo
  voice(music, beat + 0.75, dur * 0.8, {f, vol: 0.034, osc: sq(0.5), r: 0.08, cutoff: 2600, pan: 0.5});
};

for (let bar = 0; bar < 16; bar++) {
  const ch = CH[BARS[bar]];
  const b0 = bar * 4;
  const groove = b0 >= 4 && b0 < 56;

  // soft pad all the way through
  if (b0 < 56) {
    for (const [i, m] of ch.tones.entries()) {
      for (const det of [0.997, 1.003]) {
        voice(music, b0, 4, {f: hz(m) * det, vol: 0.022, osc: saw, a: 0.25, r: 0.3, cutoff: 1500, pan: (i - 1) * 0.5});
      }
    }
  }
  if (!groove) continue;

  for (let q = 0; q < 4; q++) {
    const b = b0 + q;
    const inBreak = b >= 28 && b < 29.5; // the jump
    if (!inBreak) kick(b);
    if (q % 2 === 1 && !inBreak) clap(b);
    if (!inBreak) {
      hat(b + 0.5, true);
      hat(b + 0.25, false, 0.05);
      hat(b + 0.75, false, 0.06);
      // off-beat bass
      voice(music, b + 0.5, 0.42, {f: hz(ch.root), vol: 0.3, osc: (ph) => saw(ph) * 0.6 + sine(ph) * 0.8, cutoff: 520, a: 0.006, r: 0.05});
      voice(music, b + 0.5, 0.42, {f: hz(ch.root + 12), vol: 0.07, osc: sq(0.5), cutoff: 1400, r: 0.04});
    }
    // sparkly sixteenth arpeggio
    for (let s = 0; s < 4; s++) {
      const tone = ch.tones[[0, 1, 2, 1][s]] + (q % 2 ? 24 : 12);
      voice(music, b + s / 4, 0.2, {f: hz(tone), vol: 0.045, osc: tri, decay: 0.09, r: 0.05, pan: s % 2 ? 0.6 : -0.6});
    }
  }

  const ph = MELODY_BARS[bar];
  if (ph !== undefined) {
    PHRASE[ph].forEach((m, i) => {
      if (m === null) return;
      const next = PHRASE[ph][i + 1];
      lead(b0 + i / 2, next === null || next === undefined ? 0.8 : 0.42, m);
    });
  }
}

// ── arrangement accents that follow the choreography ─────────────────────
riser(0.5, 3.0, 0.22); // she falls in...
kick(3.0, 1.2); // ...and lands
crash(3.0, 0.34);
crash(4.0, 0.3); // ta-da
for (const m of [55, 59, 62, 67, 74]) voice(music, 4.0, 0.9, {f: hz(m), vol: 0.07, osc: saw, cutoff: 3200, decay: 0.5, r: 0.2});
for (let i = 0; i < 4; i++) clap(7 + i / 4, 0.2 + i * 0.05); // fill into the first dance phrase
for (const b of [8, 16, 24, 32, 40, 48]) crash(b, 0.22);
riser(27, 28.9, 0.16); // wind-up for the jump
crash(29.0, 0.26);
kick(29.55, 1.1); // landing
riser(36, 37.9, 0.14); // spin
crash(38, 0.26);
for (let i = 0; i < 8; i++) noiseHit(52 + i / 2, {vol: 0.14 + i * 0.015, decay: 0.05, hp: 0.6, tone: 190}); // final build
for (let i = 0; i < 8; i++) noiseHit(55 + i / 8, {vol: 0.2 + i * 0.02, decay: 0.035, hp: 0.6, tone: 200});
riser(52, 56, 0.2);

// final hit and ring-out
kick(56, 1.2);
crash(56, 0.4);
for (const [i, m] of [36, 48, 55, 60, 64, 67, 72, 76].entries()) {
  voice(music, 56, 3.5, {f: hz(m), vol: i < 2 ? 0.2 : 0.06, osc: i < 2 ? sine : saw, cutoff: i < 2 ? 0 : 3000, decay: 1.6, a: 0.004, r: 0.6, pan: (i % 3) * 0.4 - 0.4});
}
[72, 76, 79, 84, 88, 91].forEach((m, i) => voice(music, 60 + i * 0.25, 1.2, {f: hz(m), vol: 0.07, osc: tri, decay: 0.45, r: 0.3, pan: i % 2 ? 0.5 : -0.5}));

// ── mix: side-chain the music under the kick, soft clip, write wav ───────
const duck = new Float32Array(N).fill(1);
for (let b = 4; b < 56; b++) {
  if (b >= 28 && b < 29.5) continue;
  const s = Math.round(b * BEAT * SR);
  for (let i = 0; i < SR * 0.22 && s + i < N; i++) {
    const u = i / (SR * 0.22);
    duck[s + i] = Math.min(duck[s + i], 0.5 + 0.5 * u * u);
  }
}
const pcm = Buffer.alloc(44 + N * 4);
pcm.write('RIFF', 0);
pcm.writeUInt32LE(36 + N * 4, 4);
pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write('data', 36);
pcm.writeUInt32LE(N * 4, 40);
let peak = 0;
for (let n = 0; n < N; n++) {
  const fade = Math.min(1, (N - n) / (SR * 1.2));
  for (let c = 0; c < 2; c++) {
    const x = (drums[c][n] * 0.8 + music[c][n] * duck[n] * 1.5) * fade;
    const y = Math.tanh(x * 1.15) * 0.92;
    peak = Math.max(peak, Math.abs(y));
    pcm.writeInt16LE(Math.round(y * 32767), 44 + n * 4 + c * 2);
  }
}
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'music.wav');
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, pcm);
console.log(`wrote ${out}  ${(N / SR).toFixed(2)}s  peak ${peak.toFixed(3)}`);
