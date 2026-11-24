import sys
from PIL import Image
im = Image.new("RGB", (780, 1140))
im.paste(Image.open(sys.argv[1]), (0, 0)); im.paste(Image.open(sys.argv[2]), (0, 570))
im.save(sys.argv[3], quality=92)
