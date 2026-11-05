"""Progression, earned growth and real-rule fixtures; native journeys are separate."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
  checks=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.update(.05);return G.S},tick=t=>{for(let n=0;n<t;n+=.01)G.update(.01)},out=[];
   const records={p0:{_clear:true},p1:{_clear:true},p2:{_clear:true}};localStorage.setItem('yahaeng.ch',JSON.stringify(records));ok(G.STAGES[G.recommendedStage()].id==='e1','v194 first night jumps straight to VIP');
   for(const id of ['e1','e2','e3']){const S=fresh(id);ok(!G.STAGE.tutorial&&!G.STAGE.steps&&!S.player.kunai&&!G.loadSkillTree().learned.length,'loaned skills or rehearsal '+id);ok(G.objectiveLines().length===1&&G.cpReady()&&!S.exitOpen,'initial goal/checkpoint '+id);ok(G.skillRewardRows(G.STAGE).length===1&&G.skillRewardRows(G.STAGE)[0].points===1,'reward curve '+id);G.showEnd(false);ok(!G.skillRewardRows(G.STAGE)[0].earned,'failure earns growth');G.loadCheckpoint();G.showEnd(true);ok(!document.getElementById('endSkills').hidden&&document.getElementById('endSkills').textContent.includes('기술'),'earned points have no spending notice');const budget=G.skillBudget();ok(budget===7+['e1','e2','e3'].indexOf(id),'growth budget '+id);G.showEnd(true);ok(G.skillBudget()===budget,'replay farms points '+id);}
   ok(G.STAGES[G.recommendedStage()].id==='m2','three beginner clears do not lead to VIP');out.push('first night → three actual episodes → VIP; earned1P per first clear, no failure/replay rewards or free skills');
   localStorage.clear();let S=fresh('e1');ok(S.guards.length===2&&S.guards[0].target&&S.guards[0].route.length===2&&!S.cams.length&&!S.items.length,'moving-target episode overloaded');const x=S.guards[0].x;tick(1);ok(S.guards[0].x!==x,'authored target never moves');out.push('one moving target and one guard before combined objectives');
   S=fresh('e2');const P=S.player,c=S.cams[0],it=S.items[0];ok(S.guards.length===2&&S.cams.length===1&&S.items.length===1&&S.camRoom,'combined episode has no recoverable recording');
   Object.assign(P,{x:it.x,y:it.y});G.actEnv();tick(1.5);ok((S.stats.camRec||0)>0&&G.evidencePending()&&!S.exitOpen&&!S.over,'recorded theft cannot be recovered');ok(G.nextGoal().where==='골목 관리 단말','recovery does not identify the actual terminal');
   Object.assign(P,{x:S.camRoom.x,y:S.camRoom.y,vx:0,vy:0});G.doAct({k:'camroom',at:S.camRoom,targetObject:S.camRoom,label:'기록 삭제'});tick(4);ok(!G.evidencePending()&&S.exitOpen,'management terminal does not recover the mission');out.push('CCTV uses real recording; a mistake can be erased and recovered without restarting the episode');
   S=fresh('e3');ok(S.guards.length===1&&!S.cams.length&&S.items[0].fl===1,'stairs episode overload');const l=S.ladders.find(l=>l.kind==='fstair');ok(l,'no ordinary staircase');const at=G.stairUpper(l).down.entry;Object.assign(S.player,{x:at.x,y:at.y,fl:1,z:0,outfit:'crew',disguise:'sam'});G.setLayer(1);tick(.8);ok(G.CP.S.player.fl===1,'new upstairs progress does not save');ok(!G.S.items[0].got,'stairs complete the document remotely');out.push('a small two-floor contract saves real floor progress without completing the item');
   localStorage.setItem('yahaeng.ch',JSON.stringify({m2:{_clear:true}}));ok(G.STAGES[G.recommendedStage()].id==='m4','returning player forced into beginner episodes');ok(G.mainContracts().map(G.contractNumber).join()==='01,02,03,04','main record numbering changed');return out;
  }''')
  for w,h in [(1280,800),(390,844),(844,390),(320,568)]:
   await q.set_viewport_size({'width':w,'height':h})
   for id in ['e1','e2','e3']:
    await q.evaluate('id=>__game.start(__game.STAGES.findIndex(s=>s.id===id),true)',id)
    box=await q.locator('#btnBrGo').bounding_box();assert box and box['y']>=0 and box['y']+box['height']<=h+1,(w,h,id,box)
    await q.click('#btnBrGo');await q.evaluate('__game.update(.1);__game.updateHUD(true)')
    assert await q.evaluate('(()=>{const e=document.getElementById("objective");return e.scrollHeight<=e.clientHeight+1})()'),(w,h,id,'clipped goal')
  await q.click('#btnPause');await q.click('#btnMenu2');assert await q.locator('.lg-sec.chapter:visible').count()==3,'growth chapters not visible'
  assert not errors,errors;await b.close();print('PASS GROWTH:', '; '.join(checks),flush=True)
asyncio.run(main())
