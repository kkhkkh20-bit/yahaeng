"""Native full new-contract playback with live authored AI and normal browser time.
Coordinates and A* plan walking routes; no player/actor, skill, health, inventory,
objective or alert overrides. This is a scripted known-map replay, not a novice study.
"""
import argparse,asyncio,json,math,os
from pathlib import Path
from playwright.async_api import async_playwright

async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',proxy={'server':os.environ['HTTPS_PROXY']} if args.url.startswith('https:') else None)
  for mobile in ([False,True] if args.device=='both' else [args.device=='mobile']):
   name='mobile' if mobile else 'pc';q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear()')
   await q.goto(args.url+'?nostats&review=dawn-dispatch');await q.wait_for_function('!!__game',timeout=60000);cdp=await q.context.new_cdp_session(q)
   await q.click('#btnLedger');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m7")');await q.click(f'[data-i="{i}"]');await q.click('#btnBrGo')
   for _ in range(20):
    if not await q.evaluate('__game.DLG.modal'):break
    await q.click('#dlg');await q.wait_for_timeout(30)
   async def state():return await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;return{t:S.t,p:{x:P.x,y:P.y,fl:P.fl||0,hp:P.hp,mode:P.mode,vent:!!P.vent,carrying:!!P.carrying,outfit:P.outfit},over:S.over,exit:S.exitOpen,goal:G.nextGoal()?.text||"",env:G.envChoices().map(a=>({k:a.k,label:a.label})),stats:S.stats,broker:{x:S.guards[0].x,y:S.guards[0].y,a:S.guards[0].a,wait:S.guards[0].wait,state:S.guards[0].state,done:G.targetEliminated(S.guards[0])},keys:P.keys||{},evidence:G.evidencePending(),items:S.items.map(i=>i.got),seen:S.guards.filter(g=>g.seen).map(g=>({id:g.id,state:g.state,meter:g.meter,why:g.why}))}}''')
   await q.evaluate("""()=>{window.__episodeTrace=[];const id=setInterval(()=>{const S=__game.S;if(S.t>360){clearInterval(id);return}__episodeTrace.push({t:S.t,p:{x:S.player.x,y:S.player.y,carry:!!S.player.carrying},g:S.guards.map(g=>({tag:g.tag,x:g.x,y:g.y,a:g.a,range:g.range,state:g.state,moving:g.moving,wait:g.wait,meter:g.meter,seen:g.seen,rep:g.rep?{saw:g.rep.saw,kind:g.rep.kind,x:g.rep.x,y:g.rep.y}:null}))})},100)}""")
   async def snap(label):
    (out/f'{name}-trace.json').write_text(json.dumps(await q.evaluate('window.__episodeTrace'),ensure_ascii=False));s=await state();print(name,label,json.dumps(s,ensure_ascii=False),flush=True);await q.screenshot(path=str(out/f'{name}-{label}.png'));return s
   async def press(key,button,hold=0):
    if mobile:
     box=await q.locator(button).bounding_box();assert box,(button,await state());touch={'id':2,'x':box['x']+box['width']/2,'y':box['y']+box['height']/2};await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[touch]})
    else:await q.keyboard.down(key)
    if hold:await q.wait_for_timeout(hold*1000)
    if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await q.keyboard.up(key)
   async def straight(x,y):
    for _ in range(200):
     s=await state()
     if s['over'] and s['exit'] and s['p']['hp']>0:return
     assert not s['over'],s;dx=x-s['p']['x'];dy=y-s['p']['y'];d=math.hypot(dx,dy)
     if d<5:return
     nx=dx/d;ny=dy/d;ks=[]
     if mobile:
      await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':55,'y':520}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':55+nx*35,'y':520+ny*35}]})
     else:
      if abs(dx)>3:ks.append('ArrowRight' if dx>0 else 'ArrowLeft')
      if abs(dy)>3:ks.append('ArrowDown' if dy>0 else 'ArrowUp')
      for k in ks:await q.keyboard.down(k)
     await q.wait_for_timeout(min(70,max(17,d/140*1000)))
     if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
     else:
      for k in ks:await q.keyboard.up(k)
    raise AssertionError(('blocked straight',x,y,await state()))
   async def env(kind):
    for _ in range(100):
     if not await q.evaluate('__game.actionBusy()'):break
     await q.wait_for_timeout(40)
    choices=await q.evaluate('k=>__game.envChoices().filter(a=>a.k===k).map(a=>__game.envToken(a))',kind);assert choices,(kind,await state())
    if await q.evaluate('__game.envAction().k')!=kind:
     await q.click('#btnCycle');await q.locator('[data-env-token='+json.dumps(choices[0])+']').click()
    await press('x','#btnCarry');await q.wait_for_timeout(100)
   async def crouch(value):
    if bool(await q.evaluate('__game.input.sneakToggle'))!=value:await press('Control','#btnCrouch')
   async def route(x,y):
    assert isinstance(x,(int,float)) and isinstance(y,(int,float)) and math.isfinite(x) and math.isfinite(y),(x,y)
    pts=await q.evaluate('''({x,y})=>{const G=__game,P=G.S.player;G.setLayer(P.fl||0);const doors=new Map(G.S.doors.filter(d=>(d.fl||0)===(P.fl||0)&&(!d.keyLock||P.keys?.[d.keyLock])).map(d=>[d.ty*G.MW+d.tx,d]));const solid=P.vent?(tx,ty)=>!G.ventAt(tx,ty):(tx,ty)=>G.solidAt(tx,ty)&&!doors.has(ty*G.MW+tx);return G.astar(Math.floor(P.x/48),Math.floor(P.y/48),Math.floor(x/48),Math.floor(y/48),solid).map(p=>({x:p.x,y:p.y}));}''',{'x':x,'y':y})
    s=await state();assert pts or math.hypot(x-s['p']['x'],y-s['p']['y'])<65,('no path',x,y,s)
    for at in pts:
     closed=await q.evaluate('p=>__game.S.doors.some(d=>(d.fl||0)===(__game.S.player.fl||0)&&d.locked&&Math.abs(d.x-p.x)<2&&Math.abs(d.y-p.y)<2)',at)
     if closed:await env('door');await q.wait_for_function('!__game.actionBusy()',timeout=7000)
     await straight(at['x'],at['y'])
    await straight(x,y)
   try:
    await snap('start')
    # The locker is real scenery and the jacket is acquired through normal UI.
    coat=await q.evaluate('(()=>{const p=__game.S.props[0],a=p.surface?__game.propGround(p):p;return{x:a.x,y:a.y}})()')
    await route(coat['x'],coat['y']);await env('pickup');await q.wait_for_function('__game.S.player.outfit==="courier"&&!__game.actionBusy()',timeout=7000);await snap('uniform')
    # Cross the work yard into the eastern inspection bay; stay behind shelving.
    await route(1224,648);await route(1416,456);await route(1416,360);await q.wait_for_function('(()=>{const g=__game.S.guards[0];return Math.hypot(g.x-1560,g.y-360)<26&&!g.moving&&g.wait>5})()',timeout=180000);s=await state()
    await straight(s['broker']['x']-30,s['broker']['y']);await press('z','#btnAct',1.45);await q.wait_for_timeout(1100);assert (await state())['broker']['done'];await snap('target')
    if not (await state())['keys'].get('blue'):
     drop=await q.evaluate('({x:__game.S.keyDrop?.x,y:__game.S.keyDrop?.y})');await route(drop['x'],drop['y'])
    assert (await state())['keys'].get('blue');await snap('card')
    # Use the actual inspection-bay locker; carrying remains visible to live AI.
    await env('carry');await q.wait_for_function('!!__game.S.player.carrying',timeout=6000)
    hide=await q.evaluate('(()=>{const G=__game,h=G.S.hides.find(h=>h.furn&&h.tx===33&&h.ty===5&&!h.fl);return G.hideApproach(h).stand})()')
    await route(hide['x'],hide['y']);await env('carry');await q.wait_for_function('!__game.S.player.carrying&&!__game.actionBusy()',timeout=6000);await snap('body-hidden')
    if args.approach=='duct':
     await route(1368,504);await env('ventIn');await q.wait_for_function('!!__game.S.player.vent&&!__game.actionBusy()',timeout=8000);await route(888,504);await env('ventOut');await q.wait_for_function('!__game.S.player.vent&&!__game.actionBusy()',timeout=8000)
    else:
     await route(1176,456);await env('door');await q.wait_for_function('!__game.actionBusy()',timeout=7000)
    await crouch(True)
    if args.approach=='card':
     await q.wait_for_function('(()=>{const g=__game.S.guards.find(g=>g.tag==="archiveGuard");return g.moving&&g.y>8*48&&Math.sin(g.a)<-.7})()',timeout=25000)
    it=await q.evaluate('({x:__game.S.items[0].x,y:__game.S.items[0].y})');await route(it['x'],it['y'])
    # Observe the actual camera sweep before starting illegal collection.
    for _ in range(180):
     if not await q.evaluate('__game.S.cams.some(c=>__game.cameraAssessment(c,true).detectable)'):break
     await q.wait_for_timeout(70)
    await env('loot');await q.wait_for_function('__game.S.items[0].got&&!__game.actionBusy()',timeout=6000);await snap('manifest')
    assert not (await state())['evidence'],('recorded route needs console recovery',await state())
    assert not (await state())['exit'],'manifest alone still opens the exit'
    if args.approach=='duct':
     # Opening a duct can draw the archive patrol to that very exit.
     # Wait in real cover until he returns instead of walking into his search.
     if not await q.evaluate('(()=>{const g=__game.S.guards.find(g=>g.tag==="archiveGuard");return g.state==="PATROL"&&g.x>20*48})()'):
      cover=await q.evaluate('(()=>{const G=__game,h=G.S.hides.find(h=>h.furn&&h.tx===17&&h.ty===5&&!h.fl);return G.hideApproach(h).stand})()')
      await route(cover['x'],cover['y']);await env('hide');await q.wait_for_function('!!__game.S.player.hide&&!__game.actionBusy()',timeout=8000);await snap('wait-in-cover')
      await q.wait_for_function('(()=>{const g=__game.S.guards.find(g=>g.tag==="archiveGuard");return g.state==="PATROL"&&g.x>20*48})()',timeout=90000)
      await env('leave');await q.wait_for_function('!__game.S.player.hide&&!__game.actionBusy()',timeout=8000);await crouch(True)
     await route(888,504);await env('ventIn');await q.wait_for_function('__game.S.player.vent&&!__game.actionBusy()',timeout=8000);await route(1368,504);await env('ventOut');await q.wait_for_function('!__game.S.player.vent&&!__game.actionBusy()',timeout=8000);await crouch(False);await route(1224,648)
    else:
     await route(744,360);await crouch(False)
    # The southeast office and its physical staircase are now required.
    stair=await q.evaluate('(()=>{const G=__game,l=G.S.ladders.find(l=>l.kind==="fstair"&&l.tfl===1&&G.bldAt(l.tx,l.ty)===1);return{up:G.stairLower(l).up.entry,down:G.stairUpper(l).down.entry}})()')
    await route(stair['up']['x'],stair['up']['y']);await env('up');await q.wait_for_function('__game.S.player.fl===1&&!__game.S.player.trav&&!__game.actionBusy()',timeout=8000);await snap('upstairs')
    await q.wait_for_function('(()=>{const g=__game.S.guards.find(g=>g.tag==="camop");return g.x<28*48&&g.wait>6&&Math.cos(g.a)<-.7})()',timeout=90000)
    work=await q.evaluate('({x:__game.S.items[1].x,y:__game.S.items[1].y})');await route(work['x'],work['y']);await env('loot');await q.wait_for_function('__game.S.items[1].got&&!__game.actionBusy()',timeout=8000);await snap('dispatch-stopped')
    assert (await state())['exit'] and not (await state())['evidence'],await state()
    await route(stair['down']['x'],stair['down']['y']);await q.wait_for_function('!__game.actionBusy()',timeout=8000)
    if (await state())['p']['fl']:await env('fdown')
    await q.wait_for_function('!__game.S.player.fl&&!__game.S.player.trav&&!__game.actionBusy()',timeout=8000);await route(1848,1176)
    await route(72,1176);await q.wait_for_function('__game.S.over&&__game.S.player.hp>0&&__game.S.exitOpen&&JSON.parse(localStorage.getItem("yahaeng.ch")||"{}").m7?._clear',timeout=5000);final=await snap('clear');assert final['p']['hp']==3 and final['stats']['alarms']==0 and final['stats']['detected']==0,final;assert await q.evaluate('__game.S.exits.some(e=>Math.hypot(e.x-__game.S.player.x,e.y-__game.S.player.y)<e.r)'),final;assert not errors,errors;trail=await q.evaluate('__game.S.trail');(out/f'{name}-trail.json').write_text(json.dumps(trail));assert any(v.get('fl')==1 for v in trail),'office floor was not traversed';rows.append({'mobile':mobile,'approach':args.approach,'final':final,'method':__doc__});print('PASS',name,args.approach,'new episode complete',flush=True)
   except Exception:
    await snap('failure');raise
   finally:await q.close()
  await b.close()
 (out/'report.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8032/public/');p.add_argument('--out',default='build/episode-v186/native');p.add_argument('--device',choices=['pc','mobile','both'],default='both');p.add_argument('--approach',choices=['card','duct'],default='card');asyncio.run(main(p.parse_args()))
