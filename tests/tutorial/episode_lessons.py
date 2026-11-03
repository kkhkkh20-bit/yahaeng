"""Native keyboard/touch completion of the episode 02/03 rehearsals, live rules.
Only the test clock and seeded random are controlled; actors, inventory and progression
are never moved or completed by script. Pathfinding supplies walkable waypoints only.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/lessons-v159';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else(R/'build/preview_city.html').as_uri();NAME=sys.argv[2]if len(sys.argv)>2 else'episode-journey'
async def main():
 result=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await q.goto(BASE);await q.wait_for_function('!!__game');await q.evaluate('window.tick=(n=1)=>{for(let i=0;i<n;i++){if(__game.S.over)break;__game.update(1/60);__game.updateDialog(1/60)}}');cdp=await q.context.new_cdp_session(q);trace=[]
   async def record(name):
    await q.evaluate('__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(1)');row=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;return{stage:G.STAGE.id,step:S.tutI,t:S.t,at:[P.x,P.y],fl:P.fl||0,z:P.z||0,hp:P.hp,detected:S.stats.detected,over:S.over,goal:G.nextGoal()?.text,inventory:{dart:P.kunai},budget:G.skillBudget(),electric:G.skillOn('electric')}}''');row['name']=name;trace.append(row);
    if row['over']:await q.wait_for_timeout(650)
    await q.screenshot(path=str(O/f'{NAME}-{"mobile"if mobile else"pc"}-{name}.png'));assert not row['over']or await q.locator('#end').get_attribute('data-win')=='1',row;print('PASS',mobile,name,row,flush=True)
   async def key(key,button):
    await q.evaluate('__game.updateHUD(true)')
    if mobile:await q.tap('#'+button)
    else:await q.keyboard.press(key)
    await q.evaluate('for(let i=0;i<600&&__game.actionBusy();i++)tick();tick(24)')
   async def walk(x,y):
    for axis,target in [('x',x),('y',y)]:
     for i in range(700):
      st=await q.evaluate('a=>({v:__game.S.player[a],over:__game.S.over,step:__game.S.tutI})',axis);d=target-st['v']
      if st['over']or abs(d)<3:break
      v=1 if d>0 else-1;frames=max(1,min(8,int(abs(d)/2)));k=('ArrowRight'if v>0 else'ArrowLeft')if axis=='x'else('ArrowDown'if v>0 else'ArrowUp')
      if mobile:
       await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+(v*28 if axis=='x'else 0),'y':520+(v*28 if axis=='y'else 0),'id':1}]})
      else:await q.keyboard.down(k)
      await q.evaluate('n=>tick(n)',frames)
      if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:await q.keyboard.up(k)
     else:raise AssertionError(('blocked',axis,target,st))
    await q.evaluate('tick(4)')
   async def route(x,y):
    points=await q.evaluate('''([x,y])=>{const G=__game,P=G.S.player;G.setLayer(P.fl||0);const path=G.astar(Math.floor(P.x/48),Math.floor(P.y/48),Math.floor(x/48),Math.floor(y/48));return path.concat([{x,y}])}''',[x,y])
    start_floor=await q.evaluate('__game.S.player.fl||0')
    for pt in points:
     await walk(pt['x'],pt['y'])
     if await q.evaluate('__game.S.player.fl||0')!=start_floor:break
   async def select(sid):
    if not await q.locator('#ledger').is_visible():
     if await q.locator('#intro').is_visible():await q.click('#btnLedger')
     else:await q.click('#btnPause');await q.click('#btnMenu2')
    await q.click('.ledger-tabs [data-filter="training"]');i=await q.evaluate('id=>__game.STAGES.findIndex(s=>s.id===id)',sid);await q.click(f'[data-i="{i}"]');await q.evaluate('tick(90)');assert await q.evaluate('__game.STAGE.id')==sid
   await select('tL');await record('light-observe');assert await q.evaluate('__game.S.tutI===1&&__game.skillOn("electric")')
   before=await q.evaluate('''()=>{const G=__game,x=7.5*48,y=12.5*48,lit=G.lightAt(x,y);return{lit,seen:G.canSee(G.S.guards[0],x,y,lit,false,1,0)}}''');assert before['seen']>0,before
   at=await q.evaluate('''()=>{const G=__game,l=G.S.lamps[3],at=G.lampControl(l);return{x:at.x+(l.mount?.nx||0)*24,y:at.y+(l.mount?.ny||0)*24}}''');await walk(at['x'],at['y']);assert await q.evaluate('__game.envAction().k==="lamp"');await key('x','btnCarry');assert await q.evaluate('__game.S.tutI===2&&__game.S.lamps[3].off');await record('light-off')
   after=await q.evaluate('''()=>{const G=__game,x=7.5*48,y=12.5*48,lit=G.lightAt(x,y);return{lit,seen:G.canSee(G.S.guards[0],x,y,lit,false,1,0)}}''');assert after['lit']<before['lit']and after['seen']==0,(before,after)
   await walk(6.5*48,12.5*48);await walk(7.5*48,12.5*48);assert await q.evaluate('__game.S.tutI===3&&!__game.S.player.hidden');await record('dark-crossing')
   await key('Control','btnCrouch');await walk(6*48,12.5*48);assert await q.evaluate('__game.S.tutI===4');await walk(3.5*48,12.5*48);await walk(3.5*48,14.5*48);await record('light-complete');await q.wait_for_timeout(650);await q.click('#btnNext');assert await q.evaluate('__game.STAGE.id==="m4"&&!__game.skillOn("electric")&&__game.skillBudget()===4');assert await q.locator('#brief').is_visible();await q.click('#btnBrGo');await q.evaluate('while(__game.DLG.modal)__game.advanceDialog();tick(2)');await record('episode02');assert not await q.evaluate('document.body.hasAttribute("data-lesson")')
   await select('tR');await record('indoor-entry');await walk(9.5*48,19.5*48);await walk(9.5*48,13.5*48);assert await q.evaluate('__game.S.tutI===1');await record('inside')
   at=await q.evaluate('__game.S.lessonLayout.up');await route(at['x'],at['y']);assert await q.evaluate('__game.envAction().k==="up"'),await q.evaluate('__game.envAction().k');await key('x','btnCarry');assert await q.evaluate('__game.S.player.fl===1&&__game.S.tutI===2');await record('upstairs')
   at=await q.evaluate('__game.S.items[0]');await route(at['x'],at['y']);assert await q.evaluate('__game.envAction().k==="loot"');await key('x','btnCarry');assert await q.evaluate('__game.S.items[0].got&&__game.S.tutI===3');await record('document')
   at=await q.evaluate('__game.S.lessonLayout.down');await route(at['x'],at['y'])
   if await q.evaluate('__game.S.player.fl||0'):
    assert await q.evaluate('__game.envAction().k==="fdown"');await key('x','btnCarry')
   assert await q.evaluate('!__game.S.player.fl&&__game.S.tutI===4');await record('downstairs')
   await route(9.5*48,15.5*48);await walk(9.5*48,19.5*48);await walk(4.5*48,19.5*48);await record('indoor-complete');await q.wait_for_timeout(650);await q.click('#btnNext');assert await q.evaluate('__game.STAGE.id==="m6"&&!__game.skillOn("electric")&&__game.skillBudget()===4');assert await q.locator('#brief').is_visible();await q.click('#btnBrGo');await q.evaluate('while(__game.DLG.modal)__game.advanceDialog();tick(2)');await record('episode03');assert not await q.evaluate('document.body.hasAttribute("data-lesson")');at=await q.evaluate('__game.S.keyItems.find(k=>k.key==="pin")');await route(at['x'],at['y']);assert await q.evaluate('__game.S.player.picks>0&&__game.S.keyItems.find(k=>k.key==="pin").got&&Number.isFinite(__game.nextGoal().x)&&__game.nextGoal().text.includes("감방 문")');await record('episode03-pin');assert not errors,errors
   result.append({'mobile':mobile,'trace':trace,'lightBefore':before,'lightAfter':after,'errors':errors,'method':'Native menu, keyboard/CDP joystick and action taps; fixed clock and random seed; live simulation; no actor placement, stat/skill/inventory overrides or scripted step completion. A* only plans physical walk waypoints. Does not complete entire main contracts.'});await q.close()
  await b.close()
 (O/f'{NAME}.json').write_text(json.dumps({'base':BASE,'runs':result},ensure_ascii=False,indent=2))
asyncio.run(main())
