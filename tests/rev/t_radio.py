import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP='() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
ST='() => { const S = window.__game.S, R = S.radioCall; return [S.alevel, R ? [R.g.state, +R.t.toFixed(2), !!R.g.radio] : null, S.guards.filter(g=>g.state==="SEARCH").length]; }'
async def run(b, mode):
    pg = await b.new_page(viewport={'width':1280,'height':760}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(1500)
    await pg.evaluate('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(200)
    await pg.keyboard.down('ArrowRight')
    for i in range(30):
        await pg.wait_for_timeout(100)
        if await pg.evaluate('() => !!window.__game.S.radioCall'): break
    await pg.keyboard.up('ArrowRight')
    print(mode, 'call', await pg.evaluate(ST))
    await pg.wait_for_timeout(700); await pg.screenshot(path=f'radio_{mode}.png', clip={'x':300,'y':200,'width':400,'height':260})
    if mode == 'wait':
        for i in range(6):
            await pg.wait_for_timeout(600); print(' ', await pg.evaluate(ST))
    elif mode == 'kill':
        print(' act', await pg.evaluate('''() => { const G = window.__game, S = G.S, g = S.radioCall.g, P = S.player; P.x = g.x + Math.cos(g.a) * 40; P.y = g.y + Math.sin(g.a) * 40; P.fl = g.fl || 0; P.z = 0; P.a = Math.atan2(g.y - P.y, g.x - P.x); return G.primaryAction().label + '|' + G.primaryAction().k; }'''))
        await pg.evaluate('() => window.__game.actPrimary()')
        for i in range(5):
            await pg.wait_for_timeout(700); print(' ', await pg.evaluate(ST), await pg.evaluate('() => window.__game.S.over'))
    elif mode == 'dart':
        print(' dart', await pg.evaluate('''() => { const G = window.__game, S = G.S, g = S.radioCall.g, P = S.player; P.x = g.x + Math.cos(g.a) * 150; P.y = g.y + Math.sin(g.a) * 150; P.a = Math.atan2(g.y - P.y, g.x - P.x); P.kunai = Math.max(1, P.kunai || 0); return Object.keys(G).filter(k => /tool|throw|use/i.test(k)).join(','); }'''))
        await pg.keyboard.press('Digit3'); await pg.wait_for_timeout(100); print(' tool', await pg.inner_text('#btnTool')); await pg.keyboard.press('x'); await pg.wait_for_timeout(1500)
        print(' ', await pg.evaluate(ST), await pg.evaluate('() => window.__game.S.radioCall ? 0 : window.__game.S.stats.radioCut'))
    print(mode, 'errs', errs[:3]); await pg.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for m in ['wait']: await run(b, m)
        await b.close()
asyncio.run(main())
