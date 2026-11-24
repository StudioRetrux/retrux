# rgba2png.py dir : convert seq.mjs raw readPixels dumps (840x550 RGBA, bottom-up) to top-down PNGs
import sys, glob, os, numpy as np, OpenImageIO as oiio
CW, CH = 840, 550
for f in sorted(glob.glob(sys.argv[1] + '/*.rgba')):
    a = np.frombuffer(open(f, 'rb').read(), np.uint8).reshape(CH, CW, 4)[::-1, :, :3].copy()
    out = f[:-5] + '.png'
    o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(CW, CH, 3, oiio.UINT8)); o.write_image(a); o.close()
print('ok', sys.argv[1])
