import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(4)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        r = await ev('''() => { const G = T.G(), S = T.S(), g = S.guards[9], B = G.BLD[4];
          S.guards.forEach((o, i) => { if (i !== 9) { o.x = -5000; o.y = -5000; o.route = [{ x: -5000, y: -5000, pause: 999 }]; o.path = null; } });
          for (const cm of S.cams || []) cm.broken = true; g.route = [{ x: g.x, y: g.y, pause: 0 }, { x: g.x - 192, y: g.y, pause: 0 }]; g.ri = 1; g.wait = 0; g.path = null;
          const P = S.player; P.fl = 0; P.z = 0; P.x = g.x; P.y = (B.y1 + 2) * 48 + 24; if (G.bldAt(Math.floor(P.x/48), Math.floor(P.y/48)) >= 0) P.y += 96; P.a = Math.PI / 2;
          return [B.x0, B.y0, B.x1, B.y1, Math.round(g.x/48), Math.round(g.y/48), Math.round(P.y/48)]; }''')
        print(r)
        for i in range(3):
            await pg.wait_for_timeout(700); await pg.screenshot(path=f'steps{i}.png')
            print(await ev('() => { const g = T.S().guards[9], P = T.S().player; return [g.moving, g.state, Math.round(Math.hypot(P.x-g.x, P.y-g.y)), T.S().alevel]; }'))
        print(errs[:3]); await b.close()
asyncio.run(main())
