# judge_wl2: real-loop (rl.mjs) analysis, dt-controlled.  BPY -I rlj.py TOOLS RLDIR OUTPREFIX build=run1,run2 build=run1,...
# blip = luma change > 12 that reverses (> 12, opposite sign) on the next frame (one-frame pop). Columns of the 600-px region
# (CSS 0-480 at k 1.25): 0-200 = CSS 0-160 (left water, in front of the left ice sheets), 200-400 = CSS 160-320, 400-600 = CSS 320-480.
import sys, json, os, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
R = sys.argv[2]; out = sys.argv[3]; groups = [g.split("=") for g in sys.argv[4:]]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
def load(d):
    M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]
    A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3]
    return A, M
def blipmap(L, thr=12):
    dd = np.diff(L, axis=0)
    return (np.abs(dd[:-1]) > thr) & (np.abs(dd[1:]) > thr) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
pool = {}; keep = {}
for nm, runs in groups:
    P = []
    for r in runs.split(","):
        d = os.path.join(R, r); A, M = load(d); L = A.astype(np.float32) @ LU; bl = blipmap(L)
        dt = np.array([f["dt"] for f in M["info"]]) * 1000
        kk = M["k"]; E = [int(round(v * kk)) for v in (0, 160, 320, 480)]
        cols = [bl[:, :, E[q]:E[q + 1]].reshape(bl.shape[0], -1).sum(1) for q in range(3)]
        dpair = np.maximum(dt[1:-1], dt[2:])   # frame i+1 and i+2 (the two steps the blip spans)
        dlo = np.minimum(dt[1:-1], dt[2:])
        P.append((dlo, dpair, cols, bl.sum(0)))
        print("%-6s %-10s N %d dt p10/50/90 %.1f/%.1f/%.1f | blips/frame left %.0f shelf %.0f right %.0f | scales %s errs %d" % (nm, r, M["n"], *np.percentile(dt, [10, 50, 90]), cols[0].mean(), cols[1].mean(), cols[2].mean(), sorted(set(f["scale"] for f in M["info"])), len(M["errs"])))
        keep.setdefault(nm, (A, bl, dt, int(round(200 * M["k"]))))
    pool[nm] = P
print("\nPOOLED, dt-controlled (both steps of the blip inside the band); n = frames:")
for lo, hi in ([tuple(float(x) for x in b.split("-")) for b in os.environ["BANDS"].split(",")] if os.environ.get("BANDS") else ((0, 999), (26, 30), (30, 33), (33, 36), (28, 34), (30, 36), (26, 40))):
    row = []
    for nm, P in pool.items():
        dlo = np.concatenate([p[0] for p in P]); dhi = np.concatenate([p[1] for p in P]); ok = (dlo >= lo) & (dhi <= hi)
        c = [np.concatenate([p[2][k] for p in P]) for k in range(3)]
        row.append("%s n %3d left %4.0f shelf %4.0f right %4.0f" % (nm, ok.sum(), *(c[k][ok].mean() if ok.sum() else -1 for k in range(3))))
    print("dt %3g-%-3g | " % (lo, hi) + " || ".join(row))
# look sheet: per build, 4 consecutive frames (dt 28-36) of the left water (CSS 0-200 x 440-620 -> buffer cols 0-250), |diff| x6, blip heat
z = 2; rowsimg = []
for nm, (A, bl, dt, cw) in keep.items():
    ok = [i for i in range(10, len(dt) - 5) if all(28 <= dt[j] <= 36 for j in range(i, i + 4))]
    i0 = ok[len(ok) // 2] if ok else 60
    fr = [A[i, :, :cw].astype(np.float32) for i in range(i0, i0 + 4)]
    df = [np.clip(np.abs(fr[k + 1] - fr[k]) * 6, 0, 255) for k in range(3)]
    heat = bl.sum(0)[:, :cw].astype(np.float32); heat = np.clip(heat * 255.0 / max(8.0, np.percentile(heat, 99.5)), 0, 255)
    hz = np.stack([heat, heat * 0.25, heat * 0.1], -1)
    tiles = fr + df + [hz]
    tiles = [t.repeat(z, 0).repeat(z, 1) for t in tiles]
    sep = np.full((tiles[0].shape[0], 4, 3), 255, np.float32)
    rowsimg.append(np.concatenate(sum([[t, sep] for t in tiles], [])[:-1], 1)); print("sheet", nm, "frames", i0, "-", i0 + 3, "dt", [round(dt[j], 1) for j in range(i0, i0 + 4)])
    rowsimg.append(np.full((6, rowsimg[-1].shape[1], 3), 255, np.float32))
save(out + "_leftwater_sheet.png", np.concatenate(rowsimg[:-1], 0))
