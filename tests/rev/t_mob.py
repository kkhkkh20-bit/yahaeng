import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vw, vh in [(390, 844), (360, 740), (844, 390)]:
            c = await b.new_context(viewport={'width': vw, 'height': vh}, has_touch=True, is_mobile=True, device_scale_factor=2); pg = await c.new_page()
            await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
            await pg.evaluate('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(800)
            r = await pg.evaluate('''() => { const out = []; const W = innerWidth; for (const el of document.querySelectorAll('#hud .status > *, #hud .sysbtns > *')) { if (el.hidden || el.offsetParent === null) continue; const r = el.getBoundingClientRect(); if (r.right > W + 1 || r.left < -1) out.push([el.id || el.className, Math.round(r.left), Math.round(r.right)]); } const st = document.querySelector('#hud .status').getBoundingClientRect(); return [W, out, Math.round(st.height), Math.round(st.bottom)]; }''')
            print(vw, vh, r); await pg.screenshot(path=f'mob_{vw}.png'); await c.close()
        await b.close()
asyncio.run(main())
