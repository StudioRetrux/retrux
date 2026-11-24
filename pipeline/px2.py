import sys
from PIL import Image
for f in sys.argv[1:]:
    a = Image.open(f).convert("RGB")
    print(f.split("\\")[-1], [a.getpixel((x, y - 200)) for (x, y) in [(20, 320), (50, 340), (80, 360), (40, 400), (90, 410)]])
