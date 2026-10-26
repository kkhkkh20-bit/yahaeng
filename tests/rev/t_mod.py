import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); c = await b.new_context(viewport={'width': 1280, 'height': 900}); pg = await c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1200)
        sid = await ev('() => window.__game.S ? 0 : 0')
        await ev('''() => { localStorage.setItem('yahaeng.ch', JSON.stringify({ m1: { _clear: 1, mod_reinf: 1 } })); }''')
        base = None
        for m in ['', 'reinf', 'timer', 'bright', 'bare']:
            await ev(f'() => localStorage.setItem("yahaeng.mod", "{m}")'); await pg.reload(); await pg.wait_for_timeout(1200)
            await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.wait_for_timeout(300)
            r = await ev('() => { const S = window.__game.S; const g = S.guards.find(g => !g.civ); return [S.mod, S.guards.filter(g => !g.civ).length, Math.round(S.timeLeft), S.player.picks, S.player.stones, S.player.kunai, [...document.querySelectorAll("#objective .ol")].map(e => e.textContent).filter(t => t.includes("변형")).join("")]; }')
            print(m or 'none', r)
        # 깨지 않은 의뢰에는 적용 안 됨
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await ev(SKIP)
        print('uncleared m2', await ev('() => window.__game.S.mod'))
        await ev('() => { window.__game.showEnd && 0; }')
        # 목록 표시
        await ev('() => { document.getElementById("hud").hidden = true; }')
        print(await ev('() => document.getElementById("modNote").textContent'), await ev('() => [...document.querySelectorAll(".modc")].map(e => e.textContent)'))
        print(errs[:3]); await b.close()
asyncio.run(main())
