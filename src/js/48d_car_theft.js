// ---------------------------------------------------------------- 자유 모드 차 훔치기
// 세워 둔 차는 대부분 잠겨 있다(열에 여덟). 운전자가 탄 차는 끌어내고 탄다(48_traffic carEnter).
// 잠긴 차: 락픽이 있으면 운전석 문 앞에 쪼그려 앉아 2.2초 동안 조용히 딴다(락픽 하나) /
//          없으면 팔꿈치로 창문을 깬다: 0.5초면 되지만 유리 깨지는 소리에 경보가 8초 울리고, 본 사람이 있으면 신고한다
const CAR_LOCK_RATE = 80, CAR_PICK_T = 2.2, CAR_SMASH_T = 0.5, CAR_ALARM_T = 8;
function carLocked(v) {
  if (!STAGE.cityLife || !v || v.dead || v.driver || v.unlocked || v.bought || v.forSale != null || v.jacking) return false;
  if (v.locked == null) v.locked = ((v.id * 2654435761) >>> 0) % 100 < CAR_LOCK_RATE;
  return v.locked;
}
function carDoorSpot(v) { const side = v.a - Math.PI / 2; return { x: v.x + Math.cos(side) * 40 + Math.cos(v.a) * 6, y: v.y + Math.sin(side) * 40 + Math.sin(v.a) * 6 }; }
function carLockAction(v) {
  const P = S.player, pick = (P.picks || 0) > 0;
  return { k: 'evAct', at: { x: v.x, y: v.y - 56 }, label: pick ? `잠긴 차 — 락픽으로 따기 (${P.picks})` : '잠긴 차 — 창문 깨고 타기', fn: () => carBreakIn(v) };
}
function carBreakIn(v) {
  const P = S.player; if (P.trav || P.car) return;
  const pick = (P.picks || 0) > 0, door = carDoorSpot(v), tWalk = Math.min(0.35, dist(P.x, P.y, door.x, door.y) / 240), work = pick ? CAR_PICK_T : CAR_SMASH_T, dur = tWalk + work;
  P.hide = null; P.cover = null; input.aiming = null; v.v = 0; v.breakT = S.t; v.breakPick = pick;
  startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: door.x, y: door.y, f: tWalk / dur }, { x: door.x, y: door.y, f: 1 }], dur,
    phases: [{ to: tWalk / dur, pose: 'walk' }, { to: 1, pose: pick ? 'crouch' : 'grab' }], face: Math.atan2(v.y - door.y, v.x - door.x) });
  if (pick) {
    P.picks--; S.stats.carPicks = (S.stats.carPicks || 0) + 1;
    for (const t of [0.5, 1.1, 1.6]) after(tWalk + t, () => play('metal', 0.22, 1.8 + Math.random() * 0.2));
    after(tWalk + CAR_PICK_T - 0.15, () => play('click', 0.45));
    // 바로 옆에서 빤히 보는 사람이 있으면 들킨다 (멀면 모른다)
    after(tWalk + 0.8, () => { if (witnessed(door.x, door.y, 170)) addWanted(1, '차 문 따는 걸 사람들이 봤다'); });
  } else {
    S.stats.carSmash = (S.stats.carSmash || 0) + 1;
    after(tWalk + CAR_SMASH_T * 0.6, () => {
      P.strikeT = 0.25; play('glass', 0.9); play('thud', 0.35); noise(v.x, v.y, 360, 'glass', 0);
      v.glassBroken = true; v.alarmT = S.t + CAR_ALARM_T; v.alarmBeep = 0;
      spawnEffect('impact', { x: door.x, y: door.y, fl: 0, z: 0 }, { scale: 0.4, alpha: 0.7 });
      carGlassBits(v, door);
      if (witnessed(v.x, v.y, 380)) addWanted(1, '차 유리를 깨는 걸 사람들이 봤다');
    });
  }
  P.trav.end = () => { v.locked = false; v.unlocked = true; v.breakT = 0; if (!v.dead && !P.car) carEnter(v); };
}
// 유리 조각: 문 앞 바닥에 반짝이는 픽셀 몇 개 (1분 남는다)
function carGlassBits(v, p) {
  const list = S.glassBits || (S.glassBits = []);
  for (let i = 0; i < 14; i++) list.push({ x: p.x + rnd(-14, 14), y: p.y + rnd(-12, 12), s: Math.random() < 0.3 ? 2 : 1, t: S.t });
  if (list.length > 300) list.splice(0, list.length - 300);
}
function drawGlassBits() {
  const list = S.glassBits; if (!list?.length) return;
  for (const g of list) { const age = S.t - g.t; if (age > 60 || !inView(g.x, g.y, 8)) continue;
    ctx.fillStyle = ((g.x * 7 + g.y * 3 + (S.t * 2 | 0)) | 0) % 5 ? 'rgba(180,215,235,.75)' : 'rgba(255,255,255,.95)'; ctx.fillRect(g.x | 0, g.y | 0, g.s, g.s); }
}
// 경보: 깜빡이가 번갈아 켜지고 짧은 경적이 운다. 소리가 사람을 부른다
function carTheftUpdate(dt) {
  if (!STAGE.cityLife || !S.vehicles) return;
  for (const v of S.vehicles) { if (!(v.alarmT > S.t) || v.dead) continue;
    if ((v.alarmBeep -= dt) <= 0) { v.alarmBeep = 0.45; play('metal', 0.32 * proxVol(v), 2.6); noise(v.x, v.y, 280, 'car', 0); } }
}
// 차 그림 안(차 좌표계)에서: 경보 깜빡이 · 따는 중 반짝이는 자물쇠 · 깨진 창
function drawCarTheft(v) {
  if (v.alarmT > S.t && ((S.t * 4) | 0) % 2) { ctx.fillStyle = '#ffb030'; for (const [x, y] of [[-19, -44], [15, -44], [-19, 41], [15, 41]]) ctx.fillRect(x, y, 4, 3); }
  if (v.glassBroken) { ctx.fillStyle = 'rgba(205,230,245,.85)'; for (const [x, y] of [[-21, -14], [-20, -8], [-21, -3], [-19, -11]]) ctx.fillRect(x, y, 2, 2); }
}
function drawCarPickProgress() {
  const P = S.player, T = P.trav; if (!T || !S.vehicles) return;
  for (const v of S.vehicles) { if (!v.breakT || !v.breakPick) continue;
    const f = clamp((S.t - v.breakT) / (T.dur || 1), 0, 1), x = P.x - 16, y = P.y - 50;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 1, y - 1, 34, 6); ctx.fillStyle = '#e8d070'; ctx.fillRect(x, y, Math.round(32 * f), 4); }
}
