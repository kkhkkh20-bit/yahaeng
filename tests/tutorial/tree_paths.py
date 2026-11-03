"""Native inspection, complete prerequisite routes and achievement panel at four sizes."""
import asyncio,json,sys,os
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/skills-v152';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else'http://127.0.0.1:8001/public/'
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None);results=[]
  for mode,w,h,touch in [('desktop',1440,900,False),('mobile',390,844,True),('landscape',844,390,True),('small',320,568,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(BASE,timeout=120000);await q.wait_for_function('!!window.__game',timeout=120000)
   await q.click('#btnLedger');await q.click('#btnSkillsLedger');assert await q.locator('#skillDetail').is_hidden();assert await q.locator('.skill-tree:visible').count()==3;assert await q.locator('[data-node]').count()==27
   geometry=await q.evaluate('''()=>{const G=__game,button=[...document.querySelectorAll('[data-select]')];for(const branch of Object.keys(G.SKILL_BRANCHES)){const p=G.skillTreeLayout(branch).positions;for(const d of G.SKILL_TREE.filter(d=>d.branch===branch))for(const id of d.req)if(p[d.id].row!==p[id].row+1)throw Error('False tier '+d.id);}return{pageOverflow:document.documentElement.scrollWidth>innerWidth,minButton:Math.min(...button.map(b=>Math.min(b.offsetWidth,b.offsetHeight))),branches:[...document.querySelectorAll('.skill-tree')].map(n=>getComputedStyle(n).display)};}''');assert not geometry['pageOverflow']and geometry['minButton']>=44,geometry
   await q.evaluate('__game.drawSkillLinks()');await q.screenshot(path=str(O/f'overview-{mode}.png'))
   await q.locator('[data-select="signal"]').click();assert await q.locator('[data-path]').count()==4;assert await q.locator('.skill-node.in-path').count()==4;assert await q.locator('.skill-links path.in-path').count()==3;assert '7P' in await q.locator('.skill-prereqs').inner_text();assert await q.locator('[data-learn="signal"]').is_disabled();assert not await q.evaluate('__game.loadSkillTree().learned.length')
   assert await q.locator('#skillDetail').evaluate('(p)=>{const r=p.getBoundingClientRect();return r.right<=innerWidth&&r.left>=0&&r.bottom<=innerHeight}')
   await q.keyboard.press('Escape');assert await q.locator('#skillDetail').is_hidden();assert await q.locator('#skillScreen').is_visible()
   await q.locator('[data-select="reach"]').click();await q.evaluate('__game.drawSkillLinks()');await q.screenshot(path=str(O/f'detail-{mode}.png'));await q.locator('[data-path="silentHands"]').click();assert await q.locator('#skillDetail h3').inner_text()=='제압 숙련';await q.locator('[data-learn="silentHands"]').click();assert await q.evaluate('__game.skillBudget()-__game.skillSpent(__game.loadSkillTree())===3')
   await q.locator('.skill-detail-close').click();await q.locator('[data-select="reach"]').click();await q.locator('[data-learn="reach"]').click();assert await q.evaluate('__game.loadSkillTree().learned.includes("reach")&&__game.skillBudget()-__game.skillSpent(__game.loadSkillTree())===1')
   await q.locator('.skill-detail-close').click();await q.click('#btnSkillRewards');assert await q.locator('.skill-reward-mission').count()==3;assert '아무도 해치지 않기' in await q.locator('#skillDetail').inner_text();await q.screenshot(path=str(O/f'rewards-{mode}.png'));await q.keyboard.press('Escape');await q.keyboard.press('Escape');assert await q.locator('#ledger').is_visible();assert not errors,errors
   results.append({'mode':mode,'viewport':[w,h],'geometry':geometry,'unfoldedNodes':27,'realEdges':24,'path':['kit','radio','hack','signal'],'pathCost':7,'rightInspector':True,'realPurchases':['silentHands','reach'],'remainingPoints':1,'missionRewardPanels':3,'pageErrors':errors});print('PASS',mode,flush=True);await q.close()
  (O/'tree-paths.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));await b.close()
asyncio.run(main())
