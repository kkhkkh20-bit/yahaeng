"""New main episode: real geometry, two archive routes, permissions and rewards.
Controlled structural/detector tests; native complete contract replays are separate.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
  result=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},checks=[],fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m7'));while(G.DLG.modal)G.advanceDialog();return G.S};
   const st=G.STAGES.find(s=>s.id==='m7');ok(st&&G.mainContracts()[3]===st&&G.contractNumber(st)==='04','new episode not in main campaign');
   localStorage.setItem('yahaeng.ch',JSON.stringify(Object.fromEntries(['p0','m2','m4','m6'].map(id=>[id,{_clear:true}]))));ok(G.STAGES[G.recommendedStage()].id==='m7','existing completed saves do not recommend new episode');
   G.start(G.STAGES.findIndex(s=>s.id==='m6'));while(G.DLG.modal)G.advanceDialog();ok(G.STAGES[G.learningNext()].id==='m7','prison result does not lead to new episode');localStorage.clear();
   let S=fresh(),P=S.player;ok(G.groundedWorld()&&!S.ladders.some(l=>l.kind==='pipe')&&P.candy===0,'new stage loses the existing physical policy');
   ok(G.nextGoal().text.includes('오태식'),'initial assignment is unclear');ok(S.guards.length===9&&S.guards.filter(g=>g.target).length===1&&S.guards[0].wait===55,'initial observation window or authored cast missing');
   ok(S.items.length===2&&S.items[1].fl===1&&S.items[1].furn==='pc'&&S.guards[0].x>30*48,'mission still leaves the east warehouse and office optional');ok(G.loadSkillTree().learned.length===0&&!P.kunai&&G.skillBudget()===1,'new episode grants unlearned skills');
   for(const g of S.guards){G.setLayer(g.fl||0);ok(!G.solidAt(Math.floor(g.x/48),Math.floor(g.y/48)),'actor in collision '+g.id);}G.setLayer(0);checks.push('campaign continuation, old completion records, clear target, basic equipment and reachable cast');
   const access=(x,y,fl,outfit,wanted)=>{Object.assign(P,{x:x*48+24,y:y*48+24,fl,z:0,outfit,disguiseBlown:false});G.setLayer(fl);ok(G.accessReadout().allowed===wanted,'wrong permission '+JSON.stringify([x,y,fl,outfit]));};
   access(6,17,0,null,true);access(13,17,0,'courier',true);access(13,17,0,null,false);access(27,18,0,'courier',true);access(27,18,1,'courier',true);access(19,8,0,'courier',false);access(19,8,0,'crew',false);
   const door=S.doors.find(d=>d.keyLock==='blue'&&d.tx===23&&d.ty===9);ok(door&&door.tx===23&&door.ty===9&&door.locked&&!P.keys?.blue&&S.guards[0].hasKey==='blue','archive card is not a physical target-held key');ok(S.doors.some(d=>d.keyLock==='blue'&&d.tx===16&&d.ty===7&&d.locked),'west archive door bypasses the card');checks.push('normal work circulation and protected archive have distinct permissions; card remains target-held');
   const vents=S.vents,street=vents.find(v=>v.street),inside=vents.find(v=>v.tx===18&&v.ty===10);ok(street&&inside&&street.group===inside.group,'missing rear duct');
   ok(G.astar(street.tx,street.ty,inside.tx,inside.ty,(x,y)=>!G.ventAt(x,y)).length>8,'duct does not physically connect to archive');
   ok(G.astar(st.start[0],st.start[1],street.tx,street.ty).length,'rear street entry unreachable');checks.push('public rear street and actual traversable duct reach the locked archive');
   S=fresh();P=S.player;S.guards=[];Object.assign(P,{x:29.5*48,y:10.5*48,fl:0,z:0,light:1,outfit:'courier',mode:'walk',strikeT:.2});G.setLayer(0);const c=S.cams[0],seen=[];
   for(let n=0;n<120;n++){S.t=n*.1;G.updateCams(.1);seen.push(G.cameraAssessment(c,true).detectable);}
   ok(seen.some(Boolean)&&seen.some(v=>!v),'camera has no real risk/window in the sorting aisle');ok(G.evidencePending(),'real sorting-aisle recording does not require recovery');
   Object.assign(P,{x:S.items[0].x,y:S.items[0].y});G.updateCams(.1);ok(!G.cameraAssessment(c,true).detectable,'sorting camera sees through archive wall');G.setLayer(S.camRoom.fl);ok(S.camRoom.fl===1&&!G.solidAt(S.camRoom.tx,S.camRoom.ty),'camera recovery lacks an actual terminal');checks.push('sorting camera sees witnessed crime, respects archive walls and preserves recorded evidence');
   S=fresh();P=S.player;const work=S.items[1],operator=S.guards.find(g=>g.tag==='camop');Object.assign(P,{x:work.x,y:work.y,fl:1,z:0,outfit:'courier',light:1});G.setLayer(1);
   const action=()=>G.envChoices().find(a=>a.k==='loot');ok(action()?.label.includes('명세서 필요'),'missing prerequisite explanation');G.actPrimary(action());ok(!P.pick&&!work.got,'dispatch can be stopped without the manifest');
   S.items[0].got=true;Object.assign(S.guards[0],{state:'DEAD',unconscious:false});G.checkObjective();ok(!S.exitOpen&&G.nextGoal().text.includes('2층'),'old two objectives still finish the mission');
   G.actPrimary(action());ok(P.pick?.dur===3.5&&P.pick.short==='배차 취소','terminal work is not an actual timed action');
   G.updatePlayer(.2);ok(!work.got,'terminal work completes instantly');G.input.joy={x:1,y:0,mag:1};G.updatePlayer(.1);G.input.joy=null;ok(!P.pick&&!work.got,'moving fails to cancel terminal work');
   Object.assign(P,{x:work.x,y:work.y,hurtT:0});G.actPrimary(action());for(let n=0;n<240;n++){S.t+=1/60;G.updatePlayer(1/60)}G.checkObjective();ok(work.got&&S.exitOpen,'completed dispatch does not unlock extraction');ok(operator.state==='SUSPICIOUS'&&operator.why==='heard'&&!S.stats.alarms&&!P.disguiseBlown,'operator response cheats an identity alarm');
   G.updateHUD(true);ok(document.querySelector('[data-mission-id="item:1"]').textContent.includes('완료'),'terminal identity never completes');const rows=G.missionGoalCandidates();ok(!rows.some(r=>r.text.includes('새벽배송 훔치기')),'terminal is still described as stolen paperwork');
   S=fresh();P=S.player;P.hp=2;P.keys.blue=true;S.items[0].got=true;Object.assign(S.guards[0],{state:'DEAD',unconscious:false});G.saveCheckpoint();const cp=G.CP;cp.S.items.length=1;delete cp.S.itemLayoutVersion;cp.S.exitOpen=true;ok(G.loadCheckpoint(),'old depot checkpoint refused');ok(G.S.items.length===2&&G.S.items[0].got&&!G.S.items[1].got&&G.S.player.hp===2&&G.S.player.keys.blue&&!G.S.exitOpen&&G.nextGoal().text.includes('2층'),'old checkpoint loses progress or bypasses dispatch');checks.push('mandatory second-floor timed dispatch, prerequisite, cancellation, local inspection and old checkpoint migration');
   const reward=G.skillRewardRows(st,{m7:{_clear:true,ghost:true}});ok(reward.length===1&&reward[0].points===1,'new episode lacks standard clear/signature rewards');
   ok(window.__THUMBS?.m7?.startsWith('data:image/webp'),'new episode has no map preview');checks.push('standard one-time clear/signature rewards and a map preview');return checks;
  }''')
  assert not errors,errors;out=R/'build/episode-v186';out.mkdir(exist_ok=True);(out/'rules.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS',result);await b.close()
asyncio.run(main())
