"""Standalone stage fixture. Known-map fresh first mission using ordinary RAF and native keyboard/CDP touch.
No actor, clock, random, health, progression or inventory overrides. This verifies
first-entry action handoffs and a complete clear, not naive-human comprehension.
"""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from episode_training import finish_episode_scene, standalone_stage, continue_episode, spend_episode_points
from action_flow_live import Controls
async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in ([args.device=='mobile']if args.device else[False,True]):
   name='mobile'if mobile else'pc';q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile,record_video_dir=str(out/'video'));errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear()');await open_game(q,args.url+'?nostats&review=beginner');c=Controls(q,await q.context.new_cdp_session(q),mobile)
   async def shot(label):await c.record(label);await q.screenshot(path=str(out/(name+'-'+label+'.png')))
   async def wait(expr):await q.wait_for_function(expr,timeout=6000,polling=40)
   try:
    await standalone_stage(q,'p0');assert await q.locator('#brSkills').is_hidden();await shot('simple-brief');await q.click('#btnBrGo');await wait('__game.cpReady()');await q.wait_for_timeout(750);await shot('first-movement')
    assert '움직여 보기'in await q.locator('#objective').inner_text()
    await c.move(x=370);await wait('__game.S.beginnerEntry.step===1');assert '몸을 낮춰'in await q.locator('#objective').inner_text();await shot('crouch-cue')
    await c.press('Control','#btnCrouch');await wait('__game.S.beginnerEntry.step===2');await shot('target-handoff')
    await c.move(360,504);await c.move(y=408);await c.move(x=618)
    assert await q.evaluate('__game.attackAction().k')=='none';assert '더 가까이'in await q.locator('#btnAct').get_attribute('aria-label');await c.press('z','#btnAct');await wait('__game.S.toasts.some(t=>t.text.includes("아직 손이 닿지"))');await shot('honest-approach')
    await c.move(x=660);await wait('__game.attackAction().k!=="none"');
    # First real assassination has one target and no overlapping patrol.
    await shot('real-contact');await c.press('z','#btnAct',lethal=True);await wait('__game.targetEliminated(__game.S.guards[0])&&!__game.actionBusy()')
    assert await q.evaluate('["dress","carry","quickStash"].includes(__game.envAction().k)');await shot('body-handoff')
    # A useful uniform may come first. Choose carrying explicitly through the
    # existing target selector, then use the real lift/storage animations.
    if await q.evaluate('__game.envAction().k')!='carry':
     if mobile:
      await q.tap('#btnCycle');await q.locator('#envPicker button').filter(has_text='운반').first.tap()
     else:
      for _ in range(8):
       if await q.evaluate('__game.envAction().k')=='carry':break
       await q.keyboard.press('Tab')
    assert await q.evaluate('__game.envAction().k')=='carry';await c.press('x','#btnCarry');await wait('!!__game.S.player.carrying');await shot('body-lift')
    await c.move(360,408);await c.move(y=504);await c.press('x','#btnCarry');await wait('__game.S.stats.stashed===1');await shot('body-hidden')
    await c.move(y=648);await c.move(168,744);await finish_episode_scene(q,mobile);await q.locator('#end').wait_for(state='visible');assert await q.locator('#end').get_attribute('data-win')=='1'
    result=await c.record('first-clear');assert result['hp']==3 and not result['stats']['detected'] and result['stats']['stashed']==1,result
    assert '기술'in await q.locator('#endSkills').inner_text();assert not await q.evaluate('__game.loadSkillTree().learned.length');await shot('neutral-skill-invitation')
    assert not errors,errors;reports.append({'device':name,'result':result,'events':c.events,'errors':errors,'method':__doc__});print('PASS BEGINNER LIVE',name,flush=True)
   except Exception:
    await c.record('failed');await q.screenshot(path=str(out/(name+'-failed.png')));raise
   finally:
    (out/(name+'.json')).write_text(json.dumps({'events':c.events,'errors':errors},ensure_ascii=False,indent=2));await c.steer();await q.close();await q.video.save_as(str(out/(name+'.webm')))
  await b.close()
 (out/'summary.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8001/public/');parser.add_argument('--out',default='build/beginner-v197/live');parser.add_argument('--device',choices=['pc','mobile']);asyncio.run(main(parser.parse_args()))
