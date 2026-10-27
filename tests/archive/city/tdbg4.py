import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await ev('() => window.__game.start(3)'); await pg.wait_for_timeout(300); await ev(SKIP)
        print(await ev('() => { const S = window.__game.S; const n = S.notes[0]; return [n.x/48, n.y/48, n.fl, S.guards.filter(g => Math.hypot(g.x-n.x, g.y-n.y) < 120 && (g.fl||0) === n.fl).map(g => [g.id, g.civ, g.state, g.x/48, g.y/48])]; }'))
        await b.close()
asyncio.run(main())
