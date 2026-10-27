import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800}); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(3)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await ev('() => window.__game.setZoom(1.8)')
        print(await ev('() => { T.freeze(); T.at(35, 25); const G = T.G(); return [T.act(), G.lvAt ? 1 : 0, JSON.stringify(T.S().traps.map(t => [t.k, t.sw, t.at]))]; }'))
        await pg.wait_for_timeout(600); await pg.screenshot(path='c_sw.png'); await b.close()
asyncio.run(main())
