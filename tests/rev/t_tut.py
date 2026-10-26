import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(5)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await pg.wait_for_timeout(300)
        step = lambda: ev('() => [T.S().tutI || 0, T.act(), T.S().alevel]')
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(500); await pg.keyboard.up('ArrowRight'); print('1', await step())
        await pg.keyboard.press('ControlLeft'); await pg.wait_for_timeout(200); print('2', await step())
        await ev('() => { const P = T.S().player, g = T.S().guards[0]; P.x = g.x - 60; P.y = g.y; P.a = 0; }'); await pg.wait_for_timeout(150); print(' act', await step())
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(900); print('3', await step())
        await ev('() => { const P = T.S().player, c = T.S().corpses[0]; P.x = c.x - 20; P.y = c.y; }'); await pg.wait_for_timeout(150)
        print(' z', await ev('() => T.G().S && 0')); await pg.keyboard.press('z'); await pg.wait_for_timeout(400)
        await ev('() => { const P = T.S().player; P.x = 9 * 48 + 24; P.y = 8 * 48 + 20; P.a = -Math.PI / 2; }'); await pg.wait_for_timeout(200); print(' at bin', await step())
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(700); print('4', await step())
        await ev('() => { const P = T.S().player; P.x = 15 * 48 + 24; P.y = 7 * 48 + 14; }'); await pg.wait_for_timeout(600); print('5', await step(), await ev('() => { const P = T.S().player; return [!!P.cover, Math.round(P.x), Math.round(P.y), P.idleWall, P.mode, P.strikeT, !!P.carrying, !!P.hide, !!P.pick, !!T.G().S.keypad]; }'))
        for i in range(40):
            a = await step()
            if 'pull' in a[1]: await pg.keyboard.press('Space'); await pg.wait_for_timeout(600); break
            await pg.wait_for_timeout(250)
        print('6', await step())
        await ev('() => { const P = T.S().player, g = T.S().guards[2]; P.x = g.x - 200; P.y = g.y; P.a = -0.4; P.cover = null; }'); await pg.wait_for_timeout(200)
        await pg.keyboard.press('x'); await pg.wait_for_timeout(1500); print('7', await step(), await ev('() => [T.S().guards[2].state, Math.round(T.S().guards[2].x / 48), Math.round(T.S().guards[2].y / 48)]'))
        await pg.wait_for_timeout(1500)
        await ev('() => { const P = T.S().player, g = T.S().guards[2]; P.x = g.x - Math.cos(g.a) * 60; P.y = g.y - Math.sin(g.a) * 60; P.a = g.a; }'); await pg.wait_for_timeout(150); print(' act', await step())
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(900); print('8', await step())
        await ev('() => { const P = T.S().player; P.x = 25 * 48 + 24; P.y = 5 * 48 + 24; P.a = 0; }'); await pg.wait_for_timeout(200); print(' ladder', await step())
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(2500); print('9', await step(), await ev('() => [T.S().player.z, Math.round(T.S().player.x/48), Math.round(T.S().player.y/48)]'))
        await ev('() => { const P = T.S().player; P.x = 28 * 48 + 24; P.y = 5 * 48 + 30; }')
        for i in range(40):
            a = await step()
            if a[1].endswith('drop'): await pg.keyboard.press('Space'); await pg.wait_for_timeout(1200); break
            await pg.wait_for_timeout(250)
        print('10', await step())
        await ev('() => { const S = T.S(), P = S.player; P.z = 0; const w = S.windows.find(w => w.b === 1 && w.st === "lock" && w.ty === 6); P.x = w.x; P.y = w.y + 48; P.a = -Math.PI / 2; window.__w = w; }'); await pg.wait_for_timeout(200); print(' pick', await step())
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(2200); print('11', await step())
        await ev('() => { const S = T.S(), P = S.player, it = S.items[0]; P.x = it.x; P.y = it.y; }'); await pg.wait_for_timeout(500); print('12', await step(), await ev('() => [T.S().exitOpen]'))
        await ev('() => { const S = T.S(), P = S.player; P.x = S.exit.x; P.y = S.exit.y; }'); await pg.wait_for_timeout(1500)
        print('end', await ev('() => [T.S().over, document.getElementById("end").dataset.win, !document.getElementById("btnNext").hidden]'))
        print(errs[:3]); await b.close()
asyncio.run(main())
