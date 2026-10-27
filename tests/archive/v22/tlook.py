import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 900, 'height': 640}); ev = pg.evaluate; errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for st, x, y, z, zm, nm in [(0, 13, 6, 0, 1.15, 'lk0'), (0, 13, 4, 2, 1.15, 'lk1'), (0, 24, 12, 0, 1.15, 'lk2'), (2, 20, 13, 0, 0.9, 'lk3')]:
            await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(300); await ev(SKIP)
            await ev(f'() => {{ const G = window.__game, S = G.S; G.setZoom({zm}); document.getElementById("hud").style.visibility = "hidden"; for (const g of S.guards) g.x = -9999; S.player.x = {x} * 48 + 24; S.player.y = {y} * 48 + 24; S.player.z = {z}; }}')
            await pg.wait_for_timeout(1000); await pg.screenshot(path=nm + '.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
