"""Controlled routine, interruption and save fixtures; actual authored sprites.
Native AI-on observation and assassination are tested by officer_hunt_live.py.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/targets-v207';O.mkdir(exist_ok=True)
# Detailed screen text (설정 · 화면 글: 자세히): this test checks guidance the minimal default hides.
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];requests=[];q.on('pageerror',lambda e:errors.append(str(e)));q.on('request',lambda r:requests.append(r.url))
  await q.add_init_script('localStorage.clear();localStorage.setItem(`yahaeng.guide`,`full`);window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game',polling=100)
  result=await q.evaluate('''async()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();return G.S};
   const coats=[],seen=[];
   for(const id of ['p0','e1','e5','m2','m4','m7','m5','n1']){
    const S=fresh(id);for(const g of S.guards.filter(g=>g.target)){
     const key=G.targetPersonaKey(g);ok(key,'missing gesture source '+id);await G.spriteSources.load(key.split('@')[1]);
     const pal=G.characterPalette(g),profile=G.STAGE.targetCast[g.tag];ok(profile.personality&&profile.habit&&profile.appearance,'missing identity '+id);coats.push(pal[2]);
     ok(G.STAGE.brief.includes(profile.appearance.split(' · ')[0])||id==='m4'||id==='m5'||id==='n1','brief does not match clothing '+id);
     const m=G.PR.bodies[key.split('@')[1]];for(const name of ['phone','ledger','point','drink','smoke']){ok(m.anims[name][1]===14,'not a full gesture '+id);for(const row of m.bounds[name])for(const box of row)ok(box&&box[0]>0&&box[1]>0&&box[2]<64&&box[3]<64,'empty/clipped pose '+id+':'+name);}
     seen.push({id,name:G.targetName(g),key,appearance:profile.appearance});
    }
   }
   ok(new Set(coats).size===seen.length,'officers share a coat colour');
   let S=fresh('m2'),g=S.guards.find(g=>g.target),P=S.player;await G.spriteSources.load('suitPersonaMotion');
   Object.assign(P,{x:g.x-90,y:g.y+45,fl:g.fl,z:0});Object.assign(g,{state:'PATROL',moving:false,path:null,wait:12});
   const before=JSON.stringify([g.x,g.y,g.a,g.route,g.wait,g.meter,S.stats,S.items.map(i=>i.got)]),fov=G.guardFov(g),budget=G.skillBudget();
   G.updateTargetPersonalities();G.moveCamera(1);const goal=G.episodeRadioMessage().action;G.syncEpisodeRadio();ok(document.getElementById('episodeRadio').hidden&&G.episodeRadioMessage().action===goal,'local dialogue hides or changes the goal instead of only the radio card');ok(g.persona.pose?.kind==='smoke'&&g.say.includes('문 앞'),'smoking routine is not attached to its real location');ok(G.visibleSpeechCandidates(P,false,true).includes(g),'approach focus hides the speaking target');
   ok(JSON.stringify([g.x,g.y,g.a,g.route,g.wait,g.meter,S.stats,S.items.map(i=>i.got)])===before&&G.guardFov(g)===fov&&G.skillBudget()===budget,'performance modifies AI, stats or rewards');
   const pose=G.targetGesturePose(g);ok(pose?.key==='castClub@suitPersonaMotion','wrong body/coat in gesture');S.t+=2;ok(G.targetGesturePose(g).frame>4,'gesture frozen');
   G.saveCheckpoint();const line=g.say;ok(G.loadCheckpoint(),'checkpoint failed');S=G.S;g=S.guards.find(g=>g.target);G.updateTargetPersonalities();ok(g.say===line&&g.persona.pose.kind==='smoke','checkpoint restarts or loses performance');
   g.say=null;g.sayT=0;await new Promise(resolve=>setTimeout(resolve,140));G.syncEpisodeRadio();ok(!document.getElementById('episodeRadio').hidden&&G.episodeRadioMessage().action===goal,'guide does not return to its original goal');
   g.state='ALERT';G.updateTargetPersonalities();ok(!G.targetGesturePose(g)&&!g.persona.pose&&g.say.includes('들여보냈어'),'combat does not cancel routine or trigger personal reaction');
   g.state='DEAD';g.unconscious=true;G.updateTargetPersonalities();ok(!G.targetGesturePose(g)&&!g.persona.reaction,'KO keeps talking or holding props');
   S=fresh('m4');g=S.guards.find(g=>g.tag==='vip');Object.assign(S.player,{x:g.x+48,y:g.y,fl:g.fl,z:0});Object.assign(g,{moving:false,path:null,wait:999});G.updateTargetPersonalities();ok(g.say?.includes('인계')&&g.persona.pose.kind==='ledger','district boss has no personal routine');
   S.alevel=2;G.updateTargetPersonalities();ok(!g.persona.pose,'calm routine continues through alarm');
   S.alevel=0;S.t+=30;g.stripped=true;G.updateTargetPersonalities();ok(!g.persona.pose,'stripped officer keeps dressed performance');
   fresh('n1');await G.spriteSources.load('femaleSuitPersonaMotion');ok(!Object.keys(G.spriteSources.loaded).includes('suitPersonaMotion'),'old mission retains officer animation atlas');
   return{officers:seen,gestures:5,framesPerGesture:14,directions:8,aiUnchanged:true,checkpoint:true,combatInterrupt:true,koInterrupt:true,resourceRelease:true};
  }''')
  assert not errors,errors;assert not any('.glb' in u or '.fbx' in u or 'three.module' in u for u in requests),'runtime requests 3D assets'
  await b.close()
 (O/'checks.json').write_text(json.dumps({'result':result,'errors':errors,'method':__doc__},ensure_ascii=False,indent=2));print('PASS target personality',json.dumps(result,ensure_ascii=False))
asyncio.run(main())
