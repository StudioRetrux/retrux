# judge: side-by-side consecutive real-loop frames: columns = runs, rows = frames k..k+n-1 (nearest 2x crop optional)
import sys, json, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
out = sys.argv[2]; k = int(sys.argv[3]); n = int(sys.argv[4]); z = int(sys.argv[5]); crop = [int(v) for v in sys.argv[6].split(',')]  # x0,y0,x1,y1 in buffer px (top-down)
runs = sys.argv[7:]
cols = []
for d in runs:
    M = json.load(open(d + "/meta.json")); w, h, N = M["w"], M["h"], M["n"]
    A = np.fromfile(d + "/frames.bin", np.uint8).reshape(N, h, w, 4)[:, ::-1, :, :3]
    x0, y0, x1, y1 = crop; x1 = min(x1, w); y1 = min(y1, h)
    fr = [A[i, y0:y1, x0:x1].repeat(z, 0).repeat(z, 1) for i in range(k, k + n)]
    sep = np.full((4, fr[0].shape[1], 3), 255, np.uint8)
    col = np.concatenate(sum([[f, sep] for f in fr], [])[:-1], 0)
    cols.append(col); cols.append(np.full((col.shape[0], 6, 3), 255, np.uint8))
save(out, np.concatenate(cols[:-1], 1))
