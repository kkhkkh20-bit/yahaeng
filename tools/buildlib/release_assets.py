"""Trace the release graph and prune only unreachable files in assets/."""
import re
from pathlib import Path
ASSET_REF = re.compile(r'(?<![A-Za-z0-9/])(?:\./|\.\./)*assets/([A-Za-z0-9_.-][A-Za-z0-9_./-]*)')
TEXT = {'.html', '.js', '.css'}

def release_graph(destination):
    root = Path(destination)
    folder = (root / 'assets').resolve()
    roots = [p for p in root.rglob('*') if p.is_file() and p.suffix in TEXT and 'assets' not in p.relative_to(root).parts and '.git' not in p.relative_to(root).parts]
    queue = roots[:]
    visited = set()
    used = set()
    while queue:
        path = queue.pop()
        if path in visited:
            continue
        visited.add(path)
        for name in ASSET_REF.findall(path.read_text(encoding='utf-8')):
            asset = root / 'assets' / name
            if not asset.resolve().is_relative_to(folder):
                raise ValueError('Asset path escapes release: '+name)
            if not asset.is_file():
                raise ValueError(f'Missing release asset {name} referenced by {path.relative_to(root)}')
            if asset in used:
                continue
            used.add(asset)
            if asset.suffix in TEXT:
                queue.append(asset)
    return used

def prune_assets(destination):
    root = Path(destination)
    used = release_graph(root)  # Validate the entire graph before deleting anything.
    unused = [p for p in (root / 'assets').rglob('*') if p.is_file() and p not in used]
    report = {'pruned_assets':len(unused), 'pruned_bytes':sum(p.stat().st_size for p in unused),
              'deployed_assets':len(used), 'deployed_asset_bytes':sum(p.stat().st_size for p in used)}
    for path in unused:
        path.unlink()
    return report
