"""The six painted scenes of the music video, laid out on the song's sections.

  0:00 远山初现  An ink drop blooms and distant mountains emerge from it.
  0:40 江上孤舟  A lone fisherman's boat on a misty river.
  1:13 竹林      A bamboo grove swaying in the wind.
  1:43 梅·群峰   Chorus: a plum branch grows and blossoms on the beat.
  2:25 月夜      Bridge: moonlit night, cranes cross the moon.
  2:45 鹤舞万山  Final chorus: red sun, cranes, petal storm; then the
                 painting dissolves and the inscription and seal are written.
"""
import numpy as np
from scipy import ndimage

from .core import (H, W, RotSet, Sprite, ease, fbm, over, render_stroke, smoothstep, stamp,
                   value_noise, window)
from .effects import (Drifters, Flock, InkBloom, InkReveal, Layer, Mist, Ripple)
from .elements import (Calligraphy, PlumBranch, make_bamboo, make_bird_frames, make_boat,
                       make_crane_frames, make_leaf_cluster, make_petal, make_pine,
                       make_reeds, make_seal, make_willow)
from .mountains import make_peaks, mist_texture, render_range

# Section boundaries (seconds) from the audio analysis.
T_B, T_C, T_D, T_E, T_F, T_OUT = 40.19, 73.07, 102.66, 145.40, 164.70, 214.46


def range_layer(rng, cam_max, parallax, base_y, h_range, spacing, style, tone=1.0,
                **kw):
    width = W + int(cam_max * parallax) + 64
    peaks = make_peaks(width, rng, base_y, h_range, spacing, **kw)
    A, D, ridges = render_range(width, peaks, rng, style, tone_mul=tone)
    return Layer(A, D, parallax), ridges


def bake(layer, spr, x, y):
    """Paint a sprite permanently into a panorama layer."""
    over(layer.D, None, spr, x, y)
    h, w = spr.a.shape
    x0, y0 = int(x - spr.ax), int(y - spr.ay)
    xa, ya = max(0, x0), max(0, y0)
    xb, yb = min(layer.A.shape[1], x0 + w), min(layer.A.shape[0], y0 + h)
    if xb > xa and yb > ya:
        sub = spr.a[ya - y0:yb - y0, xa - x0:xb - x0]
        np.maximum(layer.A[ya:yb, xa:xb], sub, out=layer.A[ya:yb, xa:xb])


def pines_on_summits(layer, ridges, rng, count, size, min_h=0.0):
    tops = sorted([r for r in ridges if r[2].h >= min_h], key=lambda r: -r[2].h)
    rng.shuffle(tops)
    for xs, ytop, pk in tops[:count]:
        j = int(np.argmin(ytop))
        pine = make_pine(rng, size * rng.uniform(0.8, 1.15), lean=rng.uniform(-0.25, 0.25),
                         flip=rng.random() < 0.5)
        bake(layer, pine, xs[j], ytop[j] + size * 0.06)


def rotations(spr, angles):
    return [spr.rotated(a) for a in angles]


def v_formation(rng, n, t0, t1, x0, y0, x1, y1, size, spacing=55):
    members = []
    for i in range(n):
        k = (i + 1) // 2
        side = 1 if i % 2 else -1
        dx, dy = k * spacing, side * k * spacing * 0.5
        members.append(dict(t0=t0 + k * 0.15, t1=t1 + k * 0.15, x0=x0 + dx, y0=y0 + dy,
                            x1=x1 + dx, y1=y1 + dy, size=size * rng.uniform(0.85, 1.1),
                            ph=rng.random(), bob=4))
    return members


class Scene:
    t_start = 0.0
    t_end = 0.0
    seed = 0

    def __init__(self, music):
        self.m = music
        self.built = False

    def ensure(self):
        if not self.built:
            self.rng = np.random.default_rng(self.seed)
            self.build()
            self.built = True

    def buffers(self):
        return np.zeros((H, W), np.float32), np.zeros((H, W), np.float32)

    def mist(self, bands, parallax, drift, cam_mul=1.0, drift_mul=1.0):
        """Mist band whose texture is wide enough for the whole scene."""
        need = (self.cam(self.t_end) * cam_mul * parallax
                + drift * drift_mul * (self.t_end - self.t_start))
        tex = mist_texture(W + int(need) + 200, self.rng, bands)
        return Mist(tex, parallax * cam_mul, drift * drift_mul, self.t_start)


# ------------------------------------------------------------ prelude ------

class Prelude(Scene):
    t_start, t_end, seed = 0.0, 42.0, 11
    DROP = (W * 0.5, H * 0.42)

    def cam(self, t):
        return 13 * t + 22 * self.m.loud_integral(t)

    def build(self):
        rng, cm = self.rng, self.cam(self.t_end)
        self.far, _ = range_layer(rng, cm, 0.3, 610, (90, 220), 420, "far", gap=0.25,
                                  sub=(1, 2))
        self.mid, _ = range_layer(rng, cm, 0.6, 790, (170, 330), 700, "mid", gap=0.35,
                                  sub=(1, 3))
        # A pine-crowned cliff that drifts in from the left as the music builds.
        width = W + int(cm) + 64
        near_x = 230 + (width - W - 2 - cm)
        peaks = make_peaks(width, rng, 1180, (560, 660), 60, w_ratio=(0.28, 0.42),
                           sub=(1, 2), x_range=(near_x - 30, near_x + 30))
        A, D, ridges = render_range(width, peaks, rng, "near")
        self.near = Layer(A, D, 1.0)
        pines_on_summits(self.near, ridges, rng, 1, 260, min_h=500)
        self.mist1 = self.mist([(600, 70, 0.9), (420, 60, 0.25)], 0.3, 6)
        self.mist2 = self.mist([(800, 90, 0.85), (1000, 120, 0.8)], 0.6, 10)
        self.drop = InkBloom(0.35, *self.DROP, 300, rng, dens=1.1, tau=1.9, life=12, ring=1.0,
                             irregular=0.1, start=0.03)
        self.reveal = InkReveal(1.2, 10.5, rng, origin=self.DROP, noise_k=0.45, soft=0.1,
                                fringe=0.0, cell=160)
        bird = make_bird_frames(rng, 34)
        members = [dict(t0=14, t1=31, x0=2000, y0=230, x1=-100, y1=170, size=0.9, ph=0.0),
                   dict(t0=14.6, t1=31.6, x0=2060, y0=262, x1=-40, y1=200, size=0.75, ph=0.3),
                   dict(t0=15.5, t1=32.5, x0=2130, y0=215, x1=20, y1=160, size=0.65, ph=0.6)]
        members += v_formation(rng, 5, 31, 43, 2000, 300, -200, 200, 0.85)
        self.birds = Flock(bird, self.m, members)

    def render(self, t):
        self.ensure()
        D, R = self.buffers()
        cam = self.cam(t)
        L = np.zeros_like(D)
        self.far.comp(L, None, cam)
        self.mist1.comp(L, None, cam, t)
        self.mid.comp(L, None, cam, opacity=window(t, 9, 999, 9, 0))
        m, _ = self.reveal.mask(t)
        D += L * m
        self.mist2.comp(D, None, cam, t, strength=0.9)
        self.near.comp(D, R, cam, opacity=window(t, 24, 999, 9, 0))
        self.drop.render(t, D)
        self.birds.render(t, D, R)
        return D, R


# -------------------------------------------------------------- river ------

class River(Scene):
    t_start, t_end, seed = 38.5, 76.0, 22
    HZ = 600

    def cam(self, t):
        return 20 * (t - self.t_start) + 26 * (self.m.loud_integral(t)
                                                - self.m.loud_integral(self.t_start))

    def build(self):
        rng, cm = self.rng, self.cam(self.t_end)
        hz = self.HZ
        self.far, _ = range_layer(rng, cm, 0.3, hz + 10, (70, 190), 380, "far", gap=0.3,
                                  sub=(1, 2))
        self.mid, ridges = range_layer(rng, cm, 0.55, hz + 30, (230, 360), 1100, "mid",
                                       gap=0.2, sub=(2, 3), w_ratio=(0.45, 0.8))
        pines_on_summits(self.mid, ridges, rng, 3, 90, min_h=280)
        # Water: sparse horizontal ripple strokes, denser towards the viewer.
        wd = W + int(cm * 0.9) + 64
        A = np.zeros((H, wd), np.float32)
        Dw = np.zeros((H, wd), np.float32)
        n = int(wd / 1920 * 110)
        for _ in range(n):
            y = hz + 12 + (H - hz) * rng.random() ** 1.6
            depth = (y - hz) / (H - hz)
            x = rng.uniform(0, wd)
            ln = (20 + 160 * depth) * rng.uniform(0.5, 1.3)
            p = render_stroke([(x, y), (x + ln * 0.5, y + rng.normal(0, 1.5)), (x + ln, y)],
                              1.2 + 2.6 * depth, rng, ink=0.35 + 0.6 * depth, dry=0.45,
                              profile=lambda s: np.sin(np.pi * np.clip(s, 0, 1)) ** 0.6)
            stamp(Dw, p)
        self.water = Layer(A, Dw, 0.9)
        self.boat = make_boat(rng, 1.0)
        self.boat_refl = Sprite(self.boat.a[::-1] * 0.35, self.boat.d[::-1] * 0.3, None,
                                self.boat.ax, self.boat.a.shape[0] - self.boat.ay)
        self.reed_rots = []
        for k in range(2):
            reeds = make_reeds(rng, 470 if k == 0 else 380, n=13 if k == 0 else 9)
            self.reed_rots.append(RotSet(reeds, np.linspace(-4, 4, 9)))
        self.reed_pos = []
        rw = W + int(cm * 1.5) + 400
        x = 120
        while x < rw:
            self.reed_pos.append((x, rng.integers(0, 2), rng.random() * 6.28))
            x += rng.uniform(900, 1700)
        self.reed_X0 = rw - W
        self.mist_a = self.mist([(hz - 10, 45, 0.9), (hz - 120, 70, 0.35)], 0.35, 8)
        self.mist_b = self.mist([(hz - 10, 45, 0.9), (hz - 120, 70, 0.35)], 0.35, 8,
                                cam_mul=1.3, drift_mul=1.5)
        self.ripples = []
        acc = self.m.between(self.m.accents, T_B, T_C + 1)
        for i, a in enumerate(acc):
            bx, by = self.boat_pos(a)
            if i % 2 == 0:
                self.ripples.append(Ripple(a, bx - 164, by + 6, 110, rng, life=3.0, dens=0.7))
            else:
                self.ripples.append(Ripple(a, rng.uniform(150, 1750),
                                           rng.uniform(hz + 60, H - 80), 70, rng,
                                           life=2.4, dens=0.45))
        bird = make_bird_frames(rng, 30)
        members = [dict(t0=50, t1=64, x0=1980, y0=180, x1=-80, y1=250, size=0.9, ph=0.1),
                   dict(t0=50.4, t1=64.4, x0=2040, y0=210, x1=-20, y1=280, size=0.8, ph=0.5)]
        self.birds = Flock(bird, self.m, members)

    def boat_pos(self, t):
        return 1520 - 17 * (t - T_B), self.HZ + 300 + 3 * np.sin(t * 1.25)

    def render(self, t):
        self.ensure()
        D, R = self.buffers()
        cam = self.cam(t)
        hz = self.HZ
        self.far.comp(D, R, cam)
        self.mist_a.comp(D, R, cam, t, 0.8)
        self.mid.comp(D, R, cam)
        self.mist_b.comp(D, R, cam, t, 0.5)
        # Reflection of the far shore, broken by small waves.
        span = min(300, H - hz - 1)
        refl = D[hz - span:hz][::-1].copy()
        rows = np.arange(span)
        shift = (np.sin(rows * 0.45 + t * 2.2) * (1.5 + rows * 0.02)).astype(np.int32)
        for i in range(0, span, 1):
            if shift[i]:
                refl[i] = np.roll(refl[i], shift[i])
        fade = np.exp(-rows / 140.0)[:, None]
        D[hz:hz + span] = D[hz:hz + span] * 0.4 + refl * 0.28 * fade
        self.water.comp(D, R, cam)
        bx, by = self.boat_pos(t)
        over(D, R, self.boat_refl, bx, by + 2, opacity=0.9)
        over(D, R, self.boat, bx, by)
        for r in self.ripples:
            r.render(t, D)
        self.birds.render(t, D, R)
        wind = 0.4 + 0.9 * self.m.loud(t)
        for x, k, ph in self.reed_pos:
            sx = x - (self.reed_X0 - cam * 1.5)
            if -400 < sx < W + 400:
                ang = wind * np.sin(t * 1.4 + ph) * 3.5
                over(D, R, self.reed_rots[k].get(ang), sx, H + 6)
        return D, R


# ------------------------------------------------------------- bamboo ------

class Bamboo(Scene):
    t_start, t_end, seed = 72.0, 105.0, 33

    def cam(self, t):
        return 26 * (t - self.t_start) + 30 * (self.m.loud_integral(t)
                                                - self.m.loud_integral(self.t_start))

    def build(self):
        rng, cm = self.rng, self.cam(self.t_end)
        self.far, _ = range_layer(rng, cm, 0.2, 700, (160, 320), 600, "far", gap=0.2,
                                  sub=(1, 3), tone=0.9)
        self.mist0 = self.mist([(700, 110, 0.95), (520, 80, 0.3)], 0.2, 6)
        # Mid-ground grove: paler stalks with static leaves.
        wd = W + int(cm * 0.7) + 64
        A = np.zeros((H, wd), np.float32)
        Dm = np.zeros((H, wd), np.float32)
        self.mid = Layer(A, Dm, 0.7)
        x = 40
        while x < wd:
            st, nodes = make_bamboo(rng, rng.uniform(1000, 1200), rng.uniform(13, 18),
                                    ink=1.15, lean=rng.normal(0, 0.03))
            bake(self.mid, st, x, H + 40)
            for nx, ny in nodes[2:]:
                if rng.random() < 0.45:
                    lc = make_leaf_cluster(rng, rng.uniform(60, 85), ink=1.05,
                                           direction=rng.choice([-1, 1]))
                    bake(self.mid, lc, x - st.ax + nx, H + 40 - st.ay + ny)
            x += rng.uniform(90, 260)
        self.mist1 = self.mist([(1000, 160, 0.75), (300, 120, 0.3)], 0.7, 12)
        # Foreground stalks with swaying leaf clusters.
        self.fg = []
        pool = [RotSet(make_leaf_cluster(rng, rng.uniform(95, 135), ink=2.4,
                                         direction=d), np.linspace(-8, 8, 7))
                for d in (-1, 1) for _ in range(7)]
        wf = W + int(cm * 1.7) + 600
        self.fg_X0 = wf - W
        x = 60
        while x < wf:
            group = rng.integers(1, 4)
            for g in range(group):
                st, nodes = make_bamboo(rng, rng.uniform(1150, 1350), rng.uniform(26, 34),
                                        ink=2.5, lean=rng.normal(0, 0.035))
                clusters = []
                for nx, ny in nodes[3:]:
                    if rng.random() < 0.6:
                        clusters.append((nx - st.ax, ny - st.ay, pool[rng.integers(len(pool))],
                                         rng.random() * 6.28))
                self.fg.append((x + g * rng.uniform(60, 130), st, clusters, rng.random() * 6.28))
            x += rng.uniform(800, 1500)
        leaf = make_leaf_cluster(rng, 60, ink=2.2, n=1)
        leaf_rots = [rotations(leaf, np.linspace(0, 330, 12))]
        spawns = []
        for a in self.m.between(self.m.accents, T_C - 1, T_D + 2):
            for _ in range(2):
                spawns.append((a + rng.random() * 0.4, rng.uniform(-100, W * 0.8), rng.uniform(-60, 200)))
        self.leaves = Drifters(leaf_rots, spawns, rng, life=8, wind=70, fall=(60, 110),
                               sway=(30, 80), scale=(1, 1))

    def render(self, t):
        self.ensure()
        D, R = self.buffers()
        cam = self.cam(t)
        self.far.comp(D, R, cam)
        self.mist0.comp(D, R, cam, t)
        self.mid.comp(D, R, cam)
        self.mist1.comp(D, R, cam, t, 0.9)
        wind = 0.35 + 0.95 * self.m.loud(t)
        xl = self.fg_X0 - cam * 1.7
        for x, st, clusters, ph in self.fg:
            sx = x - xl
            if not (-300 < sx < W + 300):
                continue
            sway_x = wind * 3 * np.sin(t * 0.9 + ph)
            over(D, R, st, sx + sway_x, H + 40)
            for cx, cy, rots, cph in clusters:
                ang = wind * 6 * np.sin(t * 1.3 + cph + ph) + sway_x * 0.3
                over(D, R, rots.get(ang), sx + sway_x * (1 - (cy + 1300) / 1300) + cx,
                     H + 40 + cy)
        self.leaves.render(t, D, R, gust=self.m.loud(t) * 0.6)
        return D, R


# --------------------------------------------------------- plum & peaks ----

class PlumPeaks(Scene):
    t_start, t_end, seed = 101.6, 148.0, 44
    GROW = (102.9, 110.5)

    def cam(self, t):
        return 26 * (t - self.t_start) + 40 * (self.m.loud_integral(t)
                                                - self.m.loud_integral(self.t_start))

    def build(self):
        rng, cm = self.rng, self.cam(self.t_end)
        self.far, _ = range_layer(rng, cm, 0.22, 560, (120, 250), 420, "far", gap=0.2,
                                  sub=(1, 2))
        self.mid, ridges = range_layer(rng, cm, 0.5, 780, (260, 440), 620, "mid", gap=0.3,
                                       sub=(1, 3), w_ratio=(0.35, 0.6))
        pines_on_summits(self.mid, ridges, rng, 4, 95, min_h=300)
        self.near, ridges = range_layer(rng, cm, 1.0, 1180, (640, 860), 980, "near",
                                        gap=0.35, sub=(1, 3), w_ratio=(0.24, 0.4),
                                        p_range=(1.6, 2.8), q_range=(1.2, 2.2))
        pines_on_summits(self.near, ridges, rng, 5, 230, min_h=600)
        self.mist0 = self.mist([(560, 60, 0.9), (380, 70, 0.3)], 0.22, 7)
        self.mist1 = self.mist([(790, 90, 0.9)], 0.5, 12)
        self.mist2 = self.mist([(1060, 130, 0.95), (880, 60, 0.5)], 1.0, 18)
        self.plum = PlumBranch(rng, 1250, 820)
        g0, g1 = self.GROW
        beats = self.m.beats
        self.opens = []
        for b in self.plum.blossoms:
            tb = g0 + min(1.0, b["t"]) * (g1 - g0)
            i = np.searchsorted(beats, tb) + rng.integers(0, 3)
            self.opens.append(beats[min(i, len(beats) - 1)])
        petal_rots = [rotations(make_petal(rng, rng.uniform(6, 8)), np.linspace(0, 315, 8))
                      for _ in range(4)]
        spawns = []
        opened = [(o, b) for o, b in zip(self.opens, self.plum.blossoms)]
        for bt in self.m.between(beats, g1, self.t_end):
            cands = [b for o, b in opened if o < bt]
            if not cands:
                continue
            k = 1 + (2 if self.m.pulse(bt + 1e-3, self.m.accents, 0.2) > 0.5 else 0)
            for _ in range(k):
                b = cands[rng.integers(len(cands))]
                spawns.append((bt, b["x"], b["y"]))
        self.petals = Drifters(petal_rots, spawns, rng, life=9, wind=70, fall=(45, 85))
        bird = make_bird_frames(rng, 30)
        members = v_formation(rng, 7, 112, 125, 2050, 210, -250, 140, 0.8)
        members += v_formation(rng, 5, 129, 141, 2050, 260, -250, 180, 0.7)
        self.birds = Flock(bird, self.m, members)
        self.bloom_cache = {}

    def blossom(self, kind, v, s):
        key = (kind, v, s)
        if key not in self.bloom_cache:
            self.bloom_cache[key] = self.plum.blossom_sprites[kind][v].scaled(s / 10)
        return self.bloom_cache[key]

    def render(self, t):
        self.ensure()
        D, R = self.buffers()
        cam = self.cam(t)
        pulse = self.m.pulse(t, self.m.accents, 0.4)
        self.far.comp(D, R, cam)
        self.mist0.comp(D, R, cam, t)
        self.mid.comp(D, R, cam)
        self.mist1.comp(D, R, cam, t)
        self.near.comp(D, R, cam, ink_mul=1 + 0.07 * pulse)
        self.mist2.comp(D, R, cam, t)
        self.birds.render(t, D, R)
        g0, g1 = self.GROW
        g = ease((t - g0) / (g1 - g0)) * 1.02
        if g > 0:
            over(D, R, self.plum.growth_sprite(g), 0, 0)
            for o, b in zip(self.opens, self.plum.blossoms):
                if t < o:
                    continue
                q = min(1.0, (t - o) / 0.35)
                s = int(round((0.25 + 0.75 * (1 - (1 - q) ** 3) + 0.08 * np.sin(q * np.pi)) * 10))
                over(D, R, self.blossom(b["kind"], b["v"], s), b["x"], b["y"])
        self.petals.render(t, D, R, gust=self.m.loud(t) * 0.5)
        return D, R


# ----------------------------------------------------------- moon night ----

class MoonNight(Scene):
    t_start, t_end, seed = 144.4, 167.0, 55
    HZ, MOON, MR = 700, (1380, 285), 100

    def cam(self, t):
        return 9 * (t - self.t_start)

    def build(self):
        rng, cm = self.rng, self.cam(self.t_end)
        hz, (mx, my), mr = self.HZ, self.MOON, self.MR
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        clouds = fbm(H, W, 240, 5, rng, aspect=3.0)
        sky = (1.05 - 0.6 * (yy / hz)) * (0.7 + 0.6 * clouds)
        d = np.hypot(xx - mx, yy - my)
        sky *= 1 - 0.75 * np.exp(-np.maximum(d - mr, 0) / (mr * 1.1))
        sky *= 1 - smoothstep(mr + 1.5, mr - 1.5, d) * 0.97
        water = 0.55 + 0.25 * fbm(H, W, 30, 3, rng, aspect=10)
        self.sky = np.where(yy < hz, sky, water * (0.75 + 0.25 * (yy - hz) / (H - hz)))
        self.sky = ndimage.gaussian_filter(self.sky, 1.0).astype(np.float32)
        self.hills, _ = range_layer(rng, cm, 0.3, hz + 8, (50, 150), 360, "mid", gap=0.15,
                                    sub=(1, 2), tone=1.25)
        self.strips = value_noise(H * 2, 400, 4, 50, rng)
        self.strips2 = value_noise(H * 2, 400, 6, 80, rng)
        self.willow = RotSet(make_willow(rng), np.linspace(-3.5, 3.5, 8))
        self.boat = make_boat(rng, 0.5)
        crane = make_crane_frames(rng, 300)
        members = [dict(t0=149.5, t1=163.0, x0=2050, y0=330, x1=-150, y1=230, size=0.5, ph=0.0, bob=5),
                   dict(t0=150.3, t1=163.8, x0=2150, y0=380, x1=-50, y1=290, size=0.42, ph=0.35, bob=5)]
        self.cranes = Flock(crane, self.m, members, beats_per_flap=2)
        self.ripples = [Ripple(a, 558, hz + 85, 60, rng, life=2.6, dens=0.5)
                        for a in self.m.between(self.m.accents, T_E, T_F + 1)[::2]]

    def render(self, t):
        self.ensure()
        D, R = self.buffers()
        cam = self.cam(t)
        hz, (mx, _), mr = self.HZ, self.MOON, self.MR
        D += self.sky
        self.hills.comp(D, R, cam)
        span = 160
        refl = D[hz - span:hz][::-1] * 0.6
        D[hz:hz + span] = np.maximum(D[hz:hz + span], refl * np.exp(-np.arange(span) / 60)[:, None])
        # Moon's reflection: shimmering broken strips under the moon.
        top, bot = hz + 4, H
        n = bot - top
        o1, o2 = int(t * 14) % H, int(t * 9) % H
        s = self.strips[o1:o1 + n] * 0.6 + self.strips2[o2:o2 + n] * 0.4
        x0 = mx - 200
        ys = np.arange(n, dtype=np.float32)[:, None]
        xs = np.arange(400, dtype=np.float32)[None, :] - 200
        width = mr * (0.55 + ys / 380)
        col = np.exp(-(xs / width) ** 2) * smoothstep(0.42, 0.62, s) * (0.9 - 0.4 * ys / n)
        col *= 1 + 0.25 * self.m.pulse(t, self.m.beats, 0.25)
        D[top:bot, x0:x0 + 400] *= 1 - np.clip(col, 0, 0.92)
        bx, by = 640, hz + 85 + 2 * np.sin(t * 1.1)
        over(D, R, self.boat, bx, by, ink_mul=1.1)
        for r in self.ripples:
            r.render(t, D)
        self.cranes.render(t, D, R)
        ang = (0.5 + 0.8 * self.m.loud(t)) * 2.5 * np.sin(t * 0.8)
        over(D, R, self.willow.get(ang), 260, -10, ink_mul=1.1)
        return D, R


# ------------------------------------------------------- crane climax ------

class Climax(Scene):
    t_start, t_end, seed = 163.6, 239.0, 66
    SUN, SR = (560, 300), 120
    CAL_X, CAL_Y = 1560, 150

    def cam(self, t):
        a = 30 * (t - self.t_start) + 46 * (self.m.loud_integral(t)
                                             - self.m.loud_integral(self.t_start))
        return a

    def build(self):
        rng, cm = self.rng, self.cam(self.t_end)
        w = W + 200
        yy, xx = np.mgrid[0:H, 0:w].astype(np.float32)
        d = np.hypot(xx - self.SUN[0] - 100, yy - self.SUN[1])
        sun = smoothstep(self.SR + 2, self.SR - 2, d) * (0.85 + 0.25 * value_noise(H, w, 6, 6, rng))
        sun += 0.12 * np.exp(-np.maximum(d - self.SR, 0) / 60)
        self.sun = Layer(np.zeros((H, w), np.float32), np.zeros((H, w), np.float32), 0.06,
                         R=(sun * 0.85).astype(np.float32))
        self.far, _ = range_layer(rng, cm, 0.2, 600, (120, 260), 400, "far", gap=0.15,
                                  sub=(1, 2))
        self.mid, ridges = range_layer(rng, cm, 0.5, 770, (240, 430), 560, "mid", gap=0.25,
                                       sub=(1, 3), w_ratio=(0.35, 0.65))
        pines_on_summits(self.mid, ridges, rng, 5, 90, min_h=300)
        self.near, ridges = range_layer(rng, cm, 1.0, 1200, (620, 880), 900, "near",
                                        gap=0.3, sub=(1, 3), w_ratio=(0.25, 0.42),
                                        p_range=(1.6, 2.8), q_range=(1.1, 2.2))
        pines_on_summits(self.near, ridges, rng, 6, 240, min_h=600)
        self.mist0 = self.mist([(600, 60, 0.9)], 0.2, 8)
        self.sea = self.mist([(800, 120, 1.0), (680, 50, 0.5)], 0.5, 22)
        self.mist2 = self.mist([(1080, 150, 0.95)], 1.0, 25)
        crane = make_crane_frames(rng, 300)
        members = []
        for i, (dt, y, s) in enumerate([(0, 380, 0.62), (1.4, 240, 0.5), (2.9, 470, 0.56),
                                        (4.1, 170, 0.42), (5.6, 330, 0.46)]):
            members.append(dict(t0=167 + dt, t1=186 + dt, x0=2100, y0=y + 40,
                                x1=-250, y1=y - 80, size=s, ph=rng.random(), bob=6))
        for i, (dt, y, s) in enumerate([(0, 430, 1.0), (2.2, 230, 0.8), (4.0, 560, 0.9)]):
            members.append(dict(t0=190 + dt, t1=204 + dt, x0=2250, y0=y + 60, x1=-350, y1=y - 60,
                                size=s, ph=rng.random(), bob=8))
        for i, (dt, y, s) in enumerate([(0, 260, 0.38), (0.7, 300, 0.32)]):
            members.append(dict(t0=206 + dt, t1=226 + dt, x0=2050, y0=y, x1=-150, y1=y - 90,
                                size=s, ph=rng.random(), bob=5))
        self.cranes = Flock(crane, self.m, members, beats_per_flap=2)
        petal_rots = [rotations(make_petal(rng, rng.uniform(6, 8.5)), np.linspace(0, 315, 8))
                      for _ in range(4)]
        spawns = []
        for bt in self.m.between(self.m.beats, T_F + 1.0, T_OUT):
            acc = self.m.pulse(bt + 1e-3, self.m.accents, 0.2) > 0.5
            for _ in range(5 if acc else 2):
                spawns.append((bt + rng.random() * 0.3, rng.uniform(-200, W * 0.55),
                               rng.uniform(-80, H * 0.55)))
        self.petals = Drifters(petal_rots, spawns, rng, life=8, wind=150, fall=(30, 70),
                               sway=(20, 50))
        self.cal = Calligraphy(rng, "山水有清音", 118)
        # One character every two beats from the first bar line of the coda,
        # the seal on the downbeat after the last one (the score's guzheng
        # notes and gong sit on the same beats).
        beats = self.m.beats
        start = next(d for d in self.m.downbeats if d >= T_OUT + 1.5)
        bi = int(np.argmin(np.abs(beats - start)))
        self.cal_t = [float(beats[bi + 2 * i]) for i in range(5)]
        self.seal = make_seal(rng, "清音", 120)
        self.seal_t = float(beats[bi + 12])

    def outro_fade(self, t):
        return ease((t - T_OUT) / 11.0) * 0.86

    def render(self, t):
        self.ensure()
        D, R = self.buffers()
        cam = self.cam(t)
        if t > T_OUT:  # the scroll slows to a stop
            cam = self.cam(T_OUT) + (self.cam(t) - self.cam(T_OUT)) * 0.35
        pulse = self.m.pulse(t, self.m.accents, 0.4)
        self.sun.comp(D, R, cam)
        self.far.comp(D, R, cam)
        self.mist0.comp(D, R, cam, t)
        self.mid.comp(D, R, cam)
        self.sea.comp(D, R, cam, t)
        self.cranes.render(t, D, R, k=1.0 if t < 200 else 1.0)
        self.near.comp(D, R, cam, ink_mul=1 + 0.08 * pulse)
        self.mist2.comp(D, R, cam, t)
        self.petals.render(t, D, R, gust=self.m.loud(t) * 0.8)
        f = self.outro_fade(t)
        if f > 0:
            D *= 1 - f
            R *= 1 - f * 0.7
            prog = 0.0
            for i, ct in enumerate(self.cal_t):
                prog = i + min(1.0, max(0.0, (t - ct) / 1.3)) if t >= ct else prog
            if t >= self.cal_t[0]:
                self.cal.render(D, self.CAL_X, self.CAL_Y, prog)
            if t >= self.seal_t:
                q = min(1.0, (t - self.seal_t) / 0.25)
                s = 1.25 - 0.25 * ease(q)
                spr = self.seal if s == 1.0 else self.seal.scaled(s)
                over(D, R, spr, self.CAL_X - 4, self.CAL_Y + self.cal.height + 70,
                     opacity=ease(q))
        return D, R
