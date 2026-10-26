import asyncio, json
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/k_'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(200); await ev(SKIP)
        # 두꺼비집
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const fb = S.bfuses[0]; P.fl = 0; G.setLayer(0); P.z = 0; P.x = fb.x; P.y = fb.y; const a = G.primaryAction(); const before = S.lamps.filter(l => l.cut != null).length; G.actPrimary();
           return { n: S.bfuses.length, label: a.label, cut: S.lamps.filter(l => l.cut != null).length, before }; }''')
        print('bfuse', r)
        await pg.wait_for_timeout(9000)
        print('bfuse guard', await ev('() => { const S = window.__game.S; const g = S.guards.find(g => g.fuseAt); return g ? [g.state, Math.round(Math.hypot(g.x - S.bfuses[0].x, g.y - S.bfuses[0].y))] : null; }'))
        # 베란다 넘어 암살: 베란다 안쪽에 자경대원 하나 옮겨 두기
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const l = S.ladders.find(l => l.kind === 'balc'); const g = S.guards.find(g => !g.civ && !g.dog && !g.target && g.state !== 'DEAD');
           g.fl = 1; g.x = l.ux + 12; g.y = l.uy - 6; g.state = 'PATROL'; g.wait = 99; g.path = null; g.route = [{ x: g.x, y: g.y, pause: 999 }];
           P.fl = 0; G.setLayer(0); P.z = 0; P.x = l.x; P.y = l.y; const a = G.primaryAction(); G.actPrimary(); return [a.label, g.state, P.fl, S.stats.special]; }''')
        print('balc kill', r)
        # 창문 넘어 암살
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const w = S.fwindows.find(w => w.link); if (!w) return 'no link'; const L = w.link; const g = S.guards.find(g => !g.civ && !g.dog && !g.target && g.state !== 'DEAD');
           g.fl = w.fl; g.x = (L.tx + L.dir * 2) * 48 + 24; g.y = L.ty * 48 + 24; g.state = 'PATROL'; g.wait = 99; g.path = null; g.route = [{ x: g.x, y: g.y, pause: 999 }];
           P.fl = w.fl; G.setLayer(w.fl); P.z = 0; P.x = (w.tx - L.dir) * 48 + 24; P.y = w.y; const a = G.primaryAction(); G.actPrimary(); return [a.label, a.k, w.fl, g.id]; }''')
        print('win kill', r)
        await pg.wait_for_timeout(900)
        print('after', await ev('() => { const S = window.__game.S; return [S.stats.special, S.guards.filter(g => g.state === "DEAD").length]; }'))
        print(errs[:4]); await b.close()
asyncio.run(main())
