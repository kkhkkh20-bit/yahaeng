// ---------------------------------------------------------------- 자유 모드 무리: 도로 점령 러닝 크루 · 자전거 동호회
// 밤마다 차도 한 차선을 통째로 차지하고 블록을 도는 민폐 무리. 러닝 크루 10명(두 줄로 뛰기), 자전거 동호회 8대(두 줄, 빠르다).
// 블록 바로 바깥 차선(보도와 맞닿은 차선) 위를 돈다 — 그 블록 둘레 길을 따라 거리를 재서 줄과 열 자리를 정한다.
// 뒤에 걸린 차들은 막혀 선다. 내 차로 들이받으면 치인 사람은 쓰러지고, 나머지는 비명 지르며 흩어져 도망친다.
// 한 명이라도 치이거나 놀라면(PANIC·ALERT·죽음) 무리가 깨진다: 나머지는 평범한 행인으로 돌아가 비명 지르며 흩어진다.
// 깨진 무리는 90초 뒤 화면 밖 다른 블록에서 새로 생긴다.
const CREW_KINDS = {
  run: { n: 10, spd: 150, gap: 30, cols: 2, side: 17, outfit: 'runner', name: '러닝 크루' },
  bike: { n: 8, spd: 250, gap: 46, cols: 2, side: 19, outfit: 'cyclist', name: '자전거 동호회' },
  kick: { n: 2, spd: 260, gap: 0, cols: 2, side: 5, outfit: null, name: '킥보드', side_walk: true, event: true },
};
function crewsInit() { S.crews = []; S.crewNext = {}; if (!STAGE.cityLife || !STAGE.hits) return; crewSpawn('run'); crewSpawn('bike'); }
function crewBlock(far) {
  const P = S.player, [BX, BY] = STAGE.blockCount || [(STAGE.roadsX || []).length - 1, (STAGE.roadsY || []).length - 1], c = [];
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) { const [ox, oy] = hitBlock(bx, by), e = hitSpan(), d = dist(P.x, P.y, tc(ox + e / 2), tc(oy + e / 2));
    if (d > (far ? 1300 : 500) && d < 3200 && !(S.crews || []).some(k => k.bx === bx && k.by === by)) c.push([bx, by]); }
  return c.length ? c[(Math.random() * c.length) | 0] : null;
}
function crewSpawn(kind, far) {
  const K = CREW_KINDS[kind], b = crewBlock(far); if (!b) return null;
  const [bx, by] = b, pts = K.side_walk ? hitRing(bx, by, Math.random() < 0.5).map(([x, y]) => ({ x: tc(x), y: tc(y) })) : crewRoadRing(bx, by, Math.random() < 0.5);
  const segs = [], L = []; let tot = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], q = pts[(i + 1) % pts.length], l = dist(a.x, a.y, q.x, q.y); segs.push({ a, q, l, s0: tot }); tot += l; }
  const crew = { kind, bx, by, segs, len: tot, s: Math.random() * tot, members: [], broken: false };
  for (let i = 0; i < K.n; i++) {
    const at = crewSpot(crew, i), gi = cityGuardSlot(), g = makeGuard({ kind: 'civ', at: [Math.floor(at.x / TILE), Math.floor(at.y / TILE)], radio: false }, gi);
    g.x = at.x; g.y = at.y; g.route = [{ x: at.x, y: at.y, pause: 999 }]; g.ri = 0; g.wait = 999; g.crew = crew; g.crewI = i; if (K.outfit) g.outfit = K.outfit; g.torch = false;
    placeGuard(g, gi); crew.members.push(g);
  }
  setLayer(0); if (PR) prWarm(crew.members.map(charOf), true);
  S.crews.push(crew); return crew;
}
// 블록 바로 바깥 차선의 가운데 줄: 블록 네 귀퉁이에서 한 칸씩 바깥으로 (그 칸이 차도가 아니면 보도 둘레로 돈다)
function crewRoadRing(bx, by, rev) {
  const [x0, y0] = hitBlock(bx, by), e = hitSpan(), road = (tx, ty) => inMap(tx, ty) && G0[ty][tx] === '.';
  const lo = x => (x - 1) * TILE, hi = x => (x + 2) * TILE;
  const onRoad = road(x0 - 1, y0 + 4) && road(x0 + e + 1, y0 + 4) && road(x0 + 4, y0 - 1) && road(x0 + 4, y0 + e + 1);
  const c = onRoad ? [[lo(x0), lo(y0)], [hi(x0 + e), lo(y0)], [hi(x0 + e), hi(y0 + e)], [lo(x0), hi(y0 + e)]] : hitRing(bx, by, false).map(([x, y]) => [tc(x), tc(y)]);
  const pts = c.map(([x, y]) => ({ x, y })); return rev ? pts.reverse() : pts;
}
function crewPoint(crew, s) {
  s = ((s % crew.len) + crew.len) % crew.len;
  for (const g of crew.segs) if (s <= g.s0 + g.l) { const u = g.l ? (s - g.s0) / g.l : 0; return { x: g.a.x + (g.q.x - g.a.x) * u, y: g.a.y + (g.q.y - g.a.y) * u, a: Math.atan2(g.q.y - g.a.y, g.q.x - g.a.x) }; }
  const g = crew.segs[0]; return { x: g.a.x, y: g.a.y, a: 0 };
}
// i번째 사람 자리: 줄(앞뒤)과 열(좌우)
function crewSpot(crew, i) {
  const K = CREW_KINDS[crew.kind], row = (i / K.cols) | 0, col = i % K.cols - (K.cols - 1) / 2, p = crewPoint(crew, crew.s - row * K.gap);
  return { x: p.x - Math.sin(p.a) * col * K.side * 2, y: p.y + Math.cos(p.a) * col * K.side * 2, a: p.a };
}
// guards.js updateGuard 맨 앞에서 부른다: 무리에 있는 동안은 보통 행인 AI 대신 줄을 따라간다
function crewStep(g, dt) {
  const crew = g.crew; if (!crew || crew.broken || g.state !== 'PATROL') return false;
  if (g.crewI === 0) crew.s += CREW_KINDS[crew.kind].spd * dt * (crew.slow || 1);
  const at = crewSpot(crew, g.crewI);
  g.x = at.x; g.y = at.y; g.a = at.a; g.moving = true; g.path = null; g.route[0].x = at.x; g.route[0].y = at.y;
  if (g.crewI === 0 && (S.t * 7 | 0) % 97 === 0 && inView(g.x, g.y, 40) && !g.say) gsay(g, crew.kind === 'run' ? ['페이스 유지!', '하나, 둘!', '조금만 더!'][(S.t | 0) % 3] : ['차 조심!', '오른쪽 붙어!', '속도 올려!'][(S.t | 0) % 3], 1.6);
  return true;
}
function crewsUpdate() {
  if (!S.crews) return;
  for (const crew of S.crews) {
    if (crew.broken) continue;
    // 이어폰 끼고 달린다: 보고 듣는 것엔 반응하지 않는다(놀라도 곧 줄로 돌아간다). 한 명이라도 쓰러지거나 근처에서 총소리가 나면 흩어진다
    const P = S.player, shot = S.gunT && S.t - (S.gunT - 0.6) < 1 && dist(P.x, P.y, crew.members[0].x, crew.members[0].y) < 500;
    const down = crew.members.find(m => !npcAlive(m) || m.off);
    if (down || shot) { crewBreak(crew, down || P); continue; }
    for (const m of crew.members) if (m.state !== 'PATROL') { m.state = 'PATROL'; m.meter = 0; m.fear = null; m.panicT = 0; m.icon = null; m.rep = null; m.path = null; }
    {
      const L = crew.members[0], v = S.player.car; if (!CREW_KINDS[crew.kind].event) crew.slow = v && Math.abs(v.v) < 40 && dist(v.x, v.y, L.x, L.y) < 90 ? 0.3 : 1; }  /* 길을 막고 선 차 앞에선 속도를 줄인다 */
  }
  S.crews = S.crews.filter(c => { if (!CREW_KINDS[c.kind].event || (S.ev && S.ev.crew === c && !S.ev.done)) return true; for (const m of c.members) { m.crew = null; if (npcAlive(m) && !m.off) { m.route = [{ x: m.x, y: m.y, pause: 999 }]; m.path = null; } } return false; });  /* 끝난 킥보드 사건의 무리는 내린다 */
  for (const k of Object.keys(CREW_KINDS)) { if (CREW_KINDS[k].event) continue;
    const live = S.crews.some(c => c.kind === k && !c.broken);
    if (!live && S.t > (S.crewNext[k] || 0)) { S.crews = S.crews.filter(c => !(c.kind === k && c.broken && c.members.every(m => !npcAlive(m) || m.off || !inView(m.x, m.y, 200)))); if (crewSpawn(k, true)) S.crewNext[k] = 0; else S.crewNext[k] = S.t + 10; }
  }
}
function crewBreak(crew, why) {
  crew.broken = true; S.crewNext[crew.kind] = S.t + 90; fstat('crewBroken');
  if (!CREW_KINDS[crew.kind].event && S.player.car && crew.members.some(m => !npcAlive(m)) && dist(S.player.car.x, S.player.car.y, why.x, why.y) < 200) justiceMoment(`도로 점령 ${CREW_KINDS[crew.kind].name} 해산`, `[속보] 차도 점령하고 달리던 ${CREW_KINDS[crew.kind].name}, 차량과 충돌… 누리꾼 "언젠가 날 일이었다"`, why.x, why.y, { thank: false });
  for (const m of crew.members) { if (!npcAlive(m)) continue; m.crew = null; civPanic(m, why.x, why.y, 6); }
  if (inView(why.x, why.y, 80)) { const L = crew.members.find(npcAlive); if (L) gsay(L, crew.kind === 'run' ? '흩어져!' : '피해!', 1.6); }  /* 위쪽 띠는 의뢰 결과에 양보한다 */
}
// 자전거: 사람 밑에 깔리는 바퀴 두 개와 몸체 (사람 그리기 바로 전)
function drawCrewBike(g) {
  if (g.crew && g.crew.kind === 'kick' && g.crewI === 0 && npcAlive(g)) { const c = Math.cos(g.a), s = Math.sin(g.a); ctx.save(); ctx.strokeStyle = '#1d2026'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(g.x - c * 16, g.y + 6 - s * 10); ctx.lineTo(g.x + c * 16, g.y + 6 + s * 10); ctx.stroke(); ctx.strokeStyle = '#39c0a8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(g.x + c * 15, g.y + 4 + s * 10); ctx.lineTo(g.x + c * 15, g.y - 22 + s * 10); ctx.stroke(); ctx.restore(); return; }
  if (!g.crew || g.crew.kind !== 'bike' || !npcAlive(g)) return;
  const c = Math.cos(g.a), s = Math.sin(g.a), x = g.x, y = g.y + 2, w = 19;
  ctx.save(); ctx.lineWidth = 3.5;
  for (const k of [-1, 1]) { ctx.strokeStyle = '#0d0f13'; ctx.beginPath(); ctx.ellipse(x + c * w * k, y + s * w * k * .7, 9, 6.5, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#8c95a3'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.lineWidth = 3.5; }
  ctx.strokeStyle = '#e04a36'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - c * w, y - s * w * .7); ctx.lineTo(x, y - 8); ctx.lineTo(x + c * w, y + s * w * .7); ctx.stroke();
  ctx.restore();
}
