import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 800, 'height': 600}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('() => { T.freeze(); window.__game.setZoom(1.4); document.getElementById("hud").style.visibility = "hidden"; }')
        print(await ev('() => { T.at(8, 11); T.S().player.a = -Math.PI / 2; return T.act(); }'))
        await ev('() => T.G().actPrimary()')
        for i in range(4): await pg.wait_for_timeout(260); await pg.screenshot(path=f'bu{i}.png')
        print(await ev('() => { const P = T.S().player; return [P.fl, !!P.trav]; }'))
        print(await ev('() => { const G = T.G(); return G.secondaryAction().label + "/" + G.primaryAction().label; }'))
        # 실내 계단
        l = await ev('() => { const l = T.S().ladders.find(l => l.kind === "fstair"); T.at(l.bx, l.by, l.bfl); T.S().player.a = -Math.PI / 2; return [l.bx, l.by, T.act()]; }')
        print(l)
        await ev('() => T.G().actPrimary()'); await pg.wait_for_timeout(600)
        print(await ev('() => { const P = T.S().player; return [P.fl, !!P.trav]; }'))
        print(errs[:3]); await b.close()
asyncio.run(main())
