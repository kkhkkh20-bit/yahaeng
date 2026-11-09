"""Cabinet body transfers settle outside furniture after the close and recovery walk."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   r=await q.evaluate('''()=>{const G=__game,check=(v,m)=>{if(!v)throw Error(m)},types=new Set();let transfers=0,recoveries=0,maxStep=0;
    for(const id of ['m1','m2','m4','m5']){
     G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.cams=[];S.facOn=false;
     for(const h of S.hides.filter(h=>h.furn&&h.type!=='bed')){
      G.setLayer(h.fl||0);const front=G.cabinetFrontStand(h);check(front,'blocked working front '+id);const entry=front.entries[0];Object.assign(P,{x:entry.x,y:entry.y,fl:h.fl||0,z:h.z||0,hide:null,trav:null,carrying:null,captive:null,bodyAnim:null,interact:null,cover:null,strikeT:0});h.bodies=0;const c={x:P.x,y:P.y,fl:P.fl,z:P.z,ch:'sam',ko:true,carried:true,stashed:false};S.corpses=[c];P.carrying=c;
      for(const kind of ['stash','retrieve']){
       check(G.beginHideFlow(kind,h,c),'missing '+kind);const T=P.trav,F=T.hideFlow;check(F.departure&&F.departure.length>=18,'missing safe recovery');let n=0,committed=false,walking=false;
       while(P.trav&&n++<1500){const before={x:P.x,y:P.y};S.t+=.005;G.updatePlayer(.005);maxStep=Math.max(maxStep,Math.hypot(P.x-before.x,P.y-before.y));if(F.committed)committed=true;if(T.t>=F.walk+F.handPre+F.duration+F.handPost&&T.t<T.dur){walking=true;check(G.hideFlowOpen(T)===0,'cabinet reopens during recovery');}}
       check(n<1500&&committed&&walking&&!P.trav,'transfer never settles');check(!G.solidFor(P.z||0)(Math.floor(P.x/48),Math.floor(P.y/48)),'recovery ends inside furniture');check(!P.hide&&!P.carrying,'transfer leaves unexpected attached body');
       if(kind==='stash')check(c.stashed&&!c.carried&&c.container===h&&h.bodies===1,'body storage lost');else check(!c.stashed&&!c.carried&&!c.container&&h.bodies===0&&P.bodyAnim?.k==='drop','retrieved body is not grounded by normal drop');transfers++;recoveries++;
       if(P.bodyAnim){for(let i=0;i<150;i++){S.t+=.005;G.updatePlayer(.005);}}
      }types.add(h.type+':'+G.hideFootprint(h).w);
     }
    }check(maxStep<2,'body transfer teleports '+maxStep);return{transfers,recoveries,maxStep,types:[...types]};}''')
   assert not errors,errors
   print('PASS body recovery',touch,json.dumps(r),flush=True);await q.close()
  await b.close()
if __name__=='__main__':asyncio.run(main())
