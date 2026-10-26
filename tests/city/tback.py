import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800}); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(200); await ev(SKIP)
        await pg.wait_for_timeout(3000)
        await ev('() => { const G = window.__game, S = G.S, P = S.player; P.x = 9*48; P.y = 32*48; G.setZoom(0.7); S.toasts.length = 0; S.guards.forEach(g => g.meter = 0); }')
        await pg.wait_for_timeout(800); await pg.screenshot(path='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/z_8_back.png')
        await b.close()
asyncio.run(main())
