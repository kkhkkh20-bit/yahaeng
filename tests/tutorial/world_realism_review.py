"""Controlled, unedited captures of actual 2D loading areas and spoken introductions."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/world-v144'
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();results=[]
  for before in [True,False]:
   for touch in [False,True]:
    q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');url=O/'before-public/index.html'if before else R/'build/preview_city.html';await q.goto(url.as_uri()+'?nostats');await q.wait_for_function('!!__game')
    for sid,x,y in [('m4',18.5,15.5),('m3',5.5,26.5),('m5',34.5,3.5)]:
     info=await q.evaluate('''({sid,x,y})=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id===sid));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.fade=0;S.floorToastT=0;Object.assign(P,{x:x*48,y:y*48,fl:0,z:0,under:false,hide:null,vent:null,light:1});G.setLayer(0);G.cam.x=P.x;G.cam.y=P.y;S.expo=G.exposure();G.updateHUD(true);G.benchDraw(1);return{stage:sid,access:S.ladders.length,near:G.envChoices().map(a=>a.label)}}''',{'sid':sid,'x':x,'y':y})
     await q.wait_for_timeout(450);await q.evaluate('__game.benchDraw(1)');name=f'{"before"if before else"after"}-{sid}-{"touch"if touch else"pc"}.png';await q.screenshot(path=str(O/name));results.append({'file':name,**info})
    await q.evaluate("()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m6'));G.S.fade=0;G.updateDialog(10);G.benchDraw(1)}");await q.wait_for_timeout(250);await q.screenshot(path=str(O/f'{"before"if before else"after"}-dialogue-{"touch"if touch else"pc"}.png'))
    assert not errors,errors;await q.close()
  (O/'screens.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));await b.close();print('PASS 16 actual-world and dialogue captures')
if __name__=='__main__':asyncio.run(main())
