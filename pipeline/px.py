import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB")
for (x, y) in [(20, 320), (50, 340), (80, 360), (40, 400), (90, 410)]:
    print((x, y), a.getpixel((x, y)))
