import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        # 비번 문 앞 + 등 돌린 경비 150px
        setup = '''(dx) => { T.freeze(); T.at(5, 9); const S = T.S(), P = S.player, g = S.guards.find(g => !g.civ && !g.target && !g.dog);
          g.x = P.x + dx; g.y = P.y; g.fl = 0; g.z = 0; g.a = 0; g.want = 0; g.state = 'PATROL'; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 99; g.path = null; g.meter = 0; P.a = 0; window.__g = g; return T.act(); }'''
        print('near guard 150', await ev(setup, 150), '| Z:', await ev('() => { const s = T.G().S; return 0; }'))
        print(' hud', await pg.inner_text('#btnAct'), '/', await pg.inner_text('#btnCarry'))
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(300); print(' after Space keypad?', await ev('() => !!T.S().keypad'))
        await pg.screenshot(path='stalk1.png')
        await pg.keyboard.press('z'); await pg.wait_for_timeout(300); print(' after Z keypad?', await ev('() => !!T.S().keypad'))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        # 경비가 멀면 Space가 비번
        print('far guard', await ev(setup, 400))
        # 버퍼: Space 누르고 0.2초 뒤 사정거리 안으로 들어오면 암살
        await ev(setup, 150)
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(150)
        print(' moved', await ev('() => { const P = T.S().player, g = window.__g; P.x = g.x - 50; P.y = g.y; return [T.act(), T.S().qBuf, T.S().qKill, Math.round(g.x), Math.round(g.y), Math.round(P.x), Math.round(P.y), g.a, g.state, g.fl, P.fl, T.S().player.strikeT]; }'))
        await pg.wait_for_timeout(1200); print('buffer kill', await ev('() => [window.__g.state, !!T.S().keypad]'))
        print(errs[:3]); await b.close()
asyncio.run(main())
