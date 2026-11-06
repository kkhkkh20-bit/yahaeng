// Only advertise the action key when it will operate on this exact object.
function learningObjectGoal(o,k,text,advice,at=o){
  const a=envAction(),busy=actionBusy(),ready=!busy&&!a.skillLocked&&a.k===k&&(a.it===o||a.p===o||a.targetObject===o);
  return{x:at.x,y:at.y,fl:flOf(o),text,where:busy?'작업이 끝날 때까지 기다리기':ready?tutText('{행동}')+' '+actVerb(a,actIcon(a))+' · '+advice:'표시된 대상 앞으로 이동 · '+advice,starter:true,actionReady:ready};
}
// One concrete next action; the normal objective rules still allow other solutions.
function starterGoal(){
  if(!STAGE.starterContract)return null;
  const P=S.player,it=S.items.find(i=>!i.got);
  if(!it)return null;
  if(STAGE.starterContract==='disguise'){
    const coat=S.props.find(p=>p.id==='starterUniform'&&!p.taken);
    if(P.outfit!=='crew'&&coat)return learningObjectGoal(coat,'pickup','예비 경비 재킷 입기','갈아입기 3초');
    if(P.outfit==='crew'&&!S.starterPass){const at=STAGE.starterPass;return{x:at[0]*TILE+TILE/2,y:at[1]*TILE+TILE/2,fl:0,text:'재킷을 입고 물류실 입구로 걷기',where:'지금 복장은 통행 허용 · 경비를 공격할 필요 없다',starter:true};}
    return learningObjectGoal(it,'loot','경비 등 뒤에서 출고 서류 챙기기','작업 중에는 시선 밖에서');
  }
  const c=S.cams.find(c=>camOn(c));
  if(c)return learningObjectGoal(c,'camCable','CCTV 뒤에서 전선 분리','2초 조작 · 뒤쪽은 시야 밖',{x:c.x-Math.cos(c.base)*32,y:c.y-Math.sin(c.base)*32});
  return learningObjectGoal(it,'loot','감시가 꺼진 뒤 배송 명세서 챙기기','서류 앞에서 작업');
}
function updateStarterContract(){
  if(!STAGE.starterContract)return;
  if(STAGE.starterContract==='disguise'&&!S.starterPass&&S.player.outfit==='crew'&&S.guards.some(g=>g.rawSeen&&!g.seen)){
    S.starterPass=true;S.cpWant=true;toast('자경대원 옷 · 평범한 통행 허용',2.2,'good');
  }
  if(STAGE.starterContract==='camera'&&!S.starterCameraSaved&&S.cams.every(c=>!camOn(c))){S.starterCameraSaved=true;S.cpWant=true;}
  if(STAGE.starterContract==='camera'&&(S.stats.camRec||0)>0&&cpReady())endGame(false,'작업 중 카메라에 찍혔다 · 뒤쪽에서 먼저 전선을 분리하자');
}

// Learned rules are combined gradually; these are suggestions, not victory gates.
function apprenticeGoal(){
  if(!STAGE.apprenticeContract)return null;
  const P=S.player;
  if(STAGE.id==='e1'){
    const g=npc('contact');if(!g||targetEliminated(g))return null;
    const at=targetKnowledge(g),a=attackAction(),ready=a.k!=='none'&&!a.busy&&combatVictims(a).includes(g);return{...at,g,text:at.area?'동쪽 적치장에서 연락책 찾기':'연락책 뒤에서 암살',where:tutText(ready?'{공격} 한 번 · 표적 암살':g.unconscious?'기절은 미완료 · 쓰러진 몸 가까이 접근':'{살금} 등 뒤로 접근 · 사람을 누르면 시야 확인')};
  }
  const it=S.items.find(i=>!i.got);if(!it)return null;
  const coat=S.props.find(p=>p.outfit==='crew'&&!p.taken);
  if(P.outfit!=='crew'&&coat)return learningObjectGoal(coat,'pickup','예비 경비 재킷 입기','갈아입은 뒤 평범한 통행 허용');
  if(STAGE.id==='e2'){
    const c=S.cams.find(c=>camOn(c));
    if(c)return learningObjectGoal(c,'camCable','경비 시선 밖에서 CCTV 전선 분리','2초 조작 · 카메라 뒤쪽으로',{x:c.x-Math.cos(c.base)*32,y:c.y-Math.sin(c.base)*32});
  }
  if(STAGE.id==='e3'&&!flOf(P)){
    const l=lessonStair(S);if(l){const a=envAction(),ready=a.k==='up'&&a.l===l;return{...stairLower(l).up.entry,fl:0,text:'계단으로 2층에 올라가기',where:ready?tutText('{행동} 올라가기 · 기술 없이 이용 가능'):'계단 입구 표시로 이동 · 기술 없이 이용 가능'};}
  }
  return learningObjectGoal(it,'loot',(STAGE.itemNames?.[0]||STAGE.itemName)+' 챙기기','작업 모습은 시야 밖에서');
}
