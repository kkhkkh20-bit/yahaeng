import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 800, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for case in ['head', 'follow', 'stand']:
            await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
            await ev('''(c) => { const S = T.S(); T.freeze(); S.player.x = 2 * 48; S.player.y = 26 * 48; const gs = S.guards.filter(g => !g.civ && !g.dog && !g.target && !g.fl).slice(0, 2); window.__ab = gs;
              const y = 13 * 48 + 24, A = gs[0], B = gs[1];
              A.x = 14 * 48; A.y = y; A.route = [{ x: 14 * 48, y, pause: 0 }, { x: 26 * 48, y, pause: 999 }]; A.ri = 1; A.wait = 0; A.path = null; A.state = 'PATROL';
              if (c === 'head') { B.x = 26 * 48; B.y = y; B.route = [{ x: 26 * 48, y, pause: 0 }, { x: 14 * 48, y, pause: 999 }]; }
              else if (c === 'follow') { B.x = 15.2 * 48; B.y = y; B.route = [{ x: 15.2 * 48, y, pause: 0 }, { x: 26 * 48, y, pause: 999 }]; A.x = 16.5 * 48; }
              else { B.x = 20 * 48; B.y = y; B.route = [{ x: 20 * 48, y, pause: 999 }]; B.wait = 999; }
              B.ri = B.route.length > 1 ? 1 : 0; B.wait = c === 'stand' ? 999 : 0; B.path = null; B.state = 'PATROL'; window.__md = 999; }''', case)
            mind = 999; passed = None; frames = []
            for i in range(110):
                await pg.wait_for_timeout(120)
                r = await ev('() => { const [A, B] = window.__ab; return [Math.hypot(A.x - B.x, A.y - B.y), A.x, B.x, A.y, B.y]; }')
                mind = min(mind, r[0]); frames.append(r)
            last = frames[-1]
            print(case, 'min dist', round(mind), 'A.x', round(last[1] / 48, 1), 'B.x', round(last[2] / 48, 1), 'ys', round(last[3]), round(last[4]))
        print(errs[:3]); await b.close()
asyncio.run(main())
