import asyncio, subprocess, sys, time, json, base64
from playwright.async_api import async_playwright
HERE='/root/game/tools/prerender'
async def render(specs):
    srv=subprocess.Popen([sys.executable,'-m','http.server','8771'],cwd=HERE,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    out=[]
    try:
        async with async_playwright() as p:
            b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']); pg=await b.new_page(); pg.on('pageerror', lambda e: print('ERR', e))
            await pg.goto('http://localhost:8771/kenney_ruk/scene.html'); await pg.wait_for_function('window.__ok')
            for sp in specs:
                url=await pg.evaluate(f'renderScene({json.dumps(sp)})'); out.append(base64.b64decode(url.split(',')[1]))
            await b.close()
    finally: srv.terminate()
    return out
