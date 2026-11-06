"""Mission receipts survive reload/refund; distant takedowns require a paid physical approach."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/skills-v152';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  checks=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},passed=[];
   const fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S};
   ok(G.skillBudget()===1,'Fresh budget');G.loadSkillTree();fresh('tB');G.showEnd(true);ok(G.skillBudget()===1,'Practice mints permanent points');
   let S=fresh('m2');S.stats.camEver=1;G.showEnd(false);ok(G.skillBudget()===1,'Failure pays');
   S=fresh('m2');S.stats.camEver=1;G.showEnd(true);ok(G.skillBudget()===2&&S.skillRewards.length===1&&S.skillRewards[0].points===1,'First clear receipt');G.showEnd(true);ok(G.skillBudget()===2&&!S.skillRewards.length,'Replay pays');
   S=fresh('m4');Object.assign(S.stats,{camEver:1,detected:1,extraKills:1,bodies:0});S.t=999;G.showEnd(true);ok(G.skillBudget()===3&&S.skillRewards.length===1,'Achievements inflate currency');
   const record=JSON.parse(localStorage.getItem('yahaeng.ch'));ok(G.missionSkillPoints(record)===2,'Mission receipt derivation');localStorage.setItem('yahaeng.ch',JSON.stringify({...record,unknown:{_clear:true,ghost:true}}));ok(G.skillBudget()===3,'Unknown flags pay');passed.push('only first mission completion gives 1P; practice/failure/replay/achievements never multiply rewards');
   localStorage.clear();localStorage.setItem('yahaeng.ch',JSON.stringify({tB:{_clear:true}}));localStorage.setItem('yahaeng.skillTree.v1',JSON.stringify({schema:1,rewardVersion:152,legacyPoints:8,learned:['kit','dart','smoke']}));
   let r=G.loadSkillTree();ok(r.learned.length===3&&G.skillBudget()===3&&r.legacyPoints===2,'Purchased build lost or unspent bonus retained');G.loadSkillTree();ok(G.skillBudget()===3,'Migration repeats');passed.push('existing learned build retained once; old unspent grants discarded');
   localStorage.clear();S=fresh('m1');const P=S.player,base=S.guards.find(g=>!g.civ&&!g.child&&!g.dog);G.setLayer(0);
   Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,mode:'walk',hidden:false,cover:null,hide:null,strikeT:0});
   const g={...base,id:111,x:P.x+96,y:P.y,fl:0,z:0,a:0,state:'PATROL',still:true,target:false,civ:false,dog:false,elite:false,child:false,climb:null,doomed:false,seen:false,meter:0};S.guards=[g];S.corpses=[];
   ok(G.meleeReach()===48&&!G.canKill(g,P)&&!G.prepareCombat({k:'kill',list:[g]}),'Unlearned distant assassination');G.grab(g);G.doAct({k:'kill',list:[g]});ok(!P.grabIn&&!P.lunge&&!P.killAnim&&g.state==='PATROL'&&!g.doomed,'Direct action bypass');
   g.x=P.x+48;ok(G.canKill(g,P),'Contact cannot takedown');g.a=Math.PI;ok(!G.canKill(g,P),'Basic range allows a frontal attack');g.a=0;g.fl=1;ok(!G.canKill(g,P),'Basic range crosses floor');g.fl=0;g.x=P.x+49;ok(!G.canKill(g,P),'Contact threshold exceeds 1.5m');g.x=P.x+96;
   G.storeSkillTree({schema:1,rewardVersion:152,learned:['silentHands','reach']});G.syncRuntimeSkills();ok(G.meleeReach()===112&&G.canKill(g,P),'Learned approach range');
   g.fl=1;ok(!G.canKill(g,P),'Approach crosses floor');g.fl=0;G.G0[21][34]='#';ok(!G.canKill(g,P),'Approach crosses wall');G.G0[21][34]='.';
   const x=P.x;G.doAct({k:'kill',list:[g]});ok(P.lunge&&P.x===x&&!S.corpses.length,'Approach teleports or hits instantly');S.t+=.05;G.updatePlayer(.05);ok(P.x>x&&P.x<g.x&&!S.corpses.length,'Approach is not physical');
   for(let i=0;i<200;i++){S.t+=.01;G.updatePlayer(.01);}ok(S.corpses.length===1&&S.corpses[0].ko&&S.stats.ko===1,'Approach does not finish with tap KO');
   passed.push('48px contact, learned 112px approach, direct-input gate, wall/floor isolation, physical travel and delayed KO');
   localStorage.clear();S=fresh('m1');const old=S.guards[0];S.player.lunge={list:[old]};G.saveCheckpoint();ok(G.loadCheckpoint()&&!G.S.player.lunge,'Unowned saved approach survives restore');passed.push('obsolete unowned pending approach cancelled on checkpoint');return passed;
  }''')
  assert not errors,errors;(O/'rewards-range-checks.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},ensure_ascii=False,indent=2));print('PASS','; '.join(checks));await b.close()
asyncio.run(main())
