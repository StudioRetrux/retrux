import sys, os
from PIL import Image, ImageDraw
out = sys.argv[1]
SS = 8  # supersampling

def ring(canvas, diameter, stroke, fill_alpha, scale):
    n = canvas * scale * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = n / 2.0
    ro = diameter * scale * SS / 2.0
    ri = ro - stroke * scale * SS
    # stroke: white 60 %
    d.ellipse((c - ro, c - ro, c + ro, c + ro), fill=(255, 255, 255, int(round(255 * 0.6))))
    # inside: fill (link: white 20 %) or clear
    if fill_alpha > 0:
        d.ellipse((c - ri, c - ri, c + ri, c + ri), fill=(255, 255, 255, int(round(255 * fill_alpha))))
    else:
        d.ellipse((c - ri, c - ri, c + ri, c + ri), fill=(0, 0, 0, 0))
    return img.resize((canvas * scale, canvas * scale), Image.LANCZOS)

# Ring: 79 / 67 / 55 px outer diameter on 80 / 68 / 56 px canvases (hotspot = centre). Link: 40 / 34 / 28.
for canvas, dia, name in [(80, 79, "ring-80"), (68, 67, "ring-68"), (56, 55, "ring-56"), (40, 40, "link-40"), (34, 34, "link-34"), (28, 28, "link-28")]:
    link = name.startswith("link")
    for scale, suffix in [(1, ""), (2, "@2x")]:
        im = ring(canvas, dia - (0.5 if link else 0), 1.5, 0.2 if link else 0.0, scale)
        p = os.path.join(out, name + suffix + ".png")
        im.save(p, optimize=True)
        print(p, im.size, os.path.getsize(p))
