# 구역(히트맨식) 회귀: 공개 구역 걷기 무시 · 출입 금지 경고 → 나가면 돌아감 → 재진입 발각 · 공개 구역 처치 목격 즉시 발각
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''(keep) => { const S = window.__game.S; S.guards.forEach((g, i) => { if (!g.civ && !keep.includes(i)) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; } }); }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        async def fresh(keep):
            await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(250); await pg.evaluate(SK); await pg.evaluate(FREEZE, keep)
        g = lambda i: f'window.__game.S.guards[{i}]'
        # 1 공개 구역: 경비 바로 앞을 걸어 지나가도 게이지 0
        await fresh([2]); await pg.evaluate(f'() => {{ const S = window.__game.S, P = S.player, q = {g(2)}; q.x = 30 * 48 + 24; q.y = 7 * 48; q.a = Math.PI / 2; q.route = [{{ x: q.x, y: q.y, pause: 999 }}]; q.path = null; q.wait = 99; P.x = 44 * 48; P.y = 20 * 48; }}')
        await pg.evaluate(f'() => {{ const q = {g(2)}; q.x = 33 * 48; q.y = 19 * 48; q.a = 0; q.route = [{{ x: q.x, y: q.y, pause: 999 }}]; window.__game.S.player.x = q.x + 60; window.__game.S.player.y = q.y; }}')
        await pg.wait_for_timeout(1500); m = await pg.evaluate(f'() => {g(2)}.meter'); print('공개 구역 게이지', m)
        if m > 0.05: bad.append('공개 구역에서 게이지가 찬다')
        # 2 출입 금지(뒷마당): 경고 → 나가면 돌아감 → 다시 들어가면 발각
        await fresh([2]); await pg.evaluate(f'() => {{ const S = window.__game.S, P = S.player, q = {g(2)}; q.x = 30 * 48 + 24; q.y = 3 * 48 + 24; q.a = 0; q.want = 0; q.route = [{{ x: q.x, y: q.y, pause: 999 }}]; q.path = null; q.wait = 99; q.post = 0; P.x = 32 * 48 + 24; P.y = 3 * 48 + 24; }}')
        st = None
        for t in range(40):
            await pg.wait_for_timeout(250); st = await pg.evaluate(f'() => {g(2)}.state')
            if st == 'WARN': break
        print('경고', st)
        if st != 'WARN': bad.append('출입 금지에서 경고가 안 나온다')
        await pg.evaluate('() => { const P = window.__game.S.player; P.x = 44 * 48 + 24; P.y = 4 * 48 + 24; }'); await pg.wait_for_timeout(700)
        st = await pg.evaluate(f'() => [{g(2)}.state, {g(2)}.warned]'); print('나감', st)
        if st[0] == 'WARN' or st[0] == 'ALERT' or not st[1]: bad.append('나가도 경고가 안 풀린다')
        await pg.wait_for_timeout(2500)
        await pg.evaluate(f'() => {{ const S = window.__game.S, P = S.player, q = {g(2)}; P.x = q.x + 80; P.y = q.y; q.a = 0; q.want = 0; }}')
        for t in range(40):
            await pg.wait_for_timeout(250); st = await pg.evaluate(f'() => {g(2)}.state')
            if st == 'ALERT': break
        print('재진입', st)
        if st != 'ALERT': bad.append('두 번째 침입이 발각되지 않는다')
        # 3 공개 구역 처치 목격: 광장에서 경비가 보는 앞에서 행인을 기절시키면 즉시 발각
        await fresh([2]); r = await pg.evaluate(f'''() => {{ const G = window.__game, S = G.S, P = S.player, q = {g(2)}, c = S.guards.find(o => o.civ);
          q.x = 33 * 48; q.y = 21 * 48; q.a = 0; q.want = 0; q.route = [{{ x: q.x, y: q.y, pause: 999 }}]; q.path = null; q.wait = 99; q.post = 0;
          c.x = q.x + 130; c.y = q.y; c.a = 0; c.want = 0; c.route = [{{ x: c.x, y: c.y, pause: 999 }}]; c.wander = null; c.path = null; c.wait = 99;
          P.x = c.x - 30; P.y = c.y; P.a = 0; return G.primaryAction().label; }}''')
        print('행동', r); await pg.evaluate('() => window.__game.actPrimary()')
        await pg.wait_for_timeout(1200); st = await pg.evaluate(f'() => [{g(2)}.state, window.__game.S.stats.detected]'); print('목격', st)
        if st[0] != 'ALERT': bad.append('공개 구역 처치 목격이 발각으로 이어지지 않는다')
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
