"""Standalone stage fixture. Known-map beginner episodes with native input and ordinary RAF.
Standalone selected-stage fixture; fresh save; active AI; no clock, seed, actor, health, skill or progress overrides.
Map/path reads only supply walkable waypoints. Not a human usability study.
"""
import argparse,asyncio,json,math
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from episode_training import standalone_stage, continue_episode, spend_episode_points, acquire_uniform
from action_flow_live import Controls

async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in ([args.device=='mobile']if args.device else[False,True]):
   name='mobile'if mobile else'pc';q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile,record_video_dir=str(out/'video'))
   errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.on('console',lambda m:print('GAME TRACE',name,m.text,flush=True) if m.text.startswith('AUTO RETRY') else None);await q.add_init_script('''localStorage.clear();const later=window.setTimeout;window.setTimeout=function(fn,ms,...rest){if(ms===1300)console.log('AUTO RETRY',document.getElementById('toasts')?.innerText,new Error().stack);return later(fn,ms,...rest)}''');await open_game(q,args.url+'?nostats&review=growth');c=Controls(q,await q.context.new_cdp_session(q),mobile)
   async def wait(expr,timeout=7000):await q.wait_for_function(expr,timeout=timeout,polling=50)
   async def env(kind):
    assert await q.evaluate('k=>__game.envChoices().some(a=>a.k===k)',kind),(kind,'not in reach',await q.evaluate('({x:__game.S.player.x,y:__game.S.player.y,choices:__game.envChoices().map(a=>a.k)})'))
    if await q.evaluate('__game.envAction().k')!=kind:
     await c.press('Tab','#btnCycle') if mobile else await q.keyboard.press('Shift+Tab')
     row=q.locator('[data-env-token^="'+kind+':"]');assert await row.count(),(kind,await q.evaluate('__game.envChoices().map(a=>a.k)'))
     await row.first.click()
    await c.press('x','#btnCarry');await q.wait_for_timeout(100);await wait('!__game.actionBusy()')
   async def route(x,y):
    points=await q.evaluate('''({x,y})=>{const G=__game,P=G.S.player,doors=new Set(G.S.doors.filter(d=>!d.keyLock&&(d.fl||0)===(P.fl||0)).map(d=>d.ty*G.MW+d.tx)),end=Math.floor(y/48)*G.MW+Math.floor(x/48),shafts=new Set(G.S.ladders.filter(l=>(l.bfl||0)===(P.fl||0)||l.tfl===(P.fl||0)).flatMap(l=>{const pts=[{x:l.tx*48+24,y:l.ty*48+24}];if(l.kind==='fstair')pts.push(((P.fl||0)===l.tfl?G.stairUpper(l).down:G.stairLower(l).up).entry);return pts.map(p=>Math.floor(p.y/48)*G.MW+Math.floor(p.x/48))}));return G.astar(Math.floor(P.x/48),Math.floor(P.y/48),Math.floor(x/48),Math.floor(y/48),(tx,ty)=>G.solidAt(tx,ty)&&!doors.has(ty*G.MW+tx)||shafts.has(ty*G.MW+tx)&&ty*G.MW+tx!==end).concat([{x,y}])}''',{'x':x,'y':y});assert points
    floor=await q.evaluate('__game.S.player.fl||0')
    for point in points:
     if await q.evaluate('(()=>{const a=__game.envAction();return a.k==="door"&&a.d.locked})()'):await env('door')
     await c.move(point['x'],point['y'])
     if await q.evaluate('__game.S.player.fl||0')!=floor:break
   async def finish(id,budget):
    await q.locator('#end').wait_for(state='visible');assert await q.locator('#end').get_attribute('data-win')=='1'
    s=await c.record('cleared-'+id);assert s['hp']==3 and not s['stats']['detected'] and not s['stats'].get('camRec',0) and not s['stats'].get('cpUsed',0),s
    assert await q.evaluate('__game.skillBudget()')==budget
    if s['stats']['bodies'] and await q.evaluate('__game.S.alevel>=2'):
     cause=await q.evaluate('__game.searchCauseReadout()');assert cause['kind']=='body' and '내 신원 미확인'in cause['text'],cause
    await q.screenshot(path=str(out/(name+'-'+id+'-clear.png')));await continue_episode(q);await q.click('#btnBrGo')
   try:
    if not args.bridge_only:
     await standalone_stage(q,'e1');await q.click('#btnBrGo')
     await c.press('Control','#btnCrouch');await c.move(600,888);await c.move(960,696);await c.move(y=408)
     await wait('__game.S.guards[0].x>1305&&Math.cos(__game.S.guards[0].a)>.9&&__game.S.guards[0].wait>10',90000)
     await c.move(x=1292);await q.screenshot(path=str(out/(name+'-moving-target-contact.png')));await c.press('z','#btnAct',lethal=True);await wait('__game.targetEliminated(__game.S.guards[0])&&!__game.actionBusy()')
     await c.move(960,696);await c.move(600,888);await c.move(168,888);await finish('e1',2)
     assert await q.evaluate('__game.STAGE.id')=='e2'
     await acquire_uniform(q,c)
     await c.move(600,552);await c.move(744,552)
     rear=await q.evaluate('(()=>{const c=__game.S.cams[0];return{x:c.x-32,y:c.y}})()');await c.move(rear['x'],600);await c.move(y=rear['y']);await env('camCable');await wait('!__game.camOn(__game.S.cams[0])')
     await q.screenshot(path=str(out/(name+'-warehouse-camera.png')));await c.move(y=360);await c.move(1320,312);await env('loot');await wait('__game.S.items[0].got')
     await c.move(y=552);await c.move(x=600);await c.move(y=936);await c.move(168,936);await finish('e2',3)
     assert await q.evaluate('__game.STAGE.id')=='e3'
     await acquire_uniform(q,c);await c.move(456,936);await c.move(y=648)
     stair=await q.evaluate('(()=>{const G=__game,l=G.S.ladders.find(l=>l.kind==="fstair");return{up:G.stairLower(l).up.entry,down:G.stairUpper(l).down.entry}})()')
     await route(stair['up']['x'],stair['up']['y']);
     if await q.evaluate('__game.S.player.fl||0')==0:await env('up')
     await wait('__game.S.player.fl===1&&!__game.actionBusy()');await c.record('first-real-upstairs-contract')
     it=await q.evaluate('({x:__game.S.items[0].x,y:__game.S.items[0].y})');await route(it['x'],it['y']);await env('loot');await wait('__game.S.items[0].got');await q.screenshot(path=str(out/(name+'-upstairs-ledger.png')))
     await route(stair['down']['x'],stair['down']['y']);
     if await q.evaluate('__game.S.player.fl||0')==1:await env('fdown')
     await wait('!__game.S.player.fl&&!__game.actionBusy()');await route(456,648);await c.move(y=936);await c.move(216,936);await finish('e3',4)
    else:
     await standalone_stage(q,'e4');await q.click('#btnBrGo')
    assert await q.evaluate('__game.STAGE.id')=='e4'
    await acquire_uniform(q,c);await c.move(456,936);await c.move(y=648)
    camera=await q.evaluate('__game.cameraServicePoint(__game.S.cams[0])')
    await route(camera['x'],camera['y']);await env('camCable');await wait('!__game.camOn(__game.S.cams[0])')
    stair=await q.evaluate('__game.S.lessonLayout');await route(stair['up']['x'],stair['up']['y'])
    if not await q.evaluate('__game.S.player.fl||0'):await env('up')
    await wait('__game.S.player.fl===1&&!__game.actionBusy()')
    it=await q.evaluate('({x:__game.S.items[0].x,y:__game.S.items[0].y})');await route(it['x'],it['y']);await env('loot');await wait('__game.S.items[0].got');await q.screenshot(path=str(out/(name+'-exchange-upstairs.png')))
    await route(stair['down']['x'],stair['down']['y'])
    if await q.evaluate('__game.S.player.fl||0'):await env('fdown')
    await wait('!__game.S.player.fl&&!__game.actionBusy()');await route(456,648);await c.move(y=936);await c.move(216,936);await finish('e4',2 if args.bridge_only else 5)
    assert await q.evaluate('__game.STAGE.id')=='e5'
    await acquire_uniform(q,c);await c.move(456,936);await c.move(y=648)
    stair=await q.evaluate('__game.S.lessonLayout');await route(stair['up']['x'],stair['up']['y'])
    if not await q.evaluate('__game.S.player.fl||0'):await env('up')
    await wait('__game.S.player.fl===1&&!__game.actionBusy()')
    camera=await q.evaluate('__game.cameraServicePoint(__game.S.cams[0])')
    await route(camera['x'],camera['y'])
    await wait('(()=>{const G=__game,g=G.S.guards.find(g=>g.tag==="broker");return g.moving&&g.x>500&&Math.cos(g.a)<-.9&&!G.cameraAssessment(G.S.cams[0],true).visible&&G.workRiskReadout(G.envAction())?.kind!=="witness"})()',90000)
    await env('camCable');await wait('!__game.camOn(__game.S.cams[0])');safe=await c.record('broker-camera-disconnected');assert not safe['stats'].get('cpUsed',0) and not safe['stats'].get('camRec',0),safe
    assert await q.evaluate('__game.S.player.fl===1'),'camera route accidentally descended'
    await wait('(()=>{const g=__game.S.guards.find(g=>g.tag==="broker");return g.x>650&&Math.cos(g.a)>.9&&g.wait>10})()',90000)
    target=await q.evaluate('(()=>{const g=__game.S.guards.find(g=>g.tag==="broker");return{x:g.x-40,y:g.y}})()');await route(target['x'],target['y']);assert await q.evaluate('__game.S.player.fl===1'),'attack route accidentally descended'
    await wait('(()=>{const G=__game,g=G.S.guards.find(g=>g.tag==="broker"),P=G.S.player;return g.wait>3&&(P.x-g.x)*Math.cos(g.a)+(P.y-g.y)*Math.sin(g.a)<0&&G.attackAction().list?.includes(g)})()',90000)
    await q.screenshot(path=str(out/(name+'-broker-rear.png')));await c.press('z','#btnAct',lethal=True);await wait('__game.targetEliminated(__game.S.guards.find(g=>g.tag==="broker"))&&!__game.actionBusy()')
    await route(stair['down']['x'],stair['down']['y'])
    if await q.evaluate('__game.S.player.fl||0'):await env('fdown')
    await wait('!__game.S.player.fl&&!__game.actionBusy()');await route(456,648);await c.move(y=936);await c.move(216,936);await finish('e5',3 if args.bridge_only else 6)
    assert await q.evaluate('__game.STAGE.id')=='m2'
    assert await q.evaluate('__game.loadSkillTree().learned.length>0&&!__game.campaignSkillState().canLearn')
    assert not errors,errors;reports.append({'device':name,'events':c.events,'errors':errors,'method':__doc__});print('PASS NATIVE GROWTH',name,flush=True)
   except Exception:
    await c.record('failed');print(await q.evaluate('({stage:__game.STAGE.id,fl:__game.S.player.fl,env:__game.envAction().k,goal:__game.nextGoal()?.text,attack:__game.attackAction().k,reason:__game.attackAction().label,a:__game.S.guards.find(g=>g.tag==="broker")?.a,layer:__game.layer,stairs:__game.S.ladders.map(l=>({x:l.tx,y:l.ty,bfl:l.bfl,tfl:l.tfl}))})'),flush=True);await q.screenshot(path=str(out/(name+'-failed.png')));raise
   finally:
    (out/(name+'.json')).write_text(json.dumps({'events':c.events,'errors':errors},ensure_ascii=False,indent=2));await c.steer();await q.close();await q.video.save_as(str(out/(name+'.webm')))
  await b.close()
 (out/'summary.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8005/public/');parser.add_argument('--out',default='build/growth-v195/live');parser.add_argument('--device',choices=['pc','mobile']);parser.add_argument('--bridge-only',action='store_true');asyncio.run(main(parser.parse_args()))
