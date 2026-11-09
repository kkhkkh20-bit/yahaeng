"""Native, unskilled first-contract walkthrough with all campaign AI/cameras alive.
The simulation clock is stepped for reproducibility; no actor, inventory, skill,
health, progress, alert or objective overrides. This is not a human real-time run.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from episode_training import finish_episode_scene
R=Path(__file__).resolve().parents[2];O=R/'build/level-v168';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else'http://127.0.0.1:8001/public/'
LABEL=sys.argv[2]if len(sys.argv)>2 else'local'
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for touch in [False,True]:
   name=LABEL+('-mobile'if touch else'-pc');q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await open_game(q,BASE+'?review=v168&nostats');await q.click('#btnLedger');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{i}"]');await q.click('#btnBrGo')
   await q.evaluate('''()=>{while(__game.DLG.modal)__game.advanceDialog();window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01)if(!__game.S.over)__game.update(.01)};tick(.7)}''');cdp=await q.context.new_cdp_session(q)
   async def tick(s):await q.evaluate('s=>tick(s)',s)
   async def draw():await q.evaluate('__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(1)')
   async def action(key,button,seconds=.02):
    await draw()
    if touch:
     r=await q.locator(button).bounding_box();assert r,(name,button)
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':2}]});await tick(seconds);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await q.keyboard.down(key);await tick(seconds);await q.keyboard.up(key)
   async def move(x,y):
    for target,axis,lo,hi in [(x,'x','ArrowLeft','ArrowRight'),(y,'y','ArrowUp','ArrowDown')]:
     previous=None
     for n in range(240):
      s=await q.evaluate('axis=>({v:__game.S.player[axis],over:__game.S.over,hp:__game.S.player.hp})',axis);d=target-s['v']
      if abs(d)<2.5 or s['over']:break
      if previous is not None and abs(previous-s['v'])<.03:raise AssertionError((name,'blocked',x,y,axis,s))
      previous=s['v']
      if touch:
       dx=(1 if d>0 else-1)if axis=='x'else 0;dy=(1 if d>0 else-1)if axis=='y'else 0
       await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+dx*48,'y':520+dy*48,'id':1}]})
      else:await q.keyboard.down(lo if d<0 else hi)
      await tick(min(.12,abs(d)/100))
      if touch:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:await q.keyboard.up(lo if d<0 else hi)
     else:raise AssertionError((name,'route timeout',target,axis,s))
   await action('Control','#btnCrouch');await move(72,888);await move(232,840);await action('z','#btnAct');await tick(1.4)
   assert await q.evaluate('__game.envAction().k==="dress"'),'clothes are not the default'
   await action('y','#btnDress');await tick(3.2);assert await q.evaluate('__game.S.player.outfit==="crew"&&!__game.S.player.carrying')
   await action('x','#btnCarry');await tick(3.5);await action('Control','#btnCrouch');assert await q.evaluate('__game.S.stats.stashed===1&&__game.S.player.hp===3')
   await draw();await q.screenshot(path=str(O/(name+'-entry.png')))
   for at in [(408,840),(456,792),(504,744),(552,696),(648,696),(648,504)]:await move(*at)
   await tick(20);assert await q.evaluate('__game.S.player.keys.code&&!__game.S.player.kunai&&__game.loadSkillTree().learned.length===0')
   for at in [(648,696),(552,744)]:await move(*at)
   await action('x','#btnCarry');await tick(2.2)
   for at in [(456,744),(408,696),(312,696),(264,600),(180,600),(168,610)]:await move(*at)
   await draw()
   if touch:await q.tap('#btnCycle')
   else:await q.keyboard.press('Shift+Tab')
   await q.locator('[data-env-token^="camCable:"]').click()
   # Observe a full safe camera sweep window before touching its cable.
   for _ in range(100):
    phase=await q.evaluate('__game.S.t%9')
    if 5.1<=phase<=5.3:break
    await tick(.1)
   else:raise AssertionError('camera sweep did not recur')
   await action('x','#btnCarry');await tick(2.2);assert await q.evaluate('__game.S.stats.camUnplugged===2&&!__game.evidencePending()')
   for at in [(264,504),(240,445)]:await move(*at)
   await action('x','#btnCarry')
   for key in ['0','4','1','7']:
    if touch:await q.tap('#keypad [data-k="'+key+'"]')
    else:await q.keyboard.press(key)
   await tick(.6)
   for at in [(264,384),(264,312)]:await move(*at)
   await action('x','#btnCarry');await tick(2.4);assert await q.evaluate('__game.S.items[0].got&&!__game.evidencePending()')
   for at in [(264,504),(216,504)]:await move(*at)
   await action('x','#btnCarry');await tick(1.2);await move(216,600)
   for _ in range(400):
    ready=await q.evaluate('(()=>{const G=__game,P=G.S.player,g=G.S.guards[0];return G.attackAction().k!=="none"&&Math.hypot(g.x-P.x,g.y-P.y)<36})()')
    if ready:break
    await tick(.1)
   else:raise AssertionError('target failed to reach the appointment')
   await action('z','#btnAct',2.2);assert await q.evaluate('__game.S.exitOpen')
   for at in [(264,696),(72,696),(36,816)]:await move(*at)
   await finish_episode_scene(q,touch)
   await q.wait_for_function('document.querySelector("#end").dataset.win==="1"&&!document.querySelector("#end").hidden',timeout=4000,polling=100)
   result=await q.evaluate('''()=>{const G=__game,S=G.S;return{version:__BUILD_VERSION__,seconds:S.t,hp:S.player.hp,stats:S.stats,learned:G.loadSkillTree().learned,cleared:JSON.parse(localStorage.getItem('yahaeng.ch')).m2._clear,rank:document.querySelector('#endRank').innerText}}''');assert result['cleared']and result['hp']>0 and result['learned']==[]and result['stats']['kunaiUsed']==0 and result['stats']['camUnplugged']==2 and not errors,(result,errors)
   await q.screenshot(path=str(O/(name+'-clear.png')));rows.append({'touch':touch,**result,'pageErrors':errors,'method':'Fresh save; real mission selection; native keyboard or CDP joystick/actions; all campaign actors and security active; stepped clock; no actor/health/inventory/skills/progress overrides.'});print('PASS full native contract',name,json.dumps(result,ensure_ascii=False),flush=True);await q.close()
  await b.close()
 (O/(LABEL+'-walk.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
