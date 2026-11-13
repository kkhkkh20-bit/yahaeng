// ---------------------------------------------------------------- 자유 모드 현장 수습: 구급차 · 폴리스라인 · 들것
// 길에 쓰러진 시신(기절이 아니라 죽은 사람)이 25초 넘게 그대로면 수습하러 온다. 한 번에 한 현장.
//  1) 구급차가 경광등을 켜고 가까운 도로로 들어와 선다 (화면 밖 같은 길에서 달려온다)
//  2) 경찰 하나가 시신 둘레에 폴리스라인을 친다 — 가까이 가면 "물러서세요"
//  3) 구급대원 둘이 걸어가 들것에 싣고 구급차로 → 구급차가 떠난다. 테이프와 경찰은 잠시 더 남는다
// 구급차가 터지거나 대원이 쓰러지면 그 현장은 거기서 끝 (아무도 마저 치우지 않는다). 무작위는 쓰지 않는다.
const SCENE_AFTER = 25, SCENE_GAP = 40, SCENE_KEEP = 25;
function sceneInit() { S.scene = null; S.sceneNext = S.t + 30; S.sceneScan = 0; }
const sceneActor = g => g && g.evt === '__scene';
function sceneCorpse() {
  const P = S.player, hitG = S.hit?.g; let best = null, bd = 1e9;
  for (const c of S.corpses || []) { const g = c.g;
    if (c.ko || c.fl || c.z || c.carried || c.stashed || c.hidden || c.inTrunk || c.fly || c.scened || !g || g.keep || g === hitG || g.dog || sceneActor(g)) continue;
    if (c.seenAt == null) c.seenAt = S.t; if (S.t - c.seenAt < SCENE_AFTER) continue;
    const d = dist(c.x, c.y, P.x, P.y); if (d > 1400 || d < 160) continue; if (d < bd) { bd = d; best = c; } }
  return best;
}
// 구급차가 들어올 길: 시신 곁 도로 칸에서 같은 줄을 따라 화면 밖까지 (가로 → 세로 순서로 찾는다)
function sceneLane(r) {
  const tx = Math.floor(r.x / TILE), ty = Math.floor(r.y / TILE);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let k = 1;
    for (; k < 40; k++) { const x = tx + dx * k, y = ty + dy * k; if (!inMap(x, y) || G0[y][x] !== '=') break; if (!inView(tc(x), tc(y), 120)) return { x: tc(x), y: tc(y), a: Math.atan2(-dy, -dx) }; } }
  return null;
}
function sceneStart(c) {
  // 구급차 자리: 시신에서 두세 칸 떨어진 도로 (시신 위에 서지 않게)
  const tx0 = Math.floor(c.x / TILE), ty0 = Math.floor(c.y / TILE); let r = null, bd = 1e9;
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) { const d = dx * dx + dy * dy, tx = tx0 + dx, ty = ty0 + dy; if (d < 5 || !inMap(tx, ty) || G0[ty][tx] !== '=' || bldAt(tx, ty) >= 0) continue; if (d < bd) { bd = d; r = { x: tc(tx), y: tc(ty) }; } }
  if (!r) return false; const from = inView(r.x, r.y, 120) ? sceneLane(r) : { x: r.x, y: r.y, a: 0 }; if (!from) return false;
  const v = makeVehicle({ type: 'ambulance', x: from.x, y: from.y, a: from.a, parked: true }); v.siren = true; v.sceneCar = true; v.locked = true; S.vehicles.push(v);
  c.scened = true; S.scene = { c, v, from, to: r, st: 'drive', t0: S.t, medics: [], cop: null, tape: null, sayT: 0 }; fstat('scenes');
  if (dist(S.player.x, S.player.y, c.x, c.y) < 900) play('alarm', 0.15 * proxVol(v));
  return true;
}
function scenePerson(x, y, o) { const g = evPerson({ key: '__scene', actors: [] }, x, y, o); g.keep = true; return g; }
function sceneEnd(clean) {
  const sc = S.scene; if (!sc) return; S.scene = null; S.sceneNext = S.t + SCENE_GAP;
  for (const g of [...sc.medics, sc.cop]) if (g) { g.keep = false; if (npcAlive(g) && !inView(g.x, g.y, 60)) evGone(g); else if (npcAlive(g)) { g.route = [{ x: g.x, y: g.y, pause: 1 }, { x: g.x + 1, y: g.y, pause: 2 }]; g.ri = 0; } }
  if (sc.v && !sc.v.dead && clean) S.vehicles = S.vehicles.filter(o => o !== sc.v); else if (sc.v) sc.v.siren = false;
}
// 시신을 들것에: 임시 인물은 지우고, 원래 동네 사람은 시신만 치운다 (나중에 같은 길에 새 행인이 선다 — 47_city)
function sceneLift(sc) {
  const c = sc.c, g = c.g; S.corpses = (S.corpses || []).filter(k => k !== c); sc.stretcher = { ch: c.ch, body: c };
  if (g && TEMP_ACTOR(g)) evGone(g);
  if (dist(S.player.x, S.player.y, c.x, c.y) < 900) newsTicker(`[현장] 을지로 골목 변사체 수습 — 경찰 "주변 CCTV 확인 중"`);
}
function sceneUpdate(dt) {
  if (!STAGE.cityLife) return; const sc = S.scene, P = S.player;
  if (!sc) { if ((S.sceneScan -= dt) > 0 || S.t < S.sceneNext || S.hit?.ctr === 'capture') return; S.sceneScan = 1; const c = sceneCorpse(); if (c && !sceneStart(c)) c.seenAt = S.t; return; }
  const v = sc.v, live = sc.medics.filter(npcAlive);
  if (P.car === v || v.dead || (sc.medics.length && live.length < sc.medics.length) || (sc.cop && !npcAlive(sc.cop) && sc.st !== 'keep')) { sceneEnd(false); return; }
  if (sc.st === 'drive') {   // 같은 길을 따라 달려와 선다
    const dx = sc.to.x - v.x, dy = sc.to.y - v.y, d = Math.hypot(dx, dy);
    if (d > 6) { const s = Math.min(d, 260 * dt); v.x += dx / d * s; v.y += dy / d * s; v.a = Math.atan2(dy, dx); v.v = 260; return; }
    v.v = 0; v.x = sc.to.x; v.y = sc.to.y; const c = sc.c;
    if (!S.corpses.includes(c) || c.carried || c.stashed || c.hidden) { sc.st = 'leave'; return; }   // 그새 누가 치웠다
    // 대원은 둘 다 시신 쪽 문으로 내린다 (차를 돌아가지 않게)
    const sa = [Math.PI / 2, -Math.PI / 2].sort((p, q) => dist(v.x + Math.cos(v.a + p) * 30, v.y + Math.sin(v.a + p) * 30, c.x, c.y) - dist(v.x + Math.cos(v.a + q) * 30, v.y + Math.sin(v.a + q) * 30, c.x, c.y))[0];
    const door = k => walkableNear(v.x + Math.cos(v.a + sa) * 32 + Math.cos(v.a) * k, v.y + Math.sin(v.a + sa) * 32 + Math.sin(v.a) * k, { x: c.x, y: c.y });
    sc.side = sa; sc.medics = [door(-14), door(14)].map(p => scenePerson(p.x, p.y, { outfit: 'staff' }));
    for (const m of sc.medics) m.medic = true;
    const cp = walkableNear(c.x + 40, c.y - 20, { x: c.x, y: c.y }); sc.cop = scenePerson(cp.x, cp.y, { police: true }); sc.cop.civ = true; sc.cop.beat = true; sc.cop.police = true;
    sc.tape = { x0: c.x - 52, y0: c.y - 34, x1: c.x + 52, y1: c.y + 30, t0: S.t };
    gsay(sc.cop, '여기 라인 쳐. 사람들 못 들어오게.', 2.2); play('door', 0.4 * proxVol(v)); sc.st = 'walk'; return;
  }
  const c = sc.c, home = { x: v.x + Math.cos(v.a + (sc.side || 0)) * 46, y: v.y + Math.sin(v.a + (sc.side || 0)) * 46 };   // 시신 쪽 옆문
  if (sc.st === 'walk') {
    if (!S.corpses.includes(c) || c.carried || c.stashed) { sc.st = 'back'; gsay(sc.medics[0], '...어디 갔어?', 1.8); return; }   // 내가 들고 갔다
    let near = 0; sc.medics.forEach((m, i) => { const tx = c.x + (i ? 18 : -18), ty = c.y + 4; if (dist(m.x, m.y, tx, ty) > 14) evRun(m, tx, ty, 95, dt); else { near++; m.a = Math.atan2(c.y - m.y, c.x - m.x); } });
    if (near === 2) { sc.st = 'lift'; sc.t1 = S.t; gsay(sc.medics[0], ['맥박 없어.', '하나, 둘, 셋.', '조심해서 들어.'][S.hitN % 3 || 0], 1.8); }
    return;
  }
  if (sc.st === 'lift') { if (S.t - sc.t1 > 2.4) { sceneLift(sc); sc.st = 'back'; sc.t3 = S.t; } return; }
  if (sc.st === 'back') {
    let near = 0; sc.medics.forEach((m, i) => { const tx = home.x + Math.cos(v.a + Math.PI / 2) * (i ? 10 : -10), ty = home.y + Math.sin(v.a + Math.PI / 2) * (i ? 10 : -10); if (dist(m.x, m.y, tx, ty) > 20) evRun(m, tx, ty, 80, dt); else near++; });
    if (near === 2 || (S.t - (sc.t3 || S.t) > 10 && sc.medics.every(m => !inView(m.x, m.y, 40) || dist(m.x, m.y, home.x, home.y) < 60))) { for (const m of sc.medics) { m.keep = false; evGone(m); } sc.medics = []; sc.stretcher = null; play('door', 0.4 * proxVol(v)); sc.st = 'leave'; }
    return;
  }
  if (sc.st === 'leave') {   // 온 길로 돌아 나간다
    const dx = sc.from.x - v.x, dy = sc.from.y - v.y, d = Math.hypot(dx, dy);
    if (d > 6 && !(d > 30 && sc.from.x === sc.to.x && sc.from.y === sc.to.y)) { const s = Math.min(d, 200 * dt); v.x += dx / d * s; v.y += dy / d * s; v.a = Math.atan2(dy, dx); v.v = 200; }
    if (d <= 6 || !inView(v.x, v.y, 80)) { S.vehicles = S.vehicles.filter(o => o !== v); sc.v = { dead: false }; sc.st = 'keep'; sc.t2 = S.t; }
    return;
  }
  if (sc.st === 'keep') {   // 테이프와 경찰은 잠시 남는다
    const cop = sc.cop; if (cop && npcAlive(cop) && sc.tape && !P.car && S.t > sc.sayT && dist(P.x, P.y, (sc.tape.x0 + sc.tape.x1) / 2, (sc.tape.y0 + sc.tape.y1) / 2) < 90) { sc.sayT = S.t + 4; gsay(cop, ['물러서세요. 현장입니다.', '구경하지 마시고 가세요.', '...혹시 뭐 보신 거 있어요?'][(S.t | 0) % 3], 2); }
    if (S.t - sc.t2 > SCENE_KEEP) sceneEnd(true);
  }
  if (sc.cop && npcAlive(sc.cop) && sc.tape && sc.st !== 'keep' && !P.car && S.t > sc.sayT && dist(P.x, P.y, (sc.tape.x0 + sc.tape.x1) / 2, (sc.tape.y0 + sc.tape.y1) / 2) < 90) { sc.sayT = S.t + 4; gsay(sc.cop, '물러서세요. 현장입니다.', 2); }
}
// 폴리스라인(노랑·검정 테이프와 기둥) · 들것(대원 둘 사이 흰 들것과 덮인 시신)
function drawScene() {
  const sc = S.scene; if (!sc) return;
  const T = sc.tape; if (T && inView((T.x0 + T.x1) / 2, (T.y0 + T.y1) / 2, 120)) {
    const pts = [[T.x0, T.y0], [T.x1, T.y0], [T.x1, T.y1], [T.x0, T.y1]], grow = Math.min(1, (S.t - T.t0) / 1.2);
    ctx.save(); ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
    for (let i = 0; i < 4; i++) { if (i / 4 >= grow) break; const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 4], f = Math.min(1, (grow - i / 4) * 4);
      ctx.strokeStyle = '#ffd400'; ctx.lineDashOffset = 0; ctx.beginPath(); ctx.moveTo(ax, ay - 14); ctx.lineTo(ax + (bx - ax) * f, ay - 14 + (by - ay) * f); ctx.stroke();
      ctx.strokeStyle = '#151515'; ctx.lineDashOffset = 6; ctx.beginPath(); ctx.moveTo(ax, ay - 14); ctx.lineTo(ax + (bx - ax) * f, ay - 14 + (by - ay) * f); ctx.stroke(); }
    ctx.setLineDash([]); ctx.fillStyle = '#e8e2d0'; for (const [x, y] of pts) ctx.fillRect(x - 1.5, y - 20, 3, 20);
    if (grow >= 1) { ctx.font = '700 9px ' + UI_FONT_FAMILY; ctx.textAlign = 'center'; ctx.fillStyle = '#151515'; ctx.fillText('POLICE LINE · 출입금지', (T.x0 + T.x1) / 2, T.y0 - 18); }
    ctx.restore(); }
  if (sc.stretcher && sc.medics.length === 2) { const [a, b] = sc.medics, x = (a.x + b.x) / 2, y = (a.y + b.y) / 2 - 10, ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = '#d8d8d0'; ctx.fillRect(-20, -6, 40, 12); ctx.fillStyle = '#9aa4b0'; ctx.fillRect(-16, -4, 32, 8); ctx.fillStyle = '#5a5a5a'; ctx.fillRect(-22, -6, 2, 12); ctx.fillRect(20, -6, 2, 12); ctx.restore(); }
}
