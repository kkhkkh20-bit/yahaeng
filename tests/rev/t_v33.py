import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await ev('() => T.freeze()'); await pg.wait_for_timeout(300)
        # 1) 잠긴 창문: 밖에서 락픽
        w = await ev('''() => { const S = T.S(), P = S.player; const w = S.windows.find(w => w.st === 'lock' && w.b >= 0); const G = T.G();
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) { const x = w.tx + dx, y = w.ty + dy; if (G.bldAt(x, y) < 0) { P.x = x * 48 + 24; P.y = y * 48 + 24; P.a = Math.atan2(w.y - P.y, w.x - P.x); break; } }
            return [w.tx, w.ty, T.act(), P.picks]; }''')
        print('lock win', w)
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(600); await pg.screenshot(path='pick.png')
        await pg.wait_for_timeout(1600); print(' after', await ev('() => [T.S().windows.find(w => w.tx === %d && w.ty === %d).st, T.S().player.picks, T.act()]' % (w[0], w[1])))
        # 취소: 다시 잠긴 창문에서 시작 후 움직이기
        await ev('''() => { const S = T.S(), P = S.player, G = T.G(); const w = S.windows.find(w => w.st === 'lock' && w.b >= 0);
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) { const x = w.tx + dx, y = w.ty + dy; if (G.bldAt(x, y) < 0) { P.x = x * 48 + 24; P.y = y * 48 + 24; P.a = Math.atan2(w.y - P.y, w.x - P.x); break; } } window.__w = w; }''')
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(400); await pg.keyboard.down('ArrowLeft'); await pg.wait_for_timeout(200); await pg.keyboard.up('ArrowLeft')
        print(' cancel', await ev('() => [window.__w.st, T.S().player.picks, !!T.S().player.pick]'))
        print(' state', await ev('() => { const P = T.S().player; return [!!P.trav, !!P.lunge, !!P.jump, !!P.pick, P.strikeT]; }'))
        # 안쪽에서 걸쇠
        print(' inside', await ev('''() => { T.S().guards.forEach(g => { g.x = -5000; g.y = -5000; }); const S = T.S(), P = S.player, G = T.G(), w = window.__w; for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) { const x = w.tx + dx, y = w.ty + dy; if (G.bldAt(x, y) < 0) { P.x = (w.tx - dx) * 48 + 24; P.y = (w.ty - dy) * 48 + 24; P.a = Math.atan2(w.y - P.y, w.x - P.x); break; } } return T.act(); }'''))
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(1000); print(' latched', await ev('() => [window.__w.st, T.S().player.picks]'))
        # 방범창: 넘기 없음
        print(' bar', await ev('''() => { const S = T.S(), P = S.player, G = T.G(); const w = S.windows.find(w => w.st === 'bar' && w.b >= 0) || (() => { const x = S.windows.find(w => w.st !== 'open' && w.b >= 0) || S.windows.find(w => w.b >= 0); x.st = 'bar'; return x; })();  /* 방범창은 이제 물건 있는 방에만 — 없으면 하나 만든다 */ for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) { const x = w.tx + dx, y = w.ty + dy; if (G.bldAt(x, y) < 0) { P.x = x * 48 + 24; P.y = y * 48 + 24; P.a = Math.atan2(w.y - P.y, w.x - P.x); break; } } return T.act(); }'''))
        await pg.wait_for_timeout(300); await pg.screenshot(path='bar.png')
        # 2) 문 락픽 (카드 문)
        print(' door', await ev('''() => { const S = T.S(), P = S.player; const d = S.doors.find(d => d.keyLock && d.keyLock !== 'code' && d.locked && !d.gate); if (!d) return 'none'; window.__d = d; P.fl = d.fl || 0; P.x = d.x; P.y = d.y + 40; return [d.keyLock, T.act()]; }'''))
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(4200)
        print(' door after', await ev('() => window.__d ? [window.__d.keyLock, window.__d.locked, T.S().player.picks] : 0'))
        # 3) 자동 기대기
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await ev('() => T.freeze()')
        r = await ev('''() => { const S = T.S(), P = S.player, G = T.G(); const w = S.windows.find(w => w.b >= 0 && G.bldAt(w.tx, w.ty + 1) < 0);
            const B = G.BLD[w.b]; P.x = (w.tx) * 48 + 24 - 30; P.y = (B.y1 + 1) * 48 + 15; P.a = Math.PI / 2; return [w.tx, B.y1, Math.round(P.x), Math.round(P.y)]; }''')
        print(' placed', r)
        # 벽 쪽으로 걸어가 멈추기
        await pg.wait_for_timeout(600)
        print('auto cover', await ev('() => { const P = T.S().player; return [!!P.cover, P.cover && P.cover.auto, Math.round(P.x), Math.round(P.y)]; }'))
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(400); await pg.keyboard.up('ArrowRight')
        print(' move side', await ev('() => { const P = T.S().player; return [!!P.cover, P.mode]; }'))
        await pg.wait_for_timeout(600); print(' re-lean', await ev('() => !!T.S().player.cover'))
        # 4) 끌어당겨 암살: 기댄 채 경비가 90px 앞을 지나감
        print(' pull', await ev('''() => { const S = T.S(), P = S.player, g = S.guards.find(g => !g.civ && !g.target && !g.dog); g.fl = 0; g.z = 0; g.x = P.x + 90; g.y = P.y + 30; g.a = Math.PI; g.state = 'PATROL'; g.meter = 0; g.seen = false; g.route = [{ x: g.x - 300, y: g.y, pause: 0 }]; g.wait = 0; window.__pg = g; return T.act(); }'''))
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(800); print(' pulled', await ev('() => window.__pg.state'))
        print(errs[:3]); await b.close()
asyncio.run(main())
