"""Draw extra Korean shop signs for the big-city study, in the panel style of korean-signs.webp.

Lettering uses the Galmuri11 Bold pixel font (SIL OFL 1.1, https://github.com/quiple/galmuri).
The font is only needed to run this tool; the game ships the finished atlas.

Usage:
  python tools/import_city_signs_extra.py <Galmuri11-Bold.ttf>
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / 'src/art/city-study'
FONT = ImageFont.truetype(sys.argv[1], 12)
# key: (text, panel, letters)
SIGNS = {
    'gukbap': ('국밥', (120, 52, 38), (255, 236, 200)), 'nogari': ('노가리', (120, 52, 38), (255, 236, 200)),
    'hof': ('호프', (46, 58, 70), (255, 214, 102)), 'golbaengi': ('골뱅이', (214, 84, 44), (255, 240, 190)),
    'gopchang': ('곱창', (110, 40, 40), (255, 225, 170)), 'sundae': ('순댓국', (60, 110, 70), (250, 245, 220)),
    'baekban': ('백반', (236, 232, 214), (30, 110, 70)), 'bunsik': ('분식', (250, 200, 60), (190, 40, 30)),
    'pocha': ('포차', (200, 50, 40), (255, 240, 200)), 'store': ('편의점', (36, 120, 84), (240, 255, 240)),
    'hardware': ('철물', (40, 96, 70), (240, 250, 200)), 'tools': ('공구', (214, 84, 44), (255, 240, 190)),
    'tile': ('타일', (36, 90, 120), (240, 250, 255)), 'lighting': ('조명', (238, 232, 220), (40, 60, 120)),
    'printshop': ('인쇄', (30, 60, 90), (255, 255, 255)), 'radio': ('전파사', (200, 160, 40), (40, 30, 20)),
    'drug': ('약국', (236, 232, 214), (30, 110, 70)), 'paper': ('지물포', (90, 70, 50), (250, 235, 200)),
    'pcroom': ('PC방', (30, 40, 90), (120, 220, 255)), 'billiards': ('당구장', (40, 22, 52), (120, 220, 255)),
    'karaoke': ('노래방', (40, 22, 52), (255, 120, 200)), 'dabang': ('다방', (110, 40, 40), (255, 225, 170)),
    'baduk': ('기원', (30, 50, 70), (230, 240, 250)), 'dongjin': ('동진인쇄', (30, 60, 90), (255, 255, 255)),
    'sunil': ('선일전기', (200, 160, 40), (40, 30, 20)), 'baeksong2': ('백송상사', (30, 50, 70), (230, 240, 250)),
    'euljigong': ('을지공업사', (238, 232, 220), (40, 60, 120)), 'cheonggye': ('청계 상회', (24, 110, 106), (230, 255, 250)),
    'jongno': ('종로파 사무실', (70, 30, 90), (245, 230, 255)), 'rival': ('건달파 당구장', (150, 30, 30), (255, 235, 230)),
    'market': ('시장', (200, 90, 30), (255, 245, 220)), 'club': ('CLUB', (40, 20, 60), (255, 120, 220)),
    'hospital': ('시립 병원', (236, 240, 244), (200, 40, 40)), 'police': ('지구대', (30, 50, 110), (235, 240, 255)),
    'material': ('자재', (90, 90, 90), (250, 220, 120)), 'hq': ('본부', (25, 27, 34), (224, 180, 80)),
}


def letters(text):
    bb = FONT.getbbox(text)
    m = Image.new('L', (bb[2] - bb[0] + 2, bb[3] - bb[1] + 2), 0)
    ImageDraw.Draw(m).text((1 - bb[0], 1 - bb[1]), text, font=FONT, fill=255)
    return m.point(lambda v: 255 if v > 110 else 0)


def panel(text, bg, fg):
    # Native 2x pixel scale like the original signs: 1 font pixel = 2 atlas pixels.
    m = letters(text)
    m = m.resize((m.width * 2, m.height * 2), Image.NEAREST)
    w, h = max(64, m.width + 28), 62
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    frame = (27, 34, 40, 255)
    d.rectangle([0, 6, w - 1, h - 1], fill=frame)
    d.rectangle([3, 9, w - 4, h - 4], fill=bg + (255,))
    d.rectangle([5, 11, w - 6, 12], fill=tuple(min(255, c + 40) for c in bg) + (255,))
    d.rectangle([5, h - 8, w - 6, h - 7], fill=tuple(max(0, c - 45) for c in bg) + (255,))
    for bx in (8, w - 10):  # bolts and the two brackets that hang it
        d.rectangle([bx, 14, bx + 1, 15], fill=tuple(max(0, c - 60) for c in bg) + (255,))
        d.rectangle([bx - 1, 0, bx + 2, 6], fill=(90, 96, 104, 255))
    tx, ty = (w - m.width) // 2, 9 + (h - 13 - m.height) // 2
    im.paste(Image.new('RGBA', m.size, (0, 0, 0, 150)), (tx + 2, ty + 2), m)
    im.paste(Image.new('RGBA', m.size, fg + (255,)), (tx, ty), m)
    return im


parts = {k: panel(*v) for k, v in SIGNS.items()}
W = 512
x = y = row_h = 0
frames = {}
placed = []
for k, im in parts.items():
    if x + im.width > W:
        x, y = 0, y + row_h + 2
        row_h = 0
    placed.append((k, im, x, y))
    frames[k] = {'rect': [x, y, im.width, im.height], 'text': SIGNS[k][0]}
    x += im.width + 2
    row_h = max(row_h, im.height)
atlas = Image.new('RGBA', (W, y + row_h), (0, 0, 0, 0))
for k, im, px, py in placed:
    atlas.alpha_composite(im, (px, py))
atlas.save(OUT / 'korean-signs-extra.webp', lossless=True, method=6)
(OUT / 'korean-signs-extra.json').write_text(json.dumps({
    'origin': 'Korean shop signs drawn for Yahaeng with Galmuri11 Bold (SIL OFL 1.1, Lee Minseo)',
    'frames': frames}, ensure_ascii=False, indent=1) + '\n')
print('signs', len(frames), atlas.size)
