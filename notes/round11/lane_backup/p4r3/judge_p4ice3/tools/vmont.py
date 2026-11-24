# vmont.py out.png x0 y0 x1 y1 scale img1 img2 ... (vertical stack, nearest upscale, 4 px white separators)
import sys, numpy as np, OpenImageIO as oiio
out = sys.argv[1]; x0, y0, x1, y1, s = map(int, sys.argv[2:7])
tiles = []
for a in sys.argv[7:]:
    im = oiio.ImageBuf(a).get_pixels(oiio.FLOAT)[..., :3]
    c = im[y0:y1, x0:x1]
    c = np.repeat(np.repeat(c, s, 0), s, 1)
    tiles.append(c); tiles.append(np.ones((4, c.shape[1], 3), np.float32))
m = np.concatenate(tiles[:-1], 0)
spec = oiio.ImageSpec(m.shape[1], m.shape[0], 3, oiio.UINT8)
o = oiio.ImageOutput.create(out); o.open(out, spec); o.write_image(np.clip(m, 0, 1)); o.close()
print(out, m.shape)
