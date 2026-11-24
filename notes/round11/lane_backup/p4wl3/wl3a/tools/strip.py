# wl3a: same-pose strip: rows = builds, cols = frames k0..k0+n-1 then their frame-to-frame |dL| x gain; crop CSS x0-x1 (all band rows); zoom z
import sys, numpy as np, OpenImageIO as oiio
sys.path.insert(0, sys.argv[0].rsplit("/", 1)[0]); from capa import load
out, x0, x1, k0, n, z, gain = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6]), float(sys.argv[7])
dirs = sys.argv[8:]; rows = []
for d in dirs:
    M, L = load(d); k = M["W"] / M["vw"]; a, b = int(round(x0 * k)), int(round(x1 * k))
    C = L[k0:k0 + n, :, a:b] / 255.0; D = np.abs(np.diff(L[k0:k0 + n, :, a:b], axis=0)) * gain / 255.0
    sep = np.ones((C.shape[1], 2)) * 0.5
    r = np.concatenate([np.concatenate([c, sep], 1) for c in C] + [np.concatenate([dd, sep], 1) for dd in D], 1)
    rows.append(r); rows.append(np.ones((2, r.shape[1])) * 0.5)
img = np.clip(np.concatenate(rows, 0), 0, 1); img = np.kron(img, np.ones((z, z)))
img = np.repeat(img[:, :, None], 3, 2)
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(img.shape[1], img.shape[0], 3, "uint8")); o.write_image((img * 255).astype(np.uint8)); o.close()
print(out, img.shape)
