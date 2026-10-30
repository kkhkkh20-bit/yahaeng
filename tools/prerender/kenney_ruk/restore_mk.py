"""Restore the CC0 MegaKit models needed by a stage, from a pinned mirror.

Run spec.py first, then this script (default: m6), then bake_mk.py m6.
Only model data is downloaded; no code from the mirror is executed.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
from urllib.parse import quote, unquote

from bake_mk import bld_items, ROOT

REV = '85064399bbdacc0e8cc50807179490314bc4ff1c'
BASE = f'https://raw.githubusercontent.com/tilakpatell/tilakverse-assets/{REV}/quaternius/downtown-city-megakit/'
EXPORT = 'Exports/glTF (Godot)/'
DEST = ROOT / 'dl/megakit'


def fetch(relative):
    path = DEST / relative
    if not path.resolve().is_relative_to(DEST.resolve()):
        raise ValueError(relative)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        tmp = path.with_suffix(path.suffix + '.part')
        subprocess.run(['curl', '-fsSL', '--retry', '2', BASE + quote(relative, safe='/'), '-o', str(tmp)], check=True)
        tmp.replace(path)
    return relative, hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('stage', nargs='?', default='m6')
    args = ap.parse_args()
    specs = json.loads(Path(__file__).with_name('spec.json').read_text())
    stage = next(s for s in specs if s['id'] == args.stage)
    names = sorted({it['n'][2:] for b in stage['b'] for it in bld_items(b)[1] if it.get('n', '').startswith('M:')})
    with concurrent.futures.ThreadPoolExecutor(4) as pool:
        hashes = dict(pool.map(fetch, [EXPORT + n + '.gltf' for n in names]))
        dependencies = set()
        for n in names:
            gltf = json.loads((DEST / EXPORT / (n + '.gltf')).read_text())
            dependencies.update(EXPORT + unquote(v['uri']) for k in ('buffers', 'images') for v in gltf.get(k, []) if 'uri' in v and not v['uri'].startswith('data:'))
        hashes.update(pool.map(fetch, sorted(dependencies)))
    license_path, license_hash = fetch('License_Standard.txt')
    license_text = (DEST / license_path).read_text()
    if 'CC0 1.0 Universal' not in license_text:
        raise ValueError('Expected the standard CC0 pack')
    folder = Path(__file__).parents[1] / 'megakit'
    folder.mkdir(exist_ok=True)
    (folder / 'LICENSE.txt').write_text(license_text)
    (folder / 'sources.json').write_text(json.dumps({
        'author': 'Quaternius', 'license': 'CC0-1.0',
        'official': 'https://quaternius.com/packs/downtowncitymegakit.html',
        'mirror': BASE, 'revision': REV, 'stage': args.stage,
        'license_sha256': license_hash, 'files': dict(sorted(hashes.items()))
    }, indent=2) + '\n')
    link = Path(__file__).parents[1] / 'mk'
    if link.is_symlink() and str(link.readlink()) == '/root/game/dl/megakit/Exports/glTF (Godot)':
        link.unlink()
    if not link.exists() and not link.is_symlink():
        link.symlink_to('../../dl/megakit/Exports/glTF (Godot)', target_is_directory=True)
    print(f'Restored {len(names)} models and {len(dependencies)} dependencies for {args.stage}')


if __name__ == '__main__':
    main()
