import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        print(await ev('''() => { const S = T.S(), G = T.G(); T.freeze(); const B = G.BLD[1]; const tx = B.x0 + 3, ty = B.y0 + 3;
          const g = S.guards.find(g => !g.civ && !g.dog && !g.target && !g.fl); g.x = tx * 48 + 24; g.y = ty * 48 + 24; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.a = -Math.PI / 2; g.want = g.a; window.__rg = g;
          T.at(tx, ty - 1, 0, B.h); S.player.light = 1; return [tx, ty, B.h, G.rLv(tx, ty - 1), G.canSee(g, S.player.x, S.player.y, 1, false, false, B.h)]; }'''))
        await pg.wait_for_timeout(2500)
        print(await ev('() => { const g = window.__rg; return [g.state, g.meter, T.S().player.hp, T.S().alevel]; }'))
        print(errs[:2]); await b.close()
asyncio.run(main())
