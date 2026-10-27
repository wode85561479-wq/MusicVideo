"""Post-render: per-clip QC, keyframe export, CMX3600 EDL, storyboard contact sheet, final file checks.
python3 engine/finalize.py  -> reports/QC_逐镜检查.json, keyframes/, edit/勿听_MV.edl, storyboard/分镜缩略图.jpg"""
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
import cv2

sys.path.insert(0, str(Path(__file__).parent))
import storyboard_data as SD  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
FPS = 24
TL = json.loads((ROOT / "storyboard" / "timeline.json").read_text())
SHOTS = TL["shots"]
STAGE_NO = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5}
STAGE = {s["id"]: STAGE_NO[s["stage"][0]] for s in SD.SHOTS}


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_entries",
                          "stream=codec_type,codec_name,width,height,nb_read_frames,r_frame_rate,sample_rate,channels",
                          "-show_entries", "format=duration", "-of", "json", str(path)], capture_output=True, text=True)
    return json.loads(out.stdout)


def clip_qc(path):
    cap = cv2.VideoCapture(str(path))
    prev, diffs, lums, frames = None, [], [], []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        g = cv2.cvtColor(cv2.resize(f[138:942], (480, 201)), cv2.COLOR_BGR2GRAY).astype(np.float32)
        lums.append(float(g.mean()))
        if prev is not None:
            diffs.append(float(np.abs(g - prev).mean()))
        prev = g
        frames.append(f)
    d = np.array(diffs) if diffs else np.zeros(1)
    lj = np.abs(np.diff(lums)) if len(lums) > 1 else np.zeros(1)
    # ignore the 16 rows next to the picture: x264 macroblocks straddle the 138-px bar edge (invisible ringing)
    bars = [max(f[:122].max(), f[958:].max()) for f in frames[:: max(1, len(frames) // 5)]]
    return frames, dict(frames=len(frames), mean_motion=round(float(d.mean()), 3), p95_motion=round(float(np.percentile(d, 95)), 3),
                        max_motion=round(float(d.max()), 3), frozen_runs=int(_longest_run(d < 0.03)),
                        max_luma_jump=round(float(lj.max()), 2), letterbox_clean=bool(max(bars) <= 2))


def _longest_run(mask):
    best = cur = 0
    for m in mask:
        cur = cur + 1 if m else 0
        best = max(best, cur)
    return best


def tc(frames):
    s, f = divmod(int(frames), FPS)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}:{f:02d}"


def main():
    kf_dir = ROOT / "keyframes"
    kf_dir.mkdir(exist_ok=True)
    report, thumbs = [], []
    edl = ["TITLE: WUTING_MV", "FCM: NON-DROP FRAME", ""]
    rec = 0
    for i, s in enumerate(SHOTS):
        path = ROOT / "video_clips" / f"{s['id']}.mp4"
        frames, q = clip_qc(path)
        cs = s["start"] - (s["trans"]["dur"] / 2 if i > 0 else 0)
        ce = SHOTS[i + 1]["start"] - SHOTS[i + 1]["trans"]["dur"] / 2 if i + 1 < len(SHOTS) else TL["song_end"]
        expected = (int(math.ceil(TL["song_end"] * FPS)) if i + 1 == len(SHOTS) else int(round(ce * FPS))) - int(round(cs * FPS))
        q.update(id=s["id"], title=s["title"], expected_frames=expected, frames_ok=q["frames"] == expected)
        flags = []
        if not q["frames_ok"]:
            flags.append("帧数不符")
        if q["frozen_runs"] > 24:
            flags.append(f"静止超过1秒({q['frozen_runs']}帧)")
        if q["max_luma_jump"] > 12 and s["trans"]["type"] not in ("cut",):
            flags.append(f"亮度跳变{q['max_luma_jump']}")
        if not q["letterbox_clean"]:
            flags.append("黑边不干净")
        q["flags"] = flags
        report.append(q)
        # keyframe: nominal middle of the shot
        mid = int(round(((s["start"] + s["end"]) / 2 - cs) * FPS))
        mid = min(max(mid, 0), len(frames) - 1)
        name = f"WUTING_SC{STAGE[s['id']]:02d}_SH{int(s['id'][2:]):03d}_KEYFRAME_V001.jpg"
        cv2.imwrite(str(kf_dir / name), frames[mid], [cv2.IMWRITE_JPEG_QUALITY, 92])
        t = cv2.resize(frames[mid][138:942], (384, 161), interpolation=cv2.INTER_AREA)
        cv2.putText(t, f"{s['id']} {int(s['start'] // 60):02d}:{s['start'] % 60:05.2f}", (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 255), 1, cv2.LINE_AA)
        thumbs.append(t)
        n = len(frames)
        edl += [f"{i + 1:03d}  {s['id']:<8} V     C        {tc(0)} {tc(n)} {tc(rec)} {tc(rec + n)}",
                f"* FROM CLIP NAME: {s['id']}.mp4", f"* COMMENT: {s['title']} / IN-TRANSITION {s['trans']['type']} {s['trans']['dur']}s", ""]
        rec += n
        print(s["id"], q["frames"], "/", expected, q["mean_motion"], q["frozen_runs"], q["max_luma_jump"], flags, flush=True)
    (ROOT / "edit" / "勿听_MV.edl").write_text("\n".join(edl))
    (ROOT / "reports" / "QC_逐镜检查.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    cols = 4
    rows = [np.hstack(thumbs[k:k + cols] + [np.zeros_like(thumbs[0])] * (cols - len(thumbs[k:k + cols]))) for k in range(0, len(thumbs), cols)]
    cv2.imwrite(str(ROOT / "storyboard" / "分镜缩略图.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 86])
    final = ROOT / "exports" / "勿听_MV_1080p.mp4"
    if final.exists():
        info = probe(final)
        (ROOT / "reports" / "成片探测.json").write_text(json.dumps(info, ensure_ascii=False, indent=1))
        print(json.dumps(info, ensure_ascii=False))
    print("total timeline frames", rec)


if __name__ == "__main__":
    main()
