import asyncio, base64, io, json, subprocess, sys, time
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright
names = sys.argv[1].split(',')
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8774'], cwd='/root/game/tools/prerender', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await b.new_page(); pg.on('pageerror', lambda e: print('ERR', e))
            await pg.goto('http://localhost:8774/kenney_ruk/bake.html'); await pg.wait_for_function('window.__ok')
            items = []; bbs = {}
            for i, n in enumerate(names):
                bbs[n] = await pg.evaluate('bbox', 'F:' + n)
                items.append({'n': 'F:' + n, 'x': (i % 8) * 2.5 + 1.25, 'z': (i // 8) * 3 + 2.5, 'r': 0})
            rows = (len(names) + 7) // 8
            url = await pg.evaluate('bake', {'box': [0, 0, 20, rows * 3], 'ppu': 64, 'ground': False, 'items': items})
            im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA'); bg = Image.new('RGBA', im.size, (70, 74, 84, 255)); bg.alpha_composite(im); d = ImageDraw.Draw(bg)
            for i, n in enumerate(names): d.text(((i % 8) * 160 + 2, (i // 8) * 192 + 2), n[:22], fill=(255, 255, 0))
            bg.save('/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/bgshots/furn.png')
            for n in names: print(n, bbs[n])
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
