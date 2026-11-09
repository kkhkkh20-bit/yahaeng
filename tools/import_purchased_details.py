"""Select owned GuttyKreum pixels for functional fixtures; never ship source sheets.
Usage: python tools/import_purchased_details.py /private/dotonbori/MainTileMap.png /private/office/MainTileMap.png
"""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('city',type=Path);p.add_argument('office',type=Path);args=p.parse_args()
sources={}
for key,path,want in [('city',args.city,'a82beeeff1f3d77e24cf26e80a8dd221061aae4179c9cb3ec92c569bfd0d8235'),('office',args.office,'cb793dd0023f6450d85474988a3d058c30d7a9b06d6dc872244885e07126324c')]:
 sha=hashlib.sha256(path.read_bytes()).hexdigest();assert sha==want,(key,'unexpected purchased source');sources[key]={'sha256':sha,'image':Image.open(path).convert('RGBA')}
# Rectangle coordinates are source pixels, not speculative tile names. Keep
# silhouettes, alpha and original colour ramps; only crop, repeat and project.
rects={
 'stairTreads':('city',(1152,448,1184,480)),
 'ladder':('city',(768,64,800,128)),
 'rail':('city',(1024,304,1120,314)),
 'bridgeDeck':('city',(192,0,224,32)),
 'bridgeSideRail':('city',(1024,309,1027,310)),
 'bridgePost':('city',(1024,304,1027,314)),
 'manhole':('city',(1120,256,1152,288)),
 'pipe':('city',(972,32,981,56)),
 'aircon':('city',(768,256,800,288)),
 'roofUnit':('city',(960,64,992,96)),
 'doorExterior':('city',(704,448,736,480)),
 'parcel':('office',(1952,384,1984,416)),
 'paper':('office',(1581,67,1596,82)),
 'doorOffice':('city',(708,452,732,477)),
 'doorWood':('office',(1251,258,1277,285)),
 'switchPlate':('city',(900,38,912,60)),
 'ventGrille':('office',(1258,164,1270,184)),
}
parts=[]
for name,(source,rect)in rects.items():
 im=sources[source]['image'].crop(rect)
 # Source alpha trims empty margins, never wall pixels around an object.
 if name in ['ladder','manhole','parcel','paper','pipe','switchPlate']:
  box=im.getbbox();assert box,name;im=im.crop(box);rect=(rect[0]+box[0],rect[1]+box[1],rect[0]+box[2],rect[1]+box[3])
 assembly='original pixels; crop only'
 if name=='ventGrille':im=im.transpose(Image.Transpose.ROTATE_90);assembly='original grille isolated from surrounding wall; quarter turn for floor projection'
 if name=='paper':
  todo={(x,y)for y in range(im.height)for x in range(im.width)if im.getpixel((x,y))[3]>128};groups=[]
  while todo:
   seed=todo.pop();group={seed};q=[seed]
   while q:
    x,y=q.pop()
    for at in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
     if at in todo:todo.remove(at);group.add(at);q.append(at)
   groups.append(group)
  keep=max(groups,key=len)
  for y in range(im.height):
   for x in range(im.width):
    if (x,y)not in keep:im.putpixel((x,y),(0,0,0,0))
  assembly='isolate one original loose-paper component; no added drawing or recolour'
 parts.append((name,im,{'source':source,'sourceRect':list(rect),'assembly':assembly}))
# Reuse the already verified office cuts, not a second guessed crop of the sheet.
om=json.loads((ROOT/'src/art/office/interiors.json').read_text());oi=Image.open(ROOT/'src/art/office/interiors.webp').convert('RGBA')
for name in ['cabinetBlue','lockerSteel','wardrobeWood','wallPanel','windowFrame']:
 f=om['frames'][name];x,y,w,h=f['rect'];detail={'source':'office','sourceRect':f.get('sourceRect'),'assembly':'existing verified office crop'}
 if name in ['lockerSteel','wardrobeWood']:
  detail.update(leafCount=2,leafRects=[[2,7,10,24 if name=='lockerSteel'else 19],[11,7,10,24 if name=='lockerSteel'else 19]],handleBand=[5,5],handleXs=[6.5,2.5])
 parts.append((name,oi.crop((x,y,x+w,y+h)),detail))
atlas=Image.new('RGBA',(512,512));frames={};x=y=row=0
for name,im,meta in parts:
 if x+im.width>512:x=0;y+=row+2;row=0
 assert y+im.height<=512
 atlas.alpha_composite(im,(x,y));frames[name]={'rect':[x,y,*im.size],**meta};x+=im.width+2;row=max(row,im.height)
out=ROOT/'src/art/purchased-details';out.mkdir(exist_ok=True)
atlas.save(out/'fixtures.webp',lossless=True,method=6)
(out/'fixtures.json').write_text(json.dumps({'artist':'GuttyKreum','packs':['Dotonbori City v3','Office Interior v3'],'sources':{k:{'sha256':v['sha256']}for k,v in sources.items()},'frames':frames},indent=2)+'\n')
print(len(frames),'purchased fixture cuts,', (out/'fixtures.webp').stat().st_size,'bytes')
