import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
OL = '() => [...document.querySelectorAll("#objective .ol")].map(e => e.textContent)'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for i in []:
            await ev(f'() => window.__game.start({i})'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.wait_for_timeout(500)
            print(i, await ev('() => (window.__game.S.opps || []).map(o => [o.k, o.seen ? 1 : 0, o.x == null ? null : [Math.round(o.x/48), Math.round(o.y/48), o.fl]])'))
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await ev('() => T.freeze()')
        # 함정 근처로
        await ev('() => { const o = T.S().opps.find(o => o.k === "trap"); const P = T.S().player; P.fl = 0; T.G().setLayer && 0; P.x = o.x + 100; P.y = o.y + 120; }'); await pg.wait_for_timeout(900)
        print('trap seen', await ev('() => T.S().opps.filter(o => o.seen).map(o => o.k)'), await ev(OL))
        await pg.screenshot(path='opp_trap.png')
        # 비번 문 근처
        await ev('() => T.at(5, 9)'); await pg.wait_for_timeout(900)
        print('code', await ev(OL))
        await ev('() => { T.S().player.keys.code = true; }'); await pg.wait_for_timeout(300); print('known', await ev(OL))
        await ev('() => T.G().actPrimary()'); await pg.wait_for_timeout(200)
        for k in '0417': await pg.keyboard.press('Digit' + k)
        await pg.wait_for_timeout(800); print('opened', await ev(OL))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300); print('paused', await ev('() => !document.getElementById("pause").hidden'))
        await pg.click('#btnOpps'); await pg.click('#btnResume'); await pg.wait_for_timeout(400)
        print('toggle off', await ev(OL)); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200); await pg.click('#btnOpps'); await pg.click('#btnResume'); await pg.wait_for_timeout(300)
        await pg.keyboard.press('m'); await pg.wait_for_timeout(500); await pg.screenshot(path='opp_map.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
