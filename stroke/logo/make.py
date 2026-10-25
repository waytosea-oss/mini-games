# 一笔绘山海 · 标题字（马善政毛笔楷书 Ma Shan Zheng，SIL OFL 1.1）→ SVG → 透明 PNG/WebP
import sys; sys.path.insert(0,'.')
from glyphs import place
F='/usr/share/fonts/truetype/sand-box/google/Ma Shan Zheng/MaShanZheng-Regular.ttf'
N='/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
W,H=910,380
chars=[('一',120,150,150,-4),('笔',245,160,190,-3),('绘',405,165,190,2),('山',580,150,230,-2),('海',760,170,200,3)]
glyph=' '.join(place(F,c,x,y,s,r) for c,x,y,s,r in chars)
sub=' '.join(place(F,c,378+i*62,320,50,0) for i,c in enumerate('青鸟寻踪'))
seal=' '.join(place(F,c,x,y,46) for c,x,y in [('山',852,282),('海',852,334)])
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<defs>
 <linearGradient id="ink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3b3f"/><stop offset=".55" stop-color="#0b1f24"/><stop offset="1" stop-color="#05110f"/></linearGradient>
 <linearGradient id="jade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8fff0"/><stop offset=".5" stop-color="#3fd0b4"/><stop offset="1" stop-color="#14806f"/></linearGradient>
 <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b8"/><stop offset=".5" stop-color="#f2c24e"/><stop offset="1" stop-color="#b9781c"/></linearGradient>
 <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
 <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
 <clipPath id="gc"><path d="{glyph}"/></clipPath>
</defs>
<!-- 底部祥云飘带 -->
<path d="M150 300 C 260 270, 420 330, 560 296 S 760 270, 800 300 C 760 330, 600 352, 470 340 S 230 330,150 300Z" fill="#0d4a44" opacity=".88"/>
<path d="M150 300 C 260 270, 420 330, 560 296 S 760 270, 800 300" fill="none" stroke="url(#gold)" stroke-width="4" stroke-linecap="round"/>
<g fill="none" stroke="url(#gold)" stroke-width="5" stroke-linecap="round"><path d="M140 300c-24-6-30-34-8-40 18-4 26 16 12 22"/><path d="M812 300c24-6 30-34 8-40-18-4-26 16-12 22"/></g>
<path d="{sub}" fill="#fff6dc"/>
<!-- 外发光 + 宣纸白描边，保证在山水底图上可读 -->
<path d="{glyph}" fill="#9ff5e2" opacity=".55" filter="url(#glow)"/>
<path d="{glyph}" fill="none" stroke="#fffaf0" stroke-width="16" stroke-linejoin="round" filter="url(#rough)"/>
<path d="{glyph}" fill="none" stroke="url(#gold)" stroke-width="7" stroke-linejoin="round"/>
<path d="{glyph}" fill="url(#ink)" filter="url(#rough)"/>
<!-- 墨色里透出的青玉光：上半部高光 -->
<g clip-path="url(#gc)"><rect x="0" y="40" width="{W}" height="95" fill="url(#jade)" opacity=".5"/>
<path d="M60 70 Q 450 30 860 80 L860 110 Q 450 70 60 105Z" fill="#fff" opacity=".22"/></g>
<!-- 一笔：一条金色笔锋从「一」穿到「海」 -->
<path d="M60 222 C 220 200, 360 250, 520 214 S 760 196, 850 220" fill="none" stroke="url(#gold)" stroke-width="5" stroke-linecap="round" opacity=".95"/>
<circle cx="850" cy="220" r="7" fill="#fff6c8"/>
<!-- 朱砂印 -->
<g transform="rotate(4 852 308)"><rect x="820" y="252" width="64" height="112" rx="9" fill="#c8321e" stroke="#fff4e0" stroke-width="4"/>
<path d="{seal}" fill="#fff4e0"/></g>
</svg>'''
open('logo.svg','w').write(svg)
