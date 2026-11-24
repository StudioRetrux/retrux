#!/bin/zsh
# G8 for AA5a: switch off == AA3 (AA3 builder's ident JSONs, same tool / path / frames), all off == BASE, plate / T0 / T2 == BASE
cd /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work5/aa5a
A=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/ident/g8
run() { node tools/ident.mjs "$@" > /dev/null; }
run --port 5193 --qs "lkglide=0" --out ident/lane_t1_glide0.json
run --port 5193 --out ident/lane_t1.json
run --port 5193 --qs "aaresolve=0&slabflash=0&lktaa=0" --out ident/lane_t1_off.json
run --port 5193 --qs "aaresolve=0&slabflash=0&lktaa=0&lkglide=0" --out ident/lane_t1_alloff.json
run --port 5193 --qs "envlake=plate" --out ident/lane_plate.json
run --port 5193 --mobile --out ident/lane_t0.json
run --port 5193 --tier T2 --qs "aaresolve=0&slabflash=0&lktaa=0" --out ident/lane_t2_off.json
node -e '
const fs=require("fs"); const L=(p)=>JSON.parse(fs.readFileSync(p));
const A="'$A'/", M="ident/";
const cmp=(a,b)=>{const X=L(a),Y=L(b); const ks=new Set([...Object.keys(X.programs||{}),...Object.keys(Y.programs||{})]); const pd=[...ks].filter(k=>JSON.stringify(X.programs[k])!==JSON.stringify(Y.programs[k]));
 const td=Object.keys(X.targets||{}).filter(k=>JSON.stringify(X.targets[k])!==JSON.stringify((Y.targets||{})[k]));
 console.log((a.split("/").pop()+" vs "+b.split("/").slice(-2).join("/")).padEnd(52), "final", X.targets?.final?.hash===Y.targets?.final?.hash?"SAME":"DIFF", "| targets differ:", td.join(",")||"-", "| programs", ks.size, "differ:", pd.join(",")||"-", "| logs", (X.logs||[]).length, (Y.logs||[]).length);};
cmp(M+"lane_t1_glide0.json", A+"lane_t1.json");
cmp(M+"lane_t1.json", A+"lane_t1.json");
cmp(M+"lane_t1_off.json", A+"base_t1.json");
cmp(M+"lane_t1_alloff.json", A+"base_t1.json");
cmp(M+"lane_plate.json", A+"base_plate.json");
cmp(M+"lane_t0.json", A+"base_t0.json");
cmp(M+"lane_t2_off.json", A+"base_t2.json");'
