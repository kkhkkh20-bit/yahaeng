"""Controlled open-ground fixtures: native attack/clothing input, timing and responsive HUD.
Comparison captures use the same actors/coordinates in the previous public package.
These fixtures do not claim a full contract walkthrough.
"""
import asyncio,json,os,sys,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from playwright.async_api import async_playwright
from browser_support import open_game
R=Path(__file__).resolve().parents[2];O=R/'build/clothing-v161';O.mkdir(exist_ok=True)
BASE=os.environ.get('REVIEW_BASE');BEFORE='--before' in sys.argv
LABEL=os.environ.get('REVIEW_LABEL','before'if BEFORE else'after')
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
SETUP='''()=>{window.resetFixtureSeed?.();const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.child&&!g.dog&&!g.elite);
 Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,mode:'walk',hidden:false,cover:null,hide:null,strikeT:0,a:0});G.setLayer(0);
 Object.assign(g,{id:1101,x:P.x+40,y:P.y,fl:0,z:0,a:0,want:0,state:'PATROL',still:true,target:false,civ:false,dog:false,elite:false,child:false,climb:null,doomed:false,seen:false,meter:0,outfit:'crew'});
 S.guards=[g];S.corpses=[];S.props=[];S.items=[];S.notes=[];S.toasts=[];S.fade=0;S.t=10;G.cam.x=P.x;G.cam.y=P.y;
 window.fixture={G,S,P,g,draw:()=>{const t=S.t;G.updateHUD(true);G.benchDraw(1);S.t=t;},tick:n=>{for(let i=0;i<n;i++){S.t+=1/60;G.updatePlayer(1/60);G.updateKoHold();}}};fixture.draw();}'''
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start();rows=[]
 url=BASE or f'http://127.0.0.1:{server.server_port}/'+('build/clothing-v161/before-public/'if BEFORE else'public/')
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if url.startswith('https:')else None)
  for name,w,h,touch in [('pc',1280,800,False),('mobile',390,844,True),('landscape',844,390,True),('small',320,568,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch);errs=[];q.on('pageerror',lambda e:errs.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0;let seed=42;window.resetFixtureSeed=()=>{seed=42};Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await open_game(q,url+'?nostats&tone=ink');await q.evaluate(SETUP);await q.evaluate('fixture.draw()')
   attack=await q.evaluate('__game.attackAction().k');assert (attack=='none')if BEFORE else(attack!='none'),attack
   await q.screenshot(path=str(O/f'{LABEL}-range-{name}.png'))
   # At 40px the new default must accept actual attack input, without buying reach.
   if not BEFORE:
    if touch:await q.tap('#btnAct')
    else:await q.keyboard.press('z')
    await q.evaluate('fixture.tick(100);fixture.draw()')
    assert await q.evaluate('fixture.S.corpses.length===1&&fixture.S.corpses[0].ko&&!fixture.P.lunge&&fixture.S.stats.ko===1'),'native 40px tap must finish one KO'
   # Identical downed-body setup in both versions, without mutating the renderer.
   await q.evaluate(SETUP)
   await q.evaluate('''()=>{const{S,P,G}=fixture;S.guards=[];S.corpses=[{x:P.x+24,y:P.y,fl:0,z:0,ch:'sam',outfit:'crew',ko:true,carried:false,stashed:false,hidden:false,a:0,t0:0}];P.killAnim=null;P.strikeT=0;S.koHold=null;S.t+=1;fixture.draw();}''')
   await q.screenshot(path=str(O/f'{LABEL}-clothing-{name}.png'))
   if not BEFORE:
    assert (await q.locator('#btnDress').is_visible())==touch,'direct clothing is a mobile control'
    assert await q.locator('#btnGrab').is_hidden(),'grab and clothing share one touch slot'
    if touch:
     boxes=await q.evaluate('''()=>{const b=document.querySelector('#btnDress').getBoundingClientRect();return{width:b.width,height:b.height,left:b.left,right:b.right,top:b.top,bottom:b.bottom,overlaps:[...document.querySelectorAll('.pad > button:not([hidden]),#btnSkill:not([hidden]),.sysbtns button,#hud .keys')].filter(e=>e.id!=='btnDress'&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden').filter(e=>{const r=e.getBoundingClientRect();return r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top}).map(e=>e.id)}}''')
     assert boxes['width']>=44 and boxes['height']>=44 and boxes['left']>=0 and boxes['right']<=w and boxes['top']>=0 and boxes['bottom']<=h and not boxes['overlaps'],boxes
    # The dedicated control executes the shared three-second action, not an instant change.
    if touch:await q.tap('#btnDress')
    else:
     await q.keyboard.press('y')
    assert await q.evaluate('!!fixture.P.interact&&!fixture.P.outfit&&!fixture.S.corpses[0].stripped')
    await q.evaluate('fixture.tick(150);fixture.draw()');assert await q.evaluate('!fixture.P.outfit&&!fixture.S.corpses[0].stripped')
    await q.evaluate('fixture.tick(40);fixture.draw()');assert await q.evaluate("fixture.P.outfit==='crew'&&fixture.S.stats.dressed===1&&fixture.S.corpses[0].stripped")
    assert await q.locator('#btnDress').is_hidden(),'used clothing must disappear'
    # Main carry action still works, independently of the clothing shortcut.
    assert await q.evaluate("fixture.G.envChoices().some(a=>a.k==='carry')")
    # An out-of-reach live guard must not bury clothes again; an immediately usable grab keeps priority.
    await q.evaluate(SETUP);await q.evaluate('''()=>{const{S,P,g}=fixture;g.x=P.x+100;S.corpses=[{x:P.x+24,y:P.y,fl:0,z:0,ch:'sam',outfit:'crew',ko:true}];S.t+=1;fixture.draw();}''')
    assert (await q.locator('#btnDress').is_visible())==touch and await q.evaluate("fixture.G.envChoices().some(a=>a.k==='dress')"),'distant guard must not bury clothes'
    await q.evaluate('fixture.g.x=fixture.P.x+40;fixture.S.t+=1;fixture.draw()')
    assert await q.locator('#btnDress').is_hidden() and await q.evaluate("!document.getElementById('btnGrab').hidden&&__game.grabAction().k==='grab'"),'immediate grab keeps its control'
    if touch:assert await q.locator('#btnGrab').is_visible()
    # A stale visible control must not fall back to carrying when the clothes are gone.
    await q.evaluate('fixture.S.guards=[];fixture.S.t+=1;fixture.draw();fixture.S.corpses[0].stripped=true')
    if touch:
     await q.tap('#btnDress');assert await q.evaluate('!fixture.P.interact&&!fixture.P.carrying&&!fixture.P.outfit'),'stale clothing button must be a no-op'
    else:assert await q.locator('#btnDress').is_hidden()
   assert not errs,errs;rows.append({'viewport':name,'attackAt40px':attack,'pageErrors':errs,'clothingTiming':None if BEFORE else'unchanged at 2.5 seconds; changed once after 3 seconds','fixtures':'controlled open ground and downed body; native input'});print('PASS',LABEL,name,flush=True);await q.close()
  await b.close()
 (O/f'{LABEL}-checks.json').write_text(json.dumps({'base':url,'rows':rows},ensure_ascii=False,indent=2));server.shutdown()
asyncio.run(main())
