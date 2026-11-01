"""Cabinet exits use the visible front door, walk forward, close, and finish without an extra pause."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844},has_touch=touch);await pg.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!window.__game')
   r=await pg.evaluate('''()=>{const G=__game,check=(v,m)=>{if(!v)throw Error(m)};let cabinets=0,forward=0;for(const id of ['m1','m2','m3','m4','m5','m6']){G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.cams=[];S.facOn=false;for(const h of S.hides.filter(h=>h.furn&&h.type!=='bed')){G.setLayer(h.fl||0);const p=G.hidePerimeter(h).find(p=>p.ny===1&&!G.solidFor(h.z||0)(p.tx,p.ty));check(p,'blocked physical cabinet door');Object.assign(P,{x:p.tx*48+24,y:p.ty*48+24,fl:h.fl||0,z:h.z||0,hide:null,trav:null,captive:null,carrying:null,strikeT:0,a:-Math.PI/2});h.bodies=0;check(G.beginHideFlow('enter',h),'entry absent');const T=P.trav;check(T.hideFlow.duration+T.hideFlow.handPre<1.2,'entry padded by idle time');while(P.trav){S.t+=.005;G.updatePlayer(.005);}check(P.hide===h,'entry never finishes');
      for(const dir of [{x:0,y:-1},{x:1,y:0}]){P.hide=h;P.x=h.x;P.y=h.y;const exit=G.hideExitPoint(h,dir),foot=G.hideFootprint(h);check(exit&&exit.y>=foot.y1,'cabinet exits through its back or side');G.leaveHide(dir);let n=0;while(P.trav&&n++<1500){const T=P.trav,F=T.hideFlow,f=G.hideFlowProgress(T);if(!G.hideWork(T)&&f>.4&&f<.65){const a=Math.atan2(F.route.stand.y-h.y,F.route.stand.x-h.x);check(Math.cos(P.a-a)>.85,'actor walks backward through the door');forward++;}S.t+=.005;G.updatePlayer(.005);}check(!P.trav&&!P.hide,'exit stuck');check(n<600,'cabinet exit includes a long wait');}cabinets++;
     }}return{cabinets,forwardSamples:forward};}''');print('PASS cabinet',touch,json.dumps(r),flush=True);await pg.close()
  await b.close()
asyncio.run(main())
