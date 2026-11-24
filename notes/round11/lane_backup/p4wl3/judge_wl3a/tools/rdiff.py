# judge_wl3a: full-frame rest diff between two cap dirs (frame 2): stats above / in the water, top-N clusters of |dL| > T (16x16 blocks)
import sys, json, zlib, numpy as np
def fr(d, i=2):
    M = json.load(open(d + "/meta.json")); W = M["W"]; R = M["y1"] - M["y0"]
    a = np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(R, W, 4)[::-1][..., :3].astype(np.float32)
    return a, M["y0"]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
(a, y0), (b, _) = fr(sys.argv[1]), fr(sys.argv[2]); T = float(sys.argv[3]) if len(sys.argv) > 3 else 8
d = np.abs((b - a) @ LU); s = (b - a) @ LU
yy = np.arange(d.shape[0])[:, None] + y0
for nm, m in (("y<430", yy < 430), ("430-464", (yy >= 430) & (yy < 464)), ("y>=464", yy >= 464)):
    mm = np.broadcast_to(m, d.shape); print("%-8s px>%g %d  max %.0f  mean %.3f  signed mean %.3f" % (nm, T, (d[mm] > T).sum(), d[mm].max(), d[mm].mean(), s[mm].mean()))
B = 16; H, W = d.shape; blk = (d[:H // B * B, :W // B * B] > T).reshape(H // B, B, W // B, B).sum((1, 3))
sb = s[:H // B * B, :W // B * B].reshape(H // B, B, W // B, B).mean((1, 3))
idx = np.dstack(np.unravel_index(np.argsort(-blk.ravel())[:12], blk.shape))[0]
print("top 16px blocks (CSS x,y: n>T, mean signed dL):", " ".join("%d,%d:%d/%+.1f" % (j * B, i * B + y0, blk[i, j], sb[i, j]) for i, j in idx))
