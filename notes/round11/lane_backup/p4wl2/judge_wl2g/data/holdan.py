# hold path (stepped): one-frame blips per frame in the lake rows (CSS y 430-766) for p4wl (P) and lane (L), streamed.
import sys, json, zlib, os, numpy as np
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
def stream(d):
    m = json.load(open(d + "/meta.json")); W = m["W"]; H = m["y1"] - m["y0"]; y0 = 430 - m["y0"]
    for i in range(m["frames"]):
        yield np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(H, W, 4)[::-1][y0:, :, :3].astype(np.float32) @ LU
def per(d, thr=12):
    out = []; a = b = None
    for c in stream(d):
        if a is not None:
            d1 = b - a; d2 = c - b
            out.append(int(((np.abs(d1) > thr) & (np.abs(d2) > thr) & (np.sign(d1) != np.sign(d2))).sum()))
        a, b = b, c
    return np.array(out[1:] if out and out[0] is None else out)
P = per(sys.argv[1]); L = per(sys.argv[2]); m = json.load(open(sys.argv[2] + "/meta.json"))
hold = [f.get("hold") for f in m["info"]]
print("frames %d | lake blips/frame mean P %.0f L %.0f (L/P %.3f) | max P %d L %d" % (len(L), P.mean(), L.mean(), L.mean() / max(P.mean(), 1e-6), P.max(), L.max()))
for a, b in ((0, 60), (60, 120), (120, 180), (180, 240), (240, len(L))):
    print("  frames %3d-%3d: P %.0f | L %.0f   hold %s" % (a, b, P[a:b].mean(), L[a:b].mean(), hold[min(b, len(hold) - 1)]))
r = L - P; idx = np.argsort(-r)[:6]
print("  frames where L - P is largest:", [(int(i) + 1, int(L[i]), int(P[i])) for i in idx])
