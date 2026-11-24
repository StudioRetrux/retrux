# wl3a: shelf contour sheet (cap.mjs fast-path captures at 1440 CSS): rows = builds, cols = frames k0..k0+3 (contrast-stretched
# with one common range) then the 3 frame diffs x gain. usage: contour.py OUT ZOOM DIR...
import sys, json, zlib, numpy as np, OpenImageIO as oiio
out, z = sys.argv[1], int(sys.argv[2]); dirs = sys.argv[3:]; x0, x1, y0, y1 = 285, 405, 450, 495; ks = [98, 99, 100, 101]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32); rows = []; crops = []
for d in dirs:
    m = json.load(open(d + "/meta.json")); Wd = m["W"]; H = m["y1"] - m["y0"]; k = Wd / 1440.0
    C = []
    for i in ks:
        a = np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(H, Wd, 4)[::-1, :, :3].astype(np.float32) @ LU
        c = a[int(y0 * k) - m["y0"]:int(y1 * k) - m["y0"], int(x0 * k):int(x1 * k)]
        if k > 1.01 and len(crops) and crops[0][0].shape != c.shape: pass
        C.append(c)
    crops.append(C)
sh = min(c[0].shape for c in crops)
crops = [[c[:sh[0], :sh[1]] for c in C] for C in crops]
lo = np.percentile(np.stack(crops[0]), 1); hi = np.percentile(np.stack(crops[0]), 99)
for C in crops:
    f = [np.clip((c - lo) / (hi - lo), 0, 1) for c in C]; dd = [np.clip(np.abs(C[i + 1] - C[i]) * 6 / 255.0, 0, 1) for i in range(3)]
    sep = np.ones((sh[0], 2)) * 0.5
    rows.append(np.concatenate(sum([[x, sep] for x in f + dd], [])[:-1], 1)); rows.append(np.ones((2, rows[-1].shape[1])) * 0.5)
img = np.kron(np.concatenate(rows[:-1], 0), np.ones((z, z))); img = np.repeat(img[:, :, None], 3, 2)
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(img.shape[1], img.shape[0], 3, "uint8")); o.write_image((img * 255).astype(np.uint8)); o.close(); print(out, img.shape)
