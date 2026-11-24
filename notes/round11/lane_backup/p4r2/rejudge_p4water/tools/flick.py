# temporal flicker in a band over zlib raw frames (meta y0..y1 rows, RGBA or RGB): mean |dL|, px>12, sign-reversal flicker
import sys, os, zlib, json, numpy as np
d, k0, k1, y0, y1 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
m = json.load(open(os.path.join(d, "meta.json"))); W = m["W"]; Y0, Y1 = m["y0"], m["y1"]; R = Y1 - Y0
def L(k):
    b = np.frombuffer(zlib.decompress(open(os.path.join(d, f"f{k:04d}.bin"), "rb").read()), dtype=np.uint8)
    c = b.size // (W * R)
    a = b.reshape(R, W, c)[:, :, :3].astype(np.float32)
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722, c
L0, c = L(k0)
Ls = [L0] + [L(k)[0] for k in range(k0 + 1, k1)]
for flip in (False, True):
    S = [(x[::-1] if flip else x)[y0 - Y0:y1 - Y0] for x in Ls]
    dd = [S[i + 1] - S[i] for i in range(len(S) - 1)]
    md = np.mean([np.abs(x).mean() for x in dd]); p12 = np.mean([(np.abs(x) > 12).mean() for x in dd])
    fl = np.mean([(((dd[i] > 8) & (dd[i + 1] < -8)) | ((dd[i] < -8) & (dd[i + 1] > 8))).mean() for i in range(len(dd) - 1)])
    print(f"{os.path.basename(d):8s} ch{c} k{k0}-{k1} y{y0}-{y1} flip={flip}: mean|dL| {md:.3f} px>12 {p12*100:.3f}% flicker {fl*100:.3f}%")
