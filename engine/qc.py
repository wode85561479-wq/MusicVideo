"""Clip QC: frame strip + temporal statistics (flicker / jumps / frozen spans).
python3 engine/qc.py video_clips/SH08.mp4 [n_frames_in_strip]"""
import sys
import subprocess
import json
from pathlib import Path

import numpy as np
import cv2

path = Path(sys.argv[1])
n = int(sys.argv[2]) if len(sys.argv) > 2 else 8
cap = cv2.VideoCapture(str(path))
frames, diffs, lum = [], [], []
prev = None
while True:
    ok, f = cap.read()
    if not ok:
        break
    g = cv2.cvtColor(cv2.resize(f, (480, 270)), cv2.COLOR_BGR2GRAY).astype(np.float32)
    g = g[35:235]  # active picture only
    lum.append(float(g.mean()))
    if prev is not None:
        diffs.append(float(np.abs(g - prev).mean()))
    prev = g
    frames.append(f)
N = len(frames)
idx = np.linspace(0, N - 1, n).astype(int)
tiles = [cv2.resize(frames[i][138:942], (640, 268)) for i in idx]
for t, i in zip(tiles, idx):
    cv2.putText(t, f"f{i} {i / 24:.2f}s", (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
rows = [np.hstack(tiles[k:k + 2]) for k in range(0, len(tiles), 2)]
out = Path("reports/qc")
out.mkdir(parents=True, exist_ok=True)
cv2.imwrite(str(out / f"{path.stem}_strip.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
d = np.array(diffs)
lum = np.array(lum)
lj = np.abs(np.diff(lum))
stats = dict(clip=path.name, frames=N, mean_motion=round(float(d.mean()), 3), max_motion=round(float(d.max()), 3),
             max_motion_frame=int(d.argmax()) + 1, motion_p95=round(float(np.percentile(d, 95)), 3),
             frozen_frames=int((d < 0.05).sum()), lum_jump_max=round(float(lj.max()), 3),
             lum_jump_frame=int(lj.argmax()) + 1)
print(json.dumps(stats))
