require('../levels.js'); const LV=globalThis.LV;
for(const n of [5,6,8,9,10,12,13,15,16,18,21,22,23,25,27,28]){const lv=LV.generate(n);let g=n+' '+lv.shape+'\n';for(let y=0;y<lv.R;y++){for(let x=0;x<lv.C;x++)g+=lv.mask[y*lv.C+x]?'█':'·';g+='\n'}console.log(g)}
