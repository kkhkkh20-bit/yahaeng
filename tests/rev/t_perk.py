import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); c = await b.new_context(viewport={'width': 1280, 'height': 900}); pg = await c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        print('none', await ev('() => document.getElementById("perkList").textContent'))
        # 별 10개 저장해 두고 다시 열기
        await ev('''() => { const o = {}; ['m1','m2','m3','m4','m5'].forEach(id => o[id] = { _clear: 1, ghost: 1 }); localStorage.setItem('yahaeng.ch', JSON.stringify(o)); }''')
        ids = await ev('() => window.__game.S ? 0 : 0')
        await pg.reload(); await pg.wait_for_timeout(1500)
        print('after', await ev('() => document.getElementById("perkList").textContent'))
        await pg.screenshot(path='perks.png', full_page=False)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP)
        print('game', await ev('() => { const S = window.__game.S; return [S.perks, S.player.picks, S.player.kunai, S.player.stones]; }'))
        print(errs[:3]); await b.close()
asyncio.run(main())
