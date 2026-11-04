"""Controlled scenes for targeting, fixed intercepts and physical miss conditions."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
  checks=await q.evaluate('''()=>{
   const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)};
   const fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.target&&!g.dog&&!g.child);S.guards=[g];S.cams=[];S.facOn=false;S.t=10;G.setLayer(0);Object.assign(P,{x:1584,y:1008,a:0,fl:0,z:0,hidden:false,cover:null});Object.assign(g,{x:1764,y:1008,a:0,fl:0,z:0,state:'PATROL',moving:false,doomed:false,climb:null,doorWork:null,follow:null,path:null});return{S,P,g}};
   let {S,P,g}=fresh();G.openAssassinMenu();ok(G.learnTreeSkill('kit')&&G.learnTreeSkill('dart'),'dart purchase failed');G.closeAssassinMenu();
   ({S,P,g}=fresh());const civilian={...g,id:999,civ:true,target:false,x:P.x+50};S.guards.push(civilian);
   ok(G.kunaiTarget()?.ref===g,'nearby civilian steals a guard shot');S.guards=[civilian];ok(!G.kunaiTarget(),'unmarked civilian auto-selected');S.marked=civilian;const intentional=G.kunaiTarget();ok(intentional?.ref===civilian&&intentional.explicitCivilian,'deliberately marked civilian unavailable');civilian.child=true;ok(!G.kunaiTarget(),'child selectable');out.push('automatic guard/target selection; civilian requires explicit mark; child excluded');
   ({S,P,g}=fresh());const ammo=P.kunai;g.fl=1;G.actKunai({type:'guard',ref:g,x:g.x,y:g.y});ok(P.kunai===ammo&&!S.kunais.length,'queued stale floor consumes ammo');g.fl=0;g.x=P.x+600;G.actKunai({type:'guard',ref:g,x:g.x,y:g.y});ok(P.kunai===ammo,'out-of-range forced shot consumes ammo');out.push('queued targets revalidate floor and range before spending ammunition');
   const movingShot=()=>{const a=fresh();a.g.path=[{x:2200,y:1008}];a.S.t+=.01;G.moveAlong(a.g,140,.01);G.actKunai();ok(a.S.kunais.length===1,'moving guard not fired at');return{...a,k:a.S.kunais[0]}};
   let a=movingShot(),releaseX=a.k.tgt.x;ok(releaseX>a.g.x+24,'no lead for observed running guard');while(a.k.t<a.k.dur){a.S.t+=.01;G.moveAlong(a.g,140,.01);a.k.t+=.01;}ok(a.k.tgt.x===releaseX,'projectile homes after release');G.kunaiHit(a.k);ok(a.g.state==='DEAD'&&a.g.unconscious&&a.S.stats.ko===1,'ordinary moving guard missed');out.push('observed movement leads a fixed throw and hits a steadily moving guard');
   a=movingShot();a.g.path=[{x:1600,y:1008}];while(a.k.t<a.k.dur){a.S.t+=.01;G.moveAlong(a.g,140,.01);a.k.t+=.01;}G.kunaiHit(a.k);ok(a.g.state!=='DEAD','sudden reversal still magically hits');out.push('sudden direction change can evade a fixed throw');
   a=movingShot();a.g.fl=1;G.kunaiHit(a.k);ok(a.g.state!=='DEAD','floor change still hits');
   ({S,P,g}=fresh());G.actKunai();const k=S.kunais[0];G.G0[21][34]='#';G.kunaiHit(k);ok(g.state!=='DEAD','closed cover ignored');G.G0[21][34]='.';out.push('floor changes and intervening cover block a hit');
   ({S,P,g}=fresh());const I={pose:'dress',dur:3,t:0};let low=false,high=false,rise=false;P.mode='sneak';for(let i=0;i<=60;i++){I.t=i*.05;const s=G.clothingPose(I);ok(Number.isFinite(s.frame)&&s.frame>=0&&s.frame<=(s.anim==='duck'?8:16),'invalid clothing frame');low||=s.anim==='openLow';high||=s.anim==='openHigh';rise||=s.anim==='duck';}ok(low&&high&&rise&&G.clothingPose(I).anim==='duck'&&G.clothingPose(I).frame===8,'clothing pose never returns to crouch');out.push('garment pickup, rise, torso adjustment and return to crouch use valid authored frames');return out;
  }''')
  assert not errors,errors;await b.close();print('PASS dart intent and action poses',json.dumps(checks,ensure_ascii=False))
asyncio.run(main())
