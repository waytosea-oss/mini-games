# C: 得意黑斜体，速度感；一枚放大镜悬在“金”上，镜中“金”被放大成闪亮金币色；“睛”的目字旁换成眨眼
from common import *
W,H=1080,600
S=300
chars=[('火',190,300,S,0),('眼',415,300,S,0),('金',640,300,S,0),('睛',865,300,S,0)]
D=' '.join(place(SM,c,x,y,s,r)[0] for c,x,y,s,r in chars)
Dz=place(SM,'金',640,296,S*1.08)[0]
lcx,lcy,lr=640,298,150
HP=handle_path(lcx+lr*0.74,lcy+lr*0.74,42,120,46)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<linearGradient id="fC" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="140" y2="460"><stop offset="0" stop-color="#7ff0ff"/><stop offset=".5" stop-color="#27a8ff"/><stop offset="1" stop-color="#1446d8"/></linearGradient>
<linearGradient id="gC" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="110" y2="480"><stop offset="0" stop-color="#fffbd0"/><stop offset=".35" stop-color="#ffe04a"/><stop offset=".7" stop-color="#ffa412"/><stop offset="1" stop-color="#d45a00"/></linearGradient>
<linearGradient id="rimC" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff6c0"/><stop offset=".5" stop-color="#ffc21e"/><stop offset="1" stop-color="#b26200"/></linearGradient>
<linearGradient id="hC" x1="0" x2="1"><stop offset="0" stop-color="#ff7a5a"/><stop offset=".5" stop-color="#e0201a"/><stop offset="1" stop-color="#7a0608"/></linearGradient>
<radialGradient id="glass" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".6" stop-color="#e6f7ff" stop-opacity=".9"/><stop offset="1" stop-color="#bfe6ff" stop-opacity=".95"/></radialGradient>
<clipPath id="lC"><circle cx="{lcx}" cy="{lcy}" r="{lr}"/></clipPath>
<filter id="b10" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
</defs>
<path d="{D}" fill="#08134a" stroke="#08134a" stroke-width="56" stroke-linejoin="round" transform="translate(0,22)" opacity=".45" filter="url(#b10)"/>
<path d="{D}" fill="#fff" stroke="#fff" stroke-width="48" stroke-linejoin="round" transform="translate(0,12)"/>
<path d="{D}" fill="#fff" stroke="#fff" stroke-width="48" stroke-linejoin="round"/>
{''.join(f'<path d="{D}" fill="#0b1f6e" stroke="#0b1f6e" stroke-width="24" stroke-linejoin="round" transform="translate(0,{k})"/>' for k in (14,10,6,2))}
<path d="{D}" fill="url(#fC)"/>
<path d="{D}" fill="none" stroke="#d8fbff" stroke-width="6" transform="translate(-2,-4)" opacity=".7"/>
<!-- magnifier -->
<path d="{HP}" fill="#fff" stroke="#fff" stroke-width="30" stroke-linejoin="round"/>
<path d="{HP}" fill="url(#hC)" stroke="#0b1f6e" stroke-width="12" stroke-linejoin="round"/>
<circle cx="{lcx}" cy="{lcy}" r="{lr+26}" fill="#fff"/>
<circle cx="{lcx}" cy="{lcy}" r="{lr}" fill="url(#glass)"/>
<g clip-path="url(#lC)">
 <path d="{Dz}" fill="#6a2a00" stroke="#6a2a00" stroke-width="22" stroke-linejoin="round" transform="translate(0,8)"/>
 <path d="{Dz}" fill="#6a2a00" stroke="#6a2a00" stroke-width="22" stroke-linejoin="round"/>
 <path d="{Dz}" fill="url(#gC)"/>
 <path d="{Dz}" fill="none" stroke="#fff" stroke-width="7" opacity=".8" transform="translate(-2,-4)"/>
 <path d="M{lcx-lr*0.85} {lcy-lr*0.1} A{lr*0.88} {lr*0.88} 0 0 1 {lcx+lr*0.05} {lcy-lr*0.86}" stroke="#fff" stroke-width="16" stroke-linecap="round" fill="none" opacity=".75"/>
</g>
<circle cx="{lcx}" cy="{lcy}" r="{lr+10}" fill="none" stroke="url(#rimC)" stroke-width="22"/>
<circle cx="{lcx}" cy="{lcy}" r="{lr+21}" fill="none" stroke="#0b1f6e" stroke-width="5"/>
<circle cx="{lcx}" cy="{lcy}" r="{lr-1}" fill="none" stroke="#0b1f6e" stroke-width="5"/>
{sparkle(780,120,26)}{sparkle(520,140,16,'#fff8c0')}{sparkle(1010,200,18)}{sparkle(70,180,20)}
</svg>'''
open('optC.svg','w').write(svg); print('ok')
