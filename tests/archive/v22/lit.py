import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP)
        print(await ev('''() => { const G = window.__game, out = []; for (let y = 10; y < 17; y++) for (let x = 2; x < 40; x++) { const l = G.lightAt(x * 48 + 24, y * 48 + 24); if (l > 0.6) out.push([x, y, +l.toFixed(2)]); } return out.slice(0, 40); }'''))
        await b.close()
asyncio.run(main())
