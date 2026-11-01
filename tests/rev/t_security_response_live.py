"""Full AI after two concealed crew casualties: rollcall, pairs, retreat and cooling.

Casualties and player placement underground are fixtures, not a playthrough.
No guard is frozen and no health or identity protection is granted.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile)
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   for seed in [1,116,118]:
    r=await pg.evaluate('''seed=>{
     let rnd=seed;Math.random=()=>{rnd=(Math.imul(rnd,1664525)+1013904223)>>>0;return rnd/4294967296};const G=__game,check=(v,m)=>{if(!v)throw Error(m)};
     G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;const sewer=S.hides.find(h=>h.type==='well');check(sewer,'sewer fixture missing');Object.assign(P,{hide:null,under:true,x:sewer.x,y:sewer.y,fl:0,z:0,hidden:true});
     const victims=S.guards.filter(g=>!g.civ&&!g.target&&!g.dog&&!g.elite&&g.follow==null&&(!g.fac||g.fac==='A')).slice(0,2);victims.forEach(g=>{g.takedownIntent={lethal:true};S.lethalNext=true;G.killGuard(g);S.corpses.at(-1).stashed=true;});
     check(S.corpses.length===2&&S.corpses.every(c=>c.guardId!=null),'ordinary takedown corpse IDs');const vip=S.guards.find(g=>g.tag==='vip');let highAt=null,pairAt=null,homeAt=null,departed=false,cooled=null,maxPairs=0,travel=0;const last=new Map();
     for(let i=0;i<4500;i++){
      G.update(.05);check(!S.over,'response caused involuntary mission failure '+JSON.stringify({t:S.t,hp:P.hp,hide:!!P.hide,at:[P.x,P.y],det:S.stats.detected,title:document.getElementById('endTitle').textContent,known:S.knownLooks}));const level=G.securityLevel();
      if(S.t<54)check(level===0,'unseen bodies caused early response');
      if(level===2){if(highAt===null)highAt=S.t;const pairs=S.guards.filter(g=>g.securityBuddy!=null);maxPairs=Math.max(maxPairs,pairs.length);if(pairs.length&&pairAt===null)pairAt=S.t;
       for(const g of pairs){const prev=last.get(g.id);if(prev&&g.state==='PATROL'&&prev.state==='PATROL')travel+=Math.hypot(g.x-prev.x,g.y-prev.y);last.set(g.id,{x:g.x,y:g.y,state:g.state});}
      }
      const retreat=vip.route.find(w=>w.securityRetreat);if(retreat&&Math.hypot(vip.x-retreat.x,vip.y-retreat.y)<30&&vip.wait>0&&homeAt===null)homeAt=S.t;
      if(homeAt!==null&&!retreat&&Math.hypot(vip.x-26.5*48,vip.y-6.5*48)>80)departed=true;
      if(highAt!==null&&level===0&&cooled===null)cooled=S.t;
     }
     check(highAt>54&&highAt<57&&pairAt!==null&&maxPairs<=2&&travel>100,'live rollcall/patrol response '+JSON.stringify({highAt,pairAt,maxPairs,travel}));
     check(homeAt!==null&&departed,'VIP retreat does not resume routine '+JSON.stringify({homeAt,departed,pos:[vip.x/48,vip.y/48]}));
     check(cooled!==null&&!S.guards.some(g=>g.securityBuddy!=null),'response never cools');
     check(!P.disguiseBlown&&!Object.keys(S.knownLooks||{}).length&&!S.stats.detected,'unseen culprit identified');
     return{seed,rollcall:+highAt.toFixed(1),pairs:maxPairs,patrolTravel:Math.round(travel),vipHome:+homeAt.toFixed(1),routineResumed:departed,cooled:+cooled.toFixed(1),detected:S.stats.detected||0};
    }''',seed)
    print('PASS live response','mobile' if mobile else 'PC',json.dumps(r),flush=True)
   await pg.close()
  await b.close()
asyncio.run(main())
