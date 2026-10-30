# 조직 싸움 붙이기 회귀: 소문 흘리기 · 다트 누명 · 상대 구역에 시체 버리기
import sys
import asyncio
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 60 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); m = await b.new_page(viewport={'width': 1280, 'height': 720}); errs=[]; m.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await m.goto('file:///root/game/build/preview_city.html?nostats'); await m.wait_for_timeout(1500)
        async def fresh(sid='m2'):
            await m.evaluate(f"() => window.__game.start(window.__game.STAGES.findIndex(s => s.id === '{sid}'))"); await m.wait_for_timeout(400); await m.evaluate(SK)
        # 1) 소문: 한쪽 조직원 셋이 상대 구역으로 몰려가 싸움이 난다
        await fresh()
        r = await m.evaluate("""() => { const g = window.__game, S = g.S, P = S.player; const c = S.guards.find(q => q.civ && !q.child && !q.outfit && q.state !== 'DEAD' && q.x > 0); c.x = P.x + 30; c.y = P.y; c.state = 'PATROL';
          S.rumorNext = 'A'; g.spreadRumor(c); return [c.id]; }""")
        for t in range(40):
            await m.wait_for_timeout(1000); await m.evaluate(SK)
            s = await m.evaluate("() => { const S = window.__game.S; return [S.guards.filter(q => q.raid).length, S.stats.fights || 0, S.war]; }")
            if s[1]: break
        print('소문', s); bad = [] if s[1] else ['소문을 흘려도 싸움이 안 난다 %s' % s]
        # 2) 다트 누명
        await fresh()
        r = await m.evaluate("""() => { const g = window.__game, S = g.S; const bs = S.guards.filter(q => q.fac === 'B' && q.state !== 'DEAD'); const b0 = bs[0];
          const as = S.guards.filter(q => q.fac === 'A' && !q.target && !q.dog && !(q.fl || 0) && q.state !== 'DEAD').slice(0, 2); as[0].x = b0.x + 120; as[0].y = b0.y; as[1].x = b0.x + 160; as[1].y = b0.y + 30;
          as.forEach(q => { q.fl = 0; q.z = 0; }); S.player.x = b0.x + 600; S.player.y = b0.y; g.killGuard(as[0]); g.dartBlame(as[0]); return [as[1].brawl ? as[1].brawl.o.fac : null, S.corpses[S.corpses.length - 1].blamed]; }""")
        print('다트 누명', r)
        if r != ['B', 'B']: bad.append('다트 누명이 안 통한다 %s' % r)
        # 3) 시체를 상대 구역에
        await fresh()
        r = await m.evaluate("""() => { const g = window.__game, S = g.S; const a = S.guards.find(q => q.fac === 'A' && !q.target && !q.dog && q.state !== 'DEAD' && !(q.fl || 0)); const rect = S.turf.B[0];
          const x = (rect[0] + rect[2]) / 2 * 48, y = (rect[3]) * 48 + 24; a.x = x; a.y = y; g.killGuard(a); const c = S.corpses[S.corpses.length - 1]; const w = S.guards.find(q => q.fac === 'A' && q !== a && q.state !== 'DEAD');
          const res = g.facBody(w, c); return [g.inTurf('B', c.x, c.y), res, S.war, S.alevel]; }""")
        print('시체 버리기', r)
        if r[:3] != [True, True, True] or r[3]: bad.append('상대 구역의 시체가 전쟁으로 안 번진다 %s' % r)
        if errs: bad.append('페이지 오류 %s' % errs[:3])
        await b.close()
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
