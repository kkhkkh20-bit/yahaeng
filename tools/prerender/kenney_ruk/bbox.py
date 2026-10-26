import asyncio, subprocess, sys, time, os, json
from playwright.async_api import async_playwright
HERE='/root/game/tools/prerender'
names=sys.argv[1].split(',')
async def main():
    srv=subprocess.Popen([sys.executable,'-m','http.server','8770'],cwd=HERE,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b=await p.chromium.launch(); pg=await b.new_page(); pg.on('console', lambda m: print('LOG', m.text))
            await pg.goto('http://localhost:8770/kenney_ruk/bbox.html'); await pg.wait_for_function('window.__ok')
            r=await pg.evaluate(f'bbox({json.dumps(names)})')
            for k,v in r.items(): print(k, v)
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
