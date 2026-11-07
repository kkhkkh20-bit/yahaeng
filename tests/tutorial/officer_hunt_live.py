"""Selected p0 fixture, fresh save, ordinary RAF, active AI and native keyboard/touch.
No actor, health, skill, clock or RNG changes. Checks the kill -> lead -> next-job loop.
Browser touch emulation does not certify physical iOS.
"""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from episode_training import standalone_stage,continue_episode
from action_flow_live import Controls

async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);reports=[]
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in ([args.device=='mobile']if args.device else[False,True]):
   name='mobile'if mobile else'pc';errors=[]
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile,record_video_dir=str(out/'video'))
   q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear()');await open_game(q,args.url+'?nostats&review=officer-hunt')
   c=Controls(q,await q.context.new_cdp_session(q),mobile)
   try:
    await standalone_stage(q,'p0');await q.click('#caseBrief [data-case-open]');await q.wait_for_timeout(100)
    assert '박인호' in await q.locator('#caseBoard').inner_text()
    text=await q.locator('#caseBoard').inner_text();assert all(n not in text for n in ['정하린','강도윤','윤서경'])
    await q.click('#btnCaseClose');await q.click('#btnBrGo');await q.wait_for_function('__game.cpReady()')
    await c.press('Control','#btnCrouch');await c.move(360,504);await c.move(y=408);await c.move(x=600)
    await q.wait_for_function('__game.targetGesturePose(__game.S.guards[0])!==null&&__game.S.guards[0].sayT>1.2&&__game.SPEECH_R.some(s=>s.speaker===__game.S.guards[0])',timeout=26000,polling=50)
    assert await q.evaluate('__game.S.guards[0].say?.includes("담배")'),'authored target performance has no matching dialogue'
    await q.wait_for_function('document.getElementById("episodeRadio").hidden',timeout=3000)
    await q.wait_for_timeout(150)
    assert await q.evaluate('(()=>{const G=__game,g=G.S.guards[0],x=(g.x-G.cam.x)*G.SCALE+innerWidth/2;return x>24&&x<innerWidth-24})()'),'observed target is clipped off screen'
    await q.screenshot(path=str(out/(name+'-target-performance.png')))
    await c.record('authored-target-performance');await c.move(x=660)
    await c.press('z','#btnAct',lethal=True)
    await q.wait_for_function('__game.targetEliminated(__game.S.guards[0])&&!__game.actionBusy()&&__game.loadCaseFile().sources.includes("runner-down")',timeout=7000)
    await c.record('officer-killed-lead-earned');await q.click('#btnPause');await q.locator('#pause [data-case-open]').click()
    text=await q.locator('#caseBoard').inner_text();assert '처치 확인' in text and '골목 연락책' in text and '정하린' not in text,text
    t=await q.evaluate('__game.S.t');await q.keyboard.press('ArrowRight');await q.keyboard.press('z');await q.wait_for_timeout(300)
    assert await q.evaluate('__game.S.t')==t,'case board does not pause gameplay'
    await q.screenshot(path=str(out/(name+'-first-lead.png')));await q.click('#btnCaseClose')
    assert await q.locator('#pause').is_visible();await q.wait_for_timeout(150);assert await q.evaluate('__game.S.t')==t,'closing board resumed paused game'
    await q.click('#btnResume');await c.move(360,648);await c.move(168,744)
    await q.locator('#skillScreen').wait_for(state='visible',timeout=6000)
    assert '끊어진 운반 연락' in await q.locator('#caseTraining').inner_text()
    await q.locator('#caseTraining [data-case-open]').click();await q.click('#btnCaseClose');assert await q.locator('#skillScreen').is_visible()
    await continue_episode(q);assert await q.evaluate('__game.STAGE.id')=='p1';assert await q.locator('#brief').is_visible()
    assert await q.evaluate('__game.loadCaseFile().sources.includes("runner-down")'),'lead forgotten on next episode'
    result=await c.record('next-job-with-lead');assert result['hp']==3 and not result['stats']['detected'],result
    assert not errors,errors
    reports.append({'device':name,'events':c.events,'errors':errors,'method':__doc__});print('PASS NATIVE OFFICER HUNT',name,flush=True)
   except Exception:
    print('PERFORMANCE STATE',await q.evaluate('(()=>{const G=__game,g=G.S.guards[0],P=G.S.player;return {t:G.S.t,visible:G.targetDialogueVisible(),say:g.say,own:g.persona?.said,pose:g.persona?.pose,near:G.targetSpeechNear(g),busy:G.actionBusy(),captive:!!P.captive,aim:G.input.aiming,alert:G.S.alevel,screen:[(g.x-G.cam.x)*G.SCALE+innerWidth/2,(g.y-G.cam.y)*G.SCALE+innerHeight/2],radio:document.getElementById("episodeRadio").hidden}})()'),flush=True)
    await c.record('failure');await q.screenshot(path=str(out/(name+'-failed.png')));raise
   finally:
    (out/(name+'.json')).write_text(json.dumps({'events':c.events,'errors':errors},ensure_ascii=False,indent=2));await c.steer();await q.close();await q.video.save_as(str(out/(name+'.webm')))
  await b.close()
 (out/'summary.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:8004/public/');a.add_argument('--out',default='build/targets-v207/live');a.add_argument('--device',choices=['pc','mobile']);asyncio.run(main(a.parse_args()))
