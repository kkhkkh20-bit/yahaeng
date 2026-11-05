// Follow the same body and action across the final lowering beat. A late press
// must not carry away the uniform the player was about to wear.
function recoveryInputCandidate(P=S.player){
  const A=P.killAnim,c=A?.c;
  if(!A?.committed||!c||A.dur-(S.t-A.t0)>.25||P.carrying||P.captive||P.hide||P.under||P.vent||P.z||P.hurtT>0)return null;
  return S.corpses.includes(c)&&!c.carried&&!c.stashed&&!c.hidden&&objectReachable(c,46)?c:null;
}
function recoveryInputAction(kind){
  const c=recoveryInputCandidate();if(!c)return null;
  const dress=corpseClothingAction(c);
  return kind==='dress'?dress:dress||{k:'cleanup',c,label:'몸 숨기기'};
}
function queueRecoveryInput(kind){
  const P=S.player,c=recoveryInputCandidate(P);if(!c)return false;
  P.followupAttack=null;
  const a=recoveryInputAction(kind);if(!a)return false;
  if(!P.recoveryQueue)P.recoveryQueue={c,kind:a.k,x:P.x,y:P.y,fl:flOf(P),z:P.z||0,until:S.t+.6};return true;
}

// A fresh late press may continue into one nearby visible victim. Never retarget,
// borrow a different held key, or convert a released tap into a lethal hold.
function followupWindow(P=S.player){
 const A=P.killAnim;
 if(A?.committed&&A.dur-(S.t-A.t0)<=.22)return true;
 const B=P.assassinAnim;
 if(!B||B.hits.some(t=>t==null))return false;
 const end=B.key==='dual'?B.t0+ASSASSIN_BEATS.firstEnd:B.phase==='second'?B.secondAt+ASSASSIN_BEATS.secondEnd:Infinity;
 return end-S.t<=.22;
}
const followupVictim=(g,P)=>!g.civ&&!g.dog&&!g.seen&&g.meter<NOTICE_AT&&['PATROL','RETURN','SLEEP','SUSPICIOUS'].includes(g.state)&&canKill(g,P,meleeReach(P));
function followupCandidate(P=S.player){
 if(!followupWindow(P)||STAGE.artSlice||P.hurtT>0||P.carrying||P.captive||P.recoveryQueue||P.hide||P.vent||P.under||P.z)return null;
 return S.guards.filter(g=>followupVictim(g,P))
  .sort((a,b)=>dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y))[0]||null;
}
function queueFollowupAttack(){
 const P=S.player,g=followupCandidate(P),source=combatSource('atk');if(!g||!source)return false;
 if(!P.followupAttack)P.followupAttack={g,source,x:P.x,y:P.y,fl:flOf(P),z:P.z||0,until:S.t+.5,tap:false};
 return true;
}
function updateFollowupAttack(P){
 const q=P.followupAttack;if(!q)return;
 const moving=input.joy?.mag>.15||['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].some(k=>S.keys[k]);
 if(S.over||S.t>q.until||moving||P.hurtT>0||flOf(P)!==q.fl||(P.z||0)!==q.z||dist(P.x,P.y,q.x,q.y)>8||!S.guards.includes(q.g)||!followupVictim(q.g,P)) {P.followupAttack=null;return;}
 if(actionBusy(P))return;
 P.followupAttack=null;
 const source=q.tap?{id:q.source.id,serial:-1}:q.source;
 if(!q.tap&&!combatHeld(source))return;
 actPrimary({k:'kill',list:[q.g],viaZ:true,inputGroup:'atk',combatSource:source});
}
function updateRecoveryInput(P){
  const q=P.recoveryQueue;if(!q)return;
  const moving=input.joy?.mag>.15||['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].some(k=>S.keys[k]);
  if(S.t>q.until||moving||P.hurtT>0||flOf(P)!==q.fl||(P.z||0)!==q.z||dist(P.x,P.y,q.x,q.y)>8||!S.corpses.includes(q.c)||q.c.carried||q.c.stashed||q.c.hidden){P.recoveryQueue=null;return;}
  if(actionBusy(P))return;
  P.recoveryQueue=null;
  if(!objectReachable(q.c,46))return;
  if(q.kind==='dress'){const a=corpseClothingAction(q.c);if(a)actCarry(a);return;}
  const choice=quickStashChoice(q.c);actCarry(choice||{k:'carry',c:q.c,fromZ:true});
}
