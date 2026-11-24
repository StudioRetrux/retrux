# wl3c: far column crops (rest T1 1440x766): columns REF | MAIN | ... side by side, crop CSS x0-x1 y0-y1, zoom z; plain + stretched (row-median removed, x gain)
import sys, json, zlib, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import load, save
def fr(d, i=2):
    M = json.load(open(d + "/meta.json")); W = M["W"]; R = M["y1"] - M["y0"]
    return np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(R, W, 4)[::-1][..., :3]
ref = load('/Users/muhamadrifaldi/RetruxR11Work/hp/reference/ref_F000.png')[..., :3]; ref = (ref * 255 if ref.max() <= 1.5 else ref).astype(np.uint8)
out = sys.argv[2]; x0, x1, y0, y1, z = map(int, sys.argv[3:8]); ims = [ref] + [fr(d) for d in sys.argv[8:]]
cs = [a[y0:y1, x0:x1].astype(np.float32) for a in ims]
sep = np.full((cs[0].shape[0] * z, 6, 3), 255, np.uint8)
def row(L):
    return np.concatenate(sum([[np.clip(c, 0, 255).astype(np.uint8).repeat(z, 0).repeat(z, 1), sep] for c in L], [])[:-1], 1)
save(out + "_plain.png", row(cs))
st = []
for c in cs:
    l = c @ np.array([0.2126, 0.7152, 0.0722], np.float32); e = l - np.median(l, 1, keepdims=True)
    st.append(np.repeat((128 + 6 * e)[..., None], 3, 2))
save(out + "_stretch_x6.png", row(st))
print(out, cs[0].shape)
