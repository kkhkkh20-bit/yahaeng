"""Actual before/after interior light, floor permission and blackout captures."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/balance-v145'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();records=[]
  for before in [True,False]:
   for touch in [False,True]:
    q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(((O/'before-public/index.html') if before else (R/'build/preview_city.html')).as_uri()+'?nostats');await q.wait_for_function('!!__game')
    for sid,bi in [('m2',0),('m5',0)]:
     info=await q.evaluate('''({sid,bi})=>{
      const G=__game;G.start(G.STAGES.findIndex(s=>s.id===sid));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,B=G.BLD[bi];G.setLayer(1);
      const pts=[];for(let y=B.y0+1;y<B.y1;y++)for(let x=B.x0+1;x<B.x1;x++)if(!G.solidAt(x,y))pts.push({x:x*48+24,y:y*48+24});const cx=(B.x0+B.x1+1)*24,cy=(B.y0+B.y1+1)*24;
      const at=pts.sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy))[0];
      Object.assign(P,{...at,fl:1,z:0,outfit:'crew',disguise:'sam',disguiseBlown:false,light:G.lightAt(at.x,at.y,false),mode:'walk'});S.fade=0;S.toasts=[];S.floorToastT=0;G.cam.x=cx;G.cam.y=cy;G.updateHUD(true);G.benchDraw(1);
      return{sid,bi,player:at,light:P.light,zone:G.zoneInfo(P.x,P.y,0,1)};
     }''',{'sid':sid,'bi':bi})
     await q.wait_for_timeout(300);await q.evaluate('__game.benchDraw(1)');prefix=f'{"before" if before else "after"}-{sid}-{"touch" if touch else "pc"}';await q.screenshot(path=str(O/(prefix+'.png')));records.append({'file':prefix+'.png',**info})
     if not before:
      await q.evaluate('''bi=>{const G=__game;for(const l of G.S.lamps)if(!l.outdoor&&G.bldAt(Math.floor(l.x/48),Math.floor(l.y/48))===bi)l.off=true;G.S.player.light=G.lightAt(G.S.player.x,G.S.player.y,false);G.updateHUD(true);G.benchDraw(1)}''',bi);await q.screenshot(path=str(O/(prefix+'-off.png')))
    assert not errors,errors;await q.close()
  (O/'screens.json').write_text(json.dumps(records,ensure_ascii=False,indent=2));await b.close();print('PASS 12 before/after/blackout PC and touch captures')
asyncio.run(main())
