"""Cumulative authored jobs: real spatial rules, switch response and mission completion.
Controlled state fixtures supplement the ordinary-RAF native journeys in compound_live.py."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/compound-v212';O.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  checks=await q.evaluate('''()=>{
   const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id),false);while(G.DLG.modal)G.advanceDialog();G.update(.02);return G.S},tick=t=>{for(let n=0;n<t;n+=.01)G.update(.01)};
   for(const[id,count,targets,docs,cams]of [['p0',3,1,0,0],['p1',4,2,0,0],['p2',5,2,1,0],['e1',5,2,1,1],['e2',6,2,1,1]]){
    const S=fresh(id);ok(S.guards.length===count&&S.guards.filter(g=>g.target).length===targets&&S.items.length===docs&&S.cams.length===cams,'authored density '+id);
    for(const c of S.cams){const at=G.cameraServicePoint(c),it=S.items[0];G.setLayer(c.fl);ok(G.cameraSees(c,it.x,it.y,1)>0&&G.cameraSees(c,at.x,at.y,1)<=0,'camera must protect actual document and leave a safe service point '+id);ok(!S.ladders.some(l=>l.kind==='fstair'&&l.tfl===c.fl&&Math.hypot(at.x-G.stairUpper(l).down.entry.x,at.y-G.stairUpper(l).down.entry.y)<60),'camera service point triggers staircase '+id);G.setLayer(0);}
    ok(!G.STAGE.tutorial&&!G.STAGE.steps&&G.STAGE.floors,'a real job became a gated drill '+id);
    ok(S.guards.some(g=>!g.target&&!g.fl)&&S.guards.some(g=>g.fl>0),'missing layered encounters '+id);
    ok(!G.loadSkillTree().learned.length&&!S.player.kunai,'free purchased skills '+id);G.checkObjective();ok(!S.exitOpen,'skip required work '+id);
    const victim=S.guards.find(g=>g.target);Object.assign(victim,{state:'DEAD',unconscious:true});G.checkObjective();ok(!S.exitOpen,'unconscious target completes '+id);
    for(const g of S.guards.filter(g=>g.target))Object.assign(g,{state:'DEAD',unconscious:false,doomed:false});G.checkObjective();ok(S.exitOpen===!docs,'target completion skips documents '+id);
    for(const it of S.items)it.got=true;G.checkObjective();ok(S.exitOpen,'authored objectives cannot complete '+id);
   }
   out.push('three-to-six hostiles, repeated core actions, upper floors, two required targets and documents; KO never completes an assassination');
   let S=fresh('p1'),P=S.player,l=S.lamps.find(l=>!l.outdoor&&!l.fl),at=l.control;Object.assign(P,{x:at.x+24,y:at.y,outfit:'crew',mode:'sneak'});G.setLayer(0);
   const before=G.lightAt(1272,552);G.doAct(G.envChoices().find(a=>a.k==='lamp'));tick(.8);ok(l.off&&S.compoundDarkUsed,'basic light switch requires a purchased ability');
   ok(S.guards.some(g=>g.relight&&g.relight.l===l),'nobody reacts to a room going dark');const after=G.lightAt(1272,552);ok(after<before,'switch does not lower real illumination');tick(12);ok(!l.off,'repair guard never restores light');
   out.push('free wall switch changes physical light, draws a real repair guard and is restored');
   S=fresh('e1');P=S.player;const c=S.cams[0],it=S.items[0];S.guards=[];Object.assign(P,{x:it.x,y:it.y,fl:it.fl,outfit:'crew',mode:'walk'});G.setLayer(it.fl);G.doAct(G.envChoices().find(a=>a.k==='loot'));tick(2.5);
   ok(it.got&&S.stats.camRec>0&&!S.over&&G.evidencePending(),'CCTV does not distinguish passage from illegal work');
   Object.assign(P,G.cameraServicePoint(c),{fl:c.fl,vx:0,vy:0});G.doAct(G.envChoices().find(a=>a.k==='camCable'));tick(2.6);ok(!G.camOn(c)&&G.evidencePending(),'cable silently deletes existing recordings');
   Object.assign(P,{x:S.camRoom.x,y:S.camRoom.y,fl:S.camRoom.fl});G.doAct(G.envChoices().find(a=>a.k==='camroom'));tick(3);ok(!G.evidencePending(),'security terminal cannot recover a recorded mistake');
   out.push('fourth job records visible work; rear cable stops recording without deleting evidence; indoor terminal recovers the mission');
   S=fresh('e2');P=S.player;ok(G.BLD.filter(b=>b.h===3).length===2,'no two three-storey buildings');Object.assign(P,{x:792,y:408,z:3,fl:0,a:0});G.setLayer(0);const jump=G.jumpTarget();ok(jump===G.jumpTarget(),'rooftop selection identity changes each frame');ok(jump&&jump.tx===18&&jump.z===3,'one-cell rooftop gap cannot be crossed');
   ok(S.keyItems.some(k=>k.key==='pin')&&S.windows.some(w=>w.tx===5&&w.ty===12&&w.st==='lock'),'window/lockpick route missing');
   ok(S.traps.some(t=>t.k==='drop'&&t.text==='금성 거래소'&&!t.used),'no physical sign opportunity');
   ok(G.LEARNING_ROUTE.slice(0,7).join(',')==='tB,p0,p1,p2,e1,e2,m2','obsolete one-rule errands still interrupt the cumulative route');
   Object.assign(P,{x:1224,y:576,z:3,fl:0});const handover=S.guards.find(g=>g.tag==='handover');Object.assign(handover,{x:1224,y:840,wait:99});G.combatPress('KeyX');S.keys.KeyX=true;G.actEnv();tick(.4);S.keys.KeyX=false;G.combatRelease('KeyX');ok(!S.traps[0].used,'tap drops a lethal sign');G.combatPress('KeyX');S.keys.KeyX=true;G.actEnv();tick(1.2);S.keys.KeyX=false;G.combatRelease('KeyX');tick(1.5);ok(S.traps[0].used&&handover.state==='DEAD'&&S.stats.accidents===1&&!G.abilityOn('ambush'),'roof sign incorrectly requires a purchased ambush skill');out.push('native hold intent: short sign input cancels; deliberate hold drops a real sign and kills the target without purchased skills');
   const old={e3:{_clear:true},e4:{_clear:true},e5:{_clear:true}};localStorage.setItem('yahaeng.ch',JSON.stringify(old));ok(G.missionSkillPoints()===3,'retiring errands erased existing earned points');
   out.push('third-floor/roof/window/sign alternatives and direct club continuation; old skill rewards remain');
   return out;
  }''')
  await q.evaluate("()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='p0'));G.S.layoutRevision=211;G.S.player.hp=2;G.saveCheckpoint();window.clearBefore=localStorage.getItem('yahaeng.ch');G.start(G.STAGES.findIndex(s=>s.id==='p0'),true)}")
  await q.click('#btnBrCP');assert await q.evaluate("__game.S.layoutRevision===212&&__game.S.player.hp===3&&__game.S.guards.length===3&&localStorage.getItem('yahaeng.ch')===clearBefore"),'old layout checkpoint overrides new map or erases earned progress'
  checks.append('old-layout Continue rebuilds the mission while preserving existing clear rewards')
  assert not errors,errors;await b.close();(O/'rules.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2));print('PASS compound progression',checks,flush=True)
asyncio.run(main())
