// 为每关挑生成种子偏移（salt），让「带噪声玩家」通关率贴合平滑目标曲线，消除难度断崖。
// 1–30 关只在偏离目标 > 0.25 时才换种子（尽量保留原关卡）；31–60 关全部按目标挑选。
// 用法：node tools/pick_salt.js > /tmp/salt.json ，再写回 gen.js 的 SALT 表
const GEN=require('../gen.js');
function mul(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const tgt=n=>n<=5?1:n<=30?1-(n-5)/25*0.5:0.5-(n-30)/30*0.38;
const rate=(lv,n)=>{let w=0;for(let k=0;k<60;k++)if(GEN.simulate(lv,lv.cfg.cap,{rnd:mul(k*31+n),noise:900}).ok)w++;return w/60};
const S=[];
for(let n=1;n<=60;n++){
  const base=GEN.genLevel(n,0), r0=rate(base,n);
  if(n<=30&&Math.abs(r0-tgt(n))<=0.25){S.push(0);console.error(n,'keep',r0.toFixed(2),tgt(n).toFixed(2));continue}
  let best=[Math.abs(r0-tgt(n)),0,r0];
  for(let s=1;s<=14&&best[0]>0.05;s++){const lv=GEN.genLevel(n,s);if(!lv)continue;const r=rate(lv,n);const d=Math.abs(r-tgt(n));if(d<best[0])best=[d,s,r]}
  S.push(best[1]);console.error(n,'salt',best[1],best[2].toFixed(2),tgt(n).toFixed(2));
}
console.log(JSON.stringify(S));
