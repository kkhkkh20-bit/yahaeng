import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/yahaeng_city.html'
SKIP='() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':760})
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(300)
        print(await pg.evaluate('() => { const S = window.__game.S; return [S.player.x, S.player.y, S.alert, S.alevel, typeof S.over, Object.keys(S).filter(k=>/alert|over|lvl|level/i.test(k))]; }'))
        await pg.keyboard.down('ArrowLeft'); await pg.wait_for_timeout(1500); await pg.keyboard.up('ArrowLeft')
        print(await pg.evaluate('() => { const S = window.__game.S; return [S.player.x, S.player.y]; }'))
        await b.close()
asyncio.run(main())
