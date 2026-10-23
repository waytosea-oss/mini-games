import math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
_c={}
def F(f):
    if f not in _c: _c[f]=TTFont(f)
    return _c[f]
def contours(f, ch, cx, cy, size, rot=0, sx=1, sy=1):
    """returns list of (d, (x0,y0,x1,y1)) in output coords, plus glyph bbox"""
    t=F(f); gs=t.getGlyphSet(); name=t.getBestCmap()[ord(ch)]; upm=t['head'].unitsPerEm
    b=BoundsPen(gs); gs[name].draw(b); x0,y0,x1,y1=b.bounds
    s=size/upm
    tr=Transform().translate(cx,cy).rotate(math.radians(rot)).scale(s*sx,-s*sy).translate(-(x0+x1)/2,-(y0+y1)/2)
    rp=RecordingPen(); gs[name].draw(TransformPen(rp,tr))
    out=[]; cur=[]
    for op,args in rp.value:
        cur.append((op,args))
        if op in('closePath','endPath'):
            sp=SVGPathPen(None, ntos=lambda v:f"{v:.1f}")
            pts=[]
            for o,a in cur:
                getattr(sp,o)(*a); pts+=list(a)
            xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
            out.append((sp.getCommands(),(min(xs),min(ys),max(xs),max(ys))))
            cur=[]
    gb=[cx-(x1-x0)*s*sx/2, cy-(y1-y0)*s*sy/2, cx+(x1-x0)*s*sx/2, cy+(y1-y0)*s*sy/2]
    return out, gb
def place(f,ch,cx,cy,size,rot=0,sx=1,sy=1,drop=None):
    cs,gb=contours(f,ch,cx,cy,size,rot,sx,sy)
    keep=[c for c in cs if not (drop and drop(c[1],gb))]
    gone=[c for c in cs if (drop and drop(c[1],gb))]
    return ' '.join(c[0] for c in keep), gb, gone
