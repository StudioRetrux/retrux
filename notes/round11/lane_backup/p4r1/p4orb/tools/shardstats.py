# p4orb shard statistics as the panel measured them: blue-dominant pixels (B - R >= 85) of the frame (optionally in a box):
# count, median luma, p95 luma, median HSV saturation, median hue (deg). Blender python (numpy + OIIO), -I.
#   shardstats.py img.png [x0,y0,x1,y1] [label]
import sys

import numpy as np
import OpenImageIO as oiio


def main():
    b = oiio.ImageBuf(sys.argv[1])
    a = np.asarray(b.get_pixels(oiio.UINT8))[..., :3].astype(np.float64)
    if len(sys.argv) > 2 and sys.argv[2] not in ("-", ""):
        x0, y0, x1, y1 = [int(v) for v in sys.argv[2].split(",")]
        a = a[y0:y1, x0:x1]
    lab = sys.argv[3] if len(sys.argv) > 3 else sys.argv[1].split("/")[-1]
    r, g, bl = a[..., 0], a[..., 1], a[..., 2]
    m = (bl - r) >= 85
    if not m.any():
        print(f"{lab:28s} no blue-dominant pixels")
        return
    L = (a @ np.array([0.2126, 0.7152, 0.0722]))[m]
    mx = a.max(axis=2)[m]
    mn = a.min(axis=2)[m]
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    rr, gg, bb = r[m], g[m], bl[m]
    # hue (deg) for blue-dominant pixels
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(bb == mx, 240 + 60 * (rr - gg) / d, np.where(gg == mx, 120 + 60 * (bb - rr) / d, 60 * ((gg - bb) / d % 6)))
    print(f"{lab:28s} n {m.sum():6d} | L med {np.median(L):.0f} p95 {np.percentile(L, 95):.0f} p5 {np.percentile(L, 5):.0f} "
          f"| sat med {np.median(sat):.3f} | hue med {np.median(h):.0f} | mean RGB {rr.mean():.0f},{gg.mean():.0f},{bb.mean():.0f}")


main()
