// 花瓣消消 60 关：强机器人 3 局通关时长 + 弱机器人 6 局通关率
const G=require('./gen.js'),SIM=require('../sim.js'),LEVELS=require('../levels.js');
const out=LEVELS.map((L,i)=>{const lv={W:96,H:96,grid:SIM.decodeGrid(L.grid,96*96),cols:L.cols,slots:L.slots,columns:L.columns.map(c=>c.map(b=>({c:b[0],cap:b[1],hid:b[2]&1,lock:b[2]&2,key:b[2]&4,frost:b[3]})))};
 const rs=[1,2,3].map(s=>G.runBot(lv,s));const wk=[11,12,13,14,15,16].map(s=>G.runBot(lv,s,true)).filter(x=>x.win).length;
 return {n:i+1,win:rs.filter(x=>x.win).length,t:rs.reduce((a,x)=>a+x.t,0)/180,weak:wk/6};});
console.log(JSON.stringify(out));
