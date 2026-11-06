"""Fresh-save native keyboard/CDP touch rehearsal with campaign detectors active.
Only simulation time is stepped. No actor, health, inventory, skill or objective overrides.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from episode_training import standalone_stage, continue_episode, spend_episode_points
R=Path(__file__).resolve().parents[2];O=R/'build/security-v173';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else(R/'build/preview_city.html').as_uri()
LABEL=sys.argv[2]if len(sys.argv)>2 else'local'
async def main():
 results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for touch in [False,True]:
   name=LABEL+('-touch'if touch else'-pc');q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await open_game(q,BASE+'?nostats');await standalone_stage(q,'tC',False)
   await q.evaluate('''()=>{while(__game.DLG.modal)__game.advanceDialog();window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01)if(!__game.S.over)__game.advanceGameFrame(.01)};tick(.7)}''');cdp=await q.context.new_cdp_session(q)
   async def tick(s):await q.evaluate('s=>tick(s)',s)
   async def snapshot():return await q.evaluate('''()=>{const G=__game,S=G.S;return{t:S.t,step:S.tutI,at:[S.player.x,S.player.y],hp:S.player.hp,over:S.over,exit:S.exitOpen,outfit:S.player.outfit,cam:S.cams.map(c=>({meter:c.meter,unplugged:c.unplugged})),env:G.envAction().label,goal:G.nextGoal().text,toasts:S.toasts.map(t=>t.text)}}''')
   async def draw():await q.evaluate('__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(1)')
   async def shot(s):await draw();await q.screenshot(path=str(O/(name+'-'+s+'.png')))
   async def move(x,y):
    for target,axis,lo,hi in [(x,'x','ArrowLeft','ArrowRight'),(y,'y','ArrowUp','ArrowDown')]:
     last=None
     for _ in range(300):
      at=await q.evaluate('a=>({v:__game.S.player[a],over:__game.S.over,hp:__game.S.player.hp})',axis);d=target-at['v'];
      if at['over']:
       assert await q.evaluate('__game.S.exitOpen&&__game.S.items.every(i=>i.got)'),(name,'failed during movement',await snapshot());return
      if abs(d)<2.5:break
      assert last is None or abs(last-at['v'])>.03,(name,'blocked',x,y,axis,await snapshot());last=at['v']
      if touch:
       dx=(1 if d>0 else-1)if axis=='x'else 0;dy=(1 if d>0 else-1)if axis=='y'else 0
       await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+dx*48,'y':520+dy*48,'id':1}]})
      else:await q.keyboard.down(lo if d<0 else hi)
      await tick(min(.1,abs(d)/125))
      if touch:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:await q.keyboard.up(lo if d<0 else hi)
     else:raise AssertionError((name,'movement timeout',await snapshot()))
   async def act():
    await draw()
    if touch:await q.tap('#btnCarry')
    else:await q.keyboard.press('x')
    await tick(.02)
   async def expect(step):
    await tick(.15);assert await q.evaluate('__game.S.tutI')==step,(name,'wrong tutorial step',step,await snapshot());print(name,'step',step,flush=True)
   await move(984,600);await tick(1.3);await expect(1);await shot('public-camera')
   await move(1328,648)
   if touch:await q.tap('#btnAct')
   else:await q.keyboard.press('z')
   await tick(1.4);await act();await tick(3.4);await expect(2)
   await move(984,600);await move(984,552);await tick(1.3);await expect(3);await shot('uniform-passage')
   await move(744,552);await move(744,360);await tick(.5);await expect(4);await shot('identity-check')
   await move(744,504);await expect(5)
   for at in [(744,600),(1176,600),(1176,504)]:await move(*at)
   await tick(1);await expect(6);await shot('denied-boundary')
   await move(1176,552);await move(984,552);await tick(1.5);await expect(7);await shot('before-theft')
   assert 'CCTV'in await q.locator('#actionRiskLbl').inner_text()and'통행 허용'in await q.locator('#accessLbl').inner_text()
   # Make one real mistake: a valid uniform does not protect a witnessed theft.
   await act();await tick(.3);await shot('recording-gauge');assert 'CCTV'in await q.locator('#expoLbl').inner_text(),await snapshot()
   await tick(.6);assert await q.evaluate('__game.S.over'),('no real detector failure',await snapshot());await q.wait_for_timeout(1450)
   assert await q.evaluate('!__game.S.over&&__game.S.tutI===7&&!__game.S.items[0].got&&!__game.S.cams[0].unplugged'),('real checkpoint did not restore safe work step',await snapshot())
   for at in [(1176,552),(1176,312),(984,312)]:await move(*at)
   await act();await tick(2.4);await expect(8);await shot('camera-unplugged')
   for at in [(1176,312),(1176,552),(984,552)]:await move(*at)
   await act();await tick(2.5);await expect(9)
   for at in [(1176,552),(1176,648),(1464,648)]:await move(*at)
   await q.wait_for_function('document.querySelector("#end").dataset.win==="1"&&!document.querySelector("#end").hidden',polling=100,timeout=4000)
   final=await q.evaluate('''()=>{const G=__game,S=G.S;return{version:__BUILD_VERSION__,hp:S.player.hp,stats:S.stats,learned:G.loadSkillTree().learned,budget:G.skillBudget(),cleared:JSON.parse(localStorage.getItem('yahaeng.ch')).tC._clear,rank:document.querySelector('#endRank').innerText}}''')
   assert final['cleared']and final['hp']==3 and final['learned']==[]and final['budget']==1 and not final['stats'].get('camRec',0)and final['stats'].get('camUnplugged')==1 and not errors,(name,final,errors)
   await q.screenshot(path=str(O/(name+'-clear.png')));results.append({'touch':touch,**final,'errors':errors,'method':__doc__.strip(),'deliberateMistake':'Actual recorded theft with valid uniform, failure, and timed checkpoint recovery before successful cable disconnection and collection.'});print('PASS native security rules',name,json.dumps(final,ensure_ascii=False),flush=True);await q.close()
  await b.close()
 (O/(LABEL+'-journey.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2))
asyncio.run(main())
