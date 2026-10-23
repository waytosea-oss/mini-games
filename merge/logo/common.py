import math, random
from glyphs import place, font
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
RHR='fonts/ResourceHanRoundedCN-Heavy.ttf'; KL='fonts/ZCOOLKuaiLe.ttf'; HY='fonts/ZCOOLQingKeHuangYou.ttf'; MS='fonts/mashan.ttf'; WK='fonts/wenkai.ttf'
def contours(f, ch, cx, cy, size, rot=0):
    """list of (d, (x0,y0,x1,y1)) per contour in output coords"""
    t=font(f); gs=t.getGlyphSet(); name=t.getBestCmap()[ord(ch)]; upm=t['head'].unitsPerEm
    b=BoundsPen(gs); gs[name].draw(b); x0,y0,x1,y1=b.bounds; s=size/upm
    tr=Transform().translate(cx,cy).rotate(math.radians(rot)).scale(s,-s).translate(-(x0+x1)/2,-(y0+y1)/2)
    rp=RecordingPen(); gs[name].draw(TransformPen(rp,tr))
    out=[]; cur=[]
    for op,args in rp.value:
        cur.append((op,args))
        if op in ('closePath','endPath'):
            sp=SVGPathPen(None, ntos=lambda v: f"{v:.1f}")
            pts=[]
            for o,a in cur:
                getattr(sp,o)(*a); pts+=list(a)
            xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
            out.append((sp.getCommands(),(min(xs),min(ys),max(xs),max(ys)))); cur=[]
    return out
DEFS='''
 <linearGradient id="gold" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="{y0}" y2="{y1}"><stop offset="0" stop-color="#fffbd6"/><stop offset=".25" stop-color="#ffe066"/><stop offset=".55" stop-color="#ffb81c"/><stop offset=".8" stop-color="#e07d06"/><stop offset="1" stop-color="#b75300"/></linearGradient>
 <linearGradient id="goldo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbd6"/><stop offset=".3" stop-color="#ffe066"/><stop offset=".65" stop-color="#ffb81c"/><stop offset="1" stop-color="#c86400"/></linearGradient>
 <linearGradient id="jade" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="{y0}" y2="{y1}"><stop offset="0" stop-color="#c8ffd8"/><stop offset=".3" stop-color="#4fe08a"/><stop offset=".65" stop-color="#14a85a"/><stop offset="1" stop-color="#05663a"/></linearGradient>
 <linearGradient id="ivory" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#fbf5e4"/><stop offset="1" stop-color="#e9dcb8"/></linearGradient>
 <linearGradient id="tback" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fe39a"/><stop offset=".5" stop-color="#17a85c"/><stop offset="1" stop-color="#0a6a3a"/></linearGradient>
 <linearGradient id="bamboo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8ffcf"/><stop offset=".35" stop-color="#3fd27c"/><stop offset=".7" stop-color="#0f9550"/><stop offset="1" stop-color="#05582f"/></linearGradient>
 <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <linearGradient id="red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6a50"/><stop offset=".5" stop-color="#d8261c"/><stop offset="1" stop-color="#8e0c0c"/></linearGradient>
 <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff1a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffd040" stop-opacity="0"/></radialGradient>
 <filter id="blur8" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>
 <filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>
'''
OUT='#0a2e1c'
def tile(cx,cy,w,h,rot=0,face='',depth=None,outline=OUT,ow=8):
    """mahjong tile, standing, green back visible as thick bottom/top layer"""
    d=depth if depth is not None else h*.13; r=w*.16
    x=cx-w/2; y=cy-h/2
    return f'''<g transform="rotate({rot} {cx} {cy})">
<rect x="{x-4}" y="{y+d+10}" width="{w+8}" height="{h}" rx="{r}" fill="#000" opacity=".35" filter="url(#blur8)"/>
<rect x="{x}" y="{y}" width="{w}" height="{h+d}" rx="{r}" fill="url(#tback)" stroke="{outline}" stroke-width="{ow}"/>
<rect x="{x}" y="{y+h*.62}" width="{w}" height="{h*.38}" rx="{r}" fill="#f3e7c4" opacity="0"/>
<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="url(#ivory)" stroke="{outline}" stroke-width="{ow}"/>
<rect x="{x+w*.07}" y="{y+h*.05}" width="{w*.86}" height="{h*.88}" rx="{r*.7}" fill="none" stroke="#fff" stroke-width="{w*.035}" opacity=".9"/>
<rect x="{x+w*.07}" y="{y+h*.06}" width="{w*.86}" height="{h*.88}" rx="{r*.7}" fill="none" stroke="#d6c69a" stroke-width="{w*.02}" opacity=".7"/>
{face}
<path d="M{x+w*.14} {y+h*.09} H{x+w*.86}" stroke="#fff" stroke-width="{w*.05}" stroke-linecap="round" opacity=".9"/>
</g>'''
def coin(cx,cy,r):
    return f'''<g><circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#gold)" stroke="{OUT}" stroke-width="5"/><rect x="{cx-r*.3}" y="{cy-r*.3}" width="{r*.6}" height="{r*.6}" fill="#8a4a00" stroke="#6a3400" stroke-width="2"/></g>'''
def tong(cx,cy,r):
    """一筒-style medallion"""
    pet=''.join(f'<ellipse cx="{cx+r*.62*math.cos(a*math.pi/6)}" cy="{cy+r*.62*math.sin(a*math.pi/6)}" rx="{r*.17}" ry="{r*.1}" transform="rotate({a*30} {cx+r*.62*math.cos(a*math.pi/6)} {cy+r*.62*math.sin(a*math.pi/6)})" fill="{"#d8261c" if a%2 else "#14874a"}"/>' for a in range(12))
    return f'''<g><circle cx="{cx}" cy="{cy}" r="{r}" fill="#1a3f8a"/><circle cx="{cx}" cy="{cy}" r="{r*.86}" fill="#fff"/>{pet}
<circle cx="{cx}" cy="{cy}" r="{r*.42}" fill="#14874a"/><circle cx="{cx}" cy="{cy}" r="{r*.3}" fill="#fff"/><circle cx="{cx}" cy="{cy}" r="{r*.18}" fill="#d8261c"/></g>'''
def bamboo_h(x0,x1,cy,t,nodes=3,outline=OUT,ow=8):
    """horizontal bamboo stick (the 一 stroke)"""
    L=x1-x0
    nd=''.join(f'<path d="M{x0+L*(i+1)/(nodes+1)} {cy-t/2+3} V{cy+t/2-3}" stroke="#05582f" stroke-width="{t*.16}" stroke-linecap="round"/><path d="M{x0+L*(i+1)/(nodes+1)+t*.12} {cy-t/2+6} V{cy+t/2-6}" stroke="#b8ffcf" stroke-width="{t*.06}" stroke-linecap="round" opacity=".8"/>' for i in range(nodes))
    return f'''<g><rect x="{x0}" y="{cy-t/2}" width="{L}" height="{t}" rx="{t/2}" fill="url(#bamboo)" stroke="{outline}" stroke-width="{ow}"/>
{nd}<path d="M{x0+t*.5} {cy-t*.22} H{x1-t*.5}" stroke="#fff" stroke-width="{t*.14}" stroke-linecap="round" opacity=".55"/></g>'''
def letters(D, y0, y1, fill='url(#gold)', out=OUT, rim='#fff7dc', W=1080, H=760, ow=24, rw=50, idn='a', low='#a64a00'):
    return f'''<defs><clipPath id="cw{idn}"><path d="{D}"/></clipPath>
<mask id="hi{idn}" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#fff"/><path d="{D}" fill="#000" transform="translate(3,9)"/></mask>
<mask id="lo{idn}" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#fff"/><path d="{D}" fill="#000" transform="translate(-2,-10)"/></mask></defs>
<path d="{D}" fill="#000" stroke="#000" stroke-width="{rw+8}" stroke-linejoin="round" transform="translate(0,22)" opacity=".4" filter="url(#blur8)"/>
<path d="{D}" fill="{rim}" stroke="{rim}" stroke-width="{rw}" stroke-linejoin="round" transform="translate(0,6)"/>
<path d="{D}" fill="{rim}" stroke="{rim}" stroke-width="{rw}" stroke-linejoin="round"/>
<path d="{D}" fill="{out}" stroke="{out}" stroke-width="{ow}" stroke-linejoin="round" transform="translate(0,14)"/>
<path d="{D}" fill="{out}" stroke="{out}" stroke-width="{ow}" stroke-linejoin="round"/>
<path d="{D}" fill="{fill}"/>
<g clip-path="url(#cw{idn})">
 <rect width="{W}" height="{H}" fill="{low}" opacity=".55" mask="url(#lo{idn})"/>
 <rect width="{W}" height="{H}" fill="#fffde8" opacity=".95" mask="url(#hi{idn})"/>
 <path d="M0 {y0} H{W} V{y0+(y1-y0)*.32} Q{W/2} {y0+(y1-y0)*.48} 0 {y0+(y1-y0)*.32} Z" fill="url(#gloss)" opacity=".5"/>
</g>'''
