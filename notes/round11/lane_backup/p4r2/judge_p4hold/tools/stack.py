# stack.py out.jpg scale "y1,y2,..." "x0,y0,x1,y1"(crop or -) img1 img2 ... : vertical stack, optional guide lines (source px), crop
import sys, numpy as np, OpenImageIO as oiio
out, scale, lines, crop = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4]
paths = sys.argv[5:]
ys = [int(v) for v in lines.split(',')] if lines != '-' else []
tiles = []
for p in paths:
    inp = oiio.ImageInput.open(p); a = inp.read_image(format=oiio.UINT8); inp.close()
    a = a[:, :, :3].copy()
    if crop != '-':
        x0, y0, x1, y1 = [int(v) for v in crop.split(',')]
        a = a[y0:y1, x0:x1].copy(); oy = y0
    else:
        oy = 0
    for y in ys:
        yy = y - oy
        if 0 <= yy < a.shape[0]:
            a[yy, ::2] = [255, 0, 0]
    buf = oiio.ImageBuf(a)
    if scale != 1:
        w = int(a.shape[1] * scale); h = int(a.shape[0] * scale)
        buf = oiio.ImageBufAlgo.resize(buf, roi=oiio.ROI(0, w, 0, h, 0, 1, 0, 3))
    t = buf.get_pixels(oiio.UINT8)
    sep = np.full((4, t.shape[1], 3), 255, np.uint8)
    tiles += [t, sep]
H = sum(t.shape[0] for t in tiles); W = max(t.shape[1] for t in tiles)
canvas = np.zeros((H, W, 3), np.uint8); y = 0
for t in tiles:
    canvas[y:y + t.shape[0], :t.shape[1]] = t; y += t.shape[0]
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(W, H, 3, oiio.UINT8)); o.write_image(canvas); o.close()
print(out, W, H)
