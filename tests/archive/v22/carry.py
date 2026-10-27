import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 900, 'height': 600}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await ev('() => { window.__game.setZoom(3.2); document.getElementById("hud").style.visibility = "hidden"; }')
        # 처치 직후 쓰러지는 동작
        await ev('''() => { const S = T.S(); T.freeze(); S.camLead = 0; const g = S.guards.find(g => !g.civ && !g.dog && !g.target && !g.fl); window.__g = g;
          g.x = 8 * 48 + 24; g.y = 13 * 48 + 24; g.a = 0; g.route = [{ x: g.x, y: g.y, pause: 99 }]; g.path = null; const P = S.player; P.x = g.x - 30; P.y = g.y; P.a = 0; }''')
        await pg.wait_for_timeout(200)
        print(await ev('() => { const a = window.__game.primaryAction(); window.__game.actPrimary(); return a.label; }'))
        for i, w in enumerate([60, 200, 600]): await pg.wait_for_timeout(w); await pg.screenshot(path=f'k{i}.png')
        # 메기
        print(await ev('() => { const G = window.__game; return G.secondaryAction ? 1 : 0; }'))
        await pg.keyboard.press('KeyW'); await pg.wait_for_timeout(200)
        print(await ev('() => !!window.__game.S.player.carrying'))
        for key, nm in [('ArrowRight', 'cE'), ('ArrowDown', 'cS'), ('ArrowLeft', 'cW'), ('ArrowUp', 'cN')]:
            await pg.keyboard.down(key); await pg.wait_for_timeout(450); await pg.screenshot(path=nm + '.png'); await pg.keyboard.up(key)
        await pg.wait_for_timeout(300); await pg.screenshot(path='cI.png')
        await pg.keyboard.press('KeyW'); await pg.wait_for_timeout(80); await pg.screenshot(path='cD0.png'); await pg.wait_for_timeout(400); await pg.screenshot(path='cD1.png')
        # 붙잡기
        await ev('''() => { const S = T.S(); const g = S.guards.find(o => o !== window.__g && !o.civ && !o.dog && !o.target && !o.fl && !o.elite && !o.hasKey);
          g.x = 26 * 48 + 24; g.y = 13 * 48 + 24; g.a = 0; g.want = 0; g.wait = 99; g.ri = 0; g.state = 'PATROL'; g.meter = 0; S.alevel = 0; for (const c of S.corpses) c.stashed = true; g.route = [{ x: g.x, y: g.y, pause: 99 }]; g.path = null; const P = S.player; P.x = g.x - 48; P.y = g.y; P.a = 0; window.__h = g; }''')
        await pg.wait_for_timeout(150)
        print(await ev('() => { const G = window.__game, g = window.__h, P = G.S.player; return [G.primaryAction().label, G.secondaryAction().label, G.S.player.captive, g.state, Math.round(g.x - P.x), Math.round(g.y - P.y), g.a, g.elite, P.carrying, P.strikeT]; }'))
        await pg.keyboard.press('KeyW'); await pg.wait_for_timeout(150); print(await ev('() => !!window.__game.S.player.captive'))
        for key, nm in [('ArrowRight', 'gE'), ('ArrowDown', 'gS'), ('ArrowLeft', 'gW')]:
            await pg.keyboard.down(key); await pg.wait_for_timeout(400); await pg.screenshot(path=nm + '.png'); await pg.keyboard.up(key)
        await pg.wait_for_timeout(200); await pg.screenshot(path='gI.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
