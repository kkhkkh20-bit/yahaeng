"""CC0 models for the VIP club sample. Bake once; runtime uses ordinary 2D images.
Run with the existing prerender npm dependencies and Python Playwright installed.
Downloads model data only from a pinned revision; records license and SHA-256.
"""
import asyncio,base64,hashlib,json,math,subprocess,threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import quote,unquote
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2];HERE=ROOT/'tools/prerender';OUT=ROOT/'src/art/quarter'
REV='85064399bbdacc0e8cc50807179490314bc4ff1c'
BASE=f'https://raw.githubusercontent.com/tilakpatell/tilakverse-assets/{REV}/quaternius/downtown-city-megakit/'
MODELS=['Prop_Drain','Prop_ManholeCover','Prop_Planter_Single','Prop_Bollard','DoorFrame_Metal_Single']
def fetch(rel):
 p=ROOT/'dl/megakit'/rel;p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():subprocess.run(['curl','-fsSL','--max-time','40',BASE+quote(rel,safe='/'),'-o',str(p)],check=True)
 return p
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
async def main():
 OUT.mkdir(parents=True,exist_ok=True);files={};license=fetch('License_Standard.txt');assert 'CC0 1.0 Universal' in license.read_text()
 for n in MODELS:
  rel='Exports/glTF (Godot)/'+n+'.gltf';p=fetch(rel);files[rel]=hashlib.sha256(p.read_bytes()).hexdigest()
  for v in [*json.loads(p.read_text()).get('buffers',[]),*json.loads(p.read_text()).get('images',[])]:
   if v.get('uri','').startswith('data:'):continue
   dep='Exports/glTF (Godot)/'+unquote(v['uri']);p=fetch(dep);files[dep]=hashlib.sha256(p.read_bytes()).hexdigest()
 (OUT/'LICENSE-Quaternius.txt').write_text(license.read_text());(OUT/'LICENSE-Kenney.txt').write_text((HERE/'kenney_furn/src/License.txt').read_text())
 sources={'revision':REV,'mirror':BASE,'official':['https://kenney.nl/assets/furniture-kit','https://quaternius.com/packs/downtowncitymegakit.html'],'license':'CC0-1.0','license_sha256':hashlib.sha256(license.read_bytes()).hexdigest(),'files':files,'kenney_files':{}}
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(HERE)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--enable-unsafe-swiftshader']);pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.goto(f'http://127.0.0.1:{server.server_port}/kenney_ruk/bake.html');await pg.wait_for_function('window.__ok',polling=100)
   recipes={'sofa':('F:loungeSofa',2,1,.65),'sofaV':('F:loungeSofa',1,2,.65),'bar':('F:kitchenBar',4,1,.8),'spk':('F:speaker',1,1,.85),'plant':('F:pottedPlant',1,1,.9),'tableS':('F:tableCoffeeSquare',1,1,.4),'desk':('F:desk',1,1,.6),'chairD':('F:chairDesk',1,1,.65),'cab':('F:bookcaseClosedDoors',1,1,.9),'drain':('M:Prop_Drain',1,1,.1),'manhole':('M:Prop_ManholeCover',1,1,.1),'bollard':('M:Prop_Bollard',1,1,.7),'planter':('M:Prop_Planter_Single',1,1,.65),'doorframe':('M:DoorFrame_Metal_Single',1,1,1.3)}
   meta={}
   for key,(name,w,h,high) in recipes.items():
    if name.startswith('F:'):
     f=HERE/'furnglb'/(name[2:]+'.glb');sources['kenney_files'][f.name]=hashlib.sha256(f.read_bytes()).hexdigest()
    bb=await pg.evaluate('bbox',name);bw=bb[1][0]-bb[0][0];bh=bb[1][1]-bb[0][1];bd=bb[1][2]-bb[0][2]
    rot=1 if key=='sofaV' else 0;ww,dd=(bd,bw)if rot else(bw,bd);scale=min(w*.88/ww,h*.88/dd,high/bh);sx=scale;sz=scale
    if key=='bar':sx=w*.92/bw;sz=h*.8/bd
    sy=min(scale,high/bh)
    corners=[(xx*sx*math.cos(rot*math.pi/2)+zz*sz*math.sin(rot*math.pi/2),-xx*sx*math.sin(rot*math.pi/2)+zz*sz*math.cos(rot*math.pi/2))for xx in [bb[0][0],bb[1][0]]for zz in [bb[0][2],bb[1][2]]]
    cx=(min(c[0]for c in corners)+max(c[0]for c in corners))/2;cz=(min(c[1]for c in corners)+max(c[1]for c in corners))/2
    spec={'box':[-1.2,-2.2,w+1.2,h+1.2],'ppu':48,'ys':.78,'hemi':1.05,'sun':1.25,'items':[{'n':name,'x':w/2-cx,'z':h/2-cz,'y':-bb[0][1]*sy,'r':rot,'s':[sx,sy,sz]}]}
    url=await pg.evaluate('async s=>{await bake(s);return document.querySelector("canvas").toDataURL("image/webp",.94)}',spec)
    data=base64.b64decode(url.split(',')[1]);(OUT/(key+'.webp')).write_bytes(data);meta[key]={'ox':-1.2*48,'oy':-2.2*48,'w':round((w+2.4)*48),'h':round((h+3.4)*48),'footprint':[w,h]};print('baked',key,len(data),flush=True)
   assert not errors,errors;await b.close()
   (OUT/'meta.json').write_text(json.dumps(meta,indent=2)+'\n');(OUT/'sources.json').write_text(json.dumps(sources,indent=2)+'\n')
 finally:server.shutdown()
asyncio.run(main())
