// Automatic guidance uses the route disclosed in the briefing. Manual objectives,
// selected clues and physical body recovery take precedence in nextGoal().
function contractRouteGoal(){
  if(STAGE.id==='m6'){
    const it=S.items[0];if(!it||it.got)return null;
    return{x:it.x,y:it.y,fl:flOf(it),text:flOf(S.player)?'2층 사무실에서 제비의 무전기 회수':'동쪽 계단으로 감금동 2층 잠입',where:placeName(it.x,it.y,flOf(it))+(flOf(S.player)?' · 보안구역 · 복장 통행 불가':' · 압수품 회수는 선택'),routeGuide:true};
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
    const officeDoors=S.doors.filter(d=>d.keyLock==='code');
    if(!keys.code&&!keys.green&&officeDoors.length&&officeDoors.every(d=>d.locked)){const note=S.notes.filter(n=>n.gives==='code'&&!n.read).sort((a,b)=>dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y))[0];if(note)return object(note,note.title+' 확인','사무동 비밀번호');}
    if(!keys.green&&locked('green')){const card=S.keyItems.find(k=>k.key==='green'&&!k.got);if(card)return object(card,'사무동 2층에서 초록 카드키 챙기기','보안실 · 1층 계약서 금고용');}
    return object(S.items[1],'사무동 1층에서 계약서 회수','초록 카드키 · 계약서 금고');
  }
  return null;
}
