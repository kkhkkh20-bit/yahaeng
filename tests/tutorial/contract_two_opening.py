"""Native, unskilled first-contract walkthrough with all campaign AI/cameras alive.
The simulation clock is stepped for reproducibility; no actor, inventory, skill,
health, progress, alert or objective overrides. This is not a human real-time run.
"""
import asyncio,json,os,sys
from pathlib import Path
from episode_training import select_skill_node
from playwright.async_api import async_playwright
from browser_support import open_game
R=Path(__file__).resolve().parents[2];O=R/'build/review-v171';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else'http://127.0.0.1:8001/public/'
LABEL=sys.argv[2]if len(sys.argv)>2 else'local'
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for touch in [False,True]:
   name=LABEL+('-mobile'if touch else'-pc');q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await open_game(q,BASE+'?review=v171&nostats');await q.click('#btnLedger');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m4")');await q.click(f'[data-i="{i}"]');await q.click('#btnBrGo')
   await q.evaluate('''()=>{while(__game.DLG.modal)__game.advanceDialog();window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01)if(!__game.S.over)__game.advanceGameFrame(.01)};tick(.7)}''');cdp=await q.context.new_cdp_session(q)
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
   for x,y in [(1080,792),(1080,744),(888,744),(888,792)]:await move(x,y)
   await q.keyboard.press('k')
   for skill in ['kit','dart']:
    await select_skill_node(q,skill);await q.click('[data-learn="'+skill+'"]')
    if touch:await q.click('.skill-detail-close')
   await q.click('#btnSkillsBack')
   if touch:
    await q.tap('#btnToolNext');await q.tap('#tools [data-t="kunai"]')
   else:await q.keyboard.press('1')
   await draw()
   point=await q.evaluate('()=>{const G=__game,g=G.S.guards[0];return{x:(g.x-G.cam.x)*G.SCALE+innerWidth/2,y:(g.y-14-G.cam.y)*G.SCALE+innerHeight/2,d:Math.hypot(g.x-G.S.player.x,g.y-G.S.player.y)}}');assert point['d']<250,point
   if touch:await q.touchscreen.tap(point['x'],point['y'])
   else:await q.mouse.click(point['x'],point['y'])
   assert await q.evaluate('__game.S.marked===__game.S.guards[0]&&__game.kunaiTarget()?.ref===__game.S.guards[0]')
   await draw();await q.screenshot(path=str(O/(name+'-designated.png')))
   if touch:await action('v','#btnTool')
   else:
    await q.keyboard.down('v');await q.wait_for_timeout(1100);await q.keyboard.up('v')
   await tick(.5);await draw()
   result=await q.evaluate('()=>({version:__BUILD_VERSION__,seconds:__game.S.t,hp:__game.S.player.hp,goal:(()=>{const a=__game.nextGoal();return{text:a.text,where:a.where,unconscious:a.unconscious}})(),stats:__game.S.stats,target:{state:__game.S.guards[0].state,ko:__game.S.guards[0].unconscious},learned:__game.loadSkillTree().learned})')
   assert result['target']['state']=='DEAD'and result['stats']['extraKills']==0 and result['hp']>0 and not errors,result
   if touch:assert result['goal']['unconscious']and'공격 길게'in result['goal']['where']
   else:assert result['stats']['kills']==1 and('현금'in result['goal']['text']or'빨간 카드키'in result['goal']['text']),result
   await q.screenshot(path=str(O/(name+'-result.png')));rows.append({'touch':touch,**result,'method':'Fresh profile, native keyboard or CDP joystick/actions/marking; stepped main clock; no actor/state overrides.'});print('PASS second contract opening',name,json.dumps({k:result[k]for k in ['version','seconds','hp','stats','target']},ensure_ascii=False),flush=True);await q.close()
  await b.close()
 (O/(LABEL+'-m4-opening.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
