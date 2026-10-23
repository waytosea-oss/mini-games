const L=require('../logic.js');
const N=+process.argv[2]||20;
let res=[];
for(let g=0;g<N;g++){
  const rnd=L.mulberry(1000+g); const s=L.newState(); let steps=0, stageAt=[], deals=0; let goal=0; let lastDeal=0;
  // temp row on
  while(steps<200000){
    const m=L.botStep(s); if(!m){break;}
    if(m.type==='merge'){L.merge(s);} else if(m.type==='move'){L.move(s,m.a,m.b);} else {L.deal(s,rnd);deals++;}
    steps++;
    if(goal<L.GOALS.length && s.top>=L.GOALS[goal]){stageAt.push(deals);goal++; if(goal===1){s.rows[9].st='tempOn';}}
    if(goal>=L.GOALS.length)break;
  }
  res.push({g,top:s.top,deals,stageAt:stageAt.join(','),merges:s.merges});
}
for(const r of res)console.log(JSON.stringify(r));
