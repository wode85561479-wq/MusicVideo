"""Shot definitions. Each builder takes the shot duration (s) and returns render(tau) -> graded float32
frame (H x W x 3, before paper texture / letterbox). tau is local time; it may run slightly below 0 or
past `dur` while a transition overlaps neighbouring shots."""
import math

import numpy as np
import cv2

from core import (W, H, CX, CY, INK, PAPER, PAPER_NIGHT, CINNABAR, AZURITE, MALACHITE, OCHRE, GOLD, Cam,
                  keys, ease, ease_out, ease_in, smoothstep, clamp01, grade, mural, lerp, drift, fbm)
from elements import haze  # noqa: E402
from elements import (PlateStack, Sprite, Fog, haze, Particles, Petals, Crows, Talismans, Web, InkBloom,
                      InkMountains, Moon, Vapour, ripples, draw_threads, thread_points, ink_dissolve)

SHOTS = {}


def shot(fn):
    SHOTS[fn.__name__.upper()] = fn
    return fn


def paper_canvas(color=PAPER):
    return np.ones((H, W, 3), np.float32) * np.asarray(color, np.float32)


MOON_RIM = ((-0.55, -0.83), (0.95, 0.96, 1.0), 0.30, 5)


# ----------------------------------------------------------------------------- SH08 初见·镜湖
@shot
def sh08(dur):
    """The meeting. Mirror lake: he stands on the near spit; she condenses out of the mist on the far
    shore. Slow lateral dolly right->left with a gentle push; mist drifts across the water."""
    plate = PlateStack("P4_MIRROR_LAKE", focus=(0.52, 0.52), cover=1.10, z_far=9, z_near=2.2)
    zp = plate.Z(len(plate.layers) - 1)
    tp_pos = plate.plate_to_offset(0.668, 0.745)
    zz_pos = plate.plate_to_offset(0.335, 0.728)
    unit = plate.ph * plate.b
    tp = Sprite("TP_LEFT", height=0.43 * unit, Z=zp, pos=tp_pos, sway=7, hair=5, hair_region=(0.02, 0.4),
                rim=MOON_RIM, seed=1, exposure=0.95)
    zz = Sprite("ZZ_SIDE", height=0.34 * unit, Z=zp * 1.25, pos=zz_pos, flip=True, sway=9, hair=4,
                rim=MOON_RIM, seed=2, exposure=1.02)
    fog_far = Fog(Z=6.0, density=0.55, speed=10, cell=160, seed=3, band=(0.62, 0.22), lo=0.4, hi=0.9)
    fog_near = Fog(Z=1.6, density=0.35, speed=24, cell=220, seed=4, band=(0.86, 0.2), lo=0.45, hi=0.95)
    petals = Petals(n=10, color=(0.90, 0.80, 0.76), color2=(0.95, 0.90, 0.86), size=6, fall=26, wind=-22, seed=5,
                    zrange=(1.5, 4.0))
    drops = [(tp_pos[0] - 240, tp_pos[1] + 70, 1.2), (zz_pos[0] + 260, zz_pos[1] + 60, 3.1), (-120, 330, 4.6)]

    def render(tau):
        u = tau / dur
        cam = Cam(x=float(keys(u, [(0, 70), (1, -70)])), y=float(keys(u, [(0, 10), (1, -6)])),
                  z=float(keys(u, [(0, 0.0), (1, 0.28)])), zoom=1.0)
        c = paper_canvas()
        plate.render(c, cam, tau, upto=len(plate.layers) - 1)
        fog_far.render(c, cam, tau)
        zz_rev = clamp01((tau - 0.6) / 3.2)
        zz.render(c, cam, tau, reveal=zz_rev, reflect=dict(opacity=0.28 * zz_rev, ripple=2.5, blur=2.0),
                  fog=(0.28, PAPER))
        plate.render(c, cam, tau, start=len(plate.layers) - 1)
        tp.render(c, cam, tau, reflect=dict(opacity=0.32, ripple=3.0, blur=1.5), fog=(0.08, PAPER))
        ripples(c, cam, tau, drops, Z=zp, opacity=0.35)
        fog_near.render(c, cam, tau)
        petals.render(c, cam, tau, opacity=0.9)
        return grade(c, sat=0.10, contrast=1.08, pivot=0.55)

    return render


# ============================================================================= shared helpers
from elements import WashBackdrop, keep_hue, MuralWall, muralize_sprite, Flakes, Disintegrate  # noqa: E402

INK_NIGHT = np.array([0.035, 0.045, 0.060], np.float32)
PAPER_N = np.array([0.80, 0.84, 0.86], np.float32)
MIST_N = np.array([0.70, 0.75, 0.79], np.float32)
SILK = (0.93, 0.94, 0.97)
RED = (0.74, 0.16, 0.10)


def night(c, sat=0.10, contrast=1.15, pivot=0.45, gamma=1.0, lift=0.0):
    return grade(c, sat=sat, contrast=contrast, pivot=pivot, gamma=gamma, lift=lift, ink=INK_NIGHT, paper=PAPER_N)


def day(c, sat=0.12, contrast=1.08, pivot=0.55, gamma=1.0):
    return grade(c, sat=sat, contrast=contrast, pivot=pivot, gamma=gamma)


def proj_lines(lines, cam, Z):
    out = []
    for item in lines:
        P, inten = item if isinstance(item, tuple) else (item, 1.0)
        x, y, _ = cam.project(P[:, 0] - CX, P[:, 1] - CY, Z)
        out.append((np.stack([x, y], 1), inten))
    return out


def web_draw(c, web, cam, t, Z, tear=0.0, sway=4.0, color=SILK, blur=0.0, opacity=0.6, glow=0.3):
    lines, dew = web.polylines(t, sway=sway, tear=tear)
    lines = proj_lines(lines, cam, Z)
    dews = []
    for (x, y, r) in dew:
        fx, fy, m = cam.project(x - CX, y - CY, Z)
        dews.append((fx, fy, r * m * (0.8 + 0.4 * math.sin(t * 3 + x))))
    draw_threads(c, lines, color=color, glow=glow, opacity=opacity, dew=dews, blur=blur)


def world_thread(cam, A, B, Z, t, **kw):
    """Thread between two world offsets (frame px at cam origin) on plane Z, projected."""
    pts = thread_points(A, B, t, **kw)
    x, y, _ = cam.project(pts[:, 0], pts[:, 1], Z)
    return np.stack([x, y], 1)


def fade_in(c, tau, d, color=(0, 0, 0)):
    if tau < d:
        a = 1 - ease(max(tau, 0) / d)
        c = c * (1 - a) + np.asarray(color, np.float32) * a
    return c


# ============================================================================= 第一阶段
@shot
def sh01(dur):
    """墨生: an ink drop falls on blank paper and blooms; mountains grow outward from the bloom."""
    mts = InkMountains(seed=11, n=5, origin=(0.5, 0.62))
    bloom = InkBloom((CX, H * 0.56), 230, t_hit=1.9, tau=1.3, seed=2)
    mists = [Fog(Z=8.0 - k, density=0.55, speed=6 + 3 * k, cell=200, seed=20 + k, band=(0.50 + 0.07 * k, 0.12), lo=0.45, hi=0.95)
             for k in range(4)]
    n = len(mts.layers)

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.14)])), y=float(keys(u, [(0, 15), (1, -10)])))
        c = paper_canvas()
        gen = lambda k: ease(clamp01((tau - 2.6 - (n - 1 - k) * 0.55) / 4.2))
        mts.render(c, cam, tau, genesis=gen, mist=lambda cc, cm, tt, k: mists[min(k, 3)].render(cc, cm, tt))
        bloom.render(c, cam, tau, opacity=1 - smoothstep(3.4, 6.4, tau))
        c = day(c, sat=0.0, contrast=1.05)
        return fade_in(c, tau, 1.2)

    return render


@shot
def sh02(dur):
    """云山古寺: P1 painted in stroke order, drifting right through mist layers; a few birds."""
    plate = PlateStack("P1_CLOUD_TEMPLES", focus=(0.45, 0.48), cover=1.14, reveal=lambda t: ease(clamp01((t + 0.6) / 5.5)), seed=5)
    f1 = Fog(Z=5.0, density=0.45, speed=14, cell=180, seed=31, band=(0.55, 0.3))
    f2 = Fog(Z=1.8, density=0.30, speed=28, cell=260, seed=32, band=(0.80, 0.25), lo=0.5, hi=0.95)
    birds = Crows(n=5, seed=4, start=(0.25, 0.32), end=(0.95, 0.18), spread=(0.06, 0.04), size=4.5, duration=10, Z=6, delay=3)

    def render(tau):
        u = tau / dur
        cam = Cam(x=float(keys(u, [(0, -110), (1, 110)])), y=float(keys(u, [(0, 25), (1, -25)])), z=float(keys(u, [(0, 0), (1, 0.1)])))
        c = paper_canvas()
        plate.render(c, cam, tau, upto=2)
        f1.render(c, cam, tau)
        birds.render(c, cam, tau, opacity=0.8)
        plate.render(c, cam, tau, start=2)
        f2.render(c, cam, tau)
        return day(c, sat=0.20)

    return render


def _forest(focus, cover=1.12):
    return PlateStack("P3_WEB_FOREST", focus=focus, cover=cover, z_far=9, z_near=1.6)


@shot
def sh03(dur):
    """盘丝岭: push through the web forest; foreground branches peel past, webs sway, dew glints."""
    plate = _forest((0.5, 0.5))
    web = Web((W * 0.82, H * 0.22), 300, spokes=16, turns=12, seed=3, squash=(1.0, 0.85))
    web2 = Web((W * 0.12, H * 0.75), 220, spokes=13, turns=9, seed=4, squash=(0.9, 1.0), rot=0.4)
    motes = Particles(n=160, zrange=(1.2, 7), fall=6, wind=8, size=1.6, color=(0.85, 0.88, 0.92), seed=7, opacity=0.6)
    fog = Fog(Z=4.0, density=0.45, color=MIST_N, speed=10, cell=200, seed=33, band=(0.6, 0.35))

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.55)])), x=float(keys(u, [(0, -20), (1, 30)])), y=float(keys(u, [(0, 10), (1, -15)])))
        c = paper_canvas(PAPER_N)
        plate.render(c, cam, tau, upto=2)
        fog.render(c, cam, tau)
        plate.render(c, cam, tau, start=2)
        motes.render(c, cam, tau)
        c = night(c)
        web_draw(c, web, cam, tau, Z=2.2, sway=5, opacity=0.55)
        web_draw(c, web2, cam, tau, Z=1.7, sway=4, opacity=0.45, blur=1.5)
        return c

    return render


@shot
def sh04(dur):
    """独行: he walks toward camera along the forest path; camera retreats."""
    plate = _forest((0.56, 0.58), cover=1.18)
    zp = plate.Z(len(plate.layers) - 2)
    unit = plate.ph * plate.b
    pos0 = plate.plate_to_offset(0.592, 0.84)
    tp = Sprite("TP_WALK", height=0.40 * unit, Z=zp, pos=pos0, sway=10, hair=8, hair_region=(0.0, 0.45), seed=3,
                rim=MOON_RIM, exposure=1.05)
    fog = Fog(Z=2.5, density=0.45, color=MIST_N, speed=16, cell=200, seed=35, band=(0.9, 0.18))
    fog2 = Fog(Z=5.0, density=0.35, color=MIST_N, speed=9, cell=240, seed=36, band=(0.45, 0.3))
    motes = Particles(n=120, zrange=(1.2, 7), fall=6, wind=8, size=1.5, color=(0.85, 0.88, 0.92), seed=8, opacity=0.5)

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.40), (1, 0.12)])), x=float(keys(u, [(0, 30), (1, -40)])))
        c = paper_canvas(PAPER_N)
        plate.render(c, cam, tau, upto=len(plate.layers) - 1)
        fog2.render(c, cam, tau)
        step = 2 * np.pi * 0.95 * tau
        sm = float(keys(u, [(0, 0.82), (1, 1.18)]))
        pos = pos0 + np.array([float(keys(u, [(0, 20), (1, -70)])), float(keys(u, [(0, -12), (1, 40)]))])
        tp.render(c, cam, tau, pos=pos, scale_mul=sm, bob=-abs(math.sin(step)) * 5, rot=math.sin(step) * 0.8, fog=(0.12, MIST_N))
        plate.render(c, cam, tau, start=len(plate.layers) - 1)
        fog.render(c, cam, tau)
        motes.render(c, cam, tau)
        return night(c, sat=0.12)

    return render


@shot
def sh05(dur):
    """网后: she watches through a great web; focus racks from the silk to her."""
    plate = _forest((0.22, 0.45), cover=1.2)
    zz = Sprite("ZZ_34B", height=1.28 * H, Z=2.0, pos=(-420, 250), pivot=(0.5, 0.5), flip=True, sway=6, hair=5,
                hair_region=(0.0, 0.3), seed=4, rim=MOON_RIM, exposure=1.0)
    web = Web((W * 0.60, H * 0.42), 560, spokes=20, turns=16, seed=9, squash=(1.0, 0.82), rot=0.2)
    fog = Fog(Z=3.0, density=0.35, color=MIST_N, speed=8, cell=220, seed=37)

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.12)])), x=float(keys(u, [(0, 15), (1, -15)])))
        c = paper_canvas(PAPER_N)
        plate.render(c, cam, tau)
        c[:] = cv2.GaussianBlur(c, (0, 0), 7)
        haze(c, 0.25, MIST_N)
        fog.render(c, cam, tau)
        rf = smoothstep(2.0, 4.6, tau)
        zz.render(c, cam, tau, blur=lerp(6.0, 0.0, rf), fog=(lerp(0.3, 0.05, rf), MIST_N))
        c = night(c, sat=0.14)
        web_draw(c, web, cam, tau, Z=1.2, sway=3, opacity=lerp(0.62, 0.30, rf), blur=lerp(0.0, 5.0, rf), glow=0.3)
        return c

    return render


@shot
def sh06(dur):
    """回首: he stops and looks back; a loose silver thread drifts across in front of him."""
    plate = _forest((0.78, 0.42), cover=1.2)
    tp = Sprite("TP_TURN", height=0.86 * H, Z=2.2, pos=(170, 0.43 * H), flip=True, sway=8, hair=9, hair_region=(0.0, 0.45),
                seed=6, rim=MOON_RIM, exposure=1.05)
    fog = Fog(Z=3.5, density=0.4, color=MIST_N, speed=10, cell=220, seed=38, band=(0.75, 0.35))
    fog2 = Fog(Z=1.4, density=0.22, color=MIST_N, speed=20, cell=260, seed=39, band=(0.9, 0.2))

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.18)])))
        c = paper_canvas(PAPER_N)
        plate.render(c, cam, tau)
        haze(c, 0.35, MIST_N)
        fog.render(c, cam, tau)
        tp.render(c, cam, tau, fog=(0.06, MIST_N))
        fog2.render(c, cam, tau)
        c = night(c, sat=0.12)
        ax = -300 + 330 * tau
        A = (ax - CX, 130 + 25 * math.sin(tau * 0.8) - CY)
        B = (ax + 520 - CX, 60 + 40 * math.sin(tau * 0.6 + 1) - CY)
        pts = world_thread(cam, A, B, 1.3, tau, sag=40, sway=18, freq=0.35, wiggle=3)
        draw_threads(c, [pts], color=SILK, glow=0.7, opacity=0.85)
        return c

    return render


@shot
def sh07(dur):
    """一线: her raised hand; the camera follows the silk drawn from her fingertip across white paper."""
    bg = WashBackdrop(seed=12, density=0.30, cell=320, Z=4.0, lo=0.35, vertical=(0.6, 1.0))
    zz = Sprite("ZZ_REACH", height=1.05 * H, Z=1.0, pos=(-560, 300), pivot=(0.5, 0.5), crop=(0.2, 0.0, 1.0, 0.55),
                sway=5, hair=4, hair_region=(0.0, 0.3), seed=7, ink_edge=0.3)
    tip = (0.93, 0.03)

    def render(tau):
        u = tau / dur
        cam = Cam(x=float(keys(u, [(0, -60), (0.25, 0), (1, 1150)])), y=float(keys(u, [(0, 40), (1, 90)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        zz.render(c, cam, tau)
        c = day(c, sat=0.16)
        A = zz.point(cam, tip)
        Bw = (2700 - CX, 430 + 30 * math.sin(tau * 0.5) - CY)
        Bx, By, _ = cam.project(Bw[0], Bw[1], 1.0)
        pts = thread_points(A, (Bx, By), tau, sag=60, sway=10, freq=0.4, wiggle=2, n=90)
        s = np.linspace(0, 1, len(pts))
        dew = [(pts[i, 0], pts[i, 1], 2.0 + 0.8 * math.sin(tau * 4 + i)) for i in range(8, len(pts), 11)]
        draw_threads(c, [pts], color=(0.55, 0.57, 0.62), glow=0.5, opacity=0.9, dew=dew)
        return c

    return render


# ============================================================================= 第二阶段
def _closeup_bg(seed, night_mode=True, moon=None, density=0.5):
    bg = WashBackdrop(seed=seed, density=density, cell=300, Z=5.0, lo=0.3, vertical=(1.0, 0.6) if night_mode else (0.5, 1.0))
    mn = Moon(moon[0], moon[1], Z=12.0, halo=2.6, halo_strength=0.3) if moon else None
    return bg, mn


@shot
def sh09(dur):
    """她: close-up, slow push; hair and silver tassels sway; ink drifts behind."""
    bg, mn = _closeup_bg(41, moon=((420, -150), 70))
    zz = Sprite("ZZ_FACE_FRONT", height=1.02 * H, Z=1.6, pos=(-360, 70), pivot=(0.5, 0.5), sway=0, hair=7,
                hair_region=(0.08, 0.85), hair_sides=0.2, breath=0.002, seed=9, ink_edge=0.25, rim=MOON_RIM)
    fog = Fog(Z=1.2, density=0.18, speed=12, cell=300, seed=42, band=(0.85, 0.3))

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.16)])), x=float(keys(u, [(0, 10), (1, -25)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        mn.render(c, cam, tau)
        zz.render(c, cam, tau, rot=0.5 * math.sin(tau * 0.45))
        fog.render(c, cam, tau)
        return night(c, sat=0.22, contrast=1.05, pivot=0.5, lift=0.04)

    return render


@shot
def sh10(dur):
    """他: profile close-up looking left toward her; hair drifts."""
    bg, mn = _closeup_bg(43, moon=((-520, -170), 60))
    tp = Sprite("TP_FACE_SIDE", height=1.02 * H, Z=1.6, pos=(360, 60), pivot=(0.5, 0.5), sway=0, hair=8,
                hair_region=(0.0, 0.95), hair_sides=0.18, breath=0.002, seed=10, ink_edge=0.25,
                rim=((0.6, -0.8), (0.95, 0.96, 1.0), 0.3, 5))
    fog = Fog(Z=1.2, density=0.18, speed=-12, cell=300, seed=44, band=(0.85, 0.3))

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.15)])), x=float(keys(u, [(0, -10), (1, 25)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        mn.render(c, cam, tau)
        tp.render(c, cam, tau, rot=-0.4 * math.sin(tau * 0.5))
        fog.render(c, cam, tau)
        return night(c, sat=0.22, contrast=1.05, pivot=0.5, lift=0.04)

    return render


@shot
def sh11(dur):
    """同行: side-tracking along a ridge; layers of mountains slide past; first cinnabar thread links them."""
    mts = InkMountains(seed=21, n=5, base=0.24, spread=0.50)
    n = len(mts.layers)
    zc = mts.layers[n - 1]["Z"] * 1.18
    unit = H
    zz = Sprite("ZZ_WALK", height=0.50 * unit, Z=zc, sway=11, hair=8, hair_region=(0.0, 0.5), seed=11, ink_edge=0.4)
    tp = Sprite("TP_RIGHT", height=0.56 * unit, Z=zc, sway=11, hair=9, hair_region=(0.0, 0.45), seed=12, ink_edge=0.4)
    mist = [Fog(Z=8.0 - 1.4 * k, density=0.5, speed=5, cell=220, seed=50 + k, band=(0.42 + 0.09 * k, 0.12)) for k in range(4)]
    birds = Crows(n=3, seed=13, start=(1.1, 0.25), end=(-0.1, 0.15), spread=(0.05, 0.03), size=4, duration=8, Z=7, delay=1)

    def render(tau):
        u = tau / dur
        cx = float(drift(u, 0, 620))
        cam = Cam(x=cx, z=0.05, y=-10)
        c = paper_canvas()
        mts.render(c, cam, tau, upto=n - 1, mist=lambda cc, cm, tt, k: mist[min(k, 3)].render(cc, cm, tt))
        birds.render(c, cam, tau, opacity=0.7)
        ridge_u = lambda X: X / (mts.pw * mts.b) + 0.5
        step = 2 * np.pi * 0.9 * tau
        X_zz = -330 + cx / zc + 18 * tau
        X_tp = -40 + cx / zc + 18 * tau
        yg = max(mts.ridge_offset(n - 1, ridge_u(X_zz))[1], mts.ridge_offset(n - 1, ridge_u(X_tp))[1])
        y_zz = yg + 0.07 * unit
        y_tp = yg + 0.07 * unit
        zz.render(c, cam, tau, pos=(X_zz, y_zz), bob=-abs(math.sin(step)) * 4)
        tp.render(c, cam, tau, pos=(X_tp, y_tp), bob=-abs(math.sin(step + 1.3)) * 4)
        mts.render(c, cam, tau, start=n - 1)
        c = day(c, sat=0.14)
        A = zz.point(cam, (0.88, 0.47), pos=(X_zz, y_zz), bob=-abs(math.sin(step)) * 4)
        B = tp.point(cam, (0.40, 0.53), pos=(X_tp, y_tp), bob=-abs(math.sin(step + 1.3)) * 4)
        pts = thread_points(A[:2], B[:2], tau, sag=26, sway=7, freq=0.6, wiggle=2)
        draw_threads(c, [pts], color=RED, width=1, glow=0.35, opacity=smoothstep(0.6, 2.0, tau) * 0.95)
        return c

    return render


@shot
def sh12(dur):
    """云阶: two small figures climb the temple stairs; crane up to the waterfall."""
    plate = PlateStack("P1_CLOUD_TEMPLES", focus=(0.70, 0.62), cover=1.18)
    zp = plate.Z(len(plate.layers) - 2)
    unit = plate.ph * plate.b
    p0 = np.array([232.0, 282.0])
    zp = plate.Z(len(plate.layers) - 1)
    zz = Sprite("ZZ_BACK", height=0.062 * unit, Z=zp, sway=4, seed=14, ink_edge=0.0, breath=0)
    tp = Sprite("TP_BACK", height=0.070 * unit, Z=zp, sway=4, seed=15, ink_edge=0.0, breath=0)
    f1 = Fog(Z=5.0, density=0.5, speed=12, cell=200, seed=61, band=(0.45, 0.35))
    f2 = Fog(Z=2.0, density=0.35, speed=22, cell=260, seed=62, band=(0.85, 0.25))

    def render(tau):
        u = tau / dur
        cam = Cam(y=float(keys(u, [(0, 0), (1, -280)])), z=float(keys(u, [(0, 0.04), (1, 0.14)])), x=float(keys(u, [(0, 0), (1, -40)])))
        c = paper_canvas()
        plate.render(c, cam, tau, upto=len(plate.layers) - 1)
        f1.render(c, cam, tau)
        climb = np.array([7, -11]) * tau
        plate.render(c, cam, tau, start=len(plate.layers) - 1)
        tp.render(c, cam, tau, pos=p0 + climb + [10, 0], bob=-abs(math.sin(tau * 5)) * 1.0, fog=(0.15, PAPER))
        zz.render(c, cam, tau, pos=p0 + climb + [-14, 7], bob=-abs(math.sin(tau * 5 + 1)) * 1.0, fog=(0.15, PAPER))
        f2.render(c, cam, tau)
        return day(c, sat=0.20)

    return render


@shot
def sh13(dur):
    """织: she lifts her arm; silk streams from her fingertips and weaves a web that catches petals."""
    bg, mn = _closeup_bg(45, moon=((560, -220), 85), density=0.42)
    zz = Sprite("ZZ_REACH", height=0.98 * H, Z=2.0, pos=(-470, 0.47 * H), sway=10, hair=6, hair_region=(0.0, 0.3), seed=16,
                rim=MOON_RIM, ink_edge=0.35)
    web = Web((W * 0.70, H * 0.36), 300, spokes=17, turns=13, seed=17, squash=(1.0, 0.85))
    petals = Petals(n=26, color=(0.92, 0.84, 0.82), color2=(0.80, 0.42, 0.36), size=7, fall=30, wind=-18, seed=18, zrange=(1.2, 4.5))
    caught = [(W * 0.70 + r * math.cos(a), H * 0.36 + 0.85 * r * math.sin(a), tc) for r, a, tc in
              [(120, 0.4, 4.6), (210, 2.2, 5.3), (80, 4.0, 5.9), (250, 5.2, 6.4), (170, 1.2, 7.0)]]

    def render(tau):
        u = tau / dur
        cam = Cam(x=float(keys(u, [(0, -50), (1, 60)])), z=float(keys(u, [(0, 0.0), (1, 0.10)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        mn.render(c, cam, tau)
        zz.render(c, cam, tau)
        petals.render(c, cam, tau, opacity=0.85)
        c = night(c, sat=0.16, contrast=1.05, lift=0.05)
        tip = zz.point(cam, (0.93, 0.03))
        grow = smoothstep(0.4, 3.2, tau)
        lines = []
        wc = np.array(cam.project(W * 0.70 - CX, H * 0.36 - CY, 1.4)[:2])
        for k, ang in enumerate([-0.5, -0.15, 0.2, 0.55, 0.9]):
            end = wc + np.array([math.cos(ang + 3.6), math.sin(ang + 3.6)]) * -60
            pts = thread_points(tip[:2], end, tau, sag=20 + 10 * k, sway=6, freq=0.5, phase=k, grow=grow)
            lines.append((pts, 0.7))
        draw_threads(c, lines, color=SILK, glow=0.4, opacity=0.8)
        weave = smoothstep(2.4, 6.5, tau)
        web_draw(c, web, cam, tau, Z=1.4, tear=1 - weave, sway=3, opacity=0.7)
        for (x, y, tc) in caught:
            a = smoothstep(tc, tc + 0.4, tau) * weave
            if a > 0:
                fx, fy, m = cam.project(x - CX, y - CY, 1.4)
                cv2.ellipse(c, (int(fx), int(fy)), (7, 4), (x * 7) % 180, 0, 360,
                            tuple(float(v) for v in np.array([0.90, 0.80, 0.78]) * a + c[int(fy) % H, int(fx) % W] * (1 - a)), -1, cv2.LINE_AA)
        return c

    return render


@shot
def sh14(dur):
    """承: he looks at the red thread wound in his hand; camera tilts up from hand to face."""
    bg, _ = _closeup_bg(47, night_mode=False, density=0.35)
    tp = Sprite("TP_FRONT", height=1.55 * H, Z=1.8, pos=(120, 0), pivot=(0.5, 0.5), crop=(0.08, 0.0, 0.95, 0.70),
                sway=6, hair=6, hair_region=(0.0, 0.5), hair_sides=0.15, seed=19, ink_edge=0.3,
                rim=((-0.7, -0.6), (1.0, 0.95, 0.85), 0.25, 6))
    petals = Petals(n=18, color=(0.92, 0.84, 0.82), color2=(0.80, 0.42, 0.36), size=8, fall=34, wind=-14, seed=20, zrange=(1.0, 3.5))
    fog = Fog(Z=1.3, density=0.2, speed=14, cell=300, seed=63, band=(0.9, 0.25))

    def render(tau):
        u = tau / dur
        cam = Cam(y=float(keys(u, [(0, 200), (0.15, 200), (1, -330)])), z=float(keys(u, [(0, 0.0), (1, 0.10)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        tp.render(c, cam, tau)
        fog.render(c, cam, tau)
        petals.render(c, cam, tau, opacity=0.85)
        c = day(c, sat=0.20)
        hand = tp.point(cam, (0.80, 0.49))
        loops = []
        for k in range(3):
            a0 = np.linspace(0, 2 * np.pi, 20)
            loops.append((np.c_[hand[0] + 14 * np.cos(a0), hand[1] + 6 * np.sin(a0) + k * 7 - 6], 0.9))
        tail = thread_points(hand[:2], (hand[0] + 700, hand[1] + 120), tau, sag=80, sway=30, freq=0.4, wiggle=5)
        draw_threads(c, loops + [tail], color=RED, width=1, glow=0.3, opacity=0.95)
        return c

    return render


@shot
def sh15(dur):
    """古窟: candle-lit cave; she sits in her web; incense coils; the Buddha looks on. Push to the flame."""
    plate = PlateStack("P2_BUDDHA_CAVE", focus=(0.52, 0.5), cover=1.12)
    unit = plate.ph * plate.b
    zp = plate.Z(len(plate.layers) - 1)
    zz = Sprite("ZZ_SIT", height=0.34 * unit, Z=zp * 0.95, pos=plate.plate_to_offset(0.27, 0.93), sway=3, seed=21,
                exposure=0.85, tint=(1.05, 0.95, 0.9), rim=((0.8, -0.3), (1.0, 0.6, 0.4), 0.35, 5))
    candle = plate.plate_to_offset(0.452, 0.44)
    smoke = Vapour(origin=(0, 0), period=5.0, direction=(0.15, -1.0), seed=22, size=26, color=(0.75, 0.72, 0.70), strength=0.22, continuous=True)
    rng = np.random.default_rng(23)
    web_ends = [(rng.uniform(-1.2, 1.2) * W, rng.uniform(0.3, 0.7) * H) for _ in range(9)]

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.30)])), x=float(keys(u, [(0, -40), (1, candle[0] * 0.5)])),
                  y=float(keys(u, [(0, 10), (1, candle[1] * 0.3)])))
        c = paper_canvas(INK)
        plate.render(c, cam, tau)
        cx, cy, m = cam.project(candle[0], candle[1], zp * 1.2)
        fl = 0.75 + 0.25 * math.sin(tau * 11) * math.sin(tau * 7.3 + 1) + 0.08 * math.sin(tau * 23)
        yy, xx = np.ogrid[0:H, 0:W]
        g = np.exp(-(((xx - cx) ** 2 + ((yy - cy) * 1.2) ** 2) / (2 * (150 * m) ** 2))).astype(np.float32)[..., None]
        c += g * np.array([0.55, 0.25, 0.10], np.float32) * 0.45 * fl
        smoke.render(c, cam, tau, origin=(cx, cy - 20 * m))
        zz.render(c, cam, tau)
        base = grade(c, sat=0.30, contrast=1.1, pivot=0.4)
        c = base * 0.7 + mural(c, 0.8) * 0.3
        zc = zz.point(cam, (0.5, 0.75))
        lines = [(thread_points(zc[:2], (zc[0] + ex * 0.4, zc[1] + ey * 0.6), tau, sag=10, sway=3, phase=i), 0.5)
                 for i, (ex, ey) in enumerate(web_ends)]
        draw_threads(c, lines, color=(0.85, 0.82, 0.78), glow=0.3, opacity=0.5)
        return clamp01(c)

    return render


@shot
def sh16(dur):
    """近: the same lake at night; now they stand close; reflections lean together."""
    plate = PlateStack("P4_MIRROR_LAKE", focus=(0.52, 0.52), cover=1.16, z_far=9, z_near=2.2)
    zp = plate.Z(len(plate.layers) - 1)
    unit = plate.ph * plate.b
    tp = Sprite("TP_LEFT", height=0.43 * unit, Z=zp, pos=plate.plate_to_offset(0.575, 0.745), sway=7, hair=5,
                hair_region=(0.02, 0.4), rim=MOON_RIM, seed=24, exposure=0.95)
    zz = Sprite("ZZ_SIDE", height=0.38 * unit, Z=zp, pos=plate.plate_to_offset(0.505, 0.742), flip=True, sway=8, hair=4,
                rim=MOON_RIM, seed=25, exposure=1.0)
    fog = Fog(Z=1.6, density=0.35, color=MIST_N, speed=18, cell=240, seed=64, band=(0.84, 0.2), lo=0.45, hi=0.95)
    fog2 = Fog(Z=6.0, density=0.45, color=MIST_N, speed=8, cell=180, seed=65, band=(0.6, 0.2))
    motes = Particles(n=40, zrange=(1.5, 5), fall=-6, wind=5, size=1.6, color=(0.95, 0.93, 0.85), seed=26, opacity=0.6)

    def render(tau):
        u = tau / dur
        cam = Cam(x=float(keys(u, [(0, -60), (1, 50)])), z=float(keys(u, [(0, 0.10), (1, 0.30)])))
        c = paper_canvas(PAPER_N)
        plate.render(c, cam, tau, upto=len(plate.layers) - 1)
        fog2.render(c, cam, tau)
        plate.render(c, cam, tau, start=len(plate.layers) - 1)
        zz.render(c, cam, tau, reflect=dict(opacity=0.32, ripple=2.5, blur=1.5))
        tp.render(c, cam, tau, reflect=dict(opacity=0.32, ripple=2.5, blur=1.5))
        fog.render(c, cam, tau)
        motes.render(c, cam, tau)
        return night(c, sat=0.10, contrast=1.2, pivot=0.55)

    return render


@shot
def sh17(dur):
    """笑: his face, frontal and soft; blurred petals cross the foreground."""
    bg, _ = _closeup_bg(49, night_mode=False, density=0.30)
    tp = Sprite("TP_FACE_FRONT", height=0.98 * H, Z=1.6, pos=(30, 120), pivot=(0.5, 0.5), sway=0, hair=6,
                hair_region=(0.05, 0.9), hair_sides=0.22, breath=0.002, seed=27, ink_edge=0.2,
                rim=((-0.7, -0.6), (1.0, 0.95, 0.85), 0.22, 6))
    near = Petals(n=7, color=(0.92, 0.84, 0.82), color2=(0.82, 0.45, 0.38), size=16, fall=40, wind=60, seed=28, zrange=(0.5, 0.8))

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.14)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        tp.render(c, cam, tau, rot=0.3 * math.sin(tau * 0.4))
        c = day(c, sat=0.24, contrast=1.04, pivot=0.5)
        layer = np.zeros_like(c)
        near.render(layer, cam, tau, opacity=1.0)
        m = (layer.sum(-1, keepdims=True) > 0).astype(np.float32)
        m = cv2.GaussianBlur(m, (0, 0), 6)[..., None] * 0.8
        col = cv2.GaussianBlur(layer, (0, 0), 6) / np.maximum(cv2.GaussianBlur((layer.sum(-1) > 0).astype(np.float32), (0, 0), 6)[..., None], 1e-3)
        c = c * (1 - m) + clamp01(col) * m
        return c

    return render


@shot
def sh18(dur):
    """望月: their backs on a ridge under a vast moon; the red thread between their hands. Pull back."""
    mts = InkMountains(seed=31, n=5, base=0.40, spread=0.40, mist=PAPER)
    n = len(mts.layers)
    zc = mts.layers[n - 1]["Z"] * 1.05
    mn = Moon((0, -120), 190, Z=14.0, kind="hongyun", color=(0.93, 0.92, 0.88))
    zz = Sprite("ZZ_BACK", height=0.17 * H, Z=zc, sway=6, seed=29, ink_edge=0.2)
    tp = Sprite("TP_BACK", height=0.19 * H, Z=zc, sway=6, hair=4, seed=30, ink_edge=0.2)
    prof = mts.layers[n - 1]["prof"]
    lo_i, hi_i = int(0.40 * mts.pw), int(0.62 * mts.pw)
    u_peak = (lo_i + int(np.argmin(prof[lo_i:hi_i]))) / mts.pw
    mist = [Fog(Z=9.0 - 1.4 * k, density=0.45, color=PAPER, speed=4, cell=220, seed=70 + k, band=(0.5 + 0.09 * k, 0.12)) for k in range(4)]

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.45), (1, 0.0)])), y=float(keys(u, [(0, 40), (1, -20)])))
        c = paper_canvas()
        mn.render(c, cam, tau)
        mts.render(c, cam, tau, upto=n - 1, mist=lambda cc, cm, tt, k: mist[min(k, 3)].render(cc, cm, tt))
        ridge = mts.ridge_offset(n - 1, u_peak)
        p_zz = (ridge[0] - 38, ridge[1] + 0.012 * H)
        p_tp = (ridge[0] + 34, ridge[1] + 0.012 * H)
        zz.render(c, cam, tau, pos=p_zz, silhouette=(0.35, INK))
        tp.render(c, cam, tau, pos=p_tp, silhouette=(0.35, INK))
        mts.render(c, cam, tau, start=n - 1)
        c = night(c, sat=0.06, contrast=1.1, pivot=0.5)
        A = zz.point(cam, (0.92, 0.55), pos=p_zz)
        B = tp.point(cam, (0.10, 0.55), pos=p_tp)
        draw_threads(c, [thread_points(A[:2], B[:2], tau, sag=6, sway=2, freq=0.5)], color=RED, glow=0.3, opacity=0.95)
        return c

    return render


@shot
def sh19(dur):
    """颤: the red thread draws taut and trembles; a crow crosses far off; ink closes in from the edges."""
    bg, _ = _closeup_bg(51, night_mode=False, density=0.25)
    crow = Crows(n=1, seed=31, start=(1.05, 0.30), end=(-0.1, 0.22), spread=(0, 0), size=10, duration=4.5, Z=4, delay=1.8)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    edge = np.minimum(np.minimum(xx / W, 1 - xx / W) * 2.4, np.minimum(yy / H, 1 - yy / H) * 2.0)
    from core import fbm as _fbm
    nz = cv2.resize(_fbm(H // 4, W // 4, 30, 5, 52), (W, H))

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.06)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        crow.render(c, cam, tau, opacity=0.8)
        reach = -0.15 + 0.50 * smoothstep(0.3, dur, tau)
        d = smoothstep(reach + 0.18, reach - 0.04, edge + (nz - 0.5) * 0.35) * 0.7
        c = c * (1 - d[..., None]) + INK * d[..., None]
        c = day(c, sat=0.05)
        tension = smoothstep(0.5, dur * 0.8, tau)
        sag = lerp(70, 6, tension)
        trem = 1.0 + 4.0 * tension
        pts = thread_points((-40, H * 0.52), (W + 40, H * 0.47), tau, sag=sag, sway=lerp(12, 2, tension), freq=0.35, n=120,
                            wiggle=0.0)
        pts[:, 1] += np.sin(np.linspace(0, 40, len(pts)) + tau * 45) * trem * 0.6 * np.sin(np.linspace(0, np.pi, len(pts)))
        draw_threads(c, [pts], color=RED, width=2, glow=0.4, opacity=0.95)
        return c

    return render


@shot
def sh20(dur):
    """屏息: in ink darkness a single cinnabar drop falls slowly into still water; rings spread."""
    rng_t = fbm(H // 4, W // 4, 60, 5, 53)
    tex = cv2.resize(rng_t, (W, H))[..., None]
    t_hit = 3.0
    bloom = InkBloom((CX, H * 0.60), 140, t_hit=t_hit, tau=1.4, color=np.array([0.55, 0.10, 0.07], np.float32), seed=54, strength=0.8)

    def render(tau):
        c = (INK * (0.9 + 0.25 * tex)).astype(np.float32) * np.ones((H, W, 3), np.float32)
        cam = Cam(z=float(keys(tau / dur, [(0, 0.0), (1, 0.08)])))
        if tau < t_hit:
            p = clamp01(tau / t_hit)
            y = lerp(-40, H * 0.60, p ** 1.8)
            m = np.zeros((H, W), np.uint8)
            cv2.ellipse(m, (int(CX * 4), int(y * 4)), (int(9 * 4), int((12 + 6 * p) * 4)), 0, 0, 360, 255, -1, cv2.LINE_AA, shift=2)
            a = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 1.2)[..., None]
            c = c * (1 - a) + np.array(RED, np.float32) * a
            hl = np.zeros((H, W), np.float32)
            cv2.circle(hl, (int(CX - 3), int(y - 5)), 3, 1.0, -1, cv2.LINE_AA)
            c += cv2.GaussianBlur(hl, (0, 0), 1.5)[..., None] * 0.5
        else:
            bloom.render(c, cam, tau)
            ripples(c, cam, tau, [(0, H * 0.10, t_hit), (0, H * 0.10, t_hit + 0.6)], Z=1.0, squash=0.30,
                    color=(0.75, 0.74, 0.72), speed=150, life=3.0, opacity=0.35)
        return clamp01(c)

    return render


# ============================================================================= 第三阶段：情感高点
from core import qinglu  # noqa: E402


@shot
def sh21(dur):
    """山河着色: from the cinnabar ripple the ink landscape blooms into 青绿 mineral colour; crane up through cloud."""
    plate = PlateStack("P1_CLOUD_TEMPLES", focus=(0.5, 0.5), cover=1.16)
    f1 = Fog(Z=5.0, density=0.4, speed=14, cell=200, seed=81, band=(0.55, 0.3))
    cloud = Fog(Z=1.2, density=0.85, speed=60, cell=300, seed=82, lo=0.3, hi=0.8)
    from core import fbm as _fbm
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot((xx - CX) / W, (yy - H * 0.55) / W) * 2.2
    field = d + (cv2.resize(_fbm(H // 4, W // 4, 40, 5, 83), (W, H)) - 0.5) * 0.5

    def render(tau):
        u = tau / dur
        cam = Cam(y=float(keys(u, [(0, 60), (1, -150)])), z=float(keys(u, [(0, 0.0), (1, 0.22)])))
        c = paper_canvas()
        plate.render(c, cam, tau, upto=2)
        f1.render(c, cam, tau)
        plate.render(c, cam, tau, start=2)
        ink = day(c, sat=0.10)
        col = qinglu(c)
        prog = smoothstep(0.2, 4.2, tau) * 1.5
        m = smoothstep(0.0, 0.18, prog - field)[..., None]
        out = ink * (1 - m) + col * m
        cloud.render(out, cam, tau, density=0.75 * (1 - smoothstep(0.0, 2.2, tau)) + 0.35 * smoothstep(4.5, dur, tau))
        return out

    return render


ZZ_RAMP = [INK, AZURITE * 0.55, MALACHITE * 0.75, np.array([0.70, 0.74, 0.62]), np.array([0.92, 0.88, 0.78])]
TP_RAMP = [INK, CINNABAR * 0.55, OCHRE * 0.85, GOLD, np.array([0.93, 0.86, 0.70])]


def _mural_scene(seed=0):
    wall = MuralWall(seed=91 + seed, Z=3.0)
    tp = muralize_sprite(Sprite("TP_LEFT", height=0.80 * H, Z=3.0, pos=(330, 0.40 * H), sway=4, hair=3, seed=92, ink_edge=0.0),
                         1.0, seed=1, ramp=TP_RAMP)
    zz = muralize_sprite(Sprite("ZZ_REACH", height=0.78 * H, Z=3.0, pos=(-330, 0.40 * H), sway=6, hair=3, seed=93, ink_edge=0.0),
                         1.0, seed=2, ramp=ZZ_RAMP)
    rng = np.random.default_rng(94 + seed)
    ribbons = [(rng.uniform(0, 6), rng.uniform(0.6, 1.0), k) for k in range(4)]
    return wall, tp, zz, ribbons


def _halo(c, cam, sp, uv, r, col, opacity=0.8):
    p = sp.point(cam, uv)
    m = np.zeros((H, W), np.float32)
    cv2.circle(m, (int(p[0]), int(p[1])), int(r), 1.0, -1, cv2.LINE_AA)
    ring = np.zeros((H, W), np.float32)
    cv2.circle(ring, (int(p[0]), int(p[1])), int(r), 1.0, max(2, int(r * 0.06)), cv2.LINE_AA)
    m = cv2.GaussianBlur(m, (0, 0), 1.0)[..., None] * 0.45 * opacity
    ring = cv2.GaussianBlur(ring, (0, 0), 0.8)[..., None] * 0.8 * opacity
    c *= 1 - m
    c += np.asarray(col, np.float32) * m
    c *= 1 - ring
    c += GOLD * ring
    return c


def _paint_mural(c, cam, tau, wall, tp, zz, ribbons):
    wall.render(c, cam, tau)
    _halo(c, cam, zz, (0.36, 0.09), 70, MALACHITE * 0.9)
    _halo(c, cam, tp, (0.55, 0.07), 74, AZURITE * 0.9)
    zz.render(c, cam, tau)
    tp.render(c, cam, tau)
    _draw_ribbons(c, cam, tau, zz, ribbons)
    return c


def _draw_ribbons(c, cam, tau, zz, ribbons, opacity=1.0):
    base = zz.point(cam, (0.45, 0.35))
    for ph, amp, k in ribbons:
        s = np.linspace(0, 1, 60)
        x = base[0] - 40 + s * (260 + 60 * k) * (1 if k % 2 else -1)
        y = base[1] + 60 * k - 120 + np.sin(s * 6 + tau * 1.3 + ph) * 28 * amp - s * 80
        col = [CINNABAR, AZURITE, MALACHITE, GOLD][k % 4]
        pts = (np.c_[x, y] * 4).astype(np.int32)
        m = np.zeros((H, W), np.uint8)
        for j in range(len(pts) - 1):
            wdt = max(1, int(6 * (1 - s[j]) + 1))
            cv2.line(m, tuple(pts[j]), tuple(pts[j + 1]), 255, wdt, cv2.LINE_AA, shift=2)
        a = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 0.8)[..., None] * 0.75 * opacity
        c *= 1 - a
        c += col * a
    return c


@shot
def sh22(dur):
    """壁画: the two as figures in a Dunhuang cave mural; ribbons drift; dust hangs in a light shaft."""
    wall, tp, zz, ribbons = _mural_scene()
    dust = Particles(n=120, zrange=(1.0, 3.5), fall=-4, wind=6, size=1.5, color=(0.98, 0.92, 0.80), seed=95, opacity=0.6)
    smoke = Vapour(origin=(0, 0), period=6.0, direction=(0.3, -1.0), seed=96, size=40, color=(0.92, 0.88, 0.82), strength=0.18, continuous=True)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    shaft = np.exp(-(((xx - 0.65 * W) + (yy - 0) * 0.5) / 260) ** 2).astype(np.float32)[..., None]

    def render(tau):
        u = tau / dur
        cam = Cam(x=float(keys(u, [(0, -90), (1, 90)])), z=float(keys(u, [(0, 0.0), (1, 0.12)])))
        c = paper_canvas()
        _paint_mural(c, cam, tau, wall, tp, zz, ribbons)
        c = c * 0.86 + c * shaft * 0.35
        smoke.render(c, cam, tau, origin=(W * 0.12, H * 1.05))
        dust.render(c, cam, tau)
        return clamp01(grade(c, sat=1.0, contrast=1.05, keep=0.85))

    return render


@shot
def sh23(dur):
    """相对: face to face under the moon; red thread between their hands; cinnabar petals circle them."""
    bg, mn = _closeup_bg(57, moon=((0, -40), 150), density=0.38)
    tp = Sprite("TP_RIGHT", height=1.20 * H, Z=2.0, pos=(-300, 0.775 * H), pivot=(0.5, 1.0), sway=6, hair=6, hair_region=(0.0, 0.45),
                seed=97, rim=((0.2, -1.0), (0.95, 0.96, 1.0), 0.3, 6), ink_edge=0.3)
    zz = Sprite("ZZ_34B", height=1.30 * H, Z=2.0, pos=(300, 0.85 * H), pivot=(0.5, 1.0), sway=6, hair=5, hair_region=(0.0, 0.3),
                seed=98, rim=((-0.2, -1.0), (0.95, 0.96, 1.0), 0.3, 6), ink_edge=0.3)
    petals = Petals(n=46, color=(0.78, 0.22, 0.15), color2=(0.93, 0.82, 0.78), size=7, seed=99, swirl=(0, -40, 1.0, 0.6), zrange=(1.6, 2.6))

    def render(tau):
        u = tau / dur
        cam = Cam(x=float(keys(u, [(0, -70), (1, 70)])), z=float(keys(u, [(0, 0.0), (1, 0.15)])), roll=float(keys(u, [(0, -0.6), (1, 0.6)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        mn.render(c, cam, tau)
        tp.render(c, cam, tau)
        zz.render(c, cam, tau)
        g = night(c, sat=0.30, contrast=1.05, lift=0.04)
        c = g * 0.72 + mural(c, 0.7) * 0.28
        petals.render(c, cam, tau, opacity=0.9)
        A = tp.point(cam, (0.47, 0.53))
        B = zz.point(cam, (0.14, 0.72))
        draw_threads(c, [thread_points(A[:2], B[:2], tau, sag=40, sway=8, freq=0.5)], color=RED, width=2, glow=0.35, opacity=0.95)
        return clamp01(c)

    return render


@shot
def sh24(dur):
    """丝桥: two solitary peaks joined by a single glinting silk strand; a figure on each summit; vast moon."""
    mts = InkMountains(seed=41, n=4, base=0.55, spread=0.25, peaks=(2, 4),
                       custom={3: [(0.22, 0.46, 0.075, 1.4), (0.78, 0.44, 0.075, 1.4)]})
    n = len(mts.layers)
    zc = mts.layers[n - 1]["Z"]
    mn = Moon((0, -60), 230, Z=16.0, kind="hongyun", color=(0.93, 0.92, 0.88))
    tp = Sprite("TP_RIGHT", height=0.075 * H, Z=zc, sway=3, seed=100, ink_edge=0.0, breath=0)
    zz = Sprite("ZZ_SIDE", height=0.068 * H, Z=zc, sway=3, seed=101, ink_edge=0.0, breath=0)
    prof = mts.layers[n - 1]["prof"]
    pk = lambda a, b: (int(a * mts.pw) + int(np.argmin(prof[int(a * mts.pw):int(b * mts.pw)]))) / mts.pw
    uL, uR = pk(0.12, 0.30), pk(0.70, 0.88)
    clouds = [Fog(Z=8.0 - 2 * k, density=0.55, color=PAPER, speed=8 + 6 * k, cell=240, seed=102 + k, band=(0.72 + 0.08 * k, 0.12)) for k in range(3)]

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.18), (1, 0.0)])), y=float(keys(u, [(0, 30), (1, -40)])))
        c = paper_canvas()
        mn.render(c, cam, tau)
        mts.render(c, cam, tau, mist=lambda cc, cm, tt, k: clouds[min(k, 2)].render(cc, cm, tt))
        pL, pR = mts.ridge_offset(n - 1, uL), mts.ridge_offset(n - 1, uR)
        tp.render(c, cam, tau, pos=(pL[0], pL[1] + 2), silhouette=(0.8, INK))
        zz.render(c, cam, tau, pos=(pR[0], pR[1] + 2), silhouette=(0.8, INK))
        c = night(c, sat=0.05, contrast=1.1, pivot=0.5)
        A = tp.point(cam, (0.45, 0.45), pos=(pL[0], pL[1] + 2))
        B = zz.point(cam, (0.45, 0.45), pos=(pR[0], pR[1] + 2), )
        pts = thread_points(A[:2], B[:2], tau, sag=70, sway=6, freq=0.3, n=120, wiggle=1)
        dew = [(pts[i, 0], pts[i, 1], 1.6 + 0.8 * math.sin(tau * 3 + i)) for i in range(6, len(pts), 13)]
        draw_threads(c, [pts], color=SILK, width=1, glow=0.6, opacity=0.95, dew=dew)
        return c

    return render


# ============================================================================= 第四阶段：命运变化与分离
@shot
def sh25(dur):
    """山门: push up the stairs toward the gate under the red sun; talismans tumble in the wind."""
    plate = PlateStack("SC02_TEMPLE_GATE", focus=(0.62, 0.50), cover=1.12, z_far=5.0, z_near=2.8)
    tal = Talismans(n=5, seed=111, size=24, Z=2.0, wind=(-60, -20))
    gate = plate.plate_to_offset(0.72, 0.63)
    mist = Vapour(origin=(0, 0), period=5.0, direction=(-0.4, -0.5), seed=112, size=50, color=(0.90, 0.87, 0.80), strength=0.14, continuous=True)
    fog = Fog(Z=1.6, density=0.25, speed=-26, cell=260, seed=113, band=(0.85, 0.25))

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.30)])), pan=(float(keys(u, [(0, 30), (1, -gate[0] * 0.25)])), float(keys(u, [(0, 10), (1, -gate[1] * 0.15)]))))
        c = paper_canvas()
        plate.render(c, cam, tau)
        gx, gy, m = cam.project(gate[0], gate[1], plate.Z(1))
        mist.render(c, cam, tau, origin=(gx, gy))
        fog.render(c, cam, tau)
        g = day(c, sat=0.10, contrast=1.1)
        g = keep_hue(c, g, hue=(-20, 28), sat_min=0.20)
        tal.render(g, cam, tau)
        return g

    return render


@shot
def sh26(dur):
    """鸦乱: he braces with his spear inside churning ink; crows burst from the branches; ink spatters on the beat."""
    plate = PlateStack("P6_CROWS_BRANCHES", focus=(0.55, 0.52), cover=1.12)
    unit = plate.ph * plate.b
    zp = plate.Z(1)
    tp = Sprite("TP_FIGHT2", height=0.60 * unit, Z=zp, pos=plate.plate_to_offset(0.565, 0.83), sway=14, hair=10,
                hair_region=(0.0, 0.4), seed=114, ink_edge=0.35, exposure=1.0)
    crows = Crows(n=26, seed=115, start=(0.15, 0.75), end=(1.15, 0.05), spread=(0.18, 0.12), size=13, duration=4.0, Z=2.2, delay=1.2)
    smoke = Fog(Z=1.8, density=0.45, color=INK, speed=-70, cell=180, seed=116, band=(0.92, 0.18), lo=0.5, hi=0.9)
    acc = 3.73
    splats = [InkBloom((x, y), r, t_hit=acc + d, tau=0.18, seed=117 + i, fall_from=0.0, splatter=1.0, strength=1.0)
              for i, (x, y, r, d) in enumerate([(260, 140, 70, 0.0), (1650, 620, 90, 0.05), (1420, 120, 40, 0.1), (420, 690, 55, 0.08)])]
    rng = np.random.default_rng(118)
    shake = rng.normal(0, 1, (400, 2))

    def render(tau):
        u = tau / dur
        k = int(max(tau, 0) * 24) % 400
        amp = 2.5 + 5 * math.exp(-max(tau - acc, 0) * 3) * (tau > acc)
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.25)])), shake=(shake[k, 0] * amp, shake[k, 1] * amp))
        c = paper_canvas()
        plate.render(c, cam, tau, upto=2)
        tp.render(c, cam, tau, rot=0.8 * math.sin(tau * 1.7))
        plate.render(c, cam, tau, start=2)
        smoke.render(c, cam, tau)
        crows.render(c, cam, tau)
        for sp in splats:
            if tau > sp.t_hit:
                sp.render(c, cam, tau, opacity=0.9)
        g = day(c, sat=0.12, contrast=1.12)
        return keep_hue(c, g, hue=(-20, 25), sat_min=0.30, amount=0.8)

    return render


def _tear_overlay(start_uv, end_uv, t0, t1):
    def ov(img, t):
        if t < t0:
            return
        h, w = img.shape[:2]
        p = clamp01((t - t0) / (t1 - t0))
        p = p * p * (3 - 2 * p)
        sx, sy = start_uv[0] * w, start_uv[1] * h
        ex, ey = end_uv[0] * w, end_uv[1] * h
        cx_, cy_ = sx + (ex - sx) * p + 3 * math.sin(p * 6), sy + (ey - sy) * p
        trail = np.zeros((h, w), np.float32)
        cv2.line(trail, (int(sx), int(sy)), (int(cx_), int(cy_)), 1.0, max(1, int(w * 0.004)), cv2.LINE_AA)
        trail = cv2.GaussianBlur(trail, (0, 0), 1.2) * 0.22
        drop = np.zeros((h, w), np.float32)
        r = max(2, int(w * 0.007))
        cv2.ellipse(drop, (int(cx_), int(cy_)), (r, int(r * 1.3)), 0, 0, 360, 1.0, -1, cv2.LINE_AA)
        drop = cv2.GaussianBlur(drop, (0, 0), 0.8)
        hl = np.zeros((h, w), np.float32)
        cv2.circle(hl, (int(cx_ - r * 0.3), int(cy_ - r * 0.4)), max(1, r // 3), 1.0, -1, cv2.LINE_AA)
        a = img[..., 3:4]
        img[..., :3] += (trail[..., None] * 0.6 + drop[..., None] * 0.25 + hl[..., None] * 0.6) * a
        np.clip(img, 0, 1, out=img)
    return ov


@shot
def sh27(dur):
    """泪: her bowed profile; a tear slides; the last mural colour drains from her into ink."""
    bg, _ = _closeup_bg(59, density=0.45)
    zz = Sprite("ZZ_FACE_SAD", height=1.02 * H, Z=1.6, pos=(300, 60), pivot=(0.5, 0.5), sway=0, hair=6, hair_region=(0.05, 0.9),
                hair_sides=0.22, breath=0.002, seed=119, ink_edge=0.2, rim=((0.6, -0.8), (0.95, 0.96, 1.0), 0.25, 5))
    zz.overlays.append(_tear_overlay((0.415, 0.505), (0.395, 0.70), 1.2, 4.8))

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.16)])), x=float(keys(u, [(0, 20), (1, 50)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        zz.render(c, cam, tau, rot=-0.3 * math.sin(tau * 0.4))
        drain = smoothstep(1.0, dur - 0.6, tau)
        col = night(c, sat=0.40, contrast=1.02, lift=0.04) * 0.65 + mural(c, 0.8) * 0.35
        ink = night(c, sat=0.03, contrast=1.08, lift=0.03)
        return col * (1 - drain) + ink * drain

    return render


@shot
def sh28(dur):
    """去: his back recedes into thickening mist; the red thread behind him stretches thin."""
    bg = WashBackdrop(seed=61, density=0.35, cell=320, Z=6.0, lo=0.3, vertical=(0.7, 1.0))
    tp = Sprite("TP_BACK", height=0.95 * H, Z=2.0, pos=(220, 0.48 * H), sway=9, hair=7, hair_region=(0.0, 0.45), seed=120, ink_edge=0.3)
    fog = Fog(Z=1.5, density=0.5, speed=20, cell=280, seed=121, lo=0.3, hi=0.9)

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.05)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        step = 2 * np.pi * 0.85 * tau
        sm = float(keys(u, [(0, 1.0), (1, 0.62)]))
        pos = (220 + 30 * u, 0.48 * H - 140 * (1 - sm))
        recede = smoothstep(0.0, dur, tau)
        tp.render(c, cam, tau, pos=pos, scale_mul=sm, bob=-abs(math.sin(step)) * 5 * sm, fog=(0.15 + 0.5 * recede, PAPER))
        fog.render(c, cam, tau, density=0.25 + 0.55 * recede)
        c = day(c, sat=0.05)
        B = tp.point(cam, (0.12, 0.55), pos=pos, scale_mul=sm)
        pts = thread_points((-30, H * 0.58), B[:2], tau, sag=lerp(60, 12, recede), sway=lerp(14, 4, recede), freq=0.5, n=80)
        draw_threads(c, [pts], color=RED, width=2 if tau < dur * 0.5 else 1, glow=0.3, opacity=lerp(0.95, 0.55, recede))
        return c

    return render


@shot
def sh29(dur):
    """断: the thread pulled to its limit snaps on the musical peak; ends whip back; cinnabar spatters bloom."""
    bg = WashBackdrop(seed=63, density=0.22, cell=340, Z=5.0, lo=0.35)
    ts = 3.9
    rng = np.random.default_rng(122)
    drops = [(rng.normal(0, 1) * 160, rng.uniform(-1.4, -0.3) * 160, rng.uniform(0.05, 0.6)) for _ in range(16)]
    blots = []
    for i, (vx, vy, d) in enumerate(drops):
        T = 0.55 + d
        x = CX + vx * T
        y = H * 0.48 + vy * T + 0.5 * 900 * T * T
        if 0 < x < W and 0 < y < H:
            blots.append(InkBloom((x, y), rng.uniform(10, 34), t_hit=ts + T, tau=0.5, color=np.array([0.62, 0.12, 0.08], np.float32),
                                  seed=123 + i, fall_from=0.0, strength=0.9, splatter=0.8))
    A0, B0 = np.array([-40.0, H * 0.50]), np.array([W + 40.0, H * 0.46])
    brk = 0.52

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (0.55, 0.05), (0.6, 0.12), (1, 0.16)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        c = day(c, sat=0.05)
        for b in blots:
            if tau > b.t_hit:
                b.render(c, cam, tau)
        if tau < ts:
            ten = smoothstep(0.0, ts, tau)
            pts = thread_points(A0, B0, tau, sag=lerp(40, 1, ten), sway=lerp(10, 0.5, ten), freq=0.4, n=140, wiggle=0)
            pts[:, 1] += np.sin(np.linspace(0, 60, len(pts)) + tau * 60) * ten ** 2 * 2.0 * np.sin(np.linspace(0, np.pi, len(pts)))
            draw_threads(c, [pts], color=RED, width=3, glow=0.45, opacity=0.97)
        else:
            dt = tau - ts
            P = A0 + (B0 - A0) * brk
            for end, sgn in ((A0, -1), (B0, 1)):
                rec = 1 - math.exp(-dt * 5) * math.cos(dt * 14)
                tip = P + (end - P) * 0.55 * rec + np.array([0, 1]) * (380 * dt * dt + 60 * dt)
                n = 60
                s = np.linspace(0, 1, n)[:, None]
                curve = end + (tip - end) * s
                curve[:, 1] += np.sin(s[:, 0] * np.pi) * (30 + 120 * min(dt, 1.0)) + np.sin(s[:, 0] * 18 + dt * 20) * 8 * math.exp(-dt * 2) * s[:, 0]
                draw_threads(c, [curve], color=RED, width=3, glow=0.4, opacity=0.97)
            m = np.zeros((H, W), np.uint8)
            for (vx, vy, d) in drops:
                T = dt
                if T > 0.55 + d:
                    continue
                x = P[0] + vx * T
                y = P[1] + vy * T + 0.5 * 900 * T * T
                cv2.circle(m, (int(x * 4), int(y * 4)), int(3.5 * 4), 255, -1, cv2.LINE_AA, shift=2)
            a = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 0.8)[..., None]
            c = c * (1 - a) + np.array(RED, np.float32) * a
        return c

    return render


@shot
def sh30(dur):
    """网破: the great web over the misty lake tears between two silhouettes, who drift apart."""
    plate = PlateStack("P5_WEB_LAKE", focus=(0.45, 0.5), cover=1.10)
    unit = plate.ph * plate.b
    zp = plate.Z(1)
    zz = Sprite("ZZ_BACK", height=0.42 * unit, Z=zp * 0.8, sway=6, seed=124, ink_edge=0.2)
    tp = Sprite("TP_BACK", height=0.44 * unit, Z=zp, sway=6, hair=4, seed=125, ink_edge=0.2)
    pz0, pt0 = plate.plate_to_offset(0.33, 0.97), plate.plate_to_offset(0.66, 0.80)
    web = Web((W * 0.40, H * 0.30), 470, spokes=22, turns=17, seed=126, squash=(1.0, 0.8))
    fog = Fog(Z=2.0, density=0.4, color=MIST_N, speed=14, cell=240, seed=127, band=(0.8, 0.3))

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.30), (1, 0.0)])))
        c = paper_canvas(PAPER_N)
        plate.render(c, cam, tau)
        apart = smoothstep(0.5, dur, tau)
        zz.render(c, cam, tau, pos=pz0 + [-120 * apart, -20 * apart], scale_mul=1 - 0.15 * apart, silhouette=(0.85, INK_NIGHT), fog=(0.12, MIST_N))
        tp.render(c, cam, tau, pos=pt0 + [140 * apart, -15 * apart], scale_mul=1 - 0.15 * apart, silhouette=(0.75, INK_NIGHT), fog=(0.3, MIST_N))
        fog.render(c, cam, tau)
        c = night(c, sat=0.08)
        web_draw(c, web, cam, tau, Z=1.3, tear=0.85 * smoothstep(0.3, dur - 0.5, tau), sway=4 + 6 * apart, opacity=0.6)
        return c

    return render


@shot
def sh31(dur):
    """剥落: the mural of the two flakes away in organic patches; painted chips fall; bare cave rock remains."""
    wall, tp, zz, ribbons = _mural_scene(seed=1)
    rock = PlateStack("P2_BUDDHA_CAVE", focus=(0.18, 0.5), cover=1.25)
    from core import fbm as _fbm
    n1 = cv2.resize(_fbm(H // 3, W // 3, 26, 6, 141, persistence=0.62), (W, H), interpolation=cv2.INTER_CUBIC)
    rng = np.random.default_rng(142)
    chips = [dict(x=rng.uniform(0, W), y=rng.uniform(0, H), s=rng.uniform(6, 22), vx=rng.normal(0, 25), spin=rng.uniform(-3, 3),
                  pts=np.c_[np.cos(np.linspace(0, 2 * np.pi, 7)[:-1] + rng.normal(0, 0.3, 6)),
                            np.sin(np.linspace(0, 2 * np.pi, 7)[:-1] + rng.normal(0, 0.3, 6))] * rng.uniform(0.6, 1.0, (6, 1)))
             for _ in range(220)]

    def render(tau):
        u = tau / dur
        cam = Cam(x=float(keys(u, [(0, 90), (1, 120)])), z=0.12)
        c = paper_canvas()
        _paint_mural(c, cam, tau, wall, tp, zz, ribbons)
        A = clamp01(grade(c, sat=1.0, keep=0.85))
        bare = paper_canvas(INK)
        rock.render(bare, cam, tau)
        B = night(bare, sat=0.05, contrast=1.15, pivot=0.35)
        prog = smoothstep(0.3, dur - 0.5, tau)
        thr = n1 * 0.85 + 0.075
        m = smoothstep(thr - 0.015, thr + 0.015, prog * 1.08)[..., None]
        edge = clamp01(1 - np.abs(prog * 1.08 - thr) / 0.03)[..., None]
        out = A * (1 - m) + B * m
        out = out * (1 - 0.5 * edge) + np.array([0.85, 0.78, 0.64], np.float32) * 0.25 * edge
        for ch in chips:
            t0 = float(n1[int(ch["y"]) % H, int(ch["x"]) % W]) * 0.85 + 0.075
            age = (prog * 1.08 - t0) * dur * 0.9
            if age <= 0 or age > 2.5:
                continue
            col = A[int(ch["y"]) % H, int(ch["x"]) % W]
            x = ch["x"] + ch["vx"] * age
            y = ch["y"] + 160 * age * age
            if y > H + 30:
                continue
            ang = ch["spin"] * age
            sq = 0.3 + 0.7 * abs(math.cos(ang * 1.4))
            P = ch["pts"] * ch["s"]
            P = P * [1, sq]
            R = np.array([[math.cos(ang), -math.sin(ang)], [math.sin(ang), math.cos(ang)]])
            P = P @ R.T + [x, y]
            cv2.fillConvexPoly(out, (P * 4).astype(np.int32), tuple(float(v) for v in col * (0.75 + 0.25 * sq)), cv2.LINE_AA, shift=2)
        return clamp01(out)

    return render


# ============================================================================= 第五阶段：回忆与余韵
def _inkify(sp):
    """Painterly pass for the realistic portrait: edge-preserving flatten + ink edge lines (in place)."""
    a = sp.pm[..., 3]
    rgb = np.where(a[..., None] > 1e-3, sp.pm[..., :3] / np.maximum(a[..., None], 1e-3), 0)
    u8 = (clamp01(rgb) * 255).astype(np.uint8)
    ep = cv2.edgePreservingFilter(u8, flags=1, sigma_s=30, sigma_r=0.3)
    g = cv2.cvtColor(u8, cv2.COLOR_RGB2GRAY)
    edges = cv2.adaptiveThreshold(cv2.medianBlur(g, 5), 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 4)
    ink = ep.astype(np.float32) * (0.55 + 0.45 * edges[..., None] / 255.0)
    out = (u8.astype(np.float32) * 0.45 + ink * 0.55) / 255
    sp.pm = np.dstack([clamp01(out) * a[..., None], a]).astype(np.float32)
    return sp


def _snow(seed, dense=1.0):
    return [Particles(n=int(500 * dense), zrange=(4, 10), fall=55, wind=-14, size=1.4, color=(0.93, 0.95, 0.97), seed=seed, opacity=0.75),
            Particles(n=int(220 * dense), zrange=(1.6, 4), fall=70, wind=-18, size=2.0, color=(0.95, 0.96, 0.98), seed=seed + 1, opacity=0.85),
            Particles(n=int(30 * dense), zrange=(0.6, 1.2), fall=90, wind=-24, size=2.6, color=(0.97, 0.97, 0.99), seed=seed + 2, opacity=0.7, bokeh_z=1.3)]


@shot
def sh32(dur):
    """雪夜: the present. Snow on a ruined night citadel; a lone figure with a weapon on his shoulder. Slow push."""
    plate = PlateStack("SC01_SNOW_CASTLE", focus=(0.47, 0.62), cover=1.06)
    span = (0.62 - 0.30) * plate.ph * plate.b
    snow = _snow(131)
    fog = Fog(Z=2.5, density=0.3, color=MIST_N, speed=10, cell=260, seed=132, band=(0.85, 0.2))

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.22)])), pan=(0.0, float(keys(u, [(0, span), (0.15, span), (0.85, 0), (1, 0)]))))
        c = paper_canvas(PAPER_N)
        snow[0].render(c, cam, tau)
        plate.render(c, cam, tau)
        fog.render(c, cam, tau)
        snow[1].render(c, cam, tau)
        snow[2].render(c, cam, tau)
        return night(c, sat=0.10, contrast=1.15, pivot=0.4, gamma=0.95)

    return render


@shot
def sh33(dur):
    """老: the old boar-faced Bajie in close-up; breath clouds in the cold; snow settles; slow push."""
    bg = WashBackdrop(seed=65, density=0.55, cell=320, Z=6.0, lo=0.3, color=INK_NIGHT, paper=np.array([0.20, 0.23, 0.27], np.float32))
    bj = Sprite("BJ_PORTRAIT", height=1.10 * H, Z=1.6, pos=(250, 120), pivot=(0.5, 0.5), sway=0, hair=4, hair_region=(0.0, 0.45),
                hair_sides=0.0, breath=0.003, seed=133, ink_edge=0.15, exposure=0.95, rim=((-0.6, -0.8), (0.85, 0.92, 1.0), 0.45, 8))
    _inkify(bj)
    breath = Vapour(origin=(0, 0), period=3.8, direction=(-1.0, -0.15), seed=134, size=34, color=(0.88, 0.91, 0.95), strength=0.42)
    snow = _snow(135, 0.7)

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.0), (1, 0.15)])), x=float(keys(u, [(0, 15), (1, -20)])))
        c = paper_canvas()
        bg.render(c, cam, tau)
        snow[0].render(c, cam, tau)
        bj.render(c, cam, tau, rot=0.3 * math.sin(tau * 0.35))
        nose = bj.point(cam, (0.06, 0.50))
        breath.render(c, cam, tau + 1.0, origin=nose[:2])
        snow[1].render(c, cam, tau)
        snow[2].render(c, cam, tau)
        return night(c, sat=0.20, contrast=1.1, pivot=0.4, lift=0.02)

    return render


@shot
def sh34(dur):
    """残影: her figure surfaces in the falling snow as a pale ink ghost, then disperses into motes."""
    plate = PlateStack("SC01_SNOW_CASTLE", focus=(0.36, 0.70), cover=1.12)
    zz = Sprite("ZZ_FRONT", height=0.78 * H, Z=2.4, pos=(-60, 0.40 * H), sway=8, hair=4, seed=136, ink_edge=0.3)
    motes = Disintegrate(zz, n=1100, seed=137, color=np.array([0.90, 0.93, 0.96], np.float32))
    snow = _snow(138)

    def render(tau):
        u = tau / dur
        cam = Cam(x=float(keys(u, [(0, -50), (1, 50)])), z=0.1)
        c = paper_canvas(PAPER_N)
        snow[0].render(c, cam, tau)
        plate.render(c, cam, tau)
        haze(c, 0.25, MIST_N)
        appear = smoothstep(0.2, 1.8, tau)
        gone = smoothstep(2.8, 5.6, tau)
        vis = appear * (1 - gone)
        if vis > 0.01:
            zz.render(c, cam, tau, reveal=vis, opacity=0.62, fog=(0.35, MIST_N))
        snow[1].render(c, cam, tau)
        c = night(c, sat=0.08, contrast=1.1, pivot=0.4)
        if gone > 0:
            motes.render(c, cam, tau, gone)
        snow[2].render(c, cam, tau)
        return c

    return render


@shot
def sh35(dur):
    """空湖: the mirror lake again, framed exactly as at the meeting; nobody on the far shore; snow on the water."""
    plate = PlateStack("P4_MIRROR_LAKE", focus=(0.52, 0.52), cover=1.10, z_far=9, z_near=2.2)
    fog_far = Fog(Z=6.0, density=0.55, color=MIST_N, speed=10, cell=160, seed=3, band=(0.62, 0.22), lo=0.4, hi=0.9)
    fog_near = Fog(Z=1.6, density=0.35, color=MIST_N, speed=24, cell=220, seed=4, band=(0.86, 0.2), lo=0.45, hi=0.95)
    snow = _snow(139, 0.8)

    def render(tau):
        u = tau / dur
        cam = Cam(x=float(keys(u, [(0, 70), (1, -70)])), y=float(keys(u, [(0, 10), (1, -6)])), z=float(keys(u, [(0, 0.0), (1, 0.28)])))
        c = paper_canvas(PAPER_N)
        plate.render(c, cam, tau)
        fog_far.render(c, cam, tau)
        snow[0].render(c, cam, tau)
        fog_near.render(c, cam, tau)
        snow[1].render(c, cam, tau)
        snow[2].render(c, cam, tau)
        return night(c, sat=0.06, contrast=1.15, pivot=0.55)

    return render


@shot
def sh36(dur):
    """余线: a scrap of red thread on the snow is lifted by the wind and carried up toward the moon."""
    bg = WashBackdrop(seed=67, density=0.28, cell=340, Z=8.0, lo=0.35, vertical=(1.0, 0.3))
    rise = 1.25 * H
    mn = Moon((80, -rise - 0.05 * H), 105, Z=14.0, kind="hongyun", color=(0.93, 0.93, 0.92))
    snow = _snow(140, 0.6)
    yy = np.arange(H, dtype=np.float32)[:, None, None]
    gtex = cv2.resize(fbm(H // 4, W // 4, 30, 4, 143), (W, H))[..., None]

    def render(tau):
        u = tau / dur
        pan_y = float(keys(u, [(0, 0), (0.18, 0), (1, rise)]))
        cam = Cam(pan=(0.0, pan_y))
        c = paper_canvas(PAPER_N)
        bg.render(c, Cam(pan=(0.0, pan_y * 0.12)), tau)
        mn.render(c, cam, tau)
        gy = CY + 0.18 * H + pan_y
        ground = smoothstep(gy - 20, gy + 30, yy)
        snowcol = np.array([0.90, 0.92, 0.94], np.float32) * (0.95 + 0.08 * gtex)
        c[:] = c * (1 - ground * 0.92) + snowcol * ground * 0.92
        snow[0].render(c, cam, tau)
        c = night(c, sat=0.05, contrast=1.05, pivot=0.5, lift=0.05)
        lift = smoothstep(0.7, dur - 0.2, tau)
        depth = 1 + 5 * lift ** 1.5
        X = -40 + 140 * lift + 30 * math.sin(tau * 1.3) * lift
        Y = (0.17 * H) * (1 - lift) + (-rise - 0.05 * H) * lift
        fx, fy = CX + X, CY + Y + pan_y
        L = 170 / depth
        s_ = np.linspace(0, 1, 40)
        ang = 0.15 * math.sin(tau * 1.1) + lift * 1.0
        shape = np.c_[(s_ - 0.5) * L, np.sin(s_ * 7 + tau * 3) * (3 + 10 * lift) / depth]
        R = np.array([[math.cos(ang), -math.sin(ang)], [math.sin(ang), math.cos(ang)]])
        pts = shape @ R.T + [fx, fy]
        draw_threads(c, [pts], color=RED, width=2 if lift < 0.35 else 1, glow=0.35, opacity=0.97)
        snow[1].render(c, cam, tau)
        return c

    return render


@shot
def sh37(dur):
    """墨归: the opening mountains, now under the moon, recede back into blank paper, nearest first."""
    mts = InkMountains(seed=11, n=5, origin=(0.5, 0.62))
    n = len(mts.layers)
    mn = Moon((0, -215), 105, Z=14.0, kind="hongyun", color=(0.93, 0.92, 0.88))
    mists = [Fog(Z=8.0 - k, density=0.55, speed=6 + 3 * k, cell=200, seed=20 + k, band=(0.50 + 0.07 * k, 0.12), lo=0.45, hi=0.95)
             for k in range(4)]

    def render(tau):
        u = tau / dur
        cam = Cam(z=float(keys(u, [(0, 0.14), (1, 0.0)])), y=float(keys(u, [(0, -10), (1, 10)])))
        c = paper_canvas()
        mn.render(c, cam, tau, opacity=1 - smoothstep(4.5, dur, tau))
        gen = lambda k: 1 - ease(clamp01((tau - 0.6 - (n - 1 - k) * 0.6) / 3.6))
        mts.render(c, cam, tau, genesis=gen, mist=lambda cc, cm, tt, k: mists[min(k, 3)].render(cc, cm, tt))
        return night(c, sat=0.0, contrast=1.05, pivot=0.5, lift=0.05)

    return render


@shot
def sh38(dur):
    """白: blank paper; one dot of cinnabar fades; the picture goes to black with the song's silence."""
    dot = InkBloom((CX, CY), 16, t_hit=-5, tau=0.5, color=np.array([0.66, 0.13, 0.09], np.float32), seed=142, fall_from=0.0, strength=0.9)

    def render(tau):
        c = paper_canvas()
        dot.render(c, Cam(), tau, opacity=1 - smoothstep(0.4, 2.8, tau))
        c = night(c, sat=0.9, contrast=1.0, pivot=0.5, lift=0.05)
        k = smoothstep(2.2, dur - 0.3, tau)
        return c * (1 - k)

    return render
