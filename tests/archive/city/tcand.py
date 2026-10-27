import asyncio, json
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
C = {0: [(19,1),(38,1),(2,31)], 1: [(15,1),(30,1),(2,31)], 2: [(30,1),(15,1),(2,31)]}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        await pg.goto(URL); await pg.wait_for_timeout(1000); ev = pg.evaluate
        for si, cs in C.items():
            for (x,y) in cs:
                await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200); await ev(SKIP)
                await ev(f'() => {{ const S = window.__game.S, P = S.player; P.x = {x}*48+24; P.y = {y}*48+24; S.mind = 1e9; S.maxm = 0; S._mon = setInterval(() => {{ for (const g of S.guards) {{ if (g.civ || g.fl || g.z) continue; S.mind = Math.min(S.mind, Math.hypot(g.x-P.x, g.y-P.y)); S.maxm = Math.max(S.maxm, g.meter||0); }} }}, 100); }}')
                await pg.wait_for_timeout(15000)
                r = await ev('() => { const S = window.__game.S; clearInterval(S._mon); return [Math.round(S.mind/48*10)/10, S.maxm.toFixed(2), S.alevel, S.player.light.toFixed(2)]; }')
                print(si, (x,y), 'minDist(tiles), maxMeter, alevel, light', r)
        await b.close()
asyncio.run(main())
