"""HUD at four viewport sizes and controlled danger/tool/mission states."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/hud-v139';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();report=[]
  for w,h,touch in [(1280,800,False),(390,844,True),(375,620,True),(844,390,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await q.wait_for_function('!!__game');await q.evaluate('''()=>{window.fresh=()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S;S.fade=0;Object.assign(S.player,{x:21.5*48,y:16.5*48,fl:0,z:0});G.setLayer(0);G.update(.01);return S;};fresh();}''')
   async def shot(name):
    await q.evaluate('()=>{const G=__game;G.updateHUD(true);G.moveCamera(1);G.benchDraw(3)}');await q.wait_for_timeout(100);await q.evaluate('__game.benchDraw(2)');await q.screenshot(path=str(O/f'{name}-{w}-{h}.png'))
   await shot('after')
   controls=await q.evaluate('''()=>{const mini=document.querySelector('#mini').getBoundingClientRect();return [...document.querySelectorAll('.pad > button,.sysbtns button,#btnPause')].map(e=>{const r=e.getBoundingClientRect();return{id:e.id,w:r.width,h:r.height,visible:!e.hidden&&r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden',miniOverlap:r.left<mini.right&&r.right>mini.left&&r.top<mini.bottom&&r.bottom>mini.top}})}''')
   if touch:
    for c in controls:
     if c['visible']:assert c['w']>=44 and c['h']>=44,c
     if c['visible']:assert not c['miniOverlap'],c

   normal=await q.evaluate('''()=>{const r=document.querySelector('#hud .top').getBoundingClientRect(),o=document.querySelector('#hud .obj'),a=document.querySelector('#alertBox');return{topHeight:r.height,objectiveWidth:o.clientWidth,calmAlertHidden:getComputedStyle(a).display==='none',title:document.querySelector('#objTitle').textContent}}''');assert normal['calmAlertHidden'];assert '0/2'in normal['title'],normal
   await q.evaluate('''()=>{const G=__game,S=fresh(),P=S.player,b=S.bushes.find(b=>b.tx===23)||S.bushes[0];S.guards=S.guards.filter(g=>g.target);S.alevel=2;S.alevelT=25;S.expo=0;Object.assign(P,{x:b.x,y:b.y,mode:'sneak',hidden:true,light:0});}''');await shot('search-hidden');assert '수색'in await q.locator('#lightLbl').inner_text();assert not await q.locator('#stealth').evaluate('e=>e.classList.contains("quiet")')
   if touch:
    assert await q.evaluate('(()=>{const a=document.querySelector("#stealth").getBoundingClientRect(),b=document.querySelector("#mini").getBoundingClientRect();return a.left>=8&&a.right<=innerWidth-8&&!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)})()'),'search warning overlaps minimap or viewport'
   await q.evaluate('''()=>{const G=__game,S=fresh(),P=S.player,h=S.hides.find(h=>h.type==='box'&&h.tx===22&&h.ty===17);S.guards=S.guards.filter(g=>g.target);h.spotted=true;P.hide=h;P.x=h.x;P.y=h.y;S.expo=0;S.alevel=2;S.alevelT=25;}''');await shot('hide-exposed');assert await q.locator('#expoLbl').inner_text()=='은신처 노출'
   await q.evaluate('''()=>{const G=__game,S=fresh();S.player.kunai=0;G.input.tool='kunai';G.input.padWhistle=false;}''');await shot('empty-tool');assert '도구 바꾸기'in await q.locator('#btnTool').inner_text();assert not await q.locator('#btnTool').evaluate('e=>e.classList.contains("ready")');await q.evaluate('__game.startAim("key")');assert not await q.evaluate('!!__game.input.aiming')
   await q.evaluate('''()=>{const G=__game,S=fresh();S.items.forEach(i=>i.got=true);S.guards.filter(g=>g.target).forEach(g=>{g.state='DEAD';g.unconscious=false;});S.player.hasKey=true;G.checkObjective();G.updateHUD(true);}''');await q.locator('#hud .obj').click();await shot('completed-goals');assert await q.locator('#objective .done:visible').count()>=2
   assert not errors,errors;report.append({'viewport':[w,h],'touch':touch,**normal,'searchWarning':True,'exposedHide':True,'emptyTool':True,'completedChecklist':True,'controls':controls,'errors':errors});await q.close()
  (O/'hud-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS HUD states',report,flush=True);await b.close()
if __name__=='__main__':asyncio.run(main())
