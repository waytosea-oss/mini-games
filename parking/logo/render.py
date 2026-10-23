import asyncio, sys, os
from playwright.async_api import async_playwright
async def main(opts, screen):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1080,'height':800}, device_scale_factor=1)
        for o in opts:
            svg=open(f'opt{o}.svg').read()
            await pg.set_content(f'<html><body style="margin:0;background:transparent">{svg}</body></html>')
            await pg.wait_for_timeout(300)
            await pg.locator('svg').screenshot(path=f'logo-{o}.png', omit_background=True)
        if screen:
            ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
            g = await ctx.new_page(); errs=[]
            g.on('pageerror', lambda e: errs.append(str(e)))
            for o in opts:
                await g.goto('http://localhost:18755/index.html', wait_until='networkidle'); await g.wait_for_timeout(1500)
                await g.evaluate("""(o)=>{const i=document.getElementById('mLogo'); i.src='logo/logo-'+o+'.png?'+Date.now(); i.style.animation='none';}""", o)
                await g.wait_for_timeout(800)
                await g.screenshot(path=f'option-{o}.png')
            print('errors',errs)
        await b.close()
asyncio.run(main(sys.argv[1], len(sys.argv)>2))
