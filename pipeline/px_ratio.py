import sys
from PIL import Image
m = Image.open(sys.argv[1]).convert("RGB")
for (x, y) in [(46, 73), (56, 80), (63, 85), (97, 129), (100, 133), (105, 139), (90, 120), (110, 150), (60, 110)]:
    print((x, y), m.getpixel((x, y)))
