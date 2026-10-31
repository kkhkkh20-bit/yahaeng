// 손을 쓰는 행동은 대상 확인 → 손 뻗기 → 접촉 → 마무리까지 한 번만 실행한다.
function actionBusy(P = S.player) {
  return !!(S.ledgePull || P.lethalHold || P.trav || P.jump || P.lunge || P.grabIn || P.snap || P.pick || P.interact || S.amb || S.pull || S.killWait ||
    (P.strikeT > 0) || (P.bodyAnim && S.t - P.bodyAnim.t0 < P.bodyAnim.dur));
}
// 벽·층 너머 물건을 잡지 않는다. 벽에 붙인 스위치와 가구 끝에는 손이 닿는다.
function objectReachable(o, radius = 60) {
  const P = S.player;
  if (!o || !Number.isFinite(o.x) || !Number.isFinite(o.y) || flOf(o) !== flOf(P) || (o.z || 0) !== (P.z || 0)) return false;
  const d = dist(P.x, P.y, o.x, o.y); if ((o.furn===true?hideDistance(o,P):d) > radius) return false;
  const L0 = CUR_F; setLayer(flOf(P));
  const a = Math.atan2(o.y - P.y, o.x - P.x), hit = castRay(P.x, P.y, a, d, P.z || 0);
  // 막힌 칸이 물건 자체의 칸이면 표면까지 손이 닿는다. 중간 벽은 통과할 수 없다.
  const ok = hit >= d - 1 || (Math.floor((P.x + Math.cos(a) * (hit + 0.01)) / TILE) === Math.floor(o.x / TILE) && Math.floor((P.y + Math.sin(a) * (hit + 0.01)) / TILE) === Math.floor(o.y / TILE));
  const b=o.furn===true?hideFootprint(o):null,hx=P.x+Math.cos(a)*(hit+.01),hy=P.y+Math.sin(a)*(hit+.01);
  setLayer(L0); return ok||!!(b&&hx>=b.x0&&hx<b.x1&&hy>=b.y0&&hy<b.y1);
}
const OBJECT_FLOW = {
  pickup: [0.42, '줍는 중', 'ground'], dress: [0.8, '갈아입는 중', 'dress'],
  callMeet: [.9, '통화 중', 'hands'],
  use: [0.65, '사용 중', 'hands'], dropItem: [0.3, '내려놓는 중', 'ground'],
  door: [0.32, '문 조작 중', 'hands'], lamp: [0.35, '조작 중', 'hands'],
  bfuse: [0.5, '조작 중', 'hands'], fuse: [0.5, '조작 중', 'hands'], camroom: [0.65, '조작 중', 'hands']
};
function objectActionPoint(a) {
  if (a.k === 'use') return { x: tc(a.n.u.at[0]), y: tc(a.n.u.at[1]), fl: a.n.u.fl || 0 };
  return a.at || actObj(a);
}
function objectActionValid(a, item) {
  const P = S.player;
  if(a.k==='callMeet')return rendezvousReady()&&a.p===rendezvousState()?.phone&&objectReachable(a.p,60);
  if (a.k === 'dropItem') return !!P.item && P.item === item;
  if (a.k === 'pickup') return !a.p.taken && objectReachable(a.p);
  if (a.k === 'dress') return !a.c.stripped && !a.c.carried && !a.c.stashed && objectReachable(a.c, 46);
  if (a.k === 'use') return P.item === item && !!item && item.id === a.n.u.need && !S.usesDone[a.n.i] && objectReachable(objectActionPoint(a), 56);
  const o = objectActionPoint(a);
  return (!o || objectReachable(Object.assign({ fl: flOf(P), z: P.z || 0 }, o), a.k === 'fuse' ? 62 : 60)) && !(a.l && a.l.broken);
}
function beginObjectAction(a) {
  if (!OBJECT_FLOW[a.k]) return false;
  const P = S.player, item = P.item;
  if (!objectActionValid(a, item)) return true;
  const [dur, label, pose] = OBJECT_FLOW[a.k === 'pickup' && a.p.outfit ? 'dress' : a.k], at = objectActionPoint(a);
  P.interact = { a: Object.assign({}, a), item, t: 0, dur, label, pose, x: P.x, y: P.y, fl: flOf(P), z: P.z || 0,
    face: at && Number.isFinite(at.x) ? Math.atan2(at.y - P.y, at.x - P.x) : P.a,
    illegal: a.k === 'camroom' || (a.k === 'use' && !(a.n.u.permit && myPermits().includes(a.n.u.permit))), committed: false,
    state: a.k === 'door' ? a.d.locked : a.k === 'lamp' ? a.l.off : null };
  P.cover = null; P.vx = P.vy = 0; P.moving = false; S.qBuf = 0; S.qKill = false; RC = null;
  return true;
}
function updateObjectAction(P, dt) {
  const I = P.interact;
  P.vx = P.vy = 0; P.moving = false; P.hidden = false; P.light = lightAt(P.x, P.y, !!P.z);
  if (flOf(P) !== I.fl || (P.z || 0) !== I.z || dist(P.x, P.y, I.x, I.y) > 20) { P.interact = null; return; }
  I.t = Math.min(I.dur, I.t + dt);
  P.a += clamp(angDiff(P.a, I.face), -dt * 18, dt * 18);
  if (!I.committed && I.t >= I.dur * 0.6) {
    if (!objectActionValid(I.a, I.item)) { P.interact = null; return; }
    I.committed = true; I.committing = true;
    try {
      // 다른 인물이 이미 열거나 껐다면 반대로 토글하지 않는다.
      const changed = (I.a.k === 'door' && I.a.d.locked !== I.state) || (I.a.k === 'lamp' && I.a.l.off !== I.state);
      if (!changed) { if (I.a.fromZ) actCarry(I.a); else actPrimary(Object.assign({}, I.a, { viaZ: true })); contactFeedback(objectActionPoint(I.a),I.a.k); }
    } finally { I.committing = false; RC = null; S.storyT = 0; hudCache.objH = null; }
  }
  if (I.t >= I.dur) P.interact = null;
}
function busyEnvAction() {
  const P = S.player;
  return { k: 'none', busy: true, label: P.lethalHold ? '길게 누르는 중' : P.trav?.hideFlow ? ({enter:'들어가는 중',exit:'나오는 중',stash:'넣는 중',drag:'끌고 들어가는 중'}[P.trav.hideFlow.kind]) : P.interact ? P.interact.label : P.pick ? '작업 중' : '동작 중' };
}
