import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/f_'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800}); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(200); await ev(SKIP)
        print(await ev('() => { const G = window.__game, S = G.S, P = S.player; const B = G.BLD[4]; const l = S.ladders.find(l => l.kind === "fstair" && l.tfl === 1 && G.bldAt(l.tx, l.ty) === 4); P.fl = 1; G.setLayer(1); P.z = 0; P.x = l.x; P.y = l.y + 48; G.setZoom(0.85); S.toasts.length = 0; S.guards.forEach(g => { if (g.fl === 1 && G.bldAt(Math.floor(g.x/48), Math.floor(g.y/48)) === 4) g.x = -999; }); return [B.name, B.x0, B.y0, B.x1, B.y1]; }'))
        await pg.wait_for_timeout(700); await pg.screenshot(path=OUT+'7_interior.png')
        await b.close()
asyncio.run(main())
