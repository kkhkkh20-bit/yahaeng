import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); c = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True); pg = await c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        # 경로 흉내: 몇 지점을 지나고 처치·발각 기록
        await ev('''() => { const S = T.S(); const pts = [[38, 13], [30, 13], [22, 13], [18, 12], [13, 11], [13, 8], [16, 6], [20, 6], [24, 8], [22, 13], [10, 13], [2, 13]];
          S.trail = pts.map(([x, y], i) => ({ x: x * 48 + 24, y: y * 48 + 24, z: i >= 5 && i <= 8 ? 2 : 0, fl: 0 }));
          S.events = [{ k: 'kill', x: 22 * 48, y: 13 * 48 }, { k: 'accident', x: 20 * 48, y: 9 * 48 }, { k: 'seen', x: 10 * 48, y: 13 * 48 }, { k: 'found', x: 22 * 48, y: 13.5 * 48 }];
          T.G().showEnd(true); }''')
        await pg.wait_for_timeout(400); await pg.evaluate('() => { const e = document.getElementById("endMap"); e.scrollIntoView(); }'); await pg.wait_for_timeout(200); await pg.screenshot(path='endmap_m.png')
        b2 = await p.chromium.launch(); pg2 = await b2.new_page(viewport={'width': 1280, 'height': 860}); await pg2.goto('file:///root/game/build/preview_city.html'); await pg2.wait_for_timeout(1200)
        await pg2.evaluate('() => window.__game.start(0)'); await pg2.wait_for_timeout(300); await pg2.evaluate(SKIP); await pg2.evaluate(H)
        await pg2.evaluate('''() => { const S = T.S(); const pts = [[38, 13], [30, 13], [22, 13], [18, 12], [13, 11], [13, 8], [16, 6], [20, 6], [24, 8], [22, 13], [10, 13], [2, 13]];
          S.trail = pts.map(([x, y], i) => ({ x: x * 48 + 24, y: y * 48 + 24, z: i >= 5 && i <= 8 ? 2 : 0, fl: 0 })); S.events = [{ k: 'kill', x: 22 * 48, y: 13 * 48 }, { k: 'seen', x: 10 * 48, y: 13 * 48 }]; T.G().showEnd(true); }''')
        await pg2.wait_for_timeout(400); await pg2.screenshot(path='endmap_d.png', full_page=True)
        print(errs[:3]); await b.close(); await b2.close()
asyncio.run(main())
