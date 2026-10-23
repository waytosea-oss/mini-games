# A: 圆胖金字 + 放大镜替换“眼”的目字旁，镜中一只机灵大眼；“火”顶燃火苗
from common import *
W,H=1080,600
drop=lambda b,gb: (b[0]+b[2])/2 < gb[0]+0.25*(gb[2]-gb[0]) and b[2]-b[0] < 0.45*(gb[2]-gb[0])
S=270
chars=[('火',175,330,S,-7),('眼',425,315,S,3),('金',665,330,S,-3),('睛',905,312,S,5)]
D=[];gone=None
for c,x,y,s,r in chars:
    d,gb,g=place(RHR,c,x,y,s,r,drop=drop if c=='眼' else None)
    D.append(d)
    if c=='眼': gone=g; egb=gb
# magnifier replacing 目: bbox of removed contours
xs=[v for _,b in gone for v in (b[0],b[2])]; ys=[v for _,b in gone for v in (b[1],b[3])]
mx0,mx1,my0,my1=min(xs),max(xs),min(ys),max(ys)
lr=(mx1-mx0)*0.78; lcx=(mx0+mx1)/2-4; lcy=my0+lr-10
D.append(ring(lcx,lcy,lr,lr*0.68))
HP=handle_path(lcx-lr*0.05,lcy+lr*0.98,96,(my1-lcy)-lr*0.85,42)
D=' '.join(D)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<linearGradient id="fill" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="180" y2="470"><stop offset="0" stop-color="#fffbd2"/><stop offset=".3" stop-color="#ffe046"/><stop offset=".62" stop-color="#ff9a1a"/><stop offset="1" stop-color="#e2380e"/></linearGradient>
<linearGradient id="edge" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="160" y2="500"><stop offset="0" stop-color="#b8240a"/><stop offset="1" stop-color="#5a0a06"/></linearGradient>
<linearGradient id="gloss" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="170" y2="330"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="fl" cx=".5" cy=".85" r=".8"><stop offset="0" stop-color="#fff7b0"/><stop offset=".45" stop-color="#ffb21c"/><stop offset="1" stop-color="#ff3d0a"/></radialGradient>
<linearGradient id="grip" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#ff7a5a"/><stop offset=".45" stop-color="#e0201a"/><stop offset="1" stop-color="#7a0608"/></linearGradient>
<clipPath id="cw"><path d="{D}"/></clipPath>
<clipPath id="ct"><rect x="0" y="0" width="{W}" height="300"/></clipPath>
<clipPath id="lens"><circle cx="{lcx}" cy="{lcy}" r="{lr*0.68+1}"/></clipPath>
<filter id="b10" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
</defs>
<path d="{D}" fill="#3a0400" stroke="#3a0400" stroke-width="58" stroke-linejoin="round" transform="translate(0,22)" opacity=".45" filter="url(#b10)"/>
<path d="{D}" fill="#fff" stroke="#fff" stroke-width="50" stroke-linejoin="round" transform="translate(0,14)"/>
<path d="{D}" fill="#fff" stroke="#fff" stroke-width="50" stroke-linejoin="round"/>
{''.join(f'<path d="{D}" fill="#6a0c04" stroke="#6a0c04" stroke-width="26" stroke-linejoin="round" transform="translate(0,{k})"/>' for k in (16,12,8,4))}
<path d="{D}" fill="url(#edge)" stroke="url(#edge)" stroke-width="26" stroke-linejoin="round"/>
<path d="{D}" fill="url(#fill)"/>
<g clip-path="url(#cw)">
 <path d="{D}" fill="none" stroke="#fff6c8" stroke-width="10" opacity=".85" transform="translate(-2,-5)"/>
 <path d="{D}" fill="none" stroke="#a51e00" stroke-width="8" opacity=".35" transform="translate(2,7)"/>
 <ellipse cx="540" cy="215" rx="560" ry="60" fill="url(#gloss)" opacity=".55"/>
</g>
<path d="{HP}" fill="#fff" stroke="#fff" stroke-width="30" stroke-linejoin="round"/>
<path d="{HP}" fill="#6a0c04" stroke="#6a0c04" stroke-width="14" stroke-linejoin="round" transform="translate(0,10)"/>
<path d="{HP}" fill="url(#grip)" stroke="#6a0c04" stroke-width="12" stroke-linejoin="round"/>
<!-- lens content -->
<g clip-path="url(#lens)">{eye(lcx,lcy,lr*0.68,iris='#33a6ff',iris2='#0b3f9c',look=(0.16,0.06),uid='a')}</g>
<circle cx="{lcx}" cy="{lcy}" r="{lr*0.68}" fill="none" stroke="#6a0c04" stroke-width="7"/>
<!-- flame on 火 -->
<g transform="translate(180,150) rotate(-7) scale(1.25)">
 <path d="M0 52 C-38 40 -40 4 -18 -22 C-16 -6 -6 0 0 -2 C-4 -24 6 -50 26 -66 C22 -40 46 -20 40 10 C36 36 20 50 0 52Z" fill="#fff" stroke="#fff" stroke-width="26" stroke-linejoin="round"/>
 <path d="M0 52 C-38 40 -40 4 -18 -22 C-16 -6 -6 0 0 -2 C-4 -24 6 -50 26 -66 C22 -40 46 -20 40 10 C36 36 20 50 0 52Z" fill="url(#fl)" stroke="#6a0c04" stroke-width="9" stroke-linejoin="round"/>
 <path d="M2 40 C-14 34 -14 16 -4 6 C0 16 10 16 12 8 C22 22 16 38 2 40Z" fill="#fff6b8"/>
</g>
{sparkle(310,130,22)}{sparkle(1010,175,26)}{sparkle(780,118,15)}{sparkle(60,250,14)}
<!-- ribbon subtitle -->
'''
# subtitle
sub=' '.join(place(RHR,ch,430+i*74,535,60)[0] for i,ch in enumerate('经典找茬'))
svg+=f'''<g>
<path d="M300 488 H780 L812 534 L780 580 H300 L268 534Z" fill="#7a0e04" transform="translate(0,8)" opacity=".5" filter="url(#b10)"/>
<path d="M250 500 L300 494 L300 574 L250 580 L276 537Z" fill="#a31a0a" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
<path d="M830 500 L780 494 L780 574 L830 580 L804 537Z" fill="#a31a0a" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
<rect x="300" y="488" width="480" height="92" rx="20" fill="#e8321c" stroke="#fff" stroke-width="8"/>
<rect x="312" y="498" width="456" height="30" rx="14" fill="#fff" opacity=".22"/>
<path d="{sub}" fill="#fff8d8" stroke="#6a0c04" stroke-width="10" stroke-linejoin="round" paint-order="stroke"/>
</g></svg>'''
open('optA.svg','w').write(svg); print('ok',lcx,lcy,lr)
