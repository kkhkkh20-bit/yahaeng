# 겹친 대상 고르기 회귀: 문·창문·계단·숨을 곳이 한데 모인 자리에서 후보가 둘 이상 나오고, 바꾸기(F)로 고른 것이 실제로 실행된다
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''() => { const S = window.__game.S; S.guards.forEach(g => { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; g.sched = null; }); }'''
FIND = '''() => { const G = window.__game, S = G.S, P = S.player; const objs = [].concat(S.doors.map(d => [d.x, d.y, d.fl || 0]), S.windows.map(w => [w.x, w.y, 0]), S.hides.filter(h => !h.fl).map(h => [h.x, h.y, 0]));
  for (const [ox, oy, fl] of objs) for (const [dx, dy] of [[0, 30], [0, -30], [30, 0], [-30, 0], [22, 22], [-22, 22], [22, -22], [-22, -22]]) {
    P.x = ox + dx; P.y = oy + dy; P.z = 0; P.fl = fl; G.setLayer(fl); if (G.solidAt(Math.floor(P.x / 48), Math.floor(P.y / 48))) continue;
    const L = G.actionChoices(); if (L.length >= 2 && L.every(a => a.k !== 'none')) return { at: [P.x, P.y, fl], ks: L.map(a => a.k + ':' + a.label) }; }
  return null; }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        si = await pg.evaluate("() => window.__game.STAGES.findIndex(s => s.id === 'm1')")
        await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300); await pg.evaluate(SK); await pg.evaluate(FREEZE)
        f = await pg.evaluate(FIND); print('겹친 자리', f)
        if not f: bad.append('겹친 대상 자리를 못 찾음'); 
        else:
            r0 = await pg.evaluate('() => { const a = window.__game.primaryAction(); return [a.k, a.label, a.choices, a.choiceI]; }')
            await pg.evaluate('() => window.__game.cycleAction()')
            r1 = await pg.evaluate('() => { const a = window.__game.primaryAction(); return [a.k, a.label, a.choices, a.choiceI]; }')
            print('처음', r0, '바꾼 뒤', r1)
            if r0[2] < 2 or r1[3] != 1 or (r0[0], r0[1]) == (r1[0], r1[1]): bad.append(f'바꾸기가 안 된다 {r0} {r1}')
            # 다시 처음으로 돌아오는지
            for _ in range(r0[2] - 1): await pg.evaluate('() => window.__game.cycleAction()')
            r2 = await pg.evaluate('() => { const a = window.__game.primaryAction(); return [a.k, a.label, a.choiceI]; }')
            if r2[2] != 0: bad.append(f'한 바퀴 돌면 처음으로 돌아와야 한다 {r2}')
            # 두 번째를 골라 실행 → 그 행동이 실제로 일어남 (첫 후보가 아닌 것)
            await pg.evaluate('() => window.__game.cycleAction()')
            want = await pg.evaluate('() => window.__game.primaryAction().k')
            st0 = await pg.evaluate('() => JSON.stringify([window.__game.S.player.hide ? 1 : 0, window.__game.S.doors.map(d => d.locked ? 1 : 0).join(""), !!window.__game.S.player.trav, !!window.__game.S.player.jump, !!window.__game.S.player.pick])')
            await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_timeout(200)
            st1 = await pg.evaluate('() => JSON.stringify([window.__game.S.player.hide ? 1 : 0, window.__game.S.doors.map(d => d.locked ? 1 : 0).join(""), !!window.__game.S.player.trav, !!window.__game.S.player.jump, !!window.__game.S.player.pick])')
            print('실행', want, st0 != st1)
            if st0 == st1: bad.append(f'고른 행동({want})을 실행해도 아무 일도 안 일어난다')
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
