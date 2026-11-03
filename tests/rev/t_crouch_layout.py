"""Right-hand circular crouch leaves the moving thumb active, including two touches."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/hud-v165';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();rows=[]
  for w,h in [(390,844),(320,568),(844,390),(568,320)]:
   c=await b.new_context(viewport={'width':w,'height':h},has_touch=True,is_mobile=True);q=await c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();G.S.guards=[];G.S.cams=[];G.S.fade=0;G.update(.02);G.moveCamera(1);G.updateHUD(true);G.benchDraw(1)}''')
   controls=await q.locator('#hud button,#mini').evaluate_all('''es=>es.filter(e=>!e.hidden&&e.getBoundingClientRect().width&&getComputedStyle(e).visibility==='visible').map(e=>{const r=e.getBoundingClientRect();return{id:e.id,x:r.x,y:r.y,w:r.width,h:r.height}})''')
   crouch=next(e for e in controls if e['id']=='btnCrouch');assert crouch['x']>=w/2 and crouch['w']==crouch['h'] and crouch['w']>=44,crouch
   assert all(e['x']>=0 and e['y']>=0 and e['x']+e['w']<=w+.5 and e['y']+e['h']<=h+.5 for e in controls),controls
   for other in controls:
    if other['id']=='btnCrouch':continue
    assert not(crouch['x']<other['x']+other['w'] and crouch['x']+crouch['w']>other['x'] and crouch['y']<other['y']+other['h'] and crouch['y']+crouch['h']>other['y']),(crouch,other)
   shape=await q.locator('#btnCrouch').evaluate('e=>{const s=getComputedStyle(e);return{radius:s.borderRadius,border:s.borderImageSource,background:s.backgroundImage}}');assert shape['radius']=='50%' and shape['border']=='none',shape
   cdp=await c.new_cdp_session(q);y=round(h*.72);start=await q.evaluate('__game.S.player.x')
   await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':48,'y':y,'id':1}]})
   await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':108,'y':y,'id':1}]})
   assert await q.evaluate('__game.input.joy.mag>.5')
   await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':108,'y':y,'id':1},{'x':crouch['x']+crouch['w']/2,'y':crouch['y']+crouch['h']/2,'id':2}]})
   assert await q.evaluate('__game.input.sneakToggle&&__game.input.joy.mag>.5')
   await q.evaluate('()=>{for(let i=0;i<18;i++)__game.advanceGameFrame(1/60);__game.updateHUD(true);__game.benchDraw(1)}');assert await q.evaluate('__game.S.player.x')>start+5
   await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert await q.evaluate('__game.input.joy===null')
   await q.wait_for_timeout(180);assert await q.locator('#btnCrouch').get_attribute('aria-pressed')=='true'
   box=await q.locator('#btnCrouch').bounding_box();assert box=={'x':crouch['x'],'y':crouch['y'],'width':crouch['w'],'height':crouch['h']},box
   await q.screenshot(path=str(O/f'crouch-{w}x{h}.png'))
   await q.locator('#btnCrouch').tap();assert await q.evaluate('!__game.input.sneakToggle');assert not errors,errors
   rows.append({'viewport':[w,h],'crouch':crouch,'circle':True,'joystickWithCrouch':True,'pageErrors':errors});print('PASS right crouch',w,h,flush=True);await c.close()
  await b.close();(O/'checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
