# d2img.py out.png dir seq x0 y0 x1 y1 : 4 consecutive frames (2x) + mean |2nd diff| map over the 10 frames (x8 gain) for main / lane rows
import sys, numpy as np, OpenImageIO as oiio
out, D, seq = sys.argv[1:4]; x0, y0, x1, y1 = map(int, sys.argv[4:8])
def ld(p): return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3]
rows = []
for lab in ('main', 'lane'):
    F = [ld(f'{D}/{lab}/{seq}_{i:02d}.png') for i in range(10)]
    Lm = [f @ np.array([0.2126, 0.7152, 0.0722]) for f in F]
    d2 = np.mean([np.abs(Lm[t+1] - 2*Lm[t] + Lm[t-1]) for t in range(1, 9)], 0)
    tiles = []
    for i in range(4):
        c = F[i][y0:y1, x0:x1]; tiles += [np.repeat(np.repeat(c, 2, 0), 2, 1), np.ones(((y1-y0)*2, 4, 3), np.float32)]
    m = np.clip(d2[y0:y1, x0:x1] * 8, 0, 1)
    tiles.append(np.repeat(np.repeat(np.stack([m, m, m], -1), 2, 0), 2, 1))
    r = np.concatenate(tiles, 1); rows += [r, np.ones((4, r.shape[1], 3), np.float32)]
im = np.concatenate(rows[:-1], 0)
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(im.shape[1], im.shape[0], 3, oiio.UINT8)); o.write_image(np.clip(im, 0, 1)); o.close(); print(out, im.shape)
