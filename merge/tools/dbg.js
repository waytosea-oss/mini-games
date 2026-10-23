const L=require('../logic.js');const rnd=L.mulberry(1000);const s=L.newState();let n=0;
while(n<10000){const m=L.botStep(s);if(!m)break;if(m.type==='merge'){L.merge(s);console.log('MERGE')}else if(m.type==='move')L.move(s,m.a,m.b);else{L.deal(s,rnd);console.log('DEAL top',s.top, L.dealWindow(s));console.log(s.rows.map((r,i)=>i+' '+r.st+' '+r.t.join('')).join('\n'))}n++;}
console.log('END');console.log(s.rows.map((r,i)=>i+' '+r.st+' '+r.t.join('')).join('\n'))
