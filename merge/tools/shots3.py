import asyncio
from playwright.async_api import async_playwright
URL='http://localhost:18799/index.html'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for small in (False,True):
            pre='s-' if small else ''
            vw,vh=(375,667) if small else (390,844)
            ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=2,is_mobile=True,has_touch=True)
            pg=await ctx.new_page(); errs=[]
            pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and '404' not in m.text else None)
            await pg.goto(URL+'?reset&play&notut'); await pg.wait_for_timeout(2000)
            # unlock row: create 四筒
            await pg.evaluate("""()=>{const s=__G.s; s.top=2; s.rows[5].t=Array(10).fill(2); s.rows[6].t=[0,0,1]; s.rows[8].t=[1,1,1,1,2,2]; s.rows[4].t=[0,1,0];}""")
            await pg.wait_for_timeout(300)
            await pg.evaluate("__dbg.doMerge()")
            await pg.wait_for_timeout(450); await pg.screenshot(path=f'shots/{pre}u1-merge.png')
            await pg.wait_for_timeout(700); await pg.screenshot(path=f'shots/{pre}u2-unlock.png')
            await pg.wait_for_timeout(700); await pg.screenshot(path=f'shots/{pre}u3-unlock.png')
            await pg.wait_for_timeout(2500); await pg.screenshot(path=f'shots/{pre}u4-after.png')
            await pg.tap('#wNext'); await pg.wait_for_timeout(2200); await pg.screenshot(path=f'shots/{pre}u5-stage2.png')
            # temp unlock tap
            L=await pg.evaluate('__L()')
            # fail: fill all open rows with distinct tops
            await pg.evaluate("""()=>{const s=__G.s; let k=0; s.rows.forEach((r,i)=>{ if(__LG.isOpen(r)){ r.t=[]; for(let j=0;j<10;j++) r.t.push((j+i+(j%3))%5); k++; } }); __dbg.doDeal();}""")
            await pg.wait_for_timeout(2500); await pg.screenshot(path=f'shots/{pre}x-fail.png')
            await pg.tap('#fMenu') if await pg.is_visible('#fMenu') else None
            await pg.wait_for_timeout(1200); await pg.screenshot(path=f'shots/{pre}x-menu2.png')
            print(pre,'errors',errs); await ctx.close()
        await b.close()
asyncio.run(main())
