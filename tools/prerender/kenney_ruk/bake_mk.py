# 비교용 배경: 건물 외관·지붕을 Quaternius Downtown City MegaKit(CC0)으로 굽는다 → build/kit_mk/kit.json
# 바닥·나무·가구·소품은 기존 kit.json(Kenney)을 그대로 쓴다. 먼저 spec.py와 bake.py를 돌려 둘 것
import asyncio, base64, io, json, os, subprocess, sys, time, hashlib
from PIL import Image
from playwright.async_api import async_playwright
HERE = '/root/game/tools/prerender'; BASE = '/root/game/build/kit'; OUT = '/root/game/build/kit_mk'; os.makedirs(OUT, exist_ok=True)
PPU = 96
def H(*a): return int(hashlib.md5(repr(a).encode()).hexdigest()[:8], 16)
S1 = (0.5, 1 / 3, 0.5)   # MegaKit 조각 2m×3m(한 층) → 게임 한 칸×한 층
def M(n, x, y, z, r=0, s=S1, **k): return {'n': 'M:' + n, 'x': x, 'y': y, 'z': z, 'r': r, 's': list(s), **k}
FAM = {
  'brick': dict(wall='Brick_Plain_3', win=['Brick_Window_Square_Single', 'Brick_Window_Trim_Single'], gwall='Brick_BottomTrim', shop='Trim_FirstFloor_Window_001', door='DoorFrame_Trim', leaf='Door_1', cornice='Cornice_Brick_Center', col='Brick_Column_Small'),
  'metal': dict(wall='Metal_Plain_3', win=['Metal_Window_Half'], gwall='Metal_FirstFloor_Wall', shop='Metal_FirstFloor_Window', door='DoorFrame_Metal_Single', leaf='Door_2', cornice='Cornice_Metal_Center', col='Metal_Column_Bottom'),
  'trim': dict(wall='Trim_Plain_3', win=['Trim_Window'], gwall='Trim_FirstFloor_Wall', shop='Trim_FirstFloor_Window_001', door='DoorFrame_Wooden', leaf='Door_3', cornice='Cornice_Trim_Center', col='Trim_Column_Bottom'),
}
TINTS = [0xffffff, 0xf2dccb, 0xd9dde8, 0xebe3c4, 0xe6c9c9]
NEON = [0xff4fa0, 0x40e0ff, 0xffa850, 0x9a6bff, 0x5cff9a]
def bld_items(b):
    x0, y0, x1, y1, h = b['x0'], b['y0'], b['x1'], b['y1'], b['h']
    zF = y1 + 1; zB = min(y0 + h, zF - 1); dr = zF - zB; w = x1 - x0 + 1; hs = H(x0, y0, w)
    shop = b['kind'] == 'shop'; house = b['kind'] == 'house'
    fam = FAM['metal' if b['glass'] else ('metal' if hs % 2 else 'brick') if shop else ('trim' if hs % 2 else 'brick') if house else ['brick', 'trim', 'brick'][hs % 3]]
    tint = TINTS[(hs >> 4) % len(TINTS)]; neon = NEON[(hs >> 7) % len(NEON)]
    it = [{'box': [x0, 0, zB, x1 + 1, h - 0.002, zF - 0.98], 'color': 0x1c1e24, 'cast': False}]
    for f in range(h):
        row = b['front'][f] if f < len(b['front']) else ['?'] * w
        for k, x in enumerate(range(x0, x1 + 1)):
            ch = row[k]
            if ch == '?': ch = 'N' if (x0 < x < x1 and (x - x0) % 2 == 1) else '#'
            X = x + 0.5; lit = H(x, f, hs) % 3 == 0
            if f == 0 and b['piloti'] and ch != 'D':
                it.append({'box': [x, 0, y1, x + 1, 1, y1 + 0.25], 'color': 0x0c0d11, 'cast': False})
                if ch == 'I': it.append(M(fam['col'], X, 0, zF - 0.2, s=(0.6, 1 / 3, 0.6), wallTint=tint))
                elif ch == '#': it.append(M(fam['wall'], X, 0, zF, wallTint=tint))
                continue
            if ch == 'D':
                it.append(M(fam['door'], X, f, zF, wallTint=tint, lit=lit)); it.append(M(fam['leaf'], X + 0.25, f, zF - 0.05, wallTint=tint))
                if f == 0 and not shop: it.append(M('Stairs_Entrance_Concrete', X, 0, zF, s=(0.42, 0.2, 0.3)))
            elif shop and f == 0: it.append(M(fam['shop'], X, 0, zF, wallTint=tint, lit=(x + hs) % 3 != 0, neon=neon))
            elif b['glass']: it.append(M('Metal_FullWindow', X, f, zF, wallTint=tint, lit=lit, neon=neon if lit and (x + f) % 4 == 0 else None))
            elif ch == 'N': it.append(M(fam['win'][(x + f + hs) % len(fam['win'])], X, f, zF, wallTint=tint, lit=lit))
            elif f == 0: it.append(M(fam['gwall'], X, 0, zF, wallTint=tint))
            else: it.append(M(fam['wall'], X, f, zF, wallTint=tint))
    # 지붕: 평지붕(아스팔트) + 난간 + 소품. 단독주택은 앞쪽에 슬레이트 맨사드
    pk = 0.45
    for xx in range(x0, x1 + 1):
        for zz in range(zB, zF): it.append(M('Entrance_Concrete_2x2', xx + 0.5, h - 0.02, zz + 0.5, s=(0.5, 0.06, 0.5), cast=False, wallTint=0xb8b4ae if (xx + zz) % 2 else 0xa8a49e))
    for bx in ([x0, h, zB, x1 + 1, h + 0.22, zB + 0.12], [x0, h, zB, x0 + 0.12, h + 0.22, zF], [x1 + 1 - 0.12, h, zB, x1 + 1, h + 0.22, zF]):
        it.append({'box': bx, 'color': 0x6e6a66})
    if house and dr >= 2:
        for xx in range(x0, x1 + 1): it.append(M('Roof_SlateCornice_Window_1' if (xx - x0) % 3 == 1 else 'Roof_SlateCornice_Center', xx + 0.5, h, zF, s=(0.5, 1 / 3, 0.5)))
        pk = 1.1
    else:
        for xx in range(x0, x1 + 1): it.append(M(fam['cornice'], xx + 0.5, h - 0.05, zF, s=(0.5, 0.3, 0.5), wallTint=tint))
        n_ac = max(1, w // 3)
        for k in range(n_ac):
            px = x0 + 0.7 + (hs >> (k * 3)) % max(1, w - 1); pz = zB + 0.5 + ((hs >> (k * 5 + 1)) % max(1, dr))
            it.append(M('Prop_ACUnit', min(px, x1 + 0.4), h + 0.07, min(pz, zF - 0.6), r=(hs >> k) % 4, s=(0.55, 0.55, 0.55)))
        it.append(M('Prop_Drain', x0 + 0.6, h + 0.04, zB + 0.5, s=(0.6, 1, 0.6)))
        # 옥상 출입구(작은 계단실)와 환기관
        if w >= 4 and dr >= 2:
            ex = x1 - 1 - (hs >> 11) % max(1, w - 3); it.append({'box': [ex, h, zB + 0.2, ex + 1.1, h + 0.55, zB + 1.0], 'color': 0x8a7f74}); it.append({'box': [ex - 0.02, h + 0.55, zB + 0.16, ex + 1.12, h + 0.6, zB + 1.04], 'color': 0x5a5550})
        for k in range(max(1, w // 4)):
            vx = x0 + 0.5 + (hs >> (k * 4 + 2)) % max(1, w); vz = zB + 0.4 + ((hs >> (k * 6 + 3)) % max(1, dr)) * 0.8
            it.append({'cyl': [vx, h, min(vz, zF - 0.3), vx, h + 0.3, min(vz, zF - 0.3)], 'r': 0.07, 'color': 0x9aa0a8, 'metal': 0.5, 'rough': 0.4})
        if h >= 2 and hs % 3 == 0 and w >= 4 and dr >= 2:  # 물탱크: 나무 통 + 다리 (뉴욕 옥상)
            tx, tz = x0 + 1 + (hs >> 9) % max(1, w - 2), zB + 0.9
            for lx, lz in ((-0.22, -0.22), (0.22, -0.22), (-0.22, 0.22), (0.22, 0.22)): it.append({'cyl': [tx + lx, h + 0.05, tz + lz, tx + lx, h + 0.55, tz + lz], 'r': 0.035, 'color': 0x3a3d44})
            it.append({'cyl': [tx, h + 0.55, tz, tx, h + 1.05, tz], 'r': 0.32, 'color': 0x7a5638, 'rough': 0.9, 'metal': 0})
            it.append({'cyl': [tx, h + 1.05, tz, tx, h + 1.16, tz], 'r': 0.24, 'color': 0x3a3d44})
            pk = 1.2
        if shop:  # 간판 불빛: 가게 지붕 끝에 네온 띠
            it.append({'box': [x0 + 0.3, h - 0.32, zF + 0.02, x1 + 0.7, h - 0.2, zF + 0.06], 'color': neon, 'rough': 0.3, 'metal': 0})
    # 가스관·베란다·가게 차양: 기존 굽기와 같게
    for tx in b.get('gas') or []:
        px = tx + (9 / 48 if tx == x0 else 1 - 9 / 48 if tx == x1 else 0.5); pz = zF + 0.09; ins = 1 if tx < (x0 + x1 + 1) / 2 else -1; Y = 0xd6ad2c
        it.append({'cyl': [px, 0.05, pz, px, h + 0.16, pz], 'r': 0.068, 'color': Y}); it.append({'cyl': [px, h + 0.16, pz, px, h + 0.16, zF - 0.25], 'r': 0.068, 'color': Y})
        for f in range(1, h):
            yb = f + 0.22; xe = px + ins * 0.42
            it.append({'cyl': [px, yb, pz, xe, yb, pz], 'r': 0.04, 'color': Y}); it.append({'cyl': [xe, yb, pz, xe, yb, zF - 0.02], 'r': 0.04, 'color': Y})
        mx = px + ins * 0.26
        it.append({'cyl': [px, 0.62, pz, mx, 0.62, pz], 'r': 0.035, 'color': Y}); it.append({'box': [mx - 0.15, 0.42, zF, mx + 0.15, 0.82, zF + 0.16], 'color': 0xa4a8b0, 'metal': 0.2, 'rough': 0.55})
    for tx in b.get('balc') or []:
        it.append({'n': 'balcony-type-a', 'x': tx + 0.5, 'y': 1, 'z': zF + 0.14, 'r': 2})
    if shop:
        for k, ch in enumerate(b['front'][0]):
            if ch == 'D': it.append({'n': 'detail-awning-wide', 'x': x0 + k + 0.5, 'y': 0.72, 'z': zF + 0.16, 'r': 2})
    top = y0 - (int((pk + 0.35) * 2 + 0.999) / 2)
    return [x0 - 0.5, top, x1 + 1.5, y1 + 1.5], it

def png2(url):
    im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA'); return im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
def webp(im, q=88):
    bio = io.BytesIO(); im.save(bio, 'WEBP', quality=q, method=6); return 'data:image/webp;base64,' + base64.b64encode(bio.getvalue()).decode()

async def main():
    spec = json.load(open(HERE + '/kenney_ruk/spec.json')); kit = json.load(open(BASE + '/kit.json')); kit['bld'] = {}
    only = sys.argv[1] if len(sys.argv) > 1 else None
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8775'], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await br.new_page()
            pg.on('pageerror', lambda e: print('ERR', e))
            await pg.goto('http://localhost:8775/kenney_ruk/bake.html'); await pg.wait_for_function('window.__ok')
            for st in spec:
                if only and st['id'] != only: continue
                lst = []
                for b in st['b']:
                    box, items = bld_items(b)
                    im = png2(await pg.evaluate('bake', {'box': box, 'ppu': PPU, 'items': items}))
                    lst.append({'i': b['i'], 'key': [b['x0'], b['y0'], b['x1'], b['y1'], b['h']], 'ox': box[0] * 48, 'oy': box[1] * 48, 'w': im.width, 'h': im.height, 'src': webp(im)})
                    im.save(f"{OUT}/b_{st['id']}_{b['i']}.png")
                kit['bld'][st['id']] = lst; print(st['id'], len(lst), 'buildings', flush=True)
            await br.close()
    finally: srv.terminate()
    json.dump(kit, open(f'{OUT}/kit.json', 'w')); print('kit_mk.json KB', os.path.getsize(f'{OUT}/kit.json') // 1024)
asyncio.run(main())
