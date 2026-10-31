"""A ledger summons a walking target, leaves a reversible ambush window and preserves other approaches."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=113;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   r=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)};
    const fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S;S.cams=[];S.facOn=false;G.update(.001);G.setLayer(0);return S;};
    let S=fresh(),P=S.player,R=G.rendezvousState(),vip=S.guards[0],escort=S.guards.find(g=>g.tag==='vipEscort');const original=JSON.stringify(G.STAGE.guards[0].sched);check(G.STAGE.entries.every(e=>(e.need||0)<=1+G.STAGE.challenges.length),'entry reward is impossible after challenge cleanup');const oldCh=localStorage.getItem('yahaeng.ch');localStorage.setItem('yahaeng.ch',JSON.stringify({m2:{_clear:true,purge:true,streak3:true,clean:true,nobody:true}}));check(G.starsOf(G.STAGE)===4&&G.totalStars()>=5,'retired challenges erase earned credit or unlocks');if(oldCh)localStorage.setItem('yahaeng.ch',oldCh);else localStorage.removeItem('yahaeng.ch');
    check(R&&G.FURN.some(f=>f.t==='desk'&&f.x===R.phone.tx&&f.y===R.phone.ty),'phone not on a real desk');
    Object.assign(P,{x:R.phone.x,y:R.phone.y+48,fl:0,z:0});check(!G.rendezvousReady()&&!G.nearRendezvous()&&!G.callRendezvous(),'call unlocked before ledger');
    S.items.forEach(i=>G.takeItem(i));P.fl=1;G.setLayer(1);check(!G.nearRendezvous()&&!G.callRendezvous(),'call through another floor');P.fl=0;G.setLayer(0);P.z=2;check(!G.nearRendezvous()&&!G.callRendezvous(),'call from roof');P.z=0;
    const item=P.item={id:'can',name:'빈 캔'};check(G.nearRendezvous(),'call unavailable after ledger');const a=G.envChoices().find(a=>a.k==='callMeet');check(a,'phone missing in selection');
    G.doAct(a);check(P.interact&&!R.calls,'phone commits on button press');for(let i=0;i<12;i++){S.t+=.02;G.updatePlayer(.02);}G.actEnv();check(!R.calls,'repeat input skips call');
    for(let i=0;i<40;i++){S.t+=.02;G.updatePlayer(.02);}check(R.calls===1&&R.phase==='travelling'&&P.item===item,'phone consumes unrelated item or repeats');check(!G.nearRendezvous()&&!G.callRendezvous(),'duplicate appointment');
    check(G.nextGoal().x===R.room.x&&G.nextGoal().area,'appointment leaks live unseen target position');P.x=P.y=-9000;
    let arrive=0,maxStep=0;while(R.phase==='travelling'&&arrive<60){const old={x:vip.x,y:vip.y};S.t+=.05;G.setLayer(vip.fl||0);G.updateGuard(vip,.05);G.setLayer(escort.fl||0);G.updateGuard(escort,.05);G.updateRendezvous(.05);maxStep=Math.max(maxStep,Math.hypot(vip.x-old.x,vip.y-old.y));arrive+=.05;}
    check(R.phase==='waiting'&&arrive<50&&maxStep<8,'target never physically arrives or teleports '+JSON.stringify({phase:R.phase,arrive,maxStep}));
    const office=G.STAGE.rendezvous.b;check(G.bldAt(Math.floor(vip.x/48),Math.floor(vip.y/48))===office,'target does not enter reused room');
    const caller=S.rendezvous.calls;G.saveCheckpoint();check(G.loadCheckpoint(),'appointment checkpoint failed');S=G.S;P=S.player;R=G.rendezvousState();vip=S.guards[0];escort=S.guards.find(g=>g.tag==='vipEscort');check(R.calls===caller&&vip.route.includes(R.waypoint),'checkpoint loses appointment identity');
    for(let i=0;i<400;i++){S.t+=.05;G.setLayer(vip.fl||0);G.updateGuard(vip,.05);G.setLayer(escort.fl||0);G.updateGuard(escort,.05);G.updateRendezvous(.05);}
    check(R.phase==='waiting'&&R.waiting>=20,'appointment ends on arrival');check(escort.waitingPrivacy&&G.bldAt(Math.floor(escort.x/48),Math.floor(escort.y/48))!==office,'escort follows into private room');
    for(let i=0;i<360;i++){S.t+=.05;G.setLayer(vip.fl||0);G.updateGuard(vip,.05);G.setLayer(escort.fl||0);G.updateGuard(escort,.05);G.updateRendezvous(.05);}
    check(R.phase==='left'&&!vip.route.some(w=>w.rendezvous)&&!S.over,'missed ambush fails mission or leaves permanent detour');check(JSON.stringify(G.STAGE.guards[0].sched)===original,'appointment mutates shared stage schedule');
    for(let i=0;i<260;i++)G.updateRendezvous(.05);Object.assign(P,{x:R.phone.x,y:R.phone.y+48,fl:0,z:0});G.setLayer(0);check(G.callRendezvous()&&R.calls===2,'missed appointment cannot be retried');
    vip.state='ALERT';vip.lastSeen={x:900,y:800,fl:0,z:0};G.updateRendezvous(.05);check(R.phase==='interrupted'&&vip.state==='ALERT'&&vip.lastSeen.x===900&&!vip.route.some(w=>w.rendezvous),'cancelled appointment clears pursuit');
    // Deliberate poison preparation changes the current lead, while manual objective selection wins.
    S=fresh();P=S.player;P.item={id:'emetic'};G.updateStories(.5);G.setOppMode(1);const lead=G.missionApproachGoal();check(lead?.story==='emetic'&&lead.text==='클럽 직원 복장 구하기','preparation leaves unrelated objective selected');
    const sign=S.stories.find(s=>s.d.id==='sign');sign.found=true;S.storyTrack='sign';G.setOppMode(2);check(G.nextGoal().story==='sign','prepared item overrides explicit full-guide route');G.setOppMode(1);
    const goal=G.missionGoalCandidates().find(g=>g.g);G.selectMissionGoal(goal.id);check(!G.missionApproachGoal()&&G.nextGoal().g===goal.g,'automatic lead overwrites manual choice');
    const v=S.vipPlan={phase:'sick',drinking:0};vip=S.guards[0];Object.assign(vip,{x:40*48+24,y:6*48+24,fl:0,z:0,moving:false});G.updateVipPlan(.1);check(v.reachedToilet,'actual arrival unrecorded');vip.x+=130;G.updateVipPlan(.1);check(v.phase==='done','missed bathroom opportunity keeps stale arrow');
    // A search discovery cancels concealment immediately, while retaining visible emergence.
    S=fresh();P=S.player;const h=S.hides.find(h=>h.type==='box'&&!G.solidAt(h.tx,h.ty+1)),guard=S.guards.find(g=>!g.civ&&!g.target);Object.assign(P,{x:h.x,y:h.y,fl:0,z:0,hide:h,hidden:true,trav:null,hurtT:0,hp:3});Object.assign(guard,{x:h.x,y:h.y+48,fl:0,z:0,state:'SEARCH'});G.dragOut(guard,'test');
    const T=P.trav;check(!P.hide&&!P.hidden&&T?.hideFlow?.forced&&T.hideFlow.handPost===0&&P.hp===2,'discovery remains hidden or skips emergence');G.dragOut(guard,'again');check(P.trav===T&&P.hp===2,'multiple guards restart ejection or repeat damage');
    for(let i=0;i<160&&P.trav;i++){S.t+=.01;G.updatePlayer(.01);}check(!P.trav&&!P.hide&&!G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48)),'forced exit lands in obstruction');
    return{arrivalSeconds:+arrive.toFixed(1),maxStep:+maxStep.toFixed(2),waitingSeconds:35,retry:true,checkpoint:true,preparationLead:true,forcedExit:true};
   }''')
   assert not errors,errors;print('PASS','touch'if touch else'PC',json.dumps(r),flush=True);await pg.close()
  # Drive the real event bindings, including contact delay and busy labels.
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script("localStorage.clear();(()=>{let q=[],t=1000;window.requestAnimationFrame=f=>q.push(f);window.__step=n=>{for(let i=0;i<n;i++){t+=16.7;const a=q;q=[];a.forEach(f=>f(t))}}})()")
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   await pg.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.S.cams=[];G.S.facOn=false;G.update(.001);const r=G.rendezvousState(),P=G.S.player;G.S.items.forEach(i=>G.takeItem(i));Object.assign(P,{x:r.phone.x,y:r.phone.y+48,fl:0,z:0,outfit:'crew',disguise:'sam'});G.setLayer(0);const a=G.envChoices().find(a=>a.k==='callMeet');G.selectEnvTarget(G.envToken(a));__step(2)}''')
   assert await pg.locator('#btnCarry').inner_text()=='전화 걸기'
   if touch:await pg.locator('#btnCarry').tap()
   else:await pg.keyboard.press('KeyX')
   await pg.evaluate('__step(10)');assert await pg.evaluate('!!__game.S.player.interact&&!__game.S.rendezvous.calls')
   await pg.evaluate('__step(60)');assert await pg.evaluate('__game.S.rendezvous.calls===1&&__game.S.rendezvous.phase==="travelling"&&!__game.S.player.interact')
   assert not errors,errors;print('PASS actual','touch'if touch else'keyboard','phone contact, recovery and one appointment',flush=True);await pg.close()
  await b.close()
asyncio.run(main())
