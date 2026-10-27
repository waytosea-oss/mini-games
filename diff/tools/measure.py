# 测量全部找茬题（1–30 原题 + 31–60 再探题）的难度：每处不同的面积、对比度，输出 tools/difficulty.json
import json,re,os
from PIL import Image, ImageChops, ImageStat
H=os.path.dirname(os.path.abspath(__file__)); A=os.path.join(H,'..','assets','lv')
src=open(os.path.join(H,'..','levels.js'),encoding='utf8').read()
LV=json.loads(re.search(r'window.LEVELS=(\[.*\]);',src,re.S).group(1))
out=[]
for i,L in enumerate(LV):
    base=Image.open(f'{A}/{L.get("b",i+1):02d}a.webp').convert('RGB')
    ds=[]
    for k,d in enumerate(L['d']):
        p=Image.open(f'{A}/{i+1:02d}p{k}.webp').convert('RGBA')
        x,y=d['p']; w,h=d['s']
        reg=base.crop((x,y,x+w,y+h)).resize(p.size)
        comp=reg.copy(); comp.paste(p,(0,0),p)
        diff=ImageChops.difference(reg,comp).convert('L')
        px=list(diff.getdata()); ch=[v for v in px if v>24]
        area=len(ch)/(1152*864)*100   # 改动像素占全图百分比
        con=(sum(ch)/len(ch)) if ch else 0
        ds.append({'area':round(area,3),'con':round(con,1)})
    # 单处“可见度”= 面积^0.5 * 对比度；难度=越不可见越难
    vis=[ (d['area']**0.5)*d['con'] for d in ds]
    hard=sum(1/(v+1) for v in vis)*100
    out.append({'id':i+1,'n':L['n'],'diffs':ds,'minVis':round(min(vis),1),'meanArea':round(sum(d['area'] for d in ds)/5,3),'meanCon':round(sum(d['con'] for d in ds)/5,1),'score':round(hard,2)})
json.dump(out,open(os.path.join(H,'difficulty.json'),'w'),ensure_ascii=False,indent=1)
for o in sorted(out,key=lambda o:o['score']): print(o['id'],o['n'],o['score'],o['meanArea'],o['meanCon'],o['minVis'])
