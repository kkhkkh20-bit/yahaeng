import asyncio, base64, wave
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); pg = await b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for k in ['n_calm', 'n_tense', 'n_fight']:
            print(k, await pg.evaluate(f'() => window.__game.neonTest("{k}")'))
            sr, data = await pg.evaluate(f'() => window.__game.neonWav("{k}")')
            w = wave.open(f'{k}.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(base64.b64decode(data)); w.close()
        await pg.evaluate('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(2000)
        print('start', await pg.evaluate('() => window.__game.musicKey()'))
        await pg.keyboard.down('ArrowRight')
        for i in range(12):
            await pg.wait_for_timeout(250); mk = await pg.evaluate('() => [window.__game.musicKey(), window.__game.S.alevel]')
            if i % 3 == 2: print(' ', mk)
        await pg.keyboard.up('ArrowRight')
        print(errs[:3]); await b.close()
asyncio.run(main())
