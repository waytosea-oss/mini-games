// 快挪车 60 关难度曲线：每关生成→贪心求解验证有解→综合难度分
require('../levels.js'); const LV=globalThis.LV; const out=[];
for(let n=1;n<=LV.COUNT;n++){const lv=LV.generate(n);const s=LV.solve(lv);
 const cl=lv.cars.filter(c=>c.clamp).length, N=lv.cars.length;
 const D=lv.depth*2+cl*1.2+N/8+(1-lv.freeNow/N)*6+lv.obs.length*.3;
 out.push({n,size:lv.C+'x'+lv.R,shape:lv.shape,cars:N,depth:lv.depth,clamp:cl,obs:lv.obs.length,freeNow:lv.freeNow,solvable:!!s,D:+D.toFixed(1)});}
if(process.argv[2]==='json')console.log(JSON.stringify(out));else out.forEach(o=>console.log(Object.values(o).join(' ')));
