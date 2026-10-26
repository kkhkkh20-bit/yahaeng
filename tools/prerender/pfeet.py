import asyncio, subprocess, sys, time, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
async def main():
    srv=subprocess.Popen([sys.executable,'-m','http.server','8768'],cwd=HERE,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']); pg=await b.new_page()
            await pg.goto('http://localhost:8768/render.html'); await pg.evaluate('window.__ready')
            r=await pg.evaluate('probeFeet()')
            for k in sorted(r):
                if any(t in k for t in ['Foot','Toe','Leg','Hand','Arm']): print(k, r[k])
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
