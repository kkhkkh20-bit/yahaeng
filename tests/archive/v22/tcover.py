import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 800, 'height': 560}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('() => { T.freeze(); window.__game.setZoom(1.8); }')
        # 길가 건물 정면 벽(아래쪽) 밑에서 위로 밀기
        await ev('() => { T.at(20, 11); }')
        await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(700); await pg.keyboard.up('ArrowUp'); await pg.wait_for_timeout(200)
        print('cover', await ev('() => [T.S().player.cover, Math.round(T.S().player.y - 11 * 48)]'))
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(400); await pg.keyboard.up('ArrowRight')
        print('slide', await ev('() => [T.S().player.cover, Math.round(T.S().player.x / 48 * 10) / 10, Math.round(T.S().player.y - 11 * 48)]'))
        await pg.screenshot(path='cv0.png')
        # 경비가 옆을 지나가게 (서쪽에서 동쪽으로, 플레이어 아래 한 칸)
        r = await ev('''() => { const S = T.S(), P = S.player; const g = S.guards.find(g => !g.civ && !g.dog && !g.target && !g.fl && !g.hasKey); window.__pg = g;
          g.x = P.x - 6 * 48; g.y = P.y + 30; g.state = 'PATROL'; g.route = [{ x: g.x, y: g.y, pause: 0 }, { x: P.x + 8 * 48, y: g.y, pause: 999 }]; g.ri = 1; g.wait = 0; g.path = null; g.meter = 0; return 1; }''')
        hit = None
        for i in range(60):
            await pg.wait_for_timeout(100)
            a = await ev('() => { const G = T.G(), g = window.__pg, P = T.S().player; return [G.primaryAction().k, Math.round(Math.hypot(g.x - P.x, g.y - P.y)), g.state, Math.round(g.meter * 100)]; }')
            if a[0] == 'pull': hit = a; break
        print('target', hit)
        if hit:
            await ev('() => T.G().actPrimary()'); await pg.wait_for_timeout(90); await pg.screenshot(path='cv1.png'); await pg.wait_for_timeout(500); await pg.screenshot(path='cv2.png')
            print('after', await ev('() => [window.__pg.state, T.S().stats.special, T.S().alevel]'))
        # 벽에서 떨어지기
        await pg.keyboard.down('ArrowDown'); await pg.wait_for_timeout(300); await pg.keyboard.up('ArrowDown')
        print('leave', await ev('() => T.S().player.cover'))
        print(errs[:3]); await b.close()
asyncio.run(main())
