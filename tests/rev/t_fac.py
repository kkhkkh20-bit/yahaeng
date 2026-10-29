# 세력 회귀: 건달파 배치 · 전쟁 중 싸움(내 경보·감점 없음) · 본 주민 입막음 · 구역에 들어온 주민 폭행 · 옷으로 누명 씌우기 = 전쟁
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }'
HOLD = '''(ids) => { const S = window.__game.S; for (const id of ids) { const q = S.guards.find(x => x.id === id); q.route = [{ x: q.x, y: q.y, pause: 999 }]; q.path = null; q.wait = 99; q.wander = null; } }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); m = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; m.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await m.goto('file:///root/game/build/preview_city.html?nostats'); await m.wait_for_timeout(1500)
        async def fresh(sid='m2'):
            await m.evaluate(f"() => window.__game.start(window.__game.STAGES.findIndex(s => s.id === '{sid}'))"); await m.wait_for_timeout(250); await m.evaluate(SK)
        # 1) 배치: 구역이 있는 판엔 빨간 점퍼 셋, 연습판엔 없음
        for sid in ['m2', 'm3', 'm4', 'm5', 't0']:
            await fresh(sid)
            r = await m.evaluate("() => { const S = window.__game.S; return [S.facOn, S.guards.filter(g => g.fac === 'B' && g.outfit === 'rival').length]; }")
            print('배치', sid, r)
            if sid.startswith('m') and r[1] != 3: bad.append('%s 건달파가 셋이 아니다 %s' % (sid, r))
            if sid == 't0' and (r[0] or r[1]): bad.append('연습판에 세력이 켜졌다 %s' % r)
        # 2) 전쟁: 마주치면 싸우고, 쓰러진 사람은 내 통계·경보와 무관
        await fresh()
        r = await m.evaluate("""() => { const g = window.__game, S = g.S; const bs = S.guards.filter(q => q.fac === 'B'), b0 = bs[0];
          const a = S.guards.filter(q => q.fac === 'A' && !q.target && !q.civ && !q.dog).sort((p, q) => Math.hypot(p.x - b0.x, p.y - b0.y) - Math.hypot(q.x - b0.x, q.y - b0.y))[0];
          a.x = b0.x + 60; a.y = b0.y; a.fl = 0; a.z = 0; S.war = true; return [a.id, bs.map(q => q.id)]; }""")
        await m.evaluate(HOLD, [r[0]] + r[1])
        for t in range(14):
            await m.wait_for_timeout(1000)
            s = await m.evaluate("() => { const S = window.__game.S; return [S.stats.fights || 0, S.stats.npcDown || 0, S.alevel, S.stats.kills, S.stats.ko || 0, S.corpses.filter(c => c.byNpc).length]; }")
            if s[1]: break
        print('전쟁 싸움', s)
        if not s[0] or not s[1] or not s[5]: bad.append('전쟁 중 마주쳐도 싸워 쓰러뜨리지 않는다 %s' % s)
        if s[2] >= 2 or s[3] or s[4]: bad.append('조직끼리 싸움이 내 경보·통계가 됐다 %s' % s)
        # 3) 본 주민 입막음: 이긴 조직원이 본 주민을 쫓아가 쓰러뜨린다
        await fresh()
        r = await m.evaluate("""() => { const g = window.__game, S = g.S; const b0 = S.guards.find(q => q.fac === 'B');
          const a = S.guards.find(q => q.fac === 'A' && !q.target && !q.civ && !q.dog); a.x = b0.x + 30; a.y = b0.y; a.fl = 0; a.z = 0;
          const c = S.guards.find(q => q.civ && !q.child && !q.target); c.x = b0.x; c.y = b0.y + 110; c.fl = 0; c.z = 0; c.a = -Math.PI / 2; c.want = c.a; c.state = 'PATROL';
          g.npcDown(b0, a, true); return [a.id, c.id, !!a.hunt, a.hunt && a.hunt.c === c]; }""")
        print('입막음 시작', r)
        await m.evaluate(HOLD, [r[1]])
        if not r[2]: bad.append('범행을 본 주민을 쫓지 않는다 %s' % r)
        for t in range(16):
            await m.wait_for_timeout(1000)
            s = await m.evaluate("(id) => { const S = window.__game.S, c = S.guards.find(q => q.id === id); return [c.state, S.stats.npcCiv || 0, S.alevel, S.stats.extraKills || 0]; }", r[1])
            if s[0] == 'DEAD': break
        print('입막음', s)
        if s[0] != 'DEAD' or not s[1]: bad.append('본 주민을 입막음하지 못했다 %s' % s)
        if s[3]: bad.append('조직이 해친 주민이 내 감점이 됐다 %s' % s)
        # 4) 출입 금지 구역에 들어온 주민: 경고 뒤 때려 눕힌다
        await fresh()
        r = await m.evaluate("""() => { const g = window.__game, S = g.S, T = 48;
          for (const a of S.guards) { if (a.fac !== 'A' || a.target || a.dog || (a.fl || 0) || g.zoneAt(a.x, a.y, 0) === g.Z_PUB) continue;
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]) { const tx = Math.floor(a.x / T) + dx, ty = Math.floor(a.y / T) + dy;
              if (g.solidAt(tx, ty) || g.zoneAt(tx * T + 24, ty * T + 24, 0) === g.Z_PUB) continue;
              const c = S.guards.find(q => q.civ && !q.child && !q.target && !q.outfit && !q.enforcer); c.x = tx * T + 24; c.y = ty * T + 24; c.fl = 0; c.z = 0; c.state = 'PATROL';
              return [a.id, c.id, tx, ty]; } } return null; }""")
        print('구역 주민', r)
        if not r: bad.append('출입 금지 구역 자리를 못 찾았다')
        else:
            await m.evaluate(HOLD, r[:2])
            for t in range(14):
                await m.wait_for_timeout(1000)
                s = await m.evaluate("(id) => { const S = window.__game.S, c = S.guards.find(q => q.id === id); return [c.state, S.corpses.some(k => k.g === c && k.byNpc), S.alevel]; }", r[1])
                if s[0] == 'DEAD': break
            print('구역 폭행', s)
            if s[0] != 'DEAD' or not s[1]: bad.append('구역에 들어온 주민을 때려 눕히지 않는다 %s' % s)
        # 5) 누명: 건달 점퍼를 입고 조직원을 쓰러뜨린 걸 다른 조직원이 보면 전쟁
        await fresh()
        r = await m.evaluate("""() => { const g = window.__game, S = g.S, P = S.player; const as = S.guards.filter(q => q.fac === 'A' && !q.target && !q.dog && !(q.fl || 0));
          const v = as[0], w = as[1]; P.outfit = 'rival'; P.disguiseBlown = false; P.fl = 0; P.z = 0; w.x = P.x + 90; w.y = P.y; w.fl = 0; w.z = 0; w.a = Math.PI; w.want = w.a;
          const before = S.war; g.facWitness(v); return [before, S.war, !!S.stats.war]; }""")
        print('누명', r)
        if r[0] or not r[1]: bad.append('건달 옷으로 조직원을 친 걸 봐도 전쟁이 안 난다 %s' % r)
        await b.close()
    if errs: bad.append('페이지 오류 %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
