# 의뢰 1 확장판 회귀: 넓힌 지도 · 지구대(경찰 넷 + 순찰 둘, 증거물실 금고는 파랑 카드, 카드는 2층 당직) · 건달파 당구장 · 교통/경찰차
# · 목표 둘(장부 · 장부 사본) · 동쪽 큰길 끝 탈출 · 포차 손님 대화(지구대 이야기)
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 60 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); m = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; m.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await m.goto('file:///root/game/build/preview_city.html?nostats'); await m.wait_for_timeout(1500)
        await m.evaluate("() => window.__game.start(window.__game.STAGES.findIndex(s => s.id === 'm1'))"); await m.wait_for_timeout(400); await m.evaluate(SK); await m.wait_for_timeout(1500)
        r = await m.evaluate("""() => { const g = window.__game, S = g.S;
          const cops = S.guards.filter(q => q.police), duty = S.guards.find(q => q.tag === 'duty'), B = S.guards.filter(q => q.fac === 'B');
          const vd = S.doors.find(d => d.keyLock === 'blue'), pc = (S.vehicles || []).filter(v => v.police), ai = (S.vehicles || []).filter(v => v.ai);
          return { W: g.MW, H: g.MH, cops: cops.length, beat: cops.filter(q => q.beat).length, duty: duty ? [duty.hasKey, duty.fl, duty.outfit] : null, B: B.length, Bout: B.every(q => q.outfit === 'rival'),
            vault: vd ? [vd.locked, vd.tx, vd.ty] : null, items: S.items.map(i => [i.b, i.fl]), pcars: pc.length, traffic: ai.length, exits: (S.exits || []).length, exitOpen: S.exitOpen }; }""")
        print('상태', r)
        if (r['W'], r['H']) != (92, 60): bad.append('지도 크기 %s' % r)
        if r['cops'] < 6 or r['beat'] < 2: bad.append('경찰 수 %s' % r)
        if not r['duty'] or r['duty'][0] != 'blue' or r['duty'][1] != 1: bad.append('2층 당직이 파랑 카드를 갖고 있지 않다 %s' % r['duty'])
        if r['B'] < 3 or not r['Bout']: bad.append('당구장 건달파 %s' % r)
        if not r['vault'] or not r['vault'][0]: bad.append('증거물실 금고가 파랑 카드로 잠겨 있지 않다 %s' % r['vault'])
        if len(r['items']) != 2 or r['items'][1] != [6, 0]: bad.append('목표 둘(장부·사본) %s' % r['items'])
        if r['pcars'] < 2 or r['traffic'] < 4: bad.append('경찰차·교통 %s' % r)
        if r['exits'] < 3: bad.append('탈출구 %s' % r)
        # 교통이 실제로 움직인다
        a = await m.evaluate("() => window.__game.S.vehicles.filter(v => v.ai).map(v => [v.x, v.y])"); await m.wait_for_timeout(2000)
        a2 = await m.evaluate("() => window.__game.S.vehicles.filter(v => v.ai).map(v => [v.x, v.y])")
        mv = sum(1 for p0, p1 in zip(a, a2) if abs(p0[0] - p1[0]) + abs(p0[1] - p1[1]) > 60); print('움직인 차', mv, len(a))
        if mv < len(a) // 2: bad.append('교통이 돌지 않는다 %d/%d' % (mv, len(a)))
        # 장부 하나만으로는 탈출이 안 열리고, 둘 다면 열린다 → 동쪽 큰길 끝에서 성공
        s = await m.evaluate("() => { const S = window.__game.S; S.items[0].got = true; return S.exitOpen; }"); await m.wait_for_timeout(400)
        s1 = await m.evaluate("() => window.__game.S.exitOpen")
        await m.evaluate("() => { const S = window.__game.S; S.items[1].got = true; }"); await m.wait_for_timeout(400)
        s2 = await m.evaluate("() => window.__game.S.exitOpen")
        await m.evaluate("() => { const S = window.__game.S, P = S.player; P.x = 90 * 48 + 24; P.y = 47 * 48 + 24; P.z = 0; P.fl = 0; }"); await m.wait_for_timeout(800)
        s3 = await m.evaluate("() => window.__game.S.over")
        print('탈출', s1, s2, s3)
        if s1 or not s2 or not s3: bad.append('목표 둘을 다 챙겨야 열리고 동쪽 끝에서 끝나야 한다 %s %s %s' % (s1, s2, s3))
        await b.close()
    if errs: bad.append('페이지 오류 %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
