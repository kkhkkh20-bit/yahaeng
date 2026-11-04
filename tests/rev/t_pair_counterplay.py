"""Actual authored pair: free lures split roles without disabling witnesses."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri()+'?nostats');await q.wait_for_function('!!window.__game',polling=100)
  report=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();
   const S=G.S,P=S.player,a=S.guards[9],b=S.guards[10],post=b.a,source={x:648,y:456};
   // Position only the player; the pair keeps its authored placement and roles.
   Object.assign(P,{...source,fl:0,z:0,under:false});G.setLayer(0);
   ok(!G.abilityOn('dual')&&!G.abilityOn('ambush')&&!G.abilityOn('dart'),'unexpected free combat ability');
   G.whistle();const cue=S.noises.at(-1);ok(cue.r===380,'first-room whistle cannot reach from outside its doorway');
   ok(cue.investigators.length===1&&cue.lookouts.includes(b.id),'pair moves together');
   ok(a.state==='SUSPICIOUS'&&a.why==='heard'&&b.state==='PATROL'&&!b.path,'wrong response roles');
   ok(a.waitBase===6&&b.soundWatchUntil-S.t===7,'opening action window too short');
   G.updateGuard(b,.1);ok(Math.abs(b.want-post)<.001,'lookout stares at the investigator bait');
   const wait=a.waitBase;S.t+=3;G.noise(source.x,source.y,230,'whistle',0,0);
   ok(a.soundApproach&&Math.hypot(a.soundApproach.x-source.x,a.soundApproach.y-source.y)>20,'repeated lure lost caution');
   ok(Math.abs(b.glanceA-Math.atan2(source.y-b.y,source.x-b.x))<.001,'repeat bait does not make lookout cautious');
   ok(S.stats.detected===0&&!Object.keys(S.knownLooks||{}).length,'sound reveals the player');
   G.saveCheckpoint();ok(G.loadCheckpoint(),'pair state cannot resume');
   ok(G.S.guards[10].soundHistory.length&&G.S.guards[9].why==='heard','resume lost sound knowledge');
   G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();
   const T=G.S;Object.assign(T.player,{...source,fl:0,z:0});G.setLayer(0);G.updateActionFlow();
   ok(T.toasts.some(t=>t.text.includes('휘파람')&&t.text.includes('한 명')),'visible pair has no basic alternative hint');
   const before=T.toasts.length;G.updateActionFlow();ok(T.toasts.length===before,'pair help repeats every frame');
   ok(!G.skillOn('dual')&&!G.skillOn('ambush')&&G.loadSkillTree().learned.length===0,'hint grants unearned skills');
   // Special responders bypass the regular pair roles: never report just one.
   G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();
   Object.assign(G.S.player,{...source,fl:0,z:0});G.setLayer(0);G.S.guards[9].elite=true;G.whistle();
   ok(G.S.noises.at(-1).otherInvestigators?.includes(9),'special responder omitted from sound feedback');
   ok(!G.S.splitLureNoticed,'multiple responders reported as one');
   const later=G.STAGES.find(s=>s.id==='m6');ok(!later.decoySearchTime&&!later.decoyLookoutTime&&!later.whistleRange,'first-mission timing leaks to final mission');
   return{firstInvestigator:cue.investigators,lookouts:cue.lookouts,searchSeconds:wait,lookoutSeconds:7,repeatedCueStaysCautious:true,noUnlockedSkills:true,visibleBasicHint:true};
  }''')
  assert not errors,errors
  out=R/'build/pairs-v182';out.mkdir(exist_ok=True);(out/'counterplay.json').write_text(json.dumps(report,indent=2));print('PASS',report);await b.close()
asyncio.run(main())
