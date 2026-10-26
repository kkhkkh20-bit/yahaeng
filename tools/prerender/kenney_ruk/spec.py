import asyncio, json
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        out = []
        for st in range(int(__import__('sys').argv[1]) if len(__import__('sys').argv) > 1 else 5):
            await pg.evaluate(f'() => window.__game.start({st})'); await pg.wait_for_timeout(200); await pg.evaluate(SKIP)
            out.append(await pg.evaluate('() => window.__game.kitSpec()'))
        json.dump(out, open('/root/game/tools/prerender/kenney_ruk/spec.json', 'w'))
        for s in out:
            print(s['id'], len(s['b']))
            for bb in s['b'][:3]: print('  ', bb['i'], bb['kind'], bb['h'], bb['fh'], bb['glass'], bb['piloti'], [''.join(r) for r in bb['front']])
        await b.close()
asyncio.run(main())
