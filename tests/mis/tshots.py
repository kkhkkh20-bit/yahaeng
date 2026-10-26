import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1400, 'height': 860}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for st in range(4):
            await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.keyboard.press('Digit1')
            await ev('() => { const G = window.__game, S = G.S; G.setZoom(0.45); S.player.x = S.player.x; document.getElementById("hud").style.visibility = "hidden"; const W = G.BLD.reduce((m, b) => Math.max(m, b.x1), 0); S.player.x = W * 24; S.player.y = 14 * 48; }')
            await pg.wait_for_timeout(1500); await pg.screenshot(path=f'ov{st}.png')
        # 전깃줄 매달림
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP)
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; G.setZoom(2.2); document.getElementById("hud").style.visibility = "visible";
          const w = S.wires[0]; P.wire = { w, s: 0.4 }; P.z = 0; const h = G.wirePt(w, 0.4); P.x = h.x; P.y = h.y + 40; return [w.a.tx, w.a.ty]; }''')
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(500); await pg.screenshot(path='wire.png'); await pg.keyboard.up('ArrowRight')
        print(r, errs[:3]); await b.close()
asyncio.run(main())
