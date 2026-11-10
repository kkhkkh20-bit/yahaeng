"""Existing mission opportunities: moving target, tool/key alternatives, physical fault response."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/play-v255';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('window.__game?.officeReady()',polling=100)
  r=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S;},tick=(n,dt=.02)=>{for(let i=0;i<n;i++)G.update(dt,false);};
   let S=fresh('e2'),P=S.player,g=S.guards.find(g=>g.tag==='broker');P.under=true;const visits=new Set();
   G.setLayer(2);for(const p of g.route)ok(!G.solidAt(Math.floor(p.x/48),Math.floor(p.y/48)),'broker routine ends in furniture');
   for(let i=0;i<5500;i++){G.update(.02,false);g.route.forEach((p,j)=>{if(Math.hypot(g.x-p.x,g.y-p.y)<28&&!g.moving){visits.add(j);ok(G.targetCue(g)?.[0]===(j===0?'phone':'ledger'),'target gesture contradicts the work station');}});}
   ok(visits.size===2,'broker stays at one station');
   G.saveCheckpoint();const old=G.CP.S.guards.find(g=>g.tag==='broker');old.sched=null;old.route=[{x:old.x,y:old.y,pause:999}];old.post=Math.PI/2;G.CP.S.brokerRoutineVersion=0;G.CP.S.player.hp=2;const pos=[old.x,old.y];ok(G.loadCheckpoint(),'old broker checkpoint load');g=G.S.guards.find(g=>g.tag==='broker');ok(g.sched.length===2&&g.x===pos[0]&&g.y===pos[1]&&G.S.player.hp===2,'routine migration moves saved actors or loses progress');
   S=fresh('m4');P=S.player;const it=S.items[1];Object.assign(P,{x:it.x,y:it.y,fl:1,picks:1});G.setLayer(1);ok(G.itemObjectiveBlock(it),'one pick bypasses contract lock');G.startLoot(it);ok(!P.pick,'blocked safe starts work');P.picks=2;G.startLoot(it);ok(P.pick?.dur===5.5&&P.pick.loud===65,'lockpick option has no distinct exposure cost');G.updatePick(P,0,2);G.updatePick(P,1,.01);ok(P.picks===2&&!it.got&&!P.pick,'cancelled safe work spends tools or grants item');
   G.startLoot(it);for(let i=0;i<280&&P.pick;i++){S.t+=.02;G.updatePick(P,0,.02);}ok(it.got&&P.picks===0&&!P.keys.green&&it.pickedOpen===2,'safe alternate does not consume exactly two picks on completion');
   S=fresh('m4');P=S.player;const keyItem=S.items[1];Object.assign(P,{x:keyItem.x,y:keyItem.y,fl:1,picks:2});P.keys.green=true;G.setLayer(1);G.startLoot(keyItem);ok(P.pick.dur===2.2&&P.pick.loud<65&&!P.pick.lockpick,'card no longer has the quiet fast advantage');for(let i=0;i<120&&P.pick;i++){S.t+=.02;G.updatePick(P,0,.02);}ok(keyItem.got&&P.picks===2,'card path consumes lockpicks');
   const setup=()=>{S=fresh('m7');P=S.player;const it=S.items[1],op=S.guards.find(g=>g.tag==='camop'),boss=S.guards.find(g=>g.target);Object.assign(P,{x:it.x,y:it.y,fl:1,under:false});G.setLayer(1);G.startLoot(it);ok(!P.pick&&G.itemObjectiveBlock(it),'terminal bypasses missing manifest');S.items[0].got=true;Object.assign(op,{x:it.x,y:it.y,fl:1,state:'PATROL',path:null,moving:false});G.startLoot(it);for(let i=0;i<180&&P.pick;i++){S.t+=.02;G.updatePick(P,0,.02);}ok(it.got&&S.dispatchFault?.phase==='checking','terminal fails to initiate a real operator check');S.guards=[boss,op];S.cams=[];P.under=true;return{it,op,boss};};
   let a=setup();a.op.state='DEAD';G.updateDispatchFault(4);ok(S.dispatchFault.phase==='interrupted'&&a.boss.state==='PATROL','dead operator remotely summons boss');
   a=setup();const initialFloor=a.boss.fl;let delivered=null,arrival=null;
   for(let i=0;i<3500;i++){G.update(.02,false);if(!delivered&&S.dispatchFault.phase==='delivered')delivered=S.t;if(a.boss.fl===1&&Math.hypot(a.boss.x-a.it.x,a.boss.y-a.it.y)<44){arrival=S.t;break;}}
   ok(delivered&&arrival&&initialFloor===0&&a.boss.fl===1&&a.boss.dispatchVisit,'boss never walks up the real staircase to the terminal');ok(S.dispatchFault.at.x===a.it.x&&S.dispatchFault.at.y===a.it.y,'fault investigation follows player instead of the terminal');
   const poi={...a.boss.poi};a.op.state='DEAD';G.updateDispatchFault(1);ok(a.boss.poi.x===poi.x&&a.boss.poi.y===poi.y,'completed work call is erased by later interruption');
   return{brokerStations:[...visits],legacyRoutinePreserved:true,safePickCost:2,safePickSeconds:5.5,cardSeconds:2.2,cancelPreservesTools:true,manifestRequired:true,operatorInterruption:true,physicalBossArrival:true,callDeliveredAt:delivered,arrivedAt:arrival};
  }''');assert not errors,errors;(O/'opportunities.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print('PASS play opportunities',json.dumps(r),flush=True);await b.close()
asyncio.run(main())
