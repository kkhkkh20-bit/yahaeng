"""Compare the 2D campaign, v128 slice, and current slice with identical inputs.
Pass baseline directory containing the previous club-study build as argv[1].
Speed is measured in game time, not presented as a device frame-rate result.
"""
import asyncio,json,threading,sys
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];OUT=R/'build/club-validation';OUT.mkdir(exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.html':'text/html; charset=utf-8'}
MOVE='''()=>{const G=__game,V=window.__clubView,S=G.S,P=S.player,guards=S.guards,results=[];S.guards=[];G.input.walkLock=false;G.input.sneakToggle=false;
const point=()=>{if(!V)return{x:P.x*G.SCALE,y:P.y*G.SCALE};return V.project(V.people.player.driver.root.position.clone().set(P.x/48,0,P.y/48))};
const dt=1/60,tick=n=>{for(let i=0;i<n;i++){S.t+=dt;G.updatePlayer(dt)}};
for(const [name,codes]of [['right',['ArrowRight']],['up',['ArrowUp']],['left',['ArrowLeft']],['down',['ArrowDown']],['up-right',['ArrowUp','ArrowRight']],['down-right',['ArrowDown','ArrowRight']],['up-left',['ArrowUp','ArrowLeft']],['down-left',['ArrowDown','ArrowLeft']]]){
 Object.assign(P,{x:7.5*48,y:(V?18.5:22)*48,fl:0,z:0,a:0,vx:0,vy:0,trav:null,bodyAnim:null,jump:null,hide:null,cover:null,snap:null,interact:null,pick:null,strikeT:0,hurtT:0,captive:null,carrying:null,ledge:null,wire:null,mode:'walk'});S.keys={};G.setLayer(0);G.input.joy=null;
 for(const code of codes)window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));tick(12);const a=point();tick(18);const b=point();for(const code of codes)window.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));
 results.push({direction:name,pxPerSecond:Math.hypot(b.x-a.x,b.y-a.y)/.3,mode:P.mode});
}S.guards=guards;return{version:window.__BUILD_VERSION__,scale:G.SCALE,pspd:G.STAGE.pspd,screen:[innerWidth,innerHeight],results};}'''
async def main():
 root=R.parent;server=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();all_results=[]
 baseline=Path(sys.argv[1]).resolve()if len(sys.argv)>1 else None
 async with async_playwright()as p:
  browser=await p.chromium.launch(args=['--enable-unsafe-swiftshader'])
  for touch in [False,True]:
   modes=[('campaign',R/'build/preview_city.html'),('current',R/'build/club-study/index.html')]
   if baseline:modes.insert(1,('previous',baseline/'index.html'))
   by={}
   for name,path in modes:
    pg=await browser.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('localStorage.clear()'+(';window.requestAnimationFrame=()=>0'if name=='campaign'else''));await pg.goto(f'http://127.0.0.1:{server.server_port}/'+str(path.relative_to(root))+'?nostats&tone=ink')
    if name=='campaign':await pg.wait_for_function('!!window.__game',polling=100);await pg.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m2'));while(__game.DLG.modal)__game.advanceDialog();__game.moveCamera(1)")
    else:await pg.wait_for_function('__clubView?.ready',polling=100,timeout=120000);await pg.evaluate('window.requestAnimationFrame=()=>0');await pg.wait_for_timeout(100)
    result=await pg.evaluate(MOVE);by[name]=result;all_results.append({'touch':touch,'edition':name,**result});assert not errors,errors;await pg.close();print('MEASURE',touch,name,[round(x['pxPerSecond'],1)for x in result['results']],flush=True)
   current=[r['pxPerSecond']for r in by['current']['results']];assert max(current)/min(current)<1.025,current
   if baseline:
    old=by['previous']['results'];new=by['current']['results'];assert all(a['pxPerSecond']>b['pxPerSecond']*1.25 for a,b in zip(new,old)),[new,old]
   # The original campaign stays at its approved speed and keeps all ordinary contracts.
   assert by['campaign']['pspd']==1.3
  await browser.close()
 (OUT/'pace-v129.json').write_text(json.dumps(all_results,ensure_ascii=False,indent=2));server.shutdown();print('PASS eight directions, both viewports, previous-versus-current pace',flush=True)
if __name__=='__main__':asyncio.run(main())
