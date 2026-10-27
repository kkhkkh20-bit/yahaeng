import asyncio, json
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        await pg.goto(URL); await pg.wait_for_timeout(1000); ev = pg.evaluate
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.wait_for_timeout(300)
        print(await ev('''() => { const S = window.__game.S, P = S.player; return [S.t.toFixed(1), window.__game.DLG.modal, S.guards.filter(g => Math.hypot(g.x-P.x,g.y-P.y) < 300).map(g => ({id: g.id, civ: g.civ, dog: g.dog, z: g.z, fl: g.fl, st: g.state, x: g.x/48, y: g.y/48, look: g.lookout}))]; }'''))
        await pg.wait_for_timeout(3000)
        print(await ev('() => window.__game.S.t.toFixed(1)'))
        await pg.screenshot(path='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/r_2_start.png')
        await b.close()
asyncio.run(main())
