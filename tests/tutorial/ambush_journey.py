"""Complete the optional ambush lesson with real keyboard and CDP touch input."""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];BASE=sys.argv[1]if len(sys.argv)>1 else (R/'build/preview_city.html').as_uri();REPORT=sys.argv[2]if len(sys.argv)>2 else 'ambush-journey';O=R/'build/skills-v149';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None);results=[]
  for mobile in [False,True]:
   c=await b.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900},has_touch=mobile,is_mobile=mobile);q=await c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(BASE);await q.wait_for_function('!!__game');label=REPORT+('-touch'if mobile else'-pc');cdp=await c.new_cdp_session(q)if mobile else None
   await q.click('#btnLedger');await q.click('[data-filter="training"]');idx=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="tA")');await q.click('[data-i="'+str(idx)+'"]');await q.wait_for_function('__game.STAGE.id==="tA"');await q.evaluate('''()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();window.__tick=t=>{for(let n=0;n<t-1e-6;n+=.01)G.update(.01)};window.__render=()=>{const G=__game;G.S.fade=0;G.cam.x=G.S.player.x;G.cam.y=G.S.player.y-20;G.updateHUD(true);G.benchDraw(1)}}''')
   async def move_to(x,y):
    for target,axis,low,high in [(y,'y','ArrowUp','ArrowDown'),(x,'x','ArrowLeft','ArrowRight')]:
     for _ in range(160):
      if await q.evaluate('__game.S.over'):return
      value=await q.evaluate('(a)=>__game.S.player[a]',axis);delta=target-value
      if abs(delta)<3:break
      seconds=min(.15,abs(delta)/68.75)
      if mobile:
       dx=(1 if delta>0 else-1)*55 if axis=='x'else 0;dy=(1 if delta>0 else-1)*55 if axis=='y'else 0
       await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':65,'y':530,'id':8}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':65+dx,'y':530+dy,'id':8}]});await q.evaluate('t=>__tick(t)',seconds);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:
       key=low if delta<0 else high;await q.keyboard.down(key);await q.evaluate('t=>__tick(t)',seconds);await q.keyboard.up(key)
     else:raise AssertionError(('Blocked movement',x,y,await q.evaluate('[__game.S.player.x,__game.S.player.y,__game.S.tutI,__game.S.over]')))
   async def action(key,button,held=0):
    if mobile:
     r=await q.locator(button).bounding_box();assert r,button
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}]})
     if held:await q.evaluate('t=>__tick(t)',held)
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:
     await q.keyboard.down(key)
     if held:await q.evaluate('t=>__tick(t)',held)
     await q.keyboard.up(key)
   if mobile:await q.tap('#btnCrouch')
   else:await q.keyboard.press('Control')
   await q.evaluate('__tick(.02)');await move_to(312,408);assert await q.evaluate('__game.S.tutI===1&&__game.S.player.hidden'),await q.evaluate('[__game.S.tutI,__game.S.over]')
   await q.evaluate('__render()');await q.screenshot(path=str(O/f'{label}-bush.png'))
   await action('z','#btnAct');await q.evaluate('__tick(1.5)');assert await q.evaluate('__game.S.tutI===2&&__game.S.corpses[0].ko&&__game.S.corpses[0].hidden'),await q.evaluate('({step:__game.S.tutI,attack:__game.attackAction(),over:__game.S.over,corpses:__game.S.corpses.map(c=>({id:c.guardId,ko:c.ko,hidden:c.hidden,x:c.x,y:c.y})),guards:__game.S.guards.map(g=>({id:g.id,state:g.state,x:g.x,y:g.y}))})')
   await move_to(792,408);assert await q.evaluate('__game.S.tutI===3&&__game.S.player.hidden');
   await action('z','#btnAct',1.5);await q.evaluate('__tick(.3)');assert await q.evaluate('__game.S.tutI===4&&__game.S.corpses.some(c=>c.guardId===1&&!c.ko&&c.hidden)'),await q.evaluate('({step:__game.S.tutI,attack:__game.attackAction(),over:__game.S.over,corpses:__game.S.corpses.map(c=>({id:c.guardId,ko:c.ko,hidden:c.hidden,x:c.x,y:c.y})),guards:__game.S.guards.map(g=>({id:g.id,state:g.state,x:g.x,y:g.y}))})')
   await q.evaluate('__render()');await q.screenshot(path=str(O/f'{label}-held-bush.png'))
   exit=await q.evaluate('({x:__game.S.exit.x,y:__game.S.exit.y})');await move_to(exit['x'],exit['y']);await q.wait_for_timeout(600)
   assert await q.locator('#endTitle').text_content()=='연습 끝';assert await q.evaluate('__game.S.over&&__game.S.stats.ko===1&&__game.S.stats.kills===1&&__game.totalStars()===0&&!__game.loadSkillTree().learned.length');assert not errors,errors
   results.append({'base':BASE,'mobile':mobile,'version':await q.evaluate('window.__BUILD_VERSION__'),'completed':True,'input':'Real movement, automatic bush concealment, tap bush KO, second bush entry, held lethal ambush, exit','permanentUnlocks':0,'pageErrors':errors});print('PASS',label,flush=True);await c.close()
  (O/(REPORT+'.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2));await b.close()
asyncio.run(main())
