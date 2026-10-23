# 方案A「魔药糖果字」：紫晶糖果字+金边；魔戴女巫帽、法的氵是两颗魔法泡泡、药的艹是新芽、勺里的点是一瓶小药水、水是装着青色魔药的玻璃字、铺的点是金星
from common import *
S=236
DK='#1c0630'
L=[('魔',128,318,-6),('法',336,300,3),('药',544,322,-3),('水',752,298,4),('铺',958,318,-4)]
def parts(ch,cx,cy):
    cs=C(ch,cx,cy,S); keep=[]; sp={}
    for i,(d,bb) in enumerate(cs):
        if ch=='法' and i in (2,3): sp.setdefault('dots',[]).append(bb); continue
        if ch=='药' and i==3: sp['dot']=bb; continue
        if ch=='药' and i==4: sp['cao']=d
        if ch=='魔' and i==0: sp['guang']=bb
        if ch=='铺' and i==1: sp['fu']=bb
        keep.append(d)
    return ' '.join(keep),sp
G=[(ch,cx,cy,r)+parts(ch,cx,cy) for ch,cx,cy,r in L]
def wrap(cx,cy,r,s): return f'<g transform="rotate({r} {cx} {cy})">{s}</g>'
out=[]
for ch,cx,cy,r,d,sp in G:
    out.append(wrap(cx,cy,r,f'<path d="{d}" fill="#0a0014" stroke="#0a0014" stroke-width="60" stroke-linejoin="round" transform="translate(0,20)" opacity=".55" filter="url(#blur8)"/>'))
for ch,cx,cy,r,d,sp in G:
    s=f'''<path d="{d}" fill="{DK}" stroke="{DK}" stroke-width="54" stroke-linejoin="round" transform="translate(0,12)"/>
<path d="{d}" fill="{DK}" stroke="{DK}" stroke-width="54" stroke-linejoin="round"/>
<path d="{d}" fill="#c06a00" stroke="#a65400" stroke-width="36" stroke-linejoin="round" transform="translate(0,6)"/>
<path d="{d}" fill="#ffd84a" stroke="url(#goldL)" stroke-width="34" stroke-linejoin="round"/>
<path d="{d}" fill="{DK}" stroke="{DK}" stroke-width="{7 if ch=='魔' else 11}" stroke-linejoin="round"/>'''
    if ch=='水':
        s+=f'''<path d="{d}" fill="url(#glass)"/>
<clipPath id="cpw"><path d="{d}"/></clipPath><g clip-path="url(#cpw)">
 <path d="M{cx-150} {cy-6} C{cx-100} {cy-30} {cx-60} {cy+16} {cx} {cy-8} C{cx+50} {cy-30} {cx+100} {cy+12} {cx+150} {cy-12} L{cx+150} {cy+160} L{cx-150} {cy+160}Z" fill="url(#liqW)"/>
 <path d="M{cx-150} {cy-6} C{cx-100} {cy-30} {cx-60} {cy+16} {cx} {cy-8} C{cx+50} {cy-30} {cx+100} {cy+12} {cx+150} {cy-12}" stroke="#d8fff8" stroke-width="8" fill="none"/>
 {''.join(f'<circle cx="{cx+bx}" cy="{cy+by}" r="{br}" fill="#fff" opacity=".7"/>' for bx,by,br in [(-62,40,9),(-40,78,6),(-8,30,6),(44,52,10),(70,90,6),(6,96,8),(-80,96,5)])}
 <path d="M{cx-200} {cy-40} L{cx+200} {cy-120} L{cx+200} {cy-220} L{cx-200} {cy-220}Z" fill="#fff" opacity=".22"/>
 <path d="{d}" fill="none" stroke="#fff" stroke-width="10" opacity=".75" transform="translate(-3,-6)"/>
 <path d="{d}" fill="none" stroke="#063a40" stroke-width="12" opacity=".4" transform="translate(3,8)"/>
</g>'''
    else:
        s+=f'''<path d="{d}" fill="url(#body)"/>'''
        if 'cao' in sp: s+=f'<path d="{sp["cao"]}" fill="url(#leafg)"/>'
        s+=f'''<clipPath id="cp{ch}"><path d="{d}"/></clipPath><g clip-path="url(#cp{ch})">
 <path d="M{cx-200} {cy-40} L{cx+200} {cy-120} L{cx+200} {cy-220} L{cx-200} {cy-220}Z" fill="#fff" opacity=".2"/>
 <path d="{d}" fill="none" stroke="#ffd8ff" stroke-width="{6 if ch=='魔' else 10}" opacity=".75" transform="translate(-3,-5)"/>
 <path d="{d}" fill="none" stroke="#24003e" stroke-width="{7 if ch=='魔' else 12}" opacity=".45" transform="translate(3,7)"/>
</g>'''
    if ch=='法':
        cols=['#5af0ff','#ff6ad5']
        for k,bb in enumerate(sorted(sp['dots'],key=lambda b:b[1])):
            bx,by=(bb[0]+bb[2])/2,(bb[1]+bb[3])/2
            s+=bubble(bx+(4 if k==0 else -2),by-(10 if k==0 else 0),27 if k==0 else 31,cols[k],DK,12)
        s+=bubble(cx-S*0.36,cy-S*0.62,13,'#b98cff',DK,9)
    if ch=='药':
        bb=sp['dot']; bx,by=(bb[0]+bb[2])/2,(bb[1]+bb[3])/2
        s+=flask(bx+4,by+6,40,rot=10,dark=DK,gid='y')
        lx0=cx-S*0.25; s+=leaf(cx-S*0.2,cy-S*0.42,58,-125,DK)+leaf(cx+S*0.22,cy-S*0.44,62,-55,DK)+leaf(cx+S*0.2,cy-S*0.44,40,-100,DK)
    if ch=='魔':
        bb=sp['guang']; s+=hat(cx+S*0.02,cy-S*0.43,78,-14,DK)
    if ch=='铺':
        x0,y0,x1,y1=sp['fu']; s+=f'<path d="{star5(x1-20,y0+8,34,-80)}" fill="url(#goldL)" stroke="{DK}" stroke-width="10" stroke-linejoin="round"/>'+sparkle(x1+22,y0-30,14)
    out.append(wrap(cx,cy,r,s))
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>{DEFS_COMMON}{bubgrad('#5af0ff')}{bubgrad('#ff6ad5')}{bubgrad('#b98cff')}{liqgrad('y','#ffb0f0','#ff3fc8','#a0108a')}
 <linearGradient id="body" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#ffb0f4"/><stop offset=".4" stop-color="#d24ef0"/><stop offset=".75" stop-color="#8a28d8"/><stop offset="1" stop-color="#4a10a0"/></linearGradient>
 <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f0ff"/><stop offset="1" stop-color="#b8b0e0"/></linearGradient>
 <linearGradient id="liqW" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse" y1="300" y2="420"><stop offset="0" stop-color="#6afff0"/><stop offset=".5" stop-color="#18c8c8"/><stop offset="1" stop-color="#0a6a90"/></linearGradient>
 <linearGradient id="rib" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ee0d0"/><stop offset=".5" stop-color="#119a9a"/><stop offset="1" stop-color="#0a5a66"/></linearGradient>
 <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff9af0" stop-opacity=".5"/><stop offset=".6" stop-color="#7a5aff" stop-opacity=".15"/><stop offset="1" stop-color="#7a5aff" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="540" cy="320" rx="540" ry="250" fill="url(#halo)"/>
{''.join(out)}
<g transform="translate(540,560)">
 <path d="M-290 -18 L-352 -28 L-328 8 L-354 44 L-280 36Z" fill="#0a5a66" stroke="{DK}" stroke-width="8" stroke-linejoin="round"/>
 <path d="M290 -18 L352 -28 L328 8 L354 44 L280 36Z" fill="#0a5a66" stroke="{DK}" stroke-width="8" stroke-linejoin="round"/>
 <path d="M-300 -36 Q0 -62 300 -36 L300 28 Q0 2 -300 28Z" fill="url(#rib)" stroke="{DK}" stroke-width="9" stroke-linejoin="round"/>
 <path d="M-286 -26 Q0 -50 286 -26" stroke="#ffe680" stroke-width="4" fill="none" stroke-dasharray="3 12" stroke-linecap="round"/>
 {''.join(f'<path d="{" ".join(c[0] for c in C(ch2,x2,-10+abs(x2)*0.05,60))}" fill="#fffbe8" stroke="#06343a" stroke-width="10" stroke-linejoin="round" paint-order="stroke"/>' for ch2,x2 in [('倒',-200),('魔',-125),('药',-50),('迎',50),('顾',125),('客',200)])}
 <path d="{star5(0,-12,13)}" fill="#ffd84a" stroke="#06343a" stroke-width="4"/>
</g>
{sparkle(52,180,26)}{sparkle(1040,140,24)}{sparkle(250,92,16,'#ffe9a0')}{sparkle(660,96,20)}{sparkle(1010,460,16,'#c8fff8')}{sparkle(70,450,18,'#ffe9a0')}
</svg>'''
open('optA.svg','w').write(svg)
