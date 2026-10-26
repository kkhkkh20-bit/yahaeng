import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(5)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('() => { const P = T.S().player, g = T.S().guards[0]; P.x = g.x - 50; P.y = g.y; P.a = 0; }'); await pg.wait_for_timeout(150)
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(1200)
        # 다른 경비를 시체가 보이는 곳(뒤돌아선 채)에 둔다
        print(await ev('''() => { const S = T.S(), c = S.corpses[0], g = S.guards[1]; g.x = c.x + 80; g.y = c.y; g.a = 0; g.want = 0; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 99; g.path = null; S.player.x = c.x - 120; return [Math.round(c.x), Math.round(c.light * 100)]; }'''))
        await pg.wait_for_timeout(800); print('risk', await ev('() => T.S().corpses[0].risk'))
        await pg.screenshot(path='risk.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
