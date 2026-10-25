import asyncio
from playwright.async_api import async_playwright
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':910,'height':380},device_scale_factor=1)
    svg=open('logo.svg').read()
    await pg.set_content(f'<html><body style="margin:0;background:transparent">{svg}</body></html>')
    await pg.screenshot(path='logo.png',omit_background=True)
    await pg.set_content(f'<html><body style="margin:0;background:url(file:///workspace/mg-pub/stroke/assets/bg.jpg) center/cover">{svg}</body></html>')
    await pg.screenshot(path='preview.png'); await b.close()
asyncio.run(m())
