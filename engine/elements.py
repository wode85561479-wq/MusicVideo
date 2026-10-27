"""Scene elements for the 勿听 renderer. Every element draws itself onto a float32 canvas for (cam, t)."""
import json
import math

import numpy as np
import cv2

from core import (ROOT, W, H, CX, CY, INK, PAPER, CINNABAR, Cam, clamp01, smoothstep, fbm, value_noise,
                  layer_matrix, warp_full, warp_roi, over, load_rgba)

PLATES = ROOT / "compositing" / "plates"
SPRITES = ROOT / "compositing" / "sprites"
PROC = ROOT / "compositing" / "procedural"


def disparity_to_Z(d, z_far=9.0, z_near=1.7):
    return 1.0 / (d * (1.0 / z_near - 1.0 / z_far) + 1.0 / z_far)


def _premul_f32(rgb_u8, a_u8):
    a = a_u8.astype(np.float32) / 255.0
    return np.dstack([rgb_u8.astype(np.float32) / 255.0 * a[..., None], a])


# ====================================================================== plate stack
class PlateStack:
    """Depth-sliced painting. `focus` = plate point (normalised u,v) placed at frame centre at cam origin.
    `cover` > 1 leaves margin for camera travel. `reveal` (callable t -> progress or None) paints the
    plate in ink: darkest strokes first, washes after, spreading with noise."""

    def __init__(self, pid, focus=(0.5, 0.5), cover=1.08, z_far=9.0, z_near=1.7, reveal=None, seed=3,
                 exposure=1.0, skip_layers=()):
        meta = json.loads((PLATES / pid / "meta.json").read_text())
        self.pw, self.ph = meta["size"]
        self.b = max(W / self.pw, H / self.ph) * cover
        # keep the frame inside the painting at cam origin
        mu, mv = W / 2 / (self.pw * self.b), H / 2 / (self.ph * self.b)
        focus = (float(np.clip(focus[0], mu, 1 - mu)), float(np.clip(focus[1], mv, 1 - mv)))
        self.focus = focus
        self.o = np.array([(0.5 - focus[0]) * self.pw * self.b, (0.5 - focus[1]) * self.ph * self.b])
        self.layers = []
        for L in meta["layers"]:
            if L["index"] in skip_layers:
                continue
            rgb, a = load_rgba(PLATES / pid / f"layer{L['index']}.png")
            if exposure != 1.0:
                rgb = np.clip(rgb.astype(np.float32) * exposure, 0, 255).astype(np.uint8)
            pm = np.dstack([(rgb.astype(np.float32) * (a[..., None] / 255.0)).astype(np.uint8), a])
            self.layers.append((pm, disparity_to_Z(L["disparity_median"], z_far, z_near), L["index"] == 0))
        self.reveal = reveal
        if reveal is not None:
            col = cv2.imread(str(PLATES / pid / "color.jpg"), cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255
            n = fbm(self.ph // 4, self.pw // 4, 40, 5, seed)
            n = cv2.resize(n, (self.pw, self.ph))
            dark = 1 - cv2.GaussianBlur(col, (0, 0), 3)
            order = 0.55 * (1 - dark) + 0.45 * n
            order = (order - order.min()) / (order.max() - order.min())
            self.order = (order * 255).astype(np.uint8)

    def Z(self, k):
        return self.layers[k][1]

    def plate_to_offset(self, u, v):
        """Plate normalised coords -> frame offset at cam origin (for placing sprites on the plate)."""
        return np.array([(u - 0.5) * self.pw * self.b, (v - 0.5) * self.ph * self.b]) + self.o

    def render(self, canvas, cam, t, upto=None, start=0):
        rev = self.reveal(t) if self.reveal else None
        for k, (pm, Z, base) in enumerate(self.layers):
            if k < start:
                continue
            if upto is not None and k >= upto:
                break
            M = layer_matrix(self.pw, self.ph, self.b, self.o, Z, cam)
            patch = warp_full(pm, M, cv2.BORDER_REFLECT_101 if base else cv2.BORDER_CONSTANT).astype(np.float32) / 255
            if rev is not None and rev < 1.0:
                order = warp_full(self.order, M).astype(np.float32) / 255
                w = 0.18
                m = smoothstep(0.0, w, rev * (1 + w) - order)[..., None]
                # wet edge: ink pools slightly darker at the advancing front
                front = (m * (1 - m) * 4)
                patch = patch * m
                canvas *= (1 - 0.25 * front * patch[..., 3:4])
            over(canvas, patch)
        return canvas


# ====================================================================== sprite puppet
class Sprite:
    """Character cut-out with secondary motion.
    height: on-screen height (px) at cam origin for plane Z.  pivot: normalised (px, py) in sprite.
    sway: cloth/hair displacement — amplitude in sprite px, grows below `waist` (normalised y).
    """

    def __init__(self, sid, height, Z=3.0, pos=(0, 0), pivot=(0.5, 1.0), flip=False, sway=6.0, waist=0.45,
                 sway_freq=0.35, hair=0.0, hair_region=(0.0, 0.35), breath=0.004, ink_edge=0.6, exposure=1.0,
                 tint=(1, 1, 1), desat=0.0, rim=None, crop=None, seed=0, max_scale=None, hair_sides=0.0):
        rgb, a = load_rgba(SPRITES / f"{sid}.png")
        self.flipped, self.crop = flip, crop
        if crop:  # normalised crop box (x0,y0,x1,y1)
            hh, ww = a.shape
            x0, y0, x1, y1 = int(crop[0] * ww), int(crop[1] * hh), int(crop[2] * ww), int(crop[3] * hh)
            rgb, a = rgb[y0:y1, x0:x1], a[y0:y1, x0:x1]
        if flip:
            rgb, a = rgb[:, ::-1].copy(), a[:, ::-1].copy()
        self.native_h = a.shape[0]
        # pre-scale to roughly the largest on-screen size used (keeps remap cheap)
        target = (max_scale or height * 1.35) / self.native_h
        if target < 0.95:
            nw, nh = max(2, int(a.shape[1] * target)), max(2, int(a.shape[0] * target))
            rgb = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_AREA)
            a = cv2.resize(a, (nw, nh), interpolation=cv2.INTER_AREA)
        f = rgb.astype(np.float32) / 255 * exposure * np.asarray(tint, np.float32)
        if desat:
            g = f @ np.array([0.299, 0.587, 0.114], np.float32)
            f = f * (1 - desat) + g[..., None] * desat
        al = a.astype(np.float32) / 255
        if ink_edge:
            inner = cv2.GaussianBlur(cv2.erode(al, np.ones((5, 5), np.uint8)), (0, 0), 1.5)
            edge = clamp01(al - inner) * 2
            n = fbm(al.shape[0], al.shape[1], 6, 3, seed + 11)
            al = al * (1 - ink_edge * edge * smoothstep(0.42, 0.72, n))
            f = f * (1 - 0.35 * ink_edge * edge[..., None])
        if rim:
            (lx, ly), col, strength, width = rim
            sh = np.float32([[1, 0, -lx * width], [0, 1, -ly * width]])
            shifted = cv2.warpAffine(al, sh, (al.shape[1], al.shape[0]))
            rimm = clamp01(al - shifted)
            rimm = cv2.GaussianBlur(rimm, (0, 0), max(1.0, width / 3))
            f = f + rimm[..., None] * np.asarray(col, np.float32) * strength
        self.pm = np.dstack([clamp01(f) * al[..., None], al]).astype(np.float32)
        self.h, self.w = al.shape
        self.scale = height / self.h
        self.Z, self.pos = Z, np.asarray(pos, np.float64)
        self.pivot = (pivot[0] * self.w, pivot[1] * self.h)
        self.sway, self.waist, self.sway_freq = sway * self.h / 1000.0, waist, sway_freq
        self.hair, self.hair_region, self.breath = hair * self.h / 1000.0, hair_region, breath
        self.seed = seed
        self.hair_sides = hair_sides
        gy, gx = np.mgrid[0:self.h, 0:self.w].astype(np.float32)
        self.gx, self.gy = gx, gy
        yn = np.linspace(0, 1, 48, dtype=np.float32)[:, None]
        self.wcloth = (clamp01((yn - waist) / (1 - waist + 1e-6)) ** 1.6)
        self.whair = smoothstep(hair_region[0], hair_region[0] + 0.05, yn) * (1 - smoothstep(hair_region[1] - 0.05, hair_region[1], yn))
        self.overlays = []

    def deform(self, t):
        """Coarse 48x24 displacement grid (cloth wind + hair + breathing), upsampled."""
        gw = 24
        yn = np.linspace(0, 1, 48, dtype=np.float32)[:, None]
        xn = np.linspace(0, 1, gw, dtype=np.float32)[None, :]
        ph = 2 * np.pi * self.sway_freq * t + self.seed
        wave = (np.sin(ph + yn * 5.0 + xn * 1.3) * 0.65 + np.sin(1.7 * ph + yn * 9.0 - xn * 2.1) * 0.35)
        dx = self.sway * self.wcloth * wave
        dy = 0.25 * self.sway * self.wcloth * np.cos(ph * 1.3 + yn * 4 + xn * 3)
        if self.hair:
            wx = smoothstep(self.hair_sides, self.hair_sides + 0.12, np.abs(xn - 0.5)) if self.hair_sides else 1.0
            dx = dx + self.hair * self.whair * wx * np.sin(2.1 * ph + yn * 7 + xn * 3)
        if self.breath:
            br = math.sin(2 * np.pi * t / 4.2 + self.seed) * self.breath
            dy = dy + (yn - 0.55) * self.h * br * (yn < 0.7)
        dx = cv2.resize(dx.astype(np.float32), (self.w, self.h), interpolation=cv2.INTER_CUBIC)
        dy = cv2.resize(dy.astype(np.float32), (self.w, self.h), interpolation=cv2.INTER_CUBIC)
        return dx, dy

    def frame_image(self, t):
        if self.sway or self.hair or self.breath:
            dx, dy = self.deform(t)
            img = cv2.remap(self.pm, self.gx - dx, self.gy - dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        else:
            img = self.pm.copy()
        for ov in self.overlays:
            ov(img, t)
        return img

    def matrix(self, cam, pos=None, scale_mul=1.0, rot=0.0, bob=0.0):
        p = self.pos if pos is None else np.asarray(pos, np.float64)
        M = layer_matrix(self.w, self.h, self.scale * scale_mul, p + [0, bob], self.Z, cam, pivot=self.pivot)
        if rot:
            R = cv2.getRotationMatrix2D((float(M[0] @ [*self.pivot, 1]), float(M[1] @ [*self.pivot, 1])), rot, 1.0)
            M = np.vstack([R, [0, 0, 1]])[:2] @ np.vstack([M, [0, 0, 1]])
        return M

    def point(self, cam, uv, pos=None, scale_mul=1.0, rot=0.0, bob=0.0):
        """Frame coords of a point given in normalised coords of the ORIGINAL (unflipped, uncropped) sprite."""
        u, v = uv
        if self.crop:
            c = self.crop
            u, v = (u - c[0]) / (c[2] - c[0]), (v - c[1]) / (c[3] - c[1])
        if self.flipped:
            u = 1 - u
        M = self.matrix(cam, pos, scale_mul, rot, bob)
        return M @ np.array([u * self.w, v * self.h, 1.0])

    def render(self, canvas, cam, t, pos=None, opacity=1.0, scale_mul=1.0, rot=0.0, bob=0.0, reveal=None,
               reflect=None, fog=None, blur=0.0, silhouette=None):
        img = self.frame_image(t)
        if silhouette is not None:  # (amount, colour): flatten toward a backlit silhouette
            amt, col = silhouette
            img[..., :3] = img[..., :3] * (1 - amt) + np.asarray(col, np.float32) * img[..., 3:4] * amt
        if reveal is not None and reveal < 1.0:
            img = ink_dissolve(img, reveal, self.seed)
        M = self.matrix(cam, pos, scale_mul, rot, bob)
        if reflect:
            self._reflection(canvas, img, M, t, **reflect)
        r = warp_roi(img, M)
        if r is None:
            return canvas
        patch, x0, y0 = r
        if blur > 0.3:
            pad = int(blur * 3)
            patch = cv2.copyMakeBorder(patch, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
            patch = cv2.GaussianBlur(patch, (0, 0), blur)
            x0, y0 = x0 - pad, y0 - pad
            cx0, cy0 = max(0, -x0), max(0, -y0)
            patch = patch[cy0:, cx0:]
            x0, y0 = x0 + cx0, y0 + cy0
            patch = patch[:H - y0, :W - x0]
        if fog:  # atmospheric veil: pull toward fog colour
            amt, col = fog
            patch[..., :3] = patch[..., :3] * (1 - amt) + np.asarray(col, np.float32) * patch[..., 3:4] * amt
        over(canvas, patch, x0, y0, opacity)
        return canvas

    def _reflection(self, canvas, img, M, t, opacity=0.35, waterline=None, ripple=3.0, darken=0.75, blur=1.5):
        piv = M @ np.array([*self.pivot, 1.0])
        wl = piv[1] if waterline is None else waterline
        F = np.array([[1, 0, 0], [0, -1, 2 * wl], [0, 0, 1]], np.float64)
        Mr = (F @ np.vstack([M, [0, 0, 1]]))[:2]
        r = warp_roi(img, Mr)
        if r is None:
            return
        patch, x0, y0 = r
        ph, pw = patch.shape[:2]
        yy = np.arange(ph, dtype=np.float32)[:, None]
        xx = np.arange(pw, dtype=np.float32)[None, :]
        mx = (xx + ripple * np.sin(yy * 0.35 + t * 2.4) * (0.4 + yy / ph)).astype(np.float32) * np.ones_like(yy)
        my = np.ones_like(xx) * yy
        patch = cv2.remap(patch, mx, my.astype(np.float32), cv2.INTER_LINEAR)
        if blur:
            patch = cv2.GaussianBlur(patch, (0, 0), blur)
        fade = clamp01(1 - yy / (ph * 0.9))[..., None] if ph > 4 else 1.0
        patch = patch * fade
        patch[..., :3] *= darken
        over(canvas, patch, x0, y0, opacity)


def ink_dissolve(img, p, seed=0):
    """Appear/disappear as ink: alpha thresholded against noise with a darker wet edge. p in [0,1]."""
    h, w = img.shape[:2]
    n = fbm(max(8, h // 3), max(8, w // 3), 18, 6, seed + 5, persistence=0.6)
    n = cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC)
    # ink gathers from the ground up: lower parts condense first
    n = clamp01(n * 0.75 + (1 - np.linspace(0, 1, h, dtype=np.float32)[:, None]) * 0.25)
    edge_w = 0.16
    m = smoothstep(0.0, edge_w, p * (1 + edge_w) - n)[..., None]
    out = img * m
    rim = (m * (1 - m) * 4)
    out[..., :3] *= (1 - 0.5 * rim)
    return out


# ====================================================================== fog
class Fog:
    """Drifting mist on plane Z. Two noise fields scroll at different speeds so the fog evolves.
    band: (centre_v, half_height_v) vertical profile in frame-normalised units, or None for full frame."""

    def __init__(self, Z=4.0, density=0.5, color=PAPER, speed=12.0, cell=120, seed=0, band=None,
                 lo=0.35, hi=0.85, scale=2.0):
        self.Z, self.density, self.color, self.speed = Z, density, np.asarray(color, np.float32), speed
        tw, th = int(W * 1.6 / scale), int(H * 1.6 / scale)
        self.tw, self.th, self.scale = tw, th, scale
        self.a = fbm(th, tw, max(4, int(cell / scale)), 5, seed, wrap_x=True)
        self.b2 = fbm(th, tw, max(4, int(cell * 0.6 / scale)), 4, seed + 77, wrap_x=True)
        self.lo, self.hi, self.band = lo, hi, band

    def render(self, canvas, cam, t, density=None):
        dens = self.density if density is None else density
        if dens <= 0.001:
            return canvas
        M1 = layer_matrix(self.tw, self.th, self.scale, (-(self.speed * t) % (self.tw * self.scale), 0), self.Z, cam)
        M2 = layer_matrix(self.tw, self.th, self.scale, (-(self.speed * 1.7 * t + 300) % (self.tw * self.scale), 40), self.Z, cam)
        f1 = cv2.warpAffine(self.a, M1, (W, H), borderMode=cv2.BORDER_WRAP)
        f2 = cv2.warpAffine(self.b2, M2, (W, H), borderMode=cv2.BORDER_WRAP)
        f = f1 * 0.65 + f2 * 0.35
        a = smoothstep(self.lo, self.hi, f) * dens
        if self.band:
            c, hh = self.band
            yy = (np.arange(H, dtype=np.float32) / H)[:, None]
            a = a * (1 - smoothstep(hh * 0.5, hh, np.abs(yy - c)))
        a = a[..., None]
        canvas *= (1 - a)
        canvas += self.color * a
        return canvas


def haze(canvas, amount, color=PAPER, top=None):
    """Uniform aerial veil; optional vertical gradient (top=(v0,v1): stronger toward the top)."""
    if amount <= 0:
        return canvas
    if top:
        yy = (np.arange(H, dtype=np.float32) / H)[:, None, None]
        a = amount * (1 - smoothstep(top[0], top[1], yy))
    else:
        a = amount
    canvas *= (1 - a)
    canvas += np.asarray(color, np.float32) * a
    return canvas


# ====================================================================== particles
class Particles:
    """Snow / ink motes / dust in a 3D volume, projected through the camera.
    kind: 'snow' (light), 'mote' (dark ink), 'ember' (cinnabar)."""

    def __init__(self, n=400, zrange=(1.0, 8.0), fall=60.0, wind=10.0, size=2.2, color=(0.95, 0.96, 0.97),
                 seed=0, wobble=8.0, opacity=0.9, bokeh_z=1.4):
        rng = np.random.default_rng(seed)
        self.n = n
        self.X = rng.uniform(-1.3, 1.3, n) * W
        self.Y = rng.uniform(-1.3, 1.3, n) * H
        self.Zs = rng.uniform(*zrange, n)
        self.ph = rng.uniform(0, 2 * np.pi, n)
        self.sz = rng.uniform(0.6, 1.4, n) * size
        self.fall, self.wind, self.wobble = fall, wind, wobble
        self.color = np.asarray(color, np.float32)
        self.opacity, self.bokeh_z = opacity, bokeh_z

    def render(self, canvas, cam, t, opacity=None):
        op = self.opacity if opacity is None else opacity
        if op <= 0:
            return canvas
        span_y, span_x = 2.6 * H, 2.6 * W
        Y = (self.Y + self.fall * t / np.sqrt(self.Zs) + 1.3 * H) % span_y - 1.3 * H
        X = (self.X + self.wind * t / np.sqrt(self.Zs) + self.wobble * np.sin(t * 0.9 + self.ph) + 1.3 * W) % span_x - 1.3 * W
        fx, fy, m = cam.project(X / self.Zs * 2.0, Y / self.Zs * 2.0, self.Zs)
        sharp = np.zeros((H, W), np.uint8)
        soft = np.zeros((H, W), np.uint8)
        for x, y, mm, z, s in zip(fx, fy, m, self.Zs, self.sz):
            if -20 < x < W + 20 and -20 < y < H + 20:
                r = s * mm / max(z, 0.3) * 1.6
                inten = int(255 * min(1.0, 1.4 / z + 0.25))
                tgt = soft if z < self.bokeh_z else sharp
                cv2.circle(tgt, (int(x * 4), int(y * 4)), max(1, int(r * 4)), inten, -1, cv2.LINE_AA, shift=2)
        a = sharp.astype(np.float32) / 255
        if soft.any():
            a = np.maximum(a, cv2.GaussianBlur(soft.astype(np.float32) / 255, (0, 0), 3.5) * 0.8)
        a = (a * op)[..., None]
        canvas *= (1 - a)
        canvas += self.color * a
        return canvas


class Petals:
    """Tumbling petals (cinnabar / pale). Either falling through a volume or swirling around a centre."""

    def __init__(self, n=40, color=(0.78, 0.30, 0.24), color2=(0.93, 0.80, 0.76), size=9.0, fall=40.0,
                 wind=30.0, seed=0, swirl=None, zrange=(1.2, 6.0)):
        rng = np.random.default_rng(seed)
        self.n = n
        self.X = rng.uniform(-1.0, 1.0, n) * W
        self.Y = rng.uniform(-1.2, 1.2, n) * H
        self.Zs = rng.uniform(*zrange, n)
        self.ph = rng.uniform(0, 2 * np.pi, n)
        self.spin = rng.uniform(-2.5, 2.5, n)
        self.sz = rng.uniform(0.7, 1.3, n) * size
        self.which = rng.random(n) < 0.6
        self.c1, self.c2 = np.asarray(color, np.float32), np.asarray(color2, np.float32)
        self.fall, self.wind, self.swirl = fall, wind, swirl
        self.rad = rng.uniform(0.15, 1.0, n)

    def render(self, canvas, cam, t, opacity=1.0, count=None):
        if opacity <= 0:
            return canvas
        n = self.n if count is None else int(count)
        if self.swirl:
            cxs, cys, R, speed = self.swirl
            ang = self.ph + speed * t / (0.4 + self.rad)
            X = cxs + np.cos(ang) * R * self.rad * W * 0.5
            Y = cys + np.sin(ang) * R * self.rad * H * 0.35 - 20 * np.sin(t * 0.5 + self.ph) - self.rad * 60
            Zs = self.Zs
            fx, fy, m = cam.project(X, Y, Zs)
        else:
            Y = (self.Y + self.fall * t / np.sqrt(self.Zs) + 1.2 * H) % (2.4 * H) - 1.2 * H
            X = (self.X + self.wind * t / np.sqrt(self.Zs) + 30 * np.sin(t * 0.7 + self.ph) + 1.0 * W) % (2.0 * W) - 1.0 * W
            fx, fy, m = cam.project(X / self.Zs * 2.0, Y / self.Zs * 2.0, self.Zs)
        m1 = np.zeros((H, W), np.uint8)
        m2 = np.zeros((H, W), np.uint8)
        for i in range(n):
            x, y = fx[i], fy[i]
            if not (-30 < x < W + 30 and -30 < y < H + 30):
                continue
            s = self.sz[i] * m[i] / max(self.Zs[i], 0.4) * 2.2
            tumble = abs(math.cos(t * 1.7 + self.ph[i] * 3))
            ang = math.degrees(self.ph[i] + self.spin[i] * t)
            tgt = m1 if self.which[i] else m2
            cv2.ellipse(tgt, (int(x * 4), int(y * 4)), (max(1, int(s * 4)), max(1, int(s * 0.55 * (0.25 + 0.75 * tumble) * 4))),
                        ang, 0, 360, int(255 * min(1, 0.55 + 0.6 / self.Zs[i])), -1, cv2.LINE_AA, shift=2)
        for mk, col in ((m1, self.c1), (m2, self.c2)):
            if mk.any():
                a = cv2.GaussianBlur(mk.astype(np.float32) / 255, (0, 0), 0.8)[..., None] * opacity
                canvas *= (1 - a)
                canvas += col * a
        return canvas


class Crows:
    """Flapping ink crows travelling across the frame."""

    def __init__(self, n=14, seed=0, start=(-0.1, 0.6), end=(1.1, 0.1), spread=(0.35, 0.25), size=14.0,
                 duration=6.0, Z=3.0, delay=1.2):
        rng = np.random.default_rng(seed)
        self.n = n
        self.off = rng.normal(0, 1, (n, 2)) * np.asarray(spread)
        self.delay = rng.uniform(0, delay, n)
        self.speed = rng.uniform(0.8, 1.2, n)
        self.flap = rng.uniform(2.6, 3.6, n)
        self.ph = rng.uniform(0, 2 * np.pi, n)
        self.sz = rng.uniform(0.6, 1.4, n) * size
        self.start, self.end, self.duration, self.Z = np.asarray(start), np.asarray(end), duration, Z

    def render(self, canvas, cam, t, opacity=1.0):
        mask = np.zeros((H, W), np.uint8)
        for i in range(self.n):
            p = (t - self.delay[i]) / self.duration * self.speed[i]
            if p < 0 or p > 1.2:
                continue
            pos = self.start + (self.end - self.start) * p + self.off[i] * (0.3 + p)
            wob = 0.01 * math.sin(t * 2 + self.ph[i])
            X, Y = (pos[0] - 0.5) * W, (pos[1] + wob - 0.5) * H
            fx, fy, m = cam.project(X, Y, self.Z)
            s = self.sz[i] * m * (0.8 + 0.4 * p)
            fl = math.sin(2 * np.pi * self.flap[i] * t + self.ph[i])
            dirx = np.sign(self.end[0] - self.start[0]) or 1
            body = np.array([[-0.9, 0.05], [0.7, -0.05], [0.95, -0.12], [0.6, 0.12]]) * s
            body[:, 0] *= dirx
            wing_up = -0.9 * fl
            wings = [np.array([[0.0, 0], [-0.45 * dirx, wing_up - 0.25], [-0.15 * dirx, wing_up * 0.6], [0.2 * dirx, 0.05]]) * s * 1.6,
                     np.array([[0.0, 0], [0.35 * dirx, wing_up - 0.2], [0.45 * dirx, wing_up * 0.5], [0.3 * dirx, 0.08]]) * s * 1.4]
            for poly in [body] + wings:
                pts = (poly + [fx, fy]) * 4
                cv2.fillPoly(mask, [pts.astype(np.int32)], 255, cv2.LINE_AA, shift=2)
        a = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), 0.7)[..., None] * opacity
        canvas *= (1 - a * 0.92)
        canvas += INK * a * 0.92
        return canvas


class Talismans:
    """Paper talismans (黄符) drifting and tumbling, with cinnabar script marks."""

    def __init__(self, n=6, seed=0, size=38.0, Z=2.5, wind=(-40.0, -14.0)):
        rng = np.random.default_rng(seed)
        self.n = n
        self.p0 = np.c_[rng.uniform(0.0, 1.2, n) * W, rng.uniform(0.1, 0.95, n) * H]
        self.ph = rng.uniform(0, 2 * np.pi, n)
        self.sz = rng.uniform(0.6, 1.3, n) * size
        self.Zs = rng.uniform(Z * 0.6, Z * 1.6, n)
        self.wind = np.asarray(wind)

    def render(self, canvas, cam, t, opacity=1.0):
        for i in range(self.n):
            p = self.p0[i] + self.wind * t / self.Zs[i] * 2 + [25 * math.sin(t * 0.8 + self.ph[i]), 18 * math.sin(t * 1.3 + self.ph[i])]
            X, Y = p[0] - CX, (p[1] % (H * 1.2)) - CY
            fx, fy, m = cam.project(X, Y, self.Zs[i])
            s = self.sz[i] * m
            ang = t * 0.9 + self.ph[i]
            squash = 0.3 + 0.7 * abs(math.cos(t * 1.1 + self.ph[i]))
            c, sn = math.cos(ang), math.sin(ang)
            rect = np.array([[-0.32, -1], [0.32, -1], [0.32, 1], [-0.32, 1]]) * s
            rect[:, 0] *= squash
            R = np.array([[c, -sn], [sn, c]])
            pts = rect @ R.T + [fx, fy]
            x0, y0 = np.floor(pts.min(0)).astype(int) - 2
            x1, y1 = np.ceil(pts.max(0)).astype(int) + 2
            if x1 < 0 or y1 < 0 or x0 > W or y0 > H:
                continue
            x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
            if x1 - x0 < 2 or y1 - y0 < 2:
                continue
            m_ = np.zeros((y1 - y0, x1 - x0), np.uint8)
            cv2.fillPoly(m_, [((pts - [x0, y0]) * 4).astype(np.int32)], 255, cv2.LINE_AA, shift=2)
            ink = np.zeros_like(m_)
            rr = np.random.default_rng(i)
            q = np.c_[rr.normal(0, 0.06, 7), np.linspace(-0.75, 0.75, 7)] * s
            q[:, 0] *= squash
            q = q @ R.T + [fx - x0, fy - y0]
            cv2.polylines(ink, [(q * 4).astype(np.int32)], False, 255, max(1, int(s * 0.10)), cv2.LINE_AA, shift=2)
            for k in range(3):
                c0 = np.array([rr.uniform(-0.15, 0.15), -0.55 + k * 0.5]) * s
                q2 = np.array([c0, c0 + [0.18 * s, 0.05 * s]])
                q2[:, 0] *= squash
                q2 = q2 @ R.T + [fx - x0, fy - y0]
                cv2.line(ink, tuple((q2[0] * 4).astype(int)), tuple((q2[1] * 4).astype(int)), 255, max(1, int(s * 0.08)), cv2.LINE_AA, shift=2)
            m_ = cv2.GaussianBlur(m_, (0, 0), 0.9)
            a = (m_.astype(np.float32) / 255)[..., None] * opacity * 0.85
            reg = canvas[y0:y1, x0:x1]
            reg *= (1 - a)
            reg += np.array([0.80, 0.72, 0.55], np.float32) * a * (0.75 + 0.25 * squash)
            ia = (cv2.GaussianBlur(ink, (0, 0), 0.6).astype(np.float32) / 255 * (m_ > 0))[..., None] * opacity * 0.75
            reg *= (1 - ia)
            reg += CINNABAR * ia
        return canvas


# ====================================================================== silk
def thread_points(A, B, t, sag=30.0, sway=8.0, freq=0.5, phase=0.0, n=48, grow=1.0, wiggle=1.5):
    s = np.linspace(0, 1, n)[:, None]
    A, B = np.asarray(A, np.float64), np.asarray(B, np.float64)
    p = A + (B - A) * s
    d = B - A
    L = np.linalg.norm(d) + 1e-6
    nrm = np.array([-d[1], d[0]]) / L
    bump = 4 * s * (1 - s)
    p = p + np.array([0, sag]) * bump
    p = p + nrm * (sway * np.sin(2 * np.pi * freq * t + phase) * bump + wiggle * np.sin(s * 23 + t * 3 + phase) * bump)
    if grow < 1.0:
        k = max(2, int(n * grow))
        p = p[:k]
    return p


def draw_threads(canvas, polylines, color=(0.92, 0.93, 0.95), width=1, glow=0.6, opacity=1.0, dew=None, blur=0.0):
    """Antialiased hair-thin lines with a soft glow; `dew` = list of (x, y, r) highlight drops."""
    m = np.zeros((H, W), np.uint8)
    for item in polylines:
        pts, inten = item if isinstance(item, tuple) else (item, 1.0)
        if len(pts) >= 2:
            cv2.polylines(m, [(np.asarray(pts) * 4).astype(np.int32)], False, int(255 * inten), width, cv2.LINE_AA, shift=2)
    if dew:
        for (x, y, r) in dew:
            cv2.circle(m, (int(x * 4), int(y * 4)), max(1, int(r * 4)), 255, -1, cv2.LINE_AA, shift=2)
    a = m.astype(np.float32) / 255
    if blur > 0.3:
        a = cv2.GaussianBlur(a, (0, 0), blur) * min(3.0, 1 + blur * 0.4)
    if glow:
        a = np.maximum(a, cv2.GaussianBlur(a, (0, 0), 3.0) * glow)
    a = (clamp01(a) * opacity)[..., None]
    canvas *= (1 - a)
    canvas += np.asarray(color, np.float32) * a
    return canvas


class Web:
    """Hand-made looking orb web: jittered radii, sagging spiral, broken strands, uneven strand weight,
    long anchor threads. Sways; `tear` in [0,1] progressively removes strands."""

    def __init__(self, center, radius, spokes=18, turns=14, seed=0, squash=(1.0, 0.9), rot=0.0, anchors=True):
        rng = np.random.default_rng(seed)
        self.c = np.asarray(center, np.float64)
        self.R, self.spokes, self.turns = radius, spokes, turns
        base = np.linspace(0, 2 * np.pi, spokes, endpoint=False)
        self.ang = base + rng.normal(0, 0.12, spokes) + rot
        self.len = rng.uniform(0.8, 1.15, spokes)
        self.jit = rng.normal(0, 0.06, (turns + 1, spokes))
        self.squash = np.asarray(squash)
        nseg = spokes * turns + spokes * 2
        self.kill = rng.random(nseg)
        self.miss = rng.random(nseg) < 0.12
        self.inten = rng.uniform(0.35, 1.0, nseg)
        self.anchor_len = rng.uniform(1.6, 3.0, spokes) * (rng.random(spokes) < 0.45)
        self.ph = rng.uniform(0, 6, 4)
        self.anchors = anchors

    def polylines(self, t, sway=4.0, tear=0.0, cam=None, Z=None):
        lines, dew = [], []
        k = 0
        off = np.array([sway * math.sin(t * 0.7 + self.ph[0]), sway * 0.6 * math.sin(t * 0.9 + self.ph[1])])
        c = self.c + off * 0.3
        S = self.squash
        rad = lambda j, i: self.R * (j / self.turns) * self.len[i] * (1 + self.jit[j, i])
        for i, a in enumerate(self.ang):
            r = self.R * self.len[i]
            u = np.array([math.cos(a), math.sin(a)])
            tip = c + u * r * S + off
            if self.kill[k] >= tear and not self.miss[k]:
                lines.append((np.linspace(c, tip, 8), self.inten[k] * 0.9))
            k += 1
            if self.anchors and self.anchor_len[i] > 0:
                far = c + u * r * self.anchor_len[i] * S + off * 1.6
                if self.kill[k] >= tear:
                    lines.append((np.linspace(tip, far, 6), self.inten[k] * 0.6))
            k += 1
        for j in range(1, self.turns + 1):
            for i in range(self.spokes):
                i2 = (i + 1) % self.spokes
                a0 = self.ang[i]
                a1 = self.ang[i2] + (2 * np.pi if i2 == 0 else 0)
                if self.kill[k] >= tear and not self.miss[k]:
                    p0 = c + np.array([math.cos(a0), math.sin(a0)]) * rad(j, i) * S
                    p1 = c + np.array([math.cos(a1), math.sin(a1)]) * rad(j, i2) * S
                    mid = (p0 + p1) / 2
                    inward = (c - mid) / (np.linalg.norm(c - mid) + 1e-6)
                    sag = np.linalg.norm(p1 - p0) * 0.10
                    ss = np.linspace(0, 1, 5)[:, None]
                    seg = p0 * (1 - ss) + p1 * ss + inward * sag * 4 * ss * (1 - ss) + np.array([0, 1.0]) * sag * 0.6 * 4 * ss * (1 - ss)
                    seg = seg + off * (j / self.turns)
                    lines.append((seg, self.inten[k] * (0.55 + 0.45 * j / self.turns)))
                    if (k * 7) % 9 == 0:
                        dew.append((seg[2, 0], seg[2, 1], 1.3 + (k % 3) * 0.5))
                k += 1
        return lines, dew


# ====================================================================== ink drop bloom
class InkBloom:
    """A drop that falls, hits the paper and blooms with capillary fingers and a darker coffee-ring edge."""

    def __init__(self, center, radius, t_hit=1.0, tau=1.6, color=INK, seed=0, fall_from=-0.6, strength=0.95, splatter=0.0):
        self.c = np.asarray(center, np.float64)
        self.R, self.t_hit, self.tau, self.color, self.seed = radius, t_hit, tau, np.asarray(color, np.float32), seed
        self.fall_from, self.strength = fall_from, strength
        s = int(radius * 2.6)
        self.sz = s
        self.n = fbm(s // 2, s // 2, 18, 5, seed)
        self.n2 = fbm(s // 2, s // 2, 5, 3, seed + 9)
        self.splatter = splatter
        if splatter:  # satellite droplets and a ragged, finger-like rim
            rng = np.random.default_rng(seed)
            sat = np.zeros((s // 2, s // 2), np.float32)
            for _ in range(int(14 * splatter)):
                ang, rad = rng.uniform(0, 2 * np.pi), rng.uniform(0.55, 1.1) * s / 4
                cv2.circle(sat, (int(s / 4 + np.cos(ang) * rad), int(s / 4 + np.sin(ang) * rad)), int(rng.uniform(1, 4)), 1.0, -1, cv2.LINE_AA)
            self.sat = sat

    def radius(self, t):
        if t < self.t_hit:
            return 0.0
        return self.R * (1 - math.exp(-(t - self.t_hit) / self.tau)) ** 0.6

    def render(self, canvas, cam, t, opacity=1.0):
        if t < self.t_hit:
            p = clamp01(t / self.t_hit)
            y = self.c[1] + (self.fall_from * H) * (1 - p ** 2)
            cv2.ellipse(m := np.zeros((H, W), np.uint8), (int(self.c[0] * 4), int(y * 4)), (int(5 * 4), int((7 + 10 * p) * 4)), 0, 0, 360, 255, -1, cv2.LINE_AA, shift=2)
            a = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 1.0)[..., None] * opacity
            canvas *= 1 - a
            canvas += self.color * a
            return canvas
        r = self.radius(t)
        s = self.sz
        yy, xx = np.mgrid[0:s // 2, 0:s // 2].astype(np.float32) * 2 - s / 2
        dist = np.hypot(xx, yy) / max(r, 1e-3)
        d = dist + (self.n - 0.5) * (0.45 + 0.5 * self.splatter) + (self.n2 - 0.5) * (0.12 + 0.3 * self.splatter)
        body = smoothstep(1.0, 0.82, d)
        if self.splatter:
            body = np.maximum(body, self.sat * min(1.0, r / (self.R * 0.6)))
        ring = smoothstep(0.62, 0.95, d) * body
        dens = body * (0.55 + 0.45 * ring) * (0.85 + 0.15 * self.n2)
        dens = cv2.resize(dens.astype(np.float32), (s, s)) * self.strength * opacity
        x0, y0 = int(self.c[0] - s / 2), int(self.c[1] - s / 2)
        xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + s, W), min(y0 + s, H)
        if xb <= xa or yb <= ya:
            return canvas
        dd = dens[ya - y0:yb - y0, xa - x0:xb - x0][..., None]
        reg = canvas[ya:yb, xa:xb]
        reg *= (1 - dd)
        reg += self.color * dd
        return canvas


# ====================================================================== procedural ink mountains
class InkMountains:
    """Procedurally painted mountain range. Each ridge plane: an asymmetric, domain-warped profile;
    mist-white body that hides the ranges behind (as painters leave paper for cloud); dark broken ridge
    stroke; inner fold lines; vertical 披麻皴 texture; 点苔 dots on near ranges; far ranges soft and pale.
    Optional genesis reveal spreading from `origin`."""

    def __init__(self, seed=0, n=5, width=3000, height=1250, z_far=10.0, z_near=1.9, base=0.30, spread=0.42,
                 tones=None, origin=(0.5, 0.55), cover=1.0, peaks=(3, 6), custom=None, mist=PAPER):
        rng = np.random.default_rng(seed)
        self.pw, self.ph, self.b = width, height, max(W / width, H / height) * cover
        self.layers = []
        self.mist = np.asarray(mist, np.float32)
        tones = tones or [0.32, 0.45, 0.62, 0.80, 0.95]
        xs = np.arange(width, dtype=np.float32)
        yy = np.arange(height, dtype=np.float32)[:, None]
        for k in range(n):
            f = k / max(n - 1, 1)
            baseline = (base + spread * f) * height
            warp = (value_noise(1, width, 300, seed + k * 5)[0] - 0.5) * 0.10 * width
            xw = xs + warp
            lift = np.zeros(width, np.float32)
            npk = rng.integers(*peaks)
            plist = []
            for _ in range(npk):
                plist.append((rng.uniform(-0.05, 1.05) * width, rng.uniform(0.10, 0.26 + 0.14 * (1 - f)) * height,
                              rng.uniform(0.07, 0.15) * width * (0.8 + 0.5 * f), rng.uniform(0.6, 1.6), rng.uniform(1.2, 1.8)))
            if custom and k in custom:
                plist += [(cx_ * width, ch_ * height, cw_ * width, 1.0, cp_) for cx_, ch_, cw_, cp_ in custom[k]]
            for xc, hgt, wid, asym, pw in plist:
                d = xw - xc
                wl = np.where(d < 0, wid * asym, wid / asym)
                lift = np.maximum(lift, hgt * np.exp(-np.abs(d / wl) ** pw * 2.2))
            # shoulders / secondary bumps
            lift = lift + (value_noise(1, width, 120, seed + 31 * k)[0] - 0.5) * 0.06 * height * (0.4 + lift / (lift.max() + 1e-6))
            rough = (value_noise(1, width, 22, seed + 13 * k)[0] - 0.5) * 0.012 * height + \
                    (value_noise(1, width, 6, seed + 17 * k)[0] - 0.5) * 0.004 * height
            prof = baseline - lift + rough
            dist = yy - prof[None, :]
            body = dist > 0
            mist_line = baseline + (0.06 + 0.04 * f) * height
            fadeb = 1 - smoothstep(mist_line - 0.10 * height, mist_line + 0.07 * height, yy)
            fade_occ = 1 - smoothstep(mist_line - 0.02 * height, mist_line + 0.14 * height, yy)
            occ = smoothstep(-1.0, 3.0, dist) * (0.86 + 0.14 * f) * fade_occ
            tex = cv2.resize(fbm(height // 4, width // 4, 14, 4, seed + 31 * k), (width, height), interpolation=cv2.INTER_CUBIC)
            fine = cv2.resize(fbm(height // 2, width // 2, 4, 3, seed + 41 * k), (width, height))
            streak = cv2.GaussianBlur(cv2.resize(fbm(max(8, height // 12), width // 3, 3, 3, seed + 7 * k), (width, height),
                                                 interpolation=cv2.INTER_CUBIC), (0, 0), 1.5)
            fall = (0.07 + 0.07 * f) * height
            wash = np.exp(-np.maximum(dist, 0) / fall) * body
            edge = np.exp(-np.maximum(dist, 0) / (1.8 + 2.5 * f)) * (dist > -1.2)
            dry = smoothstep(0.25, 0.55, fine)
            dens = wash * (0.50 + 0.38 * tex) * (0.93 + 0.14 * (streak - 0.5)) + edge * (0.40 + 0.4 * f) * dry
            # inner folds: offset copies of the ridge line inside the body
            for j in range(1 + int(f > 0.4)):
                off = (0.06 + 0.08 * j) * height * (0.6 + 0.8 * value_noise(1, width, 260, seed + 91 * k + j)[0])
                fold = prof + off
                fd = yy - fold[None, :]
                fline = np.exp(-np.maximum(fd, 0) / (fall * 0.35)) * (fd > -1) * body
                where = smoothstep(0.5, 0.75, value_noise(1, width, 90, seed + 57 * k + j)[0])[None, :]
                dens = dens + fline * 0.18 * dry * where * (lift[None, :] > 0.05 * height)
            dens *= fadeb
            if f > 0.5:  # 点苔
                dots = np.zeros((height, width), np.uint8)
                for _ in range(int(320 * f)):
                    x = int(rng.uniform(0, width))
                    if lift[x] < 0.03 * height:
                        continue
                    y = int(prof[x] + abs(rng.normal(0, 0.025 * height)))
                    cv2.ellipse(dots, (x, y), (int(rng.uniform(1.5, 4.0)), int(rng.uniform(1.0, 2.5))), rng.uniform(0, 180), 0, 360,
                                int(rng.uniform(120, 255)), -1, cv2.LINE_AA)
                dens = np.maximum(dens, cv2.GaussianBlur(dots.astype(np.float32) / 255, (0, 0), 0.8))
            dens = clamp01(dens * tones[min(k, len(tones) - 1)])
            soft = 2.5 * (1 - f)
            if soft > 0.4:
                dens = cv2.GaussianBlur(dens, (0, 0), soft)
                occ = cv2.GaussianBlur(occ, (0, 0), soft)
            col = INK * (0.55 + 0.45 * f) + np.array([0.36, 0.40, 0.45], np.float32) * (1 - f) * 0.45
            col = col / (0.55 + 0.45 * f + (1 - f) * 0.45)
            Z = 1.0 / (f * (1 / z_near - 1 / z_far) + 1 / z_far)
            ox, oy = origin[0] * width, origin[1] * height
            order = 0.55 * np.abs(xs[None, :] - ox) / width + 0.35 * clamp01(dist / (0.35 * height)) + 0.2 * tex + 0.15 * (1 - f)
            order = (order - order.min()) / (order.max() - order.min() + 1e-6)
            self.layers.append(dict(dens=dens.astype(np.float32), occ=occ.astype(np.float32), col=col.astype(np.float32), Z=Z,
                                    order=(order * 255).astype(np.uint8), prof=prof))
        self.o = np.zeros(2)

    def render(self, canvas, cam, t, genesis=None, upto=None, opacity=1.0, mist=None, start=0):
        for k, L in enumerate(self.layers):
            if k < start:
                continue
            if upto is not None and k >= upto:
                break
            M = layer_matrix(self.pw, self.ph, self.b, self.o, L["Z"], cam)
            d = cv2.warpAffine(L["dens"], M, (W, H), borderMode=cv2.BORDER_REFLECT_101)
            oc = cv2.warpAffine(L["occ"], M, (W, H), borderMode=cv2.BORDER_REFLECT_101)
            if genesis is not None:
                g = genesis(k) if callable(genesis) else genesis
                if g < 1.0:
                    order = cv2.warpAffine(L["order"], M, (W, H), borderMode=cv2.BORDER_REFLECT_101).astype(np.float32) / 255
                    wdt = 0.15
                    m = smoothstep(0.0, wdt, g * (1 + wdt) - order)
                    front = m * (1 - m) * 4
                    d = d * m * (1 + 0.35 * front)
                    oc = oc * m
            oc = (oc * opacity)[..., None]
            canvas *= (1 - oc)
            canvas += self.mist * oc
            a = clamp01(d * opacity)[..., None]
            canvas *= (1 - a)
            canvas += L["col"] * a
            if mist is not None and k < len(self.layers) - 1:
                mist(canvas, cam, t, k)
        return canvas

    def ridge_offset(self, k, u):
        """Frame offset (at cam origin) of the ridge top of layer k at horizontal plate position u."""
        L = self.layers[k]
        x = int(np.clip(u, 0, 1) * (self.pw - 1))
        return np.array([(u - 0.5) * self.pw * self.b, (L["prof"][x] / self.ph - 0.5) * self.ph * self.b]) + self.o


# ====================================================================== celestial
class Moon:
    def __init__(self, pos, radius, Z=12.0, color=(0.96, 0.95, 0.90), halo=2.2, halo_strength=0.35, kind="moon", seed=0):
        self.pos, self.r, self.Z = np.asarray(pos, np.float64), radius, Z
        self.color = np.asarray(color, np.float32)
        self.halo, self.hs, self.kind = halo, halo_strength, kind
        s = int(radius * 2 * halo + 8)
        self.s = s
        yy, xx = np.mgrid[0:s, 0:s].astype(np.float32) - s / 2
        d = np.hypot(xx, yy) / radius
        tex = fbm(s, s, max(4, int(radius / 3)), 4, seed)
        if kind == "sun":  # granular cinnabar disc with ragged rim (cf. SC02)
            body = smoothstep(1.0 + 0.08 * (tex - 0.5), 0.9, d) * (0.65 + 0.35 * tex)
        else:
            body = smoothstep(1.0, 0.97, d) * (0.88 + 0.12 * tex)
        halo_a = np.exp(-np.maximum(d - 1, 0) * 3.0 / (halo - 1 + 1e-6)) * (d > 0.98) * self.hs
        self.a = clamp01(np.maximum(body, halo_a)).astype(np.float32)
        self.body = body.astype(np.float32)

    def render(self, canvas, cam, t, opacity=1.0):
        fx, fy, m = cam.project(self.pos[0], self.pos[1], self.Z)
        if self.kind == "hongyun":  # 烘云托月: wash the sky around the moon, leave the disc as paper
            r = self.r * m
            yy, xx = np.ogrid[0:H, 0:W]
            d = np.sqrt((xx - fx) ** 2 + (yy - fy) ** 2).astype(np.float32) / max(r, 1)
            if not hasattr(self, "_tex"):
                self._tex = cv2.resize(fbm(H // 4, W // 4, 50, 5, 77), (W, H))
            wash = smoothstep(0.98, 1.25, d) * (0.30 + 0.25 * self._tex) * (1 - 0.5 * smoothstep(2.0, 6.0, d))
            wash = wash * opacity
            glow = (1 - smoothstep(0.9, 1.02, d)) * opacity
            canvas *= (1 - wash[..., None] * 0.9)
            canvas += INK * wash[..., None] * 0.9
            canvas[:] = canvas * (1 - glow[..., None]) + np.asarray(self.color, np.float32) * glow[..., None]
            return canvas
        M = np.float32([[m, 0, fx - self.s / 2 * m], [0, m, fy - self.s / 2 * m]])
        r = warp_roi(np.dstack([self.a * self.color[0], self.a * self.color[1], self.a * self.color[2], self.a]).astype(np.float32), M)
        if r is None:
            return canvas
        patch, x0, y0 = r
        if self.kind == "moon":  # additive-ish glow: lighten only
            reg = canvas[y0:y0 + patch.shape[0], x0:x0 + patch.shape[1]]
            np.maximum(reg, reg * (1 - patch[..., 3:4] * opacity) + patch[..., :3] * opacity, out=reg)
        else:
            over(canvas, patch, x0, y0, opacity)
        return canvas


# ====================================================================== ripples / vapour
def ripples(canvas, cam, t, sources, Z=2.0, squash=0.28, color=(0.95, 0.95, 0.96), speed=60.0, life=3.0, opacity=0.5):
    """Expanding elliptical rings on a water plane. sources: [(X, Y, t0)] in frame offsets at cam origin."""
    m = np.zeros((H, W), np.uint8)
    for (X, Y, t0) in sources:
        dt = t - t0
        if dt <= 0 or dt > life:
            continue
        fx, fy, mm = cam.project(X, Y, Z)
        for k in range(3):
            rr = (dt - k * 0.35) * speed * mm
            if rr <= 1:
                continue
            fade = (1 - dt / life) * (1 - k * 0.3)
            cv2.ellipse(m, (int(fx * 4), int(fy * 4)), (int(rr * 4), int(rr * squash * 4)), 0, 0, 360,
                        int(255 * fade), 1, cv2.LINE_AA, shift=2)
    a = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 0.8)[..., None] * opacity
    canvas *= (1 - a)
    canvas += np.asarray(color, np.float32) * a
    return canvas


class Vapour:
    """Breath / incense vapour puffs emitted from a point, rising and dissolving."""

    def __init__(self, origin, period=3.6, direction=(-1.0, -0.35), seed=0, size=40.0, color=(0.92, 0.94, 0.96),
                 strength=0.35, continuous=False):
        self.o, self.period, self.dir = np.asarray(origin, np.float64), period, np.asarray(direction)
        self.size, self.color, self.strength, self.cont = size, np.asarray(color, np.float32), strength, continuous
        self.rng = np.random.default_rng(seed)
        self.jit = self.rng.normal(0, 1, (200, 3))
        self.tex = fbm(256, 256, 24, 4, seed + 4)

    def render(self, canvas, cam, t, opacity=1.0, origin=None):
        o = self.o if origin is None else np.asarray(origin)
        acc = np.zeros((H // 2, W // 2), np.float32)
        nb = 26
        for i in range(nb):
            if self.cont:
                age = (t * 1.0 + i * self.period / nb) % self.period
            else:
                cyc = math.floor(t / self.period)
                age = t - cyc * self.period - i * 0.045
                if age < 0:
                    age += self.period
            life = self.period * 0.9
            if age > life:
                continue
            p = age / life
            j = self.jit[i]
            pos = o + self.dir * self.size * 6 * (p ** 0.7) + j[:2] * self.size * 0.6 * p + [0, -self.size * 2 * p * p]
            r = self.size * (0.4 + 1.8 * p) * (1 + 0.2 * j[2])
            a = self.strength * (1 - p) ** 1.5 * smoothstep(0, 0.08, p)
            cv2.circle(acc, (int(pos[0] / 2), int(pos[1] / 2)), max(1, int(r / 2)), float(a), -1, cv2.LINE_AA)
        if not acc.any():
            return canvas
        acc = cv2.GaussianBlur(acc, (0, 0), self.size / 4)
        tex = cv2.resize(self.tex, (W // 2, H // 2))
        acc *= 0.6 + 0.8 * tex
        a = clamp01(cv2.resize(acc, (W, H)))[..., None] * opacity
        canvas *= 1 - a
        canvas += self.color * a
        return canvas



# ====================================================================== backdrops
class WashBackdrop:
    """Procedural ink-wash atmosphere for close-ups: soft clouds of diluted ink on paper, on plane Z."""

    def __init__(self, seed=0, density=0.45, cell=260, Z=6.0, color=INK, paper=PAPER, lo=0.3, hi=1.0, vertical=None,
                 speed=6.0):
        self.Z, self.speed = Z, speed
        tw, th = int(W * 1.5 / 2), int(H * 1.5 / 2)
        self.tw, self.th = tw, th
        n = fbm(th, tw, cell // 2, 6, seed, wrap_x=True)
        d = smoothstep(lo, hi, n) * density
        if vertical:  # (top_density, bottom_density)
            d = d * np.linspace(vertical[0], vertical[1], th, dtype=np.float32)[:, None]
        self.d = d.astype(np.float32)
        self.color, self.paper = np.asarray(color, np.float32), np.asarray(paper, np.float32)

    def render(self, canvas, cam, t):
        M = layer_matrix(self.tw, self.th, 2.0, (-(self.speed * t) % (self.tw * 2), 0), self.Z, cam)
        d = cv2.warpAffine(self.d, M, (W, H), borderMode=cv2.BORDER_WRAP)[..., None]
        canvas[:] = self.paper * (1 - d) + self.color * d
        return canvas


def keep_hue(src, graded, hue=(0, 18), sat_min=0.25, amount=1.0):
    """Restore original colour where the source has the given hue range (e.g. red sun / red thread)."""
    hsv = cv2.cvtColor(clamp01(src).astype(np.float32), cv2.COLOR_RGB2HSV)
    h, sa = hsv[..., 0], hsv[..., 1]
    lo, hi = hue
    inr = ((h >= lo) & (h <= hi)) | ((lo < 0) & (h >= 360 + lo))
    m = (inr * smoothstep(sat_min, sat_min + 0.2, sa) * amount)[..., None]
    m = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2)[..., None] if m.ndim == 3 else m
    return graded * (1 - m) + src * m


# ====================================================================== mural (Dunhuang wall)
class MuralWall:
    """Cave-wall plaster with mineral-pigment figures. Figures are sprites restyled as mural paintings."""

    def __init__(self, seed=0, Z=3.0, width=2400, height=1100):
        self.Z, self.pw, self.ph = Z, width, height
        self.b = max(W / width, H / height) * 1.06
        n1 = fbm(height // 2, width // 2, 90, 6, seed)
        n2 = fbm(height // 2, width // 2, 12, 4, seed + 1)
        base = np.array([0.80, 0.70, 0.55], np.float32)
        wall = base * (0.82 + 0.25 * n1[..., None]) * (0.92 + 0.12 * n2[..., None])
        # cracks
        crack = np.zeros((height // 2, width // 2), np.uint8)
        rng = np.random.default_rng(seed)
        for _ in range(18):
            x, y = rng.uniform(0, width / 2), rng.uniform(0, height / 2)
            ang = rng.uniform(0, 2 * np.pi)
            pts = []
            for _ in range(rng.integers(4, 12)):
                ang += rng.normal(0, 0.5)
                x += np.cos(ang) * rng.uniform(5, 25)
                y += np.sin(ang) * rng.uniform(5, 25)
                pts.append((int(x), int(y)))
            cv2.polylines(crack, [np.array(pts, np.int32)], False, 255, 1, cv2.LINE_AA)
        cr = cv2.GaussianBlur(crack.astype(np.float32) / 255, (0, 0), 0.5)[..., None]
        wall = wall * (1 - 0.18 * cr)
        # faded halo/ornament bands in azurite and malachite
        yy = np.linspace(0, 1, height // 2, dtype=np.float32)[:, None, None]
        band = smoothstep(0.03, 0.0, np.abs(yy - 0.08)) + smoothstep(0.03, 0.0, np.abs(yy - 0.93))
        from core import AZURITE, MALACHITE
        wall = wall * (1 - 0.5 * band) + (AZURITE * 0.6 + MALACHITE * 0.4) * 0.5 * band * (0.6 + 0.4 * n2[..., None])
        self.wall = cv2.resize(clamp01(wall), (width, height), interpolation=cv2.INTER_CUBIC).astype(np.float32)
        self.flake = cv2.resize(n2, (width, height))
        self.o = np.zeros(2)

    def render(self, canvas, cam, t):
        M = layer_matrix(self.pw, self.ph, self.b, self.o, self.Z, cam)
        canvas[:] = cv2.warpAffine(self.wall, M, (W, H), borderMode=cv2.BORDER_REFLECT_101)
        return canvas


def muralize_sprite(sp, strength=1.0, outline=0.6, seed=0, ramp=None):
    """Restyle a Sprite's pixels as a Dunhuang mural figure (in place): pigment remap, flattened values,
    dark iron-line outline, pigment loss speckle."""
    from core import mural as _mural
    pm = sp.pm
    a = pm[..., 3]
    rgb = np.where(a[..., None] > 1e-3, pm[..., :3] / np.maximum(a[..., None], 1e-3), 0)
    m = _mural(np.clip(rgb * 1.15 + 0.05, 0, 1), strength)
    if ramp is not None:  # luminance -> pigment ramp (list of colours dark..light)
        lum = np.clip(rgb @ np.array([0.299, 0.587, 0.114], np.float32), 0, 1)
        cols = np.asarray(ramp, np.float32)
        st = np.linspace(0, 1, len(cols))
        gm = np.stack([np.interp(lum, st, cols[:, k]) for k in range(3)], -1)
        hsv = cv2.cvtColor(np.clip(rgb, 0, 1).astype(np.float32), cv2.COLOR_RGB2HSV)
        skin = ((hsv[..., 0] < 40) & (hsv[..., 1] > 0.08) & (hsv[..., 1] < 0.5) & (lum > 0.55))[..., None]
        m = np.where(skin, m * 0.4 + np.array([0.90, 0.78, 0.66], np.float32) * lum[..., None] * 0.65, gm * 0.8 + m * 0.2)
    q = np.round(m * 6) / 6
    m = m * 0.5 + q * 0.5
    edge = cv2.morphologyEx((a > 0.5).astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)).astype(np.float32)
    lines = cv2.Canny((np.clip(rgb @ np.array([0.3, 0.59, 0.11]), 0, 1) * 255).astype(np.uint8), 60, 140).astype(np.float32) / 255
    ln = cv2.GaussianBlur(np.maximum(edge, lines * 0.6), (0, 0), 0.7)[..., None]
    m = m * (1 - outline * ln) + np.array([0.25, 0.12, 0.08], np.float32) * outline * ln
    speck = fbm(a.shape[0], a.shape[1], 8, 3, seed + 3)
    loss = smoothstep(0.78, 0.9, speck)[..., None]
    m = m * (1 - 0.4 * loss) + np.array([0.78, 0.68, 0.54], np.float32) * 0.4 * loss
    sp.pm = np.dstack([clamp01(m) * a[..., None], a]).astype(np.float32)
    return sp


class Flakes:
    """Falling fragments of painted plaster (for the mural peel)."""

    def __init__(self, n=160, seed=0, colors=None):
        rng = np.random.default_rng(seed)
        self.p = np.c_[rng.uniform(0, W, n), rng.uniform(0, H, n)]
        self.t0 = rng.uniform(0, 1, n)
        self.sz = rng.uniform(4, 14, n)
        self.spin = rng.uniform(-4, 4, n)
        self.vx = rng.normal(0, 20, n)
        from core import AZURITE, MALACHITE, OCHRE
        cols = colors or [CINNABAR, AZURITE, MALACHITE, OCHRE, np.array([0.8, 0.7, 0.55], np.float32)]
        self.col = [cols[i % len(cols)] for i in rng.integers(0, len(cols), n)]

    def render(self, canvas, cam, t, prog):
        """prog in [0,1]: flake i detaches when prog passes its t0, then falls."""
        for i in range(len(self.t0)):
            age = (prog - self.t0[i]) * 4.0
            if age <= 0 or age > 3:
                continue
            x = self.p[i, 0] + self.vx[i] * age
            y = self.p[i, 1] + 90 * age * age
            if y > H + 20:
                continue
            s = self.sz[i]
            ang = self.spin[i] * age
            sq = abs(math.cos(ang * 1.3)) * 0.8 + 0.2
            pts = np.array([[-1, -0.6], [0.8, -0.8], [1, 0.7], [-0.7, 0.9]]) * s
            pts[:, 1] *= sq
            c, sn = math.cos(ang), math.sin(ang)
            pts = pts @ np.array([[c, -sn], [sn, c]]).T + [x, y]
            cv2.fillConvexPoly(canvas, (pts * 4).astype(np.int32), tuple(float(v) for v in self.col[i] * (0.8 + 0.2 * sq)), cv2.LINE_AA, shift=2)
        return canvas


class Disintegrate:
    """Points sampled inside a sprite's silhouette that peel away as ink motes / snow."""

    def __init__(self, sprite, n=900, seed=0, color=INK):
        rng = np.random.default_rng(seed)
        a = sprite.pm[..., 3]
        ys, xs = np.where(a > 0.5)
        idx = rng.choice(len(xs), size=min(n, len(xs)), replace=False)
        self.uv = np.c_[xs[idx] / sprite.w, ys[idx] / sprite.h]
        self.vel = np.c_[rng.normal(40, 30, len(idx)), rng.normal(-70, 30, len(idx))]
        self.ph = rng.uniform(0, 6, len(idx))
        self.r = rng.uniform(1.0, 2.6, len(idx))
        self.sp, self.color = sprite, np.asarray(color, np.float32)

    def render(self, canvas, cam, t, prog, pos=None, order=None):
        """prog: dissolve progress (same field as ink_dissolve); points whose v is above the front fly off."""
        sp = self.sp
        M = sp.matrix(cam, pos)
        m = np.zeros((H, W), np.uint8)
        for (u, v), vel, ph, r in zip(self.uv, self.vel, self.ph, self.r):
            front = 1 - v  # lower parts go first (matches ink_dissolve's ground-up bias reversed)
            age = (prog * 1.3 - front * 0.9 - 0.1) * 3.0
            if age <= 0 or age > 2.2:
                continue
            x, y = M @ np.array([u * sp.w, v * sp.h, 1.0])
            x += vel[0] * age + 12 * math.sin(age * 3 + ph)
            y += vel[1] * age
            fade = 1 - age / 2.2
            cv2.circle(m, (int(x * 4), int(y * 4)), max(1, int(r * 4)), int(255 * fade), -1, cv2.LINE_AA, shift=2)
        a = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 0.7)[..., None]
        canvas *= 1 - a
        canvas += self.color * a
        return canvas
