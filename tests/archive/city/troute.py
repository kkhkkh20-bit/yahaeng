import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]; pg = await b.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        for si in range(5):
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200); await ev(SKIP)
            r = await ev('''() => { const G = window.__game, S = G.S; const links = S.fwindows.filter(w => w.link).map(w => `${G.BLD[G.bldAt(w.tx, w.ty)].plate || G.BLD[G.bldAt(w.tx, w.ty)].name}→${G.BLD[G.bldAt(w.link.tx, w.link.ty)].plate || G.BLD[G.bldAt(w.link.tx, w.link.ty)].name} ${w.fl + 1}층`);
              const back = S.doors.filter(d => { const b = G.bldAt(d.tx, d.ty); return b >= 0 && d.ty === G.BLD[b].y0; }).map(d => G.BLD[G.bldAt(d.tx, d.ty)].plate || G.BLD[G.bldAt(d.tx, d.ty)].name);
              return { size: [G.S && window.__game.S && 0], links: [...new Set(links)].slice(0, 12), back: [...new Set(back)], cams: S.cams.length, guards: S.guards.filter(g => !g.civ).length, civ: S.guards.filter(g => g.civ).length }; }''')
            print(si, r)
        print(errs[:3]); await b.close()
asyncio.run(main())
