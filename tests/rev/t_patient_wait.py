"""A controlled hiding entry, then three minutes of full live AI without preparation.

This checks patient play and natural schedules, not a blind human playthrough.
"""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()')
  await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!__game',polling=100)
  r=await pg.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();
   const S=G.S,P=S.player,vip=S.guards.find(g=>g.tag==='vip');G.setOppMode(1);G.setLayer(0);G.nextGoal();const pin=S.goalPin;
   // Place the test actor beside an unobserved real fixture, then use the ordinary hide action.
   let h=null,a=null;
   for(const candidate of S.hides.filter(h=>!h.fl&&['box','locker','wardrobe'].includes(h.type))){
    for(const c of G.hidePerimeter(candidate)){
     if(G.solidAt(c.tx,c.ty))continue;const x=(c.tx+.5)*48,y=(c.ty+.5)*48;
     if(S.guards.some(g=>!g.fl&&Math.hypot(g.x-x,g.y-y)<200))continue;
     Object.assign(P,{x,y,fl:0,z:0});a=G.envChoices().find(a=>a.k==='hide'&&a.h===candidate);if(a){h=candidate;break;}
    }if(a)break;
   }
   check(a,'no unobserved hide fixture');G.selectEnvTarget(G.envToken(a));G.actEnv();
   for(let i=0;i<800&&P.trav;i++){S.t+=.02;G.updatePlayer(.02);}check(P.hide===h&&!P.trav,'normal hiding entry failed '+JSON.stringify({type:h.type,trav:!!P.trav,hidden:!!P.hide,actions:G.envChoices().map(a=>a.k)}));
   const hp=P.hp,seen=new Set(),initial={x:vip.x,y:vip.y};let distance=0,last=initial;
   for(let i=0;i<3600;i++){
    G.update(.05);distance+=Math.hypot(vip.x-last.x,vip.y-last.y);last={x:vip.x,y:vip.y};seen.add(vip.ri);
    check(!S.over&&P.hp===hp&&P.hide===h,'safe waiting forces a failure or loss');
    check(G.nextGoal().id===pin,'waiting changes the required objective');
   }
   check(distance>500&&seen.size>=2,'natural target schedule stops while player waits');
   check(!S.mealDosed&&!Object.values(S.usesDone).some(Boolean)&&!S.rendezvous?.calls,'waiting depends on a prepared opportunity');
   check(!S.exitOpen,'waiting falsely completes the mission');
   return{liveSeconds:180,distance:Math.round(distance),patrolSteps:seen.size,hp:hp,goalStable:true,noPreparation:true};
  }''')
  assert not errors,errors;print('PASS patient wait',json.dumps(r),flush=True);await b.close()
asyncio.run(main())
