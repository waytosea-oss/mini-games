import asyncio, sys
from playwright.async_api import async_playwright
URL='http://localhost:18799/index.html'
async def run(b,q,out,wait,small=False,js=None,wait2=0):
    vw,vh=(375,667) if small else (390,844)
    ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=2,is_mobile=True,has_touch=True)
    pg=await ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and '404' not in m.text else None)
    await pg.goto(URL+q); await pg.wait_for_timeout(int(wait*1000))
    if js: await pg.evaluate(js); await pg.wait_for_timeout(int(wait2*1000))
    await pg.screenshot(path=out); print(out,'errors',errs); await ctx.close()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        await run(b,'?reset&fill&stage=4&notut','shots/g-fill.png',2.5)
        await run(b,'?reset&fill&stage=4&notut','shots/s-g-fill.png',2.5,small=True)
        await run(b,'?reset&bot&speed=4&notut','shots/g-bot20.png',20)
        await run(b,'?reset&bot&speed=6&notut','shots/g-bot60.png',60)
        await run(b,'?reset&play&notut','shots/g-pause.png',2,js="document.querySelector('#bPause')&&0",wait2=0)
        await b.close()
asyncio.run(main())
