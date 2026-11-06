"""Linear route and episode spending gates. Controlled results, real UI purchases."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from episode_training import spend_episode_points
R=Path(__file__).resolve().parents[2];O=R/'build/linear-v198';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h in [(1440,900),(390,844),(844,390),(320,568)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=w!=1440);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   assert await q.locator('#btnLedger').is_hidden()
   await q.click('#btnQuick');assert await q.evaluate('__game.STAGE.id==="tB"')
   await q.evaluate('''()=>{const G=__game;G.S.over=true;G.showEnd(true);if(G.skillSpent(G.loadSkillTree()))throw Error('automatic purchase');}''')
   assert await q.locator('#skillScreen').is_visible() and await q.locator('#btnNext').is_hidden()
   assert await q.locator('#btnSkillReset').is_hidden()
   assert await q.locator('#btnSkillsBack').get_attribute('aria-disabled')=='false'
   assert not await q.evaluate('__game.resetTreeSkills()')
   # Choosing a nonrecommended root is real user input; every choice stays free.
   await q.click('[data-select="silentHands"]');await q.click('[data-learn="silentHands"]');await q.click('.skill-detail-close')
   assert await q.evaluate('__game.loadSkillTree().learned.join()=== "silentHands"')
   await spend_episode_points(q)
   c=await q.locator('#btnSkillsBack').evaluate('e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}}')
   assert c['x']>=0 and c['x']+c['w']<=w+1 and c['y']>=0 and c['y']+c['h']<=h+1 and c['hit'],c
   assert not await q.evaluate('document.documentElement.scrollWidth>innerWidth')
   await q.screenshot(path=str(O/f'training-{w}.png'));await q.click('#btnSkillsBack')
   assert await q.evaluate('__game.STAGE.id==="p0"&&__game.S.guards.length===1&&!__game.S.cams.length')
   # Every subsequent canonical result opens training, even with a used budget.
   await q.evaluate('''()=>{const G=__game;G.S.over=true;G.showEnd(true);}''')
   assert await q.locator('#skillScreen').is_visible()
   await spend_episode_points(q);await q.click('#btnSkillsBack');assert await q.evaluate('__game.STAGE.id==="p1"')
   assert await q.locator('#ledger').is_hidden()
   # Real saved progress survives return to title and resumes the first unfinished stage.
   await q.click('#btnBrBack');assert await q.locator('#intro').is_visible()
   await q.click('#btnQuick');assert await q.evaluate('__game.STAGE.id==="p1"')
   # An affordable unspent point is also permitted to carry over.
   await q.evaluate('''()=>{const G=__game;localStorage.clear();G.start(G.STAGES.findIndex(s=>s.id==='tB'));G.S.over=true;G.showEnd(true);if(G.campaignSkillState().points!==1)throw Error('first reward');G.closeAssassinMenu();if(!document.querySelector('#skillScreen').hidden||G.loadSkillTree().learned.length)throw Error('banking forces a purchase');}''')
   await q.evaluate('''()=>{const G=__game;localStorage.clear();G.start(G.STAGES.findIndex(s=>s.id==='m7'));G.S.over=true;G.showEnd(false);if(!document.querySelector('#skillScreen').hidden)throw Error('failure opened training');if(document.querySelector('#btnRetry').hidden)throw Error('retry missing');localStorage.setItem('yahaeng.ch',JSON.stringify(Object.fromEntries(['tB','p0','p1','p2','e1','e2','e3','e4','e5','m2','m4','m6','m7','m5'].map(id=>[id,{_clear:true}]))));if(G.recommendedStage()!==-1)throw Error('finished story restarts');}''')
   assert not errors,errors;print('PASS linear training',w,'free choices, gated escape, real purchases, progression, carryover, retry, completion',flush=True);await q.close()
  await b.close()
asyncio.run(main())
