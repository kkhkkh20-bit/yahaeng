import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1200)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(200)
        print(await pg.evaluate('''() => { const G = window.__game; G.setLayer(0); const pts = [[6,11],[6,10],[6,9],[9,9],[10,9],[10,8]];
          return pts.map(([x,y]) => [x,y,G.tileG(x,y), G.solidAt ? G.solidAt(x,y) : '?']); }'''))
        await b.close()
asyncio.run(main())
