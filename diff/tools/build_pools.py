# 按实测难度把图片分进星级题库，输出 ../pools.js
# 用法：python3 tools/measure.py && python3 tools/build_pools.py
import json,os
H=os.path.dirname(os.path.abspath(__file__))
D=sorted(json.load(open(os.path.join(H,'difficulty.json'))),key=lambda o:o['score'])
BANDS=[ # 每档：名称、配色、限时（秒）、二星/一星用时线（秒）
 {'n':'一星 · 新手池','c':['#7fe08a','#1f9a5a'],'time':300,'s2':150,'s1':240},
 {'n':'二星 · 进阶池','c':['#6ad0ff','#2a6fe0'],'time':300,'s2':180,'s1':260},
 {'n':'三星 · 高手池','c':['#c59aff','#6a3ae0'],'time':300,'s2':210,'s1':280},
]
SLOTS=10  # 每档关卡数
per=len(D)//len(BANDS)
for b,band in enumerate(BANDS):
    band['ids']=[o['id'] for o in D[b*per:(b+1)*per]]
    band['slots']=SLOTS
open(os.path.join(H,'..','pools.js'),'w',encoding='utf8').write('/* 由 tools/build_pools.py 生成：按实测难度分档的题库 */\nwindow.POOLS='+json.dumps(BANDS,ensure_ascii=False)+';\n')
for b in BANDS: print(b['n'],b['ids'])
