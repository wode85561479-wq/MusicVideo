"""Sequences the scenes, ink transitions and global fades into frames."""
import numpy as np

from .core import FPS, finalize, make_paper, render_stroke, smoothstep, soft_cap, stamp
from .effects import InkReveal
from .scenes import T_D, Bamboo, Climax, MoonNight, PlumPeaks, Prelude, River

TRANSITIONS = [
    # from, to, start, end, InkReveal options
    ("A", "B", 39.0, 41.8, dict(angle=0, noise_k=0.45)),
    ("B", "C", 72.2, 75.0, dict(origin=(420, 520), noise_k=0.5)),
    ("C", "D", 102.0, 104.4, dict(angle=-22, noise_k=0.35)),
    ("D", "E", 144.5, 147.4, dict(angle=90, noise_k=0.4)),
    ("E", "F", 163.8, 166.4, dict(origin=(560, 300), noise_k=0.45)),
]
SWEEP = (101.95, 102.7, 104.8)  # big brush stroke: draw start, draw end, gone


class Timeline:
    def __init__(self, music):
        self.m = music
        rng = np.random.default_rng(7)
        self.paper, self.absorb = make_paper(rng)
        self.scenes = dict(A=Prelude(music), B=River(music), C=Bamboo(music),
                           D=PlumPeaks(music), E=MoonNight(music), F=Climax(music))
        self.order = ["A", "B", "C", "D", "E", "F"]
        self.trans = {}
        self.sweep = None
        self.end = music.duration

    def build_all(self):
        for s in self.scenes.values():
            s.ensure()
        for tr in TRANSITIONS:
            self._transition(tr)
        self._sweep()

    def _transition(self, tr):
        key = tr[:2]
        if key not in self.trans:
            rng = np.random.default_rng(hash(key) % 1000)
            self.trans[key] = InkReveal(tr[2], tr[3], rng, soft=0.06, fringe=0.9, **tr[4])
        return self.trans[key]

    def _sweep(self):
        if self.sweep is None:
            rng = np.random.default_rng(99)
            self.sweep = render_stroke([(-120, 900), (420, 620), (1000, 520), (1500, 380),
                                        (2060, 120)], 190, rng, ink=1.9, dry=1.3, dry_start=0.0,
                                       rough=0.06, want_s=True, wet_edge=0.35, bristle=0.025,
                                       profile=lambda s: (0.55 + 0.45 * smoothstep(0, 0.15, s))
                                       * (1 - 0.8 * smoothstep(0.55, 1.0, s)))
        return self.sweep

    def owner(self, t):
        """Scene key owning time t, or a transition tuple."""
        for tr in TRANSITIONS:
            if tr[2] <= t <= tr[3]:
                return tr
        idx = 0
        for i, tr in enumerate(TRANSITIONS):
            if t > tr[3]:
                idx = i + 1
        return self.order[idx]

    def compose(self, t):
        o = self.owner(t)
        if isinstance(o, tuple):
            a, b = o[0], o[1]
            Da, Ra = self.scenes[a].render(t)
            Db, Rb = self.scenes[b].render(t)
            m, fr = self._transition(o).mask(t)
            D = Da + (Db - Da) * m
            R = Ra + (Rb - Ra) * m
            if fr is not None:
                D += fr
        else:
            D, R = self.scenes[o].render(t)
        if SWEEP[0] <= t <= SWEEP[2]:
            sw = self._sweep()
            p = (t - SWEEP[0]) / (SWEEP[1] - SWEEP[0])
            vis = smoothstep(p + 0.02, p - 0.02, sw.s) if p < 1.05 else (sw.s < 1.5)
            fade = 1 - smoothstep(T_D + 0.6, SWEEP[2], t)
            stamp(D, sw.d * vis * fade, sw.x0, sw.y0)
        return D, R

    def frame(self, t):
        D, R = self.compose(t)
        D = soft_cap(np.maximum(D, 0))
        black = 0.0
        if t < 0.6:
            black = 1 - t / 0.6
        if t > self.end - 3.8:
            black = smoothstep(self.end - 3.8, self.end - 0.2, t)
        return finalize(self.paper, self.absorb, D, np.maximum(R, 0), black)

    def n_frames(self):
        return int(np.floor(self.end * FPS))
