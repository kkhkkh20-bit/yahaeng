"""Native, unskilled VIP walkthrough with every campaign actor and camera active.
Default mode steps the clock with a seed. YH_REALTIME=1 uses ordinary RAF and
unseeded randomness. Route navigation reads game coordinates; actions use native
keyboard/touch. No actor, inventory, skill, health, alert or progress overrides.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
R=Path(__file__).resolve().parents[2];O=Path(os.environ.get('YH_VIP_DIR','/workspace/work/vip-v175/native'));O.mkdir(parents=True,exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else'http://127.0.0.1:8001/public/'
LABEL=sys.argv[2]if len(sys.argv)>2 else'local'
APPROACH=sys.argv[3]if len(sys.argv)>3 else'smoke'
REALTIME=os.environ.get('YH_REALTIME')=='1'
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for touch in [False,True]:
   name=LABEL+('-mobile'if touch else'-pc');q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();'+(''if REALTIME else'window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}'))
   await open_game(q,BASE+'?review=v175&nostats');await q.click('#btnLedger');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{i}"]');await q.click('#btnBrGo')
   await q.evaluate('''()=>{while(__game.DLG.modal)__game.advanceDialog();window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01)if(!__game.S.over)__game.update(.01)};}''');cdp=await q.context.new_cdp_session(q)
   async def tick(s):
    if REALTIME:await q.wait_for_timeout(s*1000)
    else:await q.evaluate('s=>tick(s)',s)
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
      if previous is not None and abs(previous-s['v'])<.03:
       await draw();await q.screenshot(path=str(O/(name+'-blocked.png')));print('BLOCK STATE',await q.evaluate('({p:[__game.S.player.x,__game.S.player.y,__game.S.player.hp],t:__game.S.t,goal:__game.nextGoal()?.text,alarm:__game.S.alevel,guards:__game.S.guards.filter(g=>g.seen).map(g=>({id:g.id,state:g.state,x:g.x,y:g.y}))})'),flush=True);raise AssertionError((name,'blocked',x,y,axis,s))
      previous=s['v']
      if touch:
       dx=(1 if d>0 else-1)if axis=='x'else 0;dy=(1 if d>0 else-1)if axis=='y'else 0
       await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+dx*48,'y':520+dy*48,'id':1}]})
      else:await q.keyboard.down(lo if d<0 else hi)
      await tick(min(.12,abs(d)/100))
      if touch:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:await q.keyboard.up(lo if d<0 else hi)
     else:raise AssertionError((name,'route timeout',target,axis,s))
   async def env(kind):
    await draw()
    if await q.evaluate('__game.envAction().k')!=kind:
     if touch:await q.tap('#btnCycle')
     else:await q.keyboard.press('Shift+Tab')
     if not await q.locator('[data-env-token^="'+kind+':"]').count():
      await q.screenshot(path=str(O/(name+'-missing-'+kind+'.png')));print('MISSING',kind,await q.evaluate('({p:[__game.S.player.x,__game.S.player.y,__game.S.player.hp],t:__game.S.t,choices:__game.envChoices().map(a=>[a.k,a.label]),vip:[__game.S.guards[0].x,__game.S.guards[0].y,__game.S.guards[0].wait]})'),flush=True);raise AssertionError('missing '+kind)
     await q.locator('[data-env-token^="'+kind+':"]').first.click()
    await action('x','#btnCarry');await tick(3.3)
   if APPROACH=='smoke':
    for at in [(1272,1032),(1272,840)]:await move(*at)
    await action('Control','#btnCrouch');await move(1272,744);await move(1292,744)
    assert await q.evaluate('__game.attackAction().k!=="none"'),'rear attack not available'
    await action('z','#btnAct',1.5);await tick(1.3)
    assert await q.evaluate('__game.targetEliminated(__game.S.guards[0])'),'smoking target not killed'
    await draw();await q.screenshot(path=str(O/(name+'-target.png')))
    drop=await q.evaluate('({x:__game.S.keyDrop?.x,y:__game.S.keyDrop?.y,code:!!__game.S.player.keys.code})')
    if not drop['code']:await move(drop['x'],drop['y'])
    assert await q.evaluate('__game.S.player.keys.code'),'physical target memo missing'
    await action('Control','#btnCrouch')
    for at in [(1272,744),(1272,1032),(648,1032),(648,936),(456,936),(456,816)]:await move(*at)
   else:
    for at in [(888,936),(648,936),(456,936),(456,816)]:await move(*at)
   await env('pickup');assert await q.evaluate('__game.S.player.outfit==="crew"'),'spare office coat not equipped'
   if APPROACH!='smoke':
    for at in [(648,816),(648,504)]:await move(*at)
    for _ in range(600):
     if await q.evaluate('__game.S.player.keys.code'):break
     await tick(.1)
    else:raise AssertionError('market did not disclose code')
    for at in [(648,696),(552,744)]:await move(*at)
   else:
    for at in [(456,744),(552,744)]:await move(*at)
   await env('camCable')
   for at in [(456,744),(408,696),(312,696),(264,600),(180,600),(168,610)]:await move(*at)
   await draw()
   if await q.evaluate('__game.envAction().k')!='camCable':
    if touch:await q.tap('#btnCycle')
    else:await q.keyboard.press('Shift+Tab')
    await q.locator('[data-env-token^="camCable:"]').click()
   for _ in range(100):
    phase=await q.evaluate('__game.S.t%9')
    if 5.1<=phase<=5.3:break
    await tick(.1)
   else:raise AssertionError('camera sweep did not recur')
   await action('x','#btnCarry');await tick(2.2)
   for at in [(264,504),(240,445)]:await move(*at)
   await action('x','#btnCarry')
   for key in ['0','4','1','7']:
    if touch:await q.tap('#keypad [data-k="'+key+'"]')
    else:await q.keyboard.press(key)
   await tick(.6)
   for at in [(264,384),(264,312)]:await move(*at)
   await env('loot');assert await q.evaluate('__game.S.items[0].got&&!__game.evidencePending()')
   if APPROACH=='meeting':
    for at in [(264,504),(216,504)]:await move(*at)
    await env('callMeet');await move(216,600)
    for _ in range(600):
     ready=await q.evaluate('(()=>{const G=__game,P=G.S.player,g=G.S.guards[0];return G.attackAction().k!=="none"&&Math.hypot(g.x-P.x,g.y-P.y)<36})()')
     if ready:break
     await tick(.1)
    else:raise AssertionError('target failed to reach appointment')
    await action('z','#btnAct',2.2)
   assert await q.evaluate('__game.S.exitOpen'),'ledger/target did not complete contract'
   for at in [(264,696),(72,696),(36,816)]:await move(*at)
   await q.wait_for_function('document.querySelector("#end").dataset.win==="1"&&!document.querySelector("#end").hidden',timeout=4000,polling=100)
   result=await q.evaluate('''()=>{const G=__game,S=G.S;return{version:__BUILD_VERSION__,seconds:S.t,hp:S.player.hp,stats:S.stats,skills:G.loadSkillTree().learned,approach:S.missionApproach,receipt:S.vipReceipt,records:JSON.parse(localStorage.getItem('yahaeng.ch')).m2._approaches,next:document.querySelector('#btnRetry').textContent}}''')
   assert result['hp']>0 and not result['skills'] and not errors,(result,errors)
   assert result['receipt']['id']==APPROACH,(APPROACH,result)
   await q.screenshot(path=str(O/(name+'-clear.png')))
   await q.click('#btnRetry');await tick(.2);expected='emetic'if APPROACH=='smoke'else'smoke';assert await q.evaluate('id=>__game.STAGE.id==="m2"&&__game.S.vipIntent===id',expected),'next untried method not selected'
   result.update(touch=touch,method='Fresh save; native keyboard or CDP touch; all actors and security active; '+('normal RAF and unseeded randomness'if REALTIME else'stepped clock and seed')+'; no actor, health, inventory, skills, alert or objective overrides',errors=errors);rows.append(result);print('PASS VIP',APPROACH,name,json.dumps(result,ensure_ascii=False),flush=True);await q.close()
  await b.close()
 (O/(LABEL+'-walk.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
