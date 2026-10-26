import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for si in range(5):
            await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(300)
            print(si, await pg.evaluate('''() => { const S = window.__game.S, c = { open: 0, lock: 0, bar: 0 }; const per = {}; for (const w of S.windows) { c[w.st]++; if (w.b >= 0) { const o = per[w.b] || (per[w.b] = ''); per[w.b] = o + w.st[0]; } } return [c, JSON.stringify(per), S.player.picks]; }'''))
        print(errs[:3]); await b.close()
asyncio.run(main())
