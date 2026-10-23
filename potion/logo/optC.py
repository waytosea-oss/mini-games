# 方案C「药铺招牌」：挂在铁艺吊架上的紫木金框招牌，烫金浮雕字；女巫帽挂在招牌角上，招牌顶上坐着一瓶冒泡药水；法的氵变成两颗发光魔法星
from common import *
S=196
DK='#1a0a26'
L=[('魔',160,356),('法',350,350),('药',540,356),('水',730,350),('铺',920,356)]
def parts(ch,cx,cy):
    cs=C(ch,cx,cy,S); keep=[]; sp={}
    for i,(d,bb) in enumerate(cs):
        if ch=='法' and i in (2,3): sp.setdefault('dots',[]).append(bb); continue
        if ch=='药' and i==3: sp['dot']=bb; continue
        keep.append(d)
    return ' '.join(keep),sp
G=[(ch,cx,cy)+parts(ch,cx,cy) for ch,cx,cy in L]
o=[]
# chains & bracket
for x in (250,830):
    for k in range(5):
        y=60+k*26
        o.append(f'<ellipse cx="{x}" cy="{y}" rx="{9 if k%2 else 6}" ry="15" fill="none" stroke="{DK}" stroke-width="12"/><ellipse cx="{x}" cy="{y}" rx="{9 if k%2 else 6}" ry="15" fill="none" stroke="url(#goldL)" stroke-width="6"/>')
o.append(f'<path d="M120 48 L960 48" stroke="{DK}" stroke-width="30" stroke-linecap="round"/><path d="M120 48 L960 48" stroke="url(#iron)" stroke-width="18" stroke-linecap="round"/>')
o.append(f'<circle cx="120" cy="48" r="20" fill="url(#goldL)" stroke="{DK}" stroke-width="8"/><circle cx="960" cy="48" r="20" fill="url(#goldL)" stroke="{DK}" stroke-width="8"/>')
# board
bx,by,bw,bh=70,178,940,330
o.append(f'<rect x="{bx}" y="{by+14}" width="{bw}" height="{bh}" rx="44" fill="#000" opacity=".5" filter="url(#blur8)"/>')
o.append(f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="44" fill="{DK}"/>')
o.append(f'<rect x="{bx+8}" y="{by+8}" width="{bw-16}" height="{bh-16}" rx="38" fill="url(#goldL)"/>')
o.append(f'<rect x="{bx+24}" y="{by+24}" width="{bw-48}" height="{bh-48}" rx="26" fill="url(#wood)" stroke="{DK}" stroke-width="6"/>')
for i in range(6):
    yy=by+50+i*48
    o.append(f'<path d="M{bx+30} {yy} C{bx+300} {yy-8} {bx+600} {yy+10} {bx+bw-30} {yy}" stroke="#000" stroke-width="3" opacity=".18" fill="none"/>')
o.append(f'<rect x="{bx+40}" y="{by+38}" width="{bw-80}" height="{bh-76}" rx="18" fill="none" stroke="url(#goldL)" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>')
for (cx,cy) in [(bx+44,by+44),(bx+bw-44,by+44),(bx+44,by+bh-44),(bx+bw-44,by+bh-44)]:
    o.append(f'<circle cx="{cx}" cy="{cy}" r="10" fill="url(#goldL)" stroke="{DK}" stroke-width="4"/>')
for ch,cx,cy,d,sp in G:
    o.append(f'<path d="{d}" fill="#0a0410" stroke="#0a0410" stroke-width="30" stroke-linejoin="round" transform="translate(0,10)" opacity=".7"/>')
    o.append(f'<path d="{d}" fill="{DK}" stroke="{DK}" stroke-width="30" stroke-linejoin="round"/>')
    o.append(f'<path d="{d}" fill="#a85a00" transform="translate(0,6)"/>')
    o.append(f'<path d="{d}" fill="url(#goldT)"/>')
    o.append(f'<clipPath id="cc{ch}"><path d="{d}"/></clipPath><g clip-path="url(#cc{ch})"><path d="{d}" fill="none" stroke="#fffbe0" stroke-width="7" transform="translate(-2,-4)" opacity=".9"/><path d="{d}" fill="none" stroke="#7a3a00" stroke-width="8" transform="translate(2,5)" opacity=".5"/></g>')
    if ch=='法':
        for q,bb in enumerate(sorted(sp['dots'],key=lambda b:b[1])):
            x,y=(bb[0]+bb[2])/2,(bb[1]+bb[3])/2
            o.append(f'<circle cx="{x}" cy="{y}" r="34" fill="url(#tglow)"/><path d="{star5(x,y,26 if q else 22,-90,.45)}" fill="#7affee" stroke="{DK}" stroke-width="8" stroke-linejoin="round"/><path d="{star5(x-2,y-3,10,-90,.45)}" fill="#fff"/>')
    if ch=='药':
        bb=sp['dot']; x,y=(bb[0]+bb[2])/2,(bb[1]+bb[3])/2
        o.append(f'<path d="M{x} {y-22} C{x+14} {y-4} {x+16} {y+6} {x+16} {y+10} A16 16 0 0 1 {x-16} {y+10} C{x-16} {y+6} {x-14} {y-4} {x} {y-22}Z" fill="#ff5ad0" stroke="{DK}" stroke-width="8" stroke-linejoin="round"/><circle cx="{x-5}" cy="{y+6}" r="4" fill="#fff"/>')
o.append(hat(bx+86,by+12,80,-24,DK))
o.append(flask(bx+bw-110,by-62,62,rot=8,dark=DK,gid='c'))
for bxx,byy,r in [(bx+bw-104,by-160,9),(bx+bw-86,by-188,6),(bx+bw-120,by-200,5)]:
    o.append(f'<circle cx="{bxx}" cy="{byy}" r="{r}" fill="#ffb0f0" stroke="{DK}" stroke-width="4"/>')
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>{DEFS_COMMON}{liqgrad('c','#ffb0f0','#ff3fc8','#a0108a')}
 <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a3a9a"/><stop offset=".5" stop-color="#47206e"/><stop offset="1" stop-color="#2a0e48"/></linearGradient>
 <linearGradient id="iron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8aa0"/><stop offset="1" stop-color="#3a3a50"/></linearGradient>
 <linearGradient id="goldT" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffe066"/><stop offset=".7" stop-color="#f5a812"/><stop offset="1" stop-color="#d07a00"/></linearGradient>
 <radialGradient id="tglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#7affee" stop-opacity=".8"/><stop offset="1" stop-color="#7affee" stop-opacity="0"/></radialGradient>
</defs>
{''.join(o)}
{sparkle(40,250,22)}{sparkle(1046,300,22)}{sparkle(560,140,16,'#ffe9a0')}{sparkle(990,560,16,'#c8fff8')}{sparkle(110,560,18,'#ffe9a0')}
</svg>'''
open('optC.svg','w').write(svg)
