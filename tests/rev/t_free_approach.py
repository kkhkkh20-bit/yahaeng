"""Optional preparations must not prescribe a solution or replace a chosen goal.

Controlled scenes test HUD/selection/save rules. The separate route runner walks
all six missions using real inputs with NPC simulation frozen.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path('/tmp/free-approach-v119')

async def main():
 async with async_playwright() as p:
  browser = await p.chromium.launch()
  for mobile in [False, True]:
   pg = await browser.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile)
   errors=[]; pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()')
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink')
   await pg.wait_for_function('!!__game',polling=100)
   result=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===(id||'m2')));while(G.DLG.modal)G.advanceDialog();G.setOppMode(1);G.update(.001);return G.S};
    let S=fresh(),P=S.player;const pin=G.nextGoal().id;
    check(pin&&!S.storyTrack,'fresh run auto-selects a clue');
    G.takeProp(S.props.find(p=>p.id==='emetic'));G.updateStories(.5);
    check(S.stories.some(s=>s.d.id==='emetic'&&s.found)&&!S.storyTrack,'discovery chooses an approach');
    check(G.nextGoal().id===pin,'picking up poison replaces the mission goal');
    G.setOppMode(2);check(G.nextGoal().id===pin,'detailed clues force a route');G.setOppMode(1);
    S=fresh();P=S.player;let chosen=G.nextGoal().id;G.takeProp(S.props.find(p=>p.id==='laxative'));
    check(G.nextGoal().id===chosen,'laxative imposes seasoning');S.mealDosed=true;S.dining.eaten=false;
    check(G.nextGoal().id===chosen,'dosing imposes waiting');S.mealDosed=false;Object.assign(S.dining,{sick:true,phase:'toilet'});
    check(G.nextGoal().id===chosen,'bathroom visit imposes a uniform');
    S=fresh();P=S.player;chosen=G.nextGoal().id;Object.assign(P,{x:27.5*48,y:12.5*48,z:1});G.updateStories(.5);
    check(G.nextGoal().id===chosen,'roof proximity imposes a sign kill');
    S=fresh();P=S.player;S.items.forEach(it=>G.takeItem(it));chosen=G.nextGoal().id;
    check(chosen.startsWith('target:')&&!G.nextGoal().optional,'ledger imposes a phone call');
    G.selectMissionGoal(chosen);const r=G.rendezvousState();Object.assign(P,{x:r.phone.x,y:r.phone.y+48,fl:0,z:0});G.setLayer(0);
    check(G.callRendezvous()&&S.goalManual&&S.goalPin===chosen,'calling cancels the player objective selection');
    check(G.nextGoal().id===chosen,'appointment replaces the required goal');
    S.rendezvous.phase='left';check(G.nextGoal().id===chosen&&!S.over,'abandoning a meeting blocks progress');
    // Save compatibility: an old automatically selected story cannot commandeer the HUD.
    S=fresh();let st=S.stories.find(s=>s.d.id==='emetic');st.found=true;S.storyTrack='emetic';delete S.storyTrackManual;
    chosen=G.nextGoal().id;G.saveCheckpoint();check(G.loadCheckpoint(),'legacy checkpoint restore');S=G.S;
    check(G.nextGoal().id===chosen&&!G.nextGoal().story,'old save restores automatic coaching');
    check(G.selectStory('emetic')&&G.nextGoal().story==='emetic','explicit clue selection does not work in minimal mode');
    G.saveCheckpoint();check(G.loadCheckpoint()&&G.nextGoal().story==='emetic','explicit selection lost on restore');
    G.selectStory(null);check(G.nextGoal().id===chosen,'stopping clue tracking loses required goal');
    G.trackNextStory();check(G.nextGoal().story==='emetic','keyboard clue cycle skips the first clue');
    G.trackNextStory();check(G.nextGoal().id===chosen,'keyboard clue cycle cannot return to the objective');
    G.selectStory('emetic');S=G.S;S.vipPlan={phase:'done'};G.updateStories(.5);
    check(!G.nextGoal().story&&G.nextGoal().id===chosen,'missed optional window leaves a stale route');
    check(!G.selectStory('unknown'),'undiscovered clue selectable');G.setOppMode(0);check(!G.selectStory('emetic')&&G.nextGoal().id===chosen,'clues-off still directs a route');
    S=fresh('m6');check(G.nextGoal().text==='감방에서 나가기'&&G.nextGoal().x==null,'cell escape prescribes a tool or doorway');G.updateHUD(true);G.benchDraw(1);
    // Leave one discovered clue ready for real menu interactions below.
    S=fresh();G.takeProp(S.props.find(p=>p.id==='emetic'));G.updateStories(.5);G.nextGoal();for(let i=0;i<60;i++)G.update(.02);G.updateHUD(true);
    return{preparations:4,goalStable:true,manualTracking:true,legacySave:true,missedMeeting:true};
   }''')
   await pg.locator('#btnPause').click()
   if not await pg.locator('#missionGoals details').evaluate('(e)=>e.open'):
    await pg.locator('#missionGoals summary').click()
   await pg.locator('#missionGoals details button').filter(has_text='화장실 유인').click()
   assert await pg.evaluate('__game.nextGoal().story')=='emetic'
   assert await pg.evaluate('document.activeElement.dataset.track')=='story:emetic'
   await pg.screenshot(path=str(OUT/(('mobile' if mobile else 'pc')+'-clue-menu.png')))
   await pg.locator('#btnResume').click()
   await pg.evaluate('__game.updateHUD(true);__game.benchDraw(2)')
   assert '단서:' in await pg.locator('#objective').inner_text()
   await pg.locator('#btnPause').click()
   await pg.locator('#missionGoals > button').first.click()
   assert await pg.evaluate('!__game.nextGoal().story&&__game.nextGoal().id===__game.S.goalPin')
   await pg.locator('#btnResume').click()
   await pg.evaluate('__game.updateHUD(true);__game.benchDraw(2)')
   await pg.screenshot(path=str(OUT/(('mobile' if mobile else 'pc')+'-required-goal.png')))
   assert not errors,errors
   print('PASS free approach','mobile' if mobile else 'PC',json.dumps(result),flush=True)
   await pg.close()
  if '--rules-only' in sys.argv:
   await browser.close();return
  # Alternate objective order; uses physical movement/actions, with unrelated NPCs frozen.
  pg=await browser.new_page();await pg.add_init_script('window.requestAnimationFrame=()=>0')
  await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!__game',polling=100)
  flow=Path(__file__).with_name('mission_flow.js').read_text()
  for mobile in [False,True]:
   for sid in ['m1','m2','m3','m4','m5','m6']:
    r=await pg.evaluate(flow,{'sid':sid,'mobile':mobile,'targetsFirst':True})
    assert await pg.locator('#endTitle').inner_text()=='임무 완료'
    assert r['targetsFirst']
    print('PASS target first',sid,'mobile' if mobile else 'PC',flush=True)
  await browser.close()

OUT.mkdir(exist_ok=True)
asyncio.run(main())
