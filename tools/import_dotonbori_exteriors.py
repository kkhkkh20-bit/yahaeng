"""Build Yahaeng's selected exterior atlas from the purchaser's private Dotonbori v3 PNG.
Usage: python tools/import_dotonbori_exteriors.py /private/Tilemap/MainTileMap.png
The full source, ZIP, demo map and Unity package must never be copied into the repo.
"""
import hashlib,json,sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]);digest=hashlib.sha256(source.read_bytes()).hexdigest()
if digest!='a82beeeff1f3d77e24cf26e80a8dd221061aae4179c9cb3ec92c569bfd0d8235':
 raise SystemExit('Expected the purchased, official Dotonbori City v3 tilemap')
sheet=Image.open(source).convert('RGBA')
if sheet.size!=(3008,672):raise SystemExit('Unexpected source dimensions')
# The roof centre contains no decorative hatches that could suggest an interaction.
selections={'roofTile':(2592,160,2688,256),'wallPanel':(772,298,796,314),
 'cornice':(768,288,864,298),'pilaster':(768,298,772,320),
 'pavers':(1992,168,2024,200),'awning':(416,128,448,134),
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
# Retain the previously shipped Free City vending machine with separate provenance.
free=ROOT/'src/art/gutty-city';old=json.loads((free/'pilot.json').read_text());im=Image.open(free/'pilot.webp').convert('RGBA')
for name in ['vending']:
 x,y,w,h=old['frames'][name]['rect'];parts.append((name,im.crop((x,y,x+w,y+h)),{'source':old['source'],'sourceRect':old['frames'][name]['sourceRect']}))
atlas=Image.new('RGBA',(384,160));frames={};x=y=row=0
for name,tile,meta in parts:
 if x+tile.width>atlas.width:x=0;y+=row+2;row=0
 if y+tile.height>atlas.height:raise SystemExit('Atlas overflow')
 atlas.alpha_composite(tile,(x,y));frames[name]={'rect':[x,y,*tile.size],**meta};x+=tile.width+2;row=max(row,tile.height)
out=ROOT/'src/art/dotonbori';out.mkdir(parents=True,exist_ok=True)
atlas.save(out/'exteriors.webp',lossless=True,method=6)
(out/'exteriors.json').write_text(json.dumps({'artist':'GuttyKreum','pack':'Dotonbori City v3','source':'https://guttykreum.itch.io/dotonbori-city-game-assets','sourceSha256':digest,'roofSlice':16,'frames':frames},indent=2)+'\n')
print('Imported',len(frames),'game-specific frames;', (out/'exteriors.webp').stat().st_size,'bytes')
