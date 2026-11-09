// 경계 단계: 0 평온 · 1 경계 · 2 수색 · 3 발각
const A_RANGE = [1, 1.12, 1.22, 1.3], A_SPEED = [1, 1.06, 1.12, 1.18], A_FOV = [1, 1.05, 1.12, 1.15];
const A_NAME = ['평온', '경계', '수색', '발각'];
function setAlert(lv, dur, msg, look = suspectLook()) {
  if (lv === 3) {recordSearchCause('player');rememberSuspect(null, look);}
  if (lv >= 2 && S.alevel < 2) { S.stats.alarms++; after(0.4, roofCheck); }
  if (lv > S.alevel) {
    S.alevel = lv; if (lv === 3) { S.stats.full = (S.stats.full || 0) + 1; bossRadio('alert'); S.unseenT = 0; S.chaseSeen = true; if (!S.reinforced && STAGE.reinf) { S.reinforced = true; after(2.5, spawnReinforcements); } }
    if (lv >= 2) play('alarm', 0.55);
    if (STAGE.flee && lv >= 2) startFlee();
  }
  if (lv === S.alevel && dur) S.alevelT = Math.max(S.alevelT, dur);
  if (msg) toast(msg, 3, 'warn');
}
// 경보만으로 현재 플레이어 위치를 알지 않는다. 실제 남은 신고·목격 정보만 사용한다.
function roofCheck() {
  if (!S || S.over) return;
  const g = S.guards.find(g => !g.civ && !g.dog && g.state === 'ALERT' && g.lastSeen);
  if (g) startBuildingSearch(g.lastSeen, g.fac || 'A', 'sighting', g);
}
const distracted = g => !!(g.chat || g.act === 'smoke' || g.act === 'yawn' || g.act === 'pickup');
function spawnReinforcements() {
  if (!S || S.over) return;
  const [rx, ry] = STAGE.reinf;
  const report = (S.searchIncidents || []).filter(i => i.fac === 'A' && i.until > S.t).slice(-1)[0];
  const witness = S.guards.find(g => g.fac !== 'B' && g.lastSeen && g.state === 'ALERT');
  const at = report ? report.at : witness ? witness.lastSeen : { x: tc(rx), y: tc(ry), fl: 0, z: 0 };
  const lt = [Math.floor(at.x / TILE), Math.floor(at.y / TILE)];
  for (let k = 0; k < D().reinf; k++) {
    const g = makeGuard({ kind: 'g2', route: [[rx, ry, 2], [lt[0], lt[1], 3]] }, S.guards.length);
    g.x += k * 30; g.reinf = true; g.gun = true; buildRouteLine(g);
    if (S.alevel >= 2) { g.state = 'SEARCH'; g.poi = { ...at }; g.reached = false; g.waitBase = 3; g.icon = '!'; g.iconT = 2; }
    S.guards.push(g);
  }
  if (S.alevel >= 2) startBuildingSearch(at, 'A', 'radio');
  play('alarm', 0.5); toast(`증원 자경대원 ${D().reinf}명이 도착했다`, 3, 'warn');
}
function guardFov(g) { if (g.civ) return 0.55; if (g.dog) return 1.15; return (g.state === 'ALERT' ? 0.72 : 0.6) * A_FOV[S.alevel] * (distracted(g) ? (g.act === 'pickup' ? 0.4 : 0.6) : 1) * (g.elite ? 1.1 : 1); }
function guardRanges(g) {
  if (g.civ) return { lit: 175 * D().range, dark: 62 * D().range };
  if (g.dog) return { lit: 170 * D().range, dark: 85 * D().range };
  const m = D().range * A_RANGE[S.alevel] * (g.state === 'SUSPICIOUS' || g.state === 'ALERT' || g.state === 'CHECK' ? 1.1 : 1) * (g.target ? 0.85 : 1);
  const dm = distracted(g) ? 0.65 : 1;
  return { lit: 520 * m * dm, dark: 95 * m * dm * (S.mod === 'bright' ? 1.5 : 1) };
}
// elev = 대상이 옥상 위 (자경대원은 위를 잘 올려다보지 않는다)
// 신분이 통했다는 걸 장면으로: 금지 구역에서 허가 신분(옷·택배 상자)을 본 조직원이 한마디 하고 지나간다 (한 사람당 한 번)
const PERMIT_NOD = { parcel: ['택배요? 창고 안쪽에 두고 가요.', '상자는 창고에. 사무실엔 들어가지 말고.'], courier: ['서명은 사무실에서 받아요.', '택배 기사님, 이쪽이요.'], staff: ['사장님 찾으면 사무실이야.', '수고해.'],
  waiter: ['얼른 홀로 가. 손님 기다린다.', '바쁘다 바빠.'], crew: ['어, 수고.', '별일 없지?'], cater: ['음식은 부엌으로.', '잔치 상 늦으면 혼난다.'] };
function permitNod(g) {
  if (g.nodded || g.say || ['ALERT', 'SEARCH', 'CHECK', 'BODY'].includes(g.state) || dist(g.x, g.y, S.player.x, S.player.y) > 230) return;
  const zi = pZoneInfo(); if (zi.k === Z_PUB || !permitted(zi,g)) return;
  const by = myPermits(g).find(o => zi.allow && zi.allow.includes(o)), L = PERMIT_NOD[by]; if (!L) return;
  g.nodded = true; gsay(g, L[g.id % L.length], 2.6); g.want = Math.atan2(S.player.y - g.y, S.player.x - g.x);
  if (!S.nodToast) { S.nodToast = true; toast(permitName(zi.allow,g) + ' · 출입 허용', 2.4, 'good'); }
}
// 위층 사람이 창문 너머로 바깥 땅(1층 높이)을 본다: 창가(160px 안)에서 창문 쪽을 보고 있고, 창문 바깥에서 나까지 시야가 트였을 때. 조금 덜 보인다(0.8배)
function winSee(g, pv) {
  const f = flOf(g), b = bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)); if (b < 0 || bldAt(Math.floor(pv.x / TILE), Math.floor(pv.y / TILE)) >= 0) return 0;
  let best = 0; const L0 = CUR_F;
  for (const w of S.fwindows || []) {
    if (w.fl !== f || !w.out || !w.inn || bldAt(w.tx, w.ty) !== b) continue;
    const dw = dist(g.x, g.y, w.x, w.y); if (dw > 160) continue;
    if ((pv.x - w.x) * w.out.d[0] + (pv.y - w.y) * w.out.d[1] < 20) continue;  // 창문 앞쪽(바깥)에 있어야
    if (Math.abs(angDiff(g.a, Math.atan2(w.y - g.y, w.x - g.x))) > guardFov(g) || Math.abs(angDiff(g.a, Math.atan2(pv.y - g.y, pv.x - g.x))) > guardFov(g)) continue;
    setLayer(f); const inOk = los(g.x, g.y, w.inn.x, w.inn.y); setLayer(0);
    if (inOk) { const o = Object.create(g); o.x = w.out.x; o.y = w.out.y; o.z = 0; o.fl = 0; const v = canSee(o, pv.x, pv.y, S.player.light, S.player.hidden, S.player.mode === 'sneak', 0) * 0.8; if (v > best) best = v; }
    setLayer(L0);
  }
  return best;
}
// Roof sight uses the height of the ray at each crossed tile. Ignoring every
// building wall made a street lookout see the middle of a roof through its slab.
function roofSightRange(g, x, y, z, sneak) {
  const gz = g.z || 0, dx = x - g.x, dy = y - g.y;
  const distance = Math.hypot(dx, dy), h0 = gz + .65, h1 = z + (sneak ? .28 : .65);
  let tx = Math.floor(g.x / TILE), ty = Math.floor(g.y / TILE), t = 0;
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const stepX = dx ? Math.abs(TILE / dx) : Infinity, stepY = dy ? Math.abs(TILE / dy) : Infinity;
  let nextX = dx ? ((tx + (dx > 0 ? 1 : 0)) * TILE - g.x) / dx : Infinity;
  let nextY = dy ? ((ty + (dy > 0 ? 1 : 0)) * TILE - g.y) / dy : Infinity;
  for (let i = 0; i < MW + MH + 2; i++) {
    if (!inMap(tx, ty)) return t * distance;
    const end = Math.min(1, nextX, nextY), roof = rLv(tx, ty);
    const low = Math.min(h0 + (h1 - h0) * t, h0 + (h1 - h0) * end);
    const obstruction = roof > 0 ? roof + (robAt(tx, ty) ? 1 : 0) : OPAQUE.has(G0[ty][tx]) ? 1 : 0;
    if (obstruction && low < obstruction - .001) return t * distance;
    if (end >= 1) return distance;
    t = end;
    if (nextX < nextY) { tx += sx; nextX += stepX; }
    else { ty += sy; nextY += stepY; }
  }
  return 0;
}
function sightLine(g, x, y, elev, sneak, targetFloor = flOf(g)) {
  if (flOf(g) !== targetFloor) return false; // floors/ceilings are opaque; winSee is the explicit window exception
  if (elev || g.z) return roofSightRange(g, x, y, elev || 0, sneak) >= dist(g.x, g.y, x, y) - 1;
  const L0 = CUR_F; setLayer(flOf(g));
  const visible = los(g.x, g.y, x, y); setLayer(L0); return visible;
}
function canSee(g, x, y, light, hidden, sneak, elev, targetFloor = flOf(g)) {
  if (targetFloor !== flOf(g)) return 0;
  // 높이: 옥상 밑(건물 안)에서는 옥상 위를 못 보고, 옥상 위에서는 옥상 밑을 못 본다
  const gz = g.z || 0; elev = elev || 0;
  if (elev > gz && !gz && roofAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE))) return 0;
  if (gz && elev < gz && !elev && roofAt(Math.floor(x / TILE), Math.floor(y / TILE))) return 0;
  const targetZ = elev; elev = elev > gz ? elev - gz : 0;
  const d = dist(g.x, g.y, x, y);
  const r = guardRanges(g);
  const watch = g.lookout && elev;  // 망꾼: 옥상 위 사람은 하늘을 배경으로 실루엣이 드러난다
  let eff = r.dark + (r.lit - r.dark) * (watch ? Math.max(light, 0.6) : light);
  if (hidden) eff = Math.min(eff, skillOn('foliage')?28:36);
  if (elev) eff *= g.lookout ? (elev >= 3 ? 0.8 : 1.05) : elev >= 3 ? 0.35 : elev >= 2 ? 0.45 : 0.55;  // 망꾼은 옥상을 본다
  if (g.elite) eff *= 1.1;
  if (sneak === 2) eff *= COVER_HIDE;  // 벽에 기댐: 몸을 붙여 훨씬 덜 보인다
  if (d > eff) return 0;
  if(d>=24&&smokeRayRange(g,x,y,d)<d-4)return 0;
  const near = !elev && (d < 24 || (!sneak && !hidden && d < 34) || (!sneak && !hidden && S.player.mode === 'run' && S.player.moving && d < 72 && Math.abs(x - S.player.x) + Math.abs(y - S.player.y) < 2));
  if (!near && Math.abs(angDiff(g.a, Math.atan2(y - g.y, x - g.x))) > guardFov(g)) return 0;
  if (!sightLine(g, x, y, targetZ, sneak, targetFloor)) return 0;
  // 쉐도우 택틱스식 줄무늬 구역: 웅크리면 시야 바깥쪽 띠에서 보이지 않는다 — 어두운 곳은 바깥 45%, 밝은 곳은 바깥 20%만 (밝은 데서 늘 웅크리는 게 정답이 되지 않게)
  if (sneak && !hidden && !watch && g.state !== 'ALERT' && d > eff * (light < 0.5 ? 0.55 : 0.8)) return 0;
  // 코만도스식 낮은 엄폐: 모래주머니 바로 뒤에서 웅크리면 가려진다
  if (sneak && !elev && lowCovered(g.x, g.y, x, y)) return 0;
  return 1 - d / eff;
}
// 지금 내가 얼마나 드러나 있나: 0 숨음(누가 돌아봐도 안 보인다) · 1 들킬 수 있음(누가 이쪽을 보면 보인다) · 2 신원 발각 후 실제 추격 중
function exposure() {
  const P = S.player;
  if (P.hide || P.under || P.vent || P.ledge) return 0;
  if (S.guards.some(g => g.seen && g.state === 'ALERT' && !g.civ && (flOf(g) === flOf(P) && (g.z || 0) === (P.z || 0) || g.sightFl === flOf(P) && g.sightZ === (P.z || 0) && S.t - g.sightAt >= 0 && S.t - g.sightAt <= .12))) return 2;
  const pv = (P.trav && P.trav.base) || P, sneak = P.cover ? 2 : P.mode === 'sneak' && !P.trav, elev = P.jump ? Math.max(1, P.z) : P.trav ? P.trav.elev || 0 : P.z;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.state === 'TERROR' || g.climb || g.doomed) continue;
    if (flOf(g) !== flOf(P) || (flOf(P) && P.wire) || dist(g.x, g.y, pv.x, pv.y) > 560) continue;
    if (STAGE.zones && !g.dog && !knownFace(g) && pZoneEff(g) === Z_PUB && !publicSuspicion(g)) continue;  // 공개 구역의 행인은 누가 돌아봐도 그냥 지나친다
    const gg = Object.create(g); gg.a = Math.atan2(pv.y - g.y, pv.x - g.x);  // 이쪽으로 돌아본다면
    if (canSee(gg, pv.x, pv.y, P.light, P.hidden, sneak, elev) > 0) return 1;
  }
  return 0;
}
function lowCovered(x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1); if (d < 50) return false;
  const ux = (x0 - x1) / d, uy = (y0 - y1) / d;
  for (let s = 10; s <= 66; s += 8) { const t = tileAt(x1 + ux * s, y1 + uy * s); if (t === 'Z' || t === 'A' || t === 'K') return true; }
  return false;
}
const spdMul = () => A_SPEED[S.alevel] * D().spd * (STAGE.gspd || 1);

// 주민: 싸우지 않는다. 보거나 시체를 보면 비명을 질러 자경대원을 부르고 달아난다
