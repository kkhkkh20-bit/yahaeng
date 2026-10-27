import asyncio, sys
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto(URL); await pg.wait_for_timeout(1000); ev = pg.evaluate
        for si in range(3):
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200)
            out = await ev('''() => { const G = window.__game, S = G.S; G.setLayer(0); const rows = []; for (let y = 0; y < 32; y++) { const r = []; for (let x = 0; x < 46; x++) r.push(G.tileG(x, y)); rows.push(r); }
              for (const g of S.guards) { if (g.fl) continue; for (const r of (g.route||[])) { const tx = Math.floor(r.x/48), ty = Math.floor(r.y/48); rows[ty][tx] = g.civ ? 'c' : g.dog ? 'd' : g.z ? 'z' : 'g'; } }
              return rows.map((r, y) => String(y).padStart(2) + ' ' + r.join('')).join('\\n'); }''')
            print('STAGE', si); print(out)
        await b.close()
asyncio.run(main())
