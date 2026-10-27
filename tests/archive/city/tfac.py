import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/f_'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800}); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(200); await ev(SKIP)
        print(await ev('() => { const G = window.__game, S = G.S, P = S.player; const l = S.ladders.filter(l => l.kind === "balc")[2]; P.fl = 0; G.setLayer(0); P.z = 0; P.x = l.x; P.y = l.y + 30; P.a = -Math.PI/2; G.setZoom(0.9); S.toasts.length = 0; return [l.tx, l.ty, G.BLD[l.b].gas, G.BLD[l.b].balc]; }'))
        await pg.wait_for_timeout(700); await pg.screenshot(path=OUT+'5_facade.png')
        await b.close()
asyncio.run(main())
