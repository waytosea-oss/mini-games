import asyncio,base64,io,json
from playwright.async_api import async_playwright
from PIL import Image
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page()
        await pg.goto('file:///workspace/games9/merge/tools/labels.html'); await pg.wait_for_function("document.title==='done'")
        d=await pg.evaluate("document.getElementById('c').toDataURL('image/png')"); meta=await pg.evaluate("window.META")
        im=Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).convert('RGBA')
        bb=im.getbbox(); im=im.crop((0,0,max(v[2] for v in meta.values()),bb[3]))
        im.save('/workspace/games9/merge/assets/labels.webp',lossless=True)
        json.dump(meta,open('/workspace/games9/merge/assets/labels.json','w'))
        bg=Image.new('RGBA',im.size,(40,90,60,255)); bg.alpha_composite(im); bg.convert('RGB').save('/workspace/games9/merge/raw/labels_preview.jpg')
        print(meta); await b.close()
asyncio.run(main())
