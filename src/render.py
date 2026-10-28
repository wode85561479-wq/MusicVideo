"""Render the ink-wash music video.

  python3 src/render.py --still 5,45,90          # PNG stills for review
  python3 src/render.py --out build/mv.mp4        # full video with audio
  python3 src/render.py --range 100 110 --out x.mp4
"""
import argparse
import os
import subprocess
import sys
import time
from multiprocessing import get_context

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from inkmv.core import FPS, H, W  # noqa: E402
from inkmv.effects import Music  # noqa: E402
from inkmv.timeline import Timeline  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = None


def encode_chunk(job):
    f0, f1, path = job
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium",
           "-crf", "18", "-pix_fmt", "yuv420p", path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    for f in range(f0, f1):
        proc.stdin.write(TL.frame(f / FPS).tobytes())
    proc.stdin.close()
    proc.wait()
    return path, f1 - f0, time.time() - t0


def main():
    global TL
    ap = argparse.ArgumentParser()
    ap.add_argument("--analysis", default=os.path.join(ROOT, "build/analysis.json"))
    ap.add_argument("--audio", default=None)
    ap.add_argument("--still", default=None)
    ap.add_argument("--range", nargs=2, type=float, default=None)
    ap.add_argument("--out", default=os.path.join(ROOT, "build/mv.mp4"))
    ap.add_argument("--workers", type=int, default=os.cpu_count())
    ap.add_argument("--chunk", type=int, default=300)
    args = ap.parse_args()

    TL = Timeline(Music(args.analysis))
    if args.still:
        os.makedirs(os.path.join(ROOT, "build/stills"), exist_ok=True)
        for s in args.still.split(","):
            t = float(s)
            t0 = time.time()
            img = TL.frame(t)
            p = os.path.join(ROOT, f"build/stills/t{t:06.2f}.png")
            Image.fromarray(img).save(p)
            print(f"{p} ({time.time() - t0:.2f}s)", flush=True)
        return

    t0 = time.time()
    TL.build_all()
    print(f"built assets in {time.time() - t0:.1f}s", flush=True)
    a, b = (0, TL.n_frames()) if not args.range else (int(args.range[0] * FPS),
                                                       int(args.range[1] * FPS))
    seg_dir = os.path.join(ROOT, "build/segments")
    os.makedirs(seg_dir, exist_ok=True)
    jobs = [(f, min(b, f + args.chunk), os.path.join(seg_dir, f"seg_{f:06d}.mp4"))
            for f in range(a, b, args.chunk)]
    done = 0
    t0 = time.time()
    with get_context("fork").Pool(args.workers) as pool:
        for path, n, dt in pool.imap_unordered(encode_chunk, jobs):
            done += n
            el = time.time() - t0
            print(f"{os.path.basename(path)}: {n} frames in {dt:.0f}s | {done}/{b - a} "
                  f"elapsed {el:.0f}s eta {el / done * (b - a - done):.0f}s", flush=True)
    lst = os.path.join(seg_dir, "list.txt")
    with open(lst, "w") as f:
        for _, _, p in jobs:
            f.write(f"file '{p}'\n")
    video = os.path.join(seg_dir, "video.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", lst, "-c", "copy", video], check=True)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", video]
    if args.audio:
        cmd += ["-ss", str(a / FPS), "-t", str((b - a) / FPS), "-i", args.audio,
                "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
                "-shortest"]
    else:
        cmd += ["-c", "copy"]
    cmd += ["-movflags", "+faststart", args.out]
    subprocess.run(cmd, check=True)
    print(f"wrote {args.out} in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
