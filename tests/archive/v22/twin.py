import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for i in range(5):
            await pg.evaluate(f'() => window.__game.start({i})'); await pg.wait_for_timeout(300)
            print(i, await pg.evaluate('''() => { const S = window.__game.S; const ws = S.fwindows || []; const up = ws.filter(w => w.fl > 0);
              const use = up.filter(w => !!w.link || S.wires.some(x => [x.a, x.b].some(n => n.win && n.fl === w.fl && n.tx === w.tx && n.ty === w.ty)));
              return [ws.length, up.length, use.length]; }'''))
        print(errs[:3]); await b.close()
asyncio.run(main())
