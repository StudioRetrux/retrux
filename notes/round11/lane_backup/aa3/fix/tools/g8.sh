#!/bin/zsh
# G8: switches restore BASE exactly (final image hash + every linked program's preprocessed sources), lab targets.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3
cd $W; mkdir -p /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8
run() { node /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/ident.mjs "$@" > /dev/null; }
run --port 5182 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/base_t1.json
run --port 5181 --qs "aaresolve=0&slabflash=0&lktaa=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/lane_t1_off.json
run --port 5181 --qs "aaresolve=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/lane_t1_aa0.json
run --port 5181 --qs "slabflash=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/lane_t1_sf0.json
run --port 5181 --qs "lktaa=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/lane_t1_taa0.json
run --port 5181 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/lane_t1.json
run --port 5182 --qs "envlake=plate" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/base_plate.json
run --port 5181 --qs "envlake=plate" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/lane_plate.json
run --port 5182 --mobile --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/base_t0.json
run --port 5181 --mobile --qs "t0aa=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/lane_t0_off.json
run --port 5181 --mobile --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/lane_t0.json
run --port 5182 --tier T2 --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/base_t2.json
run --port 5181 --tier T2 --qs "aaresolve=0&slabflash=0&lktaa=0" --out /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/lane_t2_off.json
node -e '
const fs=require("fs"); const L=(n)=>JSON.parse(fs.readFileSync("/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3fix/ident/g8/"+n+".json"));
const cmp=(a,b)=>{const A=L(a),B=L(b); const ks=new Set([...Object.keys(A.programs||{}),...Object.keys(B.programs||{})]); const pd=[...ks].filter(k=>JSON.stringify(A.programs[k])!==JSON.stringify(B.programs[k]));
 const td=Object.keys(A.targets||{}).filter(k=>JSON.stringify(A.targets[k])!==JSON.stringify((B.targets||{})[k]));
 console.log((a+" vs "+b).padEnd(40), "final", A.targets?.final?.hash===B.targets?.final?.hash?"SAME":"DIFF", "| targets differ:", td.join(",")||"-", "| programs", ks.size, "differ:", pd.join(",")||"-", "| logs", (A.logs||[]).length, (B.logs||[]).length);};
cmp("lane_t1_off","base_t1"); cmp("lane_t1_aa0","base_t1"); cmp("lane_t1_sf0","base_t1"); cmp("lane_t1_taa0","base_t1"); cmp("lane_t1","base_t1");
cmp("lane_plate","base_plate"); cmp("lane_t0_off","base_t0"); cmp("lane_t0","base_t0"); cmp("lane_t2_off","base_t2");'
