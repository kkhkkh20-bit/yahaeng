"""Build Yahaeng's selected exterior atlas from the purchaser's private Dotonbori v3 PNG.
Usage: python tools/import_dotonbori_exteriors.py /private/Tilemap/MainTileMap.png --urban /private/kenney-rpg-urban/Tiles
The full source, ZIP, demo map and Unity package must never be copied into the repo.
"""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
args=argparse.ArgumentParser();args.add_argument('source',type=Path);args.add_argument('--urban',type=Path,required=True);args=args.parse_args()
source=args.source;digest=hashlib.sha256(source.read_bytes()).hexdigest()
if digest!='a82beeeff1f3d77e24cf26e80a8dd221061aae4179c9cb3ec92c569bfd0d8235':
 raise SystemExit('Expected the purchased, official Dotonbori City v3 tilemap')
sheet=Image.open(source).convert('RGBA')
if sheet.size!=(3008,672):raise SystemExit('Unexpected source dimensions')
# The roof centre contains no decorative hatches that could suggest an interaction.
selections={'roofTile':(2592,160,2688,256),'wallPanel':(772,298,796,314),
 'roofTerrace':(1984,0,2080,96),'roofWave':(2592,0,2688,96),
 'wallBrick':(292,328,304,336),'wallGreen':(420,310,444,318),'wallMetal':(292,4,316,20),
 'cornice':(768,288,864,298),'pilaster':(768,298,772,320),
 'pavers':(1992,168,2024,200),'awning':(416,128,448,134),'roofUnit':(960,64,992,96),
 'lampOff':(1032,0,1056,16),'lampOn':(1032,64,1056,80)}
parts=[(name,sheet.crop(rect),{'sourceRect':list(rect)})for name,rect in selections.items()]
# Transparent surround: functional glass/lock/open states remain the game's job.
s=sheet.crop((512,96,544,128));win=Image.new('RGBA',(26,16))
for box,pos in [((0,0,3,3),(0,0)),((29,0,32,3),(23,0)),((0,29,3,32),(0,13)),((29,29,32,32),(23,13))]:win.alpha_composite(s.crop(box),pos)
for x in range(3,23):
 win.alpha_composite(s.crop((4,0,5,3)),(x,0));win.alpha_composite(s.crop((4,29,5,32)),(x,13))
for y in range(3,13):
 win.alpha_composite(s.crop((0,4,3,5)),(0,y));win.alpha_composite(s.crop((29,4,32,5)),(23,y))
upper=Image.new('RGBA',(26,12));upper.alpha_composite(win.crop((0,0,26,6)),(0,0));upper.alpha_composite(win.crop((0,10,26,16)),(0,6))
parts.append(('upperWindow',upper,{'sourceRect':[512,96,544,128],'assembly':'transparent 26x12 upper-floor surround'}))
parts.append(('window',win,{'sourceRect':[512,96,544,128],'assembly':'transparent 26x16 surround; stateful glass rendered by game'}))
# Preserve the original jamb/handle pixels, removing only the plain middle
# strips so the entrance fits one 48px world cell at native 2x pixels.
s=sheet.crop((704,448,736,480));door=Image.new('RGBA',(24,24))
for sx,dx in [(0,0),(20,12)]:
 for sy,dy,sh in [(0,0,16),(24,16,8)]:door.alpha_composite(s.crop((sx,sy,sx+12,sy+sh)),(dx,dy))
opened=door.copy()
for y in range(3,22):
 for x in range(3,21):opened.putpixel((x,y),(14,23,34,255))
parts.append(('doorClosed',door,{'sourceRect':[704,448,736,480],'assembly':'24x24 jamb and panel; native 2x entrance'}))
parts.append(('doorOpen',opened,{'sourceRect':[704,448,736,480],'assembly':'same jamb with open dark aperture'}))
# Retain the previously shipped Free City vending machine with separate provenance.
free=ROOT/'src/art/gutty-city';old=json.loads((free/'pilot.json').read_text());im=Image.open(free/'pilot.webp').convert('RGBA')
for name in ['vending']:
 x,y,w,h=old['frames'][name]['rect'];parts.append((name,im.crop((x,y,x+w,y+h)),{'source':old['source'],'sourceRect':old['frames'][name]['sourceRect']}))
# A small CC0 botanical supplement: this purchased city pack contains ivy,
# but no ground grass or freestanding trees. Keep the original pixel silhouettes
# and map the bright daytime colours to the city's restrained night palette.
urban_source='https://kenney.nl/assets/rpg-urban-pack'
urban_ids={};urban_meta={'source':urban_source,'pack':'RPG Urban Pack 1.0','license':'CC0-1.0','assembly':'original pixels, campaign palette'}
def urban(n):
 p=args.urban/f'tile_{n:04d}.png';urban_ids[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
 a=Image.open(p).convert('RGBA')
 if a.size!=(16,16):raise SystemExit('Unexpected botanical source size')
 return a
def grade(a,soil=False,light=0):
 b=a.copy();px=b.load()
 # Flat colour ramps, no resampling/blur or photographic texture.
 for y in range(b.height):
  for x in range(b.width):
   r,g,bb,alpha=px[x,y]
   if not alpha:continue
   if g>r*1.13:
    v=g
    ramp=[(31,51,46),(43,68,52),(61,89,62),(88,113,77),(123,138,99)] if not soil else [(49,44,45),(62,54,50),(78,66,55),(95,81,63),(117,103,79)]
    rgb=ramp[min(4,max(0,sum(v>t for t in [145,190,210,230])+light))]
   else:rgb=(int(r*.58),int(g*.58),int(bb*.63))
   px[x,y]=(*rgb,alpha)
 return b
parts.append(('asphalt',grade(urban(441)),{**urban_meta,'tiles':[441],'assembly':'seamless unmarked road, campaign palette'}))
for name,n,bottom in [('treeOval',232,259),('treeRound',233,260),('treePlanter',232,286)]:
 a=Image.new('RGBA',(16,32));a.alpha_composite(urban(n),(0,0));a.alpha_composite(urban(bottom),(0,16));parts.append((name,grade(a),{**urban_meta,'tiles':[n,bottom]}))
parts.append(('roofPlanter',grade(urban(291)),{**urban_meta,'tiles':[291]}))
leaf=Image.new('RGBA',(16,32));leaf.alpha_composite(urban(232),(0,0));leaf.alpha_composite(urban(259),(0,16))
# Leaf-only clusters form dense low cover; tree trunks never become fake cover.
for y in range(leaf.height):
 for x in range(leaf.width):
  r,g,b,a=leaf.getpixel((x,y))
  if g<=r*1.13:leaf.putpixel((x,y),(0,0,0,0))
for i in range(2):
 bush=Image.new('RGBA',(40,28))
 for at in [(0,5),(12,0),(24,5),(7,9),(21,9)]:bush.alpha_composite(leaf.crop((0,0,16,24)),at)
 if i:bush=bush.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 parts.append(('bush'+str(i),grade(bush,light=i),{**urban_meta,'tiles':[232,259],'assembly':'overlapping leaf-only crowns, no trunk'}))
ground=urban(32)
for y in range(16):
 for x in range(16):
  r,g,b,a=ground.getpixel((x,y))
  if g<=r*1.13:ground.putpixel((x,y),(56,203,171,255))
for name,soil,light in [('grass',False,0),('grassAlt',False,-1),('soil',True,0)]:parts.append((name,grade(ground,soil,light),{**urban_meta,'tiles':[32],'assembly':'seamless ground, edge stones removed; campaign palette'}))
atlas=Image.new('RGBA',(512,320));frames={};x=y=row=0
for name,tile,meta in parts:
 if x+tile.width>atlas.width:x=0;y+=row+2;row=0
 if y+tile.height>atlas.height:raise SystemExit('Atlas overflow')
 atlas.alpha_composite(tile,(x,y));frames[name]={'rect':[x,y,*tile.size],**meta};x+=tile.width+2;row=max(row,tile.height)
out=ROOT/'src/art/dotonbori';out.mkdir(parents=True,exist_ok=True)
atlas.save(out/'exteriors.webp',lossless=True,method=6)
(out/'exteriors.json').write_text(json.dumps({'artist':'GuttyKreum','pack':'Dotonbori City v3','source':'https://guttykreum.itch.io/dotonbori-city-game-assets','sourceSha256':digest,'supplementSources':{urban_source:urban_ids},'roofSlice':16,'frames':frames},indent=2)+'\n')
print('Imported',len(frames),'game-specific frames;', (out/'exteriors.webp').stat().st_size,'bytes')
