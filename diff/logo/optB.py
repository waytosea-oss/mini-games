# B: 方形徽章 2x2 —— “眼”“睛”两个目字旁都换成一对卡通大眼睛（一只在放大镜里），像一张机灵的脸
from common import *
import math
W,H=1080,600
drop=lambda b,gb: (b[0]+b[2])/2 < gb[0]+0.25*(gb[2]-gb[0]) and b[2]-b[0] < 0.45*(gb[2]-gb[0])
S=250
chars=[('火',420,170,S,-5),('眼',660,175,S,4),('金',420,410,S,-3),('睛',660,410,S,5)]
D=[];eyes=[]
for c,x,y,s,r in chars:
    d,gb,g=place(KL,c,x,y,s,r,drop=drop if c in '眼睛' else None)
    D.append(d)
    if g:
        xs=[v for _,b in g for v in (b[0],b[2])]; ys=[v for _,b in g for v in (b[1],b[3])]
        eyes.append((c,min(xs),min(ys),max(xs),max(ys)))
extra=[]
for c,x0,y0,x1,y1 in eyes:
    cx=(x0+x1)/2; cy=(y0+y1)/2; w=x1-x0; h=y1-y0
    if c=='眼':
        lr=w*0.62; lcy=y0+lr+4
        extra.append(('mag',cx,lcy,lr,y1))
        D.append(ring(cx,lcy,lr,lr*0.70))
    else:
        extra.append(('eye',cx,cy,w*0.56,h*0.5))
D=' '.join(D)
def eye_oval(cx,cy,rx,ry):
    return f'''<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#fff" stroke="#16306e" stroke-width="12"/>
<clipPath id="ov"><ellipse cx="{cx}" cy="{cy}" rx="{rx-4}" ry="{ry-4}"/></clipPath>
<g clip-path="url(#ov)"><ellipse cx="{cx+rx*0.12}" cy="{cy+ry*0.12}" rx="{rx*0.72}" ry="{ry*0.6}" fill="url(#irB)" stroke="#06204a" stroke-width="4"/>
<ellipse cx="{cx+rx*0.12}" cy="{cy+ry*0.12}" rx="{rx*0.34}" ry="{ry*0.3}" fill="#04102a"/>
<ellipse cx="{cx-rx*0.15}" cy="{cy-ry*0.12}" rx="{rx*0.2}" ry="{ry*0.14}" fill="#fff"/></g>
<path d="M{cx-rx-8} {cy-ry*0.55} Q{cx} {cy-ry*1.6} {cx+rx+8} {cy-ry*0.55}" stroke="#16306e" stroke-width="12" fill="none" stroke-linecap="round"/>'''
ex=''
for e in extra:
    if e[0]=='mag':
        _,cx,cy,lr,yb=e
        HP=handle_path(cx-lr*0.02,cy+lr*0.98,95,(yb-cy)-lr*0.9,38)
        ex+=f'''<path d="{HP}" fill="#fff" stroke="#fff" stroke-width="28" stroke-linejoin="round"/>
<path d="{HP}" fill="url(#gripB)" stroke="#16306e" stroke-width="12" stroke-linejoin="round"/>
<clipPath id="lensB"><circle cx="{cx}" cy="{cy}" r="{lr*0.70+1}"/></clipPath>
<g clip-path="url(#lensB)">{eye(cx,cy,lr*0.70,iris='#7cd44a',iris2='#1f7a2a',look=(0.18,0.1),uid='b')}</g>
<circle cx="{cx}" cy="{cy}" r="{lr*0.70}" fill="none" stroke="#16306e" stroke-width="7"/>'''
    else:
        _,cx,cy,rx,ry=e
        ex+=eye_oval(cx,cy,rx,ry)
rays=''.join(f'<path d="M540 300 L{540+700*math.cos(math.radians(a-5)):.0f} {300+700*math.sin(math.radians(a-5)):.0f} L{540+700*math.cos(math.radians(a+5)):.0f} {300+700*math.sin(math.radians(a+5)):.0f}Z" fill="#fff" opacity=".18"/>' for a in range(0,360,20))
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<radialGradient id="badge" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#ffe86a"/><stop offset=".7" stop-color="#ffb21e"/><stop offset="1" stop-color="#ff7a0a"/></radialGradient>
<linearGradient id="fillB" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="60" y2="540"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#e9f6ff"/><stop offset=".5" stop-color="#bfe4ff"/><stop offset="1" stop-color="#8fd0ff"/></linearGradient>
<linearGradient id="gripB" x1="0" x2="1"><stop offset="0" stop-color="#ff8fb8"/><stop offset=".5" stop-color="#ff3d7f"/><stop offset="1" stop-color="#b0124e"/></linearGradient>
<radialGradient id="irB" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#d8ff9a"/><stop offset=".4" stop-color="#7cd44a"/><stop offset="1" stop-color="#1f6a2a"/></radialGradient>
<clipPath id="bc"><rect x="290" y="20" width="500" height="520" rx="120"/></clipPath>
<filter id="b10" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
<clipPath id="cwB"><path d="{D}"/></clipPath>
</defs>
<rect x="290" y="30" width="500" height="520" rx="120" fill="#5a2000" opacity=".4" filter="url(#b10)"/>
<rect x="290" y="20" width="500" height="520" rx="120" fill="url(#badge)" stroke="#fff" stroke-width="14"/>
<g clip-path="url(#bc)">{rays}</g>
<rect x="290" y="20" width="500" height="520" rx="120" fill="none" stroke="#16306e" stroke-width="6"/>
<path d="{D}" fill="#16306e" stroke="#16306e" stroke-width="40" stroke-linejoin="round" transform="translate(0,14)"/>
<path d="{D}" fill="#16306e" stroke="#16306e" stroke-width="40" stroke-linejoin="round"/>
<path d="{D}" fill="#2e6fe0" stroke="#2e6fe0" stroke-width="20" stroke-linejoin="round"/>
<path d="{D}" fill="url(#fillB)"/>
<g clip-path="url(#cwB)"><path d="{D}" fill="none" stroke="#fff" stroke-width="8" transform="translate(-2,-4)" opacity=".9"/></g>
{ex}
{sparkle(330,70,24)}{sparkle(760,500,22)}{sparkle(770,80,16,'#fff8c0')}
</svg>'''
open('optB.svg','w').write(svg); print('ok',eyes)
