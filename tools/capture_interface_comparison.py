"""Unmodified production renders, identical viewport, seed, fresh progress and mission scene."""
import asyncio,argparse,subprocess,tarfile,io,json,hashlib,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from functools import partial
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
async def main(a):
 out=R/'build/hud-v153';out.mkdir(exist_ok=True);before=out/'before-package'
 if a.label=='before':
  before.mkdir(exist_ok=True);blob=subprocess.check_output(['git','archive','--format=tar',a.before_revision,'public/index.html','public/version.json','public/assets'],cwd=R)
  with tarfile.open(fileobj=io.BytesIO(blob))as t:t.extractall(before,filter='data')
 folder=before/'public'if a.label=='before'else R/'public';package=json.loads((folder/'version.json').read_text());records=[]
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mode,w,h,touch in [('pc',1440,900,False),('mobile',390,844,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await q.goto(f'http://127.0.0.1:{server.server_port}/'+folder.relative_to(R).as_posix()+'/',timeout=120000);await q.wait_for_function('!!window.__game',timeout=120000);await q.evaluate('document.fonts.ready')
   async def shot(scene):
    name=f'{a.label}-{scene}-{mode}.png';await q.screenshot(path=str(out/name));records.append({'image':name,'viewport':[w,h],'version':package['version'],'sourcePackageSha256':package['source_sha256'],'imageSha256':hashlib.sha256((out/name).read_bytes()).hexdigest(),'pageErrors':list(errors),'controlledResultFixture':scene=='result'});print('CAPTURED',name,flush=True)
   await shot('title');await q.click('#btnLedger');await shot('ledger');await q.click('#btnSkillsLedger');await shot('skills');await q.click('[data-branch="assassin"]');await q.click('[data-select="reach"]');await shot('skill-detail')
   if touch:await q.click('.skill-detail-close')
   await q.click('#btnSkillsBack');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{i}"]');await shot('brief');await q.click('#btnBrGo');await q.evaluate('__game.S.fade=0;__game.updateDialog(3);__game.moveCamera(1);__game.benchDraw(2)');await shot('dialogue');await q.evaluate('''()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();const S=G.S;S.fade=0;Object.assign(S.player,{x:21.5*48,y:16.5*48,fl:0,z:0});G.setLayer(0);G.update(.01);G.updateHUD(true);G.moveCamera(1);G.benchDraw(3);}''');await q.wait_for_timeout(80);await q.evaluate('__game.benchDraw(2)');await shot('hud');await q.click('#btnPause');await shot('pause');await q.click('#btnSet2');await shot('settings');await q.click('#btnHelpBack');await q.click('#btnResume');await q.evaluate('__game.showEnd(true)');await shot('result');assert not errors,errors;await q.close()
  await b.close()
 server.shutdown();(out/f'{a.label}-captures.json').write_text(json.dumps({'method':'Actual production packages; identical viewport, seed, starting 4P and controlled real mission position; original screenshots, no image modifications','captures':records},ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('label',choices=['before','after']);p.add_argument('--before-revision',default='e31a4ab');asyncio.run(main(p.parse_args()))
