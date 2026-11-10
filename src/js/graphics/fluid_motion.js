// Dense, offline-authored frames. Missing/cold sources always retain the legacy
// pose, so an uncached outfit can never make either actor disappear.
function fluidSource(key,anim){
 if(!PR?.fluidBodies)return null;
 const plain=key.replace(/_ol$/,''),body=prSplit(plain)[1]||'key',routes=PR.fluidBodies[body];
 if(!routes)return null;
 for(const name of Object.values(routes))if(PR.bodies[name]?.anims[anim])return name;
 return null;
}
function warmFluidPose(key,anim){const name=fluidSource(key,anim);if(name)prLoadBody(name);}
function corpseRestPose(c){
 if(c.dog)return null;
 const key=c.stripped?strippedKey(c):c.ch,elapsed=c.t0==null?2:S.t-c.t0;
 if(!key||!c.settled&&elapsed<.75)return null;
 const anim=c.settled||elapsed>=1?'rest':'restIn',name=fluidSource(key,anim);
 if(!name)return null;if(!prBodies[name]){prLoadBody(name);return null;}
 return{key,anim,frame:anim==='rest'?0:clamp((elapsed-.75)/.25,0,1)*8,meta:PR.bodies[name]};
}
function pairedRestShift(A){
 const m=PR?.bodies?.[fluidSource(A.ch,'lowered')];
 return m?.restShift?.[prDir(S.player.a)]||[Math.cos(S.player.a)*24,Math.sin(S.player.a)*24];
}
function fluidSprite(key,anim,t,frame=-1){
 const name=fluidSource(key,anim);if(!name)return null;
 if(!prBodies[name]){prLoadBody(name);return null;}
 const outline=key.endsWith('_ol'),plain=key.replace(/_ol$/,''),[pal,body]=prSplit(plain),old=PR.bodies?.[body]||PR,m=PR.bodies[name],n=m.anims[anim][1],loop=m.loops?.[anim];
 const before=old.anims[anim]?.[1]||n;
 const f=frame>=0?(loop?frame/before*n:frame/Math.max(1,before-1)*(n-1)):loop?((t%loop+loop)%loop)/loop*n:Math.floor(t*1.6)%n;
 const actual=loop?((Math.floor(f)%n)+n)%n:clamp(Math.round(f),0,n-1),target=pal+'@'+name;
 prSheet(target);return{key:target+(outline?'_ol':''),meta:m,frame:actual};
}
const HERO_LOOP={walk:1,run:.64,sneak:1.24,carry:8/7,grab:.55/.4,hold:8/9,hugStep:4/4.5};
const heroVisualStates=new WeakMap();
function updateHeroVisual(P){
 const anim=P.carrying?'carry':P.captive?'grab':P.cover?'hugStep':P.item?.id==='box'?'hold':P.mode==='run'?'run':P.mode==='sneak'?'sneak':'walk';
 let v=heroVisualStates.get(P);if(!v){v={phase:0,gait:P.gaitTime||0,time:S.t,crouch:P.mode==='sneak'?1:0,moving:false,anim};heroVisualStates.set(P,v);}
 const dt=clamp(S.t-v.time,0,.06),moving=(P.travelSpeed==null?!!P.moving:P.travelSpeed>6)&&!!(P.moving||Math.hypot(P.vx||0,P.vy||0)>.1);
 v.phase=(v.phase+Math.max(0,(P.gaitTime||0)-v.gait)/(HERO_LOOP[anim]||1))%1;
 if(v.moving&&!moving&&v.anim==='walk'&&!actionBusy(P)){v.stopAt=S.t;v.stopPhase=Math.round(v.phase*4)%4;}
 if(moving||actionBusy(P))v.stopAt=null;
 v.crouch=clamp(v.crouch+(P.mode==='sneak'?1:-1)*dt/.18,0,1);
 if(P.strikeT>0&&(!(v.strikeRemaining>0)||P.strikeT>v.strikeRemaining+.02)){v.strikeDuration=P.strikeT;v.strikeAt=S.t;}
 v.strikeRemaining=P.strikeT||0;v.gait=P.gaitTime||0;v.time=S.t;v.moving=moving;v.anim=anim;
 // Decode action poses during actual play, rather than blocking first input.
 const look=playerKey(P);
 if(S.t>.3&&v.actionLook!==look){v.actionLook=look;warmFluidPose(look,'duck');warmFluidPose(look,'choke');warmFluidPose(look,'lower');}
 return v;
}
function heroMotionClock(P,anim,fallback=P.gaitTime??S.t){const v=heroVisualStates.get(P);return v&&HERO_LOOP[anim]?v.phase*HERO_LOOP[anim]:fallback;}
function heroTransitionPose(P,moving){
 const v=heroVisualStates.get(P);if(!v||moving||P.carrying||P.captive||P.cover||P.strikeT>0)return null;
 if(P.pairRise&&S.t-P.pairRise.t0<.16&&!actionBusy(P)&&P.mode!=='sneak')return{anim:'duck',frame:5*(1-clamp((S.t-P.pairRise.t0)/.16,0,1))};
 if(v.crouch>0&&v.crouch<1)return{anim:'duck',frame:v.crouch*8};
 if(v.stopAt!=null&&S.t-v.stopAt<.16&&P.mode!=='sneak')return{anim:'settle'+v.stopPhase,frame:clamp((S.t-v.stopAt)/.16,0,1)*6};
 return null;
}
function heroStrikeFrame(P){const v=heroVisualStates.get(P);return v?.strikeDuration?clamp(1-(P.strikeT||0)/v.strikeDuration,0,1)*3:-1;}
