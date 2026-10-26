import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/yahaeng_city.html'
SKIP='() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':760})
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => window.__game.start(2)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(600)
        await pg.screenshot(path='m3_play.png')
        await pg.keyboard.down('Alt'); await pg.wait_for_timeout(500); await pg.screenshot(path='scan.png'); await pg.keyboard.up('Alt')
        await pg.keyboard.press('h'); await pg.wait_for_timeout(400); await pg.screenshot(path='help.png'); await pg.keyboard.press('h'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        await pg.keyboard.press('m'); await pg.wait_for_timeout(400); await pg.screenshot(path='map.png'); await pg.keyboard.press('m')
        await b.close()
asyncio.run(main())
