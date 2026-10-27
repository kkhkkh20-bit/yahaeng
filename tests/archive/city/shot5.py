import asyncio, json
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/m_'
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); g.S.toasts.length = 0; }'
CLR = '() => { window.__game.S.toasts.length = 0; }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1200)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(2500)
        print(await pg.evaluate('() => { const S = window.__game.S; return {wires: S.wires.length, win: S.wires.filter(w => w.b.win).length, links: S.fwindows.filter(w => w.link).length, lamps: S.lamps.length, guards: S.guards.length}; }'))
        async def at(js, name, wait=500):
            await pg.evaluate('() => { const G = window.__game, S = G.S, P = S.player; ' + js + ' S.toasts.length = 0; }')
            await pg.wait_for_timeout(wait); await pg.evaluate(CLR); await pg.screenshot(path=OUT+name)
        await at('P.fl = 0; G.setLayer(0); P.z = 3; P.x = 28*48; P.y = 14*48; G.setZoom(0.5);', '1_overview.png')
        await at('P.z = 0; P.x = 30*48; P.y = 43*48; P.a = -Math.PI/2; G.setZoom(0.62);', '2_shops.png')
        await at('P.z = 0; P.fl = 0; G.setLayer(0); P.x = 9*48+24; P.y = 17*48+24; G.setZoom(0.75);', '3_villa1F.png')
        await at('P.fl = 2; G.setLayer(2); P.x = 28*48+24; P.y = 17*48+24; G.setZoom(0.75);', '4_villa3F.png')
        await at('P.fl = 2; G.setLayer(2); P.x = 24*48+24; P.y = 38*48+24; G.setZoom(0.75);', '5_academy.png')
        # 옆 창문 건너기
        r = await pg.evaluate('''() => { const G = window.__game, S = G.S, P = S.player; const w = S.fwindows.find(w => w.link && w.fl === 1); P.fl = 1; G.setLayer(1); P.z = 0; P.x = (w.tx - w.link.dir) * 48 + 24; P.y = w.ty * 48 + 24; return [w.tx, w.ty, w.link.tx, G.primaryAction().label]; }''')
        print('side', r)
        await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_timeout(900)
        print('after', await pg.evaluate('() => { const P = window.__game.S.player; return [P.fl, (P.x/48).toFixed(1), (P.y/48).toFixed(1)]; }'))
        print(errs[:3]); await b.close()
asyncio.run(main())
