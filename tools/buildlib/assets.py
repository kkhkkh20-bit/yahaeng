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
    paid=Path(root)/'src/art/dotonbori'
    if (paid/'exteriors.json').exists():
        assets['dotonbori']=json.loads((paid/'exteriors.json').read_text())
        assets['dotonbori']['src']='data:image/webp;base64,'+base64.b64encode((paid/'exteriors.webp').read_bytes()).decode()
    office=Path(root)/'src/art/office'
    if (office/'interiors.json').exists():
        assets['office']=json.loads((office/'interiors.json').read_text())
        assets['office']['src']='data:image/webp;base64,'+base64.b64encode((office/'interiors.webp').read_bytes()).decode()
    study=Path(root)/'src/art/city-study'
    if (study/'details.json').exists():
        assets['cityStudy']=json.loads((study/'details.json').read_text())
        assets['cityStudy']['src']='data:image/webp;base64,'+base64.b64encode((study/'details.webp').read_bytes()).decode()
    signs=study/'korean-signs.json'
    if signs.exists():
        assets['citySigns']=json.loads(signs.read_text())
        assets['citySigns']['src']='data:image/webp;base64,'+base64.b64encode((study/'korean-signs.webp').read_bytes()).decode()
    vehicles=Path(root)/'src/art/vehicles'
    if (vehicles/'traffic.json').exists():
        assets['cityVehicles']=json.loads((vehicles/'traffic.json').read_text())
        assets['cityVehicles']['src']='data:image/webp;base64,'+base64.b64encode((vehicles/'traffic.webp').read_bytes()).decode()
    return json.dumps(assets, ensure_ascii=False, separators=(',', ':'))
