# ARRI-inspired display look LUT (soft highlight roll-off, gentle toe, natural skin, olive greens, teal-ish blues)
import numpy as np
from scipy.interpolate import PchipInterpolator
N = 33
x = np.linspace(0, 1, N)
B, G, R = np.meshgrid(x, x, x, indexing='ij')
rgb = np.stack([R, G, B], -1).reshape(-1, 3)
# 1. film-like tone curve per channel
cx = [0.0, 0.05, 0.15, 0.30, 0.50, 0.68, 0.82, 0.92, 1.0]
cy = [0.022, 0.052, 0.138, 0.288, 0.50, 0.688, 0.818, 0.893, 0.952]
curve = PchipInterpolator(cx, cy)
out = curve(rgb)
# 2. luminance-dependent saturation
Y = out @ np.array([0.2126, 0.7152, 0.0722])
def sstep(a, b, v): t = np.clip((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
sat = 0.93 * (1 - 0.32 * sstep(0.68, 1.0, Y)) * (1 - 0.22 * (1 - sstep(0.0, 0.16, Y)))
out = Y[:, None] + (out - Y[:, None]) * sat[:, None]
# 3. hue-selective tweaks in HSV
mx = out.max(1); mn = out.min(1); d = mx - mn + 1e-9
h = np.zeros_like(mx)
r, g, b = out[:, 0], out[:, 1], out[:, 2]
m = mx == r; h[m] = ((g - b)[m] / d[m]) % 6
m = mx == g; h[m] = ((b - r)[m] / d[m]) + 2
m = mx == b; h[m] = ((r - g)[m] / d[m]) + 4
h = h * 60.0
s = np.where(mx > 0, d / (mx + 1e-9), 0); v = mx
def gauss(hh, c, w): dd = (hh - c + 180) % 360 - 180; return np.exp(-(dd / w) ** 2)
wg = gauss(h, 115, 40)       # greens -> toward yellow/olive, less saturated
h = h - 12 * wg; s = s * (1 - 0.2 * wg)
wb = gauss(h, 220, 30)       # blues -> slightly toward cyan, a touch less saturated
h = h - 7 * wb; s = s * (1 - 0.08 * wb)
ws = gauss(h, 25, 18)        # skin/orange: keep rich, a hair warmer
s = s * (1 + 0.04 * ws); h = h + 2 * ws
wr = gauss(h, 0, 14); s = s * (1 - 0.1 * wr)
h = h % 360
c = v * s; hp = h / 60; xx = c * (1 - np.abs(hp % 2 - 1)); z = np.zeros_like(c)
conds = [(hp < 1), (hp < 2), (hp < 3), (hp < 4), (hp < 5), (hp >= 5)]
vals = [(c, xx, z), (xx, c, z), (z, c, xx), (z, xx, c), (xx, z, c), (c, z, xx)]
o = np.zeros_like(out); done = np.zeros(len(c), bool)
for cd, (a1, a2, a3) in zip(conds, vals):
    m = cd & ~done; o[m, 0] = a1[m]; o[m, 1] = a2[m]; o[m, 2] = a3[m]; done |= m
o += (v - c)[:, None]
# 4. split tone: cool shadows, warm cream highlights
Y = o @ np.array([0.2126, 0.7152, 0.0722])
sh = (1 - sstep(0.0, 0.42, Y))[:, None]; hi = sstep(0.55, 1.0, Y)[:, None]
o += sh * np.array([-0.010, 0.002, 0.014]) + hi * np.array([0.016, 0.006, -0.014])
o = np.clip(o, 0, 1)
with open('work/arri_look.cube', 'w') as f:
    f.write('TITLE "ARRI-inspired look"\nLUT_3D_SIZE 33\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n')
    for p in o: f.write(f"{p[0]:.6f} {p[1]:.6f} {p[2]:.6f}\n")
print('ok', o.shape)
