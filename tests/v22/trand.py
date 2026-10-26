import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for k in range(3):
            await ev(f'() => {{ window.__randPick = {k}; }}')
            print(k, await ev('() => window.__game.validate()'))
            for st in [0, 3, 4]:
                await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(150); await ev(SKIP)
                print('  ', st, await ev('''() => { const S = window.__game.S, G = window.__game; const out = [];
                  for (const k of S.keyItems) { G.setLayer(k.fl); const tx = Math.floor(k.x / 48), ty = Math.floor(k.y / 48); const l = S.ladders.find(l => l.kind === 'fstair' && l.tfl === k.fl && G.bldAt(l.tx, l.ty) === G.bldAt(tx, ty)); out.push(['key', k.key, tx, ty, k.fl, G.tileG ? 1 : 0, k.fl ? !!l : true]); G.setLayer(0); }
                  for (const i of S.items) out.push(['item', Math.floor(i.x / 48), Math.floor(i.y / 48), i.fl]);
                  const t = S.guards.find(g => g.target && g.route.length > 1); if (t) out.push(['target', Math.round(t.route[1].x / 48), Math.round(t.route[1].y / 48)]); return out; }'''))
        print(errs[:3]); await b.close()
asyncio.run(main())
