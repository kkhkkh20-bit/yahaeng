import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1000, 'height': 640}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('() => { T.freeze(); window.__game.setZoom(1.3); }')
        await ev('() => { T.at(9, 12); }'); await pg.wait_for_timeout(700); await pg.screenshot(path='mk0.png')
        await ev('() => { T.at(5, 6); }'); await pg.wait_for_timeout(700); await pg.screenshot(path='mk1.png')
        await ev('() => { T.at(18, 7, 0, 2); }'); await pg.wait_for_timeout(700); await pg.screenshot(path='mk2.png')
        await ev('() => { T.at(9, 12); }'); await pg.keyboard.down('AltLeft'); await pg.wait_for_timeout(500); await pg.screenshot(path='mk3.png'); await pg.keyboard.up('AltLeft')
        print(errs[:3]); await b.close()
asyncio.run(main())
