#!/usr/bin/env python3
"""找茬关卡生成器：一张原图 → 改动小图 ×5 ＋ 不同处坐标 ＋ 缩略图，并写入 levels.js。
用法：
  python3 tools/make_level.py 原图.png --name 关卡名 --star 1 [--seed 7] [--out-id 31] [--dry]
  --star 1/2/3 决定改动面积与对比度（1 星大而明显，3 星小而细微）。
产物与游戏现有格式一致：assets/lv/NNa.webp、NNp0..4.webp、assets/th/NN.webp。
生成后跑 measure.py + build_pools.py 即可把新图归入对应星级题库。"""
import argparse,json,os,re,random,colorsys
from PIL import Image, ImageFilter, ImageOps, ImageEnhance, ImageDraw
H=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.join(H,'..')
IW,IH=1152,864
BAND={1:dict(size=(110,170),strength=1.0),2:dict(size=(80,125),strength=0.7),3:dict(size=(55,95),strength=0.45)}
def saliency(img):
    e=img.convert('L').filter(ImageFilter.FIND_EDGES).filter(ImageFilter.BoxBlur(18))
    return e
def pick_boxes(img,band,rnd,n=5):
    sal=saliency(img); lo,hi=band['size']; boxes=[]
    cand=[]
    for _ in range(1500):
        w=rnd.randint(lo,hi); h=int(w*rnd.uniform(.75,1.3))
        x=rnd.randint(8,IW-w-8); y=rnd.randint(8,IH-h-8)
        v=sum(sal.crop((x,y,x+w,y+h)).resize((4,4)).getdata())
        cand.append((v,x,y,w,h))
    cand.sort(reverse=True)
    for v,x,y,w,h in cand:
        cx,cy=x+w/2,y+h/2
        if all(abs(cx-(b[0]+b[2]/2))>(w+b[2])/2+40 or abs(cy-(b[1]+b[3]/2))>(h+b[3])/2+40 for b in boxes):
            boxes.append((x,y,w,h))
        if len(boxes)==n: break
    return boxes
def soft_mask(w,h):
    m=Image.new('L',(w,h),0); d=ImageDraw.Draw(m); k=max(4,min(w,h)//7)
    d.ellipse((k,k,w-k,h-k),fill=255); return m.filter(ImageFilter.GaussianBlur(k*.8))
def alter(patch,kind,s,rnd,img,box):
    if kind=='hue':
        h,sat,v=patch.convert('HSV').split(); sh=int(60+70*s)*rnd.choice([-1,1])
        h=h.point(lambda p:(p+sh)%256); return Image.merge('HSV',(h,sat,v)).convert('RGB')
    if kind=='flip': return ImageOps.mirror(patch)
    if kind=='erase':  # 用四周颜色抹掉物体
        w,h=patch.size; small=patch.resize((3,3),Image.BILINEAR).resize((w,h),Image.BICUBIC)
        return Image.blend(patch,small.filter(ImageFilter.GaussianBlur(6)),min(1,.55+.45*s))
    if kind=='bright': return ImageEnhance.Brightness(patch).enhance(1-.45*s if rnd.random()<.5 else 1+.5*s)
    if kind=='clone':  # 从图中别处搬一块过来
        x,y,w,h=box; sx=rnd.randint(0,IW-w); sy=rnd.randint(0,IH-h)
        return img.crop((sx,sy,sx+w,sy+h))
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('--name',required=True)
    ap.add_argument('--star',type=int,default=1); ap.add_argument('--seed',type=int,default=1)
    ap.add_argument('--out-id',type=int); ap.add_argument('--dry',action='store_true'); ap.add_argument('--outdir')
    a=ap.parse_args(); rnd=random.Random(a.seed); band=BAND[a.star]
    img=ImageOps.fit(Image.open(a.src).convert('RGB'),(IW,IH),Image.LANCZOS)
    jsf=os.path.join(ROOT,'levels.js'); src=open(jsf,encoding='utf8').read()
    LV=json.loads(re.search(r'window.LEVELS=(\[.*\]);',src,re.S).group(1))
    nid=a.out_id or len(LV)+1
    out=a.outdir or os.path.join(ROOT,'assets'); os.makedirs(out+'/lv',exist_ok=True); os.makedirs(out+'/th',exist_ok=True)
    kinds=['hue','erase','flip','bright','clone']; rnd.shuffle(kinds)
    boxes=pick_boxes(img,band,rnd); ds=[]; B=img.copy()
    for k,(x,y,w,h) in enumerate(boxes):
        p=img.crop((x,y,x+w,y+h)); q=alter(p,kinds[k],band['strength'],rnd,img,(x,y,w,h))
        rgba=q.convert('RGBA'); rgba.putalpha(soft_mask(w,h))
        rgba.save(f'{out}/lv/{nid:02d}p{k}.webp',quality=88); B.paste(rgba,(x,y),rgba)
        ds.append({'x':round((x+w/2)/IW,4),'y':round((y+h/2)/IH,4),'r':round(max(0.0295,min(w,h)/2/IW),4),'p':[x,y],'s':[w,h],'k':kinds[k]})
    img.save(f'{out}/lv/{nid:02d}a.webp',quality=86); img.resize((240,180),Image.LANCZOS).save(f'{out}/th/{nid:02d}.webp',quality=80)
    # 预览：左原图右改图并圈出不同
    pv=Image.new('RGB',(IW*2+12,IH),'white'); pv.paste(img,(0,0)); pv.paste(B,(IW+12,0)); d=ImageDraw.Draw(pv)
    for e in ds: x,y=e['p'];w,h=e['s']; d.rectangle((IW+12+x,y,IW+12+x+w,y+h),outline=(255,40,40),width=4)
    pv.save(f'{out}/preview_{nid:02d}.jpg',quality=80)
    entry={'n':a.name,'d':[{k:v for k,v in e.items() if k!='k'} for e in ds]}
    print(json.dumps({'id':nid,'kinds':kinds,'entry':entry},ensure_ascii=False))
    if not a.dry:
        LV.append(entry) if nid==len(LV)+1 else LV.__setitem__(nid-1,entry)
        src=re.sub(r'window.LEVELS=\[.*\];',lambda m:'window.LEVELS='+json.dumps(LV,ensure_ascii=False,separators=(',',':'))+';',src,flags=re.S)
        open(jsf,'w',encoding='utf8').write(src)
main()
