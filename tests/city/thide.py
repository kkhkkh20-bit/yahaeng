import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/h_'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]; pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        for si in range(5):
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200); await ev(SKIP)
            print(si, await ev('() => { const S = window.__game.S, c = {}; S.hides.forEach(h => c[h.type] = (c[h.type] || 0) + 1); return c; }'))
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(200); await ev(SKIP)
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const h = S.hides.find(h => h.type === 'wardrobe' && h.fl === 1); P.fl = 1; G.setLayer(1); P.z = 0;
           const tx = h.tx, ty = h.ty; let pos = null; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (!'#NKVY'.includes(G.tileG(tx + dx, ty + dy))) { pos = [tx + dx, ty + dy]; break; }
           P.x = pos[0] * 48 + 24; P.y = pos[1] * 48 + 24; const a = G.primaryAction(); G.actPrimary(); return [a.label, !!P.hide, P.hide && P.hide.type]; }''')
        print('wardrobe', r)
        await ev('() => { const S = window.__game.S; window.__game.setZoom(0.9); S.toasts.length = 0; }'); await pg.wait_for_timeout(500); await pg.screenshot(path=OUT+'1_wardrobe.png')
        # 클럽 겹침
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(200); await ev(SKIP); await pg.wait_for_timeout(10000)
        print('min gap px', await ev('() => { const S = window.__game.S, L = S.guards.filter(g => g.state !== "DEAD"); let m = 1e9; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if ((L[i].fl||0) === (L[j].fl||0)) m = Math.min(m, Math.hypot(L[i].x - L[j].x, L[i].y - L[j].y)); return Math.round(m); }'))
        print(errs[:3]); await b.close()
asyncio.run(main())
