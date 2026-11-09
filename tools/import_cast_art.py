"""Import original generated art as small runtime atlases, without source images."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def clean(image):
    image = image.convert('RGBA')
    image.putalpha(image.getchannel('A').point(lambda a: 255 if a >= 192 else 0))
    return image

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    for name in ['hero', 'cast', 'dog']:
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    ids = ['crow', 'aide', 'doc', 'hero', 'runner', 'contact', 'broker', 'club',
           'collector', 'district', 'freight', 'chair', 'guardMale', 'guardFemale', 'civilMale', 'civilFemale']
    source = clean(Image.open(args.cast))
    atlas = Image.new('RGBA', (512, 512))
    rects = {}
    for i, name in enumerate(ids):
        # The generated dog portrait is deliberately excluded: animals have no
        # radio portrait. Cell four is replaced with the dedicated heroine bust.
        image = clean(Image.open(args.hero)) if name == 'hero' else source.crop((i % 4 * source.width // 4, i // 4 * source.height // 4, (i % 4 + 1) * source.width // 4, (i // 4 + 1) * source.height // 4))
        box = image.getbbox()
        if not box:
            raise ValueError('Empty portrait: ' + name)
        image = image.crop(box)
        image.thumbnail((124, 126), Image.Resampling.LANCZOS)
        x, y = i % 4 * 128, i // 4 * 128
        atlas.alpha_composite(image, (x + (128 - image.width) // 2, y + 128 - image.height))
        rects[name] = [x, y, 128, 128]
    dest = ROOT / 'src/art/cast'
    dest.mkdir(exist_ok=True)
    atlas.save(dest / 'portraits.webp', lossless=True, method=6)
    (dest / 'portraits.json').write_text(json.dumps({'rects': rects, 'origin': 'Original generated cast busts; heroine derived from the approved female agent reference', 'sourceSha256': {'hero': digest(args.hero), 'cast': digest(args.cast)}, 'dogPortrait': False}, ensure_ascii=False, indent=2) + '\n')

    source = clean(Image.open(args.dog))
    frames = []
    for row in range(4):
        for col in range(8):
            part = source.crop((col * source.width // 8, row * source.height // 4, (col + 1) * source.width // 8, (row + 1) * source.height // 4))
            box = part.getbbox()
            if not box:
                raise ValueError(('Empty dog pose', row, col))
            frames.append(part.crop(box))
    scale = min(30 / max(p.width for p in frames), 27 / max(p.height for p in frames))
    atlas = Image.new('RGBA', (256, 128))
    for i, part in enumerate(frames):
        part = part.resize((max(1, round(part.width * scale)), max(1, round(part.height * scale))), Image.Resampling.NEAREST)
        atlas.alpha_composite(part, (i % 8 * 32 + (32 - part.width) // 2, i // 8 * 32 + 29 - part.height))
    atlas.save(dest / 'dog.webp', lossless=True, method=6)
    (dest / 'dog.json').write_text(json.dumps({'frame': 32, 'directions': ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'], 'rows': ['idle', 'walkA', 'walkB', 'down'], 'ground': 29, 'scale': 1.5, 'origin': 'Original generated in-game stray dog; not part of the purchased GuttyKreum packs', 'sourceSha256': digest(args.dog)}, indent=2) + '\n')
    print('Imported 16 human busts and 32 in-game dog poses; no dog portrait.')

if __name__ == '__main__':
    main()
