# 지붕 위 옥탑방 벽에 기대기 → 옆을 지나는 지붕 경비 끌어당겨 암살 표시
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300)
        await pg.evaluate('() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }')
        print(await pg.evaluate('''() => { const g = window.__game, S = g.S, P = S.player; S.guards.forEach((q, i) => { if (i) { q.x = -9999; q.y = -9999; } });
          P.z = 2; P.x = 3 * 48 + 24; P.y = 5 * 48 + 10; return [g.robAt(3, 4), g.rLv(3, 5)]; }'''))
        await pg.wait_for_timeout(700)
        print('cover', await pg.evaluate('() => JSON.stringify(window.__game.S.player.cover)'))
        r = await pg.evaluate('''() => { const g = window.__game, S = g.S, P = S.player, q = S.guards[0]; q.z = 2; q.fl = 0; q.x = 5 * 48 + 24; q.y = 5 * 48 + 24; q.a = 0; q.state = 'PATROL'; q.seen = false; q.meter = 0; q.route = [{ x: q.x, y: q.y }]; q.path = []; q.wait = 99;
          const pa = g.primaryAction(); return pa ? pa.label : null; }''')
        print('action', r)
        await pg.screenshot(path='/root/game/tests/rev/roof_cover.png'); print('errs', errs[:3]); await b.close()
asyncio.run(main())
