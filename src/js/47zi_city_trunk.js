// ---------------------------------------------------------------- 자유 모드 차 트렁크 · 사람 태우기
// 트렁크: 어깨에 멘 시체(기절자)를 아무 차 뒤에서 [트렁크에 싣기] — 차에 실린 채 따라다니고, 보는 사람이 없다.
//         차 뒤에 서서 [트렁크에서 꺼내기]로 다시 들쳐 멘다 (원하는 곳에 버리거나 숨긴다). 트렁크엔 둘까지.
// 태우기: 내 차 곁(160px)에서 깨어 있는 사람 옆에 서면 [차에 태우기] — 조수석에 탄다. 차를 세우고 내려서 [내려 주기].
//         겁먹은 사람(도망 중)·경찰·조직원은 안 탄다. 차가 터지면 다 같이 끝.
const TRUNK_MAX = 2;
const trunkCars = () => S.vehicles.filter(v => !v.dead && !v.police && !v.ai && !(v.z > 0.3));
const carRear = v => { const hl = v.hl ?? 25; return { x: v.x - Math.cos(v.a) * (hl + 14), y: v.y - Math.sin(v.a) * (hl + 14) }; };
function nearRear(r = 46) { const P = S.player; let best = null, bd = r; for (const v of trunkCars()) { const p = carRear(v), d = dist(P.x, P.y, p.x, p.y); if (d < bd) { bd = d; best = v; } } return best; }
function trunkAction() {
  if (!STAGE.cityLife) return null; const P = S.player; if (P.car || P.captive || actionBusy(P)) return null;
  const v = nearRear(); if (!v) return null; const p = carRear(v), T = v.trunk || (v.trunk = []);
  if (P.carrying) { const c = P.carrying; if (T.length >= TRUNK_MAX) return { k: 'evAct', label: '트렁크가 꽉 찼다', at: { x: p.x, y: p.y - 40 }, fn: () => evBanner('트렁크엔 둘까지', '#ffb070') };
    return { k: 'evAct', label: `트렁크에 싣기${c.ko ? ' (기절)' : ''}`, at: { x: p.x, y: p.y - 40 }, fn: () => { P.a = Math.atan2(v.y - P.y, v.x - P.x);
      doMotion({ dur: 1.1, pose: 'grab', at: [[0.3, () => play('cloth', 0.5)], [0.8, () => play('thud', 0.5)]], end: () => trunkLoad(v, c) }); } }; }
  if (T.length) return { k: 'evAct', label: `트렁크에서 꺼내기 (${T.length})`, at: { x: p.x, y: p.y - 40 }, fn: () => { P.a = Math.atan2(v.y - P.y, v.x - P.x);
    doMotion({ dur: 0.9, pose: 'grab', at: [[0.3, () => play('cloth', 0.5)]], end: () => trunkUnload(v) }); } };
  return null;
}
function trunkLoad(v, c) {
  const P = S.player; if (P.carrying !== c) return; const T = v.trunk || (v.trunk = []); if (T.length >= TRUNK_MAX) return;
  c.carried = false; P.carrying = null; c.stashed = true; c.hidden = true; c.inTrunk = v; if (c.g) { c.g.keep = true; c.g.inTrunk = v; }
  T.push(c); v.unlocked = true; v.locked = false; fstat('trunk');
  if (witnessed(P.x, P.y, 260)) addWanted(1, '트렁크에 사람을 싣는 걸 봤다');
  evBanner(`트렁크 ${T.length}/${TRUNK_MAX} · (조용한 데 가서 꺼내자.)`, '#9fc4ff');
}
function trunkUnload(v) {
  const P = S.player, T = v.trunk || []; const c = T.pop(); if (!c) return; const p = carRear(v);
  c.stashed = false; c.inTrunk = null; c.x = p.x; c.y = p.y; c.hidden = false; c.carried = true; P.carrying = c; if (c.g) { c.g.inTrunk = null; c.g.keep = false; }
  play('thud', 0.4); evBanner('(으차. 어디다 버리지?)', '#9fc4ff');
  if (witnessed(P.x, P.y, 260)) addWanted(1, '트렁크에서 시체를 꺼내는 걸 봤다');
}
// ---- 사람 태우기
const RIDE_MAX = 3;
function rideOk(g) { return g && npcAlive(g) && !g.off && g.civ && !g.police && !g.fac && !g.crew && !g.dog && !g.child && !['PANIC', 'FLEE', 'TERROR', 'REPORT'].includes(g.state) && !g.assailant && !g.knifeman; }
function rideAction() {
  if (!STAGE.cityLife) return null; const P = S.player; if (P.car || P.carrying || P.captive || actionBusy(P)) return null;
  const v = P.lastCar && !P.lastCar.dead && dist(P.x, P.y, P.lastCar.x, P.lastCar.y) < 160 ? P.lastCar : null; if (!v) return null;
  const R = v.riders || (v.riders = []);
  // 내려 주기: 차 곁에서
  if (R.length && dist(P.x, P.y, v.x, v.y) < 70) return { k: 'evAct', label: `내려 주기 (${R.length})`, at: { x: v.x, y: v.y - 46 }, fn: () => rideDrop(v) };
  if (R.length >= RIDE_MAX) return null;
  let best = null, bd = 64; for (const g of actorsNear(P.x, P.y)) { if (!rideOk(g)) continue; const d = dist(g.x, g.y, P.x, P.y); if (d < bd) { bd = d; best = g; } }
  if (!best) return null;
  return { k: 'evAct', label: '차에 태우기', at: { x: best.x, y: best.y - 50 }, fn: () => rideBoard(v, best) };
}
function rideBoard(v, g) {
  if (!rideOk(g)) return; const R = v.riders || (v.riders = []);
  faceEachOther(g); gsay(g, g.evt ? '네, 태워 주세요.' : ['...어디로 가는데요?', '태워 주시는 거예요?', '아, 네... 감사합니다.'][g.id % 3], 2);
  doMotion({ dur: 0.5, pose: 'idle', end: () => { if (!npcAlive(g)) return; g.rideTo = v; g.rideT0 = S.t; R.push(g); fstat('riders');  /* 차 문까지 걸어가서 탄다 (trunkUpdate) */
    evBanner(`조수석 ${R.length}/${RIDE_MAX} · (벨트 매. 어디까지 가?)`, '#9fc4ff'); } });
}
function rideDrop(v) {
  const R = v.riders || []; if (!R.length) return; play('door', 0.4);
  R.forEach((g, i) => { g.rideTo = null; const a = v.a + Math.PI / 2 + i * 0.5, w = walkableNear(v.x + Math.cos(a) * 34, v.y + Math.sin(a) * 34, { x: -1e5, y: -1e5 });
    g.off = false; g.state = 'PATROL'; g.x = w.x; g.y = w.y; g.route = [{ x: w.x, y: w.y, pause: 999 }]; g.ri = 0; g.path = null; g.rideIn = null; if (g.onDrop) g.onDrop(g, v); });
  evBanner(`(다 왔어. 내려.)`, '#9fc4ff'); v.riders = [];
}
// 차가 터지면 실린 사람·시체도 끝
function trunkUpdate() {
  if (!STAGE.cityLife) return; const P = S.player; if (P.car) P.lastCar = P.car;
  // 태운 사람: 조수석 문 앞까지 걸어가 문을 열고 탄다 (2.5초 넘게 못 가면 그냥 탄 것으로)
  for (const v of S.vehicles) for (const g of v.riders || []) { if (!g.rideTo || g.off) continue; const dx = v.x + Math.cos(v.a + Math.PI / 2) * 22, dy = v.y + Math.sin(v.a + Math.PI / 2) * 22;
    if (dist(g.x, g.y, dx, dy) > 16 && S.t - g.rideT0 < 2.5) evRun(g, dx, dy, 110, 1 / 60);
    else { g.rideTo = null; g.rideIn = v; g.off = true; g.x = -9999; g.y = -9999; g.path = null; play('door', 0.4 * proxVol(v)); } }
  for (const v of S.vehicles) { if (!v.dead) continue;
    if (v.riders?.length) { for (const g of v.riders) { g.off = false; g.x = v.x; g.y = v.y; npcDown(g, null, true); } v.riders = []; }
    if (v.trunk?.length) { for (const c of v.trunk) { c.stashed = false; c.hidden = false; c.x = v.x - 10; c.y = v.y + 6; c.inTrunk = null; if (c.g) { c.g.keep = false; c.g.inTrunk = null; } } v.trunk = []; } }
}
