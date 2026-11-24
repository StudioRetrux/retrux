"""Draw candidate ring ellipses over a Default Loop hero crop, to fit each ring's projected pose by eye.

usage: python -I ring_overlay.py <crop.jpg> <out.png> '<json>' [zoom]
  json: {"A": [theta_deg, ratio], "B": [...], "C": [...], "D": [...]}  (any subset)
    theta_deg: direction of the ellipse's MAJOR axis, degrees counter-clockwise from image-right (0..180)
    ratio:     minor / major, 0 = ring seen exactly edge-on (a line), 1 = exactly face-on (a circle)
  Output: original crop on the left, the same crop with the ellipses (ring centre lines) on the right.
  Colours: A red, B green, C blue, D yellow. A dot marks the +phi end of the minor axis
  (phi = theta + 90 deg), i.e. the side that the 'near' field refers to.

The crops are 600x560 px cut at (420,100) from the 1440x766 frames; the orb (common centre) is at (301, 269.5).
Centre-line radii at this camera: A 185 px, B 151 px, C 121 px, D 97 px (the rings' outer edges are ~8-10 px
further out, the inner edges ~8-10 px further in; seen edge-on a ring is a band 20-40 px thick).
"""
import json
import math
import sys

from PIL import Image, ImageDraw

CX, CY = 301.0, 269.5
RADII = {"A": 185.0, "B": 151.0, "C": 121.0, "D": 97.0}
COLORS = {"A": (255, 40, 40), "B": (40, 220, 60), "C": (40, 120, 255), "D": (255, 210, 0)}


def ellipse_points(r_px, theta_deg, ratio, n=180):
    th = math.radians(theta_deg)
    pts = []
    for i in range(n + 1):
        t = 2 * math.pi * i / n
        a = r_px * math.cos(t)
        b = r_px * ratio * math.sin(t)
        x = CX + a * math.cos(th) - b * math.sin(th)
        y = CY - (a * math.sin(th) + b * math.cos(th))
        pts.append((x, y))
    return pts


def main():
    src, out, spec = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
    zoom = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
    img = Image.open(src).convert("RGB")
    over = img.copy()
    d = ImageDraw.Draw(over, "RGBA")
    for ring, (theta, ratio) in spec.items():
        r_px = RADII[ring]
        col = COLORS[ring]
        pts = ellipse_points(r_px, float(theta), max(0.0, min(1.0, float(ratio))))
        d.line(pts, fill=col + (230,), width=2)
        phi = math.radians(float(theta) + 90.0)
        px = CX + r_px * float(ratio) * math.cos(phi)
        py = CY - r_px * float(ratio) * math.sin(phi)
        d.ellipse([px - 4, py - 4, px + 4, py + 4], fill=col + (255,))
        d.text((8, 8 + 14 * "ABCD".index(ring)), f"{ring}: theta {float(theta):.0f}  ratio {float(ratio):.2f}", fill=col + (255,))
    d.line([(CX - 6, CY), (CX + 6, CY)], fill=(255, 255, 255, 200))
    d.line([(CX, CY - 6), (CX, CY + 6)], fill=(255, 255, 255, 200))
    w, h = img.size
    sheet = Image.new("RGB", (w * 2 + 6, h), (0, 0, 0))
    sheet.paste(img, (0, 0))
    sheet.paste(over, (w + 6, 0))
    if zoom != 1.0:
        sheet = sheet.resize((int(sheet.width * zoom), int(sheet.height * zoom)), Image.LANCZOS)
    sheet.save(out)
    print(out)


if __name__ == "__main__":
    main()
