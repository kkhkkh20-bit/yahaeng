import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); ev = pg.evaluate; errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await ev('() => T.freeze()')
        print(await ev('''() => { const S = T.S(), P = S.player; let best = null, bv = 0; for (const w of S.wires) { const v = Math.abs(w.b.dy - w.a.dy) / w.L; if (v > bv) { bv = v; best = w; } }
           P.wire = { w: best, s: 0.5 }; P.z = 1; return [bv.toFixed(2), Math.round(best.a.dy), Math.round(best.b.dy)]; }'''))
        for key in ['ArrowDown', 'ArrowUp']:
            await pg.keyboard.down(key); await pg.wait_for_timeout(700)
            print(key, await ev('() => { const W = T.S().player.wire; return W ? [W.fa != null ? (W.fa * 180 / Math.PI).toFixed(0) : null, W.s.toFixed(2)] : null; }'))
            await pg.screenshot(path=f'wire_{key}.png'); await pg.keyboard.up(key)
        print(errs[:3]); await b.close()
asyncio.run(main())
