import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB").crop((620, 290, 820, 460)).resize((400, 340), Image.LANCZOS)
b = Image.open(sys.argv[2]).convert("RGB").crop((620, 290, 820, 460)).resize((400, 340), Image.LANCZOS)
s = Image.new("RGB", (800, 340)); s.paste(a, (0, 0)); s.paste(b, (400, 0)); s.save(sys.argv[3], quality=92)
