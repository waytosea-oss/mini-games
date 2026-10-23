import math
from glyph2 import place
RHR='fonts/ResourceHanRoundedCN-Heavy.ttf'; KL='fonts/ZCOOLKuaiLe.ttf'; SM='fonts/SmileySans-Oblique.ttf'; HY='fonts/ZCOOLQingKeHuangYou.ttf'
def circle(cx,cy,r):
    return f"M{cx-r:.1f} {cy:.1f} a{r} {r} 0 1 0 {2*r} 0 a{r} {r} 0 1 0 {-2*r} 0Z"
def ring(cx,cy,r1,r2):
    # outer cw, inner ccw -> works with nonzero
    return (f"M{cx-r1:.1f} {cy:.1f} a{r1} {r1} 0 1 0 {2*r1} 0 a{r1} {r1} 0 1 0 {-2*r1} 0Z "
            f"M{cx-r2:.1f} {cy:.1f} a{r2} {r2} 0 1 1 {2*r2} 0 a{r2} {r2} 0 1 1 {-2*r2} 0Z")
def rrect(cx,cy,w,h,rot):
    r=w/2
    return f'<rect x="{cx-w/2:.1f}" y="{cy-h/2:.1f}" width="{w}" height="{h}" rx="{r}" transform="rotate({rot} {cx} {cy})"/>'
def handle_path(x0,y0,ang,L,w):
    a=math.radians(ang); dx,dy=math.cos(a),math.sin(a); nx,ny=-dy,dx; r=w/2
    p1=(x0+nx*r,y0+ny*r); p2=(x0+dx*L+nx*r,y0+dy*L+ny*r); p3=(x0+dx*L-nx*r,y0+dy*L-ny*r); p4=(x0-nx*r,y0-ny*r)
    return f"M{p1[0]:.1f} {p1[1]:.1f} L{p2[0]:.1f} {p2[1]:.1f} A{r} {r} 0 0 0 {p3[0]:.1f} {p3[1]:.1f} L{p4[0]:.1f} {p4[1]:.1f} A{r} {r} 0 0 0 {p1[0]:.1f} {p1[1]:.1f}Z"
def eye(cx,cy,r,iris='#2f9bff',iris2='#0a3d91',look=(0.12,0.08),uid='e'):
    lx,ly=look[0]*r,look[1]*r
    return f'''<defs><radialGradient id="eb{uid}" cx=".42" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#eef6ff"/><stop offset="1" stop-color="#b8cde6"/></radialGradient>
<radialGradient id="ir{uid}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6a0"/><stop offset=".28" stop-color="{iris}"/><stop offset=".85" stop-color="{iris2}"/><stop offset="1" stop-color="#061a40"/></radialGradient>
<linearGradient id="gl{uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="#fff" stop-opacity=".0"/></linearGradient></defs>
<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#eb{uid})"/>
<circle cx="{cx+lx}" cy="{cy+ly}" r="{r*0.56}" fill="url(#ir{uid})" stroke="#06204a" stroke-width="{r*0.05:.1f}"/>
<g stroke="#ffffff" stroke-opacity=".25" stroke-width="{r*0.025:.1f}">{''.join(f'<line x1="{cx+lx+math.cos(math.radians(k))*r*0.24:.1f}" y1="{cy+ly+math.sin(math.radians(k))*r*0.24:.1f}" x2="{cx+lx+math.cos(math.radians(k))*r*0.5:.1f}" y2="{cy+ly+math.sin(math.radians(k))*r*0.5:.1f}"/>' for k in range(0,360,30))}</g>
<circle cx="{cx+lx}" cy="{cy+ly}" r="{r*0.25}" fill="#04102a"/>
<ellipse cx="{cx+lx-r*0.2}" cy="{cy+ly-r*0.22}" rx="{r*0.15}" ry="{r*0.11}" fill="#fff" transform="rotate(-30 {cx+lx-r*0.2} {cy+ly-r*0.22})"/>
<circle cx="{cx+lx+r*0.18}" cy="{cy+ly+r*0.16}" r="{r*0.06}" fill="#fff" opacity=".9"/>
<path d="M{cx-r*0.82:.1f} {cy-r*0.1:.1f} A{r*0.84} {r*0.84} 0 0 1 {cx+r*0.1:.1f} {cy-r*0.82:.1f}" stroke="#fff" stroke-width="{r*0.12:.1f}" stroke-linecap="round" fill="none" opacity=".7"/>'''
def sparkle(x,y,s,fill='#fff'):
    return f'<path d="M{x} {y-s} Q{x+s*0.18} {y-s*0.18} {x+s} {y} Q{x+s*0.18} {y+s*0.18} {x} {y+s} Q{x-s*0.18} {y+s*0.18} {x-s} {y} Q{x-s*0.18} {y-s*0.18} {x} {y-s}Z" fill="{fill}"/>'
