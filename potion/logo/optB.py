# 方案B「试管分层字」：每个字是一支玻璃试管，里面是分层魔药（倒水解谜的核心画面）；法的氵是冒出的泡泡；一只药瓶正往“水”里倒药
from common import *
S=232
DK='#160a2e'
L=[('魔',126,330,-4),('法',334,318,3),('药',542,334,-2),('水',752,322,3),('铺',958,332,-3)]
LAY={'魔':['#ff4f8a','#ffd23a','#a64dff'],'法':['#36e0c8','#ff6ad5','#3a7bff'],'药':['#7be04a','#ff8a1f','#a64dff'],'水':['#3ad0ff','#ff4f8a','#36e0c8'],'铺':['#ffd23a','#a64dff','#ff6ad5']}
def parts(ch,cx,cy):
    cs=C(ch,cx,cy,S); keep=[]; sp={}
    for i,(d,bb) in enumerate(cs):
        if ch=='法' and i in (2,3): sp.setdefault('dots',[]).append(bb); continue
        keep.append(d)
    return ' '.join(keep),sp
G=[(ch,cx,cy,r)+parts(ch,cx,cy) for ch,cx,cy,r in L]
def wave(cx,y,amp,ph):
    return f'M{cx-160} {y} C{cx-110} {y-amp*ph} {cx-50} {y+amp*ph} {cx} {y} C{cx+50} {y-amp*ph} {cx+110} {y+amp*ph} {cx+160} {y}'
out=[]
for ch,cx,cy,r,d,sp in G:
    out.append(f'<g transform="rotate({r} {cx} {cy})"><path d="{d}" fill="#05000c" stroke="#05000c" stroke-width="58" stroke-linejoin="round" transform="translate(0,20)" opacity=".55" filter="url(#blur8)"/></g>')
for k,(ch,cx,cy,r,d,sp) in enumerate(G):
    cols=LAY[ch]; top=cy-S*0.5; h=S
    lv=[top+h*0.2,top+h*0.47,top+h*0.73]
    s=f'''<path d="{d}" fill="{DK}" stroke="{DK}" stroke-width="50" stroke-linejoin="round" transform="translate(0,10)"/>
<path d="{d}" fill="{DK}" stroke="{DK}" stroke-width="50" stroke-linejoin="round"/>
<path d="{d}" fill="#fff" stroke="url(#rimB)" stroke-width="30" stroke-linejoin="round"/>
<path d="{d}" fill="{DK}" stroke="{DK}" stroke-width="9" stroke-linejoin="round"/>
<path d="{d}" fill="url(#glassB)"/>
<clipPath id="cb{k}"><path d="{d}"/></clipPath><g clip-path="url(#cb{k})">'''
    for j in range(3):
        y=lv[j]; nxt=lv[j+1] if j<2 else cy+200
        s+=f'<path d="{wave(cx,y,9,1 if j%2 else -1)} L{cx+160} {cy+200} L{cx-160} {cy+200}Z" fill="url(#lq{k}{j})"/>'
        s+=f'<path d="{wave(cx,y,9,1 if j%2 else -1)}" stroke="#fff" stroke-width="6" fill="none" opacity=".6"/>'
    for bx,by,br in [(-60,50,8),(-30,85,5),(10,20,6),(48,60,9),(70,96,5),(0,100,7),(-74,0,5),(30,-30,6)]:
        s+=f'<circle cx="{cx+bx}" cy="{cy+by}" r="{br}" fill="#fff" opacity=".55"/>'
    s+=f'''<path d="M{cx-200} {cy-40} L{cx+200} {cy-120} L{cx+200} {cy-220} L{cx-200} {cy-220}Z" fill="#fff" opacity=".16"/>
 <path d="{d}" fill="none" stroke="#fff" stroke-width="7" opacity=".6" transform="translate(-3,-5)"/>
 <path d="{d}" fill="none" stroke="#000" stroke-width="12" opacity=".35" transform="translate(3,7)"/></g>'''
    if ch=='法':
        bc=['#5af0ff','#ff6ad5']
        for q,bb in enumerate(sorted(sp['dots'],key=lambda b:b[1])):
            bx,by=(bb[0]+bb[2])/2,(bb[1]+bb[3])/2
            s+=bubble(bx,by-(8 if q==0 else 0),26 if q==0 else 30,bc[q],DK,11)
        s+=bubble(cx-S*0.34,cy-S*0.62,13,'#b98cff',DK,8)+bubble(cx-S*0.18,cy-S*0.76,8,'#5af0ff',DK,7)
    out.append(f'<g transform="rotate({r} {cx} {cy})">{s}</g>')
# pouring flask over 水
px,py=850,104
pour=f'''<path d="M{px-72} {py+50} C{px-86} {py+86} {px-94} {py+120} {px-96} {py+170}" stroke="{DK}" stroke-width="26" fill="none" stroke-linecap="round"/>
<path d="M{px-72} {py+50} C{px-86} {py+86} {px-94} {py+120} {px-96} {py+170}" stroke="url(#stream)" stroke-width="14" fill="none" stroke-linecap="round"/>
{flask(px,py,66,rot=-118,dark=DK,gid='p')}
<circle cx="{px-100}" cy="{py+184}" r="7" fill="#9af8ff"/><circle cx="{px-80}" cy="{py+190}" r="5" fill="#fff"/>'''
defs=''.join(f'<linearGradient id="lq{k}{j}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{LAY[ch][j]}" stop-opacity=".95"/><stop offset=".45" stop-color="#ffffff" stop-opacity=".0"/><stop offset="1" stop-color="{LAY[ch][j]}" stop-opacity="1"/></linearGradient>' for k,(ch,*_) in enumerate(G) for j in range(3))
# simpler: solid color with vertical shade
defs=''.join(f'<linearGradient id="lq{k}{j}" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse" y1="{cy-S*0.5+S*[0.2,0.47,0.73][j]}" y2="{cy+S*0.5}"><stop offset="0" stop-color="{LAY[ch][j]}"/><stop offset="1" stop-color="{LAY[ch][j]}" stop-opacity="1"/></linearGradient>' for k,(ch,cx,cy,*_) in enumerate(G) for j in range(3))
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>{DEFS_COMMON}{defs}{bubgrad('#5af0ff')}{bubgrad('#ff6ad5')}{bubgrad('#b98cff')}{liqgrad('p','#b0fff8','#3ad0ff','#1a60c0')}
 <linearGradient id="rimB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cfe8ff"/><stop offset="1" stop-color="#8a9cd8"/></linearGradient>
 <linearGradient id="glassB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf2ff"/><stop offset="1" stop-color="#9aa4d8"/></linearGradient>
 <linearGradient id="stream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b0fff8"/><stop offset="1" stop-color="#3ad0ff"/></linearGradient>
 <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#5af0ff" stop-opacity=".4"/><stop offset=".6" stop-color="#a64dff" stop-opacity=".15"/><stop offset="1" stop-color="#a64dff" stop-opacity="0"/></radialGradient>
 <linearGradient id="rib" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c88aff"/><stop offset=".5" stop-color="#7a2ad0"/><stop offset="1" stop-color="#4a1090"/></linearGradient>
</defs>
<ellipse cx="540" cy="330" rx="540" ry="240" fill="url(#halo)"/>
{''.join(out)}
{pour}
<g transform="translate(540,570)">
 <path d="M-250 -30 Q0 -50 250 -30 L250 24 Q0 4 -250 24Z" fill="url(#rib)" stroke="{DK}" stroke-width="9" stroke-linejoin="round"/>
 {''.join(f'<path d="{" ".join(c[0] for c in C(ch2,x2,-6,54))}" fill="#fff" stroke="#2a0a50" stroke-width="9" stroke-linejoin="round" paint-order="stroke"/>' for ch2,x2 in [('分',-180),('层',-110),('倒',-40),('魔',40),('药',110),('水',180)])}
</g>
{sparkle(60,190,24)}{sparkle(1030,170,26)}{sparkle(300,110,16,'#c8fff8')}{sparkle(560,100,20)}{sparkle(1010,480,16,'#ffd0ff')}{sparkle(70,470,18,'#c8fff8')}
</svg>'''
open('optB.svg','w').write(svg)
