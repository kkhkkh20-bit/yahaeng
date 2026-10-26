import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/yahaeng_city.html'
SKIP='() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':760})
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        for idx in range(5):
          await pg.evaluate(f'() => window.__game.start({idx})'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(200)
          # 가만히 서있을 때 10초
          r=[]
          for i in range(10):
            await pg.wait_for_timeout(1000)
            r.append(await pg.evaluate('() => { const S = window.__game.S; return S.alevel + "/" + Math.max(0,...S.guards.map(g=>g.meter||0)).toFixed(2); }'))
          print(idx, 'idle', r)
          if idx==1: await pg.screenshot(path='idle1.png')
        await b.close()
asyncio.run(main())
