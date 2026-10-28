"""Time-driven effects. Every effect is a pure function of time, so any
frame can be rendered independently (and in parallel)."""
import json

import numpy as np

from .core import (FPS, H, W, add_patch, ease, ease_out, fbm, noise1d, over, pan_crop,
                   smoothstep, value_noise)


class Music:
    def __init__(self, path):
        with open(path) as f:
            a = json.load(f)
        self.duration = a["duration"]
        self.beats = np.array(a["beats"])
        self.downbeats = np.array(a["downbeats"])
        self.accents = np.array(a["accents"])
        self.sections = a["sections"]
        self.loudness = np.array(a["loudness"], np.float32)
        self.low = np.array(a["low"], np.float32)
        self.cum_loud = np.concatenate([[0], np.cumsum(self.loudness)]) / FPS

    def loud(self, t):
        i = int(np.clip(t * FPS, 0, len(self.loudness) - 1))
        return float(self.loudness[i])

    def loud_integral(self, t):
        """Integral of loudness from 0 to t (seconds)."""
        x = np.clip(t * FPS, 0, len(self.cum_loud) - 1)
        i = int(x)
        f = x - i
        j = min(i + 1, len(self.cum_loud) - 1)
        return float(self.cum_loud[i] * (1 - f) + self.cum_loud[j] * f)

    def beat_phase(self, t):
        """Position within the current beat, 0..1."""
        b = self.beats
        i = np.searchsorted(b, t) - 1
        if i < 0:
            period = b[1] - b[0]
            return ((t - b[0]) / period) % 1.0
        if i >= len(b) - 1:
            period = b[-1] - b[-2]
            return ((t - b[-1]) / period) % 1.0
        return (t - b[i]) / (b[i + 1] - b[i])

    def pulse(self, t, times, decay=0.35):
        """Decaying envelope triggered at the given event times."""
        i = np.searchsorted(times, t) - 1
        if i < 0:
            return 0.0
        return float(np.exp(-(t - times[i]) / decay))

    def between(self, times, a, b):
        return [x for x in times if a <= x < b]


# ----------------------------------------------------------- ink bloom -----

class InkBloom:
    """A drop of ink spreading into wet paper, darker at its rim."""

    def __init__(self, t0, x, y, R, rng, dens=1.2, tau=0.8, life=5.0, ring=0.6,
                 irregular=0.3, persist=0.0, start=0.05):
        self.t0, self.x, self.y, self.R = t0, x, y, R
        self.dens, self.tau, self.life, self.ring = dens, tau, life, ring
        self.persist, self.start = persist, start
        n = int(R * 2.7) + 4
        self.n = n
        yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) - (n - 1) / 2
        dist = np.hypot(xx, yy)
        disp = (fbm(n, n, max(4, R * 0.3), 4, rng) - 0.5) * 2 * irregular * R
        fine = (value_noise(n, n, 2.5, 2.5, rng) - 0.5) * 2 * min(5.0, 0.04 * R)
        self.dist = (dist + (disp + fine) * np.clip(dist / R, 0, 1)).astype(np.float32)
        self.gran = (0.7 + 0.6 * value_noise(n, n, 2.5, 2.5, rng)).astype(np.float32)

    def active(self, t):
        return self.t0 <= t <= self.t0 + self.life

    def render(self, t, D, k=1.0):
        age = t - self.t0
        if age < 0 or age > self.life:
            return
        g = 1 - np.exp(-age / self.tau)
        r = self.R * (self.start + (1 - self.start) * g)
        inside = smoothstep(r, r - max(2.0, 0.07 * r), self.dist)
        rim = smoothstep(r * 0.55, r, self.dist) * inside
        fade = (1 - smoothstep(self.life * 0.4, self.life, age)) * (1 - self.persist) + self.persist
        conc = 0.4 + 0.6 * (1 - g) ** 1.5
        d = (self.dens * fade * conc * k) * (inside * self.gran + self.ring * rim)
        add_patch(D, d, self.x - self.n / 2, self.y - self.n / 2)


class Splash:
    """Main bloom with satellite droplets flung outwards."""

    def __init__(self, t0, x, y, R, rng, dens=1.4, life=4.0, n_drops=10):
        self.parts = [InkBloom(t0, x, y, R, rng, dens=dens, tau=0.25, life=life, ring=0.5,
                               irregular=0.4)]
        for _ in range(n_drops):
            a = rng.random() * 2 * np.pi
            d = R * rng.uniform(1.1, 2.6)
            r = R * rng.uniform(0.05, 0.16)
            self.parts.append(InkBloom(t0 + d / R * 0.05, x + np.cos(a) * d,
                                       y + np.sin(a) * d * 0.8, r, rng, dens=dens * 1.2,
                                       tau=0.15, life=life * 0.9, ring=0.3, irregular=0.3))

    def render(self, t, D, k=1.0):
        for p in self.parts:
            p.render(t, D, k)


# --------------------------------------------------------- transitions -----

class InkReveal:
    """Organic ink-spread wipe between two scenes."""

    def __init__(self, t0, t1, rng, origin=None, angle=None, noise_k=0.3, cell=320,
                 soft=0.05, fringe=0.9):
        self.t0, self.t1, self.soft, self.fringe = t0, t1, soft, fringe
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        if origin is not None:
            f = np.hypot(xx - origin[0], yy - origin[1])
        else:
            a = np.radians(angle or 0.0)
            f = xx * np.cos(a) + yy * np.sin(a)
        f = (f - f.min()) / (f.max() - f.min())
        n = fbm(H, W, cell, 3, rng, persistence=0.45)
        fine = fbm(H, W, 12, 2, rng)
        f = (1 - noise_k) * f + noise_k * n + 0.025 * fine
        self.f = ((f - f.min()) / (f.max() - f.min())).astype(np.float32)

    def progress(self, t):
        return ease((t - self.t0) / (self.t1 - self.t0))

    def mask(self, t):
        """Reveal mask plus the wet wash travelling ahead of the new scene."""
        p = self.progress(t)
        thr = -self.soft + p * (1 + 2 * self.soft)
        m = smoothstep(thr + self.soft, thr - self.soft, self.f)
        fr = None
        if self.fringe > 0 and 0 < p < 1:
            k = self.fringe * np.sin(np.pi * p)
            x = (self.f - thr) * (1.0 / self.soft)
            band = np.exp(-(x - 0.6) ** 2 * 0.8) * 0.45
            edge = np.exp(-(x - 1.0) ** 2 * 18.0) * 0.35
            fr = (band + edge) * k
        return m, fr


# --------------------------------------------------------------- water -----

class Ripple:
    """Expanding elliptical ring on water."""

    def __init__(self, t0, x, y, R, rng, life=2.6, aspect=0.2, dens=0.55, width=2.2):
        self.t0, self.x, self.y, self.R = t0, x, y, R
        self.life, self.aspect, self.dens, self.width = life, aspect, dens, width
        self.brk = (noise1d(720, 25, rng) * 0.5 + 0.5).astype(np.float32)
        h, w = int(R * aspect * 2.4) + 6, int(R * 2.4) + 6
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        dx, dy = xx - w / 2, (yy - h / 2) / aspect
        self.e = np.hypot(dx, dy).astype(np.float32)
        ang = (np.arctan2(dy, dx) + np.pi) / (2 * np.pi) * 719
        self.b = smoothstep(0.25, 0.6, self.brk[ang.astype(np.int32)])
        self.h, self.w = h, w

    def render(self, t, D, k=1.0):
        age = t - self.t0
        if age < 0 or age > self.life:
            return
        q = age / self.life
        fade = (1 - q) ** 1.6 * self.dens * k
        out = np.zeros((self.h, self.w), np.float32)
        for frac, kk in ((1.0, 1.0), (0.62, 0.7), (0.3, 0.45)):
            r = self.R * ease_out(q, 2.5) * frac
            if r < 2:
                continue
            out += kk * np.exp(-((self.e - r) / self.width) ** 2)
        add_patch(D, out * self.b * fade, self.x - self.w / 2, self.y - self.h / 2)


# ----------------------------------------------------------- particles -----

class Drifters:
    """Petals / leaves drifting down with sway, spawned at given times."""

    def __init__(self, sprites, spawns, rng, life=7.0, wind=60.0, fall=(40, 90),
                 sway=(20, 60), scale=(0.7, 1.2)):
        self.sprites = sprites  # list of lists: variants x rotations
        self.items = []
        for t0, x, y in spawns:
            self.items.append(dict(
                t0=t0, x=x, y=y, v=rng.integers(len(sprites)),
                vx=wind * rng.uniform(0.6, 1.4), vy=rng.uniform(*fall),
                amp=rng.uniform(*sway), fr=rng.uniform(0.6, 1.4), ph=rng.random() * 6.28,
                spin=rng.uniform(-1.5, 1.5), rot0=rng.random(), life=life * rng.uniform(0.7, 1.2),
                s=rng.uniform(*scale)))
        self.items.sort(key=lambda d: d["t0"])
        self.t0s = np.array([d["t0"] for d in self.items])

    def render(self, t, D, R, gust=0.0, k=1.0):
        hi = np.searchsorted(self.t0s, t)
        for it in self.items[:hi]:
            age = t - it["t0"]
            if age > it["life"]:
                continue
            x = it["x"] + it["vx"] * age * (1 + gust) + it["amp"] * np.sin(it["fr"] * age + it["ph"])
            y = it["y"] + it["vy"] * age
            if x < -60 or x > W + 60 or y > H + 60:
                continue
            rots = self.sprites[it["v"]]
            ri = int((it["rot0"] + it["spin"] * age / 6.28) * len(rots)) % len(rots)
            op = min(1.0, age / 0.3) * (1 - smoothstep(it["life"] - 1.0, it["life"], age)) * k
            over(D, R, rots[ri], x, y, opacity=op)


class Flock:
    """Birds flying along straight paths with beat-synced wing beats."""

    def __init__(self, frames, music, members, beats_per_flap=1.0):
        # members: dicts with t0, t1, x0, y0, x1, y1, size (scale), ph (flap offset), bob
        self.frames, self.music, self.members = frames, music, members
        self.bpf = beats_per_flap
        self.scaled = {}

    def _frame(self, i, s):
        key = (i, round(s, 2))
        if key not in self.scaled:
            self.scaled[key] = self.frames[i].scaled(s)
        return self.scaled[key]

    def render(self, t, D, R, k=1.0):
        n = len(self.frames)
        bp = self.music.beat_phase(t)
        bi = np.searchsorted(self.music.beats, t)
        for m in self.members:
            if not (m["t0"] <= t <= m["t1"]):
                continue
            q = (t - m["t0"]) / (m["t1"] - m["t0"])
            x = m["x0"] + (m["x1"] - m["x0"]) * q
            y = m["y0"] + (m["y1"] - m["y0"]) * q + m.get("bob", 6) * np.sin(t * 2.1 + m["ph"] * 6)
            ph = ((bi % self.bpf) + bp) / self.bpf + m["ph"]
            fi = int(ph * n) % n
            op = min(1.0, (t - m["t0"]) / 0.8, (m["t1"] - t) / 0.8) * k * m.get("op", 1.0)
            over(D, R, self._frame(fi, m["size"]), x, y, opacity=op)


# ------------------------------------------------------------- layers ------

class Layer:
    """Wide panorama scrolled with parallax (content moves right as cam grows)."""

    def __init__(self, A, Dn, parallax, R=None):
        self.A, self.D, self.R, self.parallax = A, Dn, R, parallax
        self.X0 = A.shape[1] - W - 2

    def xl(self, cam):
        return max(0.0, self.X0 - cam * self.parallax)

    def screen_x(self, wx, cam):
        return wx - self.xl(cam)

    def comp(self, Dbuf, Rbuf, cam, opacity=1.0, ink_mul=1.0):
        if opacity <= 0.002:
            return
        x = self.xl(cam)
        a = pan_crop(self.A, x)
        d = pan_crop(self.D, x)
        if opacity < 1.0:
            a = a * opacity
        keep = 1.0 - a
        Dbuf *= keep
        Dbuf += d * (opacity * ink_mul)
        if Rbuf is not None:
            Rbuf *= keep
            if self.R is not None:
                Rbuf += pan_crop(self.R, x) * opacity


class Mist:
    """Drifting mist band; t is measured from t0 and the texture is sized by
    the caller so the scroll never runs off its end."""

    def __init__(self, tex, parallax, drift, t0=0.0):
        self.tex, self.parallax, self.drift, self.t0 = tex, parallax, drift, t0
        self.X0 = tex.shape[1] - W - 2

    def comp(self, Dbuf, Rbuf, cam, t, strength=1.0):
        if strength <= 0.002:
            return
        x = max(0.0, self.X0 - cam * self.parallax - self.drift * (t - self.t0))
        m = pan_crop(self.tex, x)
        keep = m * strength
        np.minimum(keep, 1.0, out=keep)
        np.subtract(1.0, keep, out=keep)
        Dbuf *= keep
        if Rbuf is not None:
            Rbuf *= keep
