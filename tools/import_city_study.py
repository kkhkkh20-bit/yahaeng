"""Import selected licensed city details; never ships the private source/demo map."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(); p.add_argument('source', type=Path); p.add_argument('--urban',type=Path,required=True); args = p.parse_args()
digest = hashlib.sha256(args.source.read_bytes()).hexdigest()
if digest != 'a82beeeff1f3d77e24cf26e80a8dd221061aae4179c9cb3ec92c569bfd0d8235':
    raise SystemExit('Expected purchased Dotonbori City v3 tilemap')
im = Image.open(args.source).convert('RGBA')
rects = {
    'rail': (1024,304,1120,320), 'ivy': (704,0,768,128),
    'aircon': (768,256,800,288), 'antenna': (960,0,992,64),
    'cafeSign': (832,224,864,256), 'foodSign': (832,384,864,416),
    'gallerySign': (864,288,928,320), 'gateSign': (864,512,928,544),
    'shopCornice': (608,224,704,256), 'tileFloor': (1992,168,2024,200),
    'stairHouse': (800,32,864,96), 'wallBlue': (548,424,568,440),
    'wallTan': (292,328,304,336), 'wallGreen': (420,310,444,318),
    'wallSlate': (772,298,796,314)
}
out = ROOT/'src/art/city-study'; out.mkdir(exist_ok=True)
atlas = Image.new('RGBA',(512,512)); frames={}; x=y=row=0
parts=[(name,im.crop(box),{'sourceRect':list(box)}) for name,box in rects.items()]
supplement={}
for i,n in enumerate([395,399,449]):
    car=Image.new('RGBA',(16,32))
    for j,num in enumerate([n,n+27]):
        path=args.urban/f'tile_{num:04d}.png';tile=Image.open(path).convert('RGBA')
        if tile.size!=(16,16):raise SystemExit('Expected RPG Urban Pack 1.0 tiles')
        supplement[path.name]=hashlib.sha256(path.read_bytes()).hexdigest();car.alpha_composite(tile,(0,j*16))
    parts.append(('car'+str(i),car.crop(car.getbbox()),{'source':'https://kenney.nl/assets/rpg-urban-pack','license':'CC0-1.0','tiles':[n,n+27]}))
for name, tile, meta in parts:
    if x+tile.width>atlas.width: x=0; y+=row+2; row=0
    if y+tile.height>atlas.height: raise SystemExit('Atlas overflow')
    atlas.alpha_composite(tile,(x,y));frames[name]={'rect':[x,y,*tile.size],**meta}
    x+=tile.width+2;row=max(row,tile.height)
atlas.save(out/'details.webp',lossless=True,method=6)
(out/'details.json').write_text(json.dumps({'artist':'GuttyKreum','pack':'Dotonbori City v3','source':'https://guttykreum.itch.io/dotonbori-city-game-assets','sourceSha256':digest,'supplementSources':{'https://kenney.nl/assets/rpg-urban-pack':supplement},'frames':frames},indent=2)+'\n')
print(len(frames),'selected details;',(out/'details.webp').stat().st_size,'bytes')
