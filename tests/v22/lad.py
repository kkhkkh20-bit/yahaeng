import asyncio, json
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for st in range(5):
            await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(200); await ev(SKIP)
            r = await ev('''() => { const S = window.__game.S; const kinds = {}; for (const l of S.ladders) { const k = l.kind + (l.gas ? '/gas' : ''); (kinds[k] = kinds[k] || []).push(l); }
              const out = {}; for (const k in kinds) { const l = kinds[k][0]; out[k] = [kinds[k].length, Object.fromEntries(Object.entries(l).filter(([a, v]) => typeof v !== 'object').map(([a, v]) => [a, typeof v === 'number' ? Math.round(v * 10) / 10 : v]))]; } return out; }''')
            print(st, json.dumps(r, ensure_ascii=False))
        await b.close()
asyncio.run(main())
