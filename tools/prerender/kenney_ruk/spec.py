import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[3]
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto((ROOT / 'build/preview_city.html').as_uri()); await pg.wait_for_timeout(1500)
        out = []
        for st in range(int(__import__('sys').argv[1]) if len(__import__('sys').argv) > 1 else 5):
            await pg.evaluate(f'() => window.__game.start({st})'); await pg.wait_for_timeout(200); await pg.evaluate(SKIP)
            out.append(await pg.evaluate('() => window.__game.kitSpec()'))
        json.dump(out, open(Path(__file__).with_name('spec.json'), 'w'))
        for s in out:
            print(s['id'], len(s['b']))
            for bb in s['b'][:3]: print('  ', bb['i'], bb['kind'], bb['h'], bb['fh'], bb['glass'], bb['piloti'], [''.join(r) for r in bb['front']])
        await b.close()
asyncio.run(main())
