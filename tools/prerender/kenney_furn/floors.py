import asyncio, base64, io, subprocess, sys, time
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright
C = [('planks', 0), ('scaffolding-floor', 0), ('F:floorFull', 0), ('road-asphalt-pavement', 0), ('F:rugSquare', 0), ('F:wall', 0), ('F:wallWindow', 0), ('wall-a', 0), ('F:paneling', 0)]
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8775'], cwd='/root/game/tools/prerender', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await b.new_page()
            await pg.goto('http://localhost:8775/kenney_ruk/bake.html'); await pg.wait_for_function('window.__ok')
            W = Image.new('RGBA', (len(C) * 110, 200), (70, 74, 84, 255)); d = ImageDraw.Draw(W)
            for i, (n, r) in enumerate(C):
                bb = await pg.evaluate('bbox', n)
                cx = -(bb[0][0] + bb[1][0]) / 2 + 0.5; cz = -(bb[0][2] + bb[1][2]) / 2 + 0.5
                url = await pg.evaluate('bake', {'box': [0, -1.5, 1, 1.2], 'ppu': 96, 'ground': False, 'items': [{'n': n, 'x': cx, 'z': cz, 'r': r}]})
                im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA'); W.alpha_composite(im, (i * 110, 0)); d.text((i * 110, 2), n, fill=(255, 255, 0))
            W.save('/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/bgshots/floors.png')
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
