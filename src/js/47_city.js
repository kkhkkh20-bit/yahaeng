// ---------------------------------------------------------------- 도시 판 (GTA2식 시제품): 수배 · 경찰 · 의뢰 장소 · 병원
// 수배 별(0~5): 사람들이 내 범행을 보면 오른다. 별만큼 경찰이 화면 밖에서 나타나 쫓는다. 경찰 눈을 피해 버티면 하나씩 내려간다
OUTFITS.police = '경찰 제복';
OUTFIT_PAL.police = ['#dba57e', '#1c2a4a', '#2e4a86', '#121826', '#d8dce6']; PR_PAL.police = OUTFIT_PAL.police;  // 남색 제복
const WANT_COPS = [0, 2, 4, 6, 7, 8];
let CITY_RET = null;  // 의뢰를 마치면 돌아올 자리 { id, x, y }
const cityDone = () => { try { return JSON.parse(localStorage.getItem('yahaeng.cityDone') || '{}'); } catch (e) { return {}; } };
function markCityDone(id) { try { const d = cityDone(); d[id] = 1; localStorage.setItem('yahaeng.cityDone', JSON.stringify(d)); } catch (e) {} }
function cityInit() {
  S.wanted = 0; S.wantLost = 0; S.copT = 0;
  S.contracts = (STAGE.contracts || []).map(c => ({ id: c.id, name: c.name, x: tc(c.at[0]), y: tc(c.at[1]), si: STAGES.findIndex(s => s.id === c.id) })).filter(c => c.si >= 0);
  trafficInit();
  // 순찰 경찰 둘: 시내 보도를 돈다 (조직 구역에는 들어가지 않는다)
  for (const r of STAGE.copBeats || []) { const g = makeGuard({ kind: 'g1', route: r, radio: false }, S.guards.length); g.police = true; g.beat = true; g.fac = 'P'; g.outfit = 'police'; g.torch = true; g.radio = false; setLayer(0); buildRouteLine(g); S.guards.push(g); }
  if (CITY_RET) { const P = S.player, c = S.contracts.find(o => o.id === CITY_RET.id); if (c) { P.x = c.x; P.y = c.y + 30; cam.x = P.x; cam.y = P.y; } CITY_RET = null; }
}
// 의뢰 판의 거리: 교통(도로가 있으면)과 순찰 경찰. 수배·병원·의뢰 장소는 도시에만
function streetInit() {
  if (STAGE.roadsX) trafficInit();
  for (const r of STAGE.copBeats || []) { const g = makeGuard({ kind: 'g1', route: r, radio: false }, S.guards.length); g.police = true; g.beat = true; g.fac = 'P'; g.outfit = 'police'; g.torch = true; g.radio = false; setLayer(0); buildRouteLine(g); S.guards.push(g); }
}
// 범행을 본 사람이 있나 (주민·경찰, 같은 층, 가까이, 시선이 닿음)
function witnessed(x, y, r) {
  return S.guards.some(g => (g.civ || g.police) && g.state !== 'DEAD' && !g.off && !g.child && !flOf(g) && dist(g.x, g.y, x, y) < r && los(g.x, g.y, x, y) && (g.state === 'PANIC' || Math.abs(angDiff(g.a, Math.atan2(y - g.y, x - g.x))) < 1.6));
}
function addWanted(n, why) {
  if (!STAGE.city || S.over) return;
  const was = S.wanted; S.wanted = Math.min(5, Math.max(S.wanted, 0) + n); S.wantLost = 0;
  if (S.wanted > was) { toast(`수배 ${'★'.repeat(S.wanted)} — ${why || '경찰이 쫓는다'}`, 2.4, 'warn'); play('alarm', 0.35); S.copT = 0; hint('wanted', '수배 별만큼 경찰이 쫓아온다. 경찰 눈에서 벗어나 버티면 별이 하나씩 내려간다'); }
  for (const g of S.guards) if (g.police && !g.off && g.state !== 'DEAD') copChase(g);
}
function copChase(g) { if (g.state === 'ALERT') { g.lastSeen = pSpot(); return; } g.state = 'ALERT'; g.icon = '!'; g.iconT = 99; g.lastSeen = pSpot(); g.lostT = 0; g.path = null; g.repath = 0; g.meter = 1; g.shootT = 0; g.aim = 0; }
// 화면 밖 길(도로·보도) 칸 하나: 나에게서 r0~r1 떨어진 곳
function offscreenSpot(r0, r1) {
  const P = S.player, vw = W / SCALE / 2 + 60, vh = H / SCALE / 2 + 60;
  for (let k = 0; k < 80; k++) {
    const a = Math.random() * TAU, r = rnd(r0, r1), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (!inMap(tx, ty) || solidAt(tx, ty) || bldAt(tx, ty) >= 0 || !'.='.includes(G0[ty][tx])) continue;
    if (Math.abs(x - cam.x) < vw && Math.abs(y - cam.y) < vh) continue;
    return { x: tc(tx), y: tc(ty) };
  }
  return null;
}
function spawnCop(calm) {  // calm: 사건 출동 (나를 쫓지 않는다)
  const p = offscreenSpot(650, 1100); if (!p) return null;
  let g = S.guards.find(o => o.police && o.off);
  if (!g) { g = makeGuard({ kind: 'g1', at: [Math.floor(p.x / TILE), Math.floor(p.y / TILE)], radio: false }, S.guards.length); S.guards.push(g); g.police = true; g.fac = 'P'; g.outfit = 'police'; g.torch = true; g.radio = false; if (PR) prWarm([charOf(g)], true); }
  g.off = false; g.state = 'PATROL'; g.x = p.x; g.y = p.y; g.fl = 0; g.z = 0; g.hp = null; g.fhp = null; g.brawl = null; g.hunt = null; g.route = [{ x: p.x, y: p.y, pause: 999 }]; g.routeLine = null;
  if (!calm) copChase(g); return g;
}
function despawnCop(g) { g.off = true; g.state = 'DEAD'; g.x = -9999; g.y = -9999; g.path = null; g.icon = null; g.say = null; }
function cityUpdate(dt) {
  updateVehicles(dt); updateCopCars(dt);
  const P = S.player, cops = S.guards.filter(g => g.police && !g.off && g.state !== 'DEAD');
  if (S.wanted > 0) {
    // 경찰끼리 무전: 하나라도 나를 보면 모두 그 자리로
    const seen = cops.some(g => g.state === 'ALERT' && g.seen);
    if (seen) { S.wantLost = 0; for (const g of cops) copChase(g); }
    else { S.wantLost += dt; for (const g of cops) if (g.state !== 'ALERT' && g.state !== 'DEAD' && canSee(g, P.x, P.y, Math.max(0.4, P.light || 0), false, false, P.z) > 0) copChase(g); }
    const need = WANT_COPS[S.wanted];
    if (cops.length < need && (S.copT -= dt) <= 0) { S.copT = 2.2; spawnCop(); }
    if (S.wantLost > 10 + S.wanted * 3) { S.wanted--; S.wantLost = 0; toast(S.wanted ? `수배 ${'★'.repeat(S.wanted)} — 경찰이 놓쳤다` : '수배가 풀렸다', 2.2);
      if (!S.wanted) for (const g of cops) { g.state = 'RETURN'; g.icon = null; g.path = null; g.leaveT = 6; } }
  } else for (const g of cops) {  // 수배가 풀린 경찰: 화면 밖으로 사라진다
    if (g.state === 'ALERT') { g.state = 'RETURN'; g.leaveT = 6; }
    if (g.beat || g.incident || g.brawl) continue;  // 순찰 경찰·출동 중인 경찰은 남는다
    if ((g.leaveT = (g.leaveT || 6) - dt) <= 0 && (Math.abs(g.x - cam.x) > W / SCALE / 2 + 40 || Math.abs(g.y - cam.y) > H / SCALE / 2 + 40)) despawnCop(g);
  }
  // 멀리 떨어진 경찰은 화면 밖에서 다시 가까이 (따라잡기)
  if (S.wanted > 0) for (const g of cops) if (dist(g.x, g.y, P.x, P.y) > 1500) { const p = offscreenSpot(650, 1000); if (p) { g.x = p.x; g.y = p.y; g.path = null; } }
}
// 경찰이 ALERT 가 되면 (내가 경찰 앞에서 범행): 수배
function copAlert(g) { addWanted(S.wanted ? 0 : 1, '경찰이 범행을 봤다'); copChase(g); }
// 쓰러뜨린 사람이 경찰이면 별 하나 더
function cityVictim(g) { if (!STAGE.city || !g) return; if (g.police) addWanted(1, '경찰을 공격했다'); else if (witnessed(g.x, g.y, 360)) addWanted(1, g.civ ? '사람들이 폭행을 봤다' : '사람들이 싸움을 봤다'); }
// 쓰러짐: 병원에서 깨어난다 (수배·경찰은 풀린다)
function cityDown(why) {
  const P = S.player; if (P.car) { const v = P.car; P.car = null; v.parked = true; }
  P.captive = null; P.carrying = null; P.hide = null; P.hp = P.hpMax; P.hurtT = 2.5; S.fade = 1.2; S.flash = 0.4;
  const h = STAGE.hospital || STAGE.start; P.x = tc(h[0]); P.y = tc(h[1]); P.z = 0; P.fl = 0; setLayer(0); cam.x = P.x; cam.y = P.y;
  S.wanted = 0; S.wantLost = 0; S.alevel = 0; S.alevelT = 0;
  for (const g of S.guards) { if (g.police && !g.off) despawnCop(g); else if (['ALERT', 'SEARCH', 'SUSPICIOUS', 'CHECK'].includes(g.state)) { g.state = 'RETURN'; g.path = null; g.icon = null; g.meter = 0; } }
  S.stats.downs = (S.stats.downs || 0) + 1; play('lose', 0.4);
  toast((why ? why + ' ' : '') + '— 병원에서 깨어났다', 3, 'warn');
}
// [행동] 후보: 차에서 내리기 · 의뢰 받기 · 차 타기
function cityAction() {
  const P = S.player;
  if (P.car) return { k: 'carOut', v: P.car, label: '차에서 내리기' };
  if (P.z || flOf(P) || P.hide) return null;
  for (const c of S.contracts || []) if (dist(P.x, P.y, c.x, c.y) < 64) return { k: 'contract', c, at: { x: c.x, y: c.y - 40 }, label: '의뢰 받기 — ' + (STAGES[c.si].name) };
  const v = nearVehicle(); if (v) return { k: 'carIn', v, at: { x: v.x, y: v.y - 56 }, label: v.driver ? '운전자 끌어내고 타기' : '차 타기' };
  return null;
}
function cityContract(c) {
  if (S.wanted > 0) { toast('수배 중에는 의뢰를 받을 수 없다 — 먼저 경찰을 따돌려라', 2.4, 'warn'); return; }
  CITY_RET = { id: c.id }; play('bell', 0.5); start(c.si);
}
// 지금 할 일: 가장 가까운 안 끝낸 의뢰 장소
function cityGoal() {
  const P = S.player, done = cityDone();
  if (S.wanted > 0) return { text: `수배 ${'★'.repeat(S.wanted)} — 경찰 눈을 피해 버티기`, where: '', x: null, y: null, fl: 0 };
  const c = (S.contracts || []).filter(o => !done[o.id]).sort((a, b) => dist(P.x, P.y, a.x, a.y) - dist(P.x, P.y, b.x, b.y))[0];
  return c ? { text: '의뢰 받기 — ' + STAGES[c.si].name, where: c.name, x: c.x, y: c.y, fl: 0 } : { text: '의뢰를 모두 마쳤다 — 도시를 돌아다닌다', where: '', x: null, y: null, fl: 0 };
}
// 의뢰 장소 표시: 빨간 원과 이름 (끝낸 곳은 회색)
function drawContracts() {
  if (!S.contracts || flOf(S.player) || S.player.z > 0 || S.player.wire) return; const done = cityDone();  // 옥상·위층에선 땅 표시를 그리지 않는다
  for (const c of S.contracts) {
    const ok = done[c.id], pulse = 0.6 + 0.4 * Math.sin(S.t * 3);
    ctx.strokeStyle = ok ? 'rgba(150,150,160,.6)' : `rgba(232,71,60,${pulse})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, 26, 0, TAU); ctx.stroke();
    ctx.fillStyle = ok ? 'rgba(150,150,160,.25)' : 'rgba(232,71,60,.22)'; ctx.beginPath(); ctx.arc(c.x, c.y, 26, 0, TAU); ctx.fill();
    tag(c.x, c.y + 40, (ok ? '끝낸 의뢰 · ' : '의뢰 · ') + STAGES[c.si].name, ok ? '#9a9aa6' : '#e8473c', ok ? 1 : 2.4);
  }
}
// 화면 위 수배 별: 도시에서는 경계 칸 자리에 별 다섯 (채운 만큼 수배)
function drawWanted() {
  const el = $('wantBox'), ab = $('alertBox'); if (!el) return;
  if (!STAGE.city || !S) { el.hidden = true; if (ab) ab.hidden = false; return; }
  if (ab) ab.hidden = true; el.hidden = false;
  const n = S.wanted || 0, html = '<small class="clab">수배</small>' + '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>';
  if (el._h !== html) { el.innerHTML = html; el._h = html; el.dataset.on = n ? '1' : '0'; }
  el.style.opacity = n ? String(1 - Math.min(0.45, S.wantLost / (10 + n * 3) * 0.5)) : '1';
}
// 도시의 주민: 범행·시체를 보면 비명을 지르며 달아나고 경찰에 신고한다 (수배)
function cityScream(g, x, y) {
  endChat(g); g.state = 'PANIC'; g.panicT = rnd(6, 9); g.fear = { x, y }; g.path = null; g.cowered = false; g.meter = 1; S.stats.screams = (S.stats.screams || 0) + 1;
  say([[g, ['경찰! 경찰 불러요!', '사람 살려!', '저 사람이에요!'][(Math.random() * 3) | 0]]]);
  play('call', 0.7 * proxVol(g), 1.6); noise(g.x, g.y, 380, 'scream', flOf(g));
  addWanted(1, '주민이 경찰에 신고했다');
}
// 경찰차 (수배 ★★부터): 도로를 따라 나에게 온다. 가까워지면 서서 경찰 둘이 내린다 (빈 경찰차는 빼앗을 수 있다)
const WANT_PCARS = [0, 0, 1, 2, 2, 3];
function spawnCopCar() {
  const P = S.player, RX = STAGE.roadsX, RY = STAGE.roadsY, vw = W / SCALE / 2 + 120, vh = H / SCALE / 2 + 120;
  for (let k = 0; k < 60; k++) {
    const hor = Math.random() < 0.5, d = hor ? (Math.random() < 0.5 ? 0 : 2) : (Math.random() < 0.5 ? 1 : 3), road = hor ? RY[(Math.random() * RY.length) | 0] : RX[(Math.random() * RX.length) | 0];
    const along = rnd(2, (hor ? MW : MH) - 2) * TILE, x = hor ? along : laneOf(road, d), y = hor ? laneOf(road, d) : along, dd = dist(x, y, P.x, P.y);
    if (dd < 700 || dd > 1500 || (Math.abs(x - cam.x) < vw && Math.abs(y - cam.y) < vh)) continue;
    if ((hor ? RX : RY).some(r => (hor ? x : y) > r * TILE - 60 && (hor ? x : y) < (r + 4) * TILE + 60)) continue;  // 교차로 한가운데는 피한다
    const v = makeVehicle({ x, y, d, a: Math.atan2(DV[d][1], DV[d][0]), v: AI_SPD, c: 0, ai: true, driver: true, police: true, chase: true });
    planTurn(v); S.vehicles.push(v); return v;
  }
  return null;
}
// 가까이 왔으면 세우고 경찰을 내린다. true = 이번 프레임 끝
function copCarArrive(v, dt) {
  const P = S.player, d = dist(v.x, v.y, P.x, P.y), slowMe = !P.car || Math.abs(P.car.v) < 80;
  if (!(d < 300 && slowMe)) return false;
  v.v = Math.max(0, v.v - CAR_BRAKE * dt); if (v.v > 5) { v.x += DV[v.d][0] * v.v * dt; v.y += DV[v.d][1] * v.v * dt; return true; }
  v.chase = false; v.ai = false; v.parked = true; v.driver = false; v.deployed = true; play('switch', 0.5);
  for (const s of [-1, 1]) { const a = v.a + s * Math.PI / 2, x = v.x + Math.cos(a) * 50, y = v.y + Math.sin(a) * 50; const g = spawnCop(); if (g) { g.x = x; g.y = y; g.path = null; copChase(g); } }
  return true;
}
function updateCopCars(dt) {
  const cars = S.vehicles.filter(v => v.police && v.chase && !v.dead), need = WANT_PCARS[S.wanted || 0];
  if (cars.length < need && (S.pcarT = (S.pcarT || 0) - dt) <= 0) { S.pcarT = 4; spawnCopCar(); }
  if (!S.wanted) for (const v of cars) { v.chase = false; }  // 수배가 풀리면 그냥 차로 돌아간다 (경찰차 그대로 다닌다)
  if ((S.sirenT = (S.sirenT || 0) - dt) <= 0 && cars.some(v => dist(v.x, v.y, S.player.x, S.player.y) < 900)) { S.sirenT = 1.1; play('alarm', 0.12, 1.5); }
}
