// 표적에 대해 실제로 본 것과 브리핑에서 아는 것을 구분한다. 현재 위치를 추론해 갱신하지 않는다.
function targetName(g) { return STAGE.targetNames?.[g.tag] || (g.doc ? '한 선생' : ({ vip: '클럽 실장', collector: '수금원', boss: '조직 두목' }[g.tag] || '표적')); }
const targetProfile = g => g?.target && STAGE.targetCast?.[g.tag] || null;
function keyPurpose(k) {
  if(!mainContract(STAGE))return '';
  if(STAGE.keyPurposes?.[k])return STAGE.keyPurposes[k];
  return k==='blue'?'클럽 VIP룸 뒷문':STAGE.id==='m4'&&k==='green'?'남서쪽 숙소 2층 계약서 금고':STAGE.id==='m4'&&k==='red'?'창고 현금 금고':'';
}
function vipRoutine(g) {
  if(STAGE.openingContract&&g.tag==='runner'&&g.state==='PATROL'&&!g.moving&&!g.doomed)return 'smoke';
  if(STAGE.id!=='m2'||g.tag!=='vip'||g.state!=='PATROL'||g.moving||g.doomed||g.climb||g.wait<=0)return null;
  const s=schedNow(g);return s?.cur?.act==='담배'?'smoke':s?.cur?.act==='양주'?'drink':null;
}
function recordMissionOutcome() {
  if(STAGE.id!=='m2' || S.missionApproach)return;
  const g=npc('vip');if(!g || !targetEliminated(g))return;
  const c=S.corpses.find(c=>c.target);
  const exact=VIP_APPROACHES.find(d=>d.id===c?.vipApproach);
  S.missionApproach=exact?exact.name:c?.vipApproach==='backdoor'?'VIP룸 뒷문 접근':c?.vipApproach==='direct'?'직접 접근':c && c.accident && S.traps.some(t=>t.k==='drop'&&t.used&&inZone(c,t.hit))?'간판 사고':
    c && S.vipPlan?.phase==='sick' && inRect(c,[39,6,41,7,0])?'화장실 유인':S.rendezvous?.calls&&S.rendezvous.waiting>0&&c&&dist(c.x,c.y,S.rendezvous.room.x,S.rendezvous.room.y)<120?'장부로 불러낸 매복':S.vipBackDoorUsed?'VIP룸 뒷문 접근':c&&S.vipSmokingSeen&&inRect(c,[25,15,29,16,0])?'흡연 동선 매복':'직접 접근';
}
function serviceCell(tx,ty,fl) {
  return STAGE.id==='m2' && STAGE.guards.some(g=>g.target && (g.fl||0)===fl && (g.sched||[]).some(s=>Math.hypot(tx-s.at[0],ty-s.at[1])<1.25));
}
function syncFlowRoutes(){
 const flow=STAGE.flowDesign;if(!flow)return;
 if(S.flowVersion===1)return;
 for(const e of STAGE.exits||[]){const x=tc(e.at[0]),y=tc(e.at[1]);if(!S.exits.some(o=>dist(o.x,o.y,x,y)<1))S.exits.push({x,y,r:e.r||60,name:e.name||''});}
 if(S.exits[0]&&flow.name)S.exits[0].name=flow.name;
 for(const[x,y,c]of flow.gaps||[])if(G0[y]?.[x]==='#')G0[y][x]=c||'=';
 S.flowVersion=1;S.escapeChoice=null;S.floorC={};S.zEdges=null;
}
// Compare reachable walking paths, rather than pointing through a block to the
// nearest exit in XY. No enemy positions or hidden knowledge affect this choice.
function chooseEscape(){
 const P=S.player,exits=S.exits||[S.exit];if(exits.length<2||P.fl||P.z)return S.exit;
 const key=[Math.floor(P.x/TILE),Math.floor(P.y/TILE),exits.length,S.doors.map(d=>d.locked?1:0).join('')].join('|'),cache=S.escapeChoice;
 if(cache&&cache.key===key&&S.t-cache.t<.75)return exits[cache.index]||S.exit;
 const L0=CUR_F;setLayer(0);const doors=new Set(S.doors.filter(d=>!flOf(d)&&d.locked&&(!d.keyLock||P.keys?.[d.keyLock]||P.hasKey||P.picks>0)).map(d=>d.ty*MW+d.tx)),sol=(x,y)=>groundSolidP(x,y)&&!doors.has(y*MW+x),sx=Math.floor(P.x/TILE),sy=Math.floor(P.y/TILE);
 let best=null;
 exits.forEach((e,index)=>{let score=Infinity;const tx=Math.floor(e.x/TILE),ty=Math.floor(e.y/TILE);
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=tx+dx,y=ty+dy;if(!inMap(x,y)||sol(x,y)||dist(tc(x),tc(y),e.x,e.y)>=e.r-4)continue;
   const path=astar(sx,sy,x,y,sol);if((sx!==x||sy!==y)&&(!path.length||Math.floor(path.at(-1).x/TILE)!==x||Math.floor(path.at(-1).y/TILE)!==y))continue;
   let length=0,prev=P;for(const at of path){length+=dist(prev.x,prev.y,at.x,at.y);prev=at;}score=Math.min(score,length);
  }if(Number.isFinite(score)&&(!best||score<best.score))best={index,score};
 });setLayer(L0);const index=best?.index??exits.indexOf(S.exit);S.escapeChoice={key,t:S.t,index};return exits[index]||S.exit;
}
function initMissionPlan() {
  syncFlowRoutes();
  if(STAGE.id==='m2'&&S.vipContractVersion!==2){
    const escort=npc('vipEscort'),d=STAGE.guards.find(g=>g.tag==='vipEscort');if(escort&&d)escort.escortWait=cloneDeep(d.escortWait);
    // Saved staff walk to their new posts; bodies and active encounters stay intact.
    for(const id of [14,15]){const g=S.guards[id],d=STAGE.guards[id];if(g?.civ&&g.state==='PATROL'&&g.route.length===1&&d?.at){const x=tc(d.at[0]),y=tc(d.at[1]);if(g.route[0].x!==x||g.route[0].y!==y){g.route=[{x,y,pause:999}];g.ri=0;g.wait=0;g.path=null;g.post=d.post*Math.PI/180;}}}
    for(const e of STAGE.exits||[]){const x=tc(e.at[0]),y=tc(e.at[1]);if(!S.exits.some(o=>dist(o.x,o.y,x,y)<1))S.exits.push({x,y,r:e.r||60,name:e.name||''});}
    if(S.exits[0]&&!S.exits[0].name)S.exits[0].name=STAGE.exitName;S.vipContractVersion=2;
  }
  // Appearance is authored by identity, so old checkpoints get the same cast
  // without changing positions, AI, clothing permissions or elimination state.
  for(const c of S.corpses){const g=c.g||S.guards.find(g=>g.id===c.guardId);if(g?.target&&targetProfile(g))c.ch=c.stripped?(g.strippedLook||'strip'):charOf(g);}
  S.targetIntel = S.targetIntel || {};
  S.targetBrief = S.targetBrief || {};
  // v93의 약 사용은 곧바로 화장실 일과를 만들었다. 기존 우회는 그대로 이어간다.
  if(STAGE.id==='m2' && S.usesDone?.[0] && !S.vipPlan) S.vipPlan={phase:'sick',drinking:0,legacy:true};
  for (const g of S.guards) if (g.target && !S.targetBrief[g.id]) {
    const d = (STAGE._g || [])[g.id], r = d && (d.at || d.route && d.route[0]);
    const x = r ? tc(r[0]) : g.route[0].x, y = r ? tc(r[1]) : g.route[0].y;
    const bi = bldAt(Math.floor(x / TILE), Math.floor(y / TILE)), b = BLD[bi];
    S.targetBrief[g.id] = { x: b ? (b.x0 + b.x1 + 1) * TILE / 2 : Math.round(x / (TILE * 6)) * TILE * 6,
      y: b ? (b.y0 + b.y1 + 1) * TILE / 2 : Math.round(y / (TILE * 6)) * TILE * 6, fl: d?.fl || 0, z: 0,
      where: d?.briefWhere || (b ? (b.name || b.plate || '활동 건물') + (d?.fl ? ' '+(d.fl+1)+'층' : '') : g.tag === 'collector' ? '큰길 · 수금 동선' : '알려진 활동 구역'), area: true };
  }
}
function canObserveTarget(g) {
  const P = S.player, at = targetPosition(g);
  const overlooking = P.z && !P.fl && !flOf(at) && !at.z && !coveredG(at,-1);
  if (P.under || P.vent || flOf(at) !== flOf(P) || (!overlooking && (at.z || 0) !== (P.z || 0)) || dist(P.x, P.y, at.x, at.y) > 560) return false;
  if (at.stashed && (!P.hide || P.hide !== at.container)) return false;
  if (at.carried && P.carrying !== at) return false;
  if (!P.z && coveredG(at,bldAt(Math.floor(P.x/TILE),Math.floor(P.y/TILE)))) return false;
  if (overlooking) {
    const d=dist(P.x,P.y,at.x,at.y),a=Math.atan2(at.y-P.y,at.x-P.x);
    let t=0; while(t<d && rLv(Math.floor((P.x+Math.cos(a)*t)/TILE),Math.floor((P.y+Math.sin(a)*t)/TILE))===P.z)t+=12;
    return t<d && castRay(P.x+Math.cos(a)*t,P.y+Math.sin(a)*t,a,d-t,0)>=d-t-6;
  }
  return los(P.x, P.y, at.x, at.y, P.z || 0);
}
function updateTargetIntel() {
  initMissionPlan();
  const L0 = CUR_F; setLayer(flOf(S.player));
  for (const g of S.guards) if (g.target && !targetEliminated(g) && canObserveTarget(g)) {
    if(!S.targetIntel[g.id]&&feedbackOnce('target:'+STAGE.id+':'+g.tag)){g.introUntil=S.t+1.5;feedbackEvent('target',g,{label:targetName(g)});}
    S.targetIntel[g.id] = { ...gSpot(targetPosition(g)), t: S.t, unconscious:!!S.corpses.find(c=>c.g===g&&c.ko) };
  }
  setLayer(L0);
}
function targetKnowledge(g) {
  initMissionPlan();
  // 직접 옮겨 숨긴 기절 표적은 플레이어가 위치를 안다. 예전 활동 구역으로 안내하지 않는다.
  const body=S.corpses.find(c=>c.g===g&&c.ko&&(c.playerHandled||c.stashed&&c.container||S.player.carrying===c));
  if(body)return{...gSpot(body),where:(body.stashed&&body.container?hideName(body.container)+' · ':'')+placeName(body.x,body.y,flOf(body))+' · 기절',stored:!!body.stashed,unconscious:true};
  if (oppMode === 2) return { ...gSpot(targetPosition(g)), where: placeName(targetPosition(g).x, targetPosition(g).y, flOf(targetPosition(g))), live: true };
  const m = S.targetIntel[g.id];
  if (m && S.t - m.t < 15) return { ...m, live: S.t - m.t < .3, lastSeen: S.t - m.t >= .3,
    where: placeName(m.x, m.y, m.fl) + (S.t - m.t >= .3 ? ' · 마지막 목격' : '') };
  return { ...S.targetBrief[g.id] };
}
function missionGoalCandidates() {
  const a = [];
  S.items.forEach((it, i) => { if (!it.got) a.push({ id: 'item:' + i, text: itemObjectiveText(it), where: placeName(it.x, it.y, it.fl, it.b), x: it.x, y: it.y, fl: it.fl || 0, z: 0 }); });
  if (!S.spare) for (const g of S.guards) if (g.target && !targetEliminated(g)) {const at=targetKnowledge(g);a.push({ ...at, id: 'target:' + g.id, text: missionTargetText(g,at),where:[missionTargetHint(at),at.where].filter(Boolean).join(' · '), g });}
  return a;
}
const missionTargetText=(g,at)=>at.unconscious?'기절한 '+targetName(g)+' 마무리':targetName(g)+' 처치하기';
const missionTargetHint=at=>at.unconscious?(at.stored?'은닉처에서 꺼낸 뒤 공격 길게':'몸 가까이에서 공격 길게'):'';
function pinnedMissionGoal() {
  const a = missionGoalCandidates(), P = S.player;
  let g = a.find(g => g.id === S.goalPin);
  if (!g) { g = (STAGE.priorityTarget&&a.find(v=>v.g))||a.sort((a, b) => dist(P.x,P.y,a.x,a.y) + Math.abs(flOf(P)-(a.fl||0))*300 - dist(P.x,P.y,b.x,b.y) - Math.abs(flOf(P)-(b.fl||0))*300)[0]; S.goalPin = g ? g.id : null; }
  return g ? { ...g, text: '의뢰: ' + g.text } : null;
}
function syncMissionTracking(){
  if(S.goalManual&&!missionGoalCandidates().some(g=>g.id===S.goalPin)){S.goalManual=false;S.goalPin=null;}
  if(S.storyTrackManual&&!trackedStory()){S.storyTrackManual=false;S.storyTrack=null;}
}
function selectAutoGoal(){
  S.goalManual=false;S.goalPin=null;S.storyTrack=null;S.storyTrackManual=false;S.vipIntent=null;
  hudCache.objH=null;renderMissionGoals();
}
function selectMissionGoal(id) {
  if (!missionGoalCandidates().some(g => g.id === id)) return false;
  S.goalPin = id; S.goalManual = true; S.storyTrack = null; S.storyTrackManual = false; hudCache.objH = null; renderMissionGoals(); return true;
}
function renderMissionGoals() {
  const el = $('missionGoals'); if (!el || !S || STAGE.tutorial || STAGE.city) { if (el) el.replaceChildren(); return; }
  syncMissionTracking();
  const focus = el.contains(document.activeElement) && document.activeElement.dataset.track, expanded = el.querySelector('details')?.open;
  el.replaceChildren();
  const auto=document.createElement('button');auto.type='button';auto.textContent='자동 안내';auto.dataset.track='auto';auto.setAttribute('aria-pressed',String(!S.goalManual&&!S.storyTrackManual));auto.onclick=selectAutoGoal;el.append(auto);
  for (const g of missionGoalCandidates()) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = g.text + ' · ' + g.where;
    b.dataset.track = g.id;
    b.setAttribute('aria-pressed', String(S.goalManual&&g.id === S.goalPin && !(oppMode && trackedStory()))); b.onclick = () => selectMissionGoal(g.id); el.append(b);
  }
  const clues = oppMode && !S.exitOpen && (S.stories || []).filter(st => st.found && !st.done && !st.moot);
  if (clues && clues.length) {
    const details = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = '발견한 단서'; details.append(summary);
    for (const st of clues) {
      const b = document.createElement('button'), selected = trackedStory() === st; b.type = 'button'; b.textContent = st.d.name;
      b.dataset.track = 'story:' + st.d.id;
      b.setAttribute('aria-pressed', String(selected)); b.onclick = () => selectStory(selected ? null : st.d.id); details.append(b);
    }
    details.open = expanded || !!trackedStory(); el.append(details);
  }
  if (focus) [...el.querySelectorAll('button')].find(b => b.dataset.track === focus)?.focus({preventScroll:true});
}
// 같은 층에서도 잠긴 방의 내부 대신 실제로 조작해야 할 문을 가리킨다.
function sameFloorGoalNavigation(goal){
  const P=S.player,fl=flOf(P),bi=bldAt(Math.floor(goal.x/TILE),Math.floor(goal.y/TILE));
  if(P.z||bi<0)return goal;
  const locked=S.doors.filter(d=>d.locked&&flOf(d)===fl&&bldAt(d.tx,d.ty)===bi);if(!locked.length)return goal;
  const key=['door',fl,Math.floor(P.x/TILE),Math.floor(P.y/TILE),Math.floor(goal.x/TILE),Math.floor(goal.y/TILE),locked.map(d=>d.tx+','+d.ty).join(';')].join(':');
  if(S.goalNavCache?.key===key&&S.t-S.goalNavCache.t<.5)return{...goal,...S.goalNavCache.nav};
  const L0=CUR_F;setLayer(fl);let nav={};
  try{
    const sx=Math.floor(P.x/TILE),sy=Math.floor(P.y/TILE),tx=Math.floor(goal.x/TILE),ty=Math.floor(goal.y/TILE);
    const exact=(path,x,y)=>path.length&&Math.floor(path.at(-1).x/TILE)===x&&Math.floor(path.at(-1).y/TILE)===y;
    // 금고 안에서 바깥으로 먼저 확인하면 닫힌 작은 방 때문에 지도 전체를 탐색하지 않는다.
    const open=astar(tx,ty,sx,sy,solidAt);
    if((sx!==tx||sy!==ty)&&!exact(open,sx,sy)){
      const doors=new Map(locked.map(d=>[d.ty*MW+d.tx,d])),route=astar(sx,sy,tx,ty,(x,y)=>solidAt(x,y)&&!doors.has(y*MW+x));
      const door=exact(route,tx,ty)&&route.map(p=>doors.get(Math.floor(p.y/TILE)*MW+Math.floor(p.x/TILE))).find(Boolean);
      if(door)nav={x:door.x,y:door.y,fl,z:0,locked:true,text:'이동: 잠긴 문'};
    }
  }finally{setLayer(L0);}
  S.goalNavCache={key,t:S.t,nav};return{...goal,...nav};
}
// 다른 층 목적지는 실제 연결 경로의 첫 입구를 안내한다.
function goalNavigation(goal) {
  const P = S.player;
  if (!goal || goal.area || goal.x == null || P.under || P.vent || P.trav || P.jump) return goal;
  if (!S.lvl) lvlInit();
  const from = lvlKey(gSpot(P)), to = lvlKey({ x: goal.x, y: goal.y, fl: goal.fl || 0, z: goal.z || 0 });
  if (from === to) return sameFloorGoalNavigation(goal);
  const key=[from,to,Math.floor(P.x/TILE),Math.floor(P.y/TILE),Math.floor(goal.x/TILE),Math.floor(goal.y/TILE)].join(':');
  if(S.goalNavCache && S.goalNavCache.key===key && S.t-S.goalNavCache.t<.5) return {...goal,...S.goalNavCache.nav};
  const h = nextHop(P, from, to); if (!h) return goal;
  // nextHop chooses a level connection; reject an entrance unreachable on this floor.
  const L0 = CUR_F; setLayer(flOf(P));
  const doors=new Map(S.doors.filter(d=>(d.fl||0)===flOf(P)&&d.locked).map(d=>[d.ty*MW+d.tx,d]));
  const sol = P.z ? solidFor(P.z) : (x,y)=>solidAt(x,y)&&!doors.has(y*MW+x);
  const options = S.lvl.ends.flatMap(e => [[e.A,e.B],[e.B,e.A]].filter(([a,b]) => a.k === from && b.k === h.to.k).map(([a,b])=>({e,from:a,to:b})))
    .sort((a,b)=>dist(P.x,P.y,a.from.x,a.from.y)-dist(P.x,P.y,b.from.x,b.from.y));
  let chosen = null;
  let path=[];
  for (const c of options) { const route=astar(Math.floor(P.x/TILE),Math.floor(P.y/TILE),Math.floor(c.from.x/TILE),Math.floor(c.from.y/TILE),sol);
    if(dist(P.x,P.y,c.from.x,c.from.y)<60 || route.length) { chosen=c;path=route;break; } }
  setLayer(L0); if (!chosen) return goal;
  const nav={destinationFloor:{fl:goal.fl||0,z:goal.z||0},x:chosen.from.x,y:chosen.from.y,fl:flOf(P),z:P.z||0,text:'이동: '+(chosen.to.z?chosen.to.z+'층 옥상':((chosen.to.fl||0)+1)+'층')+' 연결 입구',where:'',storyName:null,via:true,viaTo:{fl:chosen.to.fl||0,z:chosen.to.z||0}};
  const locked=path.map(p=>doors.get(Math.floor(p.y/TILE)*MW+Math.floor(p.x/TILE))).find(Boolean);
  if(locked) {nav.x=locked.x;nav.y=locked.y;nav.text='이동: 연결 입구 · 잠긴 문';nav.locked=true;}
  S.goalNavCache={key,t:S.t,nav}; return {...goal,...nav};
}
// 술병에 약을 넣은 뒤 실제 음용이 끝나야 화장실 일과를 시작한다.
function vipDrinkHurry(g){return g.tag==='vip'&&S.vipPlan?.requested&&!S.vipPlan.reachedToilet&&['prepared','drinking','sick'].includes(S.vipPlan.phase);}
function updateVipPlan(dt) {
  if (STAGE.id !== 'm2' || !STAGE.vipDrink) return;
  const P=S.player;
  if(!P.z&&!P.fl&&P.moving && S.doors.some(d=>d.keyLock==='blue'&&!d.locked&&dist(P.x,P.y,d.x,d.y)<20))S.vipBackDoorUsed=true;
  const g = npc('vip'), v = S.vipPlan;
  if(g&&vipRoutine(g)==='smoke'&&canObserveTarget(g))S.vipSmokingSeen=true;
  if (!g || !v || v.phase === 'done') return;
  if(v.phase==='sick'){
    const d=STAGE.vipDrink,at=!flOf(g)&&!g.z&&dist(g.x,g.y,tc(d.to[0]),tc(d.to[1]))<65;
    if(at&&!g.moving){v.reachedToilet=true;if(g.state==='PATROL'&&d.toiletA!=null){g.want=d.toiletA;g.a+=clamp(angDiff(g.a,d.toiletA),-dt*8,dt*8);g.glance=0;g.glanceT=2;}}
    const pending=g.route.some(w=>w.once&&dist(w.x,w.y,tc(d.to[0]),tc(d.to[1]))<20);
    if(!at&&(v.reachedToilet||!pending)){v.phase='done';S.goalNavCache=null;}
    return;
  }
  if (g.state === 'DEAD') { v.phase = 'done'; g.drinkT = 0; return; }
  const d = STAGE.vipDrink, calm = g.state === 'PATROL' && !g.climb && !g.grabbed && !g.yank && !g.doomed && !g.brawl;
  const atBar = !flOf(g) && !g.z && dist(g.x,g.y,tc(d.at[0]),tc(d.at[1])) < 30 && !g.moving;
  if(calm&&S.alevel<2&&!atBar&&!v.requested&&!g.route.some(w=>w.once)){
    detour(g,d.at[0],d.at[1],4,'클럽 홀 바','양주');v.requested=true;
  }
  if (!calm || !atBar || S.alevel >= 2) { v.phase='prepared'; v.drinking = 0; g.drinkT = 0; return; }
  v.phase = 'drinking'; v.drinking = (v.drinking || 0) + dt; g.drinkT = v.drinking;
  if (v.drinking < 2) return;
  v.phase = 'sick'; v.drinking = 0; g.drinkT = 0;
  detour(g,d.to[0],d.to[1],32,'공중화장실','구토'); gsay(g,'속이 안 좋네. 화장실 좀 다녀올게.',2.6);
  if (canObserveTarget(g)) toast('실장이 술을 마셨다 — 화장실로 향한다',2.6,'good');
}
