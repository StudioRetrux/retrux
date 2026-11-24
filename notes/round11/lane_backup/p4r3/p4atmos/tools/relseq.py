import sys; sys.path.insert(0, sys.argv[1])
from jlib import *
B, V = sys.argv[2], sys.argv[3]
seq = ["p06_sustain", "r015", "p07_r033", "p08_r057", "r090", "r140", "r220"]
boxes = {"left_patch x0-200 y300-380": (0, 300, 200, 380), "bank x0-400 y420-470": (0, 420, 400, 470), "massif x200-450 y320-400": (200, 320, 450, 400)}
for name, (x0, y0, x1, y1) in boxes.items():
    line = f"{name:<26}"
    for s in seq:
        a = luma(load(f"{B}/{s}.png")[y0:y1, x0:x1]).mean(); b = luma(load(f"{V}/{s}.png")[y0:y1, x0:x1]).mean()
        line += f" | {s[-4:]} {a:5.1f}/{b:5.1f}"
    print(line)
print("(MAIN / lane luma; release seconds: 0.15, 0.33, 0.57, 0.9, 1.4, 2.2; reference F453 L130 / F460 L96 on the left patch)")
