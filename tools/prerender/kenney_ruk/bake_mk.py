# 비교용 배경: 건물 외관·지붕을 Quaternius Downtown City MegaKit(CC0)으로 굽는다 → build/kit_mk/kit.json
# 바닥·나무·가구·소품은 기존 kit.json(Kenney)을 그대로 쓴다. 먼저 spec.py와 bake.py를 돌려 둘 것
import asyncio, base64, io, json, os, subprocess, sys, time, hashlib
from PIL import Image
from playwright.async_api import async_playwright
HERE = '/root/game/tools/prerender'; BASE = '/root/game/build/kit'; OUT = '/root/game/build/kit_mk'; os.makedirs(OUT, exist_ok=True)
PPU = 96
DRESS = '--plain' not in sys.argv   # 옥상 살림(옥탑방·간판·채광창·텃밭·빨랫줄·태양광판)
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
    # 지붕: 평지붕(콘크리트 판) + 난간. 단독주택은 앞쪽에 슬레이트 맨사드
    pk = 0.45
    for xx in range(x0, x1 + 1):
        for zz in range(zB, zF): it.append(M('Entrance_Concrete_2x2', xx + 0.5, h - 0.02, zz + 0.5, s=(0.5, 0.06, 0.5), cast=False, wallTint=0xb8b4ae if (xx + zz) % 2 else 0xa8a49e))
    for bx in ([x0, h, zB, x1 + 1, h + 0.22, zB + 0.12], [x0, h, zB, x0 + 0.12, h + 0.22, zF], [x1 + 1 - 0.12, h, zB, x1 + 1, h + 0.22, zF]):
        it.append({'box': bx, 'color': 0x6e6a66})
    mansard = house and dr >= 2
    if mansard:
        for xx in range(x0, x1 + 1): it.append(M('Roof_SlateCornice_Window_1' if (xx - x0) % 3 == 1 else 'Roof_SlateCornice_Center', xx + 0.5, h, zF, s=(0.5, 1 / 3, 0.5)))
        pk = 1.1
    else:
        for xx in range(x0, x1 + 1): it.append(M(fam['cornice'], xx + 0.5, h - 0.05, zF, s=(0.5, 0.3, 0.5), wallTint=tint))
    # 옥상 살림: 칸 단위로 자리를 잡아 서로 겹치지 않게 놓는다 (그림만, 이동은 막지 않음)
    fr = 1 if mansard else 0; occ = set()
    def take(cw, cd, cands):
        for cx, cz in cands:
            if cx < x0 or cx + cw - 1 > x1 or cz < zB or cz + cd - 1 > zF - 1 - fr: continue
            cells = {(a, c) for a in range(cx, cx + cw) for c in range(cz, cz + cd)}
            if cells & occ: continue
            occ.update(cells); return cx, cz
        return None
    def mix(seed, rows=None):
        return sorted([(a, c) for c in (rows or range(zB, zF)) for a in range(x0, x1 + 1)], key=lambda p: H(p, seed, hs))
    neonR = [0xff3ca8, 0x3ce0ff, 0xffb040, 0xb45aff][hs % 4]
    okt = None
    if DRESS and not b['glass'] and w >= 5 and dr - fr >= 3 and H(hs, 'okt') % 5 < 3:  # 옥탑방: 하늘색 지붕 + 불 켜진 창 + 문
        okt = take(3, 2, sorted([(x0, zB), (x1 - 2, zB), (x0 + (w - 3) // 2, zB)], key=lambda p: H(p, hs, 'o')))
        if okt:
            ox, oz = okt[0] + 0.4, okt[1]
            it.append({'box': [ox, h, oz + 0.3, ox + 2.2, h + 0.85, oz + 1.9], 'color': 0xd8d2c4})
            it.append({'box': [ox - 0.08, h + 0.85, oz + 0.22, ox + 2.28, h + 0.95, oz + 1.98], 'color': 0x3d6b8a})
            lit_o = hs % 3 != 0
            it.append({'box': [ox + 0.3, h + 0.3, oz + 1.9, ox + 1.0, h + 0.7, oz + 1.93], 'color': 0xffd9a0 if lit_o else 0x1a2433, 'emi': 0xffa850 if lit_o else 0x0a1220, 'ei': 1.4 if lit_o else 0.4, **({'gl': 'w'} if lit_o else {})})
            it.append({'box': [ox + 1.4, h, oz + 1.9, ox + 1.85, h + 0.72, oz + 1.93], 'color': 0x6a4a30})
            pk = max(pk, 0.8)
    if DRESS and not house and not b['glass'] and w >= 6 and hs % 3:  # 옥상 간판: 앞쪽 끝에 길 쪽을 보고 선 네온 판 (글자는 게임이 쓴다)
        sg = take(4, 1, mix(1, [zF - 1]))
        if sg:
            sx0 = sg[0] + 0.3; sz = zF - 0.36
            for lx in (sx0 + 0.3, sx0 + 3.1): it.append({'cyl': [lx, h, sz - 0.05, lx, h + 0.3, sz - 0.05], 'r': 0.05, 'color': 0x7a7f88, 'metal': 0.5})
            it.append({'box': [sx0, h + 0.22, sz - 0.12, sx0 + 3.4, h + 0.9, sz], 'color': 0x101018})
            it.append({'box': [sx0 + 0.1, h + 0.3, sz, sx0 + 3.3, h + 0.82, sz + 0.03], 'color': neonR, 'emi': neonR, 'ei': 1.6, 'gl': 's'})
    if not okt and w >= 4 and dr - fr >= 2:  # 옥상 출입구(작은 계단실)
        st_ = take(2, 1, mix(2, [zB]))
        if st_:
            ex = st_[0] + 0.4; it.append({'box': [ex, h, zB + 0.2, ex + 1.1, h + 0.55, zB + 1.0], 'color': 0x8a7f74}); it.append({'box': [ex - 0.02, h + 0.55, zB + 0.16, ex + 1.12, h + 0.6, zB + 1.04], 'color': 0x5a5550})
    if h >= 2 and hs % 3 == 0 and w >= 4 and dr - fr >= 2:  # 물탱크: 나무 통 + 다리 (뉴욕 옥상)
        wt = take(2, 2, mix(3))
        if wt:
            tx, tz = wt[0] + 1, wt[1] + 1
            for lx, lz in ((-0.22, -0.22), (0.22, -0.22), (-0.22, 0.22), (0.22, 0.22)): it.append({'cyl': [tx + lx, h + 0.05, tz + lz, tx + lx, h + 0.55, tz + lz], 'r': 0.035, 'color': 0x3a3d44})
            it.append({'cyl': [tx, h + 0.55, tz, tx, h + 1.05, tz], 'r': 0.32, 'color': 0x7a5638, 'rough': 0.9, 'metal': 0})
            it.append({'cyl': [tx, h + 1.05, tz, tx, h + 1.16, tz], 'r': 0.24, 'color': 0x3a3d44})
            pk = max(pk, 1.2)
    if DRESS and w >= 8 and dr - fr >= 4 and H(hs, 'sol') % 2:  # 태양광판
        sp = take(3, 2, mix(4))
        if sp:
            for k in range(3): it.append({'box': [sp[0] + 0.05 + k * 0.97, h + 0.15, sp[1] + 0.3, sp[0] + 0.92 + k * 0.97, h + 0.22, sp[1] + 1.7], 'color': 0x1c3260, 'metal': 0.6, 'rough': 0.25})
    if DRESS and not b['glass'] and dr - fr >= 3 and w >= 5 and H(hs, 'ln') % 3:  # 빨랫줄
        ln = take(4, 1, mix(5))
        if ln:
            lx0, lx1, lz = ln[0] + 0.15, ln[0] + 3.85, ln[1] + 0.5
            for lx in (lx0, lx1): it.append({'cyl': [lx, h, lz, lx, h + 0.75, lz], 'r': 0.03, 'color': 0x8a8f96})
            it.append({'cyl': [lx0, h + 0.72, lz, lx1, h + 0.72, lz], 'r': 0.012, 'color': 0xcccccc})
            for k, c in enumerate([0xe0e4ea, 0x5a7ab0, 0xc04848, 0xe0d070]):
                if (hs >> k) % 4: it.append({'box': [lx0 + 0.3 + k * 0.85, h + 0.35, lz - 0.02, lx0 + 0.75 + k * 0.85, h + 0.72, lz + 0.02], 'color': c})
    if DRESS and not b['glass']:  # 채광창: 아래층 불빛이 새어 나온다
        for k in range(max(1, w // 4)):
            sl = take(1, 1, mix(10 + k, range(zB + 2, zF)))
            if sl: it.append({'box': [sl[0] + 0.05, h, sl[1] + 0.2, sl[0] + 0.95, h + 0.08, sl[1] + 0.8], 'color': 0x6a6e76}); it.append({'box': [sl[0] + 0.13, h + 0.08, sl[1] + 0.28, sl[0] + 0.87, h + 0.1, sl[1] + 0.72], 'color': 0xffe0b0, 'emi': 0xffb060, 'ei': 1.1, 'gl': 'k'})
    if DRESS and not b['glass'] and not mansard and w >= 4:  # 스티로폼 텃밭: 앞쪽 줄
        gd = take(4, 1, mix(6, [zF - 1]))
        if gd:
            for k in range(5):
                gx = gd[0] + 0.1 + k * 0.76; it.append({'box': [gx, h, zF - 0.9, gx + 0.6, h + 0.18, zF - 0.5], 'color': 0xe8e8e8}); it.append({'box': [gx + 0.05, h + 0.18, zF - 0.85, gx + 0.55, h + 0.3, zF - 0.55], 'color': 0x3f7a3a})
    for k in range(max(1, w // 3)):  # 에어컨 실외기
        ac = take(1, 1, mix(20 + k))
        if ac: it.append(M('Prop_ACUnit', ac[0] + 0.5, h + 0.07, ac[1] + 0.5, r=(hs >> k) % 4, s=(0.55, 0.55, 0.55)))
    if not mansard: it.append(M('Prop_Drain', x0 + 0.6, h + 0.04, zB + 0.5, s=(0.6, 1, 0.6)))
    for k in range(max(1, w // 4)):  # 환기관
        vt = take(1, 1, mix(30 + k))
        if vt: it.append({'cyl': [vt[0] + 0.5, h, vt[1] + 0.5, vt[0] + 0.5, h + 0.3, vt[1] + 0.5], 'r': 0.07, 'color': 0x9aa0a8, 'metal': 0.5, 'rough': 0.4})
    if shop and not mansard:  # 간판 불빛: 가게 지붕 끝에 네온 띠
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
    only = next((a for a in sys.argv[1:] if not a.startswith('--')), None)
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
                    gl = []
                    for q in items:
                        if q.get('gl') and 'box' in q:
                            a, bb, c, d, e, f = q['box']; gl.append([round((a - box[0]) * 48), round((c - e - box[1]) * 48), round((d - a) * 48), round((f - bb - c + e) * 48), '#%06x' % q['color'], q['gl']])
                    lst.append({'i': b['i'], 'key': [b['x0'], b['y0'], b['x1'], b['y1'], b['h']], 'ox': box[0] * 48, 'oy': box[1] * 48, 'w': im.width, 'h': im.height, 'src': webp(im), 'gl': gl})
                    im.save(f"{OUT}/b_{st['id']}_{b['i']}.png")
                kit['bld'][st['id']] = lst; print(st['id'], len(lst), 'buildings', flush=True)
            await br.close()
    finally: srv.terminate()
    json.dump(kit, open(f'{OUT}/kit.json', 'w')); print('kit_mk.json KB', os.path.getsize(f'{OUT}/kit.json') // 1024)
asyncio.run(main())
