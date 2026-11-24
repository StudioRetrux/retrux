# same-pose (stepped FAIR capture) comparison: one-frame blips in boxes + zoomed sheets. args: TOOLS FAIRDIR
import sys, json, zlib, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
F = sys.argv[2]
def seq(d, n):
    m = json.load(open(d + "/meta.json")); W = m["W"]; H = m["y1"] - m["y0"]
    fr = []
    for k in range(n):
        b = np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % k, "rb").read()), np.uint8).reshape(H, W, 4)[::-1, :, :3]
        fr.append(b)
    return np.array(fr), m["y0"]
def blips(A, box, thr=12):
    x0, y0, x1, y1 = box; L = A[:, y0:y1, x0:x1].astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    dd = np.diff(L, axis=0); bl = (np.abs(dd[:-1]) > thr) & (np.abs(dd[1:]) > thr) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    return bl.reshape(bl.shape[0], -1).sum(1).mean()
N = 120
M, y0 = seq(F + "/fast_M", N); L, _ = seq(F + "/fast_L", N); GM, _ = seq(F + "/fast_M_gt", N); GL, _ = seq(F + "/fast_L_gt", N)
boxes = {"left_shelf x0-420 y470-620": (0, 470 - y0, 420, 620 - y0), "far x880-1440 y430-590": (880, 430 - y0, 1440, 590 - y0), "full rows 380-766": (0, 0, 1440, 766 - y0)}
for name, b in boxes.items():
    print("%-28s blips/frame  MAIN %.0f | LANE %.0f | GT_M %.0f | GT_L %.0f" % (name, blips(M, b), blips(L, b), blips(GM, b), blips(GL, b)))
def sheet(out, box, ks, z):
    x0, y0_, x1, y1 = box; cols = []
    for A in (M, L, GL):
        fr = [A[k, y0_:y1, x0:x1].repeat(z, 0).repeat(z, 1) for k in ks]
        sep = np.full((3, fr[0].shape[1], 3), 255, np.uint8)
        col = np.concatenate(sum([[f, sep] for f in fr], [])[:-1], 0); cols += [col, np.full((col.shape[0], 5, 3), 255, np.uint8)]
    save(out, np.concatenate(cols[:-1], 1))
sheet(F + "/../rl/st_left.png", (0, 500 - y0, 300, 600 - y0), [60, 61, 62, 63], 2)
sheet(F + "/../rl/st_far.png", (900, 440 - y0, 1180, 560 - y0), [60, 61, 62, 63], 2)
