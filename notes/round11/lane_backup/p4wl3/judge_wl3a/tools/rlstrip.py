# judge_wl3a: real-loop strip. rows = runs; for each run the 4 frames around its median-blip frame in the left water (CSS 0-160)
# and the 3 diffs x6. usage: rlstrip.py OUT ZOOM RUNDIR...   (crop CSS x 0-240, y 440-620)
import sys, json, numpy as np, OpenImageIO as oiio
out, Z = sys.argv[1], int(sys.argv[2]); LU = np.array([0.2126, 0.7152, 0.0722], np.float32); rows = []
for d in sys.argv[3:]:
    M = json.load(open(d + "/meta.json")); w, h, N, k = M["w"], M["h"], M["n"], M["k"]
    A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3].astype(np.float32)
    L = A @ LU; dd = np.diff(L, axis=0); bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    e1 = int(round(160 * k)); y = bl[:, :, :e1].reshape(bl.shape[0], -1).sum(1)
    i = int(np.argsort(y)[int(len(y) * 0.75)]) + 1; i = min(max(i, 1), N - 4)   # a 75th-percentile frame (typical bad moment)
    c1 = int(round(240 * k)); C = [A[j, :, :c1] for j in range(i, i + 4)]
    D = [np.repeat((np.abs((C[j + 1] - C[j]) @ LU) * 6)[:, :, None], 3, 2) for j in range(3)]
    sep = np.full((h, 3, 3), 128.0); rows.append(np.concatenate(sum([[x, sep] for x in C + D], [])[:-1], 1)); rows.append(np.full((3, rows[-1].shape[1], 3), 128.0))
    print(d.split("/")[-1], "frame", i, "left blips at it", int(y[i - 1]), "run mean", round(float(y.mean())))
img = np.concatenate(rows[:-1], 0); img = np.clip(np.kron(img, np.ones((Z, Z, 1))), 0, 255).astype(np.uint8)
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(img.shape[1], img.shape[0], 3, "uint8")); o.write_image(img); o.close(); print(out, img.shape)
