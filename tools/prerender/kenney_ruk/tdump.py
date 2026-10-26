import asyncio, json, subprocess, sys, time
sys.argv = [sys.argv[0]]
exec(open('/root/game/tools/prerender/kenney_ruk/bake.py').read().split('async def main():')[0])
from playwright.async_api import async_playwright
async def run():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8774'], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await br.new_page(); pg.on('pageerror', lambda e: print('ERR', e))
            await pg.goto('http://localhost:8774/kenney_ruk/bake.html'); await pg.wait_for_function('window.__ok')
            print(await pg.evaluate("bbox('detail-dumpster-closed')"), await pg.evaluate("bbox('detail-dumpster-open')"))
            for r in range(4):
                im = png2(await pg.evaluate('bake', {'box': [-0.3, -0.9, 1.3, 1.25], 'ppu': PPU, 'items': [{'n': 'detail-dumpster-closed', 'x': 0.5, 'z': 0.55, 'r': r}]}))
                im.save(f'/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/v22/dump{r}.png')
            await br.close()
    finally: srv.terminate()
asyncio.run(run())
