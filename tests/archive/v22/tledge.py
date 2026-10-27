import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 800, 'height': 560}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('() => { T.freeze(); window.__game.setZoom(1.6); document.getElementById("hud").style.visibility = "hidden"; }')
        # b1 옥상 남쪽 끝 (y=8 줄이 지붕 끝?) 찾기
        r = await ev('''() => { const G = T.G(); for (let y = 2; y < 10; y++) if (G.rLv(18, y) === 2 && G.rLv(18, y + 1) < 2) return y; return -1; }''')
        print('edge row', r)
        await ev(f'() => {{ T.at(18, {r}, 0, 2); T.S().player.y += 14; }}')
        print('sa', await ev('() => T.G().secondaryAction().label'))
        await pg.keyboard.press('KeyZ'); await pg.wait_for_timeout(200)
        print('ledge', await ev('() => [T.S().player.ledge, T.G().primaryAction().label]'))
        await pg.screenshot(path='lg0.png')
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(500); await pg.keyboard.up('ArrowRight')
        print('shimmy', await ev('() => Math.round(T.S().player.x / 48 * 10) / 10'))
        # 옥상 경비 하나를 지붕 위에 올려 가까이 걷게
        await ev(f'''() => {{ const S = T.S(), P = S.player; const g = S.guards.find(g => !g.civ && !g.dog && !g.target && !g.fl && !g.hasKey); window.__lg = g; g.z = 2; g.x = P.x - 3 * 48; g.y = P.y - 20; g.state = 'PATROL'; g.route = [{{ x: g.x, y: g.y, pause: 0 }}, {{ x: P.x + 3 * 48, y: g.y, pause: 999 }}]; g.ri = 1; g.path = null; g.wait = 0; g.meter = 0; }}''')
        hit = None
        for i in range(50):
            await pg.wait_for_timeout(100)
            a = await ev('() => { const g = window.__lg; return [T.G().primaryAction().k, g.state, Math.round(g.meter * 100), Math.round(Math.hypot(g.x - T.S().player.x, g.y - T.S().player.y))]; }')
            if a[0] == 'ledgeKill': hit = a; break
        print('target', hit)
        if hit:
            await ev('() => T.G().actPrimary()'); await pg.wait_for_timeout(200); await pg.screenshot(path='lg1.png'); await pg.wait_for_timeout(600)
            print('after', await ev('() => { const g = window.__lg, S = T.S(); return [g.state, g.z, S.corpses.map(c => c.accident), S.alevel]; }'))
        await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(600); await pg.keyboard.up('ArrowUp')
        print('up', await ev('() => [T.S().player.ledge, T.S().player.z]'))
        print(errs[:3]); await b.close()
asyncio.run(main())
