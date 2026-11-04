"""Learning order, early-exit gates and real tutorial recovery, not full playthroughs."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/review-v160';O.mkdir(exist_ok=True)
async def main():
 checks=[]
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game',polling=100)
  checks=await q.evaluate('''()=>{
   const G=__game,out=[],check=(v,s)=>{if(!v)throw Error(s)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S};
   const order=['p0','m2','m4','m6'],done={};
   for(const id of order){localStorage.setItem('yahaeng.ch',JSON.stringify(done));check(G.STAGES[G.recommendedStage()].id===id,'recommendation '+id);done[id]={_clear:true};}
   out.push('one shared episode order respects all four completion states');
   localStorage.clear();fresh('p0');check(G.STAGES[G.learningNext()].id==='m2','opening does not lead to first full contract');fresh('m2');check(G.STAGES[G.learningNext()].id==='m4','optional drills interrupt contracts');fresh('tL');check(G.STAGES[G.learningNext()].id==='tR','stairs rehearsal skipped');fresh('tR');check(G.STAGES[G.learningNext()].id==='m4','stairs follows required contract');fresh('m4');check(G.STAGES[G.learningNext()].id==='m6','episode03 transition');
   localStorage.setItem('yahaeng.ch',JSON.stringify({tL:{_clear:true},tR:{_clear:true}}));fresh('m2');check(G.STAGES[G.learningNext()].id==='m4','completed rehearsal forced again');fresh('m4');check(G.STAGES[G.learningNext()].id==='m6','completed third rehearsal forced again');out.push('result route joins next episode and skips already completed rehearsals');
   localStorage.clear();
   for(const id of ['tB','t0','tC','tL','tR']){const S=fresh(id),P=S.player;G.update(.02);check(!S.exitOpen,'early open '+id);check(!S.player.kunai&&!G.abilityOn('dart')&&!G.abilityOn('ambush'),'free skill '+id);check(!G.skillOn('electric'),'unnecessary electrical loan '+id);check(G.skillBudget()===4,'free points '+id);for(let i=0;i<G.STAGE.steps.length;i++){S.tutI=i;check(G.nextGoal()?.tut,'missing tutorial goal '+id+':'+i);check(G.objectiveLines().length===1,'competing goal lines '+id+':'+i);G.updateHUD(true);}S.tutI=0;G.checkObjective();}
   out.push('all lesson steps resolve goals without exceptions, one objective line and no free permanent skills/points');
   fresh('m4');check(!G.skillOn('electric'),'trial leaked into contract');check(G.S.guards.length>0,'native contract missing');out.push('direct contract selection remains possible and trial skills end');
   fresh('m6');check(Number.isFinite(G.nextGoal().x)&&G.nextGoal().text.includes('머리핀'),'cell entry has no actionable marker');out.push('episode03 starts with an actual reachable pin marker instead of unlocated escape text');
   const S=fresh('tB');S.tutI=1;G.input.sneakToggle=true;G.update(.02);G.updateHUD(true);check(G.nextGoal().text.includes('일어서기')&&document.getElementById('btnCrouch').classList.contains('lesson-cue'),'early crouch recovery');G.input.sneakToggle=false;G.input.walkLock=true;G.update(.02);check(G.nextGoal().text.includes('걷기 고정'),'walk lock recovery');out.push('early crouch and walking lock get matching recovery instructions');G.update(.5);G.saveCheckpoint();const before=G.CP.S.tutI||0;G.endGame(false,'recovery test');check(S.over,'failure not entered');window.recoveryBefore=before;
   return out;
  }''')
  await q.wait_for_timeout(1450);assert await q.evaluate('!__game.S.over&&(__game.S.tutI||0)===recoveryBefore&&__game.cpReady()'),'tutorial failure did not restore saved safe step';checks.append('real tutorial failure timer restores checkpoint, not whole lesson')
  for w,h in [(1440,900),(390,844),(844,390),(320,568)]:
   z=await b.new_page(viewport={'width':w,'height':h},has_touch=w!=1440);z.on('pageerror',lambda e:errors.append(str(e)));await z.add_init_script('window.requestAnimationFrame=()=>0');await z.goto((R/'build/preview_city.html').as_uri());await z.wait_for_function('!!window.__game',polling=100)
   await z.evaluate('''()=>{const G=__game;for(const id of ['tB','t0','tC','tL','tR']){G.start(G.STAGES.findIndex(s=>s.id===id));for(let n=0;n<G.STAGE.steps.length;n++){G.S.tutI=n;G.updateHUD(true);const e=document.getElementById('objective'),box=document.querySelector('#hud .obj').getBoundingClientRect();if(e.scrollHeight>e.clientHeight+1||box.right>innerWidth||box.left<0)throw Error('clipped instruction '+id+':'+n);}}}''');await z.close()
  checks.append('all lesson instructions fit desktop, portrait, landscape and320px viewports');assert not errors,errors;await b.close()
 (O/'learning-checks.json').write_text(json.dumps({'checks':checks,'errors':errors,'method':'Controlled completion-record/step/failed-state fixtures; actual recovery timer and rendered DOM; separate native journeys verify playable lessons.'},ensure_ascii=False,indent=2));print('PASS','; '.join(checks))
asyncio.run(main())
