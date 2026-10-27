import asyncio, json
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); g.S.toasts.length = 0; }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1200)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP)
        ev = lambda js: pg.evaluate(js)
        # 경비를 멀리 치우고 시야를 막는다
        await ev('() => { const S = window.__game.S; S.guards.forEach(g => { g.x = 2*48; g.y = 28*48; g.route = [{x: g.x, y: g.y, pause: 999}]; g.routeLine = null; g.post = null; g.wait = 999; }); }')
        # 1) 옥상에서 줄 타기
        r = await ev('() => { const S = window.__game.S, P = S.player; P.z = 3; P.x = 7*48+24; P.y = 3*48+24; return window.__game.primaryAction().label; }')
        print('1 roof label:', r)
        await ev('() => window.__game.actPrimary()')
        print('1 wire?', await ev('() => { const P = window.__game.S.player; return !!P.wire && P.wire.s; }'))
        await pg.keyboard.down('ArrowDown'); await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(2500); await pg.keyboard.up('ArrowDown')
        await pg.wait_for_timeout(1500); await pg.keyboard.up('ArrowRight')
        print('1 after move:', await ev('() => { const P = window.__game.S.player, w = P.wire.w; return {s: P.wire.s.toFixed(2), a: [w.a.x/48|0, w.a.y/48|0], b: [w.b.x/48|0, w.b.y/48|0], x: (P.x/48).toFixed(1), y: (P.y/48).toFixed(1)}; }'))
        # 2) 낙하 암살
        r = await ev('''() => { const S = window.__game.S, P = S.player; const w = S.wires.find(w => w.a.pole && w.b.pole && w.a.y === w.b.y); P.wire = {w, s: 0.5}; P.x = (w.a.x + w.b.x)/2; P.y = w.a.y; P.z = 3;
          const g = S.guards[0]; g.x = P.x + 20; g.y = P.y + 30; g.state = 'PATROL'; return window.__game.primaryAction().label; }''')
        print('2 label:', r); await ev('() => window.__game.actPrimary()')
        print('2 result:', await ev('() => { const S = window.__game.S, P = S.player; return {dead: S.guards[0].state, z: P.z, wire: !!P.wire}; }'))
        # 3) 옥상 끝에서 올라서기
        r = await ev('''() => { const S = window.__game.S, P = S.player; const w = S.wires.find(w => w.b.roof && w.b.tx === 21 && w.b.ty === 3); P.wire = {w, s: 0.99}; P.z = 2; P.x = w.b.x; P.y = w.b.y; return window.__game.primaryAction().label; }''')
        print('3 label:', r); await ev('() => window.__game.actPrimary()')
        print('3 result:', await ev('() => { const P = window.__game.S.player; return {z: P.z, wire: !!P.wire, x: P.x/48, y: P.y/48}; }'))
        # 4) 전봇대 내려가기
        r = await ev('''() => { const S = window.__game.S, P = S.player; const w = S.wires.find(w => w.a.pole && w.b.pole); P.wire = {w, s: 0.0}; P.z = 3; P.x = w.a.x; P.y = w.a.y; return window.__game.primaryAction().label; }''')
        print('4 label:', r); await ev('() => window.__game.actPrimary()')
        print('4 result:', await ev('() => { const P = window.__game.S.player; return {z: P.z, wire: !!P.wire, x: P.x/48, y: P.y/48}; }'))
        # 5) 뛰어내리기
        r = await ev('''() => { const S = window.__game.S, P = S.player; const w = S.wires.find(w => w.a.pole && w.b.pole); P.wire = {w, s: 0.5}; P.z = 3; P.x = (w.a.x+w.b.x)/2; P.y = w.a.y; return window.__game.primaryAction().label; }''')
        print('5 label:', r); await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(700)
        print('5 result:', await ev('() => { const P = window.__game.S.player; return {z: P.z, wire: !!P.wire, jump: !!P.jump}; }'))
        # 6) 망꾼이 줄 위를 보는가 / 일반 경비는 덜 보는가
        print('6 vis:', await ev('''() => { const G = window.__game; return 1; }'''))
        print('errs', errs[:5]); await b.close()
asyncio.run(main())
