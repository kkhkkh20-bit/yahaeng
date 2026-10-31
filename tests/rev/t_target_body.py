"""Unconscious targets keep their height, render above roofs and remain finishable."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri());await pg.wait_for_function('!!window.__game');await pg.wait_for_function('__game.prBench().n>0')
  await pg.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m3'))")
  await pg.wait_for_function('__game.BLD.every(b=>!b.kit||b.kit.img.complete)',polling=100)
  result=await pg.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='m3'));for(let n=0;n<60&&G.DLG.modal;n++)G.advanceDialog();
   const S=G.S,P=S.player,g=S.guards.find(g=>g.target),watcher=S.guards.find(g=>!g.target&&!g.civ&&!g.dog);S.guards.forEach(q=>{q.x=q.y=-9999});
   Object.assign(P,{x:3*48+24,y:4*48+24,z:2,fl:0,a:0});Object.assign(g,{x:P.x+28,y:P.y,z:2,fl:0,state:'PATROL',a:0});G.setLayer(0);
   const tick=()=>{S.t+=.01;G.updatePlayer(.01);G.updateKoHold();G.runTimers()};
   S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let i=0;i<8;i++)tick();S.keys.KeyZ=false;G.combatRelease('KeyZ');for(let i=0;i<170;i++)tick();
   const c=S.corpses.find(c=>c.g===g);check(c&&c.ko&&c.z===2&&c.target,'rooftop KO lost height or identity');check(G.attackAction().k==='finish','cannot finish rooftop KO');
   // Identify this exact death sprite, then check its position in the actual frame's draw order.
   G.cam.x=c.x;G.cam.y=c.y;G.benchDraw(1);const ctx=G.ctx,draw=ctx.drawImage;let signature;
   ctx.drawImage=function(...a){signature=a;return draw.apply(this,a)};try{G.drawBody(c)}finally{ctx.drawImage=draw}
   check(signature,'body sprite missing');const roof=G.BLD[G.bldAt(Math.floor(c.x/48),Math.floor(c.y/48))].kit,calls=[];
   ctx.drawImage=function(...a){calls.push(a);return draw.apply(this,a)};try{G.benchDraw(1)}finally{ctx.drawImage=draw}
   const matches=calls.map((a,i)=>a[0]===signature[0]&&a[1]===signature[1]&&a[2]===signature[2]&&a[5]===signature[5]&&a[6]===signature[6]?i:-1).filter(i=>i>=0);
   const roofIndex=calls.findIndex(a=>a[0]===roof.c||a[0]===roof.img);check(matches.length===1&&matches[0]>roofIndex&&roofIndex>=0,'rooftop body hidden under roof or drawn twice '+JSON.stringify({matches,roofIndex}));
   // A guard on the street cannot wake a body on the roof at the same map coordinate.
   Object.assign(watcher,{x:c.x,y:c.y,z:0,fl:0,state:'BODY',body:c,path:null});G.updateGuard(watcher,.01);check(watcher.state!=='BODY'&&c.ko,'street guard wakes roof body');watcher.x=watcher.y=-9999;
   S.items=[];S.storyTrack=null;c.x+=60;c.y+=48;c.fl=1;
   // The mission tracker uses witnessed positions; hidden movement is not live intel.
   check(G.targetPosition(g)===c,'target position loses the unconscious body');
   (S.targetIntel||={})[g.id]={x:c.x,y:c.y,fl:c.fl,z:c.z,t:S.t};
   const goal=G.missionGoalCandidates().find(goal=>goal.g===g);check(goal&&goal.x===c.x&&goal.y===c.y&&goal.fl===1,'observed body position missing from target goal');
   c.fl=0;c.x=P.x+24;c.y=P.y;S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let i=0;i<120;i++)tick();S.keys.KeyZ=false;G.combatRelease('KeyZ');check(G.targetEliminated(g),'roof target cannot be finished by holding attack');
   // Carrying an unconscious target into a container keeps a usable target inside that container.
   G.start(G.STAGES.findIndex(s=>s.id==='m4'));for(let n=0;n<60&&G.DLG.modal;n++)G.advanceDialog();const R=G.S,Q=R.player,t=R.guards.find(g=>g.target),h=R.hides.find(h=>h.type==='box'&&!h.fl);R.guards.forEach(g=>{g.x=g.y=-9999});G.setLayer(0);
   Object.assign(Q,{x:h.x,y:h.y+24,z:0,fl:0});Object.assign(t,{x:Q.x+20,y:Q.y,z:0,fl:0});G.npcDown(t);const body=R.corpses.find(c=>c.g===t);Q.carrying=body;body.carried=true;G.actCarry({k:'carry',c:body,h});
   check(!body.stashed&&Q.carrying===body,'body is stored before entering the opening');
   for(let i=0;i<180;i++){R.t+=.01;G.updatePlayer(.01);G.runTimers()}
   check(body.stashed&&body.container===h&&body.x===h.x&&body.y===h.y,'stashed target loses container position');
   for(let i=0;i<70;i++){R.t+=.01;G.updatePlayer(.01);G.runTimers()}const enter=G.envChoices().find(a=>a.k==='hide'&&a.h===h);check(enter,'cannot enter container holding target');G.doAct(enter);for(let i=0;i<180;i++){R.t+=.01;G.updatePlayer(.01);G.runTimers()}check(Q.hide===h&&G.attackAction().k==='finish','stashing a living target makes mission impossible');
   R.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let i=0;i<130;i++){R.t+=.01;G.updatePlayer(.01);G.updateKoHold();G.runTimers()}R.keys.KeyZ=false;G.combatRelease('KeyZ');check(G.targetEliminated(t),'cannot finish target from inside container');
   return {rooftopHeight:true,drawnOnceAboveRoof:true,groundGuardSeparation:true,movingObjective:true,containerRecovery:true};
  }''')
  assert not errors,errors;print('PASS',result);await b.close()

asyncio.run(main())
