import asyncio, sys, os
from playwright.async_api import async_playwright
async def main(opts):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1080,'height':640})
        for o in opts:
            svg=open(f'opt{o}.svg').read()
            await pg.set_content(f'<html><body style="margin:0;background:#20102e">{svg}</body></html>')
            await pg.wait_for_timeout(300)
            await pg.locator('svg').screenshot(path=f'preview-{o}.png')
            await pg.set_content(f'<html><body style="margin:0;background:transparent">{svg}</body></html>')
            await pg.wait_for_timeout(300)
            await pg.locator('svg').screenshot(path=f'logo-{o}.png', omit_background=True)
        await b.close()
asyncio.run(main(sys.argv[1]))
