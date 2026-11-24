import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGB")
W, H = im.size
print(W, H)
# right-middle band of the plate (floes and lake under them)
c = im.crop((int(W * 0.45), int(H * 0.55), int(W * 1.0), int(H * 0.85)))
c.save(sys.argv[2], quality=92)
