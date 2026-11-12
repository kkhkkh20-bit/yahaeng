// ---------------------------------------------------------------- 자유 모드 드라이브바이 · 조직 총격전
// 드라이브바이: 차 안에서 무기를 들고 [공격] → 창밖으로 쏜다(사방 380px 안 가장 가까운 사람, 경찰·조직원 먼저). 없으면 오른쪽 창밖으로.
//               수류탄·화염병은 창밖으로 던진다. 무기가 없으면 예전처럼 경적.
// 총격전: 2.5~4분마다(수배 ★2 미만일 때) 화면 밖 길에서 두 조직이 세 명씩 차를 방패 삼아 서로 쏜다. 총소리와 띠로 알린다.
//         한쪽이 다 쓰러지면 끝. 내가 진 쪽만 쓰러뜨렸으면 이긴 조직 호감도 +8 · 진 조직 -6 · 사례 150만.
//         내가 어느 편을 쏘면 그 편이 나도 쏜다. 끝나고 20초면 남은 사람은 흩어진다.
const josaIGa = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '이' : '가'; };
const WAR_GAP = [150, 240], WAR_N = 3, WAR_RANGE = 430, WAR_PAY = 150;
function warInit() { S.war = null; S.warNext = S.t + rnd(70, 130); }
// ---- 드라이브바이
function driveBy() {
  const P = S.player; if (!STAGE.cityLife || !P.car || !wpnOn() || S.downing || S.cuffs) return false;
  if (S.t < S.gunT) return true;
  P.a = P.car.a + Math.PI / 2;  // 쏠 사람이 없으면 오른쪽 창밖
  fireWeapon(true); fstat('driveBy'); return true;
}
// ---- 총격전
function warUpdate(dt) {
  if (!STAGE.cityLife || !S.player) return; const P = S.player;
  if (!S.war) { if (S.t < S.warNext || (S.wanted || 0) >= 2 || S.downing || S.cuffs || S.ramp || S.hit || S.ev || S.side) return; /* 다른 일이 벌어지는 중엔 안 생긴다 */ if (!warStart()) S.warNext = S.t + 20; return; }
  const Wr = S.war; Wr.t += dt;
  if (Wr.over) { if (S.t - Wr.over > 20) warCleanup(); return; }
  const all = Wr.sides[0].concat(Wr.sides[1]);
  for (const g of all) if (npcAlive(g)) gunnerUpdate(g, dt, Wr);
  // 쓰러진 사람 세기 (누가 쐈나)
  for (const g of all) if (g.state === 'DEAD' && !g.warCounted) { g.warCounted = true; if (g.byP) Wr.pk[g.warSide]++; }
  const alive = s => Wr.sides[s].filter(g => npcAlive(g)).length;
  if (!alive(0) || !alive(1)) warEnd(alive(0) ? 0 : alive(1) ? 1 : -1);
  else if (Wr.t > 150 || dist(P.x, P.y, Wr.x, Wr.y) > 2600) { Wr.over = S.t; Wr.quiet = true; }
}
function warStart() {
  // 화면 밖 곧은 길 한가운데 (교차로·고가 밑은 피한다): 길 방향을 따라 양편이 갈라선다
  let p = null, ax = true;
  for (let k = 0; k < 20 && !p; k++) { const q = roadSpot(560, 950); if (!q) continue; const tx = Math.floor(q.x / TILE), ty = Math.floor(q.y / TILE), road = (x, y) => inMap(x, y) && G0[y][x] === '=';
    const h = road(tx - 3, ty) && road(tx + 3, ty), v = road(tx, ty - 3) && road(tx, ty + 3); if (h === v) continue;
    if ((S.decks || []).some(d => inR(d.top, q.x, q.y, 200) || inR(d.rampA, q.x, q.y, 200) || inR(d.rampB, q.x, q.y, 200))) continue;
    p = q; ax = h; }
  if (!p) return false;
  const facs = ['A', 'B', 'C', 'D'].sort(() => Math.random() - 0.5), F = [facs[0], facs[1]];
  const dx = ax ? 1 : 0, dy = ax ? 0 : 1;
  const Wr = S.war = { key: 'war', actors: [], cars: [], x: p.x, y: p.y, F, sides: [[], []], pk: [0, 0], hate: [false, false], t: 0, t0: S.t, over: 0 };
  const open = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return inMap(tx, ty) && !solidAt(tx, ty) && bldAt(tx, ty) < 0; };
  for (let s = 0; s < 2; s++) { const sg = s ? 1 : -1, cx = p.x + dx * sg * 110, cy = p.y + dy * sg * 110;
    const v = evCar(Wr, 'sedan', cx, cy, ax ? Math.PI / 2 : 0, { parked: true }); v.locked = false; v.hue = s ? 30 : 210;  // 길을 가로막고 선 차 = 방패
    for (let i = 0; i < WAR_N; i++) { const side = (i - 1) * 40, back = 46 + rnd(0, 30);
      let gx = cx + dx * sg * back + dy * side, gy = cy + dy * sg * back + dx * side; if (!open(gx, gy)) { gx = cx + dx * sg * back; gy = cy + dy * sg * back; }
      const g = evPerson(Wr, gx, gy, { fac: F[s], kind: i ? 'g1' : 'g2' }); g.warSide = s; g.civ = false; g.gunCdW = rnd(0.6, 1.8); g.a = Math.atan2(p.y - gy, p.x - gx); Wr.sides[s].push(g); } }
  play('gunshot', 0.25, 0.8); after(0.25, () => play('gunshot', 0.2, 0.9));
  evBanner(`멀리서 총소리 — ${STAND_NAME[F[0]]} 대 ${STAND_NAME[F[1]]} 총격전`, '#ffb070'); fstat('wars');
  return true;
}
function gunnerUpdate(g, dt, Wr) {
  if (g.burnT || g.state === 'PANIC') return;
  g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.moving = false;
  if (S.t - (g.seeT || Wr.t0 || 0) > 2.5) {  // 2.5초 넘게 쏠 사람이 안 보이면 상대 쪽으로 다가간다
    const foe = Wr.sides[1 - g.warSide].find(o => npcAlive(o)); if (foe) { if (!g.path || (g.repW = (g.repW || 0) - dt) <= 0) { g.repW = 1; pathTo(g, foe.x, foe.y); } moveAlong(g, SPD.gAlert * 0.7 * spdMul(), dt); g.moving = true; } }
  if ((g.gunCdW -= dt) > 0) return; g.gunCdW = rnd(0.7, 1.3);
  const P = S.player, foes = Wr.sides[1 - g.warSide].filter(o => npcAlive(o) && dist(o.x, o.y, g.x, g.y) < WAR_RANGE);
  let tgt = null, bd = 1e9; for (const o of foes) { const d = dist(o.x, o.y, g.x, g.y); if (d < bd && los(g.x, g.y, o.x, o.y)) { bd = d; tgt = o; } }
  if (Wr.hate[g.warSide] && !flOf(P) && dist(P.x, P.y, g.x, g.y) < WAR_RANGE && los(g.x, g.y, P.x, P.y) && (!tgt || dist(P.x, P.y, g.x, g.y) < bd + 80)) tgt = P;
  if (!tgt) return;
  g.seeT = S.t; g.path = null; npcShoot(g, tgt);
}
function npcShoot(g, tgt) {
  const P = S.player, a = Math.atan2(tgt.y - g.y, tgt.x - g.x); g.a = a; g.want = a;
  const mx = g.x + Math.cos(a) * 16, my = g.y - 14 + Math.sin(a) * 16, vol = proxVol(g);
  if (inView(g.x, g.y, 60)) spawnEffect('muzzle', { x: mx, y: my, fl: 0, z: 0 }, { scale: 0.55, angle: a, alpha: 1, startAt: 0 });
  if (vol > 0.02) play('gunshot', 0.4 * vol, 1.1); noise(g.x, g.y, 600, 'gun', 0);
  const hit = Math.random() < (tgt === P ? 0.3 : 0.45), miss = hit ? 0 : rnd(-0.25, 0.25), ex = tgt.x + Math.cos(a + Math.PI / 2) * miss * 60, ey = tgt.y - 12 + Math.sin(a + Math.PI / 2) * miss * 60;
  S.tracers.push({ x0: mx, y0: my, x1: ex, y1: ey, t: S.t });
  for (const c of actorsNearWide(g.x, g.y, 420)) if (c.civ && npcAlive(c) && c.state !== 'PANIC') civPanic(c, g.x, g.y, 10);
  if (!hit) return;
  if (tgt === P) { if (P.car) { const v = P.car; v.hp -= 0.5; v.smoke = 1.5; play('metal', 0.4, 1.6); if (v.hp <= 0) carExplode(v); } else hurtPlayer(null, `${STAND_NAME[g.fac] || '조직'} 총에 맞았다.`, g); return; }
  bloodBurst(tgt.x, tgt.y - 12, a, 3); npcDown(tgt, g, true);
}
function warEnd(win) {
  const Wr = S.war; if (!Wr || Wr.over) return; Wr.over = S.t;
  if (win < 0) { evBanner('총격전 — 양쪽 다 쓰러졌다', '#f2e7c8'); return; }
  const lose = 1 - win, Fw = Wr.F[win], Fl = Wr.F[lose];
  if (Wr.pk[lose] > 0 && !Wr.pk[win]) { applyStanding({ [Fw]: 8, [Fl]: -6 }); S.cash = (S.cash || 0) + WAR_PAY; fstat('earned', WAR_PAY); play('loot', 0.5);
    after(1.2, () => evBanner(`${STAND_NAME[Fw]}${josaIGa(STAND_NAME[Fw])} 이겼다 — 도와준 사례 ${WAR_PAY}만`, '#9fe0b0')); }
  else evBanner(`총격전 끝 — ${STAND_NAME[Fw]}${josaIGa(STAND_NAME[Fw])} 이겼다`, '#f2e7c8');
  for (const g of Wr.sides[win]) if (npcAlive(g)) { const a = rnd(0, TAU); evGo(g, g.x + Math.cos(a) * 900, g.y + Math.sin(a) * 900); }
}
function warCleanup() {
  const Wr = S.war; if (!Wr) return;
  for (const g of Wr.actors) if (!g.off && npcAlive(g) && !inView(g.x, g.y, 80)) evGone(g);
  for (const g of Wr.actors) { g.warSide = undefined; g.evt = null; }
  S.war = null; S.warNext = S.t + rnd(...WAR_GAP);
}
// 내가 총격전 사람을 쐈다 (shootRay에서)
function warHitByPlayer(g) { const Wr = S.war; if (!Wr || g.warSide == null || Wr.over) return; g.byP = true; Wr.hate[g.warSide] = true; }
function drawMiniWar(x, T) {
  const Wr = S.war; if (!Wr || Wr.over || ((S.t * 3) | 0) % 2) return;
  x.fillStyle = '#ff9050'; x.beginPath(); x.arc(T(Wr.x), T(Wr.y), 4, 0, TAU); x.fill();
}
