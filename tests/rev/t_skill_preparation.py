"""Skills are learned between stages, never as a compulsory or live tutorial action.
Controlled completion fixtures isolate the UI contract; ordinary-RAF journeys test play.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/tutorial-v202';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for width,height,mobile in [(1280,800,False),(390,844,True),(844,390,True)]:
   q=await b.new_page(viewport={'width':width,'height':height},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
   await q.click('#btnSkillsIntro');await q.locator('[data-select="kit"]').click();assert await q.locator('[data-learn="kit"]').is_disabled();assert not await q.evaluate('__game.learnTreeSkill("kit")');await q.click('.skill-detail-close');await q.click('#btnSkillsBack')
   await q.click('#btnQuick');assert await q.evaluate('__game.STAGE.id==="tB"&&__game.STAGE.steps.every(s=>s[4]!=="skills")')
   await q.click('#btnPause');await q.click('#btnSkillsPause');await q.locator('[data-select="kit"]').click();assert await q.locator('[data-learn="kit"]').is_disabled();assert not await q.evaluate('__game.learnTreeSkill("kit")');await q.click('.skill-detail-close');await q.click('#btnSkillsBack');await q.click('#btnResume')
   assert await q.evaluate('__game.skillSpent(__game.loadSkillTree())===0')
   # Completion receipt, not a shortcut used by the separate live journey.
   await q.evaluate('()=>{const G=__game;G.S.over=true;G.showEnd(true)}');await q.locator('#skillScreen').wait_for(state='visible');assert '4P'in await q.locator('#skillSummary').inner_text();assert await q.locator('#skillDetail').is_hidden()
   for skill in ['kit','dart','silentHands','ambush']:
    await q.locator(f'[data-select="{skill}"]').click();await q.locator(f'[data-learn="{skill}"]').click();await q.click('.skill-detail-close')
   assert not (await q.evaluate('__game.campaignSkillState()'))['canLearn'];await q.screenshot(path=str(O/f'preparation-{width}.png'));await q.click('#btnSkillsBack');await q.click('#btnBrGo');await q.evaluate('()=>{while(__game.DLG.modal)__game.advanceDialog();__game.update(.02)}')
   assert await q.evaluate('__game.STAGE.id==="p0"&&__game.skillOn("ambush")&&__game.skillOn("dart")&&__game.S.player.kunai===2&&!__game.input.padWhistle')
   # Even with an unspent earned point, opening the field reference cannot buy.
   await q.evaluate('localStorage.setItem("yahaeng.ch",JSON.stringify({tB:{_clear:true},p1:{_clear:true}}))');await q.click('#btnPause');await q.click('#btnSkillsPause');await q.locator('[data-select="quietStep"]').click();assert await q.locator('[data-learn="quietStep"]').is_disabled();assert not await q.evaluate('__game.learnTreeSkill("quietStep")');assert not await q.evaluate('__game.resetTreeSkills()');await q.click('.skill-detail-close');await q.click('#btnSkillsBack');await q.click('#btnResume')
   await q.evaluate('__game.start(__game.STAGES.findIndex(s=>s.id==="t0"))');assert await q.evaluate('__game.skillOn("ambush")&&__game.skillOn("dart")&&__game.S.player.kunai===2'),'tutorial disables an owned build'
   assert not errors,errors;print('PASS preparation-only learning',width,'first clear, native purchases, field authority, owned tutorial gear');await q.close()
  await b.close()
asyncio.run(main())
