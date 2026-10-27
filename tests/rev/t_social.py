# 히트맨식 2단계 회귀: 주민 신고(도중에 막기) · 현장 물건(허가·쓰기) · 단계형 기회 · 표적 일과표
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''(keep) => { const S = window.__game.S; S.guards.forEach((g, i) => { if (!keep.includes(i)) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; } }); }'''
PIN = '''([i, x, y, a]) => { const q = window.__game.S.guards[i]; q.x = x * 48 + 24; q.y = y * 48 + 24; q.a = a; q.want = a; q.route = [{ x: q.x, y: q.y, pause: 999 }]; q.wander = null; q.path = null; q.wait = 99; q.post = a * 180 / Math.PI; q.state = 'PATROL'; q.meter = 0; }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        async def fresh(keep):
            await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(250); await pg.evaluate(SK); await pg.evaluate(FREEZE, keep)
        civ = await pg.evaluate('() => window.__game.S.guards.findIndex(g => g.civ)')
        # 1 신고: 광장에서 주민이 보는 앞에서 자경대원을 기절 → 주민이 멀리 있는 자경대원에게 뛰어가 신고
        async def crime():
            await fresh([0, 2, civ]); await pg.evaluate(PIN, [2, 30, 20, 0]); await pg.evaluate(PIN, [0, 41, 13, 1.57]); await pg.evaluate(PIN, [civ, 33, 20, 3.14159])
            await pg.evaluate('() => { const S = window.__game.S, P = S.player, q = S.guards[2]; P.x = q.x - 34; P.y = q.y; P.a = 0; }')
            await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_timeout(1200)
            return await pg.evaluate(f'() => window.__game.S.guards[{civ}].state')
        st = await crime(); print('목격 후 주민', st)
        if st != 'REPORT': bad.append('범죄를 본 주민이 신고하러 가지 않는다: %s' % st)
        r = None
        for t in range(40):
            await pg.wait_for_timeout(250); r = await pg.evaluate(f'() => [window.__game.S.stats.witness || 0, window.__game.S.alevel, window.__game.S.guards[0].state, window.__game.S.guards[{civ}].state]')
            if r[0]: break
        print('신고 도착', r)
        if not r[0] or r[1] < 2: bad.append('신고가 자경대원에게 닿지 않는다 %s' % r)
        # 2 도중에 막기: 신고하러 뛰는 주민을 기절시키면 신고 없음
        st = await crime()
        await pg.evaluate(f'() => {{ const S = window.__game.S, P = S.player, c = S.guards[{civ}]; P.x = c.x - Math.cos(c.a) * 30; P.y = c.y - Math.sin(c.a) * 30; P.a = c.a; }}')
        lab = await pg.evaluate('() => window.__game.primaryAction().label'); await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_timeout(2500)
        r = await pg.evaluate(f'() => [window.__game.S.stats.witness || 0, window.__game.S.guards[{civ}].state]'); print('가로막기', lab, r)
        if r[0] or r[1] != 'DEAD': bad.append('신고하러 가는 주민을 막을 수 없다 %s %s' % (lab, r))
        # 3 현장 물건 + 쓰는 곳 + 단계형 기회 + 일과표 (시험용 데이터를 의뢰 1에 잠깐 붙인다)
        await pg.evaluate('''() => { const ST = window.__game.STAGE; ST._bak = [ST.props, ST.uses, ST.stories, ST.zones[0][7], ST._base.guards.length];
          ST.props = [{ id: 'box', name: '택배 상자', at: [44, 26], permit: 'courier' }];
          ST.uses = [{ need: 'box', at: [33, 4], label: '상자 내려두기', done: '상자를 창고 앞에 두었다', act: S => { S._used = 1; } }];
          ST.stories = [{ id: 'tb', name: '택배 왔습니다', reveal: S => Math.hypot(S.player.x - 44 * 48, S.player.y - 26 * 48) < 300, steps: [{ text: '상자 들기', done: S => !!S.player.item, at: [44, 26, 0] }, { text: '창고 앞에 두기', done: S => S._used === 1, at: [33, 4, 0] }] }];
          ST.zones[0][7] = ['crew', 'courier'];
          ST._base.guards.push({ kind: 't', target: true, sched: [{ at: [30, 21], stay: 2, name: '광장', act: '담배' }, { at: [40, 21], stay: 2, name: '편의점 앞', act: '통화' }], schedKey: 'tn' }); }''')
        await fresh([2])
        await pg.evaluate('() => { const P = window.__game.S.player; P.x = 44 * 48 + 10; P.y = 26 * 48 + 24; }'); await pg.wait_for_timeout(500)
        lab = await pg.evaluate('() => window.__game.secondaryAction ? 1 : 0'); await pg.evaluate('() => window.__game.actCarry()'); await pg.wait_for_timeout(500)
        r = await pg.evaluate('() => { const S = window.__game.S; return [S.player.item && S.player.item.id, window.__game.storyLines().map(l => l[1]).join(" / ")]; }'); print('물건·기회', r)
        if r[0] != 'box' or '택배 왔습니다' not in r[1] or '창고 앞에 두기' not in r[1]: bad.append('물건 줍기·기회 진행이 안 된다 %s' % r)
        # 택배 상자를 들면 뒷마당(택배 허가)에서 경고 없음
        await pg.evaluate(PIN, [2, 30, 3, 0]); await pg.evaluate('() => { const P = window.__game.S.player; P.x = 33 * 48 + 24; P.y = 3 * 48 + 24; }')
        await pg.wait_for_timeout(2500); r = await pg.evaluate('() => [window.__game.S.guards[2].state, Math.round(window.__game.S.guards[2].meter * 100) / 100]'); print('상자 허가', r)
        if r[0] in ('WARN', 'ALERT') or r[1] > 0.5: bad.append('택배 상자를 들었는데 뒷마당에서 경고받는다 %s' % r)
        await pg.evaluate('() => { const P = window.__game.S.player; P.x = 33 * 48 + 24; P.y = 4 * 48 + 24; window.__game.S.guards[2].x = -9999; }'); await pg.wait_for_timeout(200)
        await pg.evaluate('() => window.__game.actCarry()'); await pg.wait_for_timeout(700)
        r = await pg.evaluate('() => { const S = window.__game.S; return [S._used, !!S.player.item, S.stories[0].done]; }'); print('쓰기·기회 완료', r)
        if r != [1, False, True]: bad.append('물건 쓰기 또는 기회 완료가 안 된다 %s' % r)
        # 일과표: 정보 카드 문구, 알아내기 전엔 다음 행선지 숨김
        await pg.wait_for_timeout(2600)
        r = await pg.evaluate('() => { const G = window.__game, t = G.S.guards.find(g => g.target); const a = G.schedText(t); G.S.player.keys.tn = true; return [a, G.schedText(t)]; }'); print('일과표', r)
        if not r[0] or '다음' in r[0] or not any(n in r[0] for n in ('광장', '편의점 앞')): bad.append('일과표 문구가 이상하다 %s' % r)
        await pg.evaluate('() => { const ST = window.__game.STAGE, k = ST._bak; ST.props = k[0]; ST.uses = k[1]; ST.stories = k[2]; ST.zones[0][7] = k[3]; ST._base.guards.length = k[4]; delete ST._bak; }')
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
