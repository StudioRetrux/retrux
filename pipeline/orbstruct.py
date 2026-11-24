"""Orb interior structure: finds the bright disc (luma > thr) inside a search box, then reports, within 0.85 x its radius:
luma percentiles, the clipped share (all channels >= 250), the high-pass contrast (sd of luma minus a 9 px box blur) and the
dark-structure share (luma < p50 - 25).
   python orbstruct.py "x,y,w,h" img1 img2 ...   [thr=235 via ORB_THR env]
"""
import os
import sys
import numpy as np
from PIL import Image, ImageFilter

x, y, w, h = (int(v) for v in sys.argv[1].split(","))
thr = float(os.environ.get("ORB_THR", "235"))
for f in sys.argv[2:]:
    im = Image.open(f).convert("RGB")
    a = np.asarray(im).astype(float)
    L = a @ np.array([0.2126, 0.7152, 0.0722])
    sub = L[y:y + h, x:x + w]
    m = sub > thr
    if m.sum() < 50:
        print("%-28s no disc" % os.path.basename(f))
        continue
    yy, xx = np.nonzero(m)
    cy, cx = yy.mean() + y, xx.mean() + x
    r = np.sqrt(m.sum() / np.pi)
    # Radius from the bright area underestimates where the disc has dark structure: take the 95th pct distance.
    d = np.sqrt((yy + y - cy) ** 2 + (xx + x - cx) ** 2)
    r = max(r, np.percentile(d, 95))
    H, W = L.shape
    gy, gx = np.mgrid[0:H, 0:W]
    disc = (gx - cx) ** 2 + (gy - cy) ** 2 <= (0.85 * r) ** 2
    Lb = np.asarray(Image.fromarray(np.clip(L, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(4))).astype(float)
    hp = (L - Lb)[disc]
    v = L[disc]
    clip = (a[disc] >= 250).all(axis=1).mean()
    p = np.percentile(v, [5, 10, 25, 50, 75, 95])
    dark = (v < p[3] - 25).mean()
    print("%-28s c=(%4.0f,%4.0f) r=%5.1f  p5/10/25/50/75/95 %3.0f %3.0f %3.0f %3.0f %3.0f %3.0f  clip %4.1f%%  hp-sd %4.1f  dark %4.1f%%"
          % (os.path.basename(f), cx, cy, r, *p, clip * 100, hp.std(), dark * 100))
