import asyncio, sys
from playwright.async_api import async_playwright
URL='http://localhost:18799/index.html'
async def main():
    small='small' in sys.argv
    vw,vh=(375,667) if small else (390,844); pre='s-' if small else ''
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=2,is_mobile=True,has_touch=True)
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto(URL+'?reset'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'shots/{pre}f1-menu.png')
        await pg.tap('#bPlay'); await pg.wait_for_timeout(1800)
        L=await pg.evaluate('__L()')
        def row(i,k=5): return (L['rx']+7+k*(L['tw']+L['tg']), L['ry0']+i*(L['rh']+L['rgap'])+L['rh']/2)
        async def tap(x,y): await pg.touchscreen.tap(x,y)
        await pg.screenshot(path=f'shots/{pre}f2-tut.png')
        await tap(*row(8)); await pg.wait_for_timeout(400); await pg.screenshot(path=f'shots/{pre}f3-sel.png')
        await tap(*row(6)); await pg.wait_for_timeout(120); await pg.screenshot(path=f'shots/{pre}f4-fly.png')
        await pg.wait_for_timeout(900); await pg.screenshot(path=f'shots/{pre}f5-full.png')
        bm=L['bMerge']; await tap(bm['x']+bm['w']/2,bm['y']+bm['h']/2)
        await pg.wait_for_timeout(380); await pg.screenshot(path=f'shots/{pre}f6-merge.png')
        await pg.wait_for_timeout(250); await pg.screenshot(path=f'shots/{pre}f7-merge2.png')
        await pg.wait_for_timeout(900); await pg.screenshot(path=f'shots/{pre}f8-banner.png')
        await pg.wait_for_timeout(1500)
        bd=L['bDeal']; await tap(bd['x']+bd['w']/2,bd['y']+bd['h']/2)
        await pg.wait_for_timeout(200); await pg.screenshot(path=f'shots/{pre}f9-deal.png')
        await pg.wait_for_timeout(1500); await pg.screenshot(path=f'shots/{pre}f10-after.png')
        for i in range(6):
            await tap(bd['x']+bd['w']/2,bd['y']+bd['h']/2); await pg.wait_for_timeout(900)
        await pg.screenshot(path=f'shots/{pre}f11-many.png')
        print('errors',errs)
        await b.close()
asyncio.run(main())
