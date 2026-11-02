"""Unedited browser captures of the actual bush, takedown, gun and loot handlers."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/effects-v146'
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();records=[]
  for before in [True,False]:
   for mobile in [False,True]:
    q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=19;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
    await q.goto(((O/'before-public/index.html')if before else(R/'build/preview_city.html')).as_uri()+'?nostats');await q.wait_for_function('!!__game')
    if not before:await q.wait_for_function('__game.effectAtlas.ready')
    for scene in ['bush','strike','muzzle','loot']:
     info=await q.evaluate('''scene=>{
      const G=__game;G.start(G.STAGES.findIndex(s=>s.id===(scene==='bush'?'tB':'t0')));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.facOn=false;S.fade=0;S.toasts=[];S.floorToastT=0;G.setLayer(0);
      if(scene==='bush'){
       const h=S.bushes[0];S.tutI=6;Object.assign(P,{x:h.x,y:h.y,fl:0,z:0,mode:'sneak',hide:null,hidden:false,trav:null});G.input.sneakToggle=true;G.update(.025);S.t+=.2;
      }else{
       const g=S.guards[0];S.guards=[g];Object.assign(P,{x:g.x-34,y:g.y,fl:0,z:0,mode:'walk',light:1,a:0,hide:null,hidden:false,trav:null});G.input.sneakToggle=false;
       if(scene==='strike'){S.koNext=false;S.lethalNext=true;G.killGuard(g);S.t+=.11;for(const f of S.fx)f.t=.11;}
       if(scene==='muzzle'){
        Object.assign(g,{elite:true,gun:true,radio:false,state:'ALERT',a:0,want:0,meter:1,post:0,still:true,idleT:999,glance:0,glanceT:999,aim:0});P.x=g.x+180;P.hurtT=10;S.alevel=3;G.rememberSuspect(g);G.updateGuard(g,1.05);S.t+=.05;for(const f of S.fx)f.t=.05;
       }
       if(scene==='loot'){G.giveKey('blue');S.t+=.15;}
      }
      S.toasts=[];S.fade=0;S.shakeT=0;G.cam.x=P.x;G.cam.y=P.y-20;G.updateHUD(true);G.benchDraw(1);
      return{scene,hidden:P.hidden,containerHide:!!P.hide,actions:G.envChoices().map(a=>a.label),effects:S.vfx?.map(f=>f.kind)||S.fx.map(f=>f.k)};
     }''',scene)
     await q.wait_for_timeout(300);await q.evaluate('__game.benchDraw(1)');name=f'{"before"if before else"after"}-{scene}-{"touch"if mobile else"pc"}.png';await q.screenshot(path=str(O/name));records.append({'file':name,**info})
    assert not errors,errors;await q.close()
  (O/'screens.json').write_text(json.dumps(records,ensure_ascii=False,indent=2));await b.close();print('PASS 16 actual game before/after captures')
asyncio.run(main())
