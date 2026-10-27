import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 900, 'height': 600}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        await ev('() => { window.__game.setZoom(1.3); }')
        # 발소리 고리: 경비 가까이 걷기
        await ev('''() => { const S = T.S(); T.freeze(); const g = S.guards.find(g => !g.civ && !g.dog && !g.target && !g.fl); window.__g = g; g.x = 18 * 48; g.y = 13 * 48 + 24; g.a = 0; g.want = 0; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 999; T.at(14, 13); }''')
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(350); await pg.screenshot(path='fb0.png'); await pg.keyboard.up('ArrowRight')
        # 처치: 목 조르기 (킬 수 홀수 만들기)
        await ev('''() => { const S = T.S(), g = window.__g; S.stats.kills = 1; g.state = 'PATROL'; g.hearT = 0; const P = S.player; P.x = g.x - 40; P.y = g.y; P.a = 0; }''')
        print(await ev('() => T.act()')); await ev('() => T.G().actPrimary()'); await pg.wait_for_timeout(120); await pg.screenshot(path='fb1.png'); await pg.wait_for_timeout(700); await pg.screenshot(path='fb2.png')
        # 화면 밖 경고: 멀리 있는 경비를 경보 상태로
        await ev('''() => { const S = T.S(); const g = S.guards.find(g => !g.civ && !g.dog && g.state !== 'DEAD' && g !== window.__g); g.x = S.player.x + 900; g.y = S.player.y; g.state = 'ALERT'; g.lastSeen = { x: S.player.x, y: S.player.y }; }''')
        await pg.wait_for_timeout(200); await pg.screenshot(path='fb3.png')
        # 배관 오르기 전: 보는 눈
        await ev('''() => { const S = T.S(); T.freeze(); const g = window.__game.S.guards.find(g => !g.civ && !g.dog && g.state !== 'DEAD'); g.x = 13.5 * 48; g.y = 15 * 48; g.a = -Math.PI / 2; g.want = g.a; g.state = 'PATROL'; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 999; T.at(13, 11); S.player.a = -Math.PI / 2; }''')
        await pg.wait_for_timeout(300); await pg.screenshot(path='fb4.png'); print(await ev('() => T.act()'))
        print(errs[:3]); await b.close()
asyncio.run(main())
