"""Actual ledger, movement, crouch, KO/kill, one-press body storage and exit; active AI."""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/mobile-v154';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else (R/'build/preview_city.html').as_uri();NAME=sys.argv[2]if len(sys.argv)>2 else 'local-journey'
async def main():
 results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await q.goto(BASE,timeout=120000);await q.wait_for_function('!!__game',timeout=120000);await q.click('#btnLedger');await q.click('[data-filter="training"]');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="tA")');await q.click(f'[data-i="{i}"]');await q.evaluate('''()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01)G.update(.01)}}''');cdp=await q.context.new_cdp_session(q);trace=[]
   async def check(step):
    state=await q.evaluate('({step:__game.S.tutI,over:__game.S.over,at:[__game.S.player.x,__game.S.player.y],hidden:__game.S.player.hidden,kills:__game.S.stats.kills,ko:__game.S.stats.ko,stashed:__game.S.stats.stashed,default:__game.envAction().k})');assert state['step']==step and not state['over'],state;trace.append(state);print('PASS',mobile,state,flush=True)
   async def move(x,y):
    for target,axis,lo,hi in [(y,'y','ArrowUp','ArrowDown'),(x,'x','ArrowLeft','ArrowRight')]:
     for _ in range(300):
      state=await q.evaluate('(axis)=>({v:__game.S.player[axis],over:__game.S.over})',axis);delta=target-state['v']
      if abs(delta)<3 or state['over']:break
      if mobile:
       vx=(1 if delta>0 else -1)if axis=='x'else 0;vy=(1 if delta>0 else -1)if axis=='y'else 0
       await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':65,'y':520,'id':2}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':65+vx*28,'y':520+vy*28,'id':2}]})
      else:await q.keyboard.down(lo if delta<0 else hi)
      await q.evaluate('s=>tick(s)',min(.15,abs(delta)/90))
      if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:await q.keyboard.up(lo if delta<0 else hi)
     else:raise AssertionError(('blocked',x,y,state))
    await q.evaluate('tick(.05)')
   async def action(key,button,held=False):
    if mobile:
     r=await q.locator('#'+button).bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':3}]})
    else:await q.keyboard.down(key)
    await q.evaluate('s=>tick(s)',1.6 if held else .08)
    if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await q.keyboard.up(key)
    await q.evaluate('tick(2)')
   if mobile:await q.tap('#btnCrouch')
   else:await q.keyboard.press('Control')
   await move(312,408);await check(1);assert await q.evaluate('__game.S.player.hidden&&!__game.S.player.hide')
   await action('z','btnAct');await check(2)
   await move(792,408);await check(3);await action('z','btnAct',True);await check(4)
   await move(906,504);await check(5);await action('z','btnAct');await check(6);assert await q.evaluate('__game.envAction().k==="quickStash"')
   await action('x','btnCarry');await check(7);assert await q.evaluate('__game.S.corpses.find(c=>c.guardId===2).hidden&&!__game.S.player.carrying')
   await move(1032,600);await q.wait_for_timeout(600);assert await q.evaluate('__game.S.over&&__game.S.exitOpen');assert await q.locator('#endTitle').text_content()=='연습 끝';assert await q.evaluate('__game.totalStars()===0'),'Practice gave campaign points';assert not errors,errors
   results.append({'mobile':mobile,'trace':trace,'completed':True,'errors':errors,'input':'Native keyboard or CDP joystick/buttons; active AI, fixed simulation clock; no player position changes'});await q.screenshot(path=str(O/f'{NAME}-{"mobile"if mobile else"pc"}.png'));await q.close()
  await b.close()
 (O/f'{NAME}.json').write_text(json.dumps({'base':BASE,'results':results},ensure_ascii=False,indent=2))
asyncio.run(main())
