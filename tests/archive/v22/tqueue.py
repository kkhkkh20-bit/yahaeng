import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 900, 'height': 600}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('''() => { const S = T.S(); T.freeze(); const gs = S.guards.filter(g => !g.civ && !g.dog && !g.target && !g.fl).slice(0, 2); window.__q = gs;
          T.at(18, 13); const P = S.player; P.kunai = 3;
          gs[0].x = P.x + 150; gs[0].y = P.y; gs[1].x = P.x - 150; gs[1].y = P.y; for (const g of gs) { g.a = Math.PI / 2; g.want = g.a; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 999; } window.__game.input.tool = 'kunai'; }''')
        await ev('() => { T.S().player.a = 0; }')
        await pg.keyboard.down('KeyX'); await pg.wait_for_timeout(150)
        await pg.keyboard.press('KeyZ'); await pg.wait_for_timeout(100)
        await ev('() => { T.S().player.a = Math.PI; }'); await pg.wait_for_timeout(150)
        await pg.screenshot(path='q0.png')
        print('queued', await ev('() => window.__game.input.queue.length'))
        await pg.keyboard.up('KeyX'); await pg.wait_for_timeout(700)
        print('after', await ev('() => [window.__q.map(g => g.state), T.S().player.kunai]'))
        print(errs[:3]); await b.close()
asyncio.run(main())
