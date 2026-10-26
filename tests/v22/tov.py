import asyncio, sys
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
st = int(sys.argv[1])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1400, 'height': 1000}); ev = pg.evaluate; errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(300); await ev(SKIP)
        await ev('() => { const G = window.__game, S = G.S; G.setZoom(0.62); document.getElementById("hud").style.visibility = "hidden"; for (const l of S.lamps) l.off = false; S.player.x = 23 * 48; S.player.y = 16 * 48; for (const g of S.guards) g.x = -9999; }')
        await pg.wait_for_timeout(1500); await pg.screenshot(path=f'ov_m{st}.png'); print(errs[:3]); await b.close()
asyncio.run(main())
