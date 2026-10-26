import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => window.__game.start(2)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(3500)
        await pg.keyboard.down('AltLeft'); await pg.wait_for_timeout(500); await pg.screenshot(path='scan2.png'); await pg.keyboard.up('AltLeft')
        print(errs); await b.close()
asyncio.run(main())
