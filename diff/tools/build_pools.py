# 按实测难度把图片分进星级题库，输出 ../pools.js
# 用法：python3 tools/measure.py && python3 tools/build_pools.py
import json,os
SLOTS=10  # 每档关卡数
H=os.path.dirname(os.path.abspath(__file__))
D=sorted(json.load(open(os.path.join(H,'difficulty.json'))),key=lambda o:o['score'])
BANDS=[ # 每档：名称、配色、限时（秒）、二星/一星用时线（秒）
 {'n':'一星 · 新手池','c':['#7fe08a','#1f9a5a'],'time':300,'s2':150,'s1':240},
 {'n':'二星 · 进阶池','c':['#6ad0ff','#2a6fe0'],'time':300,'s2':180,'s1':260},
 {'n':'三星 · 高手池','c':['#c59aff','#6a3ae0'],'time':300,'s2':210,'s1':280},
 {'n':'四星 · 精英池','c':['#ffc36a','#e0702a'],'time':330,'s2':230,'s1':300},
 {'n':'五星 · 大师池','c':['#ff8a9a','#d0304a'],'time':360,'s2':250,'s1':320},
 {'n':'六星 · 传说池','c':['#ffe14a','#b07a10'],'time':360,'s2':270,'s1':340},
]
# 1–30 原题分前三档，31–60 再探题分后三档（各自按实测难度排序，保持曲线单调）
OLD=[o for o in D if o['id']<=30]; NEW=[o for o in D if o['id']>30]
for b,band in enumerate(BANDS):
    src=OLD if b<3 else NEW; k=b%3
    band['ids']=[o['id'] for o in src[k*SLOTS:(k+1)*SLOTS]]
    band['slots']=SLOTS
open(os.path.join(H,'..','pools.js'),'w',encoding='utf8').write('/* 由 tools/build_pools.py 生成：按实测难度分档的题库 */\nwindow.POOLS='+json.dumps(BANDS,ensure_ascii=False)+';\n')
for b in BANDS: print(b['n'],b['ids'])
