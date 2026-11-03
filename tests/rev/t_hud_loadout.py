"""Native equipment selection pauses safely and preserves the compact action controls."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/hud-v163';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();results=[]
  for name,w,h,touch in [('mobile',390,844,True),('small',320,568,True),('landscape',844,390,True),('pc',1280,800,False)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch);errs=[];q.on('pageerror',lambda e:errs.append(str(e)))
   await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()')
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game')
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;G.S.guards=[];G.S.player.x=768;G.S.player.y=744;G.update(.02);G.moveCamera(1);G.updateHUD(true);G.benchDraw(1);window.step=n=>{for(let i=0;i<n;i++)G.advanceGameFrame(1/60)}}''')
   async def equipment():
    if touch:await q.click('#btnToolNext')
    else:await q.keyboard.press('i')
   visible=await q.locator('#hud button').evaluate_all('''es=>es.filter(e=>{const r=e.getBoundingClientRect();return !e.hidden&&r.width&&getComputedStyle(e).visibility==='visible'}).map(e=>({id:e.id,x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))''')
   if touch:assert len(visible)==6,visible
   assert all(e['w']>=44 and e['h']>=44 and e['x']>=0 and e['y']>=0 and e['x']+e['w']<=w+.5 and e['y']+e['h']<=h+.5 for e in visible),visible
   assert await q.evaluate("document.documentElement.scrollWidth<=innerWidth")
   await equipment();assert await q.locator('#loadout').is_visible()
   time=await q.evaluate('__game.S.t');pos=await q.evaluate('[__game.S.player.x,__game.S.player.y]')
   await q.keyboard.press('ArrowRight');await q.evaluate('step(90)')
   assert await q.evaluate('__game.S.t')==time
   assert await q.evaluate('[__game.S.player.x,__game.S.player.y]')==pos
   # No tool launches on selection, repeated selection does not cycle to something else.
   before=await q.evaluate('__game.S.player.stones')
   await q.click('#tools [data-t=stone]');assert await q.locator('#loadout').is_hidden()
   assert await q.evaluate('__game.input.tool==="stone"&&!__game.input.padWhistle')
   assert await q.evaluate('__game.S.player.stones')==before
   await equipment();await q.click('#tools [data-t=stone]');assert await q.evaluate('__game.input.tool==="stone"')
   # Whistle is equipped, never emitted by the sheet; the main tool button uses it.
   await equipment();await q.click('#btnWhistle');assert await q.evaluate('__game.input.padWhistle&&!(__game.S.whistleT>0)')
   await q.evaluate('__game.updateHUD(true)');assert await q.locator('#btnTool').get_attribute('data-art')=='whistle'
   if touch:await q.tap('#btnTool')
   else:await q.keyboard.press('f')
   assert await q.evaluate('__game.S.whistleT>0')
   # Selection retains all known tools and the movement toggle. Tab is contained.
   await equipment();await q.keyboard.press('Tab');assert await q.evaluate('!!document.activeElement.closest("#loadout")')
   await q.keyboard.press('Shift+Tab');assert await q.evaluate('!!document.activeElement.closest("#loadout")')
   lock=await q.evaluate('__game.input.walkLock');await q.click('#btnSneak');assert await q.evaluate('__game.input.walkLock')!=lock
   await q.screenshot(path=str(O/f'loadout-{name}.png'))
   await q.keyboard.press('Escape');assert await q.locator('#loadout').is_hidden()
   assert await q.evaluate("document.activeElement.id===(document.body.classList.contains('touch')?'btnToolNext':'game')&&!__game.hudInspecting()")
   await q.evaluate('step(5)');assert await q.evaluate('__game.S.t')>time
   await equipment();await q.evaluate('window.dispatchEvent(new Event("blur"));window.dispatchEvent(new Event("focus"))');assert await q.locator('#loadout').is_hidden()
   # Context-only controls keep their direct actions; no stale button occupies the third slot.
   await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.corpses=[{x:P.x+24,y:P.y,fl:0,z:0,ch:'sam',outfit:'crew',ko:true,carried:false,stashed:false,hidden:false}];S.t+=1;G.updateHUD(true)}''')
   assert (await q.locator('#btnDress').is_visible())==touch;assert await q.locator('#btnGrab').is_hidden()
   # All seven learned tools remain reachable in a short panel, including scroll and keyboard.
   await q.evaluate("()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tE'));while(G.DLG.modal)G.advanceDialog();G.updateHUD(true)}")
   await equipment();assert await q.locator('#tools .tool:visible').count()==7
   await q.locator('#tools [data-t=hack]').scroll_into_view_if_needed();await q.click('#tools [data-t=hack]')
   assert await q.evaluate('__game.input.tool==="hack"&&!__game.input.aiming')
   assert not errs,errs;results.append({'viewport':name,'baselineButtons':len(visible),'pauseAndResume':True,'selectionDoesNotUseTool':True,'keyboardContainment':True,'contextClothing':True,'errors':errs});print('PASS HUD loadout',name,flush=True);await q.close()
  await b.close();(O/'checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
asyncio.run(main())
