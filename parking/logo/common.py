import base64, random
from glyphs import place
RHR='fonts/ResourceHanRoundedCN-Heavy.ttf'; KL='fonts/ZCOOLKuaiLe.ttf'; HY='fonts/ZCOOLQingKeHuangYou.ttf'
def b64(p,mime='image/webp'): return f"data:{mime};base64,"+base64.b64encode(open(p,'rb').read()).decode()
def img(n,x,y,w,h,rot=0,extra=''):
    return f'<image href="{b64("../assets/"+n+".webp")}" x="{x-w/2}" y="{y-h/2}" width="{w}" height="{h}" transform="rotate({rot} {x} {y})" {extra}/>'
def wheel(x,y,r):
    return f'''<g><circle cx="{x}" cy="{y+5}" r="{r+9}" fill="#0b1630" opacity=".45"/>
<circle cx="{x}" cy="{y}" r="{r+8}" fill="#fff"/><circle cx="{x}" cy="{y}" r="{r}" fill="#20232b" stroke="#0b1630" stroke-width="6"/>
<circle cx="{x}" cy="{y}" r="{r*.55}" fill="url(#chrome)" stroke="#0b1630" stroke-width="4"/>
{''.join(f'<circle cx="{x+r*.3*__import__("math").cos(a*1.2566)}" cy="{y+r*.3*__import__("math").sin(a*1.2566)}" r="{r*.07}" fill="#3a4258"/>' for a in range(5))}
<path d="M{x-r*.7} {y-r*.35} A{r*.8} {r*.8} 0 0 1 {x-r*.1} {y-r*.78}" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".45"/></g>'''
def tlight(x,y,h,w):
    # traffic light as the bar of "!" (top wide, rounded) + lamps
    r=w*.36
    lamps=''.join(f'<circle cx="{x}" cy="{y-h/2+w*.55+i*(h-w*1.1)/2}" r="{r}" fill="{c}" stroke="#0b1630" stroke-width="5"/>'
      f'<circle cx="{x-r*.3}" cy="{y-h/2+w*.55+i*(h-w*1.1)/2-r*.3}" r="{r*.32}" fill="#fff" opacity="{o}"/>' for i,(c,o) in enumerate([('url(#lampR)',.85),('#5a4a1e',.18),('#1e4a2e',.18)]))
    return f'''<g>
<rect x="{x-w/2-14}" y="{y-h/2-14}" width="{w+28}" height="{h+28}" rx="{w/2+14}" fill="#fff"/>
<rect x="{x-w/2}" y="{y-h/2}" width="{w}" height="{h}" rx="{w/2}" fill="url(#tlbody)" stroke="#0b1630" stroke-width="9"/>
{lamps}
<circle cx="{x}" cy="{y-h/2+w*.55}" r="{r*1.9}" fill="url(#redglow)"/>
</g>'''
DEFS='''
 <linearGradient id="paint" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="{y0}" y2="{y1}"><stop offset="0" stop-color="#fff07a"/><stop offset=".28" stop-color="#ffd21c"/><stop offset=".62" stop-color="#ff9d0a"/><stop offset="1" stop-color="#f05a00"/></linearGradient>
 <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b9c6d8"/><stop offset=".52" stop-color="#7c8aa3"/><stop offset="1" stop-color="#d9e2ee"/></linearGradient>
 <linearGradient id="tlbody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2c3550"/><stop offset=".45" stop-color="#4a5678"/><stop offset="1" stop-color="#1a2038"/></linearGradient>
 <radialGradient id="lampR" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffd0c0"/><stop offset=".35" stop-color="#ff3b30"/><stop offset="1" stop-color="#a30a12"/></radialGradient>
 <radialGradient id="redglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff5a3c" stop-opacity=".55"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
 <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <linearGradient id="signblue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3aa0ff"/><stop offset=".55" stop-color="#1569e0"/><stop offset="1" stop-color="#0b3e9a"/></linearGradient>
 <filter id="blur8" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>
 <filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>
'''
def subplate(cx,cy,w,h,text='停车场大堵车',font=RHR,size=78):
    n=len(text); step=(w-h-40)/n
    d=' '.join(place(font,c,cx-w/2+h+20+step*(i+.5),cy,size)[0] for i,c in enumerate(text))
    px=cx-w/2+h/2+6
    return f'''<g>
<rect x="{cx-w/2}" y="{cy-h/2+10}" width="{w}" height="{h}" rx="{h*.32}" fill="#0b1630" opacity=".5" filter="url(#blur8)"/>
<rect x="{cx-w/2}" y="{cy-h/2}" width="{w}" height="{h}" rx="{h*.32}" fill="url(#signblue)" stroke="#0b1630" stroke-width="8"/>
<rect x="{cx-w/2+9}" y="{cy-h/2+9}" width="{w-18}" height="{h-18}" rx="{h*.25}" fill="none" stroke="#fff" stroke-width="6"/>
<path d="M{cx-w/2+30} {cy-h/2+20} H{cx+w/2-30}" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".35"/>
<rect x="{px-h*.34}" y="{cy-h*.34}" width="{h*.68}" height="{h*.68}" rx="12" fill="#fff"/>
<path d="{place(RHR,'P',px,cy,h*.78)[0]}" fill="#1569e0"/>
<path d="{d}" fill="#0b1630" stroke="#0b1630" stroke-width="12" stroke-linejoin="round" transform="translate(0,4)"/>
<path d="{d}" fill="#fff"/>
</g>'''
