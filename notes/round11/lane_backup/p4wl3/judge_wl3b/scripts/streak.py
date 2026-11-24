# thin vertical bright line detector in the stepped fast-path frames: per frame, for each column of CSS x 1225-1300 (rows 520-580),
# the line excess = mean over rows of (luma - median of the 11-px horizontal neighbourhood); report the max column excess.
import sys, os, json, zlib, numpy as np
sys.argv = [sys.argv[0], "tools", "st"] ; T = "tools"
src = open(os.path.join(T, "lipan.py")).read().split("boxes = {")[0]
exec(src.split("D = sys.argv[2]")[0]); D = "st"; exec(src.split("D = sys.argv[2]")[1].split("\n", 1)[1])
from numpy.lib.stride_tricks import sliding_window_view as sw
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
_, m0 = get("FM"); Wb = m0["W"]; k = Wb / 1440.0
res = {}
for b in ["FM", "FB", "FL", "FGTpx"]:
    A, m = get(b, Wb)
    ys, ye = int(520 * k - m["y0"]), int(580 * k - m["y0"]); xs, xe = int(1225 * k), int(1300 * k)
    out = []
    for f in range(30, 47):
        Lm = A[f, ys:ye, xs - 6:xe + 6] @ LU
        med = np.median(sw(Lm, 11, axis=1), -1)
        e = (Lm[:, 5:-5] - med)[:, :xe - xs].mean(0)
        out.append(e.max())
    res[b] = np.array(out)
    print("%-6s line excess max per frame 30-46: %s | mean %.2f max %.2f" % (b, " ".join("%.1f" % v for v in out), np.mean(out), np.max(out)))
