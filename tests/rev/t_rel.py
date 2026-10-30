# 세력 상호작용 회귀 (도시): 경찰 · 의뢰 조직(A) · 건달파(B) · 주민 · 나
#  ① 순찰 경찰이 있다 ② 경찰 눈앞의 패싸움에 경찰이 끼어들어 제압한다(죽이지 않는다) ③ 조직이 주민을 해치면 경찰이 출동한다 — 내 수배는 그대로
#  ④ 경찰이 보는 데서는 조직원이 먼저 시비를 걸지 않는다 ⑤ 내가 경찰 앞에서 주민을 치면 수배 + 경찰 추격 ⑥ 경찰은 구역 출입만으로는 나를 잡지 않는다
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 60 && g.DLG.modal; i++) g.advanceDialog(); }'
PARK = '''(keep) => { const S = window.__game.S; S.guards.forEach(q => { if (keep.includes(q.id)) return; q.x = -9999; q.y = -9999; q.route = [{ x: -9999, y: -9999, pause: 999 }]; q.path = null; q.wander = null; q.routeLine = null; }); }'''
HOLD = '''(ids) => { const S = window.__game.S; for (const id of ids) { const q = S.guards.find(x => x.id === id); q.route = [{ x: q.x, y: q.y, pause: 999 }]; q.routeLine = null; q.path = null; q.wait = 99; q.wander = null; } }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); m = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; m.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await m.goto('file:///root/game/build/preview_city.html?nostats'); await m.wait_for_timeout(1500)
        async def fresh():
            await m.evaluate("() => window.__game.start(window.__game.STAGES.findIndex(s => s.id === 'city'))"); await m.wait_for_timeout(300); await m.evaluate(SK); await m.wait_for_timeout(200)
        async def ids():
            return await m.evaluate("() => { const S = window.__game.S; return { cop: S.guards.filter(g => g.police && g.beat).map(g => g.id), A: S.guards.filter(g => g.fac === 'A' && !g.dog).map(g => g.id), B: S.guards.filter(g => g.fac === 'B').map(g => g.id), civ: S.guards.filter(g => g.civ && !g.child).map(g => g.id) }; }")
        # ① 순찰 경찰
        await fresh(); I = await ids(); print('순찰 경찰', I['cop'])
        if len(I['cop']) < 2: bad.append('순찰 경찰이 없다 %s' % I['cop'])
        # ② 패싸움에 경찰이 끼어든다 (시장 블록 북쪽 보도 근처, 경찰은 싸움 쪽을 본다)
        cop, a, bb = I['cop'][0], I['A'][0], I['B'][0]
        await m.evaluate(PARK, [cop, a, bb])
        await m.evaluate("""([c, a, b]) => { const S = window.__game.S, G = id => S.guards.find(q => q.id === id), T = 48; const C = G(c), A = G(a), B = G(b);
          C.x = 30 * T; C.y = 24 * T + 24; C.a = 0; A.x = 34 * T; A.y = 24 * T + 24; B.x = 35 * T; B.y = 24 * T + 24; [C, A, B].forEach(q => { q.fl = 0; q.z = 0; q.state = 'PATROL'; }); A.fhp = 9; B.fhp = 9;
          S.player.x = 30 * T; S.player.y = 30 * T; S.war = true; }""", [cop, a, bb])
        await m.evaluate(HOLD, [cop, a, bb])
        for t in range(14):
            await m.wait_for_timeout(1000)
            s = await m.evaluate("([c, a, b]) => { const S = window.__game.S, G = id => S.guards.find(q => q.id === id); return [!!G(c).brawl, G(a).state, G(b).state, S.corpses.filter(k => k.by === 'P').length, S.corpses.filter(k => k.by === 'P' && !k.ko).length, S.wanted]; }", [cop, a, bb])
            if s[3]: break
        print('패싸움 개입', s)
        if not s[3]: bad.append('경찰이 눈앞의 패싸움을 제압하지 않는다 %s' % s)
        if s[4]: bad.append('경찰이 조직원을 죽였다 %s' % s)
        if s[5]: bad.append('조직끼리 싸움에 내 수배가 붙었다 %s' % s)
        # ③ 조직원이 주민을 해치면 경찰 출동 — 내 수배는 0
        await fresh(); I = await ids(); a, c = I['A'][0], I['civ'][0]
        await m.evaluate("([a, c]) => { const g = window.__game, S = g.S, G = id => S.guards.find(q => q.id === id), A = G(a), C = G(c); C.x = A.x + 40; C.y = A.y; C.fl = 0; C.z = 0; g.npcDown(C, A, true); }", [a, c])
        await m.wait_for_timeout(600)
        s = await m.evaluate("() => { const S = window.__game.S; return [S.guards.filter(g => g.police && !g.off && g.incident).length, S.wanted]; }")
        print('주민 피해 신고', s)
        if not s[0]: bad.append('조직이 주민을 해쳐도 경찰이 출동하지 않는다 %s' % s)
        if s[1]: bad.append('조직이 한 짓으로 내 수배가 붙었다 %s' % s)
        # ④ 경찰이 보는 데서는 먼저 시비를 걸지 않는다 (전쟁 아님)
        await fresh(); I = await ids(); cop, a, bb = I['cop'][0], I['A'][0], I['B'][0]
        await m.evaluate(PARK, [cop, a, bb])
        await m.evaluate("""([c, a, b]) => { const S = window.__game.S, G = id => S.guards.find(q => q.id === id), T = 48; const C = G(c), A = G(a), B = G(b);
          C.x = 30 * T; C.y = 24 * T + 24; C.a = 0; A.x = 33 * T; A.y = 24 * T + 24; B.x = 35 * T; B.y = 24 * T + 24; [C, A, B].forEach(q => { q.fl = 0; q.z = 0; q.state = 'PATROL'; }); S.war = false; S.player.x = 30 * T; S.player.y = 30 * T; }""", [cop, a, bb])
        await m.evaluate(HOLD, [cop, a, bb])
        await m.wait_for_timeout(16000)
        s = await m.evaluate("() => window.__game.S.stats.fights || 0"); print('경찰 앞 시비', s)
        if s: bad.append('경찰이 보는 데서 조직이 먼저 싸움을 걸었다 %s' % s)
        # ⑤ 내가 경찰 앞에서 주민을 친다 → 수배 + 추격
        await fresh(); I = await ids(); cop, c = I['cop'][0], I['civ'][0]
        await m.evaluate(PARK, [cop, c])
        await m.evaluate("""([cp, c]) => { const S = window.__game.S, G = id => S.guards.find(q => q.id === id), T = 48, P = S.player; const C = G(cp), V = G(c);
          C.x = 28 * T; C.y = 24 * T + 24; C.a = 0; V.x = 32 * T; V.y = 24 * T + 24; V.a = 0; P.x = V.x - 30; P.y = V.y; P.a = 0; [C, V].forEach(q => { q.fl = 0; q.z = 0; q.state = 'PATROL'; }); }""", [cop, c])
        await m.evaluate(HOLD, [cop, c]); await m.wait_for_timeout(200)
        await m.keyboard.down('KeyZ'); await m.wait_for_timeout(1800); await m.keyboard.up('KeyZ'); await m.wait_for_timeout(1200)
        s = await m.evaluate("(cp) => { const S = window.__game.S, C = S.guards.find(q => q.id === cp); return [S.wanted, C.state]; }", cop); print('경찰 앞 폭행', s)
        if s[0] < 1 or s[1] != 'ALERT': bad.append('경찰 앞에서 주민을 쳐도 수배·추격이 없다 %s' % s)
        # ⑥ 조직 구역(창고 상회) 안에 들어가 있어도 경찰은 그것만으로 나를 잡지 않는다
        await fresh(); I = await ids(); cop = I['cop'][0]
        await m.evaluate(PARK, [cop])
        await m.evaluate("(cp) => { const S = window.__game.S, C = S.guards.find(q => q.id === cp), T = 48, P = S.player; C.x = 52 * T + 24; C.y = 21 * T; C.a = -Math.PI / 2; C.fl = 0; C.z = 0; C.state = 'PATROL'; P.x = 55 * T + 24; P.y = 16 * T + 24; }", cop)
        await m.evaluate(HOLD, [cop]); await m.wait_for_timeout(5000)
        s = await m.evaluate("(cp) => { const S = window.__game.S, C = S.guards.find(q => q.id === cp); return [S.wanted, C.state]; }", cop); print('구역 출입', s)
        if s[0] or s[1] == 'ALERT': bad.append('구역 출입만으로 경찰이 나를 쫓는다 %s' % s)
        await b.close()
    if errs: bad.append('페이지 오류 %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
