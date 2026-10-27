import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for k in range(3):
            await pg.evaluate(f'() => {{ window.__randPick = {k}; }}'); print(k, await pg.evaluate('() => window.__game.validate()'))
        print(errs[:3]); await b.close()
asyncio.run(main())
