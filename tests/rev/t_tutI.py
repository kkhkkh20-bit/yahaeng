# 연습 1 · 신분: 단계를 차례로 밟아 끝까지 (거리 지나가기 → 경고 → 엿듣기 → 기절 → 옷 → 숨기기 → 초록 구역 → 출구)
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
H = """window.T = { G: () => window.__game, S: () => window.__game.S, npc(t) { return this.S().guards.find(g => g.tag === t); },
  async walk(x, y, ms = 300) { const G = this.G(), P = G.S.player; G.setLayer(0); const path = G.astar(Math.floor(P.x / 48), Math.floor(P.y / 48), x, y);
    for (const p of path) { if (G.S.over) return 'over'; P.a = Math.atan2(p.y - P.y, p.x - P.x); P.x = p.x; P.y = p.y; P.moving = true; P.mode = 'walk'; await new Promise(r => setTimeout(r, ms)); } P.moving = false; return path.length; } };"""
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1800)
        i = await pg.evaluate("() => window.__game.STAGES.findIndex(s => s.id === 'tI')")
        await pg.evaluate(f'() => window.__game.start({i})'); await pg.wait_for_timeout(400); await pg.evaluate(SK); await pg.evaluate(H)
        st = lambda: pg.evaluate('() => [T.S().tutI || 0, T.S().alevel, T.S().over, T.S().stats.detected]')
        await pg.evaluate('T.walk(6, 10)'); print('0 걷기', await st())
        await pg.evaluate('T.walk(11, 10)'); r = await st(); print('1 지나가기', r)
        if r[0] < 2 or r[3]: bad.append('거리 자경대원 옆을 지나가는 단계 실패 %s' % r)
        await pg.evaluate('T.walk(14, 7)')
        w = None
        for t in range(24):
            await pg.wait_for_timeout(250); w = await pg.evaluate("() => T.npc('yard').state")
            if w == 'WARN': break
        await pg.evaluate('T.walk(14, 10, 150)'); await pg.wait_for_timeout(800); r = await st(); print('2 경고', w, r)
        if w != 'WARN' or r[0] < 3: bad.append('출입 금지 경고 단계 실패 %s %s' % (w, r))
        await pg.evaluate('T.walk(20, 9)')
        for t in range(70):
            await pg.wait_for_timeout(300); r = await st()
            if r[0] >= 4: break
        print('3 엿듣기', r, await pg.evaluate('() => [JSON.stringify(T.S().intel), T.S().learned, Math.round(T.S().player.x/48), Math.round(T.S().player.y/48), T.S().guards[2].state, T.G().DLG.modal, Math.round(T.S().t), document.getElementById("pause").hidden, T.S().over]'))
        for k in range(3):
            await pg.wait_for_timeout(700); print('  t', await pg.evaluate('() => [T.S().t.toFixed(2), T.G().S.hitStop, !!T.G().input.aiming, T.S().intel[0].lt.toFixed(2)]'))
        if r[0] < 4: bad.append('엿듣기 단계 실패 %s' % r)
        await pg.evaluate('T.walk(24, 13)'); await pg.evaluate("() => { const g = T.npc('lone'), P = T.S().player; P.x = g.x - 34; P.y = g.y; P.a = 0; }")
        await pg.evaluate('() => T.G().actPrimary()'); await pg.wait_for_timeout(1000); r = await st(); print('4 기절', r)
        await pg.evaluate("() => { const c = T.S().corpses.find(c => c.tag === 'lone'); T.S().player.x = c.x - 18; T.S().player.y = c.y; }"); await pg.wait_for_timeout(150)
        # 제압 동작이 끝난 뒤 실제 [행동] 버튼의 선택을 실행한다. 옛 보조 API는 동작 중 입력을 무시한다.
        await pg.wait_for_function('!T.G().actionBusy()')
        selected = await pg.evaluate("()=>{const G=T.G();for(let i=0;i<8&&G.envAction().k!=='dress';i++)G.cycleEnv();return G.envAction().k}")
        assert selected == 'dress', '대상 전환으로 옷 갈아입기를 선택할 수 없다'
        await pg.evaluate('() => T.G().actEnv()'); await pg.wait_for_function("T.S().player.outfit==='crew'&&!T.G().actionBusy()")
        r = await st(); print('5 옷', r, await pg.evaluate('() => T.S().player.outfit'))
        await pg.evaluate('() => T.G().actEnv()'); await pg.wait_for_function('!!T.S().player.carrying&&!T.G().actionBusy()'); await pg.evaluate('T.walk(25, 14)')
        await pg.evaluate('() => T.G().actEnv()'); await pg.wait_for_function('T.S().corpses.some(c=>c.stashed)'); await pg.wait_for_timeout(200); r = await st(); print('6 숨기기', r)
        if r[0] < 7: bad.append('기절·옷·숨기기 단계 실패 %s' % r)
        await pg.evaluate('T.walk(30, 9)'); await pg.evaluate('T.walk(36, 6)'); await pg.evaluate('T.walk(36, 4)'); r = await st(); print('7 초록 구역', r, await pg.evaluate("() => [T.npc('chief').state, T.S().player.disguiseBlown, T.npc('yard').state]"))
        if r[0] < 8 or r[1] >= 2: bad.append('자경대원 옷으로 마당 안쪽까지 못 간다 %s' % r)
        await pg.evaluate('T.walk(37, 7)'); await pg.evaluate('T.walk(43, 10)'); await pg.wait_for_timeout(1500)
        r = await pg.evaluate('() => [T.S().over, document.getElementById("end").dataset.win, document.getElementById("endSub").textContent.slice(0, 20)]'); print('끝', r)
        if not r[0] or r[1] != '1': bad.append('출구로 연습이 끝나지 않는다 %s' % r)
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
