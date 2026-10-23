import math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
_cache={}
def font(f):
    if f not in _cache: _cache[f]=TTFont(f)
    return _cache[f]
def place(f, ch, cx, cy, size, rot=0, sx=1.0, sy=1.0):
    """path d with glyph bbox centred at (cx,cy); size = em px; rot degrees"""
    t=font(f); gs=t.getGlyphSet(); name=t.getBestCmap()[ord(ch)]; upm=t['head'].unitsPerEm
    b=BoundsPen(gs); gs[name].draw(b); x0,y0,x1,y1=b.bounds
    s=size/upm
    tr=Transform().translate(cx,cy).rotate(math.radians(rot)).scale(s*sx,-s*sy).translate(-(x0+x1)/2,-(y0+y1)/2)
    p=SVGPathPen(gs, ntos=lambda v: f"{v:.1f}"); gs[name].draw(TransformPen(p,tr))
    return p.getCommands(), ((x1-x0)*s*sx,(y1-y0)*s*sy)
