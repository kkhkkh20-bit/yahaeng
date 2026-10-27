# 야행 기반 키트 굽기: 바닥 타일 · 나무 · 가구 · 쓰레기통을 Kenney Retro Urban Kit·Furniture Kit로 렌더해 build/kit 에 저장
# (건물 외관은 bake_mk.py 가 MegaKit로 굽고, 이 기반 키트에 합쳐 build/kit_mk 를 만든다)
# 순서: spec.py(게임에서 건물 정보 추출) → 이 스크립트 → bake_mk.py 가 이 기반 키트에 건물 외관을 더해 build/kit_mk 로 → build.py 가 window.__KIT 로 넣는다
import asyncio, base64, io, json, os, subprocess, sys, time, hashlib
from PIL import Image
from playwright.async_api import async_playwright
HERE = '/root/game/tools/prerender'; OUT = '/root/game/build/kit'; os.makedirs(OUT, exist_ok=True)
PPU = 96  # 2배로 찍고 반으로 줄인다 (1칸 = 48px)
def H(*a): return int(hashlib.md5(repr(a).encode()).hexdigest()[:8], 16)

def bld_items(b):
    x0, y0, x1, y1, h = b['x0'], b['y0'], b['x1'], b['y1'], b['h']
    zF = y1 + 1; zB = min(y0 + h, zF - 1); dr = zF - zB; w = x1 - x0 + 1; hs = H(x0, y0, w)
    wl = 'b' if b['alt'] else 'a'; shop = b['kind'] == 'shop'
    it = [{'box': [x0, 0, zB, x1 + 1, h - 0.002, zF - 0.98], 'color': 0x1c1e24, 'cast': False}]
    for f in range(h):
        row = b['front'][f] if f < len(b['front']) else ['?'] * w
        for k, x in enumerate(range(x0, x1 + 1)):
            ch = row[k]
            if ch == '?': ch = 'N' if (x0 < x < x1 and (x - x0) % 2 == 1) else '#'
            P = {'x': x + 0.5, 'y': f, 'z': y1 + 0.5, 'r': 2}
            if f == 0 and b['piloti'] and ch != 'D':
                it.append({'box': [x, 0, y1, x + 1, 1, y1 + 0.25], 'color': 0x0c0d11, 'cast': False})
                if ch == 'I': it.append({**P, 'n': 'wall-a-column'})
                elif ch == '#': it.append({**P, 'n': f'wall-{wl}'})
                continue
            if ch == 'D': n = f'wall-{wl}-door'
            elif shop and f == 0: n = 'wall-a-window' if ch == 'N' and (x + hs) % 3 == 0 else 'wall-a-garage'
            elif ch == 'N': n = f'wall-{wl}-window'
            else: n = f'wall-{wl}'
            it.append({**P, 'n': n})
    # 지붕
    flat = h >= 4 or b['glass'] or (shop and h >= 3)
    if flat:
        pk = 0.3
        it.append({'box': [x0, h, zB, x1 + 1, h + 0.04, zF], 'color': 0x6c6e74})
        for xx in range(x0, x1 + 1):
            for zz in range(zB, zF): it.append({'n': 'road-asphalt-pavement', 'x': xx + 0.5, 'y': h + 0.045, 'z': zz + 0.5, 'r': (xx + zz) % 4, 'cast': False})
        for bx in ([x0, h, zB, x1 + 1, h + 0.28, zB + 0.14], [x0, h, zF - 0.14, x1 + 1, h + 0.28, zF], [x0, h, zB, x0 + 0.14, h + 0.28, zF], [x1 + 1 - 0.14, h, zB, x1 + 1, h + 0.28, zF]):
            it.append({'box': bx, 'color': 0x8e9096})
        # 옥상 소품: 철제 구조물·벽돌 더미 몇 개
        for k in range(max(1, w // 5)):
            px = x0 + 1 + (hs >> (k * 3)) % max(1, w - 2); pz = zB + 0.6 + ((hs >> (k * 5 + 1)) % max(1, dr - 1))
            it.append({'n': ['roof-metal-poles', 'detail-bricks-type-a', 'pallet', 'detail-block'][(hs >> k) % 4], 'x': px + 0.5, 'y': h + 0.05, 'z': min(pz, zF - 0.6), 'r': (hs >> k) % 4})
    else:
        style = 0; roofs = [f'wall-{wl}-roof', f'wall-{wl}-roof-detailed', 'roof-metal-type-a', 'roof-metal-type-b']; n = roofs[(hs >> 3) % 4]
        if style < 2 and w >= 2:  # 앞으로 박공이 보이는 지붕 여러 채
            units = []; rest = w
            while rest > 0:
                uw = 3 if rest >= 5 or rest == 3 else 2 if rest >= 2 else 1
                units.append(uw); rest -= uw
            xx = x0; pk = 0
            for uw in units:
                ys = min(uw * 0.42, 1.05) / 0.5; pk = max(pk, 0.5 * ys)
                it.append({'n': n, 'x': xx + uw / 2, 'y': h, 'z': (zB + zF) / 2, 'r': 1, 's': [dr / 1.0, ys, uw]}); xx += uw
        else:  # 옆으로 긴 지붕 하나
            ys = min(dr * 0.32, 1.0) / 0.5; pk = 0.5 * ys
            it.append({'n': n, 'x': x0 + w / 2, 'y': h, 'z': (zB + zF) / 2, 'r': 0, 's': [w, ys, dr]})
    # 도시가스 배관: 노란 관이 바닥에서 지붕까지 벽을 타고 오르고, 층마다 안으로 꺾여 들어간다. 아래엔 계량기
    for tx in b.get('gas') or []:
        px = tx + (9 / 48 if tx == x0 else 1 - 9 / 48 if tx == x1 else 0.5); pz = zF + 0.09; ins = 1 if tx < (x0 + x1 + 1) / 2 else -1
        Y = 0xd6ad2c
        it.append({'cyl': [px, 0.05, pz, px, h + 0.16, pz], 'r': 0.068, 'color': Y})
        it.append({'cyl': [px, h + 0.16, pz, px, h + 0.16, zF - 0.25], 'r': 0.068, 'color': Y})  # 지붕 위로 꺾여 들어감
        for yy in [k * 0.5 + 0.3 for k in range(int(h * 2))]:  # 고정 밴드
            it.append({'box': [px - 0.085, yy, pz - 0.09, px + 0.085, yy + 0.045, pz + 0.075], 'color': 0x5c6068, 'metal': 0.4, 'rough': 0.6})
        for f in range(1, h):  # 층마다 집 안으로 들어가는 가지관
            yb = f + 0.22; xe = px + ins * 0.42
            it.append({'cyl': [px, yb, pz, xe, yb, pz], 'r': 0.04, 'color': Y})
            it.append({'cyl': [xe, yb, pz, xe, yb, zF - 0.02], 'r': 0.04, 'color': Y})
            it.append({'box': [xe - 0.07, yb - 0.07, zF - 0.01, xe + 0.07, yb + 0.07, zF + 0.04], 'color': 0x4a4e56})
        mx = px + ins * 0.26  # 계량기: 회색 함, 검은 창, 빨간 밸브
        it.append({'cyl': [px, 0.62, pz, mx, 0.62, pz], 'r': 0.035, 'color': Y})
        it.append({'box': [mx - 0.15, 0.42, zF, mx + 0.15, 0.82, zF + 0.16], 'color': 0xa4a8b0, 'metal': 0.2, 'rough': 0.55})
        it.append({'box': [mx - 0.09, 0.62, zF + 0.16, mx + 0.09, 0.74, zF + 0.175], 'color': 0x1a1c22})
        it.append({'box': [px - 0.07, 0.3, pz - 0.02, px + 0.07, 0.34, pz + 0.12], 'color': 0xc8342a, 'rough': 0.5})
        it.append({'box': [px - 0.11, 0, pz - 0.11, px + 0.11, 0.08, pz + 0.11], 'color': 0x7a7c80})  # 바닥 받침
    for tx in b.get('balc') or []:
        it.append({'n': 'balcony-type-a', 'x': tx + 0.5, 'y': 1, 'z': zF + 0.14, 'r': 2})
    if shop:
        for k, ch in enumerate(b['front'][0]):
            if ch == 'D': it.append({'n': 'detail-awning-wide', 'x': x0 + k + 0.5, 'y': 0.72, 'z': zF + 0.16, 'r': 2})
    top = y0 - (int((pk + 0.35) * 2 + 0.999) / 2)
    box = [x0 - 0.5, top, x1 + 1.5, y1 + 1.5]
    return box, it


# ---- 실내: 가구 (Kenney Furniture Kit, CC0) — 가구 칸(w×h)에 맞춰 찍는다. 모델 앞면이 카메라(남쪽)를 본다
import math
BB = {}
async def bbox(pg, n):
    if n not in BB: BB[n] = await pg.evaluate('bbox', n)
    return BB[n]
def rot_corners(bb, r, sc):
    (x0, y0, z0), (x1, y1, z1) = bb; th = r * math.pi / 2; c, s_ = round(math.cos(th)), round(math.sin(th)); pts = []
    for x in (x0 * sc[0], x1 * sc[0]):
        for z in (z0 * sc[2], z1 * sc[2]): pts.append((x * c + z * s_, -x * s_ + z * c))
    xs = [p[0] for p in pts]; zs = [p[1] for p in pts]; return min(xs), max(xs), min(zs), max(zs)
async def place(pg, n, fx, fz, fw, fd, mode='keep', hmax=1.0, r=0, y=0.0, pad=0.88, tint=None):
    bb = await bbox(pg, n); bw, bh, bd = (bb[1][0] - bb[0][0]) or 0.01, (bb[1][1] - bb[0][1]) or 0.01, (bb[1][2] - bb[0][2]) or 0.01
    ww, dd = (bw, bd) if r % 2 == 0 else (bd, bw)   # 돌린 뒤 가로·세로
    sx, sz = fw * pad / ww, fd * pad / dd
    if mode == 'keep': k = min(sx, sz); ly = min(k, hmax / bh); sc = (k, ly, k)
    else:
        ly = min((sx + sz) / 2, hmax / bh)
        sc = (sx, ly, sz) if r % 2 == 0 else (sz, ly, sx)
    mnx, mxx, mnz, mxz = rot_corners(bb, r, sc)
    it = {'n': n, 'x': fx + fw / 2 - (mnx + mxx) / 2, 'y': y, 'z': fz + fd / 2 - (mnz + mxz) / 2, 'r': r, 's': list(sc)}
    if tint: it['tint'] = tint
    return it, bh * ly
async def furn_items(pg, t, w, h, rr=0):
    # rr = 게임의 가구 방향 (0 남 · 1 동 · 2 북 · 3 서). 모델 기본 방향(base)에 더해 돌린다
    F = lambda n: 'F:' + n
    it = []; long_x = w >= h
    R = lambda base=0: (base + rr) % 4
    if t == 'bedD':
        o, _ = await place(pg, F('bedDouble'), 0, 0, w, h, 'keep', 0.7, r=R()); return [o]
    if t == 'nstand':
        o, _ = await place(pg, F('sideTableDrawers'), 0, 0, w, h, 'fill', 0.6, pad=0.8, r=R()); return [o]
    if t in ('kcab', 'ksink', 'stove'):
        o, _ = await place(pg, F({'kcab': 'kitchenCabinetDrawer', 'ksink': 'kitchenSink', 'stove': 'kitchenStove'}[t]), 0, 0, w, h, 'fill', 0.8, pad=0.96, r=R()); return [o]
    if t == 'bsink':
        o, _ = await place(pg, F('bathroomSink'), 0, 0, w, h, 'keep', 0.9, pad=0.8, r=R()); return [o]
    if t == 'washer':
        o, _ = await place(pg, F('washer'), 0, 0, w, h, 'fill', 0.9, pad=0.85, r=R()); return [o]
    if t in ('chair', 'chairD'):
        o, _ = await place(pg, F('chairCushion' if t == 'chair' else 'chairDesk'), 0, 0, w, h, 'keep', 0.8, pad=0.7, r=R()); return [o]
    if t == 'lamp':
        o, _ = await place(pg, F('lampRoundFloor'), 0, 0, w, h, 'keep', 1.3, pad=0.6); return [o]
    if rr and t in ('sofa', 'sofaV', 'shelfS', 'toilet', 'desk', 'tv'):  # 돌려 놓는 옛 가구
        base = {'toilet': 2}.get(t, 0)
        nm = {'sofa': 'loungeSofa', 'sofaV': 'loungeSofa', 'shelfS': 'bookcaseOpenLow', 'toilet': 'toilet', 'desk': 'desk', 'tv': 'cabinetTelevision'}[t]
        o, hh = await place(pg, F(nm), 0, 0, w, h, 'keep' if t in ('sofa', 'sofaV', 'toilet') else 'fill', {'sofa': 0.7, 'sofaV': 0.7, 'toilet': 0.7, 'shelfS': 0.7, 'desk': 0.55, 'tv': 0.45}[t], pad=0.9, r=R(base)); it.append(o)
        if t == 'desk': o2, _ = await place(pg, F('computerScreen'), w * 0.25, h * 0.25, w * 0.5, h * 0.5, 'keep', 0.4, y=hh, r=R()); it.append(o2)
        if t == 'tv': o2, _ = await place(pg, F('televisionModern'), w * 0.1, h * 0.1, w * 0.8, h * 0.8, 'keep', 0.6, y=hh, r=R()); it.append(o2)
        return it
    async def tiled(names, hmax, mode='fill'):
        n_ = max(w, h)
        for k in range(n_):
            nm = names[k % len(names)] if isinstance(names, list) else names
            fx, fz = (k, 0) if long_x else (0, k)
            o, _ = await place(pg, F(nm), fx, fz, 1, 1, mode, hmax, r=0 if long_x else 3, pad=0.96); it.append(o)
    if t in ('bed', 'cbed'):
        o, _ = await place(pg, F('bedSingle'), 0, 0, w, h, 'keep', 0.7, r=0 if h >= w else 1, tint=0xd8e0d8 if t == 'cbed' else None); it.append(o)
    elif t == 'wardrobe':
        o, _ = await place(pg, F('bookcaseClosedDoors'), 0, 0, w, h, 'fill', 1.35, pad=0.92, tint=0xb08a66); it.append(o)
    elif t == 'locker':
        o, _ = await place(pg, F('bookcaseClosed'), 0, 0, w, h, 'fill', 1.3, pad=0.8, tint=0x8a9cb4); it.append(o)
    elif t == 'fridge':
        o, _ = await place(pg, F('kitchenFridge'), 0, 0, w, h, 'fill', 1.25, pad=0.8); it.append(o)
    elif t in ('desk', 'desk2', 'pc'):
        o, hh = await place(pg, F('desk'), 0, 0, w, h, 'fill', 0.55, pad=0.9); it.append(o)
        o2, _ = await place(pg, F('laptop' if t == 'desk2' else 'computerScreen'), w * 0.25, 0.1, w * 0.5, h * 0.5, 'keep', 0.4, y=hh); it.append(o2)
        if t == 'desk2': o3, _ = await place(pg, F('computerScreen'), w * 0.55, 0.1, w * 0.4, h * 0.45, 'keep', 0.4, y=hh); it.append(o3)
    elif t in ('sofa', 'sofaV'):
        o, _ = await place(pg, F('loungeSofa'), 0, 0, w, h, 'keep', 0.7, r=0 if w >= h else 1); it.append(o)
    elif t == 'tv':
        o, hh = await place(pg, F('cabinetTelevision'), 0, 0, w, h, 'fill', 0.45, pad=0.9); it.append(o)
        o2, _ = await place(pg, F('televisionModern'), 0, 0.1, w, h * 0.5, 'keep', 0.6, y=hh); it.append(o2)
    elif t == 'bath':
        o, _ = await place(pg, F('bathtub'), 0, 0, w, h, 'keep', 0.6, r=0 if w >= h else 1); it.append(o)
    elif t == 'toilet':
        o, _ = await place(pg, F('toilet'), 0, 0, w, h, 'keep', 0.7, r=2); it.append(o)
    elif t == 'sink':
        await tiled(['kitchenSink', 'kitchenStove', 'kitchenCabinet'], 0.8)
    elif t in ('counter', 'bar'):
        await tiled('kitchenBar', 0.75)
    elif t == 'shelf':
        await tiled('bookcaseOpen', 1.3)
    elif t == 'shelfS':
        o, _ = await place(pg, F('bookcaseOpenLow'), 0, 0, w, h, 'fill', 0.7); it.append(o)
    elif t == 'cab':
        o, _ = await place(pg, F('kitchenCabinetDrawer'), 0, 0, w, h, 'fill', 0.8, pad=0.8, tint=0xb8bcc4); it.append(o)
    elif t == 'medcab':
        await tiled('bathroomCabinetDrawer', 0.9)
    elif t == 'table':
        o, _ = await place(pg, F('tableCloth'), 0, 0, w, h, 'keep', 0.6); it.append(o)
    elif t == 'tableS':
        o, _ = await place(pg, F('sideTable'), 0, 0, w, h, 'keep', 0.6, pad=0.7); it.append(o)
    elif t == 'plant':
        o, _ = await place(pg, F('pottedPlant'), 0, 0, w, h, 'keep', 1.0, pad=0.7); it.append(o)
    elif t == 'boxes':
        for (bx, bz, by) in ((0.05, 0.4, 0), (0.5, 0.45, 0), (0.25, 0.1, 0)):
            o, _ = await place(pg, F('cardboardBoxClosed'), bx, bz, 0.45, 0.45, 'keep', 0.4, r=(int(bx * 10)) % 4); it.append(o)
    elif t == 'spk':
        o, _ = await place(pg, F('speaker'), 0, 0, w, h, 'keep', 1.2, pad=0.8); it.append(o)
    elif t == 'dj':
        o, hh = await place(pg, F('cabinetTelevision'), 0, 0, w, h, 'fill', 0.5, pad=0.9, tint=0x40424a); it.append(o)
        for k in (0.15, 0.6): o2, _ = await place(pg, F('speakerSmall'), w * k, 0.15, w * 0.25, h * 0.6, 'keep', 0.35, y=hh); it.append(o2)
    elif t == 'rug':
        o, _ = await place(pg, F('rugRectangle'), 0, 0, w, h, 'fill', 0.02, pad=0.85); it.append(o)
    else: return None
    return it
FURN_TOP = 1.9

GROUND = {'asph0': 'road-asphalt-center', 'asph1': 'road-asphalt-damaged', 'pave0': 'road-asphalt-pavement', 'dirt0': 'road-dirt-center', 'dirt1': 'road-dirt-damaged', 'grass0': 'grass'}
TREES = ['tree-large', 'tree-small', 'tree-pine-large', 'tree-park-large', 'tree-pine-small', 'tree-shrub']

def png2(url):
    im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA')
    return im.resize((im.width // 2, im.height // 2), Image.LANCZOS)

def webp(im, q=88):
    bio = io.BytesIO(); im.save(bio, 'WEBP', quality=q, method=6); return 'data:image/webp;base64,' + base64.b64encode(bio.getvalue()).decode()

async def furn_only():
    # python3 bake_base.py furn — spec.json 의 가구 조합 중 아직 없는 것만 구워 build/kit 와 build/kit_mk 두 키트에 넣는다 (건물은 그대로)
    spec = json.load(open(HERE + '/kenney_ruk/spec.json')); MK = '/root/game/build/kit_mk'
    kit = json.load(open(f'{OUT}/kit.json')); kmk = json.load(open(f'{MK}/kit.json'))
    need = sorted(set(c for st in spec for c in st.get('furn', [])) - set(kit.get('furn', {})))
    print('구울 가구', need)
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8773'], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await br.new_page()
            await pg.goto('http://localhost:8773/kenney_ruk/bake.html'); await pg.wait_for_function('window.__ok')
            for c in need:
                parts = c.split('_'); rr = int(parts[-1][1:]) if parts[-1].startswith('r') else 0
                if rr: parts = parts[:-1]
                t, wh = '_'.join(parts[:-1]), parts[-1]; w, h = map(int, wh.split('x'))
                items = await furn_items(pg, t, w, h, rr)
                if not items: continue
                im = png2(await pg.evaluate('bake', {'box': [-0.3, -FURN_TOP, w + 0.3, h + 0.25], 'ppu': PPU, 'items': items}))
                v = {'ox': -0.3 * 48, 'oy': -FURN_TOP * 48, 'src': webp(im)}; kit.setdefault('furn', {})[c] = v; kmk.setdefault('furn', {})[c] = v; im.save(f'{OUT}/f_{c}.png')
            await br.close()
    finally: srv.terminate()
    json.dump(kit, open(f'{OUT}/kit.json', 'w')); json.dump(kmk, open(f'{MK}/kit.json', 'w')); print('가구', len(kit['furn']))

async def main():
    if 'furn' in sys.argv: return await furn_only()
    spec = json.load(open(HERE + '/kenney_ruk/spec.json'))
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8772'], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    ONLY_PROPS = 'props' in sys.argv
    kit = json.load(open(f'{OUT}/kit.json')) if ONLY_PROPS else {'v': 1, 'ground': {}, 'trees': [], 'bld': {}}
    kit['ground'] = {}; kit['trees'] = []
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await br.new_page()
            pg.on('pageerror', lambda e: print('ERR', e))
            await pg.goto('http://localhost:8772/kenney_ruk/bake.html'); await pg.wait_for_function('window.__ok')
            for k, n in GROUND.items():
                im = png2(await pg.evaluate('bake', {'box': [0, 0, 1, 1], 'ppu': PPU, 'ground': False, 'items': [{'n': n, 'x': 0.5, 'z': 0.5, 'r': 0}]}))
                kit['ground'][k] = webp(im.convert('RGB'), 90); im.save(f'{OUT}/g_{k}.png')
            for n in TREES:
                im = png2(await pg.evaluate('bake', {'box': [-1, 0.5 - 3.6, 2, 1.3], 'ppu': PPU, 'items': [{'n': n, 'x': 0.5, 'z': 0.5, 'r': 0, 'nobase': True, 's': [1.7, 1.7, 1.7], **({'tint': 0xc8f0a8, 'glow': 0x14240c} if 'pine' in n else {})}]}))
                kit['trees'].append(webp(im)); im.save(f'{OUT}/t_{n}.png')
            im = png2(await pg.evaluate('bake', {'box': [-0.5, -0.9, 1.5, 1.3], 'ppu': PPU, 'items': [{'n': 'tree-shrub', 'x': 0.5, 'z': 0.55, 'r': 1, 'nobase': True, 's': [2.4, 1.8, 2.4]}]}))
            kit['bush'] = webp(im); im.save(f'{OUT}/t_bush.png')
            TEX = '/root/game/tools/prerender/kenney_ruk/src/Models/GLB format/Textures/'
            kit['tex'] = {k: 'data:image/png;base64,' + base64.b64encode(open(TEX + k + '.png', 'rb').read()).decode() for k in ('planks', 'tiles', 'concrete', 'wall', 'wall_lines', 'metal')}
            kit['furn'] = {}
            combos = sorted(set(c for st in spec for c in st.get('furn', [])))
            for c in combos:
                parts = c.split('_'); rr = int(parts[-1][1:]) if parts[-1].startswith('r') else 0
                if rr: parts = parts[:-1]
                t, wh = '_'.join(parts[:-1]), parts[-1]; w, h = map(int, wh.split('x'))
                items = await furn_items(pg, t, w, h, rr)
                if not items: continue
                im = png2(await pg.evaluate('bake', {'box': [-0.3, -FURN_TOP, w + 0.3, h + 0.25], 'ppu': PPU, 'items': items}))
                kit['furn'][c] = {'ox': -0.3 * 48, 'oy': -FURN_TOP * 48, 'src': webp(im)}; im.save(f'{OUT}/f_{c}.png')
            print('furniture', len(kit['furn']))
            # 거리 소품: 대형 쓰레기통 (숨는 곳·시체 넣는 곳)
            im = png2(await pg.evaluate('bake', {'box': [-0.35, -1.05, 1.35, 1.25], 'ppu': PPU, 'items': [{'n': 'detail-dumpster-closed', 'x': 0.5, 'z': 0.6, 'r': 0, 's': [1.55, 1.5, 1.55]}]}))
            kit['props'] = {'dumpster': {'ox': -0.35 * 48, 'oy': -1.05 * 48, 'src': webp(im)}}; im.save(f'{OUT}/p_dumpster.png')
            total = 0
            for st in []:  # 건물 외관은 MegaKit(bake_mk.py)로 굽는다
                lst = []
                for b in st['b']:
                    box, items = bld_items(b)
                    im = png2(await pg.evaluate('bake', {'box': box, 'ppu': PPU, 'items': items}))
                    d = webp(im); total += len(d)
                    lst.append({'i': b['i'], 'key': [b['x0'], b['y0'], b['x1'], b['y1'], b['h']], 'ox': box[0] * 48, 'oy': box[1] * 48, 'w': im.width, 'h': im.height, 'src': d})
                    if b['i'] < 3: im.save(f"{OUT}/b_{st['id']}_{b['i']}.png")
                kit['bld'][st['id']] = lst; print(st['id'], len(lst), 'buildings')
            print('building data KB', total // 1024)
            await br.close()
    finally: srv.terminate()
    json.dump(kit, open(f'{OUT}/kit.json', 'w')); print('kit.json KB', os.path.getsize(f'{OUT}/kit.json') // 1024)
asyncio.run(main())
