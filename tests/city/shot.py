import asyncio, json, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/s_'
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); g.S.toasts.length = 0; }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        print('VALIDATE', json.dumps(await pg.evaluate('() => window.__game.validate()'), ensure_ascii=False))
        await pg.screenshot(path=OUT+'1_intro.png')
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT+'2_brief.png')
        await pg.evaluate(SKIP)
        await pg.evaluate('() => { const S = window.__game.S, P = S.player; P.x = 19*48; P.y = 12*48; window.__game.setZoom(0.5); }')
        await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'3_overview.png')
        await pg.evaluate('() => { const S = window.__game.S, P = S.player; P.x = 9*48+24; P.y = 10*48+30; P.a = -Math.PI/2; window.__game.setZoom(0.85); S.toasts.length = 0; }')
        await pg.wait_for_timeout(900); await pg.screenshot(path=OUT+'4_pole.png')
        print('PA', await pg.evaluate('() => window.__game.primaryAction().label'))
        await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_timeout(300)
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(1800); await pg.keyboard.up('ArrowRight')
        print('ON WIRE', await pg.evaluate('() => { const P = window.__game.S.player; return {z: P.z, s: P.wire && P.wire.s, x: P.x/48, y: P.y/48, pa: window.__game.primaryAction().label}; }'))
        await pg.evaluate('() => { window.__game.S.toasts.length = 0; }')
        await pg.screenshot(path=OUT+'5_wire.png')
        print(errs[:5]); await b.close()
asyncio.run(main())
