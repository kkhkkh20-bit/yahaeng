# 층 회귀:
#  1 계단 칸으로 걸어 들어가면 버튼 없이 오른다 · 위층 계단 구멍 끝에서 구멍 쪽으로 걸으면 내려온다
#  2 위층에서 뛰거나 처치해도 아래층 경비는 모른다 (소리·수색이 층을 넘지 않는다)
#  3 화단은 웅크려야 숨는다
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''(keep) => { const S = window.__game.S; S.guards.forEach((g, i) => { if (!keep.includes(i)) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; g.sched = null; g.path = null; } }); }'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        ev = pg.evaluate
        si = await ev("() => window.__game.STAGES.findIndex(s => s.id === 'm2')")
        async def fresh(keep):
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300); await ev(SK); await ev(FREEZE, keep)
        async def hold(keys, ms):
            await ev('(k) => { const K = window.__game.S.keys; k.forEach(x => K[x] = true); }', keys); await pg.wait_for_timeout(ms)
            await ev('(k) => { const K = window.__game.S.keys; k.forEach(x => K[x] = false); }', keys)
        KEY = {(0, 1): 'ArrowDown', (0, -1): 'ArrowUp', (1, 0): 'ArrowRight', (-1, 0): 'ArrowLeft'}
        # 1 자동 계단: 사무동(건물 0) 1층 계단
        await fresh([])
        info = await ev('''() => { const G = window.__game, S = G.S, l = G.LADDERS.find(l => l.kind === 'fstair' && (l.bfl || 0) === 0 && G.stairHole(l)); G.setLayer(0); const d = G.stairDir(l.tx, l.ty);
          const P = S.player; P.fl = 0; P.z = 0; P.x = (l.tx + d[0]) * 48 + 24; P.y = (l.ty + d[1]) * 48 + 24; return { tx: l.tx, ty: l.ty, d, tfl: l.tfl }; }''')
        k = KEY[tuple(-v for v in info['d'])]
        await hold([k], 700); await pg.wait_for_function('!window.__game.S.player.trav')
        r = await ev('() => { const P = window.__game.S.player; return [P.fl || 0, !!P.trav]; }'); print('자동 오르기', info, r)
        if r[0] != info['tfl'] or r[1]: bad.append(f'계단 칸으로 걸어 들어가도 오르지 않는다 {info} {r}')
        else:
            ho = await ev('''(i) => { const G = window.__game, l = G.LADDERS.find(l => l.kind === 'fstair' && l.tx === i.tx && l.ty === i.ty && (l.bfl || 0) === 0), h = G.stairHole(l), P = G.S.player; G.setLayer(l.tfl);
              P.x = h.c2.x + h.d[0] * 48; P.y = h.c2.y + h.d[1] * 48; return h.d; }''', info)  # 구멍 끝(c2) 바로 앞 칸
            await pg.wait_for_timeout(1000)
            k2 = KEY[tuple(-v for v in ho)]
            await hold([k2], 500); await pg.wait_for_function('!window.__game.S.player.trav')
            r = await ev('() => { const P = window.__game.S.player; return [P.fl || 0, !!P.trav]; }'); print('자동 내리기', ho, r)
            if r[0] != 0 or r[1]: bad.append(f'계단 구멍 쪽으로 걸어도 내려오지 않는다 {r}')
        # 2 층 분리: 사무동 2층에서 뛰어다니고 처치해도 1층 금고 앞 경비(6)는 모른다
        await fresh([6, 7])
        await ev("() => { const G = window.__game, S = G.S, g = S.guards[6], P = S.player; P.fl = 1; G.setLayer(1); P.z = 0; P.x = g.x; P.y = g.y; const o = S.guards[7]; o.x = g.x + 900; o.y = g.y; o.route = [{ x: o.x, y: o.y, pause: 999 }]; o.wait = 99; }  // 뛰는 동안 위층 경비(7)가 먼저 보지 않게 멀리 둔다")
        await ev("() => { window.__game.S.keys.ShiftLeft = true; }")
        for kk in ['ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight']: await hold([kk], 350)
        await ev("() => { window.__game.S.keys.ShiftLeft = false; }")
        await ev("() => { const G = window.__game, S = G.S, P = S.player, o = S.guards[7], g6 = S.guards[6]; o.x = g6.x + 90; o.y = g6.y; o.a = 0; o.want = 0; o.route = [{ x: o.x, y: o.y, pause: 999 }]; o.wait = 99; P.x = o.x - 40; P.y = o.y; P.a = 0; P.mode = 'sneak'; }")
        await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(1500)
        r = await ev("() => { const S = window.__game.S, g = S.guards[6]; return [g.state, +g.meter.toFixed(2), S.guards[7].state, (g.fl || 0)]; }"); print('층 분리', r)
        if r[0] not in ('PATROL', 'RETURN') or r[1] > 0.2: bad.append(f'위층 소리·처치에 아래층 경비가 반응한다 {r}')
        # 3 화단: 서 있으면 안 숨고, 웅크리면 숨는다
        await fresh([])
        await ev("() => { const G = window.__game, S = G.S, P = S.player; let b = null; for (let y = 0; y < 36 && !b; y++) for (let x = 0; x < 56 && !b; x++) if (G.tileG(x, y) === 'B') b = [x, y]; P.fl = 0; G.setLayer(0); P.z = 0; P.x = b[0] * 48 + 24; P.y = b[1] * 48 + 24; window.__B = b; }")
        await ev("() => { window.__game.input.sneakToggle = false; }"); await hold(['ArrowRight'], 60); await ev('() => { const P = window.__game.S.player, b = window.__B; P.x = b[0] * 48 + 24; P.y = b[1] * 48 + 24; }'); await pg.wait_for_timeout(200)
        st = await ev('() => window.__game.S.player.hidden')
        await ev("() => { window.__game.input.sneakToggle = true; }"); await pg.wait_for_timeout(300)
        cr = await ev('() => [window.__game.S.player.hidden, window.__game.S.player.mode]')
        print('화단 서기·웅크림', st, cr)
        if st: bad.append('화단에 서 있기만 해도 숨는다')
        if not cr[0]: bad.append(f'화단에서 웅크려도 숨지 않는다 {cr}')
        print('errs', errs[:3]); await b.close()
    for x in bad: print(' -', x)
    print('문제', len(bad)); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
