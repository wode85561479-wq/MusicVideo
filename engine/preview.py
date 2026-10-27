"""Render still frames of a shot for review: python3 engine/preview.py SH08 dur t1 t2 ... -> reports/preview_SH08.jpg"""
import sys
import time
from pathlib import Path

import numpy as np
import cv2

sys.path.insert(0, str(Path(__file__).parent))
from core import ROOT, finish  # noqa: E402
import shots  # noqa: E402

sid, dur = sys.argv[1].upper(), float(sys.argv[2])
times = [float(x) for x in sys.argv[3:]] or [0, dur / 2, dur]
t0 = time.time()
r = shots.SHOTS[sid](dur)
print(f"build {time.time() - t0:.2f}s")
frames = []
for i, t in enumerate(times):
    t1 = time.time()
    f = r(t)
    print(f"t={t:.2f} render {time.time() - t1:.3f}s")
    fr = finish(f, i)
    frames.append(cv2.cvtColor(fr, cv2.COLOR_RGB2BGR))
out = ROOT / "reports" / "previews"
out.mkdir(parents=True, exist_ok=True)
small = [cv2.resize(f, (960, 540), interpolation=cv2.INTER_AREA) for f in frames]
rows = [np.hstack(small[i:i + 2] + ([np.zeros_like(small[0])] if len(small[i:i + 2]) == 1 else [])) for i in range(0, len(small), 2)]
cv2.imwrite(str(out / f"preview_{sid}.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
cv2.imwrite(str(out / f"preview_{sid}_full.jpg"), frames[len(frames) // 2], [cv2.IMWRITE_JPEG_QUALITY, 92])
