# 무료 CC0 에셋(Kenney)을 게임용 아틀라스 이미지·사운드 데이터로 묶는 스크립트
import json, base64, subprocess, os, io
from PIL import Image

D = '/root/game/dl/'
TD = D + 'kenney_top-down-shooter/'
T = Image.open(TD + 'Tilesheet/tilesheet_complete.png').convert('RGBA')

frames = {}
items = []  # (name, image)

def tile(name, c, r, w=1, h=1):
    items.append((name, T.crop((c*64, r*64, (c+w)*64, (r+h)*64))))

def region(name, x, y, w, h):
    items.append((name, T.crop((x, y, x+w, y+h))))

def char(name, path):
    items.append((name, Image.open(TD + 'PNG/' + path).convert('RGBA')))

tile('grass', 0, 0); tile('water', 18, 0); tile('dirt', 4, 0); tile('stone', 6, 0); tile('tileW', 11, 0)
tile('wood', 14, 1); tile('wood2', 14, 3); tile('wall', 0, 10)
tile('crate', 20, 4); tile('crate2', 21, 4); tile('barrel', 18, 11); tile('barrel2', 19, 11)
tile('rock', 20, 8); tile('bushS', 18, 8); tile('bushO', 19, 8)
tile('bushBig', 18, 6, 2, 2); tile('treeO', 21, 6, 2, 2)
region('rug', 1344, 768, 192, 256)
region('sofa', 896, 1024, 192, 64)
region('table', 1280, 1024, 192, 64)

char('p_stand', 'Hitman 1/hitman1_stand.png'); char('p_hold', 'Hitman 1/hitman1_hold.png')
char('p_sil', 'Hitman 1/hitman1_silencer.png')
char('g1_gun', 'Soldier 1/soldier1_gun.png'); char('g1_stand', 'Soldier 1/soldier1_stand.png')
char('g2_gun', 'Man Brown/manBrown_gun.png'); char('g2_stand', 'Man Brown/manBrown_stand.png')
char('t_stand', 'Man Old/manOld_stand.png'); char('t_hold', 'Man Old/manOld_hold.png')
char('g3_gun', 'Man Blue/manBlue_gun.png'); char('g3_stand', 'Man Blue/manBlue_stand.png')
def ext(name, path, size=None):
    im = Image.open(D + path).convert('RGBA')
    if size: im = im.resize(size, Image.LANCZOS)
    items.append((name, im))
ext('tentR', 'racing/PNG/Objects/tent_red.png', (96, 96)); ext('tentB', 'racing/PNG/Objects/tent_blue.png', (96, 96))
ext('sandbag', 'tanks/PNG/Obstacles/sandbagBrown.png'); ext('treeL', 'tanks/PNG/Environment/treeLarge.png'); ext('treeS', 'tanks/PNG/Environment/treeSmall.png')
ext('oil', 'tanks/PNG/Obstacles/oil.png', (64, 64))

# 단순 선반 배치 아틀라스
W = 1024; x = y = rowh = 0
pad = 2
placed = []
for name, im in items:
    if x + im.width > W:
        x = 0; y += rowh + pad; rowh = 0
    placed.append((name, im, x, y))
    frames[name] = [x, y, im.width, im.height]
    x += im.width + pad; rowh = max(rowh, im.height)
H = y + rowh
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for name, im, px, py in placed:
    atlas.paste(im, (px, py))
os.makedirs('/root/game/build', exist_ok=True)
atlas.save('/root/game/build/atlas.png', optimize=True)

sounds = {
    'step_c0': 'kenney_impact-sounds/Audio/footstep_concrete_000.ogg',
    'step_c1': 'kenney_impact-sounds/Audio/footstep_concrete_001.ogg',
    'step_c2': 'kenney_impact-sounds/Audio/footstep_concrete_002.ogg',
    'step_g0': 'kenney_impact-sounds/Audio/footstep_grass_000.ogg',
    'step_g1': 'kenney_impact-sounds/Audio/footstep_grass_001.ogg',
    'step_g2': 'kenney_impact-sounds/Audio/footstep_grass_002.ogg',
    'step_w0': 'kenney_impact-sounds/Audio/footstep_wood_000.ogg',
    'step_w1': 'kenney_impact-sounds/Audio/footstep_wood_001.ogg',
    'step_w2': 'kenney_impact-sounds/Audio/footstep_wood_002.ogg',
    'kill': 'kenney_rpg-audio/Audio/knifeSlice.ogg',
    'kill2': 'kenney_rpg-audio/Audio/knifeSlice2.ogg',
    'thud': 'kenney_impact-sounds/Audio/impactSoft_heavy_001.ogg',
    'cloth': 'kenney_rpg-audio/Audio/cloth2.ogg',
    'drop': 'kenney_rpg-audio/Audio/dropLeather.ogg',
    'stone': 'kenney_impact-sounds/Audio/impactMining_001.ogg',
    'throw': 'kenney_rpg-audio/Audio/cloth4.ogg',
    'fuse': 'kenney_rpg-audio/Audio/metalLatch.ogg',
    'switch': 'kenney_interface-sounds/Audio/switch_003.ogg',
    'question': 'kenney_interface-sounds/Audio/question_002.ogg',
    'alert': 'kenney_interface-sounds/Audio/error_006.ogg',
    'alarm': 'kenney_impact-sounds/Audio/impactBell_heavy_002.ogg',
    'win': 'kenney_interface-sounds/Audio/confirmation_002.ogg',
    'lose': 'kenney_interface-sounds/Audio/error_008.ogg',
    'click': 'kenney_interface-sounds/Audio/click_002.ogg',
    'knife': 'kenney_rpg-audio/Audio/drawKnife2.ogg',
    'glass': 'kenney_impact-sounds/Audio/impactGlass_light_002.ogg',
    'kunai': 'kenney_rpg-audio/Audio/drawKnife3.ogg',
    'land': 'kenney_impact-sounds/Audio/impactSoft_medium_002.ogg',
    'metal': 'kenney_impact-sounds/Audio/impactMetal_light_001.ogg',
}
snd = {}
for k, p in sounds.items():
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', D + p, '-ac', '1', '-ar', '22050', '-b:a', '40k', '-f', 'mp3', '-'],
                         capture_output=True, check=True).stdout
    snd[k] = 'data:audio/mpeg;base64,' + base64.b64encode(out).decode()

atlas_b64 = 'data:image/png;base64,' + base64.b64encode(open('/root/game/build/atlas.png', 'rb').read()).decode()
json.dump({'atlas': atlas_b64, 'frames': frames, 'sounds': snd}, open('/root/game/build/assets.json', 'w'))
print('atlas', W, H, os.path.getsize('/root/game/build/atlas.png'), 'bytes; sounds', sum(len(v) for v in snd.values()), 'chars')
