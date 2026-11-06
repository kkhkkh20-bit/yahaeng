"""Standalone selected-stage fixtures, fresh saves, native UI purchases and input, normal RAF and unseeded active AI.
Known-map execution checks, not a new-player usability study. No gameplay overrides.
"""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from episode_training import standalone_stage, continue_episode, spend_episode_points
from action_flow_live import Controls
async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in ([args.device=='mobile']if args.device else[False,True]):
   for skill in ([args.skill]if args.skill else['reach','ambush','dart']):
    name=('mobile'if mobile else'pc')+'-'+skill;q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile)
    errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear()');await open_game(q,args.url+'?nostats&review=field-learning');c=Controls(q,await q.context.new_cdp_session(q),mobile)
    async def wait(expr,timeout=7000):await q.wait_for_function(expr,timeout=timeout,polling=50)
    try:
     await standalone_stage(q,'e1');await q.click('#brSkills button')
     for id in (['kit','dart']if skill=='dart'else['silentHands',skill]):
      await q.click(f'[data-select="{id}"]');await q.click(f'[data-learn="{id}"]');await q.click('.skill-detail-close')
     await q.click('#btnSkillsBack');assert (await q.locator('#brSkills').inner_text()).startswith('익힌 기술');await q.screenshot(path=str(out/(name+'-chosen.png')))
     await q.click('#btnBrGo');await c.press('Control','#btnCrouch');await c.move(600,888)
     if skill in ['ambush','dart']:
      await c.move(x=840);await wait('__game.S.guards[1].x>1100&&__game.S.guards[1].wait>5',60000)
      await c.move(y=696);await c.move(x=984);await c.move(y=744);await wait('__game.S.player.hidden');await c.record('hidden-beside-patrol')
      if skill=='dart':
       await q.click('#btnToolNext') if mobile else await q.keyboard.press('i');await q.click('[data-t="kunai"]');await wait('__game.kunaiTarget()?.ref===__game.S.guards[1]',60000);await c.press('f','#btnTool')
      else:
       await wait('__game.ambushTarget()===__game.S.guards[1]',60000);await c.press('z','#btnAct')
      await wait('__game.S.guards[1].state==="DEAD"&&!__game.actionBusy()&&!__game.S.amb');assert await q.evaluate('__game.S.guards[1].unconscious'),'short input unexpectedly killed ordinary guard'
      assert await q.evaluate('id=>!!__game.S.fieldSkillUses?.[id]',skill);await c.record('chosen-skill-actually-used');await q.screenshot(path=str(out/(name+'-used.png')))
      await c.move(y=696);await c.move(x=960)
     else:await c.move(960,696)
     await c.move(y=408);await wait('__game.S.guards[0].x>1305&&Math.cos(__game.S.guards[0].a)>.9&&__game.S.guards[0].wait>10',90000)
     await c.move(x=1216 if skill=='reach' else 1292);await c.record('target-rear-approach');await c.press('z','#btnAct');await wait('__game.targetEliminated(__game.S.guards[0])&&!__game.actionBusy()')
     assert await q.evaluate('id=>!!__game.S.fieldSkillUses?.[id]',skill);await c.move(960,696);await c.move(600,888);await c.move(168,888);await q.locator('#end').wait_for(state='visible');assert await q.locator('#end').get_attribute('data-win')=='1'
     receipt=await q.locator('#endSkills').inner_text();assert await q.evaluate('id=>document.getElementById("endSkills").textContent.includes(__game.SKILL_BY_ID[id].name)',skill),receipt
     result=await c.record('cleared-with-skill-receipt');assert result['hp']==3 and not result['stats']['detected'],result
     assert not errors,errors;await q.screenshot(path=str(out/(name+'-clear.png')));reports.append({'name':name,'receipt':receipt,'events':c.events,'errors':errors});print('PASS NATIVE FIELD',name,receipt,flush=True)
    except Exception:
     await c.record('failed');print(await q.evaluate('({pending:__game.pendingFieldSkill(),uses:__game.S.fieldSkillUses,attack:__game.attackAction().k,tool:__game.input.tool,amb:!!__game.ambushTarget(),target:__game.kunaiTarget()?.ref.id})'),flush=True);await q.screenshot(path=str(out/(name+'-failed.png')));raise
    finally:
     (out/(name+'.json')).write_text(json.dumps({'events':c.events,'errors':errors},ensure_ascii=False,indent=2));await c.steer();await q.close()
  await b.close()
 (out/'summary.json').write_text(json.dumps({'method':__doc__,'runs':reports},ensure_ascii=False,indent=2))
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:8006/public/');a.add_argument('--out',default='build/field-v196/live');a.add_argument('--device',choices=['pc','mobile']);a.add_argument('--skill',choices=['reach','ambush','dart']);asyncio.run(main(a.parse_args()))
