"""Same-position PC/portrait captures for view/cutaway review, with isolated poses."""
import asyncio,importlib.util,threading,json,sys
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];spec=importlib.util.spec_from_file_location('common',str(R/'tests/rev/t_club_study.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
EDITION=sys.argv[1]if len(sys.argv)>1 else'episode-one';LABEL=sys.argv[2]if len(sys.argv)>2 else'after';O=R/'build/camera-validation';O.mkdir(exist_ok=True)
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader'])
  for mobile in [True,False]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('localStorage.clear();let seed=128;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await pg.goto(f'http://127.0.0.1:{server.server_port}/build/{EDITION}/?nostats');await pg.wait_for_function('__clubView?.ready||window.__clubError',polling=100,timeout=120000);assert not await pg.evaluate('window.__clubError');await pg.evaluate('window.requestAnimationFrame=()=>0');await pg.wait_for_timeout(100);await pg.add_style_tag(content='*{animation:none!important;transition:none!important}')
   if await pg.locator('#brief').is_visible():await pg.click('#btnBrGo')
   for name,x,y,fl in [('start',5.5,18.5,0),('west',7.5,10.5,0),('bin',6.5,8.5,0),('north',13.5,3.5,0),('inside',13.5,12.5,0),('upper',14.5,8.5,1)]:
    info=await pg.evaluate('''({x,y,fl})=>{const G=__game,V=__clubView,P=G.S.player;Object.assign(P,{x:x*48,y:y*48,fl,z:0,a:-Math.PI/2,outfit:null,hide:null,trav:null,under:false,vent:false});G.setLayer(fl);G.update(.001);G.moveCamera(1);for(let i=0;i<24;i++){G.S.t+=.1;V.world.update();}G.S.fade=0;G.S.t=Math.max(0,G.S.t)+3;const draw=V.renderer.render;V.renderer.render=()=>{};G.benchDraw(40);V.renderer.render=draw;G.benchDraw(1);G.updateHUD();const s=V.actorScreen(P);return{player:[s.x,s.y],occlusion:V.occlusion,framing:V.framing,metrics:V.metrics};}''',{'x':x,'y':y,'fl':fl});await pg.screenshot(path=str(O/f'{LABEL}-{"mobile"if mobile else"pc"}-{name}.png'),timeout=90000);results.append({'mobile':mobile,'scene':name,**info});print('CAPTURE',LABEL,mobile,name,info,flush=True)
    if LABEL=='before'and mobile and name=='west':
     await pg.evaluate('__game.STAGE.artSlice=false;__game.moveCamera(1);__game.benchDraw(1)');await pg.screenshot(path=str(O/'original-mobile-west.png'),timeout=90000);await pg.evaluate('__game.STAGE.artSlice=true')
   assert not errors,errors;await pg.close()
  await b.close()
 (O/(LABEL+'.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2));server.shutdown()
if __name__=='__main__':asyncio.run(main())
