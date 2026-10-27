const P=require('../logic.js');const L=require(process.argv[2]||'../levels.js');
let seed=7;const rand=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
function greedy(lv,runs){let ok=0;for(let r=0;r<runs;r++){const s=P.mkState(lv);P.initCounter(s,lv.K);P.deliverAll(s);let last=null,st=0;while(!P.isWin(s)&&st<200){let ms=P.moves(s,true).filter(m=>!(last&&m[0]===last[1]&&m[1]===last[0]));if(!ms.length)break;const sc=ms.map(([a,b])=>{let v=rand()*2.2;if(s.t[b].u.length)v+=2;if(s.t[a].u.length===P.topRun(s.t[a]))v-=1;return v});let bi=0;for(let i=1;i<ms.length;i++)if(sc[i]>sc[bi])bi=i;last=ms[bi];P.pour(s,...ms[bi]);P.deliverAll(s);st++}if(P.isWin(s))ok++}return ok/runs}
console.log(L.map((l,i)=>(i+1)+':'+greedy(l,100).toFixed(2)).join(' '))
