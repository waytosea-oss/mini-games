import math
from glyphs import contours
F='fonts/ResourceHanRoundedCN-Heavy.ttf'
W,H=1080,640
def C(ch,cx,cy,s,rot=0): return contours(F,ch,cx,cy,s,rot)
def sparkle(x,y,r,col='#fff',op=1):
    return f'<path d="M{x} {y-r} Q{x+r*0.14} {y-r*0.14} {x+r} {y} Q{x+r*0.14} {y+r*0.14} {x} {y+r} Q{x-r*0.14} {y+r*0.14} {x-r} {y} Q{x-r*0.14} {y-r*0.14} {x} {y-r}Z" fill="{col}" opacity="{op}"/>'
def star5(cx,cy,R,rot=-90,inner=.5):
    pts=[]
    for i in range(10):
        a=math.radians(rot+i*36); r=R if i%2==0 else R*inner
        pts.append(f'{cx+r*math.cos(a):.1f},{cy+r*math.sin(a):.1f}')
    return 'M'+' L'.join(pts)+'Z'
def bubble(cx,cy,r,col='#7af0ff',dark='#1a0830',sw=8):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r+sw*0.5}" fill="{dark}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#bub_{col[1:]})"/>'
            f'<ellipse cx="{cx-r*0.32}" cy="{cy-r*0.38}" rx="{r*0.34}" ry="{r*0.22}" transform="rotate(-35 {cx-r*0.32} {cy-r*0.38})" fill="#fff" opacity=".9"/>'
            f'<circle cx="{cx+r*0.38}" cy="{cy+r*0.36}" r="{r*0.1}" fill="#fff" opacity=".7"/>')
def bubgrad(col):
    return (f'<radialGradient id="bub_{col[1:]}" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/>'
            f'<stop offset=".35" stop-color="{col}"/><stop offset="1" stop-color="{col}" stop-opacity=".55"/></radialGradient>')
def hat(cx,cy,s,rot=-12,dark='#1a0830'):
    # witch hat, base centre at cx,cy, brim width ~ 2.1*s
    g=f'<g transform="translate({cx},{cy}) rotate({rot}) scale({s/100})">'
    cone='M-58 -6 C-40 -60 -20 -120 18 -168 C30 -182 52 -186 66 -176 C46 -170 36 -150 34 -128 C30 -84 40 -40 58 -6Z'
    brim='M-112 2 C-80 -26 80 -26 112 2 C80 26 -80 26 -112 2Z'
    g+=f'<path d="{brim}" fill="{dark}" stroke="{dark}" stroke-width="22" stroke-linejoin="round"/>'
    g+=f'<path d="{cone}" fill="{dark}" stroke="{dark}" stroke-width="22" stroke-linejoin="round"/>'
    g+=f'<path d="{brim}" fill="url(#hatg)"/>'
    g+=f'<path d="{cone}" fill="url(#hatg)"/>'
    g+=f'<path d="M-50 -22 C-20 -34 20 -34 52 -22 L56 -6 C20 -18 -20 -18 -56 -6Z" fill="url(#goldL)" stroke="{dark}" stroke-width="5"/>'
    g+=f'<rect x="-12" y="-32" width="24" height="24" rx="4" fill="#3a1060" stroke="url(#goldL)" stroke-width="6"/>'
    g+=f'<path d="M-30 -60 C-16 -100 0 -130 20 -150" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none" opacity=".35"/>'
    g+=f'<path d="M-96 -2 C-60 -18 -20 -20 10 -18" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".35"/>'
    g+=f'<path d="{star5(4,-90,15,-90,.45)}" fill="url(#goldL)" stroke="{dark}" stroke-width="4" stroke-linejoin="round"/>'
    g+='</g>'
    return g
def flask(cx,cy,s,liq='#ff4fd8',rot=0,dark='#1a0830',gid='fl'):
    # round-bottom potion flask centred at body centre
    g=f'<g transform="translate({cx},{cy}) rotate({rot}) scale({s/100})">'
    body='M-16 -96 L16 -96 L16 -48 C52 -36 70 -6 70 24 C70 66 38 96 0 96 C-38 96 -70 66 -70 24 C-70 -6 -52 -36 -16 -48Z'
    g+=f'<path d="{body}" fill="{dark}" stroke="{dark}" stroke-width="24" stroke-linejoin="round"/>'
    g+=f'<path d="{body}" fill="#e8dcff" fill-opacity=".55"/>'
    g+=f'<clipPath id="cl{gid}"><path d="{body}"/></clipPath><g clip-path="url(#cl{gid})">'
    g+=f'<path d="M-90 4 C-50 -10 -30 14 0 4 C30 -8 50 14 90 2 L90 120 L-90 120Z" fill="url(#liq_{gid})"/>'
    g+=f'<path d="M-90 4 C-50 -10 -30 14 0 4 C30 -8 50 14 90 2" stroke="#fff" stroke-width="7" fill="none" opacity=".55"/>'
    for (bx,by,br) in [(-26,50,9),(14,30,6),(30,62,11),(-6,74,5),(-40,24,5)]:
        g+=f'<circle cx="{bx}" cy="{by}" r="{br}" fill="#fff" opacity=".55"/>'
    g+='</g>'
    g+=f'<path d="M-48 -4 C-56 18 -52 46 -36 62" stroke="#fff" stroke-width="12" stroke-linecap="round" fill="none" opacity=".75"/>'
    g+=f'<rect x="-24" y="-132" width="48" height="42" rx="10" fill="#c8874a" stroke="{dark}" stroke-width="10"/>'
    g+=f'<rect x="-22" y="-104" width="44" height="14" rx="6" fill="url(#goldL)" stroke="{dark}" stroke-width="6"/>'
    g+=f'<path d="M-14 -124 L-2 -124" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".5"/>'
    g+='</g>'
    return g
def liqgrad(gid,c1,c2,c3):
    return f'<linearGradient id="liq_{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset=".5" stop-color="{c2}"/><stop offset="1" stop-color="{c3}"/></linearGradient>'
def leaf(x,y,len_,rot,dark='#1a0830'):
    L=len_
    d=f'M0 0 C{L*0.3} {-L*0.32} {L*0.8} {-L*0.3} {L} 0 C{L*0.8} {L*0.3} {L*0.3} {L*0.32} 0 0Z'
    return (f'<g transform="translate({x},{y}) rotate({rot})"><path d="{d}" fill="{dark}" stroke="{dark}" stroke-width="10" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="url(#leafg)"/><path d="M{L*0.08} 0 L{L*0.85} 0" stroke="#d8ffb0" stroke-width="3.5" stroke-linecap="round" opacity=".8"/></g>')
DEFS_COMMON='''
 <linearGradient id="goldL" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#fffbe0"/><stop offset=".3" stop-color="#ffe066"/><stop offset=".65" stop-color="#f5a812"/><stop offset="1" stop-color="#c06a00"/></linearGradient>
 <linearGradient id="hatg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b070ff"/><stop offset=".55" stop-color="#6a2ad0"/><stop offset="1" stop-color="#3a1080"/></linearGradient>
 <linearGradient id="leafg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8ff6a"/><stop offset=".5" stop-color="#4ed04a"/><stop offset="1" stop-color="#1e8a3a"/></linearGradient>
 <filter id="blur8" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>
 <filter id="blur14" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
'''
