import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 800, 'height': 600}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('() => { window.__game.setZoom(1.1); document.getElementById("hud").style.visibility = "hidden"; }')
        # 창문 넘기
        r = await ev('''() => { T.freeze(); const S = T.S(); for (const w of S.windows) for (const [ox, oy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { if (w.tx < 5 || w.tx > 30) continue; T.at(w.tx + ox, w.ty + oy); S.player.a = Math.atan2(-oy, -ox); const a = T.G().primaryAction(); if (a.k === 'window') return [w.tx, w.ty, ox, oy, a.label]; } return null; }''')
        print('win', r)
        if r:
            await ev('() => T.G().actPrimary()')
            for i in range(4): await pg.wait_for_timeout(140); await pg.screenshot(path=f'wv{i}.png')
            print(await ev('() => { const P = T.S().player; return [Math.round(P.x / 48), Math.round(P.y / 48), P.fl]; }'))
        # 경비 추격: 플레이어를 b1 옥상(z2)에, 거리의 경비 하나를 경보 상태로
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        r = await ev('''() => { const S = T.S(), G = T.G(); T.freeze(); const P = S.player; T.at(18, 7, 0, 2);
          const g = S.guards.find(g => !g.civ && !g.dog && !g.target && !g.fl); g.x = 16 * 48 + 24; g.y = 13 * 48 + 24; g.route = [{ x: g.x, y: g.y, pause: 999 }];
          window.__cg = g; G.setDiff && 0; g.state = 'ALERT'; g.lastSeen = { x: P.x, y: P.y, fl: 0, z: 2 }; g.lostT = 0; g.path = null; g.repath = 0; g.icon = '!'; g.iconT = 99; return [G.rLv(18, 7)]; }''')
        print('setup', r)
        log = []
        for i in range(76):
            await pg.wait_for_timeout(250)
            st = await ev('() => { const g = window.__cg, P = T.S().player; return [g.state, Math.round(g.x / 48 * 10) / 10, Math.round(g.y / 48 * 10) / 10, g.z, g.fl, !!g.climb, !!g.hop, P.hp, Math.round(Math.hypot(g.x - P.x, g.y - P.y))]; }')
            log.append(st)
            if i == 14: await ev('() => { const P = T.S().player; P.hp = 99; T.at(2, 26); P.hide = null; }')
            if i in (6, 10, 14, 20): await pg.screenshot(path=f'gc{i}.png')
        for l in log[12::4]: print(l)
        print(errs[:3]); await b.close()
asyncio.run(main())
