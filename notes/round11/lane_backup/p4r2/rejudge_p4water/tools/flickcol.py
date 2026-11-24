# per-column-block sign-reversal flicker (bottom-up zlib frames), blocks of 120 px; also rows y686-726 vs y726-766
import sys, os, zlib, json, numpy as np
def frames(d, k0, k1):
    m = json.load(open(os.path.join(d, "meta.json"))); W = m["W"]; Y0, Y1 = m["y0"], m["y1"]; R = Y1 - Y0
    out = []
    for k in range(k0, k1):
        b = np.frombuffer(zlib.decompress(open(os.path.join(d, f"f{k:04d}.bin"), "rb").read()), dtype=np.uint8)
        a = b.reshape(R, W, b.size // (W * R))[::-1, :, :3].astype(np.float32)
        out.append((a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722)); 
    return out, Y0
for d in sys.argv[3:]:
    k0, k1 = int(sys.argv[1]), int(sys.argv[2])
    Ls, Y0 = frames(d, k0, k1)
    for (y0, y1) in ((686, 726), (726, 766)):
        S = [x[y0 - Y0:y1 - Y0] for x in Ls]
        dd = [S[i + 1] - S[i] for i in range(len(S) - 1)]
        fl = np.mean([(((dd[i] > 8) & (dd[i + 1] < -8)) | ((dd[i] < -8) & (dd[i + 1] > 8))) for i in range(len(dd) - 1)], axis=0)
        blocks = [fl[:, x:x + 120].mean() * 100 for x in range(0, fl.shape[1], 120)]
        print(f"{os.path.basename(d):7s} k{k0}-{k1} y{y0}-{y1} max-px {fl.max()*100:5.1f}% p99.9 {np.percentile(fl,99.9)*100:5.1f}% blocks:", " ".join(f"{b:4.1f}" for b in blocks))
