// One concrete next action; the normal objective rules still allow other solutions.
function starterGoal(){
  if(!STAGE.starterContract)return null;
  const P=S.player,it=S.items.find(i=>!i.got);
  if(!it)return null;
  if(STAGE.starterContract==='disguise'){
    const coat=S.props.find(p=>p.id==='starterUniform'&&!p.taken);
    if(P.outfit!=='crew'&&coat)return{x:coat.x,y:coat.y,fl:0,text:'예비 경비 재킷 입기',where:tutText('{행동} 갈아입기 · 3초'),starter:true};
    if(P.outfit==='crew'&&!S.starterPass){const at=STAGE.starterPass;return{x:at[0]*TILE+TILE/2,y:at[1]*TILE+TILE/2,fl:0,text:'재킷을 입고 물류실 입구로 걷기',where:'지금 복장은 통행 허용 · 경비를 공격할 필요 없다',starter:true};}
    return{x:it.x,y:it.y,fl:0,text:'경비 등 뒤에서 출고 서류 챙기기',where:tutText('{행동} 회수 · 작업 중에는 시선 밖에서'),starter:true};
  }
  const c=S.cams.find(c=>camOn(c));
  if(c)return{x:c.x-Math.cos(c.base)*32,y:c.y-Math.sin(c.base)*32,fl:0,text:'CCTV 뒤에서 전선 분리',where:tutText('{행동} · 2초 조작 · 뒤쪽은 시야 밖'),starter:true};
  return{x:it.x,y:it.y,fl:0,text:'감시가 꺼진 뒤 배송 명세서 챙기기',where:tutText('{행동} 회수'),starter:true};
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
    const at=targetKnowledge(g);return{...at,g,text:at.area?'동쪽 적치장에서 연락책 찾기':'연락책 뒤에서 암살',where:tutText(g.unconscious?'기절은 미완료 · 몸 가까이에서 {공격} 한 번':'{살금} 등을 보일 때 접근 · {공격} 한 번')};
  }
  const it=S.items.find(i=>!i.got);if(!it)return null;
  const coat=S.props.find(p=>p.outfit==='crew'&&!p.taken);
  if(P.outfit!=='crew'&&coat)return{x:coat.x,y:coat.y,fl:0,text:'예비 경비 재킷 입기',where:tutText('{행동} 갈아입기 · 평범한 통행 허용')};
  if(STAGE.id==='e2'){
    const c=S.cams.find(c=>camOn(c));
    if(c)return{x:c.x-Math.cos(c.base)*32,y:c.y-Math.sin(c.base)*32,fl:0,text:'경비 시선 밖에서 CCTV 전선 분리',where:tutText('{행동} · 2초 조작 · 카메라 뒤쪽으로')};
  }
  if(STAGE.id==='e3'&&!flOf(P)){
    const l=lessonStair(S);if(l)return{...stairLower(l).up.entry,fl:0,text:'계단으로 2층에 올라가기',where:tutText('{행동} · 계단은 기술 없이 이용 가능')};
  }
  return{x:it.x,y:it.y,fl:flOf(it),text:(STAGE.itemNames?.[0]||STAGE.itemName)+' 챙기기',where:tutText('{행동} 회수 · 작업 모습은 시야 밖에서')};
}
