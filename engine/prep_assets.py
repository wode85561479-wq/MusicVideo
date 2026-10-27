"""Asset preparation: plates (upscale, depth, parallax layers, figure removal) and character sprites.

Run:  python3 engine/prep_assets.py [plates|sprites|all]
Outputs under compositing/plates/<ID>/ and compositing/sprites/.
"""
import json
import sys
from pathlib import Path

import numpy as np
import cv2

sys.path.insert(0, str(Path(__file__).parent))
import models  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "references"
OUT_PLATES = ROOT / "compositing" / "plates"
OUT_SPRITES = ROOT / "compositing" / "sprites"


def load(path):
    im = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if im.shape[2] == 4:
        im = im[:, :, :3]
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB)


def save_rgb(path, rgb, q=95):
    cv2.imwrite(str(path), cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, q])


def save_rgba(path, rgb, a):
    bgra = np.dstack([cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), (np.clip(a, 0, 1) * 255).astype(np.uint8)])
    cv2.imwrite(str(path), bgra)


def push_pull_fill(img, hole):
    """Pyramid push-pull interpolation: smooth, streak-free fill of `hole` from surrounding pixels."""
    f = img.astype(np.float32)
    wgt = (~hole).astype(np.float32)
    levels = []
    cur, cw = f * wgt[..., None], wgt
    while min(cur.shape[:2]) > 4:
        levels.append((cur, cw))
        cur = cv2.pyrDown(cur)
        cw = cv2.pyrDown(cw)
    est = cur / np.maximum(cw, 1e-6)[..., None]
    for cur, cw in reversed(levels):
        up = cv2.pyrUp(est, dstsize=(cur.shape[1], cur.shape[0]))
        known = cur / np.maximum(cw, 1e-6)[..., None]
        a = np.clip(cw * 4, 0, 1)[..., None]
        est = known * a + up * (1 - a)
    return est


def row_fill(img, hole, band=6):
    """Fill each row of `hole` by interpolating between the pixels just left and right of it;
    keeps horizontal structure (horizons, shorelines, water strokes) continuous."""
    out = img.astype(np.float32).copy()
    f = cv2.GaussianBlur(out, (0, 0), 1.5)
    for y in np.where(hole.any(axis=1))[0]:
        xs = np.where(hole[y])[0]
        # contiguous spans
        splits = np.where(np.diff(xs) > 1)[0]
        for seg in np.split(xs, splits + 1):
            a, b = seg[0], seg[-1]
            la, rb = max(0, a - band), min(img.shape[1] - 1, b + band)
            left = f[y, la:a].mean(0) if a > 0 else f[y, b + 1:rb + 1].mean(0)
            right = f[y, b + 1:rb + 1].mean(0) if b < img.shape[1] - 1 else left
            tt = np.linspace(0, 1, b - a + 1, dtype=np.float32)[:, None]
            out[y, a:b + 1] = left * (1 - tt) + right * tt
    # soften the per-row streaks vertically a little
    sm = cv2.GaussianBlur(out, (5, 41), 0)
    out[hole] = sm[hole]
    return out


def mirror_fill(img, hole):
    """Fill each row span by blending reflections of the texture on its left and right sides
    (keeps real brushwork instead of a smooth smear)."""
    out = img.astype(np.float32).copy()
    w = img.shape[1]
    for y in np.where(hole.any(axis=1))[0]:
        xs = np.where(hole[y])[0]
        splits = np.where(np.diff(xs) > 1)[0]
        for seg in np.split(xs, splits + 1):
            a, b = seg[0], seg[-1]
            n = b - a + 1
            d = np.arange(n)
            li = np.clip(a - 1 - d, 0, w - 1)
            ri = np.clip(b + 1 + (n - 1 - d), 0, w - 1)
            tt = (d / max(n - 1, 1)).astype(np.float32)[:, None]
            tt = tt * tt * (3 - 2 * tt)
            out[y, a:b + 1] = img[y, li] * (1 - tt) + img[y, ri] * tt
    return out


def textured_inpaint(img, hole, scale=4, radius=6, seed=0, feather=0, mode="pushpull"):
    """Fill `hole` (bool) by push-pull (or row) interpolation, then re-add plate grain so fills are not flat."""
    h, w = hole.shape
    small = cv2.resize(img, (w // scale, h // scale), interpolation=cv2.INTER_AREA)
    hs = cv2.resize(hole.astype(np.uint8), (w // scale, h // scale), interpolation=cv2.INTER_NEAREST)
    hs = cv2.dilate(hs, np.ones((3, 3), np.uint8)).astype(bool)
    if mode in ("mirror", "clone"):
        if mode == "mirror":
            fill = mirror_fill(img, hole)
        else:  # clone stamp from the left, same rows (keeps horizontal structure, no symmetry)
            xs_ = np.where(hole.any(axis=0))[0]
            sh = int((xs_.max() - xs_.min()) * 1.1 + 30)
            fill = np.roll(img.astype(np.float32), sh, axis=1)
        hd = hole.astype(np.float32)
        m = cv2.GaussianBlur(cv2.dilate(hole.astype(np.uint8), np.ones((feather or 9, feather or 9), np.uint8)).astype(np.float32), (0, 0), (feather or 9) * 0.5)
        m = np.maximum(m, hd)[..., None]
        return np.clip(img.astype(np.float32) * (1 - m) + fill * m, 0, 255).astype(np.uint8)
    fill = row_fill(small, hs) if mode == "rows" else push_pull_fill(small, hs)
    fill = cv2.resize(fill, (w, h), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    f = img.astype(np.float32)
    # grain from outside the hole only, shifted further than the hole is wide so no removed detail returns
    hole_d = cv2.dilate(hole.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
    hp = (f - cv2.GaussianBlur(f, (0, 0), 1.2)) * (~hole_d)[..., None]
    xs = np.where(hole.any(axis=0))[0]
    shift = int((xs.max() - xs.min()) * 1.15 + 40) if xs.size else 0
    if shift < w * 0.8:
        valid = np.roll(~hole_d, shift, axis=1)
        fill += np.roll(hp, shift, axis=1) * valid[..., None] * 0.45
    if feather:
        m = cv2.GaussianBlur(cv2.dilate(hole.astype(np.uint8), np.ones((feather, feather), np.uint8)).astype(np.float32), (0, 0), feather * 0.6)
        m = np.maximum(m, hole.astype(np.float32))[..., None]
    else:
        m = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 2)[..., None]
    return np.clip(f * (1 - m) + fill * m, 0, 255).astype(np.uint8)


# ======================================================================= plates
# source boxes in reference pixel coordinates; `remove` = figure regions to erase (x0,y0,x1,y1, source coords)
PLATES = {
    "SC01_SNOW_CASTLE": dict(src="REF_SC01_snow_castle_night.png", box=None, width=3400, layers=4),
    "SC02_TEMPLE_GATE": dict(src="REF_SC02_temple_gate_red_sun.jpg", box=None, width=3400, layers=4),
    "P1_CLOUD_TEMPLES": dict(src="REF_SC03_six_panel_storyboard.jpg", box=(0, 0, 1288, 479), width=3200, layers=4),
    "P2_BUDDHA_CAVE": dict(src="REF_SC03_six_panel_storyboard.jpg", box=(1288, 0, 2576, 479), width=3200, layers=3),
    "P3_WEB_FOREST": dict(src="REF_SC03_six_panel_storyboard.jpg", box=(0, 479, 1288, 958), width=3200, layers=4,
                          remove=[(676, 672, 815, 900)], fill="clone"),
    "P4_MIRROR_LAKE": dict(src="REF_SC03_six_panel_storyboard.jpg", box=(1288, 479, 2576, 958), width=3200, layers=3,
                           remove=[(2088, 620, 2207, 846), (2086, 846, 2202, 962)], depth_ramp=0.75, fill="rows"),
    "P5_WEB_LAKE": dict(src="REF_SC03_six_panel_storyboard.jpg", box=(0, 958, 1288, 1438), width=3200, layers=3,
                        remove=[(612, 1072, 708, 1288), (788, 1122, 922, 1312), (322, 1242, 492, 1438)], fill="rows"),
    "P6_CROWS_BRANCHES": dict(src="REF_SC03_six_panel_storyboard.jpg", box=(1288, 958, 2576, 1438), width=3200, layers=4,
                              remove=[(1876, 1093, 2192, 1347)], fill="rows"),
}


def crop_black_borders(img, thr=8):
    g = img.mean(axis=2)
    cols = np.where(g.mean(axis=0) > thr)[0]
    rows = np.where(g.mean(axis=1) > thr)[0]
    return img[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1], (cols[0], rows[0])


def prep_plate(pid, spec):
    out = OUT_PLATES / pid
    out.mkdir(parents=True, exist_ok=True)
    img = load(REF / spec["src"])
    ox, oy = 0, 0
    if spec["box"]:
        x0, y0, x1, y1 = spec["box"]
        img = img[y0:y1, x0:x1]
        ox, oy = x0, y0
    img, (bx, by) = crop_black_borders(img)
    ox, oy = ox + bx, oy + by
    src_h, src_w = img.shape[:2]
    # Real-ESRGAN x4, then area-downsample to target width; blend with Lanczos to keep wash texture
    up = models.upscale(img, target_w=spec["width"])
    lan = cv2.resize(img, (up.shape[1], up.shape[0]), interpolation=cv2.INTER_LANCZOS4)
    color = cv2.addWeighted(up, 0.7, lan, 0.3, 0)
    s = up.shape[1] / src_w
    for (rx0, ry0, rx1, ry1) in spec.get("remove", []):
        hole = np.zeros(color.shape[:2], bool)
        hole[int((ry0 - oy) * s):int((ry1 - oy) * s), int((rx0 - ox) * s):int((rx1 - ox) * s)] = True
        color = textured_inpaint(color, hole, scale=2, radius=9, seed=rx0, feather=25,
                                 mode=spec.get("fill", "pushpull"))
    save_rgb(out / "color.jpg", color)

    d = models.depth(color)
    d = cv2.bilateralFilter(d, 9, 0.1, 9)
    if spec.get("depth_ramp"):  # override for compositions where the model reads left-right: ground plane rises toward the bottom
        ramp = np.linspace(0, 1, d.shape[0], dtype=np.float32)[:, None] ** 1.6 * np.ones((1, d.shape[1]), np.float32)
        r = spec["depth_ramp"]
        d = d * (1 - r) + ramp * r
    cv2.imwrite(str(out / "depth.png"), (d * 65535).astype(np.uint16))

    # parallax layers: thresholds at depth quantiles; layer k holds disparity >= t_k,
    # its colour has everything nearer than t_{k+1} inpainted so parallax never opens holes
    n = spec["layers"]
    qs = np.linspace(0, 1, n + 1)[1:-1]
    ts = [float(np.quantile(d, q)) for q in qs]
    soft = 0.02
    rim_w = int(0.03 * color.shape[1])  # widest parallax reveal we allow, in plate px
    layers_meta = []
    for k in range(n):
        lo = ts[k - 1] if k > 0 else -1.0
        alpha = np.ones_like(d) if k == 0 else np.clip((d - lo) / soft + 0.5, 0, 1)
        if k < n - 1:
            # Only the rim just inside nearer objects can be revealed by parallax: rebuild that rim from the
            # surroundings; keep original pixels deeper inside and in the soft zone (no smear shows through).
            nearer = (d > ts[k] + soft * 0.5).astype(np.uint8)
            inner = cv2.erode(nearer, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * rim_w + 1, 2 * rim_w + 1)))
            rim = (nearer > 0) & (inner == 0)
            filled = textured_inpaint(color, nearer.astype(bool), scale=4, radius=8, seed=k)
            w_ = cv2.GaussianBlur(rim.astype(np.float32), (0, 0), rim_w * 0.15)[..., None]
            w_ = np.where(rim[..., None], np.maximum(w_, 0.85), w_ * (nearer[..., None] > 0))
            col = (color.astype(np.float32) * (1 - w_) + filled.astype(np.float32) * w_).astype(np.uint8)
        else:
            col = color
        a = cv2.GaussianBlur(alpha, (0, 0), 1.2)
        save_rgba(out / f"layer{k}.png", col, a)
        band = d[(d >= lo) & ((d < ts[k]) if k < n - 1 else (d <= 1))]
        layers_meta.append({"index": k, "disparity_min": round(lo, 4), "disparity_median": round(float(np.median(band)) if band.size else 0.5, 4)})
    meta = {"id": pid, "source": spec["src"], "source_box": spec["box"], "source_offset": [int(ox), int(oy)],
            "scale_from_source": s, "size": [color.shape[1], color.shape[0]], "thresholds": ts, "layers": layers_meta}
    (out / "meta.json").write_text(json.dumps(meta, indent=1))
    print(pid, color.shape, "thresholds", [round(t, 3) for t in ts])


# ======================================================================= sprites
# (sheet, box x0,y0,x1,y1 in source px, upscale factor kept, matte model)
SPRITES = {
    # 紫蛛儿 (REF_CH03)
    "ZZ_FRONT":      ("REF_CH03_zizhuer_sheet.jpg", (60, 40, 545, 1365), 1.6, "isnet"),
    "ZZ_SIDE":       ("REF_CH03_zizhuer_sheet.jpg", (555, 45, 905, 1355), 1.6, "isnet"),
    "ZZ_34A":        ("REF_CH03_zizhuer_sheet.jpg", (945, 85, 1305, 775), 2.0, "isnet"),
    "ZZ_34B":        ("REF_CH03_zizhuer_sheet.jpg", (1310, 85, 1625, 775), 2.0, "isnet"),
    "ZZ_FACE_FRONT": ("REF_CH03_zizhuer_sheet.jpg", (1760, 35, 2065, 432), 3.0, "isnet"),
    "ZZ_FACE_SAD":   ("REF_CH03_zizhuer_sheet.jpg", (2160, 35, 2465, 432), 3.0, "isnet"),
    "ZZ_FACE_TILT":  ("REF_CH03_zizhuer_sheet.jpg", (1765, 438, 2110, 832), 3.0, "isnet"),
    "ZZ_BACK":       ("REF_CH03_zizhuer_sheet.jpg", (2165, 478, 2475, 1225), 1.8, "isnet"),
    "ZZ_WALK":       ("REF_CH03_zizhuer_sheet.jpg", (915, 800, 1285, 1372), 2.0, "isnet"),
    "ZZ_REACH":      ("REF_CH03_zizhuer_sheet.jpg", (1270, 790, 1640, 1372), 2.0, "isnet"),
    "ZZ_SIT":        ("REF_CH03_zizhuer_sheet.jpg", (1610, 880, 2160, 1345), 2.0, "isnet"),
    # 天蓬元帅 / 猪八戒人形 (REF_CH02)
    "TP_FRONT":      ("REF_CH02_tianpeng_human_sheet.png", (0, 8, 392, 682), 2.0, "isnet"),
    "TP_LEFT":       ("REF_CH02_tianpeng_human_sheet.png", (365, 15, 548, 682), 2.0, "isnet"),
    "TP_RIGHT":      ("REF_CH02_tianpeng_human_sheet.png", (538, 15, 745, 682), 2.0, "isnet"),
    "TP_BACK":       ("REF_CH02_tianpeng_human_sheet.png", (728, 10, 1022, 682), 2.0, "u2net"),
    "TP_FACE_FRONT": ("REF_CH02_tianpeng_human_sheet.png", (975, 0, 1268, 333), 3.0, "isnet"),
    "TP_FACE_SIDE":  ("REF_CH02_tianpeng_human_sheet.png", (1028, 352, 1268, 656), 3.0, "isnet"),
    "TP_WALK":       ("REF_CH02_tianpeng_human_sheet.png", (325, 715, 548, 1012), 3.0, "u2net"),
    "TP_TURN":       ("REF_CH02_tianpeng_human_sheet.png", (545, 715, 742, 1012), 3.0, "u2net"),
    # spear drawn as a straight segment (962,804)-(1316,702) in sheet px; recovered from ISNet inside that band
    "TP_FIGHT2":     ("REF_CH02_tianpeng_human_sheet.png", (955, 690, 1372, 984), 3.0, "u2net+spear"),
    # 猪八戒原形 (REF_CH01)
    "BJ_PORTRAIT":   ("REF_CH01_bajie_boar_portrait.jpg", None, 1.0, "u2net+isnet"),
}


def guided_filter(I, p, r, eps):
    """He et al. guided filter, grayscale guide."""
    mean = lambda x: cv2.boxFilter(x, -1, (r, r))
    mI, mp = mean(I), mean(p)
    cov = mean(I * p) - mI * mp
    var = mean(I * I) - mI * mI
    a = cov / (var + eps)
    b = mp - a * mI
    return mean(a) * I + mean(b)


def prep_sprite(sid, spec):
    sheet, box, factor, model = spec
    img = load(REF / sheet)
    if box:
        x0, y0, x1, y1 = box
        img = img[y0:y1, x0:x1]
    h, w = img.shape[:2]
    tw = int(round(w * factor))
    if factor > 1.0:
        up = models.upscale(img, target_w=tw)
        lan = cv2.resize(img, (up.shape[1], up.shape[0]), interpolation=cv2.INTER_LANCZOS4)
        img = cv2.addWeighted(up, 0.8, lan, 0.2, 0)
    if model == "isnet":
        a = models.matte_isnet(img)
    elif model == "u2net":
        a = models.matte_u2net(img)
    elif model == "u2net+spear":
        sx = img.shape[1] / w
        p0 = np.array([962 - box[0], 804 - box[1]], np.float32) * sx
        p1 = np.array([1316 - box[0], 702 - box[1]], np.float32) * sx
        yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]].astype(np.float32)
        d = p1 - p0
        tpar = np.clip(((xx - p0[0]) * d[0] + (yy - p0[1]) * d[1]) / (d @ d), 0, 1)
        dist = np.hypot(xx - (p0[0] + tpar * d[0]), yy - (p0[1] + tpar * d[1]))
        band = np.clip((18 * sx - dist) / (4 * sx), 0, 1)
        a = np.maximum(models.matte_u2net(img), models.matte_isnet(img) * band)
    else:
        a = np.maximum(models.matte_u2net(img), models.matte_isnet(img))
    # sheet-specific clean-up: drop calligraphy title/seal on the Tianpeng sheet
    if sid == "TP_FRONT":
        sx = img.shape[1] / w
        yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]
        title = (xx < 108 * sx) & (yy < 475 * factor)
        spear_band = np.abs(xx - (150 - (yy / factor - 300) * 0.42) * sx) < 22 * sx
        a[title & ~(spear_band & (yy > 290 * factor))] = 0
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    a = np.clip(guided_filter(gray, a.astype(np.float32), 9, 1e-4), 0, 1)
    a[a < 0.04] = 0
    # keep only the largest connected component cluster (removes stray sheet labels)
    lab_n, lab, stats, _ = cv2.connectedComponentsWithStats((a > 0.3).astype(np.uint8), 8)
    if lab_n > 2:
        areas = stats[1:, cv2.CC_STAT_AREA]
        keep = np.zeros(lab_n, bool)
        keep[1:] = areas >= max(areas.max() * 0.04, 400)
        keepmask = cv2.dilate(keep[lab].astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
        a = a * keepmask
    # colour unmixing against estimated local background
    bgmask = (a < 0.02).astype(np.uint8)
    small = cv2.resize(img, (img.shape[1] // 4, img.shape[0] // 4), interpolation=cv2.INTER_AREA)
    hole = cv2.resize(1 - bgmask, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    bg = cv2.inpaint(small, cv2.dilate(hole, np.ones((5, 5), np.uint8)) * 255, 7, cv2.INPAINT_TELEA)
    bg = cv2.GaussianBlur(cv2.resize(bg, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC), (0, 0), 6).astype(np.float32)
    I = img.astype(np.float32)
    aa = np.maximum(a, 1e-3)[..., None]
    F = np.where(aa > 0.05, (I - (1 - aa) * bg) / aa, I)
    F = np.clip(F, 0, 255).astype(np.uint8)
    if "_FACE_" in sid:
        hh = a.shape[0]
        ramp = np.clip((np.arange(hh) - hh * 0.80) / (hh * 0.18), 0, 1)
        a = a * (1 - ramp[:, None] ** 1.5)
    # trim to alpha bbox
    ys, xs = np.where(a > 0.02)
    y0b, y1b, x0b, x1b = max(0, ys.min() - 8), min(a.shape[0], ys.max() + 9), max(0, xs.min() - 8), min(a.shape[1], xs.max() + 9)
    F, a = F[y0b:y1b, x0b:x1b], a[y0b:y1b, x0b:x1b]
    OUT_SPRITES.mkdir(parents=True, exist_ok=True)
    save_rgba(OUT_SPRITES / f"{sid}.png", F, a)
    return {"id": sid, "sheet": sheet, "box": box, "factor": factor, "size": [int(F.shape[1]), int(F.shape[0])],
            "trim_offset": [int(x0b), int(y0b)]}


def contact_sheet_sprites():
    files = sorted(OUT_SPRITES.glob("*.png"))
    tiles = []
    for f in files:
        im = cv2.imread(str(f), cv2.IMREAD_UNCHANGED)
        rgb, a = im[:, :, :3].astype(np.float32), im[:, :, 3:].astype(np.float32) / 255
        h = 420
        s = h / im.shape[0]
        rgb = cv2.resize(rgb, (max(1, int(im.shape[1] * s)), h))
        a = cv2.resize(a, (rgb.shape[1], h))[..., None]
        checker = np.indices((h, rgb.shape[1])).sum(0) // 20 % 2
        bg = np.where(checker[..., None], 70.0, 30.0) * np.array([1, 1.2, 1.4])  # dark blue checker reveals halos
        t = (rgb * a + bg * (1 - a)).astype(np.uint8)
        cv2.putText(t, f.stem, (6, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        tiles.append(t)
    rows, row, wsum = [], [], 0
    for t in tiles:
        if wsum + t.shape[1] > 2400 and row:
            rows.append(row)
            row, wsum = [], 0
        row.append(t)
        wsum += t.shape[1]
    rows.append(row)
    W = max(sum(t.shape[1] for t in r) for r in rows)
    canvas = np.vstack([np.hstack(r + [np.zeros((420, W - sum(t.shape[1] for t in r), 3), np.uint8)]) for r in rows])
    cv2.imwrite(str(ROOT / "reports" / "contact_sprites.jpg"), canvas, [cv2.IMWRITE_JPEG_QUALITY, 85])


def main(which, only=None):
    if which in ("plates", "all"):
        for pid, spec in PLATES.items():
            if only and pid not in only:
                continue
            prep_plate(pid, spec)
    if which in ("sprites", "all"):
        mp = OUT_SPRITES / "sprites_meta.json"
        meta = json.loads(mp.read_text()) if mp.exists() else {}
        for sid, spec in SPRITES.items():
            if only and sid not in only:
                continue
            meta[sid] = prep_sprite(sid, spec)
            print(sid, meta[sid]["size"])
        (OUT_SPRITES / "sprites_meta.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False))
        contact_sheet_sprites()


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "all", sys.argv[2:] or None)
