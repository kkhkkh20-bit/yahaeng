"""Preparation and rewards offer real purchases without starting time or spending for the user."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/skill-rhythm-v188';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for width,height,mobile in [(1280,800,False),(390,600,True),(844,390,True)]:
   q=await b.new_page(viewport={'width':width,'height':height},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
   await q.click('#btnLedger');idx=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{idx}"]');await q.wait_for_function('!__game.warmStatus.pending',polling=100)
   assert '4P'in await q.locator('#brSkills').inner_text();assert '은신 기습'in await q.locator('#brSkills').inner_text()
   await q.locator('#brSkills button').click();assert await q.locator('#skillScreen').is_visible();assert '제압 숙련'in await q.locator('#skillDetail h3').inner_text()
   assert await q.evaluate('__game.skillSpent(__game.loadSkillTree())===0'),'guidance auto-spends points'
   await q.locator('[data-learn="silentHands"]').click();await q.locator('[data-next-plan="ambush"]').click();await q.locator('[data-learn="ambush"]').click()
   assert await q.evaluate('__game.skillSpent(__game.loadSkillTree())===2')
   if await q.locator('.skill-detail-close').is_visible():await q.locator('.skill-detail-close').click()
   await q.click('#btnSkillsBack');assert await q.locator('#brief').is_visible();assert '2P'in await q.locator('#brSkills').inner_text()
   box=await q.locator('#btnBrGo').evaluate('e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,h:r.height,w:r.width,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}}')
   assert box['hit']and box['y']+box['h']<=height+1,box
   await q.screenshot(path=str(O/f'prepare-{width}.png'));await q.click('#btnBrGo');await q.keyboard.press('Escape')
   await q.evaluate('for(let i=0;i<10;i++)__game.advanceGameFrame(.05);__game.updateHUD(true)')
   assert await q.evaluate('__game.S.skills.ambush&&__game.S.skills.silentHands&&__game.S.t>0')
   assert await q.locator('#btnPause').get_attribute('data-points')=='2'
   await q.click('#btnPause');await q.click('#btnSkillsPause');assert not await q.evaluate('__game.resetTreeSkills()'),'field reset allowed'
   await q.click('#btnSkillsBack');await q.click('#btnResume')
   # Completion fixture verifies the between-mission return path and real reward budget.
   await q.evaluate('()=>{const G=__game,S=G.S;S.guards.filter(g=>g.target).forEach(g=>{g.state="DEAD";g.unconscious=false});S.items.forEach(i=>i.got=true);S.over=true;G.showEnd(true)}')
   assert await q.locator('#endSkills').is_visible();await q.locator('#endSkills button').click();assert await q.locator('#end').is_hidden()
   if await q.locator('.skill-detail-close').is_visible():await q.locator('.skill-detail-close').click()
   await q.click('#btnSkillsBack');assert await q.locator('#end').is_visible();assert await q.evaluate('__game.S.over')
   assert not errors,errors;print('PASS skill preparation',width,'native purchases, return to briefing/end, no auto-spend, departure visible',flush=True);await q.close()
  await b.close()
asyncio.run(main())
