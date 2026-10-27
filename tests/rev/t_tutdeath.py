import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(5)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.wait_for_timeout(800)
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(900); await pg.keyboard.up('ArrowRight'); await pg.keyboard.press('m'); await pg.wait_for_timeout(200); await pg.keyboard.press('m'); await pg.keyboard.press('ControlLeft'); await pg.wait_for_timeout(1200)
        print('before', await ev('() => [window.__game.S.tutI, !!window.__game.CP, window.__game.CP && window.__game.CP.S.tutI]'))
        await ev('() => window.__game.endGame(false, "t")'); await pg.wait_for_timeout(2500)
        print('after', await ev('() => [window.__game.S.over, window.__game.S.tutI, document.getElementById("end").hidden, window.__game.S.stats.cpUsed]'))
        print(errs[:3]); await b.close()
asyncio.run(main())
