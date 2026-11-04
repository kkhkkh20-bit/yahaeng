// Contextual help in the existing objective. This never gates actions or victory.
function openingGoal(){
  if(!STAGE.openingContract)return null;
  const g=npc('runner');if(!g||targetEliminated(g))return null;
  const P=S.player,at=targetKnowledge(g),body=S.corpses.find(c=>c.g===g&&c.ko);
  const whistle=isTouch?'휘파람으로':'G로',attack=isTouch?'공격':KK('atk');
  let hint='순찰을 기다리거나 숨어서 '+whistle+' 경비 유인';
  if(body)hint=P.carrying===body?'{행동} 내려놓은 뒤 {공격} 길게':body.stashed?'은닉처에서 꺼낸 뒤 {공격} 길게':'기절은 미완료 · 몸 가까이에서 {공격} 길게';
  else if(P.hidden||P.cover)hint=whistle+' 경비 유인 가능 · 공격 전 풀숲/엄폐에서 나오기';
  else if(dist(P.x,P.y,g.x,g.y)<110){const action=attackAction();hint=action.k!=='none'&&!action.busy?attack+' 길게 처치 · 짧게 누르면 기절':isTouch?'등 뒤로 더 가까이 · 닿으면 공격 버튼 활성화':'등 뒤로 더 가까이 · 공격 가능할 때 키 안내가 뜬다';}
  else if(S.guards.some(g=>!g.target&&g.why==='heard'&&['SUSPICIOUS','NOTICE','CHECK','LURE'].includes(g.state)))hint='경비가 소리를 확인 중 · 표적의 등 뒤로';
  else if(P.mode!=='sneak'&&dist(P.x,P.y,g.x,g.y)<260)hint='{살금} 조용히 등 뒤로 접근';
  return{...at,g,marker:'운반책',text:'운반책 처치',where:tutText(hint)};
}
function updateOpeningContract(){
  if(!STAGE.openingContract)return;
  const guard=npc('patrol');
  if(guard?.why==='heard'&&['SUSPICIOUS','NOTICE','CHECK','LURE'].includes(guard.state))S.openingLured=true;
  const target=npc('runner');if(target&&targetEliminated(target)&&!S.missionApproach){
    S.missionApproach=guard?.state==='DEAD'?'경비 제압 후 접근':S.openingLured?'소리로 경비 유인':'순찰 틈으로 접근';
  }
}
