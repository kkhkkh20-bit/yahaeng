import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/k_'
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); g.S.toasts.length = 0; }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1200)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(2500)
        # 골목 B 지상 (필로티 앞)
        await pg.evaluate('() => { const G = window.__game, S = G.S, P = S.player; P.x = 22*48+24; P.y = 17*48+30; P.a = -Math.PI/2; G.setZoom(0.9); S.toasts.length = 0; }')
        await pg.wait_for_timeout(500); await pg.evaluate('() => { window.__game.S.toasts.length = 0; }'); await pg.screenshot(path=OUT+'1_alley.png')
        # 필로티 주차장 안
        await pg.evaluate('() => { const G = window.__game, S = G.S, P = S.player; P.x = 25*48+24; P.y = 15*48+24; P.a = -Math.PI/2; S.toasts.length = 0; }')
        await pg.wait_for_timeout(500); await pg.evaluate('() => { window.__game.S.toasts.length = 0; }'); await pg.screenshot(path=OUT+'2_piloti.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
