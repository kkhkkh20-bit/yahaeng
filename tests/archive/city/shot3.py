import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/f_'
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); g.S.toasts.length = 0; }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1200)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP)
        await pg.wait_for_timeout(3000)
        # 사무실 빌라 3층 실내
        await pg.evaluate('() => { const G = window.__game, S = G.S, P = S.player; P.fl = 2; G.setLayer(2); P.x = 15*48+24; P.y = 16*48+20; P.a = -Math.PI/2; G.setZoom(0.85); S.toasts.length = 0; }')
        await pg.wait_for_timeout(500); await pg.evaluate('() => { window.__game.S.toasts.length = 0; }'); await pg.screenshot(path=OUT+'1_3F.png')
        # 2층 (창고 빌라)
        await pg.evaluate('() => { const G = window.__game, S = G.S, P = S.player; P.fl = 1; G.setLayer(1); P.x = 31*48+24; P.y = 6*48+24; P.a = 0; G.setZoom(0.85); S.toasts.length = 0; }')
        await pg.wait_for_timeout(500); await pg.evaluate('() => { window.__game.S.toasts.length = 0; }'); await pg.screenshot(path=OUT+'2_2F.png')
        # 창문에 걸린 전깃줄 위 (바깥에서 정면벽)
        await pg.evaluate('''() => { const G = window.__game, S = G.S, P = S.player; P.fl = 0; G.setLayer(0); const w = S.wires.find(w => w.b.win && w.b.tx === 15); P.wire = {w, s: 0.55}; P.z = 2; const gp = G.wirePt; P.x = w.a.x + (w.b.x - w.a.x)*0.55; P.y = w.a.y + (w.b.y - w.a.y)*0.55; G.setZoom(0.85); S.toasts.length = 0; }''')
        await pg.wait_for_timeout(500); await pg.evaluate('() => { window.__game.S.toasts.length = 0; }'); await pg.screenshot(path=OUT+'3_winwire.png')
        print(errs[:5]); await b.close()
asyncio.run(main())
