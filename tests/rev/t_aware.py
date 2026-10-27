# 발견 게이지 시간: 경비 정면 거리별로 흰색→노랑(의심)→빨강(발각)까지 걸리는 시간 (보통 난이도, 밝은 곳·어두운 곳)
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for d in (60, 120, 180, 240):
            await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300)
            await pg.evaluate('() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }')
            r = await pg.evaluate(f'''async () => {{ const g = window.__game, S = g.S, P = S.player, q = S.guards.find(x => !x.civ && !x.z && !x.target) || S.guards[0];
              S.guards.forEach(o => {{ if (o !== q) {{ o.x = -9999; o.y = -9999; }} }});
              q.route = [{{ x: q.x, y: q.y }}]; q.path = []; q.wait = 99; q.a = 0; q.want = 0; q.state = 'PATROL'; q.meter = 0;
              P.x = q.x + {d}; P.y = q.y; P.mode = 'walk';
              const vis = g.canSee(q, P.x, P.y, g.lightAt(P.x, P.y), false, false, 0);
              const t0 = performance.now(); let tn = null, ta = null;
              while (performance.now() - t0 < 7000) {{ await new Promise(r => setTimeout(r, 50)); P.x = q.x + {d}; P.y = q.y; const t = (performance.now() - t0) / 1000;
                if (tn == null && q.meter >= 0.35) tn = t; if (q.state === 'ALERT') {{ ta = t; break; }} }}
              return {{ light: +g.lightAt(P.x, P.y).toFixed(2), vis: +vis.toFixed(2), notice: tn && +tn.toFixed(2), alert: ta && +ta.toFixed(2) }}; }}''')
            print(d, r)
            if d == 120:
                pass
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300)
        await pg.evaluate('() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); const S = g.S, P = S.player, q = S.guards.find(x => !x.civ && !x.z && !x.target); S.guards.forEach(o => { if (o !== q) { o.x = -9999; } }); q.route = [{ x: q.x, y: q.y }]; q.path = []; q.wait = 99; q.a = 0; q.want = 0; P.x = q.x + 130; P.y = q.y; window.__q = q; }')
        await pg.wait_for_timeout(900); await pg.screenshot(path='/root/game/tests/rev/aware1.png')
        await pg.wait_for_timeout(1300); await pg.screenshot(path='/root/game/tests/rev/aware2.png')
        print('errs', errs[:3]); await b.close()
asyncio.run(main())
