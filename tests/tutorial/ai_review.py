"""Unedited browser captures of the same controlled body scene before/after AI changes."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/ai-v140';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();report=[]
  for touch in [False,True]:
   for version,file in [('before','ai-before-v140.html'),('after','preview_city.html')]:
    q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
    await q.goto((R/'build'/file).as_uri()+'?nostats&tone=ink');await q.wait_for_function('!!__game')
    state=await q.evaluate('''()=>{
     const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,base={...S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite)};G.setLayer(0);
     const guard=(id,x,a)=>({...base,id,x,y:504,fl:0,z:0,a,want:a,state:'PATROL',seen:false,meter:0,route:[{x,y:504,pause:999}],ri:0,wait:999,post:a,glance:0,glanceT:999,radio:false,torch:false,path:null,poi:null,chat:null,act:null,follow:null,homeFl:0,securityBuddy:null});
     const examiner=guard(900,1812,0),cover=guard(901,1880,Math.PI),victim=guard(902,1840,0);victim.state='DEAD';victim.unconscious=true;S.guards=[examiner,cover,victim];S.cams=[];S.lamps=[];S.decals=[];S.facOn=false;S.fade=0;S.t=10;
     Object.assign(P,{x:1780,y:552,fl:0,z:0,a:0,outfit:'crew',disguise:'crew',disguiseBlown:false,light:1,hidden:false,mode:'walk',moving:false,under:null,hide:null,vent:null});
     const c={guardId:victim.id,g:victim,ch:'sam',x:1840,y:504,fl:0,z:0,a:0,ko:true,light:1,hidden:false,discovered:false};S.corpses=[c];examiner.state='BODY';examiner.body=c;G.updateGuard(examiner,.02);G.updateGuard(cover,.02);G.moveCamera(1);G.updateHUD(true);G.benchDraw(3);
     return {controlled:true,examiner:examiner.state,checking:!!examiner.bodyWork,cover:cover.state,lookout:!!cover.bodyCoverId,bodyPresent:S.corpses.includes(c),victim:victim.state,globalLooks:S.knownLooks||{}};
    }''')
    await q.wait_for_timeout(150);await q.evaluate('__game.benchDraw(2)');await q.screenshot(path=str(O/f'{version}-{"touch"if touch else"pc"}.png'));assert not errors,errors;report.append({'version':version,'touch':touch,**state});await q.close()
  (O/'visual-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS captures',report);await b.close()
if __name__=='__main__':asyncio.run(main())
