"""VIP's authored opportunities, missed windows, exits and legacy saves.

Actor placements isolate observation and navigation rules. Routine checks retain
the full NPC/camera simulation; full input routes are tested separately.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=Path('/tmp/vip-polish-v121')

async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   rules=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();G.setOppMode(1);G.setLayer(0);return G.S;};
    let S=fresh(),P=S.player;check(S.exits.length===2&&new Set(S.exits.map(e=>e.name)).size===2,'two exits not identified');
    for(const e of S.exits){check(Array.from({length:G.MH},(_,y)=>Array.from({length:G.MW},(_,x)=>!G.solidAt(x,y)&&Math.hypot((x+.5)*48-e.x,(y+.5)*48-e.y)<e.r)).flat().some(Boolean),'exit blocked');Object.assign(P,{x:e.x,y:e.y,fl:0,z:0});S.t+=.02;G.updatePlayer(.02);check(!S.over&&!S.exitOpen,'early exit bypasses objectives');}
    // A necessary bend may increase distance to the final destination. It is not a stall.
    S=fresh();P=S.player;P.hide=S.hides.find(h=>h.type==='box');const g=S.guards[0];S.guards=[g];Object.assign(g,{x:14.5*48,y:22.5*48,fl:0,z:0,state:'PATROL',path:[{x:20.5*48,y:22.5*48},{x:20.5*48,y:23.5*48},{x:14.5*48,y:23.5*48}]});
    for(let i=0;i<120;i++){S.t+=.05;G.moveAlong(g,48,.05);}check(g.x>18*48&&g.path.length,'legitimate path repeatedly rerouted backwards');
    // An old save gains the authored exits/posts without granting mission progress.
    S=fresh();P=S.player;const escort=S.guards.find(g=>g.tag==='vipEscort'),staff=S.guards[14],before={x:staff.x,y:staff.y};
    delete S.vipContractVersion;S.exits=[S.exits[0]];escort.escortWait={rect:[39,6,41,7,0],at:[40,9]};staff.route=[{x:6.5*48,y:31.5*48,pause:999}];staff.wait=999;G.saveCheckpoint();check(G.loadCheckpoint(),'legacy save restore');S=G.S;
    check(S.exits.length===2&&Array.isArray(S.guards.find(g=>g.tag==='vipEscort').escortWait),'legacy scenario definitions not refreshed');check(S.guards[14].wait===0&&S.guards[14].x===before.x&&S.guards[14].y===before.y,'saved staff teleport to new post');check(S.items.every(i=>!i.got)&&!S.exitOpen,'migration grants progress');
    S=fresh();P=S.player;Object.assign(P,{x:10.5*48,y:29.5*48,fl:0,z:0});for(let i=0;i<180;i++){S.t+=.1;G.updateIntel(.1);}check(P.keys.emetic,'concise restaurant dialogue loses its clue');
    const pin=G.nextGoal().id;check(!G.nextGoal().story,'discovery imposes a route');
    return{twoExits:true,earlyExitBlocked:true,doglegRecovery:true,legacySave:true,shortDialogue:true,pin};
   }''')
   print('PASS VIP rules','mobile'if mobile else'PC',json.dumps(rules),flush=True)
   for seed in [1,116,118]:
    r=await pg.evaluate('''seed=>{
     let rnd=seed;Math.random=()=>{rnd=(Math.imul(rnd,1664525)+1013904223)>>>0;return rnd/4294967296};
     const G=__game,check=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();G.setOppMode(1);
     const S=G.S,P=S.player,vip=S.guards.find(g=>g.tag==='vip'),escort=S.guards.find(g=>g.tag==='vipEscort'),h=S.hides.find(h=>h.type==='box'),pin=G.nextGoal().id;
     P.hide=h;P.hidden=true;let first=null,left=false,second=false;
     for(let n=0;n<7200;n++){
      G.update(.05);check(!S.over,'waiting fails the contract');
      const smoking=G.guardAnim(vip)==='talk'&&vip.wait>0&&vip.x>26*48&&vip.x<29*48&&vip.y>15*48&&vip.y<17*48;
      if(smoking&&escort.waitingPrivacy&&Math.hypot(escort.x-31.5*48,escort.y-15.5*48)<32){
       check(!(escort.x>=25*48&&escort.x<30*48&&escort.y>=15*48&&escort.y<17*48),'escort follows into smoking accident area');
       if(first===null)first=S.t;else if(left){second=true;break;}
      }
      if(first!==null&&!smoking&&S.t-first>8)left=true;
     }
     check(first!==null&&second,'missed smoking visit never returns '+JSON.stringify({seed,t:S.t,vip:[vip.x/48,vip.y/48,vip.state],escort:[escort.x/48,escort.y/48,escort.waitingPrivacy]}));
     check(S.guards.length>=31&&!S.exitOpen&&S.items.every(i=>!i.got)&&G.nextGoal().id===pin,'waiting removes actors or imposes progress');
     Object.assign(P,{hide:null,x:27.5*48,y:17.5*48,fl:0,z:0});G.updateTargetIntel();G.updateVipPlan(.01);check(S.vipSmokingSeen,'observed smoking routine not recorded');
     G.cam.x=P.x;G.cam.y=P.y-100;G.updateHUD(true);const t=S.t;G.benchDraw(1);S.t=t;
     return{seed,first:+first.toFixed(1),repeat:+S.t.toFixed(1),actors:S.guards.length,escortPost:true,waitAgain:true};
    }''',seed)
    if seed==116:await pg.screenshot(path=str(OUT/(('mobile'if mobile else'pc')+'-smoking.png')))
    print('PASS VIP live routine','mobile'if mobile else'PC',json.dumps(r),flush=True)
   assert not errors,errors;await pg.close()
  await b.close()

OUT.mkdir(exist_ok=True)
asyncio.run(main())
