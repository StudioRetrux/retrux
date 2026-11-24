# wl3a: per-frame left-water blips of stepped captures (same poses): series and the excess vs the first
import sys, numpy as np
sys.path.insert(0, sys.argv[0].rsplit("/", 1)[0]); from capa import load, blips
c0, c1 = float(sys.argv[1]), float(sys.argv[2]); S = {}
for d in sys.argv[3:]:
    M, L = load(d); k = M["W"] / M["vw"]; S[d] = blips(L)[:, :, int(round(c0 * k)):int(round(c1 * k))].reshape(L.shape[0] - 2, -1).sum(1)
ks = list(S); a = S[ks[0]]
for d in ks[1:]:
    e = S[d] - a; o = np.argsort(-e)[:8]
    print("%s - %s: mean %+.1f | frames with excess > 100: %d, their share of the excess %.0f %% | top %s" % (d.split('/')[-1], ks[0].split('/')[-1], e.mean(), (e > 100).sum(), 100 * e[e > 100].sum() / max(e.sum(), 1), " ".join("%+d@%d" % (e[i], i) for i in o)))
    # per 10-frame chunk
    print("   chunks of 10 (excess mean): " + " ".join("%+.0f" % e[i:i + 10].mean() for i in range(0, len(e), 10)))
print("   MAIN chunks (mean): " + " ".join("%.0f" % a[i:i + 10].mean() for i in range(0, len(a), 10)))
