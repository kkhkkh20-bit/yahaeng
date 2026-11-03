"""Original production screenshots of v153/v154, same seed, viewport, scene and owned abilities."""
import asyncio,argparse,subprocess,tarfile,io,json,hashlib,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from functools import partial
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1];O=R/'build/mobile-v154';O.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
async def main(a):
 before=O/'before-package'
 if a.label=='before':
  before.mkdir(exist_ok=True);blob=subprocess.check_output(['git','archive','--format=tar','1e0da33','public/index.html','public/version.json','public/assets'],cwd=R)
  with tarfile.open(fileobj=io.BytesIO(blob))as t:t.extractall(before,filter='data')
 folder=before/'public'if a.label=='before'else R/'public';manifest=json.loads((folder/'version.json').read_text());records=[]
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mode,w,h,touch in [('pc',1440,900,False),('mobile',390,844,True),('landscape',844,390,True),('small',320,568,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await q.goto(f'http://127.0.0.1:{server.server_port}/'+folder.relative_to(R).as_posix()+'/',timeout=120000);await q.wait_for_function('!!__game',timeout=120000);await q.evaluate('document.fonts.ready')
   async def shot(scene):
    await q.evaluate('''()=>{const G=__game;G.S.fade=0;G.S.toasts=[];G.renderToasts();G.updateHUD(true);G.moveCamera(1);G.benchDraw(2)}''');await q.wait_for_timeout(80);await q.evaluate('__game.benchDraw(2)');name=f'{a.label}-{scene}-{mode}.png';await q.screenshot(path=str(O/name));records.append({'image':name,'viewport':[w,h],'version':manifest['version'],'sourcePackageSha256':manifest['source_sha256'],'imageSha256':hashlib.sha256((O/name).read_bytes()).hexdigest(),'pageErrors':list(errors),'fixture':True});print('CAPTURED',name,flush=True)
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tS'));while(G.DLG.modal)G.advanceDialog();Object.assign(G.S.player,{x:440,y:432,mode:'sneak'});G.input.sneakToggle=true;G.update(.02)}''');await shot('attack')
   # Identical attack input held for 0.4 simulated seconds: prior single KO vs new learned-skill preparation.
   if touch:
    cdp=await q.context.new_cdp_session(q);r=await q.locator('#btnAct').bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}]})
   else:await q.keyboard.down('z')
   await q.evaluate('for(let t=0;t<.4;t+=.01)__game.update(.01)');await shot('held')
   if touch:await cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
   else:await q.keyboard.up('z')
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tA'));while(G.DLG.modal)G.advanceDialog();G.S.tutI=1;Object.assign(G.S.player,{x:312,y:408,mode:'sneak'});G.input.sneakToggle=true;G.update(.02)}''');await shot('concealment')
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,h=S.bushes.filter(h=>h.ty>8&&h.ty<27&&!G.solidAt(h.tx,h.ty+1)).sort((a,b)=>Math.hypot(a.tx-21,a.ty-16)-Math.hypot(b.tx-21,b.ty-16))[0];if(!h)throw Error('No existing bush');Object.assign(P,{x:h.x,y:h.y+48,fl:0,z:0,mode:'walk'});G.input.sneakToggle=false;G.setLayer(0);const g=S.guards.find(g=>!g.target&&!g.civ&&!g.dog&&!g.child);Object.assign(g,{x:P.x+20,y:P.y,a:0,fl:0,z:0});S.guards=[g];G.killGuard(g,null,null,true);const c=S.corpses[0];Object.assign(c,{x:P.x+20,y:P.y,hidden:false,hideT:0});S.t+=2;P.strikeT=0;P.killAnim=null;G.update(.01);S.toasts=[];while(G.DLG.modal)G.advanceDialog()}''');await shot('body');assert not errors,errors;await q.close()
  await b.close()
 server.shutdown();(O/f'{a.label}-captures.json').write_text(json.dumps({'method':'Unmodified production packages, seed 42, identical viewport and controlled scene. Temporary training abilities are identical. Body scene uses the same existing mission bush and a controlled downed guard; not a mission playthrough. Held scene applies the same attack input for 0.4 seconds.','captures':records},ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('label',choices=['before','after']);asyncio.run(main(p.parse_args()))
