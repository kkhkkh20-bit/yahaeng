// ---------------------------------------------------------------- 자유 모드 차량 폭탄 의뢰 ('carbomb')
// 표적의 차가 그 블록 길가에 서 있다(미니맵 주황 네모). 까마귀가 폭약 하나를 준다.
// 100초 뒤 표적은 차로 걸어가 타고 떠난다. 그 전에 차 옆에서 [표적의 차에 폭약 설치](1.6초, 쪼그려 앉아).
//   · 폭약을 심었으면 표적이 타는 순간 터진다 — '사고'(폭발) 처리 ×1.6.
//   · 못 심었으면 표적이 차를 몰고 떠난다. 쫓아가 차를 터뜨려도(총·수류탄) 된다. 다른 방법으로 끝내면 ×0.6.
const CB_LEAVE = 100, CB_PLANT = 1.6;
function carbombStart(h, plan) {
  // 그 블록 둘레의 주차된 차(길가·골목 주차 칸) 중 하나가 표적의 차: 차로 한가운데에 세우면 지나가는 차에 받힌다
  const P = S.player, cx = plan.cx, cy = plan.cy;
  let v = null, bd = 1e9;
  for (const o of S.vehicles) { if (o.dead || !o.parked || o.police || o.forSale != null || o === P.car || o.hitCar || o.evt || o.bought) continue; const d = dist(o.x, o.y, cx, cy); if (d < bd && d < 1800) { bd = d; v = o; } }
  if (!v) { const r = roadNear(cx, cy, 12); if (!r) return; v = makeVehicle({ type: 'sedan', x: r.x, y: r.y, a: 0, parked: true }); S.vehicles.push(v); }
  v.hitCar = true; v.locked = true;
  h.car = v; h.leaveAt = S.t + CB_LEAVE; P.bombs = (P.bombs || 0) + 1;
}
function carbombAction() {
  const h = S.hit, P = S.player; if (!h || !['carbomb', 'stage'].includes(h.ctr) || !h.car || h.car.dead || h.car.bombed || h.cbGone || P.car || P.trav) return null;
  if (h.ctr === 'stage' && !h.opp?.car?.known) return null;  // 무대형 의뢰: 엿들어서 그 차인 줄 알아야 심는다 (간판과 같은 규칙)
  if (dist(P.x, P.y, h.car.x, h.car.y) > 64) return null;
  if (!(P.bombs > 0)) return { k: 'evAct', label: '폭약이 없다 — 철물점·공구점', fn: () => evBanner('폭약이 없다 — 철물점이나 공구점에서 산다') };
  return { k: 'evAct', label: `${h.name}의 차에 폭약 설치`, fn: () => carbombPlant(h) };
}
function carbombPlant(h) {
  const P = S.player, v = h.car;
  doMotion({ x: v.x + Math.cos(v.a + Math.PI / 2) * 30, y: v.y + Math.sin(v.a + Math.PI / 2) * 30, pose: 'crouch', dur: CB_PLANT, face: Math.atan2(v.y - P.y, v.x - P.x),
    at: [[0.5, () => play('click', 0.4)], [1.2, () => play('switch', 0.4)]],
    end: () => { if (!S.hit || S.hit !== h || v.dead) return; P.bombs--; v.bombed = true; fstat('carBombs'); play('click', 0.6, 0.7);
      evBanner(`폭약 설치 — ${h.name}이(가) 차에 타면 터진다. 멀리 떨어져라`, '#ff8a6a'); if (witnessed(v.x, v.y, 300)) addWanted(1, '차 밑에 뭘 붙이는 걸 누가 봤다'); } });
}
function carbombUpdate() {
  const h = S.hit; if (!h || !['carbomb', 'stage'].includes(h.ctr) || !h.car) return; const g = h.g, v = h.car;
  if (v.dead) { if (h.cbIn && npcAlive(g)) carbombKill(h); return; }
  if (!npcAlive(g) || h.cbIn) return;
  if (!h.cbWalk && S.t >= h.leaveAt && ['PATROL', 'RETURN'].includes(g.state)) {
    h.cbWalk = true; g.route = [{ x: v.x, y: v.y, pause: 999 }]; g.ri = 0; g.wait = 0; g.path = null; gsay(g, '차 빼. 간다.', 2); evBanner(`${h.name}이(가) 차로 간다`, '#ffb070'); }
  if (h.cbWalk && dist(g.x, g.y, v.x, v.y) < 66) {  /* 차체에 막혀 46 안쪽까지는 못 온다 */
    h.cbIn = true; play('click', 0.5 * proxVol(g)); g.hiddenInCar = true; g.x = v.x; g.y = v.y; g.off = true; g.route = [{ x: v.x, y: v.y, pause: 999 }];
    if (v.bombed) { after(0.9, () => { if (!v.dead) carExplode(v); }); }
    else { v.parked = false; v.driver = true; v.ai = true; v.locked = false; evBanner(`${h.name}이(가) 차를 몰고 떠난다 — 쫓아가 차를 터뜨려라`, '#ffb070'); h.cbDrive = S.t; }
  }
  if (h.cbIn && !v.dead) { g.x = v.x; g.y = v.y; if (h.cbDrive && S.t - h.cbDrive > 120 && dist(v.x, v.y, S.player.x, S.player.y) > 1500) { h.cbGone = true; contractFail(h, `${h.name}이(가) 도시를 빠져나갔다 — 의뢰 실패`); if (!v.dead) { v.ai = false; v.parked = true; } } }
}
// 차가 터지면 안에 탄 표적도 끝 (폭발 사인)
function carbombKill(h) { const g = h.g; g.off = false; g.hiddenInCar = false; g.x = h.car.x + 20; g.y = h.car.y + 10; (S.booms || (S.booms = [])).push({ x: g.x, y: g.y, t: S.t }); npcDown(g, null, true); }
function drawMiniCarbomb(x, T) {
  const h = S.hit; if (!h || !['carbomb', 'stage'].includes(h.ctr) || !h.car || h.car.dead || h.ctr === 'stage' && !h.opp.car.known) return;
  x.fillStyle = h.car.bombed ? '#ff5a3a' : '#ffa040'; x.fillRect(T(h.car.x) - 3, T(h.car.y) - 3, 6, 6);
}
