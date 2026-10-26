import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP='() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1280,'height':760}); await pg.goto(URL); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => window.__game.start(2)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='cam_pc_m3.png')
        c = await b.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True); m = await c.new_page(); await m.goto(URL); await m.wait_for_timeout(1500)
        await m.evaluate('() => window.__game.start(0)'); await m.wait_for_timeout(300); await m.evaluate(SKIP); await m.wait_for_timeout(1500)
        await m.screenshot(path='cam_mo_m1.png'); print(await m.inner_text('#btnAct'))
        await b.close()
asyncio.run(main())
