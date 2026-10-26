import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/yahaeng_city.html'
SKIP='() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
FPS='''() => new Promise(r => { const ts=[]; const f=(t)=>{ ts.push(t); if (ts.length<180) requestAnimationFrame(f); else { const d=ts.slice(1).map((x,i)=>x-ts[i]).sort((a,b)=>a-b); r([ (1000*(ts.length-1)/(ts[ts.length-1]-ts[0])).toFixed(1), d[Math.floor(d.length*0.95)].toFixed(1)]); } }; requestAnimationFrame(f); })'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--enable-gpu-rasterization','--ignore-gpu-blocklist'])
        for name, ctx in [('pc', dict(viewport={'width':1280,'height':760})), ('mo1x', dict(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True, device_scale_factor=1)), ('mo2x', dict(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True, device_scale_factor=2))]:
            c = await b.new_context(**ctx); pg = await c.new_page(); await pg.goto(URL); await pg.wait_for_timeout(1500)
            out=[]
            for idx in range(5):
                await pg.evaluate(f'() => window.__game.start({idx})'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(500)
                out.append(await pg.evaluate(FPS))
            print(name, out); await c.close()
        await b.close()
asyncio.run(main())
