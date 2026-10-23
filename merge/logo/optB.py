# B: 四张大麻将牌一字排开(像"开杠")，每张牌面刻一个字，配色仿牌面: 一=翠绿(条), 合=朱红(中), 到=藏青(万/风), 底=翠绿(發); 牌顶金冠
from common import *
W,H=1080,600
cols=[('#14874a','#05582f'),('#d8261c','#7a0a0a'),('#1a3f8a','#0a1f50'),('#14874a','#05582f')]
tiles=''; faces=[]
pos=[(150,330,-7),(410,312,-2),(670,312,2),(930,330,7)]
for i,(ch,(x,y,r)) in enumerate(zip('一合到底',pos)):
    c,dk=cols[i]
    gd=place(RHR,ch,x,y-6,196)[0]
    face=f'''<path d="{gd}" fill="{dk}" transform="translate(0,4)" opacity=".5"/><path d="{gd}" fill="{c}"/>
<path d="{gd}" fill="none" stroke="#fff" stroke-width="2" opacity=".35" transform="translate(-1,-2)"/>'''
    if ch=='一': face=bamboo_h(x-88,x+88,y-6,44,nodes=2,ow=7)
    tiles+=f'<g>{tile(x,y,236,300,r,face,ow=12)}</g>'
# outer cream rim behind all tiles
rim=''.join(f'<rect x="{x-118-22}" y="{y-150-22}" width="{236+44}" height="{300+44+40}" rx="56" fill="#fff7dc" transform="rotate({r} {x} {y})"/>' for x,y,r in pos)
crown=f'''<g transform="translate(410,150) rotate(-8)">
<path d="M-62 30 L-72 -34 L-30 0 L0 -50 L30 0 L72 -34 L62 30 Z" fill="url(#goldo)" stroke="{OUT}" stroke-width="9" stroke-linejoin="round"/>
<rect x="-64" y="24" width="128" height="22" rx="8" fill="url(#goldo)" stroke="{OUT}" stroke-width="9"/>
<circle cx="0" cy="-52" r="11" fill="#d8261c" stroke="{OUT}" stroke-width="6"/><circle cx="-72" cy="-36" r="9" fill="#2fd07a" stroke="{OUT}" stroke-width="6"/><circle cx="72" cy="-36" r="9" fill="#2fd07a" stroke="{OUT}" stroke-width="6"/></g>'''
sp=''.join(f'<path d="M{x} {y-s} Q{x} {y} {x+s} {y} Q{x} {y} {x} {y+s} Q{x} {y} {x-s} {y} Q{x} {y} {x} {y-s}Z" fill="#fffbe0"/>' for x,y,s in [(560,120,22),(1050,190,16),(40,200,18),(300,520,12),(800,520,14)])
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>{DEFS.format(y0=150,y1=480)}</defs>
<ellipse cx="540" cy="330" rx="520" ry="250" fill="url(#glow)" opacity=".5"/>
{rim}{tiles}{crown}{sp}
</svg>'''
open('optB.svg','w').write(svg); print('ok')
