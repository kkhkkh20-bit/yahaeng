"""Native purchases, neutral spending reminders and first-lesson progress/save gates.
Tutorial-step and completion fixtures isolate UI rules; native full journeys are separate.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/tutorial-skills-v189';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for width,height,mobile in [(1280,800,False),(390,600,True),(844,390,True)]:
   q=await b.new_page(viewport={'width':width,'height':height},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
   await q.click('#btnLedger');idx=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{idx}"]');await q.wait_for_function('!__game.warmStatus.pending',polling=100)
   copy=await q.locator('#brSkills').inner_text();assert '4P'in copy and '포인트를 사용'in copy and '은신 기습'not in copy
   await q.locator('#brSkills button').click();assert await q.locator('#skillScreen').is_visible();assert await q.locator('#skillDetail').is_hidden(),'reminder preselects a skill'
   assert await q.locator('[data-plan],#skillPlans,[data-next-plan]').count()==0,'recommendations remain'
   assert await q.evaluate('__game.skillSpent(__game.loadSkillTree())===0'),'guidance auto-spends points'
   for skill in ['silentHands','ambush']:
    await q.locator(f'[data-select="{skill}"]').click();await q.locator(f'[data-learn="{skill}"]').click();await q.locator('.skill-detail-close').click()
   assert await q.evaluate('__game.skillSpent(__game.loadSkillTree())===2')
   await q.click('#btnSkillsBack');assert await q.locator('#brief').is_visible();assert '2P'in await q.locator('#brSkills').inner_text()
   box=await q.locator('#btnBrGo').evaluate('e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,h:r.height,w:r.width,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}}')
   assert box['hit']and box['y']+box['h']<=height+1,box
   await q.screenshot(path=str(O/f'prepare-{width}.png'));await q.click('#btnBrGo');await q.keyboard.press('Escape')
   await q.evaluate('for(let i=0;i<10;i++)__game.advanceGameFrame(.05);__game.updateHUD(true)')
   assert await q.evaluate('__game.S.skills.ambush&&__game.S.skills.silentHands&&__game.S.t>0')
   assert await q.locator('#btnPause').get_attribute('data-points')=='2'
   await q.click('#btnPause');await q.click('#btnSkillsPause');assert not await q.evaluate('__game.resetTreeSkills()'),'field reset allowed'
   await q.click('#btnSkillsBack');await q.click('#btnResume')
   await q.evaluate('()=>{const G=__game,S=G.S;S.guards.filter(g=>g.target).forEach(g=>{g.state="DEAD";g.unconscious=false});S.items.forEach(i=>i.got=true);S.over=true;G.showEnd(true)}')
   assert await q.locator('#endSkills').is_visible();await q.locator('#endSkills button').click();assert await q.locator('#end').is_hidden();assert await q.locator('#skillDetail').is_hidden()
   await q.click('#btnSkillsBack');assert await q.locator('#end').is_visible();assert await q.evaluate('__game.S.over')
   assert not errors,errors;print('PASS neutral spending reminder',width,'choice stays open, actual purchases, briefing/end return, visible departure',flush=True);await q.close()
  # Any root skill satisfies the teaching step. Check all three branches and a
  # checkpoint saved before purchase, so repeating a lesson never consumes more P.
  for root in ['quietStep','silentHands','kit']:
   q=await b.new_page(viewport={'width':390,'height':600},has_touch=True,is_mobile=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tB'));while(G.DLG.modal)G.advanceDialog();G.S.tutI=G.STAGE.steps.findIndex(s=>s[4]==='skills');for(let n=0;n<60;n++)G.update(.01);G.updateHUD(true);G.saveCheckpoint();}''')
   assert await q.evaluate('!__game.S.exitOpen&&__game.skillSpent(__game.loadSkillTree())===0')
   assert await q.locator('#btnPause').evaluate('e=>e.classList.contains("lesson-cue")')
   assert await q.locator('#btnPause').get_attribute('data-points')=='4'
   assert '메뉴 > 기술 트리'in await q.locator('#objective').inner_text()
   await q.tap('#btnPause');assert await q.locator('#btnSkillsPause').evaluate('e=>e.classList.contains("lesson-cue")');await q.tap('#btnSkillsPause')
   await q.click('#btnSkillsBack');await q.tap('#btnResume');await q.evaluate('for(let i=0;i<50;i++)__game.update(.01);__game.updateHUD(true)')
   assert await q.evaluate('!__game.S.exitOpen&&__game.STAGE.steps[__game.S.tutI][4]==="skills"'),'opening without buying completes tutorial'
   await q.tap('#btnPause');await q.tap('#btnSkillsPause');before=await q.evaluate('__game.S.t');await q.evaluate('for(let i=0;i<20;i++)__game.advanceGameFrame(.05)');assert await q.evaluate('__game.S.t')==before,'game continues while choosing a skill'
   await q.click(f'[data-select="{root}"]');await q.click(f'[data-learn="{root}"]');assert await q.evaluate('__game.skillSpent(__game.loadSkillTree())===1')
   await q.screenshot(path=str(O/f'tutorial-bought-{root}.png'));await q.click('.skill-detail-close');await q.click('#btnSkillsBack');await q.tap('#btnResume')
   await q.evaluate('for(let i=0;i<50;i++)__game.update(.01);__game.updateHUD(true)')
   assert await q.evaluate('!__game.S.exitOpen&&__game.S.tutI===2&&__game.nextGoal().text.includes("뛰어 보기")')
   assert not await q.locator('#btnPause').evaluate('e=>e.classList.contains("lesson-cue")')
   await q.evaluate('''()=>{const G=__game;if(!G.loadCheckpoint())throw Error('checkpoint missing');for(let i=0;i<50;i++)G.update(.01);G.updateHUD(true);}''')
   assert await q.evaluate('__game.S.tutI===2&&__game.skillSpent(__game.loadSkillTree())===1'),'checkpoint requires paying twice'
   # No points left: an existing purchased build also advances without a dead end.
   await q.evaluate('''()=>{const G=__game;localStorage.setItem('yahaeng.skillTree.v1',JSON.stringify({schema:1,rewardVersion:152,learned:['quietStep','quietCrouch','swiftCrouch']}));G.start(G.STAGES.findIndex(s=>s.id==='tB'));G.S.tutI=G.STAGE.steps.findIndex(s=>s[4]==='skills');for(let i=0;i<60;i++)G.update(.01);G.checkObjective();}''')
   assert await q.evaluate('__game.S.tutI===2&&__game.skillBudget()-__game.skillSpent(__game.loadSkillTree())===0'),'spent save gets stuck'
   assert not errors,errors;print('PASS tutorial spending',root,'no purchase/no advance, pause, any branch, saved skills, checkpoint and zero-P replay',flush=True);await q.close()
  await b.close()
asyncio.run(main())
