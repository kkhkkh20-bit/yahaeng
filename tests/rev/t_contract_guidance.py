"""Contract02 automatic prerequisites, actual known intel and explicit route overrides.
Controlled progress fixtures validate guidance; not a live full-contract playthrough.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/review-v160';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game',polling=100)
  checks=await q.evaluate('''()=>{
   const G=__game,passed=[],ok=(v,m)=>{if(!v)throw Error(m)},fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m4'));while(G.DLG.modal)G.advanceDialog();return G.S};
   let S=fresh(),P=S.player,collector=S.guards.find(g=>g.tag==='collector'),vip=S.guards.find(g=>g.tag==='vip');
   let at=G.nextGoal();ok(at.g===collector&&at.area,'first auto objective is not known collector area');const first={x:at.x,y:at.y};collector.x+=300;at=G.nextGoal();ok(at.area&&at.x===first.x&&at.y===first.y&&!S.targetIntel[collector.id],'unseen target live position leaked');passed.push('collector first; unseen motion does not update known area');
   G.selectMissionGoal('item:1');ok(G.nextGoal().id==='item:1'&&S.goalManual,'manual objective overridden');const story=S.stories.find(s=>s.d.id==='green');story.found=true;G.selectStory('green');ok(G.nextGoal().story==='green','selected clue overridden');G.selectAutoGoal();ok(G.nextGoal().g===collector,'automatic return fails');passed.push('manual objectives and clues remain user controlled');
   collector.state='DEAD';collector.unconscious=false;S.keyDrop={x:collector.x,y:collector.y,fl:0,key:'red'};ok(G.nextGoal().text.includes('빨간 카드키 줍기'),'dropped red card skipped');P.keys.red=true;S.keyDrop=null;ok(G.nextGoal().x===S.items[0].x,'cash bag not next');S.items[0].got=true;const blue=S.keyItems.find(k=>k.key==='blue');ok(G.nextGoal().x===blue.x&&G.nextGoal().text.includes('파란'),'blue card skipped');blue.got=true;P.keys.blue=true;ok(G.nextGoal().g===vip,'VIP not next');passed.push('dropped red card, cash bag, blue card then VIP');
   vip.state='DEAD';vip.unconscious=false;const memo=S.notes.find(n=>n.gives==='code');ok(G.nextGoal().x===memo.x&&G.nextGoal().text.includes('메모'),'password memo not next');P.keys.code=true;const green=S.keyItems.find(k=>k.key==='green');at=G.nextGoal();ok(at.x===green.x&&at.fl===1,'wrong green card floor');const nav=G.goalNavigation(at);ok(nav.via&&nav.viaTo.fl===1,'real floor connection not offered');P.keys.green=true;ok(G.nextGoal().x===S.items[1].x&&G.nextGoal().fl===0,'contract after green key is not1F');passed.push('memo, real2F card route, then1F contract');
   P.keys.code=false;ok(G.nextGoal().x===S.items[1].x,'already acquired green card forces unnecessary memo');delete P.keys.green;G.setDoor(S.doors.find(d=>d.keyLock==='code'),false);ok(G.nextGoal().x===green.x,'open entrance still forces password memo');G.setDoor(S.doors.find(d=>d.keyLock==='green'),false);ok(G.nextGoal().x===S.items[1].x,'unlocked vault still forces green key');passed.push('already acquired keys and physically opened doors bypass unnecessary preparation');
   S.items[1].got=true;G.checkObjective();ok(S.exitOpen&&G.nextGoal().exit,'finished guide blocks exit');
   S=fresh();P=S.player;const bush=S.bushes[0];Object.assign(P,{x:bush.x,y:bush.y,fl:0,z:0,carrying:{ko:true}});ok(G.nextGoal().recovery,'route overrides body recovery');passed.push('body cleanup and completed exit take precedence');
   G.start(G.STAGES.findIndex(s=>s.id==='t0'));ok(!G.encounterRows(G.S.player,{k:'none'},{k:'grab'},{}).some(r=>r.text==='붙잡기'),'untaught grab prompt in basic lesson');G.start(G.STAGES.findIndex(s=>s.id==='m2'));ok(G.encounterRows(G.S.player,{k:'none'},{k:'grab'},{}).some(r=>r.text==='붙잡기'),'normal contract grab hint removed');passed.push('basic world hints match visible controls; normal hints preserved');return passed;
  }''');assert not errors,errors;await b.close()
 (O/'contract-guidance.json').write_text(json.dumps({'checks':checks,'errors':errors,'method':'Controlled completion/position/open-door fixtures; does not imply a full mission playthrough.'},ensure_ascii=False,indent=2));print('PASS','; '.join(checks))
asyncio.run(main())
