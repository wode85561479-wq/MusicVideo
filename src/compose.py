"""Original 古风 (Chinese classical style) score for the ink-wash video.

Each musical section is written to the length of one scene, so the music
breathes with the pictures:

  intro   0:00  远山初现  xiao (箫) over a drone; an ink-drop sound opens it
  river   0:40  江上孤舟  flowing guzheng arpeggios, bamboo flute melody
  bamboo  1:13  竹林      lively yangqin, woodblock, pizzicato, flute
  chorus  1:43  梅·群峰   taiko, strings, the main theme on flute and violin
  moon    2:25  月夜      xiao alone under a soft pad, guzheng harmonics
  climax  2:45  鹤舞万山  the theme a whole tone higher, choir, full drums
  outro   3:34  终章      one guzheng note per calligraphy stroke, a gong for the seal

The score is rendered stem by stem with FluidSynth (FluidR3 GM soundfont:
koto ~ guzheng, shakuhachi ~ xiao, dulcimer ~ yangqin), synthesized sound
effects are added, and the stems are mixed through a hall reverb. Beat,
accent and loudness data for the animation are written alongside.

  python3 src/compose.py            # -> build/music.wav, music.m4a, analysis.json
"""
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import mido
import numpy as np
import pyloudnorm
from scipy import signal
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze import envelopes  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
SF2 = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
SR = 44100
DURATION = 238.84
FPS = 30

# name, start (s), bars of 4/4, end (s): the scene boundaries of the video.
SECTIONS = [("intro", 0.0, 12, 40.19), ("river", 40.19, 10, 73.07),
            ("bamboo", 73.07, 9, 102.66), ("chorus", 102.66, 13, 145.40),
            ("moon", 145.40, 5, 164.70), ("climax", 164.70, 15, 214.46),
            ("outro", 214.46, 7, 238.84)]


class Sec:
    def __init__(self, name, start, bars, end):
        self.name, self.start, self.bars, self.end = name, start, bars, end
        self.beat = (end - start) / (bars * 4)

    def t(self, bar, beat=1.0):
        return self.start + ((bar - 1) * 4 + (beat - 1)) * self.beat


SEC = {s[0]: Sec(*s) for s in SECTIONS}

PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def pitch(name):
    """'C#4' -> 61."""
    n = PC[name[0]]
    i = 1
    while i < len(name) and name[i] in "#b":
        n += 1 if name[i] == "#" else -1
        i += 1
    return n + 12 * (int(name[i:]) + 1)


CHORDS = {"Em": "E G B", "C": "C E G", "G": "G B D", "D": "D F# A", "Am": "A C E",
          "Bm": "B D F#", "A": "A C# E", "E": "E G# B", "F#m": "F# A C#",
          "C#m": "C# E G#"}
SCALES = {"E": "E G A B D", "G": "G A B D E", "A": "A B C# E F#"}  # pentatonic sets


def pcs(names):
    return [pitch(n + "0") % 12 for n in names.split()]


def chord_tones(chord, low):
    """Chord tones as pitches from `low` upward within one octave."""
    out = []
    for pc in pcs(CHORDS[chord]):
        p = low + (pc - low) % 12
        out.append(p)
    return sorted(out)


def root_of(chord, octave):
    return pitch(CHORDS[chord].split()[0] + str(octave))


# ----------------------------------------------------------------- tracks --

class Track:
    def __init__(self, name, program, level=-22.0, pan=0.0, send=0.3, drums=False):
        self.name, self.program, self.level = name, program, level
        self.pan, self.send, self.drums = pan, send, drums
        self.notes = []   # (t, dur, pitch, vel)
        self.cc = []      # (t, controller, value)
        self.bends = []   # (t, semitones)

    def note(self, t, dur, p, vel):
        self.notes.append((max(0.0, t), max(0.03, dur), int(p), int(np.clip(vel, 1, 127))))

    def expr(self, points, cc=11):
        """Linear ramps of a controller through (time, value) points."""
        for (t0, v0), (t1, v1) in zip(points, points[1:]):
            n = max(1, int((t1 - t0) / 0.05))
            for k in range(n):
                q = k / n
                self.cc.append((t0 + (t1 - t0) * q, cc, int(round(v0 + (v1 - v0) * q))))
        self.cc.append((points[-1][0], cc, int(points[-1][1])))

    def bend_ramp(self, t0, t1, a, b, step=0.01):
        n = max(1, int((t1 - t0) / step))
        for k in range(n + 1):
            q = k / n
            q = q * q * (3 - 2 * q)
            self.bends.append((t0 + (t1 - t0) * k / n, a + (b - a) * q))


RNG = np.random.default_rng(2026)


def melody(tr, sec, bar, text, vel=80, beat=1.0, legato=0.97, octave=0, vib=45,
           bend_vib=False):
    """Write a phrase. Tokens: NOTE:beats, r:beats, '^' slides up into the
    note from a tone below, '~' adds vibrato on long notes, '|' is ignored."""
    s = SEC[sec]
    pos = (bar - 1) * 4 + (beat - 1)
    for tok in text.split():
        if tok == "|":
            continue
        slide = tok.startswith("^")
        vibrato = tok.endswith("~")
        name, dur = tok.strip("^~").split(":")
        dur = float(dur)
        t0, d = s.start + pos * s.beat, dur * s.beat
        if name != "r":
            p = pitch(name) + 12 * octave
            v = vel + RNG.normal(0, 4) + (6 if dur >= 1.5 else 0)
            tr.note(t0 + RNG.normal(0, 0.006), d * legato, p, v)
            if slide:
                tr.bends.append((t0 - 0.002, -2.0))
                tr.bend_ramp(t0, t0 + min(0.22, d * 0.35), -2.0, 0.0)
            if vibrato and d > 0.9:
                if bend_vib:  # 揉弦: a pressed-string wobble on the guzheng
                    k = int((d * 0.85 - 0.35) / 0.01)
                    for i in range(k):
                        tt = t0 + 0.35 + i * 0.01
                        depth = 0.28 * min(1.0, i * 0.01 / 0.4)
                        tr.bends.append((tt, depth * np.sin(2 * np.pi * 5.2 * i * 0.01)))
                    tr.bends.append((t0 + d * 0.98, 0.0))
                else:
                    tr.expr([(t0 + d * 0.3, 0), (t0 + d * 0.85, vib)], cc=1)
                    tr.cc.append((t0 + d * 0.99, 1, 0))
        pos += dur


def arpeggio(tr, sec, bar, chord, style="flow", vel=64, low=52, beats=4, ring=1.6):
    """Guzheng / yangqin figures over a chord, voiced upward from `low`."""
    s = SEC[sec]
    base = chord_tones(chord, low)
    root = root_of(chord, 2)
    while root < low - 12:
        root += 12
    tones = [root + 12 if root + 12 < base[0] else root, base[0], base[1], base[2],
             base[0] + 12, base[1] + 12, base[2] + 12, base[0] + 24]
    if style == "flow":      # eighths rising and falling
        idx, step = [0, 2, 4, 5, 6, 5, 4, 2], 0.5
    elif style == "sparse":  # quarters
        idx, step = [0, 2, 4, 5], 1.0
    elif style == "sixteen":
        idx, step = [0, 2, 4, 6, 7, 6, 4, 2, 1, 3, 5, 6, 7, 5, 4, 3], 0.25
    elif style == "yangqin":  # 16th tremolo-like figure
        idx, step = [4, 2, 5, 2, 4, 2, 6, 2, 4, 1, 5, 1, 4, 1, 6, 5], 0.25
    n = int(beats / step)
    for k in range(n):
        i = idx[k % len(idx)]
        b = 1 + k * step
        accent = 10 if (b - 1) % 2 == 0 else (4 if (b - 1) % 1 == 0 else 0)
        tr.note(s.t(bar, b) + RNG.normal(0, 0.005), ring * s.beat, tones[i],
                vel + accent + RNG.normal(0, 4))


def chord_hold(tr, sec, bar, chord, beats=4, vel=60, low=55, bass=False, beat=1.0):
    s = SEC[sec]
    t0 = s.t(bar, beat)
    for p in chord_tones(chord, low):
        tr.note(t0, beats * s.beat * 0.98, p, vel)
    if bass:
        tr.note(t0, beats * s.beat * 0.98, root_of(chord, 2), vel)


def gliss(tr, t0, t1, lo, hi, scale, vel=(40, 80), ring=1.2, down=False):
    """刮奏: a sweep across the pentatonic strings."""
    sp = set(pcs(SCALES[scale]))
    ps = [p for p in range(pitch(lo), pitch(hi) + 1) if p % 12 in sp]
    if down:
        ps = ps[::-1]
    n = len(ps)
    for k, p in enumerate(ps):
        q = k / max(1, n - 1)
        tt = t0 + (t1 - t0) * (q ** 1.15)
        tr.note(tt, ring, p, min(82, vel[0] + (vel[1] - vel[0]) * q))


def roll(tr, t0, t1, p, vel=(35, 110), rate=0.07):
    n = int((t1 - t0) / rate)
    for k in range(n):
        q = k / max(1, n - 1)
        tr.note(t0 + k * rate, rate * 1.5, p, vel[0] + (vel[1] - vel[0]) * q ** 1.5)


# ------------------------------------------------------------------ score --

def build_score():
    T = {}

    def track(name, program, **kw):
        T[name] = Track(name, program, **kw)
        return T[name]

    xiao = track("xiao", 77, level=-19, pan=-0.05, send=0.45)
    dizi = track("dizi", 73, level=-19, pan=0.1, send=0.4)
    violin = track("violin", 40, level=-24, pan=-0.22, send=0.38)
    koto = track("guzheng", 107, level=-22, pan=-0.3, send=0.32)
    lead = track("guzheng_lead", 107, level=-23, pan=0.05, send=0.42)
    yq = track("yangqin", 15, level=-25, pan=0.32, send=0.3)
    strings = track("strings", 48, level=-23, pan=0.0, send=0.42)
    trem = track("tremolo", 44, level=-25, pan=0.0, send=0.4)
    pad = track("pad", 89, level=-27, pan=0.0, send=0.5)
    cello = track("cello", 42, level=-25, pan=-0.12, send=0.28)
    pizz = track("pizz", 45, level=-25, pan=0.15, send=0.25)
    choir = track("choir", 52, level=-25, pan=0.0, send=0.5)
    cel = track("celesta", 8, level=-28, pan=0.25, send=0.6)
    taiko = track("taiko", 116, level=-20, pan=0.0, send=0.22)
    timp = track("timpani", 47, level=-25, pan=0.05, send=0.3)
    perc = track("perc", 0, level=-27, pan=0.28, send=0.22, drums=True)
    for tr in T.values():
        tr.cc.append((0.0, 11, 100))

    # ------------------------------------------------- intro 远山初现 -------
    s = SEC["intro"]
    for p in ("E3", "B3", "E4"):
        pad.note(0.35, s.t(11) - 0.35, pitch(p), 70)
    pad.expr([(0.0, 25), (9.0, 92), (s.t(9), 92), (s.t(11), 55)])
    cel.note(0.35, 3.0, pitch("E6"), 72)
    cel.note(s.t(2, 3), 3.0, pitch("B5"), 44)
    cel.note(s.t(4, 1), 3.0, pitch("G5"), 36)
    melody(xiao, "intro", 3, "E4:2 G4:1 A4:1 | ^B4:3~ A4:.5 G4:.5 | E4:1.5 D4:.5 E4:1 G4:1 | "
           "A4:4~ | B4:2 D5:1 B4:1 | A4:1.5 G4:.5 E4:2~ | D4:1 E4:1 G4:1 A4:.5 G4:.5 | "
           "E4:4~ | G4:1 A4:1 B4:2 | D5:2 ^E5:2~", vel=72)
    chords = {3: "Em", 4: "Em", 5: "C", 6: "D", 7: "Em", 8: "Am", 9: "D", 10: "Em",
              11: "C", 12: "D"}
    for bar in (3, 4):
        koto.note(s.t(bar), 3 * s.beat, root_of("Em", 3), 58)
    for bar in range(5, 11):
        arpeggio(koto, "intro", bar, chords[bar], "sparse", vel=56)
    for bar in (11, 12):
        arpeggio(koto, "intro", bar, chords[bar], "flow", vel=60)
    for bar in range(5, 13):
        cello.note(s.t(bar), 4 * s.beat * 0.98, root_of(chords[bar], 2), 62)
    for bar in range(7, 13):
        chord_hold(strings, "intro", bar, chords[bar], vel=64)
    strings.expr([(s.t(7), 35), (s.t(10), 60), (s.t(12, 4.9), 118)])
    gliss(koto, s.t(12, 3.4), s.t(12, 4.95), "E3", "E6", "E", vel=(40, 95))

    # ------------------------------------------------- river 江上孤舟 -------
    s = SEC["river"]
    chords = ["Em", "C", "G", "D", "Em", "C", "D", "Em", "C", "D"]
    koto.note(s.t(1), 3 * s.beat, root_of("Em", 2) + 12, 66)
    for bar, ch in enumerate(chords, 1):
        arpeggio(koto, "river", bar, ch, "flow", vel=60)
        cello.note(s.t(bar), 4 * s.beat * 0.98, root_of(ch, 2), 60)
        if bar >= 3:
            chord_hold(strings, "river", bar, ch, vel=56)
    strings.expr([(s.t(1), 40), (s.t(3), 52), (s.t(9), 62), (s.t(10, 4.9), 45)])
    melody(dizi, "river", 2, "r:2 E5:1 G5:1 | ^A5:1.5 G5:.5 E5:1 D5:1 | E5:1 D5:1 A4:2~ | "
           "B4:1.5 D5:.5 E5:2~ | G5:1 E5:1 D5:.5 E5:.5 G5:1 | A5:3~ G5:.5 A5:.5 | "
           "B5:1.5 A5:.5 G5:1 E5:1 | D5:1 E5:1 G5:1 E5:1 | D5:2~", vel=74)
    gliss(koto, s.t(10, 3.0), s.t(10, 4.9), "E4", "E6", "E", vel=(85, 40), down=True)

    # ------------------------------------------------------ bamboo 竹林 -----
    s = SEC["bamboo"]
    chords = ["G", "Em", "C", "D", "G", "Em", "C", "D", "D"]
    for bar, ch in enumerate(chords, 1):
        arpeggio(yq, "bamboo", bar, ch, "yangqin", vel=58 if bar < 9 else 66, low=55,
                 ring=0.5)
        if bar <= 8:
            for b in (1, 3):
                pizz.note(s.t(bar, b), 0.8 * s.beat, root_of(ch, 2) + (12 if ch in "CD" else 0),
                          78 if b == 1 else 64)
        if 5 <= bar <= 8:
            chord_hold(strings, "bamboo", bar, ch, vel=52)
    yq.expr([(s.t(1), 85), (s.t(8, 4.9), 85), (s.t(9), 70), (s.t(9, 4.9), 120)])
    wood = [(1, 76, 92), (1.5, 77, 48), (2, 76, 58), (2.75, 76, 46), (3, 76, 84),
            (3.5, 77, 50), (4, 76, 56), (4.5, 77, 68)]
    for bar in range(2, 9):
        for b, n, v in wood:
            perc.note(s.t(bar, b), 0.2, n, v + RNG.normal(0, 4))
    melody(dizi, "bamboo", 3, "E5:.5 G5:.5 A5:.5 G5:.5 E5:1 D5:.5 E5:.5 | "
           "A5:1.5 B5:.5 A5:.5 G5:.5 A5:1 | B5:.5 D6:.5 B5:.5 A5:.5 G5:1 E5:1 | "
           "G5:.5 A5:.5 G5:.5 E5:.5 D5:1 E5:1 | E5:.5 G5:.5 A5:1 G5:.5 E5:.5 D5:1 | "
           "A5:2~ B5:.5 A5:.5 G5:.5 A5:.5", vel=80, legato=0.9)
    # Build into the chorus: timpani roll, tremolo swell, the flying-white sweep.
    roll(timp, s.t(9), SEC["chorus"].start - 0.15, pitch("D3"), vel=(25, 92))
    chord_hold(trem, "bamboo", 9, "D", vel=66, bass=True, beats=3.85)
    trem.expr([(s.t(9), 18), (SEC["chorus"].start - 0.2, 100)])
    for b in (4, 4.25, 4.5):
        taiko.note(s.t(9, b), 0.3, 45, 50 + (b - 4) * 50)
    gliss(koto, 101.95, 102.62, "G3", "D6", "G", vel=(50, 105))

    # ----------------------------------------------------- chorus 梅·群峰 ---
    s = SEC["chorus"]
    chords = ["G", "D", "Em", "C", "Em", "Am", "D", "G", "C", "D", "Bm", "Em", "Em"]
    theme = ("D5:1.5 E5:.5 D5:1 B4:1 | A4:1 B4:1 D5:2~ | E5:1.5 G5:.5 E5:1 D5:.5 B4:.5 | "
             "A4:4~ | B4:1.5 D5:.5 E5:1 G5:1 | ^A5:2 G5:1 E5:1 | D5:1 E5:.5 D5:.5 B4:1 A4:1 | "
             "G4:4~ | E5:1.5 G5:.5 A5:1 G5:1 | A5:1.5 B5:.5 A5:1 G5:.5 E5:.5 | "
             "D5:1.5 E5:.5 D5:1 B4:1 | E5:4~")
    melody(dizi, "chorus", 1, theme, vel=88)
    melody(violin, "chorus", 1, theme, vel=82, octave=-1)
    taiko.note(s.start, 2.0, 41, 127)
    taiko.note(s.start, 2.0, 36, 127)
    timp.note(s.start, 2.5, pitch("G2"), 127)
    perc.note(s.start, 2.0, 52, 120)
    perc.note(s.start, 2.0, 49, 100)
    perc.note(s.t(9), 2.0, 52, 92)
    for bar, ch in enumerate(chords, 1):
        if bar <= 12:
            arpeggio(koto, "chorus", bar, ch, "flow", vel=64)
            chord_hold(strings, "chorus", bar, ch, vel=74)
            for b, v in ((1, 112), (2.5, 58), (3, 88), (4, 54), (4.5, 72)):
                if not (bar == 1 and b == 1):
                    taiko.note(s.t(bar, b), 0.5, 41 if b in (1, 3) else 45, v + RNG.normal(0, 4))
        if bar >= 9 and bar <= 12:
            arpeggio(yq, "chorus", bar, ch, "yangqin", vel=50, low=59, ring=0.5)
        cello.note(s.t(bar), 4 * s.beat * 0.98, root_of(ch, 2), 70)
    chord_hold(strings, "chorus", 13, "Em", vel=70)
    strings.expr([(s.start, 96), (s.t(12), 100), (s.t(13), 90), (s.t(13, 4.9), 25)])
    gliss(koto, s.t(8, 4.0), s.t(8, 4.92), "D4", "D6", "G", vel=(45, 92))
    gliss(koto, s.t(13, 1.0), s.t(13, 2.6), "E4", "E6", "E", vel=(80, 35), down=True)
    taiko.note(s.t(13), 0.6, 41, 70)

    # --------------------------------------------------------- moon 月夜 ----
    s = SEC["moon"]
    chords = ["Em", "C", "Am", "D", "E"]
    melody(xiao, "moon", 1, "E5:2 G5:1 A5:1 | ^B5:3~ A5:.5 G5:.5 | E5:1.5 D5:.5 E5:1 G5:1 | "
           "A5:4~", vel=70, octave=-1)
    for bar, ch in enumerate(chords[:4], 1):
        chord_hold(pad, "moon", bar, ch, vel=60, low=52)
        koto.note(s.t(bar), 3 * s.beat, root_of(ch, 2) + 12, 54)
        koto.note(s.t(bar, 3), 2 * s.beat, root_of(ch, 2) + 36, 40)
    for bar, p in ((1, "E6"), (2, "G6"), (3, "A5"), (4, "D6")):
        cel.note(s.t(bar, 1.5), 3.0, pitch(p), 40)
    pad.expr([(s.start, 60), (s.t(4), 65), (s.t(5), 40)])
    roll(timp, s.t(5), SEC["climax"].start - 0.15, pitch("E2") + 12, vel=(22, 96))
    chord_hold(trem, "moon", 5, "E", vel=66, bass=True, beats=3.85)
    trem.expr([(s.t(5), 15), (SEC["climax"].start - 0.2, 104)])
    gliss(koto, s.t(5, 3.3), SEC["climax"].start - 0.05, "A3", "E6", "A", vel=(45, 100))

    # ------------------------------------------------- climax 鹤舞万山 ------
    s = SEC["climax"]
    chords = ["A", "E", "A", "E", "F#m", "D", "F#m", "Bm", "E", "A", "D", "E", "C#m", "E", "A"]
    taiko.note(s.start, 2.0, 41, 127)
    taiko.note(s.start, 2.0, 36, 127)
    timp.note(s.start, 3.0, pitch("A2"), 127)
    perc.note(s.start, 2.5, 52, 122)
    perc.note(s.start, 2.5, 49, 104)
    perc.note(s.t(3), 2.0, 52, 96)
    perc.note(s.t(11), 2.5, 52, 110)
    perc.note(s.t(15), 3.0, 49, 100)
    head = "E5:1.5 F#5:.5 E5:1 C#5:1 | B4:4~ | "
    theme = ("E5:1.5 F#5:.5 E5:1 C#5:1 | B4:1 C#5:1 E5:2~ | F#5:1.5 A5:.5 F#5:1 E5:.5 C#5:.5 | "
             "B4:4~ | C#5:1.5 E5:.5 F#5:1 A5:1 | ^B5:2 A5:1 F#5:1 | E5:1 F#5:.5 E5:.5 C#5:1 B4:1 | "
             "A4:4~ | F#5:1.5 A5:.5 B5:1 A5:1 | B5:1.5 C#6:.5 B5:1 A5:.5 F#5:.5 | "
             "E5:1.5 F#5:.5 E5:1 C#5:1 | B4:1 C#5:1 E5:1 F#5:.5 E5:.5 | A5:4~")
    melody(dizi, "climax", 1, head + theme, vel=92)
    melody(violin, "climax", 1, head + theme, vel=88, octave=-1)
    for bar, ch in enumerate(chords, 1):
        if bar <= 2:
            arpeggio(koto, "climax", bar, ch, "sixteen", vel=62)
            chord_hold(trem, "climax", bar, ch, vel=80, bass=True)
        elif bar <= 14:
            arpeggio(koto, "climax", bar, ch, "flow", vel=66)
        if bar >= 3:
            chord_hold(choir, "climax", bar, ch, vel=70, low=57)
        if 11 <= bar <= 14:
            arpeggio(yq, "climax", bar, ch, "yangqin", vel=56, low=61, ring=0.5)
        chord_hold(strings, "climax", bar, ch, vel=80)
        cello.note(s.t(bar), 4 * s.beat * 0.98, root_of(ch, 2), 76)
        if bar <= 14:
            for b, v in ((1, 116), (2, 60), (2.5, 66), (3, 96), (4, 62), (4.5, 80), (4.75, 70)):
                if not (bar == 1 and b == 1):
                    taiko.note(s.t(bar, b), 0.5, 41 if b in (1, 3) else 45, v + RNG.normal(0, 4))
    trem.expr([(s.start, 110), (s.t(2, 4.9), 100)])
    choir.expr([(s.t(3), 70), (s.t(10), 85), (s.t(11), 112), (s.t(14, 4.9), 118),
                (s.t(15), 100), (s.t(15, 4.9), 40)])
    strings.expr([(s.start, 105), (s.t(14, 4.9), 112), (s.t(15), 100), (s.t(15, 4.9), 45)])
    taiko.note(s.t(15), 1.5, 41, 100)
    gliss(koto, s.t(10, 4.0), s.t(10, 4.92), "E4", "E6", "A", vel=(45, 98))
    gliss(koto, s.t(15, 1.0), s.t(15, 3.0), "A4", "A6", "A", vel=(85, 35), down=True)

    # --------------------------------------------------------- outro 终章 ---
    s = SEC["outro"]
    for i, p in enumerate(("A3", "C#4", "E4", "A4")):
        koto.note(s.t(1, 1 + i), 3 * s.beat, pitch(p), 58 - i * 2)
    chord_hold(strings, "outro", 1, "A", beats=4, vel=60)
    strings.expr([(s.start, 70), (s.t(2), 0)])
    # One pressed-string note for each character of the inscription.
    melody(lead, "outro", 2, "E5:2~ F#5:2~ | E5:2~ C#5:2~ | A4:4~", vel=84, bend_vib=True)
    for bar, p in ((2, "A2"), (3, "F#2"), (4, "A2")):
        koto.note(s.t(bar), 4 * s.beat, pitch(p) + 12, 50)
    melody(xiao, "outro", 2, "C#5:4~ | B4:4~ | A4:4~", vel=58)
    for bar, ch in ((2, "A"), (3, "F#m"), (4, "A"), (5, "A")):
        chord_hold(pad, "outro", bar, ch, vel=58, low=52, beats=4 if bar < 5 else 8)
    pad.expr([(s.t(2), 55), (s.t(5), 60), (s.t(6, 3), 0)])
    koto.note(s.t(5), 5.0, pitch("A2") + 12, 72)
    cel.note(s.t(5), 4.0, pitch("A6"), 50)
    cel.note(s.t(5, 1.5), 4.0, pitch("E6"), 40)
    return T


# ------------------------------------------------------------- rendering --

def write_midi(tr, path):
    mid = mido.MidiFile(ticks_per_beat=480)
    trk = mido.MidiTrack()
    mid.tracks.append(trk)
    trk.append(mido.MetaMessage("set_tempo", tempo=500000, time=0))  # 960 ticks / s
    ch = 9 if tr.drums else 0
    ev = []
    if not tr.drums:
        ev.append((0, 0, mido.Message("program_change", channel=ch, program=tr.program)))
    ev.append((0, 0, mido.Message("control_change", channel=ch, control=7, value=110)))
    for t, d, p, v in tr.notes:
        ev.append((int(t * 960), 1, mido.Message("note_on", channel=ch, note=p, velocity=v)))
        ev.append((int((t + d) * 960), 0, mido.Message("note_off", channel=ch, note=p,
                                                       velocity=0)))
    for t, c, v in tr.cc:
        ev.append((int(t * 960), 0, mido.Message("control_change", channel=ch, control=c,
                                                 value=int(np.clip(v, 0, 127)))))
    for t, semis in tr.bends:
        val = int(np.clip(semis / 2.0 * 8191, -8192, 8191))
        ev.append((int(t * 960), 0, mido.Message("pitchwheel", channel=ch, pitch=val)))
    ev.sort(key=lambda e: (e[0], e[1]))
    last = 0
    for tick, _, msg in ev:
        trk.append(msg.copy(time=max(0, tick - last)))
        last = max(last, tick)
    mid.save(path)


def render_stem(tr, stem_dir):
    mid = os.path.join(stem_dir, tr.name + ".mid")
    wav = os.path.join(stem_dir, tr.name + ".wav")
    write_midi(tr, mid)
    subprocess.run(["fluidsynth", "-ni", "-q", "-g", "0.5", "-R", "0", "-C", "0", "-r", str(SR),
                    "-o", "synth.polyphony=512", "-T", "wav", "-O", "float", "-F", wav, SF2, mid],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    sr, x = wavfile.read(wav)
    x = x.astype(np.float32)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    return tr.name, x


def active_rms_db(x):
    """Level of a stem while it is actually playing."""
    m = x.mean(axis=1)
    w = int(0.4 * SR)
    n = len(m) // w
    r = np.sqrt((m[:n * w].reshape(n, w) ** 2).mean(axis=1) + 1e-12)
    db = 20 * np.log10(r)
    on = db > db.max() - 30
    return 10 * np.log10(np.mean(10 ** (db[on] / 10)))


# ----------------------------------------------------------------- sound fx -

def place(buf, x, t0):
    i = int(t0 * SR)
    n = min(len(x), len(buf) - i)
    if n > 0:
        buf[i:i + n] += x[:n]


def water_drop():
    """The ink drop that opens the film: a small bubble 'plink'."""
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 950 * (1 + 0.9 * (1 - np.exp(-t / 0.018)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / 0.045) * (1 - np.exp(-t / 0.0015))
    thud = np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.03) * 0.35
    y = (x + thud) * 0.5
    return np.stack([y * 0.95, y], 1).astype(np.float32)


def gong(f0=98.0, dur=9.0, bright=1.0, seed=1):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    ratios = [1.0, 1.52, 2.03, 2.48, 2.97, 3.42, 4.07, 4.61, 5.3, 6.12, 7.2, 8.4]
    out = np.zeros((n, 2), np.float32)
    for k, r in enumerate(ratios):
        amp = (1.0 / (1 + k) ** 0.75) * (bright if k > 4 else 1.0)
        tau = 5.5 / (1 + 0.35 * k)
        bloom = 1 - np.exp(-t / (0.01 + 0.12 * k))
        glide = 1 - 0.015 * (1 - np.exp(-t / 1.5)) if k < 3 else 1.0
        for c in range(2):
            f = f0 * r * glide * (1 + rng.normal(0, 0.002))
            ph = 2 * np.pi * np.cumsum(np.full(n, f) if np.isscalar(f) else f) / SR
            out[:, c] += (amp * np.sin(ph + rng.random() * 6.28) * np.exp(-t / tau) * bloom)
    strike = rng.standard_normal(int(0.08 * SR)) * np.exp(-np.arange(int(0.08 * SR)) / (0.012 * SR))
    b, a = signal.butter(2, 1800 / (SR / 2))
    strike = signal.lfilter(b, a, strike) * 0.6
    out[:len(strike)] += strike[:, None]
    out *= np.minimum(1.0, (n - np.arange(n)) / (0.35 * n))[:, None] ** 2
    return out / np.abs(out).max()


def swell(dur, seed=2):
    """Reversed-cymbal style noise swell that leads into a downbeat."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    x = rng.standard_normal((n, 2))
    sos = signal.butter(4, [2500 / (SR / 2), 14000 / (SR / 2)], "band", output="sos")
    x = signal.sosfilt(sos, x, axis=0)
    env = (np.arange(n) / n) ** 3
    env[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return (x * env[:, None] / np.abs(x).max()).astype(np.float32)


def wind(dur, seed=3):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    x = rng.standard_normal((n, 2))
    sos = signal.butter(2, [250 / (SR / 2), 1100 / (SR / 2)], "band", output="sos")
    x = signal.sosfilt(sos, x, axis=0)
    lfo = np.interp(np.arange(n), np.linspace(0, n, 12), 0.4 + 0.6 * rng.random(12))
    fade = np.minimum(1, np.minimum(np.arange(n) / (3 * SR), (n - np.arange(n)) / (3 * SR)))
    return (x * (lfo * fade)[:, None] / np.abs(x).max()).astype(np.float32)


def hall_ir(rt60=2.7, length=4.5, predelay=0.022, seed=4):
    rng = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    bands = [(30, 350, 1.2), (350, 2200, 1.0), (2200, 7000, 0.7), (7000, 18000, 0.42)]
    for c in range(2):
        noise = rng.standard_normal(n)
        for lo, hi, k in bands:
            sos = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], "band", output="sos")
            ir[:, c] += signal.sosfilt(sos, noise) * np.exp(-6.91 * t / (rt60 * k))
        for _ in range(10):
            d = rng.uniform(0.006, 0.08)
            ir[int(d * SR), c] += rng.choice([-1, 1]) * 0.6 * np.exp(-d / 0.05)
    ir *= np.minimum(1, t / 0.03)[:, None] * 0.7 + 0.3
    ir = np.concatenate([np.zeros((int(predelay * SR), 2)), ir])
    return (ir / np.sqrt((ir ** 2).sum(axis=0, keepdims=True))).astype(np.float32)


# -------------------------------------------------------------------- mix --

def pan_gains(p):
    a = (p + 1) * np.pi / 4
    return np.float32(np.cos(a) * np.sqrt(2)), np.float32(np.sin(a) * np.sqrt(2))


def mix(stems, tracks):
    N = int((DURATION + 1.0) * SR)
    dry = np.zeros((N, 2), np.float32)
    send = np.zeros((N, 2), np.float32)
    report = []
    for name, x in stems.items():
        tr = tracks[name]
        lvl = active_rms_db(x)
        g = np.float32(10 ** ((tr.level - lvl) / 20))
        gl, gr = pan_gains(tr.pan)
        y = x[:N] * g
        y[:, 0] *= gl
        y[:, 1] *= gr
        dry[:len(y)] += y
        send[:len(y)] += y * tr.send
        report.append(f"{name:13s} raw {lvl:6.1f} dB -> {tr.level:5.1f} dB")
    fx = np.zeros((N, 2), np.float32)
    place(fx, water_drop() * 0.2, 0.35)
    place(fx, gong(98, 8, 0.8, seed=11) * 0.16, SEC["chorus"].start)
    place(fx, gong(110, 10, 1.0, seed=12) * 0.3, SEC["climax"].start)
    place(fx, gong(110, 9, 0.6, seed=13) * 0.12, SEC["outro"].t(5))
    place(fx, swell(SEC["chorus"].start - SEC["bamboo"].t(9, 2)) * 0.05, SEC["bamboo"].t(9, 2))
    place(fx, swell(SEC["climax"].start - SEC["moon"].t(5, 2), 5) * 0.05, SEC["moon"].t(5, 2))
    place(fx, wind(36, 6) * 0.010, 1.0)
    place(fx, wind(19, 7) * 0.008, SEC["moon"].start)
    dry += fx
    send += fx * 0.5
    wet = np.stack([signal.fftconvolve(send[:, c], IR[:, c])[:N] for c in range(2)], 1)
    out = dry + wet.astype(np.float32) * 0.55
    sos = signal.butter(2, 32 / (SR / 2), "high", output="sos")
    out = signal.sosfilt(sos, out, axis=0).astype(np.float32)
    return out, report


def master(x):
    # Gentle bus compression on a smoothed level, then loudness and a peak ceiling.
    lvl = np.sqrt(signal.lfilter([1 - 0.9995], [1, -0.9995], (x ** 2).mean(axis=1)) + 1e-9)
    db = 20 * np.log10(lvl)
    thr = np.percentile(db[db > -60], 85)
    gr = np.where(db > thr, (thr - db) * 0.4, 0.0)
    x = x * (10 ** (gr / 20))[:, None]
    meter = pyloudnorm.Meter(SR)
    loud = meter.integrated_loudness(x.astype(np.float64))
    x = x * np.float32(10 ** ((-16.0 - loud) / 20))
    peak = np.abs(x).max()
    ceil = 10 ** (-1.0 / 20)
    if peak > ceil:  # soft knee above -3 dBFS
        k = 10 ** (-3 / 20)
        a = np.abs(x)
        over = a > k
        x[over] = np.sign(x[over]) * (k + (ceil - k) * np.tanh((a[over] - k) / (ceil - k)))
    n_end = int(DURATION * SR)
    x = x[:n_end]
    fade = int(1.5 * SR)
    x[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return x, meter.integrated_loudness(x.astype(np.float64))


# --------------------------------------------------------------- analysis --

def beat_grid():
    beats, downs, accents = [], [], []
    for s in SEC.values():
        for bar in range(1, s.bars + 1):
            for b in range(1, 5):
                t = s.t(bar, b)
                beats.append(t)
                if b == 1:
                    downs.append(t)
                if b == 1 or (b == 3 and s.name in ("river", "bamboo", "chorus", "climax")):
                    accents.append(t)
    return beats, downs, accents


def main():
    os.makedirs(BUILD, exist_ok=True)
    stem_dir = os.path.join(BUILD, "stems")
    os.makedirs(stem_dir, exist_ok=True)
    tracks = build_score()
    with ThreadPoolExecutor(4) as ex:
        stems = dict(ex.map(lambda tr: render_stem(tr, stem_dir), tracks.values()))
    out, report = mix(stems, tracks)
    print("\n".join(report))
    out, lufs = master(out)
    print(f"integrated loudness {lufs:.1f} LUFS, peak {20 * np.log10(np.abs(out).max()):.1f} dBFS")
    wav = os.path.join(BUILD, "music.wav")
    wavfile.write(wav, SR, (np.clip(out, -1, 1) * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "aac", "-b:a", "256k",
                    os.path.join(BUILD, "music.m4a")], check=True)

    beats, downs, accents = beat_grid()
    n_frames = int(np.ceil(DURATION * FPS))
    mono = out.mean(axis=1)
    loud, low = envelopes(signal.resample_poly(mono, 1, 2).astype(np.float32), SR // 2, n_frames)
    analysis = {
        "duration": DURATION, "fps": FPS, "tempo": 60 / SEC["chorus"].beat,
        "beats": [round(b, 3) for b in beats],
        "beat_strength": [1.0 if b in downs else 0.6 for b in beats],
        "downbeats": [round(b, 3) for b in downs],
        "accents": [round(a, 3) for a in accents],
        "sections": [s[1] for s in SECTIONS],
        "loudness": [round(float(v), 3) for v in loud],
        "low": [round(float(v), 3) for v in low],
    }
    with open(os.path.join(BUILD, "analysis.json"), "w") as f:
        json.dump(analysis, f)
    print("wrote build/music.wav, build/music.m4a, build/analysis.json")


IR = hall_ir()

if __name__ == "__main__":
    main()
