import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); c = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=2); pg = await c.new_page(); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await ev(SKIP)
        cv = '() => { const c = document.getElementById("game"); return [c.width, c.clientWidth]; }'
        print('before', await ev(cv))
        await pg.wait_for_timeout(8000)
        print('after', await ev(cv), await ev('() => [...document.querySelectorAll(".toast")].map(t => t.textContent).join(" | ")'))
        fps = await ev('''() => new Promise(r => { let n = 0, t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); })''')
        print('fps now', round(fps, 1)); await b.close()
asyncio.run(main())
