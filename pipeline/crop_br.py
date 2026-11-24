import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB").crop((900, 520, 1440, 766))
b = Image.open(sys.argv[2]).convert("RGB").crop((900, 520, 1440, 766))
s = Image.new("RGB", (540, 492)); s.paste(a, (0, 0)); s.paste(b, (0, 246)); s.save(sys.argv[3], quality=92)
