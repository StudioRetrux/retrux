import sys, json, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
def ld(d):
    M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]
    return np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3].astype(np.float32)
R = sys.argv[2]; cols = []
for r in ("main", "p4wl_a", "lane"):
    A = ld(R + "/T1d2_" + r)[:, 90:225, 0:240]; L = A @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    dd = np.diff(L, axis=0); b = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    H = b.sum(0) / 12.0
    tiles = [A[k] for k in (60, 61, 62)] + [np.clip(np.abs(A[k + 1] - A[k]) * 6, 0, 255) for k in (60, 61)] + [np.clip(H * 255, 0, 255)[..., None].repeat(3, 2)]
    sep = np.full((3, 240, 3), 255.0); cols.append(np.concatenate(sum([[t, sep] for t in tiles], [])[:-1], 0))
    cols.append(np.full((cols[-1].shape[0], 6, 3), 255.0))
save(sys.argv[3], np.concatenate(cols[:-1], 1).repeat(2, 0).repeat(2, 1))
print("cols MAIN | P4WL | LANE; rows: frames 60-62, |diff| x6 (60-61, 61-62), blip heat (150 frames, white = 12+)")
