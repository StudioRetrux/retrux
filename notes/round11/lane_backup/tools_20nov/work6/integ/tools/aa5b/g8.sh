#!/bin/zsh
# AA5b G8: ?ffblock=0 == AA3 (the AA3 builder's ident JSONs of the final AA3 build == aa3_judged); all off == BASE; plate / T0 / T2.
W=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5b
A=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/ident/g8
cd $W; mkdir -p ident
run() { node tools/ident.mjs "$@" > /dev/null; }
run --port 5194 --qs "ffblock=0" --out ident/ff0_t1.json
run --port 5194 --out ident/ff1_t1.json
run --port 5194 --qs "ffblock=0&aaresolve=0&slabflash=0&lktaa=0" --out ident/alloff_t1.json
run --port 5194 --qs "envlake=plate" --out ident/plate.json
run --port 5194 --mobile --out ident/t0.json
run --port 5194 --tier T2 --qs "ffblock=0&aaresolve=0&slabflash=0&lktaa=0" --out ident/t2_off.json
node -e '
const fs=require("fs"); const L=(p)=>JSON.parse(fs.readFileSync(p));
const A="'$A'/", M="ident/";
const cmp=(a,b)=>{const X=L(a),Y=L(b); const ks=new Set([...Object.keys(X.programs||{}),...Object.keys(Y.programs||{})]); const pd=[...ks].filter(k=>JSON.stringify(X.programs[k])!==JSON.stringify(Y.programs[k]));
 const td=Object.keys(X.targets||{}).filter(k=>JSON.stringify(X.targets[k])!==JSON.stringify((Y.targets||{})[k]));
 console.log((a.split("/").pop()+" vs "+b.split("/").slice(-2).join("/")).padEnd(46), "final", X.targets?.final?.hash===Y.targets?.final?.hash?"SAME":"DIFF", "| targets differ:", td.join(",")||"-", "| programs", ks.size, "differ:", pd.join(",")||"-", "| logs", (X.logs||[]).length, (Y.logs||[]).length);};
cmp(M+"ff0_t1.json",A+"lane_t1.json"); cmp(M+"ff1_t1.json",A+"lane_t1.json"); cmp(M+"alloff_t1.json",A+"base_t1.json");
cmp(M+"plate.json",A+"lane_plate.json"); cmp(M+"plate.json",A+"base_plate.json"); cmp(M+"t0.json",A+"lane_t0.json"); cmp(M+"t0.json",A+"base_t0.json"); cmp(M+"t2_off.json",A+"base_t2.json");'
