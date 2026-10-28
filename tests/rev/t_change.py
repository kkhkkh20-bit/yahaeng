import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await ev('() => T.freeze()'); await pg.wait_for_timeout(300)
        w = await ev('''() => { const S = T.S(), P = S.player, G = T.G(); const w = S.windows.find(w => w.st === 'lock' && w.b >= 0 && G.bldAt(w.tx, w.ty + 1) < 0);
            P.x = w.x; P.y = w.y + 48; P.a = -Math.PI / 2; window.__w = w; return [w.tx, w.ty, T.act()]; }''')
        print('win', w); await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(2200)
        print(' opened', await ev('() => [window.__w.st, (T.S().changes || []).length]'))
        # 플레이어는 멀리, 경비를 창문 앞 180px에서 창문 쪽을 보게
        await ev('''() => { const S = T.S(), P = S.player, w = window.__w; P.x = w.x + 400; P.y = w.y + 200; const g = S.guards.find(g => !g.civ && !g.target && !g.dog);
            g.fl = 0; g.z = 0; g.x = w.x + 150; g.y = w.y + 60; g.a = Math.atan2(w.y - g.y, w.x - g.x); g.want = g.a; g.state = 'PATROL'; g.meter = 0; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 99; g.path = null; window.__g = g; }''')
        for i in range(8):
            await pg.wait_for_timeout(700); r = await ev('() => [window.__g.state, Math.round(Math.hypot(window.__g.x - window.__w.x, window.__g.y - window.__w.y)), window.__w.st, T.S().changes[0].done]')
            print(' ', r)
            if i == 1: await pg.screenshot(path='change.png')
            if r[3]: break
        print(errs[:3]); await b.close()
asyncio.run(main())
