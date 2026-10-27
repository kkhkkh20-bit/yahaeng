import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/ax_'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800}); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        for si, x, y in [(0, 52, 9), (2, 50, 12)]:
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200); await ev(SKIP); await pg.wait_for_timeout(500)
            await ev(f'() => {{ const G = window.__game, S = G.S, P = S.player; P.x = {x} * 48; P.y = {y} * 48; G.setZoom(0.6); S.toasts.length = 0; }}')
            await pg.wait_for_timeout(700); await pg.screenshot(path=OUT+f'{si}.png')
        await b.close()
asyncio.run(main())
