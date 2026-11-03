// A held input prepares a lethal skill. Victims are locked by id, not retargeted.
function beginAssassinSkill(group='skill',tap=null){
  if(!S||!running||S.over||paused||tactical||DLG.modal||S.keypad||!assassinSupported()||actionBusy())return;
  const choice=assassinOpportunity(),source=combatSource(group);
  if(!choice||!source){toast(assassinReason(),2.2);return;}
  const P=S.player;P.skillHold={...choice,source,tap,t0:S.t,x:P.x,y:P.y,fl:flOf(P),z:P.z||0};P.vx=P.vy=0;P.moving=false;
}
// A short attack press retains its original single victim. Cancel events never attack.
function releaseAssassinTap(h){
  if(!h.tap||!running||paused||tactical||S.over||DLG.modal||S.keypad||S.t-h.t0>=LETHAL_HOLD)return;
  const P=S.player,choice=assassinOpportunity(h.key);
  if(P.hurtT>0||flOf(P)!==h.fl||(P.z||0)!==h.z||dist(P.x,P.y,h.x,h.y)>8||!choice||choice.ids.some((id,i)=>id!==h.ids[i]))return;
  // The released press cannot borrow another held key's lethal intention.
  actPrimary({...h.tap,viaZ:true,inputGroup:'atk',combatSource:{id:h.source.id,serial:-1}});
}
function cancelAssassinSkill(){
  if(!S?.player)return;const P=S.player,A=P.assassinAnim;
  if(A){
    for(const id of A.ids){const g=S.guards.find(g=>g.id===id);if(g)g.doomed=false;}
    for(const c of S.corpses)if(A.ids.includes(c.guardId))delete c.skillAnimating;
    P.strikeT=0;P.assassinAnim=null;
  }P.skillHold=null;
}
function assassinAt(id){return S.guards.find(g=>g.id===id);}
function skillVictimStillValid(g,P,reach){
  if(!g)return false;const was=g.doomed;g.doomed=false;const ok=assassinVictim(g,P,reach);g.doomed=was;return ok;
}
function commitAssassinHit(A,index){
  const P=S.player,g=assassinAt(A.ids[index]);
  if(!skillVictimStillValid(g,P,66))return false;
  A.hits[index]=S.t;P.a=Math.atan2(g.y-P.y,g.x-P.x);
  g.doomed=false;g.takedownIntent={source:null,lethal:true,assailantLook:witnessedAssailant(g)};
  S.koNext=false;S.lethalNext=true;g.pairDown=true;
  try{killGuard(g,null,null,true);}finally{delete g.pairDown;}
  const c=S.corpses.find(c=>c.guardId===g.id&&!c.ko);
  if(!c)return false;
  c.skillAnimating=true;spawnEffect('strike',{x:g.x,y:g.y-20,fl:flOf(g),z:g.z||0},{scale:.65,angle:P.a});
  if(index===0){S.skillReadyAt=S.t+ASSASSIN_SKILLS[A.key].cooldown*(skillOn('flow')?.8:1);S.stats.assassinUses=(S.stats.assassinUses||0)+1;}
  return true;
}
function updateAssassinSkill(P,dt){
  const h=P.skillHold;
  if(h){
    if(!combatHeld(h.source)||flOf(P)!==h.fl||(P.z||0)!==h.z||dist(P.x,P.y,h.x,h.y)>8||P.hurtT>0){P.skillHold=null;return false;}
    const chosen=assassinOpportunity(h.key);
    if(!chosen||chosen.ids.some((id,i)=>id!==h.ids[i])){P.skillHold=null;return false;}
    P.vx=P.vy=0;P.moving=false;P.hidden=false;P.light=lightAt(P.x,P.y,false);
    if(S.t-h.t0<LETHAL_HOLD)return true;
    P.skillHold=null;const A=P.assassinAnim={key:h.key,ids:h.ids,hits:[null,null],t0:S.t,fl:h.fl,z:h.z,x:P.x,y:P.y,phase:'first'};
    for(const id of h.key==='dual'?h.ids:[h.ids[0]])assassinAt(id).doomed=true;
    P.strikeT=4;P.a=Math.atan2(assassinAt(h.ids[0]).y-P.y,assassinAt(h.ids[0]).x-P.x);endChat(assassinAt(h.ids[0]));
    S.qBuf=0;S.koHold=null;return true;
  }
  const A=P.assassinAnim;if(!A)return false;
  if(flOf(P)!==A.fl||(P.z||0)!==A.z||P.hurtT>0||P.hide||P.carrying||P.captive){cancelAssassinSkill();return false;}
  P.vx=P.vy=0;P.moving=false;P.hidden=false;P.light=lightAt(P.x,P.y,false);
  const t=S.t-A.t0;
  if(A.hits[0]==null&&t>=.34&&!commitAssassinHit(A,0)){cancelAssassinSkill();return false;}
  if(A.key==='dual'){
    if(dist(P.x,P.y,A.x,A.y)>8){cancelAssassinSkill();return false;}
    if(A.hits[1]==null&&t>=.41&&!commitAssassinHit(A,1)){cancelAssassinSkill();return false;}
    if(t>=1.05)finishAssassinSkill(A);return true;
  }
  if(t<.62)return true;
  const second=assassinAt(A.ids[1]);
  if(A.phase==='first'){
    if(!skillVictimStillValid(second,P,195)){cancelAssassinSkill();return false;}
    const at=assassinLanding(second,P);if(!assassinPath(P,at)){cancelAssassinSkill();return false;}
    P.mode='walk';A.phase='move';A.moveAt=S.t;A.from={x:P.x,y:P.y,fl:A.fl,z:A.z};A.to=at;A.moveDur=Math.max(.2,dist(P.x,P.y,at.x,at.y)/210);
  }
  if(A.phase==='move'){
    if(!skillVictimStillValid(second,P,195)||!assassinPath(P,A.to)){cancelAssassinSkill();return false;}
    const f=clamp((S.t-A.moveAt)/A.moveDur,0,1),x=P.x,y=P.y;
    P.x=A.from.x+(A.to.x-A.from.x)*f;P.y=A.from.y+(A.to.y-A.from.y)*f;P.a=Math.atan2(A.to.y-y,A.to.x-x);P.moving=true;advancePlayerGait(P,x,y,dt,SPD.run);
    if(f>=1){A.phase='second';A.secondAt=S.t;second.doomed=true;endChat(second);P.a=Math.atan2(second.y-P.y,second.x-P.x);}return true;
  }
  if(A.hits[1]==null&&S.t-A.secondAt>=.25&&!commitAssassinHit(A,1)){cancelAssassinSkill();return false;}
  if(S.t-A.secondAt>=.8)finishAssassinSkill(A);return true;
}
function finishAssassinSkill(A){
  if(A.hits.every(t=>t!=null)){S.stats[A.key==='dual'?'dualAssassinations':'chainAssassinations']=(S.stats[A.key==='dual'?'dualAssassinations':'chainAssassinations']||0)+1;S.stats.special++;}
  cancelAssassinSkill();
}
function drawAssassinActors(P,key,alpha=1){
  const A=P.assassinAnim;if(!A)return false;
  const t=S.t-A.t0,move=A.phase==='move',attackT=A.phase==='second'?S.t-A.secondAt:t;
  const fi=PR?.anims?.stab?Math.min(PR.anims.stab[1]-1,Math.floor(clamp(attackT/1.05,0,1)*PR.anims.stab[1])):0;
  if(usePR(key))drawPR(key,P.x,P.y,P.a,move?'run':'stab',S.t,alpha,1,0,move?undefined:fi);else drawChar(key,P.x,P.y,P.a,move,alpha,3,true);
  for(let i=0;i<A.ids.length;i++){
    const g=assassinAt(A.ids[i]);if(!g)continue;
    // Only the surprised/struck victim belongs to this animation; the next guard
    // keeps patrolling and can notice the approach until the second attack starts.
    if(i===1&&A.key==='chain'&&!A.hits[1]&&A.phase!=='second')continue;
    const hit=A.hits[i],k=charOf(g);
    if(usePR(k)&&hit!=null){const frames=PR.anims.death?.[1]||6;drawPR(k,g.x,g.y,g.a,'death',0,1,1,0,Math.min(frames-1,Math.floor((S.t-hit)*12)));}
    else if(hit!=null)blit(ctx,'dead_'+k,g.x-24,g.y-26,48,48);
    else if(g.state!=='DEAD'){if(usePR(k))drawPR(k,g.x,g.y,g.a,'idle',S.t,1,1);else drawChar(k,g.x,g.y,g.a,false,1,3);}
  }return true;
}
function assassinOwnsActor(g){const A=S.player.assassinAnim;return !!A&&A.ids.includes(g.id)&&(A.key==='dual'||A.ids[0]===g.id||A.phase==='second');}
