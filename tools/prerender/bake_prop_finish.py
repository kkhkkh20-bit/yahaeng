"""Render CC0 furniture offline and pack a single mobile-safe 2D sprite atlas."""
import hashlib,json,subprocess,sys,shutil
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[2];TMP=R/'build/prop-finish-bake';O=R/'src/art/prop-finish'
if '--pack-only'not in sys.argv:subprocess.run(['blender','--background','--factory-startup','--python',str(R/'tools/prerender/prop_finish_scene.py'),'--',str(TMP),*sys.argv[1:]],check=True)
meta=json.loads((TMP/'meta.json').read_text());frames={};images=[]
SURFACES={'desk':.50,'desk2':.50,'pc':.50,'table':.46,'tableS':.34,'bar':.68,'counter':.68,'dj':.68,'shelf':.14,'shelfS':.14,'disp':.14,'cab':.85,'nstand':.44}
for key,a in meta['frames'].items():
 if a['kind']in SURFACES:a['surfaceHeight']=SURFACES[a['kind']]
 im=Image.open(TMP/(key+'.png')).convert('RGBA');im=im.resize((max(1,round(im.width/2)),max(1,round(im.height/2))),Image.Resampling.LANCZOS);box=im.getchannel('A').getbbox()
 if not box:raise ValueError('Empty prop '+key)
 im=im.crop(box);a.update(ox=round(a['ox']+box[0],3),oy=round(a['oy']+box[1],3),w=im.width,h=im.height);images.append((key,a,im))
width=1024;x=y=row=0
for key,a,im in sorted(images,key=lambda z:-z[2].height):
 if x+im.width+2>width:x=0;y+=row+2;row=0
 a.update(sx=x,sy=y);frames[key]=a;x+=im.width+2;row=max(row,im.height)
height=y+row;assert height<=4096,('Mobile atlas too tall',height)
atlas=Image.new('RGBA',(width,height))
for key,a,im in images:atlas.paste(im,(a['sx'],a['sy']))
atlas=atlas.quantize(colors=256,method=Image.FASTOCTREE).convert('RGBA')
O.mkdir(parents=True,exist_ok=True);atlas.save(O/'atlas.webp','WEBP',lossless=True,method=6)
(O/'meta.json').write_text(json.dumps({'w':width,'h':height,'frames':frames},separators=(',',':'))+'\n')
license=R/'tools/prerender/kenney_furn/src/License.txt';shutil.copyfile(license,O/'LICENSE-Kenney.txt')
(O/'sources.json').write_text(json.dumps({'license':'CC0-1.0','official':'https://kenney.nl/assets/furniture-kit','license_sha256':hashlib.sha256(license.read_bytes()).hexdigest(),'models':{n+'.glb':hashlib.sha256((R/'tools/prerender/furnglb'/(n+'.glb')).read_bytes()).hexdigest()for n in meta['models']},'custom_geometry':['desk','shelf','bar','counter','dj','safe','board','medcab','pot','spk','sink']},indent=2)+'\n')
print('Packed',len(frames),'frames',atlas.size,(O/'atlas.webp').stat().st_size,'bytes')
