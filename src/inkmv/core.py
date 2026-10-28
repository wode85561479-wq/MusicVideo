"""Core primitives: noise, rice paper, brush strokes and ink compositing.

Everything is drawn in "ink density" space. A frame is two float32 density
buffers (D: black ink, R: vermilion), turned into colour by Beer-Lambert
absorption over a rice-paper texture, so overlapping washes darken the way
real ink does.
"""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

W, H = 1920, 1080
FPS = 30

# Absorption per RGB channel: neutral pine-soot ink and cinnabar red.
K_INK = np.array([1.0, 1.0, 0.93], np.float32)
K_RED = np.array([0.22, 1.75, 1.8], np.float32)


# ---------------------------------------------------------------- maths ----

def smoothstep(e0, e1, x):
    if np.isscalar(x) and np.isscalar(e0) and np.isscalar(e1):
        t = min(max((x - e0) / (e1 - e0), 0.0), 1.0)
        return t * t * (3.0 - 2.0 * t)
    t = np.asarray((x - e0) * (1.0 / (np.asarray(e1) - e0)), dtype=np.float32)
    np.maximum(t, 0.0, out=t)
    np.minimum(t, 1.0, out=t)
    return t * t * (3.0 - 2.0 * t)


def ease(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3.0 - 2.0 * t)


def ease_out(t, k=3.0):
    t = min(max(t, 0.0), 1.0)
    return 1.0 - (1.0 - t) ** k


def window(t, a, b, fade_in, fade_out):
    """1 inside [a, b], easing in/out over the given durations."""
    if t <= a or t >= b:
        return 0.0
    v = 1.0
    if fade_in > 0:
        v = min(v, ease((t - a) / fade_in))
    if fade_out > 0:
        v = min(v, ease((b - t) / fade_out))
    return v


# ---------------------------------------------------------------- noise ----

def upsample(g, h, w):
    img = Image.fromarray(np.ascontiguousarray(g, dtype=np.float32), mode="F")
    return np.asarray(img.resize((w, h), Image.BICUBIC), dtype=np.float32)


def value_noise(h, w, cell_y, cell_x, rng):
    cy = max(1, int(round(cell_y)))
    cx = max(1, int(round(cell_x)))
    gh, gw = h // cy + 4, w // cx + 4
    g = rng.random((gh, gw), dtype=np.float32)
    big = upsample(g, gh * cy, gw * cx)
    return big[cy:cy + h, cx:cx + w]


def fbm(h, w, cell, octaves, rng, persistence=0.5, aspect=1.0):
    """Fractal value noise normalised to roughly 0..1."""
    total = np.zeros((h, w), np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        c = cell / (2 ** o)
        total += amp * value_noise(h, w, c, c * aspect, rng)
        norm += amp
        amp *= persistence
    total /= norm
    lo, hi = np.percentile(total[::4, ::4], [1, 99])
    return np.clip((total - lo) / (hi - lo + 1e-6), 0, 1)


def noise1d(n, cell, rng, octaves=2):
    """Smooth 1-D noise in -1..1."""
    out = np.zeros(n, np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        c = max(1.0, cell / 2 ** o)
        g = rng.random(int(n / c) + 4) * 2 - 1
        x = np.arange(n) / c + 1
        v = np.interp(x, np.arange(len(g)), g)
        v = ndimage.gaussian_filter1d(v, c * 0.35) if c > 2 else v
        out += amp * v
        norm += amp
        amp *= 0.5
    out /= norm
    m = np.abs(out).max() + 1e-6
    return (out / m).astype(np.float32)


# ---------------------------------------------------------------- paper ----

def make_paper(rng):
    """Xuan (rice) paper colour plus a static ink-absorbency map."""
    h, w = H, W
    base = np.array([236, 229, 211], np.float32) / 255.0
    blotch = (fbm(h, w, 380, 3, rng) - 0.5) * 0.055
    cloud = (fbm(h, w, 70, 3, rng) - 0.5) * 0.03
    grain = ndimage.gaussian_filter(
        rng.standard_normal((h, w)).astype(np.float32), 0.65) * 0.03

    fib = []
    for _ in range(2):
        img = Image.new("L", (w, h), 0)
        dr = ImageDraw.Draw(img)
        for _ in range(2600):
            x, y = rng.random() * w, rng.random() * h
            a = rng.random() * np.pi * 2
            ln = 6 + rng.random() ** 2 * 70
            bend = (rng.random() - 0.5) * 0.8
            pts = []
            for k in range(5):
                t = k / 4
                aa = a + bend * t
                pts.append((x + np.cos(aa) * ln * t, y + np.sin(aa) * ln * t))
            dr.line(pts, fill=int(80 + rng.random() * 175), width=1)
        fib.append(ndimage.gaussian_filter(np.asarray(img, np.float32) / 255.0, 0.55))
    lum = 1.0 + blotch + cloud + grain - fib[0] * 0.035 + fib[1] * 0.03

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r2 = ((xx / w - 0.5) / 0.5) ** 2 * 0.55 + ((yy / h - 0.5) / 0.5) ** 2 * 0.45
    vig = 1.0 - 0.17 * r2 ** 1.3
    warm = np.stack([np.ones_like(r2), 1 - 0.012 * r2, 1 - 0.05 * r2], -1)
    paper = base[None, None, :] * lum[..., None] * vig[..., None] * warm
    absorb = 0.88 + 0.24 * fbm(h, w, 5, 3, rng)
    absorb *= 0.95 + 0.1 * fbm(h, w, 90, 2, rng)
    return paper.astype(np.float32), absorb.astype(np.float32)


LUT_N, LUT_MAX = 8192, 10.0
_lut_d = np.linspace(0, LUT_MAX, LUT_N, dtype=np.float32)[:, None]
LUT_INK = np.exp(-_lut_d * K_INK).astype(np.float32)
LUT_RED = np.exp(-_lut_d * K_RED).astype(np.float32)


def _lut_index(d, absorb):
    x = d * absorb
    x *= (LUT_N - 1) / LUT_MAX
    np.minimum(x, LUT_N - 1, out=x)
    return x.astype(np.int32)


def finalize(paper, absorb, D, R, fade_black=0.0):
    """Density buffers -> uint8 RGB via Beer-Lambert lookup tables."""
    T = LUT_INK[_lut_index(D, absorb)]
    if R is not None and R.any():
        T *= LUT_RED[_lut_index(R, absorb)]
    T *= paper
    T *= 255.0 * (1.0 - fade_black)
    T += 0.5
    return T.astype(np.uint8)


def soft_cap(d, cap=3.0):
    return cap * (1.0 - np.exp(-d / cap))


# --------------------------------------------------------------- sprites ---

class Sprite:
    """Alpha (occlusion), ink density and red density with an anchor point."""

    def __init__(self, a, d, r=None, ax=0.0, ay=0.0):
        self.a = a.astype(np.float32)
        self.d = d.astype(np.float32)
        self.r = None if r is None else r.astype(np.float32)
        self.ax, self.ay = ax, ay

    @property
    def shape(self):
        return self.a.shape

    def scaled(self, s):
        h, w = self.a.shape
        nw, nh = max(1, int(round(w * s))), max(1, int(round(h * s)))
        f = lambda arr: None if arr is None else np.asarray(
            Image.fromarray(arr, "F").resize((nw, nh), Image.BILINEAR), np.float32)
        return Sprite(f(self.a), f(self.d), f(self.r), self.ax * s, self.ay * s)

    def rotated(self, deg, crop=True):
        """Rotate about the anchor (positive = clockwise on screen)."""
        h, w = self.a.shape
        pad = int(np.hypot(h, w)) + 2

        def rot(arr):
            if arr is None:
                return None
            big = np.zeros((pad * 2, pad * 2), np.float32)
            oy, ox = int(pad - self.ay), int(pad - self.ax)
            big[oy:oy + h, ox:ox + w] = arr
            img = Image.fromarray(big, "F").rotate(-deg, Image.BILINEAR,
                                                   center=(pad, pad))
            return np.asarray(img, np.float32)

        a, d, r = rot(self.a), rot(self.d), rot(self.r)
        if not crop:
            return Sprite(a, d, r, pad, pad)
        ys, xs = np.nonzero(a > 1e-3)
        if len(ys) == 0:
            return Sprite(a[:1, :1], d[:1, :1], None if r is None else r[:1, :1])
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = lambda arr: None if arr is None else arr[y0:y1, x0:x1].copy()
        return Sprite(crop(a), crop(d), crop(r), pad - x0, pad - y0)

    def flipped_x(self):
        h, w = self.a.shape
        f = lambda arr: None if arr is None else arr[:, ::-1].copy()
        return Sprite(f(self.a), f(self.d), f(self.r), w - self.ax, self.ay)


class RotSet:
    """A sprite pre-rotated to several angles, blended for smooth swaying."""

    def __init__(self, spr, angles):
        self.angles = np.asarray(angles, np.float64)
        rs = [spr.rotated(a, crop=False) for a in angles]
        amax = np.max([r.a for r in rs], axis=0)
        ys, xs = np.nonzero(amax > 1e-3)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        self.a = np.stack([r.a[y0:y1, x0:x1] for r in rs])
        self.d = np.stack([r.d[y0:y1, x0:x1] for r in rs])
        self.r = None if spr.r is None else np.stack([r.r[y0:y1, x0:x1] for r in rs])
        self.ax, self.ay = rs[0].ax - x0, rs[0].ay - y0

    def get(self, ang):
        f = float(np.interp(ang, self.angles, np.arange(len(self.angles))))
        i0 = int(f)
        i1 = min(i0 + 1, len(self.angles) - 1)
        w = np.float32(f - i0)

        def mix(arr):
            if arr is None:
                return None
            if w < 1e-3 or i0 == i1:
                return arr[i0]
            return arr[i0] + (arr[i1] - arr[i0]) * w

        spr = Sprite.__new__(Sprite)
        spr.a, spr.d, spr.r = mix(self.a), mix(self.d), mix(self.r)
        spr.ax, spr.ay = self.ax, self.ay
        return spr


def _clip_region(fh, fw, x, y, h, w):
    x0, y0 = int(np.floor(x)), int(np.floor(y))
    fx0, fy0 = max(0, x0), max(0, y0)
    fx1, fy1 = min(fw, x0 + w), min(fh, y0 + h)
    if fx1 <= fx0 or fy1 <= fy0:
        return None
    return (slice(fy0, fy1), slice(fx0, fx1),
            slice(fy0 - y0, fy1 - y0), slice(fx0 - x0, fx1 - x0))


def over(D, R, spr, x, y, opacity=1.0, ink_mul=1.0, red_mul=1.0):
    """Composite sprite with its anchor at (x, y) over the frame buffers."""
    if opacity <= 0.002:
        return
    h, w = spr.a.shape
    reg = _clip_region(D.shape[0], D.shape[1], x - spr.ax, y - spr.ay, h, w)
    if reg is None:
        return
    fy, fx, sy, sx = reg
    a = spr.a[sy, sx] * opacity
    keep = 1.0 - a
    D[fy, fx] = D[fy, fx] * keep + spr.d[sy, sx] * (opacity * ink_mul)
    if R is not None:
        R[fy, fx] *= keep
        if spr.r is not None:
            R[fy, fx] += spr.r[sy, sx] * (opacity * red_mul)


def add_patch(D, patch, x, y, k=1.0):
    h, w = patch.shape
    reg = _clip_region(D.shape[0], D.shape[1], x, y, h, w)
    if reg is None:
        return
    fy, fx, sy, sx = reg
    D[fy, fx] += patch[sy, sx] * k


def pan_crop(arr, x, y=0, w=W, h=H):
    """Crop with sub-pixel horizontal offset (linear interpolation)."""
    xi = int(np.floor(x))
    f = np.float32(x - xi)
    yi = int(round(y))
    a = arr[yi:yi + h, xi:xi + w]
    if f < 1e-3:
        return a
    b = arr[yi:yi + h, xi + 1:xi + 1 + w]
    return a + (b - a) * f


# --------------------------------------------------------------- brush -----

def catmull_rom(pts, density=0.5):
    pts = np.asarray(pts, np.float64)
    if len(pts) == 2:
        n = max(2, int(np.linalg.norm(pts[1] - pts[0]) * density))
        t = np.linspace(0, 1, n)[:, None]
        return pts[0] * (1 - t) + pts[1] * t
    P = np.vstack([2 * pts[0] - pts[1], pts, 2 * pts[-1] - pts[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1:i + 3]
        n = max(2, int(np.linalg.norm(p2 - p1) * density))
        t = np.linspace(0, 1, n, endpoint=False)[:, None]
        out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ** 2
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(P[-2][None])
    return np.vstack(out)


def _resample(poly, step):
    d = np.linalg.norm(np.diff(poly, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(d)])
    L = cum[-1]
    n = max(2, int(L / step) + 1)
    s = np.linspace(0, L, n)
    pts = np.stack([np.interp(s, cum, poly[:, 0]), np.interp(s, cum, poly[:, 1])], 1)
    tg = np.gradient(pts, axis=0)
    tg /= np.linalg.norm(tg, axis=1)[:, None] + 1e-9
    nm = np.stack([-tg[:, 1], tg[:, 0]], 1)
    return pts, s / max(L, 1e-6), L, nm


def default_profile(s):
    return (0.45 + 0.55 * smoothstep(0.0, 0.12, s)) * (1 - 0.75 * smoothstep(0.7, 1.0, s))


def leaf_profile(s):
    return smoothstep(0.0, 0.28, s) ** 0.8 * (1 - s) ** 0.9 * 1.6


def even_profile(s):
    return 0.85 + 0.15 * smoothstep(0.0, 0.05, s) - 0.1 * smoothstep(0.9, 1.0, s)


class StrokePatch:
    def __init__(self, d, s, x0, y0):
        self.d, self.s, self.x0, self.y0 = d, s, x0, y0


def render_stroke(points, width, rng, ink=1.0, profile=default_profile, dry=0.0,
                  dry_start=0.55, wet_edge=0.15, rough=0.12, ss=2, want_s=False,
                  bleed=0.6, ink_fall=0.3, bristle=0.06):
    """Sweep a bristle brush along a Catmull-Rom path.

    Returns a StrokePatch whose density lives in output pixels at (x0, y0).
    `dry` adds flying-white streaks towards the end of the stroke; `want_s`
    also returns the arc-length parameter of every pixel, so a stroke can be
    revealed progressively as if being painted.
    """
    pts_in = np.asarray(points, np.float64) * ss
    poly = catmull_rom(pts_in, density=0.5)
    step = 0.4
    pts, s, L, nm = _resample(poly, step)
    N = len(pts)
    half = width * ss / 2.0
    wj = 1.0 + rough * noise1d(N, max(4, 60 / step), rng)
    hw = half * np.maximum(profile(s), 0.0) * wj
    hw = np.maximum(hw, 0.6)
    nv = int(np.ceil(2 * half * 1.15 / step)) + 2
    v = np.linspace(-1.0, 1.0, nv).astype(np.float32)

    bris = 0.6 * (noise1d(nv, max(2, nv * bristle), rng) * 0.5 + 0.5) \
        + 0.4 * ndimage.uniform_filter1d(rng.random(nv).astype(np.float32), 2)
    dry_s = dry * smoothstep(dry_start, 1.0, s) + dry * 0.15
    ink_s = ink * (1 - ink_fall * s) * (1 - 0.35 * dry_s)

    margin = half * 1.3 + 4
    x_min, y_min = pts[:, 0].min() - margin, pts[:, 1].min() - margin
    x_max, y_max = pts[:, 0].max() + margin, pts[:, 1].max() + margin
    ox, oy = int(np.floor(x_min / ss)) * ss, int(np.floor(y_min / ss)) * ss
    bw = int(np.ceil((x_max - ox) / ss)) * ss + ss
    bh = int(np.ceil((y_max - oy) / ss)) * ss + ss
    canvas = np.zeros((bh, bw), np.float32)
    smap = np.full((bh, bw), np.inf, np.float32) if want_s else None

    grid = upsample(rng.random((max(2, N // 90 + 2), max(2, nv // 6 + 2))).astype(np.float32),
                    N, nv)
    # Each side of the stroke wanders independently along its length.
    e_left = 0.07 * noise1d(N, max(4, 120 / step), rng) + 0.03 * noise1d(N, 8, rng)
    e_right = 0.07 * noise1d(N, max(4, 120 / step), rng) + 0.03 * noise1d(N, 8, rng)
    # Rounded start where the brush touches down.
    d0 = s * L
    cap = np.sqrt(np.clip(1 - ((hw - d0) / hw) ** 2, 0.05, 1.0))
    cap[d0 >= hw] = 1.0
    av = np.abs(v)
    chunk = max(1, 3_000_000 // nv)
    for c0 in range(0, N, chunk):
        c1 = min(N, c0 + chunk)
        n2 = grid[c0:c1]
        side = np.where(v[None, :] < 0, 1 + e_left[c0:c1, None], 1 + e_right[c0:c1, None])
        rel = av[None, :] / (side * cap[c0:c1, None])
        edge = smoothstep(1.0, 0.86, rel)
        wet = 1.0 + wet_edge * smoothstep(0.6, 0.97, rel)
        thr = -0.25 + 1.05 * dry_s[c0:c1, None]
        dryf = smoothstep(thr - 0.1, thr + 0.1, 0.72 * bris[None, :] + 0.28 * n2)
        streak = 0.78 + 0.22 * bris[None, :]
        val = ink_s[c0:c1, None] * edge * wet * dryf * streak * (0.9 + 0.1 * n2)
        px = pts[c0:c1, None, 0] + nm[c0:c1, None, 0] * (v[None, :] * hw[c0:c1, None]) - ox
        py = pts[c0:c1, None, 1] + nm[c0:c1, None, 1] * (v[None, :] * hw[c0:c1, None]) - oy
        ix = np.clip(np.rint(px).astype(np.int32), 0, bw - 1).ravel()
        iy = np.clip(np.rint(py).astype(np.int32), 0, bh - 1).ravel()
        flat = iy * bw + ix
        vv = val.astype(np.float32).ravel()
        keep = vv > 1e-3
        np.maximum.at(canvas.ravel(), flat[keep], vv[keep])
        if want_s:
            sv = np.broadcast_to(s[c0:c1, None], val.shape).astype(np.float32).ravel()
            np.minimum.at(smap.ravel(), flat[keep], sv[keep])

    d = canvas.reshape(bh // ss, ss, bw // ss, ss).mean(axis=(1, 3))
    if bleed > 0:
        d = d * 0.82 + ndimage.gaussian_filter(d, bleed) * 0.3
    sm = None
    if want_s:
        sm = smap.reshape(bh // ss, ss, bw // ss, ss).min(axis=(1, 3))
        sm = ndimage.grey_dilation(np.where(np.isinf(sm), 2.0, sm), size=1)
    return StrokePatch(d.astype(np.float32), sm, ox // ss, oy // ss)


def stamp(canvas, patch, x0=None, y0=None, mode="add", k=1.0):
    """Put a StrokePatch (or array at x0, y0) into a canvas."""
    if isinstance(patch, StrokePatch):
        arr, x0, y0 = patch.d, patch.x0, patch.y0
    else:
        arr = patch
    h, w = arr.shape
    reg = _clip_region(canvas.shape[0], canvas.shape[1], x0, y0, h, w)
    if reg is None:
        return
    fy, fx, sy, sx = reg
    if mode == "add":
        canvas[fy, fx] += arr[sy, sx] * k
    elif mode == "max":
        np.maximum(canvas[fy, fx], arr[sy, sx] * k, out=canvas[fy, fx])
    elif mode == "min":
        np.minimum(canvas[fy, fx], arr[sy, sx], out=canvas[fy, fx])


def blob(radius, rng, irregular=0.25, soft=0.25, grain=0.25, ring=0.0):
    """Irregular ink dot (moss dots, petals, drops)."""
    r = radius
    n = int(np.ceil(r * 2.6)) + 4
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) - (n - 1) / 2
    ang = np.arctan2(yy, xx)
    dist = np.hypot(xx, yy)
    k = rng.integers(3, 7)
    ph = rng.random(4) * 6.28
    wob = (np.sin(ang * k + ph[0]) * 0.5 + np.sin(ang * (k + 2) + ph[1]) * 0.3
           + np.sin(ang * 2 + ph[2]) * 0.4)
    rr = r * (1 + irregular * wob / 1.2)
    m = smoothstep(rr, rr - max(0.8, soft * r), dist)
    g = value_noise(n, n, max(1, r * 0.35), max(1, r * 0.35), rng)
    d = m * (1 - grain + grain * g)
    if ring > 0:
        d *= 1 + ring * smoothstep(rr * 0.55, rr * 0.95, dist)
    return d.astype(np.float32)
