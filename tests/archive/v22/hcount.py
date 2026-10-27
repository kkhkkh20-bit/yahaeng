import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for st in range(5):
            await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(200); await ev(SKIP)
            print(st, await ev('() => { const S = window.__game.S; const c = {}; for (const h of S.hides) c[h.type] = (c[h.type] || 0) + 1; return [c, S.hides.filter(h => h.type === "box").map(h => [h.tx, h.ty])]; }'))
        await b.close()
asyncio.run(main())
