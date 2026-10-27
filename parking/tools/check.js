require('../levels.js'); const LV=globalThis.LV;
for(let n=1;n<=30;n++){const t=Date.now();const lv=LV.generate(n);const s=LV.solve(lv);
const c3=lv.cars.filter(c=>c.len==3).length,c1=lv.cars.filter(c=>c.len==1).length,rv=lv.cars.filter(c=>c.rev).length,cl=lv.cars.filter(c=>c.clamp).length;
console.log(n,lv.C+'x'+lv.R,lv.shape.padEnd(9),'cars',lv.cars.length,'big',c3,'one',c1,'rev',rv,'clamp',cl,'depth',lv.depth,'obs',lv.obs.length,'fill',lv.fill.toFixed(2),'freeNow',lv.freeNow,'solv',!!s,(Date.now()-t)+'ms');
if(n==8||n==1){let g='';for(let y=0;y<lv.R;y++){for(let x=0;x<lv.C;x++){const i=y*lv.C+x;let ch=lv.mask[i]?'.':' ';for(const o of lv.obs)if(o.x==x&&o.y==y)ch='#';for(const c of lv.cars)for(const [a,b] of c.cells)if(a==x&&b==y)ch=(a==c.x&&b==c.y)?'^>v<'[c.d]:String.fromCharCode(97+c.id%26);g+=ch}g+='\n'}console.log(g)}}
