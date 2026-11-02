"""Explicit runtime order, validated against the complete source tree."""
import json
from pathlib import Path

def runtime_modules(root):
    root = Path(root)
    data = json.loads((root / 'src/modules.json').read_text(encoding='utf-8'))
    if data.get('schema') != 1:
        raise ValueError('Unsupported runtime manifest schema')
    names = [item['path'] for item in data['modules']]
    if len(set(names)) != len(names):
        raise ValueError('Duplicate runtime module in src/modules.json')
    actual = {p.relative_to(root / 'src/js').as_posix() for p in (root / 'src/js').rglob('*.js')}
    if set(names) != actual:
        raise ValueError(f'Runtime manifest mismatch: unlisted={sorted(actual-set(names))}, missing={sorted(set(names)-actual)}')
    for name in names:
        path = root / 'src/js' / name
        if not path.resolve().is_relative_to((root / 'src/js').resolve()):
            raise ValueError('Module path escapes source root: '+name)
    return [root / 'src/js' / name for name in names]

def bundle_game(root):
    modules = runtime_modules(root)
    # Newlines isolate trailing comments and preserve declared initialization order.
    return "'use strict';\n(function () {\n" + '\n'.join(p.read_text(encoding='utf-8') for p in modules) + "\n})();\n"
