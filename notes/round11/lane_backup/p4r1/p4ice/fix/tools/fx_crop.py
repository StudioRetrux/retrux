# fixer: crop x0 x1 y0 y1 from each image, nearest-neighbour scale s, stack (h = side by side, v = stacked), red 2 px separators.
#   fx_crop.py out.png x0 x1 y0 y1 s h|v img...
import sys, numpy as np, OpenImageIO as oiio
out = sys.argv[1]; x0, x1, y0, y1, s = map(int, sys.argv[2:7]); mode = sys.argv[7]; ims = sys.argv[8:]
tiles = []
for p in ims:
    a = oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[y0:y1, x0:x1, :3]
    a = np.repeat(np.repeat(a, s, 0), s, 1)
    tiles.append(a)
sep = np.zeros((tiles[0].shape[0], 2, 3), np.float32) if mode == 'h' else np.zeros((2, tiles[0].shape[1], 3), np.float32)
sep[..., 0] = 1
parts = []
for i, t in enumerate(tiles):
    if i: parts.append(sep)
    parts.append(t)
img = np.concatenate(parts, 1 if mode == 'h' else 0)
b = oiio.ImageBuf(oiio.ImageSpec(img.shape[1], img.shape[0], 3, oiio.UINT8))
b.set_pixels(oiio.ROI(), np.ascontiguousarray(img))
b.write(out)
print(out, img.shape)
