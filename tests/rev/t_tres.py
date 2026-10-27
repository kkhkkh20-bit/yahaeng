# 주민 신고 종류 회귀: 출입 금지에 들어간 것만 본 직원은 먼저 말로 경고 → 계속 머물면 '알리러' 감(무단 침입: 경보·목격자 없음) · 처치를 보면 범죄 신고
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
SETUP = '''() => { const S = window.__game.S, k = S.guards.find(g => g.tag === 'clerk'), q = S.guards[2];
  const pin = (g, x, y, a) => { g.x = x * 48 + 24; g.y = y * 48 + 24; g.a = a; g.want = a; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wander = null; g.sched = null; g.path = null; g.wait = 99; g.state = 'PATROL'; g.meter = 0; };
  S.guards.forEach(g => { if (g !== k && g !== q && !g.civ) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; } });
  pin(k, 28, 4, 0); pin(q, 28, 21, 0);  // 뒷마당 뒷문 등 아래(밝다)
  S.player.x = 31 * 48 + 24; S.player.y = 4 * 48 + 24; S.player.a = 0; }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1800)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SK); await pg.evaluate(SETUP)
        seen = []
        for t in range(48):
            await pg.wait_for_timeout(250)
            r = await pg.evaluate("() => { const S = window.__game.S, k = S.guards.find(g => g.tag === 'clerk'); return [k.state, k.say, k.rep && k.rep.kind, S.stats.witness || 0, S.alevel, Math.round(k.meter * 100) / 100]; }")
            if r[1] and r[1] not in seen: seen.append(r[1])
            if r[2] == 'trespass' or r[0] == 'RETURN': break
        print('무단 침입', r, seen)
        if not any('출입 금지' in s or '들어오시면' in s or '직원만' in s for s in seen): bad.append('먼저 말로 경고하지 않는다 %s' % seen)
        if any('해쳤' in s for s in seen): bad.append('무단 침입을 범죄로 말한다 %s' % seen)
        if r[2] != 'trespass' and r[0] != 'RETURN': bad.append('계속 머물러도 알리러 가지 않는다 %s' % r)
        for t in range(30):
            await pg.wait_for_timeout(300); r = await pg.evaluate("() => { const S = window.__game.S, k = S.guards.find(g => g.tag === 'clerk'); return [k.state, S.stats.witness || 0, S.alevel, S.guards[2].state, !!S.chaseSeen]; }")
            if r[0] != 'REPORT': break
        print('알린 뒤', r)
        if r[1] or r[2] >= 2 or r[4]: bad.append('무단 침입 알림이 경보·목격자·얼굴 기억으로 이어진다 %s' % r)
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
