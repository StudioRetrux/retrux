#!/bin/zsh
# evalc.sh PATH K1 VAR1 VAR2 ... : glide (abs / rel-to-GT, solid-side error) + crawl (MC32 / MCE / texture / halo vs BASE)
# for BASE, AA3, GT and my candidate caps (caps/PATH_VAR)
p=$1; k1=$2; shift 2
C=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/caps
mot=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/ana/$( [ $p = slow ] && echo slow_C3.json || echo medium_F.json )
seqs=(--seq BASE=$C/${p}_base --seq AA3=$C/${p}_F --seq GT=$C/${p}_gt)
for v in "$@"; do seqs+=(--seq $v=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/${p}_$v); done
tag=${p}_$(echo "$@" | tr ' ' '_')
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/tools
node glide.mjs --mask /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/${p}_mask --motion $mot ${seqs[@]} --gt GT --k1 $k1 --minc 40 --cap 1 --sstride 3 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/ana/glide_$tag.json 2>&1 | grep -vE "^DBG|^   " > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/ana/glide_$tag.txt
node crawl.mjs --mask /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/caps/${p}_mask ${seqs[@]} --ref BASE --gt GT --k1 $k1 --stride 2 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/ana/crawl_$tag.json > /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/ana/crawl_$tag.txt 2>&1
echo "== $tag"; cat /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/ana/glide_$tag.txt | sed -n '1p;/area5) px/,/^  ALL/p;/REL-to-GT JERK (area5)/,/^  ALL/p;/SOLID/,/^  ALL/p'
grep -E "^frames|tot\.(j32|j48|mc32|mce)|texLake|texSolid|halo" /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a/ana/crawl_$tag.txt
