// 표적에 대해 실제로 본 것과 브리핑에서 아는 것을 구분한다. 현재 위치를 추론해 갱신하지 않는다.
function targetName(g) { return g.doc ? '한 선생' : ({ vip: '클럽 실장', collector: '수금원', boss: '조직 두목' }[g.tag] || '표적'); }
function keyPurpose(k) {
  if(!mainContract(STAGE))return '';
  return k==='blue'?'클럽 VIP룸 뒷문':STAGE.id==='m4'&&k==='green'?'사무동 1층 계약서 금고':STAGE.id==='m4'&&k==='red'?'창고 현금 금고':'';
}
function recordMissionOutcome() {
  if(STAGE.id!=='m2' || S.missionApproach)return;
  const g=npc('vip');if(!g || !targetEliminated(g))return;
  const c=S.corpses.find(c=>c.target);
  S.missionApproach=c && c.accident && S.traps.some(t=>t.k==='drop'&&t.used&&inZone(c,t.hit))?'간판 사고':
    c && S.vipPlan?.phase==='sick' && inRect(c,[39,6,41,7,0])?'화장실 유인':S.vipBackDoorUsed?'VIP룸 뒷문 접근':'직접 접근';
}
function serviceCell(tx,ty,fl) {
  return STAGE.id==='m2' && STAGE.guards.some(g=>g.target && (g.fl||0)===fl && (g.sched||[]).some(s=>Math.hypot(tx-s.at[0],ty-s.at[1])<1.25));
}
function initMissionPlan() {
  S.targetIntel = S.targetIntel || {};
  S.targetBrief = S.targetBrief || {};
  // v93의 약 사용은 곧바로 화장실 일과를 만들었다. 기존 우회는 그대로 이어간다.
  if(STAGE.id==='m2' && S.usesDone?.[0] && !S.vipPlan) S.vipPlan={phase:'sick',drinking:0,legacy:true};
  for (const g of S.guards) if (g.target && !S.targetBrief[g.id]) {
    const d = (STAGE._g || [])[g.id], r = d && (d.at || d.route && d.route[0]);
    const x = r ? tc(r[0]) : g.route[0].x, y = r ? tc(r[1]) : g.route[0].y;
    const bi = bldAt(Math.floor(x / TILE), Math.floor(y / TILE)), b = BLD[bi];
    S.targetBrief[g.id] = { x: b ? (b.x0 + b.x1 + 1) * TILE / 2 : Math.round(x / (TILE * 6)) * TILE * 6,
      y: b ? (b.y0 + b.y1 + 1) * TILE / 2 : Math.round(y / (TILE * 6)) * TILE * 6, fl: 0, z: 0,
      where: b ? (b.name || b.plate || '활동 건물') : g.tag === 'collector' ? '큰길 · 수금 동선' : '알려진 활동 구역', area: true };
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
    S.targetIntel[g.id] = { ...gSpot(targetPosition(g)), t: S.t };
  }
  setLayer(L0);
}
function targetKnowledge(g) {
  initMissionPlan();
  if (oppMode === 2) return { ...gSpot(targetPosition(g)), where: placeName(targetPosition(g).x, targetPosition(g).y, flOf(targetPosition(g))), live: true };
  const m = S.targetIntel[g.id];
  if (m && S.t - m.t < 15) return { ...m, live: S.t - m.t < .3, lastSeen: S.t - m.t >= .3,
    where: placeName(m.x, m.y, m.fl) + (S.t - m.t >= .3 ? ' · 마지막 목격' : '') };
  return { ...S.targetBrief[g.id] };
}
function missionGoalCandidates() {
  const a = [];
  S.items.forEach((it, i) => { if (!it.got) a.push({ id: 'item:' + i, text: ((STAGE.itemNames || [])[i] || STAGE.itemName || '서류') + ' ' + (STAGE.itemVerb || '훔치기'), where: placeName(it.x, it.y, it.fl, it.b), x: it.x, y: it.y, fl: it.fl || 0, z: 0 }); });
  if (!S.spare) for (const g of S.guards) if (g.target && !targetEliminated(g)) a.push({ ...targetKnowledge(g), id: 'target:' + g.id, text: targetName(g) + ' 처치하기', g });
  return a;
}
function pinnedMissionGoal() {
  const a = missionGoalCandidates(), P = S.player;
  let g = a.find(g => g.id === S.goalPin);
  if (!g) { g = a.sort((a, b) => dist(P.x,P.y,a.x,a.y) + Math.abs(flOf(P)-(a.fl||0))*300 - dist(P.x,P.y,b.x,b.y) - Math.abs(flOf(P)-(b.fl||0))*300)[0]; S.goalPin = g ? g.id : null; }
  return g ? { ...g, text: '의뢰: ' + g.text } : null;
}
function selectMissionGoal(id) {
  if (!missionGoalCandidates().some(g => g.id === id)) return false;
  S.goalPin = id; S.storyTrack = null; hudCache.objH = null; renderMissionGoals(); return true;
}
function renderMissionGoals() {
  const el = $('missionGoals'); if (!el || !S || STAGE.tutorial || STAGE.city) { if (el) el.replaceChildren(); return; }
  el.replaceChildren();
  for (const g of missionGoalCandidates()) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = g.text + ' · ' + g.where;
    b.setAttribute('aria-pressed', String(g.id === S.goalPin)); b.onclick = () => selectMissionGoal(g.id); el.append(b);
  }
}
// 다른 층 목적지는 실제 연결 경로의 첫 입구를 안내한다.
function goalNavigation(goal) {
  const P = S.player;
  if (!goal || goal.area || goal.x == null || P.under || P.vent || P.trav || P.jump) return goal;
  if (!S.lvl) lvlInit();
  const from = lvlKey(gSpot(P)), to = lvlKey({ x: goal.x, y: goal.y, fl: goal.fl || 0, z: goal.z || 0 });
  if (from === to) return goal;
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
  const nav={x:chosen.from.x,y:chosen.from.y,fl:flOf(P),z:P.z||0,text:'이동: '+(chosen.to.z?chosen.to.z+'층 옥상':((chosen.to.fl||0)+1)+'층')+' 연결 입구',where:'',storyName:null,via:true};
  const locked=path.map(p=>doors.get(Math.floor(p.y/TILE)*MW+Math.floor(p.x/TILE))).find(Boolean);
  if(locked) {nav.x=locked.x;nav.y=locked.y;nav.text='이동: 연결 입구 · 잠긴 문';nav.locked=true;}
  S.goalNavCache={key,t:S.t,nav}; return {...goal,...nav};
}
// 술병에 약을 넣은 뒤 실제 음용이 끝나야 화장실 일과를 시작한다.
function updateVipPlan(dt) {
  if (STAGE.id !== 'm2' || !STAGE.vipDrink) return;
  const P=S.player;
  if(!P.z&&!P.fl&&P.moving && S.doors.some(d=>d.keyLock==='blue'&&!d.locked&&dist(P.x,P.y,d.x,d.y)<20))S.vipBackDoorUsed=true;
  const g = npc('vip'), v = S.vipPlan;
  if (!g || !v || v.phase === 'done' || v.phase === 'sick') return;
  if (g.state === 'DEAD') { v.phase = 'done'; g.drinkT = 0; return; }
  const d = STAGE.vipDrink, calm = g.state === 'PATROL' && !g.climb && !g.grabbed && !g.yank && !g.doomed && !g.brawl;
  const atBar = !flOf(g) && !g.z && dist(g.x,g.y,tc(d.at[0]),tc(d.at[1])) < 30 && !g.moving;
  if (!calm || !atBar || S.alevel >= 2) { v.phase='prepared'; v.drinking = 0; g.drinkT = 0; return; }
  v.phase = 'drinking'; v.drinking = (v.drinking || 0) + dt; g.drinkT = v.drinking;
  if (v.drinking < 2) return;
  v.phase = 'sick'; v.drinking = 0; g.drinkT = 0;
  detour(g,d.to[0],d.to[1],32,'공중화장실','구토'); gsay(g,'으윽… 속이 왜 이래…',2.6);
  if (canObserveTarget(g)) toast('실장이 술을 마셨다 — 화장실로 향한다',2.6,'good');
}
