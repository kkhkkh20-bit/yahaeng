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
        await ev('() => { const G = window.__game, S = G.S, P = S.player; P.fl = 0; G.setLayer(0); P.z = 0; P.x = 44*48+24; P.y = 1*48+24; G.setZoom(1); S.toasts.length = 0; }')
        await pg.wait_for_timeout(1200)
        print(await ev('() => [document.getElementById("mini").className, document.querySelector("#hud .obj").className]'))
        await pg.screenshot(path=OUT+'8_fade.png')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300); await pg.screenshot(path=OUT+'9_menu.png')
        await b.close()
asyncio.run(main())
