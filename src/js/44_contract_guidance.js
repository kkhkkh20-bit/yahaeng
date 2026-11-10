// Automatic guidance uses the route disclosed in the briefing. Manual objectives,
// selected clues and physical body recovery take precedence in nextGoal().
function contractRouteGoal(){
  if(STAGE.id==='m7'){
    const g=npc('broker'),it=S.items[0];
    if(g&&!targetEliminated(g)){const at=targetKnowledge(g);return{...at,g,id:'target:'+g.id,text:'의뢰: '+missionTargetText(g,at),where:[missionTargetHint(at),at.where].filter(Boolean).join(' · '),routeGuide:true};}
    if(it&&!it.got){
      const key=!S.player.keys?.blue&&S.keyDrop?.key==='blue'?S.keyDrop:null;
      if(key)return{x:key.x,y:key.y,fl:flOf(key),z:0,text:'파란 카드 줍기',where:'운송책이 떨어뜨린 기록보관실 카드',routeGuide:true};
      return{x:it.x,y:it.y,fl:flOf(it),z:0,text:'분류창고 서쪽에서 운송명세서 회수',where:S.player.keys?.blue?'파란 카드 · 기록보관실 문':'북쪽 거리 환풍구로 우회 가능',routeGuide:true};
    }
    const work=S.items[1];
    if(work&&!work.got)return{x:work.x,y:work.y,fl:flOf(work),z:0,id:'item:1',text:'배송 사무실 2층에서 새벽배송 중단',where:'명세서의 출고 번호 · 배차 단말 · 중단 후 관리자가 확인하러 온다',routeGuide:true};
    return null;
  }
  if(STAGE.id==='m6'){
    const radio=S.items[0],paper=S.items[1];
    if(radio&&!radio.got)return{x:radio.x,y:radio.y,fl:flOf(radio),text:flOf(S.player)?'2층 사무실에서 제비의 무전기 회수':'동쪽 계단으로 감금동 2층 잠입',where:placeName(radio.x,radio.y,flOf(radio))+(flOf(S.player)?' · 보안구역 · 복장 통행 불가':' · 압수품 회수는 선택'),routeGuide:true};
    if(paper&&!paper.got)return{x:paper.x,y:paper.y,fl:flOf(paper),id:'item:1',text:'남동쪽 자재 창고에서 까마귀 인계서 확보',where:'마당 건너 창고 · 순찰의 시선 밖에서 서류 회수',routeGuide:true};
    return null;
  }
  if(STAGE.id==='m2')return vipContractGoal();
  if(STAGE.id!=='m4')return null;
  const P=S.player,keys=P.keys||{},collector=npc('collector'),vip=npc('vip');
  const target=(g,why)=>{const at=targetKnowledge(g);return{...at,g,id:'target:'+g.id,text:'의뢰: '+missionTargetText(g,at),where:[missionTargetHint(at),why,at.where].filter(Boolean).join(' · '),routeGuide:true};};
  const object=(at,text,where)=>at?{x:at.x,y:at.y,fl:flOf(at),z:0,text,where,routeGuide:true}:null;
  const locked=key=>S.doors.some(d=>d.locked&&d.keyLock===key);
  if(collector&&!targetEliminated(collector))return target(collector,'빨간 카드키');
  if(!S.items[0]?.got){
    if(!keys.red&&locked('red')&&S.keyDrop?.key==='red')return object(S.keyDrop,'빨간 카드키 줍기','수금원이 떨어뜨린 카드');
    return object(S.items[0],'창고에서 현금 가방 회수','빨간 카드키 · 창고 금고');
  }
  if(vip&&!targetEliminated(vip)){
    if(!keys.blue&&locked('blue')){const card=S.keyItems.find(k=>k.key==='blue'&&!k.got);if(card)return object(card,'창고에서 파란 카드키 챙기기','클럽 VIP룸 뒷문');}
    return target(vip,'파란 카드키 · VIP룸 뒷문');
  }
  if(!S.items[1]?.got){
    if(lootLockpickPlan(S.items[1]))return object(S.items[1],'숙소 2층 계약서 금고 열기','초록 카드키로 조용히 · 락픽 2개로 직접 따기');
    const officeDoors=S.doors.filter(d=>d.keyLock==='code');
    if(!keys.code&&!keys.green&&officeDoors.length&&officeDoors.every(d=>d.locked)){const note=S.notes.filter(n=>n.gives==='code'&&!n.read).sort((a,b)=>dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y))[0];if(note)return object(note,note.title+' 확인','사무동 비밀번호');}
    if(!keys.green){const card=S.keyItems.find(k=>k.key==='green'&&!k.got);if(card)return object(card,'사무동 2층에서 초록 카드키 챙기기','보안실 · 남서쪽 숙소 금고용');}
    return object(S.items[1],'남서쪽 숙소 2층 금고에서 계약서 회수','초록 카드키 · 금고 앞에서 행동');
  }
  return null;
}
