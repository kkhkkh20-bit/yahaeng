"""Select and assemble owned Office Interior pixels without altering their density.
Usage: python tools/import_purchased_props.py /private/office/Tilemap/MainTileMap.png
Full sheets/ZIPs remain private. Flat panels alone may be extended; 1px source
edges and labels keep their original thickness. No hand-drawn source pixels.
"""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('source',type=Path);args=p.parse_args()
sha=hashlib.sha256(args.source.read_bytes()).hexdigest()
assert sha=='cb793dd0023f6450d85474988a3d058c30d7a9b06d6dc872244885e07126324c','unexpected owned Office Interior source'
sheet=Image.open(args.source).convert('RGBA')
parts=[]
# This complete, individual carton is the top carton in the native 3-carton
# sprite. The other two cartons occlude each other; do not cut those as boxes.
CARTON=(1964,395,1975,404);box=sheet.crop(CARTON)
def carton(w,h):
 assert w>=11 and h>=9
 out=Image.new('RGBA',(w,h))
 # Original left/right edges and four top bands, including their corner pixels.
 for y in range(6):
  out.alpha_composite(box.crop((0,y,1,y+1)),(0,y))
  for x in range(1,w-1):out.alpha_composite(box.crop((1,y,2,y+1)),(x,y))
  out.alpha_composite(box.crop((10,y,11,y+1)),(w-1,y))
 # Extend only the unmarked front-face scanline. Keep source border thickness.
 for y in range(6,h-1):
  out.alpha_composite(box.crop((0,5,1,6)),(0,y))
  for x in range(1,w-1):out.alpha_composite(box.crop((4,5,5,6)),(x,y))
  out.alpha_composite(box.crop((10,5,11,6)),(w-1,y))
 for x in range(w):out.alpha_composite(box.crop((min(x,10),8,min(x,10)+1,9)),(x,h-1))
 # Source shipping label remains exactly 2x2 native pixels, not a scaled badge.
 out.alpha_composite(box.crop((1,6,3,8)),(4,h-5))
 return out
for i,(basew,topw) in enumerate([(28,18),(30,16),(28,20)]):
 base={'x':(32-basew)//2,'y':13,'w':basew,'h':18};top={'x':(32-topw)//2,'y':1,'w':topw,'h':13}
 im=Image.new('RGBA',(32,32));im.alpha_composite(carton(basew,18),(base['x'],base['y']));im.alpha_composite(carton(topw,13),(top['x'],top['y']))
 assert top['x']>=base['x'] and top['x']+top['w']<=base['x']+base['w']
 assert top['y']+top['h']==base['y']+1
 parts.append(('cargoStable'+str(i),im,{'role':'tall-cargo-cover','sourceRect':list(CARTON),'assembly':'one complete original carton; extend flat cardboard only; broad lower carton fully supports narrower upper carton; 1px contact overlap','base':base,'upper':top,'sourceBorder':1,'shippingLabel':[2,2],'worldScale':1.5,'visibleHeight':30,'footprint':[1,1]}))
CUTS={
 'bookcaseBlue':((1734,137,1753,186),'storage-shelf'),
 'bookcaseWood':((1766,137,1785,186),'storage-shelf'),
 'bookcaseRed':((1798,137,1817,186),'storage-shelf'),
 'filesBlue':((1734,201,1753,250),'document-cabinet'),
 'filesGold':((1766,201,1785,250),'document-cabinet'),
 'filesRed':((1798,201,1817,250),'document-cabinet'),
 'plantWide':((1827,128,1851,169),'potted-plant'),
 'plantLean':((1860,128,1884,169),'potted-plant'),
 'noticeBoard':((1930,288,1974,314),'notice-board'),
 'graphBoard':((1856,331,1888,365),'chart-board'),
 'printerService':((1484,416,1526,446),'printer'),
 'extinguisher':((1514,388,1524,406),'wall-extinguisher'),
}
for name,(rect,role)in CUTS.items():
 im=sheet.crop(rect);assert im.getbbox(),name
 parts.append((name,im,{'role':role,'sourceRect':list(rect),'assembly':'original source pixels; exact crop only','worldScale':1.5}))
# Deterministic packing with source-density transparency and a 2px gutter.
atlas=Image.new('RGBA',(256,256));frames={};x=y=row=0
for name,im,meta in parts:
 if x+im.width>256:x=0;y+=row+2;row=0
 assert y+im.height<=256
 atlas.alpha_composite(im,(x,y));frames[name]={'rect':[x,y,*im.size],**meta};x+=im.width+2;row=max(row,im.height)
out=R/'src/art/purchased-props';out.mkdir(parents=True,exist_ok=True)
atlas.save(out/'props.webp',lossless=True,method=6)
(out/'props.json').write_text(json.dumps({'artist':'GuttyKreum','pack':'Office Interior v3','source':'https://guttykreum.itch.io/japanese-office-interior-game-assets','sourceSha256':sha,'nativeScale':1.5,'frames':frames},indent=2)+'\n')
print(len(frames),'owned prop frames;', (out/'props.webp').stat().st_size,'bytes')
