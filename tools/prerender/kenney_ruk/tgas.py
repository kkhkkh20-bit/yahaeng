import asyncio, json, subprocess, sys, time
sys.argv = [sys.argv[0]]
exec(open('/root/game/tools/prerender/kenney_ruk/bake.py').read().split('async def main():')[0])
from playwright.async_api import async_playwright
async def run():
    spec = json.load(open(HERE + '/kenney_ruk/spec.json'))
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8773'], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await br.new_page(); pg.on('pageerror', lambda e: print('ERR', e))
            await pg.goto('http://localhost:8773/kenney_ruk/bake.html'); await pg.wait_for_function('window.__ok')
            for si, bi in [(0, 0), (0, 1), (3, 0)]:
                b = spec[si]['b'][bi]; print(b['gas'], b['h'], b['x0'], b['x1'])
                box, items = bld_items(b)
                im = png2(await pg.evaluate('bake', {'box': box, 'ppu': PPU, 'items': items})); im.save(f'/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/v22/gas_{si}_{bi}.png')
            await br.close()
    finally: srv.terminate()
asyncio.run(run())
