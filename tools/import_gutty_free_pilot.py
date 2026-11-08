"""Import a small game-only subset from the officially obtained Free City ZIP.
The artist's original ZIP/complete tileset remain outside the repository.
Usage: python tools/import_gutty_free_pilot.py /private/path/Free_Version/Tilemap/Tilemap.png
"""
import hashlib,json,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]);digest=hashlib.sha256(source.read_bytes()).hexdigest()
if digest!='2b57f857269a1270884b702ba3fbf15a2105994587222953f6bd93bc09a889b6':raise SystemExit('Unverified source: obtain the official Free v1 tilemap')
sheet=Image.open(source).convert('RGBA')
if sheet.size!=(1920,768):raise SystemExit('Expected the official Japanese City Free v1 tilemap')
frames={'asphalt':(992,128,1024,160),'pavers':(992,352,1016,376),'awning':(480,448,512,466),'window':(611,167,637,183),'vending':(421,70,443,102)}
atlas=Image.new('RGBA',(256,64));meta={}
for i,(name,rect) in enumerate(frames.items()):
 tile=sheet.crop(rect)
 if not tile.getbbox():raise SystemExit('Empty selection: '+name)
 x=i*40;atlas.alpha_composite(tile,(x,0));meta[name]={'rect':[x,0,*tile.size],'sourceRect':list(rect)}
out=root/'src/art/gutty-city';out.mkdir(parents=True,exist_ok=True)
atlas.save(out/'pilot.webp',lossless=True,method=6)
(out/'pilot.json').write_text(json.dumps({'source':'https://guttykreum.itch.io/free-japanese-city-game-assets','artist':'GuttyKreum','pack':'Japanese City Free v1','sourceSha256':digest,'frames':meta},indent=2)+'\n')
print('Imported',len(frames),'selected sprites;', (out/'pilot.webp').stat().st_size,'bytes')
