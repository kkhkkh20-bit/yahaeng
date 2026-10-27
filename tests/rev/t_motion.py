# 동작 연결 회귀: 달려들기는 눈에 보일 만큼 시간이 걸린다 · 붙잡기는 달려 붙음 → 목을 감음 → 붙잡힘 순서 · 처치는 10장 프레임을 끊김 없이 지난다 · 끌고 가면 많이 느리다 · 붙잡은 사람 처치도 같은 동작으로 이어진다
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''(keep) => { const S = window.__game.S; S.guards.forEach((g, i) => { if (!keep.includes(i)) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; } }); }'''
PIN = '''([i, x, y, a]) => { const q = window.__game.S.guards[i]; q.x = x * 48 + 24; q.y = y * 48 + 24; q.a = a; q.want = a; q.route = [{ x: q.x, y: q.y, pause: 999 }]; q.path = null; q.wait = 99; q.post = a * 180 / Math.PI; q.state = 'PATROL'; q.meter = 0; }'''
FRAME = '''() => { const G = window.__game, S = G.S, P = S.player, K = P.killAnim; if (!K || P.strikeT <= 0) return null; const f = Math.min(1, (S.t - K.t0) / K.dur); return G.ktFrame(K.kind, G.killKT(K.kind, f, K.from)); }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        async def fresh(keep):
            await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(250); await pg.evaluate(SK); await pg.evaluate(FREEZE, keep)
        async def behind(i, d):
            await pg.evaluate(f'() => {{ const S = window.__game.S, P = S.player, q = S.guards[{i}]; P.x = q.x - {d}; P.y = q.y; P.a = 0; P.z = 0; P.fl = 0; P.vx = P.vy = 0; }}')
        # 1 처치: 프레임 수 · 프레임이 건너뛰지 않고 이어지는지 · 시간
        await fresh([2]); await pg.evaluate(PIN, [2, 33, 3, 0]); await behind(2, 34)
        nf = await pg.evaluate('() => [window.__game.PR.anims.choke[1], window.__game.PR.anims.stabbed[1]]'); print('프레임 수', nf)
        if nf != [10, 10]: bad.append('처치 동작 프레임이 10장이 아니다 %s' % nf)
        await pg.evaluate('() => window.__game.actPrimary()')
        seq = []
        for t in range(80):
            fr = await pg.evaluate(FRAME)
            if fr is None and seq: break
            if fr is not None and (not seq or seq[-1] != fr): seq.append(fr)
            await pg.wait_for_timeout(16)
        dur = await pg.evaluate('() => window.__game.KILL_DUR'); print('처치 프레임 순서', seq, dur)
        if len(set(seq)) < 9 or seq[-1] != 9: bad.append('처치 동작이 프레임을 다 지나지 않는다 %s' % seq)
        # 건너뜀 검사는 실제 시간 표본(시험 기계 속도에 흔들림) 대신 진행도 0~1을 촘촘히 훑어 계산
        for kind in ('stab', 'choke'):
            fs = await pg.evaluate(f"() => {{ const G = window.__game, out = []; for (let i = 0; i <= 200; i++) out.push(G.ktFrame('{kind}', G.killKT('{kind}', i / 200, 0))); return out; }}")
            jumps = [(a2, b2) for a2, b2 in zip(fs, fs[1:]) if abs(b2 - a2) > 1]
            if jumps: bad.append(f'{kind} 처치 동작 프레임이 건너뛴다 {jumps[:3]}')
        # 2 달려들기: 거리에 맞춰 0.2초 넘게 걸린다
        await fresh([2]); await pg.evaluate(PIN, [2, 33, 3, 0]); await behind(2, 80)
        lab = await pg.evaluate('() => window.__game.primaryAction().label'); await pg.evaluate('() => window.__game.actPrimary()')
        r = await pg.evaluate('() => { const L = window.__game.S.player.lunge; return L && L.dur; }'); print('달려들기', lab, r)
        if not r or r < 0.2: bad.append('달려들기가 너무 순식간이다 %s %s' % (lab, r))
        await pg.wait_for_timeout(1800)
        # 3 붙잡기: 달려 붙음 → 목 감기 → 붙잡힘
        await fresh([2]); await pg.evaluate(PIN, [2, 33, 3, 0]); await behind(2, 52)
        lab = await pg.evaluate('() => window.__game.secondaryAction().label'); await pg.evaluate('() => window.__game.actCarry()')
        r0 = await pg.evaluate('() => { const P = window.__game.S.player; return [!!P.grabIn, !!P.captive, P.grabIn && Math.round(P.grabIn.dur * 100) / 100]; }')
        await pg.wait_for_timeout(120); r1 = await pg.evaluate('() => [window.__game.S.guards[2].state, !!window.__game.S.player.captive]')
        await pg.wait_for_timeout(600); r2 = await pg.evaluate('() => [window.__game.S.guards[2].state, !!window.__game.S.player.captive, !!window.__game.S.player.grabIn]')
        print('붙잡기', lab, r0, r1, r2)
        if not r0[0] or r0[1] or r0[2] < 0.35: bad.append('붙잡기가 바로 붙는다(중간 동작 없음) %s' % r0)
        if r2 != ['CAPTIVE', True, False]: bad.append('붙잡기가 끝나지 않는다 %s' % r2)
        # 4 끌고 가기 속도: 그냥 걷기의 절반 아래
        async def walk(ms):
            x0 = await pg.evaluate('() => window.__game.S.player.x'); await pg.evaluate('() => { window.__game.S.keys.ArrowRight = true; }'); await pg.wait_for_timeout(ms)
            await pg.evaluate('() => { window.__game.S.keys.ArrowRight = false; }'); return (await pg.evaluate('() => window.__game.S.player.x')) - x0
        await pg.evaluate('() => window.__game.actPrimary()')  # 붙잡은 사람 처치 → 목 감은 자세에서 이어서
        r = await pg.evaluate('() => { const K = window.__game.S.player.killAnim; return K && [K.kind, K.from]; }')
        if not r or r[1] != 1: bad.append('붙잡은 사람 처치가 이어지는 동작이 아니다 %s' % r)
        await pg.wait_for_timeout(1300)
        # 4 끌고 가기 속도: 같은 자리에서 그냥 걷기와 비교
        await fresh([2]); await pg.evaluate(PIN, [2, 33, 3, 0]); await behind(2, 52)
        await pg.evaluate('() => { window.__game.S.guards[2].x = -9999; }'); dw = await walk(800)
        await pg.evaluate(PIN, [2, 33, 3, 0]); await behind(2, 52); await pg.evaluate('() => window.__game.actCarry()'); await pg.wait_for_timeout(700)
        dd = await walk(800); print('끌기/걷기 이동', round(dd), round(dw), '처치', r)
        if dw <= 0 or dd > dw * 0.55: bad.append('끌고 가도 별로 안 느리다 %s %s' % (dd, dw))
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
