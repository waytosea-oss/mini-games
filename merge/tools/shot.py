import asyncio, sys, json
from playwright.async_api import async_playwright
URL='http://localhost:18799/index.html'
async def main():
    q=sys.argv[1]; out=sys.argv[2]; wait=float(sys.argv[3]) if len(sys.argv)>3 else 2.0
    vw,vh=(375,667) if 'small' in sys.argv else (390,844)
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=2,is_mobile=True,has_touch=True)
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto(URL+q); await pg.wait_for_timeout(int(wait*1000))
        await pg.screenshot(path=out)
        print('errors',errs)
        await b.close()
asyncio.run(main())
