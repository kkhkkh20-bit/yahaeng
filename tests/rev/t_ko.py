# 제압·변장 회귀: 조직원은 [행동] = 암살(감점 없음) · 붙잡은 뒤 [특수] = 기절 · 주민은 기절이 기본, 길게 누르면 처치(감점) · 시체 옷 입기 · 허가 옷이면 금지 구역 통과 · 눈썰미 · 기절자 발견 시 깨어남 · 그림자 5조건
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''(keep) => { const S = window.__game.S; S.guards.forEach((g, i) => { if (!keep.includes(i)) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; } }); }'''
PIN = '''([i, x, y, a]) => { const q = window.__game.S.guards[i]; q.x = x * 48 + 24; q.y = y * 48 + 24; q.a = a; q.want = a; q.route = [{ x: q.x, y: q.y, pause: 999 }]; q.path = null; q.wait = 99; q.post = a * 180 / Math.PI; q.state = 'PATROL'; q.meter = 0; }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        async def fresh(keep):
            await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(250); await pg.evaluate(SK); await pg.evaluate(FREEZE, keep)
        async def behind(i):  # i번 경비 바로 뒤(서쪽)에 선다
            await pg.evaluate(f'() => {{ const S = window.__game.S, P = S.player, q = S.guards[{i}]; P.x = q.x - 34; P.y = q.y; P.a = 0; P.z = 0; P.fl = 0; }}')
        # 1 조직원도 톡 누르면 기절이 먼저 (계속 누르면 처치)
        await fresh([2]); await pg.evaluate(PIN, [2, 33, 3, 0]); await behind(2)
        lab = await pg.evaluate('() => window.__game.primaryAction().label'); print('행동 이름', lab)
        if '기절' not in lab: bad.append('조직원 행동 이름이 기절이 아니다(기절 우선): ' + lab)
        await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_timeout(1300)
        r = await pg.evaluate('() => { const S = window.__game.S, c = S.corpses[S.corpses.length - 1]; return [S.guards[2].state, !!(c && c.ko), S.stats.kills, S.stats.extraKills, S.stats.crewKills, c && c.outfit]; }'); print('암살', r)
        if r[:3] != ['DEAD', True, 0] or r[5] != 'crew': bad.append('조직원 톡 = 기절 결과가 다르다 %s' % r)
        # 2 시체 옷 갈아입기 → 자경대원 옷
        await pg.evaluate('() => { const S = window.__game.S, c = S.corpses[S.corpses.length - 1]; S.player.x = c.x - 20; S.player.y = c.y; }')
        await pg.wait_for_timeout(100); await pg.wait_for_function('!window.__game.actionBusy()'); await pg.evaluate('() => window.__game.actCarry()'); await pg.wait_for_function('!window.__game.S.player.interact')
        r = await pg.evaluate('() => [window.__game.S.player.outfit, window.__game.S.player.disguiseBlown, window.__game.S.player.carrying ? 1 : 0]'); print('옷', r)
        if r[0] != 'crew' or r[1]: bad.append('기절자 옷을 못 입는다 %s' % r)
        # 3 허가 옷: 상회 사무실(출입 금지)에서 자경대원 눈앞에 서도 경고·발각 없음
        await pg.evaluate(PIN, [1, 29, 9, 0]); await pg.evaluate('() => { const S = window.__game.S, P = S.player; P.x = 32 * 48 + 24; P.y = 9 * 48 + 24; P.z = 0; P.fl = 0; P.carrying = null; }')
        await pg.wait_for_timeout(2500); r = await pg.evaluate('() => [window.__game.S.guards[1].state, Math.round(window.__game.S.guards[1].meter * 100) / 100]'); print('허가 옷', r)
        if r[0] in ('WARN', 'ALERT') or r[1] > 0.5: bad.append('허가 옷인데 경고·발각된다 %s' % r)
        # 4 눈썰미: 같은 옷 반장이 가까이서 보면 알아챈다
        await pg.evaluate('() => { const S = window.__game.S, q = S.guards[1]; q.enforcer = true; S.player.x = q.x + 70; S.player.y = q.y; }')
        st = None
        for t in range(20):
            await pg.wait_for_timeout(250); st = await pg.evaluate('() => [window.__game.S.guards[1].state, window.__game.S.player.disguiseBlown]')
            if st[1]: break
        print('눈썰미', st)
        if not st[1] or st[0] != 'ALERT': bad.append('눈썰미가 변장을 못 알아챈다 %s' % st)
        # 5 주민: 기절이 기본, 누르고 있으면 처치 (주민 살상 — 감점)
        await fresh([3]); await pg.evaluate(PIN, [3, 30, 27, 0]); await behind(3)
        lab = await pg.evaluate('() => window.__game.primaryAction().label'); print('주민 행동 이름', lab)
        if '기절' not in lab: bad.append('주민 행동 이름이 기절이 아니다: ' + lab)
        await pg.evaluate('() => { window.__game.S.keys.Space = true; window.__game.actPrimary(); }'); await pg.wait_for_timeout(1500); await pg.evaluate('() => { window.__game.S.keys.Space = false; }')
        r = await pg.evaluate('() => { const S = window.__game.S, c = S.corpses[S.corpses.length - 1]; return [S.stats.kills, S.stats.extraKills, S.stats.ko, !!(c && c.ko)]; }'); print('주민 길게 누름', r)
        if r != [1, 1, 0, False]: bad.append('주민을 길게 눌러 처치하면 감점이 아니다 %s' % r)
        # 5-b 조직원 붙잡은 뒤 [특수] = 기절
        await fresh([2]); await pg.evaluate(PIN, [2, 33, 3, 0]); await behind(2)
        await pg.evaluate('() => window.__game.actCarry()'); await pg.wait_for_timeout(700)
        lab = await pg.evaluate('() => [!!window.__game.S.player.captive, window.__game.secondaryAction().label]')
        await pg.evaluate('() => window.__game.actCarry()'); await pg.wait_for_timeout(1500)
        r = await pg.evaluate('() => { const S = window.__game.S, c = S.corpses[S.corpses.length - 1]; return [S.guards[2].state, !!(c && c.ko), S.stats.kills, S.stats.ko]; }'); print('붙잡아 기절', lab, r)
        if not lab[0] or '기절' not in lab[1] or r != ['DEAD', True, 0, 1]: bad.append('붙잡은 조직원을 [특수]로 기절시킬 수 없다 %s %s' % (lab, r))
        # 6 기절자 발견 → 깨어나 수색
        await fresh([1, 2]); await pg.evaluate(PIN, [2, 33, 3, 0]); await behind(2); await pg.evaluate('() => window.__game.actCarry()'); await pg.wait_for_timeout(700); await pg.evaluate('() => window.__game.actCarry()'); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => { const P = window.__game.S.player; P.x = 60 * 48; P.y = 27 * 48; }')
        await pg.evaluate(PIN, [1, 34, 3, 3.14159])
        r = None
        for t in range(40):
            await pg.wait_for_timeout(250); r = await pg.evaluate('() => { const S = window.__game.S; return [S.guards[1].state, S.guards[2].state, S.corpses.length, S.stats.bodies]; }')
            if r[1] != 'DEAD': break
        print('깨움', r)
        if r[1] == 'DEAD' or r[2] != 0: bad.append('기절자가 발견돼도 깨어나지 않는다 %s' % r)
        # 7 그림자 5조건
        await fresh([]); n = await pg.evaluate('() => { const G = window.__game; G.S.items.forEach(i => i.got = true); G.showEnd(true); return [G.S.bonus.length, document.getElementById("endRank").textContent]; }'); print('평가', n)
        if n[0] != 5 or '그림자' not in n[1]: bad.append('그림자 조건이 5개가 아니거나 등급이 다르다 %s' % n)
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
