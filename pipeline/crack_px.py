import sys
from PIL import Image
m = Image.open(sys.argv[1]).convert("RGB")
n = Image.open(sys.argv[2]).convert("RGB")
# find magenta pixels in the mask image and print the normal colour there and 3 px to the left
pts = []
for y in range(60, 200):
    for x in range(20, 200):
        r, g, b = m.getpixel((x, y))
        if r - g > 35 and b - g > 35:
            pts.append((x, y))
print(len(pts), "crack px")
for (x, y) in pts[:: max(1, len(pts) // 12)][:12]:
    print((x, y), "crack", n.getpixel((x, y)), "left3", n.getpixel((x - 3, y)), "right3", n.getpixel((x + 3, y)))

