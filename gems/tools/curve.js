// 宝石大盗 60 关难度曲线：生成→确定性求解器验证→带噪声玩家 40 次的通关率
const GEN=require('../gen.js');const out=[];
function mul(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const N=+process.argv[2]||60, A=+process.argv[3]||1;
for(let n=A;n<=N;n++){const t=Date.now();const lv=GEN.genLevel(n);if(!lv){out.push({n,fail:1});console.error(n,'FAIL');continue}
 const r=GEN.simulate(lv,lv.cfg.cap);let w=0;for(let k=0;k<40;k++){const q=GEN.simulate(lv,lv.cfg.cap,{rnd:mul(k*31+n),noise:900});if(q.ok)w++}
 const cov=lv.gems.reduce((a,g)=>a+g.cov.length,0)/lv.gems.length;
 const o={n,gems:lv.gems.length,panels:lv.panels.length,K:lv.cfg.K,solv:r.ok,peak:r.peak,noisyWin:w/40,cov:+cov.toFixed(2),ms:Date.now()-t};out.push(o);console.error(Object.values(o).join(' '))}
if(process.argv[4]==='json')console.log(JSON.stringify(out));
