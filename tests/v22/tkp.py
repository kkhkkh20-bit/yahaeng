import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 900, 'height': 640}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('() => { T.freeze(); T.at(5, 9); }')
        print(await ev('() => T.act()'))
        await ev('() => T.G().actPrimary()'); await pg.wait_for_timeout(200); await pg.screenshot(path='kp0.png')
        for k in '1234': await pg.keyboard.press('Digit' + k)
        await pg.wait_for_timeout(500); print('wrong', await ev('() => [!!T.S().keypad, T.S().noises.length]'))
        await ev('() => { T.S().player.keys.code = true; }')
        await ev('() => { T.G().actPrimary && 0; }')
        for k in '0417': await pg.keyboard.press('Digit' + k)
        await pg.wait_for_timeout(500); print('right', await ev('() => [!!T.S().keypad, T.act()]'))
        # 모바일 탭
        c = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True); m = await c.new_page(); m.on('pageerror', lambda e: errs.append(str(e)))
        await m.goto('file:///root/game/build/preview_city.html'); await m.wait_for_timeout(1500); await m.evaluate('() => window.__game.start(1)'); await m.wait_for_timeout(300); await m.evaluate(SKIP); await m.evaluate(H)
        await m.evaluate('() => { T.freeze(); T.at(5, 9); T.S().player.keys.code = true; T.G().actPrimary(); }'); await m.wait_for_timeout(300); await m.screenshot(path='kp1.png')
        for k in '0417': await m.tap(f'#keypad [data-k="{k}"]'); await m.wait_for_timeout(60)
        await m.wait_for_timeout(500); print('mobile', await m.evaluate('() => [!!T.S().keypad, T.act()]'))
        print(errs[:3]); await b.close()
asyncio.run(main())
