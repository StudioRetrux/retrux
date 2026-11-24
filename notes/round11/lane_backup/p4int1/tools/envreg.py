# int1: env-lane regions (above the lake) per deterministic shot: |A-B| stats in boxes. usage: envreg.py dirA dirB label shots...
import sys, os, numpy as np, OpenImageIO as oiio
def load(p): return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0
A, B, lab = sys.argv[1], sys.argv[2], sys.argv[3]
BOX = {"right_far x900-1440 y200-430": (900, 1440, 200, 430), "left_far x0-560 y180-430": (0, 560, 180, 430), "ridge x0-330 y200-470": (0, 330, 200, 470)}
print("==", lab)
for s in sys.argv[4:]:
    a, b = load(os.path.join(A, s + ".png")), load(os.path.join(B, s + ".png"))
    out = []
    for k, (x0, x1, y0, y1) in BOX.items():
        d = np.abs(a[y0:y1, x0:x1] - b[y0:y1, x0:x1]).max(-1)
        out.append(f"{k.split()[0]} max {d.max():4.0f} n>2 {int((d > 2).sum()):6d}")
    print(f"  {s:22s} " + " | ".join(out))
