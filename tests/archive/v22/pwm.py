import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); c = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=2); pg = await c.new_page(); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for st, x, y, nm in [(0, 13, 12, 'm0'), (0, 2, 9, 'm1'), (3, 12, 15, 'm2'), (0, 4, 11, 'm3')]:
            await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(300); await ev(SKIP)
            await ev(f'() => {{ const S = window.__game.S; for (const g of S.guards) g.x = -9999; S.player.x = {x} * 48 + 24; S.player.y = {y} * 48 + 24; }}')
            await pg.wait_for_timeout(1000); await pg.screenshot(path=nm + '.png')
        await b.close()
asyncio.run(main())
