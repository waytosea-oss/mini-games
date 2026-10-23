# C: 翡翠玉字 + 金边 — 一 = 竹节, 合 的「口」= 一筒圆饼(圆满之意), 右下朱红印章「雀」, 底 下垫一排牌
from common import *
W,H=1080,600
S=250; Y=300
hc=contours(RHR,'合',418,Y,S)
roof=' '.join(d for d,b in hc if b[1]<Y-10)
kou=[b for d,b in hc if b[1]>=Y-10]; kx0=min(b[0] for b in kou); ky0=min(b[1] for b in kou); kx1=max(b[2] for b in kou); ky1=max(b[3] for b in kou)
D=' '.join([roof, place(RHR,'到',672,Y,S)[0], place(RHR,'底',922,Y,S)[0]])
y0,y1=Y-130,Y+130
yi=place(RHR,'一',165,Y,S)[1]; L=yi[0]*.92; t=62
bam=f'''<g transform="rotate(-5 165 {Y})">
<rect x="{165-L/2-25}" y="{Y-t/2-25}" width="{L+50}" height="{t+50}" rx="{t/2+25}" fill="#ffcf4a" stroke="#7a4a10" stroke-width="5"/>
<rect x="{165-L/2-12}" y="{Y-t/2-12+8}" width="{L+24}" height="{t+24}" rx="{t/2+12}" fill="{OUT}"/>
{bamboo_h(165-L/2,165+L/2,Y,t,nodes=2,ow=12)}</g>'''
cx=(kx0+kx1)/2; cy=(ky0+ky1)/2+4; r=(ky1-ky0)/2+14
med=f'''<circle cx="{cx}" cy="{cy}" r="{r+24}" fill="#ffcf4a" stroke="#7a4a10" stroke-width="5"/><circle cx="{cx}" cy="{cy+8}" r="{r+12}" fill="{OUT}"/><circle cx="{cx}" cy="{cy}" r="{r+12}" fill="{OUT}"/>{tong(cx,cy,r)}
<path d="M{cx-r*.62} {cy-r*.45} A{r*.8} {r*.8} 0 0 1 {cx+r*.1} {cy-r*.8}" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".6"/>'''
row=''.join(tile(x,505,74,60,0,'',depth=14,ow=6) for x in range(560,1040,80))
seal=f'''<g transform="rotate(8 1000 140)"><rect x="950" y="90" width="100" height="100" rx="14" fill="url(#red)" stroke="#5a0606" stroke-width="6"/>
<rect x="960" y="100" width="80" height="80" rx="8" fill="none" stroke="#ffe0c0" stroke-width="3"/><path d="{place(MS,'雀',1000,140,74)[0]}" fill="#fff3e0"/></g>'''
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>{DEFS.format(y0=y0,y1=y1)}</defs>
<ellipse cx="540" cy="320" rx="520" ry="240" fill="url(#glow)" opacity=".5"/>
{row}
{letters(D,y0,y1,fill='url(#jade)',rim='#ffcf4a',low='#023a1e',idn='c')}
<path d="{D}" fill="none" stroke="#7a4a10" stroke-width="54" stroke-linejoin="round" opacity="0"/>
{bam}{med}{seal}
</svg>'''
open('optC.svg','w').write(svg); print('ok')
