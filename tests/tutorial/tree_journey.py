"""Actual tree purchases and full new equipment lesson, using keyboard and CDP touch."""
import asyncio,json,sys,os
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];BASE=sys.argv[1]if len(sys.argv)>1 else (R/'build/preview_city.html').as_uri();REPORT=sys.argv[2]if len(sys.argv)>2 else 'journey';O=R/'build/skills-v150';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None);results=[]
  for mobile in [False,True]:
   c=await b.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900},has_touch=mobile,is_mobile=mobile);q=await c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(BASE);await q.wait_for_function('!!__game');label=(''if REPORT=='journey'else REPORT+'-')+('touch'if mobile else'pc');cdp=await c.new_cdp_session(q)if mobile else None
   await q.click('#btnLedger');await q.click('#btnSkillsLedger');assert await q.locator('[data-node]').count()==27
   await q.locator('[data-learn="quietStep"]').click()
   if mobile:await q.locator('[data-branch="tools"]:is(button)').click()
   await q.locator('[data-learn="kit"]').click();await q.locator('[data-learn="smoke"]').click();assert '1P' in await q.locator('#skillSummary').text_content()
   await q.evaluate('__game.drawSkillLinks()');await q.screenshot(path=str(O/f'tree-purchase-{label}.png'))
   await q.click('#btnSkillsBack');await q.click('[data-filter="training"]');idx=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="tE")');await q.click('[data-i="'+str(idx)+'"]');await q.wait_for_function('__game.STAGE.id==="tE"');await q.evaluate('''()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();window.__tick=seconds=>{for(let n=0;n<seconds-1e-6;n+=.01)G.update(.01)};window.__render=()=>{const G=__game,S=G.S;S.fade=0;S.shakeT=0;G.cam.x=S.player.x;G.cam.y=S.player.y-20;G.updateHUD(true);G.benchDraw(1)}}''')
   async def tap_tool():
    if mobile:await q.tap('#btnTool')
    else:await q.keyboard.press('f')
   async def select(tool):
    if mobile:
     for _ in range(10):
      if await q.evaluate('(tool)=>__game.input.tool===tool&&!__game.input.padWhistle',tool):break
      await q.tap('#btnToolNext')
     else:raise AssertionError(('Cannot cycle tool',tool))
    else:await q.locator('#tools [data-t="'+tool+'"]').click()
   async def move_to(x,y):
    for target,axis,low,high in [(y,'y','ArrowUp','ArrowDown'),(x,'x','ArrowLeft','ArrowRight')]:
     for _ in range(160):
      if await q.evaluate('__game.S.over'):return
      value=await q.evaluate('(axis)=>__game.S.player[axis]',axis);delta=target-value
      if abs(delta)<3:break
      seconds=min(.18,abs(delta)/68.75)
      if mobile:
       dx=(1 if delta>0 else-1)*55 if axis=='x'else 0;dy=(1 if delta>0 else-1)*55 if axis=='y'else 0
       await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':65,'y':530,'id':8}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':65+dx,'y':530+dy,'id':8}]});await q.evaluate('t=>__tick(t)',seconds);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:
       key=low if delta<0 else high;await q.keyboard.down(key);await q.evaluate('t=>__tick(t)',seconds);await q.keyboard.up(key)
     else:raise AssertionError(('Blocked movement',axis,x,y,await q.evaluate('[__game.S.player.x,__game.S.player.y]')))
   if mobile:await q.tap('#btnCrouch')
   else:await q.keyboard.press('Control')
   await q.evaluate('__tick(.02)');await move_to(272,456)
   await tap_tool()
   await q.evaluate('__tick(1.6)');assert await q.evaluate('__game.S.tutI===1'),await q.evaluate('[__game.S.tutI,__game.S.player.x,__game.S.player.y,__game.S.over]')
   await select('radio');await tap_tool();await q.evaluate('__tick(1.1)');assert await q.evaluate('__game.S.player.hasRadio&&__game.S.tutI===2')
   await tap_tool();await q.evaluate('__tick(.02)');assert await q.evaluate('__game.S.stats.radioDecoys===1&&__game.S.tutI===3')
   await select('smoke');await tap_tool();await q.evaluate('__tick(.7);__render()');assert await q.evaluate('__game.S.smokes.length===1&&__game.S.tutI===4');await q.screenshot(path=str(O/f'smoke-{label}.png'))
   await move_to(1032,648);assert await q.evaluate('__game.S.tutI===5&&!__game.S.over'),await q.evaluate('({step:__game.S.tutI,over:__game.S.over,hp:__game.S.player.hp,guards:__game.S.guards.map(g=>[g.state,g.x,g.y])})')
   await select('hack');await tap_tool();await q.evaluate('__tick(.8);__render()');assert await q.evaluate('!!__game.S.player.techWork');await q.screenshot(path=str(O/f'hack-{label}.png'));await q.evaluate('__tick(.9)');assert await q.evaluate('__game.S.stats.hacks===1&&__game.S.tutI===6')
   await select('blade');before=await q.evaluate('__game.S.player.blades');await tap_tool();assert await q.evaluate('(n)=>__game.S.player.blades===n',before),'Short press fires lethal blade'
   if mobile:
    r=await q.locator('#btnTool').bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}]})
   else:await q.keyboard.down('f')
   await q.wait_for_timeout(1100)
   if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:await q.keyboard.up('f')
   await q.evaluate('__tick(.6);__render()');assert await q.evaluate('__game.S.tutI===7&&__game.S.guards[2].state==="DEAD"&&!__game.S.over'),await q.evaluate('({step:__game.S.tutI,over:__game.S.over,projectiles:__game.S.kunais,blades:__game.S.player.blades})')
   await q.screenshot(path=str(O/f'kunai-{label}.png'));exit=await q.evaluate('({x:__game.S.exit.x,y:__game.S.exit.y})');await move_to(exit['x'],exit['y']);await q.wait_for_timeout(600);assert await q.locator('#endTitle').text_content()=='연습 끝'
   assert await q.evaluate('__game.totalStars()===0&&__game.loadSkillTree().learned.length===3'),'Practice changes permanent progress';assert not errors,errors
   results.append({'base':BASE,'version':await q.evaluate('window.__BUILD_VERSION__'),'mobile':mobile,'lesson':'tE','completed':True,'purchases':['quietStep','kit','smoke'],'remainingPoints':1,'actualTools':['dart KO','radio acquisition','one fake radio instruction','smoke','CCTV hack','held lethal kunai'],'pageErrors':errors});print('PASS',label,flush=True);await c.close()
  (O/(REPORT+'.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2));await b.close()
asyncio.run(main())
