import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]; pg = await b.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1200); ev = pg.evaluate
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.keyboard.press('Digit1'); await pg.wait_for_timeout(200)
        cid = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const c = S.guards.find(g => g.civ && g.state !== 'SLEEP' && g.state !== 'DEAD');
           P.fl = c.fl; G.setLayer(c.fl); const a = c.a; P.x = c.x + Math.cos(a) * 40; P.y = c.y + Math.sin(a) * 40; c.meter = 0.9; return c.id; }''')
        await pg.wait_for_timeout(900)
        print(await ev(f'() => {{ const S = window.__game.S, g = S.guards[{cid}]; return [g.state, S.alevel, S.stats.screams, S.guards.filter(o => !o.civ && o.state === "SUSPICIOUS").length]; }}'))
        print(await ev('''() => { const G = window.__game, S = G.S, P = S.player; const c = S.guards.find(g => g.civ && g.state === 'SLEEP'); P.fl = c.fl; G.setLayer(c.fl); P.x = c.x + 30; P.y = c.y; P.mode = 'sneak'; const l = G.primaryAction().label; G.actPrimary(); return [l, c.state, S.stats.ko]; }'''))
        print(errs); await b.close()
asyncio.run(main())
