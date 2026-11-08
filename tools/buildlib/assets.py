"""Normalize current and pre-v141 audio catalogues for the campaign."""
import json
import base64
from pathlib import Path

def campaign_assets(root):
    assets = json.loads((Path(root) / 'build/assets_city.json').read_text())
    # All campaign mood tracks are generated n_* WebAudio loops. Four unused
    # legacy recordings used to add 1.19 MB of base64 to every HTML release.
    assets.pop('music', None)
    # UI and canvas now share the complete self-hosted face in interface.css.
    assets.pop('font', None)
    fx = Path(root) / 'src/art/fx'
    if (fx / 'pixelfx.json').exists():
        assets['pixelfx'] = json.loads((fx / 'pixelfx.json').read_text())
        assets['pixelfx']['license'] = (fx / 'LICENSE.txt').read_text()
        assets['pixelfx']['src'] = 'data:image/webp;base64,' + base64.b64encode((fx / 'pixelfx.webp').read_bytes()).decode()
    city=Path(root)/'src/art/gutty-city'
    if (city/'pilot.json').exists():
        assets['freeCity']=json.loads((city/'pilot.json').read_text())
        assets['freeCity']['src']='data:image/webp;base64,'+base64.b64encode((city/'pilot.webp').read_bytes()).decode()
    return json.dumps(assets, ensure_ascii=False, separators=(',', ':'))
