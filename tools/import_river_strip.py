"""Build the Cheonggyecheon-style river strip for the big-city study (?study=city-xl).

The river runs east-west across the whole city. The game tiles it from a small atlas cut from the
purchased GuttyKreum "Dotonbori City v3" pack example scene (people and the roofed boat removed):

  quay      one 4-tile period of the north quay, stream and south pier (11 rows)
  ladder    the same period with a ladder from the promenade down to the lower deck
  railL/R   the bridge parapets that line a road where it crosses the river

Only this finished atlas is written to the repository; the pack, its tilemap and example image
stay private, the same as for the other imported GuttyKreum art.

Usage:
  python tools/import_river_strip.py <pack>/Tilemap/MainTileMap.png <pack>/Example.png
"""
import json
import sys
import hashlib
from pathlib import Path

import numpy as np
from PIL import Image

T = 32
ROWS = list(range(12, 22)) + [21]  # example rows used for the strip; the last pier row is repeated
OUT = Path(__file__).resolve().parents[1] / 'src/art/euljiro'

tile_path, example_path = map(Path, sys.argv[1:3])
tm = np.array(Image.open(tile_path).convert('RGBA')).astype(np.int16)
TC, TR = tm.shape[1] // T, tm.shape[0] // T
tiles = tm.reshape(TR, T, TC, T, 4).transpose(0, 2, 1, 3, 4).reshape(TR * TC, T, T, 4)
opaque = (tiles[..., 3] == 255).reshape(len(tiles), -1).all(1)
ex = np.array(Image.open(example_path).convert('RGBA'))
cell = lambda c, r: ex[r * T:(r + 1) * T, c * T:(c + 1) * T]

# people standing in the strip -> the pack tile that matches most of the cell
for c, r in [(6, 12), (10, 13), (10, 14), (11, 12), (11, 13), (11, 14), (11, 15), (12, 12), (12, 13), (13, 15), (13, 16),
             (11, 19), (11, 20), (10, 19), (10, 20), (15, 12), (4, 19), (4, 20), (4, 21), (5, 20), (5, 21)]:
    px = cell(c, r)[..., :3].astype(np.int16)
    diff = (np.abs(tiles[..., :3] - px[None]).sum(-1) > 0).reshape(len(tiles), -1).sum(1)
    ex[r * T:(r + 1) * T, c * T:(c + 1) * T] = tiles[int(np.where(opaque, diff, 9999).argmin())].astype(np.uint8)
ex[19 * T:20 * T, 4 * T:5 * T] = cell(6, 19)
for c in range(7):  # the roofed boat -> open water
    for r in (17, 18):
        ex[r * T:(r + 1) * T, c * T:(c + 1) * T] = cell(7, r)
    ex[16 * T + 16:17 * T, c * T:(c + 1) * T] = ex[16 * T + 16:17 * T, 7 * T:8 * T]

def column(c, swap=None, rows=None):
    """One example column over the strip rows, as a 32 x 352 image.
    swap = {row: take that row from another column} · rows = {row: take another row of this column}."""
    return np.concatenate([cell((swap or {}).get(r, c), (rows or {}).get(r, r)) for r in ROWS], 0)

# the plain quay (example columns 5-8) uses column 6 where column 7 has its ladder
quay = np.concatenate([column(5), column(6), column(7, {12: 6, 13: 6, 14: 6}), column(8)], 1)
ladder = np.concatenate([column(5), column(6), column(7), column(8)], 1)
atlas = np.concatenate([quay, ladder, column(9, rows={14: 17, 15: 17}), column(13, rows={14: 17, 15: 17})], 1)  # skip the deck medallion tips
OUT.mkdir(parents=True, exist_ok=True)
Image.fromarray(atlas).save(OUT / 'river.webp', lossless=True, method=6)

# collision per strip row for the quay columns: '=' walk, '¦' quay wall / railing, '~' water.
# The ladder column (2) is walkable on the wall row.
meta = {
    'artist': 'GuttyKreum', 'pack': 'Dotonbori City v3', 'source': 'https://guttykreum.itch.io/dotonbori-city-game-assets',
    'sourceSha256': hashlib.sha256(tile_path.read_bytes()).hexdigest(),
    'note': 'River strip for Yahaeng, cut from the example scene. Not a standalone asset; see LICENSE.txt.',
    'tile': T, 'rows': len(ROWS), 'period': 4, 'ladderColumn': 2,
    'frames': {'quay': [0, 0, 4 * T, len(ROWS) * T], 'ladder': [4 * T, 0, 4 * T, len(ROWS) * T],
               'railL': [8 * T, 0, T, len(ROWS) * T], 'railR': [9 * T, 0, T, len(ROWS) * T]},
    'grid': ['=', '¦', '=', '¦', '~', '~', '~', '¦', '=', '=', '='],
}
(OUT / 'river.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
print('river atlas', atlas.shape[1], 'x', atlas.shape[0], (OUT / 'river.webp').stat().st_size, 'bytes')
