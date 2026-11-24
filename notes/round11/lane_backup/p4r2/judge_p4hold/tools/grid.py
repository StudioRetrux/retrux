# grid.py out.jpg scale cols crop(x0,y0,x1,y1|-) img... : grid of images (row-major), each cropped and scaled
import sys, numpy as np, OpenImageIO as oiio
out, scale, cols, crop = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
paths = sys.argv[5:]
tiles = []
for p in paths:
    inp = oiio.ImageInput.open(p); a = inp.read_image(format=oiio.UINT8); inp.close(); a = a[:, :, :3].copy()
    if crop != '-':
        x0, y0, x1, y1 = [int(v) for v in crop.split(',')]; a = a[y0:y1, x0:x1].copy()
    buf = oiio.ImageBuf(a)
    w = int(a.shape[1] * scale); h = int(a.shape[0] * scale)
    buf = oiio.ImageBufAlgo.resize(buf, roi=oiio.ROI(0, w, 0, h, 0, 1, 0, 3))
    tiles.append(buf.get_pixels(oiio.UINT8))
th, tw = tiles[0].shape[:2]; rows = (len(tiles) + cols - 1) // cols; g = 3
canvas = np.full((rows * (th + g), cols * (tw + g), 3), 255, np.uint8)
for i, t in enumerate(tiles):
    r, c = divmod(i, cols); canvas[r * (th + g): r * (th + g) + t.shape[0], c * (tw + g): c * (tw + g) + t.shape[1]] = t
o = oiio.ImageOutput.create(out); o.open(out, oiio.ImageSpec(canvas.shape[1], canvas.shape[0], 3, oiio.UINT8)); o.write_image(canvas); o.close()
print(out, canvas.shape)
