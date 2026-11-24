# p4wl: analyse an rl.mjs capture.  python3 -I rla.py TOOLS DIR [thr=12] [strip=1]
# blip = a pixel whose luma changes by > thr and changes back (opposite sign, > thr) on the next frame: a one-frame pop.
import sys, json, numpy as np
sys.path.insert(0, sys.argv[1])
from imgio import save
d = sys.argv[2]; thr = float(sys.argv[3]) if len(sys.argv) > 3 else 12; strip = (sys.argv[4] if len(sys.argv) > 4 else "1") == "1"
M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]
A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3].astype(np.float32)
L = A @ np.array([0.2126, 0.7152, 0.0722], np.float32)
dd = np.diff(L, axis=0)
bl = (np.abs(dd[:-1]) > thr) & (np.abs(dd[1:]) > thr) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
per = bl.reshape(bl.shape[0], -1).sum(1)          # per[i] = blips at frame i+1
info = M["info"]
mot = np.abs(dd).reshape(dd.shape[0], -1).mean(1)
print("%s: N %d %dx%d | blip px total %d, per frame mean %.1f p90 %.0f max %d | motion mean |dL| %.2f" % (d.split('/')[-1], N, w, h, per.sum(), per.mean(), np.percentile(per, 90), per.max(), mot.mean()))
# correlate with the frame's schedule (frame i+1)
fm = np.array([info[i + 1]["m"] for i in range(N - 2)]); fw = np.array([info[i + 1]["w"] for i in range(N - 2)])
fo = np.array([info[i + 1]["on"] for i in range(N - 2)]); fc = np.array([info[i + 1]["c"] for i in range(N - 2)])
sc = np.array([info[i + 1]["scale"] for i in range(N - 2)])
for name, mask in (("mirror drawn", fm > 0), ("mirror NOT drawn", fm == 0), ("walk drawn", fw > 0), ("walk NOT", fw == 0), ("cacheOn", fo > 0), ("cache drawn", fc > 0)):
    if mask.sum(): print("  %-16s frames %3d  blips/frame %.1f" % (name, mask.sum(), per[mask].mean()))
pm = np.array([info[i]["m"] for i in range(N)]); print("  mirror pattern (first 40):", "".join(str(v) for v in pm[:40]), " walk:", "".join(str(info[i]["w"]) for i in range(40)), " on:", "".join(str(info[i]["on"]) for i in range(40)))
dts = np.array([f["dt"] for f in info]) * 1000; print("  dt ms p10 %.1f p50 %.1f p90 %.1f max %.1f; scales %s" % (*np.percentile(dts, [10, 50, 90]), dts.max(), sorted(set(f["scale"] for f in info))))
# per-row-band blips (where)
cnt = bl.sum(0)
ys, xs = np.nonzero(cnt > 2)
if len(xs): print("  hot px (>2 blips): %d, x %d-%d y %d-%d" % (len(xs), xs.min(), xs.max(), ys.min(), ys.max()))
np.save(d + "/per.npy", per)
heat = np.clip(cnt[..., None] * 40.0, 0, 255).astype(np.uint8).repeat(3, axis=2); heat[..., 1:] = 0
save(d + "/heat.png", np.maximum((A[N // 2] * 0.55).astype(np.uint8), heat))
if strip:
    k = int(np.argmax(np.convolve(per, np.ones(4), "valid")))
    sel = list(range(k, k + 5))
    save(d + "/strip.png", np.concatenate([A[i + 1].astype(np.uint8) for i in sel], axis=0))
    print("  strip frames", [i + 1 for i in sel], "blips", [int(per[i]) for i in sel], "m/w/on", [(info[i + 1]["m"], info[i + 1]["w"], info[i + 1]["on"]) for i in sel])
