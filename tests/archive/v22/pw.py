import asyncio, json
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 900, 'height': 600}); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        shots = []
        for st in range(5):
            await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(300); await ev(SKIP)
            info = await ev('''() => { const G = window.__game, S = G.S;
              const gas = []; G.BLD.forEach((b, i) => (b.gas || []).forEach(tx => gas.push([tx, b.y1, i])));
              const pipes = S.ladders.filter(l => l.kind === 'pipe' && !l.gas).map(l => [l.tx, l.ty, l.bz]);
              const wins = S.windows.map(w => [w.tx, w.ty]);
              const balc = []; G.BLD.forEach(b => (b.balc || []).forEach(tx => balc.push([tx, b.y1])));
              return { gas, pipes, wins: wins.slice(0, 6), nwin: wins.length, balc, wires: S.wires.filter(w => w.a.win || w.b.win).length }; }''')
            print(st, json.dumps(info))
            if st in (0, 3):
                await ev('() => { const G = window.__game; G.setZoom(2.2); document.getElementById("hud").style.visibility = "hidden"; }')
                for k, (x, y, *_r) in enumerate((info['gas'][:2] + info['pipes'][:1] + info['wins'][:2])):
                    await ev(f'() => {{ const P = window.__game.S.player; for (const g of window.__game.S.guards) {{ g.x = -9999; }} P.x = {x} * 48 + 24 + 60; P.y = {y} * 48 + 24 + 40; }}')
                    await pg.wait_for_timeout(900); await pg.screenshot(path=f'pw{st}_{k}.png')
        await b.close()
asyncio.run(main())
