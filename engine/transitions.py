"""Ink-language transitions between two graded frames A (outgoing) and B (incoming), progress p in [0,1]."""
from functools import lru_cache
import math

import numpy as np
import cv2

from core import W, H, CX, CY, INK, PAPER, smoothstep, clamp01, fbm, ease


@lru_cache(maxsize=8)
def _noise(seed, cell=60):
    return fbm(H // 2, W // 2, cell, 5, seed)


def _up(x):
    return cv2.resize(x, (W, H), interpolation=cv2.INTER_LINEAR)


def blend(kind, A, B, p, seed=0, **kw):
    p = float(np.clip(p, 0, 1))
    if kind == "cut":
        return B if p >= 0.5 else A
    if kind == "dissolve":
        e = ease(p)
        return A * (1 - e) + B * e
    if kind == "fade_black":  # A -> black -> B
        if p < 0.5:
            return A * (1 - ease(p * 2))
        return B * ease((p - 0.5) * 2)
    if kind == "mist":
        # A is swallowed by drifting paper-white mist, B condenses out of it
        n = _up(_noise(seed, 90))
        n2 = _up(_noise(seed + 1, 35))
        fog = clamp01(math.sin(math.pi * p) * 1.35 - 0.15 + (n - 0.5) * 0.6 + (n2 - 0.5) * 0.25)[..., None]
        base = A if p < 0.5 else B
        mix = smoothstep(0.35, 0.65, p)
        base = A * (1 - mix) + B * mix
        col = np.asarray(kw.get("color", PAPER), np.float32)
        return base * (1 - fog) + col * fog
    if kind == "ink_bloom":
        # B spreads in from ink blossoms; a darker wet fringe rides the boundary
        cx, cy = kw.get("center", (0.5, 0.5))
        yy, xx = np.mgrid[0:H // 2, 0:W // 2].astype(np.float32)
        d = np.hypot(xx - cx * W / 2, (yy - cy * H / 2) * 1.2) / (W / 2)
        n = _noise(seed, 50)
        field = d + (n - 0.5) * 0.45
        r = ease(p) * 1.35
        m = _up(smoothstep(r, r - 0.08, field))[..., None]
        fringe = _up(np.exp(-((field - r) / 0.035) ** 2))[..., None] * (1 - abs(2 * p - 1)) ** 0.5
        out = A * (1 - m) + B * m
        ink = np.asarray(kw.get("color", INK), np.float32)
        return out * (1 - 0.65 * fringe) + ink * 0.65 * fringe
    if kind == "ink_black":
        # ink floods the frame from noisy edges, then recedes revealing B
        yy, xx = np.mgrid[0:H // 2, 0:W // 2].astype(np.float32)
        d = 1 - np.minimum(np.minimum(xx / (W / 2), 1 - xx / (W / 2)), np.minimum(yy / (H / 2), 1 - yy / (H / 2))) * 2
        n = _noise(seed, 40)
        field = d * 0.6 + n * 0.4
        cover = math.sin(math.pi * p) * 1.25
        m = _up(smoothstep(1 - cover, 1 - cover + 0.12, field))[..., None]
        base = A if p < 0.5 else B
        ink = np.asarray(kw.get("color", INK), np.float32)
        return base * (1 - m) + ink * m
    if kind == "silk_wipe":
        # a glinting silk thread sweeps across; B is revealed behind it
        ang = kw.get("angle", 0.12)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        pos = (xx + (yy - CY) * ang) / W
        front = -0.1 + ease(p) * 1.25
        m = smoothstep(front + 0.015, front - 0.015, pos)[..., None]
        line = np.exp(-((pos - front) * W / 1.4) ** 2)[..., None]
        glow = np.exp(-((pos - front) * W / 14) ** 2)[..., None] * 0.35
        out = A * (1 - m) + B * m
        return clamp01(out + (line + glow) * np.array([0.95, 0.95, 0.97], np.float32) * (1 - out))
    if kind == "water":
        # ripple rings expand from a centre; B is seen through refraction inside the wave front
        cx, cy = kw.get("center", (0.5, 0.55))
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        dx, dy = xx - cx * W, (yy - cy * H) * 2.2
        r = np.hypot(dx, dy) + 1e-3
        R = ease(p) * W * 1.25
        wave = np.sin((r - R) / 18.0) * np.exp(-((r - R) / 120) ** 2)
        disp = wave * 14
        mx = (xx + dx / r * disp).astype(np.float32)
        my = (yy + dy / r * disp / 2.2).astype(np.float32)
        A2 = cv2.remap(A.astype(np.float32), mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        B2 = cv2.remap(B.astype(np.float32), mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        m = smoothstep(R + 40, R - 40, r)[..., None]
        hl = (np.maximum(wave, 0) * 0.25)[..., None]
        return clamp01(A2 * (1 - m) + B2 * m + hl)
    if kind == "peel":
        # mural flakes: cell mosaic where each flake flips to B at its own time; flake edges darken
        cells = kw.get("cells", 28)
        rng = np.random.default_rng(seed)
        gh, gw = int(H / W * cells) + 2, cells + 2
        thr = rng.random((gh, gw)).astype(np.float32)
        thr_up = cv2.resize(thr, (W, H), interpolation=cv2.INTER_NEAREST)
        n = _up(_noise(seed + 3, 12))
        thr_up = clamp01(thr_up * 0.8 + n * 0.2)
        m = smoothstep(thr_up - 0.02, thr_up + 0.02, p * 1.1 - 0.05)[..., None]
        edge = clamp01(1 - np.abs(p * 1.1 - 0.05 - thr_up) / 0.04)[..., None]
        out = A * (1 - m) + B * m
        return out * (1 - 0.45 * edge)
    raise ValueError(kind)
