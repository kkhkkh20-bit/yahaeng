# 아이 규칙 회귀: 손댈 수 없음(기절·처치·붙잡기 없음) · 범죄를 보면 엄마에게 → 엄마가 신고하러 · 사탕으로 달래기
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1800)
        async def fresh():
            await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SK)
        # 1 뒤에서 다가가도 공격 행동이 없다, 특수는 사탕
        await fresh()
        r = await pg.evaluate('''() => { const G = window.__game, S = G.S, c = S.guards.find(g => g.child); c.wander = null; c.route = [{ x: c.x, y: c.y, pause: 999 }]; c.wait = 99; c.a = 0; c.want = 0;
          S.player.x = c.x - 30; S.player.y = c.y; S.player.a = 0; return [G.primaryAction().k, G.primaryAction().label, G.secondaryAction().k, c.body, c.child]; }''')
        print('아이 앞 행동', r)
        if r[0] in ('kill', 'kill2') or '기절' in r[1] or r[2] != 'candy' or r[3] != 'kid': bad.append('아이에게 공격 행동이 뜨거나 사탕이 아니다 %s' % r)
        # 2 아이가 범죄를 보면 엄마에게 달려가고, 엄마가 이어서 신고하러 간다
        await fresh()
        await pg.evaluate('''() => { const S = window.__game.S, q = S.guards[2], c = S.guards.find(g => g.child), m = S.guards.find(g => g.tag === 'mom');
          const pin = (g, x, y, a) => { g.x = x * 48 + 24; g.y = y * 48 + 24; g.a = a; g.want = a; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wander = null; g.path = null; g.wait = 99; g.state = 'PATROL'; };
          S.guards.forEach(g => { if (g !== q && g !== c && g !== m && !g.civ) { g.x = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; } });
          pin(q, 30, 20, 0); pin(c, 33, 20, Math.PI); pin(m, 38, 22, Math.PI); S.guards[0].x = 41 * 48 + 24; S.guards[0].y = 13 * 48 + 24;
          S.player.x = q.x - 34; S.player.y = q.y; S.player.a = 0; window.__game.actPrimary(); }''')
        r = None
        for t in range(40):
            await pg.wait_for_timeout(250); r = await pg.evaluate('() => { const S = window.__game.S, c = S.guards.find(g => g.child), m = S.guards.find(g => g.tag === "mom"); return [c.state, c.rep && c.rep.to && c.rep.to.tag, m.state]; }')
            if r[2] == 'REPORT': break
        print('아이 → 엄마', r)
        if r[2] != 'REPORT': bad.append('아이가 본 것을 엄마가 이어서 신고하지 않는다 %s' % r)
        # 3 신고하러 뛰는 아이를 사탕으로 달랜다
        await fresh()
        await pg.evaluate('''() => { const S = window.__game.S, q = S.guards[2], c = S.guards.find(g => g.child), m = S.guards.find(g => g.tag === 'mom');
          const pin = (g, x, y, a) => { g.x = x * 48 + 24; g.y = y * 48 + 24; g.a = a; g.want = a; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wander = null; g.path = null; g.wait = 99; g.state = 'PATROL'; };
          pin(q, 30, 20, 0); pin(c, 33, 20, Math.PI); pin(m, 48, 21, Math.PI); S.player.x = q.x - 34; S.player.y = q.y; S.player.a = 0; window.__game.actPrimary(); }''')
        await pg.wait_for_timeout(1200)
        r = await pg.evaluate('''() => { const G = window.__game, S = G.S, c = S.guards.find(g => g.child), st = c.state; S.player.x = c.x - 20; S.player.y = c.y; const lab = G.secondaryAction().label; G.actCarry(); return [st, lab, c.state, Math.round(c.treatT), S.player.candy]; }''')
        print('사탕', r)
        if r[0] != 'REPORT' or r[2] == 'REPORT' or r[3] <= 0 or r[4] != 1: bad.append('사탕으로 신고하러 가는 아이를 달랠 수 없다 %s' % r)
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
