import sys
from lib import *
W,H=1080,600
PC=[0]
def build(opt):
    PC[0]=-1
    P=OPTS[opt]
    chars=[char(ch,x,y,P['S'],r) for ch,x,y,r in P['layout']]
    defs=P['defs']
    out=[]
    def allshapes(c):
        ds=[c['main'],c['green']]+[petal(*p) for p in c['petals']]+[leaf(*l) for l in c['leaves']]
        for b in c['bl']: ds+=blossom(*b)
        return ' '.join(d for d in ds if d)
    # back layers
    for c in chars:
        a=allshapes(c)
        out.append(f'<path d="{a}" fill="{P["dark"]}" stroke="{P["dark"]}" stroke-width="{P["ow"]+16}" stroke-linejoin="round" transform="translate(0,20)" opacity=".45" filter="url(#blur8)"/>')
    for c in chars:
        a=allshapes(c)
        out.append(f'<path d="{a}" fill="{P["dark"]}" stroke="{P["dark"]}" stroke-width="{P["ow"]}" stroke-linejoin="round" transform="translate(0,{P["depth"]})"/>')
        out.append(f'<path d="{a}" fill="{P["dark"]}" stroke="{P["dark"]}" stroke-width="{P["ow"]}" stroke-linejoin="round"/>')
        out.append(f'<path d="{a}" fill="{P["rim"]}" stroke="{P["rimd"]}" stroke-width="{P["rw"]}" stroke-linejoin="round" transform="translate(0,6)"/>')
        out.append(f'<path d="{a}" fill="{P["rim"]}" stroke="url(#rimg)" stroke-width="{P["rw"]}" stroke-linejoin="round"/>')
        out.append(f'<path d="{a}" fill="{P["dark2"]}" stroke="{P["dark2"]}" stroke-width="9" stroke-linejoin="round"/>')
    for k,c in enumerate(chars):
        body=P['body'][k%len(P['body'])]
        cid=f'cp{k}'
        out.append(f'<clipPath id="{cid}"><path d="{c["main"]}"/></clipPath>')
        out.append(f'<path d="{c["main"]}" fill="url(#{body})"/>')
        cx,cy=c['cx'],c['cy']
        out.append(f'''<g clip-path="url(#{cid})">
<path d="M{cx-200} {cy-30} Q{cx} {cy-90} {cx+200} {cy-60} L{cx+200} {cy-220} L{cx-200} {cy-220}Z" fill="#fff" opacity=".22"/>
<path d="{c['main']}" fill="none" stroke="#fff" stroke-width="10" opacity=".75" transform="translate(-2,-6)"/>
<path d="{c['main']}" fill="none" stroke="{P['shade']}" stroke-width="12" opacity=".4" transform="translate(3,8)"/></g>''')
        if c['green']:
            out.append(f'<clipPath id="g{cid}"><path d="{c["green"]}"/></clipPath><path d="{c["green"]}" fill="url(#leafg)"/>')
            out.append(f'<g clip-path="url(#g{cid})"><path d="{c["green"]}" fill="none" stroke="#eaffc0" stroke-width="9" opacity=".8" transform="translate(-2,-5)"/><path d="{c["green"]}" fill="none" stroke="#1f6a20" stroke-width="10" opacity=".45" transform="translate(2,6)"/></g>')
        for x,y,s,r in c['leaves']:
            out.append(f'<path d="{leaf(x,y,s,r)}" fill="url(#leafg)"/><path d="{vein(x,y,s,r,.36,-.3)}" stroke="#d8ffb0" stroke-width="5" stroke-linecap="round" opacity=".85"/>')
        for i,(x,y,s,r) in enumerate(c['petals']):
            PC[0]+=1; pg=P['petal'][PC[0]%len(P['petal'])]
            out.append(f'<path d="{petal(x,y,s,r)}" fill="url(#{pg})"/><path d="{petal(x,y,s*.72,r)}" fill="none" stroke="#fff" stroke-width="5" opacity=".55" transform="translate(-2,-3)"/><path d="{vein(x,y,s,r,.34,-.18)}" stroke="{P["veinc"]}" stroke-width="4.5" stroke-linecap="round" opacity=".55"/>')
        for x,y,r in c['bl']:
            for i,d in enumerate(blossom(x,y,r)):
                out.append(f'<path d="{d}" fill="url(#{P["petal"][0]})"/>')
            out.append(f'<circle cx="{x}" cy="{y}" r="{r*.32}" fill="#ffd23a" stroke="#d07a00" stroke-width="3"/><circle cx="{x-r*.1}" cy="{y-r*.1}" r="{r*.1}" fill="#fff8c0"/>')
    extra=P['extra'](chars) if 'extra' in P else ''
    pre=P['pre'](chars) if 'pre' in P else ''
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><defs>{DEFS}{defs}</defs>{pre}{"".join(out)}{extra}</svg>'
    open(f'opt{opt}.svg','w').write(svg)
DEFS='''<filter id="blur8" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>
<linearGradient id="leafg" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#b6f27a"/><stop offset=".5" stop-color="#58c040"/><stop offset="1" stop-color="#2a8a2e"/></linearGradient>
<radialGradient id="pk" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="#fffafc"/><stop offset=".45" stop-color="#ffc4dc"/><stop offset="1" stop-color="#ff6fa6"/></radialGradient>
<radialGradient id="pw" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#fff0f6"/><stop offset="1" stop-color="#ffb3d1"/></radialGradient>
<radialGradient id="py" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="#fffbe6"/><stop offset=".5" stop-color="#ffe680"/><stop offset="1" stop-color="#ffaa2a"/></radialGradient>
<radialGradient id="pr" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="#fff0f0"/><stop offset=".45" stop-color="#ff8aa0"/><stop offset="1" stop-color="#e8325a"/></radialGradient>
<radialGradient id="pl" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="#fbf4ff"/><stop offset=".5" stop-color="#d9b8ff"/><stop offset="1" stop-color="#9a66ea"/></radialGradient>
'''
def g(id,stops): return f'<linearGradient id="{id}" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">'+''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o,c in stops)+'</linearGradient>'
BEE=b64('../assets/mascot.webp')
def bee(x,y,w,rot=0): return f'<image href="{BEE}" x="{x-w/2}" y="{y-w*0.62}" width="{w}" height="{w*1.248}" transform="rotate({rot} {x} {y})"/>'
LAY=[('花',160,300,-6),('瓣',412,314,3),('消',670,296,-3),('消',922,312,5)]
def floaters(chars,cols):
    import random; random.seed(7); s=''
    for x,y,sz,r,c in [(70,150,40,-30,0),(1010,170,34,40,1),(990,470,30,-60,2),(80,470,28,20,1),(540,90,26,70,2),(300,520,22,-20,0),(780,530,24,50,0)]:
        s+=f'<path d="{petal(x,y,sz,r)}" fill="url(#{cols[c]})" stroke="#a03060" stroke-width="3" opacity=".95"/>'
    return s
def trail(x0,y0,x1,y1):
    return f'<path d="M{x0} {y0} Q{(x0+x1)/2} {min(y0,y1)-90} {x1} {y1}" stroke="#fff" stroke-width="6" stroke-dasharray="2 16" stroke-linecap="round" fill="none" opacity=".9"/>'
OPTS={
 'A':dict(S=250,layout=LAY,dark='#6a1838',dark2='#8a2048',ow=50,depth=12,rim='#fff6fa',rimd='#e7a6c2',rw=24,shade='#a0105a',veinc='#d0407a',
   body=['bodyA'],petal=['py','pr','pk','pw','py','pk','pw','pk','pr','pw'],
   defs=g('bodyA',[(0,'#ffd0e6'),(.4,'#ff7eb6'),(.78,'#f0408a'),(1,'#c01a66')])+g('rimg',[(0,'#ffffff'),(.6,'#fff0f6'),(1,'#f4c6da')]),
   pre=lambda c: '<ellipse cx="540" cy="300" rx="540" ry="250" fill="url(#halo)"/>',
   extra=lambda c: floaters(c,['pk','pw','py'])+trail(820,150,960,120)+bee(990,112,120,12)),
 'B':dict(S=246,layout=LAY,dark='#3d2a5a',dark2='#55406e',ow=48,depth=12,rim='#ffffff',rimd='#d6c6ea',rw=26,shade='#302050',veinc='#a04080',
   body=['b1','b2','b3','b4'],petal=['pr','py','pk','pl','py','pr','pk','pw','pl','pk'],
   defs=g('b1',[(0,'#ffe0c8'),(.45,'#ffa070'),(1,'#e8603a')])+g('b2',[(0,'#e8ffe0'),(.45,'#7ee0a0'),(1,'#2fae6a')])+g('b3',[(0,'#f4e8ff'),(.45,'#bd96ff'),(1,'#7a4ae0')])+g('b4',[(0,'#fff8d0'),(.45,'#ffd84a'),(1,'#f09a10')])+g('rimg',[(0,'#ffffff'),(1,'#efe6fa')]),
   pre=lambda c: '<ellipse cx="540" cy="300" rx="540" ry="250" fill="url(#halo)"/>',
   extra=lambda c: floaters(c,['pr','py','pl'])+bee(1000,128,110,14)),
 'C':dict(S=250,layout=[('花',160,306,0),('瓣',412,306,0),('消',668,306,0),('消',922,306,0)],dark='#5a2a10',dark2='#7a3a10',ow=46,depth=14,rim='#ffe27a',rimd='#b8660a',rw=28,shade='#7a3a00',veinc='#c02a5a',
   body=['bodyC'],petal=['pr','pk','pk','pr','pw','pk','pr','pk','pw','pr'],
   defs=g('bodyC',[(0,'#fffaf0'),(.5,'#fff0d8'),(1,'#f4c890')])+g('rimg',[(0,'#fff8c8'),(.4,'#ffd84a'),(1,'#d88a10')]),
   pre=lambda c: honey(),
   extra=lambda c: floaters(c,['pk','pr','pw'])+bee(540,96,100,-6)),
}
def honey():
    s='<path d="M60 160 Q540 60 1020 160 L1040 470 Q540 560 40 470Z" fill="#ffdf7a" stroke="#5a2a10" stroke-width="12" stroke-linejoin="round" opacity=".0"/>'
    return s
DEFS+='<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2a0" stop-opacity=".5"/><stop offset=".6" stop-color="#ffb0d6" stop-opacity=".18"/><stop offset="1" stop-color="#ffb0d6" stop-opacity="0"/></radialGradient>'
for o in sys.argv[1]: build(o)
