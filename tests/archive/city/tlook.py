import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/L_'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800}); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(200); await ev(SKIP)
        print(await ev('() => window.__game.BLD.map((b, i) => [i, b.plate, b.name, b.church ? "C" : ""]).filter(x => x[1])'))
        await ev('() => { const G = window.__game, S = G.S, P = S.player; P.fl = 0; G.setLayer(0); P.z = 3; const b = G.BLD.find(b => b.church) || G.BLD[0]; P.x = (b.x0 + 2) * 48; P.y = (b.y0 + 2) * 48; G.setZoom(0.55); S.toasts.length = 0; }')
        await pg.wait_for_timeout(800); await pg.screenshot(path=OUT+'1_overview.png')
        await ev('() => { const G = window.__game, S = G.S, P = S.player; const B = G.BLD[4]; const l = S.ladders.find(l => l.kind === "fstair" && l.tfl === 2 && G.bldAt(l.tx, l.ty) === 3) || S.ladders.find(l => l.kind === "fstair" && l.tfl === 2); P.z = 0; P.fl = 2; G.setLayer(2); P.x = l.x; P.y = l.y + 48; G.setZoom(0.8); S.toasts.length = 0; }')
        await pg.wait_for_timeout(800); await pg.screenshot(path=OUT+'2_floor3.png')
        await b.close()
asyncio.run(main())
