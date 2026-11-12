"""Free-mode weapon / item / helicopter pixel art, cut into one small atlas (src/art/weapons/items.webp + items.json).
Only this derived atlas is committed; the downloaded packs stay outside the repository.

Sources (see src/art/weapons/LICENSE.txt):
  Jestan, "The Ultimate Weapons Pack" (https://jestan.itch.io/weapons-pack) — guns, grenade, molotov, charge, vest.
      48x24 cells; pistol 1,2 · silenced 1,5 · smg 2,9 · shotgun 3,3 · sniper 5,7 · grenade 0,0 · molotov 0,4 · bomb 0,6 · vest 0,7
  OceansDream, "Various inventory 24 pixel icon set" (CC-BY 3.0) — poison (syringe 3,4), lockpick (key 2,2), ammo (belt 5,2), medkit (3,0)
  AntumDeluge / Dungeon Crawl Stone Soup, "CC0 currency icons" (CC0) — cash (coin pile)
  morgan3d, "Attack helicopter" (CC-BY 4.0) — helicopter body (recoloured police navy/white) + rotor still/blur

Usage: python tools/import_weapon_items.py <assets_dl dir>
"""
import json, sys, colorsys
from pathlib import Path
from PIL import Image

D = Path(sys.argv[1]); OUT = Path(__file__).resolve().parents[1] / 'src/art/weapons'; OUT.mkdir(parents=True, exist_ok=True)
J = Image.open(D / 'jestan-ultimate-weapons-pack/TheUltimateWeaponsPack/TheUltimateWeaponsPack/TheUltimateWeaponsPack_Sheet.png').convert('RGBA')
O = Image.open(D / 'oceansdream-various-inventory-24px/pixel_icons_by_oceansdream.png').convert('RGBA')
C = Image.open(D / 'antumdeluge-currency/currency-dcss.png').convert('RGBA')
Hh = Image.open(D / 'morgan3d-attack-helicopter/chopper-44x99.png').convert('RGBA')
trim = lambda im: im.crop(im.getbbox()) if im.getbbox() else im
parts = {}
for k, (c, r) in {'pistol': (1, 2), 'silenced': (1, 5), 'smg': (2, 9), 'shotgun': (3, 3), 'sniper': (5, 7)}.items(): parts[k] = trim(J.crop((c * 48, r * 24, c * 48 + 48, r * 24 + 24)))
for k, r in {'grenade': 0, 'molotov': 4, 'bomb': 6, 'vest': 7}.items(): parts[k] = trim(J.crop((0, r * 24, 24, r * 24 + 24)))
for k, (c, r) in {'poison': (3, 4), 'lockpick': (2, 2), 'ammo': (5, 2), 'medkit': (3, 0)}.items(): parts[k] = trim(O.crop((c * 24, r * 24, c * 24 + 24, r * 24 + 24)))
parts['cash'] = trim(C.crop((64, 0, 96, 32)))
# 헬기: 파란 몸체를 경찰 남색·흰색으로 (명도 유지, 채도 낮추고 남색 쪽으로)
body = Hh.crop((88, 0, 132, 99)); px = body.load()
for y in range(body.height):
    for x in range(body.width):
        r, g, b, a = px[x, y]
        if not a: continue
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if s > 0.25: h, s, l = 0.62, 0.35, min(1, l * (0.75 if l < 0.55 else 1.15))
        r2, g2, b2 = colorsys.hls_to_rgb(h, l, s); px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
parts['heli'] = trim(body); parts['rotor'] = trim(Hh.crop((132, 0, 228, 99))); parts['rotorBlur'] = trim(Hh.crop((132, 99, 228, 198)))
# 한 줄로 쌓는다 (작다)
W = sum(p.width + 2 for p in parts.values()); Hgt = max(p.height for p in parts.values())
atlas = Image.new('RGBA', (W, Hgt), (0, 0, 0, 0)); x = 0; frames = {}
for k, p in parts.items(): atlas.alpha_composite(p, (x, 0)); frames[k] = [x, 0, p.width, p.height]; x += p.width + 2
atlas.save(OUT / 'items.webp', lossless=True, method=6)
(OUT / 'items.json').write_text(json.dumps({'note': 'Derived atlas for Yahaeng free mode. Not a standalone asset. See LICENSE.txt.', 'frames': frames}, indent=1) + '\n')
print(atlas.size, frames)
