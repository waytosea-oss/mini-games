// 难度曲线体检：机器人（不用道具）跑 N 局，统计每关到达率与每关所需发牌次数
// 用法：node curve.js [N] [GOALS逗号] [MILE json]
const L=require('../logic.js');
const N=+process.argv[2]||300;
if(process.argv[3]) { const g=process.argv[3].split(',').map(Number); L.GOALS.length=0; L.GOALS.push(...g); }
if(process.argv[4]) { const m=JSON.parse(process.argv[4]); for(const k in L.MILE) delete L.MILE[k]; Object.assign(L.MILE,m); }
const G=L.GOALS, reach=new Array(G.length+1).fill(0), cost=G.map(()=>[]);
for(let g=0;g<N;g++){
  const rnd=L.mulberry(1000+g), s=L.newState(); let deals=0, st=0, last=0;
  for(let steps=0;steps<300000&&st<G.length;steps++){
    const m=L.botStep(s); if(!m) break;
    if(m.type==='merge') L.merge(s); else if(m.type==='move') L.move(s,m.a,m.b); else {L.deal(s,rnd);deals++;}
    while(st<G.length && s.top>=G[st]){ cost[st].push(deals-last); last=deals; st++; reach[st]++; if(st===1) s.rows[9].st='tempOn'; }
  }
}
const med=a=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y);return b[b.length>>1];};
console.log(JSON.stringify({goals:G,reach:reach.slice(1).map(r=>+(r/N*100).toFixed(1)),dealsMed:cost.map(med)}));
