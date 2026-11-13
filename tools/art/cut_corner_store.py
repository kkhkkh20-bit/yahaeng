"""Cut the few Corner Store sprites free mode uses into one small atlas.

Source: purchased GuttyKreum "The Japan Collection: Corner Store" v1 (private ZIP, never committed).
Usage: python3 -I tools/art/cut_corner_store.py <unzipped pack dir>
Only text-free pieces are taken (no katakana counters, no yen posters). 32 px source tiles, drawn at 1.5x (48 px world).
"""
import hashlib, json, sys
from pathlib import Path
from PIL import Image

src = Path(sys.argv[1]); out = Path(__file__).resolve().parents[2] / 'src/art/corner-store'
B = Image.open(src / 'RPGMakerVXAce/GK_CS_B.png').convert('RGBA'); A5 = Image.open(src / 'RPGMakerVXAce/GK_CS_A5.png').convert('RGBA')
# name: (sheet, x, y, w, h) in source pixels — trimmed to the drawn pixels afterwards
CUTS = {
  'shelfEmpty': ('B', 352, 64, 32, 48), 'shelfGoods': ('B', 384, 64, 32, 48), 'shelfBoxes': ('B', 416, 64, 32, 48),
  'foodCase': ('B', 384, 128, 64, 32),
  'wallBottles': ('A', 0, 384, 32, 64), 'fridgeBlue': ('A', 32, 384, 32, 64), 'fridgeFood': ('A', 64, 384, 32, 64), 'fridgeBlue2': ('A', 96, 384, 32, 64),
  'fridgeDark': ('A', 96, 448, 32, 64), 'wallShelf': ('A', 0, 448, 32, 64),
  'plant': ('B', 380, 0, 32, 64),
}
frames, imgs = {}, []
for name, (sh, x, y, w, h) in CUTS.items():
  im = (B if sh == 'B' else A5).crop((x, y, x + w, y + h)); bb = im.getbbox()
  if not bb: continue
  im = im.crop(bb); imgs.append((name, im, (x + bb[0], y + bb[1])))
W = sum(i.width for _, i, _ in imgs) + 2 * len(imgs); H = max(i.height for _, i, _ in imgs)
atlas = Image.new('RGBA', (W, H)); cx = 0
for name, im, o in imgs:
  atlas.alpha_composite(im, (cx, 0)); frames[name] = {'rect': [cx, 0, im.width, im.height], 'source': o}; cx += im.width + 2
out.mkdir(parents=True, exist_ok=True); atlas.save(out / 'store.webp', lossless=True)
zipsha = sys.argv[2] if len(sys.argv) > 2 else ''
(out / 'store.json').write_text(json.dumps({'pack': 'GuttyKreum The Japan Collection: Corner Store v1', 'zipSha256': zipsha, 'scale': 1.5, 'frames': frames}, ensure_ascii=False, indent=1))
print(len(frames), atlas.size)
