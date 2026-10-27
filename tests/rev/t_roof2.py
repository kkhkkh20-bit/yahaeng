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
          let c = null; for (let y = 0; y < 60 && !c; y++) for (let x = 0; x < 60 && !c; x++) if (g.robAt(x, y) && !g.robAt(x, y + 1) && g.rLv(x, y + 1) === g.rLv(x, y)) { const sd = [2, -2, 1, -1].find(d => g.rLv(x + d, y + 1) === g.rLv(x, y) && !g.robAt(x + d, y + 1)); if (sd) c = [x, y, sd]; }
          window.__c = c; P.z = g.rLv(c[0], c[1]); P.x = c[0] * 48 + 24; P.y = (c[1] + 1) * 48 + 10; return [c, P.z]; }'''))
        await pg.wait_for_timeout(700)
        print('cover', await pg.evaluate('() => JSON.stringify(window.__game.S.player.cover)'))
        r = await pg.evaluate('''() => { const g = window.__game, S = g.S, P = S.player, q = S.guards[0]; const c = window.__c; q.z = P.z; q.fl = 0; q.x = (c[0] + c[2]) * 48 + 24; q.y = (c[1] + 1) * 48 + 24; q.a = 0; q.state = 'PATROL'; q.seen = false; q.meter = 0; q.route = [{ x: q.x, y: q.y }]; q.path = []; q.wait = 99;
          const pa = g.primaryAction(); return pa ? pa.label : null; }''')
        print('action', r)
        await pg.screenshot(path='/root/game/tests/rev/roof_cover.png'); print('errs', errs[:3]); await b.close()
asyncio.run(main())
