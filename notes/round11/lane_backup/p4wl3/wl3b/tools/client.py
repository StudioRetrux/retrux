# wl2g client files: MAIN | lane side by side (same stepped poses), rows = consecutive frames, crop CSS box, nearest zoom z;
# and a PNG sequence for the mp4.  args: TOOLS A B box(x0,y0,x1,y1 css) frames(a,b,..) z out.png [seqdir]
import sys, json, zlib, os, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import save
def load(d, box):
    M = json.load(open(d + "/meta.json")); W = M["W"]; R = M["y1"] - M["y0"]; k = W / M["vw"]
    x0, y0, x1, y1 = [int(round(v * k)) for v in box]; y0 -= M["y0"]; y1 -= M["y0"]
    return (lambda i: np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(R, W, 4)[::-1][y0:y1, x0:x1, :3]), len(M["info"])
box = [float(v) for v in sys.argv[4].split(",")]; fr = [int(v) for v in sys.argv[5].split(",")]; z = int(sys.argv[6]); out = sys.argv[7]
A, na = load(sys.argv[2], box); B, nb = load(sys.argv[3], box)
def pair(i):
    a = A(i).repeat(z, 0).repeat(z, 1); b = B(i).repeat(z, 0).repeat(z, 1)
    return np.concatenate([a, np.full((a.shape[0], 8, 3), 255, np.uint8), b], 1)
rows = []
for i in fr: rows += [pair(i), np.full((8, pair(i).shape[1], 3), 255, np.uint8)]
save(out, np.concatenate(rows[:-1], 0))
if len(sys.argv) > 8:
    sd = sys.argv[8]; os.makedirs(sd, exist_ok=True)
    for i in range(min(na, nb)):
        f = pair(i); h, w = f.shape[:2]; save(sd + "/f%04d.png" % i, f[: h - h % 2, : w - w % 2])
