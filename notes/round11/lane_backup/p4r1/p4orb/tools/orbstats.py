# p4orb orb / shard statistics (run with the Blender python: numpy + OpenImageIO, -I).
#   orbstats.py img.png [img.orb.json | cx,cy,r] [label]
# Disc stats (r < 0.92 R): L10/50/90, sd, clipped % (min channel >= 248), mean RGB; radial rings around the rim
# (mean RGB in r/R bins); box stats as the panel measured them (p06: 241x241 box clipped %, interior box L10/50/90);
# frame luma p99. Luma = Rec.709 on sRGB 8-bit values (as the panel's numbers).
import json
import sys

import numpy as np
import OpenImageIO as oiio


def load(p):
    b = oiio.ImageBuf(p)
    a = b.get_pixels(oiio.UINT8)
    return np.asarray(a)[..., :3].astype(np.float64)


def main():
    img = load(sys.argv[1])
    H, W, _ = img.shape
    spec = sys.argv[2] if len(sys.argv) > 2 else sys.argv[1].replace(".png", ".orb.json")
    if spec.endswith(".json"):
        o = json.load(open(spec))
        cx, cy, R = o["x"], o["y"], o["r"]
    else:
        cx, cy, R = [float(v) for v in spec.split(",")]
    lab = sys.argv[3] if len(sys.argv) > 3 else sys.argv[1].split("/")[-1]
    L = img @ np.array([0.2126, 0.7152, 0.0722])
    yy, xx = np.mgrid[0:H, 0:W]
    rr = np.hypot(xx + 0.5 - cx, yy + 0.5 - cy) / R
    disc = rr < 0.92
    Ld = L[disc]
    clip = (img.min(axis=2) >= 248)
    q = np.percentile(Ld, [10, 50, 90]) if Ld.size else [0, 0, 0]
    m = img[disc].mean(axis=0) if Ld.size else [0, 0, 0]
    # panel box: 241x241 around the orb centre
    x0, y0 = int(cx - 120), int(cy - 120)
    box = clip[max(y0, 0):y0 + 241, max(x0, 0):x0 + 241]
    rings = []
    for a, b in [(0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 0.9), (0.9, 0.95), (0.95, 1.0), (1.0, 1.05), (1.05, 1.15), (1.15, 1.3)]:
        mk = (rr >= a) & (rr < b)
        c = img[mk].mean(axis=0) if mk.any() else np.zeros(3)
        rings.append(f"{a:.2f}-{b:.2f}:{c[0]:.0f},{c[1]:.0f},{c[2]:.0f}")
    print(f"{lab:28s} orb ({cx:.0f},{cy:.0f}) R {R:.1f} | disc L10/50/90 {q[0]:.0f}/{q[1]:.0f}/{q[2]:.0f} sd {Ld.std():.1f} "
          f"mean {m[0]:.0f},{m[1]:.0f},{m[2]:.0f} clip {100 * clip[disc].mean():.1f}% | box241 clip {100 * box.mean():.1f}% "
          f"| frame p99 {np.percentile(L, 99):.0f}")
    print("   rings " + " ".join(rings))


main()
