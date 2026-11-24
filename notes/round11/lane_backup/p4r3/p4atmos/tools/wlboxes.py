import sys; sys.path.insert(0, sys.argv[1])
from jlib import *
from boxes import BOX, stats
REF=sys.argv[2]; D=sys.argv[3]; BASE=sys.argv[4]
pairs=(("F000","ref_F000","t034_F000"),("L015","loop_F015","t054_L015"),("L030","loop_F030","t074_L030"),("L045","loop_F045","t094_L045"),("F297","ref_F297","t133_F297"))
vs=sys.argv[5].split(',')
boxes=sys.argv[6].split(',')
for k in boxes:
    tot={v:0 for v in ['base']+vs}
    line=f"{k:<10}"
    for tag,ref,base in pairs:
        r=stats(load(f"{REF}/{ref}.png"),BOX[k])['L']
        b=stats(load(f"{BASE}/{base}.png"),BOX[k])['L']; tot['base']+=abs(b-r)
        cell=f" {tag} ref{r:.0f} base{b-r:+.0f}"
        for v in vs:
            x=stats(load(f"{D}/{tag}_{v}.png"),BOX[k])['L']; tot[v]+=abs(x-r); cell+=f" {v}{x-r:+.0f}"
        line+=" |"+cell
    print(line+" || mean|d| "+" ".join(f"{v}:{tot[v]/5:.1f}" for v in tot))
