import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await ev('() => T.freeze()')
        r = await ev('''() => { const S = T.S(), G = T.G(); for (const fb of S.bfuses) { const d = S.doors.find(d => (d.fl || 0) === 0 && Math.hypot(d.x - fb.x, d.y - fb.y) < 100 && !d.keyLock); if (d) { window.__fb = fb; window.__d = d; return [fb.x, fb.y, d.x, d.y]; } } return null; }''')
        print('pair', r)
        if r:
            out = []
            for k in range(0, 11):
                f = k / 10
                a = await ev(f'''() => {{ const P = T.S().player, fb = window.__fb, d = window.__d; P.x = fb.x + (d.x - fb.x) * {f}; P.y = Math.max(fb.y, d.y) + 20; P.a = -1.57; const pa = T.G().primaryAction(); return pa.k + (pa.alt ? '+Z:' + pa.alt.k : ''); }}''')
                out.append(a)
            print(' forward', out)
            out = []
            for k in range(10, -1, -1):
                f = k / 10
                a = await ev(f'''() => {{ const P = T.S().player, fb = window.__fb, d = window.__d; P.x = fb.x + (d.x - fb.x) * {f}; P.y = Math.max(fb.y, d.y) + 20; const pa = T.G().primaryAction(); return pa.k; }}''')
                out.append(a)
            print(' back', out)
        print(errs[:3]); await b.close()
asyncio.run(main())
