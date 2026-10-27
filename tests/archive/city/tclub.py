import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/c_'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); errs=[]; pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await pg.mouse.click(640, 400)
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(200); await ev(SKIP)
        # 클럽 안/근처/먼 곳의 소리 배수
        print('loud', await ev('''() => { const G = window.__game, S = G.S; const c = G.S && window.__game; const B = G.BLD[2]; const p = [(B.x0 + 5) * 48, (B.y0 + 5) * 48];
            return [G.loudMul(p[0], p[1], 0), G.loudMul((B.x1 + 2) * 48, (B.y1 + 2) * 48, 0), G.loudMul(40 * 48, 5 * 48, 0), G.loudMul(p[0], p[1], 2)]; }'''))
        # 클럽 안에서 뛰기: 가까운 자경대원이 듣나
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const B = G.BLD[2]; P.fl = 0; G.setLayer(0); P.z = 0; P.x = (B.x0 + 6) * 48; P.y = (B.y0 + 6) * 48;
            const g = S.guards.find(g => !g.civ && !g.target && (g.fl || 0) === 0 && G.bldAt(Math.floor(g.x/48), Math.floor(g.y/48)) === 2); if (!g) return 'no guard';
            g.x = P.x + 150; g.y = P.y; g.a = 0; g.want = 0; g.state = 'PATROL'; g.meter = 0; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 99;
            S.noises.length = 0; G.noise(P.x, P.y, 250, 'step'); return [g.state, S.noises[0].r]; }''')
        print('run in club', r)
        await pg.wait_for_timeout(1500)
        print('audio', await ev('() => { const G = window.__game; return G.clubInfo ? G.clubInfo() : null; }'))
        await ev('() => { const G = window.__game, S = G.S; G.setZoom(0.85); S.toasts.length = 0; S.guards.forEach(g => g.meter = 0); }'); await pg.wait_for_timeout(600); await pg.screenshot(path=OUT+'1_club.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
