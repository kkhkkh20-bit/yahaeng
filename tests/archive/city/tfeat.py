import asyncio, json
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/f_'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1000); ev = pg.evaluate
        for si in range(3):
            await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200); await ev(SKIP)
            print(si, await ev('''() => { const S = window.__game.S; return { gas: S.ladders.filter(l => l.gas).length, balc: S.ladders.filter(l => l.kind === 'balc').length, winNodes: S.wires.flatMap(w => [w.a, w.b]).filter(n => n.win).length, roofNodes: S.wires.flatMap(w => [w.a, w.b]).filter(n => n.roof).length }; }'''))
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(200); await ev(SKIP)
        CLR = 'window.__game.S.guards.forEach(g => { g.meter = 0; }); window.__game.S.alevel = 0;'
        # 가스관
        r = await ev('() => { const G = window.__game, S = G.S, P = S.player; const l = S.ladders.find(l => l.gas); P.fl = 0; G.setLayer(0); P.z = 0; P.x = l.x; P.y = l.y; const a1 = G.primaryAction().label; G.actPrimary(); return [a1, P.z, P.y/48, G.rLv(Math.floor(P.x/48), Math.floor(P.y/48)), G.primaryAction().label]; }')
        print('gas', r)
        # 베란다
        r = await ev('() => { const G = window.__game, S = G.S, P = S.player; const l = S.ladders.find(l => l.kind === "balc"); P.fl = 0; G.setLayer(0); P.z = 0; P.x = l.x; P.y = l.y; P.a = -Math.PI/2; const a1 = G.primaryAction().label; G.actPrimary(); const st = [P.fl, P.x/48, P.y/48, G.tileG(Math.floor(P.x/48), Math.floor(P.y/48))]; const a2 = G.primaryAction().label; const a3 = (G.secondaryAction() || {}).label; return [a1, st, a2, a3, l.tx, l.ty]; }')
        print('balc', r)
        await ev('() => { const G = window.__game; G.setZoom(0.85); ' + CLR + ' }'); await pg.wait_for_timeout(500); await pg.screenshot(path=OUT+'1_balc_in.png')
        r = await ev('() => { const G = window.__game, S = G.S, P = S.player; const a = G.primaryAction(); G.actPrimary(); return [a.label, P.fl, P.y/48]; }')
        print('balc down', r)
        await ev('() => { const G = window.__game, S = G.S, P = S.player; P.y += 96; ' + CLR + ' }'); await pg.wait_for_timeout(600); await pg.screenshot(path=OUT+'2_facade.png')
        # 옥상에서 줄 중간 잡기: 각 줄마다 근처 옥상 칸 찾기
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; let n = 0, ex = null;
          for (const w of S.wires) for (let i = 2; i <= 38; i += 3) { const s = i/40, h = G.wirePt(w, s), z = Math.round(w.a.z + (w.b.z - w.a.z) * s);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const tx = Math.floor(h.x/48) + dx, ty = Math.floor(h.y/48) + dy, lv = G.rLv(tx, ty); if (lv && Math.abs(lv - z) <= 1) { P.z = lv; P.fl = 0; G.setLayer(0); P.wire = null; P.x = Math.min(Math.max(h.x, tx*48+14), tx*48+34); P.y = Math.min(Math.max(h.y, ty*48+14), ty*48+34); const a = G.primaryAction(); if (a.k === 'wireOn') { n++; if (!ex) ex = [a.label, tx, ty, lv]; } } } }
          return [n, ex]; }''')
        print('mid grab spots', r)
        r = await ev('() => { const G = window.__game, S = G.S, P = S.player; const a = G.primaryAction(); if (a.k !== "wireOn") return null; G.actPrimary(); const b = G.primaryAction(); return [P.z, !!P.wire, b.label]; }')
        print('after grab', r)
        await ev('() => { ' + CLR + ' }'); await pg.wait_for_timeout(400); await pg.screenshot(path=OUT+'3_midgrab.png')
        print(errs[:5]); await b.close()
asyncio.run(main())
