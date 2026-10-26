import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/cam_'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]; pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(200); await ev(SKIP)
        print('cams', await ev('() => window.__game.S.cams.map(c => [c.tx, c.ty, c.fl])'))
        # 카메라 앞에 서 있기
        await ev('''() => { const G = window.__game, S = G.S, P = S.player; const c = S.cams[1]; S.guards.forEach(g => { if (!g.civ) { g.x = -3000; g.route = [{ x: -3000, y: -3000, pause: 999 }]; } }); S.camT = c; P.fl = 0; G.setLayer(0); P.z = 0; P.x = c.x; P.y = c.y + 110; c.base = Math.PI / 2; c.sweep = 0.01; }''')
        await pg.wait_for_timeout(300)
        await ev('() => { window.__game.setZoom(0.9); window.__game.S.toasts.length = 0; }'); await pg.screenshot(path=OUT+'1.png')
        await pg.wait_for_timeout(1500)
        print('seen', await ev('() => { const S = window.__game.S, c = S.camT; return [c.meter.toFixed(2), c.cool > 0, S.alevel]; }'))
        # 다트로 부수기
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player, c = S.cams[2]; c.cool = 0; P.x = c.x - 60; P.y = c.y + 150; P.a = Math.atan2(c.y - P.y, c.x - P.x); G.selectTool ? 0 : 0; G.input.tool = 'kunai'; const t = G.kunaiTarget(); return t ? t.type : null; }''')
        print('dart target', r)
        await pg.keyboard.press('Digit3'); await ev('() => { const G = window.__game, S = G.S, P = S.player, c = S.cams[2]; P.a = Math.atan2(c.y - P.y, c.x - P.x); }'); await pg.keyboard.down('KeyE'); await pg.wait_for_timeout(150); await pg.keyboard.up('KeyE')
        await pg.wait_for_timeout(600)
        print('broken', await ev('() => window.__game.S.cams[2].broken'))
        print(errs[:3]); await b.close()
asyncio.run(main())
