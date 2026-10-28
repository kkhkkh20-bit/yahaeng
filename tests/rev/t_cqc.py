# 메탈기어식 손맛 회귀:
#  1 붙잡은 조직원 [붙잡기](C·Q) 한 번 더 = 심문 (가만히 있어도 저절로) → 아직 모르는 정보를 분다(의뢰 2: 간판 → 비번 순) · 기회가 열린다 · 같은 사람은 두 번 안 분다
#  2 정보를 다 알면 근처 조직원 위치를 분다(표시)
#  3 붙잡은 채 [특수] = 기절, [행동] = 처치
#  4 조직원 무전 점검: 쓰러진 조직원은 대답 못 함 → 가까운 조직원이 그 자리로 · 경계 1
#  5 사장님 무전: 첫 처치에 한마디 · 끝 화면 칭호
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''(keep) => { const S = window.__game.S; S.guards.forEach((g, i) => { if (!keep.includes(i)) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; g.sched = null; g.path = null; } }); }'''
PIN = '''([i, x, y, a]) => { const q = window.__game.S.guards[i]; q.x = x * 48 + 24; q.y = y * 48 + 24; q.a = a; q.want = a; q.route = [{ x: q.x, y: q.y, pause: 999 }]; q.path = null; q.wait = 99; q.post = a * 180 / Math.PI; q.state = 'PATROL'; q.meter = 0; }'''
BEHIND = '''(i) => { const S = window.__game.S, P = S.player, q = S.guards[i]; P.x = q.x - Math.cos(q.a) * 40; P.y = q.y - Math.sin(q.a) * 40; P.a = q.a; P.z = 0; P.fl = q.fl || 0; window.__game.setLayer(P.fl); P.mode = 'sneak'; }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        ev = pg.evaluate
        si = await ev("() => window.__game.STAGES.findIndex(s => s.id === 'm2')")
        async def fresh(keep):
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300); await ev(SK); await ev(FREEZE, keep)
        async def grab(i, x, y):
            await ev(PIN, [i, x, y, 0]); await ev(BEHIND, i); await pg.wait_for_timeout(60)
            await ev('() => window.__game.actCarry()'); await pg.wait_for_timeout(700)
            return await ev('() => !!window.__game.S.player.captive')
        # 1 심문
        await fresh([4, 26]); ok = await grab(4, 27, 2)
        await pg.wait_for_timeout(200); lab = await ev("() => [document.getElementById('btnGrab').textContent, document.getElementById('kmQ') && document.getElementById('kmQ').textContent]")
        await ev("() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', key: 'c' }))"); await pg.wait_for_timeout(1800)
        r = await ev("() => { const S = window.__game.S; return [S.learned.slice(), !!S.player.keys.sign, (S.stories || []).filter(s => s.found).map(s => s.d.id), !!S.player.captive]; }")
        print('심문 1', ok, lab, r)
        if not ok: bad.append('조직원을 붙잡지 못했다')
        if '심문' not in ''.join(x or '' for x in lab): bad.append(f'붙잡은 동안 붙잡기 버튼·키 안내가 심문이 아니다 {lab}')
        if not r[1] or 'sign' not in r[2]: bad.append(f'심문해도 간판 정보·기회가 안 생긴다 {r}')
        await ev("() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', key: 'c' }))"); await pg.wait_for_timeout(300)
        n = await ev("() => window.__game.S.learned.length")
        if n != 1: bad.append(f'같은 사람을 두 번 심문해 정보가 또 나온다 {n}')
        # 3 붙잡은 채 [특수] = 기절
        lab = await ev("() => window.__game.secondaryAction().label"); await ev('() => window.__game.actCarry()'); await pg.wait_for_timeout(1500)
        r = await ev("() => { const S = window.__game.S, c = S.corpses[S.corpses.length - 1]; return [S.guards[4].state, !!(c && c.ko), S.stats.kills]; }"); print('붙잡아 기절', lab, r)
        if '기절' not in lab or r != ['DEAD', True, 0]: bad.append(f'붙잡은 채 [특수]가 기절이 아니다 {lab} {r}')
        # 1-b 두 번째 사람은 다음 정보(비번)
        ok = await grab(26, 33, 2)
        await ev("() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', key: 'c' }))"); await pg.wait_for_timeout(1800)
        r = await ev("() => { const S = window.__game.S; return [!!S.player.keys.code, S.learned.length]; }"); print('심문 2', ok, r)
        if not r[0]: bad.append(f'두 번째 심문에서 비번이 안 나온다 {r}')
        # 3-b 붙잡은 채 [행동] = 처치
        await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(1500)
        r = await ev("() => { const S = window.__game.S; return [S.guards[26].state, S.stats.kills, S.stats.crewKills, S.toasts.map(t => t.text).join('|')]; }"); print('붙잡아 처치', r[:3])
        if r[0] != 'DEAD' or r[1] != 1: bad.append(f'붙잡은 채 [행동]이 처치가 아니다 {r[:3]}')
        if '까마귀:' not in r[3] and not await ev("() => (window.__game.S.radioN || 0) > 0"): bad.append('첫 처치에 사장님 무전이 없다')
        # 2 다 알고 나면 위치를 분다
        await fresh([3, 4, 26]); await ev("() => { const S = window.__game.S; ['sign', 'code', 'emetic'].forEach(k => S.player.keys[k] = true); S.learned.push('실장은 가끔 클럽 앞 간판 밑에 나와 담배를 피운다', '사무동 금고 비번 0417', '실장은 배가 약하다 — 술에 배탈약만 들어가도 골목 공중화장실로 뛰어간다'); }")
        await ev(PIN, [26, 33, 2, 0]); ok = await grab(4, 28, 2)
        await ev("() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', key: 'c' }))"); await pg.wait_for_timeout(1800)
        r = await ev("() => window.__game.S.guards.filter(g => g.tagT > window.__game.S.t).map(g => g.id)"); print('위치 실토', ok, r)
        if not r: bad.append('정보를 다 알 때 심문하면 근처 조직원 위치가 표시되지 않는다')
        # 4 조직원 무전 점검
        await fresh([3, 4]); await ev(PIN, [3, 30, 16, 0]); await ev(PIN, [4, 27, 2, 0]); await ev(BEHIND, 4); await pg.wait_for_timeout(60)
        await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(1400)
        await ev("() => { const S = window.__game.S; S.player.x = 2 * 48; S.player.y = 33 * 48; S.rcT = 0.2; }"); await pg.wait_for_timeout(800)
        r = await ev("() => { const S = window.__game.S, g = S.guards[3]; return [S.guards[4].state, S.alevel, g.state, g.why, Math.round(g.poi ? g.poi.x / 48 : -1), Math.round(g.poi ? g.poi.y / 48 : -1)]; }")
        print('무전 점검', r)
        if r[1] < 1 or r[2] not in ('SUSPICIOUS', 'SEARCH') or r[3] != 'radio': bad.append(f'쓰러진 조직원 자리로 확인하러 가지 않는다 {r}')
        # 5 칭호
        t = await ev("() => { const G = window.__game; G.S.items.forEach(i => i.got = true); G.showEnd(true); return document.getElementById('endStats').textContent; }")
        print('끝 화면', t[:80])
        if '칭호' not in t: bad.append('끝 화면에 칭호가 없다')
        print('errs', errs[:3]); await b.close()
    for x in bad: print(' -', x)
    print('문제', len(bad)); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
