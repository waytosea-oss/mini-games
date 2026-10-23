# Option C: 车牌字 — the title is a big blue Chinese-style licence plate being hoisted by a tow-truck hook (拖车), chunky white KuaiLe letters with bevel; 车 dot rivets; hazard-stripe subtitle bar
import math
from common import *
random.seed(9)
W,H=1080,760
cx,cy,pw,ph=540,360,900,300
chars=[('快',340,366,215,-3),('挪',540,362,215,0),('车',740,366,215,3),('！',880,362,215,6)]
D=' '.join(place(KL,c,x,y,s,r)[0] for c,x,y,s,r in chars)
sub=' '.join(place(RHR,c,340+i*80,668,66)[0] for i,c in enumerate('停车场大堵车'))
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>{DEFS.format(y0=250,y1=490)}
<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4aa8ff"/><stop offset=".5" stop-color="#1a62d8"/><stop offset="1" stop-color="#0a3a9a"/></linearGradient>
<linearGradient id="wl" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="250" y2="490"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef6ff"/><stop offset="1" stop-color="#b8d4ff"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a6478"/><stop offset=".4" stop-color="#e6ecf5"/><stop offset="1" stop-color="#6b768c"/></linearGradient>
<pattern id="haz" patternUnits="userSpaceOnUse" width="56" height="56" patternTransform="rotate(45)"><rect width="56" height="56" fill="#ffd21c"/><rect width="28" height="56" fill="#1b1f2a"/></pattern>
<mask id="hiM" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#fff"/><path d="{D}" fill="#000" transform="translate(2,8)"/></mask>
<clipPath id="cw"><path d="{D}"/></clipPath>
</defs>
<g transform="rotate(-4 {cx} {cy})">
 <!-- chains to hook -->
 <path d="M{cx-300} {cy-ph/2+20} L{cx} 70 L{cx+300} {cy-ph/2+20}" stroke="#0b1630" stroke-width="16" fill="none" stroke-linejoin="round"/>
 <path d="M{cx-300} {cy-ph/2+20} L{cx} 70 L{cx+300} {cy-ph/2+20}" stroke="url(#steel)" stroke-width="8" fill="none" stroke-dasharray="16 6" stroke-linejoin="round"/>
 <rect x="{cx-pw/2}" y="{cy-ph/2+16}" width="{pw}" height="{ph}" rx="46" fill="#0b1630" opacity=".5" filter="url(#blur8)"/>
 <rect x="{cx-pw/2}" y="{cy-ph/2}" width="{pw}" height="{ph}" rx="46" fill="#0b1630"/>
 <rect x="{cx-pw/2+10}" y="{cy-ph/2+10}" width="{pw-20}" height="{ph-20}" rx="38" fill="url(#plate)"/>
 <rect x="{cx-pw/2+24}" y="{cy-ph/2+24}" width="{pw-48}" height="{ph-48}" rx="28" fill="none" stroke="#fff" stroke-width="9"/>
 <path d="M{cx-pw/2+60} {cy-ph/2+40} H{cx+pw/2-60}" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".3"/>
 {''.join(f'<circle cx="{x}" cy="{cy-ph/2+20+16}" r="11" fill="url(#chrome)" stroke="#0b1630" stroke-width="4"/>' for x in (cx-300,cx+300))}
 <!-- province-style badge: P -->
 <g><rect x="{cx-pw/2+48}" y="{cy-60}" width="96" height="120" rx="18" fill="#fff" stroke="#0b1630" stroke-width="6"/><path d="{place(RHR,'P',cx-pw/2+96,cy,96)[0]}" fill="#1a62d8"/></g>
 <circle cx="{cx-pw/2+166}" cy="{cy+4}" r="9" fill="#fff"/>
 <path d="{D}" fill="#0b1630" stroke="#0b1630" stroke-width="30" stroke-linejoin="round" transform="translate(0,10)"/>
 <path d="{D}" fill="#0b1630" stroke="#0b1630" stroke-width="30" stroke-linejoin="round"/>
 <path d="{D}" fill="url(#wl)"/>
 <g clip-path="url(#cw)"><rect width="{W}" height="{H}" fill="#7aa8e8" opacity=".5" mask="url(#hiM)" transform="scale(1,1)"/></g>
</g>
<!-- tow hook -->
<g transform="translate({cx-6},20)">
 <rect x="-14" y="-40" width="28" height="56" fill="url(#steel)" stroke="#0b1630" stroke-width="6"/>
 <path d="M0 14 v26 a26 26 0 1 1 -40 22" stroke="#0b1630" stroke-width="22" fill="none" stroke-linecap="round"/>
 <path d="M0 14 v26 a26 26 0 1 1 -40 22" stroke="#ffb020" stroke-width="11" fill="none" stroke-linecap="round"/>
</g>
{img('cone',90,560,92,108,-12)}{img('cone',990,560,92,108,10)}
<!-- hazard subtitle bar -->
<g transform="rotate(2 540 668)">
 <rect x="230" y="606" width="620" height="124" rx="24" fill="#0b1630" opacity=".45" filter="url(#blur8)" transform="translate(0,10)"/>
 <rect x="230" y="606" width="620" height="124" rx="24" fill="url(#haz)" stroke="#0b1630" stroke-width="8"/>
 <rect x="262" y="622" width="556" height="92" rx="16" fill="#1b1f2a" stroke="#ffd21c" stroke-width="5"/>
 <path d="{sub}" fill="#ffd21c"/>
</g>
</svg>'''
open('optC.svg','w').write(svg); print('ok')
