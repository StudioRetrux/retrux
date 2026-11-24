# wl3a: where the extra blips are: per-row and per-column-block excess B-A over frames f0..f1 (CSS units), left 0-160
import sys, numpy as np
sys.path.insert(0, sys.argv[0].rsplit("/", 1)[0]); from capa import load, blips
a, b = sys.argv[1], sys.argv[2]; f0, f1 = int(sys.argv[3]), int(sys.argv[4])
Ma, La = load(a); Mb, Lb = load(b); k = Ma["W"] / Ma["vw"]; x1 = int(round(160 * k))
ha = blips(La)[f0:f1, :, :x1].sum(0).astype(float); hb = blips(Lb)[f0:f1, :, :x1].sum(0).astype(float)
H = ha.shape[0]
print("rows (CSS y from 440): A | B | B-A per 10 CSS rows")
for r in range(0, H, int(round(10 * k))):
    rr = slice(r, r + int(round(10 * k)))
    print("  y %3.0f-%3.0f  %6.0f | %6.0f | %+6.0f   cols(32 CSS): %s" % (440 + r / k, 440 + (r + 10 * k) / k, ha[rr].sum(), hb[rr].sum(), hb[rr].sum() - ha[rr].sum(), " ".join("%+5.0f" % (hb[rr, c:c + 40].sum() - ha[rr, c:c + 40].sum()) for c in range(0, x1, 40))))
