"""Product rules: safe preparation, stable goals, witnessed intel and actual VIP drinking.

Controlled scene placement isolates each rule; this is not a human play-time test.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile)
   errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0')
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!__game')
   result=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},start=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.setOppMode(1);return G.S},tick=(n=60)=>{for(let i=0;i<n;i++){G.S.t+=1/60;G.updatePlayer(1/60);G.updateKoHold();G.runTimers()}};
    let S=start('m2'),P=S.player,g=S.guards.find(g=>!g.civ&&!g.target&&!g.elite);
    Object.assign(P,{x:4.5*48,y:21.5*48,fl:0,z:0,outfit:'waiter',disguise:'waiter',disguiseBlown:false,mode:'run',moving:true,light:1});
    Object.assign(g,{x:P.x+80,y:P.y,fl:0,z:0,state:'PATROL',meter:0,eyeT:0});S.guards=[g];S.expo=0;
    G.updateStealth(1);check(!document.querySelector('#stealth').innerText.includes('수상함'),'lawful uniform gets false running warning');check(G.publicSuspicion(g)===0,'HUD fix disagrees with AI');
    S=start('m4');P=S.player;const gs=S.guards.filter(g=>g.target);G.selectMissionGoal('target:'+gs[0].id);const pin=G.nextGoal().id;
    P.x=gs[1].x;P.y=gs[1].y;check(G.nextGoal().id===pin,'walking changes selected goal');check(G.targetName(gs[0])==='수금원'&&G.targetName(gs[1])==='클럽 실장','targets have indistinguishable names');
    S=start('m2');P=S.player;g=S.guards.find(g=>g.target);Object.assign(P,{x:4.5*48,y:21.5*48,fl:0,z:0});Object.assign(g,{x:P.x+60,y:P.y,fl:0,z:0});G.updateTargetIntel();const observed=G.targetKnowledge(g);check(observed.live&&!observed.area,'direct observation not recorded');
    P.x=0;P.y=35*48;g.x+=48;S.t+=1;G.updateTargetIntel();let info=G.targetKnowledge(g);check(info.x===observed.x&&info.lastSeen,'unseen target leaks live coordinates');S.t+=16;G.updateTargetIntel();info=G.targetKnowledge(g);check(info.area,'stale precise marker never expires');G.setOppMode(2);check(G.targetKnowledge(g).x===g.x,'full guidance does not restore precise help');G.setOppMode(1);
    S=start('m2');P=S.player;S.guards=[];S.alevel=0;G.takeProp(S.props[0]);S.learned.push('사무동 금고 비밀번호 0417');G.updateCheckpoint(1);
    check(G.CP&&G.CP.S.player.item?.id==='emetic'&&G.CP.S.learned.length,'preparation not saved');const count=S.prepCount;G.updateCheckpoint(1);check(S.prepCount===count,'same preparation saves repeatedly');P.hp=1;check(G.loadCheckpoint()&&G.S.player.item?.id==='emetic','preparation restore fails');
    S=G.S;S.guards=[];S.player.outfit='waiter';S.player.disguiseBlown=false;S.alevel=2;G.updateCheckpoint(1);check(S.cpWant,'unsafe preparation not queued');check(G.CP.S.player.outfit!=='waiter','unsafe checkpoint overwrites safe save');S.alevel=0;G.updateCheckpoint(1);check(G.CP.S.player.outfit==='waiter','queued preparation not saved when safe');
    const savedSeen=S.prepCount;S.player.outfit=null;G.updateCheckpoint(1);S.player.outfit='waiter';G.updateCheckpoint(1);check(S.prepCount===savedSeen,'reusing outfit creates fake progression');
    S=start('m2');P=S.player;g=S.guards.find(g=>g.tag==='vip');S.guards=[g];S.facOn=false;S.cams=[];Object.assign(P,{x:27.5*48,y:10.5*48,fl:0,z:0,outfit:'waiter',disguise:'waiter',disguiseBlown:false});G.takeProp(S.props[0]);
    const use=G.envChoices().find(a=>a.k==='use');check(use,'reachable bottle has no action');G.selectEnvTarget(G.envToken(use));G.actEnv();tick(60);check(S.vipPlan?.phase==='prepared'&&!g.route.some(r=>r.once),'poison teleports/redirects VIP before drinking');
    Object.assign(g,{x:29.5*48,y:10.5*48,fl:0,z:0,state:'PATROL',moving:false,path:null,wait:8});S.alevel=0;
    for(let i=0;i<50;i++){S.t+=.02;G.updateVipPlan(.02)}check(S.vipPlan.phase==='drinking'&&!g.route.some(r=>r.once),'drinking effect commits early');
    g.state='CAPTIVE';G.updateVipPlan(.1);check(g.drinkT===0&&!g.route.some(r=>r.once),'captured VIP continues drinking');g.state='PATROL';
    G.saveCheckpoint();check(G.loadCheckpoint(),'prepared drink checkpoint fails');S=G.S;g=S.guards[0];Object.assign(g,{moving:false,state:'PATROL'});
    for(let i=0;i<110;i++){S.t+=.02;G.updateVipPlan(.02)}check(S.vipPlan.phase==='sick'&&g.route.filter(r=>r.once).length===1,'actual drink does not trigger one bathroom detour');
    G.saveCheckpoint();G.loadCheckpoint();S=G.S;g=S.guards[0];for(let i=0;i<150;i++)G.updateVipPlan(.02);check(g.route.filter(r=>r.once).length===1,'restored consumed drink triggers twice');
    // Old v93 saves already used the medicine and started the detour. Do not reapply it.
    delete S.vipPlan;G.saveCheckpoint();G.loadCheckpoint();check(G.S.guards[0].route.filter(r=>r.once).length===1,'legacy medicine progress broken');
    S=start('m6');P=S.player;Object.assign(P,{x:20.5*48,y:20.5*48,fl:0,z:0});G.selectMissionGoal('item:0');const nav=G.goalNavigation(G.nextGoal());check(nav.via&&nav.fl===0,'upper-floor goal is not routed through an entrance');check((nav.locked&&S.doors.some(d=>Math.hypot(d.x-nav.x,d.y-nav.y)<1))||G.S.lvl.ends.some(e=>[e.A,e.B].some(a=>Math.hypot(a.x-nav.x,a.y-nav.y)<1&&a.fl===nav.fl)),'navigation invents a non-existent entrance');
    S=start('m2');S.guards=[];const set=Storage.prototype.setItem;try{Storage.prototype.setItem=()=>{throw new DOMException('full','QuotaExceededError')};G.saveCheckpoint();check(!S.cpStored&&G.cpReady(),'failed storage announced as durable save')}finally{Storage.prototype.setItem=set}
    G.saveCheckpoint();delete G.CP.S.prepSeen;delete G.CP.S.prepCount;G.loadCheckpoint();S=G.S;G.updateCheckpoint(1);check(S.prepCount===0&&!S.cpWant,'legacy save manufactures preparation progress');
    S=start('m2');P=S.player;S.guards=[];Object.assign(P,{x:4.5*48,y:21.5*48,fl:0,z:0,light:1,strikeT:.3});
    S.cams=[{x:P.x-48,y:P.y,tx:3,ty:21,fl:0,a:0,base:0,sweep:0,period:10,ph:0,meter:.99,cool:0,outdoor:true}];G.updateCams(.1);check(S.stats.camEver===1&&G.evidencePending(),'identity recording/history not created');
    const cr=S.camRoom;Object.assign(P,{x:cr.x,y:cr.y,fl:cr.fl,z:0,strikeT:0});G.setLayer(cr.fl);const cam=G.envChoices().find(a=>a.k==='camroom');check(cam,'security terminal cannot be selected');G.selectEnvTarget(G.envToken(cam));G.actEnv();tick(60);check(!G.evidencePending()&&S.stats.camEver===1&&S.stats.camRec===0,'evidence erasure destroys history or leaves evidence');
    S.items.forEach(i=>i.got=true);G.checkObjective();G.showEnd(true);check(document.querySelector('#endRank').textContent.includes('그림자'),'erased evidence incorrectly blocks clean rank');check(S.chRes.find(r=>r[0]==='unrecorded')[1]===false,'erased recording awards never-recorded challenge');
    return{uniform:true,goalPin:true,observedIntel:true,preparationSave:true,unsafeSave:true,drinkInterruptRestore:true};
   }''')
   print('PASS rules',mobile,result,flush=True)
   # Actual touch/click selection must choose without executing; stale selection cannot operate another object.
   await pg.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];Object.assign(P,{x:4.5*48,y:21.5*48,fl:0,z:0,carrying:null,item:null});S.props=[{id:'testA',name:'구토제',x:P.x+15,y:P.y,fl:0,taken:false},{id:'testB',name:'직원복',x:P.x-15,y:P.y,fl:0,taken:false}];S.doors=[];G.updateHUD(true)}''')
   await pg.locator('#btnCycle').dispatch_event('pointerdown',{'pointerType':'touch' if mobile else 'mouse'})
   await pg.locator('#envPicker button').filter(has_text='직원복').click()
   assert await pg.evaluate('__game.S.player.item===null'),'choosing executes pickup'
   assert await pg.evaluate('__game.envAction().p.id')=='testB'
   await pg.evaluate('''()=>{const G=__game;G.S.props.find(p=>p.id==='testB').taken=true;G.actEnv()}''')
   assert await pg.evaluate('__game.S.player.item===null&&!__game.S.player.interact'),'stale selection picks other prop'
   await pg.evaluate('__game.updateHUD(true)')
   assert await pg.locator('#btnCycle').is_visible(),'remaining alternative cannot be selected after stale target'
   await pg.locator('#btnCycle').dispatch_event('pointerdown')
   assert await pg.locator('#envPicker [data-env-token]').count()==1
   await pg.evaluate('__game.closeEnvPicker()')
   await pg.evaluate('''()=>{const G=__game;G.S.props.find(p=>p.id==='testB').taken=false;G.updateHUD(true)}''')
   await pg.locator('#btnCarry').dispatch_event('pointerdown',{'pointerId':3})
   await pg.evaluate('''()=>{const G=__game;for(let i=0;i<60;i++){G.S.t+=1/60;G.updatePlayer(1/60)}}''')
   await pg.locator('#btnCarry').dispatch_event('pointerup',{'pointerId':3})
   assert await pg.evaluate('__game.S.player.item?.id')=='testB','selected physical action does not execute'
   assert not errors,errors
   print('PASS picker touch/click and stale target',mobile,flush=True)
   await pg.close()
  await b.close()
asyncio.run(main())
