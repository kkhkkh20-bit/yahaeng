"""Player-facing clarity follows real action, vision, persistence and contact rules."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile)
   errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!__game')
   await pg.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&__game.DLG.modal;i++)__game.advanceDialog();__game.updateHUD(true)")
   assert await pg.locator('#objective .ol:visible').count()==1,'default objective repeats full checklist'
   await pg.locator('#hud .obj').click()
   assert await pg.locator('#objective .ol:visible').count()>1,'full objective list lost'
   await pg.locator('#hud .obj').focus();await pg.keyboard.press('Enter')
   assert await pg.locator('#objective .ol:visible').count()==1
   result=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},S=G.S,P=S.player;
    S.toasts=[];S.alevel=0;S.expo=0;S.t=10;
    Object.assign(P,{x:28.5*48,y:21.5*48,fl:0,z:0,a:0,hide:null,hidden:false,carrying:null,captive:null,cover:null,snap:null,strikeT:0,mode:'walk',moving:false});G.setLayer(0);
    const base=S.guards.find(g=>!g.civ&&!g.dog&&!g.elite&&!g.target),g={...base,id:777,x:P.x+60,y:P.y,fl:0,z:0,a:0,elite:false,civ:false,dog:false,target:false,state:'PATROL',seen:true,meter:.1,eyeT:0,path:null};S.guards=[g];
    check(G.guardAwareness(g).phase==='check','low attention classified as suspicion');g.meter=.8;check(G.guardAwareness(g).phase==='suspect','suspicion absent');g.eyeT=.3;check(G.guardAwareness(g).phase==='check','face check not distinct');g.eyeT=0;g.state='ALERT';check(G.guardAwareness(g).phase==='seen','confirmed sight not red');
    g.seen=false;check(G.guardAwareness(g).phase==='search'&&G.guardAwareness(g).color!=='#ff4a3c'&&!G.activeObserver(),'lost observer still claims to see player');G.updateStealth(1);check(document.querySelector('#sthWL').style.width==='0%','lost observer maintains danger meter');
    g.state='PATROL';g.civ=true;g.eyeWatching=true;g.eyeT=.4;check(G.activeObserver()?.phase==='check','civilian enforcer face warning absent');g.civ=false;g.eyeWatching=false;g.eyeT=0;g.state='ALERT';g.seen=true;g.fl=1;check(!G.activeObserver(),'other-floor observer affects current risk');g.fl=0;g.z=1;check(!G.activeObserver(),'roof observer affects interior risk');g.z=1;g.state='ALERT';g.suspectLook='crew';g.seen=false;P.outfit='crew';P.disguise='sam';P.disguiseBlown=true;S.knownLooks={crew:true};g.a=Math.PI;P.light=1;G.updateGuard(g,.05);check(g.seen&&G.activeObserver(),'actual cross-height sight warning absent');g.state='ALERT';G.updateStealth(1);check(document.querySelector('#expoLbl').textContent==='발각','actual cross-height confirmed sight not displayed');g.sightAt=-9;g.sightFl=g.sightZ=null;P.disguise=P.outfit=null;P.disguiseBlown=false;g.z=0;g.state='DEAD';check(!G.activeObserver(),'dead observer affects risk');
    for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','corpses','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];
    S.vehicles=null;S.camRoom=null;S.facOn=false;S.cams=[];g.a=0;g.state='PATROL';g.seen=false;g.meter=0;g.hasKey=null;g.route=[{x:g.x,y:g.y,pause:999}];g.wait=999;
    const ka=G.attackAction(),ga=G.grabAction(),pa=G.envAction();const rows=G.encounterRows(P,ka,ga,pa);
    check(rows.some(r=>r.text.includes('기절'))&&rows.some(r=>r.text==='붙잡기'&&r.ready),'attack/grab choices not together');
    G.grab(g);for(let i=0;i<90;i++){S.t+=1/60;G.updatePlayer(1/60)}check(P.captive===g,'actual grab failed');
    const before=G.encounterRows(P,G.attackAction(),G.grabAction(),G.envAction());check(before.length===3&&before[0].text==='심문'&&before[2].text==='은신처 찾기','captive choices not grouped');
    const h={type:'bush',x:P.x+26,y:P.y,fl:0,z:0,tx:Math.floor((P.x+26)/48),ty:Math.floor(P.y/48),bodies:0,cap:2};S.bushes=[h];S.t+=.01;
    const env=G.envAction(),drag=G.encounterRows(P,G.attackAction(),G.grabAction(),env);check(env.k==='drag'&&drag.some(r=>r.text==='끌고 가 기절'&&r.ready&&r.detail.includes('길게 처치')),'drag falsely described as harmless movement');
    G.actGrab();for(let i=0;i<20;i++){S.t+=1/60;G.updatePlayer(1/60)}const asked=G.encounterRows(P,G.attackAction(),G.grabAction(),G.envAction());check(g.questioned&&asked[0]?.text==='심문 완료','interrogation stays ready after use');
    // No map text repeats the full selected objective; preserve navigation and destination floor.
    check(G.goalMarkerCaption({text:'의뢰: 장부 훔치기',via:true,fl:1},25)==='2층 입구 · 25m','entrance/floor navigation lost');
    check(G.goalMarkerCaption({shelter:true},12)==='은신처 · 12m','urgent hiding arrow confused with mission goal');
    check(G.goalMarkerCaption({area:true},25)==='활동 구역 · 25m','target knowledge precision lost');
    P.captive=null;P.strikeT=0;P.grabIn=null;P.bodyAnim=null;S.guards=[];S.sayQ=[];S.toasts=[];S.alevel=0;S.bushes=[];S.hints={};S.hintN=0;for(let i=0;i<60&&G.DLG.cur;i++)G.advanceDialog();G.resetHelpTip();
    G.hint('stage','unrelated stage hint');check(document.querySelector('#hintCard').classList.contains('off'),'unrelated timed hint returns');
    G.hint('clarity-test','처음 만난 행동 안내');check(!document.querySelector('#hintCard').classList.contains('off'),'first relevant help missing');S.t+=2.1;G.updateHelpTip();
    check(S.hints['clarity-test']&&JSON.parse(localStorage.getItem('yahaeng.help.v1')).includes('clarity-test'),'read hint not remembered');
    S.toasts=[{text:'warning',kind:'warn',t:3}];G.updateHelpTip();check(document.querySelector('#hintCard').classList.contains('off'),'help overlaps urgent notice');S.toasts=[];G.hint('clarity-test','repeat');check(document.querySelector('#hintCard').classList.contains('off'),'read help repeated');
    G.toast('urgent',3,'warn');G.toast('ordinary',3);check(document.querySelector('#toasts').children.length===1&&document.querySelector('#toasts').textContent==='urgent','ordinary notice hides urgent warning');S.toasts=[];G.renderToasts();
    // Actual switch commit, cancellation and restore use the same contact instant.
    const l={x:P.x+20,y:P.y,fl:0,z:0,outdoor:false,off:false,broken:false,r:100};S.lamps=[l];G.contactFeedback(null,'none');delete S.contact;
    G.actEnv();check(P.interact&&!S.contact&&!l.off,'feedback or switch occurs on input instead of contact');
    S.t+=.1;G.updatePlayer(.1);check(!S.contact&&!l.off,'feedback before contact');S.t+=.13;G.updatePlayer(.13);check(l.off&&S.contact?.kind==='lamp','switch contact has no feedback');
    for(let i=0;i<20;i++){S.t+=.02;G.updatePlayer(.02)}
    delete S.contact;G.actEnv();P.x+=30;S.t+=.1;G.updatePlayer(.1);check(!P.interact&&!S.contact&&l.off,'cancelled action flashes success');
    G.saveCheckpoint();G.loadCheckpoint();check(!G.S.contact,'old contact flash restored from checkpoint');
    return{vision:true,groupedChoices:true,captive:true,hintMemory:true,contact:true};
   }''')
   # Persistence is profile-wide, including another mission load and page reload.
   await pg.reload();await pg.wait_for_function('!!__game')
   await pg.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m4'));for(let i=0;i<60&&__game.DLG.modal;i++)__game.advanceDialog();__game.S.guards=[];__game.S.toasts=[];__game.hint('clarity-test','repeat after reload')")
   assert not await pg.locator('#hintCard').is_visible() or await pg.locator('#hintCard').evaluate("e=>e.classList.contains('off')")
   await pg.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,L=S.guards.find(g=>g.tag==='vip'),e=S.guards.find(g=>g.tag==='vipEscort');Object.assign(L,{x:40.5*48,y:8.5*48,fl:0,z:0});Object.assign(e,{x:40.5*48,y:9.5*48,fl:0,z:0,repath:.5,path:[{x:40.5*48,y:7.5*48}],waitingPrivacy:false});G.followLeader(e,.025,80);if(!e.waitingPrivacy||e.path||e.y<8*48)throw Error('escort follows stale path into private room');}''')
   assert not errors,errors;print('PASS','touch' if mobile else 'desktop',result,flush=True)
   await pg.close()
  await b.close()
asyncio.run(main())
