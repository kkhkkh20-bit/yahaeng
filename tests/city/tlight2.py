import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/L2_'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]; pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(200); await ev(SKIP)
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const g = S.guards.find(g => g.torch && !g.fl);
          S.guards.forEach(o => { if (o !== g && !o.civ) { o.x = -3000; o.route = [{ x: -3000, y: -3000, pause: 999 }]; o.ri = 0; } });
          g.x = 16.5 * 48; g.y = 26 * 48; g.a = Math.PI / 2; g.want = g.a; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.ri = 0; g.wait = 99; g.state = 'PATROL';
          P.fl = 0; G.setLayer(0); P.z = 0; P.x = g.x; P.y = g.y + 120; const inBeam = G.lightAt(P.x, P.y); P.x = g.x + 90; const out = G.lightAt(P.x, P.y); P.x = g.x; P.y = g.y + 120;
          return [S.guards.filter(g => g.torch).length, inBeam.toFixed(2), out.toFixed(2)]; }''')
        print('torches, light in beam, beside', r)
        await ev('() => { const G = window.__game; G.setZoom(0.85); G.S.toasts.length = 0; }'); await pg.wait_for_timeout(500); await pg.screenshot(path=OUT+'1_torch.png')
        # 유리 위 살금살금 소리 크기
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; P.x = 15 * 48 + 24; P.y = 33 * 48 + 24; return [G.tileG(15, 33), S.player.x]; }''')
        await pg.keyboard.press('KeyR'); await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(900); await pg.keyboard.up('ArrowRight')
        print('glass step', r, await ev('() => window.__game.S.noises.map(n => Math.round(n.r))'))
        await ev('() => { const G = window.__game, S = G.S, P = S.player; P.x = 20 * 48; P.y = 32 * 48; G.setZoom(0.9); S.toasts.length = 0; }'); await pg.wait_for_timeout(500); await pg.screenshot(path=OUT+'2_mat.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
