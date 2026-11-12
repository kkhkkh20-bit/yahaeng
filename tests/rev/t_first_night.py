"""Controlled first-night rule fixtures, separate from native ordinary-RAF journeys.
Checks real perception, timed theft, failure recovery and earned-save compatibility.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]

async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
  await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
  checks=await q.evaluate('''()=>{
   const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.update(.02);return G.S},tick=t=>{for(let n=0;n<t;n+=.01){G.update(.01);if(G.S.over)break;}};
   for(const id of ['p0','p1','p2']){const S=fresh(id);ok(G.cpReady()&&!S.exitOpen,'initial checkpoint/exit '+id);ok(!S.player.kunai&&!G.abilityOn('ambush')&&!G.abilityOn('electric')&&!G.loadSkillTree().learned.length,'free skills '+id);ok(G.objectiveLines().length===1,'multiple current goals '+id);}
   out.push('three real contracts start safely with one goal and no free skills');
   for(const id of ['p0','m2','m4','m7']){
    const S=fresh(id),P=S.player,g=S.guards.find(g=>g.target);S.guards=[g];S.cams=[];Object.assign(P,{x:P.x,y:P.y,fl:0,z:0,mode:'sneak',cover:null,hidden:false});Object.assign(g,{x:P.x+28,y:P.y,fl:0,z:0,a:0,state:'PATROL'});G.setLayer(0);
    const a={k:'kill',list:[g]};ok(G.combatLabel(a).label==='표적 기절'&&G.combatLabel(a).hold==='살해','target button '+id);ok(G.prepareCombat(a)&&!g.takedownIntent.lethal,'target intent '+id);
    S.spare=true;ok(!g.takedownIntent.lethal,'spare target forced lethal '+id);S.spare=false;
   }
   out.push('tap is nonlethal for all human targets; deliberate hold required; spare mode preserved');
   let S=fresh('p1'),P=S.player,donor=S.guards.find(g=>g.tag==='uniformDonor'),g=S.guards.find(g=>g.tag==='lightKeeper');ok(S.guards.length===4&&!S.cams.length&&!S.items.length,'second contract should add overlapping guards, not cameras');
   S.koNext=true;G.killGuard(donor);Object.assign(P,{x:donor.x-32,y:donor.y});G.actCarry(G.envChoices().find(a=>a.k==='dress'));tick(3.3);ok(P.outfit==='crew'&&S.corpses.find(c=>c.g===donor)?.stripped,'uniform was not obtained from subdued guard');
   S=fresh('p1');P=S.player;g=S.guards.find(g=>g.tag==='lightKeeper');Object.assign(P,{outfit:'crew',disguise:'sam'});S.guards=[g];Object.assign(g,{x:696,y:408,a:0,want:0});Object.assign(P,{x:776,y:408,mode:'walk'});tick(.5);ok(G.zoneInfo(P.x,P.y,0,0).allow.includes('crew')&&!g.seen&&g.state==='PATROL'&&!S.stats.detected,'legal ordinary walking causes suspicion');
   S=fresh('p2');P=S.player;const it=S.items[0];S.guards=[];Object.assign(P,{x:it.x,y:it.y,fl:it.fl,outfit:'crew',vx:0,vy:0});G.setLayer(P.fl);tick(.1);ok(!it.got,'paper automatically collected');G.actEnv();tick(.7);ok(!it.got&&P.pick,'theft finishes too early');tick(.7);ok(it.got&&S.exitOpen&&!S.stats.detected,'behind-guard theft');
   G.showEnd(true);const points=G.skillBudget();ok(points===2,'first earned point');G.showEnd(true);ok(G.skillBudget()===points,'duplicate reward');out.push('real wardrobe, legal guard sight, interruptible paper theft and single earned reward');
   localStorage.clear();S=fresh('e1');P=S.player;S.guards=[];Object.assign(P,{x:S.items[0].x,y:S.items[0].y,fl:S.items[0].fl,outfit:'crew'});G.setLayer(P.fl);G.actEnv();tick(2.5);ok(!S.over&&S.items[0].got&&(S.stats.camRec||0)>0,'camera mistake forced restart or ignored recording');
   return out;
  }''')
  assert await q.evaluate('!__game.S.over&&__game.S.items[0].got&&__game.S.stats.camRec>0'),'camera recording immediately fails the story'
  assert await q.evaluate('__game.loadCheckpoint()'),'explicit retry unavailable'
  assert await q.evaluate('!__game.S.over&&!__game.S.items[0].got&&__game.camOn(__game.S.cams[0])&&!__game.S.stats.camRec&&__game.S.player.hp===3'),'recorded theft did not restore safe checkpoint'
  checks.append('CCTV mistakes continue the story; explicit retry restores the safe checkpoint')
  await q.evaluate('''()=>{
   const G=__game,S=G.S,P=S.player,c=S.cams[0];Object.assign(P,{...G.cameraServicePoint(c),cover:null,vx:0,vy:0,fl:c.fl,outfit:'crew'});G.setLayer(c.fl);G.actEnv();
   for(let n=0;n<190;n++)G.update(.01);if(!G.camOn(c))throw Error('Cable disabled before2s');for(let n=0;n<80;n++)G.update(.01);
   if(G.camOn(c)||!G.CP.S.cams[0].unplugged)throw Error('Cable checkpoint missing');G.endGame(false,'fixture: post-cable death');
  }''')
  await q.wait_for_timeout(1450)
  assert await q.evaluate('!__game.S.over&&!__game.camOn(__game.S.cams[0])&&__game.S.stats.camUnplugged===1&&!__game.S.items[0].got'),'retry lost completed camera action'
  checks.append('2s cable work and completed camera progress survive a later retry')
  await q.evaluate('''()=>{const G=__game;localStorage.setItem('yahaeng.ch',JSON.stringify({m2:{_clear:true}}));if(G.STAGES[G.recommendedStage()].id!=='m4')throw Error('Returning player forced through starters');localStorage.setItem('yahaeng.ch',JSON.stringify({p0:{_clear:true},p1:{_clear:true},p2:{_clear:true}}));if(G.STAGES[G.recommendedStage()].id!=='e2')throw Error('Starters do not lead to beginner episode');}''')
  for width,height in [(1280,800),(390,844),(844,390),(320,568)]:
   z=await b.new_page(viewport={'width':width,'height':height},has_touch=width!=1280,is_mobile=width!=1280)
   z.on('pageerror',lambda e:errors.append(str(e)));await z.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
   await z.goto((R/'build/preview_city.html').as_uri());await z.wait_for_function('!!__game',polling=100)
   for id in ['p0','p1','p2']:
    await z.evaluate('id=>__game.start(__game.STAGES.findIndex(s=>s.id===id),true)',id)
    box=await z.locator('#btnBrGo').bounding_box()
    assert box and box['x']>=0 and box['y']>=0 and box['y']+box['height']<=height+1,(width,height,id,'departure offscreen',box)
    if id!='p0':assert '바깥'not in await z.locator('#brIdentity').inner_text(),'incorrect indoor location'
    await z.click('#btnBrGo');await z.evaluate('__game.update(.1);__game.updateHUD(true)')
    # v239: on touch the empty tool slot becomes the whistle satellite; it must never show an empty tool.
    if id in ['p1','p2']:assert await z.locator('#btnTool').evaluate('(e,t)=>e.hidden?true:t&&e.dataset.art==="whistle"&&e.innerText.includes("휘파람")',width!=1280),'empty tool exposed'
    assert await z.locator('#btnAct').get_attribute('hidden') is None,'attack hidden after returning to an assassination contract'
    assert await z.evaluate('(()=>{const e=document.getElementById("objective"),b=document.querySelector("#hud .obj").getBoundingClientRect();return e.scrollHeight<=e.clientHeight+1&&b.left>=0&&b.right<=innerWidth+1})()'),(width,height,id,'clipped goal')
   await z.close()
  checks.append('departure and current goal fit desktop, portrait, landscape and320px screens')
  assert not errors,errors;await b.close();print('PASS FIRST NIGHT:', '; '.join(checks),flush=True)

asyncio.run(main())
