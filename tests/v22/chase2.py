import asyncio, sys
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def trial(pg, mode, start=170, shot=None):
    ev = pg.evaluate
    await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
    r = await ev('''() => { const S = T.S(); T.freeze(); const g = S.guards.find(g => !g.civ && !g.dog && !g.target && !g.fl);
      g.x = 6 * 48 + 24; g.y = 13 * 48 + 24; g.a = 0; g.state = 'PATROL'; g.route = [{ x: 30 * 48, y: g.y, pause: 99 }, { x: 31 * 48, y: g.y, pause: 99 }]; g.ri = 0; g.path = null; g.wait = 0;
      const P = S.player; P.x = g.x - %d; P.y = g.y; P.a = 0; window.__tg = g; return [g.x, g.y]; }''' % start)
    if mode == 'run': await pg.keyboard.down('ShiftLeft')
    if mode == 'sneak': await ev('() => { window.__game.input.sneakToggle = true; }')
    await pg.keyboard.down('ArrowRight')
    out = None
    for i in range(80):
        await pg.wait_for_timeout(40)
        a = await ev("() => { const a = window.__game.primaryAction(); const g = window.__tg, P = window.__game.S.player; return [a.k + '|' + a.label, Math.round(g.x - P.x), g.state, g.hearT > 0]; }")
        if a[0].startswith('kill'):
            await ev('() => window.__game.actPrimary()'); out = ('kill_at', a); break
        if a[2] not in ('PATROL',): out = ('turned', a); break
    await pg.keyboard.up('ArrowRight'); await pg.keyboard.up('ShiftLeft'); await ev('() => { window.__game.input.sneakToggle = false; }')
    if shot: await pg.wait_for_timeout(90); await pg.screenshot(path=shot)
    await pg.wait_for_timeout(500)
    st = await ev('() => [window.__tg.state, window.__game.S.alevel]')
    return mode, out, st
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        print(await pg.evaluate('() => window.__game.setZoom(1.6)'))
        print(await trial(pg, 'run', 330))
        print(await trial(pg, 'run', 450)); print(await trial(pg, 'run', 200)); print(await trial(pg, 'walk', 450))
        print(errs[:3]); await b.close()
asyncio.run(main())
