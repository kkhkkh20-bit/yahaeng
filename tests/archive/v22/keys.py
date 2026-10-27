import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP)
        st = lambda: ev('() => { const G = window.__game, P = G.S.player; return [P.mode, G.input.sneakToggle, G.input.tool, G.input.scan, !!G.input.aiming, document.getElementById("btnSneak").className]; }')
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(200); print('기본', await st()); await pg.keyboard.up('ArrowRight')
        await pg.keyboard.press('ControlLeft'); await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(200); print('Ctrl', await st())
        await pg.keyboard.down('ShiftLeft'); await pg.wait_for_timeout(200); print('Ctrl+Shift', await st()); await pg.keyboard.up('ShiftLeft'); await pg.keyboard.up('ArrowRight')
        await pg.keyboard.press('KeyC'); print('C', await st())
        await pg.keyboard.down('AltLeft'); await pg.wait_for_timeout(100); print('Alt', await st()); await pg.keyboard.up('AltLeft')
        await pg.keyboard.down('KeyX'); await pg.wait_for_timeout(200); print('X', await st()); await pg.keyboard.up('KeyX'); await pg.wait_for_timeout(100); print('X up', await st())
        await pg.screenshot(path='keys.png')
        # 재시작 후에도 살금 유지
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await ev(SKIP); print('다음 판', await st())
        await pg.click('#btnSneak'); print('버튼', await st())
        # 터치 조이스틱
        b2 = await p.chromium.launch(); c = await b2.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True); m = await c.new_page(); m.on('pageerror', lambda e: errs.append(str(e)))
        await m.goto('file:///root/game/build/preview_city.html'); await m.wait_for_timeout(1500); await m.evaluate('() => window.__game.start(0)'); await m.wait_for_timeout(300); await m.evaluate(SKIP)
        for mag in [0.2, 0.6, 1.0]:
            await m.evaluate(f'() => {{ window.__game.input.joy = {{ x: {mag}, y: 0, mag: {mag} }}; }}'); await m.wait_for_timeout(150)
            print('joy', mag, await m.evaluate('() => window.__game.S.player.mode'))
        await m.evaluate('() => { window.__game.input.joy = null; }'); await m.screenshot(path='keys_m.png')
        print(errs[:3]); await b.close(); await b2.close()
asyncio.run(main())
