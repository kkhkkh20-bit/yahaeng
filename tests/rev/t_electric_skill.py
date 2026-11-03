"""Electrical controls require learned ownership at selection, start and contact."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  checks=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},passed=[];
   const fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S};
   let S=fresh('m1'),P=S.player;
   ok(G.SKILL_TREE.length===27&&G.SKILL_BY_ID.electric.cost===1&&G.SKILL_BY_ID.electric.req.join()==='kit','Electrical node missing');
   const lamp=S.lamps.find(l=>!l.hearth&&!l.fl&&!l.z&&!l.off&&!l.broken),at=G.lampControl(lamp);
   ok(lamp,'No real electrical light');Object.assign(P,{x:at.x,y:at.y+20,fl:0,z:0,hidden:false,hide:null});G.setLayer(0);
   const a={k:'lamp',l:lamp,at,viaZ:true},level=S.alevel;
   ok(G.envChoices().some(a=>a.l===lamp&&a.skillLocked==='electric'),'Environment button misses electrical lock');
   ok(!G.electricalActionAllowed(a)&&G.electricalChoice(a).skillLocked==='electric','No visible skill lock');
   G.actPrimary(a);ok(!lamp.off&&!P.interact&&S.alevel===level,'Direct switch action bypasses ownership');
   G.beginObjectAction(a);ok(!P.interact,'Object work starts without skill');
   ok(G.cutLights()===false&&S.lightsOn,'Direct main cut bypasses skill');
   const fb=S.bfuses[0];ok(fb,'No actual building circuit');const cut=fb.cut;ok(G.bldPower(fb,false)===false&&fb.cut===cut,'Direct building cut bypasses skill');
   ok(G.electricalActionAllowed({k:'lamp',l:{hearth:true}})&&G.electricalActionAllowed({k:'door'}),'Non-electrical basic actions were gated');
   passed.push('27 nodes; switch selection, direct action, pending work, building and main circuit cuts all locked; hearth and doors stay basic');
   G.openAssassinMenu();ok(G.learnTreeSkill('kit')&&G.learnTreeSkill('electric'),'Cannot purchase electrical skill');G.closeAssassinMenu();
   G.actPrimary(a);ok(P.interact,'Learned switch work did not start');G.updateObjectAction(P,.35);ok(lamp.off&&!P.interact,'Learned switch never commits');
   G.actPrimary(a);G.updateObjectAction(P,.35);ok(!lamp.off,'Learned on switch fails');
   G.actPrimary(a);ok(P.interact,'No pending checkpoint fixture');G.saveCheckpoint();G.storeSkillTree({schema:1,learned:[]});ok(G.loadCheckpoint(),'Cannot restore pending checkpoint');S=G.S;P=S.player;
   G.updateObjectAction(P,.35);ok(!P.interact&&!G.skillOn('electric')&&!S.lamps.find(l=>l.x===lamp.x&&l.y===lamp.y&&l.fl===lamp.fl).off,'Old pending switch commits without skill');
   passed.push('real switch contact turns off/on after purchase; previous pending checkpoint cancels when ownership is absent');
   G.storeSkillTree({schema:1,learned:['kit','electric']});S=fresh('m1');const circuit=S.bfuses[0];G.bldPower(circuit,false);ok(circuit.cut,'Learned building circuit did not cut');
   G.storeSkillTree({schema:1,learned:[]});G.syncRuntimeSkills();G.bldPower(circuit,true);ok(!circuit.cut,'Guard building restoration is gated by player skill');
   const g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target),l=S.lamps.find(l=>!l.hearth&&!l.fl&&!l.z&&!l.broken),control=G.lampControl(l);
   l.off=true;Object.assign(g,{x:control.x,y:control.y+20,fl:0,z:0,state:'PATROL',relight:{l,t:.01},path:null,meter:0,seen:false,doomed:false,climb:null});S.player.x=S.player.y=-9999;G.updateGuard(g,.02);ok(!l.off&&!g.relight,'Untrained player prevents real guard relighting');
   passed.push('building cut after learning; building restoration and actual guard switch work remain independent of player ownership');
   S=fresh('tB');ok(!G.skillOn('electric'),'First lesson overloads electrical skill');S=fresh('tL');ok(G.skillOn('electric')&&!G.skillOn('dart')&&!G.skillOn('ambush'),'Perception lesson has wrong trial skills');
   ok(G.STAGE.steps[1][3].includes('배워야'),'Light lesson does not explain real mission unlock');S=fresh('t0');ok(!G.skillOn('electric'),'Trial leaks into basic takedown lesson');S=fresh('m1');ok(!G.skillOn('electric')&&!G.loadSkillTree().learned.length,'Trial unlock becomes permanent');
   passed.push('only light lesson loans electrical skill; dart and ambush stay locked; no permanent unlock or cross-lesson leak');return passed;
  }''')
  assert not errors,errors
  out=R/'build/skills-v150';out.mkdir(exist_ok=True);(out/'electrical-checks.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},ensure_ascii=False,indent=2));print('PASS','; '.join(checks));await b.close()
asyncio.run(main())
