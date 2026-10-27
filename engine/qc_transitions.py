"""Grab the mid-point frame of every soft transition from the conformed film -> reports/qc/转场中点.jpg"""
import json
import subprocess
from pathlib import Path

import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[1]
TL = json.loads((ROOT / "storyboard" / "timeline.json").read_text())
film = ROOT / "exports" / "勿听_MV_1080p.mp4"
out = ROOT / "reports" / "qc"
out.mkdir(parents=True, exist_ok=True)
tiles = []
for s in TL["shots"][1:]:
    if s["trans"]["type"] == "cut":
        continue
    for frac, tag in ((-0.25, "a"), (0.0, "m"), (0.25, "b")):
        t = s["start"] + frac * s["trans"]["dur"]
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(film), "-frames:v", "1", "-f", "rawvideo",
                              "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
        f = np.frombuffer(raw, np.uint8).reshape(1080, 1920, 3)[138:942]
        th = cv2.resize(f, (320, 134), interpolation=cv2.INTER_AREA)
        if tag == "a":
            cv2.putText(th, f"{s['id']} {s['trans']['type']}", (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 220, 255), 1, cv2.LINE_AA)
        tiles.append(th)
rows = [np.hstack(tiles[k:k + 6] + [np.zeros_like(tiles[0])] * (6 - len(tiles[k:k + 6]))) for k in range(0, len(tiles), 6)]
cv2.imwrite(str(out / "转场中点.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
print(len(tiles) // 3, "transitions sampled")
