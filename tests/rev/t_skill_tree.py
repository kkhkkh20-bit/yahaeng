"""Three finite prerequisite trees, migration, real effects, smoke and electronic tools."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/skills-v150';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  result=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},passed=[];
   ok(G.SKILL_TREE.length===27&&['body','assassin','tools'].every((k,i)=>G.SKILL_TREE.filter(s=>s.branch===k).length===[8,9,10][i]),'Revised 27-node trees missing');
   document.querySelector('#btnLedger').click();G.openAssassinMenu();
   ok(G.skillBudget()===4&&!G.loadSkillTree().learned.length,'Starting points are wrong');ok(!G.learnTreeSkill('chain'),'Skipped dependencies');
   for(const id of ['kit','smoke','kunai'])ok(G.learnTreeSkill(id),'Cannot learn '+id);
   ok(G.skillSpent(G.loadSkillTree())===3&&!G.learnTreeSkill('kunai'),'Duplicate purchase');ok(!G.learnTreeSkill('radio'),'Overspent points');
   ok(G.resetTreeSkills()&&G.skillSpent(G.loadSkillTree())===0,'Lobby reset did not refund');
   localStorage.setItem('yahaeng.skillTree.v1',JSON.stringify({schema:1,learned:['chain','quietStep','quietStep','unknown']}));
   ok(G.loadSkillTree().learned.join(',')==='quietStep','Corrupt/duplicate/orphan save accepted');
   G.closeAssassinMenu();localStorage.clear();
   const mission=G.STAGES.find(s=>s.id==='m1'),legacy={_clear:true};mission.challenges.slice(0,5).forEach(id=>legacy[id]=true);localStorage.setItem('yahaeng.ch',JSON.stringify({m1:legacy}));
   const migrated=G.loadSkillTree();ok(migrated.learned.includes('dual')&&migrated.learned.includes('chain')&&migrated.learned.includes('precision'),'Legacy skills/gear lost');ok(G.skillSpent(migrated)<=G.skillBudget(),'Migration exceeds available budget');
   localStorage.clear();passed.push('27 nodes, prerequisite/point/duplicate checks, refund, corrupt save and v147 migration');
   G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();let S=G.S,P=S.player;
   const base={kunai:P.kunai,stones:P.stones,picks:P.picks};
   G.openAssassinMenu();ok(G.learnTreeSkill('kit')&&G.learnTreeSkill('smoke'),'Live learning failed');
   ok(P.picks===base.picks+1&&P.stones===base.stones+2&&P.smokes===1,'Learned equipment not supplied');P.smokes--;G.syncRuntimeSkills();ok(!P.smokes,'Skill sync refilled consumed supplies');
   ok(!G.resetTreeSkills(),'Can reset/refill during a mission');G.closeAssassinMenu();
   G.saveCheckpoint();ok(G.loadCheckpoint(),'Checkpoint unavailable');S=G.S;P=S.player;ok(!P.smokes,'Checkpoint migration refilled supplies');
   passed.push('live learning grants once, mission reset blocked and checkpoint does not refill');
   G.start(G.STAGES.findIndex(s=>s.id==='tE'));while(G.DLG.modal)G.advanceDialog();S=G.S;P=S.player;const guard=S.guards[0];
   window.__tick=(seconds,full=false)=>{for(let t=0;t<seconds-1e-6;t+=.01){if(full)G.update(.01);else{S.t+=.01;G.updatePlayer(.01);G.updateSkillDevices()}}};
   S.guards=S.guards.slice(0,1);Object.assign(P,{x:guard.x-48,y:guard.y,fl:0,z:0,a:0});
   let n=P.blades;ok(!G.actBlade(false)&&P.blades===n,'Tap consumed a lethal blade');ok(G.actBlade(true)&&P.blades===n-1,'Blade did not launch');__tick(.5,true);ok(guard.state==='DEAD'&&!S.corpses[0].ko,'Blade did not cause actual lethal impact');
   ok(G.actRadio(),'Cannot acquire a real fallen radio');__tick(1.1);ok(P.hasRadio,'Acquisition channel failed');
   const receiver={...guard,id:44,x:P.x+210,y:P.y,a:0,want:0,state:'PATROL',meter:0,seen:false,radio:true,unconscious:false,doomed:false};S.guards.push(receiver);
   n=P.radioCharges;ok(G.actRadio({x:P.x+100,y:P.y})&&P.radioCharges===n-1&&receiver.why==='radio','Fake radio order not assigned');ok(!G.actRadio({x:P.x+100,y:P.y}),'Radio cooldown ignored');S.radioReadyAt=0;receiver.fl=1;const charges=P.radioCharges;ok(!G.actRadio({x:P.x+100,y:P.y})&&P.radioCharges===charges,'Radio crosses a floor or consumes failed charge');receiver.fl=0;receiver.state='PATROL';receiver.radio=false;ok(!G.actRadio({x:P.x+100,y:P.y}),'Guard without a radio hears a fake radio order');
   passed.push('blade deliberate hold, projectile impact, physical radio acquisition and one receiver/cooldown');
   const c=S.cams[0];P.x=c.x-80;P.y=c.y;P.a=0;P.techWork=null;P.strikeT=0;P.hurtT=0;S.guards=[];const rec=S.stats.camRec||0;
   ok(G.hackTarget()===c&&G.actHack(),'No close CCTV hack');__tick(.7);P.hurtT=.1;__tick(.01);ok(!P.techWork&&!c.hackedUntil,'Interrupted hack still committed');P.hurtT=0;
   ok(G.actHack(),'Hack could not restart');__tick(1.6);ok(c.hackedUntil>S.t&&!G.camOn(c)&&(S.stats.camRec||0)===rec,'Hack failed or deleted recordings');
   const until=c.hackedUntil;S.t=until+.01;ok(G.camOn(c),'CCTV failed to recover');
   c.fl=1;ok(!G.hackTarget(),'Hack crossed a floor');c.fl=0;G.G0[Math.floor(P.y/48)][Math.floor((P.x+c.x)/96)]='#';ok(!G.hackTarget(),'Hack crossed a wall');
   passed.push('CCTV channel interruption, temporary disable, expiry, recordings and floor/wall limits');
   return passed;
  }''')
  # Smoke physics and passive effects in a clear, lit training arena.
  result+=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='tE'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards[0];S.guards=[];S.toasts=[];
   Object.assign(P,{x:500,y:550,a:0,mode:'walk'});S.skills={};S.practiceSkills={};
   const plain=G.skillNoise('step',100);S.practiceSkills.quietStep=true;ok(G.skillNoise('step',100)===75&&plain===100,'Quiet walking effect missing');P.mode='sneak';S.practiceSkills.quietCrouch=true;ok(G.skillNoise('step',100)===65,'Quiet crouch effect missing');S.practiceSkills.sprint=true;ok(G.skillMoveMul('run')===1.12,'Sprint effect missing');S.practiceSkills.lookout=true;ok(Math.abs(G.skillViewMul()-1/1.1)<1e-9,'View expansion missing');
   S.practiceSkills.landing=true;S.practiceSkills.silentHands=true;ok(G.skillNoise('land',100)===60&&G.skillNoise('ko',100)===70&&G.skillNoise('crash',100)===100,'Landing/KO skill changes wrong sound');
   S.practiceSkills.shadow=true;ok(G.skillDetection(g,.2,true,100)===.85&&G.skillDetection(g,.8,true,100)===1&&G.skillDetection(g,.2,true,20)===1,'Darkness passive grants unconditional invisibility');
   const at={x:600,y:550,fl:0,z:0};ok(G.actSmoke(at),'Smoke not thrown');S.t+=1;G.updateSkillDevices();ok(S.smokes.length===1,'Smoke failed to detonate');const cloud=S.smokes[0];ok(cloud.r===112&&cloud.until-S.t===8,'Smoke upgrade values wrong');
   const eye={...g,x:500,y:550,fl:0,z:0,a:0,state:'PATROL'},end={x:700,y:550};ok(!G.canSee(eye,end.x,end.y,1,false,false,0),'Guard sees through smoke');ok(G.canSee({...eye,x:695},700,550,1,false,false,0)>0,'Smoke removes contact detection');const dog={...eye,dog:true,x:420,a:0,seen:false,meter:0};G.updateGuard(dog,.02);ok(dog.seen,'Smoke removed canine smell');const hear={...eye,x:600,hearT:0,state:'PATROL'};S.guards=[hear];P.mode='run';P.moving=true;G.noise(P.x,P.y,250,'step',0,0);ok(hear.hearT>0&&hear.hearKind==='run','Smoke erased running noise');ok(G.smokeRayRange(eye,end.x,end.y)<200,'Smoke does not block a crossing ray');ok(G.smokeRayRange({...eye,fl:1},end.x,end.y)===200,'Smoke leaks across floors');
   const camera={...S.cams[0],x:500,y:550,a:0,fl:0,z:0,search:false};ok(!G.cameraSees(camera,700,550,1),'CCTV sees through smoke');
   const until=cloud.until;S.t=until+.01;G.updateSkillDevices();ok(!S.smokes.length&&G.smokeRayRange(eye,700,550)===200,'Expired smoke keeps blocking');
   G.G0[11][12]='#';const cells=G.smokeCells({x:550,y:550,fl:0,z:0},96);ok(!cells['12,11'],'Smoke enters a solid wall');
   return ['walking/crouch noise, sprint, view, landing/KO sounds and conditional dark detection','smoke throw, upgrades, ray/CCTV occlusion, floor isolation, expiry and solid walls'];
  }''')
  result+=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='tE'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards[0];S.guards=[];S.practiceSkills={};
   const measure=(mode,skills,carry=false)=>{S.practiceSkills=skills;G.syncRuntimeSkills();Object.assign(P,{x:500,y:550,vx:0,vy:0,a:0,mode,hide:null,hidden:false,cover:null,snap:null,strikeT:0,jump:null,trav:null,carrying:carry?{x:500,y:550,fl:0,z:0,ch:'sam',carried:true,ko:true}:null});S.keys={ArrowRight:true,ShiftLeft:mode==='run'};G.input.sneakToggle=mode==='sneak';G.input.walkLock=mode==='walk';for(let i=0;i<120;i++){S.t+=.01;G.updatePlayer(.01)}S.keys={};return P.x-500;};
   const walk=measure('walk',{}),sneak=measure('sneak',{}),fastSneak=measure('sneak',{swiftCrouch:true}),run=measure('run',{}),fastRun=measure('run',{sprint:true}),carry=measure('walk',{},true),fastCarry=measure('walk',{bodyCarry:true},true);
   ok(fastSneak>sneak*1.16&&fastSneak<sneak*1.24,'Learned crouch does not increase actual movement');ok(fastRun>run*1.09&&fastRun<run*1.15,'Sprint has no actual speed effect');ok(fastCarry>carry*1.2,'Body carry passive has no actual movement effect');
   P.carrying=null;P.x=500;P.y=550;P.mode='walk';P.hidden=false;S.practiceSkills={};Object.assign(g,{x:590,y:550,fl:0,z:0,state:'PATROL',meter:0,hearT:0,dog:true,civ:false});S.guards=[g];G.noise(P.x,P.y,110,'step',0,0);ok(g.state==='SUSPICIOUS','Control dog did not hear walking');g.state='PATROL';S.practiceSkills.quietStep=true;G.noise(P.x,P.y,110,'step',0,0);ok(g.state==='PATROL','Learned quieter steps do not reduce canine hearing');g.dog=false;
   S.practiceSkills={};P.mode='sneak';P.light=.2;Object.assign(g,{x:440,y:550,a:0,want:0,post:0,still:true,glance:0,state:'PATROL',meter:0,hearT:0,climb:null,doomed:false});G.updateGuard(g,.01);const ordinary=g.meter;g.meter=0;S.practiceSkills.shadow=true;G.updateGuard(g,.01);ok(ordinary>0&&Math.abs(g.meter/ordinary-.85)<.03,'Darkness training does not slow actual detection');
   S.practiceSkills={};P.hidden=true;g.x=P.x-32;g.a=0;ok(G.canSee(g,P.x,P.y,.2,true,true,0)>0,'Control observer cannot see within foliage range');S.practiceSkills.foliage=true;ok(!G.canSee(g,P.x,P.y,.2,true,true,0),'Foliage posture does not reduce actual sight radius');
   P.hidden=false;Object.assign(g,{x:P.x+30,y:P.y,a:Math.PI/2,state:'PATROL',elite:false,civ:false,climb:null});S.practiceSkills={};ok(!G.canKill(g,P),'Control attack already permits flank');S.practiceSkills.blindside=true;ok(G.canKill(g,P),'Learned flank angle has no effect');g.elite=true;ok(!G.canKill(g,P),'Flank passive overrides elite restriction');
   return ['actual displacement: crouch, sprint and body carry; actual AI hearing/detection/foliage; constrained flank attack'];
  }''')
  result+=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};localStorage.clear();G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.elite);S.guards=[g];let place=null;
   for(let y=1;y<G.MH-1&&!place;y++)for(let x=1;x<G.MW-1&&!place;x++){const z=G.rLv(x,y);if(z<1||z>2||G.robAt(x,y))continue;for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!G.rLv(nx,ny)&&G.bldAt(nx,ny)<0&&!G.solidAt(nx,ny)){place={x,y,z,nx,ny};break;}}}
   ok(place,'No real roof edge available');Object.assign(P,{x:place.x*48+24,y:place.y*48+24,z:place.z,fl:0,strikeT:0,carrying:null,captive:null,hide:null,jump:null,trav:null,wire:null});Object.assign(g,{x:place.nx*48+24,y:place.ny*48+24,z:0,fl:0,state:'PATROL',child:false,civ:false,dog:false,elite:false,doomed:false,climb:null});
   ok(!G.dropTarget(),'Unlearned drop is available');G.openAssassinMenu();ok(G.learnTreeSkill('silentHands')&&G.learnTreeSkill('drop'),'Could not learn drop');G.closeAssassinMenu();ok(G.dropTarget()===g,'Learned real roof drop unavailable');
   S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();ok(!!P.jump,'Roof attack did not create physical movement');for(let i=0;i<180;i++){S.t+=.01;G.updatePlayer(.01);G.updateKoHold();}S.keys.KeyZ=false;G.combatRelease('KeyZ');
   ok(!P.jump&&P.z===0&&Math.hypot(P.x-g.x,P.y-g.y)<40&&g.state==='DEAD'&&S.stats.kills===1,'Drop did not physically land and finish deliberate kill');
   return ['learned drop from a real roof: locked before purchase, physical descent and held lethal outcome'];
  }''')
  result+=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};localStorage.clear();const st=G.STAGES.find(s=>s.id==='m1'),r={_clear:true};st.challenges.slice(0,5).forEach(id=>r[id]=true);localStorage.setItem('yahaeng.ch',JSON.stringify({m1:r}));G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.t=12;delete S.skills;delete S.skillGrants;delete P.blades;S.perks={pick:true,can:false,dart:true};const before={picks:P.picks,kunai:P.kunai,stones:P.stones};G.saveCheckpoint();ok(G.loadCheckpoint(),'Old checkpoint rejected');const after=G.S.player;ok(after.picks===before.picks&&after.kunai===before.kunai&&after.stones===before.stones,'v147 checkpoint receives duplicate gear');
   G.syncRuntimeSkills();ok(after.blades===2,'New equipment was not granted exactly once');return ['v147 checkpoint migration preserves consumed gear without duplication'];
  }''')
  result+=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};localStorage.clear();const st=G.STAGES.find(s=>s.id==='m1'),r={_clear:true};st.challenges.forEach(id=>r[id]=true);localStorage.setItem('yahaeng.ch',JSON.stringify({m1:r}));G.storeSkillTree({schema:1,learned:['kit','kunai','smoke','radio','hack']});const i=G.STAGES.findIndex(s=>s.id==='m6');G.start(i);while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;ok(G.STAGE.bare&&!P.blades&&!P.smokes&&!P.hackDevice&&G.toolCount('hack')===0&&!G.actHack(),'Bare start materializes learned gadgets');G.giveKey('gear');ok(P.blades===2&&P.smokes===1&&P.hackDevice===1,'Recovered kit lacks learned gadgets');P.smokes=0;G.syncRuntimeSkills();ok(!P.smokes,'Recovering kit enables repeated refill');for(const k of ['stonesUsed','kunaiUsed','coins','bladesUsed','smokesUsed']){S.stats.stonesUsed=S.stats.kunaiUsed=S.stats.coins=S.stats.bladesUsed=S.stats.smokesUsed=0;S.stats[k]=1;ok(!G.challengeStatus('nolure'),'Throwing challenge ignores '+k);}return ['bare start requires physical equipment; recovering confiscated kit grants owned tools once; new thrown tools affect challenge evaluation'];
  }''')
  assert not errors,errors;(O/'mechanics.json').write_text(json.dumps({'checks':result,'pageErrors':errors},ensure_ascii=False,indent=2));print('PASS','; '.join(result));await b.close()
asyncio.run(main())
