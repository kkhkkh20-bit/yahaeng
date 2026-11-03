"""Continuation review: saved stance, tracking lifetime, safe retries and catch-up presentation."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/review-v157';O.mkdir(exist_ok=True)
async def main():
 reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  await q.evaluate('''()=>{window.fresh=id=>{const G=__game;localStorage.clear();G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();};window.ok=(v,m)=>{if(!v)throw Error(m)}}''')
  reports+=await q.evaluate('''()=>{
   const G=__game,out=[];
   for(const id of ['m2','m4','m6','tB']){
    fresh(id);G.input.sneakToggle=true;G.update(.02);G.saveCheckpoint();const at={x:G.S.player.x,y:G.S.player.y},hp=G.S.player.hp;
    G.input.sneakToggle=false;G.loadCheckpoint();G.update(.02);
    ok(G.input.sneakToggle&&G.S.player.mode==='sneak',id+' save unexpectedly stands up');ok(G.S.player.hp===hp&&Math.hypot(G.S.player.x-at.x,G.S.player.y-at.y)<1,id+' stance restoration changes actor');
   }out.push('Saved crouch restored in all three main contracts and basic training');
   fresh('m2');Object.assign(G.S.player,{x:72,y:888});G.input.sneakToggle=true;G.update(.02);ok(G.S.player.hidden,'Foliage fixture is not concealed');G.saveCheckpoint();G.input.sneakToggle=false;G.loadCheckpoint();G.update(.02);ok(G.S.player.hidden,'Checkpoint exposes concealed actor');out.push('Real foliage concealment survives reload after standing');
   fresh('m2');let S=G.S;G.selectMissionGoal('item:0');ok(S.goalManual&&G.nextGoal().id==='item:0','Manual objective not preserved');S.items[0].got=true;const goal=G.nextGoal();ok(!S.goalManual&&S.goalPin!=='item:0','Completed objective traps manual tracking');G.selectMissionGoal('target:0');const st=S.stories.find(s=>s.d.id==='emetic');st.found=true;ok(G.selectStory('emetic'),'Cannot choose discovered clue');ok(!S.goalManual&&G.nextGoal().story==='emetic','Old objective defeats chosen clue');st.done=true;G.nextGoal();ok(!S.storyTrackManual&&!S.storyTrack,'Completed clue traps manual tracking');out.push('Manual target and clue remain until completed; completed selections release automatic guidance');
   fresh('m2');S=G.S;const entry=S.guards.find(g=>g.id===G.STAGE.entryRoute.guard);entry.state='DEAD';S.corpses.push({guardId:entry.id,g:entry,ko:true,hidden:true,fl:0,z:0,x:72,y:888});const budget=G.skillBudget();G.updateActionFlow();ok(S.actionEntry.phase==='done'&&S.cpWant&&!G.cpReady(),'Cleanup does not request a first retry point');S.alevel=2;G.updateCheckpoint(.6);ok(!G.cpReady()&&S.cpWant,'Cleanup saves during search');S.alevel=0;G.updateCheckpoint(.6);ok(G.cpReady()&&G.CP.S.actionEntry.phase==='done','Quiet cleanup does not save');ok(G.skillBudget()===budget&&!S.exitOpen&&S.items.every(i=>!i.got),'Retry grants progression or free skill points');out.push('First body cleanup queues checkpoint, waits through search, saves only when safe without rewards');
   fresh('m2');S=G.S;let hud=0;const style=document.getElementById('btnAct').style,set=style.setProperty;style.setProperty=function(k,...v){if(k==='--hold')hud++;return set.call(this,k,...v)};
   const t=S.t,x=S.player.x;S.keys.ArrowRight=true;try{G.advanceGameFrame(.12)}finally{style.setProperty=set;S.keys={}}
   ok(Math.abs(S.t-t-.12)<1e-8&&S.player.x>x+1,'Presentation batching skips movement/time');ok(hud===1,'Catch-up frame repeats HUD '+hud+' times');out.push('120ms catch-up retains seven physics steps and movement with one HUD presentation');
   return out;
  }''')
  await q.evaluate("fresh('m2');__game.updateHUD(true)");await q.click('#btnPause');await q.click('#missionGoals [data-track="item:0"]');assert await q.evaluate('__game.S.goalManual');await q.click('#missionGoals [data-track="auto"]');assert await q.evaluate('!__game.S.goalManual&&!__game.S.storyTrackManual&&__game.nextGoal().text.includes("풀숲")');assert await q.locator('#missionGoals [data-track="auto"]').get_attribute('aria-pressed')=='true';assert await q.evaluate('document.activeElement.dataset.track')=='auto';reports.append('Actual pause menu can return to automatic flow, with selected state and keyboard focus preserved')
  # A paused native frame must not present the simulation either.
  paused=await q.evaluate('''()=>{const G=__game,S=G.S,style=document.getElementById('btnAct').style,set=style.setProperty;let hud=0;style.setProperty=function(k,...v){if(k==='--hold')hud++;return set.call(this,k,...v)};const t=S.t;try{G.advanceGameFrame(.12)}finally{style.setProperty=set}return{hud,elapsed:S.t-t}}''');assert paused=={'hud':0,'elapsed':0},paused
  await q.close();cases=0;arrows=0
  for w,h,touch in [(1440,900,False),(390,844,True),(844,390,True),(320,568,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch);q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   result=await q.evaluate('''()=>{const G=__game;let cases=0,arrows=0;for(const id of ['m2','m4','m6'])for(const z of [.75,1,1.6]){G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.setZoom(z);G.update(.02);G.moveCamera(1);G.updateHUD(true);const r=G.goalViewport();if(r.bottom-r.top<47)throw Error('Inverted marker viewport');const ctx=G.ctx,translate=ctx.translate,at=[];ctx.translate=function(x,y){at.push([x,y]);return translate.call(this,x,y)};try{G.drawGoal(G.S.player)}finally{ctx.translate=translate}for(const [x,y]of at){const sy=(y-G.cam.y)*G.SCALE+innerHeight/2,sx=(x-G.cam.x)*G.SCALE+innerWidth/2;if(sy<r.top-1||sy>r.bottom+1||sx<r.left-1||sx>r.right+1)throw Error('Rendered arrow outside usable area '+JSON.stringify({sx,sy,r}));arrows++;}cases++;}return{cases,arrows}}''');cases+=result['cases'];arrows+=result['arrows']
   if w==320:
    await q.click('#btnPause');target=q.locator('#missionGoals [data-track="target:0"]')
    # m6 has no target; inspect the same small menu in the actual first contract.
    await q.click('#btnResume');await q.evaluate('__game.start(__game.STAGES.findIndex(s=>s.id==="m2"));while(__game.DLG.modal)__game.advanceDialog();__game.updateHUD(true)');await q.click('#btnPause');target=q.locator('#missionGoals [data-track="target:0"]');await target.scroll_into_view_if_needed();rect=await target.bounding_box();assert rect['y']>=0 and rect['y']+rect['height']<=h+1,rect;await target.tap();assert await q.evaluate('__game.S.goalManual&&__game.S.goalPin==="target:0"');auto=q.locator('#missionGoals [data-track="auto"]');await auto.scroll_into_view_if_needed();await auto.tap();assert await q.evaluate('!__game.S.goalManual');reports.append('320x568 pause menu scrolls to the last target and back to automatic guidance using real taps')
   await q.close()
  assert arrows>=12,arrows;reports.append(f'Actual marker rendering at four viewports, three zooms and three main contracts: {cases} cases, {arrows} measured arrows')
  assert not errors,errors;(O/'mechanics.json').write_text(json.dumps({'checks':reports,'pageErrors':errors},ensure_ascii=False,indent=2));print('PASS',len(reports),'continuity groups,',cases,'marker cases');await b.close()
asyncio.run(main())
