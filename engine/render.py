"""Timeline renderer.

  python3 engine/render.py                    render every shot to video_clips/, then conform exports/
  python3 engine/render.py --shots SH08       render selected shots only (clips)
  python3 engine/render.py --conform          only concatenate clips + mux audio
  options: --workers N  --crf 17

Each clip covers [clip_start, clip_end) of the song. A soft transition INTO shot i is centred on the
cut, so clip i starts td/2 before the cut and renders shot i-1 alongside it for those frames.
"""
import argparse
import json
import math
import multiprocessing as mp
import os
import subprocess
import sys
import time
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")

import numpy as np  # noqa: E402
import cv2  # noqa: E402

sys.path.insert(0, str(Path(__file__).parent))
from core import ROOT, FPS, OUT_W, OUT_H, finish  # noqa: E402
import shots as SH  # noqa: E402
from transitions import blend  # noqa: E402

TL = json.loads((ROOT / "storyboard" / "timeline.json").read_text())
SHOTS = TL["shots"]
SONG_END = TL["song_end"]
CLIPS = ROOT / "video_clips"
TOTAL_FRAMES = int(math.ceil(SONG_END * FPS))


def clip_frames(i):
    def cs(k):
        s = SHOTS[k]
        return s["start"] - (s["trans"]["dur"] / 2 if k > 0 else 0.0)
    f0 = int(round(cs(i) * FPS))
    f1 = int(round(cs(i + 1) * FPS)) if i + 1 < len(SHOTS) else TOTAL_FRAMES
    return f0, f1


def render_clip(i, crf=17):
    cv2.setNumThreads(1)
    s = SHOTS[i]
    t_build = time.time()
    r = SH.SHOTS[s["id"]](s["dur"])
    prev = None
    tr = s["trans"]
    if i > 0 and tr["type"] != "cut" and tr["dur"] > 0 and SHOTS[i - 1]["id"] in SH.SHOTS:
        p = SHOTS[i - 1]
        prev = (SH.SHOTS[p["id"]](p["dur"]), p["start"])
    f0, f1 = clip_frames(i)
    out = CLIPS / f"{s['id']}.mp4"
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OUT_W}x{OUT_H}",
           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
           "-pix_fmt", "yuv420p", "-threads", "2", "-x264-params", "keyint=48:min-keyint=24", str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t_render = time.time()
    for f in range(f0, f1):
        t = f / FPS
        frame = r(t - s["start"])
        if prev is not None and t < s["start"] + tr["dur"] / 2:
            pr, pstart = prev
            prog = (t - (s["start"] - tr["dur"] / 2)) / tr["dur"]
            frame = blend(tr["type"], pr(t - pstart), frame, prog, seed=i, **{k: v for k, v in tr.items() if k not in ("type", "dur")})
        proc.stdin.write(finish(frame, f).tobytes())
    proc.stdin.close()
    proc.wait()
    n = f1 - f0
    dt = time.time() - t_render
    return s["id"], n, round(time.time() - t_build, 1), round(dt / max(n, 1), 3), proc.returncode


def conform():
    lst = ROOT / "edit" / "concat_list.txt"
    lst.write_text("".join(f"file '{(CLIPS / (s['id'] + '.mp4')).as_posix()}'\n" for s in SHOTS))
    exports = ROOT / "exports"
    exports.mkdir(exist_ok=True)
    silent = ROOT / "edit" / "picture_lock.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(silent)], check=True)
    final = exports / "勿听_MV_1080p.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(ROOT / "audio" / "wuting_master.mp3"),
                    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k",
                    "-movflags", "+faststart", str(final)], check=True)
    return final


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", default="")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--crf", type=int, default=17)
    ap.add_argument("--conform", action="store_true")
    a = ap.parse_args()
    CLIPS.mkdir(exist_ok=True)
    if not a.conform:
        ids = [x.strip().upper() for x in a.shots.split(",") if x.strip()]
        todo = [i for i, s in enumerate(SHOTS) if not ids or s["id"] in ids]
        todo.sort(key=lambda i: -SHOTS[i]["dur"])
        t0 = time.time()
        with mp.Pool(min(a.workers, len(todo))) as pool:
            for sid, n, tb, spf, rc in pool.imap_unordered(lambda_render, [(i, a.crf) for i in todo]):
                print(f"{sid}: {n} frames, {spf}s/frame, total {tb}s, ffmpeg rc={rc}", flush=True)
        print(f"rendered {len(todo)} clips in {time.time() - t0:.0f}s")
        if ids:
            return
    print("conformed:", conform())


def lambda_render(args):
    return render_clip(*args)


if __name__ == "__main__":
    main()
