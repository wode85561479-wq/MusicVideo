"""Core of the 勿听 ink-animation renderer: constants, easing, noise, 2.5D camera, compositing, grading.

Conventions
- Working frame is the 2.39:1 active picture W x H (1920 x 804); letterbox is added at output (1920 x 1080).
- Colours are float32 sRGB in [0,1]. Layers are premultiplied RGBA.
- Camera model: every layer is a plane at distance Z. Camera translation (x, y) is expressed in
  frame pixels of shift for a plane at Z = 1, so a plane at Z moves by x / Z. Dolly `z` moves the
  camera forward: magnification Z / (Z - z). `zoom` is a focal-length change, `roll` in degrees.
"""
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[1]
FPS = 24
W, H = 1920, 804
OUT_W, OUT_H = 1920, 1080
CX, CY = W / 2.0, H / 2.0

INK = np.array([0.075, 0.072, 0.080], np.float32)
PAPER = np.array([0.925, 0.895, 0.830], np.float32)
PAPER_NIGHT = np.array([0.80, 0.84, 0.86], np.float32)
CINNABAR = np.array([0.72, 0.17, 0.11], np.float32)
AZURITE = np.array([0.16, 0.36, 0.52], np.float32)
MALACHITE = np.array([0.25, 0.52, 0.44], np.float32)
OCHRE = np.array([0.63, 0.41, 0.22], np.float32)
GOLD = np.array([0.74, 0.61, 0.33], np.float32)
LUMA = np.array([0.299, 0.587, 0.114], np.float32)


# ------------------------------------------------------------------ easing / keys
def clamp01(x):
    return np.clip(x, 0.0, 1.0)


def smoothstep(a, b, x):
    t = clamp01((np.asarray(x, np.float32) - a) / (b - a + 1e-9))
    return t * t * (3 - 2 * t)


def ease(x):
    """Cubic ease-in-out on [0,1]; linear extrapolation outside so motion never freezes in transitions."""
    if x < 0:
        return 0.0 + 0.0 * x
    if x > 1:
        return 1.0
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_in(x):
    x = min(max(x, 0.0), 1.0)
    return x ** 3


def lerp(a, b, t):
    return a + (b - a) * t


def keys(u, pts, fn=None):
    """Interpolate keyframes [(u, value), ...] with per-segment easing (default smooth cubic).
    Outside the key range the motion continues at a gentle linear rate (for transition overlap)."""
    fn = fn or ease
    if u <= pts[0][0]:
        (u0, v0), (u1, v1) = pts[0], pts[1]
        slope = (np.asarray(v1) - np.asarray(v0)) / (u1 - u0 + 1e-9) * 0.15
        return np.asarray(v0) + slope * (u - u0)
    if u >= pts[-1][0]:
        (u0, v0), (u1, v1) = pts[-2], pts[-1]
        slope = (np.asarray(v1) - np.asarray(v0)) / (u1 - u0 + 1e-9) * 0.15
        return np.asarray(v1) + slope * (u - u1)
    for (u0, v0), (u1, v1) in zip(pts[:-1], pts[1:]):
        if u0 <= u <= u1:
            return lerp(np.asarray(v0, np.float64), np.asarray(v1, np.float64), fn((u - u0) / (u1 - u0 + 1e-9)))
    return np.asarray(pts[-1][1])


def drift(u, a, b):
    """Linear drift with soft start/end; continues linearly beyond [0,1]."""
    return a + (b - a) * u


# ------------------------------------------------------------------ noise
def value_noise(h, w, cell, seed, wrap_x=False):
    rng = np.random.default_rng(seed)
    gh, gw = int(np.ceil(h / cell)) + 3, int(np.ceil(w / cell)) + (0 if wrap_x else 3)
    g = rng.random((gh, gw), dtype=np.float32)
    if wrap_x:
        g = np.concatenate([g[:, -2:], g, g[:, :3]], axis=1)
        up = cv2.resize(g, (g.shape[1] * cell, gh * cell), interpolation=cv2.INTER_CUBIC)
        return up[cell:cell + h, 2 * cell:2 * cell + w]
    up = cv2.resize(g, (gw * cell, gh * cell), interpolation=cv2.INTER_CUBIC)
    return up[cell:cell + h, cell:cell + w]


def fbm(h, w, cell, octaves=5, seed=0, persistence=0.5, wrap_x=False):
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        c = max(1, int(cell / 2 ** o))
        if wrap_x and w % c:
            c = max(1, w // max(1, w // c))
        out += amp * value_noise(h, w, c, seed + 101 * o, wrap_x)
        tot += amp
        amp *= persistence
    out /= tot
    lo, hi = np.percentile(out, 1), np.percentile(out, 99)
    return clamp01((out - lo) / (hi - lo + 1e-9)).astype(np.float32)


@lru_cache(maxsize=4)
def paper_texture(seed=7):
    """Multiplicative rice-paper texture (mean ~1): mottling, fibres, grain and aged edges."""
    cache = ROOT / "compositing" / "procedural" / f"paper_{seed}.npy"
    if cache.exists():
        return np.load(cache)
    rng = np.random.default_rng(seed)
    mott = fbm(H, W, 260, 5, seed) - 0.5
    grain = value_noise(H, W, 1, seed + 3) - 0.5
    fib = np.zeros((H * 2, W * 2), np.uint8)
    for _ in range(5200):
        x, y = rng.integers(0, W * 2), rng.integers(0, H * 2)
        L = rng.integers(20, 120)
        ang = rng.uniform(0, np.pi)
        pts = []
        for i in range(6):
            ang += rng.normal(0, 0.25)
            x += np.cos(ang) * L / 6
            y += np.sin(ang) * L / 6
            pts.append((int(x), int(y)))
        cv2.polylines(fib, [np.array(pts, np.int32)], False, int(rng.integers(60, 200)), 1, cv2.LINE_AA)
    fib = cv2.resize(fib, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    fib = cv2.GaussianBlur(fib, (0, 0), 0.6)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.hypot((xx - CX) / CX, (yy - CY) / CY)
    edge = 1 - 0.10 * smoothstep(0.75, 1.45, r)
    tex = (1 + 0.045 * mott + 0.022 * grain - 0.05 * fib) * edge
    tex = tex.astype(np.float32)
    cache.parent.mkdir(parents=True, exist_ok=True)
    np.save(cache, tex)
    return tex


# ------------------------------------------------------------------ camera
@dataclass
class Cam:
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    zoom: float = 1.0
    roll: float = 0.0
    shake: tuple = (0.0, 0.0)
    pan: tuple = (0.0, 0.0)  # uniform screen shift (a tilt/pan rotation: no parallax)

    def mag(self, Z):
        return self.zoom * Z / max(Z - self.z, 1e-3)

    def project(self, X, Y, Z):
        """World point at frame-offset (X, Y) (pixels at cam origin) on plane Z -> frame coords."""
        m = self.zoom * Z / np.maximum(Z - self.z, 1e-3)
        dx = (X - self.x / Z) * m
        dy = (Y - self.y / Z) * m
        if self.roll:
            a = np.deg2rad(self.roll)
            dx, dy = dx * np.cos(a) - dy * np.sin(a), dx * np.sin(a) + dy * np.cos(a)
        return CX + dx + self.shake[0] + self.pan[0], CY + dy + self.shake[1] + self.pan[1], m


def layer_matrix(lw, lh, b, o, Z, cam, pivot=None):
    """Affine for a layer image (lw x lh) whose pivot sits at frame offset `o` (from frame centre) at
    base scale `b` when the camera is at origin. Default pivot = image centre."""
    px, py = pivot if pivot is not None else (lw / 2.0, lh / 2.0)
    m = cam.mag(Z)
    a = np.deg2rad(cam.roll)
    R = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]], np.float64)
    A = R * m * b
    t = np.array([CX + cam.shake[0] + cam.pan[0], CY + cam.shake[1] + cam.pan[1]]) + R @ (m * (np.asarray(o, np.float64) - np.array([cam.x, cam.y]) / Z)) - A @ np.array([px, py])
    return np.hstack([A, t[:, None]])


def warp_full(img, M, border=cv2.BORDER_REFLECT_101):
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=border)


def warp_roi(img, M, pad=2):
    """Warp only into the destination bounding box. Returns (patch, x0, y0) or None if off-screen."""
    h, w = img.shape[:2]
    corners = np.array([[0, 0, 1], [w, 0, 1], [0, h, 1], [w, h, 1]], np.float64) @ M.T
    x0, y0 = np.floor(corners.min(0)).astype(int) - pad
    x1, y1 = np.ceil(corners.max(0)).astype(int) + pad
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
    if x1 <= x0 or y1 <= y0:
        return None
    M2 = M.copy()
    M2[:, 2] -= [x0, y0]
    patch = cv2.warpAffine(img, M2, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR,
                           borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    return patch, x0, y0


# ------------------------------------------------------------------ compositing
def to_premul_u8(rgb_u8, a_u8):
    a = a_u8.astype(np.float32) / 255.0
    return np.dstack([(rgb_u8.astype(np.float32) * a[..., None]).round().astype(np.uint8), a_u8])


def over(canvas, patch, x0=0, y0=0, opacity=1.0):
    """Composite a premultiplied RGBA patch (uint8 or float) onto canvas (float32 HxWx3) in place."""
    p = patch.astype(np.float32)
    if patch.dtype == np.uint8:
        p *= 1.0 / 255.0
    if opacity != 1.0:
        p *= opacity
    h, w = p.shape[:2]
    region = canvas[y0:y0 + h, x0:x0 + w]
    a = p[..., 3:4]
    region *= (1.0 - a)
    region += p[..., :3]
    return canvas


def multiply_layer(canvas, density, color, x0=0, y0=0):
    """Ink-wash style: darken toward `color` by density (HxW in [0,1])."""
    h, w = density.shape[:2]
    region = canvas[y0:y0 + h, x0:x0 + w]
    d = density[..., None]
    region *= (1 - d) + d * np.asarray(color, np.float32)
    return canvas


# ------------------------------------------------------------------ grading
def duotone(lum, ink=INK, paper=PAPER):
    return ink + (paper - ink) * lum[..., None]


def grade(rgb, sat=0.15, contrast=1.0, pivot=0.5, gamma=1.0, lift=0.0, gain=1.0,
          ink=INK, paper=PAPER, keep=0.0):
    """Ink-on-paper grade: luminance -> ink/paper duotone, plus `sat` of the original chroma.
    `keep` mixes back the untouched source (0 = full ink grade)."""
    lum = rgb @ LUMA
    l = clamp01((lum - pivot) * contrast + pivot) * gain + lift
    l = clamp01(l) ** gamma
    out = duotone(l, ink, paper)
    if sat:
        out += (rgb - lum[..., None]) * sat
    if keep:
        out = out * (1 - keep) + rgb * keep
    return clamp01(out)


_HUE_ANCHORS = np.array([8, 28, 45, 160, 205, 260, 330], np.float32)
_HUE_COLORS = np.stack([CINNABAR, OCHRE, GOLD, MALACHITE, AZURITE, AZURITE * 0.8, CINNABAR * 0.9])


def mural(rgb, strength=1.0):
    """Dunhuang mineral-pigment remap: pull each hue to the nearest palette pigment, flatten values,
    keep luminance structure. Returns colour image (use as the 'colour' side of a reveal mask)."""
    hsv = cv2.cvtColor(clamp01(rgb).astype(np.float32), cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    d = np.abs(h[..., None] - _HUE_ANCHORS)
    d = np.minimum(d, 360 - d)
    wts = np.exp(-(d / 22.0) ** 2) + 1e-6
    wts /= wts.sum(-1, keepdims=True)
    pig = wts @ _HUE_COLORS
    lum = rgb @ LUMA
    pl = pig @ LUMA
    shade = np.clip(lum / (pl + 1e-3), 0.2, 1.6)[..., None] ** 0.75
    col = clamp01(pig * shade)
    sw = smoothstep(0.08, 0.45, s)[..., None] * strength
    base = duotone(clamp01(lum * 1.02))
    return clamp01(base * (1 - sw) + col * sw)


def vignette(strength=0.35, softness=0.9):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.hypot((xx - CX) / CX, (yy - CY) / (CY * 1.25))
    return (1 - strength * smoothstep(0.35, 0.35 + softness, r)).astype(np.float32)


_VIG = {}


def finish(rgb, frame_index, paper_amt=1.0, vig=0.3, grain=0.007):
    """Paper texture, vignette, temporal grain, letterbox -> uint8 OUT_H x OUT_W x 3."""
    tex = paper_texture()
    out = rgb * (1 + (tex[..., None] - 1) * paper_amt)
    if vig:
        key = round(vig, 3)
        if key not in _VIG:
            _VIG[key] = vignette(vig)[..., None]
        out = out * _VIG[key]
    if grain:
        rng = np.random.default_rng(frame_index)
        g = rng.standard_normal((H // 2, W // 2), dtype=np.float32)
        g = cv2.resize(g, (W, H), interpolation=cv2.INTER_LINEAR)[..., None]
        out = out + g * grain
    frame = np.zeros((OUT_H, OUT_W, 3), np.uint8)
    bar = (OUT_H - H) // 2
    frame[bar:bar + H] = (clamp01(out) * 255 + 0.5).astype(np.uint8)
    return frame


# ------------------------------------------------------------------ io
def load_rgba(path):
    im = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if im.ndim == 2:
        im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGRA)
    if im.shape[2] == 3:
        im = cv2.cvtColor(im, cv2.COLOR_BGR2BGRA)
    rgb = cv2.cvtColor(im[:, :, :3], cv2.COLOR_BGR2RGB)
    return rgb, im[:, :, 3]


def load_rgb_f(path):
    im = cv2.imread(str(path), cv2.IMREAD_COLOR)
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0


def qinglu(rgb, strength=1.0):
    """青绿山水 mineral landscape: luminance mapped through ink -> azurite -> malachite -> pale ochre -> paper,
    with saturated source hues (temples, lacquer) remapped by `mural`."""
    lum = clamp01(rgb @ LUMA)
    stops = np.array([0.0, 0.28, 0.46, 0.66, 0.88, 1.0], np.float32)
    cols = np.stack([INK, AZURITE * 0.62, MALACHITE * 0.92, np.array([0.66, 0.68, 0.52], np.float32), PAPER, PAPER])
    gm = np.stack([np.interp(lum, stops, cols[:, k]) for k in range(3)], -1).astype(np.float32)
    hsv = cv2.cvtColor(clamp01(rgb).astype(np.float32), cv2.COLOR_RGB2HSV)
    sw = smoothstep(0.12, 0.4, hsv[..., 1])[..., None]
    out = gm * (1 - sw) + mural(rgb) * sw
    return clamp01(rgb * (1 - strength) + out * strength) if strength < 1 else out
