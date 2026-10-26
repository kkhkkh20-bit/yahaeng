import asyncio, subprocess, sys, time
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen([sys.executable,'-m','http.server','8773'],cwd='/root/game/tools/prerender',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b=await p.chromium.launch(); pg=await b.new_page()
            await pg.goto('http://localhost:8773/kenney_ruk/bake.html'); await pg.wait_for_function('window.__ok')
            for n in ['tree-large','balcony-type-a','wall-a-window','detail-awning-wide']: print(n, await pg.evaluate('matInfo', n))
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
