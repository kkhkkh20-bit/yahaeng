import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/yahaeng_city.html'
SKIP='() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':760})
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(200)
        await pg.keyboard.down('ArrowRight')
        for i in range(10):
            await pg.wait_for_timeout(250)
            print(await pg.evaluate('() => { const S = window.__game.S; const gs = S.guards.map(g=>[g.state, (g.meter||0).toFixed(2), Math.round(g.x/48), Math.round(g.y/48)]).filter(x=>x[0]!=="PATROL"||x[1]!=="0.00"); return [S.alevel, Math.round(S.player.x/48), Math.round(S.player.y/48), JSON.stringify(gs), (S.events||[]).slice(-3).map(e=>e.k||e.t||JSON.stringify(e)).join(";")]; }'))
            if i==3: await pg.screenshot(path='w1.png')
        await b.close()
asyncio.run(main())
