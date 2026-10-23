# Option B: 马路字 — every stroke is an asphalt road (white edge lines, yellow dashed centre line, red-white kerb outline), cars drive on the letters, "！" dot is a P sign, green highway-sign subtitle
from common import *
random.seed(5)
W,H=1080,760
chars=[('快',205,320,310,-4),('挪',505,312,310,0),('车',805,320,310,4)]
D=' '.join(place(RHR,c,x,y,s,r)[0] for c,x,y,s,r in chars)
bar=place(RHR,'！',990,300,300)[0]
# only keep bar part of ！: clip away dot below y=400
sub=' '.join(place(RHR,c,90+i*82+300,650,70)[0] for i,c in enumerate('停车场大堵车'))
noise=''.join(f'<circle cx="{random.randint(0,W)}" cy="{random.randint(120,520)}" r="{random.choice([1.2,1.8,2.5])}" fill="{random.choice(["#6a7284","#22262f","#8a92a4"])}"/>' for _ in range(900))
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>{DEFS.format(y0=150,y1=480)}
<clipPath id="cw"><path d="{D}"/><path d="{bar}"/></clipPath>
<clipPath id="top"><rect width="{W}" height="410"/></clipPath>
<linearGradient id="asph" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c7588"/><stop offset=".5" stop-color="#4a5163"/><stop offset="1" stop-color="#2a2e38"/></linearGradient>
<linearGradient id="green" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fc46a"/><stop offset=".6" stop-color="#119048"/><stop offset="1" stop-color="#076432"/></linearGradient>
<pattern id="dash" patternUnits="userSpaceOnUse" width="34" height="34" patternTransform="rotate(45)"><rect width="34" height="17" fill="#fff"/></pattern>
<mask id="dm" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="url(#dash)"/></mask>
<filter id="edge" x="-5%" y="-5%" width="110%" height="110%"><feMorphology in="SourceAlpha" operator="erode" radius="6" result="a"/><feMorphology in="SourceAlpha" operator="erode" radius="10" result="b"/><feComposite in="a" in2="b" operator="out" result="r"/><feFlood flood-color="#ffffff"/><feComposite in2="r" operator="in"/></filter>
<filter id="mid" x="-5%" y="-5%" width="110%" height="110%"><feMorphology in="SourceAlpha" operator="erode" radius="20.3" result="a"/><feMorphology in="a" operator="dilate" radius="1.5" result="b"/><feFlood flood-color="#ffd21c"/><feComposite in2="b" operator="in"/></filter>
<mask id="hiM" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#fff"/><path d="{D}" fill="#000" transform="translate(2,8)"/><path d="{bar}" fill="#000" transform="translate(2,8)"/></mask>
</defs>
<g transform="translate(0,22)" opacity=".45" filter="url(#blur8)"><path d="{D}" stroke="#0b1630" stroke-width="64" stroke-linejoin="round"/><path d="{bar}" clip-path="url(#top)" stroke="#0b1630" stroke-width="64" stroke-linejoin="round"/></g>
<g stroke-linejoin="round">
 <g transform="translate(0,8)"><path d="{D}" fill="#0b1630" stroke="#0b1630" stroke-width="52"/><path d="{bar}" clip-path="url(#top)" fill="#0b1630" stroke="#0b1630" stroke-width="52"/></g>
 <path d="{D}" fill="#0b1630" stroke="#0b1630" stroke-width="52"/><path d="{bar}" clip-path="url(#top)" fill="#0b1630" stroke="#0b1630" stroke-width="52"/>
 <path d="{D}" fill="#fff" stroke="#fff" stroke-width="36"/><path d="{bar}" clip-path="url(#top)" fill="#fff" stroke="#fff" stroke-width="36"/>
 <path d="{D}" fill="none" stroke="#e8262e" stroke-width="36" stroke-dasharray="15 15"/><path d="{bar}" clip-path="url(#top)" fill="none" stroke="#e8262e" stroke-width="36" stroke-dasharray="15 15"/>
 <path d="{D}" fill="#0b1630" stroke="#0b1630" stroke-width="12"/><path d="{bar}" clip-path="url(#top)" fill="#0b1630" stroke="#0b1630" stroke-width="12"/>
</g>
<g clip-path="url(#cw)">
 <rect width="{W}" height="{H}" fill="url(#asph)"/>{noise}
 <g filter="url(#edge)"><path d="{D}"/><path d="{bar}"/></g>
 <g mask="url(#dm)"><g filter="url(#mid)"><path d="{D}"/><path d="{bar}"/></g></g>
 <rect width="{W}" height="{H}" fill="#fff" opacity=".28" mask="url(#hiM)"/>
</g>
{img('taxi',150,250,46,88,0)}
{img('police',545,385,46,88,180)}
{img('sports',870,240,46,84,90)}
{img('icecream',360,404,44,84,90)}
<!-- dot of ! : round P parking sign -->
<g><circle cx="990" cy="440" r="44" fill="#0b1630"/><circle cx="990" cy="435" r="40" fill="url(#signblue)" stroke="#fff" stroke-width="7"/><path d="{place(RHR,'P',990,435,64)[0]}" fill="#fff"/></g>
<!-- green expressway-style sign -->
<g>
 <rect x="282" y="584" width="690" height="128" rx="22" fill="#0b1630" opacity=".45" filter="url(#blur8)" transform="translate(0,10)"/>
 <rect x="282" y="584" width="690" height="128" rx="22" fill="url(#green)" stroke="#0b1630" stroke-width="8"/>
 <rect x="292" y="594" width="670" height="108" rx="15" fill="none" stroke="#fff" stroke-width="6"/>
 <path d="{sub}" fill="#0b1630" stroke="#0b1630" stroke-width="12" stroke-linejoin="round" transform="translate(0,4)"/>
 <path d="{sub}" fill="#fff"/>
 <path d="M140 648 h-40 M120 600 v100" stroke="#8a93a6" stroke-width="0"/>
 <g transform="translate(380,648)"><path d="M-62 0 h-0" /></g>
</g>
<g transform="translate(205,648)"><rect x="-70" y="-58" width="140" height="116" rx="22" fill="url(#signblue)" stroke="#0b1630" stroke-width="8"/><rect x="-61" y="-49" width="122" height="98" rx="15" fill="none" stroke="#fff" stroke-width="6"/><path d="M-36 0 H30 M10 -24 L36 0 L10 24" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>
</svg>'''
open('optB.svg','w').write(svg); print('ok')
