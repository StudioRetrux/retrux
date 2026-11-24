# same-pose sheet (rows = builds, cols = frames), GT resampled to the first build's buffer. args TOOLS STDIR x0,y0,x1,y1 frames zoom out builds...
import sys, os, json, zlib, numpy as np
sys.path.insert(0, sys.argv[1]); sys.argv_saved = list(sys.argv)
from imgio import save
D = sys.argv[2]; x0, y0, x1, y1 = map(float, sys.argv[3].split(",")); ks = [int(v) for v in sys.argv[4].split(",")]; z = int(sys.argv[5]); out = sys.argv[6]; bs = sys.argv[7:]
exec(open(os.path.join(sys.argv[1], "lipan.py")).read().split("boxes = {")[0].split("D = sys.argv[2]")[1].split("\n", 1)[1])
_, m0 = get(bs[0]); Wb = m0["W"]; k = Wb / 1440.0
rows = []
for b in bs:
    A, m = get(b, Wb); ys, ye = int(y0 * k - m["y0"]), int(y1 * k - m["y0"]); xs, xe = int(x0 * k), int(x1 * k)
    t = [A[q, ys:ye, xs:xe].repeat(z, 0).repeat(z, 1) for q in ks]
    sep = np.full((t[0].shape[0], 3, 3), 255, np.float32)
    rows.append(np.concatenate(sum([[a, sep] for a in t], [])[:-1], 1)); rows.append(np.full((4, rows[-1].shape[1], 3), 255, np.float32))
save(out, np.concatenate(rows[:-1], 0)); print(out)
