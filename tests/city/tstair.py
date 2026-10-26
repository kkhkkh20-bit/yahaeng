import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        for si in range(5):
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200); await ev(SKIP)
            r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const out = [];
              for (const c of S.guards.filter(g => g.civ && g.home)) { const l = S.ladders.find(l => l.kind === 'fstair' && G.bldAt(l.tx, l.ty) === c.home.b && (l.bfl === c.fl || l.tfl === c.fl)); if (!l) continue;
                P.fl = c.fl; G.setLayer(c.fl); P.x = l.x; P.y = l.y; P.z = 0; const H = c.home, tx = Math.floor(P.x/48), ty = Math.floor(P.y/48);
                out.push(tx >= H.x0 && tx <= H.x1 && ty >= H.y0 && ty <= H.y1); }
              return [S.guards.filter(g => g.civ).length, S.guards.filter(g => g.civ && g.home).length, out.filter(Boolean).length, out.length]; }''')
            print(si, 'civ, withHome, stair-inside-home, checked', r)
        await b.close()
asyncio.run(main())
