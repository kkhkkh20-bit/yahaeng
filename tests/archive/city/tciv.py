import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]; pg = await b.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        # 1) 시장 노점 상인 앞에 서 있기
        await ev('() => window.__game.start(4)'); await pg.wait_for_timeout(200); await ev(SKIP)
        await ev('() => { const G = window.__game, S = G.S, P = S.player; const c = S.guards.find(g => g.civ && !G.bldAt(Math.floor(g.x/48), Math.floor(g.y/48)) >= 0 && G.bldAt(Math.floor(g.x/48), Math.floor(g.y/48)) < 0); S.guards.forEach(g => { if (!g.civ) { g.x = -2000; g.route = [{x: -2000, y: -2000, pause: 999}]; } }); P.x = c.x + Math.cos(c.a) * 70; P.y = c.y + Math.sin(c.a) * 70; P.mode = "walk"; S.cv = c; }')
        await pg.wait_for_timeout(4000)
        print('street', await ev('() => { const c = window.__game.S.cv; return [c.state, c.meter.toFixed(2), !!c.wary, window.__game.S.alevel]; }'))
        # 2) 같은 상인 앞에서 사람을 메고 있기
        await ev('() => { const S = window.__game.S; S.player.carrying = { fake: true }; }')
        await pg.wait_for_timeout(3000)
        print('carrying', await ev('() => { const c = window.__game.S.cv; return [c.state, c.meter.toFixed(2), !!c.wary]; }'))
        # 3) 빌라 거실에서 깨어 있는 주민과 마주치기
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(200); await ev(SKIP)
        r = await ev('() => { const G = window.__game, S = G.S, P = S.player; const c = S.guards.find(g => g.civ && g.state !== "SLEEP" && G.bldAt(Math.floor(g.x/48), Math.floor(g.y/48)) >= 0); if (!c) return "none"; S.guards.forEach(g => { if (!g.civ) { g.x = -2000; g.route = [{x: -2000, y: -2000, pause: 999}]; } }); P.fl = c.fl; G.setLayer(c.fl); P.x = c.x + Math.cos(c.a) * 60; P.y = c.y + Math.sin(c.a) * 60; P.mode = "walk"; S.cv = c; return [c.fl, G.bldAt(Math.floor(P.x/48), Math.floor(P.y/48)) === G.bldAt(Math.floor(c.x/48), Math.floor(c.y/48))]; }')
        print('home setup', r)
        await pg.wait_for_timeout(4000)
        print('home', await ev('() => { const c = window.__game.S.cv; return [c.state, c.meter.toFixed(2), !!c.wary, window.__game.S.alevel]; }'))
        print(errs[:3]); await b.close()
asyncio.run(main())
