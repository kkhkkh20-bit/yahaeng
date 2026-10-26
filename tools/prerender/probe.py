import asyncio, subprocess, sys, time, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8767'], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']); pg = await b.new_page()
        await pg.goto('http://localhost:8767/render.html'); await pg.evaluate('window.__ready'); print(await pg.evaluate('probe()')); await b.close()
    srv.terminate()
asyncio.run(main())
