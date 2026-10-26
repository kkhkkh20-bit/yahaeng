import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for n in ['preview', 'preview_joseon', 'preview_neo', 'preview_city']:
            pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(f'file:///root/game/build/{n}.html'); await pg.wait_for_timeout(1200)
            v = await pg.evaluate('() => window.__game.validate()')
            await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300)
            await pg.evaluate('() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }')
            await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(4000); await pg.keyboard.up('ArrowUp')
            print(n, v, errs[:3])
        await b.close()
asyncio.run(main())
