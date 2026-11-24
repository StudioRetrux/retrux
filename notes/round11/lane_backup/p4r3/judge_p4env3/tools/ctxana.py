# judge_p4env3: context-loss probe analysis (BPY python -I): N (no loss) vs L (lost + restored) at the same sim time, per lab,
# with the cloud / summit region split out (J5's restore path).
import sys, os
import numpy as np, OpenImageIO as oiio
def load(p):
    b = oiio.ImageBuf(p); s = b.spec(); return np.asarray(b.get_pixels(oiio.UINT8)).reshape(s.height, s.width, s.nchannels)[:, :, :3].astype(np.float32)
J = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4env3'
regions = {"frame": (0, 0, 1440, 766), "sky+clouds y0-330": (0, 0, 1440, 330), "massif x0-560 y160-440": (0, 160, 560, 440), "lake y440-766": (0, 440, 1440, 766)}
for lab in ("l", "m"):
    for t in ("t1", "t2_ptrTR"):
        pn, pl = f"{J}/ctx/{lab}/N_{t}.png", f"{J}/ctx/{lab}/L_{t}.png"
        if not (os.path.exists(pn) and os.path.exists(pl)): print(lab, t, "missing"); continue
        a, b = load(pn), load(pl); d = np.abs(a - b).max(2)
        out = []
        for name, (x0, y0, x1, y1) in regions.items():
            s = d[y0:y1, x0:x1]
            out.append(f"{name}: max {s.max():.0f} n>2 {(s > 2).sum()} n>8 {(s > 8).sum()}")
        print(f"{'lane' if lab == 'l' else 'MAIN'} {t:9s} | " + " | ".join(out))
