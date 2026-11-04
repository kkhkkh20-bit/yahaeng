"""Bake existing CC0 Kenney models into ordinary 2D game fixtures.

Official sources, license copies and exact input hashes accompany the sprites.
No 3D runtime or new engine is shipped.
"""
import asyncio,base64,hashlib,json,math,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2];HERE=ROOT/'tools/prerender';OUT=ROOT/'src/art/lights'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
async def main():
 OUT.mkdir(parents=True,exist_ok=True)
 recipes={'street':('detail-light-single',1.8,0),'wall':('F:lampWall',2.2,0),'ceiling':('F:lampSquareCeiling',2.1,.55)}
 metadata={};sources={'license':'CC0-1.0','official':['https://kenney.nl/assets/furniture-kit','https://kenney.nl/assets/retro-urban-kit'],'models':{},'licenses':{}}
 for name,folder in [('Furniture','kenney_furn'),('RetroUrban','kenney_ruk')]:
  license=HERE/folder/'src/License.txt';sources['licenses'][str(license.relative_to(ROOT))]=hashlib.sha256(license.read_bytes()).hexdigest()
  (OUT/f'LICENSE-{name}.txt').write_text('\n'.join(line.rstrip() for line in license.read_text().splitlines()).strip()+'\n')
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(HERE)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--enable-unsafe-swiftshader']);page=await b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto(f'http://127.0.0.1:{server.server_port}/kenney_ruk/bake.html');await page.wait_for_function('window.__ok')
   for kind,(model,scale,height) in recipes.items():
    path=HERE/'furnglb'/(model[2:]+'.glb') if model.startswith('F:') else HERE/'kenney_ruk/src/Models/GLB format'/(model+'.glb')
    sources['models'][str(path.relative_to(ROOT))]=hashlib.sha256(path.read_bytes()).hexdigest()
    bb=await page.evaluate('bbox',model)
    for rotation in range(4):
     theta=rotation*math.pi/2
     # Keep the street pole and wall mounting point at the world anchor.
     cx=-(bb[0][0]+bb[1][0])/2*scale if kind=='ceiling' else 0
     cz=-(bb[0][2]+bb[1][2])/2*scale if kind=='ceiling' else 0
     points=[(x*scale*math.cos(theta)+z*scale*math.sin(theta)+cx,z*scale*math.cos(theta)-x*scale*math.sin(theta)+cz-(y*scale+height)) for x in [bb[0][0],bb[1][0]] for y in [bb[0][1],bb[1][1]] for z in [bb[0][2],bb[1][2]]]
     box=[min(p[0] for p in points)-.12,min(p[1] for p in points)-.12,max(p[0] for p in points)+.12,max(p[1] for p in points)+.12]
     spec={'box':box,'ppu':48,'ground':False,'ys':1,'hemi':1.2,'sun':1.4,'items':[{'n':model,'x':cx,'z':cz,'y':height,'r':rotation,'s':[scale]*3}]}
     data=await page.evaluate('async s=>{await bake(s);return document.querySelector("canvas").toDataURL("image/webp",.96)}',spec)
     key=f'{kind}-{rotation}';(OUT/(key+'.webp')).write_bytes(base64.b64decode(data.split(',')[1]));metadata[key]={'ox':box[0]*48,'oy':box[1]*48,'w':round((box[2]-box[0])*48),'h':round((box[3]-box[1])*48)}
     print('baked',key,metadata[key],flush=True)
   assert not errors,errors;await b.close()
  (OUT/'meta.json').write_text(json.dumps(metadata,indent=2)+'\n');(OUT/'sources.json').write_text(json.dumps(sources,indent=2)+'\n')
 finally:server.shutdown()
if __name__=='__main__':asyncio.run(main())
