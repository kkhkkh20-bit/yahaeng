// Visual performances and local speech never change a route, sight direction,
// suspicion meter, movement speed, attack opening or skill/progression reward.
function targetPersonaKey(g){
 const profile=targetProfile(g);if(!profile?.personality||g.stripped)return null;
 const [pal,body]=prSplit(profile.key),source=body+'PersonaMotion';
 return PR?.bodies?.[source]?pal+'@'+source:null;
}
function targetIsPerforming(g){
 return !!targetProfile(g)?.personality&&g.state==='PATROL'&&!g.stripped&&!g.unconscious&&!g.moving&&!g.path?.length&&g.wait>.1&&!g.climb&&!g.doomed&&!g.yank&&!g.containerMoving&&!g.ledgeFalling&&!g.chat&&!g.drinkT&&!g.mealT&&!g.swingT&&!S.alevel&&!S.player.killAnim&&!S.player.assassinAnim&&!(STAGE.id==='m2'&&g.tag==='vip'&&S.vipPlan?.phase==='sick');
}
function targetCue(g){
 const d=targetProfile(g)?.personality;if(!d)return null;
 const s=schedNow(g),cur=s?.cur,routeIndex=(g.ri-1+g.route.length)%g.route.length;
 if(STAGE.id==='m2'&&g.tag==='vip'&&cur?.once)return ['ledger','장부는 원본으로 가져와. 경호는 밖에서 기다려.'];
 if(vipRoutine(g)==='smoke')return d.cues.find(c=>c[0]==='smoke')||d.cues[0];
 if(STAGE.id==='m2'&&g.tag==='vip'&&cur?.name==='VIP룸')return ['drink','여기서 한 잔 더 하지. 장부 연락 오면 바로 알려.'];
 if(cur?.act==='양주')return d.cues.find(c=>c[0]==='drink')||d.cues[0];
 if(cur?.act==='통화')return d.cues.find(c=>c[0]==='phone')||d.cues[0];
 if(cur&&g.tag==='boss'&&STAGE.id==='n1')return d.cues[(g.sched.indexOf(cur)+d.cues.length)%d.cues.length];
 return d.cues[(g.route.length>1?routeIndex:g.persona?.sequence||0)%d.cues.length];
}
function targetGesturePose(g){
 const p=g.persona,key=targetPersonaKey(g);if(!key||!p?.pose||S.t>=p.pose.end||!targetIsPerforming(g))return null;
 const body=prSplit(key)[1];if(!prBodies[body]){prLoadBody(body);return null;}
 const m=PR.bodies[body],anim=p.pose.kind,n=m.anims[anim]?.[1];if(!n)return null;
 return{key,anim,frame:clamp((S.t-p.pose.start)/(p.pose.end-p.pose.start),0,1)*(n-1)};
}
function targetSpeechNear(g){return flOf(g)===flOf(S.player)&&(g.z||0)===(S.player.z||0)&&dist(g.x,g.y,S.player.x,S.player.y)<330&&canObserveTarget(g);}
// Let a visible officer finish a local line before the optional radio card
// returns. The underlying goal/message is never dismissed or advanced.
function targetDialogueVisible(){
 if(!S||S.alevel||S.player.captive||actionBusy()||input.aiming)return false;
 return S.guards.some(g=>{
  const own=g.say&&(g.say===g.persona?.said||g.say===g.officerReply?.text&&g.officerReply.until>S.t),pending=S.personaReply?.owner===g.id&&S.personaReply.at-S.t<1;
  if(g.state!=='PATROL'||(!own&&!pending)||!targetSpeechNear(g))return false;
  const x=(g.x-cam.x)*SCALE+W/2,y=(g.y-cam.y)*SCALE+H/2;
  return x>20&&x<W-20&&y>65&&y<H-50;
 });
}
function updateTargetPersonalities(){
 if(!S||S.over||DLG.modal)return;
 if(S.personaReply&&S.t>=S.personaReply.at){
  const reply=S.personaReply;S.personaReply=null;const g=S.guards.find(g=>g.id===reply.id),leader=S.guards.find(g=>g.id===reply.owner);
  if(g&&leader&&targetIsPerforming(leader)&&g.state==='PATROL'&&!g.say&&!g.chat&&flOf(g)===flOf(leader)&&dist(g.x,g.y,leader.x,leader.y)<150&&targetSpeechNear(leader)&&los(g.x,g.y,leader.x,leader.y)){gsay(g,reply.text,2.7);g.actionSpeechUntil=S.t+2.7;g.officerReply={text:reply.text,until:S.t+2.7};}
 }
 for(const g of S.guards){
  const d=targetProfile(g)?.personality;if(!d)continue;
  const p=g.persona||(g.persona={sequence:0,next:0,lastState:'PATROL'});
  if(g.state!==p.lastState){if(g.say===p.said){g.say=null;g.sayT=0;}if(['ALERT','FLEE','SEARCH','SUSPICIOUS'].includes(g.state)&&!g.unconscious)p.reaction={at:S.t,until:S.t+7};p.lastState=g.state;}
  if(g.state==='DEAD'||g.unconscious||g.doomed||g.climb){p.pose=null;p.reaction=null;continue;}
  if(p.reaction){
   if(S.t>p.reaction.until)p.reaction=null;
   else if(!g.say&&!g.chat&&targetSpeechNear(g)){gsay(g,d.alert,3);p.reaction=null;}
  }
  if(!targetIsPerforming(g)){if(p.pose&&g.say===p.said){g.say=null;g.sayT=0;}p.pose=null;continue;}
  if(p.pose&&S.t<p.pose.end)continue;
  p.pose=null;if(S.t<p.next||S.t<(S.personaNext||0)||g.say||!targetSpeechNear(g))continue;
  const cue=targetCue(g);if(!cue)continue;
  const duration=Math.min(4.4,Math.max(2.8,g.wait-.12));if(duration<2.8||g.wait<3)continue;
  p.pose={kind:cue[0],start:S.t,end:S.t+duration};p.next=S.t+20+(g.id%3)*3;p.sequence++;S.personaNext=S.t+8;
  const key=targetPersonaKey(g);if(key){const body=prSplit(key)[1];prLoadBody(body);prWarm([key],true);}
  gsay(g,cue[1],3.6);p.said=cue[1];
  if(d.reply){const guard=S.guards.filter(o=>o!==g&&!o.civ&&!o.dog&&!o.target&&o.state==='PATROL'&&!o.say&&!o.chat&&flOf(o)===flOf(g)&&dist(o.x,o.y,g.x,g.y)<130&&los(o.x,o.y,g.x,g.y)).sort((a,b)=>dist(a.x,a.y,g.x,g.y)-dist(b.x,b.y,g.x,g.y))[0];if(guard)S.personaReply={id:guard.id,owner:g.id,text:d.reply,at:S.t+3.8};}
 }
}
