# 버튼 넷 회귀: [공격] 사람에게만(톡 기절 · 계속 처치) · [행동] 시설·시체(사람이 가까워도 공격으로 안 바뀜) · [붙잡기] 잡고 가만히 = 심문 · 기본 도구 다트
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''(keep) => { const S = window.__game.S; S.guards.forEach((g, i) => { if (!keep.includes(i)) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; } }); }'''
PIN = '''([i, x, y, a]) => { const q = window.__game.S.guards[i]; q.x = x; q.y = y; q.a = a; q.want = a; q.route = [{ x: q.x, y: q.y, pause: 999 }]; q.path = null; q.wait = 99; q.post = a * 180 / Math.PI; q.state = 'PATROL'; q.meter = 0; }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        async def fresh(keep):
            await pg.evaluate("() => window.__game.start(window.__game.STAGES.findIndex(s => s.id === 'm1'))"); await pg.wait_for_timeout(250); await pg.evaluate(SK); await pg.evaluate(FREEZE, keep)
        # 문 하나를 골라 그 옆(바깥 칸)에 경비를 세우고, 주인공은 경비 등 뒤 + 문 앞
        async def setup():
            await fresh([2])
            return await pg.evaluate('''() => { const g = window.__game, S = g.S, P = S.player;
              for (const d of S.doors) { for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const tx = d.tx + dx, ty = d.ty + dy, tx2 = d.tx + dx * 2, ty2 = d.ty + dy * 2;
                if (g.solidAt(tx, ty) || g.solidAt(tx2, ty2)) continue;
                const q = S.guards[2]; q.x = tx2 * 48 + 24; q.y = ty2 * 48 + 24; q.a = Math.atan2(dy, dx); q.want = q.a; q.route = [{ x: q.x, y: q.y, pause: 999 }]; q.path = null; q.wait = 99; q.state = 'PATROL'; q.meter = 0;
                P.x = tx * 48 + 24 - dx * 6; P.y = ty * 48 + 24 - dy * 6; P.a = Math.atan2(dy, dx); P.z = 0; P.fl = 0; return [d.tx, d.ty, dx, dy]; } } return null; }''')
        d = await setup(); print('문', d)
        await pg.wait_for_timeout(100)
        r = await pg.evaluate('() => { const g = window.__game, a = g.attackAction(), e = g.envAction(), q = g.grabAction(); return [a.k, a.label, a.hold, e.k, e.label, q.k, g.input.tool]; }'); print('버튼 셋', r)
        if r[0] not in ('kill', 'kill2') or '기절' not in (r[1] or '') or r[2] != '처치': bad.append('[공격]이 기절/길게 처치가 아니다 %s' % r)
        if r[3] != 'door': bad.append('사람이 가까워도 [행동]은 문이어야 한다 %s' % r)
        if r[5] != 'grab': bad.append('[붙잡기]가 잡을 수 없다 %s' % r)
        if r[6] != 'kunai': bad.append('기본 도구가 다트가 아니다 %s' % r)
        # [행동] = 문 (사람 옆이어도 공격하지 않는다)
        st0 = await pg.evaluate('() => { const S = window.__game.S; return S.doors.map(d => d.open ? 1 : 0).join(""); }')
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(600)
        r = await pg.evaluate('(s0) => { const S = window.__game.S; return [S.doors.map(d => d.open ? 1 : 0).join("") !== s0, S.guards[2].state, S.stats.kills + (S.stats.ko || 0)]; }', st0); print('E = 문', r)
        if r[1] == 'DEAD' or r[2]: bad.append('[행동]이 사람을 공격했다 %s' % r)
        # [공격] 톡 = 기절
        d = await setup(); await pg.wait_for_timeout(100)
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(1500)
        r = await pg.evaluate('() => { const S = window.__game.S, c = S.corpses[S.corpses.length - 1]; return [S.guards[2].state, !!(c && c.ko), S.stats.kills, S.stats.ko]; }'); print('Space 톡', r)
        if r != ['DEAD', True, 0, 1]: bad.append('[공격] 톡이 기절이 아니다 %s' % r)
        # 시체 옆: [행동] = 메기
        await pg.evaluate('() => { const S = window.__game.S, c = S.corpses[S.corpses.length - 1]; S.player.x = c.x - 22; S.player.y = c.y; }'); await pg.wait_for_timeout(100)
        r = await pg.evaluate('() => { const g = window.__game; let a = g.envAction(); const ks = [a.k]; for (let i = 0; i < 3 && a.k !== "carry"; i++) { g.cycleEnv(); a = g.envAction(); ks.push(a.k); } return ks; }'); await pg.evaluate('() => window.__game.actEnv()'); await pg.wait_for_timeout(700)
        r2 = await pg.evaluate('() => !!window.__game.S.player.carrying'); print('시체 [행동]', r, r2)
        if not r2: bad.append('[행동]으로 시체를 못 멘다 %s' % r)
        # [공격] 계속 누르기 = 처치
        d = await setup(); await pg.wait_for_timeout(100)
        await pg.keyboard.down('Space'); await pg.wait_for_timeout(1900); await pg.keyboard.up('Space'); await pg.wait_for_timeout(300)
        r = await pg.evaluate('() => { const S = window.__game.S, c = S.corpses[S.corpses.length - 1]; return [S.guards[2].state, !!(c && c.ko), S.stats.kills, S.stats.ko]; }'); print('Space 길게', r)
        if r[0] != 'DEAD' or r[1] or r[2] != 1: bad.append('[공격] 길게가 처치가 아니다 %s' % r)
        # [붙잡기] → 가만히 = 심문 → [공격] 톡 = 기절
        d = await setup(); await pg.wait_for_timeout(100)
        await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(700)
        r = await pg.evaluate('() => [!!window.__game.S.player.captive, window.__game.attackAction().label, window.__game.envAction().k]'); print('붙잡음', r)
        if not r[0]: bad.append('Q로 붙잡지 못했다')
        await pg.wait_for_timeout(1800)
        q = await pg.evaluate('() => { const S = window.__game.S; return [S.guards[2].questioned, S.stats.interro || 0]; }'); print('가만히 → 심문', q)
        if not q[0]: bad.append('붙잡고 가만히 있어도 심문하지 않는다 %s' % q)
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(1500)
        r = await pg.evaluate('() => { const S = window.__game.S, c = S.corpses[S.corpses.length - 1]; return [S.guards[2].state, !!(c && c.ko), S.stats.kills, S.stats.ko]; }'); print('붙잡은 뒤 톡', r)
        if r != ['DEAD', True, 0, 1]: bad.append('붙잡은 뒤 [공격] 톡이 기절이 아니다 %s' % r)
        # 터치 버튼 그림 (모바일 보기)
        m = await b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True); m.on('pageerror', lambda e: errs.append(str(e)))
        await m.goto('file:///root/game/build/preview_city.html'); await m.wait_for_timeout(1500)
        await m.evaluate("() => window.__game.start(window.__game.STAGES.findIndex(s => s.id === 'm1'))"); await m.wait_for_timeout(300); await m.evaluate(SK); await m.wait_for_timeout(600)
        await m.screenshot(path='btn4_mob.png')
        ids = await m.evaluate("() => ['btnAct','btnCarry','btnGrab','btnTool','btnWhistle'].map(id => { const e = document.getElementById(id), r = e.getBoundingClientRect(); return [id, Math.round(r.x), Math.round(r.y), Math.round(r.width)]; })"); print('버튼 위치', ids)
        if any(w == 0 for _, _, _, w in ids): bad.append('보이지 않는 버튼 %s' % ids)
        await b.close()
    if errs: bad.append('페이지 오류 %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
