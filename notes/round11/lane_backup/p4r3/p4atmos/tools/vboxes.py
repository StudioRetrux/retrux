import sys; sys.path.insert(0, sys.argv[1])
from jlib import *
from boxes import BOX, stats
REF=sys.argv[2]; D=sys.argv[3]
for tag, ref in (("L030","loop_F030"),("L045","loop_F045"),("F297","ref_F297")):
    R=load(f"{REF}/{ref}.png")
    for k in ("mtn_face","mtn_upper","mtn_foot"):
        r=stats(R,BOX[k]); line=f"{tag} {k:<10} ref {r['L']:.0f} lap{r['lap']:.1f} |"
        for v in ("V0","V1","V2","V3"):
            s=stats(load(f"{D}/{tag}_{v}.png"),BOX[k]); line+=f" {v} {s['L']:.0f} ({s['L']-r['L']:+.0f}) lap{s['lap']:.1f} |"
        print(line)
