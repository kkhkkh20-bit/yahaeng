import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/yahaeng_city.html'
SKIP='() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        c = await b.new_context(viewport={'width':1280,'height':760}); pg = await c.new_page()
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(300)
        # 순진한 플레이: 왼쪽으로 걷기만 20초
        st = lambda: pg.evaluate('() => { const S = window.__game.S; return [S.alevel, Math.round(S.player.x/48), Math.round(S.player.y/48), S.over ? 1 : 0, S.guards.filter(g=>g.state && g.state!=="PATROL" && g.state!=="DEAD").map(g=>g.state).join(",")]; }')
        await pg.keyboard.down('ArrowRight')
        for i in range(10):
            await pg.wait_for_timeout(2000); print('t', (i+1)*2, await st())
            if i==3: await pg.screenshot(path='n_walk.png')
        await pg.keyboard.up('ArrowRight'); await pg.screenshot(path='n_walk2.png')
        await pg.keyboard.down('Alt'); await pg.wait_for_timeout(400); await pg.screenshot(path='scan.png'); await pg.keyboard.up('Alt')
        await pg.keyboard.press('h'); await pg.wait_for_timeout(400); await pg.screenshot(path='help.png'); await pg.keyboard.press('Escape'); await pg.keyboard.press('h')
        await pg.keyboard.press('m'); await pg.wait_for_timeout(400); await pg.screenshot(path='map.png'); await pg.keyboard.press('m')
        await b.close()
asyncio.run(main())
