# Option A: 车漆糖果字 — glossy taxi-yellow letters, 车 gets real wheels (it IS a car), "！" is a traffic light, speed lines, escaping taxi, blue P road-sign subtitle
import math
from common import *
random.seed(3)
W,H=1080,760
chars=[('快',215,330,300,-5),('挪',512,318,300,0),('车',800,330,300,4)]
P=[place(RHR,c,x,y,s,r) for c,x,y,s,r in chars]
D=' '.join(p[0] for p in P)
y0,y1=170,480
bang=tlight(992,305,190,62)
dot=wheel(992,458,27)
speed=''.join(f'<path d="M{x} {y} H{x+l}" stroke="#fff" stroke-width="{t}" stroke-linecap="round"/>' for x,y,l,t in [(30,250,64,14),(20,320,50,12),(36,390,58,14)])
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>{DEFS.format(y0=y0,y1=y1)}<clipPath id="cw"><path d="{D}"/></clipPath>
<mask id="hiM" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#fff"/><path d="{D}" fill="#000" transform="translate(3,9)"/></mask>
<mask id="loM" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#fff"/><path d="{D}" fill="#000" transform="translate(-2,-10)"/></mask></defs>
<g stroke="#0b1630" stroke-width="22" stroke-linecap="round">{speed.replace('stroke="#fff" ','')}</g>{speed}
<path d="{D}" fill="#0b1630" stroke="#0b1630" stroke-width="58" stroke-linejoin="round" transform="translate(0,22)" opacity=".45" filter="url(#blur8)"/>
<path d="{D}" fill="#fff" stroke="#fff" stroke-width="50" stroke-linejoin="round" transform="translate(0,6)"/>
<path d="{D}" fill="#fff" stroke="#fff" stroke-width="50" stroke-linejoin="round"/>
<path d="{D}" fill="#0b1630" stroke="#0b1630" stroke-width="24" stroke-linejoin="round" transform="translate(0,14)"/>
<path d="{D}" fill="#0b1630" stroke="#0b1630" stroke-width="24" stroke-linejoin="round"/>
<path d="{D}" fill="url(#paint)"/>
<g clip-path="url(#cw)">
 <rect width="{W}" height="{H}" fill="#c43c00" opacity=".6" mask="url(#loM)"/>
 <rect width="{W}" height="{H}" fill="#fffde8" opacity=".95" mask="url(#hiM)"/>
 <path d="M0 {y0} H{W} V{y0+95} Q540 {y0+150} 0 {y0+95} Z" fill="url(#gloss)" opacity=".55"/>
 {''.join(f'<rect x="{x}" y="0" width="22" height="{H}" fill="#fff" opacity=".18" transform="rotate(25 {x} 300)"/>' for x in (260,560,860))}
</g>
<!-- taxi checker band across 车 -->
{wheel(694,474,33)}{wheel(904,474,33)}
{bang}{dot}
{img('taxi',612,105,74,140,62)}
<path d="M548 150 l-70 34 M566 178 l-56 27" stroke="#0b1630" stroke-width="15" stroke-linecap="round"/><path d="M548 150 l-70 34 M566 178 l-56 27" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
{img('cone',80,520,82,96,-10)}
{subplate(540,640,720,124)}
</svg>'''
open('optA.svg','w').write(svg); print('ok')
