// The public club is the first observation point. Actual actions, rather than a
// forced checklist, decide whether the player pursues the target or ledger first.
function vipContractGoal(){
  const P=S.player,g=npc('vip'),item=S.items[0];if(!g)return null;
  const dead=targetEliminated(g),r=rendezvousState();
  if(!dead){
    if(r&&['travelling','waiting'].includes(r.phase))return rendezvousGoal();
    const approach=missionApproachGoal();if(approach)return{...approach,routeGuide:true};
    if(!S.goalManual&&S.vipIntent==='emetic'&&!S.usesDone[0]&&P.item?.id!=='emetic'){
      const p=S.props.find(p=>p.id==='emetic');if(p&&!p.taken)return{...p,text:'화장실 유인 · 약국에서 구토제 챙기기',where:'공개 구역 · 직원을 기절시켜 옷 획득',routeGuide:true};
    }
    if(!S.goalManual&&S.vipIntent==='sign'){
      const trap=S.traps.find(t=>t.k==='drop'&&t.text==='CLUB'&&!t.used);if(trap)return{...signFixture(trap),text:'간판 사고 · 클럽 옥상으로 접근',where:'직원 복도 계단으로 · 직원 옷은 기절한 직원에게서',routeGuide:true};
    }
    if(item?.got&&rendezvousReady()&&!r.calls)return{...r.phone,text:'내선으로 실장 부르기',where:'사무동 1층 · 경호원은 밖에서 대기',routeGuide:true};
    const vaultFirst=S.vipIntent==='meeting'||P.keys?.code&&P.x<14*TILE;
    if(!vaultFirst&&!item?.got){
      if(!S.vipObserved)return{text:'클럽 앞에서 실장 관찰',where:'공개 구역 · 걸어서 접근 · 장부부터 회수해도 된다',marker:'흡연 구역 입구',x:tc(26),y:16*TILE-6,fl:0,routeGuide:true,area:true};
      const at=targetKnowledge(g),seen=canObserveTarget(g),smoke=seen&&vipRoutine(g)==='smoke';
      return{...at,g,id:'target:'+g.id,text:'의뢰: '+missionTargetText(g,at),where:[missionTargetHint(at),smoke?'흡연 중 · 경호원은 입구에서 대기':'',at.where].filter(Boolean).join(' · '),routeGuide:true};
    }
  }
  if(item&&!item.got){
    if(!P.keys?.code&&S.keyDrop?.key==='code')return{...S.keyDrop,text:'실장의 금고 번호 메모 챙기기',where:'가까이 가면 회수 · 장부 금고에 사용',marker:'금고 번호',routeGuide:true};
    if(!P.keys?.code&&S.doors.some(d=>d.locked&&d.keyLock==='code'))return{text:'장부의 단서 · 야시장에서 금고 번호 엿듣기',where:dead?'실장 메모 또는 야시장 대화':'장부를 먼저 회수하는 경로 · 공개 구역',marker:'장부 단서',x:tc(14),y:tc(10),fl:0,routeGuide:true,area:true};
    return{text:'사무동 1층 금고에서 장부 회수',where:P.outfit==='crew'?'감시 시야 밖에서 작업 · 전선 분리는 기술 없이 가능':'경비를 기절시켜 옷을 훔쳐 입으면 통행 가능 · 작업은 감시 주의',marker:'장부 금고',x:item.x,y:item.y,fl:flOf(item),routeGuide:true};
  }
  if(!dead){const at=targetKnowledge(g);return{...at,g,text:'의뢰: '+missionTargetText(g,at),where:at.where,routeGuide:true};}
  const cipher=S.items[1];if(cipher&&!cipher.got)return{x:cipher.x,y:cipher.y,fl:flOf(cipher),id:'item:1',text:'남동쪽 회계 숙소 2층에서 거래 암호표 회수',where:'장부의 가명을 해독할 대조표 · 경비 순찰을 관찰',routeGuide:true};
  return null;
}
function updateVipContract(){
  if(STAGE.id!=='m2')return;
  const g=npc('vip');if(!g)return;
  if(!S.vipObserved&&!targetEliminated(g)&&canObserveTarget(g)){S.vipObserved=true;S.cpWant=true;}
  // Upgrade a living target in an old save without moving actors or changing AI.
  if(S.vipMemoVersion!==1){if(!targetEliminated(g)&&g.state!=='DEAD'&&!S.player.keys?.code&&!g.hasKey)g.hasKey='code';S.vipMemoVersion=1;}
}
function vipHitContext(g){
  if(STAGE.id!=='m2'||g.tag!=='vip')return null;
  const r=S.rendezvous;
  if(S.vipPlan?.phase==='sick'&&inRect(g,[39,6,41,7,0]))return 'emetic';
  const called=r?.calls&&(['travelling','waiting'].includes(r.phase)||['interrupted','left'].includes(r.phase)&&S.t-(r.finishedAt??-99)>=0&&S.t-r.finishedAt<12);
  if(called&&flOf(g)===r.room.fl&&dist(g.x,g.y,r.room.x,r.room.y)<120)return 'meeting';
  if(g.state==='PATROL'&&!g.moving&&g.wait>0&&schedNow(g)?.cur?.act==='담배'&&inRect(g,[25,15,29,16,0]))return 'smoke';
  return S.vipBackDoorUsed&&inRect(g,[23,5,32,7,0])?'backdoor':'direct';
}
