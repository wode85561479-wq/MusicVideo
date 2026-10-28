"""Layered ink-wash mountains (远山 / 近峰) generated as wide panoramas."""
import numpy as np
from scipy import ndimage

from .core import H, blob, fbm, noise1d, smoothstep, value_noise

STYLES = {
    # Distant ranges: pale, soft edges, no texture strokes.
    "far": dict(tone=0.42, contour=0.3, edge_w=12, body=0.8, body_fall=0.5,
                cun=0.15, edge_noise=4.0, aa=2.5, side=0.25, opacity=0.9, dots=0,
                detail=0.05, fade=0.45),
    "mid": dict(tone=0.85, contour=0.9, edge_w=6, body=0.7, body_fall=0.32,
                cun=0.45, edge_noise=2.5, aa=1.4, side=0.4, opacity=0.95, dots=0.5,
                detail=0.07, fade=0.4),
    "near": dict(tone=1.5, contour=1.25, edge_w=4, body=0.6, body_fall=0.22,
                 cun=0.5, edge_noise=1.6, aa=1.0, side=0.5, opacity=1.0, dots=1.0,
                 detail=0.09, fade=0.35),
}


class Peak:
    def __init__(self, c, h, wl, wr, base, p, q):
        self.c, self.h, self.wl, self.wr, self.base, self.p, self.q = c, h, wl, wr, base, p, q


def ridge(peak, xs, n_lo, n_hi, detail):
    u = np.where(xs < peak.c, (xs - peak.c) / peak.wl, (xs - peak.c) / peak.wr)
    au = np.clip(np.abs(u), 0, 1)
    prof = (1 - au ** peak.p) ** peak.q
    det = peak.h * detail * (n_lo * 1.0 + n_hi * 0.35) * np.sqrt(prof)
    return peak.base - peak.h * prof + det, u, prof


def make_peaks(width, rng, base_y, h_range, spacing, w_ratio=(0.55, 0.95),
               p_range=(1.4, 2.8), q_range=(0.8, 2.0), sub=(0, 3), x_range=None, gap=0.0):
    peaks = []
    x0, x1 = x_range if x_range else (-200, width + 200)
    x = x0 + rng.random() * spacing
    while x < x1:
        if rng.random() < gap:
            x += spacing * rng.uniform(0.8, 1.6)
            continue
        h = rng.uniform(*h_range)
        wl = h * rng.uniform(*w_ratio)
        wr = h * rng.uniform(*w_ratio)
        peaks.append(Peak(x, h, wl, wr, base_y + rng.uniform(-0.04, 0.04) * h,
                          rng.uniform(*p_range), rng.uniform(*q_range)))
        for _ in range(rng.integers(sub[0], sub[1] + 1)):
            hh = h * rng.uniform(0.3, 0.8)
            cx = x + rng.choice([-1, 1]) * rng.uniform(0.3, 0.75) * (wl + wr) / 2
            peaks.append(Peak(cx, hh, hh * rng.uniform(*w_ratio), hh * rng.uniform(*w_ratio),
                              base_y + rng.uniform(0.0, 0.12) * h,
                              rng.uniform(*p_range), rng.uniform(*q_range)))
        x += spacing * rng.uniform(0.6, 1.4)
    return peaks


def render_range(width, peaks, rng, style="mid", height=H, tone_mul=1.0, fade_len=None):
    """Rasterise peaks (back to front) into (alpha, density) panoramas."""
    st = dict(STYLES[style])
    A = np.zeros((height, width), np.float32)
    D = np.zeros((height, width), np.float32)
    order = sorted(peaks, key=lambda p: (-p.h, p.base))
    ridges = []
    for pk in order:
        xa = int(max(0, np.floor(pk.c - pk.wl)))
        xb = int(min(width, np.ceil(pk.c + pk.wr)))
        if xb - xa < 2:
            continue
        xs = np.arange(xa, xb, dtype=np.float32)
        n = len(xs)
        n_lo = noise1d(n, max(8, pk.h * 0.25), rng, octaves=2)
        n_hi = noise1d(n, 6, rng, octaves=2)
        ytop, u, prof = ridge(pk, xs, n_lo, n_hi, st["detail"])
        fl = (fade_len if fade_len else pk.h * st["fade"])
        ya = int(max(0, np.floor(ytop.min() - 4)))
        yb = int(min(height, np.ceil(pk.base + fl * 0.5)))
        if yb - ya < 2:
            continue
        ys = np.arange(ya, yb, dtype=np.float32)[:, None]
        hh = yb - ya
        en = (value_noise(hh, n, 3, 3, rng) - 0.5) * 2 * st["edge_noise"]
        dy = ys - ytop[None, :] + en
        a_edge = smoothstep(-st["aa"], st["aa"], dy)
        mist_n = value_noise(hh, n, max(4, fl * 0.35), max(4, fl * 0.6), rng)
        fade = 1 - smoothstep(pk.base - fl, pk.base + fl * 0.2, ys + (mist_n - 0.5) * fl * 0.9)
        dyp = np.maximum(dy, 0)
        dry = 0.6 + 0.4 * value_noise(hh, n, 2, 7, rng)
        lit = np.clip(-u, -1, 1)[None, :]
        contour = np.exp(-dyp / st["edge_w"]) * st["contour"] * dry * (1 + 0.35 * lit)
        body = np.exp(-dyp / (st["body_fall"] * pk.h)) * st["body"]
        shade = np.clip(1 + st["side"] * lit, 0.15, 2)
        # Hemp-fibre texture strokes (披麻皴) radiating down from the summit.
        apex = ytop.min()
        ang = np.arctan2(xs[None, :] - pk.c, ys - apex + pk.h * 0.25)
        na = 4096
        streak = noise1d(na, 22, rng, octaves=3) * 0.5 + 0.5
        idx = np.clip(((ang + np.pi / 2) / np.pi * (na - 1)).astype(np.int32), 0, na - 1)
        brk = value_noise(hh, n, max(6, pk.h * 0.05), max(6, pk.h * 0.07), rng)
        cun = smoothstep(0.3, 0.9, streak[idx] * 0.55 + brk * 0.55)
        cun = 1 - st["cun"] + st["cun"] * 1.6 * cun
        dens = st["tone"] * tone_mul * (contour + body * shade * cun) * fade * a_edge
        alpha = a_edge * fade * st["opacity"]
        sl = (slice(ya, yb), slice(xa, xb))
        A[sl] = A[sl] * (1 - alpha) + alpha
        D[sl] = D[sl] * (1 - alpha) + dens
        ridges.append((xs, ytop, pk))
    if st["dots"] > 0:
        moss_dots(D, A, ridges, rng, st["dots"] * tone_mul, style)
    return A, D, ridges


def moss_dots(D, A, ridges, rng, strength, style):
    """Moss dots (苔点) clustered along the ridge lines."""
    if not ridges:
        return
    total = sum(len(r[0]) for r in ridges)
    n = int(total * (0.02 if style == "near" else 0.012))
    weights = np.array([len(r[0]) for r in ridges], float)
    weights /= weights.sum()
    picks = rng.choice(len(ridges), size=n, p=weights)
    for i in picks:
        xs, ytop, pk = ridges[i]
        j = rng.integers(0, len(xs))
        # Favour the upper part of the peak.
        if ytop[j] > pk.base - pk.h * 0.25:
            continue
        x = xs[j] + rng.normal(0, 3)
        y = ytop[j] + abs(rng.normal(0, 6 if style == "near" else 4))
        r = (1.6 + rng.random() ** 2 * 3.5) * (1.0 if style == "near" else 0.7)
        b = blob(r, rng, irregular=0.35)
        if rng.random() < 0.35:  # little horizontal dash
            b = ndimage.zoom(b, (0.6, 1.8), order=1)
        h, w = b.shape
        y0, x0 = int(y - h / 2), int(x - w / 2)
        if y0 < 0 or x0 < 0 or y0 + h > D.shape[0] or x0 + w > D.shape[1]:
            continue
        sl = (slice(y0, y0 + h), slice(x0, x0 + w))
        D[sl] += b * 1.6 * strength * A[sl]


def mist_texture(width, rng, bands, height=H, cell=220):
    """Static mist field; each band is (y_center, half_height, strength)."""
    n = fbm(height, width, cell, 4, rng, aspect=2.2)
    ys = np.arange(height, dtype=np.float32)[:, None]
    m = np.zeros((height, width), np.float32)
    for yc, hh, k in bands:
        prof = np.exp(-((ys - yc) / hh) ** 2)
        m += prof * k * smoothstep(0.25, 0.75, n + (prof - 0.5) * 0.3)
    return np.clip(m, 0, 1)
