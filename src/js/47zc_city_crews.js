// ---------------------------------------------------------------- 자유 모드 무리: 러닝 크루 · 자전거 동호회
// 한 블록 둘레 보도를 한 줄로 도는 사람들. 러닝 크루 6명(뛰기), 자전거 동호회 5대(빠르다, 자전거 위에 숙인 자세).
// 앞사람이 간 길을 같은 간격으로 따라간다 — 길(블록 네 모퉁이)을 따라 거리를 재서 자리를 정한다.
// 한 명이라도 치이거나 놀라면(PANIC·ALERT·죽음) 무리가 깨진다: 나머지는 평범한 행인으로 돌아가 비명 지르며 흩어진다.
// 깨진 무리는 90초 뒤 화면 밖 다른 블록에서 새로 생긴다.
const CREW_KINDS = {
  run: { n: 6, spd: 150, gap: 30, outfit: 'runner', name: '러닝 크루' },
  bike: { n: 5, spd: 250, gap: 46, outfit: 'cyclist', name: '자전거 동호회' },
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
  const [bx, by] = b, pts = hitRing(bx, by, Math.random() < 0.5).map(([x, y]) => ({ x: tc(x), y: tc(y) }));
  const segs = [], L = []; let tot = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], q = pts[(i + 1) % pts.length], l = dist(a.x, a.y, q.x, q.y); segs.push({ a, q, l, s0: tot }); tot += l; }
  const crew = { kind, bx, by, segs, len: tot, s: Math.random() * tot, members: [], broken: false };
  for (let i = 0; i < K.n; i++) {
    const at = crewPoint(crew, crew.s - i * K.gap), gi = cityGuardSlot(), g = makeGuard({ kind: 'civ', at: [Math.floor(at.x / TILE), Math.floor(at.y / TILE)], radio: false }, gi);
    g.x = at.x; g.y = at.y; g.route = [{ x: at.x, y: at.y, pause: 999 }]; g.ri = 0; g.wait = 999; g.crew = crew; g.crewI = i; g.outfit = K.outfit; g.torch = false;
    placeGuard(g, gi); crew.members.push(g);
  }
  setLayer(0); if (PR) prWarm(crew.members.map(charOf), true);
  S.crews.push(crew); return crew;
}
function crewPoint(crew, s) {
  s = ((s % crew.len) + crew.len) % crew.len;
  for (const g of crew.segs) if (s <= g.s0 + g.l) { const u = g.l ? (s - g.s0) / g.l : 0; return { x: g.a.x + (g.q.x - g.a.x) * u, y: g.a.y + (g.q.y - g.a.y) * u, a: Math.atan2(g.q.y - g.a.y, g.q.x - g.a.x) }; }
  const g = crew.segs[0]; return { x: g.a.x, y: g.a.y, a: 0 };
}
// guards.js updateGuard 맨 앞에서 부른다: 무리에 있는 동안은 보통 행인 AI 대신 줄을 따라간다
function crewStep(g, dt) {
  const crew = g.crew; if (!crew || crew.broken || g.state !== 'PATROL') return false;
  if (g.crewI === 0) crew.s += CREW_KINDS[crew.kind].spd * dt * (crew.slow || 1);
  const at = crewPoint(crew, crew.s - g.crewI * CREW_KINDS[crew.kind].gap);
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
      const L = crew.members[0], v = S.player.car; crew.slow = v && Math.abs(v.v) < 40 && dist(v.x, v.y, L.x, L.y) < 90 ? 0.3 : 1; }  /* 길을 막고 선 차 앞에선 속도를 줄인다 */
  }
  for (const k of Object.keys(CREW_KINDS)) {
    const live = S.crews.some(c => c.kind === k && !c.broken);
    if (!live && S.t > (S.crewNext[k] || 0)) { S.crews = S.crews.filter(c => !(c.kind === k && c.broken && c.members.every(m => !npcAlive(m) || m.off || !inView(m.x, m.y, 200)))); if (crewSpawn(k, true)) S.crewNext[k] = 0; else S.crewNext[k] = S.t + 10; }
  }
}
function crewBreak(crew, why) {
  crew.broken = true; S.crewNext[crew.kind] = S.t + 90; fstat('crewBroken');
  for (const m of crew.members) { if (!npcAlive(m)) continue; m.crew = null; civPanic(m, why.x, why.y, 6); }
  if (inView(why.x, why.y, 80)) evBanner(`${CREW_KINDS[crew.kind].name}가 흩어진다`, '#ffb070');
}
// 자전거: 사람 밑에 깔리는 바퀴 두 개와 몸체 (사람 그리기 바로 전)
function drawCrewBike(g) {
  if (!g.crew || g.crew.kind !== 'bike' || !npcAlive(g)) return;
  const c = Math.cos(g.a), s = Math.sin(g.a), x = g.x, y = g.y + 2, w = 19;
  ctx.save(); ctx.lineWidth = 3.5;
  for (const k of [-1, 1]) { ctx.strokeStyle = '#0d0f13'; ctx.beginPath(); ctx.ellipse(x + c * w * k, y + s * w * k * .7, 9, 6.5, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#8c95a3'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.lineWidth = 3.5; }
  ctx.strokeStyle = '#e04a36'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - c * w, y - s * w * .7); ctx.lineTo(x, y - 8); ctx.lineTo(x + c * w, y + s * w * .7); ctx.stroke();
  ctx.restore();
}
