import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('''() => { const S = T.S(); T.freeze(); const P = S.player; T.at(14, 8, 0, 2);
          const g = S.guards.find(g => !g.civ && !g.dog && !g.target && !g.fl); g.x = 16 * 48 + 24; g.y = 13 * 48 + 24; g.route = [{ x: g.x, y: g.y, pause: 999 }];
          window.__cg = g; g.state = 'ALERT'; g.lastSeen = { x: P.x, y: P.y, fl: 0, z: 2 }; g.lostT = 0; g.path = null; g.repath = 0; P.hp = 99; }''')
        got = None
        for i in range(40):
            await pg.wait_for_timeout(100)
            a = await ev('() => { const g = window.__cg; return [T.G().primaryAction().k, !!g.climb, g.z]; }')
            if a[0] == 'pushOff': got = a; break
        print('push avail', got)
        if got:
            await ev('() => T.G().actPrimary()'); await pg.wait_for_timeout(700)
            print(await ev('() => { const g = window.__cg, S = T.S(); return [g.state, S.corpses.map(c => [c.accident, Math.round(c.x / 48), Math.round(c.y / 48)])]; }'))
        print(errs[:3]); await b.close()
asyncio.run(main())
