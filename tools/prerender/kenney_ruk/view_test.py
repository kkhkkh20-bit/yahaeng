# 시점·연출 비교 실험: 같은 블록(미션1 위쪽 건물 3채)을 네 가지로 굽는다 → docs/view_compare.png
# A 지금(3/4, 1층=1칸)  B 더 눕힌 시점(실제 층 비례 1.5배, 45도)  C 지금 시점 + 지붕 연출 강화  D B+C
import asyncio, base64, io, json, os, subprocess, sys, time
from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright
HERE = '/root/game/tools/prerender'
src = open(HERE + '/kenney_ruk/bake_mk.py').read().rsplit('asyncio.run(main())', 1)[0]
ns = {'__name__': 'mk'}; exec(src, ns); bld_items, H = ns['bld_items'], ns['H']

def roof_extra(b):
    """지붕 연출: 옥탑방, 옥상 간판, 채광창 불빛, 텃밭, 빨랫줄, 태양광판"""
    x0, y0, x1, y1, h = b['x0'], b['y0'], b['x1'], b['y1'], b['h']
    zF = y1 + 1; zB = min(y0 + h, zF - 1); dr = zF - zB; w = x1 - x0 + 1; hs = H(x0, y0, w); it = []
    neon = [0xff3ca8, 0x3ce0ff, 0xffb040, 0xb45aff][hs % 4]
    # 옥탑방: 작은 집 + 불 켜진 창 + 문
    ox = x0 + 0.4 if hs % 2 else x1 - 2.6
    if b['kind'] == 'house': ox = x1 - 2.6; zB -= 0.0
    it.append({'box': [ox, h, zB + 0.3, ox + 2.2, h + 0.85, zB + 1.9], 'color': 0xd8d2c4})
    it.append({'box': [ox - 0.08, h + 0.85, zB + 0.22, ox + 2.28, h + 0.95, zB + 1.98], 'color': 0x3d6b8a})
    it.append({'box': [ox + 0.3, h + 0.3, zB + 1.9, ox + 1.0, h + 0.7, zB + 1.93], 'color': 0xffd9a0, 'emi': 0xffa850, 'ei': 1.4})
    it.append({'box': [ox + 1.4, h, zB + 1.9, ox + 1.85, h + 0.72, zB + 1.93], 'color': 0x6a4a30})
    # 옥상 간판: 지붕 뒤쪽에 서 있는 네온 판 (다리 두 개)
    if b['kind'] != 'house':
        sx0 = x0 + 0.5 + (w - 4.5) * ((hs >> 5) % 3) / 2 if w > 5 else x0 + 0.3
        sx0 = max(x0 + 0.3, min(sx0, x1 - 3.6))
        if abs(sx0 - ox) < 2.6: sx0 = x1 - 3.8 if ox < (x0 + x1) / 2 else x0 + 0.4
        for lx in (sx0 + 0.3, sx0 + 3.1): it.append({'cyl': [lx, h, zB + 0.25, lx, h + 0.7, zB + 0.25], 'r': 0.05, 'color': 0x3a3d44})
        it.append({'box': [sx0, h + 0.7, zB + 0.18, sx0 + 3.4, h + 1.5, zB + 0.32], 'color': 0x101018})
        it.append({'box': [sx0 + 0.12, h + 0.8, zB + 0.32, sx0 + 3.28, h + 1.4, zB + 0.36], 'color': neon, 'emi': neon, 'ei': 1.6})
    # 채광창: 아래층 불빛이 새어 나온다
    for k in range(max(1, w // 4)):
        sx = x0 + 1 + (hs >> (k * 3 + 1)) % max(1, w - 2); sz = zB + 2.3 + ((hs >> (k * 5 + 2)) % max(1, dr - 3))
        if sz > zF - 0.8: sz = zF - 1.2
        it.append({'box': [sx, h, sz, sx + 0.9, h + 0.08, sz + 0.6], 'color': 0x6a6e76})
        it.append({'box': [sx + 0.08, h + 0.08, sz + 0.08, sx + 0.82, h + 0.1, sz + 0.52], 'color': 0xffe0b0, 'emi': 0xffb060, 'ei': 1.1})
    # 텃밭 상자(스티로폼 화분): 줄지어
    gz = zF - 0.9
    for k in range(min(5, w - 2)):
        gx = x0 + 0.5 + k * 0.75 + (0 if hs % 2 else w - 4.5)
        if gx > x1 + 0.3: break
        it.append({'box': [gx, h, gz, gx + 0.6, h + 0.18, gz + 0.4], 'color': 0xe8e8e8})
        it.append({'box': [gx + 0.05, h + 0.18, gz + 0.05, gx + 0.55, h + 0.3, gz + 0.35], 'color': 0x3f7a3a})
    # 빨랫줄
    lx0, lx1 = x0 + 0.6, min(x1 + 0.4, x0 + 4.5); lz = zB + 2.5
    for lx in (lx0, lx1): it.append({'cyl': [lx, h, lz, lx, h + 0.75, lz], 'r': 0.03, 'color': 0x8a8f96})
    it.append({'cyl': [lx0, h + 0.72, lz, lx1, h + 0.72, lz], 'r': 0.012, 'color': 0xcccccc})
    for k, c in enumerate([0xe0e4ea, 0x5a7ab0, 0xc04848, 0xe0d070]):
        cx = lx0 + 0.4 + k * 0.8
        if cx + 0.4 < lx1: it.append({'box': [cx, h + 0.35, lz - 0.02, cx + 0.45, h + 0.72, lz + 0.02], 'color': c})
    # 태양광판(넓은 건물만)
    if w >= 9:
        px = x1 - 3.5 if hs % 2 else x0 + 4.8
        for k in range(3): it.append({'box': [px + k * 0.95, h + 0.15, zB + 3.2, px + k * 0.95 + 0.85, h + 0.22, zB + 4.6], 'color': 0x1c3260, 'metal': 0.6, 'rough': 0.25})
    return it

def scene(spec_b, extra):
    items = []
    for b in spec_b:
        _, it = bld_items(b); items += it
        if extra: items += roof_extra(b)
    return items

LAMPS = [{'x': x, 'y': 2.2, 'z': 11.7, 'c': 0xffc070, 'i': 9, 'd': 7} for x in (5, 14, 23, 32)] + [{'x': 22.5, 'y': 1, 'z': 11.6, 'c': 0xff4fa0, 'i': 5, 'd': 5}]
FLOOR = [[-1, -3, 41, 17, 0x1b1d23], [0, 10.9, 40, 12.3, 0x2c2e34]]
def spec(items, cam=None, ys=1):
    s = {'box': [1, -2, 39, 14], 'ppu': 96, 'items': items, 'night': True, 'hemi': 1.15, 'sun': 1.0, 'lamps': LAMPS, 'floor': FLOOR, 'ground': False, 'ys': ys}
    if cam: s['cam'] = {'elev': cam, 'fit': [1, -2, 39, 14, 0]}
    return s

async def main():
    st = [x for x in json.load(open(HERE + '/kenney_ruk/spec.json')) if x['id'] == 'm1'][0]
    bs = [b for b in st['b'] if b['i'] in (0, 1, 2)]
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8776'], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    out = {}
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await br.new_page()
            pg.on('pageerror', lambda e: print('ERR', e)); pg.set_default_timeout(300000)
            await pg.goto('http://localhost:8776/kenney_ruk/bake_view.html'); await pg.wait_for_function('window.__ok')
            V = {'A': spec(scene(bs, False)), 'B': spec(scene(bs, False), cam=45, ys=1.5), 'C': spec(scene(bs, True)), 'D': spec(scene(bs, True), cam=45, ys=1.5)}
            for k, sp in V.items():
                url = await pg.evaluate('bake', sp)
                im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA'); im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS); out[k] = im; print(k, im.size, flush=True)
            await br.close()
    finally: srv.terminate()
    T = {'A': 'A. 지금 (3/4 시점, 1층 = 1칸)', 'B': 'B. 더 눕힌 시점 (45도, 층 높이 실제 비례)', 'C': 'C. 지금 시점 + 지붕 연출', 'D': 'D. 눕힌 시점 + 지붕 연출'}
    fnt = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 26) if os.path.exists('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc') else ImageFont.load_default()
    cw = max(i.width for i in out.values()); rows = [['A', 'B'], ['C', 'D']]
    rh = [max(out[k].height for k in r) + 46 for r in rows]
    sheet = Image.new('RGBA', (cw * 2 + 30, sum(rh) + 20), (14, 15, 20, 255)); d = ImageDraw.Draw(sheet); y = 10
    for r, hh in zip(rows, rh):
        for j, k in enumerate(r):
            x = 10 + j * (cw + 10); d.text((x, y + 6), T[k], fill=(240, 220, 170), font=fnt); sheet.alpha_composite(out[k], (x, y + 42))
        y += hh
    os.makedirs('/root/game/docs', exist_ok=True); sheet.convert('RGB').save('/root/game/docs/view_compare.png', optimize=True); print('saved', sheet.size)
asyncio.run(main())
