import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/t_'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]; pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        for si in [1, 4, 0]:
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200); await ev(SKIP)
            await pg.wait_for_timeout(15000)
            r = await ev('() => { const S = window.__game.S; return { chats: S.guards.filter(g => g.chat).length, saying: S.guards.filter(g => g.say).map(g => (g.civ ? "주민:" : "경비:") + g.say).slice(0, 4) }; }')
            print(si, r)
            if si == 1:
                await ev('() => { const G = window.__game, S = G.S, P = S.player; const g = S.guards.find(g => g.say && (g.fl||0) === 0) || S.guards.find(g => g.chat && (g.fl||0) === 0); if (g) { P.fl = 0; G.setLayer(0); P.z = 0; P.x = g.x + 120; P.y = g.y + 80; P.hide = null; } G.setZoom(0.9); S.toasts.length = 0; }')
                await pg.wait_for_timeout(700); await pg.screenshot(path=OUT+'1.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
