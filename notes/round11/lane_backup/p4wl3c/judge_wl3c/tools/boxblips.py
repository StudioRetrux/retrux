# judge_wl3c: one-frame blips (|dL|>12 both steps, sign flip) per frame in CSS boxes of stepped caps (cap.mjs, 1440 wide, --rows y0,y1)
# usage: boxblips.py DIR...   (first = reference for the per-frame |diff| summary)
import sys, json, zlib, numpy as np
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
B = {"far880-1440x440-600": (880, 1440, 440, 600), "lips880-1440x440-500": (880, 1440, 440, 500), "left0-160x440-620": (0, 160, 440, 620), "region0-480x440-620": (0, 480, 440, 620), "mid480-880x440-620": (480, 880, 440, 620)}
for d in sys.argv[1:]:
    M = json.load(open(d + "/meta.json")); W = M["W"]; R = M["y1"] - M["y0"]; n = M["frames"]; y0 = M["y0"]; k = W / 1440.0
    A = np.stack([np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(R, W, 4)[::-1][..., :3].astype(np.float32) @ LU for i in range(n)])
    dd = np.diff(A, axis=0); bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    s = []
    for z, (x0, x1, a, b) in B.items():
        r0, r1 = int(round(a * k)) - y0, int(round(b * k)) - y0; e0, e1 = int(round(x0 * k)), int(round(x1 * k))
        v = bl[:, max(r0, 0):r1, e0:e1].reshape(bl.shape[0], -1).sum(1); s.append("%s %.1f (p95 %.0f)" % (z, v.mean(), np.percentile(v, 95)))
    print("%-12s n %d | %s" % (d.split("/")[-1], n, " | ".join(s)))
