import sys, json, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
def bl(d, thr=12):
    M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]
    A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3].astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    dd = np.diff(A, axis=0); b = (np.abs(dd[:-1]) > thr) & (np.abs(dd[1:]) > thr) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    return b.sum(0).astype(np.float32), A[75]
R = sys.argv[2]; Ms = [bl(R + "/T1d2_" + s) for s in ("main", "main_b", "main_c")]; Ls = [bl(R + "/T1d2_" + s) for s in ("lane", "lane_b", "lane_c")]
HM = sum(m[0] for m in Ms); HL = sum(l[0] for l in Ls)
h = HM.shape[0]; k = 1.25 * (766 / 860.0)
for y0 in range(0, h, 25):
    y1 = min(h, y0 + 25); print("rows %3d-%3d (CSS@766 ~%3.0f-%3.0f): MAIN %6.0f | LANE %6.0f  (L/M %.2f)" % (y0, y1, 392 + y0 / k, 392 + y1 / k, HM[y0:y1].sum(), HL[y0:y1].sum(), HL[y0:y1].sum() / max(1, HM[y0:y1].sum())))
for x0 in range(0, 600, 100):
    print("cols %3d-%3d: MAIN %6.0f | LANE %6.0f (L/M %.2f)" % (x0, x0 + 100, HM[:, x0:x0 + 100].sum(), HL[:, x0:x0 + 100].sum(), HL[:, x0:x0 + 100].sum() / max(1, HM[:, x0:x0 + 100].sum())))
g = lambda H: np.clip(H / 6.0 * 255, 0, 255)[..., None].repeat(3, 2)
img = lambda A: A[..., None].repeat(3, 2)
sep = np.full((HM.shape[0], 6, 3), 255.0)
top = np.concatenate([img(Ms[0][1]), sep, img(Ls[0][1])], 1); bot = np.concatenate([g(HM), sep, g(HL)], 1)
save(sys.argv[3], np.concatenate([top, np.full((6, top.shape[1], 3), 255.0), bot], 0).repeat(2, 0).repeat(2, 1))
