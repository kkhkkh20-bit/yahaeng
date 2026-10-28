# 에셋 묶음 v2 — Ninja Adventure Asset Pack (Pixel-Boy & AAA, CC0) 중심으로 교체
# 발소리 등 일부 효과음은 기존 Kenney(CC0) 것을 유지한다.
import json, base64, subprocess, os, colorsys, sys
THEME = 'city'  # 도시판 아틀라스·소리 (원본 에셋 dl/ 필요). 옛 조선·네오 시안은 지웠다
from PIL import Image

NA = '/root/game/dl/ninja/pack/Ninja Adventure - Asset Pack/'
KD = '/root/game/dl/'
TS = NA + 'Backgrounds/Tilesets/'
img = lambda p: Image.open(p).convert('RGBA')
TF, TIF, TW, TWA, TN, TE, TH = [img(TS + f) for f in ['TilesetFloor.png', 'Interior/TilesetInteriorFloor.png', 'Interior/TilesetWallSimple.png', 'TilesetWater.png', 'TilesetNature.png', 'TilesetElement.png', 'TilesetHouse.png']]

items = []
def setcol(im, h, s_mul, v_mul, s_abs=None):
    out = Image.new('RGBA', im.size)
    for yy in range(im.height):
        for xx in range(im.width):
            r, g, b, a = im.getpixel((xx, yy)); hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb(h, s_abs if s_abs is not None else min(1, ss * s_mul), min(1, vv * v_mul))
            out.putpixel((xx, yy), (int(r2 * 255), int(g2 * 255), int(b2 * 255), a))
    return out
def t16(name, src, x, y, w=1, h=1): items.append((name, src.crop((x * 16, y * 16, (x + w) * 16, (y + h) * 16))))
def raw(name, im): items.append((name, im))

# 바닥
t16('grass0', TF, 11, 12); t16('grass1', TF, 13, 12); t16('grass2', TF, 14, 12)
t16('fdirt0', TF, 17, 9); t16('fdirt1', TF, 16, 9); t16('lawn0', TF, 11, 12); t16('lawn1', TF, 13, 12); t16('lawn2', TF, 14, 12)  # 도시 테마에서도 쓰는 잔디(숲속 마을)
t16('dirt0', TF, 17, 9); t16('dirt1', TF, 16, 9)
t16('stone0', TF, 17, 16); t16('stone1', TF, 15, 15)
t16('wood', TIF, 5, 14); t16('wood2', TIF, 12, 1); t16('water', TWA, 1, 2)
# 벽(갈색 테두리 조각)
t16('wallTL', TW, 0, 6); t16('wallH', TW, 1, 6); t16('wallTR', TW, 4, 6); t16('wallV', TW, 0, 7)
t16('wallBL', TW, 0, 10); t16('wallHB', TW, 1, 10); t16('wallBR', TW, 4, 10); t16('wallVR', TW, 4, 7)
# 사물
t16('crate', TE, 0, 0); t16('crate2', TE, 9, 2); t16('pot0', TE, 1, 0); t16('pot1', TE, 2, 9)
t16('box', TE, 1, 9); t16('sack', TE, 8, 2); t16('rock', TN, 8, 12)
t16('bush0', TN, 1, 10); t16('bush1', TN, 6, 10); t16('bush2', TN, 10, 9)
t16('treeR', TN, 6, 8, 2, 2); t16('pine', TN, 0, 0, 2, 2); t16('treeP', TN, 0, 18, 2, 2)
# 3/4 정면벽 조각 (집 타일셋): 황토 벽, 격자 창, 문
def h16(name, x, y): items.append((name, TH.crop((x, y, x + 16, y + 16))))
h16('fWallL', 64, 32); h16('fWall', 96, 32); h16('fWall2', 160, 32); h16('fWallR', 112, 32)
h16('fWin', 0, 48); h16('fWinBar', 16, 48); h16('fDoor', 128, 48); h16('fDoorOpen', 144, 48)
t16('bench', TE, 2, 10, 3, 1); t16('shelf', TE, 3, 7, 2, 2)
# 지붕 질감: 붉은 기와를 기준으로 색만 바꾼 변형
roof = TH.crop((216, 8, 232, 24))
def recolor(im, hue=None, sat=1.0, val=1.0):
    out = Image.new('RGBA', im.size)
    for yy in range(im.height):
        for xx in range(im.width):
            r, g, b, a = im.getpixel((xx, yy))
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if hue is not None: h = (h + hue) % 1
            s = min(1, s * sat); v = min(1, v * val)
            r2, g2, b2 = colorsys.hsv_to_rgb(h, s, v)
            out.putpixel((xx, yy), (int(r2 * 255), int(g2 * 255), int(b2 * 255), a))
    return out
raw('roofRed', roof); raw('roofGreen', recolor(roof, 0.30, 0.55, 0.62)); raw('roofSlate', recolor(roof, 0.58, 0.28, 0.6)); raw('roofOrange', recolor(roof, 0.05, 0.9, 0.95)); raw('roofBrown', recolor(roof, 0.06, 0.55, 0.55))
# 캐릭터 (64x112: 4방향 x 7행, 16px)
CH = NA + 'Actor/Character/'
def recolor_fn(im, fn):
    out = im.copy(); px = out.load()
    for yy in range(out.height):
        for xx in range(out.width):
            r, g, b, a = px[xx, yy]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); h, s, v = fn(h, s, v)
            r2, g2, b2 = colorsys.hsv_to_rgb(h % 1, min(1, s), min(1, v)); px[xx, yy] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return out
skin = lambda h, s, v: 0.02 < h < 0.12 and s > 0.25 and v > 0.55
navy = lambda h, s, v: (h, s, v) if (skin(h, s, v) or s < 0.15) else (0.62, 0.45, v * 0.62)
redcoat = lambda h, s, v: (h, s, v) if (skin(h, s, v) or s < 0.15) else (0.99, 0.7, v * 0.75)
blackhat = lambda h, s, v: (h, s, v * 0.22) if (s < 0.18 and v > 0.6) else ((h, s, v) if skin(h, s, v) else (0.55, 0.4, v * 0.6))
CAST = [('ninja', 'NinjaDark', None), ('sam', 'Samurai', None), ('samB', 'SamuraiBlue', None), ('samR', 'SamuraiRed', None), ('noble', 'Noble', None), ('old', 'OldMan', None), ('hunter', 'Hunter', None)]
for key, folder, fn in CAST:
    sp = CH + folder + '/SpriteSheet.png'
    sheet = img(sp if os.path.exists(sp) else CH + folder + '/redsamurai.png'); dead = img(CH + folder + '/SeparateAnim/Dead.png')
    if fn: sheet = recolor_fn(sheet, fn); dead = recolor_fn(dead, fn)
    raw('ch_' + key, sheet); raw('dead_' + key, dead)
raw('dog', img(NA + 'Actor/Animal/Dog/SpriteSheet.png'))
# 그림자 속 주인공: 검은 몸 + 붉은 테두리 (Mark of the Ninja 방식)
_nin = img(CH + 'NinjaDark/SpriteSheet.png'); _sh = Image.new('RGBA', _nin.size); _np = _nin.load(); _sp = _sh.load()
for yy in range(_nin.height):
    for xx in range(_nin.width):
        if _np[xx, yy][3] < 40: continue
        edge = any(not (0 <= xx + dx < _nin.width and 0 <= yy + dy < _nin.height) or _np[xx + dx, yy + dy][3] < 40 or (xx + dx) // 16 != xx // 16 or (yy + dy) // 16 != yy // 16 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        _sp[xx, yy] = (232, 60, 52, 255) if edge else (16, 12, 22, 255)
raw('ch_ninja_sh', _sh)
# 숨은 상태 표시용: 몸 바깥쪽 외곽선만 (밝은 하늘색)
_ol = Image.new('RGBA', _nin.size); _op = _ol.load()
for yy in range(_nin.height):
    for xx in range(_nin.width):
        if _np[xx, yy][3] >= 40: continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = xx + dx, yy + dy
            if 0 <= nx < _nin.width and 0 <= ny < _nin.height and nx // 16 == xx // 16 and ny // 16 == yy // 16 and _np[nx, ny][3] >= 40:
                _op[xx, yy] = (190, 243, 255, 255); break
raw('ch_ninja_ol', _ol)
for key, folder, fn in CAST + [('master', 'Master', None)]:
    fs = CH + folder + '/Faceset.png'
    if os.path.exists(fs): f_im = img(fs); raw('fc_' + key, recolor_fn(f_im, fn) if fn else f_im)
for k, n in [('q', 23), ('ex', 22), ('dots', 20), ('exq', 25), ('zz', 5), ('chat', 18), ('meh', 14)]:
    raw('em_' + k, img(NA + f'Ui/Emote/emote{n}.png'))
raw('fx_slash', img(NA + 'FX/Slash/SpriteSheetSlash01.png')); raw('fx_smoke', img(NA + 'FX/Smoke/Smoke/SpriteSheet.png'))
raw('it_scroll', img(NA + 'Items/Scroll/Scroll.png')); raw('it_coin', img(NA + 'Items/Treasure/GoldCoin.png')); raw('it_key', img(NA + 'Items/Treasure/GoldKey.png'))

if THEME == 'city':
    # 현대 도시 시안: Kenney 'RPG Urban Pack' (CC0) 타일로 바닥·벽돌 정면·옥상·인물을 바꾼다
    UT = img('/root/game/dl/city/urban/Tilemap/tilemap_packed.png')
    def u(x, y, w=1, h=1): return UT.crop((x * 16, y * 16, (x + w) * 16, (y + h) * 16))
    def put(name, im):
        for i, (n, _) in enumerate(items):
            if n == name: items[i] = (name, im); return
        items.append((name, im))
    def pal(im, mp):
        out = im.copy(); px = out.load()
        for yy in range(out.height):
            for xx in range(out.width):
                c = px[xx, yy]
                if c[3] and c[:3] in mp: px[xx, yy] = mp[c[:3]] + (c[3],)
        return out
    # 바닥: 아스팔트('.'), 보도블록('='), 흙 공터(','), 실내 장판(w)
    put('grass0', u(1, 15)); put('grass1', u(7, 16)); put('grass2', u(9, 17))
    put('stone0', u(9, 1)); put('stone1', u(10, 1))
    put('dirt0', setcol(TF.crop((17 * 16, 9 * 16, 18 * 16, 10 * 16)), 0.08, 1, 0.62, 0.18)); put('dirt1', setcol(TF.crop((16 * 16, 9 * 16, 17 * 16, 10 * 16)), 0.08, 1, 0.6, 0.18))
    put('wood', setcol(TIF.crop((5 * 16, 14 * 16, 6 * 16, 15 * 16)), 0.11, 1, 1.05, 0.42))
    for n, (x, y) in {'wallTL': (0, 6), 'wallH': (1, 6), 'wallTR': (4, 6), 'wallV': (0, 7), 'wallBL': (0, 10), 'wallHB': (1, 10), 'wallBR': (4, 10), 'wallVR': (4, 7)}.items():
        put(n, setcol(TW.crop((x * 16, y * 16, x * 16 + 16, y * 16 + 16)), 0.62, 1, 0.95, 0.07))
    # 정면벽: 붉은 벽돌 / 주황 벽돌(B) + 층 사이 띠 + 창 + 문
    put('fWallL', u(17, 2)); put('fWall', u(18, 2)); put('fWall2', u(21, 2)); put('fWallR', u(19, 2)); put('fBand', u(18, 1))
    put('fWallLB', u(17, 6)); put('fWallB', u(18, 6)); put('fWall2B', u(21, 6)); put('fWallRB', u(19, 6)); put('fBandB', u(18, 5))
    put('fWin', u(13, 16)); put('fWinB', u(13, 13)); put('fWinBar', u(12, 16)); put('fDoor', u(13, 10)); put('fDoorOpen', u(13, 11))
    # 옥상(테두리 난간이 있는 평지붕) 9칸 조각: 베이지 / 회청 / 초록 방수 페인트
    put('cRoofA', u(0, 3, 3, 3)); put('cRoofB', u(8, 3, 3, 3))
    put('cRoofG', recolor_fn(u(0, 3, 3, 3), lambda h, s, v: (0.42, 0.42, v * 0.8) if (0.08 < h < 0.2 and s < 0.35) else (h, s, v)))
    # 소품: 종이 상자 · 쓰레기통 · 콘크리트 블록 · 의류수거함(숨는 곳)
    put('crate', u(3, 10)); put('crate2', u(4, 11)); put('pot0', u(9, 10)); put('pot1', u(10, 10)); put('rock', u(0, 10))
    from PIL import ImageDraw
    bin_ = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(bin_)
    d.rectangle((1, 2, 14, 15), fill=(34, 72, 52, 255)); d.rectangle((2, 3, 13, 14), fill=(62, 128, 88, 255)); d.rectangle((2, 3, 13, 5), fill=(92, 162, 116, 255))
    d.rectangle((4, 7, 11, 8), fill=(20, 30, 26, 255)); d.rectangle((5, 10, 10, 12), fill=(232, 236, 230, 255)); d.point((7, 11), fill=(62, 128, 88, 255))
    put('box', bin_)
    # 주차된 차(세로 1x2): 흰색·은색·검은색이 대부분, 가끔 빨강·남색
    car = u(17, 16, 1, 2)
    redish = lambda h, s, v: (h < 0.06 or h > 0.9) and s > 0.35
    put('car0', recolor_fn(car, lambda h, s, v: (h, 0.04, min(1, v * 1.25)) if redish(h, s, v) else (h, s, v)))
    put('car1', recolor_fn(car, lambda h, s, v: (0.6, 0.06, v * 0.85) if redish(h, s, v) else (h, s, v)))
    put('car2', recolor_fn(car, lambda h, s, v: (0.62, 0.15, v * 0.32) if redish(h, s, v) else (h, s, v)))
    put('car3', car)
    # 욕실 타일(흰 바탕 하늘색 줄눈)
    tb = Image.new('RGBA', (16, 16), (226, 232, 236, 255)); d2 = ImageDraw.Draw(tb)
    for k in (0, 8): d2.line((0, k, 15, k), fill=(170, 196, 210, 255)); d2.line((k, 0, k, 15), fill=(170, 196, 210, 255))
    put('tileB', tb)
    put('car4', recolor_fn(car, lambda h, s, v: (0.6, 0.55, v * 0.6) if redish(h, s, v) else (h, s, v)))
    # 인물: 4방향(정면·뒤·왼쪽, 오른쪽은 뒤집기) x 3동작 → 닌자 어드벤처 배치(64x112)로 다시 짠다
    SK = {'skin': None}
    def sheet_of(ci, mp=None):
        cols = [24, 25, 23, None]  # 아래(정면), 위(뒤), 왼쪽, 오른쪽
        rows = [0, 1, 0, 2, 1, 0, 0]
        sh = Image.new('RGBA', (64, 112), (0, 0, 0, 0))
        for di, cx in enumerate(cols):
            for ri, rr in enumerate(rows):
                fr = u(cx if cx is not None else 23, ci * 3 + rr)
                if cx is None: fr = fr.transpose(Image.FLIP_LEFT_RIGHT)
                if mp: fr = pal(fr, mp)
                sh.paste(fr, (di * 16, ri * 16))
        dead = sh.crop((0, 0, 16, 16)).rotate(90, expand=False)
        dead = recolor_fn(dead, lambda h, s, v: (h, s * 0.8, v * 0.8))
        face = Image.new('RGBA', (38, 38), (0, 0, 0, 0)); face.paste(sh.crop((0, 0, 16, 14)).resize((32, 28), Image.NEAREST), (3, 7))
        return sh, dead, face
    PLAYER = {(199, 123, 71): (58, 62, 80), (169, 103, 59): (42, 45, 60), (170, 168, 189): (78, 80, 96)}
    OLIVE = {(137, 140, 166): (104, 116, 74), (170, 168, 189): (128, 140, 92), (96, 96, 90): (58, 58, 54), (84, 84, 78): (48, 48, 44)}
    MAROON = {(66, 163, 121): (150, 62, 60), (54, 144, 105): (124, 48, 50), (220, 134, 82): (74, 60, 54), (197, 118, 82): (60, 48, 44), (214, 212, 170): (70, 72, 84), (197, 185, 147): (58, 60, 70)}
    HELMET = {(245, 169, 76): (66, 70, 80), (218, 146, 62): (52, 55, 64), (188, 125, 54): (40, 42, 50), (145, 142, 185): (78, 82, 96)}
    DOC = {(137, 140, 166): (236, 238, 240), (170, 168, 189): (214, 218, 224), (96, 96, 90): (70, 74, 86), (84, 84, 78): (58, 62, 72)}
    for key, ci, mp in [('ninja', 5, PLAYER), ('sam', 4, OLIVE), ('samB', 0, MAROON), ('samR', 3, HELMET), ('noble', 1, None), ('old', 2, None), ('hunter', 3, None), ('master', 2, None), ('civ0', 0, None), ('civ1', 1, None), ('civ2', 2, None), ('civ3', 4, None), ('doc', 4, DOC)]:
        sh, dead, face = sheet_of(ci, mp)
        if key != 'master': put('ch_' + key, sh); put('dead_' + key, dead)
        put('fc_' + key, face)
    _cn = dict(items)['ch_ninja']; _cp = _cn.load(); _ol = Image.new('RGBA', _cn.size); _op = _ol.load()
    for yy in range(_cn.height):
        for xx in range(_cn.width):
            if _cp[xx, yy][3] >= 40: continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = xx + dx, yy + dy
                if 0 <= nx < _cn.width and 0 <= ny < _cn.height and nx // 16 == xx // 16 and ny // 16 == yy // 16 and _cp[nx, ny][3] >= 40:
                    _op[xx, yy] = (190, 243, 255, 255); break
    put('ch_ninja_ol', _ol)
W = 1024; x = y = rowh = 0; pad = 2; frames = {}; placed = []
for name, im in items:
    if x + im.width > W: x = 0; y += rowh + pad; rowh = 0
    placed.append((name, im, x, y)); frames[name] = [x, y, im.width, im.height]
    x += im.width + pad; rowh = max(rowh, im.height)
H = y + rowh
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for name, im, px, py in placed: atlas.paste(im, (px, py))
APNG = '/root/game/build/atlas_city.png'
atlas.save(APNG, optimize=True)

SND = NA + 'Audio/Sounds/'
sounds = {
    'step_c0': KD + 'kenney_impact-sounds/Audio/footstep_concrete_000.ogg', 'step_c1': KD + 'kenney_impact-sounds/Audio/footstep_concrete_001.ogg', 'step_c2': KD + 'kenney_impact-sounds/Audio/footstep_concrete_002.ogg',
    'step_g0': KD + 'kenney_impact-sounds/Audio/footstep_grass_000.ogg', 'step_g1': KD + 'kenney_impact-sounds/Audio/footstep_grass_001.ogg', 'step_g2': KD + 'kenney_impact-sounds/Audio/footstep_grass_002.ogg',
    'step_w0': KD + 'kenney_impact-sounds/Audio/footstep_wood_000.ogg', 'step_w1': KD + 'kenney_impact-sounds/Audio/footstep_wood_001.ogg', 'step_w2': KD + 'kenney_impact-sounds/Audio/footstep_wood_002.ogg',
    'kill': SND + 'Whoosh & Slash/Slash.wav', 'kill2': SND + 'Whoosh & Slash/Slash2.wav', 'thud': SND + 'Hit & Impact/Impact.wav',
    'cloth': KD + 'kenney_rpg-audio/Audio/cloth2.ogg', 'drop': KD + 'kenney_rpg-audio/Audio/dropLeather.ogg', 'stone': SND + 'Hit & Impact/Hit2.wav',
    'throw': SND + 'Whoosh & Slash/Whoosh.wav', 'fuse': KD + 'kenney_rpg-audio/Audio/metalLatch.ogg', 'switch': KD + 'kenney_interface-sounds/Audio/switch_003.ogg',
    'question': SND + 'Alert/Alert2.wav', 'alert': SND + 'Alert/Alert.wav', 'alarm': SND + 'Alert/Alert4.wav', 'win': NA + 'Audio/Jingles/Success1.wav' if os.path.exists(NA + 'Audio/Jingles/Success1.wav') else KD + 'kenney_interface-sounds/Audio/confirmation_002.ogg',
    'lose': KD + 'kenney_interface-sounds/Audio/error_008.ogg', 'click': KD + 'kenney_interface-sounds/Audio/click_002.ogg', 'knife': SND + 'Whoosh & Slash/Sword2.wav',
    'glass': KD + 'kenney_impact-sounds/Audio/impactGlass_light_002.ogg', 'kunai': SND + 'Whoosh & Slash/Launch.wav', 'land': SND + 'Hit & Impact/Hit5.wav', 'metal': KD + 'kenney_impact-sounds/Audio/impactMetal_light_001.ogg',
    'bark': NA + 'Audio/Sounds/Creature/Dog.wav', 'call': SND + 'Voice/Voice3.wav',
    'bell': '/root/game/dl/synth/bell.wav',
    'step_m0': '/root/game/dl/oga/fs/footsteps/metal/0.ogg', 'step_m1': '/root/game/dl/oga/fs/footsteps/metal/3.ogg', 'step_m2': '/root/game/dl/oga/fs/footsteps/metal/5.ogg',
    'step_d0': '/root/game/dl/oga/fs/footsteps/gravel/0.ogg', 'step_d1': '/root/game/dl/oga/fs/footsteps/gravel/2.ogg', 'step_d2': '/root/game/dl/oga/fs/footsteps/gravel/4.ogg'
}
creature = NA + 'Audio/Sounds/Creature/'
if os.path.isdir(creature):
    dogs = [f for f in os.listdir(creature) if 'og' in f.lower() or 'bark' in f.lower()]
    sounds['bark'] = creature + (dogs[0] if dogs else sorted(os.listdir(creature))[0])
snd = {}
for k, p in sounds.items():
    if not p: continue
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', '22050', '-b:a', '40k', '-f', 'mp3', '-'], capture_output=True, check=True).stdout
    snd[k] = 'data:audio/mpeg;base64,' + base64.b64encode(out).decode()
music = {}
for k, f in [('calm', '37 - Dark Forest.ogg'), ('tense', '28 - Tension.ogg'), ('fight', '17 - Fight.ogg')]:
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', NA + 'Audio/Musics/' + f, '-ac', '1', '-ar', '22050', '-b:a', '36k', '-f', 'mp3', '-'], capture_output=True, check=True).stdout
    music[k] = 'data:audio/mpeg;base64,' + base64.b64encode(out).decode()
amb = subprocess.run(['ffmpeg', '-v', 'error', '-i', '/root/game/dl/oga/crickets.mp3', '-ac', '1', '-ar', '22050', '-b:a', '32k', '-f', 'mp3', '-'], capture_output=True, check=True).stdout
music['crickets'] = 'data:audio/mpeg;base64,' + base64.b64encode(amb).decode()
def png_url(path):
    return 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()
ui = {'dialog': png_url(NA + 'Ui/Dialog/DialogueBoxSimple.png'), 'facebox': png_url(NA + 'Ui/Dialog/FacesetBox.png')}
# 한글 픽셀 글꼴 갈무리11 굵게 (OFL) — 게임에 쓰는 글자만 남겨 용량을 줄인다
import re as _re
from fontTools import subset as _subset
import glob as _glob
_txt = ''.join(open(f).read() for f in sorted(_glob.glob('/root/game/src/js/*.js') + _glob.glob('/root/game/src/stages/*.js')) + ['/root/game/src/template.html', '/root/game/build.py'])  # 글꼴에 넣을 글자: 게임에 쓰인 모든 글자
_chars = set(_txt) | set(map(chr, range(32, 127))) | set('…—·←↑↓→○●')
open('/tmp/_chars.txt', 'w').write(''.join(sorted(_chars)))
_subset.main(['/root/game/dl/galmuri/package/dist/Galmuri11-Bold.ttf', '--text-file=/tmp/_chars.txt', '--flavor=woff2', '--output-file=/root/game/build/galmuri_sub.woff2', '--layout-features=*'])
font_url = 'data:font/woff2;base64,' + base64.b64encode(open('/root/game/build/galmuri_sub.woff2', 'rb').read()).decode()
atlas_b64 = 'data:image/png;base64,' + base64.b64encode(open(APNG, 'rb').read()).decode()
json.dump({'atlas': atlas_b64, 'frames': frames, 'sounds': snd, 'music': music, 'ui': ui, 'font': font_url}, open(f'/root/game/build/assets_{THEME}.json' if THEME else '/root/game/build/assets.json', 'w'))
print('font', os.path.getsize('/root/game/build/galmuri_sub.woff2'), 'atlas', W, H, os.path.getsize(APNG), 'snd', sum(len(v) for v in snd.values()), 'music', sum(len(v) for v in music.values()), 'bark', sounds['bark'])
