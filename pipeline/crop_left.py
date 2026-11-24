import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB").crop((0, 230, 480, 470))
b = Image.open(sys.argv[2]).convert("RGB").crop((0, 230, 480, 470))
s = Image.new("RGB", (960, 240))
s.paste(a, (0, 0)); s.paste(b, (480, 0))
s = s.resize((1440, 360), Image.LANCZOS)
s.save(sys.argv[3], quality=92)
