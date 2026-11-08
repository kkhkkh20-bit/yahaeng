// First contact is taught inside the real mission, without locking other actions.
function beginnerEntryNeeded(){
  return STAGE.id==='p0'&&!STAGES.some(st=>(st.id==='tB'||LEARNING_ROUTE.includes(st.id))&&stageCleared(st));
}
function initBeginnerEntry(){
  if(S.beginnerEntry||!beginnerEntryNeeded())return;
  const P=S.player;
  // A checkpoint made before this guide must continue where the player left off.
  S.beginnerEntry={step:S.t>1?2:0,x:P.x,y:P.y};
}
function updateBeginnerEntry(){
  const b=S.beginnerEntry;if(!b||b.step>=2)return;
  const P=S.player,g=npc('uniformDonor')||npc('runner');
  if(g&&(targetEliminated(g)||g.unconscious)){b.step=2;S.cpWant=true;return;}
  if(b.step===0&&P.moving&&dist(P.x,P.y,b.x,b.y)>=40)b.step=1;
  if(b.step===1&&P.mode==='sneak'){b.step=2;S.cpWant=true;}
}
function beginnerEntryGoal(){
  const b=S.beginnerEntry;if(!b||b.step>=2||!beginnerEntryNeeded())return null;
  const g=npc('uniformDonor')||npc('runner');if(g&&(targetEliminated(g)||g.unconscious))return null;
  return b.step===0?{x:b.x+64,y:b.y,fl:0,text:'먼저, 골목에서 움직여 보기',where:isTouch?(input.walkLock?'걷기 고정 중 · 달리기는 장비에서':'왼쪽 조금: 걷기 · 끝까지: 달리기'):tutText('{이동} 오른쪽 표시까지 걷기'),moveCue:true}:
    {text:'몸을 낮춰 조용히 접근하기',where:tutText('{살금} 몸을 낮추기 · 발소리가 작아진다')};
}

// Contextual help in the existing objective. This never gates actions or victory.
function openingGoal(){
  if(!STAGE.openingContract)return null;
  const g=npc('runner');if(!g||targetEliminated(g))return null;
  const P=S.player,at=targetKnowledge(g),body=S.corpses.find(c=>c.g===g&&c.ko);
  const attack=isTouch?'공격':KK('atk');
  let hint='빨간 표적의 등 뒤로 이동 · 사람을 누르면 시야 확인';
  if(body)hint=P.carrying===body?'{행동} 내려놓은 뒤 {공격} 1초 길게':body.stashed?'은닉처에서 꺼낸 뒤 {공격} 1초 길게':'기절: 살아 있음 · 몸 가까이에서 {공격} 1초 길게 · 살해';
  else if(P.hidden||P.cover)hint='서쪽 적치장 옆으로 돌아 등 뒤에 접근 · 공격 전 은신에서 나오기';
  else if(dist(P.x,P.y,g.x,g.y)<110){const action=attackAction(),risk=workRiskReadout(action),ready=action.k!=='none'&&!action.busy&&combatVictims(action).includes(g);hint=ready?(risk?.kind==='witness'?'경비가 보고 있다 · 시선이 돌아갈 때까지 대기':attack+' 짧게: 기절 · 1초 길게: 살해'):isTouch?'등 뒤로 더 가까이 · 닿으면 공격 버튼 활성화':'등 뒤로 더 가까이 · 공격 가능할 때 키 안내가 뜬다';}
  else if(S.guards.some(g=>!g.target&&g.why==='heard'&&['SUSPICIOUS','NOTICE','CHECK','LURE'].includes(g.state)))hint='경비가 소리를 확인 중 · 표적의 등 뒤로';
  else if(P.mode!=='sneak'&&dist(P.x,P.y,g.x,g.y)<260)hint='{살금} 조용히 등 뒤로 접근';
  return{...at,g,marker:'운반책',text:'운반책 처치',where:tutText(hint)};
}
// The upstairs contact is the same rear approach the player just used outside.
// This is a real witness, not a kill requirement or an artificial failure trigger.
function openingArchiveGuard(){
 if(!STAGE.firstSteps||!STAGE.storyEpisode||S.items[0]?.got)return null;
 const g=npc('archiveKeeper');if(!g||g.state==='DEAD'||g.state==='CAPTIVE'||g.unconscious)return null;
 if(flOf(S.player)===flOf(g)&&g.rawSeen===false&&nearLoot()===S.items[0])return null;
 return g;
}
function openingArchiveReady(){const g=openingArchiveGuard();return !!g&&flOf(S.player)===flOf(g)&&combatVictims(attackAction()).includes(g);}
function openingArchiveApproach(){
 const a=STAGE.archiveEntry,P=S.player;
 if(a&&flOf(P)===1&&P.x>=(a.inner[0]+1)*TILE){const at=P.y<a.outer[1]*TILE+12?a.outer:a.inner;return{x:tc(at[0]),y:tc(at[1]),fl:1,via:true};}
 return openingArchiveRear();
}
function openingArchiveRear(){const g=openingArchiveGuard();return g?{x:g.x-Math.cos(g.a)*40,y:g.y-Math.sin(g.a)*40,fl:flOf(g)}:S.items[0];}
function updateOpeningContract(){
  if(STAGE.firstSteps&&STAGE.storyEpisode){
    const P=S.player,g=npc('dispatchClerk');
    // A real observer accepts ordinary permitted passage. Never manufacture a
    // successful disguise while he is investigating crime or sees illegal work.
    if(!S.openingPass&&g?.rawSeen&&!g.seen&&g.state==='PATROL'&&flOf(P)===flOf(g)&&P.outfit==='crew'&&!P.disguiseBlown&&!actionBusy()&&!P.carrying&&!P.captive){
      S.openingPass=true;S.cpWant=true;gsay(g,'어, 아직 안 갔어? 서류는 위에 있어. 난 이제 퇴근하려고.',2.8);
    }
    return;
  }
  if(!STAGE.openingContract)return;
  const guard=npc('patrol');
  if(guard?.why==='heard'&&['SUSPICIOUS','NOTICE','CHECK','LURE'].includes(guard.state))S.openingLured=true;
  const target=npc('runner');if(target&&targetEliminated(target)&&!S.missionApproach){
    S.missionApproach=guard?.state==='DEAD'?'경비 제압 후 접근':S.openingLured?'소리로 경비 유인':'표적 등 뒤로 접근';
  }
}
