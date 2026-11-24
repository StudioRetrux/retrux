# F2 fixer: qc_fix (lane) vs r11_2 (MAIN int1) vs REF: hold crops side by side (p04-p08), centred on the orb at full res
import sys, os
sys.path.insert(0, '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4orb3/fix/tools')
from jlib import *
L, M, O = sys.argv[1], sys.argv[2], sys.argv[3]
rows = []
for nm in ['p04_expand_pop', 'p05_expand', 'p06_sustain', 'p07_release_snap']:
    a = load(f'{M}/{nm}.png'); b = load(f'{L}/{nm}.png')
    rows.append(hstack([crop(a, 560, 230, 320, 320), crop(b, 560, 230, 320, 320)]))
save(O, vstack(rows))
