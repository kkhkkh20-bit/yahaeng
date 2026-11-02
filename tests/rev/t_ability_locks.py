"""Progression gates must also hold for forced inventory, direct actions and checkpoints."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  result=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},passed=[];
   const fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S};
   let S=fresh('m1'),P=S.player;
   ok(P.kunai===0&&!G.availableTools().includes('kunai')&&!G.abilityOn('dart'),'Dart is a starting ability');
   P.kunai=7;G.input.tool='kunai';G.startAim();ok(!G.input.aiming,'Forced stock permits aim');G.syncTools();ok(G.input.tool!=='kunai','Locked dart remains selected');
   const g=S.guards.find(g=>!g.dog&&!g.civ&&!g.child),t={type:'guard',ref:g,x:g.x,y:g.y};
   G.actKunai(t);ok(P.kunai===7&&!S.kunais.length,'Direct dart launch bypasses skill');
   G.kunaiHit({x0:g.x-20,y0:g.y,tgt:{...t,fl:g.fl||0,z:g.z||0},fl:g.fl||0,z:g.z||0,lethal:true});ok(g.state!=='DEAD','Old projectile bypasses skill');
   G.saveCheckpoint();ok(G.loadCheckpoint(),'Checkpoint failed');S=G.S;P=S.player;ok(P.kunai===7&&!G.abilityOn('dart'),'Checkpoint grants ability or discards old stock');
   G.openAssassinMenu();ok(G.learnTreeSkill('kit')&&G.learnTreeSkill('dart'),'Dart cannot be purchased');G.closeAssassinMenu();ok(G.availableTools().includes('kunai')&&P.kunai===7,'Learning duplicates old stock');
   P.kunai=0;G.syncRuntimeSkills();ok(P.kunai===0,'Sync refills darts');G.saveCheckpoint();G.loadCheckpoint();ok(G.S.player.kunai===0,'Checkpoint refills darts');
   passed.push('no starting darts; stock, aim, selection, direct launch, old projectile and checkpoint cannot bypass; learned stock is granted once');
   localStorage.clear();S=fresh('m1');P=S.player;const guard=S.guards.find(g=>!g.dog&&!g.civ&&!g.child);
   Object.assign(P,{hidden:true,mode:'sneak',hide:null,vent:null,ledge:null,under:false});
   ok(!G.concealedMeleeAllowed()&&!G.canKill(guard,P),'Concealed ordinary attack bypass');
   ok(G.attackAction().skillLocked==='ambush','No visible attack lock');
   G.grab(guard);ok(!P.grabIn&&!P.captive,'Direct grab bypass');
   ok(G.startAmbush(guard)===false&&!S.amb&&!guard.yank,'Direct ambush mutates guard');
   ok(!G.prepareCombat({k:'kill',list:[guard]})&&!G.prepareCombat({k:'ambush',g:guard}),'Combat intent bypass');
   Object.assign(P,{hidden:false,mode:'walk',cover:{x:1,y:0}});ok(!G.concealedMeleeAllowed()&&!G.prepareCombat({k:'pull',g:guard}),'Cover pull bypasses skill');P.cover=null;ok(G.concealedMeleeAllowed(),'Basic open takedown was gated');
   G.openAssassinMenu();ok(G.learnTreeSkill('silentHands')&&G.learnTreeSkill('ambush'),'Ambush cannot be purchased');G.closeAssassinMenu();P.hidden=true;
   ok(G.concealedMeleeAllowed(),'Learned concealed attack unavailable');G.startAmbush(guard);ok(S.amb?.g===guard&&guard.yank,'Learned ambush fails');
   passed.push('concealed attack, grab and special entry gates; ordinary rear combat stays basic; learned ambush starts');
   localStorage.clear();S=fresh('m1');P=S.player;P.hidden=true;P.lunge={list:[S.guards[0]]};P.grabIn={g:S.guards[0]};G.saveCheckpoint();ok(G.loadCheckpoint()&&!G.S.player.lunge&&!G.S.player.grabIn,'Old concealed pending action survives checkpoint');
   localStorage.clear();for(const id of ['tB','t0']){S=fresh(id);ok(!G.abilityOn('dart')&&!G.abilityOn('ambush')&&!S.player.kunai,'Basic lesson grants advanced ability');}
   S=fresh('tE');ok(G.abilityOn('dart')&&S.player.kunai>0,'Equipment trial lacks dart');
   S=fresh('tA');ok(G.abilityOn('ambush')&&!G.abilityOn('dart')&&!S.player.kunai,'Ambush trial grants unrelated abilities');
   G.openAssassinMenu();ok(G.learnTreeSkill('quietStep')&&G.skillOn('quietStep'),'Practice menu selection is ineffective');G.closeAssassinMenu();
   S=fresh('m1');ok(!G.abilityOn('dart')&&!G.abilityOn('ambush')&&!G.skillOn('quietStep')&&!G.loadSkillTree().learned.length&&!S.player.kunai,'Trial leaked into mission');
   localStorage.setItem('yahaeng.ch',JSON.stringify({m1:{_clear:true}}));G.storeSkillTree({schema:1,learned:['kit','kunai','precision']});S=fresh('m1');P=S.player;ok(P.kunai===0,'Precision grants unlearned dart');
   G.openAssassinMenu();ok(G.learnTreeSkill('dart'),'Dart cannot be learned after precision');G.closeAssassinMenu();ok(P.kunai===3,'Learned dart plus precision stock incorrect');P.kunai--;G.syncRuntimeSkills();ok(P.kunai===2,'Precision regrants dart');
   passed.push('only explicit lessons grant temporary trials; no persistent trial unlocks; precision respects separate dart ownership');
   return passed;
  }''')
  assert not errors,errors
  out=R/'build/skills-v149';out.mkdir(exist_ok=True);(out/'ability-locks.json').write_text(json.dumps({'checks':result,'pageErrors':errors},ensure_ascii=False,indent=2));print('PASS','; '.join(result));await b.close()
asyncio.run(main())
