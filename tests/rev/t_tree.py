import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for si in range(5):
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await ev('() => T.freeze()')
            r = await ev('''() => { const G = T.G(), S = T.S(), P = S.player, ta = (x, y) => G.tileAt(x * 48 + 24, y * 48 + 24);
              for (let ty = 1; ty < 40; ty++) for (let tx = 2; tx < 46; tx++) if (ta(tx, ty) === 'T' && !'#CTOUAKBW'.includes(ta(tx, ty + 1)) && !'#CTOUAKBW'.includes(ta(tx, ty - 1)) && G.bldAt(tx, ty + 1) < 0 && G.bldAt(tx, ty - 1) < 0) {
                P.fl = 0; P.z = 0; P.x = tx * 48 + 24; P.y = (ty + 1) * 48 + 14; P.a = Math.PI / 2;  // 나무 바로 아래
                const g = S.guards.find(g => !g.civ && !g.target && !g.dog); g.fl = 0; g.z = 0; g.x = tx * 48 + 24; g.y = (ty - 1) * 48 + 10; g.a = Math.PI / 2; g.want = g.a; g.state = 'PATROL'; g.meter = 0; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 99; g.path = null; window.__g = g;
                return [tx, ty]; } return null; }''')
            if not r: print(si, 'no tree'); continue
            await pg.wait_for_timeout(700)
            print(si, r, await ev('() => [T.S().expo, !!T.S().player.cover, T.S().player.cover && T.S().player.cover.auto, window.__g.seen, window.__g.state]'))
            await pg.screenshot(path=f'tree{si}.png'); break
        print(errs[:3]); await b.close()
asyncio.run(main())
