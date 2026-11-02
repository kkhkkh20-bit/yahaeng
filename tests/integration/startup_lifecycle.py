"""Detect orphaned actor roots during async startup and after scene restarts."""
import asyncio,importlib.util,threading,json
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];sp=importlib.util.spec_from_file_location('m',R/'tests/rev/t_club_study.py');m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
O=R/'build/integration-validation';O.mkdir(exist_ok=True)
COUNT='''()=>{const V=__clubView,owned=new Set([...V.people.actors.values()].map(a=>a.driver.root)),roots=V.scene.children.filter(r=>{let rig=false;r.traverse(o=>{if(o.isSkinnedMesh)rig=true});return rig});return{roots:roots.length,owned:owned.size,orphaned:roots.filter(r=>!owned.has(r)).length,guards:__game.S.guards.length,drawCalls:V.metrics.drawCalls}}'''
async def main():
 s=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(R)));threading.Thread(target=s.serve_forever,daemon=True).start();out=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader'])
  for edition in ['integration-before-v134','episode-one']:
   pg=await b.new_page(viewport={'width':390,'height':844},has_touch=True);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('localStorage.clear()')
   async def slow(route):await asyncio.sleep(.15);await route.continue_()
   await pg.route('**/*.glb',slow);await pg.goto(f'http://127.0.0.1:{s.server_port}/build/{edition}/?nostats');await pg.wait_for_function('__clubView?.ready',polling=100,timeout=120000);await pg.wait_for_timeout(1200);initial=await pg.evaluate(COUNT);print('STARTUP',edition,initial,flush=True)
   if edition=='episode-one':
    assert initial['orphaned']==0 and initial['owned']==initial['guards']+1,initial
    for i in range(2):
     await pg.evaluate('__game.start(__game.STAGES.findIndex(s=>s.episode))');await pg.evaluate('__clubView.readyForScene()');await pg.wait_for_timeout(100);r=await pg.evaluate(COUNT);assert r['orphaned']==0 and r['owned']==r['guards']+1,r;print('PASS restart',i,r,flush=True)
   out.append({'edition':edition,'initial':initial,'errors':errors});assert not errors,errors;await pg.close()
  await b.close()
 (O/'startup.json').write_text(json.dumps(out,indent=2));s.shutdown()
if __name__=='__main__':asyncio.run(main())
