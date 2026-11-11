"""Build the Euljiro / Cheonggyecheon district for the big-city study (?study=city-xl).

The district is one pre-drawn ground picture (36x36 game tiles, 32px source pixels per tile)
plus a collision grid. It is composed from the purchased GuttyKreum "Dotonbori City v3" pack:
the pack's example street scene (people removed) and its building, canal and bridge pieces.
Japanese lettering, noren, stone lanterns, the wooden house and the roofed boats are removed;
all signs are redrawn in Korean with the Galmuri pixel font (SIL OFL), and the gate reads 을지로3가.

Only the finished district picture is written to the repository. The original pack, its tilemap
and example image stay private, the same as for the other imported GuttyKreum art.

Usage:
  python tools/import_euljiro_district.py <pack>/Tilemap/MainTileMap.png <pack>/Example.png <Galmuri11-Bold.ttf>
"""
import json
import sys
import hashlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

T = 32
DW = DH = 36  # district size in tiles
OUT = Path(__file__).resolve().parents[1] / 'src/art/euljiro'

tile_path, example_path, font_path = map(Path, sys.argv[1:4])
TM = Image.open(tile_path).convert('RGBA')
EX0 = Image.open(example_path).convert('RGBA')
tm = np.array(TM).astype(np.int16)
TC, TR = tm.shape[1] // T, tm.shape[0] // T
tiles = tm.reshape(TR, T, TC, T, 4).transpose(0, 2, 1, 3, 4).reshape(TR * TC, T, T, 4)
opaque = (tiles[..., 3] == 255).reshape(len(tiles), -1).all(1)

# ---------------------------------------------------------------- Korean pixel signs
def _raw(text, vertical):
    f = ImageFont.truetype(str(font_path), 12)
    chars = list(text) if vertical else [text]
    ims = []
    for ch in chars:
        bb = f.getbbox(ch)
        m = Image.new('L', (bb[2] - bb[0] + 2, bb[3] - bb[1] + 2), 0)
        ImageDraw.Draw(m).text((1 - bb[0], 1 - bb[1]), ch, font=f, fill=255)
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


def sign(img, x, y, w, h, text, bg, fg, frame=(27, 34, 40), vertical=False, glow=None, bolts=True):
    d = ImageDraw.Draw(img)
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=frame)
    d.rectangle([x + 1, y + 1, x + w - 2, y + h - 2], fill=bg)
    hi = tuple(min(255, c + 40) for c in bg)
    lo = tuple(max(0, c - 45) for c in bg)
    d.line([x + 2, y + 2, x + w - 3, y + 2], fill=hi)
    d.line([x + 2, y + h - 3, x + w - 3, y + h - 3], fill=lo)
    if bolts and w > 14 and h > 10:
        for bx in (x + 3, x + w - 4):
            d.point((bx, y + 3), fill=lo)
    if not text:
        return
    raw = _raw(text, vertical)
    s = 4
    while s > 1 and (raw.width * s > w - 4 or raw.height * s > h - 4):
        s -= 1
    m = raw.resize((raw.width * s, raw.height * s), Image.NEAREST)
    tx, ty = x + (w - m.width) // 2, y + (h - m.height) // 2
    img.paste(Image.new('RGBA', m.size, (0, 0, 0, 140)), (tx + 1, ty + 1), m)
    if glow:
        g = Image.new('RGBA', m.size, glow + (90,))
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            img.paste(g, (tx + dx, ty + dy), m)
    img.paste(Image.new('RGBA', m.size, fg + (255,)), (tx, ty), m)

# ---------------------------------------------------------------- the example street, cleaned
ex = np.array(EX0)
PEOPLE = [(5, 2), (5, 3), (8, 4), (11, 3), (11, 4), (9, 5), (12, 5), (12, 6), (10, 6), (10, 7), (8, 6), (8, 7), (9, 6), (9, 7),
          (0, 10), (1, 10), (1, 11), (6, 11), (6, 12), (10, 13), (10, 14), (11, 12), (11, 13), (11, 14), (11, 15), (12, 12), (12, 13),
          (13, 15), (13, 16), (11, 19), (11, 20), (10, 19), (10, 20), (15, 10), (15, 11), (15, 12), (4, 19), (4, 20), (4, 21), (5, 20), (5, 21)]
for c, r in PEOPLE:  # each cell takes the pack tile that matches most of its pixels
    cell = ex[r * T:(r + 1) * T, c * T:(c + 1) * T, :3].astype(np.int16)
    diff = (np.abs(tiles[..., :3] - cell[None]).sum(-1) > 0).reshape(len(tiles), -1).sum(1)
    k = int(np.where(opaque, diff, 9999).argmin())
    ex[r * T:(r + 1) * T, c * T:(c + 1) * T] = tiles[k].astype(np.uint8)
cell = lambda a, c, r: a[r * T:(r + 1) * T, c * T:(c + 1) * T]
ex[19 * T:20 * T, 4 * T:5 * T] = cell(ex, 6, 19)
ex[3 * T + 12:4 * T, 8 * T:9 * T] = ex[4 * T + 12:5 * T, 8 * T:9 * T]
for col in range(7):  # the roofed boat -> open water
    for r in (17, 18):
        ex[r * T:(r + 1) * T, col * T:(col + 1) * T] = cell(ex, 7, r)
    ex[16 * T + 16:17 * T, col * T:(col + 1) * T] = ex[16 * T + 16:17 * T, 7 * T:8 * T]
for c in range(3):  # noren and wooden shop front -> plain storeys
    ex[9 * T:10 * T, c * T:(c + 1) * T] = tiles[11 * TC + 13 + c].astype(np.uint8)
    ex[10 * T:11 * T, c * T:(c + 1) * T] = tiles[14 * TC + 13 + c].astype(np.uint8)
for r in (11, 12):  # stone lanterns -> pavement
    for c in (0, 2):
        ex[r * T:(r + 1) * T, c * T:(c + 1) * T] = cell(ex, 1, r)
EX = Image.fromarray(ex)
for args in [
    (64, 163, 32, 24, '호프', (46, 58, 70), (255, 214, 102)),
    (34, 229, 60, 26, '노가리', (120, 52, 38), (255, 236, 200)),
    (2, 262, 62, 22, '백송상사', (30, 50, 70), (230, 240, 250)),
    (104, 290, 142, 30, '을지 조명·전기', (238, 232, 220), (40, 60, 120), (60, 70, 90)),
    (163, 180, 30, 24, '물', (150, 190, 210), (30, 60, 90), (90, 120, 140)),
    (272, 22, 34, 38, '골뱅', (214, 84, 44), (255, 240, 190)),
    (449, 130, 30, 62, '노래방', (40, 22, 52), (255, 120, 200)),
    (481, 160, 62, 32, '편의점', (36, 120, 84), (240, 255, 240)),
    (481, 193, 62, 62, '생맥주', (250, 200, 60), (190, 40, 30), (120, 60, 20)),
    (449, 326, 62, 26, '철물', (40, 96, 70), (240, 250, 200)),
]:
    x, y, w, h, text, bg, fg = args[:7]
    frame = args[7] if len(args) > 7 else (27, 34, 40)
    sign(EX, x, y, w, h, text, bg, fg, frame=frame, vertical=text in ('골뱅', '노래방'),
         glow=(255, 80, 190) if text == '노래방' else None, bolts=text != '물')

# ---------------------------------------------------------------- composition (34 x 22 middle band)
MW_, MH_ = 34, 22
mid = Image.new('RGBA', (MW_ * T, MH_ * T), (0, 0, 0, 255))
def ex_blit(sc, sr, w, h, dc, dr):
    mid.alpha_composite(EX.crop((sc * T, sr * T, (sc + w) * T, (sr + h) * T)), (dc * T, dr * T))
def tm_blit(img, sc, sr, w, h, dc, dr, dx=0, dy=0):
    img.alpha_composite(TM.crop((sc * T, sr * T, (sc + w) * T, (sr + h) * T)), (dc * T + dx, dr * T + dy))
ex_blit(0, 0, 17, 22, 0, 0)
ex_blit(0, 11, 9, 11, 17, 11)
ex_blit(9, 0, 5, 22, 26, 0)
ex_blit(14, 0, 3, 22, 31, 0)
ex_blit(13, 0, 1, 4, 26, 0)
ex_blit(0, 10, 9, 1, 17, 10)
for r in range(11):
    for c in range(17, 26):
        tm_blit(mid, 13, 5, 1, 1, c, r)
def stack(img, dc, top, rows):
    for i, rc in enumerate(rows):
        if rc:
            tm_blit(img, rc[0], rc[1], 3, 1, dc, top + i)
tm_blit(mid, 13, 6, 3, 3, 17, 0); stack(mid, 17, 3, [(13, 9), (13, 10), (13, 11), (13, 12), (13, 13), (13, 9), (13, 14)]); tm_blit(mid, 13, 15, 3, 1, 17, 10)
tm_blit(mid, 81, 5, 3, 3, 20, 0); stack(mid, 20, 3, [(16, 3), (16, 4), (16, 5), (16, 6), (16, 9), (16, 10), (16, 11)]); tm_blit(mid, 16, 7, 3, 1, 20, 10)
tm_blit(mid, 81, 0, 3, 3, 23, 0); stack(mid, 23, 3, [(19, 12), (19, 13), (19, 14), (13, 9), (13, 10), (13, 11), (13, 14)]); tm_blit(mid, 16, 15, 3, 1, 23, 10)
tm_blit(mid, 24, 7, 2, 1, 18, 5)
tm_blit(mid, 29, 9, 2, 2, 21, 4)
tm_blit(mid, 27, 13, 2, 2, 21, 7)
tm_blit(mid, 26, 7, 1, 1, 24, 4); tm_blit(mid, 27, 7, 1, 1, 25, 4)
tm_blit(mid, 19, 8, 3, 1, 23, 10, dy=-12)
mid.alpha_composite(TM.crop((34 * 32 - 8, int(16.55 * 32), 39 * 32 + 8, 20 * 32)), (26 * 32 - 8, int(4.55 * 32)))
for yy in range(158, 171):  # the small DOTON lettering on the gate
    for xx in range(868, 927):
        p = mid.getpixel((xx, yy))
        if p[3] and sum(p[:3]) < 200:
            mid.putpixel((xx, yy), (58, 74, 104, 255))
for x, y, w, h, text, bg, fg, *rest in [
    (577, 165, 62, 24, '동진인쇄', (30, 60, 90), (255, 255, 255)),
    (688, 150, 32, 36, '공구', (214, 84, 44), (255, 240, 190)),
    (674, 262, 58, 22, '막걸리', (60, 110, 70), (250, 245, 220)),
    (801, 132, 30, 22, '다방', (110, 40, 40), (255, 225, 170)),
    (548, 226, 22, 54, '선일전기', (200, 160, 40), (40, 30, 20)),
    (748, 230, 60, 22, '청솔약국', (236, 232, 214), (30, 110, 70), (80, 90, 80)),
    (865, 175, 66, 28, '을지로3가', (244, 232, 208), (200, 48, 40), (70, 90, 120)),
    (830, 201, 20, 15, '술', (30, 60, 90), (255, 255, 255), (30, 60, 90)),
    (936, 201, 20, 15, '밥', (30, 60, 90), (255, 255, 255), (30, 60, 90)),
    (1025, 160, 62, 32, '타일', (36, 90, 120), (240, 250, 255)),
    (1025, 193, 62, 62, '노가리', (250, 200, 60), (190, 40, 30), (120, 60, 20)),
    (993, 326, 62, 26, '인쇄', (40, 96, 70), (240, 250, 200)),
]:
    sign(mid, x, y, w, h, text, bg, fg, frame=rest[0] if rest else (27, 34, 40),
         vertical=text in ('공구', '선일전기'), bolts=text not in ('을지로3가', '술', '밥'))

# ---------------------------------------------------------------- the district (36 x 36)
cv = Image.new('RGBA', (DW * T, DH * T), (0, 0, 0, 255))
pave = lambda c, r: tm_blit(cv, 3, 5, 1, 1, c, r)
for r in range(DH):
    for c in range(DW):
        pave(c, r)
cv.alpha_composite(mid, (T, T))
for base in (11, 28):  # open the north ends of both streets onto the city sidewalk
    for r in range(1, 4):
        tm_blit(cv, 1, 5, 1, 1, base, r); tm_blit(cv, 2, 5, 1, 1, base + 1, r); tm_blit(cv, 3, 5, 1, 1, base + 2, r)
# south band: alley, a row of shops that face the south road, streets that continue from the bridges
STREETS = [(10, 14), (27, 31)]
for c0, c1 in STREETS:
    for r in range(23, DH):
        tm_blit(cv, 1, 5, 1, 1, c0 + 1, r); tm_blit(cv, 2, 5, 1, 1, c0 + 2, r); tm_blit(cv, 3, 5, 1, 1, c0 + 3, r)
SOUTH = [  # (col, roof, storeys x6, ground)
    (1, (13, 6), [(13, 9), (13, 10), (13, 12), (13, 13), (13, 11), (13, 9)], (13, 15)),
    (4, (81, 5), [(16, 3), (16, 4), (16, 6), (16, 10), (16, 11), (16, 9)], (16, 7)),
    (7, (81, 0), [(19, 12), (19, 13), (19, 14), (13, 10), (13, 11), (13, 13)], (16, 15)),
    (15, (81, 0), [(13, 10), (13, 11), (13, 9), (13, 12), (13, 13), (13, 10)], (13, 15)),
    (18, (13, 6), [(19, 12), (19, 13), (19, 14), (19, 13), (19, 12), (19, 14)], (16, 7)),
    (21, (81, 5), [(16, 9), (16, 10), (16, 11), (16, 10), (16, 9), (16, 11)], (16, 15)),
    (24, (13, 6), [(13, 9), (13, 11), (13, 10), (13, 13), (13, 12), (13, 9)], (13, 14)),
    (32, (81, 0), [(16, 3), (16, 4), (16, 5), (16, 6), (16, 10), (16, 9)], (13, 15)),
]
for col, roof, storeys, ground in SOUTH:
    for r in range(24, 34):
        for c in range(col, col + 3):
            tm_blit(cv, 13, 5, 1, 1, c, r)
    tm_blit(cv, roof[0], roof[1], 3, 3, col, 24)
    stack(cv, col, 27, storeys)
    tm_blit(cv, ground[0], ground[1], 3, 1, col, 33)
tm_blit(cv, 19, 8, 3, 1, 7, 33, dy=-12)
tm_blit(cv, 19, 8, 3, 1, 21, 33, dy=-12)
for x, y, w, h, text, bg, fg, *rest in [
    (2 * T + 2, 28 * T + 4, 60, 22, '공업사', (30, 60, 90), (255, 255, 255)),
    (4 * T + 6, 30 * T + 2, 22, 52, '전파사', (200, 160, 40), (40, 30, 20)),
    (7 * T + 4, 28 * T + 6, 88, 22, '을지인쇄', (238, 232, 220), (40, 60, 120), (60, 70, 90)),
    (15 * T + 2, 29 * T + 4, 90, 24, '을지 기계공구', (120, 52, 38), (255, 236, 200)),
    (18 * T + 6, 31 * T + 4, 22, 52, '당구장', (40, 22, 52), (120, 220, 255)),
    (21 * T + 4, 28 * T + 6, 88, 22, '종로타일', (36, 90, 120), (240, 250, 255)),
    (24 * T + 4, 30 * T + 4, 88, 24, '노가리 골목', (250, 200, 60), (190, 40, 30), (120, 60, 20)),
    (32 * T + 4, 29 * T + 6, 88, 22, '백야다방', (110, 40, 40), (255, 225, 170)),
]:
    sign(cv, x, y, w, h, text, bg, fg, frame=rest[0] if rest else (27, 34, 40),
         vertical=text in ('전파사', '당구장'), glow=(80, 200, 255) if text == '당구장' else None)
# 노가리 골목: steel tables, red plastic stools and beer crates (district pixel coordinates)
d = ImageDraw.Draw(cv)
def table(x, y):
    for dx, dy in ((-12, -4), (-12, 5), (12, -4), (12, 5)):
        cx, cy = x + dx, y + dy
        d.rectangle([cx - 3, cy - 3, cx + 3, cy + 3], fill=(150, 30, 30)); d.rectangle([cx - 3, cy - 3, cx + 3, cy + 1], fill=(214, 56, 48))
    d.rectangle([x - 8, y - 7, x + 8, y + 7], fill=(92, 98, 108)); d.rectangle([x - 7, y - 6, x + 7, y + 5], fill=(186, 192, 200))
    d.rectangle([x - 4, y - 3, x - 1, y], fill=(236, 196, 90)); d.rectangle([x + 2, y - 1, x + 4, y + 2], fill=(250, 240, 210))
def crates(x, y):
    for i in range(3):
        d.rectangle([x, y - i * 7, x + 14, y - i * 7 + 6], fill=(40, 110, 60), outline=(20, 60, 30))
TABLES = [(330, 192), (330, 238), (430, 198), (902, 320), (972, 336), (300, 1104), (1060, 1104)]
for x, y in TABLES:
    table(x, y)
for x, y in [(294, 256), (412, 262), (874, 352), (334, 1124)]:
    crates(x, y)
# curb line where the district meets the city roads
for edge in ([0, 0, DW * T - 1, 2], [0, DH * T - 3, DW * T - 1, DH * T - 1], [0, 0, 2, DH * T - 1], [DW * T - 3, 0, DW * T - 1, DH * T - 1]):
    d.rectangle(edge, fill=(180, 182, 196))

# ---------------------------------------------------------------- collision grid
#  '=' walk  ·  '§' building (blocks movement and sight)  ·  '¦' railing, quay wall, bridge rail (blocks movement only)  ·  '~' water
B, R, W_, F = '§', '¦', '~', '='
exg = [[F] * 17 for _ in range(22)]
def put(rows, cols, ch):
    for r in rows:
        for c in cols:
            exg[r][c] = ch
put(range(0, 3), range(0, 10), B); put(range(0, 3), range(13, 17), B)
put(range(3, 11), range(0, 8), B); put(range(3, 9), range(13, 17), B)
put(range(9, 22), [9, 13], R); put(range(9, 12), range(14, 17), B)
put([11], range(3, 8), B)
put([13], range(0, 9), R); exg[13][1] = F; exg[13][7] = F; put([13], range(14, 17), R)
put([15], range(5, 9), R); put([15], range(14, 17), R)
put([16], range(0, 5), R); put([16], range(5, 9), W_); put([16], range(14, 17), W_)
put(range(17, 19), range(0, 9), W_); put(range(17, 19), range(14, 17), W_)
put([19], range(0, 2), W_); put([19], range(2, 9), R); put(range(19, 22), [14], W_); put([19], [15, 16], R)
put([20], range(0, 2), R)
midg = [[F] * MW_ for _ in range(MH_)]
for r in range(MH_):
    for c in range(17):
        midg[r][c] = exg[r][c]
    for c in range(9):
        midg[r][17 + c] = exg[r][c] if r >= 11 else B
    for c in range(5):
        midg[r][26 + c] = exg[r][9 + c]
    for c in range(3):
        midg[r][31 + c] = exg[r][14 + c]
for c in range(17, 20):
    midg[11][c] = F
midg[11][25] = F
for r in range(4):
    midg[r][26] = B
grid = [[F] * DW for _ in range(DH)]
for r in range(MH_):
    for c in range(MW_):
        grid[r + 1][c + 1] = midg[r][c]
for base in (11, 28):
    for r in range(1, 4):
        for c in range(base, base + 3):
            grid[r][c] = F
for col, *_ in SOUTH:
    for r in range(24, 34):
        for c in range(col, col + 3):
            grid[r][c] = B
for c in list(range(1, 10)) + list(range(15, 27)) + list(range(32, 35)):  # shops without a picture still close the band
    for r in range(24, 34):
        grid[r][c] = B
for x, y in TABLES:  # a table and its stools are a low obstacle
    grid[y // T][x // T] = R
tiles_out = [''.join(row) for row in grid]

# lamps (tile, radius, outdoor, floor, colour) and pedestrian routes, in district tile coordinates
lamps = [[12, 5, 190, 1], [12, 9, 190, 1], [29, 5, 190, 1], [29, 9, 190, 1],
         [11, 13, 170, 1], [13, 13, 170, 1], [11, 19, 170, 1], [13, 19, 170, 1],
         [28, 13, 170, 1], [30, 13, 170, 1], [28, 19, 170, 1], [30, 19, 170, 1],
         [5, 13, 150, 1, 0, '255,190,120'], [21, 13, 150, 1, 0, '255,190,120'],
         [16, 6, 130, 1, 0, '255,80,190'], [33, 6, 130, 1, 0, '255,200,90'], [29, 6, 140, 1, 0, '255,120,90'],
         [12, 26, 170, 1], [29, 26, 170, 1], [12, 32, 170, 1], [29, 32, 170, 1], [5, 34, 150, 1], [21, 34, 150, 1]]
routes = [
    [[12, 1, 1], [12, 11, 0], [12, 22, 0], [12, 34, 1], [28, 34, 0], [28, 22, 0], [28, 11, 0], [28, 1, 1]],
    [[1, 13, 1], [9, 13, 0], [9, 15, 0], [3, 15, 1], [2, 13, 0]],
    [[18, 13, 1], [25, 13, 0], [25, 15, 0], [20, 15, 1], [18, 15, 0]],
    [[1, 23, 1], [34, 23, 1]],
    [[0, 1, 0], [35, 1, 0], [35, 34, 0], [0, 34, 0]],
]
OUT.mkdir(parents=True, exist_ok=True)
cv.save(OUT / 'district.webp', lossless=True, method=6)
src_hash = hashlib.sha256(tile_path.read_bytes()).hexdigest()
meta = {
    'artist': 'GuttyKreum', 'pack': 'Dotonbori City v3', 'source': 'https://guttykreum.itch.io/dotonbori-city-game-assets',
    'sourceSha256': src_hash, 'font': 'Galmuri11 Bold (SIL OFL 1.1, https://github.com/quiple/galmuri)',
    'note': 'Composed district for Yahaeng. Not a standalone asset; see LICENSE.txt.',
    'tile': T, 'w': DW, 'h': DH, 'legend': {'=': 'walk', '§': 'building', '¦': 'railing', '~': 'water'},
    'tiles': tiles_out, 'lamps': lamps, 'routes': routes,
}
(OUT / 'district.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
print('district', cv.size, (OUT / 'district.webp').stat().st_size, 'bytes')
