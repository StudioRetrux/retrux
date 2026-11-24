# rest-frame boxes from deterministic bottom-up zlib frames (same clock in both captures)
import sys, os, zlib, json, numpy as np
def fr(d, k):
    m = json.load(open(os.path.join(d, "meta.json"))); W = m["W"]; Y0, Y1 = m["y0"], m["y1"]; R = Y1 - Y0
    b = np.frombuffer(zlib.decompress(open(os.path.join(d, f"f{k:04d}.bin"), "rb").read()), dtype=np.uint8)
    a = b.reshape(R, W, b.size // (W * R))[::-1, :, :3].astype(np.float32)
    return a, Y0
boxes = {"centre": (680, 640, 760, 700), "glint": (515, 665, 865, 710), "env": (400, 600, 800, 660), "grade": (420, 560, 1000, 700)}
k0, k1 = int(sys.argv[1]), int(sys.argv[2])
for d in sys.argv[3:]:
    acc = {n: [] for n in boxes}
    for k in range(k0, k1):
        a, Y0 = fr(d, k)
        for n, (x0, y0, x1, y1) in boxes.items():
            c = a[y0 - Y0:y1 - Y0, x0:x1]
            L = c[..., 0] * 0.2126 + c[..., 1] * 0.7152 + c[..., 2] * 0.0722
            acc[n].append((L.mean(), np.percentile(L, 1), np.percentile(L, 10), np.percentile(L, 99), (c[..., 2] - c[..., 0]).mean(), L.std()))
    print(os.path.basename(d), f"k{k0}-{k1}", " | ".join(f"{n} L {np.mean([v[0] for v in acc[n]]):.1f} p1 {np.mean([v[1] for v in acc[n]]):.1f} p10 {np.mean([v[2] for v in acc[n]]):.1f} p99 {np.mean([v[3] for v in acc[n]]):.1f} sd {np.mean([v[5] for v in acc[n]]):.2f} B-R {np.mean([v[4] for v in acc[n]]):.1f}" for n in boxes))
