import asyncio,base64,io
from playwright.async_api import async_playwright
from PIL import Image
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page()
        await pg.goto('file:///workspace/games9/merge/tools/tiles.html'); await pg.wait_for_function("document.title==='done'")
        d=await pg.evaluate("document.getElementById('c').toDataURL('image/png')")
        im=Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).convert('RGBA')
        im.save('/workspace/games9/merge/raw/faces.png'); im.save('/workspace/games9/merge/assets/faces.webp',lossless=True,quality=100)
        # preview on ivory
        bg=Image.new('RGBA',im.size,(250,244,226,255)); bg.alpha_composite(im); bg.convert('RGB').save('/workspace/games9/merge/raw/faces_preview.jpg',quality=90)
        await b.close()
asyncio.run(main())
