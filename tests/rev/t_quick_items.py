"""Real touch: one use per gesture, directional aim, cancellation and inventory ownership."""
import asyncio,json,math
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/field-hud-v211/quick-items';O.mkdir(parents=True,exist_ok=True)
SETUP='''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tE'),false);while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.cams=[];S.fade=0;Object.assign(P,{x:768,y:744,stones:2,coins:2,smokes:2,hasRadio:false,radioCharges:2});G.input.tool='kunai';G.input.padWhistle=true;G.moveCamera(1);G.updateHUD(true);G.benchDraw(1)}'''
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for name,w,h in [('portrait',390,844),('small',320,568),('short',320,480),('landscape',844,390),('compact',568,320)]:
   c=await b.new_context(viewport={'width':w,'height':h},has_touch=True,is_mobile=True);q=await c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.evaluate(SETUP)
   assert await q.locator('#quickRadio').is_hidden(),'Uncollected radio must not be an item'
   await q.tap('#quickStone',force=True);assert await q.evaluate('__game.S.player.stones===1&&__game.S.stones.length===1&&__game.input.tool==="kunai"&&__game.input.padWhistle&&!__game.input.aiming')
   await q.tap('#quickStone',force=True);await q.tap('#quickStone',force=True);assert await q.evaluate('__game.S.player.stones===0&&__game.S.stones.length===2'),'one use per tap / no negative stock'
   assert await q.locator('#quickStone output').inner_text()=='0' and await q.locator('#quickStone').get_attribute('aria-disabled')=='true'
   # A held gesture aims without spending. Returning to its origin cancels, as does OS cancellation.
   await q.evaluate('__game.S.player.stones=3;__game.updateHUD(true)')
   box=await q.locator('#quickStone').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;cdp=await c.new_cdp_session(q)
   async def touch(kind,points):await cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'x':a,'y':bb,'id':i}for a,bb,i in points]})
   await touch('touchStart',[(x,y,1)]);assert await q.evaluate('__game.input.aiming.src==="quick:stone"&&__game.S.player.stones===3')
   await touch('touchMove',[(x+75,y-75,1)]);assert abs(await q.evaluate('__game.S.player.a')+math.pi/4)<.02
   await touch('touchMove',[(x,y,1)]);await touch('touchEnd',[]);assert await q.evaluate('__game.S.player.stones===3&&!__game.input.aiming&&__game.input.padWhistle')
   await touch('touchStart',[(x,y,1)]);await touch('touchMove',[(x+80,y-40,1)]);await touch('touchCancel',[]);assert await q.evaluate('__game.S.player.stones===3&&!__game.input.aiming&&__game.input.tool==="kunai"')
   # Directional release launches exactly once. A second pointer cannot steal or duplicate it.
   await touch('touchStart',[(x,y,1)]);await touch('touchMove',[(x+80,y-80,1)])
   cb=await q.locator('#quickCoin').bounding_box();await touch('touchStart',[(x+80,y-80,1),(cb['x']+22,cb['y']+22,2)])
   await touch('touchEnd',[]);assert await q.evaluate('__game.S.player.stones===2&&__game.S.player.coins===2&&__game.input.padWhistle&&!__game.input.aiming')
   shot=await q.evaluate('__game.S.stones.at(-1)');assert shot['x1']>shot['x0'] and shot['y1']<shot['y0'],shot
   # Pause/blur cancels borrowed tools immediately and restores the equipped control.
   await touch('touchStart',[(x,y,1)]);await q.keyboard.press('Escape');await touch('touchEnd',[]);assert await q.evaluate('__game.S.player.stones===2&&__game.input.tool==="kunai"&&__game.input.padWhistle&&!__game.input.aiming')
   await touch('touchStart',[(x,y,1)]);await q.evaluate('window.dispatchEvent(new Event("blur"));window.dispatchEvent(new Event("focus"))');await touch('touchEnd',[]);assert await q.evaluate('__game.S.player.stones===2&&__game.input.tool==="kunai"&&!__game.input.aiming')
   # Smoke uses the actual skill/physics route; blocked states spend nothing.
   await q.tap('#quickSmoke',force=True);assert await q.evaluate('__game.S.player.smokes===1&&__game.S.smokeThrows.length===1&&__game.input.padWhistle')
   await q.evaluate('__game.S.player.under=true;__game.updateHUD(true)');await q.tap('#quickSmoke',force=True);assert await q.evaluate('__game.S.player.smokes===1');await q.evaluate('__game.S.player.under=false;__game.S.player.hasRadio=true;__game.updateHUD(true)')
   assert await q.locator('#quickRadio').is_visible()
   # All four loaded slots and action buttons remain separate, including short landscape.
   controls=await q.locator('#hud button,#mini').evaluate_all('''es=>es.filter(e=>!e.hidden&&e.getBoundingClientRect().width&&getComputedStyle(e).visibility==='visible').map(e=>{const r=e.getBoundingClientRect();return{id:e.id,x:r.x,y:r.y,w:r.width,h:r.height,round:getComputedStyle(e).borderRadius.includes('50%')}})''')
   for a in controls:assert a['w']>=44 and a['h']>=44 and a['x']>=0 and a['y']>=0 and a['x']+a['w']<=w+.5 and a['y']+a['h']<=h+.5,(name,a)
   for i,a in enumerate(controls):
    for bb in controls[i+1:]:
     if a['round'] and bb['round']:
      assert math.hypot(a['x']+a['w']/2-bb['x']-bb['w']/2,a['y']+a['h']/2-bb['y']-bb['h']/2)>=(a['w']+bb['w'])/2+6,(name,a,bb)
     elif a['round'] or bb['round']:
      circle,rect=(a,bb) if a['round'] else (bb,a);cx=circle['x']+circle['w']/2;cy=circle['y']+circle['h']/2
      dx=cx-max(rect['x'],min(cx,rect['x']+rect['w']));dy=cy-max(rect['y'],min(cy,rect['y']+rect['h']))
      assert math.hypot(dx,dy)>=circle['w']/2+6,(name,a,bb)
     else:assert not(a['x']<bb['x']+bb['w']+6 and a['x']+a['w']+6>bb['x'] and a['y']<bb['y']+bb['h']+6 and a['y']+a['h']+6>bb['y']),(name,a,bb)
   await q.screenshot(path=str(O/f'{name}-loaded.png'));assert not errors,errors
   rows.append({'device':name,'nativeTouch':True,'singleUse':True,'dragAimAndCancel':True,'equipmentRestored':True,'unownedRadioHidden':True,'loadedGeometry':controls,'errors':errors});print('PASS quick items',name,flush=True);await c.close()
  q=await b.new_page(viewport={'width':1280,'height':800});await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.evaluate(SETUP);assert await q.locator('#quickItems').is_hidden();await b.close()
 (O/'checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
