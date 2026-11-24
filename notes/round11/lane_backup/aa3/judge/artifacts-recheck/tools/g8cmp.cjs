const fs=require("fs"); const D=process.argv[2]; const L=(n)=>{try{return JSON.parse(fs.readFileSync(D+"/"+n+".json"));}catch(e){return null;}};
const cmp=(a,b)=>{const A=L(a),B=L(b); if(!A||!B){console.log((a+" vs "+b).padEnd(30),"missing");return;}
 const ks=new Set([...Object.keys(A.programs||{}),...Object.keys(B.programs||{})]); const pd=[...ks].filter(k=>JSON.stringify(A.programs[k])!==JSON.stringify(B.programs[k]));
 const tk=new Set([...Object.keys(A.targets||{}),...Object.keys(B.targets||{})]); const td=[...tk].filter(k=>JSON.stringify(A.targets[k])!==JSON.stringify((B.targets||{})[k]));
 console.log((a+" vs "+b).padEnd(30), "final", A.targets?.final?.hash===B.targets?.final?.hash?"SAME":"DIFF", "| targets", tk.size, "differ:", td.join(",")||"-", "| programs", ks.size, "differ:", pd.join(",")||"-", "| logs", (A.logs||[]).length, (B.logs||[]).length, "| counts", JSON.stringify(A.counts)===JSON.stringify(B.counts)?"same":"diff");};
cmp("lane_t1_off","base_t1"); cmp("lane_t1_taa0","base_t1"); cmp("lane_t1","base_t1"); cmp("lane_plate","base_plate"); cmp("lane_t0","base_t0"); cmp("lane_t2_off","base_t2");
