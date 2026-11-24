# wl3a: stepped-capture blips (same def as rl: sign-alternating |dL|>12 over 3 frames), boxes in CSS cols (rows = the captured band)
# usage: BPY -I capa.py DIR [DIR ...]   -> per dir: left 0-160, shelf 160-320, right 320-480, far 860-1440 (if captured)
import sys, json, os, zlib, numpy as np
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
BOX = [("left", 0, 160), ("shelf", 160, 320), ("right", 320, 480), ("L0-480", 0, 480)]
def load(d):
    M = json.load(open(d + "/meta.json")); W = M["W"]; rows = M["y1"] - M["y0"]; n = len(M["info"])
    A = np.stack([np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % k, "rb").read()), np.uint8).reshape(rows, W, 4)[::-1, :, :3] for k in range(n)])
    return M, A.astype(np.float32) @ LU
def blips(L):
    dd = np.diff(L, axis=0); return (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
if __name__ == "__main__":
    for d in sys.argv[1:]:
        M, L = load(d); k = M["W"] / M["vw"]; bl = blips(L)
        s = "%-34s n %d" % (os.path.basename(d.rstrip("/")), L.shape[0])
        for b, c0, c1 in BOX:
            y = bl[:, :, int(round(c0 * k)):int(round(c1 * k))].reshape(bl.shape[0], -1).sum(1)
            s += " | %s %.0f" % (b, y.mean())
        print(s)
