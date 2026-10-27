import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); await pg.goto(URL); await pg.wait_for_timeout(1200); ev = pg.evaluate
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.keyboard.press('Digit1')
        print(await ev('''() => { const G = window.__game; let row = ''; for (let x = 20; x <= 37; x++) row += G.tileG(x, 9); let row8=''; for (let x = 20; x <= 37; x++) row8 += G.tileG(x, 8);
           const d = G.castRay(27*48, 10*48+30, -Math.PI/2, 430); const d2 = G.castRay(25*48+24, 10*48+30, -Math.PI/2, 430); return [row, row8, d, d2]; }'''))
        await b.close()
asyncio.run(main())
