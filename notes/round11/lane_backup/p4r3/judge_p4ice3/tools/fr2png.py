# fr2png.py dir : full-frame raw readPixels (WxH in name, bottom-up RGBA) -> top-down PNG
import sys, glob, re, numpy as np, OpenImageIO as oiio
for f in sorted(glob.glob(sys.argv[1] + '/*.rgba')):
    W, H = map(int, re.search(r'_(\d+)x(\d+)\.rgba$', f).groups())
    a = np.frombuffer(open(f, 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].copy()
    out = re.sub(r'_\d+x\d+\.rgba$', '.png', f)
    o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(W, H, 3, oiio.UINT8)); o.write_image(a); o.close()
print('ok', sys.argv[1])
