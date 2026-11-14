// ---------------------------------------------------------------- 차량 (도시 판): 도로를 다니는 차 · 세워 둔 차 · 내가 모는 차
// 도로 격자: STAGE.roadsX(세로 도로 왼쪽 칸) · STAGE.roadsY(가로 도로 위쪽 칸), 폭 4칸. 우측 통행 — 차로 중심은 도로 안쪽에서 1칸·3칸
// 방향 d: 0 동 · 1 남 · 2 서 · 3 북
const DV = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const CAR_LEN = 92, CAR_W = 42, CAR_R = 21;  // 차 길이·폭(px), 충돌 원 반지름 (앞뒤 원 둘)
const CAR_MAX = 430, CAR_ACC = 320, CAR_BRAKE = 700, CAR_FRIC = 160, CAR_TURN = 3.1, AI_SPD = 165, CITY_CRUISE = 280;  // 자유 모드 차는 달리기(160)보다 확실히 빠르게
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
// 차종: 이름 · 그림 · 최고 속도 · 가속 · 핸들 · 내구성 · 무게 · 값(만 원, 0 = 못 판다) · 거리에 나오는 비율.
// 앞의 다섯(세단·소형·해치백·왜건·고급)은 예전 차와 같은 성능이다(의뢰 맵의 차는 그대로)
const VTYPES = {
  sedan: { name: '중형 세단', max: 430, acc: 320, turn: 3.1, hp: 6, mass: 1, price: 700, w: 12 },
  civic: { name: '소형 세단', max: 430, acc: 320, turn: 3.1, hp: 6, mass: 1, price: 500, w: 8 },
  hatch: { name: '해치백', max: 430, acc: 320, turn: 3.1, hp: 6, mass: 1, price: 450, w: 6 },
  wagon: { name: '왜건', max: 430, acc: 320, turn: 3.1, hp: 6, mass: 1, price: 600, w: 4 },
  luxury: { name: '고급 세단', max: 430, acc: 320, turn: 3.1, hp: 6, mass: 1, price: 1500, w: 4 },
  micro: { name: '경차', max: 330, acc: 300, turn: 3.7, hp: 4, mass: .7, price: 300, w: 12 },
  taxi: { name: '택시', max: 440, acc: 330, turn: 3.2, hp: 6, mass: 1, price: 500, w: 18 },
  suv: { name: 'SUV', max: 420, acc: 300, turn: 2.8, hp: 8, mass: 1.3, price: 1000, w: 8 },
  sport: { name: '스포츠카', max: 560, acc: 440, turn: 3.6, hp: 5, mass: .9, price: 3000, w: 1.2 },
  supercar: { name: '슈퍼카', max: 640, acc: 500, turn: 3.8, hp: 4, mass: .9, price: 5000, w: .5 },
  pickup: { name: '1톤 트럭', max: 340, acc: 240, turn: 2.7, hp: 8, mass: 1.4, price: 600, w: 9 },
  van: { name: '승합차', max: 340, acc: 230, turn: 2.5, hp: 8, mass: 1.5, price: 800, w: 5 },
  minivan: { name: '미니밴', max: 380, acc: 260, turn: 2.8, hp: 7, mass: 1.3, price: 900, w: 4 },
  box: { name: '탑차', max: 300, acc: 190, turn: 2.2, hp: 10, mass: 2.2, price: 1200, w: 4 },
  truck: { name: '덤프트럭', max: 280, acc: 170, turn: 2.0, hp: 12, mass: 3, price: 0, w: 2 },
  bus: { name: '시내버스', model: 'busGreen', max: 300, acc: 170, turn: 1.8, hp: 14, mass: 3.5, price: 0, w: 4 },
  ambulance: { name: '구급차', max: 450, acc: 340, turn: 2.9, hp: 9, mass: 1.8, price: 0, w: 1 },
  limo: { name: '리무진', max: 400, acc: 260, turn: 2.2, hp: 9, mass: 1.8, price: 6000, w: .5 },
  police: { name: '경찰차', max: 500, acc: 380, turn: 3.3, hp: 9, mass: 1.3, price: 0, w: 0 },
};
const vType = v => VTYPES[v.type] || VTYPES.sedan;
// 큰 도시 거리 차: 비율대로 고른다 (r: 0~1)
// mix: 구역마다 많이 다니는 차 (비율에 곱한다, 예: 공장지대는 트럭)
function pickVType(r, mix) { const wt = k => VTYPES[k].w * (mix?.[k] || 1), ks = Object.keys(VTYPES).filter(k => VTYPES[k].w > 0), tot = ks.reduce((a, k) => a + wt(k), 0); let x = r * tot; for (const k of ks) { x -= wt(k); if (x <= 0) return k; } return ks[0]; }
function makeVehicle(o) {
  const v = Object.assign({ x: 0, y: 0, a: 0, v: 0, d: 0, c: 0, ai: false, parked: false, driver: false, stopT: 0, honkT: 0, burn: 0, smoke: 0, id: (S.vehN = (S.vehN || 0) + 1) }, o);
  if (!v.type) v.type = v.police ? 'police' : ['sedan', 'civic', 'hatch', 'wagon', 'luxury'][((v.c % 5) + 5) % 5];
  // 몸 크기: 그림(팩의 동쪽을 본 칸)에서 잰 길이·폭. 충돌은 앞뒤로 늘어선 원으로 덮는다
  const T = vType(v), f = A.cityVehicles?.frames?.[T.model || v.type], len = T.len || f?.len || CAR_LEN, wid = T.wid || f?.wid || CAR_W;
  v.len = len; v.r = T.r || Math.max(CAR_R, Math.round(wid / 2)); v.hl = Math.max(8, len / 2 - v.r + 4);
  const hpK = STAGE.cityLife ? 2 : 1;  // 자유 모드: 차가 너무 쉽게 부서지지 않게 내구성 두 배
  if (o.hp == null) v.hp = T.hp * hpK; v.hpMax = T.hp * hpK;
  return v;
}
function trafficInit() {
  S.vehicles = []; decksInit();
  for (const p of CITY_PARKED) S.vehicles.push(makeVehicle({ x: p.x, y: p.y, a: -Math.PI / 2, c: p.c === 9 ? 0 : p.c, parked: true, police: p.c === 9, type: STAGE.cityLife && p.c !== 9 ? pickVType(((p.x * 73856093 ^ p.y * 19349663) >>> 0) / 4294967296, STAGE.vehicleMix?.(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) : undefined }));  // 색 9 = 경찰차
  const RX = STAGE.roadsX, RY = STAGE.roadsY, n = STAGE.traffic || 0, P = S.player;
  // 도로 위 차: 가로·세로 도로에 번갈아, 나와 너무 가깝지 않게
  for (let i = 0, k = 0; i < n && k < 400; k++) {
    const hor = k % 2 === 0, d = hor ? (k % 4 === 0 ? 0 : 2) : (k % 4 === 1 ? 1 : 3);
    const road = hor ? RY[(k * 7) % RY.length] : RX[(k * 5) % RX.length], along = ((k * 977) % ((hor ? MW : MH) - 4)) + 2;
    const x = hor ? tc(along) : laneOf(road, d), y = hor ? laneOf(road, d) : tc(along);
    if (dist(x, y, P.x, P.y) < 300 || S.vehicles.some(v => dist(v.x, v.y, x, y) < 160) || RX.some(rx=>RY.some(ry=>Math.abs(x-(rx+2)*TILE)<170&&Math.abs(y-(ry+2)*TILE)<170))) continue;
    const dz = deckSpawnZ(x, y); if (dz < 0) continue;
    const v = makeVehicle({ z: dz, x, y, d, a: Math.atan2(DV[d][1], DV[d][0]), v: AI_SPD * 0.6, c: (k * 3) % 5, ai: true, driver: true, type: STAGE.cityLife ? pickVType(((k * 2654435761) >>> 0) / 4294967296, STAGE.vehicleMix?.(Math.floor(x / TILE), Math.floor(y / TILE))) : undefined });
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
  if (onDeckLevel(v)) { v.turn = null; v.crossEnd = sgn > 0 ? (r + 4) * TILE + 4 : r * TILE - 4; return; }  // 고가 위에서는 꺾지 않는다
  const opts = [];
  const lim = hor ? MW : MH, rLim = hor ? MH : MW;
  if (sgn > 0 ? r + 4 < lim : r > 0) opts.push(v.d, v.d);  // 직진 (조금 더 자주)
  const right = (v.d + 1) % 4, left = (v.d + 3) % 4;
  for (const nd of [right, left]) { const s2 = DV[nd][0] + DV[nd][1]; if (myRoad == null || deckBlocksTurn(!hor, r, myRoad)) continue;  // 고가 아래 교차로에서 고가 도로로는 못 꺾는다
    if (s2 > 0 ? myRoad + 4 < rLim : myRoad > 0) opts.push(nd); }
  let nd = opts.length ? opts[(v.id * 7 + r * 3 + Math.floor(S.t)) % opts.length] : (v.d + 2) % 4;
  if (v.chase && opts.length) { const P = !v.rage && !v.rageCar && STAGE.cityLife && S.wanted > 0 && S.wantSpot ? S.wantSpot : S.player, ix = hor ? (r + 2) * TILE : v.x, iy = hor ? v.y : (r + 2) * TILE;  // 경찰차: 나에게 가까워지는 쪽
    nd = opts.slice().sort((a, b) => ((P.x - ix) * DV[b][0] + (P.y - iy) * DV[b][1]) - ((P.x - ix) * DV[a][0] + (P.y - iy) * DV[a][1]))[0]; }
  v.turn = nd === v.d ? null : { nd, at: laneOf(r, nd) };
  v.crossEnd = sgn > 0 ? (r + 4) * TILE + 4 : r * TILE - 4;  // 직진이면 이 지점을 지나서 다음 교차로를 고른다
}
// 차 격자: 한 프레임에 한 번 차를 192px 칸에 나눠 둔다. 둘레 차만 훑을 때 쓴다 (차 160대 × 160대를 매번 다 보지 않게)
const VG_CELL = 192; let VEHG = null;
function vehGrid() {
  if (VEHG && VEHG.t === S.t && VEHG.s === S && VEHG.n === S.vehicles.length) return VEHG;
  const cells = new Map(), byId = new Map();
  for (const v of S.vehicles) { byId.set(v.id, v); const k = Math.floor(v.x / VG_CELL) * 65536 + Math.floor(v.y / VG_CELL); let c = cells.get(k); if (!c) cells.set(k, c = []); c.push(v); }
  return (VEHG = { t: S.t, s: S, n: S.vehicles.length, cells, byId });
}
function vehiclesIn(x0, y0, x1, y1) {
  const g = vehGrid(), out = [];
  for (let cx = Math.floor(x0 / VG_CELL), cx1 = Math.floor(x1 / VG_CELL); cx <= cx1; cx++) for (let cy = Math.floor(y0 / VG_CELL), cy1 = Math.floor(y1 / VG_CELL); cy <= cy1; cy++) { const c = g.cells.get(cx * 65536 + cy); if (c) for (const v of c) out.push(v); }
  return out;
}
// 앞이 막혔나: 진행 방향 앞 상자 안의 차·사람
function aheadBlocked(v) {
  const ca = Math.cos(v.a), sa = Math.sin(v.a), P = S.player;
  const inBox = (x, y, len, half) => { const dx = x - v.x, dy = y - v.y, f = dx * ca + dy * sa, s = -dx * sa + dy * ca; return f > 30 && f < len && Math.abs(s) < half; };
  if (v.chase) return P.car && inBox(P.car.x, P.car.y, 130, 40) ? 'car' : null;  // 추격 경찰차는 내 차 말고는 서지 않는다 (사람은 밀치고 간다)
  const up = onDeckLevel(v);
  for (const o of vehiclesIn(v.x - 160, v.y - 160, v.x + 160, v.y + 160)) if (o !== v && Math.abs(o.x - v.x) < 160 && Math.abs(o.y - v.y) < 160 && !o.dead && inBox(o.x, o.y, 150, 34) && onDeckLevel(o) === up) return 'car';  // 먼 차는 바로 건너뛴다
  if (up) return null;  // 고가 위: 사람은 없다
  if (!P.car && !P.z && !flOf(P) && inBox(P.x, P.y, 120, 30)) return 'me';
  for (const g of actorsNear(v.x + ca * 70, v.y + sa * 70)) if (g !== P && g.state !== 'DEAD' && inBox(g.x, g.y, 110, 28) && !flOf(g) && !g.z) return 'ped';  // 앞 70px 둘레 칸의 사람만
  return null;
}
function updateVehicles(dt) {
  if (!S.vehicles) return;
  for (const v of S.vehicles) {
    if (v.dead) { v.burn = Math.max(0, v.burn - dt); if ((v.z || 0) > 0.001) deckStep(v, dt); continue; }  // 부서진 차도 공중이면 떨어진다
    if (v.smoke > 0) v.smoke -= dt;
    if (v === (S.player.car || {}) || v.scripted) continue;  // 내 차는 updateDriving · 이벤트가 직접 움직이는 차
    if (!v.ai) { if (Math.abs(v.v) > 1) { v.v *= Math.pow(v.coastT > S.t ? 0.55 : 0.08, dt); carMove(v, dt); hitPeople(v, dt); } continue; }  // 사람이 뛰어내린 차는 한동안 굴러가며 앞을 친다  // 주인 없는 차: 미끄러지다 선다
    let vdt = dt;
    if (STAGE.city) { vdt = cityLodStep(v, dt, cityLodVehicleCalm(v)); if (!vdt) continue; }  // 도시: 멀리서 그냥 다니는 차는 덜 자주
    aiDrive(v, vdt);
    hitPeople(v, vdt);
  }
  pushBodiesFromCars(); carFireUpdate(dt);
}
// 걷는 사람은 차를 밟고 지나가지 못한다: 차 몸(앞뒤 끝을 잇는 막대 + 반지름)에 닿은 사람은 차 밖으로 밀어낸다.
// 벽 안으로 밀리면 그 자리에 둔다. 사람 x로 정렬해 차 근처만 본다
const BODY_R = 12;
function pushBodiesFromCars() {
  if (!S.vehicles.length) return;
  const P = S.player, people = [];
  if (!P.car && !P.z && !flOf(P) && !P.hide && !P.vent) people.push(P);
  for (const g of S.guards) if (g.state !== 'DEAD' && g.state !== 'CAPTIVE' && !g.off && !g.z && !flOf(g) && !g.climb && g.x > 0) people.push(g);
  people.sort((a, b) => a.x - b.x);
  const reach = 80 + 40 + BODY_R;
  for (const v of S.vehicles) {
    if ((v === P.car && Math.abs(v.v) > 1) || onDeckLevel(v)) continue;
    const hl = v.hl ?? 25, ca = Math.cos(v.a) * hl, sa = Math.sin(v.a) * hl;
    let lo = 0, hi = people.length; while (lo < hi) { const m = (lo + hi) >> 1; if (people[m].x < v.x - reach) lo = m + 1; else hi = m; }
    for (let i = lo; i < people.length && people[i].x <= v.x + reach; i++) {
      const o = people[i]; if (Math.abs(o.y - v.y) > reach) continue;
      // 막대 위 가장 가까운 점
      const t = clamp(((o.x - v.x) * ca + (o.y - v.y) * sa) / (hl * hl), -1, 1), qx = v.x + ca * t, qy = v.y + sa * t, dx = o.x - qx, dy = o.y - qy, d = Math.hypot(dx, dy), need = (v.r || CAR_R) + BODY_R;
      if (d >= need) continue;
      const ux = d > 0.01 ? dx / d : -sa / hl, uy = d > 0.01 ? dy / d : ca / hl, nx = qx + ux * need, ny = qy + uy * need;
      if (!solidAt(Math.floor(nx / TILE), Math.floor(ny / TILE))) { o.x = nx; o.y = ny; }
    }
  }
}
// 남이 모는 차: 내 차와 같은 몸(속도·방향·핸들)으로 달린다. 앞을 보고(차로 위 70px 앞 점을 따라가는 '순수 추종') 핸들을 꺾고,
// 교차로 앞에선 속도를 줄이고, 꺾을 때는 새 차로 쪽 점을 따라가 둥글게 돈다 (예전처럼 직각으로 '툭' 꺾이지 않는다)
const AI_LOOK = 72;
function aiDrive(v, dt) {
  let hor = v.d === 0 || v.d === 2, sgn = DV[v.d][0] + DV[v.d][1];
  if (v.lane == null) v.lane = hor ? v.y : v.x;
  if (v.turn && onDeckLevel(v)) planTurn(v);  // 땅에서 정해 둔 꺾기는 고가에 오르면 취소 (고가 밑 교차로에서는 못 꺾는다)
  const T = vType(v), blk = aheadBlocked(v); let want = v.chase ? Math.min(AI_SPD * 2, T.max) : v.flee ? Math.min(AI_SPD * 2.2, T.max) : Math.min(STAGE.cityLife ? CITY_CRUISE : AI_SPD, T.max * (STAGE.cityLife ? .7 : .55));  // 버스·트럭은 천천히
  if (blk) { v.stopT += dt; want = 0;
    if (blk !== 'car' && v.stopT > 1.4 && (v.honkT -= dt) <= 0) { v.honkT = 2.5; play('metal', 0.25 * proxVol(v), 2.4); if (blk === 'me' || blk === 'ped' && !STAGE.cityLife) noise(v.x, v.y, 120, 'car', 0); }  // 자유 모드: 길 건너는 행인에게 울리는 경적은 그냥 거리 소리 (경비를 부르지 않는다)
  } else v.stopT = 0;
  if (v.panicT > S.t) { want = Math.max(want, v.panicSpd); v.stopT = 0; }  // 다중 추돌: 앞차가 섰는데 미처 못 선다
  if((v.crashUntil||0)>S.t)want=0;
  const stop=trafficStopDistance(v);if(stop!=null)want=Math.min(want,Math.sqrt(2*CAR_BRAKE*Math.max(0,stop-6)),Math.max(0,stop-6)/Math.max(dt,1/60));  // 먼 차는 큰 걸음으로 움직여도 정지선을 넘지 않게
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
  if (v.v < want) v.v = Math.min(want, v.v + T.acc * (v.chase ? 1.2 : 0.7) * dt); else v.v = Math.max(want, v.v - CAR_BRAKE * dt);
  // 핸들: 내 차와 같은 식 — 빠를수록 잘 돌고, 서 있으면 거의 안 돈다
  const turn=clamp(err * 3, -1, 1) * T.turn * Math.max(0.15, Math.min(1, Math.abs(v.v) / 90)) * dt;
  carMove(v,dt,turn);
  // 지도 끝: 반대 방향 차로로 돌아 들어온다
  if (v.x < -60 || v.x > MW * TILE + 60 || v.y < -60 || v.y > MH * TILE + 60) {
    v.d = (v.d + 2) % 4; v.a = Math.atan2(DV[v.d][1], DV[v.d][0]); v.x = clamp(v.x, 30, MW * TILE - 30); v.y = clamp(v.y, 30, MH * TILE - 30);
    const road = hor ? STAGE.roadsY.find(r => Math.abs(r * TILE + 96 - v.y) < 120) : STAGE.roadsX.find(r => Math.abs(r * TILE + 96 - v.x) < 120);
    v.lane = laneOf(road || 0, v.d); if (hor) v.y = v.lane; else v.x = v.lane; planTurn(v); }
}
// One junction reservation, released after the rear bumper clears it. Waiting
// never authorizes driving through another car after an arbitrary timeout.
// 신호등 (STAGE.signals): 한국식 4현시. 동서 직진(초록) → 황색 → 동서 좌회전(빨강+화살표) → 황색 → 남북 직진 → 황색 → 남북 좌회전 → 황색.
// 보행 신호는 같은 방향 직진과 함께 초록이 되고(끝 3초 깜빡임), 좌회전 때는 빨강이다. 교차로마다 시작을 어긋나게 해 한꺼번에 바뀌지 않는다
const SIG_T = 36, SIG_PH = [[10, 'G'], [12, 'Y'], [17, 'L'], [18, 'Y']];
function signalTime(rx, ry) { return ((S.t + ((rx * 7 + ry * 11) % SIG_T)) % SIG_T + SIG_T) % SIG_T; }
function signalState(rx, ry) {
  if (!STAGE.signals) return null;
  const t = signalTime(rx, ry), ph = t => SIG_PH.find(([end]) => t < end)[1];
  return t < 18 ? { ew: ph(t), ns: 'R' } : { ew: 'R', ns: ph(t - 18) };
}
// 차가 이 교차로에서 갈 수 있나: 초록은 직진·우회전, 좌회전 화살표는 좌회전만
function signalLets(light, v, x0, y0, x1, y1) {
  const hor = v.d % 2 === 0, t = v.turn, here = t && (hor ? t.at > x0 && t.at < x1 : t.at > y0 && t.at < y1);
  const turnLeft = here && t.nd === (v.d + 3) % 4;
  return light === 'G' ? !turnLeft : light === 'L' ? turnLeft : false;
}
// 신호등 그림: 차량 신호기는 교차로 건너편(차가 바라보는 쪽) 모퉁이 기둥에서 다가오는 차로 위로 팔을 뻗어 단다.
// 동쪽으로 가는 차 = 남동 기둥, 서쪽 = 북서, 남쪽 = 남서, 북쪽 = 북동. 등은 빨강 · 노랑 · 좌회전 화살표 · 초록 (좌회전 때는 빨강+화살표)
// 보행 신호는 차량 신호기와 따로, 횡단보도 양 끝 보도에 선다
const SIG_COL = { G: '#2ee87a', Y: '#ffc21f', R: '#ff3434' };
// 구운 신호등 그림 (tools/prerender/bake_signals.py: 기둥·팔·신호기를 건물과 같은 3/4 시점으로 렌더). 켜진 등만 위에 그린다
const sigArt = A.citySignals, sigAtlas = sigArt ? Object.assign(new Image(), { src: sigArt.src }) : null, sigReady = () => !!(sigAtlas && sigAtlas.complete && sigAtlas.naturalWidth);
// 켜진 렌즈: 3px 반지름 도트 원판 + 가운데 밝은 점 + 번짐
function sigLens(x, y, col, arrowA) {
  x = Math.round(x); y = Math.round(y);
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col + '40'; ctx.fillRect(x - 7, y - 5, 15, 11); ctx.fillStyle = col + '30'; ctx.fillRect(x - 10, y - 3, 21, 7); ctx.globalCompositeOperation = 'source-over';
  if (arrowA != null) { ctx.save(); ctx.translate(x + .5, y + .5); ctx.rotate(Math.round(arrowA / (Math.PI / 2)) * Math.PI / 2); ctx.fillStyle = col; ctx.fillRect(-3, -1, 6, 2); ctx.fillRect(1, -3, 1, 6); ctx.fillRect(2, -2, 1, 4); ctx.restore(); return; }
  ctx.fillStyle = col; ctx.fillRect(x - 2, y - 3, 5, 7); ctx.fillRect(x - 3, y - 2, 7, 5); ctx.fillStyle = '#ffffffb0'; ctx.fillRect(x - 1, y - 2, 2, 2);
}
// 보행 신호 그림: 7×10 도트 (서 있는 사람 / 걷는 사람 두 동작)
const WALK_PX = { stand: ['..###..', '..###..', '...#...', '.#####.', '#.###.#', '#.###.#', '..#.#..', '..#.#..', '..#.#..', '..#.#..'],
  walk0: ['...##..', '...##..', '...#...', '..####.', '.#.##.#', '#..##..', '...#.#.', '..#...#', '.#....#', '.#.....'],
  walk1: ['...##..', '...##..', '...#...', '..###..', '..###..', '.#.##..', '...##..', '...#.#.', '..#..#.', '..#..#.'] };
function walkPx(name, x, y, col) { ctx.fillStyle = col; const m = WALK_PX[name]; for (let r = 0; r < m.length; r++) for (let c = 0; c < 7; c++) if (m[r][c] === '#') ctx.fillRect(x + c, y + r, 1, 1); }
function drawSignalSprite(key, px, py, state, turnA) {
  const f = sigArt.frames[key]; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sigAtlas, f.x, f.y, f.w, f.h, Math.round(px + f.ox), Math.round(py + f.oy), f.w, f.h);
  const on = { R: state === 'R' || state === 'L', Y: state === 'Y', L: state === 'L', G: state === 'G' };
  ['R', 'Y', 'L', 'G'].forEach((c, k) => { if (!on[c]) return; const [lx, ly] = f.lamps[k]; sigLens(px + lx, py + ly, c === 'L' ? SIG_COL.G : SIG_COL[c], c === 'L' ? turnA : null); });
}
function drawWalkSprite(cx, cy, state, t) {
  const f = sigArt.frames.walk, px = cx, py = cy + 16, go = state === 'G' || state === 'W', blink = state === 'W' && Math.floor(t * 4) % 2 === 0;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(sigAtlas, f.x, f.y, f.w, f.h, Math.round(px + f.ox), Math.round(py + f.oy), f.w, f.h);
  const [ux, uy] = f.lamps[0], [lx, ly] = f.lamps[1];
  if (!go) { walkPx('stand', Math.round(px + ux - 3), Math.round(py + uy - 5), SIG_COL.R); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,52,52,.18)'; ctx.fillRect(Math.round(px + ux - 8), Math.round(py + uy - 8), 17, 16); ctx.globalCompositeOperation = 'source-over'; }
  else if (!blink) { walkPx(Math.floor(t * 3) % 2 ? 'walk0' : 'walk1', Math.round(px + lx - 3), Math.round(py + ly - 5), SIG_COL.G); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(46,232,122,.18)'; ctx.fillRect(Math.round(px + lx - 8), Math.round(py + ly - 8), 17, 16); ctx.globalCompositeOperation = 'source-over'; }
}
function drawSignalHead(cx, cy, state, vertical, turnA) {  // turnA: 이 신호를 보는 차가 좌회전하는 쪽(화면 각도)
  const L = 46, D = 16, w = vertical ? D : L, h = vertical ? L : D, x = cx - w / 2, y = cy - h / 2;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = '#e2b62a'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);  // 노란 테 (뒤판)
  ctx.fillStyle = '#121418'; ctx.fillRect(x, y, w, h);
  const on = { R: state === 'R' || state === 'L', Y: state === 'Y', L: state === 'L', G: state === 'G' };
  ['R', 'Y', 'L', 'G'].forEach((c, k) => {
    const o = -L / 2 + 6 + k * 11.3, lx = vertical ? cx : cx + o, ly = vertical ? cy + o : cy, col = c === 'L' ? SIG_COL.G : SIG_COL[c];
    ctx.fillStyle = '#25282e'; ctx.beginPath(); ctx.arc(lx, ly, 5, 0, TAU); ctx.fill();
    if (c === 'L') { ctx.save(); ctx.translate(lx, ly); ctx.rotate(turnA); ctx.strokeStyle = on.L ? col : 'rgba(90,100,90,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.moveTo(1, -2.5); ctx.lineTo(3.5, 0); ctx.lineTo(1, 2.5); ctx.stroke(); ctx.restore(); }
    else { ctx.fillStyle = on[c] ? col : 'rgba(70,70,74,.85)'; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, TAU); ctx.fill(); }
    if (on[c]) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col + '55'; ctx.beginPath(); ctx.arc(lx, ly, 11, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  });
}
function drawWalkHead(cx, cy, state, t) {
  const go = state === 'G' || state === 'W', blink = state === 'W' && Math.floor(t * 4) % 2 === 0, x = cx - 8, y = cy - 12;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x + 2, y + 3, 16, 24);
  ctx.fillStyle = '#121418'; ctx.fillRect(x, y, 16, 24); ctx.strokeStyle = '#5a626b'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, 15, 23);
  const col = go ? (blink ? '#0e3a22' : SIG_COL.G) : SIG_COL.R; ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2;
  const fy = go ? y + 13 : y + 5;  // 아래 칸 = 걷는 사람(초록), 위 칸 = 서 있는 사람(빨강)
  ctx.beginPath(); ctx.arc(cx, fy + 1.5, 1.8, 0, TAU); ctx.fill();
  ctx.beginPath(); if (go) { ctx.moveTo(cx, fy + 3); ctx.lineTo(cx - 1, fy + 7); ctx.lineTo(cx - 4, fy + 10); ctx.moveTo(cx - 1, fy + 7); ctx.lineTo(cx + 3, fy + 10); ctx.moveTo(cx - 3, fy + 5); ctx.lineTo(cx + 3, fy + 4); }
  else { ctx.moveTo(cx, fy + 3); ctx.lineTo(cx, fy + 7); ctx.lineTo(cx - 2, fy + 10); ctx.moveTo(cx, fy + 7); ctx.lineTo(cx + 2, fy + 10); ctx.moveTo(cx - 3, fy + 4); ctx.lineTo(cx + 3, fy + 4); } ctx.stroke();
  if (go && !blink) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(46,232,122,.25)'; ctx.fillRect(x - 4, y - 4, 24, 32); ctx.globalCompositeOperation = 'source-over'; }
  if (!go) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,52,52,.2)'; ctx.fillRect(x - 4, y - 4, 24, 32); ctx.globalCompositeOperation = 'source-over'; }
}
// 보행 신호: 'G' 건너도 됨 · 'W' 곧 바뀜(깜빡임) · 'R' 기다림.
// horizontal = 동서로 걷는 사람(남북 도로를 가로지르는 북쪽·남쪽 횡단보도): 동서 직진과 함께 초록. 세로는 남북 직진과 함께
function walkState(rx, ry, horizontal) {
  if (!STAGE.signals) return 'G';
  const t = signalTime(rx, ry) - (horizontal ? 0 : 18);
  return t < 0 || t >= 10 ? 'R' : t >= 7 ? 'W' : 'G';
}
function signalPole(px, py) {
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(px + 3, py + 4, 9, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4a515a'; ctx.beginPath(); ctx.arc(px, py, 7, 0, TAU); ctx.fill(); ctx.fillStyle = '#7d8690'; ctx.beginPath(); ctx.arc(px - 2, py - 2, 3, 0, TAU); ctx.fill();
}
function drawTrafficSignals() {
  if (!STAGE.signals || flOf(S.player)) return;
  ctx.save();
  const T = TILE;
  for (const rx of STAGE.roadsX || []) for (const ry of STAGE.roadsY || []) {
    const x0 = rx * T, y0 = ry * T, x1 = x0 + 4 * T, y1 = y0 + 4 * T; if (!inView((x0 + x1) / 2, (y0 + y1) / 2, 5 * T)) continue;
    const s = signalState(rx, ry);
    // [기둥 x, y, 축, 신호기 x, y, 세로로 다나] — 신호기는 다가오는 차로(오른쪽 통행) 한가운데 위
    // 마지막 값 = 좌회전 화살표 방향: 동쪽으로 가던 차는 북쪽으로, 서쪽은 남쪽, 남쪽은 동쪽, 북쪽은 서쪽으로 돈다
    if (sigReady()) {  // 구운 그림: 기둥 발 자리에 놓고 켜진 등만 그린다
      for (const [px, py, axis, key, ta] of [[x1 + 16, y1 + 16, 'ew', 'sigE', -Math.PI / 2], [x0 - 16, y0 - 16, 'ew', 'sigW', Math.PI / 2], [x0 - 16, y1 + 16, 'ns', 'sigS', 0], [x1 + 16, y0 - 16, 'ns', 'sigN', Math.PI]])
        drawSignalSprite(key, px, py, s[axis], ta);
    } else
    for (const [px, py, axis, hx, hy, vert, ta] of [
      [x1 + 16, y1 + 16, 'ew', x1 + 16, y0 + 3 * T, true, -Math.PI / 2],  // 동쪽으로 가는 차 (남쪽 차로)
      [x0 - 16, y0 - 16, 'ew', x0 - 16, y0 + T, true, Math.PI / 2],       // 서쪽으로 가는 차 (북쪽 차로)
      [x0 - 16, y1 + 16, 'ns', x0 + T, y1 + 16, false, 0],                // 남쪽으로 가는 차 (서쪽 차로)
      [x1 + 16, y0 - 16, 'ns', x0 + 3 * T, y0 - 16, false, Math.PI],      // 북쪽으로 가는 차 (동쪽 차로)
    ]) {
      ctx.strokeStyle = '#3a4048'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = '#6a737e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(hx, hy); ctx.stroke();
      signalPole(px, py); drawSignalHead(hx, hy, s[axis], vert, ta);
    }
    // 보행 신호: 횡단보도 양 끝 보도. 북쪽·남쪽 횡단보도는 동서로 걷고, 서쪽·동쪽은 남북으로 걷는다
    const wh = walkState(rx, ry, true), wv = walkState(rx, ry, false);
    for (const [cx, cy, st] of [
      [x0 - 20, y0 - 50, wh], [x1 + 20, y0 - 50, wh], [x0 - 20, y1 + 50, wh], [x1 + 20, y1 + 50, wh],
      [x0 - 50, y0 - 22, wv], [x0 - 50, y1 + 22, wv], [x1 + 50, y0 - 22, wv], [x1 + 50, y1 + 22, wv],
    ]) (sigReady() ? drawWalkSprite : drawWalkHead)(cx, cy, st, S.t);
  }
  ctx.restore();
}
// 행인: 보행 신호가 빨강이면 도로에 들어서기 직전(연석)에서 기다린다
const ROAD_CH = '.';
function pedWaits(g) {
  if (!STAGE.signals || !g.civ || !['PATROL', 'RETURN'].includes(g.state) || flOf(g) || g.z) return false;  // 도망·신고하러 뛰는 사람은 신호를 안 본다
  const next = g.path?.[0]; if (!next) return false;
  const tx = Math.floor(g.x / TILE), ty = Math.floor(g.y / TILE), nx = Math.floor(next.x / TILE), ny = Math.floor(next.y / TILE);
  if (G0[ny]?.[nx] !== ROAD_CH || G0[ty]?.[tx] === ROAD_CH) return false;  // 이미 길 위면 끝까지 건넌다
  const RX = STAGE.roadsX, RY = STAGE.roadsY, inR = (v, rs) => rs.find(r => v >= r && v < r + 4);
  const rxv = inR(nx, RX), ryv = inR(ny, RY);
  if (rxv != null && ryv == null) { const ry = RY.reduce((a, r) => Math.abs((r + 2) - ny) < Math.abs((a + 2) - ny) ? r : a, RY[0]); return walkState(rxv, ry, true) !== 'G'; }
  if (ryv != null && rxv == null) { const rx = RX.reduce((a, r) => Math.abs((r + 2) - nx) < Math.abs((a + 2) - nx) ? r : a, RX[0]); return walkState(rx, ryv, false) !== 'G'; }
  return false;
}
// 횡단보도는 교차로 앞 70px(둘이 나란히 걷는 폭), 정지선은 그 바깥 84px. 차는 앞머리가 정지선에 닿게 선다(차 중심 = 정지선 + 차 반 길이)
const XWALK = 70, STOP_LINE = 84, STOP_GAP = STOP_LINE + CAR_LEN / 2 - 6, stopGap = v => STOP_LINE + (STAGE.cityLife ? 14 : 0) + (v.len || CAR_LEN) / 2 - 6;  // 자유 모드: 제동 여유만큼 정지선을 14px 앞당겨 앞머리가 횡단보도(70px)에 걸리지 않게
function trafficStopDistance(v){
 if(v.chase||v.flee||onDeckLevel(v))return null;  // 고가 위는 신호가 없다 · 달아나는 차는 신호를 무시한다
 const locks=S.trafficJunctions||(S.trafficJunctions={}),hor=v.d%2===0,sgn=DV[v.d][0]+DV[v.d][1],VGr=vehGrid();
 // 내가 달리는 도로 줄(가로 차 = 그 y의 도로, 세로 차 = 그 x의 도로)에 걸친 교차로만 본다
 const RXs=STAGE.roadsX||[],RYs=STAGE.roadsY||[],lane=hor?RYs.find(ry=>v.y>ry*TILE&&v.y<(ry+4)*TILE):RXs.find(rx=>v.x>rx*TILE&&v.x<(rx+4)*TILE);if(lane==null)return null;
 const JC=S._jc&&S._jc.t===S.t&&S._jc.s===S?S._jc:(S._jc={t:S.t,s:S,m:new Map()});
 for(const other of hor?RXs:RYs){const rx=hor?other:lane,ry=hor?lane:other;
  const x0=rx*TILE,y0=ry*TILE,x1=x0+4*TILE,y1=y0+4*TILE,key=rx+','+ry;
  const aligned=true;
  const G=stopGap(v),entry=hor?(sgn>0?x0-G:x1+G):(sgn>0?y0-G:y1+G),left=(entry-(hor?v.x:v.y))*sgn;
  if(!aligned||left>230||left< -4*TILE-STOP_GAP-58){if(left< -4*TILE-STOP_GAP-58&&v.junctionWait)delete v.junctionWait[key];continue;}
  // 신호: 빨강이면 정지선(교차로 앞 횡단보도 앞)에서 선다. 황색은 정지선에 바짝 붙었으면 그대로 지나간다
  const inside=o=>o.x>x0-STOP_GAP+3&&o.x<x1+STOP_GAP-3&&o.y>y0-STOP_GAP+3&&o.y<y1+STOP_GAP-3;
  const sig=signalState(rx,ry),light=sig&&(hor?sig.ew:sig.ns);
  if(light&&!signalLets(light,v,x0,y0,x1,y1)){
   // 앞머리가 아직 교차로 상자에 들어가지 않았고 그 앞에서 설 수 있으면 선다 (긴 버스가 정지선을 넘어 횡단보도에 걸린 채 앞차를 따라가다 빨간불에 들어가던 것).
   // 황색에 정지선 바로 앞을 달리던 차는 그대로 지나간다. 서게 되면 잡아 둔 교차로도 내려놓는다
   const sp=Math.abs(v.v),noseIn=-left-(STOP_LINE-6),yellowGo=light==='Y'&&left<45&&sp>60;
   if(!yellowGo&&(left>-40||noseIn+sp*sp/(2*CAR_BRAKE)<8)){if(locks[key]===v.id)delete locks[key];return Math.max(0,left);}
  }  // 좌회전 차는 화살표를, 직진 차는 초록을 기다린다  // 정지선을 조금 넘겨 선 차도 빨간불엔 그대로 기다린다
  const distance=o=>{const h=o.d%2===0,s=DV[o.d][0]+DV[o.d][1];if(!(h?o.y>y0&&o.y<y1:o.x>x0&&o.x<x1))return Infinity;const g=stopGap(o);return ((h?(s>0?x0-g:x1+g):(s>0?y0-g:y1+g))-(h?o.x:o.y))*s;};
  // 이 교차로로 들어오는 차 줄: 교차로 둘레 칸의 차만 보고, 한 프레임에 한 번만 정렬한다
  let jc=JC.m.get(key);if(!jc){const near=vehiclesIn(x0-STOP_GAP-260,y0-STOP_GAP-260,x1+STOP_GAP+260,y1+STOP_GAP+260);
   const incoming=near.filter(o=>o.ai&&!o.dead&&!o.parked&&!onDeckLevel(o)&&distance(o)>=-6&&distance(o)<230);
   for(const o of incoming){const waits=o.junctionWait||(o.junctionWait={});waits[key]??=S.t;}
   incoming.sort((a,b)=>a.junctionWait[key]-b.junctionWait[key]||distance(a)-distance(b)||a.id-b.id);JC.m.set(key,jc={incoming,near});}
  const incoming=jc.incoming;
  let owner=VGr.byId.get(locks[key]);
  if(owner&&(owner.dead||owner.crashed||(!inside(owner)&&dist(owner.x,owner.y,(x0+x1)/2,(y0+y1)/2)>300))){delete locks[key];owner=null;}  // 부서진 차는 교차로를 잡지 않는다
  // A car behind the queue cannot reserve the junction ahead of its own lead.
  if(owner&&!inside(owner)){const lead=incoming.find(o=>o.d===owner.d&&distance(o)<distance(owner)-3);if(lead)owner=lead;}
  if(!owner)owner=jc.near.find(o=>o!==v&&!o.parked&&!o.dead&&!o.crashed&&!onDeckLevel(o)&&inside(o))||incoming[0]||v;
  locks[key]=owner.id;
  if(locks[key]===v.id||inside(v))return null;
  return Math.max(0,left);
 }
 return null;
}
// Three overlapping circles cover the complete chassis, including its middle.
const carPts = v => { const hl = v.hl ?? 25, ca = Math.cos(v.a), sa = Math.sin(v.a), r = v.r || CAR_R;
  if (hl <= r * 1.6) return [[v.x + ca * hl, v.y + sa * hl], [v.x, v.y], [v.x - ca * hl, v.y - sa * hl]];
  return [-1, -.5, 0, .5, 1].map(t => [v.x + ca * hl * t, v.y + sa * hl * t]); };  // 버스·리무진처럼 긴 차는 원 다섯
// 차가 벽·건물·다른 차와 겹치나 (겹친 상대 차를 돌려준다: 없으면 true/false)
function carOverlap(v) {
  const R = v.r || CAR_R;
  if (deckBlocked(v)) return true;
  if (STAGE.cityLife && rubbleBlocks(v)) return true;  // 무너진 고가·건물 잔해
  for (const [px, py] of carPts(v)) {
    if ((v.z || 0) > 0.15) break;  // 고가 위·떨어지는 중: 땅의 벽·건물은 아래에 있다
    const tx0 = Math.floor((px - R) / TILE), tx1 = Math.floor((px + R) / TILE), ty0 = Math.floor((py - R) / TILE), ty1 = Math.floor((py + R) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { if (v.ai&&!inMap(tx,ty)||!carBlocked(tx, ty)) continue;
      const nx = clamp(px, tx * TILE, tx * TILE + TILE), ny = clamp(py, ty * TILE, ty * TILE + TILE); if (dist(px, py, nx, ny) < R) return true; }
  }
  for (const o of vehiclesIn(v.x - 220, v.y - 220, v.x + 220, v.y + 220)) { if (o === v || Math.abs(o.x - v.x) > 220 || Math.abs(o.y - v.y) > 220 || Math.abs((o.z || 0) - (v.z || 0)) > 0.5 || dist(o.x, o.y, v.x, v.y) > (v.hl ?? 25) + (o.hl ?? 25) + R + (o.r || CAR_R) + 8) continue;
    const RR = R + (o.r || CAR_R); for (const [px, py] of carPts(v)) for (const [qx, qy] of carPts(o)) if (dist(px, py, qx, qy) < RR) return o; }
  return false;
}
// 움직이고, 벽·건물·다른 차에 부딪히면 튕겨 선다. 부딪힌 세기를 돌려준다
function missionBoundaryHint(){
 if((S.boundaryHintAfter??-1)>S.t)return;
 S.boundaryHintAfter=S.t+6;
 toast(S.exitOpen?'탈출구는 이쪽이 아니야. 표시된 출구로 가자.':'아직 할 일이 남았어. 임무부터 마무리하자.',2.8);
}
function carMove(v, dt, turn=0) { const hit = carMove0(v, dt, turn); deckStep(v, dt); return hit; }
function carMove0(v, dt, turn=0) {
  const steps=Math.max(1,Math.ceil(Math.abs(v.v*dt)/5),Math.ceil(Math.abs(turn)/.04));
  for(let i=0;i<steps;i++){
   const ox=v.x,oy=v.y,oa=v.a;v.a+=turn/steps;const ma=v.va??v.a;v.x+=Math.cos(ma)*v.v*dt/steps;v.y+=Math.sin(ma)*v.v*dt/steps;  // 미끄러질 때는 차머리와 다른 쪽으로 간다
   // The edge of the mission is a travel restriction, never a damaging wall.
   if(!v.ai&&carPts(v).some(([x,y])=>x<v.r||y<v.r||x>MW*TILE-v.r||y>MH*TILE-v.r)){
    v.x=ox;v.y=oy;v.a=oa;v.v=0;if(S.player.car===v)missionBoundaryHint();return 0;
   }
   let o=carOverlap(v);
   // 내 차가 벽을 비스듬히 받으면 멈추지 않고 벽을 따라 미끄러진다 (운전 보조): x만, y만 가 보고 되는 쪽으로
   if(o===true&&!v.ai&&STAGE.cityLife&&S.player.car===v){const nx=v.x,ny=v.y;for(const [tx,ty] of [[nx,oy],[ox,ny]]){v.x=tx;v.y=ty;if(!carOverlap(v)){const along=Math.hypot(tx-ox,ty-oy)/Math.max(.001,Math.hypot(nx-ox,ny-oy));if(along>.35){v.v*=1-(1-along)*.5;const wa=Math.atan2(ty-oy,tx-ox)+(v.v<0?Math.PI:0),pa=v.a;v.a+=angDiff(v.a,wa)*.12;if(carOverlap(v))v.a=pa;if(v.va!=null)v.va=v.a;o=null;break;}}}if(o){v.x=nx;v.y=ny;}}
   if(!o)continue;
   if(o!==true&&STAGE.cityLife&&S.player.car===v&&carPush(v,o,ox,oy))continue;  // 천천히 받은 채로 계속 밀면 그 차를 밀고 간다
   const speed=Math.abs(v.v),hit=o===true?speed:Math.max(0,(v.v*Math.cos(v.a)-(o.v||0)*Math.cos(o.a))*(o.x-v.x)/Math.max(1,dist(v.x,v.y,o.x,o.y))+(v.v*Math.sin(v.a)-(o.v||0)*Math.sin(o.a))*(o.y-v.y)/Math.max(1,dist(v.x,v.y,o.x,o.y)));
   v.x=ox;v.y=oy;v.a=oa;v.v=v.ai?0:-v.v*.2;if(v.va!=null)v.va=v.a;
   if(o!==true){o.v=0;o.stopT=0;v.crashUntil=o.crashUntil=S.t+.8;if(STAGE.cityLife){if(v.panicT>S.t||o.panicT>S.t)pileHit(v,o);else if(S.player.car===v&&o.ai&&speed>200)pileupBehind(o);}}
   if(hit>60&&(v.impactAfter||0)<=S.t){
    v.impactAfter=S.t+.65;if(o!==true)o.impactAfter=S.t+.65;
    const x=o===true?v.x+Math.cos(v.a)*40:(v.x+o.x)/2,y=o===true?v.y+Math.sin(v.a)*40:(v.y+o.y)/2;
    S.carImpact={x,y,t:S.t,hit};
    spawnEffect('impact',{x,y,fl:0,z:0},{scale:.55,alpha:.8});
    const near=clamp(1-dist(x,y,S.player.x,S.player.y)/600,0,1);
    if(near){crashSound(hit,near);if(hit>140)S.shakeT=Math.max(S.shakeT||0,.08*near);}
    // 무거운 차와 부딪히면 가벼운 차가 더 크게 망가진다 (버스·트럭에 받히면 승용차는 두세 칸)
    if(hit>(STAGE.cityLife?(v.panicT>S.t||(o!==true&&o.panicT>S.t)?110:230):175)){const mv=vType(v).mass,mo=o===true?3:vType(o).mass;v.hp-=Math.max(1,Math.round(mo/mv));v.smoke=1.5;if(o!==true){o.hp-=Math.max(1,Math.round(mv/mo));o.smoke=1.5;}const wreck=STAGE.cityLife?carExplode:carWreck;if(v.hp<=0)wreck(v);if(o!==true&&o.hp<=0)wreck(o);}
   }
   return speed;
  }
  return 0;
}
// 밀기: 내 차가 다른 차에 천천히(상대 속도 140 이하) 닿은 채 계속 가면, 그 차를 같은 만큼 민다.
// 무거운 차일수록 느리게 밀린다(내 속도 상한 = 150 × 내 무게 / 상대 무게). 비스듬히 밀면 상대 차가 조금 돈다. 벽에 막히면 못 민다
function carPush(v, o, ox, oy) {
  const dx = v.x - ox, dy = v.y - oy, step = Math.hypot(dx, dy), still = o.pushBy === v && S.t - (o.pushedT || -9) < 0.3;  // 이미 밀고 있으면 가속해도 충돌로 바뀌지 않는다
  if (step < 1e-4 || (!still && Math.abs(v.v) > 140 + Math.abs(o.v || 0))) return false;
  const d = Math.max(1, dist(v.x, v.y, o.x, o.y)); if ((dx * (o.x - v.x) + dy * (o.y - v.y)) / d / step < 0.2) return false;  // 그 차 쪽으로 가는 중이어야 민다
  const px = o.x, py = o.y, pa = o.a, pva = o.va, side = -(o.x - v.x) * Math.sin(v.a) + (o.y - v.y) * Math.cos(v.a);
  const put = (rot) => { o.x = px + dx; o.y = py + dy; o.a = pa + rot; if (pva != null) o.va = o.a; return !carOverlap(o); };
  if (!put(clamp(side * 0.0006 * Math.sign(v.v), -0.02, 0.02)) && !put(0)) { o.x = px; o.y = py; o.a = pa; o.va = pva; return false; }  // 벽·다른 차에 막히면 못 민다
  const mv = vType(v).mass, mo = vType(o).mass, cap = 150 * mv / mo; if (Math.abs(v.v) > cap) v.v = Math.sign(v.v) * cap;
  o.v = 0; o.stopT = 0; o.crashUntil = S.t + 1.2; o.pushedT = S.t; o.pushBy = v;
  if (S.t > (v.pushSnd || 0)) { v.pushSnd = S.t + 0.35; play('metal', 0.18, 0.5); }
  return true;
}
// 차가 사람을 친다: 빠르면 처치, 느리면 넘어뜨린다 (기절). 내가 몰면 내 짓이다
function hitPeople(v, dt) {
  const spd = Math.abs(v.v); if (spd < 70 || onDeckLevel(v)) return;  // 고가 위 차는 땅 사람을 치지 않는다
  const mine = S.player.car === v, pts = carPts(v), reach = (v.len || 92) / 2 + v.r + 14;  // 차 둘레 상자 밖 사람은 바로 건너뛴다 (차 160대 × 사람 470명)
  for (const g of S.guards) {
    if (Math.abs(g.x - v.x) > reach || Math.abs(g.y - v.y) > reach) continue;
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) || g.z || g.off) continue;
    if (!pts.some(([px, py]) => dist(px, py, g.x, g.y) < v.r + 12)) continue;
    const lethal = STAGE.cityLife ? spd > 100 : spd > 170;  // 큰 도시: 제법 달리던 차에 치이면 죽는다
    if (mine) { if (!STAGE.cityLife) { play('thud', 0.8); S.shakeT = 0.2; } S.stats.runOver = (S.stats.runOver || 0) + 1; npcDown(g, null, lethal); const c = S.corpses[S.corpses.length - 1]; if (c && c.g === g) { c.byNpc = false; c.byCar = true; }
      if (STAGE.cityLife) carImpact(v, g, lethal);
      if (STAGE.cityLife && typeof carHitReport === 'function') carHitReport(g, lethal); else if (g.police) addWanted(2, '경찰을 차로 쳤다'); else addWanted(1, g.civ ? '사람을 차로 쳤다' : '조직원을 차로 쳤다'); v.v *= 0.8; }
    else if (v.chase) { g.downNpc = true; npcDown(g, null, STAGE.cityLife && lethal); if (STAGE.cityLife) carImpact(v, g, lethal); v.v *= 0.7; }  // 추격 차에 치인 행인
    else if (v.ai) { v.v = 0; }  // 다른 차는 사람 앞에서 선다 (그래도 닿았으면 멈춤)
  }
  // 내가 걷다가 달려오는 차에 치임
  const P = S.player;
  if (!mine && !(v.coastT > S.t) && !P.car && !P.cuffed && !P.z && !flOf(P) && !P.hide && spd > 120 && pts.some(([px, py]) => dist(px, py, P.x, P.y) < v.r + 10)) { if (STAGE.cityLife) { spawnEffect('impact', { x: P.x, y: P.y - 16, fl: 0, z: 0 }, { scale: 1.1 }); bloodSpray(P.x, P.y, v.a, spd > 220 ? 6 : 3); S.shakeT = 0.35; if (spd > 220) { P.hurtT = 0; hurtPlayer(null, '차에 치였다.'); } }  // 세게 치이면 두 칸
    hurtPlayer(null, '차에 치였다.'); P.x += Math.cos(v.a + Math.PI / 2) * 30; P.y += Math.sin(v.a + Math.PI / 2) * 30; v.v = 0; }
}
// 내가 운전: 조이스틱(방향키) 쪽으로 차머리를 돌리며 가속. 거의 반대쪽이면 브레이크 → 후진
function updateDriving(P, mx, my, mag, dt) {
  const v = P.car; P.moving = false; P.mode = 'walk'; P.vx = 0; P.vy = 0; P.z = 0; P.fl = 0;
  if (v.jacking) { P.x = v.x; P.y = v.y; return; }  // 차고에 들어가는 중 등 스크립트로 움직이는 차
  if (STAGE.cityLife && carOverlap(v) === true) unstickCar(v);  // 벽에 낀 채면 가장 가까운 빈자리로 빼낸다 (앞뒤로 못 움직이는 일 없게)
  if (v.dead) { carExit(STAGE.cityLife ? true : 'instant'); return; }
  if (v.revT > 0 && (v.revT -= dt) <= 0) v.revT = 0;
  // 운전은 차 기준: 위 = 가속(전진) · 아래 = 브레이크 후 후진 · 좌우 = 핸들. 화면 방향으로 걷듯이 몰지 않는다
  let fwd = mag > 0.15 ? -my : 0, steer = mag > 0.15 ? mx : 0;
  // 휴대폰: 걷기와 똑같이 끄는 쪽(화면 방향)으로 간다. 차머리를 그쪽으로 돌리며 가속하고,
  // 거의 반대쪽으로 끌면 서서히 서서 후진한다(차 꽁무니를 그쪽으로)
  if (isTouch && STAGE.cityLife && mag > 0.15) {
    const ta = Math.atan2(my, mx), d = angDiff(v.a, ta), k = Math.min(1, mag);
    if (v.rev ? Math.abs(d) > 1.4 : (Math.abs(d) > 2.5 && v.v < 80)) {
      v.rev = true; const dr = angDiff(v.a + Math.PI, ta); fwd = -k; steer = clamp(-dr * 2.2, -1, 1);
    } else { v.rev = false; fwd = Math.abs(d) > 1.9 ? 0.25 * k : k; steer = clamp(d * 2.2, -1, 1); }
  } else if (isTouch && mag <= 0.15) v.rev = false;
  const T = vType(v);
  const BRK = CAR_BRAKE * (1 - 0.3 * rainK());  // 젖은 길: 브레이크가 덜 듣는다
  if (fwd > 0.2) v.v = v.v < -4 ? Math.min(0, v.v + BRK * dt) : Math.min(T.max, v.v + T.acc * Math.min(1, fwd) * dt);
  else if (fwd < -0.2) v.v = v.v > 4 ? Math.max(0, v.v - BRK * dt) : Math.max(-150, v.v - T.acc * 0.8 * Math.min(1, -fwd) * dt);
  else { const f = CAR_FRIC * dt; v.v = Math.abs(v.v) <= f ? 0 : v.v - Math.sign(v.v) * f; }
  // 핸들은 바퀴가 굴러야 돈다. 후진 중에는 실제 차처럼 반대로 돈다
  // 핸들은 바퀴가 굴러야 돈다(자유 모드는 느려도 잘 돈다). 후진 중에는 실제 차처럼 반대로 돈다
  const roll = STAGE.cityLife ? clamp(v.v / 45, -1, 1) : clamp(v.v / 90, -1, 1);
  if (Math.abs(steer) > 0.15) { const a0 = v.a; v.a += clamp(steer, -1, 1) * T.turn * roll * dt; if (carOverlap(v)) v.a = a0; }
  else if (STAGE.cityLife && Math.abs(v.v) > 40 && (!isTouch || mag <= 0.15)) {  // 운전 보조: 핸들을 놓으면 가까운 도로 방향(가로·세로)으로 차머리를 바로잡는다
    const q = Math.round(v.a / (Math.PI / 2)) * (Math.PI / 2), d = angDiff(v.a, q);
    if (Math.abs(d) < 0.35) { const a0 = v.a; v.a += d * Math.min(1, 4 * dt); if (carOverlap(v)) v.a = a0; } }
  carDrift(v, steer, fwd, dt);
  carMove(v, dt);
  hitPeople(v, dt);
  P.x = v.x; P.y = v.y; P.a = v.a; P.light = lightAt(P.x, P.y, false);
  if (Math.abs(v.v) > 60 && (v.engT = (v.engT || 0) - dt) <= 0) { v.engT = 0.5; noise(v.x, v.y, 160, 'car', 0); }
}
function unstickCar(v) {
  const x0 = v.x, y0 = v.y, a0 = v.a;
  for (let r = 6; r <= 96; r += 6) for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; v.x = x0 + Math.cos(a) * r; v.y = y0 + Math.sin(a) * r; if (carOverlap(v) !== true) { v.va = v.a; return true; } }
  for (const da of [Math.PI / 2, -Math.PI / 2]) { v.x = x0; v.y = y0; v.a = a0 + da; if (carOverlap(v) !== true) { v.va = v.a; return true; } }  // 옆으로 돌려 세우면 빠지는 자리
  v.x = x0; v.y = y0; v.a = a0; return false;
}
function carWreck(v) {
  v.dead = true; v.v = 0; v.burn = 6; play('glass', 0.8); play('thud', 0.9); S.shakeT = 0.4; noise(v.x, v.y, 420, 'car', 0);
  if (S.player.car === v && !STAGE.cityLife) { carExit('instant'); hurtPlayer(null, '차가 부서졌다.'); if (!STAGE.noPrompts) toast('차가 부서졌다', 2, 'warn'); }
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
  after(tWalk, () => { play('switch', 0.5); v.doorT = S.t + 0.3; v.doorSide = -1; });  // 문 여는 소리 · 운전석 문이 열렸다 닫힌다
  if (jack) after(tWalk + 0.12, () => {  // 운전자를 끌어내 길바닥에 밀쳐 낸다 → 일어나 달아난다
    P.strikeT = 0.3; play('cloth', 0.6); play('thud', 0.4);
    const gi = cityGuardSlot(), g = makeGuard({ kind: 'civ', at: [Math.floor(v.x / TILE), Math.floor(v.y / TILE)] }, gi);
    g.x = v.x; g.y = v.y; g.a = side; g.route = [{ x: out.x, y: out.y, pause: 999 }]; g.driverOut = true; g.state = 'PATROL'; g.meter = 1; placeGuard(g, gi);
    if (PR) prWarm([charOf(g)], true);
    let k = 0; const slide = () => { k++; g.x = v.x + (out.x - v.x) * k / 4; g.y = v.y + (out.y - v.y) * k / 4; if (k < 4) after(0.06, slide); else { civPanic(g, v.x, v.y, 8); (typeof saysLine === 'function' ? saysLine(g, 'civ', 'carjack', 1.6) : gsay(g, '내 차!', 1.6)); } };
    slide();
    if (witnessed(P.x, P.y, 380)) addWanted(1, '차를 빼앗는 걸 사람들이 봤다');
    v.driver = false;
  });
  P.trav.end = () => { v.jacking = false; v.unlocked = true; if (STAGE.cityLife && !v.bought && !v.stolen) { v.stolen = true; fstat('carsStolen'); } P.car = v; P.x = v.x; P.y = v.y; play('switch', 0.4); play('click', 0.3);
    hint('drive', isTouch ? (STAGE.cityLife ? '운전: 걸을 때처럼 가고 싶은 쪽으로 끌면 차가 그쪽으로 간다. 반대로 끌면 후진. [행동]으로 내리기' : '운전: 화면 왼쪽을 위로 끌면 가속, 아래로 끌면 제동·후진, 좌우로 핸들. [행동]으로 내리기') : '운전: ↑ 가속 · ↓ 제동·후진 · ←→ 핸들. ' + KK('env') + ' = 내리기, ' + KK('atk') + ' = 경적'); };
}
function carExit(force) {
  const P = S.player, v = P.car; if (!v) return;
  if ((v.z || 0) > 0.05 && !force && !(v.fireT > 0)) return;  // 고가 위에서는 내리지 않는다 (불붙었으면 어디서든 뛰어내린다)
  v.va = null; v.skidding = false; v.skidPrev = null;
  const out = (v.r || CAR_R) + 31, spots = [v.a - Math.PI / 2, v.a + Math.PI / 2, v.a + Math.PI, v.a].map(a => ({ a, x: v.x + Math.cos(a) * out, y: v.y + Math.sin(a) * out }));
  const ok = spots.find(p => !solidAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) && !S.vehicles.some(o => o !== v && dist(o.x, o.y, p.x, p.y) < 50)) || spots[0];
  const spd = Math.abs(v.v), jump = STAGE.cityLife ? spd >= 60 : spd >= 150, fast = jump, hard = STAGE.cityLife ? spd >= 240 : true;
  P.car = null; P.vx = 0; P.vy = 0;
  if (!jump) v.v = 0; else v.coastT = S.t + 3; play('switch', 0.4);  // 달리다 뛰어내리면 차는 혼자 굴러가다 선다(3초 동안 천천히)
  v.parked = true;
  if (!STAGE.cityLife || force === 'instant') { P.x = ok.x; P.y = ok.y; collide(P, 13, groundSolidP); return; }
  // 문을 열고 → 운전석에서 몸을 빼 → 차 옆으로 걸어 나온다. 달리다 뛰어내리면 굴러 떨어진다
  const door = { x: v.x + Math.cos(ok.a) * ((v.r || CAR_R) + 6), y: v.y + Math.sin(ok.a) * ((v.r || CAR_R) + 6) }, dur = fast ? 0.6 : 0.55;
  if (fast) {  // 뛰어내리면 차가 가던 쪽으로 몸이 쏠려 구른다 (속도만큼 더 멀리, 벽이면 짧게)
    const mv = (v.v >= 0 ? 1 : -1) * Math.min(110, spd * 0.28); for (let k = 1; k >= 0; k -= 0.25) { const x = ok.x + Math.cos(v.a) * mv * k, y = ok.y + Math.sin(v.a) * mv * k; if (!solidAt(Math.floor(x / TILE), Math.floor(y / TILE))) { ok.x = x; ok.y = y; break; } } }
  P.x = v.x; P.y = v.y; v.doorT = S.t + 0.18; v.doorSide = ok.a === v.a - Math.PI / 2 ? -1 : 1;
  startTrav({ pts: [{ x: v.x, y: v.y, f: 0 }, { x: door.x, y: door.y, f: 0.45 }, { x: ok.x, y: ok.y, f: 1 }], dur, phases: fast ? [{ to: 0.4, pose: 'walk' }, { to: 1, pose: 'roll' }] : [{ to: 1, pose: 'walk' }], face: ok.a });
  P.trav.end = () => { collide(P, 13, groundSolidP); if (fast) { play('thud', 0.6); S.shakeT = Math.max(S.shakeT || 0, hard ? 0.15 : 0.07); spawnEffect('dust', { x: P.x, y: P.y, fl: 0, z: 0 }, { scale: 1.2 }); if (hard && !P.hurtT) { P.hurtT = 0; hurtPlayer(null, '달리는 차에서 뛰어내렸다.'); } } };
}
// 경찰차 표시: 지붕 경광등이 빨강·파랑으로 번갈아 번쩍이고(쫓을 때 · 서 있을 때도 약하게), 지붕에 '경찰' 글씨.
// 차 좌표(차머리가 위)에서 그린다. 경광등 자리는 그림에서 잰 값(차 길이의 앞에서 32%)
// 경찰차 그림(48방향)마다 잰 지붕 경광등의 빨강·파랑 불 자리 (차 중심에서 화면 기준 px) — tools 없이 그림에서 잰 값
const POLICE_LB = [[-4,-25,-4,-13],[-3,-25,-4,-13],[-2,-26,-5,-13],[0,-26,-6,-14],[2,-25,-7,-15],[3,-24,-8,-16],[4,-24,-9,-17],[6,-23,-9,-18],[6,-22,-9,-19],[7,-22,-9,-19],[7,-21,-9,-20],[8,-21,-9,-20],[8,-20,-8,-20],[8,-20,-8,-21],[8,-19,-7,-21],[8,-19,-8,-22],[8,-18,-7,-23],[7,-18,-7,-23],[7,-17,-6,-24],[6,-17,-5,-24],[6,-16,-4,-25],[6,-15,-3,-25],[5,-14,-1,-26],[4,-13,1,-26],[3,-13,3,-25],[1,-13,4,-25],[0,-13,6,-24],[-1,-13,7,-23],[-2,-13,8,-22],[-3,-14,8,-21],[-5,-14,8,-20],[-6,-14,8,-19],[-6,-14,9,-19],[-7,-15,9,-17],[-8,-15,8,-17],[-8,-16,8,-17],[-9,-16,8,-16],[-9,-17,8,-15],[-9,-17,7,-15],[-9,-18,7,-15],[-10,-18,6,-14],[-9,-19,5,-14],[-9,-20,4,-13],[-9,-21,3,-13],[-8,-22,1,-12],[-7,-24,-1,-13],[-5,-25,-2,-13],[-4,-25,-3,-13]];
function drawPoliceLights(v) {
  // 차 그림은 방향마다 3/4로 찍힌 그림이라 차와 함께 돌리지 않는다: 그 방향 그림의 경광등 자리에 빛을 얹는다
  const on = v.chase || v.siren || (S.wanted > 0 && v.ai), ph = Math.floor(S.t * (on ? 8 : 2) + v.id) % 2, k = on ? 1 : 0.4;
  const L = POLICE_LB[Math.round(((v.a % TAU + TAU) % TAU) / TAU * 48) % 48];
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, col, lit] of [[v.x + L[0], v.y + L[1], '255,40,40', !ph], [v.x + L[2], v.y + L[3], '60,110,255', !!ph]]) { const a = (lit ? 0.95 : 0.15) * k;
    ctx.fillStyle = `rgba(${col},${a})`; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fill();
    if (lit && on) { const g = ctx.createRadialGradient(x, y, 0, x, y, 80); g.addColorStop(0, `rgba(${col},.4)`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 80, 0, TAU); ctx.fill(); } }
  ctx.restore();
}
function honk() { const v = S.player.car; if (!v || (v.honkT || 0) > S.t) return; v.honkT = S.t + 0.6; play('metal', 0.5, 2.4); noise(v.x, v.y, 240, 'car', 0);
  for (const g of S.guards) if (g.civ && g.state !== 'DEAD' && !g.child && dist(g.x, g.y, v.x, v.y) < 140 && (g.state === 'PATROL' || g.state === 'RETURN')) { g.want = Math.atan2(g.y - v.y, g.x - v.x); setIcon(g, '!'); } }
// 차 그리기: 위에서 본 차 그림을 차머리 쪽으로 돌려서 (그림은 위쪽이 차머리)
function drawVehicles() {
  if (!S.vehicles) return;
  const vx0 = cam.x - W / SCALE / 2 - 120, vx1 = cam.x + W / SCALE / 2 + 120, vy0 = cam.y - H / SCALE / 2 - 120, vy1 = cam.y + H / SCALE / 2 + 120;
  if (STAGE.cityLife) { drawSkids(); drawCarScorch(); drawGlassBits(); drawRubble(); }
  if (S.decks?.length) drawDeckShadows();
  for (const v of S.vehicles) {
    if (v.x < vx0 || v.x > vx1 || v.y < vy0 || v.y > vy1 || (v.z || 0) > 0.01) continue;  // 고가 위 차는 drawDecks에서
    drawOneVehicle(v);
  }
}
function drawOneVehicle(v) {
    ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.a + Math.PI / 2);
    drawCarBody(v);
    if (STAGE.cityLife) drawCarTheft(v);
    // 문: 타고 내릴 때 앞 기둥을 축으로 바깥으로 열렸다가 닫힌다
    if (v.doorT && Math.abs(S.t - v.doorT) < 0.4) { const open = 1 - Math.abs(S.t - v.doorT) / 0.4, sd = v.doorSide || -1, hw = (v.r || 21) + 1;
      ctx.save(); ctx.translate(sd * hw, -16); ctx.rotate(-sd * open * 1.1); ctx.fillStyle = 'rgba(20,24,30,.95)'; ctx.fillRect(-2.5, 0, 5, 30); ctx.fillStyle = 'rgba(150,190,220,.6)'; ctx.fillRect(-1.5, 3, 3, 12); ctx.restore(); }
    // 전조등 (밤): 달리는 차는 앞을 비춘다
    if (!v.dead && (v.ai || S.player.car === v)) { const g = ctx.createLinearGradient(0, -46, 0, -150); g.addColorStop(0, 'rgba(255,240,200,.32)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-16, -46); ctx.lineTo(-40, -150); ctx.lineTo(40, -150); ctx.lineTo(16, -46); ctx.fill();
      if(!cityVehicleAtlas.complete||!cityVehicleAtlas.naturalWidth){ctx.fillStyle = 'rgba(255,60,50,.9)'; ctx.fillRect(-17, 44, 7, 3); ctx.fillRect(10, 44, 7, 3);} }
    ctx.restore();
    if (v.type === 'police' && !v.dead && STAGE.cityLife) drawPoliceLights(v);
    if (!STAGE.cityLife && v.dead && v.burn > 0) { ctx.fillStyle = `rgba(255,${120 + Math.random() * 80 | 0},40,${0.5 * v.burn / 6})`; ctx.beginPath(); ctx.arc(v.x + rnd(-6, 6), v.y + rnd(-10, 10), 14 + Math.random() * 10, 0, TAU); ctx.fill(); }
    if (!STAGE.cityLife && (v.smoke > 0 || (v.hp <= 2 && !v.dead))) { ctx.fillStyle = 'rgba(160,160,170,.35)'; ctx.beginPath(); ctx.arc(v.x + Math.cos(v.a) * 30 + Math.sin(S.t * 7) * 4, v.y + Math.sin(v.a) * 30 - 10, 10, 0, TAU); ctx.fill(); }
}
// 도로 칠: 가운데 노란 겹선, 교차로 앞 정지선과 횡단보도 (지도 그림에 한 번 굽는다)
function drawRoadMarks(x, R) {
  // R: 이 칸 범위만 (큰 지도 조각). 없으면 전체
  const T = TILE, X0 = R ? R.x0 * T : 0, X1 = R ? (R.x1 + 1) * T : MW * T, Y0 = R ? R.y0 * T : 0, Y1 = R ? (R.y1 + 1) * T : MH * T, M = 4 * T;
  const RX = STAGE.roadsX.filter(r => (r + 4) * T >= X0 - M && r * T <= X1 + M), RY = STAGE.roadsY.filter(r => (r + 4) * T >= Y0 - M && r * T <= Y1 + M), ALLX = STAGE.roadsX, ALLY = STAGE.roadsY, inX = px => ALLX.some(r => px >= r * T && px < (r + 4) * T), inY = py => ALLY.some(r => py >= r * T && py < (r + 4) * T);
  x.save();
  for (const r of RY) { const cy = (r + 2) * T; for (let px = Math.max(0, X0 - X0 % 8); px < Math.min(MW * T, X1); px += 8) { if (inX(px)) continue; x.fillStyle = '#d8b440'; x.fillRect(px, cy - 4, 8, 2); x.fillRect(px, cy + 2, 8, 2); } }
  for (const r of RX) { const cx = (r + 2) * T; for (let py = Math.max(0, Y0 - Y0 % 8); py < Math.min(MH * T, Y1); py += 8) { if (inY(py)) continue; x.fillStyle = '#d8b440'; x.fillRect(cx - 4, py, 2, 8); x.fillRect(cx + 2, py, 2, 8); } }
  // 횡단보도: 교차로 네 변 바로 바깥
  x.fillStyle = 'rgba(225,228,236,.55)';
  for (const rx of RX) for (const ry of RY) {
    const x0 = rx * T, y0 = ry * T, x1 = (rx + 4) * T, y1 = (ry + 4) * T;
    const W2 = XWALK - 6, L = STOP_LINE;
    for (let k = 0; k < 4 * T; k += 16) { if (y0 - L > 0) x.fillRect(x0 + k + 3, y0 - XWALK, 9, W2); if (y1 + L < MH * T) x.fillRect(x0 + k + 3, y1 + 6, 9, W2); if (x0 - L > 0) x.fillRect(x0 - XWALK, y0 + k + 3, W2, 9); if (x1 + L < MW * T) x.fillRect(x1 + 6, y0 + k + 3, W2, 9); }
    // 정지선: 다가오는 차로(오른쪽 통행) 쪽에만 굵은 흰 선
    x.fillStyle = 'rgba(235,236,240,.8)';
    if (x0 - L > 0) x.fillRect(x0 - L, y0 + 2 * T, 6, 2 * T); if (x1 + L < MW * T) x.fillRect(x1 + L - 6, y0, 6, 2 * T);
    if (y0 - L > 0) x.fillRect(x0, y0 - L, 2 * T, 6); if (y1 + L < MH * T) x.fillRect(x0 + 2 * T, y1 + L - 6, 2 * T, 6);
    x.fillStyle = 'rgba(225,228,236,.55)';
  }
  x.restore();
}
// 위에서 내려다본 차 (차머리 = 위쪽): 차체 · 앞유리 · 지붕 · 뒷유리 · 전조등 · 미등
const CAR_COL = ['#d8d6d0', '#8e939c', '#3a404c', '#b8322c', '#2e4f86', '#d9a43a', '#3d6b4a'];
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function drawCarBody(v) {
  if(drawAssetCar(v))return;
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
  const now = AC.currentTime, sp = on ? Math.abs(v.v) / vType(v).max : 0;
  ENG.g.gain.setTargetAtTime(on ? 0.045 + sp * 0.05 : 0, now, 0.12); ENG.o.frequency.setTargetAtTime(38 + sp * 95, now, 0.1); ENG.o2.frequency.setTargetAtTime(19 + sp * 48, now, 0.1);
}
