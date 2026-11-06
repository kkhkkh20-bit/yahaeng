"""Standalone stage fixture. Native, unskilled VIP walkthrough with every campaign actor and camera active.
Default mode steps the clock with a seed. YH_REALTIME=1 uses ordinary RAF and
unseeded randomness. Route navigation reads game coordinates; actions use native
keyboard/touch. No actor, inventory, skill, health, alert or progress overrides.
"""
import asyncio,json,os,sys,time
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from episode_training import standalone_stage, continue_episode, spend_episode_points
R=Path(__file__).resolve().parents[2];O=Path(os.environ.get('YH_VIP_DIR','/workspace/work/vip-v175/native'));O.mkdir(parents=True,exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else'http://127.0.0.1:8001/public/'
LABEL=sys.argv[2]if len(sys.argv)>2 else'local'
APPROACH=sys.argv[3]if len(sys.argv)>3 else'smoke'
REALTIME=os.environ.get('YH_REALTIME')=='1'
PREP=os.environ.get('YH_PREP_SKILLS')=='1'
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for touch in ([os.environ['YH_DEVICE']=='mobile'] if os.environ.get('YH_DEVICE') else [False,True]):
   name=LABEL+('-mobile'if touch else'-pc');video_options={'record_video_dir':str(O/'video')}if os.environ.get('YH_RECORD_VIDEO')=='1'else{};video_started=time.monotonic();milestones=[];q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch,is_mobile=touch,**video_options);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();'+(''if REALTIME else'window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}'))
   await open_game(q,BASE+'?review=v175&nostats');
   if PREP:await q.evaluate('localStorage.setItem("yahaeng.ch",JSON.stringify({tB:{_clear:true},p0:{_clear:true}}))')
   await standalone_stage(q,'m2')
   if PREP:
    await q.locator('#brSkills button').click();await q.locator('[data-select="silentHands"]').click();await q.locator('[data-learn="silentHands"]').click();await q.locator('.skill-detail-close').click();await q.locator('[data-select="ambush"]').click();await q.locator('[data-learn="ambush"]').click()
    if await q.locator('.skill-detail-close').is_visible():await q.locator('.skill-detail-close').click()
    await q.click('#btnSkillsBack');assert await q.locator('#brief').is_visible();await q.screenshot(path=str(O/(name+'-prepared.png')))
   await q.click('#btnBrGo')
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
    else:
     await q.keyboard.down(key);await tick(seconds)
     if REALTIME and key=='z' and seconds>=1:await q.wait_for_function('__game.targetEliminated(__game.S.guards[0])',timeout=10000,polling=50)
     await q.keyboard.up(key)
   async def move(x,y):
    for target,axis,lo,hi in [(x,'x','ArrowLeft','ArrowRight'),(y,'y','ArrowUp','ArrowDown')]:
     previous=None;still=0
     for n in range(240):
      s=await q.evaluate('axis=>({v:__game.S.player[axis],over:__game.S.over,hp:__game.S.player.hp})',axis);d=target-s['v']
      assert s['hp']>0,(name,'died during movement',x,y,s)
      if abs(d)<2.5 or s['over']:break
      still=still+1 if previous is not None and abs(previous-s['v'])<.03 else 0
      if still>=6:
       await draw();await q.screenshot(path=str(O/(name+'-blocked.png')));print('BLOCK STATE',await q.evaluate('({p:[__game.S.player.x,__game.S.player.y,__game.S.player.hp],t:__game.S.t,goal:__game.nextGoal()?.text,alarm:__game.S.alevel,guards:__game.S.guards.filter(g=>g.seen).map(g=>({id:g.id,state:g.state,x:g.x,y:g.y}))})'),flush=True);raise AssertionError((name,'blocked',x,y,axis,s))
      previous=s['v']
      if touch:
       dx=(1 if d>0 else-1)if axis=='x'else 0;dy=(1 if d>0 else-1)if axis=='y'else 0
       await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+dx*48,'y':520+dy*48,'id':1}]})
      else:await q.keyboard.down(lo if d<0 else hi)
      await tick(min(.12,max(.03 if REALTIME else .01,abs(d)/100)))
      if touch:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:await q.keyboard.up(lo if d<0 else hi)
     else:raise AssertionError((name,'route timeout',target,axis,s))
   async def env(kind):
    milestones.append({'kind':kind,'at':time.monotonic()-video_started});await draw()
    for _ in range(80):
     if not await q.evaluate('__game.actionBusy()'):break
     await tick(.05)
    else:raise AssertionError((name,'action did not recover',kind))
    if await q.evaluate('__game.envAction().k')!=kind:
     if touch:await q.tap('#btnCycle')
     else:await q.keyboard.press('Shift+Tab')
     if await q.locator('[data-env-token^="'+kind+':"]').count():await q.locator('[data-env-token^="'+kind+':"]').first.click()
     elif await q.evaluate('__game.envAction().k')!=kind:
      await q.screenshot(path=str(O/(name+'-missing-'+kind+'.png')));print('MISSING',kind,await q.evaluate('({p:[__game.S.player.x,__game.S.player.y,__game.S.player.hp],t:__game.S.t,choices:__game.envChoices().map(a=>[a.k,a.label]),vip:[__game.S.guards[0].x,__game.S.guards[0].y,__game.S.guards[0].wait]})'),flush=True);raise AssertionError('missing '+kind)
    await action('x','#btnCarry')
    if REALTIME:
     await q.wait_for_timeout(100);await q.wait_for_function('!__game.actionBusy()',timeout=15000);await q.wait_for_timeout(100)
    else:await tick(3.3)
   if APPROACH=='smoke':
    for at in [(1272,1032),(1272,840)]:await move(*at)
    await action('Control','#btnCrouch');await move(1272,744);await move(1292,744)
    assert await q.evaluate('__game.attackAction().k!=="none"'),'rear attack not available'
    await action('z','#btnAct',1.45);await tick(1.3)
    assert await q.evaluate('__game.targetEliminated(__game.S.guards[0])'),'smoking target not killed'
    await draw();await q.screenshot(path=str(O/(name+'-target.png')))
    drop=await q.evaluate('({x:__game.S.keyDrop?.x,y:__game.S.keyDrop?.y,code:!!__game.S.player.keys.code})')
    if not drop['code']:await move(drop['x'],drop['y'])
    assert await q.evaluate('__game.S.player.keys.code'),'physical target memo missing'
    await action('Control','#btnCrouch')
    for at in [(1272,744),(1272,1032),(648,1032),(648,936),(456,936),(456,816)]:await move(*at)
   else:
    for at in [(888,936),(648,936),(456,936),(456,816)]:await move(*at)
   await move(416,816);await move(416,792)
   if await q.evaluate('__game.S.player.mode')!='sneak':await action('Control','#btnCrouch')
   # The real street patrol can reach this bay at different times. Observe a
   # clear work window instead of assuming an unobserved three-second change.
   clear_since=None
   for _ in range(900):
    watch=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,donor=S.guards.find(g=>g.tag==='uniformDonor');return{t:S.t,threats:S.guards.filter(g=>g!==donor&&!g.civ&&!g.dog&&!['DEAD','CAPTIVE','SLEEP','TERROR'].includes(g.state)&&(g.fl||0)===(P.fl||0)&&(g.z||0)===(P.z||0)&&Math.hypot(g.x-P.x,g.y-P.y)<380&&(Math.hypot(g.x-P.x,g.y-P.y)<170&&G.sightLine(g,P.x,P.y,P.z,false,P.fl||0)||G.canSee(g,P.x,P.y,1,false,false,P.z,P.fl||0)>0||G.canSee(g,donor.x,donor.y,1,false,false,donor.z,donor.fl||0)>0)).map(g=>({id:g.id,state:g.state,x:g.x,y:g.y}))}}''')
    if not watch['threats']:
     if clear_since is None:clear_since=watch['t']
     if watch['t']-clear_since>=.6:break
    else:clear_since=None
    await tick(.1)
   else:raise AssertionError(('no safe uniform window',watch))
   print('UNIFORM GAP',json.dumps(watch),flush=True)
   await action('z','#btnAct');await tick(1.4);assert await q.evaluate('__game.S.guards.find(g=>g.tag==="uniformDonor").unconscious')
   await env('dress');assert await q.evaluate('__game.S.player.outfit==="crew"'),'guard uniform not stolen';print('UNIFORM ACQUIRED',await q.evaluate('({outfit:__game.S.player.outfit,hp:__game.S.player.hp,t:__game.S.t})'),flush=True)
   await move(456,792);await move(456,816)
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
   # Observe a full work-length camera gap. A momentarily clear sweep can
   # return during the two-second cable action. Also wait for the live patrol
   # to face away; ordinary passage permission does not excuse tampering.
   for _ in range(1500):
    safe=await q.evaluate("""()=>{
      const G=__game,S=G.S,P=S.player,g=S.guards[6],c=G.nearCameraCable();
      if(!c||G.workRiskReadout({k:'camCable'})?.kind!=='work'||!['PATROL','RETURN'].includes(g.state)||Math.cos(g.a)<.75||g.x<P.x+70)return false;
      const bearing=Math.atan2(P.y-c.y,P.x-c.x);
      for(let t=0;t<=2.4;t+=.1){
        const a=c.base+c.sweep*Math.max(-1,Math.min(1,Math.sin((S.t+t+c.ph)*Math.PI*2/c.period)*1.35));
        if(Math.abs(Math.atan2(Math.sin(a-bearing),Math.cos(a-bearing)))<G.camFov(c)+.05)return false;
      }
      return true;
    }""")
    assert await q.evaluate('__game.S.player.hp>0'),(name,'died while observing camera work window')
    if safe:break
    await tick(.1)
   else:raise AssertionError('no safe camera work window')
   await action('x','#btnCarry');await tick(2.2)
   # Wait outside the patrolled hallway, not inside an enforcer's reach.
   await move(180,600)
   gate=await q.evaluate('(()=>{const d=__game.S.doors.find(d=>d.keyLock==="code"&&!(d.fl||0));return{x:d.x,y:d.y}})()')
   # The office patrol can identify a nearby disguise. Observe a real gap
   # before operating its doorway; a fixed schedule is not a stealth strategy.
   observed=[]
   for n in range(1200):
    view=await q.evaluate('at=>{const g=__game.S.guards[6],dx=at.x-g.x,dy=at.y-g.y,d=Math.hypot(dx,dy);return{id:g.id,state:g.state,x:g.x,y:g.y,a:g.a,d,facing:(dx*Math.cos(g.a)+dy*Math.sin(g.a))/Math.max(1,d),wait:g.wait,seen:g.seen,why:g.why}}',gate)
    assert await q.evaluate('__game.S.player.hp>0'),(name,'died while observing office doorway',view)
    if n%50==0:observed.append(view)
    # This endpoint pauses facing away. Leave enough time to enter and
    # operate the physical vault door before the patrol returns.
    if view['state'] in ['PATROL','RETURN'] and view['x']>=400 and view['wait']>2.6 and __import__('math').cos(view['a'])>.8:break
    await tick(.1)
   else:
    await draw();await q.screenshot(path=str(O/(name+'-office-wait.png')))
    print('OFFICE WAIT',json.dumps({'gate':gate,'observed':observed,'last':view,'player':await q.evaluate('({x:__game.S.player.x,y:__game.S.player.y,hp:__game.S.player.hp,outfit:__game.S.player.outfit,blown:__game.S.player.disguiseBlown,alarm:__game.S.alevel,stats:__game.S.stats})')},ensure_ascii=False),flush=True)
    raise AssertionError((name,'office patrol never gives a visible doorway gap'))
   print('OFFICE GAP',json.dumps({'gate':gate,'observed':observed,'selected':view},ensure_ascii=False),flush=True)
   await move(gate['x'],445)
   await env('keypad')
   await q.locator('#keypad').wait_for(state='visible')
   for key in ['0','4','1','7']:
    if touch:await q.tap('#keypad [data-k="'+key+'"]')
    else:await q.keyboard.press(key)
   await tick(.6)
   await move(gate['x'],gate['y']-40)
   for _ in range(200):
    if not await q.evaluate('at=>__game.doorBlocked(__game.S.doors.find(d=>d.x===at.x&&d.y===at.y&&!(d.fl||0)))',gate):break
    await tick(.1)
   else:raise AssertionError((name,'vault doorway never clears'))
   await env('door')
   # A live patrol can reopen the physical door; closure itself is not a goal.
   await move(264,312)
   await env('loot')
   ledger=await q.evaluate('({t:__game.S.t,hp:__game.S.player.hp,p:{x:__game.S.player.x,y:__game.S.player.y},items:__game.S.items.map(i=>i.got),busy:__game.actionBusy(),evidence:__game.evidencePending(),stats:__game.S.stats,cams:__game.S.cams.map(c=>({x:c.x,y:c.y,unplugged:c.unplugged,meter:c.meter})),toasts:__game.S.toasts.map(t=>t.text),seen:__game.S.guards.filter(g=>g.seen).map(g=>({id:g.id,state:g.state,why:g.why}))})')
   print('LEDGER STATE',json.dumps(ledger,ensure_ascii=False),flush=True)
   if not ledger['items'][0] or ledger['evidence']:
    await q.screenshot(path=str(O/(name+'-ledger-incomplete.png')));raise AssertionError(('ledger route incomplete',ledger))
   await move(gate['x'],gate['y']-40)
   if await q.evaluate('at=>__game.S.doors.find(d=>d.x===at.x&&d.y===at.y&&!(d.fl||0)).locked',gate):await env('door')
   if APPROACH=='meeting':
    for at in [(264,504),(216,504)]:await move(*at)
    await env('callMeet');await move(216,600)
    for _ in range(600):
     ready=await q.evaluate('(()=>{const G=__game,P=G.S.player,g=G.S.guards[0];return G.attackAction().k!=="none"&&Math.hypot(g.x-P.x,g.y-P.y)<36})()')
     if ready:break
     await tick(.1)
    else:raise AssertionError('target failed to reach appointment')
    await action('z','#btnAct',2.2)
   assert not await q.evaluate('__game.S.exitOpen'),'ledger/target skipped the southeast cipher'
   async def route_local(x,y):
    path=await q.evaluate('''({x,y})=>{const G=__game,P=G.S.player;G.setLayer(P.fl||0);const doors=new Map(G.S.doors.filter(d=>(d.fl||0)===(P.fl||0)&&!d.keyLock).map(d=>[d.ty*G.MW+d.tx,d])),shafts=new Set(G.S.ladders.filter(l=>(l.bfl||0)===(P.fl||0)).map(l=>l.ty*G.MW+l.tx)),end=Math.floor(y/48)*G.MW+Math.floor(x/48);return G.astar(Math.floor(P.x/48),Math.floor(P.y/48),Math.floor(x/48),Math.floor(y/48),(tx,ty)=>(G.solidAt(tx,ty)&&!doors.has(ty*G.MW+tx))||(shafts.has(ty*G.MW+tx)&&ty*G.MW+tx!==end)).map(p=>({x:p.x,y:p.y}));}''',{'x':x,'y':y});assert path,(x,y)
    fl=await q.evaluate('__game.S.player.fl||0')
    for p0 in path:
     if await q.evaluate('p=>__game.S.doors.some(d=>d.locked&&(d.fl||0)===(__game.S.player.fl||0)&&Math.abs(d.x-p.x)<2&&Math.abs(d.y-p.y)<2)',p0):await env('door')
     await move(p0['x'],p0['y'])
     if await q.evaluate('(__game.S.player.fl||0)')!=fl:return
    await move(x,y)
   await move(264,696);await route_local(2376,1224)
   stair=await q.evaluate('(()=>{const G=__game,l=G.S.ladders.find(l=>l.kind==="fstair"&&G.bldAt(l.tx,l.ty)===7&&l.tfl===1);return{up:G.stairLower(l).up.entry,down:G.stairUpper(l).down.entry}})()')
   await route_local(stair['up']['x'],stair['up']['y'])
   if not await q.evaluate('__game.S.player.fl'):await env('up')
   await tick(1);assert await q.evaluate('__game.S.player.fl===1')
   for _ in range(900):
    if await q.evaluate('(()=>{const g=__game.S.guards.find(g=>g.tag==="cipherKeeper");return g.x<44*48&&g.wait>8&&Math.cos(g.a)<-.7})()'):break
    await tick(.1)
   else:raise AssertionError('cipher patrol never gives a working window')
   paper=await q.evaluate('({x:__game.S.items[1].x,y:__game.S.items[1].y})');await route_local(paper['x'],paper['y']);await env('loot')
   if not await q.evaluate('__game.S.items[1].got&&__game.S.exitOpen'):
    await q.screenshot(path=str(O/(name+'-cipher-incomplete.png')));print('CIPHER STATE',await q.evaluate('({t:__game.S.t,hp:__game.S.player.hp,items:__game.S.items.map(i=>i.got),busy:__game.actionBusy(),evidence:__game.evidencePending(),stats:__game.S.stats,seen:__game.S.guards.filter(g=>g.seen).map(g=>({id:g.id,state:g.state,why:g.why}))})'),flush=True);raise AssertionError('cipher route incomplete')
   await draw();await q.screenshot(path=str(O/(name+'-cipher.png')))
   await route_local(stair['down']['x'],stair['down']['y']);await tick(2)
   if await q.evaluate('__game.S.player.fl'):await env('fdown')
   await route_local(2376,1224);await route_local(2664,1056)
   assert await q.evaluate('__game.S.exitOpen'),'ledger/target did not complete contract'
   # The east exit closes the club/office/southeast apartment circuit.
   await q.wait_for_function('document.querySelector("#end").dataset.win==="1"&&!document.querySelector("#end").hidden',timeout=4000,polling=100)
   result=await q.evaluate('''()=>{const G=__game,S=G.S;return{version:__BUILD_VERSION__,seconds:S.t,hp:S.player.hp,stats:S.stats,skills:G.loadSkillTree().learned,approach:S.missionApproach,receipt:S.vipReceipt,records:JSON.parse(localStorage.getItem('yahaeng.ch')).m2._approaches,next:document.querySelector('#btnRetry').textContent}}''')
   assert result['hp']>0 and (set(result['skills'])=={'silentHands','ambush'}if PREP else not result['skills']) and not errors,(result,errors)
   assert result['receipt']['id']==APPROACH,(APPROACH,result)
   await q.screenshot(path=str(O/(name+'-clear.png')))
   if PREP:
    before=await q.evaluate('__game.skillBudget()-__game.skillSpent(__game.loadSkillTree())');assert await q.locator('#skillScreen').is_visible()
    if await q.locator('.skill-detail-close').is_visible():await q.locator('.skill-detail-close').click()
    for skill in ['quietStep','quietCrouch','swiftCrouch']:
     await q.locator('[data-select="'+skill+'"]').click()
     await q.locator('[data-learn="'+skill+'"]').click();await q.locator('.skill-detail-close').click()
    after=await q.evaluate('__game.skillBudget()-__game.skillSpent(__game.loadSkillTree())');assert before-after==4
    if await q.locator('.skill-detail-close').is_visible():await q.locator('.skill-detail-close').click()
    await spend_episode_points(q);result['afterSkills']=await q.evaluate('__game.loadSkillTree().learned');await q.screenshot(path=str(O/(name+'-upgraded.png')))
   await continue_episode(q);assert await q.evaluate('__game.STAGE.id==="m4"'), 'linear continuation skipped next episode'
   result.update(touch=touch,method='Standalone selected-stage fixture; fresh save; native keyboard or CDP touch; all actors and security active; '+('normal RAF and unseeded randomness'if REALTIME else'stepped clock and seed')+'; no actor, health, inventory, skills, alert or objective overrides',errors=errors,milestones=milestones);rows.append(result);print('PASS VIP',APPROACH,name,json.dumps(result,ensure_ascii=False),flush=True);await q.close()
   if video_options:await q.video.save_as(str(O/(name+'.webm')))
  await b.close()
 (O/(LABEL+'-walk.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
