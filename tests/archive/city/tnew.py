import asyncio, json
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1200)
        ev = pg.evaluate
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.wait_for_timeout(300)
        print('entrySel', await ev('() => !!window.__game.S.entrySel'))
        await pg.keyboard.press('Digit3'); await pg.wait_for_timeout(300)
        print('entry3', await ev('() => { const P = window.__game.S.player; return {wire: !!P.wire, z: P.z, sel: !!window.__game.S.entrySel}; }'))
        print('civs', await ev('() => { const S = window.__game.S; const c = S.guards.filter(g => g.civ); return {n: c.length, sleep: c.filter(g => g.state === "SLEEP").length, fl: c.map(g => g.fl||0).join("")}; }'))
        # 깨우기 + 비명
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const c = S.guards.find(g => g.civ && g.state === 'SLEEP'); P.wire = null; P.z = 0; P.fl = c.fl; G.setLayer(c.fl); P.x = c.x + 40; P.y = c.y; S.keys.ArrowLeft = false; G.input.sneakToggle = false; P.mode = 'run'; return [c.id, c.fl]; }''')
        await pg.keyboard.down('ShiftLeft'); await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(250); await pg.keyboard.up('ArrowRight'); await pg.keyboard.up('ShiftLeft'); await pg.wait_for_timeout(100)
        print('woke', await ev(f'() => window.__game.S.guards[{r[0]}].state'))
        await pg.wait_for_timeout(2500)
        print('after see', await ev(f'() => {{ const S = window.__game.S, g = S.guards[{r[0]}]; return [g.state, g.meter.toFixed(2), S.alevel, S.stats.screams||0]; }}'))
        # 기절
        r2 = await ev('''() => { const G = window.__game, S = G.S, P = S.player; S.alevel = 0; const c = S.guards.find(g => g.civ && g.state === 'SLEEP'); P.fl = c.fl; G.setLayer(c.fl); P.x = c.x + 30; P.y = c.y; P.mode = 'sneak'; return G.primaryAction().label; }''')
        print('ko label', r2); await ev('() => window.__game.actPrimary()')
        print('ko', await ev('() => { const S = window.__game.S; return [S.stats.ko, S.stats.kills, S.corpses.filter(c => c.ko).length]; }'))
        # 2번 의뢰: 장부 먼저 읽기
        await ev('() => window.__game.start(3)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.keyboard.press('Digit1'); await pg.wait_for_timeout(200)
        r3 = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const n = S.notes[0]; P.fl = n.fl; G.setLayer(n.fl); P.x = n.x + 20; P.y = n.y; return [S.notes.length, n.fl, G.primaryAction().label]; }''')
        print('note', r3); await ev('() => window.__game.actPrimary()'); await pg.wait_for_timeout(100)
        for i in range(8): await ev('() => window.__game.advanceDialog()')
        print('spare', await ev('() => { const S = window.__game.S; return [!!S.spare, S.exitOpen, document.getElementById("objective") ? document.getElementById("objective").textContent : ""]; }'))
        # 3번 의뢰
        await ev('() => window.__game.start(4)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.keyboard.press('Digit2'); await pg.wait_for_timeout(200)
        print('m3', await ev('() => { const S = window.__game.S, P = S.player; return {z: P.z, items: S.items.map(i => [i.fl, Math.floor(i.x/48), Math.floor(i.y/48)]), civ: S.guards.filter(g => g.civ).length, guards: S.guards.length}; }'))
        await pg.wait_for_timeout(3000)
        print('errs', errs[:5]); await b.close()
asyncio.run(main())
