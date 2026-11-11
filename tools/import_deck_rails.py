"""Rails and lanterns for the big-city elevated roads, cut from the purchased GuttyKreum
"Dotonbori City v3" tilemap (the canal bridge's white parapet beam and its lantern posts).

  beam      two 16px segments of the white parapet beam (repeats along a deck edge)
  lanternW  a lantern post with warm glass that stands on the beam

Only this small atlas is written to the repository; the pack and its tilemap stay private,
like the other imported GuttyKreum art.

Usage:
  python tools/import_deck_rails.py <pack>/Tilemap/MainTileMap.png
"""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'src/art/euljiro'
src = Path(sys.argv[1])
tm = Image.open(src).convert('RGBA')
CROPS = {'beam': (1280, 48, 1292, 80), 'lanternW': (1312, 128, 1340, 160)}
parts = {k: tm.crop(v) for k, v in CROPS.items()}
for k, im in parts.items():
    b = im.getbbox(); parts[k] = im.crop(b) if b else im
x, frames, H = 0, {}, max(p.height for p in parts.values())
atlas = Image.new('RGBA', (sum(p.width + 2 for p in parts.values()), H), (0, 0, 0, 0))
for k, p in parts.items():
    atlas.alpha_composite(p, (x, 0)); frames[k] = {'rect': [x, 0, p.width, p.height]}; x += p.width + 2
atlas.save(OUT / 'deck.webp', lossless=True, method=6)
(OUT / 'deck.json').write_text(json.dumps({'pack': 'Dotonbori City v3', 'artist': 'GuttyKreum', 'source': 'https://guttykreum.itch.io/dotonbori-city-game-assets',
    'sourceSha256': hashlib.sha256(src.read_bytes()).hexdigest(), 'tile': 32,
    'note': 'Elevated-road rails for Yahaeng. Not a standalone asset.', 'frames': frames}, ensure_ascii=False, indent=1) + '\n')
print('deck rails', {k: v['rect'] for k, v in frames.items()})
