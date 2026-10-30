# 의뢰 2 (히트맨식) 기회 세 갈래를 실제 행동으로 끝까지:
#  1 엿듣기: 포차 직원 둘 → '배탈' 정보 · 기회 발견
#  2 배탈약: 약국에서 줍기 → 직원 옷 → 바에서 술병에 타기(직원 옷이면 수상하지 않음) → 실장이 공중화장실로 → 화장실 안에서 처치 → 다녀오면 일과표가 원래대로
#  3 간판: 실장이 간판 밑에 있을 때 옥상에서 떨어뜨리기 → 사고
#  4 금고: 비번 → 금고 문 → 장부·파랑 카드 → VIP룸 뒷문 → 소파의 실장 처치
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''(keep) => { const S = window.__game.S; S.guards.forEach((g, i) => { if (!keep.includes(i)) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; g.sched = null; g.path = null; } }); }'''
AT = '''([x, y, fl, z]) => { const G = window.__game, P = G.S.player; P.fl = fl; P.z = z; P.x = x * 48 + 24; P.y = y * 48 + 24; P.trav = null; P.hide = null; P.vx = P.vy = 0; G.setLayer(fl); }'''
TGT = "() => { const g = window.__game.S.guards[0]; return { st: g.state, tx: Math.floor(g.x / 48), ty: Math.floor(g.y / 48), n: g.route.length, ri: g.ri, wait: Math.round(g.wait * 10) / 10, once: g.route.some(r => r.once), sn: g.sched && g.sched.map(s => s.name) }; }"
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        si = await pg.evaluate("() => window.__game.STAGES.findIndex(s => s.id === 'm2')")
        async def fresh(keep):
            await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300); await pg.evaluate(SK); await pg.evaluate(FREEZE, keep)
        ev = pg.evaluate
        # 1 엿듣기: 포차 직원 둘(14·15) 곁에 서 있으면 '배탈' 정보와 기회가 생긴다
        await fresh([0, 14, 15]); await ev(AT, [7, 29, 0, 0])
        got = False
        for t in range(40):
            await pg.wait_for_timeout(500)
            r = await ev("() => { const S = window.__game.S; return [S.learned.some(l => l.includes('배탈')), (S.stories || []).filter(s => s.found).map(s => s.d.id)]; }")
            if r[0] and 'emetic' in r[1]: got = True; break
        print('엿듣기', r)
        if not got: bad.append(f'포차 직원 대화를 엿들어도 배탈 정보·기회가 안 생긴다 {r}')
        # 2 배탈약
        await fresh([0]); await ev(AT, [16, 29, 0, 0]); await pg.wait_for_timeout(100)
        a = await ev('() => { const a = window.__game.secondaryAction(); return [a.k, a.label]; }')
        await ev('() => window.__game.actCarry()'); await pg.wait_for_function('!window.__game.S.player.interact'); it = await ev('() => { const I = window.__game.S.player.item; return I && I.id; }')
        print('약국', a, it)
        if a[0] != 'pickup' or it != 'emetic': bad.append(f'약국에서 배탈약을 못 줍는다 {a} {it}')
        await ev("() => { const P = window.__game.S.player; P.outfit = 'waiter'; P.disguise = 'waiter'; P.disguiseBlown = false; }")
        await ev(AT, [27, 10, 0, 0]); await pg.wait_for_timeout(100)
        a = await ev('() => { const a = window.__game.secondaryAction(); return [a.k, a.label]; }')
        await ev('() => window.__game.actCarry()'); await pg.wait_for_function('!window.__game.S.player.interact')
        r = await ev('() => { const S = window.__game.S, P = S.player; return [!!S.usesDone[0], (P.useT || 0) > S.t, P.item && P.item.id]; }')
        print('술병', a, r)
        if a[0] != 'use' or not r[0]: bad.append(f'바에서 배탈약을 탈 수 없다 {a} {r}')
        if r[1]: bad.append('직원 옷을 입고 탔는데 수상한 짓으로 친다')
        t0 = await ev(TGT); print('실장 일과', t0)
        if not t0['once'] or '공중화장실' not in (t0['sn'] or []): bad.append(f'배탈약을 타도 실장이 화장실로 가지 않는다 {t0}')
        await ev("() => { const g = window.__game.S.guards[0]; g.x = 34 * 48 + 24; g.y = 16 * 48 + 24; g.path = null; }")   # 클럽 앞에서 출발시켜 시간 줄이기
        arr = None
        for t in range(70):
            await pg.wait_for_timeout(500); r = await ev(TGT)
            if 39 <= r['tx'] <= 41 and 6 <= r['ty'] <= 7 and r['wait'] > 0: arr = r; break
        print('화장실 도착', arr or r)
        if not arr: bad.append(f'실장이 공중화장실에 들어가지 않는다 {r}')
        else:
            if arr['wait'] < 15: bad.append(f'화장실에 너무 짧게 머문다 {arr}')
            await ev("() => { const G = window.__game, g = G.S.guards[0], P = G.S.player; P.x = g.x; P.y = g.y + 40; P.a = -Math.PI / 2; P.z = 0; P.fl = 0; P.mode = 'sneak'; }")
            await pg.wait_for_timeout(100)
            a = await ev('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }')
            await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(1800)
            r = await ev("() => { const S = window.__game.S; return [S.guards[0].state, (S.stories.find(s => s.d.id === 'emetic') || {}).done, S.alevel]; }")
            print('화장실 처치', a, r)
            if r[0] != 'DEAD': bad.append(f'화장실의 실장을 처치하지 못했다 {a} {r}')
            if r[2] >= 2: bad.append(f'화장실 안 처치가 들켰다 {r}')
        # 2-b 다녀오면 일과표가 원래대로 (들를 곳을 지운다)
        await fresh([0])
        await ev("() => { const G = window.__game, g = G.S.guards[0]; g.x = 38 * 48 + 24; g.y = 12 * 48 + 24; g.path = null; G.S.usesDone = {}; }")
        await ev("() => { const S = window.__game.S; S.player.item = S.props[0]; S.props[0].taken = true; }")
        await ev(AT, [27, 10, 0, 0]); await ev('() => window.__game.actCarry()')
        for t in range(40):
            await pg.wait_for_timeout(500); r = await ev(TGT)
            if 39 <= r['tx'] <= 41 and 6 <= r['ty'] <= 7 and r['wait'] > 0: break
        await ev("() => { window.__game.S.guards[0].wait = 0.05; }"); await pg.wait_for_timeout(1500); r = await ev(TGT)
        print('다녀온 뒤', r)
        if r['n'] != 3 or r['once'] or (r['sn'] and len(r['sn']) != 3): bad.append(f'화장실에 다녀온 뒤 일과표가 원래대로 돌아오지 않는다 {r}')
        # 3 간판 사고
        await fresh([0]); await ev("() => { const g = window.__game.S.guards[0]; g.x = 27 * 48 + 24; g.y = 15 * 48 + 24; g.path = null; g.wait = 30; g.ri = 2; }")
        await ev(AT, [27, 12, 0, 2]); await pg.wait_for_timeout(200)
        a = await ev('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }')
        await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(1500)
        r = await ev("() => { const S = window.__game.S, c = S.corpses.find(c => c.target); return [S.guards[0].state, c && c.accident]; }")
        print('간판', a, r)
        if a[0] != 'trap' or r[0] != 'DEAD': bad.append(f'간판을 떨어뜨려 실장을 처리할 수 없다 {a} {r}')
        # 4 금고 → VIP룸 뒷문
        await fresh([0]); await ev("() => { const S = window.__game.S; S.player.keys.code = true; S.learned.push('사무동 금고 비번 0417'); }")
        await ev(AT, [5, 9, 0, 0]); await pg.wait_for_timeout(100)
        a = await ev('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }'); await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(900)
        for x, y in ((5, 6), (4, 6), (3, 6)):
            await ev(AT, [x, y, 0, 0]); await pg.wait_for_timeout(250)
        await ev('() => { const S = window.__game.S, it = S.items[0], P = S.player; P.x = it.x; P.y = it.y; }'); await pg.wait_for_timeout(150); await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(2700)  # 금고에서 꺼내기
        r = await ev('() => { const S = window.__game.S; return [S.items.every(i => i.got), !!S.player.keys.blue]; }')
        print('금고', a, r)
        if not all(r): bad.append(f'금고에서 장부·파랑 카드를 못 챙긴다 {a} {r}')
        await ev(AT, [34, 6, 0, 0]); await pg.wait_for_timeout(100)
        a = await ev('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }'); await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(900)
        op = await ev("() => { const G = window.__game; return G.solidAt(33, 6); }")
        print('VIP 뒷문', a, '막힘' if op else '열림')
        if op: bad.append(f'파랑 카드로 VIP룸 뒷문이 안 열린다 {a}')
        # 실장이 동쪽(창 쪽)을 보고 앉아 있을 때 등 뒤(서쪽)에서 살금살금
        await ev("() => { const g = window.__game.S.guards[0]; g.x = 25 * 48 + 24; g.y = 6 * 48 + 24; g.path = null; g.wait = 30; g.a = 0; g.want = 0; g.waitBase = 0; g.ri = 1; g.meter = 0; g.state = 'PATROL'; }")
        await ev("() => { const P = window.__game.S.player; P.x = 24 * 48 + 24; P.y = 6 * 48 + 24; P.a = 0; P.mode = 'sneak'; }"); await pg.wait_for_timeout(60)
        a = await ev('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }'); await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(1500)
        r = await ev("() => { const S = window.__game.S; return [S.guards[0].state, (S.stories.find(s => s.d.id === 'vault') || {}).step]; }")
        print('VIP룸 처치', a, r)
        if r[0] != 'DEAD': bad.append(f'VIP룸의 실장을 처치하지 못했다 {a} {r}')
        print('errs', errs[:3]); await b.close()
    for x in bad: print(' -', x)
    print('문제', len(bad)); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
