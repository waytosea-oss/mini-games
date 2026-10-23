# A: 金漆糖果字 — 一 = 一条翠竹, 合 的「口」= 白板牌(白板的蓝框本身就是个口, 呼应"合到白板"), 背后扇形麻将牌 + 金光
from common import *
W,H=1080,600
S=245; Y=330
ys=[]
# 合 split
hc=contours(RHR,'合',418,Y,S)
roof=' '.join(d for d,b in hc if b[1]<Y-10)
kou=[b for d,b in hc if b[1]>=Y-10]; kx0=min(b[0] for b in kou); ky0=min(b[1] for b in kou); kx1=max(b[2] for b in kou); ky1=max(b[3] for b in kou)
D=' '.join([roof, place(RHR,'到',672,Y,S)[0], place(RHR,'底',922,Y+4,S,3)[0]])
y0,y1=Y-165,Y+165
# 一 as bamboo
yi=place(RHR,'一',165,Y,S)[1]; yi=(yi[0]*.92,yi[1])
bam_t=64
bam=f'''<g transform="rotate(-6 165 {Y})">
<rect x="{165-yi[0]/2-25}" y="{Y-bam_t/2-25}" width="{yi[0]+50}" height="{bam_t+50}" rx="{bam_t/2+25}" fill="#fff7dc"/>
<rect x="{165-yi[0]/2-25}" y="{Y-bam_t/2-19}" width="{yi[0]+50}" height="{bam_t+50}" rx="{bam_t/2+25}" fill="#fff7dc"/>
<rect x="{165-yi[0]/2-12}" y="{Y-bam_t/2+2}" width="{yi[0]+24}" height="{bam_t+24}" rx="{bam_t/2+12}" fill="{OUT}"/>
{bamboo_h(165-yi[0]/2,165+yi[0]/2,Y,bam_t,nodes=2,ow=12)}
<path d="M{165+18} {Y-bam_t/2+4} q 10 -52 62 -66 q -6 40 -50 70 z" fill="url(#bamboo)" stroke="{OUT}" stroke-width="8" stroke-linejoin="round"/>
</g>'''
# 白板 tile as 口
tw=kx1-kx0+30; th=ky1-ky0+30; tcx=(kx0+kx1)/2; tcy=(ky0+ky1)/2+6
face=f'''<rect x="{tcx-tw*.32}" y="{tcy-th*.3}" width="{tw*.64}" height="{th*.6}" rx="8" fill="none" stroke="#2456b8" stroke-width="10"/>
<rect x="{tcx-tw*.22}" y="{tcy-th*.17}" width="{tw*.44}" height="{th*.34}" rx="4" fill="none" stroke="#2456b8" stroke-width="5"/>'''
kouTile=f'''<rect x="{tcx-tw/2-18}" y="{tcy-th/2-18}" width="{tw+36}" height="{th+36+th*.16}" rx="{tw*.2}" fill="#fff7dc"/>'''+tile(tcx,tcy,tw,th,0,face,ow=11)
zh=place(RHR,'中',0,0,60)[0]
def fface(k,x,y):
    if k==0: return tong(x,y,30)
    if k==1: return f'<path d="{place(RHR,"中",x,y,64)[0]}" fill="#d8261c"/>'
    return f'<path d="{place(WK,"發",x,y,66)[0]}" fill="#14874a"/>'
fan=''.join(tile(x,y,88,116,r,fface(k,x,y),ow=7) for k,(x,y,r) in enumerate([(818,168,-16),(900,146,0),(982,168,16)]))
sp=''.join(f'<path d="M{x} {y-s} Q{x} {y} {x+s} {y} Q{x} {y} {x} {y+s} Q{x} {y} {x-s} {y} Q{x} {y} {x} {y-s}Z" fill="#fffbe0"/>' for x,y,s in [(600,150,22),(1050,330,16),(60,230,18),(330,500,12)])
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>{DEFS.format(y0=y0,y1=y1)}</defs>
<ellipse cx="540" cy="330" rx="520" ry="250" fill="url(#glow)" opacity=".55"/>
{fan}
{letters(D,y0,y1,idn='a')}
{bam}
{kouTile}
{sp}
</svg>'''
open('optA.svg','w').write(svg); print('ok')
