# 발견 회귀: 등 뒤에서 뛰어 달려들면 소리·기척에 돌아봐 암살이 안 된다 (거리·금지 구역 모두) · 살금살금 다가가면 암살된다
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''(keep) => { const S = window.__game.S; S.guards.forEach((g, i) => { if (!keep.includes(i)) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; g.sched = null; } }); }'''
PIN = '''([i, x, y, a]) => { const q = window.__game.S.guards[i]; q.x = x * 48 + 24; q.y = y * 48 + 24; q.a = a; q.want = a; q.route = [{ x: q.x, y: q.y, pause: 999 }]; q.wander = null; q.sched = null; q.path = null; q.wait = 99; q.post = a * 180 / Math.PI; q.state = 'PATROL'; q.meter = 0; }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        si = await pg.evaluate("() => window.__game.STAGES.findIndex(s => s.id === 'm1')")
        async def trial(spot, mode, dist0=260):
            await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(250); await pg.evaluate(SK); await pg.evaluate(FREEZE, [2])
            await pg.evaluate(PIN, [2, spot[0], spot[1], 0])
            await pg.evaluate(f'() => {{ const S = window.__game.S, P = S.player, g = S.guards[2]; P.x = g.x - {dist0}; P.y = g.y; P.a = 0; P.z = 0; P.fl = 0; P.disguise = null; P.outfit = null; }}')
            await pg.evaluate(f"() => {{ const G = window.__game; G.input.sneakToggle = {'true' if mode == 'sneak' else 'false'}; G.input.walkLock = false; const K = G.S.keys; K.ArrowRight = true; K.ShiftLeft = {'true' if mode == 'run' else 'false'}; }}")
            got, log = None, []
            for t in range(160):
                r = await pg.evaluate('() => { const G = window.__game, g = G.S.guards[2], P = G.S.player, a = G.primaryAction(); return [a.k, g.state, Math.round(g.meter * 100) / 100, Math.round(Math.hypot(P.x - g.x, P.y - g.y)), P.mode]; }')
                log.append(r)
                if r[0] in ('kill',): await pg.evaluate('() => window.__game.actPrimary()'); got = 'kill'; break
                if r[3] < 30: got = 'touch'; break
                await pg.wait_for_timeout(25)
            await pg.evaluate('() => { const G = window.__game, K = G.S.keys; K.ArrowRight = false; K.ShiftLeft = false; G.input.sneakToggle = false; }')
            await pg.wait_for_timeout(1300)
            st = await pg.evaluate('() => window.__game.S.guards[2].state')
            return got, st, log[-3:]
        for name, spot in (('거리(공개)', (30, 20)), ('뒷마당(금지)', (33, 3))):
            r = await trial(spot, 'run'); print(name, '뛰어 달려들기', r)
            if r[0] == 'kill' and r[1] == 'DEAD': bad.append(f'{name}: 등 뒤에서 뛰어 달려들어도 암살된다 {r}')
            r = await trial(spot, 'sneak', 200); print(name, '살금살금', r)
            if r[1] != 'DEAD': bad.append(f'{name}: 살금살금 다가가도 암살이 안 된다 {r}')
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
