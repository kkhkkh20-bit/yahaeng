"""Earn a skill through the actual tree, walk the live campaign and use the authored encounter."""
import asyncio,json,sys,os
from pathlib import Path
from episode_training import select_skill_node
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/flow-v156';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else 'http://127.0.0.1:8001/public/';NAME=sys.argv[2]if len(sys.argv)>2 else 'field-journey'
async def main():
 reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await q.goto(BASE,timeout=120000);await q.wait_for_function('!!__game',timeout=120000);await q.click('#btnLedger');await q.click('#btnSkillsLedger')
   for skill in ['silentHands','dual']:
    await select_skill_node(q,skill);await q.click('[data-learn="'+skill+'"]')
    if mobile:await q.click('.skill-detail-close')
   await q.click('#btnSkillsBack');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{i}"]');await q.click('#btnBrGo');await q.evaluate('''()=>{while(__game.DLG.modal)__game.advanceDialog();window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01)if(!__game.S.over)__game.update(.01)};tick(.7)}''');cdp=await q.context.new_cdp_session(q)
   async def move(x,y):
    for target,axis,lo,hi in [(x,'x','ArrowLeft','ArrowRight'),(y,'y','ArrowUp','ArrowDown')]:
     for _ in range(200):
      s=await q.evaluate('axis=>({v:__game.S.player[axis],over:__game.S.over,hp:__game.S.player.hp})',axis);d=target-s['v']
      if abs(d)<2.5:break
      assert not s['over'],s
      if mobile:
       dx=(1 if d>0 else -1)if axis=='x'else 0;dy=(1 if d>0 else -1)if axis=='y'else 0
       await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+dx*28,'y':520+dy*28,'id':1}]})
      else:await q.keyboard.down(lo if d<0 else hi)
      await q.evaluate('s=>tick(s)',min(.15,abs(d)/110))
      if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:await q.keyboard.up(lo if d<0 else hi)
     else:raise AssertionError(('blocked',x,y,axis,s))
   # Public streets and the real south market entrance. Routing only chooses waypoints.
   street=await q.evaluate('''()=>{const G=__game,P=G.S.player;return G.astar(Math.floor(P.x/48),Math.floor(P.y/48),17,19)}''');assert street
   for point in street:await move(point['x'],point['y'])
   await move(840,888)
   route=await q.evaluate('''()=>{const G=__game,P=G.S.player;return G.astar(Math.floor(P.x/48),Math.floor(P.y/48),14,9)}''');assert route
   for point in route:await move(point['x'],point['y'])
   if mobile:await q.tap('#btnCrouch')
   else:await q.keyboard.press('Control')
   await move(714,456)
   for _ in range(40):
    if await q.evaluate('!!__game.assassinOpportunity()'):break
    await q.evaluate('tick(.1)')
   state=await q.evaluate('''()=>{const G=__game,S=G.S;return{t:S.t,at:[S.player.x,S.player.y],hp:S.player.hp,opportunity:G.assassinOpportunity(),notice:S.skillNotices,pair:S.guards.filter(g=>[9,10].includes(g.id)).map(g=>({id:g.id,x:g.x,y:g.y,a:g.a,state:g.state,seen:g.seen,meter:g.meter})),stats:S.stats}}''');assert state['opportunity'],state
   await q.evaluate('__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(2)');await q.screenshot(path=str(O/f'{NAME}-{"mobile"if mobile else"pc"}-ready.png'))
   if mobile:
    r=await q.locator('#btnAct').bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':2}]})
   else:await q.keyboard.down('z')
   await q.evaluate('tick(2.5)')
   if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:await q.keyboard.up('z')
   result=await q.evaluate('''()=>{const G=__game,S=G.S;return{t:S.t,hp:S.player.hp,dual:S.stats.dualAssassinations,kills:S.stats.kills,corpses:S.corpses.filter(c=>[9,10].includes(c.guardId)).map(c=>({id:c.guardId,ko:c.ko})),owned:G.loadSkillTree().learned,points:G.skillBudget()-G.skillSpent(G.loadSkillTree()),errors:[]}}''');assert result['dual']==1 and len(result['corpses'])==2 and all(not c['ko']for c in result['corpses']),result;assert not errors,errors;reports.append({'mobile':mobile,'ready':state,'result':result,'method':'Actual skill purchases, native keyboard/CDP joystick and attack; live campaign AI and cameras, fixed clock; no actor, inventory or HP overrides; authored encounter, not full contract'});print('PASS field skill',mobile,result,flush=True);await q.close()
  await b.close()
 (O/f'{NAME}.json').write_text(json.dumps({'base':BASE,'runs':reports},ensure_ascii=False,indent=2))
asyncio.run(main())
