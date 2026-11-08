
function disguiseAcquisitionGoal(outfit='crew'){
 const P=S.player;if(P.outfit===outfit)return null;
 const bodies=S.corpses.filter(c=>!c.stripped&&c.outfit===outfit&&!c.carried).sort((a,b)=>dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y));
 const c=bodies[0];
 if(P.carrying?.outfit===outfit)return{...P,text:'몸을 내려놓고 옷 훔쳐 입기',where:tutText('{행동} 내려놓기'),starter:true};
 if(c)return{x:c.x,y:c.y,fl:flOf(c),text:c.stashed?'몸을 꺼내 옷 훔쳐 입기':(c.ko?'기절한':'사망한')+' 경비의 옷 훔쳐 입기',where:tutText('{행동} 옷 훔쳐 입기 · 3초 · 다른 사람의 시야 밖에서'),starter:true};
 const g=S.guards.filter(g=>!g.target&&!g.stripped&&g.state!=='DEAD'&&outfitOf(g)===outfit).sort((a,b)=>(a.tag==='uniformDonor'?-10000:0)+dist(P.x,P.y,a.x,a.y)-((b.tag==='uniformDonor'?-10000:0)+dist(P.x,P.y,b.x,b.y)))[0];
 if(!g)return null;
 return{x:g.x-Math.cos(g.a)*40,y:g.y-Math.sin(g.a)*40,fl:flOf(g),g,text:'혼자 있는 경비를 기절시켜 옷 얻기',where:tutText('등 뒤로 접근 · {공격} 짧게 기절 · 쓰러진 몸에서 옷 훔쳐 입기'),starter:true};
}
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
    const disguise=disguiseAcquisitionGoal();if(disguise)return disguise;
    if(P.outfit==='crew'&&!S.starterPass){const at=STAGE.starterPass;return{x:at[0]*TILE+TILE/2,y:at[1]*TILE+TILE/2,fl:0,text:'재킷을 입고 물류실 입구로 걷기',where:'지금 복장은 통행 허용 · 경비를 공격할 필요 없다',starter:true};}
    return learningObjectGoal(it,'loot','경비 등 뒤에서 출고 서류 챙기기','작업 중에는 시선 밖에서');
  }
  const c=S.cams.find(c=>camOn(c));
  if(c)return learningObjectGoal(c,'camCable','CCTV 시야 밖에서 전선 분리','벽을 따라 시야 밖에서 · 2초 조작',cameraServicePoint(c));
  return learningObjectGoal(it,'loot','감시가 꺼진 뒤 배송 명세서 챙기기','서류 앞에서 작업');
}
function updateStarterContract(){
  if(!STAGE.starterContract)return;
  if(STAGE.starterContract==='disguise'&&!S.starterPass&&S.player.outfit==='crew'&&(S.guards.some(g=>g.rawSeen&&!g.seen)||bldAt(Math.floor(S.player.x/TILE),Math.floor(S.player.y/TILE))>=0)){
    S.starterPass=true;S.cpWant=true;toast('자경대원 옷 · 평범한 통행 허용',2.2,'good');
  }
  if(STAGE.starterContract==='camera'&&!S.starterCameraSaved&&S.cams.every(c=>!camOn(c))){S.starterCameraSaved=true;S.cpWant=true;}
  if(STAGE.starterContract==='camera'&&!STAGE.storyEpisode&&(S.stats.camRec||0)>0&&cpReady())endGame(false,'작업 중 카메라에 찍혔다 · 뒤쪽에서 먼저 전선을 분리하자');
}

// Learned rules are combined gradually; these are suggestions, not victory gates.
function apprenticeGoal(){
  if(!STAGE.apprenticeContract)return null;
  const P=S.player;
  if(STAGE.id==='e1'){
    const g=npc('contact');if(!g||targetEliminated(g))return null;
    const at=targetKnowledge(g),a=attackAction(),ready=a.k!=='none'&&!a.busy&&combatVictims(a).includes(g);return{...at,g,text:at.area?'동쪽 적치장에서 연락책 찾기':'연락책 뒤에서 암살',where:tutText(ready?'{공격} 1초 길게 · 살해 (짧게는 기절)':g.unconscious?'기절은 미완료 · 쓰러진 몸 가까이 접근':'{살금} 등 뒤로 접근 · 사람을 누르면 시야 확인')};
  }
  if(STAGE.id==='e5'){
    const g=npc('broker');if(!g||targetEliminated(g))return null;
    const disguise=disguiseAcquisitionGoal();if(disguise)return disguise;
    if(!flOf(P)){const l=lessonStair(S);if(l)return{...stairLower(l).up.entry,fl:0,text:'중개인이 있는 2층으로 이동',where:'직원 옷으로 통행 · 서류와 표적은 같은 층에서 접근'};}
    const c=S.cams.find(c=>camOn(c));if(c)return learningObjectGoal(c,'camCable','복도 CCTV 시야 밖에서 전선 분리','2초 작업 · 경비가 등을 보일 때',cameraServicePoint(c));
    return{...targetKnowledge(g),g,text:g.unconscious?'기절한 중개인 마무리':'혼자 있는 중개인의 등 뒤로 접근',where:tutText('{공격} 1초 길게 살해 · 짧게는 기절')};
  }
  const it=S.items.find(i=>!i.got);if(!it)return null;
  const disguise=disguiseAcquisitionGoal();if(disguise)return disguise;
  if(['e2','e4'].includes(STAGE.id)){
    const c=S.cams.find(c=>camOn(c));
    if(c)return learningObjectGoal(c,'camCable','경비 시선 밖에서 CCTV 전선 분리','2초 조작 · 카메라 시야 밖으로',cameraServicePoint(c));
  }
  if(['e3','e4','e5'].includes(STAGE.id)&&!flOf(P)){
    const l=lessonStair(S);if(l){const a=envAction(),ready=a.k==='up'&&a.l===l;return{...stairLower(l).up.entry,fl:0,text:'계단으로 2층에 올라가기',where:ready?tutText('{행동} 올라가기 · 기술 없이 이용 가능'):'계단 입구 표시로 이동 · 기술 없이 이용 가능'};}
  }
  return learningObjectGoal(it,'loot',(STAGE.itemNames?.[0]||STAGE.itemName)+' 챙기기','작업 모습은 시야 밖에서');
}

// A cumulative mission gives the next useful move without requiring a fixed solution.
function updateCompoundProgress(){
 if(!STAGE.compound)return;
 const P=S.player;
 if(S.lamps.some(l=>!l.outdoor&&l.off))S.compoundDarkUsed=true;
 if(flOf(P)>=2)S.compoundThirdFloor=true;
 if(P.jump&&P.jump.z1>=2)S.compoundJumpUsed=true;
 if(P.outfit==='crew'&&!S.compoundUniform){S.compoundUniform=true;S.cpWant=true;}
 const hidden=S.corpses.filter(c=>c.hidden||c.stashed).length;
 if(hidden>(S.compoundHidden||0)){S.compoundHidden=hidden;S.cpWant=true;if(hidden===1)toast('흔적을 숨겼다 · 다음 경비에게 접근할 틈이 생겼다',2,'good');}
}
function compoundBodyGoal(){
 const P=S.player,c=P.carrying||S.corpses.find(c=>!c.hidden&&!c.stashed&&!c.carried&&!(c.ko&&c.target)&&flOf(c)===flOf(P)&&dist(P.x,P.y,c.x,c.y)<150);
 if(!c)return null;
 if(!P.carrying)return{x:c.x,y:c.y,fl:flOf(c),text:'쓰러진 몸을 운반해 숨기기',where:tutText('{행동} 운반 · 화단이나 사물함 이용'),compoundCue:'hide'};
 const h=S.hides.filter(h=>flOf(h)===flOf(P)&&!h.z&&(h.type==='box'||FURN_HIDE[h.type])&&(h.bodies||0)<(h.cap||1)).concat(S.bushes.filter(h=>!flOf(P)&&(h.bodies||0)<(h.cap||1))).sort((a,b)=>dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y))[0];
 return h?{x:h.x,y:h.y,fl:flOf(h),text:'가까운 은닉처에 몸 숨기기',where:tutText('{행동} 숨기기 · 한 곳에 한 명'),compoundCue:'hide'}:null;
}
function compoundStairGoal(floor,b=0){
 const P=S.player,from=flOf(P),up=from<floor,l=S.ladders.find(l=>l.kind==='fstair'&&bldAt(l.tx,l.ty)===b&&(up?l.bfl===from:l.tfl===from));
 if(!l)return null;
 const at=up?stairLower(l).up.entry:stairUpper(l).down.entry;
 return{...at,fl:from,text:'계단으로 '+(up?from+2:from)+'층에 '+(up?'올라가기':'내려오기'),where:'기술 없이 이용 · 같은 층에 도착한 뒤 다음 행동',compoundCue:'stairs',routeStep:(up?'up:':'down:')+from+':'+floor};
}
function compoundGoal(){
 if(!STAGE.compound||S.goalManual||S.storyTrackManual)return null;
 const P=S.player,pending=S.guards.filter(g=>g.target&&!targetEliminated(g));
 const ko=pending.find(g=>g.unconscious&&flOf(g)===flOf(P));if(ko){const c=S.corpses.find(c=>c.g===ko);if(c&&dist(P.x,P.y,c.x,c.y)<150)return{x:c.x,y:c.y,fl:flOf(c),g:ko,text:'기절한 '+targetName(ko)+' 마무리',where:c.stashed?'은닉처에서 꺼낸 뒤 공격 1초 길게':P.carrying===c?'몸을 내려놓고 공격 1초 길게':'기절: 살아 있음 · 공격 1초 길게 살해',compoundCue:'target'};}
 const disguise=disguiseAcquisitionGoal();if(disguise&&pending.length&&!STAGE.compoundVertical)return{...disguise,compoundCue:'dress'};
 const body=compoundBodyGoal();if(body&&pending.length)return body;
 if(STAGE.compoundVertical&&pending.length){
  const bi=bldAt(Math.floor(P.x/TILE),Math.floor(P.y/TILE));
  if(!P.got?.pin&&!(P.picks>0)&&!S.compoundJumpUsed){const k=S.keyItems.find(k=>k.key==='pin'&&!k.got);if(k)return{...k,text:'작업대에서 잠금 해제용 철사 챙기기',where:tutText('작업대 가까이에서 확보 · 창문 락픽 1회'),compoundCue:'window',routeStep:'wire'};}
  const w=S.windows.find(w=>w.tx===5&&w.ty===12);
  if(!S.compoundThirdFloor&&!P.z&&bi!==1){
   if(bi!==0&&w&&winSt(w)!=='open'&&P.picks>0)return{x:4.5*TILE,y:12.5*TILE,fl:0,text:'정비동 서쪽 창문을 락픽으로 열기',where:tutText('{행동} 잠금 해제 · 움직이지 않기'),compoundCue:'window',routeStep:'pick'};
   if(!flOf(P)&&bi!==0&&w)return{x:4.5*TILE,y:12.5*TILE,fl:0,text:'열린 창문으로 정비동에 들어가기',where:tutText('{행동} 창문 넘기'),compoundCue:'window',routeStep:'enter'};
   const stair=compoundStairGoal(2,0);if(stair)return stair;
  }
  if(!S.compoundJumpUsed&&bi===0){
   if(P.z===3)return{x:16.5*TILE,y:8.5*TILE,fl:0,z:3,text:'동쪽 거래소 옥상으로 건너뛰기',where:tutText('오른쪽을 향한 뒤 {행동} 건너뛰기'),compoundCue:'jump',routeStep:'gap'};
   const l=S.ladders.find(l=>l.kind==='stair'&&bldAt(l.tx,l.ty)===0);if(l)return{...stairLower(l).up.entry,fl:l.bfl||0,text:'3층에서 옥상으로 올라가기',where:tutText('{행동} 올라가기'),compoundCue:'jump',routeStep:'roofUp'};
  }
  if(P.z===3&&bi===1){const sign=S.traps.find(t=>t.k==='drop'&&t.text==='금성 거래소');if(sign&&!sign.used&&pending.some(g=>g.tag==='handover'))return{x:tc(sign.at[0]),y:tc(sign.at[1]),fl:0,z:3,text:'간판 아래 인계책을 보고 고정 풀기',where:tutText('아래 표적이 간판 밑에 왔을 때 {행동} 1초 길게'),compoundCue:'sign'};
   const l=S.ladders.find(l=>l.kind==='stair'&&bldAt(l.tx,l.ty)===1);if(l)return{x:l.rx??l.ux,y:l.ry??l.uy,fl:0,z:3,text:'옥상문으로 거래소 3층에 내려가기',where:tutText('{행동} 내려가기'),compoundCue:'stairs',routeStep:'roofDown'};
  }
 }
 const keeper=npc('hallKeeper');
 if(STAGE.id==='p0'&&keeper&&!['DEAD','CAPTIVE'].includes(keeper.state)&&!flOf(P))return{...keeper,marker:'1층 경비',text:'1층 경비를 뒤에서 제압하기',where:'변장으로 접근 · 몸은 사물함에 숨길 수 있다',compoundCue:'guard'};
 if(STAGE.compoundLight&&!S.compoundDarkUsed&&pending.length&&bldAt(Math.floor(P.x/TILE),Math.floor(P.y/TILE))>=0){
  const l=S.lamps.find(l=>!l.outdoor&&!l.off&&flOf(l)===flOf(P)&&l.control);
  if(l)return{...lampControl(l),fl:flOf(l),text:'벽 스위치로 조명 끄고 경비 분리',where:tutText('{행동} 불 끄기 · 켜러 오는 경비의 등 뒤를 노리기'),compoundCue:'light'};
 }
 const camera=S.cams.find(c=>camOn(c)&&flOf(c)===flOf(P));
 if(STAGE.compoundCamera&&camera){
  const route=STAGE.cameraApproach;
  if(route&&!cameraCableReachable(camera)&&P.y>=(route.top[1]+1)*TILE){
   const at=P.y>11*TILE?route.landing:P.x<route.side[0]*TILE?route.side:route.top;
   return{x:tc(at[0]),y:tc(at[1]),fl:flOf(camera),text:'오른쪽 벽을 따라 카메라 뒤로 이동',where:'카메라 위쪽으로 돌아 전선에 접근',compoundCue:'camera'};
  }
  return{...cameraServicePoint(camera),fl:flOf(camera),text:'CCTV 뒤에서 전선 분리',where:'복장은 통행만 허용 · 살해와 서류 작업은 녹화된다 · 2초',compoundCue:'camera'};
 }
 const target=pending.find(g=>flOf(g)===flOf(P))||pending[0];
 if(target){
  if(!P.z&&flOf(P)!==flOf(target)){const s=compoundStairGoal(flOf(target),STAGE.compoundVertical?1:0);if(s)return s;}
  const body=S.corpses.find(c=>c.g===target&&c.ko);
  return{...targetKnowledge(target),g:target,marker:targetName(target),text:body?'기절한 '+targetName(target)+' 마무리':targetName(target)+'의 등 뒤에서 처치',where:body?'기절은 살아 있음 · 몸을 내려놓고 공격 1초 길게':'짧게: 기절 · 1초 길게: 살해 · 다른 경비의 시선 밖에서',compoundCue:'target'};
 }
 const it=S.items.find(i=>!i.got);
 if(it)return{...learningObjectGoal(it,'loot',(it.name||STAGE.itemName)+' 챙기기','작업이 끝날 때까지 움직이지 않기'),compoundCue:'document'};
 return null;
}
