import asyncio, json
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/r_'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1000); ev = pg.evaluate
        for si in range(3):
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.wait_for_timeout(200)
            st = await ev('''() => { const G = window.__game, S = G.S, P = S.player;
              const near = S.guards.filter(g => !g.civ && !g.fl).map(g => Math.round(Math.hypot(g.x-P.x, g.y-P.y)/48)).sort((a,b)=>a-b).slice(0,3);
              const bad = S.ladders.filter(l => l.tz > 0).filter(l => G.rLv(Math.floor((l.rx ?? l.ux)/48), Math.floor((l.ry ?? l.uy)/48)) !== l.tz).map(l => [l.kind, l.tx, l.ty, l.tz]);
              const badW = S.wires.flatMap(w => [w.a, w.b]).filter(n => n.roof && G.facadeRow(Math.floor(n.x/48), Math.floor(n.y/48))).length;
              const badG = S.guards.filter(g => g.z && G.facadeRow(Math.floor(g.x/48), Math.floor(g.y/48))).length;
              return { entry: !!S.entrySel, start: [P.x/48, P.y/48], near, bad, badW, badG }; }''')
            await pg.wait_for_timeout(8000)
            st2 = await ev('() => { const S = window.__game.S; return { alevel: S.alevel, maxMeter: Math.max(...S.guards.map(g => g.meter||0)).toFixed(2), over: S.over }; }')
            print(si, json.dumps(st, ensure_ascii=False), st2)
        # 옥상 남쪽 끝으로 걸어가기
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP)
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const b = G.BLD.find(b => b.facade && b.h >= 3 && !b.piloti);
          P.z = b.h; P.fl = 0; G.setLayer(0); P.x = (b.x0 + 2) * 48 + 24; P.y = (b.y0 + 1) * 48 + 24; S.alevel = 0; S.guards.forEach(g => { g.meter = 0; });
          return { y0: b.y0, y1: b.y1, fh: b.fh, edge: b.y1 - b.fh }; }''')
        await pg.keyboard.down('ArrowDown'); await pg.wait_for_timeout(2500); await pg.keyboard.up('ArrowDown')
        r2 = await ev('() => { const P = window.__game.S.player; return { ty: P.y/48, z: P.z, jump: window.__game.jumpTarget(), pa: window.__game.primaryAction().label }; }')
        print('roof walk', r, r2)
        await pg.screenshot(path=OUT+'1b_roofedge.png')
        # 굴러가는 시간: 점호 없는지
        await ev('() => { window.__game.S.rollT = 0.5; }'); await pg.wait_for_timeout(1500)
        print('toasts', await ev('() => window.__game.S.toasts.map(t => t.text || t.msg)'))
        print(errs[:5]); await b.close()
asyncio.run(main())
