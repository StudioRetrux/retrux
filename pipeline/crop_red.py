import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB")   # clip x 0-600, y 200-500
c = a.crop((0, 30, 260, 220)).resize((780, 570), Image.NEAREST)
c.save(sys.argv[2], quality=92)
