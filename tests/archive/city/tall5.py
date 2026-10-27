import asyncio, json
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/n_'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        for si in range(5):
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200); await ev(SKIP)
            await ev('() => { const S = window.__game.S, P = S.player; S.mind = 1e9; S.maxm = 0; S._mon = setInterval(() => { for (const g of S.guards) { if (g.civ || g.fl || g.z) continue; S.mind = Math.min(S.mind, Math.hypot(g.x-P.x, g.y-P.y)); S.maxm = Math.max(S.maxm, g.meter||0); } }, 100); }')
            await pg.wait_for_timeout(12000)
            r = await ev('() => { const S = window.__game.S; clearInterval(S._mon); return { id: window.__game.S && S.player && document.title, mind: Math.round(S.mind/48*10)/10, maxm: S.maxm.toFixed(2), alevel: S.alevel, civ: S.guards.filter(g => g.civ).length, guards: S.guards.filter(g => !g.civ).length, lamps: S.lamps.length }; }')
            print(si, r)
            await ev('() => { const G = window.__game, S = G.S, P = S.player; P.x = G.S.exit.x; P.y = 16*48; G.setZoom(0.5); S.toasts.length = 0; }')
            await pg.wait_for_timeout(600); await pg.screenshot(path=OUT+f'{si}_over3.png')
        print(errs[:5]); await b.close()
asyncio.run(main())
