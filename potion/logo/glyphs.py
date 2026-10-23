import math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
_c={}
def font(f):
    if f not in _c: _c[f]=TTFont(f)
    return _c[f]
def contours(f, ch, cx, cy, size, rot=0):
    """returns list of (pathd, bbox) per contour, glyph bbox centred at cx,cy"""
    t=font(f); gs=t.getGlyphSet(); name=t.getBestCmap()[ord(ch)]; upm=t['head'].unitsPerEm
    b=BoundsPen(gs); gs[name].draw(b); x0,y0,x1,y1=b.bounds; s=size/upm
    tr=Transform().translate(cx,cy).rotate(math.radians(rot)).scale(s,-s).translate(-(x0+x1)/2,-(y0+y1)/2)
    rp=RecordingPen(); gs[name].draw(TransformPen(rp,tr))
    out=[];cur=[]
    for op,args in rp.value:
        cur.append((op,args))
        if op in('closePath','endPath'):
            out.append(cur);cur=[]
    res=[]
    for c in out:
        p=SVGPathPen(None, ntos=lambda v: f"{v:.1f}")
        pts=[]
        for op,args in c:
            getattr(p,op)(*args); pts+=list(args)
        xs=[q[0] for q in pts]; ys=[q[1] for q in pts]
        res.append((p.getCommands(),(min(xs),min(ys),max(xs),max(ys))))
    return res
def place(f,ch,cx,cy,size,rot=0):
    return ' '.join(c[0] for c in contours(f,ch,cx,cy,size,rot))
