"""Original circle graph, meaningful state and native purchases at PC/touch sizes."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from episode_training import select_skill_node
R=Path(__file__).resolve().parents[2];O=R/'build/design-v251'
async def main(url=None):
 O.mkdir(exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h in [(320,568),(390,844),(844,390),(1024,768),(1440,900)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=w<1000,is_mobile=w<1000);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear();localStorage.setItem("yahaeng.ch",JSON.stringify({tB:{_clear:true},p0:{_clear:true},e2:{_clear:true},m2:{_clear:true}}))');await q.goto(url or (R/'build/preview_city.html').as_uri());await q.wait_for_function('__game?.officeReady()',polling=100);await q.click('#btnSkillsIntro');budget=await q.evaluate('__game.skillBudget()');assert budget==4
   for branch,n in [('body',8),('assassin',9),('tools',10)]:
    await q.click(f'#skillBranches [data-branch="{branch}"]');assert await q.locator('.skill-tree:visible').count()==(1 if w<1000 else 3);assert await q.locator('.branch-active [data-select]').count()==n
    await q.evaluate('__game.drawSkillLinks()');assert await q.locator('.skill-links path').count()==(n-1 if w<1000 else 24)
    layout=await q.evaluate('''()=>{const s=document.getElementById('skillScreen'),b=document.getElementById('skillBoard'),r=b.getBoundingClientRect(),buttons=[...document.querySelectorAll('.branch-active [data-select]')];return{overflow:s.scrollWidth>innerWidth+1||(innerWidth<1000&&b.scrollWidth>b.clientWidth+1),small:buttons.some(e=>e.offsetWidth<44||e.offsetHeight<44),empty:buttons.some(e=>!e.closest('[data-node]').querySelector('.skill-label').textContent),offscreen:r.left<0||r.right>innerWidth+1};}''');assert not any(layout.values()),(w,branch,layout)
   await select_skill_node(q,'signal');assert '선행 기술 필요' in await q.locator('#skillDetail').inner_text();assert '7P' in await q.locator('.skill-prereqs').inner_text();assert await q.locator('[data-learn="signal"]').is_disabled();assert not await q.evaluate('__game.loadSkillTree().learned.length'),'inspection spent points'
   pane=await q.locator('#skillDetail').bounding_box();assert pane['x']>=0 and pane['y']>=0 and pane['x']+pane['width']<=w+1 and pane['y']+pane['height']<=h+1,(w,pane)
   if w==1440:
    await q.set_viewport_size({'width':390,'height':844});await q.wait_for_timeout(100);assert await q.locator('#skillBoard').evaluate('e=>e.inert');await q.set_viewport_size({'width':w,'height':h});await q.wait_for_timeout(100);assert not await q.locator('#skillBoard').evaluate('e=>e.inert')
   if w<1000:
    assert await q.locator('#skillDetail').get_attribute('aria-modal')=='true';assert await q.locator('#skillBoard').evaluate('e=>e.inert')
    for _ in range(14):
     await q.keyboard.press('Tab');assert await q.evaluate('!!document.activeElement.closest("#skillDetail")'),'focus escaped mobile inspector'
   await q.keyboard.press('Escape');assert await q.locator('#skillDetail').is_hidden();assert not await q.locator('#skillBoard').evaluate('e=>e.inert')
   await select_skill_node(q,'kit');assert await q.locator('[data-learn="kit"]').is_enabled();await q.locator('[data-learn="kit"]').click();assert await q.evaluate('__game.loadSkillTree().learned.join()==="kit"&&__game.skillBudget()-__game.skillSpent(__game.loadSkillTree())===3');assert await q.locator('[data-node="kit"]').get_attribute('data-state')=='learned';await q.click('.skill-detail-close')
   await select_skill_node(q,'dart');assert await q.locator('[data-learn="dart"]').is_enabled();await q.locator('[data-learn="dart"]').click();assert await q.evaluate('__game.skillSpent(__game.loadSkillTree())===2');await q.click('.skill-detail-close')
   await select_skill_node(q,'quietStep');assert await q.locator('[data-learn="quietStep"]').is_enabled();await q.screenshot(path=str(O/f'detail-{w}.png'));await q.click('.skill-detail-close');await q.screenshot(path=str(O/f'tree-{w}.png'))
   await q.click('#btnSkillReset');assert await q.evaluate('__game.loadSkillTree().learned.length===0&&__game.skillBudget()===4'),'refund changed finite budget';await q.keyboard.press('Escape');assert await q.locator('#intro').is_visible()
   await q.evaluate("localStorage.clear();__game.start(__game.STAGES.findIndex(s=>s.id==='tB'));while(__game.DLG.modal)__game.advanceDialog();__game.S.over=true;__game.showEnd(true)")
   await q.wait_for_selector('#skillScreen',state='visible');assert await q.evaluate('__game.skillBudget()===1')
   assert await q.locator('#btnSkillsBack').evaluate('e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight}'),'training continue is clipped'
   assert await q.evaluate('document.getElementById("skillScreen").scrollWidth<=innerWidth+1'),'training header overflows'
   assert not errors,errors;print('PASS original skill tree',w,h,'all branches, effect/cost/state, locked path, focus, real purchase/refund',flush=True);await q.close()
  await b.close()
asyncio.run(main())
