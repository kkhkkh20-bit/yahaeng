import asyncio, subprocess, sys, time, json, base64, io
from PIL import Image
from playwright.async_api import async_playwright
NIN = dict(skin='#e6b38a', hair='#141414', shirt='#17191f', pants='#1f2537')
GRD = dict(skin='#ddaa80', hair='#3a2a1c', shirt='#a0b04c', pants='#6e6a5c')
def im(u): return Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
async def main():
    pz = sys.argv[1] if len(sys.argv) > 1 else '{}'
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8767'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await b.new_page()
            pg.on('pageerror', lambda e: print('E', e))
            await pg.goto('http://localhost:8767/render.html'); await pg.evaluate('window.__ready'); await pg.evaluate(f'Object.assign(PZ, {pz})')
            out = Image.new('RGBA', (8 * 128, 4 * 128), (60, 64, 72, 255))
            for row, (kind, clip, t) in enumerate([('carry', 'Walk', 0), ('carry', 'Walk', 0.5), ('grab', 'Walk', 0), ('grab', 'Idle', 0)]):
                for d in range(8):
                    a = d * 3.14159265 / 4
                    await pg.evaluate(f'setTex({json.dumps(NIN)})'); A = im(await pg.evaluate(f"renderPair('{kind}', '{clip}', {t}, {a}, 'a')"))
                    await pg.evaluate(f'setTex({json.dumps(GRD)})'); B = im(await pg.evaluate(f"renderPair('{kind}', '{clip}', {t}, {a}, 'b')"))
                    A.alpha_composite(B); out.alpha_composite(A, (d * 128, row * 128))
            out.save('/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/v22/pair.png')
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
