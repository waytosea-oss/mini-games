import math, base64
from glyphs import contours
RHR='fonts/ResourceHanRoundedCN-Heavy.ttf'
def b64(p,mime='image/webp'): return f"data:{mime};base64,"+base64.b64encode(open(p,'rb').read()).decode()
def tf(pts,cx,cy,s,rot):
    a=math.radians(rot); c,sn=math.cos(a),math.sin(a)
    return [(cx+(x*c-y*sn)*s, cy+(x*sn+y*c)*s) for x,y in pts]
def shape(cmds,cx,cy,s,rot):
    """cmds: list of (op, [pts]) op in M,C,L,Q,Z ; unit coords"""
    out=[]
    for op,pts in cmds:
        if op=='Z': out.append('Z'); continue
        q=tf(pts,cx,cy,s,rot); out.append(op+' '.join(f'{x:.1f} {y:.1f}' for x,y in q))
    return ''.join(out)
# sakura petal: tip notch at top (-y), base at +y ; length 1
PETAL=[('M',[(0,.5)]),('C',[(-.5,.22),(-.46,-.32),(-.17,-.5)]),('L',[(0,-.37)]),('L',[(.17,-.5)]),('C',[(.46,-.32),(.5,.22),(0,.5)]),('Z',[])]
LEAF=[('M',[(0,.5)]),('C',[(-.42,.2),(-.3,-.3),(0,-.5)]),('C',[(.3,-.3),(.42,.2),(0,.5)]),('Z',[])]
def petal(cx,cy,s,rot): return shape(PETAL,cx,cy,s,rot)
def leaf(cx,cy,s,rot): return shape(LEAF,cx,cy,s,rot)
def vein(cx,cy,s,rot,a=.3,b=-.2): return shape([('M',[(0,a)]),('L',[(0,b)])],cx,cy,s,rot)
def blossom(cx,cy,r,rot=0):
    return [petal(*tf([(0,-r*0.5)],cx,cy,1,rot+k*72)[0], r, rot+k*72) for k in range(5)]
def sparkle(x,y,r,col='#fff',op=1):
    return f'<path d="M{x} {y-r} Q{x+r*0.14} {y-r*0.14} {x+r} {y} Q{x+r*0.14} {y+r*0.14} {x} {y+r} Q{x-r*0.14} {y+r*0.14} {x-r} {y} Q{x-r*0.14} {y-r*0.14} {x} {y-r}Z" fill="{col}" opacity="{op}"/>'
# which contours become petals / green
SPEC={
 '花':{'green':[2],'petal':{},'leaf':{}},
 '瓣':{'green':[],'petal':{2:(-28,1.55),6:(-28,1.55)},'leaf':{}},
 '消':{'green':[],'petal':{7:(-58,1.08),3:(-62,1.05),5:(-26,1.0),6:(28,1.0)},'leaf':{1:28}},
}
def char(ch,cx,cy,S,rot=0,pscale=1.35):
    """returns dict main, green, petals[(d,cx,cy,s,rot)], leaves[...], blossoms[(x,y,r)] all abs coords"""
    cs=contours(RHR,ch,cx,cy,S,rot); sp=SPEC[ch]
    main=[];green=[];petals=[];leaves=[];bl=[]
    for i,(d,bb) in enumerate(cs):
        x0,y0,x1,y1=bb; mx,my=(x0+x1)/2,(y0+y1)/2; sz=max(x1-x0,y1-y0)
        if i in sp['petal']: a,k=sp['petal'][i]; petals.append((mx,my,sz*k,a+rot))
        elif i in sp['leaf']: leaves.append((mx,my,sz*1.12,sp['leaf'][i]+rot))
        elif i in sp['green']:
            green.append(d)
            w=x1-x0
            for f in (.33,.69): bl.append((x0+w*f,y0+(y1-y0)*.18,S*.105))
        else: main.append(d)
    return dict(main=' '.join(main),green=' '.join(green),petals=petals,leaves=leaves,bl=bl,cx=cx,cy=cy)
