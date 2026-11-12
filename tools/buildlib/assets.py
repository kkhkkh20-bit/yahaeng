"""Normalize current and pre-v141 audio catalogues for the campaign."""
import json
import base64
from pathlib import Path

def campaign_assets(root):
    assets = json.loads((Path(root) / 'build/assets_city.json').read_text())
    # Retire the unused legacy catalogue; load the three licensed score loops.
    assets.pop('music', None)
    assets['score'] = {key: 'data:audio/mpeg;base64,' + base64.b64encode((Path(root)/'src/audio'/name).read_bytes()).decode() for key,name in [('n_calm','night.mp3'),('n_tense','search.mp3'),('n_fight','chase.mp3'),('n_title','title.mp3')]}
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
    details=Path(root)/'src/art/purchased-details'
    if (details/'fixtures.json').exists():
        assets['purchasedDetails']=json.loads((details/'fixtures.json').read_text())
        assets['purchasedDetails']['src']='data:image/webp;base64,'+base64.b64encode((details/'fixtures.webp').read_bytes()).decode()
    props=Path(root)/'src/art/purchased-props'
    if (props/'props.json').exists():
        assets['purchasedProps']=json.loads((props/'props.json').read_text())
        assets['purchasedProps']['src']='data:image/webp;base64,'+base64.b64encode((props/'props.webp').read_bytes()).decode()
    study=Path(root)/'src/art/city-study'
    if (study/'details.json').exists():
        assets['cityStudy']=json.loads((study/'details.json').read_text())
        assets['cityStudy']['src']='data:image/webp;base64,'+base64.b64encode((study/'details.webp').read_bytes()).decode()
    boards=study/'billboards.json'
    if boards.exists():
        assets['cityBoards']=json.loads(boards.read_text())
        assets['cityBoards']['src']='data:image/webp;base64,'+base64.b64encode((study/'billboards.webp').read_bytes()).decode()
    signs2=study/'korean-signs-extra.json'
    if signs2.exists():
        assets['citySigns2']=json.loads(signs2.read_text())
        assets['citySigns2']['src']='data:image/webp;base64,'+base64.b64encode((study/'korean-signs-extra.webp').read_bytes()).decode()
    signs=study/'korean-signs.json'
    if signs.exists():
        assets['citySigns']=json.loads(signs.read_text())
        assets['citySigns']['src']='data:image/webp;base64,'+base64.b64encode((study/'korean-signs.webp').read_bytes()).decode()
    river=Path(root)/'src/art/euljiro'
    if (river/'river.json').exists():
        assets['cityRiver']=json.loads((river/'river.json').read_text())
        assets['cityRiver']['src']='data:image/webp;base64,'+base64.b64encode((river/'river.webp').read_bytes()).decode()
    wp=Path(root)/'src/art/weapons'
    if (wp/'items.json').exists():
        assets['cityItems']=json.loads((wp/'items.json').read_text())
        assets['cityItems']['src']='data:image/webp;base64,'+base64.b64encode((wp/'items.webp').read_bytes()).decode()
    sg=Path(root)/'src/art/signals'
    if (sg/'signals.json').exists():
        assets['citySignals']={'frames':json.loads((sg/'signals.json').read_text())}
        assets['citySignals']['src']='data:image/webp;base64,'+base64.b64encode((sg/'signals.webp').read_bytes()).decode()
    if (river/'garage.json').exists():
        assets['cityGarage']=json.loads((river/'garage.json').read_text())
        assets['cityGarage']['src']='data:image/webp;base64,'+base64.b64encode((river/'garage.webp').read_bytes()).decode()
    if (river/'deck.json').exists():
        assets['cityDeck']=json.loads((river/'deck.json').read_text())
        assets['cityDeck']['src']='data:image/webp;base64,'+base64.b64encode((river/'deck.webp').read_bytes()).decode()
    vehicles=Path(root)/'src/art/vehicles'
    if (vehicles/'traffic.json').exists():
        assets['cityVehicles']=json.loads((vehicles/'traffic.json').read_text())
        assets['cityVehicles']['src']='data:image/webp;base64,'+base64.b64encode((vehicles/'traffic.webp').read_bytes()).decode()
    cast=Path(root)/'src/art/cast'
    for name,key in [('portraits','castPortraits'),('dog','strayDog')]:
        if (cast/(name+'.json')).exists():
            assets[key]=json.loads((cast/(name+'.json')).read_text())
            assets[key]['src']='data:image/webp;base64,'+base64.b64encode((cast/(name+'.webp')).read_bytes()).decode()
    return json.dumps(assets, ensure_ascii=False, separators=(',', ':'))
