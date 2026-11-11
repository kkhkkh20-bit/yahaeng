"""Big billboards for the big-city study (?study=city-xl).

Four are cut from the purchased GuttyKreum "Dotonbori City v3" tilemap and have their Japanese
lettering replaced by Korean (can ad, crab restaurant, octopus restaurant, face ad). Three more
are drawn here. Korean lettering uses Galmuri11 Bold (SIL OFL 1.1, Lee Minseo); the font and the
pack stay outside the repository, only the finished atlas is written.

Usage:
  python tools/import_city_billboards.py <pack>/Tilemap/MainTileMap.png <Galmuri11-Bold.ttf>
"""
import json
import sys
import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / 'src/art/city-study'
tile_path, font_path = map(Path, sys.argv[1:3])
TM = Image.open(tile_path).convert('RGBA')
FONT = ImageFont.truetype(str(font_path), 12)


def crop(x0, y0, x1, y1):
    c = TM.crop((x0, y0, x1, y1))
    return c.crop(c.getbbox())


def letters(text, vertical=False):
    chars = list(text) if vertical else [text]
    ims = []
    for ch in chars:
        bb = FONT.getbbox(ch)
        m = Image.new('L', (bb[2] - bb[0] + 2, bb[3] - bb[1] + 2), 0)
        ImageDraw.Draw(m).text((1 - bb[0], 1 - bb[1]), ch, font=FONT, fill=255)
        ims.append(m.point(lambda v: 255 if v > 110 else 0))
    if not vertical:
        return ims[0]
    w = max(i.width for i in ims)
    out = Image.new('L', (w, sum(i.height for i in ims) + len(ims) - 1), 0)
    y = 0
    for i in ims:
        out.paste(i, ((w - i.width) // 2, y))
        y += i.height + 1
    return out


def lettering(img, x, y, w, h, text, bg, fg, vertical=False, frame=None, scale=None):
    d = ImageDraw.Draw(img)
    if frame:
        d.rectangle([x, y, x + w - 1, y + h - 1], fill=frame)
        d.rectangle([x + 1, y + 1, x + w - 2, y + h - 2], fill=bg)
    else:
        d.rectangle([x, y, x + w - 1, y + h - 1], fill=bg)
    raw = letters(text, vertical)
    s = scale or 4
    while s > 1 and (raw.width * s > w - 4 or raw.height * s > h - 4):
        s -= 1
    m = raw.resize((raw.width * s, raw.height * s), Image.NEAREST)
    tx, ty = x + (w - m.width) // 2, y + (h - m.height) // 2
    img.paste(Image.new('RGBA', m.size, (0, 0, 0, 150)), (tx + 1, ty + 1), m)
    img.paste(Image.new('RGBA', m.size, fg + (255,)), (tx, ty), m)


boards = {}
# 1. can ad (SUPER "WET"): the 水 on the can becomes 물
can = crop(8 * 32, 7 * 32, 13 * 32, 10 * 32)
lettering(can, 67, 52, 30, 24, '물', (150, 190, 210), (30, 60, 90), frame=(90, 120, 140))
boards['can'] = can
# 2. crab restaurant: the kana between the crabs becomes 대게
crab = crop(24 * 32, 10 * 32, 29 * 32, 11 * 32)
cw = crab.width
lettering(crab, cw // 2 - 34, 2, 68, crab.height - 4, '대게', (238, 232, 220), (205, 52, 40))
boards['crab'] = crab
# 3. octopus restaurant: the 蛸焼 panel over the octopus becomes 낙지 (vertical)
octo = crop(29 * 32, 9 * 32, 31 * 32, 12 * 32)
lettering(octo, 16, 22, 32, 36, '낙지', (214, 84, 44), (255, 240, 190), vertical=True)
boards['octopus'] = octo
# 4. face ad: the 酒品 line becomes 막걸리
face = crop(27 * 32, 13 * 32, 29 * 32, 15 * 32)
lettering(face, 2, face.height - 26, face.width - 4, 22, '막걸리', (60, 110, 70), (250, 245, 220))
boards['face'] = face


def drawn(w, h, lines, bg, fg, accent):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w - 1, h - 1], fill=(27, 34, 40, 255))
    d.rectangle([3, 3, w - 4, h - 4], fill=bg + (255,))
    d.rectangle([3, 3, w - 4, 6], fill=accent + (255,))
    d.rectangle([3, h - 7, w - 4, h - 4], fill=accent + (255,))
    for bx in range(10, w - 6, 24):  # bulbs around the edge
        d.rectangle([bx, 0, bx + 2, 2], fill=(255, 236, 170, 255))
        d.rectangle([bx, h - 3, bx + 2, h - 1], fill=(255, 236, 170, 255))
    y = 10
    for text, share, color in lines:
        lh = int((h - 20) * share)
        lettering(im, 6, y, w - 12, lh, text, bg, color or fg)
        y += lh
    return im


boards['chimaek'] = drawn(160, 88, [('치맥', .66, None), ('후라이드 · 양념', .34, (60, 30, 20))], (250, 200, 60), (190, 40, 30), (200, 60, 40))
boards['soju'] = drawn(160, 88, [('소주 한 잔', .6, None), ('을지로 포차', .4, (255, 230, 120))], (36, 120, 84), (240, 255, 240), (20, 70, 50))
boards['karaoke'] = drawn(64, 160, [('노', .25, None), ('래', .25, None), ('방', .25, None), ('24', .25, (255, 230, 120))], (40, 22, 52), (255, 120, 200), (255, 80, 190))

atlas_w = 512
x = y = row_h = 0
frames = {}
placed = []
for k, im in boards.items():
    if x + im.width > atlas_w:
        x, y, row_h = 0, y + row_h + 2, 0
    placed.append((k, im, x, y))
    frames[k] = {'rect': [x, y, im.width, im.height]}
    x += im.width + 2
    row_h = max(row_h, im.height)
atlas = Image.new('RGBA', (atlas_w, y + row_h), (0, 0, 0, 0))
for k, im, px, py in placed:
    atlas.alpha_composite(im, (px, py))
atlas.save(OUT / 'billboards.webp', lossless=True, method=6)
(OUT / 'billboards.json').write_text(json.dumps({
    'artist': 'GuttyKreum (can, crab, octopus, face); Yahaeng (chimaek, soju, karaoke)',
    'pack': 'Dotonbori City v3', 'source': 'https://guttykreum.itch.io/dotonbori-city-game-assets',
    'sourceSha256': hashlib.sha256(tile_path.read_bytes()).hexdigest(),
    'font': 'Galmuri11 Bold (SIL OFL 1.1, Lee Minseo)', 'tile': 32,
    'note': 'Billboards for Yahaeng with Korean lettering. Not a standalone asset.', 'frames': frames}, ensure_ascii=False, indent=1) + '\n')
print('billboards', {k: v['rect'][2:] for k, v in frames.items()})
