#!/bin/zsh
# p4ice3 patch vs int1 (one file); applies with patch -p1 from retrux-web's parent (the int1 lane root).
f=app/hero/engine/hero/IceMaterial.ts
diff -u --label a/retrux-web/$f --label b/retrux-web/$f /Users/muhamadrifaldi/RetruxR11Work/lanes/int1/retrux-web/$f /Users/muhamadrifaldi/RetruxR11Work/lanes/p4ice3/retrux-web/$f > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice3/p4ice3_vs_int1.patch
wc -l /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice3/p4ice3_vs_int1.patch; shasum -a 256 /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice3/p4ice3_vs_int1.patch
# apply test on a scratch copy of int1's file
T=$(mktemp -d /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice3/applytest.XXXX); mkdir -p $T/retrux-web/app/hero/engine/hero; cp /Users/muhamadrifaldi/RetruxR11Work/lanes/int1/retrux-web/$f $T/retrux-web/$f
(cd $T && patch -p1 --dry-run < /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice3/p4ice3_vs_int1.patch >/dev/null && patch -p1 < /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice3/p4ice3_vs_int1.patch >/dev/null && cmp $T/retrux-web/$f /Users/muhamadrifaldi/RetruxR11Work/lanes/p4ice3/retrux-web/$f && echo "APPLY OK: reproduces the lane file byte for byte")
rm -rf $T
