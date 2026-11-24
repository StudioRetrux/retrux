# judge_wl3a: hold path (cap.mjs --path hold, pre 30: press at frame 0 of the capture, release at 300) one-frame blips per phase
# and per x-third of the frame, plus the max per-frame difference lane vs base. usage: holdj.py DIR... (first = base for the diff)
import sys, json, zlib, numpy as np
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
def load(d):
    M = json.load(open(d + "/meta.json")); W = M["W"]; R = M["y1"] - M["y0"]; n = M["frames"]
    return np.stack([np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(R, W, 4)[::-1][..., :3].astype(np.float32) @ LU for i in range(n)]), M
base = None
for d in sys.argv[1:]:
    A, M = load(d); dd = np.diff(A, axis=0); bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
    W = A.shape[2]; n = bl.shape[0]
    ph = {"hold 0-300": (0, min(299, n)), "release 300-360": (299, n)}
    s = []
    for nm, (a, b) in ph.items():
        for xs, (x0, x1) in (("L", (0, W // 3)), ("C", (W // 3, 2 * W // 3)), ("R", (2 * W // 3, W))):
            s.append("%s %s %.0f" % (nm.split()[0], xs, bl[a:b, :, x0:x1].reshape(b - a, -1).sum(1).mean()))
    extra = ""
    if base is None: base = A
    else:
        m = min(len(base), len(A)); df = np.abs(A[:m] - base[:m]); extra = " | vs first: frames with px>16: %d, max %.0f, mean %.3f" % ((df.reshape(m, -1) > 16).any(1).sum(), df.max(), df.mean())
    print("%-10s n %d | %s%s" % (d.split("/")[-1], A.shape[0], " | ".join(s), extra))
