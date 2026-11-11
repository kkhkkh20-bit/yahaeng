"""First episode: a real upstairs witness, repeatable contact and a nonviolent alternative."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
# Detailed screen text (설정 · 화면 글: 자세히): this test checks guidance the minimal default hides.
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();localStorage.setItem(`yahaeng.guide`,`full`);requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  result=await q.evaluate('''()=>{const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='tB'));while(G.DLG.modal)G.advanceDialog();return G.S;},checks=[];
   let S=fresh(),P=S.player,g=S.guards.find(g=>g.tag==='archiveKeeper');ok(S.guards.length===3&&g.fl===1&&!g.target&&!g.radio,'upstairs challenge is not a single ordinary witness');
   ok(G.skillSpent(G.loadSkillTree())===0,'opening requires a skill purchase');G.setLayer(1);const rear=G.openingArchiveRear();ok(!G.solidAt(Math.floor(rear.x/48),Math.floor(rear.y/48)),'rear guide points inside wall');
   Object.assign(P,{x:1080,y:312,fl:1,z:0});S.tutI=7;let via=G.openingArchiveApproach();ok(via.via&&via.x===1080&&via.y===600&&G.nextGoal().text.includes('문'),'stairs point through the wall');Object.assign(P,{x:via.x,y:via.y});via=G.openingArchiveApproach();ok(via.via&&via.x===984&&via.y===600,'corridor never leads through the real opening');
   Object.assign(P,{...rear,fl:1,z:0,mode:'sneak',outfit:'crew',disguise:'sam'});S.tutI=7;ok(G.openingArchiveReady()&&G.nextGoal().text.includes('짧게'),'learned rear contact is not actually available');
   P.carrying={};ok(G.nextGoal().interrupt==='env'&&G.episodeRadioMessage().text.includes('손부터'),'carrying hides recovery guidance');P.carrying=null;P.hide={};ok(G.nextGoal().interrupt==='env'&&G.episodeRadioMessage().text.includes('나와'),'hide detour loses recovery');P.hide=null;
   checks.push('three physical contacts; actual rear attack and interruption recovery without skills');
   S=fresh();P=S.player;g=S.guards.find(g=>g.tag==='archiveKeeper');G.setLayer(1);Object.assign(P,{x:S.items[0].x,y:S.items[0].y,fl:1,z:0,outfit:'crew',disguise:'sam',mode:'walk'});
   for(let i=0;i<20;i++){S.t+=.05;G.updateGuard(g,.05);}ok(g.rawSeen&&!g.seen&&g.state==='PATROL','permitted passage is treated as a crime');const a=G.envChoices().find(a=>a.k==='loot');ok(a,'document cannot be reached');G.doAct(a);
   for(let i=0;i<8;i++){S.t+=.05;G.updateGuard(g,.05);}ok(g.seen&&g.state!=='PATROL','upstairs guard does not witness actual theft');checks.push('uniform permits passage; visible document work attracts real suspicion');
   S=fresh();P=S.player;g=S.guards.find(g=>g.tag==='archiveKeeper');G.setLayer(1);Object.assign(P,{x:816,y:408,fl:1,z:0,outfit:'crew',disguise:'sam',mode:'walk'});for(const l of S.lamps.filter(l=>l.fl===1))G.setLampCircuit(l,true);
   for(let i=0;i<20;i++){S.t+=.05;G.updateGuard(g,.05);}S.tutI=7;ok(!g.rawSeen&&G.nextGoal().text.includes('서류')&&!G.openingArchiveGuard(),'unseen document approach still forces a knockout');
   G.doAct(G.envChoices().find(a=>a.k==='loot'));for(let i=0;i<40;i++)G.update(.05);G.checkObjective();ok(S.items[0].got&&S.exitOpen&&g.state==='PATROL'&&!S.stats.detected&&!S.stats.ko,'quiet route has a forced kill/knockout or alarm');
   ok(G.episodeRadioMessage().text.includes('박인호'),'retrieved clue does not connect the next episode');G.saveCheckpoint();ok(G.loadCheckpoint()&&G.S.items[0].got&&G.S.guards.find(g=>g.tag==='archiveKeeper').state==='PATROL','checkpoint loses alternative completion');checks.push('physical darkness permits quiet theft and escape with every guard alive; checkpoint and clue persist');
   S=fresh();const budget=G.skillBudget();S.over=true;G.showEnd(true);ok(document.getElementById('endSkills').textContent.includes('첫 에피소드 완료')&&document.getElementById('endSkills').textContent.includes('1P')&&G.skillBudget()===budget,'first clear falsely says duplicate or mints extra points');S=fresh();S.over=true;G.showEnd(true);ok(document.getElementById('endSkills').textContent.includes('중복')&&G.skillBudget()===budget,'replay grants extra starter points');checks.push('first completion presents available 1P; replay does not grant another point');
   return{checks,guards:3,killRequired:false,quietRoute:true};}''')
  assert not errors,errors;out=R/'build/first-night-v224';out.mkdir(exist_ok=True);(out/'rules.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS first night',result,flush=True);await b.close()
if __name__=='__main__':asyncio.run(main())
