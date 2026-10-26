import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for st in [0, 3, 4]:
            await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(150); await ev(SKIP)
            print(st, await ev('''() => { const G = window.__game, out = []; G.BLD.forEach((b, bi) => { for (let f = 0; f < b.h; f++) for (const w of ['bed', 'bed2', 'room2', 'L', 'R', 'S']) { const q = G.planPt(bi, f, w); if (q) out.push(bi + '/' + f + '/' + w + ':' + q.join(',')); } }); return out.join(' '); }'''))
        await b.close()
asyncio.run(main())
