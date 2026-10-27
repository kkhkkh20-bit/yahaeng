import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 700, 'height': 560}); errs = []; pg.on('pageerror', lambda e: errs.append((str(e), e.stack[:600] if e.stack else ''))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('() => { T.freeze(); }')
        print(await ev('() => { const S = T.S(); const o = S.poles[0]; S.player.x = o.x + 20; S.player.y = o.y + 10; return T.act(); }'))
        await ev('() => T.G().actPrimary()')
        for i in range(8):
            await pg.wait_for_timeout(150); print(len(errs), await ev('() => { const P = T.S().player; return [P.x, P.y, P.z, P.trav && P.trav.t]; }'))
        print(errs[:1]); await b.close()
asyncio.run(main())
