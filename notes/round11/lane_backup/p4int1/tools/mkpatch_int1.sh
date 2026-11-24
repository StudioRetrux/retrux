#!/bin/zsh
# int1_vs_main.patch: diff -u --label a/retrux-web/<f> --label b/retrux-web/<f> against LANES/aa8 (== MAIN app), every changed
# file + new files (new files against /dev/null). Binary assets are listed separately (ana/assets.txt), not in the patch.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/int1
L=/Users/muhamadrifaldi/RetruxR11Work/lanes
A=$L/aa8/retrux-web; B=$L/int1/retrux-web
CH=(app/hero/engine/CameraRig.ts app/hero/engine/HeroEngine.ts app/hero/engine/assets.ts app/hero/engine/hero/HoldR11.ts
    app/hero/engine/hero/IceMaterial.ts app/hero/engine/hero/Orb.ts app/hero/engine/hero/Shards.ts
    app/hero/engine/pipeline/PostChain.ts app/hero/engine/quality.ts app/hero/engine/world/Atmos.ts
    app/hero/engine/world/PlateEnvironment.ts)
NEW=(app/hero/engine/p4env.ts)
# sanity: the lists match the tree diff (app/ only; public/ holds the binary asset)
diff <(cd $B && (diff -rq $A/app $B/app | sed -E "s#^Files $A/(.*) and .*#\1#; s#^Only in $B/(.*): (.*)#\1/\2#") | sort) <(print -l $CH $NEW | sort) || { echo "file list mismatch"; exit 1; }
: > $W/int1_vs_main.patch
for f in $CH; do diff -u --label a/retrux-web/$f --label b/retrux-web/$f $A/$f $B/$f >> $W/int1_vs_main.patch; done
for f in $NEW; do diff -u --label a/retrux-web/$f --label b/retrux-web/$f /dev/null $B/$f >> $W/int1_vs_main.patch; done
wc -l $W/int1_vs_main.patch; shasum -a 256 $W/int1_vs_main.patch
