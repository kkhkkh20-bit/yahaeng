"""Native first briefing/HUD checks plus controlled completion and resume cases."""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/review-v172';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else'http://127.0.0.1:8001/public/'
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for width,height,touch in [(1280,800,False),(390,844,True),(844,390,True),(320,740,True)]:
   q=await b.new_page(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto(BASE+'?nostats');await q.wait_for_function('!!window.__game',polling=100)
   await q.click('#btnLedger');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{i}"]')
   await q.wait_for_function('!!__game.warmStatus&&!__game.warmStatus.pending',polling=100)
   await q.evaluate('__game.updateHUD(true)')
   assert await q.locator('#brIdentity .mission-id').count()==2
   assert '클럽 실장'in await q.locator('#brIdentity .target').inner_text() and '제거할 사람'in await q.locator('#brIdentity .target').inner_text()
   assert '장부'in await q.locator('#brIdentity .item').inner_text() and '가져올 물건'in await q.locator('#brIdentity .item').inner_text()
   assert await q.locator('#brTodo').is_hidden(),'optional guard appears as required task'
   assert await q.locator('#brIdentity canvas[data-ready]').count()==2,'actual actor/object art not ready'
   await q.screenshot(path=str(O/f'brief-{width}.png'),full_page=True)
   await q.click('#btnBrGo');await q.keyboard.press('Escape');await q.evaluate('for(let i=0;i<14;i++)__game.advanceGameFrame(.05);__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(1)')
   assert await q.evaluate('__game.nextGoal().routeGuide&&__game.nextGoal().text.includes("관찰")&&!__game.nextGoal().g'),'living guard hijacks mission'
   assert await q.evaluate('__game.goalMarkerCaption(__game.nextGoal(),25).includes("흡연 구역 입구")'),'world marker does not identify the clue'
   assert await q.locator('#missionIdentity .mission-id').count()==2
   assert await q.locator('#missionIdentity button').count()==0,'new action buttons added'
   layout=await q.evaluate('''()=>{const list=[...document.querySelectorAll('#missionIdentity .mission-id')].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,scroll:e.scrollWidth}});return{list,overlap:list[0].right>list[1].x,overflow:list.some(r=>r.scroll>r.width+1||r.right>innerWidth),goal:__game.nextGoal().text}}''');assert not layout['overlap']and not layout['overflow'],layout
   await q.screenshot(path=str(O/f'opening-{width}.png'))
   await q.click('#hud .obj');assert await q.evaluate('__game.hudInspecting()');await q.click('#hud .obj');assert not await q.evaluate('__game.hudInspecting()')
   # Controlled state fixtures: KO is incomplete, actual elimination/item pickup
   # update only their own identity; checkpoint rebuilding keeps both statuses.
   await q.evaluate('''()=>{const G=__game,S=G.S,guard=S.guards.find(g=>!g.target&&!g.civ&&!g.dog);S.koNext=true;G.killGuard(guard);G.updateActionFlow();G.updateHUD(true);if(!G.nextGoal().routeGuide||document.querySelector('#missionIdentity .complete'))throw Error('optional patrol changes contract completion or priority')}''')
   cases=await q.evaluate('''()=>{const G=__game,S=G.S,g=S.guards.find(g=>g.target),c={g,guardId:g.id,ko:true,playerHandled:true,x:g.x,y:g.y,fl:0,z:0};g.state='DEAD';g.unconscious=true;S.corpses.push(c);G.updateHUD(true);const ko=document.querySelector('#missionIdentity .target').innerText;if(!ko.includes('기절')||document.querySelector('#missionIdentity .target').classList.contains('complete'))throw Error('KO is presented as complete');g.unconscious=false;c.ko=false;G.updateHUD(true);if(!document.querySelector('#missionIdentity .target').classList.contains('complete')||document.querySelector('#missionIdentity .item').classList.contains('complete'))throw Error('completion identities are mixed');S.items[0].got=true;G.checkObjective();G.updateHUD(true);if(!S.exitOpen||document.querySelectorAll('#missionIdentity .complete').length!==2||!G.nextGoal().exit)throw Error('completed contract has no exit');G.saveCheckpoint();if(!G.loadCheckpoint())throw Error('checkpoint failed');G.updateHUD(true);if(document.querySelectorAll('#missionIdentity .complete').length!==2)throw Error('resume lost identities');G.start(G.STAGES.findIndex(s=>s.id==='t0'),true);G.updateHUD(true);if(!document.querySelector('#missionIdentity').hidden)throw Error('campaign identities leak into lesson');return['KO remains incomplete','only real target and item complete the contract','resume rebuilds correct identities','lessons keep their own flow']}''')
   assert not errors,errors;rows.append({'viewport':[width,height],'touch':touch,'layout':layout,'controlledCases':cases,'errors':errors});print('PASS mission identity',width,touch,flush=True);await q.close()
  await b.close()
 (O/'identity-checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
