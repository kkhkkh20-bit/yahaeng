import asyncio, subprocess, sys, time, json, base64, io
from PIL import Image
from playwright.async_api import async_playwright
NIN = dict(skin='#e6b38a', hair='#141414', shirt='#17191f', pants='#1f2537')
def im(u): return Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8768'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await b.new_page(); pg.on('pageerror', lambda e: print('E', e))
            await pg.goto('http://localhost:8768/render.html'); await pg.evaluate('window.__ready'); await pg.evaluate(f'setTex({json.dumps(NIN)})')
            out = Image.new('RGBA', (8 * 128, 3 * 128), (70, 74, 82, 255))
            for k in range(4): out.alpha_composite(im(await pg.evaluate(f"renderPose('climb', {k}, {-3.14159265/2})")), (k * 128, 0))
            for k in range(4): out.alpha_composite(im(await pg.evaluate(f"renderPose('climb', {k}, 0)")), ((4 + k) * 128, 0))
            for k in range(3): out.alpha_composite(im(await pg.evaluate(f"renderPose('vault', {k}, 0)")), (k * 128, 128))
            for k in range(3): out.alpha_composite(im(await pg.evaluate(f"renderPose('vault', {k}, {-3.14159265/2})")), ((3 + k) * 128, 128))
            for d in range(8): out.alpha_composite(im(await pg.evaluate(f"renderPose('lean', {d % 2}, {d * 3.14159265 / 4})")), (d * 128, 256))
            out.resize((out.width * 3 // 2, out.height * 3 // 2), Image.NEAREST).save('/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/v22/poses.png')
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
