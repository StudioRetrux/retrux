# wl3a: per-pixel blip heat maps of A and B (stepped captures, same poses), CSS 0-480 of the band, plus frame k of each; one PNG
import sys, numpy as np, OpenImageIO as oiio
sys.path.insert(0, sys.argv[0].rsplit("/", 1)[0]); from capa import load, blips
a, b, out = sys.argv[1], sys.argv[2], sys.argv[3]; fk = int(sys.argv[4]) if len(sys.argv) > 4 else 60
Ma, La = load(a); Mb, Lb = load(b); k = Ma["W"] / Ma["vw"]; x1 = int(round(480 * k))
ha = blips(La)[:, :, :x1].sum(0).astype(np.float32); hb = blips(Lb)[:, :, :x1].sum(0).astype(np.float32)
s = max(np.percentile(ha, 99.5), 1)
def rgb(g): return np.repeat(np.clip(g, 0, 1)[:, :, None], 3, 2)
dif = np.zeros(ha.shape + (3,), np.float32); dd = (hb - ha) / s; dif[:, :, 0] = np.clip(dd, 0, 1); dif[:, :, 2] = np.clip(-dd, 0, 1)
fa = rgb(La[fk, :, :x1] / 255.0); fb = rgb(Lb[fk, :, :x1] / 255.0)
img = np.concatenate([np.concatenate([fa, fb], 1), np.concatenate([rgb(ha / s), rgb(hb / s)], 1), np.concatenate([dif, rgb(np.abs(Lb[fk, :, :x1] - La[fk, :, :x1]) / 40.0)], 1)], 0)
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(img.shape[1], img.shape[0], 3, "uint8")); o.write_image((img * 255).astype(np.uint8)); o.close()
print("heat A sum %.0f B sum %.0f; rows: frame %d A|B, heat A|B, (B-A red / A-B blue) | |B-A| frame x40/255" % (ha.sum(), hb.sum(), fk))
