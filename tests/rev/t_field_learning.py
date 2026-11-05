"""Fixtures isolate ownership, actual commit, loadout and result visibility.
Native UI purchases and active AI journeys live in field_learning_live.py.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
  results=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},start=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S},own=ids=>localStorage.setItem('yahaeng.skillTree.v1',JSON.stringify({schema:1,rewardVersion:152,learned:ids})),out=[];
   own([]);let S=start('e1');ok(!S.player.kunai&&!S.player.smokes&&!G.recordFieldSkill('reach','fake')&&!S.fieldSkillUses,'unowned skill credited or free gear');
   own(['kit','dart','smoke']);for(const id of ['p0','p1','p2','e1','e2','e3']){S=start(id);ok(S.player.kunai===2&&S.player.smokes===1,'owned equipment unavailable '+id);S.player.kunai--;S.player.smokes=0;G.syncRuntimeSkills();ok(S.player.kunai===1&&!S.player.smokes,'refresh duplicates equipment');}
   S=start('tB');ok(!S.player.kunai&&!S.player.smokes,'basic rehearsal grants equipment');out.push('owned beginner equipment, bare rehearsal baseline, no refresh duplication');
   own(['silentHands','reach']);S=start('e1');const P=S.player,g=S.guards[0];g.a=0;Object.assign(P,{x:g.x-96,y:g.y,fl:g.fl||0,z:0});ok(G.prepareCombat({k:'kill',g,list:[g],viaZ:true}),'reach intent rejected');ok(!S.fieldSkillUses,'button press counted as success');delete g.takedownIntent;ok(!G.loadFieldLearning().used.reach,'canceled intent recorded');
   G.prepareCombat({k:'kill',g,list:[g],viaZ:true});G.killGuard(g);ok(S.fieldSkillUses?.reach&&G.loadFieldLearning().used.reach,'landed takedown not recorded');const budget=G.skillBudget();ok(!G.recordFieldSkill('reach','duplicate')&&G.skillBudget()===budget,'repeat experience grants rewards');out.push('only committed owned takedowns count, no duplicate rewards');
   own(['kit','dart']);S=start('e1');const t=S.guards[0],shot={x0:t.x-100,y0:t.y,fl:0,z:0,tgt:{type:'guard',ref:t,x:t.x+100,y:t.y,fl:0,z:0}};G.kunaiHit(shot);ok(!S.fieldSkillUses?.dart,'missed dart credited');shot.tgt.x=t.x;G.kunaiHit(shot);ok(S.fieldSkillUses?.dart,'actual dart impact not credited');out.push('misses do not count; a real impact does');
   own(['silentHands','dual']);S=start('e2');let pair=false;for(let n=0;n<3000&&!pair;n++){G.update(.05);if(Math.hypot(S.guards[0].x-S.guards[1].x,S.guards[0].y-S.guards[1].y)<=54&&S.guards[1].wait>2){Object.assign(S.player,{x:912,y:564,outfit:'crew',disguise:'sam'});pair=!!G.assassinOpportunity('dual');}}ok(pair,'authored patrol never creates a real dual opportunity');out.push('real patrol route creates a usable two-guard window without adding guards');
   S=start('tB');ok(!G.recordFieldSkill('dual','loan'),'practice counted');
   own(['silentHands','reach','ambush']);localStorage.setItem('yahaeng.fieldLearning.v1',JSON.stringify({active:'reach',used:{}}));G.start(G.STAGES.findIndex(s=>s.id==='e1'),true);ok(G.skillBudget()-G.skillSpent(G.loadSkillTree())===0,'fixture not zero points');const prep=document.getElementById('brSkills');ok(!prep.hidden&&prep.textContent.includes('접근 암살')&&!prep.querySelector('button'),'zero-point chosen skill has no guidance');
   S=start('e1');G.recordFieldSkill('reach','거리를 좁혀 제압했다');G.showEnd(false);ok(!document.getElementById('endSkills').hidden&&document.getElementById('endSkills').textContent.includes('거리를 좁혀'),'actual experience absent on end screen');own([]);ok(!G.pendingFieldSkill(),'refunded skill still prompted');
   localStorage.clear();ok(!G.loadFieldLearning().active,'new save retains old chosen skill');out.push('chosen skill survives zero points, results retain actual effects, refunds and new saves stay clean');return out;
  }''')
  for w,h in [(1280,800),(390,844),(844,390),(320,568)]:
   await q.set_viewport_size({'width':w,'height':h})
   await q.evaluate('''()=>{localStorage.setItem('yahaeng.skillTree.v1',JSON.stringify({schema:1,rewardVersion:152,learned:['kit','dart','kunai','smoke']}));localStorage.setItem('yahaeng.fieldLearning.v1',JSON.stringify({active:'dart',used:{}}));__game.start(__game.STAGES.findIndex(s=>s.id==='e1'),true)}''')
   assert '다트' in await q.locator('#brSkills').inner_text()
   box=await q.locator('#btnBrGo').evaluate('e=>{const r=e.getBoundingClientRect();return{bottom:r.bottom,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}}')
   assert box['hit']and box['bottom']<=h+1,(w,h,box)
  assert not errors,errors;await b.close();print('PASS FIELD LEARNING:', '; '.join(results),flush=True)
asyncio.run(main())
