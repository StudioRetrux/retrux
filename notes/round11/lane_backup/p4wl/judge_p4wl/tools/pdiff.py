# judge: full-frame diff of T2 poses main vs lane: stats + diff map (x8) stacked: main | lane | diff
import sys, numpy as np
sys.path.insert(0, sys.argv[1]); from imgio import load, save
d = sys.argv[2]
rows = []
for p in sys.argv[3:]:
    a = load(f"{d}/main/{p}.png")[..., :3].astype(np.float32); b = load(f"{d}/lane/{p}.png")[..., :3].astype(np.float32)
    df = np.abs(a - b).max(2)
    ys, xs = np.nonzero(df > 4)
    print(f"{p}: mean|d| {df.mean():.3f} px>4 {len(xs)} px>16 {(df>16).sum()} bbox {(xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else '-'}  water(y>440) px>4 {(df[440:]>4).sum()} above {(df[:440]>4).sum()}")
    m = np.clip(df * 8, 0, 255).astype(np.uint8); rows.append(np.concatenate([a.astype(np.uint8), b.astype(np.uint8), np.stack([m]*3, -1)], 1)[::2, ::2])
save(f"{d}/pdiff.png", np.concatenate(rows, 0))
