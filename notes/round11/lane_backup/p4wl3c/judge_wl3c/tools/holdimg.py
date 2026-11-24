# judge_wl3c: hold caps frame i: MAIN / lane / |lane-MAIN| x G stacked (rows 380-766). usage: holdimg.py OUT G i DIR_A DIR_B
import sys, json, zlib, numpy as np, OpenImageIO as oiio
out, G, i = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]); LU = np.array([0.2126, 0.7152, 0.0722], np.float32)
def ld(d):
    M = json.load(open(d + "/meta.json")); W = M["W"]; R = M["y1"] - M["y0"]
    return np.frombuffer(zlib.decompress(open(d + "/f%04d.bin" % i, "rb").read()), np.uint8).reshape(R, W, 4)[::-1][..., :3].astype(np.float32)
a, b = ld(sys.argv[4]), ld(sys.argv[5]); d = np.repeat((np.abs((b - a) @ LU) * G)[:, :, None], 3, 2); sep = np.full((4, a.shape[1], 3), 255.0)
img = np.clip(np.concatenate([a, sep, b, sep, d], 0), 0, 255).astype(np.uint8)
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(img.shape[1], img.shape[0], 3, "uint8")); o.write_image(img); o.close(); print(out, img.shape)
