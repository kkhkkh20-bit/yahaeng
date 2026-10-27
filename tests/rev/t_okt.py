# 옥탑방에 들어가 숨기 → 나오기 (지붕 칸으로), 시체 들고 넣기
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300)
        await pg.evaluate('() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }')
        print('okt hides', await pg.evaluate('() => window.__game.S.hides.filter(h => h.type === "okt").map(h => [h.tx, h.ty, h.z])'))
        print('near', await pg.evaluate('''() => { const g = window.__game, S = g.S, P = S.player, h = S.hides.find(h => h.type === 'okt'); S.guards.forEach(q => { q.x = -9999; });
          P.z = h.z; P.x = h.tx * 48 + 24; P.y = (h.ty + 1) * 48 + 20; const a = g.primaryAction(); return a && [a.label, a.k, a.g && [a.g.x, a.g.y, a.g.z], JSON.stringify(Object.keys(a))]; }'''))
        await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_timeout(500)
        print('hidden', await pg.evaluate('() => { const P = window.__game.S.player; return [P.hide && P.hide.type, P.z]; }'))
        await pg.screenshot(path='/root/game/tests/rev/okt_in.png')
        await pg.wait_for_timeout(400); await pg.keyboard.down('ArrowDown'); await pg.wait_for_timeout(300); await pg.keyboard.up('ArrowDown'); await pg.wait_for_timeout(300)
        print('out', await pg.evaluate('() => { const g = window.__game, P = g.S.player; return [!!P.hide, P.z, Math.floor(P.x / 48), Math.floor(P.y / 48), g.rLv(Math.floor(P.x / 48), Math.floor(P.y / 48)), g.robAt(Math.floor(P.x / 48), Math.floor(P.y / 48))]; }'))
        await pg.screenshot(path='/root/game/tests/rev/okt_out.png')
        print('errs', errs[:3]); await b.close()
asyncio.run(main())
