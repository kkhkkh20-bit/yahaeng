import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8767'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await b.new_page()
            pg.on('console', lambda m: print('C', m.text)); pg.on('pageerror', lambda e: print('E', e))
            await pg.goto('http://localhost:8767/render.html'); info = await pg.evaluate('window.__ready'); print(info)
            print(json.dumps(await pg.evaluate('boneInfo()')))
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
