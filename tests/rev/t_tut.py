import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(window.__game.STAGES.findIndex(s => s.id === "t0"))'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await pg.wait_for_timeout(300)
        st = lambda: ev('() => [T.S().tutI || 0, T.act(), T.S().alevel, T.S().over]')
        async def to(x, y, a=0, extra=''): await ev(f'() => {{ const P = T.S().player; P.x = {x}; P.y = {y}; P.a = {a}; P.cover = null; {extra} }}'); await pg.wait_for_timeout(250)
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(900); await pg.keyboard.up('ArrowRight'); print('1', await st())
        await pg.keyboard.press('m'); await pg.wait_for_timeout(300); await pg.keyboard.press('m'); await pg.wait_for_timeout(300); print('2', await st())
        await pg.keyboard.press('ControlLeft'); await pg.wait_for_timeout(300); print('3', await st())
        await ev('() => { const P = T.S().player, g = T.S().guards[0]; P.x = g.x - 60; P.y = g.y; P.a = 0; }'); await pg.wait_for_timeout(200)
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(900); print('4', await st())
        await ev('() => { const P = T.S().player, c = T.S().corpses[0]; P.x = c.x - 20; P.y = c.y; }'); await pg.wait_for_timeout(200); await pg.keyboard.press('e'); await pg.wait_for_timeout(300)
        await to(9 * 48 + 24, 8 * 48 + 20, -1.5708); await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(700); print('5', await st())
        await pg.keyboard.down('AltLeft'); await pg.wait_for_timeout(400); await pg.keyboard.up('AltLeft'); await pg.wait_for_timeout(200); print('6', await st())
        await to(15 * 48 + 24, 7 * 48 + 14); await pg.wait_for_timeout(600); print('7', await st())
        for i in range(60):
            a = await st()
            if 'pull' in a[1]: await pg.keyboard.press('Space'); await pg.wait_for_timeout(700); break
            if i % 8 == 0: print('  g1', await ev('() => { const g = T.S().guards[1], P = T.S().player; return [g.state, Math.round(g.x), Math.round(g.y), Math.round(P.x), Math.round(P.y), !!P.cover, g.meter.toFixed(2), g.seen]; }'))
            await pg.wait_for_timeout(250)
        print('8', await st())
        await ev('() => { const S = T.S(), P = S.player; P.x = S.exit.x; P.y = S.exit.y; }'); await pg.wait_for_timeout(1500)
        print('basic end', await ev('() => [T.S().over, document.getElementById("end").dataset.win, T.S().tutI, document.getElementById("endSub").textContent.slice(0, 30)]'))
        await ev('() => window.__game.start(window.__game.STAGES.findIndex(s => s.id === "t1"))'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.wait_for_timeout(300)  # 연습 2 · 고급
        await to(16 * 48 + 24, 7 * 48 + 24, -1.5708); await pg.wait_for_timeout(400); print('9', await st())
        await ev('() => { const P = T.S().player, g = T.S().guards[2]; P.x = g.x - 230; P.y = g.y; P.a = 0; P.cover = null; }'); await pg.wait_for_timeout(200)
        await pg.keyboard.down('v'); await pg.wait_for_timeout(150); await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(500); await pg.keyboard.up('ArrowRight'); await pg.keyboard.up('v'); await pg.wait_for_timeout(1800)
        print('10', await st(), await ev('() => [T.S().guards[2].state, T.S().stats.stonesUsed]'))
        await pg.wait_for_timeout(1500)
        await ev('() => { const P = T.S().player, g = T.S().guards[2]; P.x = g.x - Math.cos(g.a) * 55; P.y = g.y - Math.sin(g.a) * 55; P.a = g.a; }'); await pg.wait_for_timeout(150)
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(900); print('11', await st())
        await to(20 * 48 + 24, 10 * 48 + 24, 1.5708); print(' pole', await st())
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(1500); print('12', await st(), await ev('() => !!T.S().player.wire'))
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(3500); await pg.keyboard.up('ArrowRight'); print(' ride', await st())
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(1800); print('13', await st(), await ev('() => [!!T.S().player.wire, Math.round(T.S().player.x / 48)]'))
        await to(25 * 48 + 24, 5 * 48 + 24, 0, 'P.z = 0;'); await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(2500); print('14', await st())
        await ev('() => { const P = T.S().player; P.x = 28 * 48 + 24; P.y = 5 * 48 + 30; }')
        for i in range(40):
            a = await st()
            if a[1].endswith('drop'): await pg.keyboard.press('Space'); await pg.wait_for_timeout(1300); break
            await pg.wait_for_timeout(250)
        print('15', await st())
        await to(36 * 48 + 24, 7 * 48 + 20, -1.5708, 'P.z = 0;'); print(' door', await st())
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(4200); print('16', await st())
        await ev('() => { const S = T.S(), P = S.player, it = S.items[0]; P.x = it.x; P.y = it.y; }'); await pg.wait_for_timeout(500); print('17', await st())
        await ev('() => { const S = T.S(), P = S.player; P.x = S.exit.x; P.y = S.exit.y; }'); await pg.wait_for_timeout(1500)
        print('end', await ev('() => [T.S().over, document.getElementById("end").dataset.win]'))
        print(errs[:3]); await b.close()
asyncio.run(main())
