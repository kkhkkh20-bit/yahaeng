# 의뢰 3 (히트맨식 잔칫날) 기회 세 갈래를 실제 행동으로:
#  1 엿듣기: 노점 골목에서 쉬는 뷔페 일꾼 둘 → '발전기' 정보 · 기회 발견
#  2 정전: 두꺼비집을 내리면 회장이 혼자 마당 구석 발전기로 → 그 자리에서 처치(들키지 않음)
#  3 연못가: 회장이 웅덩이에 서 있을 때 담 밖 전선함에서 [전선 끊기] → 감전 사고
#  4 건배사: 회장이 단상에 있을 때 본채 지붕에서 [실외기 떨어뜨리기] → 사고
#  5 조끼: 뷔페 조끼를 입으면 정문으로 마당에 들어가도 아무도 막지 않는다
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''(keep) => { const S = window.__game.S; S.guards.forEach((g, i) => { if (!keep.includes(i)) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; g.sched = null; g.path = null; } }); }'''
AT = '''([x, y, fl, z]) => { const G = window.__game, P = G.S.player; P.fl = fl; P.z = z; P.x = x * 48 + 24; P.y = y * 48 + 24; P.trav = null; P.hide = null; P.vx = P.vy = 0; G.setLayer(fl); }'''
PIN = '''([x, y, ri]) => { const g = window.__game.S.guards[0]; g.x = x * 48 + 24; g.y = y * 48 + 24; g.path = null; g.wait = 30; g.ri = ri; g.state = 'PATROL'; g.meter = 0; }'''
TGT = "() => { const g = window.__game.S.guards[0]; return { st: g.state, tx: Math.floor(g.x / 48), ty: Math.floor(g.y / 48), wait: Math.round(g.wait * 10) / 10, sn: g.sched && g.sched.map(s => s.name) }; }"
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        si = await pg.evaluate("() => window.__game.STAGES.findIndex(s => s.id === 'm3')")
        ev = pg.evaluate
        async def fresh(keep):
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300); await ev(SK); await ev(FREEZE, keep)
        # 1 엿듣기
        await fresh([0, 12, 13]); await ev(AT, [12, 28, 0, 0]); r = None
        for t in range(40):
            await pg.wait_for_timeout(500)
            r = await ev("() => { const S = window.__game.S; return [S.learned.some(l => l.includes('발전기')), (S.stories || []).filter(s => s.found).map(s => s.d.id)]; }")
            if r[0] and 'gen' in r[1]: break
        print('엿듣기', r)
        if not (r[0] and 'gen' in r[1]): bad.append(f'뷔페 일꾼 대화를 엿들어도 발전기 정보·기회가 안 생긴다 {r}')
        # 2 정전 → 발전기
        await fresh([0]); await ev(PIN, [27, 18, 0]); await ev(AT, [36, 28, 0, 0]); await pg.wait_for_timeout(100)
        a = await ev('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }'); await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(300)
        r = await ev(TGT); lo = await ev('() => window.__game.S.lightsOn'); print('두꺼비집', a, lo, r)
        if lo or '발전기' not in (r['sn'] or []): bad.append(f'두꺼비집을 내려도 회장이 발전기로 가지 않는다 {a} {lo} {r}')
        arr = None
        for t in range(60):
            await pg.wait_for_timeout(500); r = await ev(TGT)
            if abs(r['tx'] - 32) <= 1 and abs(r['ty'] - 24) <= 1 and r['wait'] > 0: arr = r; break
        print('발전기 도착', arr or r)
        if not arr: bad.append(f'회장이 발전기 자리에 오지 않는다 {r}')
        else:
            await ev("() => { const G = window.__game, g = G.S.guards[0], P = G.S.player; const a = g.a; P.x = g.x - Math.cos(a) * 40; P.y = g.y - Math.sin(a) * 40; P.a = a; P.z = 0; P.fl = 0; P.mode = 'sneak'; }")
            await pg.wait_for_timeout(80)
            a = await ev('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }'); await pg.keyboard.down('KeyZ'); await pg.wait_for_timeout(1500); await pg.keyboard.up('KeyZ'); await pg.wait_for_timeout(1800)
            r = await ev('() => { const S = window.__game.S; return [S.guards[0].state, S.alevel]; }'); print('발전기 처치', a, r)
            if r[0] != 'DEAD' or not await ev('() => window.__game.targetEliminated(window.__game.S.guards[0])'): bad.append(f'발전기 앞 회장을 처치하지 못했다 {a} {r}')
        # 3 연못가 감전
        await fresh([0]); await ev(PIN, [21, 23, 2]); await ev(AT, [36, 24, 0, 0]); await pg.wait_for_timeout(150)
        a = await ev('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }'); await pg.keyboard.down('KeyX'); await pg.wait_for_timeout(1500); await pg.keyboard.up('KeyX'); await pg.wait_for_timeout(800)
        r = await ev("() => { const S = window.__game.S, c = S.corpses.find(c => c.target); return [S.guards[0].state, c && c.accident]; }"); print('연못가', a, r)
        if a[0] != 'trap' or r[0] != 'DEAD' or not await ev('() => window.__game.targetEliminated(window.__game.S.guards[0])'): bad.append(f'연못가 감전이 안 된다 {a} {r}')
        # 4 건배사 실외기
        await fresh([0]); await ev(PIN, [21, 15, 1]); await ev(AT, [21, 11, 0, 2]); await pg.wait_for_timeout(150)
        a = await ev('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }'); await pg.keyboard.down('KeyX'); await pg.wait_for_timeout(1500); await pg.keyboard.up('KeyX'); await pg.wait_for_timeout(1500)
        r = await ev("() => { const S = window.__game.S, c = S.corpses.find(c => c.target); return [S.guards[0].state, c && c.accident]; }"); print('실외기', a, r)
        if a[1] != '실외기 떨어뜨리기' or r[0] != 'DEAD' or not await ev('() => window.__game.targetEliminated(window.__game.S.guards[0])'): bad.append(f'실외기를 떨어뜨려 처리할 수 없다 {a} {r}')
        # 5 조끼를 입고 정문으로 마당에 (조직원 문지기 둘·순찰·일꾼이 있어도 막지 않는다)
        await fresh([0, 3, 4, 5, 10, 11]); await ev(AT, [21, 28, 0, 0])
        await ev("() => { const P = window.__game.S.player; P.outfit = 'cater'; P.disguise = 'cater'; P.disguiseBlown = false; }")
        path = await ev('() => { const G = window.__game; G.setLayer(0); return G.astar(21, 28, 14, 21).map(c => [c.x, c.y]); }')
        worst = ''
        for tx, ty in path:
            for k in range(60):
                r = await ev(f'''() => {{ const G = window.__game, S = G.S, P = S.player, K = S.keys, dx = {tx} - P.x, dy = {ty} - P.y, d = Math.hypot(dx, dy);
                    K.ArrowLeft = dx < -6; K.ArrowRight = dx > 6; K.ArrowUp = dy < -6; K.ArrowDown = dy > 6; if (d < 10) {{ K.ArrowLeft = K.ArrowRight = K.ArrowUp = K.ArrowDown = false; }}
                    return [d, S.guards.filter(g => ['WARN', 'ALERT', 'REPORT'].includes(g.state)).map(g => g.state + g.id).join(','), S.alevel]; }}''')
                if r[1] and not worst: worst = r[1]
                if r[0] < 10: break
                await pg.wait_for_timeout(40)
        await ev('() => { const K = window.__game.S.keys; K.ArrowLeft = K.ArrowRight = K.ArrowUp = K.ArrowDown = false; }')
        pos = await ev('() => { const P = window.__game.S.player; return [Math.floor(P.x / 48), Math.floor(P.y / 48), window.__game.S.alevel]; }')
        print('조끼로 마당', pos, worst)
        if worst or pos[2]: bad.append(f'뷔페 조끼를 입었는데 마당에서 막힌다 {worst} {pos}')
        print('errs', errs[:3]); await b.close()
    for x in bad: print(' -', x)
    print('문제', len(bad)); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
