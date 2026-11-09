"""Import six CC BY 4.0 vehicles and eight original generated Korean shop signs."""
from pathlib import Path
from PIL import Image
from io import BytesIO
import zipfile,json,hashlib
import argparse
parser=argparse.ArgumentParser(description='Pack selected licensed vehicles and original Korean signs; never ship source ZIPs.')
parser.add_argument('--vehicles',type=Path,required=True)
parser.add_argument('--signs',type=Path,required=True)
parser.add_argument('--hero-proposal',type=Path)
args=parser.parse_args()
r=Path(__file__).resolve().parents[1];out=r/'src/art/city-study'
im=Image.open(args.signs).convert('RGBA');atlas=Image.new('RGBA',(384,256));frames={}
for i,name in enumerate(['baeksong','diner','pharmacy','music','electric','print','books','cafe']):
 x=i%2;y=i//2;part=im.crop((x*im.width//2,y*im.height//4,(x+1)*im.width//2,(y+1)*im.height//4));part=part.crop(part.getbbox());part.thumbnail((190,62),Image.Resampling.NEAREST);atlas.alpha_composite(part,(x*192,y*64));frames[name]={'rect':[x*192,y*64,*part.size]}
atlas.save(out/'korean-signs.webp',lossless=True);(out/'korean-signs.json').write_text(json.dumps({'origin':'Original generated Korean storefronts; reviewed and packed for Yahaeng','frames':frames},ensure_ascii=False,indent=2)+'\n')
z=zipfile.ZipFile(args.vehicles);vout=r/'src/art/vehicles';vout.mkdir(exist_ok=True);atlas=Image.new('RGBA',(2400,1200));frames={};n=0
models=[('sedan','SEDAN','White'),('civic','CIVIC','Red'),('hatch','HATCHBACK','Green'),('wagon','WAGON','Blue'),('luxury','LUXURY','Black'),('police','POLICE',None)]
for key,model,color in models:
 if color:path=next(n for n in z.namelist()if n.startswith(model+' TOPDOWN/'+color+'/')and 'All_000-sheet.png'in n)
 else:path='POLICE TOPDOWN/ALL DIRECTION/POLICE_CLEAN_ALLD0000-sheet.png'
 sheet=Image.open(BytesIO(z.read(path))).convert('RGBA');assert sheet.size==(700,700)
 rects=[]
 for i in range(48):
  part=sheet.crop((i%7*100,i//7*100,i%7*100+100,i//7*100+100));x=n%24*100;y=n//24*100;atlas.alpha_composite(part,(x,y));rects.append([x,y,100,100]);n+=1
 frames[key]={'rects':rects,'sourceFile':path,'sourceSha256':hashlib.sha256(z.read(path)).hexdigest(),'anchor':[50,56],'scale':1.12}
atlas.save(vout/'traffic.webp',lossless=True,method=6)
(vout/'traffic.json').write_text(json.dumps({'artist':'MinZinn (@MinZiin_)','pack':'TopDown Vehicles v1.17','source':'https://minzinn.itch.io/pixelvehicles','license':'CC-BY-4.0','licenseURL':'https://creativecommons.org/licenses/by/4.0/','changes':'Selected original 48-direction sprites for six vehicles, repacked losslessly. No recoloring or stretching.','frames':frames},indent=2)+'\n');(vout/'LICENSE.txt').write_text(z.read('readme.txt').decode()+'\nCC BY 4.0: https://creativecommons.org/licenses/by/4.0/\nSelected original sprites repacked into a runtime atlas for Yahaeng.\n')
# A turnaround is a design proposal, never silently treated as animated gameplay art.
if args.hero_proposal:
    doc=r/'docs/world-polish-v240';doc.mkdir(exist_ok=True)
    Image.open(args.hero_proposal).save(doc/'hero-turnaround.webp',lossless=True)
print('packed eight Korean signs and 288 car directions')
