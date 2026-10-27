# 모든 의뢰·연습의 사다리·배관·가스관·베란다를 실제 행동으로 올라 본다
# 올라선 자리가 오른 곳 바로 위(1.6칸 안)이고, 그 높이의 걸을 수 있는 옥상이며, 옆으로 움직일 수 있고, 다시 [내리기]로 내려올 수 있어야 한다
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''() => { const S = window.__game.S; S.guards.forEach(g => { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; g.sched = null; g.path = null; }); }'''
PLACE = '''([fl, z, x, y]) => { const G = window.__game, P = G.S.player; P.fl = fl; P.z = z; P.x = x; P.y = y; P.trav = null; P.cover = null; P.snap = null; P.carrying = null; P.captive = null; P.item = null; P.hide = null; P.vx = P.vy = 0; G.setLayer(fl); }'''
CHECK = '''([bx, by]) => { const G = window.__game, P = G.S.player, z = P.z || 0, tx = Math.floor(P.x / 48), ty = Math.floor(P.y / 48), sol = G.solidFor(z);
  const free = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !sol(tx + dx, ty + dy)).length;
  return { z, fl: P.fl || 0, x: Math.round(P.x), y: Math.round(P.y), far: Math.round(Math.hypot(P.x - bx, P.y - by) / 48 * 10) / 10, here: !sol(tx, ty), lv: G.rLv(tx, ty), free, trav: !!P.trav }; }'''
async def main():
    bad = []; n = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        stages = await pg.evaluate('() => window.__game.STAGES.map(s => s.id)')
        async def waitTrav():  # 오르내리는 동작이 끝날 때까지 (최대 5초)
            await pg.wait_for_timeout(300)
            for _ in range(50):
                if not await pg.evaluate('() => { const P = window.__game.S.player; return !!(P.trav || P.jump); }'): break
                await pg.wait_for_timeout(100)
            await pg.wait_for_timeout(150)
        for si, sid in enumerate(stages):
            await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(250); await pg.evaluate(SK); await pg.evaluate(FREEZE)
            ls = await pg.evaluate('() => window.__game.LADDERS.map((l, i) => ({ i, kind: l.kind, gas: !!l.gas, bz: l.bz || 0, bfl: l.bfl || 0, tz: l.tz || 0, tfl: l.tfl, x: l.x, y: l.y, bx: l.bx, by: l.by })).filter(l => ["ladder", "pipe", "balc"].includes(l.kind))')
            for l in ls:
                n += 1; tag = f"{sid} {l['kind']}{'(가스관)' if l['gas'] else ''} ({l['bx']},{l['by']}) 높이{l['bz']}→{l['tz']}"
                await pg.evaluate(SK); await pg.evaluate(FREEZE)
                await pg.evaluate(PLACE, [l['bfl'], l['bz'], l['x'], l['y']]); await pg.wait_for_timeout(60)
                a = await pg.evaluate('() => { const a = window.__game.primaryAction(); return [a.k, a.label, a.l ? window.__game.LADDERS.indexOf(a.l) : -1]; }')
                if a[0] != 'up': bad.append(f'{tag}: 아래에서 [오르기]가 아니라 {a[:2]}'); continue
                if a[2] != l['i']: continue  # 같은 자리 다른 사다리(아래 칸 공유) — 그 사다리 차례에 본다
                await pg.evaluate('() => window.__game.actPrimary()'); await waitTrav()
                c = await pg.evaluate(CHECK, [l['x'], l['y']])
                if l['kind'] == 'balc':
                    if c['fl'] != 1 or c['trav']: bad.append(f'{tag}: 베란다로 못 들어감 {c}')
                    continue
                if c['trav'] or c['z'] != l['tz']: bad.append(f'{tag}: 올라간 높이가 다르다 {c}'); continue
                lim = (l['tz'] - l['bz']) + 1.4 if l['kind'] == 'pipe' else 1.6
                if c['far'] > lim: bad.append(f'{tag}: 오른 곳에서 {c["far"]}칸 떨어진 곳에 섰다 {c}')
                if not c['here'] or c['lv'] != l['tz']: bad.append(f'{tag}: 선 자리가 그 높이 옥상이 아니다 {c}')
                if c['free'] == 0: bad.append(f'{tag}: 옥상에서 어느 쪽으로도 못 움직인다 {c}')
                a = await pg.evaluate('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }')
                if a[0] != 'down': bad.append(f'{tag}: 올라선 자리에서 [내리기]가 아니라 {a}'); continue
                await pg.evaluate('() => window.__game.actPrimary()'); await waitTrav()
                c2 = await pg.evaluate(CHECK, [l['x'], l['y']])
                if c2['z'] != l['bz'] or c2['trav'] or c2['far'] > 0.6: bad.append(f'{tag}: 다시 내려온 자리 이상 {c2}')
        print('오를 곳', n, '개 검사'); print('errs', errs[:3]); await b.close()
    for x in bad: print(' -', x)
    print('문제', len(bad)); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
