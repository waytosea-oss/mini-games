import asyncio
from playwright.async_api import async_playwright
URL='http://localhost:18799/index.html'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto(URL+'?reset&play&notut'); await pg.wait_for_timeout(2000)
        await pg.evaluate('__dbg.pause()'); await pg.wait_for_timeout(500); await pg.screenshot(path='shots/p-pause.png')
        await pg.goto(URL+'?bot&speed=6&notut'); await pg.wait_for_timeout(25000)
        await pg.evaluate('__dbg.openRank()'); await pg.wait_for_timeout(500); await pg.screenshot(path='shots/p-rank.png')
        print(errs); await b.close()
asyncio.run(main())
