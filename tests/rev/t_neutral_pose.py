"""Bake-side geometry checks for a balanced standing silhouette and foot contacts.
No game assets are written. Verify the rendered rig rather than matching implementation text.
"""
import asyncio,json,threading,math,io,subprocess
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[2]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
async def main():
 s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'tools/prerender')));threading.Thread(target=s.serve_forever,daemon=True).start()
 try:
  async with async_playwright()as p:
   b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--enable-unsafe-swiftshader']);pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.goto(f'http://127.0.0.1:{s.server_port}/render.html?modular');await pg.evaluate('window.__ready')
   largest=0;frames=0
   for look in ['guard','hero','heroSuit','heroCrew','heroWorker','male','suit','worker','woman','formal','hoodie']:
    await pg.evaluate('loadModularLook',look)
    for direction in range(8):
     r=await pg.evaluate('''a=>{renderFrame('Walk',.25,a,0,undefined,false,{sway:0});return poseMetrics()}''',direction*math.pi/4)
     h=r['Head'];feet=[r['LeftFoot'],r['RightFoot']];mid=[sum(f[i]for f in feet)/2 for i in range(3)];ratio=math.hypot(h[0]-mid[0],h[2]-mid[2])/(h[1]-mid[1]);largest=max(largest,ratio)
     assert ratio<.08,(look,direction,'head outside planted stance',ratio)
     assert abs(feet[0][1]-feet[1][1])<3,(look,'uneven feet')
     for side in ['Left','Right']:
      knee=r[side+'Leg'];foot=r[side+'Foot'];hip=r[side+'UpLeg'];assert hip[1]>knee[1]>foot[1],(look,'bent leg reverses')
      assert math.hypot(knee[0]-foot[0],knee[2]-foot[2])<20,(look,'knee not above foot')
     frames+=1
   assert not errors,errors;await b.close();print('PASS balanced standing',json.dumps({'looks':11,'directions':8,'poses':frames,'maxLean':round(largest,4)}),flush=True)
 finally:s.shutdown()
 # Patching idle/talk must leave combat, traversal, paired and walking pixels intact.
 before=json.loads(subprocess.check_output(['git','show','HEAD:build/pr/pr_meta.json'],cwd=ROOT))
 current=json.loads((ROOT/'build/pr/pr_meta.json').read_text());checked=0
 for key in ['key','hero','heroSuit','heroCrew','heroWorker','male','suit','worker','femaleSuit','femaleWorker','big','fBob','fLong','fTail','coat','old','pack','helmet','kid']:
  file='build/pr/'+('key'if key=='key'else'body_'+key)+'.webp';a=Image.open(io.BytesIO(subprocess.check_output(['git','show','HEAD:'+file],cwd=ROOT))).convert('RGBA');z=Image.open(ROOT/file).convert('RGBA');m=current if key=='key'else current['bodies'][key]
  for name,(col,n)in m['anims'].items():
   if name in ['idleC','talk']:continue
   box=(col*64,0,(col+n)*64,512);assert ImageChops.difference(a.crop(box),z.crop(box)).getbbox()is None,(key,name,'unrelated frames changed');checked+=n*8
 print('PASS unchanged walking/combat/traversal frames',checked,flush=True)
asyncio.run(main())
