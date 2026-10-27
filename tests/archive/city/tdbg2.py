import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]; pg = await b.new_page(viewport={'width':1280,'height':800}); pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append('C '+m.text))
        await pg.goto(URL); await pg.wait_for_timeout(1200); ev = pg.evaluate
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.keyboard.press('Digit1'); await pg.wait_for_timeout(500)
        await ev('() => { const G = window.__game, S = G.S, P = S.player; P.fl = 0; G.setLayer(0); P.z = 0; P.wire = null; P.x = 23*48; P.y = 11*48+40; P.a = Math.PI/2; G.setZoom(0.85); window.__wsdbg = 1; }')
        await pg.wait_for_timeout(100); await pg.evaluate('() => { window.__wsdbg = 0; }')
        print(await ev('() => { const S = window.__game.S, P = S.player; return [!!S.hints.winsight, P.z, !!P.wire, !!P.jump, !!P.hide, P.vent, P.under, P.fl, P.x, P.y]; }'))
        await pg.screenshot(path='dbg.png'); print(errs[:5]); await b.close()
asyncio.run(main())
