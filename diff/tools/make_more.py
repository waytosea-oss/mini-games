#!/usr/bin/env python3
"""第 31–60 题（四/五/六星题库）生成：复用 1–30 题原图，重新挑 5 处改动。
对每张图在多组（改动尺寸 × 强度 × 种子）里搜索，按 measure.py 同一公式算难度分，
挑最接近目标分的一组，并要求每处改动的可见度 ≥ MINVIS（保证肉眼可找、关卡可解）。
目标分沿 1–30 题的实测曲线平滑延伸：四星≈18、五星≈21、六星≈24（三星池均值≈16）。"""
import json,re,os,random,sys
from PIL import Image,ImageChops
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import importlib.util
spec=importlib.util.spec_from_file_location('ml',os.path.join(os.path.dirname(os.path.abspath(__file__)),'make_level.py'))
src_ml=open(spec.origin,encoding='utf8').read().replace('\nmain()\n','\n')
ml={'__file__':spec.origin};exec(compile(src_ml,'make_level','exec'),ml)
H=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.join(H,'..');A=os.path.join(ROOT,'assets','lv')
IW,IH=ml['IW'],ml['IH']
MINVIS=9.0
TARGET={0:[17.0,19.5],1:[19.5,22.5],2:[22.5,26.0]}
def score(img,patches,boxes):
    vis=[]
    for p,(x,y,w,h) in zip(patches,boxes):
        reg=img.crop((x,y,x+w,y+h)); comp=reg.copy(); comp.paste(p,(0,0),p)
        d=ImageChops.difference(reg,comp).convert('L'); px=d.tobytes(); ch=[v for v in px if v>24]
        area=len(ch)/(IW*IH)*100; con=(sum(ch)/len(ch)) if ch else 0
        vis.append((area**.5)*con)
    return sum(1/(v+1) for v in vis)*100,min(vis)
def build(img,size,strength,seed):
    rnd=random.Random(seed); band=dict(size=size,strength=strength)
    kinds=['hue','erase','flip','bright','clone']; rnd.shuffle(kinds)
    boxes=ml['pick_boxes'](img,band,rnd); pats=[]
    if len(boxes)<5: return None
    for k,(x,y,w,h) in enumerate(boxes):
        p=img.crop((x,y,x+w,y+h)); q=ml['alter'](p,kinds[k],strength,rnd,img,(x,y,w,h))
        rgba=q.convert('RGBA'); rgba.putalpha(ml['soft_mask'](w,h)); pats.append(rgba)
    return boxes,pats,kinds
def main():
    jsf=os.path.join(ROOT,'levels.js'); s=open(jsf,encoding='utf8').read()
    LV=json.loads(re.search(r'window.LEVELS=(\[.*\]);',s,re.S).group(1))[:30]
    P=json.loads(re.search(r'window.POOLS=(\[.*\]);',open(os.path.join(ROOT,'pools.js'),encoding='utf8').read(),re.S).group(1))[:3]
    log=[]
    nid=31
    for b,pool in enumerate(P):
        lo,hi=TARGET[b]
        for k,i in enumerate(pool['ids']):
            img=Image.open(f'{A}/{i:02d}a.webp').convert('RGB'); best=None
            tgt=lo+(hi-lo)*k/9
            for size in [(80,125),(70,112),(62,100),(56,92),(50,84)]:
                for st in [.7,.6,.52,.45,.4]:
                    for sd in range(3):
                        r=build(img,size,st,nid*100+sd*7+int(st*100)+size[0])
                        if not r: continue
                        sc,mv=score(img,r[1],r[0])
                        if mv<MINVIS: continue
                        d=abs(sc-tgt)
                        if not best or d<best[0]: best=(d,sc,mv,size,st,r)
                if best and best[0]<.6: break
            d,sc,mv,size,st,(boxes,pats,kinds)=best
            ds=[]
            for kk,((x,y,w,h),p) in enumerate(zip(boxes,pats)):
                p.save(f'{A}/{nid:02d}p{kk}.webp',quality=88)
                ds.append({'x':round((x+w/2)/IW,4),'y':round((y+h/2)/IH,4),'r':round(max(0.0295,min(w,h)/2/IW),4),'p':[x,y],'s':[w,h]})
            LV.append({'n':LV[i-1]['n']+'·再探','d':ds,'b':i})
            log.append((nid,i,round(tgt,1),round(sc,2),round(mv,1),size,st)); print(log[-1],flush=True)
            nid+=1
    s=re.sub(r'window.LEVELS=\[.*\];',lambda m:'window.LEVELS='+json.dumps(LV,ensure_ascii=False,separators=(',',':'))+';',s,flags=re.S)
    open(jsf,'w',encoding='utf8').write(s)
main()
