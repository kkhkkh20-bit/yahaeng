"""Normalize current and pre-v141 audio catalogues for the campaign."""
import json
from pathlib import Path

def campaign_assets(root):
    assets = json.loads((Path(root) / 'build/assets_city.json').read_text())
    # All campaign mood tracks are generated n_* WebAudio loops. Four unused
    # legacy recordings used to add 1.19 MB of base64 to every HTML release.
    assets.pop('music', None)
    return json.dumps(assets, ensure_ascii=False, separators=(',', ':'))
