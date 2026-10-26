import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1000, 'height': 1400}); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for st, x, y, z, nm in [(0, 4, 19.6, 1.0, 'a0'), (0, 4, 9, 2.4, 'a1')]:
            await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(300); await ev(SKIP)
            await ev(f'() => {{ const G = window.__game, S = G.S; G.setZoom({z}); document.getElementById("hud").style.visibility = "hidden"; for (const g of S.guards) g.x = -9999; S.player.x = {x} * 48 + 24; S.player.y = {y} * 48 + 24; }}')
            await pg.wait_for_timeout(1100); await pg.screenshot(path=nm + '.png')
        await b.close()
asyncio.run(main())
