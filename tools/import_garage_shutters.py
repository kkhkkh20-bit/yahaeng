"""Garage shutters for the free-mode garage and workshop doors, cut from the purchased GuttyKreum
"Dotonbori City v3" pack (single 32px tiles from its Tiles folder):

  shutterGrey   grey roll-up shutter with an orange kick plate (GK_DB_0908)
  shutterBrown  brown roll-up shutter, three slat variants (GK_DB_0845..0847)

Only this small atlas is written to the repository; the pack itself stays private,
like the other imported GuttyKreum art.

Usage:
  python tools/import_garage_shutters.py <DotonboriCity_v3.zip>
"""
import hashlib, io, json, sys, zipfile
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'src/art/euljiro'
src = Path(sys.argv[1]); z = zipfile.ZipFile(src)
TILES = {'shutterGrey': '0908', 'shutterBrown0': '0845', 'shutterBrown1': '0846', 'shutterBrown2': '0847'}
parts = {k: Image.open(io.BytesIO(z.read(f'Tiles/GK_DB_{n}.png'))).convert('RGBA') for k, n in TILES.items()}
atlas = Image.new('RGBA', (sum(p.width + 2 for p in parts.values()), max(p.height for p in parts.values())), (0, 0, 0, 0))
x, frames = 0, {}
for k, p in parts.items():
    atlas.alpha_composite(p, (x, 0)); frames[k] = {'rect': [x, 0, p.width, p.height]}; x += p.width + 2
atlas.save(OUT / 'garage.webp', lossless=True, method=6)
(OUT / 'garage.json').write_text(json.dumps({'pack': 'Dotonbori City v3', 'artist': 'GuttyKreum', 'source': 'https://guttykreum.itch.io/dotonbori-city-game-assets',
    'sourceSha256': hashlib.sha256(src.read_bytes()).hexdigest(), 'tile': 32,
    'note': 'Garage shutters for Yahaeng. Not a standalone asset.', 'frames': frames}, ensure_ascii=False, indent=1) + '\n')
print('garage shutters', {k: v['rect'] for k, v in frames.items()})
