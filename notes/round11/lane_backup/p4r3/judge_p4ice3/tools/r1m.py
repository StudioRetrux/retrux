# R1 joint metrics: q00 row385 band-end minima, q03 straps, q01 x805 profile, q02 row375.
# usage: r1m.py DIR [DIR...]   (DIR holds q00_rest.png q01_loop15.png q02_loop30.png q03_eye.png, or prefix=DIR/name_)
import sys, os, numpy as np, OpenImageIO as oiio
REF = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
def load(p):
    return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0
def L(a): return a @ np.array([0.2126, 0.7152, 0.0722])
def files(d):
    if d == 'REF':
        return {'q00': REF + '/ref_F000.png', 'q01': REF + '/loop_F015.png', 'q02': REF + '/loop_F030.png', 'q03': REF + '/loop_F045.png'}
    pre = d if not os.path.isdir(d) else d + '/'
    return {'q00': pre + 'q00_rest.png', 'q01': pre + 'q01_loop15.png', 'q02': pre + 'q02_loop30.png', 'q03': pre + 'q03_eye.png'}
for d in sys.argv[1:]:
    f = files(d)
    out = [d[-40:]]
    if os.path.exists(f['q00']):
        a = L(load(f['q00']))
        rl = a[383:388, 540:620].mean(0); rr = a[383:388, 840:920].mean(0)
        i, j = int(np.argmin(rl)), int(np.argmin(rr))
        # slit width: px below (field+min)/2 around the min, field = 90th pct of the window
        def wid(r, k):
            fld = np.percentile(r, 90); thr = (fld + r[k]) / 2
            lo = k
            while lo > 0 and r[lo - 1] < thr: lo -= 1
            hi = k
            while hi < len(r) - 1 and r[hi + 1] < thr: hi += 1
            return hi - lo + 1, fld
        wl, fl = wid(rl, i); wr, fr = wid(rr, j)
        out.append(f'q00 L min {rl[i]:.0f}@{540+i} w{wl} fld{fl:.0f} | R min {rr[j]:.0f}@{840+j} w{wr} fld{fr:.0f}')
    if os.path.exists(f['q03']):
        a = L(load(f['q03']))
        cb = a[468:512, 635]; ct = a[205:260, 815]
        out.append(f'q03 bot x635 min {cb.min():.0f}@{468+int(np.argmin(cb))} | top x815 min {ct.min():.0f}@{205+int(np.argmin(ct))}')
    if os.path.exists(f['q01']):
        a = L(load(f['q01']))
        c = a[240:275, 805]
        out.append('q01 x805 y240-275: ' + ' '.join(f'{v:.0f}' for v in c[::1]))
    if os.path.exists(f['q02']):
        a = L(load(f['q02']))
        c = a[375, 845:885]
        out.append('q02 r375 x845-885: ' + ' '.join(f'{v:.0f}' for v in c[::1]))
    print('\n  '.join(out))
