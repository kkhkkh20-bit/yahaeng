# 벽에 붙기 회귀: 기대기 버튼이 없다 · 웅크려 벽에 닿으면 바로 붙는다(붙는 동작 거침) · 붙어서 옆걸음하면 발소리 없음 · 붙으면 보이는 거리가 줄고 원뿔에도 반영 · 벽 반대로 밀면 떨어진다
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''() => { const S = window.__game.S; S.guards.forEach(g => { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; g.sched = null; }); }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SK); await pg.evaluate(FREEZE)
        # 건물 남쪽 벽 아래 한 칸 떨어진 곳 (창문 아래 칸 옆)
        r = await pg.evaluate('''() => { const G = window.__game, S = G.S, P = S.player; const w = S.windows.find(w => w.b >= 0 && G.bldAt(w.tx, w.ty + 1) < 0 && !(w.fl || 0));
            const B = G.BLD[w.b]; P.x = w.tx * 48 + 24 - 30; P.y = (B.y1 + 1) * 48 + 40; P.a = -Math.PI / 2; P.z = 0; P.fl = 0; P.cover = null; window.__wy = (B.y1 + 1) * 48; return [w.tx, B.y1]; }''')
        await pg.wait_for_timeout(100)
        lab = await pg.evaluate('() => window.__game.secondaryAction().label'); print('특수 버튼', lab)
        if '기대' in lab: bad.append('아직 기대기 버튼이 있다: ' + lab)
        # 웅크려 벽 쪽(위)으로 걷기
        await pg.evaluate('() => { window.__game.input.sneakToggle = true; window.__game.S.keys.ArrowUp = true; }')
        snapSeen, t_cover = False, None
        for i in range(120):  # 벽 쪽으로 0.5초 밀어야 붙는다
            await pg.wait_for_timeout(20)
            s = await pg.evaluate('() => { const P = window.__game.S.player; return [!!P.snap, !!P.cover, Math.round(P.y - window.__wy)]; }')
            snapSeen = snapSeen or s[0]
            if s[1] and t_cover is None: t_cover = i
            if s[1] and not s[0]: break
        await pg.evaluate('() => { window.__game.S.keys.ArrowUp = false; }')
        print('붙기', s, '붙는 동작', snapSeen, '시점', t_cover)
        if not s[1]: bad.append('웅크려 벽에 닿아도 붙지 않는다 %s' % s)
        if not snapSeen: bad.append('붙는 동작(snap)이 없다')
        if s[2] > 16: bad.append('벽에 바짝 붙지 않는다(간격 %s)' % s[2])
        # 붙어서 옆걸음: 소리 없음, 상태 문구
        n0 = await pg.evaluate('() => { const S = window.__game.S; window.__steps = 0; const o = S.noises.push.bind(S.noises); S.noises.push = n => { if (n.src === "step") window.__steps++; return o(n); }; return 0; }')
        await pg.evaluate('() => { window.__game.S.keys.ArrowRight = true; }'); await pg.wait_for_timeout(1200); await pg.evaluate('() => { window.__game.S.keys.ArrowRight = false; }')
        r = await pg.evaluate('() => { const S = window.__game.S; return [!!S.player.cover, window.__steps, document.getElementById("modeLbl") ? document.getElementById("modeLbl").textContent : ""]; }')
        print('옆걸음', r, n0)
        if not r[0]: bad.append('옆걸음하다 벽에서 떨어진다')
        if r[1] > n0: bad.append('벽에 붙어 옆걸음하는데 발소리가 난다')
        # 보이는 거리: 붙으면 0.42배
        await pg.wait_for_timeout(300)
        v = await pg.evaluate('''() => { const G = window.__game, S = G.S, P = S.player, g = S.guards.find(g => !g.civ && !g.dog && !g.target); g.x = P.x + 150; g.y = P.y + 60; g.a = Math.atan2(P.y - g.y, P.x - g.x); g.state = 'PATROL'; g.fl = 0; g.z = 0;
            const a = G.canSee(g, P.x, P.y, 1, false, 2, 0), b = G.canSee(g, P.x, P.y, 1, false, true, 0), c = G.canSee(g, P.x, P.y, 1, false, false, 0); g.x = -9999; return [a, b > 0, c > 0]; }''')
        print('밝은 곳 150px: 붙음/웅크림/서기', v)
        if v[0] > 0 or not v[2]: bad.append('붙어도 보이는 거리가 줄지 않는다 %s' % v)
        # 벽 반대쪽(아래)으로 밀면 떨어진다
        await pg.evaluate('() => { window.__game.S.keys.ArrowDown = true; }'); await pg.wait_for_timeout(300); await pg.evaluate('() => { window.__game.S.keys.ArrowDown = false; window.__game.input.sneakToggle = false; }')
        r = await pg.evaluate('() => !!window.__game.S.player.cover'); print('떨어지기', r)
        if r: bad.append('벽 반대쪽으로 밀어도 떨어지지 않는다')
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
