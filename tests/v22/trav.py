import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 700, 'height': 560}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('() => { T.freeze(); window.__game.setZoom(1.3); document.getElementById("hud").style.visibility = "hidden"; }')
        # 가스관 오르기 (b0 x=1)
        print(await ev('() => { T.at(13, 11); T.S().player.a = -Math.PI / 2; return T.act(); }'))
        await ev('() => T.G().actPrimary()')
        for i in range(6): await pg.wait_for_timeout(260); await pg.screenshot(path=f'tc{i}.png')
        print(await ev('() => { const P = T.S().player; return [P.z, !!P.trav, Math.round(P.x), Math.round(P.y)]; }'))
        # 내려가기
        print(await ev('() => T.act()'))
        await ev('() => T.G().actPrimary()')
        for i in range(4): await pg.wait_for_timeout(300); await pg.screenshot(path=f'td{i}.png')
        print(await ev('() => { const P = T.S().player; return [P.z, !!P.trav]; }'))
        # 창문 넘기
        print(await ev('() => { T.at(4, 10); T.S().player.a = -Math.PI / 2; const w = T.S().windows.find(w => w.ty === 10 && w.tx < 11); T.at(w.tx, 11); return [w.tx, T.act()]; }'))
        await ev('() => T.G().actPrimary()')
        for i in range(3): await pg.wait_for_timeout(170); await pg.screenshot(path=f'tw{i}.png')
        # 전봇대
        print(await ev('() => { T.at(4, 11); const S = T.S(); S.player.fl = 0; T.G().setLayer(0); const o = S.poles[0]; S.player.x = o.x + 20; S.player.y = o.y + 10; return T.act(); }'))
        await ev('() => T.G().actPrimary()')
        for i in range(4): await pg.wait_for_timeout(300); await pg.screenshot(path=f'tp{i}.png')
        print(await ev('() => { const P = T.S().player; return [!!P.wire, P.z, !!P.trav]; }'))
        print(errs[:3]); await b.close()
asyncio.run(main())
