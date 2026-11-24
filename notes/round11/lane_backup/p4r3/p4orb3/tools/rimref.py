import sys, os
sys.path.insert(0, os.path.dirname(__file__) + '/rj')
from jlib import *
a = load('/Users/muhamadrifaldi/RetruxR11Work/hp/reference/ref_F402.png')
cx, cy = 709, 408
# rows through the orb, left edge and bottom-left: print pixels along rays at several angles from 0.7 to 1.15 of r 80
for ang in (180, 200, 225, 250, 135, 0, 315):
    t = np.deg2rad(ang); out = []
    for k in np.arange(0.70, 1.16, 0.025):
        x = cx + np.cos(t) * k * 80; y = cy - np.sin(t) * k * 80
        p = a[int(round(y)), int(round(x))]
        out.append(f"{k:.3f}:{int(p[0])},{int(p[1])},{int(p[2])}")
    print(f"ang {ang}: " + ' '.join(out))
