"""Painted elements built from brush strokes: pines, bamboo, plum, boat,
reeds, birds, cranes, petals, seal and calligraphy."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

from .core import (Sprite, blob, even_profile, leaf_profile, render_stroke,
                   smoothstep, soft_cap, stamp, value_noise)

FONT_DIR = __file__.rsplit("/", 3)[0] + "/assets/fonts/"


class Canvas:
    """Scratch surface for assembling a sprite from strokes and shapes."""

    def __init__(self, w, h, red=False):
        self.w, self.h = int(w), int(h)
        self.d = np.zeros((self.h, self.w), np.float32)
        self.r = np.zeros((self.h, self.w), np.float32) if red else None
        self.white = np.zeros((self.h, self.w), np.float32)

    def stroke(self, pts, width, rng, k=1.0, mode="add", **kw):
        p = render_stroke(pts, width, rng, **kw)
        stamp(self.d, p, mode=mode, k=k)
        return p

    def mask_poly(self, pts, ss=3, blur=0.5):
        img = Image.new("L", (self.w * ss, self.h * ss), 0)
        ImageDraw.Draw(img).polygon([(x * ss, y * ss) for x, y in pts], fill=255)
        m = np.asarray(img, np.float32).reshape(self.h, ss, self.w, ss).mean(axis=(1, 3)) / 255
        return ndimage.gaussian_filter(m, blur) if blur > 0 else m

    def mask_ellipse(self, cx, cy, rx, ry, ss=3, blur=0.5):
        img = Image.new("L", (self.w * ss, self.h * ss), 0)
        ImageDraw.Draw(img).ellipse([(cx - rx) * ss, (cy - ry) * ss, (cx + rx) * ss,
                                     (cy + ry) * ss], fill=255)
        m = np.asarray(img, np.float32).reshape(self.h, ss, self.w, ss).mean(axis=(1, 3)) / 255
        return ndimage.gaussian_filter(m, blur) if blur > 0 else m

    def sprite(self, ax, ay, alpha_k=1.6, cap=3.0):
        d = soft_cap(self.d, cap)
        a = np.clip(self.d * alpha_k, 0, 1)
        if self.r is not None:
            a = np.maximum(a, np.clip(self.r * alpha_k, 0, 1))
        a = np.maximum(a, self.white)
        return Sprite(a, d, self.r, ax, ay)


def wash(rng, rx, ry, dens=0.35):
    """Soft pale-ink wash patch (淡墨渲染)."""
    w, h = int(rx * 2.6) + 4, int(ry * 2.6) + 4
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx, dy = (xx - w / 2) / rx, (yy - h / 2) / ry
    n = value_noise(h, w, max(2, rx * 0.4), max(2, ry * 0.4), rng)
    r = np.sqrt(dx * dx + dy * dy) + (n - 0.5) * 0.5
    return (smoothstep(1.0, 0.3, r) * dens * (0.7 + 0.5 * n)).astype(np.float32)


# ------------------------------------------------------------------ pine ---

def needle_fan(cv, cx, cy, r, rng, ink=2.4, n=None, spread=(195, 345), width=1.6, ss=3):
    img = Image.new("L", (cv.w * ss, cv.h * ss), 0)
    dr = ImageDraw.Draw(img)
    n = n or int(14 + r * 0.25)
    a0, a1 = np.radians(spread[0]), np.radians(spread[1])
    for i in range(n):
        a = a0 + (a1 - a0) * (i + rng.random() * 0.6) / n
        L = r * rng.uniform(0.75, 1.05)
        x0, y0 = cx + np.cos(a) * r * 0.08, cy + np.sin(a) * r * 0.08
        x1, y1 = cx + np.cos(a) * L, cy + np.sin(a) * L
        dr.line([(x0 * ss, y0 * ss), (x1 * ss, y1 * ss)],
                fill=int(170 + rng.random() * 85), width=max(1, int(width * ss)))
    m = np.asarray(img, np.float32).reshape(cv.h, ss, cv.w, ss).mean(axis=(1, 3)) / 255
    cv.d += ndimage.gaussian_filter(m, 0.45) * ink


def make_pine(rng, height=420, lean=0.0, ink=2.6, flip=False):
    w, h = int(height * 1.5), int(height * 1.12)
    cv = Canvas(w, h)
    bx, by = w * 0.5, h - 8
    ph = rng.random() * 6.28
    tw = height * 0.05
    trunk = []
    for i in range(7):
        t = i / 6
        x = bx + (lean * t + 0.06 * np.sin(t * np.pi * 1.6 + ph)) * height
        trunk.append((x, by - t * height * 0.86))
    trunk = np.array(trunk)
    cv.stroke(trunk, tw * 2, rng, ink=ink * 0.75, profile=lambda s: 1 - 0.55 * s,
              dry=0.55, rough=0.3, wet_edge=0.3, ink_fall=0.1)
    # Bark scales.
    for _ in range(int(height / 18)):
        t = rng.uniform(0.05, 0.8)
        i = t * 6
        p = trunk[int(i)] * (1 - (i % 1)) + trunk[min(6, int(i) + 1)] * (i % 1)
        ox = rng.uniform(-0.6, 0.6) * tw
        cv.stroke([(p[0] + ox - tw * 0.35, p[1]), (p[0] + ox, p[1] - tw * 0.2),
                   (p[0] + ox + tw * 0.35, p[1])], max(2, tw * 0.18), rng, ink=ink * 0.9)
    clusters = []
    nb = rng.integers(4, 7)
    side = rng.choice([-1, 1])
    for k in range(nb):
        t = 0.38 + 0.57 * k / max(1, nb - 1) + rng.uniform(-0.03, 0.03)
        i = min(5.999, t * 6)
        p = trunk[int(i)] * (1 - (i % 1)) + trunk[int(i) + 1] * (i % 1)
        L = height * rng.uniform(0.22, 0.42) * (1 - 0.45 * t)
        dx = side * L
        pts = [p, p + (dx * 0.35, L * 0.06), p + (dx * 0.7, L * 0.05), p + (dx, -L * 0.1)]
        cv.stroke(pts, tw * 0.95 * (1 - 0.4 * t), rng, ink=ink * 0.8,
                  profile=lambda s: 1 - 0.7 * s, dry=0.45, rough=0.25)
        for s in (0.45, 0.75, 1.0):
            j = s * 3
            q = np.array(pts[int(min(2, j))]) * (1 - (j - int(min(2, j)))) + \
                np.array(pts[int(min(3, int(min(2, j)) + 1))]) * (j - int(min(2, j)))
            if s < 0.6 and rng.random() < 0.4:
                continue
            clusters.append((q[0], q[1] - height * 0.01, height * rng.uniform(0.07, 0.1)))
        side = -side
    clusters.append((trunk[-1][0], trunk[-1][1], height * 0.1))
    for cx, cy, r in clusters:
        wv = wash(rng, r * 1.5, r * 0.55, 0.45)
        stamp(cv.d, wv, cx - wv.shape[1] / 2, cy - wv.shape[0] / 2 - r * 0.15)
    for cx, cy, r in clusters:
        for dx in (-0.9, 0.0, 0.9):
            if dx != 0 and rng.random() < 0.35:
                continue
            needle_fan(cv, cx + dx * r, cy + abs(dx) * r * 0.15, r * rng.uniform(0.75, 1.0),
                       rng, ink=ink * rng.uniform(0.8, 1.0))
    spr = cv.sprite(bx, by)
    return spr.flipped_x() if flip else spr


# --------------------------------------------------------------- bamboo ----

def make_bamboo(rng, height=900, width=26, ink=2.4, lean=0.04):
    """Bamboo stalk; returns (sprite anchored at its foot, node points)."""
    w, h = int(width * 6 + abs(lean) * height + 40), int(height + 20)
    cv = Canvas(w, h)
    bx = w / 2 - lean * height / 2
    nodes = []
    y = h - 4
    seg = []
    while y > 10:
        L = height * rng.uniform(0.09, 0.13) * (0.8 if y > h * 0.8 else 1.0)
        seg.append((y, max(4, y - L)))
        y -= L
    for i, (ya, yb) in enumerate(seg):
        xa = bx + lean * (h - ya)
        xb = bx + lean * (h - yb)
        gap = width * 0.18
        wi = width * (1 - 0.25 * (h - ya) / h)
        cv.stroke([(xa, ya - gap), ((xa + xb) / 2 + rng.normal(0, 1), (ya + yb) / 2),
                   (xb, yb + gap)], wi, rng, ink=ink * rng.uniform(0.62, 0.8),
                  profile=even_profile, dry=0.18, rough=0.04, wet_edge=0.35, ink_fall=-0.2)
        nodes.append((xb, yb))
        cv.stroke([(xb - wi * 0.65, yb + 1), (xb, yb + wi * 0.18), (xb + wi * 0.65, yb - 1)],
                  max(2.5, wi * 0.28), rng, ink=ink, profile=even_profile)
    return cv.sprite(bx, h - 4), nodes


def make_leaf_cluster(rng, size=120, ink=2.4, n=None, direction=1, droop=0.6):
    """Bamboo leaves arranged like the characters 个 / 介, anchored at the twig."""
    S = int(size * 2.8)
    cv = Canvas(S, S)
    ox, oy = S / 2, S / 2
    n = n or rng.integers(3, 6)
    base_ang = np.radians(90 - direction * (90 - 90 * droop))
    twig_end = (ox + direction * size * 0.25, oy + size * 0.1)
    cv.stroke([(ox, oy), twig_end], max(2, size * 0.025), rng, ink=ink * 0.8,
              profile=even_profile)
    for i in range(n):
        a = base_ang + np.radians((i - (n - 1) / 2) * rng.uniform(18, 30) + rng.normal(0, 6))
        L = size * rng.uniform(0.8, 1.15)
        sx, sy = twig_end[0] + rng.normal(0, 2), twig_end[1] + rng.normal(0, 2)
        ex, ey = sx + np.cos(a) * L, sy + np.sin(a) * L
        bend = rng.uniform(-0.12, 0.12) * L
        mx, my = (sx + ex) / 2 - np.sin(a) * bend, (sy + ey) / 2 + np.cos(a) * bend
        cv.stroke([(sx, sy), (mx, my), (ex, ey)], size * rng.uniform(0.13, 0.17), rng,
                  ink=ink * rng.uniform(0.75, 1.0), profile=leaf_profile, dry=0.15,
                  ink_fall=0.15)
    return cv.sprite(ox, oy)


# ----------------------------------------------------------------- plum ----

class PlumBranch:
    """Gnarled plum branch grown over time, with blossoms that open later."""

    def __init__(self, rng, w=1250, h=820, ink=2.6):
        self.w, self.h = w, h
        cv = Canvas(w, h)
        reveal = np.full((h, w), 9.0, np.float32)
        self.blossoms = []
        strokes = []

        def branch(p, ang, length, width, t0, dur, depth):
            pts = [np.array(p, float)]
            segs = rng.integers(4, 6) if depth == 0 else rng.integers(2, 4)
            lo, hi = (np.radians(14), np.radians(65)) if depth == 0 else (np.radians(-80),
                                                                          np.radians(75))
            for _ in range(segs):
                ang = np.clip(ang + np.radians(rng.uniform(-42, 42)), lo, hi)
                L = length / segs * rng.uniform(0.7, 1.3)
                pts.append(pts[-1] + L * np.array([np.cos(ang), np.sin(ang)]))
            strokes.append((pts, width, t0, dur, depth))
            if depth < 2:
                for _ in range(rng.integers(3, 6) - depth):
                    i = rng.integers(1, len(pts))
                    s = i / (len(pts) - 1)
                    a2 = ang + np.radians(rng.choice([-1, 1]) * rng.uniform(35, 75))
                    branch(pts[i] - (pts[i] - pts[i - 1]) * rng.uniform(0, 0.5), a2,
                           length * rng.uniform(0.35, 0.6), width * 0.42,
                           t0 + dur * s, dur * 0.6, depth + 1)
            # Blossoms at twig joints and tips, more on the finer twigs.
            for i in range(1, len(pts)):
                if depth >= 1 or rng.random() < 0.4:
                    s = i / (len(pts) - 1)
                    self.blossoms.append(dict(x=pts[i][0] + rng.normal(0, 4),
                                              y=pts[i][1] + rng.normal(0, 4),
                                              t=t0 + dur * s, r=rng.uniform(10, 16),
                                              kind=rng.choice(["open", "open", "open", "bud"])))
            for _ in range(rng.integers(2, 5) if depth >= 1 else 2):
                s = rng.uniform(0.2, 1.0)
                j = s * (len(pts) - 1)
                q = pts[int(j)] * (1 - j % 1) + pts[min(len(pts) - 1, int(j) + 1)] * (j % 1)
                self.blossoms.append(dict(x=q[0] + rng.normal(0, 9), y=q[1] + rng.normal(0, 9),
                                          t=t0 + dur * s, r=rng.uniform(9, 15),
                                          kind=rng.choice(["open", "open", "bud", "half"])))
        branch((-40, 70), np.radians(28), w * 0.62, 40, 0.0, 0.5, 0)
        for pts, width, t0, dur, depth in strokes:
            p = render_stroke(pts, width, rng, ink=ink * (0.9 if depth == 0 else 1.0),
                              profile=lambda s: 1 - 0.6 * s, dry=0.55 if depth == 0 else 0.3,
                              rough=0.3, want_s=True, wet_edge=0.25)
            stamp(cv.d, p, mode="max")
            rt = np.where(p.s < 1.5, t0 + p.s * dur, 9.0).astype(np.float32)
            stamp(reveal, rt, p.x0, p.y0, mode="min")
            # Moss dots on the main limbs.
            if depth == 0:
                for _ in range(10):
                    i = rng.integers(0, len(pts) - 1)
                    q = pts[i] + (pts[i + 1] - pts[i]) * rng.random()
                    b = blob(rng.uniform(2, 4.5), rng)
                    stamp(cv.d, b, q[0] - b.shape[1] / 2 + rng.normal(0, width * 0.4),
                          q[1] - b.shape[0] / 2 - width * 0.4, mode="max", k=ink)
        self.d = soft_cap(cv.d)
        self.reveal = reveal
        self.blossom_sprites = {k: [make_blossom(rng, 14, k) for _ in range(4)]
                                for k in ("open", "half", "bud")}
        for b in self.blossoms:
            b["v"] = rng.integers(0, 4)
            b["rot"] = rng.uniform(0, 360)

    def growth_sprite(self, g):
        """Branch revealed up to growth parameter g (0..1)."""
        m = smoothstep(g + 0.015, g - 0.005, self.reveal)
        d = self.d * m
        return Sprite(np.clip(d * 1.6, 0, 1), d, None, 0, 0)


def make_blossom(rng, r=14, kind="open"):
    S = int(r * 3.4)
    cv = Canvas(S, S, red=True)
    c = S / 2
    if kind == "bud":
        b = blob(r * 0.45, rng, irregular=0.15, grain=0.2)
        stamp(cv.r, b, c - b.shape[1] / 2, c - b.shape[0] / 2, k=1.1)
        k = blob(r * 0.18, rng)
        stamp(cv.d, k, c - k.shape[1] / 2, c + r * 0.25 - k.shape[0] / 2, k=2.2)
        return cv.sprite(c, c, alpha_k=1.2)
    npet = 5 if kind == "open" else 3
    a0 = rng.random() * 6.28
    span = 6.28 if kind == "open" else 3.4
    for i in range(npet):
        a = a0 + span * i / npet + rng.normal(0, 0.12)
        pr = r * rng.uniform(0.42, 0.52)
        b = blob(pr, rng, irregular=0.12, soft=0.35, grain=0.3, ring=0.35)
        px, py = c + np.cos(a) * r * 0.5, c + np.sin(a) * r * 0.5
        stamp(cv.r, b, px - b.shape[1] / 2, py - b.shape[0] / 2, k=rng.uniform(0.75, 1.0),
              mode="max")
    if kind == "open":
        for i in range(7):
            a = rng.random() * 6.28
            L = r * rng.uniform(0.3, 0.5)
            x1, y1 = c + np.cos(a) * L, c + np.sin(a) * L
            d = blob(1.3, rng, irregular=0.1)
            stamp(cv.d, d, x1 - d.shape[1] / 2, y1 - d.shape[0] / 2, k=2.2)
        d = blob(r * 0.16, rng)
        stamp(cv.d, d, c - d.shape[1] / 2, c - d.shape[0] / 2, k=1.2)
    return cv.sprite(c, c, alpha_k=1.1)


def make_petal(rng, r=7):
    S = int(r * 3)
    cv = Canvas(S, S, red=True)
    b = blob(r, rng, irregular=0.12, soft=0.4, grain=0.25, ring=0.3)
    b = ndimage.zoom(b, (0.7, 1.0), order=1)
    stamp(cv.r, b, S / 2 - b.shape[1] / 2, S / 2 - b.shape[0] / 2, k=0.9)
    return cv.sprite(S / 2, S / 2, alpha_k=1.0)


# ----------------------------------------------------------------- boat ----

def make_boat(rng, scale=1.0, ink=2.6, fisher=True):
    s = scale
    w, h = int(420 * s), int(300 * s)
    cv = Canvas(w, h)
    wy = h - 40 * s  # waterline
    cx = w * 0.42
    hull = [(cx - 150 * s, wy - 26 * s), (cx - 80 * s, wy - 2 * s), (cx + 40 * s, wy + 4 * s),
            (cx + 120 * s, wy - 6 * s), (cx + 165 * s, wy - 30 * s)]
    m = cv.mask_poly(hull + [(cx + 120 * s, wy - 14 * s), (cx, wy - 10 * s),
                             (cx - 110 * s, wy - 18 * s)])
    cv.d += m * ink * 0.55
    cv.stroke(hull, 11 * s, rng, ink=ink, dry=0.35, profile=lambda q: 0.5 + 0.5 * np.sin(q * np.pi))
    cv.stroke([(cx - 120 * s, wy - 20 * s), (cx, wy - 14 * s), (cx + 130 * s, wy - 18 * s)],
              4 * s, rng, ink=ink * 0.8, profile=even_profile)
    if fisher:
        fx, fy = cx + 50 * s, wy - 14 * s
        body = [(fx - 30 * s, fy), (fx - 26 * s, fy - 22 * s), (fx - 12 * s, fy - 40 * s),
                (fx + 12 * s, fy - 40 * s), (fx + 24 * s, fy - 20 * s), (fx + 32 * s, fy)]
        bm = cv.mask_poly(body, blur=0.8)
        cv.d += bm * ink * (0.85 + 0.3 * value_noise(cv.h, cv.w, 1.5, 4 * s, rng))
        for i in range(4):
            x = fx - 18 * s + i * 11 * s
            cv.stroke([(x + 3 * s, fy - 30 * s), (x - 4 * s, fy + 2 * s)], 3 * s, rng,
                      ink=ink * 0.5, dry=0.6, profile=lambda q: 1 - 0.6 * q)
        hat = [(fx - 40 * s, fy - 38 * s), (fx - 2 * s, fy - 62 * s), (fx + 40 * s, fy - 36 * s),
               (fx + 2 * s, fy - 42 * s)]
        cv.d += cv.mask_poly(hat, blur=0.6) * ink * 1.1
        cv.stroke([(fx - 40 * s, fy - 38 * s), (fx + 2 * s, fy - 43 * s), (fx + 40 * s, fy - 36 * s)],
                  4 * s, rng, ink=ink, profile=even_profile)
        cv.stroke([(fx - 14 * s, fy - 26 * s), (fx - 80 * s, fy - 105 * s),
                   (fx - 200 * s, fy - 175 * s)], 3.2 * s, rng, ink=ink * 0.9,
                  profile=lambda q: 1 - 0.7 * q)
        cv.stroke([(fx - 200 * s, fy - 175 * s), (fx - 212 * s, fy - 70 * s),
                   (fx - 214 * s, wy + 8 * s)], 1.2 * s, rng, ink=ink * 0.45,
                  profile=even_profile)
    return cv.sprite(cx, wy)


# ----------------------------------------------------------------- reeds ---

def make_reeds(rng, height=520, n=12, ink=2.3, spread=260):
    w, h = int(spread * 2 + height * 0.8), int(height * 1.1)
    cv = Canvas(w, h)
    bx, by = w / 2, h - 4
    for i in range(n):
        x0 = bx + rng.normal(0, spread * 0.35)
        lean = rng.normal(0.1, 0.18)
        L = height * rng.uniform(0.55, 1.0)
        tip = (x0 + lean * L, by - L)
        mid = (x0 + lean * L * 0.35 + rng.normal(0, 6), by - L * 0.5)
        cv.stroke([(x0, by), mid, tip], rng.uniform(3.5, 5.5), rng, ink=ink * rng.uniform(0.7, 1),
                  profile=lambda s: 1 - 0.7 * s)
        for _ in range(rng.integers(1, 3)):
            s = rng.uniform(0.15, 0.6)
            sx, sy = x0 + lean * L * s * 0.4, by - L * s
            d = rng.choice([-1, 1])
            LL = L * rng.uniform(0.3, 0.55)
            cv.stroke([(sx, sy), (sx + d * LL * 0.45, sy - LL * 0.55),
                       (sx + d * LL * 0.9, sy - LL * 0.35)], rng.uniform(7, 11), rng,
                      ink=ink * rng.uniform(0.6, 0.95), profile=leaf_profile, dry=0.2)
        if rng.random() < 0.8:
            for k in range(rng.integers(9, 15)):
                a = np.radians(rng.uniform(-60, 60)) + np.pi / 2 * 0 + lean
                ll = rng.uniform(25, 55)
                px, py = tip[0], tip[1] + k * 3.5
                cv.stroke([(px, py), (px + np.sin(a) * ll * 0.6 + ll * 0.4 * np.sign(lean + 1e-3),
                                      py + abs(np.cos(a)) * ll)], rng.uniform(1.8, 3.2), rng,
                          ink=ink * 0.42, profile=lambda s: 1 - 0.8 * s, dry=0.4)
    return cv.sprite(bx, by)


# ------------------------------------------------------------------ birds --

def make_bird_frames(rng, span=70, n=12, ink=2.4):
    """Small swallow-like birds: wings flapping through n phases."""
    frames = []
    seed = rng.integers(1 << 30)
    for i in range(n):
        r = np.random.default_rng(seed)
        ph = 2 * np.pi * i / n
        lift = np.sin(ph)
        S = int(span * 2.4)
        cv = Canvas(S, S)
        c = S / 2
        for side in (-1, 1):
            tip = (c + side * span * (0.95 - 0.12 * abs(lift)), c - span * 0.5 * lift)
            mid = (c + side * span * 0.45, c - span * 0.12 * lift - span * 0.07)
            cv.stroke([(c, c), mid, tip], span * 0.16, r, ink=ink,
                      profile=lambda s: (1 - 0.85 * s) * smoothstep(0, 0.1, s + 0.05))
        b = blob(span * 0.07, r)
        stamp(cv.d, b, c - b.shape[1] / 2 - span * 0.04, c - b.shape[0] / 2, k=ink)
        frames.append(cv.sprite(c, c))
    return frames


def make_crane_frames(rng, L=300, n=16, ink=2.5):
    """Red-crowned crane in flight, heading left; n wing-beat phases.

    Built from filled shapes: a white body silhouette with a pale ink
    outline, black secondaries along the wing's trailing edge, black neck,
    trailing legs and a vermilion crown.
    """
    frames = []
    seed = rng.integers(1 << 30)
    for i in range(n):
        r = np.random.default_rng(seed)
        lift = np.sin(2 * np.pi * i / n)
        S = int(L * 1.7)
        cv = Canvas(S, S, red=True)
        c = S / 2
        bx, by = c + L * 0.05, c
        white = np.zeros((S, S), np.float32)
        black = np.zeros((S, S), np.float32)

        def wing(scale, dx, tone):
            ang = np.radians(-12 - 82 * lift)
            ln = L * 0.62 * scale * (0.42 + 0.58 * abs(lift) ** 0.8)
            sh = np.array([bx - L * 0.06 + dx, by - L * 0.035])
            d = np.array([np.cos(ang) * 0.35 + 0.12, np.sin(ang)])
            d /= np.linalg.norm(d)
            back = np.array([1.0, 0.0])
            lead, trail = [], []
            for k in range(9):
                q = k / 8
                bow = np.array([-d[1], d[0]]) * np.sin(q * np.pi) * L * 0.03 * np.sign(-lift + 1e-3)
                p = sh + d * ln * q + bow
                chord = L * 0.24 * scale * (1 - 0.55 * q ** 1.4)
                lead.append(p)
                trail.append(p + back * chord)
            poly = [tuple(p) for p in lead] + [tuple(p) for p in trail[::-1]]
            m = cv.mask_poly(poly)
            # Black band along the trailing edge, serrated feather tips.
            band = []
            for k in range(9):
                q = k / 8
                f = 0.5 + 0.12 * np.sin(k * 2.3)
                band.append(tuple(lead[k] + (trail[k] - lead[k]) * f))
            bm = cv.mask_poly(band + [tuple(p) for p in trail[::-1]])
            for k in range(1, 9):
                tip = trail[k] + np.array([L * 0.035, 0]) + d * L * 0.01
                fm = cv.mask_poly([tuple(trail[k - 1]), tuple(tip), tuple(trail[k])], blur=0.6)
                bm = np.maximum(bm, fm)
                m = np.maximum(m, fm)
            return m * tone, bm * tone

        wf, bf = wing(0.85, L * 0.05, 0.75)
        white = np.maximum(white, wf)
        black = np.maximum(black, bf)
        # Legs trailing behind (kept aside: the fill below rewrites cv.d).
        legs = Canvas(S, S)
        legs.stroke([(bx + L * 0.16, by + L * 0.03), (bx + L * 0.45, by + L * 0.07),
                   (bx + L * 0.68, by + L * 0.09)], L * 0.011, r, ink=ink * 0.85,
                  profile=even_profile)
        legs.stroke([(bx + L * 0.16, by + L * 0.04), (bx + L * 0.44, by + L * 0.095),
                   (bx + L * 0.66, by + L * 0.125)], L * 0.011, r, ink=ink * 0.85,
                  profile=even_profile)
        body = cv.mask_ellipse(bx, by, L * 0.2, L * 0.062)
        neck_w = cv.mask_poly([(bx - L * 0.14, by - L * 0.045), (bx - L * 0.32, by - L * 0.06),
                               (bx - L * 0.32, by - L * 0.035), (bx - L * 0.12, by + L * 0.01)])
        head = cv.mask_ellipse(bx - L * 0.55, by - L * 0.062, L * 0.03, L * 0.021)
        white = np.maximum.reduce([white, body, neck_w, head])
        neck_b = cv.mask_poly([(bx - L * 0.3, by - L * 0.06), (bx - L * 0.53, by - L * 0.075),
                               (bx - L * 0.53, by - L * 0.05), (bx - L * 0.3, by - L * 0.033)])
        black = np.maximum(black, neck_b)
        tail = cv.mask_poly([(bx + L * 0.12, by - L * 0.05), (bx + L * 0.3, by - L * 0.035),
                             (bx + L * 0.27, by + L * 0.0), (bx + L * 0.31, by + L * 0.02),
                             (bx + L * 0.14, by + L * 0.04)], blur=0.8)
        black = np.maximum(black, tail)
        wn, bn = wing(1.0, 0.0, 1.0)
        # Near wing covers what is behind it.
        black = black * (1 - wn) + bn
        white = np.maximum(white, wn)
        edge = ndimage.gaussian_gradient_magnitude(ndimage.gaussian_filter(white, 0.6), 1.0)
        edge = np.clip(edge * 2.2, 0, 1)
        tex = 0.75 + 0.35 * value_noise(S, S, 2, 5, r)
        brush = 0.55 + 0.6 * value_noise(S, S, 6, 6, r)
        cv.d = edge * ink * 0.5 * brush * (1 - black) + black * ink * tex
        cv.d += legs.d * (1 - white)
        cv.white = np.clip(white, 0, 1)
        crown = blob(L * 0.017, r)
        stamp(cv.r, crown, bx - L * 0.55 - crown.shape[1] / 2,
              by - L * 0.078 - crown.shape[0] / 2, k=1.4)
        cv.stroke([(bx - L * 0.575, by - L * 0.058), (bx - L * 0.7, by - L * 0.05)],
                  L * 0.013, r, ink=ink * 0.55, profile=lambda q: 1 - 0.7 * q)
        frames.append(cv.sprite(c, c, alpha_k=1.4))
    return frames


# ----------------------------------------------------- seal & calligraphy --

def make_seal(rng, text="清音", size=150):
    s = size
    pad = 10
    w, h = s + pad * 2, int(s * (1.0 if len(text) <= 2 else 1.0)) + pad * 2
    img = Image.new("L", (w * 3, h * 3), 0)
    dr = ImageDraw.Draw(img)
    big = ImageFont.truetype(FONT_DIR + "MaShanZheng.ttf", int(s * 0.46 * 3))
    for i, ch in enumerate(text):
        bb = dr.textbbox((0, 0), ch, font=big)
        cw, chh = bb[2] - bb[0], bb[3] - bb[1]
        cy = pad * 3 + (s * 3) * (0.27 + 0.46 * i) - chh / 2 - bb[1]
        dr.text((w * 3 / 2 - cw / 2 - bb[0], cy), ch, font=big, fill=255)
    chars = np.asarray(img, np.float32).reshape(h, 3, w, 3).mean(axis=(1, 3)) / 255
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    n = value_noise(h, w, 3, 3, rng)
    box = smoothstep(pad - 1.5, pad + 1.5, np.minimum.reduce([xx + n * 3, w - xx + n * 3,
                                                               yy + n * 3, h - yy + n * 3]))
    wear = smoothstep(0.08, 0.22, value_noise(h, w, 5, 5, rng) * 0.6 + n * 0.4)
    inner = smoothstep(pad + 7, pad + 9, np.minimum.reduce([xx, w - xx, yy, h - yy]))
    border_gap = 1 - (smoothstep(pad + 4.5, pad + 5.5, np.minimum.reduce([xx, w - xx, yy, h - yy]))
                      * (1 - inner)) * 0.85
    red = box * wear * (1 - chars) * border_gap
    red = red * (0.8 + 0.3 * value_noise(h, w, 8, 8, rng))
    return Sprite(np.clip(red * 1.2, 0, 1), np.zeros_like(red), red * 1.1, w / 2, h / 2)


class Calligraphy:
    """Vertical inscription written character by character."""

    def __init__(self, rng, text, size=120, font="ZhiMangXing.ttf", ink=2.7, gap=0.08):
        self.chars = []
        f = ImageFont.truetype(FONT_DIR + font, size * 3)
        y = 0
        for ch in text:
            S = int(size * 1.3)
            img = Image.new("L", (S * 3, S * 3), 0)
            dr = ImageDraw.Draw(img)
            bb = dr.textbbox((0, 0), ch, font=f)
            dr.text((S * 1.5 - (bb[0] + bb[2]) / 2, S * 1.5 - (bb[1] + bb[3]) / 2), ch,
                    font=f, fill=255)
            m = np.asarray(img, np.float32).reshape(S, 3, S, 3).mean(axis=(1, 3)) / 255
            n = value_noise(S, S, 2, 6, rng)
            dryness = smoothstep(0.25, 0.6, n * 0.7 + rng.random() * 0.3)
            m = m * (0.75 + 0.25 * dryness)
            m = np.maximum(m, ndimage.gaussian_filter(m, 1.2) * 0.7)
            yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
            order = (yy / S) * 0.8 + (xx / S) * 0.3 + value_noise(S, S, 10, 10, rng) * 0.15
            order = (order - order.min()) / (order.max() - order.min())
            self.chars.append(dict(m=m.astype(np.float32), order=order.astype(np.float32),
                                   y=y, S=S))
            y += size * (1 + gap)
        self.ink = ink
        self.height = y

    def render(self, D, x, y, progress, per_char=1.0):
        """progress counts characters written (fractional = mid-stroke)."""
        for i, c in enumerate(self.chars):
            p = progress - i
            if p <= 0:
                break
            p = min(1.0, p / per_char)
            vis = smoothstep(p * 1.15 - 0.15 + 0.06, p * 1.15 - 0.15 - 0.02, c["order"]) \
                if p < 1 else 1.0
            bleed = 1.0 + 0.08 * smoothstep(0, 1, p)
            stamp(D, c["m"] * vis * self.ink * bleed, x - c["S"] / 2, y + c["y"] - c["S"] / 2)


# ---------------------------------------------------------------- willow ---

def make_willow(rng, length=760, n=11, ink=2.2, spread=380):
    """Willow branches hanging from the top edge, anchored at the top."""
    w, h = int(spread + length * 0.5 + 60), int(length + 40)
    cv = Canvas(w, h)
    ax = 30
    for i in range(n):
        x0 = ax + rng.uniform(0, spread)
        L = length * rng.uniform(0.5, 1.0)
        out = rng.uniform(40, 140)
        pts = [(x0, 0), (x0 + out * 0.8, L * 0.25), (x0 + out, L * 0.6), (x0 + out * 0.9, L)]
        cv.stroke(pts, rng.uniform(2.2, 3.4), rng, ink=ink * rng.uniform(0.55, 0.9),
                  profile=lambda s: 1 - 0.6 * s, dry=0.2)
        P = np.array(pts)
        for k in range(int(L / 26)):
            s = 0.15 + 0.85 * k / max(1, L / 26)
            j = s * 3
            q = P[int(min(2, j))] * (1 - (j - int(min(2, j)))) + P[int(min(2, j)) + 1] * (j - int(min(2, j)))
            side = 1 if k % 2 else -1
            ll = rng.uniform(16, 28)
            a = np.radians(90 + side * rng.uniform(20, 40))
            cv.stroke([(q[0], q[1]), (q[0] + np.cos(a) * ll, q[1] + np.sin(a) * ll)],
                      rng.uniform(4, 6), rng, ink=ink * rng.uniform(0.5, 0.85),
                      profile=leaf_profile)
    return cv.sprite(ax + spread / 2, 0)
