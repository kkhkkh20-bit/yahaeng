# 휴대폰 화면 회귀:
#  1 대화창은 화면 아래에, 얼굴 칸은 대화 상자와 위아래가 맞는다
#  2 대화 중엔 조작 버튼이 감춰지고, 화면 아무 데나 눌러도 다음 대사로 넘어간다
#  3 처음 켜면 [항상 걷기]가 꺼져 있다 (이동은 자유 — 걷기 고정은 스스로 켠다)
#  4 계단을 내려갈 때 걸어가는 쪽을 본다 (뒷걸음질 없음)
import asyncio, sys, math
from playwright.async_api import async_playwright
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        walk = await pg.evaluate("() => window.__game.input.walkLock"); print('항상 걷기 처음', walk)
        if walk: bad.append(f'처음부터 항상 걷기가 켜져 있다 {walk}')
        await pg.evaluate("() => { const G = window.__game; G.start(G.STAGES.findIndex(s => s.id === 'm1')); }"); await pg.wait_for_timeout(900)
        r = await pg.evaluate('''() => { const d = document.getElementById('dlg'), f = document.getElementById('dlgFaceBox'), bx = d.querySelector('.dlg-box'), pad = document.querySelector('.pad');
          const R = e => e.getBoundingClientRect(); return { modal: d.classList.contains('modal'), dlgTop: Math.round(R(d).top), dlgBot: Math.round(R(d).bottom), faceT: Math.round(R(f).top), faceB: Math.round(R(f).bottom), boxT: Math.round(R(bx).top), boxB: Math.round(R(bx).bottom), padVis: getComputedStyle(pad).visibility, H: innerHeight, line: window.__game.DLG.cur && window.__game.DLG.cur.text }; }''')
        print('대화창', r)
        if not r['modal']: bad.append('시작 대화가 안 뜬다')
        if r['dlgTop'] < r['H'] * 0.55: bad.append(f'대화창이 화면 아래에 있지 않다 {r}')
        if abs(r['faceT'] - r['boxT']) > 2 or abs(r['faceB'] - r['boxB']) > 2: bad.append(f'얼굴 칸과 대화 상자 위아래가 어긋난다 {r}')
        if r['padVis'] != 'hidden': bad.append('대화 중에도 조작 버튼이 보인다')
        first = r['line']
        await pg.touchscreen.tap(195, 200); await pg.wait_for_timeout(250)   # 화면 위쪽 아무 데나 (대화창 밖)
        await pg.touchscreen.tap(195, 200); await pg.wait_for_timeout(250)
        nxt = await pg.evaluate('() => window.__game.DLG.cur && window.__game.DLG.cur.text')
        print('넘김', first[:20], '→', (nxt or '(끝)')[:20])
        if nxt == first: bad.append('대화창 밖을 눌러도 다음 대사로 안 넘어간다')
        for i in range(24):  # 대사 한 줄에 두 번(다 보이기 → 다음)
            if not await pg.evaluate('() => window.__game.DLG.modal'): break
            await pg.touchscreen.tap(195, 300); await pg.wait_for_timeout(200)
        vis = await pg.evaluate("() => getComputedStyle(document.querySelector('.pad')).visibility"); print('대화 끝 버튼', vis)
        if vis == 'hidden': bad.append('대화가 끝났는데 조작 버튼이 안 돌아온다')
        # 4 계단 내려가기: 이동 중 바라보는 방향이 움직이는 방향과 맞는가
        await pg.evaluate("() => { const G = window.__game; G.start(G.STAGES.findIndex(s => s.id === 'm2')); }"); await pg.wait_for_timeout(500)
        await pg.evaluate('() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }')
        await pg.evaluate('''() => { const G = window.__game, S = G.S; S.guards.forEach(g => { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.path = null; g.wander = null; g.sched = null; });
          const l = G.LADDERS.find(l => l.kind === 'fstair' && G.stairHole(l)); window.__L = l; const P = S.player; P.fl = l.bfl; G.setLayer(l.bfl); P.x = l.x; P.y = l.y; P.z = 0; }''')
        await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_function('!window.__game.S.player.trav')
        await pg.evaluate('() => { const G = window.__game, l = window.__L, P = G.S.player, g = G.stairFloor(l.tx,l.ty,l.tfl), dp = G.downPt(l); P.x = dp.x + g.d[0]*8; P.y = dp.y + g.d[1]*8; P.a = Math.atan2(g.d[1],g.d[0]); }')   # 내려가는 쪽과 반대로 서 있게
        a = await pg.evaluate('() => { const a = window.__game.primaryAction(); return a.k; }')
        await pg.evaluate('() => window.__game.actPrimary()')
        worst = 0; prev = None
        for i in range(16):
            await pg.wait_for_timeout(40)
            s = await pg.evaluate('() => { const P = window.__game.S.player; return [P.x, P.y, P.a, !!P.trav]; }')
            if prev and s[3] and math.hypot(s[0] - prev[0], s[1] - prev[1]) > 3:
                mv = math.atan2(s[1] - prev[1], s[0] - prev[0]); d = abs((s[2] - mv + math.pi * 3) % (math.pi * 2) - math.pi)
                if i > 3: worst = max(worst, d)
            prev = s
        print('계단 내려가기', a, '움직임과 시선 최대 어긋남(도)', round(math.degrees(worst)))
        if a != 'fdown': bad.append(f'계단 내려가는 자리에서 내리기가 아니다 {a}')
        if worst > math.radians(120): bad.append(f'계단을 내려갈 때 뒷걸음질한다 ({round(math.degrees(worst))}도)')  # 꺾이는 모서리에서 잠깐 90도는 괜찮다 — 뒤를 보고 미끄러지면(180도) 실패
        print('errs', errs[:3]); await b.close()
    for x in bad: print(' -', x)
    print('문제', len(bad)); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
