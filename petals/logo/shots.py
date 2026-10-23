import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        g=await ctx.new_page()
        for o in 'ABC':
            await g.goto('http://localhost:18747/index.html'); await g.wait_for_timeout(1500)
            await g.evaluate("(o)=>{const i=document.getElementById('mLogo'); i.src='logo/logo-'+o+'.png'; i.style.animation='none';}",o)
            await g.wait_for_timeout(700)
            await g.screenshot(path=f'option-{o}.png')
        await b.close()
asyncio.run(main())
