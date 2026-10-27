# v48: 덮칠 수 없는 이유 표시 · 들킨 뒤 버티는 시간 · Esc 조준 취소
import asyncio, json
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP)
        # 정면 경비: 이유 표시
        r = await pg.evaluate('''() => { const g = window.__game, S = g.S, P = S.player, q = S.guards.find(x => !x.civ && !x.z && !x.target); S.guards.forEach(o => { if (o !== q) { o.x = -9999; } });
          q.route = [{ x: q.x, y: q.y }]; q.path = []; q.wait = 99; q.a = 0; q.want = 0; P.x = q.x + 50; P.y = q.y; window.__q = q; return [g.primaryAction().k, g.killBlockReason && g.killBlockReason()]; }''')
        print('front', r)
        await pg.wait_for_timeout(300); await pg.screenshot(path='/root/game/tests/rev/v48_front.png', clip={'x': 440, 'y': 220, 'width': 400, 'height': 280})
        # 들킨 뒤 버티는 시간: 경비 둘이 붙어 공격 (쉬움=체력 4, 보통=3)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP)
        t = await pg.evaluate('''async () => { const g = window.__game, S = g.S, P = S.player, qs = S.guards.filter(x => !x.civ && !x.z && !x.target).slice(0, 2); S.guards.forEach(o => { if (!qs.includes(o)) o.x = -9999; });
          qs.forEach((q, i) => { q.x = P.x + 30 + i * 10; q.y = P.y + (i ? 20 : -20); }); qs.forEach(q => g.setAlert ? 0 : 0); qs.forEach(q => { q.state = 'PATROL'; q.meter = 0.99; });
          const t0 = performance.now(); while (!S.over && performance.now() - t0 < 30000) { await new Promise(r => setTimeout(r, 100)); P.x = qs[0].x - 25; P.y = qs[0].y; }
          return [S.over, ((performance.now() - t0) / 1000).toFixed(1), P.hpMax]; }''')
        print('time to die standing still (normal)', t)
        # Esc 조준 취소
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP)
        await pg.keyboard.down('x'); await pg.wait_for_timeout(300); a1 = await pg.evaluate('() => !!window.__game.input.aiming')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(100); a2 = await pg.evaluate('() => [!!window.__game.input.aiming, !document.getElementById("pause").hidden]')
        await pg.keyboard.up('x'); await pg.wait_for_timeout(200); st = await pg.evaluate('() => window.__game.S.stats.stonesUsed')
        print('aim', a1, 'after esc', a2, 'thrown', st)
        print('errs', errs[:3]); await b.close()
asyncio.run(main())
