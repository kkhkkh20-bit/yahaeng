import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        print(await ev('''() => { const S = T.S(), G = T.G(); T.freeze(); const P = S.player; P.hp = 99; T.at(20, 6, 0, 2);
          const g = S.guards.find(g => !g.civ && !g.dog && !g.target && !g.fl); window.__cg = g; g.z = 3; g.x = 8 * 48 + 24; g.y = 6 * 48 + 24; g.route = [{ x: 3 * 48, y: 13 * 48, pause: 999 }];
          g.state = 'ALERT'; g.lastSeen = { x: P.x, y: P.y, fl: 0, z: 2 }; g.lostT = 0; g.path = null; g.repath = 0; return [G.rLv(8, 6), G.rLv(20, 6)]; }'''))
        log = []
        for i in range(40):
            await pg.wait_for_timeout(250)
            log.append(await ev('() => { const g = window.__cg, P = T.S().player; g.lostT = 0; return [Math.round(g.x / 48), Math.round(g.y / 48), g.z, !!g.climb, Math.round(Math.hypot(g.x - P.x, g.y - P.y))]; }'))
        print(log[::3]); print(errs[:2]); await b.close()
asyncio.run(main())
