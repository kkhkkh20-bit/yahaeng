import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); await pg.goto(URL); await pg.wait_for_timeout(1200); ev = pg.evaluate
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.keyboard.press('Digit1')
        print(await ev('''() => { const G = window.__game; const out = []; for (const a of [-Math.PI/2, -Math.PI/2-0.2, -Math.PI/2+0.2]) out.push(G.castRay(1104, 568, a, 430)); let col = ''; for (let y = 0; y <= 12; y++) col += G.tileG(23, y); return [out, col, G.S.player.fl, G.BLD[1]]; }'''))
        await b.close()
asyncio.run(main())
