# blips per frame restricted to frames whose own dt AND the next frame's dt lie in a band (removes the dt confound)
import sys, json, numpy as np
for d in sys.argv[3:]:
    M = json.load(open(d + "/meta.json")); per = np.load(d + "/per.npy"); dt = np.array([f["dt"] for f in M["info"]]) * 1000
    lo, hi = float(sys.argv[1]), float(sys.argv[2])
    # per[i] = blip at frame i+1 (uses frames i, i+1, i+2)
    ok = np.array([lo <= dt[i + 1] <= hi and lo <= dt[i + 2] <= hi for i in range(len(per))])
    print("%-12s dt %g-%g: frames %3d blips/frame %.0f (all %.0f)" % (d.split('/')[-1], lo, hi, ok.sum(), per[ok].mean() if ok.sum() else -1, per.mean()))
