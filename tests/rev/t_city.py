# 도시 판 회귀: 교통이 돈다 · 세워 둔 차 타고 몰기 · 차로 사람 치면 수배 · 운전자 끌어내기 · 경찰 출동과 병원 · 의뢰 장소 → 의뢰 → 도시로
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 60 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); m = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; m.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await m.goto('file:///root/game/build/preview_city.html?nostats'); await m.wait_for_timeout(1500)
        await m.evaluate("() => { try { localStorage.removeItem('yahaeng.cityDone'); } catch (e) {} }")
        async def fresh():
            await m.evaluate("() => window.__game.start(window.__game.STAGES.findIndex(s => s.id === 'city'))"); await m.wait_for_timeout(300); await m.evaluate(SK)
        await fresh()
        # 1) 교통: 차들이 움직인다
        a = await m.evaluate("() => window.__game.S.vehicles.filter(v => v.ai).map(v => [v.x, v.y])")
        await m.wait_for_timeout(2500)
        b2 = await m.evaluate("() => window.__game.S.vehicles.filter(v => v.ai).map(v => [v.x, v.y])")
        moved = sum(1 for p0, p1 in zip(a, b2) if abs(p0[0] - p1[0]) + abs(p0[1] - p1[1]) > 100)
        print('교통', len(a), '움직인 차', moved)
        if len(a) < 10 or moved < len(a) // 2: bad.append('도로의 차가 돌지 않는다 %d/%d' % (moved, len(a)))
        # 2) 세워 둔 차: [행동]으로 타고, 방향키로 몬다
        r = await m.evaluate("() => { const S = window.__game.S, P = S.player, v = S.vehicles.find(v => v.parked && v.y > 40 * 48 && v.x < 40 * 48); P.x = v.x + 40; P.y = v.y; return [Math.round(v.x), Math.round(v.y)]; }")
        await m.wait_for_timeout(200)
        e = await m.evaluate("() => window.__game.envAction().k"); await m.keyboard.press('KeyX'); await m.wait_for_timeout(1000)  # 문 앞으로 걸어가 타는 동작
        inCar = await m.evaluate("() => !!window.__game.S.player.car")
        await m.keyboard.down('ArrowDown'); await m.wait_for_timeout(2200); await m.keyboard.up('ArrowDown')
        r2 = await m.evaluate("() => { const P = window.__game.S.player; return [Math.round(P.x), Math.round(P.y), Math.round(P.car ? P.car.v : 0)]; }")
        print('운전', r, e, inCar, r2)
        if e != 'carIn' or not inCar: bad.append('세워 둔 차에 못 탄다 %s %s' % (e, inCar))
        if abs(r2[1] - r[1]) + abs(r2[0] - r[0]) < 80: bad.append('차가 움직이지 않는다 %s → %s' % (r, r2))
        # 3) 차로 사람을 치면 쓰러지고 수배가 붙는다
        r = await m.evaluate("""() => { const S = window.__game.S, P = S.player, v = P.car; v.v = 0; v.a = 0; v.x = 10 * 48; v.y = 21 * 48 + 24; P.x = v.x; P.y = v.y;
          const c = S.guards.find(q => q.civ && !q.child && q.state !== 'DEAD'); c.x = v.x + 160; c.y = v.y; c.route = [{ x: c.x, y: c.y, pause: 999 }]; c.routeLine = null; c.path = null; c.wait = 99; return c.id; }""")
        await m.keyboard.down('ArrowRight'); await m.wait_for_timeout(1400); await m.keyboard.up('ArrowRight'); await m.wait_for_timeout(300)
        s = await m.evaluate("(id) => { const S = window.__game.S, c = S.guards.find(q => q.id === id); return [c.state, S.wanted, S.stats.runOver || 0]; }", r)
        print('치기', s)
        if s[0] != 'DEAD' or s[1] < 1: bad.append('차로 친 사람이 안 쓰러지거나 수배가 안 붙는다 %s' % s)
        # 4) 경찰: 수배가 붙으면 경찰이 나타나 쫓는다
        await m.keyboard.press('KeyX'); await m.wait_for_timeout(300)
        for t in range(8):
            await m.wait_for_timeout(1000)
            c = await m.evaluate("() => { const S = window.__game.S; return S.guards.filter(g => g.police && !g.off && g.state === 'ALERT').length; }")
            if c: break
        print('경찰 추격', c)
        if not c: bad.append('수배가 붙어도 경찰이 쫓아오지 않는다')
        # 5) 쓰러지면 병원에서 깨어나고 수배가 풀린다
        await m.evaluate("() => { const S = window.__game.S; S.player.hp = 1; S.player.hurtT = 0; window.__game.hurt('경찰 곤봉에 맞았다.'); }")  # 경찰이 언제 닿을지는 그때그때라 직접 맞힌다
        await m.wait_for_timeout(500)
        s = await m.evaluate("() => { const S = window.__game.S; return [S.stats.downs || 0, S.wanted, S.player.hp, S.over]; }")
        print('병원', s)
        if not s[0] or s[1] or s[3]: bad.append('쓰러져도 병원에서 깨어나지 않는다 %s' % s)
        # 6) 운전자 끌어내기: 차 앞에 서 있으면 멈춘다 → 타면 운전자가 내려 달아난다
        await fresh()
        r = await m.evaluate("""() => { const S = window.__game.S, P = S.player, v = S.vehicles.find(v => v.ai && v.d === 0); P.x = v.x + 70; P.y = v.y; v.v = 0; return v.id; }""")
        await m.wait_for_timeout(400)
        await m.evaluate("(id) => { const S = window.__game.S, v = S.vehicles.find(q => q.id === id); S.player.x = v.x; S.player.y = v.y - 50; }", r)
        await m.wait_for_timeout(150)
        e = await m.evaluate("() => { const a = window.__game.envAction(); return [a.k, a.label]; }")
        n0 = await m.evaluate("() => window.__game.S.guards.length")
        await m.keyboard.press('KeyX'); await m.wait_for_timeout(1700)  # 문 열고 끌어내고 타는 동작
        s = await m.evaluate("(n0) => { const S = window.__game.S, g = S.guards.find(q => q.driverOut); return [!!S.player.car, S.guards.slice(n0).filter(q => q.driverOut).length, g ? g.state : null]; }", n0)
        print('빼앗기', e, s)
        if e[0] != 'carIn' or not s[0] or s[1] != 1 or s[2] != 'PANIC': bad.append('운전자를 끌어내고 타지 못한다 %s %s' % (e, s))
        # 7) 의뢰 장소 → 의뢰 시작 → 끝나면 도시로 (의뢰 장소 앞)
        await fresh()
        await m.evaluate("() => { const S = window.__game.S, c = S.contracts.find(c => c.id === 'm1'); S.player.x = c.x; S.player.y = c.y + 10; }"); await m.wait_for_timeout(200)
        e = await m.evaluate("() => window.__game.envAction().k"); await m.keyboard.press('KeyX'); await m.wait_for_timeout(800); await m.evaluate(SK)
        now = await m.evaluate("() => window.__game.S.items.length")
        await m.evaluate("() => window.__game.endGame(true)"); await m.wait_for_timeout(1200)
        vis = await m.evaluate("() => !document.getElementById('btnCity').hidden")
        await m.click('#btnCity'); await m.wait_for_timeout(1200); await m.evaluate(SK)
        s = await m.evaluate("() => { const S = window.__game.S, c = S.contracts && S.contracts.find(c => c.id === 'm1'); return [!!c, c ? Math.round(Math.hypot(S.player.x - c.x, S.player.y - c.y)) : -1, JSON.parse(localStorage.getItem('yahaeng.cityDone') || '{}').m1 || 0]; }")
        print('의뢰', e, now, vis, s)
        if e != 'contract' or not vis or not s[0] or s[1] > 80 or not s[2]: bad.append('의뢰 장소 → 의뢰 → 도시 복귀가 안 된다 %s %s %s' % (e, vis, s))
        await b.close()
    if errs: bad.append('페이지 오류 %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
