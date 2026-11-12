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
from compound_live import CompoundControls

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
    cc=CompoundControls(q,c,out,name+'-p0');await c.press('Control','#btnCrouch');await cc.neutralize('uniformDonor');await cc.dress();await cc.hide('uniformDonor');await cc.neutralize('hallKeeper');await cc.hide('hallKeeper');await cc.stairs(1);await cc.walk(1236,360)
    await q.wait_for_function('__game.targetGesturePose(__game.S.guards.find(g=>g.tag==="runner"))!==null&&__game.S.guards.find(g=>g.tag==="runner").sayT>1.2&&__game.SPEECH_R.some(s=>s.speaker===__game.S.guards.find(g=>g.tag==="runner"))',timeout=26000,polling=50)
    assert await q.evaluate('(()=>{const G=__game,g=G.S.guards.find(g=>g.tag==="runner");return G.STAGE.targetCast.runner.personality.cues.some(c=>c[1]===g.say)})()'),'authored target performance has no matching dialogue'
    await q.wait_for_function('document.getElementById("episodeRadio").hidden',timeout=3000)
    await q.wait_for_timeout(150)
    assert await q.evaluate('(()=>{const G=__game,g=G.S.guards.find(g=>g.tag==="runner"),x=(g.x-G.cam.x)*G.SCALE+innerWidth/2;return x>24&&x<innerWidth-24})()'),'observed target is clipped off screen'
    await q.screenshot(path=str(out/(name+'-target-performance.png')))
    await c.record('authored-target-performance');await cc.neutralize('runner',True)
    await q.wait_for_function('__game.targetEliminated(__game.S.guards.find(g=>g.tag==="runner"))&&!__game.actionBusy()&&__game.loadCaseFile().sources.includes("runner-down")',timeout=7000)
    await c.record('officer-killed-lead-earned');await q.click('#btnPause');await q.locator('#pause [data-case-open]').click()
    text=await q.locator('#caseBoard').inner_text();assert '처치 확인' in text and '중개인' in text and '문서윤' in text and '정하린' not in text,text
    t=await q.evaluate('__game.S.t');await q.keyboard.press('ArrowRight');await q.keyboard.press('z');await q.wait_for_timeout(300)
    assert await q.evaluate('__game.S.t')==t,'case board does not pause gameplay'
    await q.screenshot(path=str(out/(name+'-first-lead.png')));await q.click('#btnCaseClose')
    assert await q.locator('#pause').is_visible();await q.wait_for_timeout(150);assert await q.evaluate('__game.S.t')==t,'closing board resumed paused game'
    await q.click('#btnResume');await cc.hide('runner');await cc.finish()
    await q.locator('#skillScreen').wait_for(state='visible',timeout=6000)
    assert '박인호의 인원 거래' in await q.locator('#caseTraining').inner_text()  # #111 이야기 개편 뒤 runner-down 단서 제목
    await q.locator('#caseTraining [data-case-open]').click();await q.click('#btnCaseClose');assert await q.locator('#skillScreen').is_visible()
    await continue_episode(q);assert await q.evaluate('__game.STAGE.id')=='e2';assert await q.locator('#brief').is_visible()
    assert await q.evaluate('__game.loadCaseFile().sources.includes("runner-down")'),'lead forgotten on next episode'
    result=await c.record('next-job-with-lead');assert result['hp']==3 and not result['stats']['detected'],result
    assert not errors,errors
    reports.append({'device':name,'events':c.events,'errors':errors,'method':__doc__});print('PASS NATIVE OFFICER HUNT',name,flush=True)
   except Exception:
    print('PERFORMANCE STATE',await q.evaluate('(()=>{const G=__game,g=G.S.guards.find(g=>g.tag==="runner"),P=G.S.player;return {t:G.S.t,visible:G.targetDialogueVisible(),say:g.say,own:g.persona?.said,pose:g.persona?.pose,near:G.targetSpeechNear(g),busy:G.actionBusy(),captive:!!P.captive,aim:G.input.aiming,alert:G.S.alevel,screen:[(g.x-G.cam.x)*G.SCALE+innerWidth/2,(g.y-G.cam.y)*G.SCALE+innerHeight/2],radio:document.getElementById("episodeRadio").hidden}})()'),flush=True)
    await c.record('failure');await q.screenshot(path=str(out/(name+'-failed.png')));raise
   finally:
    (out/(name+'.json')).write_text(json.dumps({'events':c.events,'errors':errors},ensure_ascii=False,indent=2));await c.steer();await q.close();await q.video.save_as(str(out/(name+'.webm')))
  await b.close()
 (out/'summary.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:8004/public/');a.add_argument('--out',default='build/targets-v207/live');a.add_argument('--device',choices=['pc','mobile']);asyncio.run(main(a.parse_args()))
