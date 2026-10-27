import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        async def start(i, zoom):
            await ev(f'() => window.__game.start({i})'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await ev(f'() => window.__game.setZoom({zoom})')
        # A: 주시 + 잔상
        await start(0, 1.15)
        r = await ev('''() => { const S = T.S(), P = S.player; const g = S.guards.find(g => !g.civ && !g.dog && !g.fl && g.route && g.route.length > 1) || S.guards[1];
          P.x = g.x - 200; P.y = g.y + 60; S.marked = g;
          const h = S.guards.find(o => o !== g && !o.civ && !o.dog && !o.fl); if (h) { h.state = 'SUSPICIOUS'; h.why = 'noise'; h.poi = { x: P.x + 90, y: P.y - 40 }; h.meter = 0.6; }
          return [S.guards.indexOf(g), !!h]; }''')
        await pg.wait_for_timeout(700); await pg.screenshot(path='a_mark.png'); print('A', r)
        # B: 변장
        await start(2, 1.5)
        r = await ev('''() => { const S = T.S(), P = S.player; P.disguise = 'sam'; T.at(15, 11); return [S.guards[2].x / 48 | 0, S.guards[2].y / 48 | 0]; }''')
        await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(600); await pg.keyboard.up('ArrowUp'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='b_disguise.png'); print('B', r, await ev('() => [T.S().alevel, T.S().player.disguiseBlown]'))
        # C: 감전 함정
        await start(3, 0.85)
        r = await ev('''() => { const S = T.S(), t = S.guards[0]; t.x = 21.5*48; t.y = 23.5*48; t.route = [{ x: t.x, y: t.y, pause: 999 }]; t.ri = 0; t.wait = 99; t.path = null; T.freeze(); T.at(30, 25); return T.act(); }''')
        await pg.wait_for_timeout(500); await pg.screenshot(path='c_shock0.png')
        await ev('() => { T.at(36, 25); T.G().actPrimary(); T.at(30, 25); }'); await pg.wait_for_timeout(350); await pg.screenshot(path='c_shock1.png'); print('C', r)
        # D: 간판 낙하
        await start(1, 1.1)
        r = await ev('''() => { const S = T.S(), t = S.guards[0]; t.x = 30.5*48; t.y = 12.5*48; t.route = [{ x: t.x, y: t.y, pause: 999 }]; t.ri = 0; t.wait = 99; t.path = null; T.at(30, 8, 0, 2); return T.act(); }''')
        await pg.wait_for_timeout(500); await pg.screenshot(path='d_drop0.png')
        await ev('() => T.G().actPrimary()'); await pg.wait_for_timeout(900); await pg.screenshot(path='d_drop1.png'); print('D', r)
        # E: 결과 화면
        await start(1, 1)
        await ev('''() => { try { localStorage.removeItem('yahaeng.ch'); } catch (e) {} const S = T.S(); S.stats.detected = 0; S.stats.bodies = 0; S.stats.alarms = 0; S.t = 151; S.learned = ['x']; S.guards[0].state = 'DEAD'; S.guards[0].accident = 'fall'; T.G().showEnd(true); }''')
        await pg.wait_for_timeout(400); await pg.screenshot(path='e_end.png')
        # F: 모바일 결과 화면
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(300); await pg.screenshot(path='f_end_m.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
