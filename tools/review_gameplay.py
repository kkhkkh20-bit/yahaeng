import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1];O=R/'build/review-v155';O.mkdir(exist_ok=True)
async def main():
 reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for sid in ['m2','m4','m6']:
   q=await b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await q.goto('http://127.0.0.1:8001/public/');await q.wait_for_function('!!__game');await q.click('#btnLedger');i=await q.evaluate('sid=>__game.STAGES.findIndex(s=>s.id===sid)',sid);await q.click(f'[data-i="{i}"]');await q.screenshot(path=str(O/f'{sid}-brief-mobile.png'));await q.click('#btnBrGo');await q.evaluate('''()=>{while(__game.DLG.modal)__game.advanceDialog();window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01){__game.update(.01);__game.updateDialog(.01)}};tick(2)}''');trace=[]
   async def record(label):
    await q.evaluate('__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(2)');await q.screenshot(path=str(O/f'{sid}-{label}-mobile.png'));data=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;return{stage:G.STAGE.id,t:S.t,at:[P.x,P.y,P.fl,P.z],hp:P.hp,over:S.over,stats:S.stats,objective:document.querySelector('#objective').innerText,status:document.querySelector('#stealth').innerText,attack:G.attackAction().label,env:G.envAction().label,envChoices:G.envChoices().map(a=>({k:a.k,label:a.label})),witnesses:S.guards.filter(g=>g.seen).map(g=>({id:g.id,kind:g.kind,fl:g.fl||0,z:g.z||0,distance:Math.hypot(P.x-g.x,P.y-g.y),line:G.sightLine(g,P.x,P.y,P.z||0,false,P.fl||0)})),bodyRecords:S.corpses.map(c=>({guardId:c.guardId,ko:c.ko,byNpc:c.byNpc,byCar:c.byCar,npcBy:c.npcBy,kind:c.kind,hidden:c.hidden})),cover:P.cover,hidden:P.hidden,kit:{picks:P.picks,stones:P.stones,darts:P.kunai,smoke:P.smokes},skills:S.skills,alert:S.alevel,observer:G.activeObserver()?.phase,guards:S.guards.length,targets:S.guards.filter(g=>g.target).length,corpses:S.corpses.length,bushes:S.bushes.length,hides:S.hides.length,tools:G.availableTools(),toasts:S.toasts.map(t=>t.text)}}''');data['label']=label;trace.append(data);print('SCENE',json.dumps(data,ensure_ascii=False),flush=True)
   await record('entry');cdp=await q.context.new_cdp_session(q)
   async def move(dx,dy,s):
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520,'id':2}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+dx*28,'y':520+dy*28,'id':2}]});await q.evaluate('s=>tick(s)',s);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   async def button(id,s=.08):
    r=await q.locator('#'+id).bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':3}]});await q.evaluate('s=>tick(s)',s);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   if sid=='m2':
    # Pursue the first real patrol from its rear. NPCs, cameras, HP and inventory remain live.
    for attempt in range(85):
     s=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,g=S.guards.find(g=>g.id===11);const a=G.attackAction();return{over:S.over,ready:a.list?.some(v=>v.id===11)||a.g?.id===11,px:P.x,py:P.y,gx:g.x-Math.cos(g.a)*26,gy:g.y-Math.sin(g.a)*26,alive:g.state!=='DEAD'}}''')
     if s['over']or not s['alive']:break
     if s['ready']:
      await button('btnAct');await q.evaluate('tick(1.4)');break
     dx=s['gx']-s['px'];dy=s['gy']-s['py'];n=max(1,(dx*dx+dy*dy)**.5);await move(dx/n,dy/n,.12 if n<50 else .25)
    await record('first-encounter')
    if await q.evaluate('__game.S.corpses.length>0&&!__game.S.over'):
     # Use the actual target picker to select carry, if not already the default action.
     kinds=await q.evaluate('__game.envChoices().map(a=>({k:a.k,token:__game.envToken(a)}))');carry=next((x for x in kinds if x['k']=='carry'),None)
     if carry:
      await q.click('#btnCycle');await q.locator('[data-env-token="'+carry['token']+'"]').click();await button('btnCarry');await q.evaluate('tick(.7)');await record('carrying')
    await move(1,0,4);await move(0,-1,4);await record('approach-building')
   else:
    # First 8 seconds of ordinary movement following the entrance space, not a route solution.
    await move(1,0,4);await move(0,1,4);await record('early-movement')
   reports.append({'stage':sid,'trace':trace,'pageErrors':errors,'input':'Native CDP joystick/action buttons with fixed simulation clock; live guards, cameras, HP and fresh inventory. No player/NPC teleport, HP or AI overrides. Early encounter review, not full mission completion.'});assert not errors,errors;await q.close()
  await b.close()
 (O/'live-pilot.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
asyncio.run(main())
