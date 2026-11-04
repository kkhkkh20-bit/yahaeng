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
  const a=recoveryInputAction(kind);if(!a)return false;
  if(!P.recoveryQueue)P.recoveryQueue={c,kind:a.k,x:P.x,y:P.y,fl:flOf(P),z:P.z||0,until:S.t+.6};return true;
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
