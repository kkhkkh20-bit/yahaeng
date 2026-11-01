"""No root levitation during hand work; complete open/pass/close/walk sequences.
Uses actual storage fixtures, isolated NPCs and real action/update handlers.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   r=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)};let opens=0,closes=0,departures=0,poses=0;const kinds=new Set();
    const fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S;S.guards=[];S.cams=[];S.facOn=false;G.setLayer(0);return S;};
    let S=fresh(),P=S.player;const step=()=>{S.t+=.005;G.updatePlayer(.005);};
    for(const type of ['box','well','locker','wardrobe'])for(const outfit of [null,'crew','staff','waiter']){
     S=fresh();P=S.player;const h=S.hides.find(h=>h.type===type);check(h,'storage fixture '+type);G.setLayer(h.fl||0);const side=G.hidePerimeter(h).find(p=>p.ny===1&&!G.solidFor(h.z||0)(p.tx,p.ty))||G.hidePerimeter(h).find(p=>!G.solidFor(h.z||0)(p.tx,p.ty));check(side,'approach fixture');
     Object.assign(P,{x:side.tx*48+24,y:side.ty*48+24,z:h.z||0,fl:h.fl||0,outfit,disguise:outfit,hide:null,cover:null,a:-Math.PI/2});h.bodies=0;check(G.beginHideFlow('enter',h),'entry start');
     let n=0,openSeen=false;while(P.trav&&n++<2500){const T=P.trav,F=T.hideFlow,s=G.hideHeroSample(P,T),at=T.t-F.walk;
      if(at>.1&&at<(F.handPre||0)-.1){check(Math.hypot(s.x-F.route.stand.x,s.y-F.route.stand.y)<.001,'opening lifts planted root');check(!P.jump&&P.z===F.z,'opening starts jump or changes floor');check(['openBin','openLow','openHigh'].includes(s.anim),'wrong opening pose');openSeen=true;poses++;}
      step();
     }check(n<2500&&openSeen&&P.hide===h,'entry lacks grounded opening');opens++;
     G.leaveHide({x:side.nx,y:side.ny});check(P.trav,'exit start');let closeSeen=false,walkSeen=false;let last=null;n=0;
     while(P.trav&&n++<2500){const T=P.trav,F=T.hideFlow,s=G.hideHeroSample(P,T),at=T.t-F.walk,closeAt=(F.handPre||0)+F.duration;
      if(at>closeAt+.1&&at<closeAt+F.handPost-.1){check(Math.hypot(s.x-F.route.stand.x,s.y-F.route.stand.y)<.001,'closing reaches from distant exit');check(!P.jump,'closing jumps');closeSeen=true;}
      if(F.departure&&at>=closeAt+F.handPost){check(G.hideFlowOpen(T)===0,'lid reopens while walking away');walkSeen=true;}
      if(last)check(Math.hypot(s.x-last.x,s.y-last.y)<2,'rendered actor teleports between phases');last=s;step();
     }check(n<2500&&closeSeen&&walkSeen&&!P.hide,'missing closing/departure');check(!G.solidFor(P.z||0)(Math.floor(P.x/48),Math.floor(P.y/48)),'exit inside obstacle');closes++;departures++;kinds.add(type);
    }
    // A world door swings while the player stays on their feet; collision commits once.
    S=fresh();P=S.player;Object.assign(P,{x:33*48,y:21*48,z:0,fl:0,a:Math.PI});const d={x:P.x+24,y:P.y,tx:33,ty:21,fl:0,locked:true,orig:'.',horiz:true};d.group=[d];S.doors=[d];const start={x:P.x,y:P.y};G.doAct({k:'door',d});
    for(let i=0;i<40;i++)step();check(d.locked&&G.doorVisualOpen(d)>0&&G.doorVisualOpen(d)<1,'door pops instead of swinging');check(P.x===start.x&&P.y===start.y&&!P.jump,'door manipulation moves feet');
    while(P.interact)step();check(!d.locked&&G.doorVisualOpen(d)===1,'door opening does not complete');G.doAct({k:'door',d});for(let i=0;i<40;i++)step();check(!d.locked&&G.doorVisualOpen(d)>0&&G.doorVisualOpen(d)<1,'closing door snaps');while(P.interact)step();check(d.locked&&G.doorVisualOpen(d)===0,'door closing does not complete');
    return{opens,closes,departures,groundedSamples:poses,kinds:[...kinds],doorSwing:true};
   }''')
   assert not errors,errors;print('PASS grounded work','touch'if touch else'PC',json.dumps(r),flush=True);await pg.close()
  await b.close()
asyncio.run(main())
