"""Known-map first-night journey, ordinary RAF and native keyboard/CDP touch.
Fresh saves, active actors, no gameplay state/clock/seed/skill overrides.
This verifies playability, not first-time human comprehension or physical iOS.
"""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from action_flow_live import Controls

async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in ([args.device=='mobile']if args.device else[False,True]):
   name='mobile'if mobile else'pc'
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile,record_video_dir=str(out/'video'))
   errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear()')
   await open_game(q,args.url+'?nostats&review=first-night');c=Controls(q,await q.context.new_cdp_session(q),mobile)
   async def wait(expr):await q.wait_for_function(expr,timeout=6000,polling=50)
   async def next_contract(stage):
    await q.locator('#end').wait_for(state='visible');assert await q.locator('#end').get_attribute('data-win')=='1'
    result=await c.record('cleared-'+stage);assert result['hp']==3 and not result['stats']['detected'] and not result['stats'].get('camRec',0),result
    await q.screenshot(path=str(out/(name+'-'+stage+'-clear.png')))
    await q.click('#btnNext');await q.click('#btnBrGo')
   try:
    await q.click('#btnQuick');await q.click('#btnBrGo');await wait('__game.cpReady()')
    await c.press('Control','#btnCrouch');await c.move(360,504);await c.move(y=408);await c.move(x=668)
    await q.screenshot(path=str(out/(name+'-rear-contact.png')));await c.press('z','#btnAct');await wait('__game.targetEliminated(__game.S.guards[0])&& !__game.actionBusy()')
    await c.record('one-tap-assassination');await c.move(360,648);await c.move(168,744);await next_contract('p0')
    assert await q.evaluate('__game.STAGE.id')=='p1'
    await c.move(648,696);await c.press('x','#btnCarry');await wait('__game.S.player.outfit==="crew"')
    await c.move(840,552);await wait('__game.S.starterPass');await c.record('ordinary-disguised-passage');await q.screenshot(path=str(out/(name+'-disguised-passage.png')))
    await c.move(y=312);await c.press('x','#btnCarry');await wait('__game.S.items.every(i=>i.got)')
    await c.move(y=696);await c.move(168,744);await next_contract('p1')
    assert await q.evaluate('__game.STAGE.id')=='p2'
    # Deliberately attempt visible work first: the actual camera must record it,
    # then the real recovery timer returns us to the safe entrance.
    await c.move(696,648);await c.move(y=360);await c.move(984,312);await c.press('x','#btnCarry')
    await wait('__game.S.over&&__game.S.stats.camRec>0');await c.record('recorded-work-mistake')
    await wait('!__game.S.over&&__game.S.stats.cpUsed===1');assert await q.evaluate('!__game.S.items[0].got&&__game.camOn(__game.S.cams[0])')
    await c.record('automatic-safe-retry')
    await c.move(696,648);await c.move(y=312)
    rear=await q.evaluate('(()=>{const c=__game.S.cams[0];return{x:c.x-Math.cos(c.base)*32,y:c.y-Math.sin(c.base)*32}})()')
    await c.move(rear['x'],rear['y']);await q.screenshot(path=str(out/(name+'-camera-rear.png')));await c.press('x','#btnCarry');await wait('!__game.camOn(__game.S.cams[0])')
    await c.record('camera-cable-disconnected');await c.move(y=360);await c.move(984,312)
    await c.press('x','#btnCarry');await wait('__game.S.items.every(i=>i.got)')
    await c.move(y=648);await c.move(168,744);await next_contract('p2')
    assert await q.evaluate('__game.STAGE.id')=='m2'
    result=await q.evaluate('({budget:__game.skillBudget(),learned:__game.loadSkillTree().learned,records:JSON.parse(localStorage.getItem("yahaeng.ch"))})')
    assert result['budget']==6 and not result['learned'],result
    assert all(result['records'][id]['_clear']for id in ['p0','p1','p2']),result
    assert not errors,errors;reports.append({'device':name,'result':result,'events':c.events,'errors':errors,'method':__doc__});print('PASS NATIVE FIRST NIGHT',name,json.dumps(result,ensure_ascii=False),flush=True)
   except Exception:
    await c.record('failed');print(await q.evaluate('({stage:__game.STAGE.id,goal:__game.nextGoal(),env:__game.envAction(),attack:__game.attackAction(),cams:__game.S.cams})'),flush=True)
    await q.screenshot(path=str(out/(name+'-failed.png')));raise
   finally:
    (out/(name+'.json')).write_text(json.dumps({'events':c.events,'errors':errors},ensure_ascii=False,indent=2));await c.steer();await q.close();await q.video.save_as(str(out/(name+'.webm')))
  await b.close()
 (out/'summary.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8004/public/');parser.add_argument('--out',default='build/first-night-v194/live');parser.add_argument('--device',choices=['pc','mobile']);asyncio.run(main(parser.parse_args()))
