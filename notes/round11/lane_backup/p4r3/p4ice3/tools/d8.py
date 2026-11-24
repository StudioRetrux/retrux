import sys, numpy as np, OpenImageIO as oiio
d = sys.argv[1]
def ld(p): return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3]
a = ld(d + '/d8_q00_rest.png')
for nm, y, x0, x1 in (('q00 row385 L', 385, 560, 600), ('q00 row385 R', 385, 850, 900)):
    seg = a[y, x0:x1]
    print(nm, ' '.join(f'{x0+i}:{p[0]:.2f}/{p[1]:.2f}/{p[2]:.2f}' for i, p in enumerate(seg) if p[1] > 0.02))
a = ld(d + '/d8_q03_eye.png')
for nm, x, y0, y1 in (('q03 x635', 635, 468, 512), ('q03 x815', 815, 205, 260)):
    seg = a[y0:y1, x]
    print(nm, ' '.join(f'{y0+i}:{p[0]:.2f}/{p[1]:.2f}/{p[2]:.2f}' for i, p in enumerate(seg) if p[1] > 0.02))
a = ld(d + '/d8_q01_loop15.png')
seg = a[240:275, 805]; print('q01 x805', ' '.join(f'{240+i}:{p[0]:.2f}/{p[1]:.2f}/{p[2]:.2f}' for i, p in enumerate(seg) if p[1] > 0.02))
a = ld(d + '/d8_q02_loop30.png')
seg = a[375, 845:885]; print('q02 r375', ' '.join(f'{845+i}:{p[0]:.2f}/{p[1]:.2f}/{p[2]:.2f}' for i, p in enumerate(seg) if p[1] > 0.02))
