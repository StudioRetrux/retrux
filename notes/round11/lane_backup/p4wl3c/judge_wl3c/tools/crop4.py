# judge_wl3a: REF | dirs... crops (rest caps, frame 2) side by side + |last - second-last| x G. usage: crop4.py OUT x0 x1 y0 y1 Z G DIR...
import sys, json, zlib, numpy as np, OpenImageIO as oiio
sys.path.insert(0, "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_wl3a/tools")
from imgio import load
out = sys.argv[1]; x0, x1, y0, y1, Z, G = map(int, sys.argv[2:8]); dirs = sys.argv[8:]
def fr(d, i=2):
    M = json.load(open(d + "/meta.json")); W = M["W"]; R = M["y1"] - M["y0"]
    a = np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(R, W, 4)[::-1][..., :3]
    full = np.zeros((766, W, 3), np.uint8); full[M["y0"]:M["y1"]] = a; return full.astype(np.float32)
ims = [load("/Users/muhamadrifaldi/RetruxR11Work/hp/reference/ref_F000.png")[..., :3]] + [fr(d) for d in dirs]
cr = [a[y0:y1, x0:x1] for a in ims]
LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
dif = np.abs((cr[-1] - cr[-2]) @ LU) * G; cr.append(np.repeat(dif[:, :, None], 3, 2))
sep = np.full((y1 - y0, 4, 3), 255.0)
img = np.concatenate(sum([[c, sep] for c in cr], [])[:-1], 1)
img = np.clip(np.kron(img, np.ones((Z, Z, 1))), 0, 255).astype(np.uint8)
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(img.shape[1], img.shape[0], 3, "uint8")); o.write_image(img); o.close(); print(out, img.shape)
