"""Controlled HUD states and native hit targets; captures are unedited browser images."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/hud-v142';O.mkdir(exist_ok=True)
async def main():
 version=sys.argv[1]if len(sys.argv)>1 else'after';file=O/'before.html'if version=='before'else R/'build/preview_city.html';results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h,touch in [(1280,800,False),(390,844,True),(375,620,True),(844,390,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('requestAnimationFrame=()=>0;requestIdleCallback=()=>0;localStorage.clear();let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await q.goto(file.as_uri()+'?nostats&tone=ink');await q.wait_for_function('!!__game')
   await q.evaluate('''()=>{window.fresh=()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S;S.fade=0;Object.assign(S.player,{x:21.5*48,y:16.5*48,fl:0,z:0});G.setLayer(0);document.body.classList.add('playing');return S;};fresh()}''');await q.wait_for_timeout(300)
   async def shot(scene):
    await q.evaluate('''()=>{const G=__game;G.updateHUD(true);G.moveCamera(1);G.benchDraw(2)}''');await q.wait_for_timeout(120);await q.evaluate('__game.benchDraw(2)');await q.screenshot(path=str(O/f'{version}-{scene}-{w}-{h}.png'))
   await shot('calm')
   layout=await q.evaluate('''()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};return {objective:rect(document.querySelector('#hud .obj')),status:rect(document.querySelector('#hud .status')),mini:rect(document.querySelector('#mini')),stealth:rect(document.querySelector('#stealth')),controls:[...document.querySelectorAll('.pad > button,.sysbtns button,#btnPause')].filter(e=>!e.hidden&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden').map(e=>({id:e.id,...rect(e),radius:getComputedStyle(e).borderRadius,background:getComputedStyle(e).backgroundColor}))}}''')
   if touch:
    for c in layout['controls']:
     assert c['w']>=44 and c['h']>=44,c
     assert c['x']>=0 and c['x']+c['w']<=w+.5 and c['y']>=0 and c['y']+c['h']<=h+.5,c
     m=layout['mini'];assert not(c['x']<m['x']+m['w']and c['x']+c['w']>m['x']and c['y']<m['y']+m['h']and c['y']+c['h']>m['y']),('minimap',c,m)
   if touch:
    assert layout['mini']['w']>=44 and layout['mini']['h']>=44,layout['mini']
    for i,a in enumerate(layout['controls']):
     for z in layout['controls'][i+1:]:
      area=max(0,min(a['x']+a['w'],z['x']+z['w'])-max(a['x'],z['x']))*max(0,min(a['y']+a['h'],z['y']+z['h'])-max(a['y'],z['y']))
      assert area<1,('overlapping controls',a,z)
   # Actual searchable concealment must retain its search warning.
   await q.evaluate('''()=>{const G=__game,S=fresh(),P=S.player,b=S.bushes.find(b=>b.tx===23)||S.bushes[0];S.guards=S.guards.filter(g=>g.target);S.alevel=2;S.alevelT=25;S.expo=0;Object.assign(P,{x:b.x,y:b.y,mode:'sneak',hidden:true,light:0});}''');await shot('search');assert '수색'in await q.locator('#lightLbl').inner_text()
   await q.evaluate('''()=>{const G=__game,S=fresh();S.guards=S.guards.filter(g=>g.target);S.alevel=3;S.alevelT=30;S.expo=2;S.player.hp=1;}''');await shot('danger');assert await q.locator('#expoLbl').inner_text()=='발각'
   # The objective still opens through its real click handler and pauses time.
   await q.locator('#hud .obj').click();assert await q.evaluate('__game.hudInspecting()');await shot('goals');await q.locator('#hud .obj').click();assert not await q.evaluate('__game.hudInspecting()')
   await q.evaluate("()=>{const G=__game,S=fresh();S.player.kunai=0;G.input.tool='kunai';G.input.padWhistle=false;}")
   await shot('empty-tool');assert '도구 바꾸기'in await q.locator('#btnTool').inner_text();assert not await q.locator('#btnTool').evaluate('e=>e.classList.contains("ready")')
   await q.evaluate("()=>{const G=__game,S=fresh();S.guards=[];const l=S.lamps.find(l=>l.mount?.kind==='pole'),at=G.lampControl(l);Object.assign(S.player,{x:at.x,y:at.y,fl:0,z:0});G.updateHUD(true);}")
   await q.locator('#btnCycle').click();assert await q.evaluate('__game.hudInspecting()');await shot('picker');await q.keyboard.press('Escape');assert not await q.evaluate('__game.hudInspecting()')
   assert not errors,errors;results.append({'viewport':[w,h],'touch':touch,'layout':layout,'searchWarning':True,'danger':True,'objectiveInteraction':True,'errors':errors});await q.close()
  await b.close()
 (O/f'{version}-review.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('PASS HUD review',version,len(results),'viewports')
if __name__=='__main__':asyncio.run(main())
