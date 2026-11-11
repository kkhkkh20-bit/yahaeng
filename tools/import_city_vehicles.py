"""Build the big-city traffic atlas from MinZinn "TopDown Vehicles v1.17" (CC BY 4.0, @MinZiin_).

The pack ZIP stays outside the repository. Only the chosen 48-direction sheets are cut, each frame
trimmed to the model's union bounding box, reduced to a 256-colour palette per model and packed as
lossless WebP. No stretching.
Every model keeps the pack's pixel density, so one world scale fits them all; the json records the
body length and width (east-facing frame) for collision.

Usage:
  python tools/import_city_vehicles.py "<TopDown Vehicles v1.17.zip>"
"""
import hashlib
import io
import json
import sys
import zipfile
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'src/art/vehicles'
SCALE = 1.12  # world px per sprite px (unchanged from the first six models)
# key: sheet inside the pack. The first six keep their names and sources.
MODELS = {
    'sedan': 'SEDAN TOPDOWN/White/White_SEDAN_CLEAN_All_000-sheet.png',
    'civic': 'CIVIC TOPDOWN/Red/Red_CIVIC_CLEAN_All_000-sheet.png',
    'hatch': 'HATCHBACK TOPDOWN/Green/Green_HatchBack_CLEAN_All_000-sheet.png',
    'wagon': 'WAGON TOPDOWN/Blue/Blue_WAGON_CLEAN_All_000-sheet.png',
    'luxury': 'LUXURY TOPDOWN/Black/Black_LUXURY_CLEAN_All_000-sheet.png',
    'police': 'POLICE TOPDOWN/ALL DIRECTION/POLICE_CLEAN_ALLD0000-sheet.png',
    'micro': 'MICRO TOPDOWN/White/White_MICRO_CLEAN_All_000-sheet.png',
    'taxi': 'TAXI TOPDOWN/ALL DIRECTION/TAXI_CLEAN_ALLD0000-sheet.png',
    'suv': 'SUV TOPDOWN/Black/Black_SUV_CLEAN_All_000-sheet.png',
    'sport': 'SPORT TOPDOWN/Red/Red_SPORT_CLEAN_All_000-sheet.png',
    'supercar': 'SUPERCAR TOPDOWN/Yellow/Yellow_SUPERCAR_CLEAN_All_000-sheet.png',
    'pickup': 'PICKUP TOPDOWN/Blue/Blue_PICKUP_CLEAN_All_000-sheet.png',
    'van': 'VAN TOP DOWN/White/White_VAN_CLEAN_All_000-sheet.png',
    'minivan': 'MINIVAN TOPDOWN/Brown/Brown_MINIVAN_CLEAN_All_000-sheet.png',
    'box': 'BOX TRUCK TOPDOWN/White/White_BOXTRUCK_CLEAN_All_000-sheet.png',
    'truck': 'MEDIUM TRUCK TOPDOWN/Yellow/Yellow_MEDIUMTRUCK_CLEAN_All_000-sheet.png',
    'busGreen': 'BUS TOPDOWN/Green/Green_BUS_CLEAN_All_000-sheet.png',
    'ambulance': 'AMBULANCE TOPDOWN/ALL DIRECTION/AMBULANCE_CLEAN_ALLD0000-sheet.png',
    'limo': 'LIMO TOPDOWN/Black/LIMO_CLEAN_ALLD0000-sheet.png',
}


def find(z, want):
    names = z.namelist()
    if want in names:
        return want
    folder, file = want.rsplit('/', 1)
    cands = [n for n in names if n.startswith(folder + '/') and n.count('/') == want.count('/') and n.lower().endswith('-sheet.png') and ('all' in n.lower().rsplit('/', 1)[1])]
    if not cands:
        raise SystemExit('missing sheet: ' + want)
    return sorted(cands)[0]


def main():
    z = zipfile.ZipFile(sys.argv[1])
    models = {}
    for key, want in MODELS.items():
        name = find(z, want)
        raw = z.read(name)
        sheet = Image.open(io.BytesIO(raw)).convert('RGBA')
        cell = sheet.width // 7
        frames = [sheet.crop(((i % 7) * cell, (i // 7) * cell, (i % 7 + 1) * cell, (i // 7 + 1) * cell)) for i in range(48)]
        # Each model is reduced to its own 256-colour palette (alpha kept) so the atlas stays small;
        # the change per pixel is below what the game's 0.7-0.9 screen scale shows.
        strip = Image.new('RGBA', (cell * 48, cell))
        for i, f in enumerate(frames):
            strip.paste(f, (i * cell, 0))
        alpha = strip.getchannel('A')
        q = strip.convert('RGB').quantize(256, method=Image.Quantize.MEDIANCUT).convert('RGB')
        q.putalpha(alpha)
        frames = [q.crop((i * cell, 0, (i + 1) * cell, cell)) for i in range(48)]
        box = None
        for f in frames:
            b = f.getbbox()
            if b:
                box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
        east = frames[0].getbbox()
        models[key] = {'name': name, 'sha': hashlib.sha256(raw).hexdigest(), 'cell': cell, 'box': box,
                       'frames': [f.crop(box) for f in frames], 'len': east[2] - east[0], 'wid': east[3] - east[1]}
    # pack: one row per model, 24 frames per row-pair
    width = 0
    rows = []
    y = 0
    for key, m in models.items():
        w, h = m['frames'][0].size
        per = max(1, 2400 // (w + 1))
        lines = (48 + per - 1) // per
        rows.append((key, y, w, h, per))
        width = max(width, min(48, per) * (w + 1))
        y += lines * (h + 1)
    atlas = Image.new('RGBA', (width, y), (0, 0, 0, 0))
    out = {}
    for key, y0, w, h, per in rows:
        m = models[key]
        rects = []
        for i, f in enumerate(m['frames']):
            x, yy = (i % per) * (w + 1), y0 + (i // per) * (h + 1)
            atlas.paste(f, (x, yy))
            rects.append([x, yy, w, h])
        c = m['cell']
        # anchor: the cell centre (the pack's pivot) inside the trimmed frame; the first six used [50, 56] of 100
        ax, ay = c / 2 - m['box'][0], c * 0.56 - m['box'][1]
        out[key] = {'rects': rects, 'sourceFile': m['name'], 'sourceSha256': m['sha'], 'anchor': [round(ax, 2), round(ay, 2)],
                    'scale': SCALE, 'len': round(m['len'] * SCALE), 'wid': round(m['wid'] * SCALE)}
    atlas.save(OUT / 'traffic.webp', lossless=True, method=6)
    meta = {'artist': 'MinZinn (@MinZiin_)', 'pack': 'TopDown Vehicles v1.17', 'source': 'https://minzinn.itch.io/pixelvehicles',
            'license': 'CC-BY-4.0', 'licenseURL': 'https://creativecommons.org/licenses/by/4.0/',
            'changes': 'Selected original 48-direction sprites, frames trimmed to each model\'s bounding box, each model reduced to its own 256-colour palette, packed as lossless WebP. No stretching.',
            'frames': out}
    (OUT / 'traffic.json').write_text(json.dumps(meta, ensure_ascii=False) + '\n')
    print('atlas', atlas.size, {k: (v['len'], v['wid']) for k, v in out.items()})


if __name__ == '__main__':
    main()
