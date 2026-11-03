"""Real campaign entry: crouch, close KO, physical body storage, next cover. Active AI, no teleport."""
import asyncio,json,sys,os
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/flow-v156';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else 'http://127.0.0.1:8001/public/';NAME=sys.argv[2]if len(sys.argv)>2 else 'entry-journey'
async def main():
 reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await q.goto(BASE,timeout=120000);await q.wait_for_function('!!__game',timeout=120000);await q.click('#btnLedger');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{i}"]');await q.click('#btnBrGo');await q.evaluate('''()=>{while(__game.DLG.modal)__game.advanceDialog();window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01){if(!__game.S.over)__game.update(.01)}};tick(.7)}''');cdp=await q.context.new_cdp_session(q);trace=[]
   async def record(name):
    await q.evaluate('__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(2)');state=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;return{t:S.t,at:[P.x,P.y],hp:P.hp,detected:S.stats.detected,over:S.over,entry:S.actionEntry,hidden:P.hidden,goal:G.nextGoal()?.text,env:G.envAction().k,stats:S.stats,skillBudget:G.skillBudget()}}''');state['step']=name;trace.append(state);await q.screenshot(path=str(O/f'{NAME}-{"mobile"if mobile else"pc"}-{name}.png'));assert not state['over'],state;print('PASS',mobile,name,state,flush=True)
   async def move(x,y):
    for target,axis,lo,hi in [(x,'x','ArrowLeft','ArrowRight'),(y,'y','ArrowUp','ArrowDown')]:
     for _ in range(300):
      s=await q.evaluate('axis=>({v:__game.S.player[axis],over:__game.S.over})',axis);d=target-s['v']
      if abs(d)<2.5:break
      assert not s['over'],s
      if mobile:
       dx=(1 if d>0 else -1)if axis=='x'else 0;dy=(1 if d>0 else -1)if axis=='y'else 0
       await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+dx*28,'y':520+dy*28,'id':1}]})
      else:await q.keyboard.down(lo if d<0 else hi)
      await q.evaluate('s=>tick(s)',min(.12,abs(d)/85))
      if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:await q.keyboard.up(lo if d<0 else hi)
     else:raise AssertionError(('blocked',target,axis,s))
    await q.evaluate('tick(.02)')
   async def press(key,id):
    if mobile:
     r=await q.locator('#'+id).bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':2}]})
    else:await q.keyboard.down(key)
    await q.evaluate('tick(.08)')
    if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await q.keyboard.up(key)
    await q.evaluate('''for(let n=0;n<700&&__game.actionBusy();n++)tick(.01);tick(.03)''')
   if mobile:await q.tap('#btnCrouch')
   else:await q.keyboard.press('Control')
   await move(72,888);await record('cover');assert await q.evaluate('__game.S.player.hidden&&__game.S.actionEntry.phase==="approach"')
   await move(72,840)
   # Track a moving patrol using real movement; no scripted actor placement.
   for _ in range(100):
    at=await q.evaluate('''()=>{const G=__game,g=G.S.guards.find(g=>g.id===G.STAGE.entryRoute.guard),a=G.attackAction();return{x:g.x-Math.cos(g.a)*28,y:g.y-Math.sin(g.a)*28,ready:a.list?.some(v=>v.id===G.STAGE.entryRoute.guard)||a.g?.id===G.STAGE.entryRoute.guard}}''')
    if at['ready']:break
    await move(at['x'],at['y'])
   else:raise AssertionError('Cannot approach entry patrol')
   await record('contact');await press('z','btnAct');await record('down');assert await q.evaluate('__game.S.corpses.some(c=>c.guardId===__game.STAGE.entryRoute.guard&&c.ko)&&__game.S.stats.detected===0')
   # Nearest foliage is within the real stash radius. If the patrol moved, carry back to it.
   if await q.evaluate('__game.envAction().k')!='quickStash':
    await press('x','btnCarry');await move(168,888)
   await press('x','btnCarry');await record('stored');assert await q.evaluate('__game.S.corpses.some(c=>c.guardId===__game.STAGE.entryRoute.guard&&c.hidden)&&__game.S.actionEntry.phase==="done"&&!__game.S.player.carrying')
   await move(168,888);await record('next-cover');assert await q.evaluate('__game.S.player.hidden&&__game.S.player.hp===3&&__game.S.stats.detected===0&&__game.skillBudget()===4&&__game.nextGoal().id==="target:0"');assert not errors,errors
   reports.append({'mobile':mobile,'trace':trace,'errors':errors,'method':'Actual menu, keyboard/CDP joystick and action buttons; fixed simulation clock; live NPCs/cameras, no actor placement or inventory/HP overrides; entry encounter only, not entire contract completion'});await q.close()
  await b.close()
 (O/f'{NAME}.json').write_text(json.dumps({'base':BASE,'runs':reports},ensure_ascii=False,indent=2))
asyncio.run(main())
