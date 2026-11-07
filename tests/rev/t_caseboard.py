"""Controlled evidence, checkpoint and legacy fixtures; real modal keyboard/touch UI.
Native AI-on assassination is covered separately by officer_hunt_live.py.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
O=R/'build/hunt-v206';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
  await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game',polling=100)
  await q.locator('#intro [data-case-open]').click()
  assert await q.locator('#caseBoard').is_visible()
  assert await q.locator('#caseHierarchy canvas').count()==0
  text=await q.locator('#caseBoard').inner_text()
  assert all(name not in text for name in ['윤서경','까마귀','강도윤','문서윤','의장']),text
  assert await q.evaluate('localStorage.getItem("yahaeng.case.v1")===null'),'viewing creates a campaign save'
  await q.keyboard.press('Escape');await q.wait_for_function('!document.getElementById("caseBoard").open')
  assert await q.locator('#intro [data-case-open]').evaluate('e=>e===document.activeElement')
  checks=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();return G.S},v=id=>G.caseView().find(n=>n.id===id);
   let S=fresh('p0'),g=S.guards.find(g=>g.target);
   G.saveCheckpoint();const budget=G.skillBudget();S.koNext=true;G.killGuard(g);G.syncCaseProgress(true);
   ok(!G.loadCaseFile().sources.includes('runner-down')&&!v('runner').eliminated,'KO granted a kill or lead');
   g.unconscious=false;S.corpses.find(c=>c.g===g).ko=false;G.syncCaseProgress(true);
   ok(v('runner').eliminated&&v('contact').level===1,'kill did not reveal next contact');
   ok(G.skillBudget()===budget,'intel grants points');const stored=JSON.stringify(G.loadCaseFile());G.syncCaseProgress(true);ok(JSON.stringify(G.loadCaseFile())===stored,'duplicate clue');
   ok(G.loadCheckpoint()&&!v('runner').eliminated&&!G.S.exitOpen,'retry resurrected a confirmed death flag or unlocked escape');ok(v('contact').level===1,'retry forgot player knowledge');
   S=fresh('m2');S.items[0].got=true;G.syncCaseProgress(true);ok(v('collector').level===0,'one undeciphered ledger reveals a name');
   g=S.guards.find(g=>g.tag==='vip');G.killGuard(g);G.syncCaseProgress(true);ok(v('collector').level===1,'club kill did not reveal money branch');
   S.items[1].got=true;G.syncCaseProgress(true);ok(v('collector').level===3&&v('district').level===3,'cipher pair did not identify money bosses');
   S=fresh('m5');g=S.guards.find(g=>g.target);G.killGuard(g);G.syncCaseProgress(true);ok(v('chair').level===1,'crow alone reveals mastermind name');
   S.items[0].got=true;G.syncCaseProgress(true);ok(v('chair').level===3,'crow and original ledger did not reveal final name');
   ok(G.recommendedStage()>=0&&G.STAGES[G.recommendedStage()].id==='tB','knowledge skips unfinished episodes');
   localStorage.setItem('yahaeng.ch',JSON.stringify(Object.fromEntries(G.LEARNING_ROUTE.filter(id=>id!=='n1').map(id=>[id,{_clear:true}]))));
   const oldBudget=G.skillBudget();ok(G.STAGES[G.recommendedStage()].id==='n1','v205 all-clear player cannot reach new ending');ok(!JSON.parse(localStorage.getItem('yahaeng.ch')).n1&&G.skillBudget()===oldBudget,'migration invented rewards');
   localStorage.setItem('yahaeng.ch',JSON.stringify({m2:{_clear:true}}));fresh('m4');ok(!v('runner').eliminated&&v('runner').severed,'skipped introductory officers marked dead');
   S=fresh('n1');g=S.guards.find(g=>g.target);ok(g&&S.guards.filter(g=>g.target).length===1,'finale target roster');
   ok(G.characterLook(g)==='castChair@femaleSuit'&&G.speakerOf(g).role.includes('의장'),'mastermind lacks distinct identity');ok(G.episodeRadioMessage()===null,'dead handler guides finale');
   ok(S.items.length===1&&S.items[0].fl===1,'finale evidence does not use second floor');
   G.setLayer(S.items[0].fl);ok(!G.solidAt(Math.floor(S.items[0].x/48),Math.floor(S.items[0].y/48)),'final evidence inside wall');G.setLayer(0);
   ok(!S.props.some(p=>p.k==='outfit')&&!S.guards.some(g=>g.fac==='B'),'finale has loose clothing or rival helpers');
   S.items[0].got=true;S.koNext=true;G.killGuard(g);G.checkObjective();G.syncCaseProgress(true);ok(!S.exitOpen&&!v('chair').eliminated,'unconscious mastermind completes game');
   g.unconscious=false;S.corpses.find(c=>c.g===g).ko=false;G.checkObjective();G.syncCaseProgress(true);ok(S.exitOpen&&v('chair').eliminated&&G.loadCaseFile().sources.includes('root-cut'),'final kill and original command ledger do not complete hunt');ok(!G.DLG.cur||G.DLG.cur.speaker.name!=='까마귀','dead handler speaks after final objective');
   G.showEnd(true);ok(document.getElementById('endSub').textContent.includes('지휘망'),'final ending lacks payoff');
   ok(G.mainContracts().map(G.contractNumber).join()==='01,02,03,04,05,06','legacy numbers changed');
   return ['KO vs kill intel','cipher-gated identities','mastermind gated by kill plus ledger','checkpoint knowledge without phantom deaths','old clears continue at new finale without rewards','legacy skipped officers not marked dead','new finale upper-floor evidence and nonlethal distinction'];
  }''')
  assert not errors,errors
  await q.close()
  for w,h,touch in [(1280,800,False),(390,844,True),(844,390,True),(320,568,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game',polling=100)
   await q.evaluate('''()=>{localStorage.setItem('yahaeng.ch',JSON.stringify(Object.fromEntries(__game.LEARNING_ROUTE.filter(id=>id!=='n1').map(id=>[id,{_clear:true}]))));__game.start(__game.STAGES.findIndex(s=>s.id==='n1'),true)}''')
   assert await q.locator('#btnBrGo').evaluate('e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.bottom<=innerHeight+1&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),(w,h,'launch CTA obscured')
   await q.locator('#caseBrief [data-case-open]').click();await q.wait_for_timeout(150)
   assert await q.locator('[data-case-node="chair"]').inner_text()== '윤서경 · 의장\n동선 확보'
   assert not await q.evaluate('document.documentElement.scrollWidth>innerWidth'),(w,h,'page overflow')
   assert await q.locator('#btnCaseClose').evaluate('e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}'),(w,h,'close out of view')
   await q.keyboard.press('ArrowRight');await q.keyboard.press('KeyZ');await q.keyboard.press('KeyK')
   assert await q.evaluate('!__game.S.keys.ArrowRight&&!__game.S.keys.KeyZ&&document.getElementById("skillScreen").hidden'),'modal keys leaked into game'
   for _ in range(12):
    await q.keyboard.press('Tab');assert await q.evaluate('document.getElementById("caseBoard").contains(document.activeElement)'),'focus escaped native modal'
   await q.screenshot(path=str(O/f'board-{w}.png'))
   await q.locator('#btnCaseClose').click();await q.wait_for_timeout(30)
   assert await q.locator('#brief').is_visible() and await q.locator('#caseBrief [data-case-open]').evaluate('e=>e===document.activeElement')
   await q.evaluate('''()=>{__game.start(__game.STAGES.findIndex(s=>s.id==='n1'));for(let i=0;i<60&&__game.DLG.modal;i++)__game.advanceDialog();__game.S.over=true;__game.showEnd(true)}''')
   await q.locator('#skillScreen').wait_for(state='visible')
   assert await q.locator('#btnSkillsBack').evaluate('e=>{const r=e.getBoundingClientRect();return r.bottom<=innerHeight+1&&r.y>=0&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),(w,h,'training CTA obscured')
   await q.locator('#caseTraining [data-case-open]').click();await q.keyboard.press('Escape');await q.wait_for_timeout(30);assert await q.locator('#skillScreen').is_visible()
   await q.close()
  assert not errors,errors
  await b.close()
 (O/'checks.json').write_text(json.dumps({'checks':checks,'viewports':[1280,390,844,320],'errors':errors,'method':__doc__},ensure_ascii=False,indent=2))
 print('PASS caseboard',checks)
asyncio.run(main())
