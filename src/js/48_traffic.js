// ---------------------------------------------------------------- 차량 (도시 판): 도로를 다니는 차 · 세워 둔 차 · 내가 모는 차
// 도로 격자: STAGE.roadsX(세로 도로 왼쪽 칸) · STAGE.roadsY(가로 도로 위쪽 칸), 폭 4칸. 우측 통행 — 차로 중심은 도로 안쪽에서 1칸·3칸
// 방향 d: 0 동 · 1 남 · 2 서 · 3 북
const DV = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const CAR_LEN = 92, CAR_W = 42, CAR_R = 21;  // 차 길이·폭(px), 충돌 원 반지름 (앞뒤 원 둘)
const CAR_MAX = 430, CAR_ACC = 320, CAR_BRAKE = 700, CAR_FRIC = 160, CAR_TURN = 3.1, AI_SPD = 165;
// 차 기준 칸: 땅이 막혔거나 건물 자리면 못 지나간다 (문틈으로 들어가지 않게)
const carBlocked = (tx, ty) => !inMap(tx, ty) || SOLID.has(G0[ty][tx]) || (BI && BI[ty * MW + tx] >= 0);
// 차로 중심 좌표: 가로 도로(위쪽 칸 ry)에서 동쪽(0)으로 가면 아래 차로, 서쪽(2)은 위 차로 · 세로 도로(왼쪽 칸 rx)에서 남쪽(1)은 왼 차로, 북쪽(3)은 오른 차로
const laneOf = (road, d) => road * TILE + (d === 0 || d === 3 ? 3 : 1) * TILE;
// 맵을 지을 때: 세워 둔 차('A' 두 칸)를 운전할 수 있는 차로 바꿔 둔다 (지도 그림에서 빼고 칸을 비운다)
let CITY_PARKED = [];
function cityMapPrep() {
  CITY_PARKED = CARS.map(([x, y, c]) => ({ x: tc(x), y: (y + 1) * TILE, c })); CARS = [];
  for (const p of CITY_PARKED) { const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE) - 1; G0[ty][tx] = '.'; G0[ty + 1][tx] = '.'; if (G[ty]) { G[ty][tx] = '.'; G[ty + 1][tx] = '.'; } }
}
function makeVehicle(o) {
  return Object.assign({ x: 0, y: 0, a: 0, v: 0, d: 0, c: 0, hp: 6, ai: false, parked: false, driver: false, stopT: 0, honkT: 0, burn: 0, smoke: 0, id: (S.vehN = (S.vehN || 0) + 1) }, o);
}
function trafficInit() {
  S.vehicles = [];
  for (const p of CITY_PARKED) S.vehicles.push(makeVehicle({ x: p.x, y: p.y, a: -Math.PI / 2, c: p.c === 9 ? 0 : p.c, parked: true, police: p.c === 9 }));  // 색 9 = 경찰차
  const RX = STAGE.roadsX, RY = STAGE.roadsY, n = STAGE.traffic || 0, P = S.player;
  // 도로 위 차: 가로·세로 도로에 번갈아, 나와 너무 가깝지 않게
  for (let i = 0, k = 0; i < n && k < 400; k++) {
    const hor = k % 2 === 0, d = hor ? (k % 4 === 0 ? 0 : 2) : (k % 4 === 1 ? 1 : 3);
    const road = hor ? RY[(k * 7) % RY.length] : RX[(k * 5) % RX.length], along = ((k * 977) % ((hor ? MW : MH) - 4)) + 2;
    const x = hor ? tc(along) : laneOf(road, d), y = hor ? laneOf(road, d) : tc(along);
    if (dist(x, y, P.x, P.y) < 300 || S.vehicles.some(v => dist(v.x, v.y, x, y) < 160)) continue;
    const v = makeVehicle({ x, y, d, a: Math.atan2(DV[d][1], DV[d][0]), v: AI_SPD * 0.6, c: (k * 3) % 5, ai: true, driver: true });
    planTurn(v); S.vehicles.push(v); i++;
  }
}
// 다음 교차로에서 어디로 꺾을지 정하고, 꺾는 지점(새 차로 좌표)을 적어 둔다
function planTurn(v) {
  const hor = v.d === 0 || v.d === 2, pos = hor ? v.x : v.y, sgn = DV[v.d][0] + DV[v.d][1], cross = hor ? STAGE.roadsX : STAGE.roadsY, here = hor ? STAGE.roadsY : STAGE.roadsX;
  const myRoad = here.find(r => Math.abs(laneOf(r, v.d) - (v.lane != null ? v.lane : hor ? v.y : v.x)) < 30);  // 지금 따라가는 차로 (돌고 있는 중이면 몸은 아직 옆에 있다)
  // 앞쪽 첫 교차 도로 (이미 들어선 교차로는 건너뛴다)
  const ahead = cross.filter(r => sgn > 0 ? r * TILE > pos - 8 : (r + 4) * TILE < pos + 8).sort((a, b) => sgn > 0 ? a - b : b - a);
  const r = ahead[0]; if (r == null) { v.turn = null; return; }
  const opts = [];
  const lim = hor ? MW : MH, rLim = hor ? MH : MW;
  if (sgn > 0 ? r + 4 < lim : r > 0) opts.push(v.d, v.d);  // 직진 (조금 더 자주)
  const right = (v.d + 1) % 4, left = (v.d + 3) % 4;
  for (const nd of [right, left]) { const s2 = DV[nd][0] + DV[nd][1]; if (myRoad == null) continue; if (s2 > 0 ? myRoad + 4 < rLim : myRoad > 0) opts.push(nd); }
  let nd = opts.length ? opts[(v.id * 7 + r * 3 + Math.floor(S.t)) % opts.length] : (v.d + 2) % 4;
  if (v.chase && opts.length) { const P = S.player, ix = hor ? (r + 2) * TILE : v.x, iy = hor ? v.y : (r + 2) * TILE;  // 경찰차: 나에게 가까워지는 쪽
    nd = opts.slice().sort((a, b) => ((P.x - ix) * DV[b][0] + (P.y - iy) * DV[b][1]) - ((P.x - ix) * DV[a][0] + (P.y - iy) * DV[a][1]))[0]; }
  v.turn = nd === v.d ? null : { nd, at: laneOf(r, nd) };
  v.crossEnd = sgn > 0 ? (r + 4) * TILE + 4 : r * TILE - 4;  // 직진이면 이 지점을 지나서 다음 교차로를 고른다
}
// 앞이 막혔나: 진행 방향 앞 상자 안의 차·사람
function aheadBlocked(v) {
  const ca = Math.cos(v.a), sa = Math.sin(v.a), P = S.player;
  const inBox = (x, y, len, half) => { const dx = x - v.x, dy = y - v.y, f = dx * ca + dy * sa, s = -dx * sa + dy * ca; return f > 30 && f < len && Math.abs(s) < half; };
  if (v.chase) return P.car && inBox(P.car.x, P.car.y, 130, 40) ? 'car' : null;  // 추격 경찰차는 내 차 말고는 서지 않는다 (사람은 밀치고 간다)
  for (const o of S.vehicles) if (o !== v && !o.dead && inBox(o.x, o.y, 150, 34)) return 'car';
  if (!P.car && !P.z && !flOf(P) && inBox(P.x, P.y, 120, 30)) return 'me';
  for (const g of S.guards) if (g.state !== 'DEAD' && !flOf(g) && !g.z && inBox(g.x, g.y, 110, 28)) return 'ped';
  return null;
}
function updateVehicles(dt) {
  if (!S.vehicles) return;
  for (const v of S.vehicles) {
    if (v.dead) { v.burn = Math.max(0, v.burn - dt); continue; }
    if (v.smoke > 0) v.smoke -= dt;
    if (v === (S.player.car || {})) continue;  // 내 차는 updateDriving
    if (!v.ai) { if (Math.abs(v.v) > 1) { v.v *= Math.pow(0.08, dt); carMove(v, dt); } continue; }  // 주인 없는 차: 미끄러지다 선다
    aiDrive(v, dt);
    hitPeople(v, dt);
  }
}
// 남이 모는 차: 내 차와 같은 몸(속도·방향·핸들)으로 달린다. 앞을 보고(차로 위 70px 앞 점을 따라가는 '순수 추종') 핸들을 꺾고,
// 교차로 앞에선 속도를 줄이고, 꺾을 때는 새 차로 쪽 점을 따라가 둥글게 돈다 (예전처럼 직각으로 '툭' 꺾이지 않는다)
const AI_LOOK = 72;
function aiDrive(v, dt) {
  let hor = v.d === 0 || v.d === 2, sgn = DV[v.d][0] + DV[v.d][1];
  if (v.lane == null) v.lane = hor ? v.y : v.x;
  const blk = aheadBlocked(v); let want = v.chase ? AI_SPD * 2 : AI_SPD;
  if (blk) { v.stopT += dt; want = 0;
    if (blk !== 'car' && v.stopT > 1.4 && (v.honkT -= dt) <= 0) { v.honkT = 2.5; play('metal', 0.25 * proxVol(v), 2.4); if (blk === 'ped' || blk === 'me') noise(v.x, v.y, 120, 'car', 0); }
    if (blk === 'car' && v.stopT > 5) want = AI_SPD * 0.5;  // 오래 막히면(교차로 꼬임) 천천히 비집고 간다
  } else v.stopT = 0;
  if (v.chase && copCarArrive(v, dt)) return;
  // 교차로: 꺾을 차로가 가까워지면 미리 새 차로로 갈아탄다 (오른쪽은 짧게, 왼쪽은 크게 돈다)
  if (v.turn) { const pos = hor ? v.x : v.y, left = (v.turn.at - pos) * sgn, right = v.turn.nd === (v.d + 1) % 4;
    if (left < 150) want = Math.min(want, right ? 85 : 105);
    if (left < (right ? 34 : 70)) { v.d = v.turn.nd; v.lane = v.turn.at; hor = v.d === 0 || v.d === 2; sgn = DV[v.d][0] + DV[v.d][1]; planTurn(v); } }
  else if (v.crossEnd != null && ((hor ? v.x : v.y) - v.crossEnd) * sgn > 0) { v.crossEnd = null; planTurn(v); }
  // 앞쪽 목표점: 차로 중심선 위, 지금 위치에서 AI_LOOK 만큼 앞
  const tx = hor ? v.x + sgn * AI_LOOK : v.lane, ty = hor ? v.lane : v.y + sgn * AI_LOOK;
  const err = angDiff(v.a, Math.atan2(ty - v.y, tx - v.x));
  if (Math.abs(err) > 0.5) want = Math.min(want, 95);  // 크게 꺾는 중엔 천천히
  // 가속·브레이크 (내 차와 같은 수치를 조금 순하게)
  if (v.v < want) v.v = Math.min(want, v.v + CAR_ACC * (v.chase ? 1.2 : 0.7) * dt); else v.v = Math.max(want, v.v - CAR_BRAKE * dt);
  // 핸들: 내 차와 같은 식 — 빠를수록 잘 돌고, 서 있으면 거의 안 돈다
  v.a += clamp(err * 3, -1, 1) * CAR_TURN * Math.max(0.15, Math.min(1, Math.abs(v.v) / 90)) * dt;
  v.x += Math.cos(v.a) * v.v * dt; v.y += Math.sin(v.a) * v.v * dt;
  // 지도 끝: 반대 방향 차로로 돌아 들어온다
  if (v.x < -60 || v.x > MW * TILE + 60 || v.y < -60 || v.y > MH * TILE + 60) {
    v.d = (v.d + 2) % 4; v.a = Math.atan2(DV[v.d][1], DV[v.d][0]); v.x = clamp(v.x, 30, MW * TILE - 30); v.y = clamp(v.y, 30, MH * TILE - 30);
    const road = hor ? STAGE.roadsY.find(r => Math.abs(r * TILE + 96 - v.y) < 120) : STAGE.roadsX.find(r => Math.abs(r * TILE + 96 - v.x) < 120);
    v.lane = laneOf(road || 0, v.d); if (hor) v.y = v.lane; else v.x = v.lane; planTurn(v); }
}
// 차의 앞뒤 원 둘
const carPts = v => { const ca = Math.cos(v.a) * 25, sa = Math.sin(v.a) * 25; return [[v.x + ca, v.y + sa], [v.x - ca, v.y - sa]]; };
// 차가 벽·건물·다른 차와 겹치나 (겹친 상대 차를 돌려준다: 없으면 true/false)
function carOverlap(v) {
  for (const [px, py] of carPts(v)) {
    const tx0 = Math.floor((px - CAR_R) / TILE), tx1 = Math.floor((px + CAR_R) / TILE), ty0 = Math.floor((py - CAR_R) / TILE), ty1 = Math.floor((py + CAR_R) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { if (!carBlocked(tx, ty)) continue;
      const nx = clamp(px, tx * TILE, tx * TILE + TILE), ny = clamp(py, ty * TILE, ty * TILE + TILE); if (dist(px, py, nx, ny) < CAR_R) return true; }
  }
  for (const o of S.vehicles) { if (o === v || o.dead && !o.burn && false) continue; if (o === v || dist(o.x, o.y, v.x, v.y) > 110) continue;
    for (const [px, py] of carPts(v)) for (const [qx, qy] of carPts(o)) if (dist(px, py, qx, qy) < CAR_R * 2) return o; }
  return false;
}
// 움직이고, 벽·건물·다른 차에 부딪히면 튕겨 선다. 부딪힌 세기를 돌려준다
function carMove(v, dt) {
  const ox = v.x, oy = v.y; v.x += Math.cos(v.a) * v.v * dt; v.y += Math.sin(v.a) * v.v * dt;
  const o = carOverlap(v); if (!o) return 0;
  const hit = Math.abs(v.v);
  if (o !== true && (o.ai || o.parked)) { o.v = 0; o.stopT = 0; if (hit > 200) o.smoke = 1.5; if (hit > 260 && --o.hp <= 0) carWreck(o); }
  v.x = ox; v.y = oy; v.v = -v.v * 0.25;
  if (carOverlap(v)) { v.x += Math.cos(v.a) * (v.v >= 0 ? -2 : 2); v.y += Math.sin(v.a) * (v.v >= 0 ? -2 : 2); }  // 이미 끼어 있으면 조금씩 빠져나온다
  return hit;
}
// 차가 사람을 친다: 빠르면 처치, 느리면 넘어뜨린다 (기절). 내가 몰면 내 짓이다
function hitPeople(v, dt) {
  const spd = Math.abs(v.v); if (spd < 70) return;
  const mine = S.player.car === v;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) || g.z || g.off) continue;
    if (!carPts(v).some(([px, py]) => dist(px, py, g.x, g.y) < CAR_R + 12)) continue;
    const lethal = spd > 170;
    if (mine) { play('thud', 0.8); S.shakeT = 0.2; S.stats.runOver = (S.stats.runOver || 0) + 1; npcDown(g, null, lethal); const c = S.corpses[S.corpses.length - 1]; if (c && c.g === g) { c.byNpc = false; c.byCar = true; }
      if (g.police) addWanted(2, '경찰을 차로 쳤다'); else addWanted(1, g.civ ? '사람을 차로 쳤다' : '조직원을 차로 쳤다'); v.v *= 0.8; }
    else if (v.chase) { npcDown(g, null, false); v.v *= 0.7; }  // 추격 경찰차에 치인 행인
    else if (v.ai) { v.v = 0; }  // 다른 차는 사람 앞에서 선다 (그래도 닿았으면 멈춤)
  }
  // 내가 걷다가 달려오는 차에 치임
  const P = S.player;
  if (!mine && !P.car && !P.z && !flOf(P) && !P.hide && spd > 120 && carPts(v).some(([px, py]) => dist(px, py, P.x, P.y) < CAR_R + 10)) { hurtPlayer(null, '차에 치였다.'); P.x += Math.cos(v.a + Math.PI / 2) * 30; P.y += Math.sin(v.a + Math.PI / 2) * 30; v.v = 0; }
}
// 내가 운전: 조이스틱(방향키) 쪽으로 차머리를 돌리며 가속. 거의 반대쪽이면 브레이크 → 후진
function updateDriving(P, mx, my, mag, dt) {
  const v = P.car; P.moving = false; P.mode = 'walk'; P.vx = 0; P.vy = 0; P.z = 0; P.fl = 0;
  if (v.dead) { carExit(true); return; }
  let thr = 0; if (v.revT > 0 && (v.revT -= dt) <= 0) v.revT = 0;
  if (mag > 0.15) {
    const ta = Math.atan2(my, mx), dA = angDiff(v.a, ta);
    // 거의 반대쪽: 달리는 중이면 브레이크. 서 있으면 앞이 트였으면 크게 돌아 나가고(유턴), 막혔으면 후진
    const fx = v.x + Math.cos(v.a) * 75, fy = v.y + Math.sin(v.a) * 75, frontOpen = !carBlocked(Math.floor(fx / TILE), Math.floor(fy / TILE));
    if (Math.abs(dA) < 2.3 || (Math.abs(v.v) < 40 && v.v >= -5 && frontOpen && !v.revT)) { thr = Math.min(1, mag); const a0 = v.a, steer = clamp(dA * 3, -1, 1) * CAR_TURN * Math.max(0.35, Math.min(1, Math.abs(v.v) / 90)) * (v.v < -5 ? -1 : 1); v.a += steer * dt; if (carOverlap(v) === true) v.a = a0; }  // 서 있어도 조금은 돈다 (벽에 끼면 안 돈다)
    else { thr = v.v > 30 ? -2 : -0.55 * Math.min(1, mag); if (v.v <= 30) v.revT = 0.6; }  // 반대쪽: 브레이크, 서면 후진 (한 번 후진하면 잠깐은 계속)
  }
  if (thr > 0) v.v = Math.min(CAR_MAX, v.v + CAR_ACC * thr * dt);
  else if (thr < -1) v.v = Math.max(0, v.v - CAR_BRAKE * dt);
  else if (thr < 0) v.v = Math.max(-140, v.v - CAR_ACC * 0.8 * dt);
  else { const f = CAR_FRIC * dt; v.v = Math.abs(v.v) <= f ? 0 : v.v - Math.sign(v.v) * f; }
  const hit = carMove(v, dt);
  if (hit > 150) { play('thud', clamp(hit / 400, 0.3, 0.9)); play('metal', 0.4, 0.7); S.shakeT = Math.min(0.35, hit / 900); if (hit > 240) { v.hp -= 1; v.smoke = 2; } if (v.hp <= 0) carWreck(v); }
  hitPeople(v, dt);
  P.x = v.x; P.y = v.y; P.a = v.a; P.light = lightAt(P.x, P.y, false);
  if (Math.abs(v.v) > 60 && (v.engT = (v.engT || 0) - dt) <= 0) { v.engT = 0.5; noise(v.x, v.y, 160, 'car', 0); }
}
function carWreck(v) {
  v.dead = true; v.v = 0; v.burn = 6; play('glass', 0.8); play('thud', 0.9); S.shakeT = 0.4; noise(v.x, v.y, 420, 'car', 0);
  if (S.player.car === v) { carExit(true); hurtPlayer(null, '차가 부서졌다.'); toast('차가 부서졌다', 2, 'warn'); }
}
// 탈 수 있는 차: 가까이 있고 거의 멈춘(또는 천천히 가는) 차
function nearVehicle() {
  const P = S.player; if (!S.vehicles || P.car || P.z || flOf(P) || P.carrying || P.captive) return null;
  let best = null, bd = 64;
  for (const v of S.vehicles) { if (v.dead || Math.abs(v.v) > 110) continue; const d = Math.min(...carPts(v).map(([x, y]) => dist(P.x, P.y, x, y)), dist(P.x, P.y, v.x, v.y)); if (d < bd) { bd = d; best = v; } }
  return best;
}
// 차 타기: 운전석 문(왼쪽) 앞으로 걸어가 → (사람이 타 있으면) 문을 열고 끌어내 밀쳐 내고 → 올라탄다
function carEnter(v) {
  const P = S.player; if (P.trav) return;
  const side = v.a - Math.PI / 2, door = { x: v.x + Math.cos(side) * 40 + Math.cos(v.a) * 6, y: v.y + Math.sin(side) * 40 + Math.sin(v.a) * 6 };
  const out = { x: v.x + Math.cos(side) * 78, y: v.y + Math.sin(side) * 78 }, jack = !!v.driver;
  v.ai = false; v.parked = false; v.v = 0; v.jacking = true; P.hide = null; P.cover = null; input.aiming = null;
  const tWalk = Math.min(0.35, dist(P.x, P.y, door.x, door.y) / 240), tPull = jack ? 0.55 : 0.12, dur = tWalk + tPull + 0.3;
  startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: door.x, y: door.y, f: tWalk / dur }, { x: door.x, y: door.y, f: (tWalk + tPull) / dur }, { x: v.x, y: v.y, f: 1 }], dur,
    phases: [{ to: 1, pose: 'walk' }], face: Math.atan2(v.y - door.y, v.x - door.x) });
  after(tWalk, () => { play('switch', 0.5); });  // 문 여는 소리
  if (jack) after(tWalk + 0.12, () => {  // 운전자를 끌어내 길바닥에 밀쳐 낸다 → 일어나 달아난다
    P.strikeT = 0.3; play('cloth', 0.6); play('thud', 0.4);
    const g = makeGuard({ kind: 'civ', at: [Math.floor(v.x / TILE), Math.floor(v.y / TILE)] }, S.guards.length);
    g.x = v.x; g.y = v.y; g.a = side; g.route = [{ x: out.x, y: out.y, pause: 999 }]; g.driverOut = true; g.state = 'PATROL'; g.meter = 1; S.guards.push(g);
    if (PR) prWarm([charOf(g)], true);
    let k = 0; const slide = () => { k++; g.x = v.x + (out.x - v.x) * k / 4; g.y = v.y + (out.y - v.y) * k / 4; if (k < 4) after(0.06, slide); else { civPanic(g, v.x, v.y, 8); gsay(g, ['내 차!', '뭐, 뭐야!', '사람 살려!'][v.id % 3], 1.6); } };
    slide();
    if (witnessed(P.x, P.y, 380)) addWanted(1, '차를 빼앗는 걸 사람들이 봤다');
    v.driver = false;
  });
  P.trav.end = () => { v.jacking = false; P.car = v; P.x = v.x; P.y = v.y; play('switch', 0.4); play('click', 0.3);
    hint('drive', isTouch ? '운전: 화면 왼쪽을 끌어 방향 조절. 진행 반대 방향으로 끌면 제동·후진. [행동]으로 내리기' : '운전: 방향키로 조향, 진행 반대 방향으로 제동·후진. ' + KK('env') + ' = 내리기, ' + KK('atk') + ' = 경적'); };
}
function carExit(force) {
  const P = S.player, v = P.car; if (!v) return;
  const spots = [v.a - Math.PI / 2, v.a + Math.PI / 2, v.a + Math.PI, v.a].map(a => ({ x: v.x + Math.cos(a) * 52, y: v.y + Math.sin(a) * 52 }));
  const ok = spots.find(p => !solidAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) && !S.vehicles.some(o => o !== v && dist(o.x, o.y, p.x, p.y) < 50)) || spots[0];
  P.car = null; P.x = ok.x; P.y = ok.y; P.vx = 0; P.vy = 0; collide(P, 13, groundSolidP);
  if (Math.abs(v.v) < 150) v.v = 0; play('switch', 0.4);  // 빨리 달리다 뛰어내리면 차는 혼자 굴러간다
  v.parked = true;
}
function honk() { const v = S.player.car; if (!v || (v.honkT || 0) > S.t) return; v.honkT = S.t + 0.6; play('metal', 0.5, 2.4); noise(v.x, v.y, 240, 'car', 0);
  for (const g of S.guards) if (g.civ && g.state !== 'DEAD' && !g.child && dist(g.x, g.y, v.x, v.y) < 140 && (g.state === 'PATROL' || g.state === 'RETURN')) { g.want = Math.atan2(g.y - v.y, g.x - v.x); setIcon(g, '!'); } }
// 차 그리기: 위에서 본 차 그림을 차머리 쪽으로 돌려서 (그림은 위쪽이 차머리)
function drawVehicles() {
  if (!S.vehicles) return;
  const vx0 = cam.x - W / SCALE / 2 - 120, vx1 = cam.x + W / SCALE / 2 + 120, vy0 = cam.y - H / SCALE / 2 - 120, vy1 = cam.y + H / SCALE / 2 + 120;
  for (const v of S.vehicles) {
    if (v.x < vx0 || v.x > vx1 || v.y < vy0 || v.y > vy1) continue;
    ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.a + Math.PI / 2);
    drawCarBody(v);
    // 전조등 (밤): 달리는 차는 앞을 비춘다
    if (!v.dead && (v.ai || S.player.car === v)) { const g = ctx.createLinearGradient(0, -46, 0, -150); g.addColorStop(0, 'rgba(255,240,200,.32)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-16, -46); ctx.lineTo(-40, -150); ctx.lineTo(40, -150); ctx.lineTo(16, -46); ctx.fill();
      ctx.fillStyle = 'rgba(255,60,50,.9)'; ctx.fillRect(-17, 44, 7, 3); ctx.fillRect(10, 44, 7, 3); }
    if (S.player.car === v) { ctx.strokeStyle = 'rgba(120,210,255,.8)'; ctx.lineWidth = 2; ctx.strokeRect(-25, -49, 50, 98); }
    ctx.restore();
    if (v.dead && v.burn > 0) { ctx.fillStyle = `rgba(255,${120 + Math.random() * 80 | 0},40,${0.5 * v.burn / 6})`; ctx.beginPath(); ctx.arc(v.x + rnd(-6, 6), v.y + rnd(-10, 10), 14 + Math.random() * 10, 0, TAU); ctx.fill(); }
    if (v.smoke > 0 || (v.hp <= 2 && !v.dead)) { ctx.fillStyle = 'rgba(160,160,170,.35)'; ctx.beginPath(); ctx.arc(v.x + Math.cos(v.a) * 30 + Math.sin(S.t * 7) * 4, v.y + Math.sin(v.a) * 30 - 10, 10, 0, TAU); ctx.fill(); }
  }
}
// 도로 칠: 가운데 노란 겹선, 교차로 앞 정지선과 횡단보도 (지도 그림에 한 번 굽는다)
function drawRoadMarks(x) {
  const RX = STAGE.roadsX, RY = STAGE.roadsY, T = TILE, inX = px => RX.some(r => px >= r * T && px < (r + 4) * T), inY = py => RY.some(r => py >= r * T && py < (r + 4) * T);
  x.save();
  for (const r of RY) { const cy = (r + 2) * T; for (let px = 0; px < MW * T; px += 8) { if (inX(px)) continue; x.fillStyle = '#d8b440'; x.fillRect(px, cy - 4, 8, 2); x.fillRect(px, cy + 2, 8, 2); } }
  for (const r of RX) { const cx = (r + 2) * T; for (let py = 0; py < MH * T; py += 8) { if (inY(py)) continue; x.fillStyle = '#d8b440'; x.fillRect(cx - 4, py, 2, 8); x.fillRect(cx + 2, py, 2, 8); } }
  // 횡단보도: 교차로 네 변 바로 바깥
  x.fillStyle = 'rgba(225,228,236,.55)';
  for (const rx of RX) for (const ry of RY) {
    const x0 = rx * T, y0 = ry * T, x1 = (rx + 4) * T, y1 = (ry + 4) * T;
    for (let k = 0; k < 4 * T; k += 16) { if (y0 - 30 > 0) x.fillRect(x0 + k + 3, y0 - 30, 9, 26); if (y1 + 30 < MH * T) x.fillRect(x0 + k + 3, y1 + 4, 9, 26); if (x0 - 30 > 0) x.fillRect(x0 - 30, y0 + k + 3, 26, 9); if (x1 + 30 < MW * T) x.fillRect(x1 + 4, y0 + k + 3, 26, 9); }
  }
  x.restore();
}
// 위에서 내려다본 차 (차머리 = 위쪽): 차체 · 앞유리 · 지붕 · 뒷유리 · 전조등 · 미등
const CAR_COL = ['#d8d6d0', '#8e939c', '#3a404c', '#b8322c', '#2e4f86', '#d9a43a', '#3d6b4a'];
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function drawCarBody(v) {
  const c = ctx, col = v.dead ? '#26262a' : v.police ? '#e6e8ee' : CAR_COL[v.c % CAR_COL.length], hw = CAR_W / 2, hl = CAR_LEN / 2;
  c.fillStyle = 'rgba(0,0,0,.45)'; rrect(c, -hw + 5, -hl + 7, CAR_W, CAR_LEN, 10); c.fill();
  c.fillStyle = col; rrect(c, -hw, -hl, CAR_W, CAR_LEN, 10); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 2; c.stroke();
  if (v.police && !v.dead) { c.fillStyle = '#1c2230'; c.fillRect(-hw + 2, -8, CAR_W - 4, 26); }  // 경찰차: 흰 바탕에 검은 문짝
  c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(-hw + 6, -hl + 6, CAR_W - 12, 14);  // 보닛 빛
  c.fillStyle = v.dead ? '#111' : '#1d2b3e'; c.beginPath(); c.moveTo(-hw + 5, -hl + 28); c.lineTo(hw - 5, -hl + 28); c.lineTo(hw - 8, -hl + 40); c.lineTo(-hw + 8, -hl + 40); c.closePath(); c.fill();  // 앞유리
  c.fillStyle = 'rgba(160,200,235,.35)'; c.fillRect(-hw + 9, -hl + 30, 10, 3);
  c.fillStyle = 'rgba(0,0,0,.18)'; rrect(c, -hw + 6, -hl + 40, CAR_W - 12, 30, 5); c.fill();  // 지붕
  c.fillStyle = v.dead ? '#111' : '#1d2b3e'; c.fillRect(-hw + 8, hl - 22, CAR_W - 16, 9);  // 뒷유리
  if (!v.dead) { c.fillStyle = '#ffe9a8'; c.fillRect(-hw + 3, -hl + 1, 8, 4); c.fillRect(hw - 11, -hl + 1, 8, 4); c.fillStyle = '#d23a32'; c.fillRect(-hw + 3, hl - 5, 8, 4); c.fillRect(hw - 11, hl - 5, 8, 4); }
  if (v.police && !v.dead) { const on = Math.floor(S.t * 6) % 2; c.fillStyle = on ? '#ff3b3b' : '#4a2020'; c.fillRect(-12, -hl + 46, 11, 6); c.fillStyle = on ? '#2a2a4a' : '#3b6bff'; c.fillRect(1, -hl + 46, 11, 6); }
  c.fillStyle = col; c.fillRect(-hw - 3, -hl + 30, 4, 5); c.fillRect(hw - 1, -hl + 30, 4, 5);  // 사이드미러
}
// 엔진 소리: 내가 몰 때만, 빠를수록 높고 크게 (톱니파 + 저역 통과)
let ENG = null;
function engineSound() {
  if (!AC || !master) return;
  const v = S && S.player && S.player.car, on = !!v && !S.over && running && !paused && !muted;
  if (!ENG) { if (!on) return; const o = AC.createOscillator(), o2 = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain(); o.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 420; g.gain.value = 0; o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); o.start(); o2.start(); ENG = { o, o2, lp, g }; }
  const now = AC.currentTime, sp = on ? Math.abs(v.v) / CAR_MAX : 0;
  ENG.g.gain.setTargetAtTime(on ? 0.045 + sp * 0.05 : 0, now, 0.12); ENG.o.frequency.setTargetAtTime(38 + sp * 95, now, 0.1); ENG.o2.frequency.setTargetAtTime(19 + sp * 48, now, 0.1);
}
