"""Circle selection inspects without spending; details and prerequisites drive learning."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/skills-v152';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1440,'height':900});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();localStorage.setItem("yahaeng.ch",JSON.stringify({tB:{_clear:true},p0:{_clear:true},p1:{_clear:true},p2:{_clear:true}}));localStorage.setItem("yahaeng.skillTree.v1",JSON.stringify({schema:1,rewardVersion:152,legacyPoints:0,learned:[]}))');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game');await q.click('#btnSkillsIntro')
  assert await q.locator('#skillDetail').is_hidden()
  assert await q.locator('[data-node]').count()==27
  assert await q.locator('.skill-tree:visible').count()==3
  assert await q.locator('#skillLoadout [aria-pressed="true"]').count()==0,'Unlearned skill looks equipped'
  assert await q.locator('[data-node] > button > svg').count()==27,'Rendering links removes the skill symbols'
  assert await q.locator('.skill-links path').count()==24,'Prerequisite graph differs from game data'
  for branch in ['tools','body','assassin','tools']:
   await q.locator('button[data-branch="'+branch+'"]').click()
  assert await q.locator('[data-node] > button > svg').count()==27,'Branch switching destroys symbols'
  await q.locator('[data-select="electric"]').click()
  assert await q.locator('#skillDetail h3').text_content()=='배전반 조작'
  assert await q.locator('[data-learn="electric"]').is_disabled()
  assert await q.evaluate('!__game.loadSkillTree().learned.length'),'Inspecting a node purchases it'
  await q.locator('#skillDetail .skill-prereqs button').first.click()
  assert await q.locator('#skillDetail h3').text_content()=='현장 장비'
  assert await q.locator('[data-select="kit"]').evaluate('(b)=>b===document.activeElement'),'Prerequisite link does not move keyboard focus'
  await q.locator('[data-learn="kit"]').click();await q.locator('[data-select="electric"]').click();await q.locator('[data-learn="electric"]').click()
  assert await q.evaluate('__game.loadSkillTree().learned.join(",")==="kit,electric"&&__game.skillBudget()-__game.skillSpent(__game.loadSkillTree())===2')
  assert await q.locator('[data-node="electric"]').evaluate('(n)=>n.classList.contains("learned")')
  await q.locator('[data-select="quietStep"]').click();await q.locator('[data-learn="quietStep"]').click();await q.locator('[data-select="silentHands"]').click();await q.locator('[data-learn="silentHands"]').click()
  await q.locator('[data-select="dual"]').click();assert '포인트 부족' in await q.locator('#skillDetail').text_content();assert await q.locator('[data-learn="dual"]').is_disabled()
  await q.locator('[data-select="silentHands"]').focus();await q.keyboard.press('ArrowDown');assert await q.locator('#skillDetail h3').text_content()!='제압 숙련'
  assert await q.evaluate('__game.loadSkillTree().learned.length===4'),'Keyboard navigation spends points'
  await q.locator('[data-select="electric"]').click();await q.screenshot(path=str(O/'learned-pc.png'))
  await q.click('#btnSkillReset');assert await q.evaluate('!__game.loadSkillTree().learned.length');assert await q.locator('[data-node].learned').count()==0
  await q.keyboard.press('Escape');assert await q.locator('#skillDetail').is_hidden()
  await q.click('#btnSkillRewards');assert await q.locator('.skill-reward-mission').count()==4
  await q.keyboard.press('Escape');await q.keyboard.press('Escape');assert await q.locator('#intro').is_visible()
  assert not errors,errors
  (O/'diagram-checks.json').write_text(json.dumps({'nodes':27,'actualPrerequisiteEdges':24,'iconsSurviveBranchChanges':True,'inspectDoesNotPurchase':True,'prerequisiteNavigation':True,'realPointPurchases':True,'insufficientPointsBlocked':True,'arrowNavigation':True,'refundAndEscape':True,'pageErrors':errors},ensure_ascii=False,indent=2));print('PASS circle inspection, 27 icons, 24 real edges, prerequisite focus, learning, insufficient points, keyboard, refund and return');await b.close()
asyncio.run(main())
