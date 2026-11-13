// ---------------------------------------------------------------- 자유 모드 대혼란: 다중 추돌 · 폭약 · 고가 붕괴 · 건물 파손/붕괴 · 통쾌한 연출
// 다중 추돌: 앞차가 갑자기 서면(내가 세게 들이받거나, 빗길에 미끄러지거나) 같은 차로 뒤차들이 미처 못 서고 줄줄이 박는다.
//   박힌 차는 비상등을 켜고 서고, 운전자가 내려 소리친다. 많이 박을수록 '연쇄 추돌 xN'.
// 폭약: 철물점·공구점에서 산다. 고가 교각이나 작은 건물 벽에 붙이면 6초 뒤 터진다.
//   교각이 터지면 위 고가 한 구간(6칸)이 무너진다: 끊긴 끝은 철근이 드러나고, 조각이 떨어져 밑 도로를 막고, 그 위 차는 떨어진다.
// 건물: 폭발이 가까우면 외벽이 그을리고 금이 가고 유리가 깨지고 불이 붙는다. 작은 건물(30칸 이하)은 세 번(폭약은 한 번) 맞으면 무너져 잔해 더미가 된다.
// 통쾌: 큰 폭발·붕괴에 짧은 느린 화면과 큰 흔들림, 3초 안에 이어진 폭발은 '연쇄 폭발 xN'.
const BOMB_T = 6, BREAK_HALF = 3;  // 폭약 시간(초) · 무너지는 반쪽 길이(칸)
function havocInit() { S.bombs = []; S.rubble = []; S.deckChunks = []; S.deckBreaks = []; S.combo = { n: 0, t: -9 }; S.pileN = 0; S.pileT = -9; S.slipT = S.t + rnd(70, 140); }
// ---------- 통쾌: 느린 화면 · 콤보
function slowMo(sec) { S.slowMo = Math.max(S.slowMo || 0, sec); }
function comboHit(kind) {
  const C = S.combo; if (S.t - C.t > 3) C.n = 0; C.n++; C.t = S.t;
  if (C.n >= 2) { evBanner(`연쇄 폭발 x${C.n}!`, '#ffb060'); if (C.n === 2 || C.n % 3 === 0) slowMo(0.5); S.shakeT = Math.max(S.shakeT || 0, 0.35 + 0.05 * C.n); }
}
// ---------- 공통 폭발 (차 없이: 폭약·잔해): 섬광·불덩이·파편, 사람·차·건물에 피해
function havocBlast(x, y, power, why) {
  const P = S.player, d = dist(x, y, P.x, P.y), near = clamp(1 - d / 1000, 0, 1), R = 110 + power * 30;
  (S.booms || (S.booms = [])).push({ x, y, t: S.t }); (S.scorch || (S.scorch = [])).push({ x, y, r: 50 + power * 8, rot: rnd(0, TAU) }); if (S.scorch.length > 60) S.scorch.shift();
  const fake = { x, y, a: 0, len: 40 }; fireEmit(fake, 'spark', 30, fake); fireEmit(fake, 'debris', 22, fake); fireEmit(fake, 'smoke', 14, fake);
  S.shakeT = Math.max(S.shakeT || 0, 0.35 + 0.5 * near); S.flash = Math.max(S.flash || 0, 0.45 * near); crashSound(500, near); play('thud', 0.8 * near + 0.2);
  noise(x, y, 800, 'car', 0);
  for (const g of S.guards) { if (g.state === 'DEAD' || g.off || flOf(g) || g.z) continue; const r = dist(g.x, g.y, x, y); if (r > R) continue;
    if (r < R * 0.6) { npcDown(g, null, true); g.charred = true; g.burnUntil = S.t + rnd(4, 7); g.burnT = S.t; bloodBurst(g.x, g.y - 10, Math.atan2(g.y - y, g.x - x), 5); } else { npcDown(g, null, false); igniteNpc(g); } }
  if (!P.car && !flOf(P) && !P.z && d < R) { P.hurtT = 0; hurtPlayer(null, why || '폭발에 휘말렸다.'); if (d < R * 0.5) { P.hurtT = 0; hurtPlayer(null, why || '폭발에 휘말렸다.'); } }
  for (const o of S.vehicles) { if (o.dead) continue; const r = dist(o.x, o.y, x, y); if (r > R + 40) continue; o.hp = Math.min(o.hp, r < R * 0.5 ? 0 : (o.hpMax || 6) * 0.3); o.smoke = 2; if (o.hp <= 0) after(rnd(0.15, 0.6), () => carExplode(o)); }
  buildingBlast(x, y, power); comboHit('blast'); if (power >= 3) slowMo(0.8);
}
// ---------- 다중 추돌
function pileupBehind(lead) {
  if (!lead || !STAGE.cityLife) return; lead.ai = false; lead.v = 0; lead.crashed = true; lead.hazardT = S.t + 40;
  const hor = lead.d % 2 === 0, sgn = DV[lead.d][0] + DV[lead.d][1];
  for (const o of S.vehicles) { if (o === lead || !o.ai || o.dead || o.d !== lead.d || o.chase || onDeckLevel(o) !== onDeckLevel(lead)) continue;
    const lat = hor ? Math.abs(o.y - lead.y) : Math.abs(o.x - lead.x), behind = ((hor ? lead.x - o.x : lead.y - o.y) * sgn);
    if (lat < 26 && behind > 30 && behind < 520) { o.panicT = S.t + 2.2 + behind / 300; o.panicSpd = rnd(250, 310); } }
}
function pileHit(a, b) {  // 추돌 한 번: 두 차가 서고 비상등, 연쇄 수
  if (a && b) { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, f = { x: mx, y: my, a: 0, len: 20 }; fireEmit(f, 'spark', 14, f); fireEmit(f, 'debris', 5, f);  // 부딪힌 자리: 불똥·파편·충격
    spawnEffect('impact', { x: mx, y: my, fl: 0, z: 0 }, { scale: 0.8, alpha: 0.9 }); crashSound(320, clamp(1 - dist(mx, my, S.player.x, S.player.y) / 900, 0, 1));
    for (const v of [a, b]) if (v && v !== S.player.car && !v.crashed) { v.a += rnd(-0.4, 0.4); v.va = v.a; v.smoke = 3; v.hp = Math.min(v.hp, (v.hpMax || 6) * rnd(0.35, 0.6)); } }  // 비틀려 서고 연기
  for (const v of [a, b]) { if (!v || v === S.player.car) continue; v.ai = false; v.v = 0; v.crashed = true; v.hazardT = S.t + 40; v.panicT = 0;
    if (v.driver && !v.driverOutT) { v.driverOutT = S.t; after(rnd(1, 2.2), () => { if (v.dead || !v.driver || v.jacking || S.player.car === v) return; v.driver = false;   /* 그사이 내가 차를 빼앗았으면 운전자를 또 만들지 않는다 */ v.doorT = S.t + 0.2; v.doorSide = -1;
      const gi = cityGuardSlot(), side = v.a - Math.PI / 2, g = makeGuard({ kind: 'civ', at: [Math.floor(v.x / TILE), Math.floor(v.y / TILE)], radio: false }, gi);
      g.x = v.x + Math.cos(side) * 44; g.y = v.y + Math.sin(side) * 44; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.driverOut = true; placeGuard(g, gi); if (PR) prWarm([charOf(g)], true);
      gsay(g, ['아이고 내 차!', '어떻게 된 거야!', '보험사 불러!', '아 진짜...'][(Math.random() * 4) | 0], 2.2); }); } }
  if (S.t - S.pileT > 6) S.pileN = 0; S.pileN++; S.pileT = S.t;
  if (S.pileN >= 3) { evBanner(`연쇄 추돌 x${S.pileN}!`, '#ffb060'); if (S.pileN === 3) slowMo(0.6); }
}
function slipUpdate() {  // 빗길: 가끔 내 앞쪽 차 하나가 미끄러져 선다 → 뒤차들이 줄줄이
  if (S.t < S.slipT) return; S.slipT = S.t + rnd(70, 140); if (rainK() < 0.5) return; const P = S.player;
  const cand = S.vehicles.filter(v => v.ai && !v.dead && !v.chase && !onDeckLevel(v) && dist(v.x, v.y, P.x, P.y) > 350 && dist(v.x, v.y, P.x, P.y) < 900);
  const v = cand[(Math.random() * cand.length) | 0]; if (!v) return; v.a += rnd(-0.9, 0.9); play('metal', 0.2 * proxVol(v), 1.4); pileupBehind(v);
}
// ---------- 폭약 · 교각
function deckPillars(d) { const out = [], h = d.axis === 'x'; for (let u = d.a0 + d.r + 2 * TILE; u < d.a1 - d.r - TILE; u += 6 * TILE) for (const c of [d.c0 + TILE * 0.9, d.c1 - TILE * 0.9]) out.push({ d, u, x: h ? u : c, y: h ? c : u }); return out; }
const smallBld = b => b && !b.vacant && !b.collapsed && (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) <= 30 && !Object.values(CONTACT_BLD).includes(b.name) && !/병원|지구대|중고차/.test(b.name || '') && !(S.garage && S.garage.b === b);
function havocAction() {
  const P = S.player; if (P.car || !(P.bombs > 0) || P.trav) return null;
  for (const d of S.decks || []) for (const p of deckPillars(d)) if (dist(P.x, P.y, p.x, p.y) < 60) return { k: 'evAct', label: `교각에 폭약 설치 (${P.bombs})`, fn: () => plantBomb(p.x, p.y, { deck: d, u: p.u }) };
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const bi = bldAt(tx + dx, ty + dy), b = BLD[bi]; if (bi >= 0 && smallBld(b) && bldAt(tx, ty) !== bi) return { k: 'evAct', label: `건물 벽에 폭약 설치 (${P.bombs})`, fn: () => plantBomb(P.x + dx * 20, P.y + dy * 20, { b }) }; }
  return null;
}
function plantBomb(x, y, target) {
  const P = S.player; doMotion({ pose: 'crouch', dur: 1.1, at: [[0.4, () => play('click', 0.4)], [0.8, () => play('switch', 0.4)]], end: () => {
    P.bombs--; S.bombs.push({ x, y, t: S.t + BOMB_T, target, beep: 0 }); evBanner(`폭약 설치. ${BOMB_T}초 안에 피해라!`, '#ff8a6a');
    if (witnessed(x, y, 380)) addWanted(2, '폭약을 설치하는 걸 사람들이 봤다'); } });
}
function bombsUpdate(dt) {
  for (let i = S.bombs.length - 1; i >= 0; i--) { const b = S.bombs[i], left = b.t - S.t;
    if ((b.beep -= dt) <= 0) { b.beep = left > 3 ? 0.5 : left > 1.2 ? 0.25 : 0.1; play('click', 0.35 * clamp(1 - dist(b.x, b.y, S.player.x, S.player.y) / 900, 0.1, 1), 2.2); }
    if (left > 0) continue; S.bombs.splice(i, 1);
    havocBlast(b.x, b.y, 3, '폭약에 휘말렸다.'); addWanted(2, '폭발이 일어났다'); fstat('bombs');
    if (b.target.deck) deckBreak(b.target.deck, b.target.u); else if (b.target.b) buildingHit(b.target.b, 3); }
}
// 고가 한 구간 붕괴: 덱을 두 조각으로 나누고(끊긴 끝은 경사로 없음), 사이 구간은 떨어지는 조각들로
function deckBreak(d, u) {
  const i = S.decks.indexOf(d); if (i < 0) return; const T = TILE, top0 = d.axis === 'x' ? d.top.x0 : d.top.y0, top1 = d.axis === 'x' ? d.top.x1 : d.top.y1;
  const u0 = Math.max(top0 + T, u - BREAK_HALF * T), u1 = Math.min(top1 - T, u + BREAK_HALF * T); if (u1 - u0 < 2 * T) return;
  const h = d.axis === 'x', rect = (a, b) => h ? { x0: a, x1: b, y0: d.c0, y1: d.c1 } : { x0: d.c0, x1: d.c1, y0: a, y1: b };
  const d1 = Object.assign({}, d, { a1: u0 + d.r, top: rect(top0, u0), rampB: rect(u0, u0) }), d2 = Object.assign({}, d, { a0: u1 - d.r, top: rect(u1, top1), rampA: rect(u1, u1) });
  S.decks.splice(i, 1, d1, d2); S.deckBreaks.push({ axis: d.axis, u0, u1, c0: d.c0, c1: d.c1, t: S.t });
  for (let k = 0; k < 16; k++) { const uu = rnd(u0, u1), cc = rnd(d.c0 + 10, d.c1 - 10); S.deckChunks.push({ x: h ? uu : cc, y: h ? cc : uu, z: 1, vz: rnd(-0.5, 0.3), w: rnd(26, 60), hh: rnd(20, 44), rot: rnd(-0.6, 0.6), spin: rnd(-2, 2), delay: rnd(0, 0.5) }); }
  evBanner('고가가 무너진다!', '#ff8a6a'); slowMo(1.1); S.shakeT = Math.max(S.shakeT || 0, 1.2); crashSound(600, 1); after(0.4, () => crashSound(500, 0.8));
}
function chunksUpdate(dt) {
  for (let i = S.deckChunks.length - 1; i >= 0; i--) { const c = S.deckChunks[i]; if ((c.delay -= dt) > 0) continue;
    c.vz -= DECK_G * dt; c.z += c.vz * dt; c.rot += c.spin * dt;
    if (c.z <= 0) { S.deckChunks.splice(i, 1); S.rubble.push({ x: c.x, y: c.y, w: c.w * 0.9, h: c.hh * 0.9, rot: c.rot, col: (Math.random() * 3) | 0 }); const f = { x: c.x, y: c.y, a: 0, len: 30 }; fireEmit(f, 'smoke', 3, f); fireEmit(f, 'debris', 4, f);
      crashSound(380, clamp(1 - dist(c.x, c.y, S.player.x, S.player.y) / 900, 0, 1) * 0.7);
      for (const v of S.vehicles) if (!v.dead && (v.z || 0) < 0.3 && dist(v.x, v.y, c.x, c.y) < 40) { v.hp -= 4; v.smoke = 2; if (v.hp <= 0) carExplode(v); }  // 깔린 차
      for (const g of S.guards) if (g.state !== 'DEAD' && !g.off && !flOf(g) && dist(g.x, g.y, c.x, c.y) < 30) npcDown(g, null, true); } }
  if (S.rubble.length > 220) S.rubble.splice(0, S.rubble.length - 220);
}
// 땅의 잔해: 땅 높이 차는 지나가지 못한다 (사람은 넘어간다)
function rubbleBlocks(v) {
  if (!S.rubble?.length || (v.z || 0) > 0.3) return false; const R = v.r || CAR_R;
  for (const r of S.rubble) { if (Math.abs(r.x - v.x) > 120 || Math.abs(r.y - v.y) > 120) continue; for (const [px, py] of carPts(v)) if (Math.abs(px - r.x) < r.w / 2 + R * 0.6 && Math.abs(py - r.y) < r.h / 2 + R * 0.6) return true; }
  return false;
}
// ---------- 건물 파손 · 붕괴
function buildingBlast(x, y, power) {
  for (const b of BLD) { if (b.vacant) continue; const x0 = b.x0 * TILE, x1 = (b.x1 + 1) * TILE, y0 = b.y0 * TILE, y1 = (b.y1 + 1) * TILE, nx = clamp(x, x0, x1), ny = clamp(y, y0, y1), d = dist(x, y, nx, ny);
    if (d > 70 + power * 20) continue; buildingScar(b, nx, ny); if (smallBld(b) && d < 80) buildingHit(b, power >= 3 ? 3 : 1); }
}
function buildingScar(b, x, y) {  // 외벽 그을음·금·깨진 유리·벽의 불
  (b.scars || (b.scars = [])).push({ x, y, t: S.t, seed: Math.random() * 1000 }); if (b.scars.length > 6) b.scars.shift();
  if (typeof carGlassBits === 'function') carGlassBits(null, { x, y: y + 18 });
  play('glass', 0.5 * clamp(1 - dist(x, y, S.player.x, S.player.y) / 900, 0.1, 1));
}
function buildingHit(b, n) {
  if (!smallBld(b)) return; b.bhp = (b.bhp ?? 3) - n; if (b.bhp > 0) { S.shakeT = Math.max(S.shakeT || 0, 0.3); return; }
  buildingCollapse(b);
}
function buildingCollapse(b) {
  b.collapsed = true; const x0 = b.x0 * TILE, x1 = (b.x1 + 1) * TILE, y0 = b.y0 * TILE, y1 = (b.y1 + 1) * TILE, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  // 안에 있던 사람은 깔린다
  for (const g of S.guards) if (g.state !== 'DEAD' && !g.off && g.x > x0 && g.x < x1 && g.y > y0 && g.y < y1) npcDown(g, null, true);
  for (const c of S.corpses || []) if (c.ko && c.x > x0 && c.x < x1 && c.y > y0 && c.y < y1) { c.ko = false; if (c.g) { c.g.killHow = 'crush'; c.g.unconscious = false; } }  // 기절해 쓰러져 있던 사람도 깔린다
  const P = S.player; if (P.x > x0 - 10 && P.x < x1 + 10 && P.y > y0 - 10 && P.y < y1 + 10) { P.fl = 0; P.z = 0; setLayer(0); P.hurtT = 0; hurtPlayer(null, '무너진 건물에 깔렸다.'); }
  // 땅이 되고(벽 칸이 사라진다) 잔해 더미가 덮는다
  for (let ty = b.y0; ty <= b.y1; ty++) for (let tx = b.x0; tx <= b.x1; tx++) { if (!inMap(tx, ty)) continue; const row = G0[ty]; if (typeof row === 'string') G0[ty] = row.substring(0, tx) + '.' + row.substring(tx + 1); else row[tx] = '.'; }  // 1층 지도(G0)만 바꾼다
  b.vacant = true; if (b.dropRoof) b.dropRoof(); b._facade = null;
  if (mapC && mapC.lazy) { const T = BIG_T; for (let j = Math.floor(y0 / T); j <= Math.floor(y1 / T); j++) for (let i = Math.floor(x0 / T); i <= Math.floor(x1 / T); i++) { const k = j * mapC.nx + i, t = mapC.tiles[k]; if (t) { t.width = t.height = 0; mapC.tiles[k] = null; const li = mapC.live.indexOf(k); if (li >= 0) mapC.live.splice(li, 1); } } }
  if (typeof miniBase !== 'undefined') miniBase = null;
  for (let k = 0; k < 18; k++) S.rubble.push({ x: rnd(x0 + 16, x1 - 16), y: rnd(y0 + 16, y1 - 16), w: rnd(30, 70), h: rnd(24, 54), rot: rnd(-0.8, 0.8), col: (Math.random() * 3) | 0 });
  const f = { x: cx, y: cy, a: 0, len: 80 }; fireEmit(f, 'smoke', 40, f); fireEmit(f, 'debris', 30, f);
  for (let k = 0; k < 4; k++) after(0.2 * k, () => crashSound(520, clamp(1 - dist(cx, cy, P.x, P.y) / 1000, 0.2, 1)));
  S.shakeT = Math.max(S.shakeT || 0, 1.4); slowMo(1.0); evBanner(`${b.name || '건물'}이 무너졌다!`, '#ff8a6a'); fstat('collapses'); addWanted(1, '건물이 무너졌다');
}
function havocUpdate(dt) {
  if (!STAGE.cityLife || !S.bombs) return;
  bombsUpdate(dt); chunksUpdate(dt); slipUpdate();
  // 무너진 건물·폭발한 벽의 불길 연기
  if ((S.scarT = (S.scarT || 0) - dt) <= 0) { S.scarT = 0.3; for (const b of BLD) for (const s of b.scars || []) if (S.t - s.t < 25 && Math.random() < 0.5) (S.fireParts || (S.fireParts = [])).push({ kind: 'smoke', x: s.x + rnd(-10, 10), y: s.y - 20, vx: rnd(-6, 6), vy: -18, t: 0, life: rnd(1.4, 2.4), size: rnd(8, 14), rot: 0 }); }
}
// ---------- 그리기
function drawRubble() {  // 땅 (차보다 먼저)
  const cols = ['#5a5e66', '#6e727a', '#4a4d55'];
  for (const r of S.rubble || []) { if (!inView(r.x, r.y, 60)) continue; ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-r.w / 2 + 4, -r.h / 2 + 5, r.w, r.h); ctx.fillStyle = cols[r.col]; ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-r.w / 2, -r.h / 2, r.w, 3); ctx.strokeStyle = '#8a4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r.w / 4, -r.h / 2); ctx.lineTo(-r.w / 4 - 6, -r.h / 2 - 9); ctx.moveTo(r.w / 5, r.h / 2); ctx.lineTo(r.w / 5 + 8, r.h / 2 + 6); ctx.stroke(); ctx.restore(); }
  for (const b of S.bombs || []) { if (!inView(b.x, b.y, 30)) continue; ctx.fillStyle = '#2a2e34'; ctx.fillRect(b.x - 7, b.y - 5, 14, 10); ctx.fillStyle = '#c84a2a'; ctx.fillRect(b.x - 6, b.y - 4, 5, 8);
    ctx.fillStyle = ((S.t * (b.t - S.t < 2 ? 10 : 3)) | 0) % 2 ? '#ff2a2a' : '#5a1010'; ctx.fillRect(b.x + 2, b.y - 2, 3, 3); }
}
function drawHavocAbove() {  // 건물 외벽 손상(어둠 뒤, 건물 위) · 떨어지는 고가 조각 · 끊긴 고가 끝
  for (const b of BLD) for (const s of b.scars || []) { if (!inView(s.x, s.y, 80)) continue; const age = S.t - s.t;
    ctx.save(); const g = ctx.createRadialGradient(s.x, s.y - 20, 0, s.x, s.y - 20, 46); g.addColorStop(0, 'rgba(10,8,8,.7)'); g.addColorStop(1, 'rgba(10,8,8,0)'); ctx.fillStyle = g; ctx.fillRect(s.x - 46, s.y - 66, 92, 92);
    ctx.strokeStyle = 'rgba(20,18,18,.85)'; ctx.lineWidth = 1.5; for (let k = 0; k < 4; k++) { let x = s.x + Math.sin(s.seed + k) * 14, y = s.y - 6; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += Math.sin(s.seed * 3 + k * 7 + j) * 7; y -= 9; ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.restore(); if (age < 20) fxFrame('carfire', S.t + s.seed, s.x, s.y - 4, 1.2 * clamp(1 - age / 20, 0.3, 1), 1); }
  for (const c of S.deckChunks || []) { if (c.delay > 0 || !inView(c.x, c.y, 120)) continue; const [px, py] = deckPt(c.x, c.y, Math.max(0, c.z)), s = deckS(Math.max(0, c.z));
    ctx.save(); ctx.translate(px, py); ctx.rotate(c.rot); ctx.fillStyle = '#4a4f57'; ctx.fillRect(-c.w * s / 2, -c.hh * s / 2, c.w * s, c.hh * s); ctx.fillStyle = '#2c3037'; ctx.fillRect(-c.w * s / 2, -c.hh * s / 2, c.w * s, 4 * s); ctx.restore(); }
  for (const k of S.deckBreaks || []) for (const u of [k.u0, k.u1]) {  // 끊긴 끝: 들쭉날쭉한 콘크리트와 튀어나온 철근
    const h = k.axis === 'x', pts = []; for (let c = k.c0; c <= k.c1; c += 16) pts.push(deckPt(h ? u + rnd(-6, 6) * 0 + Math.sin(c * 0.3) * 8 : c, h ? c : u + Math.sin(c * 0.3) * 8, 1));
    ctx.strokeStyle = '#1a1c20'; ctx.lineWidth = 6; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.strokeStyle = '#a0603a'; ctx.lineWidth = 2; for (let c = k.c0 + 10; c < k.c1; c += 22) { const dir = u === k.u0 ? 1 : -1, [ax, ay] = deckPt(h ? u : c, h ? c : u, 1), [bx, by] = deckPt(h ? u + dir * 18 : c + 4, h ? c + 4 : u + dir * 18, 0.92); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); } }
}
