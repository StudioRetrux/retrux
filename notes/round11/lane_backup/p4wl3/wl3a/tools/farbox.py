# wl3a: quick stepped box blips (thr 12) for cap.mjs fast-path captures at 1440 CSS: left / shelf / far boxes
import sys, json, zlib, os, numpy as np
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
B = {"left": (0, 470, 420, 620), "shelf": (280, 440, 480, 520), "far": (880, 430, 1440, 590)}
for d in sys.argv[1:]:
    m = json.load(open(d + "/meta.json")); Wd = m["W"]; H = m["y1"] - m["y0"]; n = len(m["info"]); k = Wd / 1440.0
    A = np.stack([np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(H, Wd, 4)[::-1, :, :3] for i in range(n)]).astype(np.float32) @ LU
    s = "%-10s" % os.path.basename(d)
    for nm, (x0, y0, x1, y1) in B.items():
        L = A[:, int(y0 * k) - m["y0"]:int(y1 * k) - m["y0"], int(x0 * k):int(x1 * k)]; dd = np.diff(L, axis=0)
        bl = (np.abs(dd[:-1]) > 12) & (np.abs(dd[1:]) > 12) & (np.sign(dd[:-1]) != np.sign(dd[1:]))
        s += " | %s %.0f" % (nm, bl.reshape(bl.shape[0], -1).sum(1).mean())
    print(s)
