"""First assassination via actual controls, with all actors and rules alive.
Two approaches on PC and touch, then the real result button into VIP.
Only the clock and random seed are controlled. No actor, health, inventory,
skill, alert, objective or completion overrides. Not a human timing benchmark.
"""
import asyncio,json,os,sys,threading
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
R=Path(__file__).resolve().parents[2]
O=Path(os.environ.get('YH_OPENING_DIR','/workspace/work/first-assassination-v174/native'));O.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
 base=sys.argv[1]if len(sys.argv)>1 else f'http://127.0.0.1:{server.server_port}/build/preview_city.html'
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium')
  for touch in [False,True]:
   for approach in ['wait','lure']:
    label=('touch'if touch else'pc')+'-'+approach
    q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
    await open_game(q,base+('?nostats&tone=ink'if'?'not in base else'&nostats'))
    await q.click('#btnQuick');assert await q.evaluate('__game.STAGE.id')=='p0'
    assert await q.locator('#brPurpose').is_visible();await q.click('#btnBrGo')
    await q.evaluate('window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01)if(!__game.S.over)__game.update(.01)}')
    cdp=await q.context.new_cdp_session(q)
    async def tick(s):await q.evaluate('s=>tick(s)',s)
    async def draw():await q.evaluate('__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(1)')
    async def snap(name):
     await draw();await q.screenshot(path=str(O/(label+'-'+name+'.png')))
    async def action(key,selector,seconds=.04):
     await draw()
     if touch:
      r=await q.locator(selector).bounding_box();assert r,(label,selector)
      await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':2}]});await tick(seconds);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
     else:
      await q.keyboard.down(key);await tick(seconds);await q.keyboard.up(key)
    async def move(x,y):
     for target,axis,lo,hi in [(x,'x','ArrowLeft','ArrowRight'),(y,'y','ArrowUp','ArrowDown')]:
      previous=None
      for n in range(260):
       s=await q.evaluate('axis=>({v:__game.S.player[axis],over:__game.S.over,hp:__game.S.player.hp})',axis);d=target-s['v']
       if s['over']:
        assert await q.evaluate('__game.S.exitOpen&&__game.S.player.hp>0'),(label,'failed',s)
        break
       if abs(d)<2.8:break
       if previous is not None and abs(previous-s['v'])<.03:raise AssertionError((label,'blocked',x,y,axis,s))
       previous=s['v']
       if touch:
        dx=(1 if d>0 else-1)if axis=='x'else 0;dy=(1 if d>0 else-1)if axis=='y'else 0
        await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+dx*28,'y':520+dy*28,'id':1}]})
       else:await q.keyboard.down(lo if d<0 else hi)
       await tick(min(.10,abs(d)/110))
       if touch:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
       else:await q.keyboard.up(lo if d<0 else hi)
      else:raise AssertionError((label,'route timeout',x,y,s))
    try:
     await tick(.7);await snap('start');await action('Control','#btnCrouch')
     if approach=='lure':
      await move(7.85*48,11.5*48);assert await q.evaluate('__game.S.player.hidden'),'lure needs real concealment'
      await action('g','#btnTool');await tick(.1)
      assert await q.evaluate('__game.S.openingLured&&__game.S.guards[1].why==="heard"'),'actual patrol did not hear whistle'
      await snap('heard');await move(7.85*48,8.5*48)
     else:await move(6.5*48,8.5*48)
     await move(14.5*48-28,8.5*48);await snap('contact')
     assert await q.evaluate('__game.attackAction().k!=="none"'),'no actual rear attack'
     await action('z','#btnAct',1.45);await tick(1.25)
     assert await q.evaluate('__game.targetEliminated(__game.S.guards[0])&&__game.S.exitOpen'),'actual lethal action did not open exit'
     await snap('target-down')
     await move(6.5*48,8.5*48);await move(6.5*48,13.5*48);await move(3.5*48,15.5*48)
     await tick(.4);await q.locator('#end').wait_for(state='visible');await snap('clear')
     data=await q.evaluate('({stage:__game.STAGE.id,hp:__game.S.player.hp,stats:__game.S.stats,time:__game.S.t,approach:__game.S.missionApproach,skills:__game.loadSkillTree().learned,budget:__game.skillBudget(),next:document.querySelector("#btnNext").textContent})')
     assert await q.locator('#end').get_attribute('data-win')=='1';assert data['hp']>0 and not data['skills'] and data['budget']==4,data
     assert data['stats']['extraKills']==0 and data['stats'].get('crewKills',0)==0,data
     assert data['approach']==('소리로 경비 유인'if approach=='lure'else'순찰 틈으로 접근'),data
     await q.click('#btnNext');assert await q.evaluate('__game.STAGE.id')=='m2';assert await q.locator('#brief').is_visible()
     assert not errors,errors;data.update(touch=touch,method='Native keyboard / CDP touch; stepped clock and seed; no gameplay state overrides',errors=errors);rows.append(data);print('PASS',label,json.dumps(data,ensure_ascii=False),flush=True)
    except Exception:
     await snap('failure');print('FAIL STATE',await q.evaluate('({p:{x:__game.S.player.x,y:__game.S.player.y,hp:__game.S.player.hp,hidden:__game.S.player.hidden},guards:__game.S.guards.map(g=>({x:g.x,y:g.y,state:g.state,why:g.why,a:g.a})),goal:__game.nextGoal()?.text,stats:__game.S.stats})'),flush=True);raise
    finally:await q.close()
  await b.close()
 server.shutdown();(O/'checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
