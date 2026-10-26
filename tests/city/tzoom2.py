import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/z_'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def shot(pg, si, js, name, wait=900):
    ev = pg.evaluate
    await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200); await ev(SKIP)
    await ev('() => { const G = window.__game, S = G.S, P = S.player; ' + js + ' S.toasts.length = 0; }'); await pg.wait_for_timeout(wait); await pg.screenshot(path=OUT+name)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await shot(pg, 1, 'P.x = 16*48; P.y = 17*48; G.setZoom(0.75);', '4_street.png')
        await shot(pg, 1, 'P.x = 6*48; P.y = 25*48; G.setZoom(0.8);', '5_club.png', 1500)
        await shot(pg, 2, 'P.x = 29*48; P.y = 12*48; G.setZoom(0.9);', '6_stream.png')
        await b.close()
asyncio.run(main())
