// ---------------------------------------------------------------- 자유 모드 가게 일꾼: 건물마다 층의 쓰임새대로 일하는 사람과 옷
// 편의점 조끼 · 약국 흰 가운 · 철물점 작업복 · 식당 조리복/앞치마 · PC방·노래방 직원 · 헬스 트레이너 · 학원 선생님 · 사무실 양복.
// 내가 들어간 건물에만 세우고, 나오면 들여보낸다 (사람 수가 늘어 느려지지 않게 · 바깥 목격자가 늘지 않게). 무작위는 쓰지 않는다.
function staffOutfit(b, f, use) {
  const sign = (b.signs || [])[f] || '';
  if (use === 'store') return /약국/.test(sign) ? 'pharm' : /철물|공구|타일|조명|전파|지물/.test(sign) ? 'hardware' : 'staff';
  return { food: (b.x0 + f) % 2 ? 'chef' : 'cater', pc: 'gamer', karaoke: 'karaoke', billiards: 'gamer', gym: 'trainer', academy: 'teacher', office: 'clerk' }[use] || null;
}
function staffInit() { S.staffT = 0; S.staffB = new Map(); }
const furnAt = (f, tx, ty) => FURN.some(it => (it.fl || 0) === f && tx >= it.x && tx < it.x + it.w && ty >= it.y && ty < it.y + it.h);
function staffSpot(f, A, C) {   // 계산대가 있으면 그 뒤(안쪽), 없으면 앞줄(손님 통로) 한 줄 위 가운데에 가까운 빈 칸
  const old = CUR_F; setLayer(f); let best = null, bd = 1e9;
  if (C) for (const [tx, ty] of [[C.x + 1, C.y - 1], [C.x, C.y - 1], [C.x + 2, C.y], [C.x - 1, C.y]]) if (!solidAt(tx, ty) && !furnAt(f, tx, ty) && tx >= A.x0 - 1 && tx <= A.x1 + 1) { setLayer(old); return [tx, ty, true]; } const cx = (A.x0 + A.x1) / 2, cy = A.y1 - 1;
  for (let ty = A.y0; ty <= A.y1; ty++) for (let tx = A.x0; tx <= A.x1; tx++) { if (solidAt(tx, ty) || furnAt(f, tx, ty)) continue; const d = Math.abs(tx - cx) + Math.abs(ty - cy) * 1.5; if (d < bd) { bd = d; best = [tx, ty]; } }
  setLayer(old); return best;
}
function staffSpawn(bi) {
  const b = BLD[bi], plans = PLANS[bi] || [], out = [];
  plans.forEach((p, f) => { const A = p && p.store; if (!A) return; const o = staffOutfit(b, f, A.use); if (!o) return; const t = staffSpot(f, A, p.counter); if (!t) return;
    const gi = cityGuardSlot(), g = makeGuard({ kind: 'civ', at: t, fl: f, radio: false }, gi);
    g.evt = '__staff'; g.staff = o; g.shopA = A; g.shopB = bi; g.shopF = f; g.outfit = o; g.fl = f; g.homeFl = f; g.x = tc(t[0]); g.y = tc(t[1]); g.route = t[2] ? [{ x: g.x, y: g.y, pause: 999 }] : [{ x: g.x, y: g.y, pause: 6 }, { x: g.x + (t[0] > A.x0 ? -TILE : TILE), y: g.y, pause: 4 }]; g.ri = 0; g.a = Math.PI / 2;
    placeGuard(g, gi); out.push(g); });
  if (PR && out.length) prWarm(out.map(charOf), true);
  return out;
}
function staffUpdate(dt) {
  if (!STAGE.cityLife || !S.staffB || (S.staffT -= dt) > 0) return; S.staffT = 0.5; const P = S.player; staffTalk(dt); civTalkUpdate();   // 나가며 인사가 일꾼을 들여보내기 전에
  // 실내는 들어가야 보인다: 내가 들어간 건물에만 일꾼을 세우고, 나오면 들여보낸다 (바깥 사람 수·목격자 수는 그대로)
  const inB = P.z ? -1 : bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
  for (const [bi, have] of S.staffB) if (bi !== inB) { for (const g of have) if (!g.off && g.evt === '__staff') { if (npcAlive(g)) evGone(g); else g.keep = false; } S.staffB.delete(bi); }
  if (inB >= 0 && PLANS[inB] && !BLD[inB].vacant && !S.staffB.has(inB)) S.staffB.set(inB, staffSpawn(inB));
}
// 직원 대사 (대사집 47zt0): 상황이 맞을 때만 —
//  · 들어옴: 내가 그 층 매장 안으로 들어섰을 때 (엘리베이터 문·계단 앞은 매장이 아니다 — 지나가는 길)
//  · 가까이: 매장 안에서 그 직원 곁에 1초 넘게 멈춰 있을 때만 일 얘기 ("라면 드릴까요?")
//  · 나감: 매장에 있다가 나갈 때 · 무기: 매장 안에서 총·칼을 꺼내 들었을 때 (겁먹고 뒤로)
function staffInShop(g) {
  const P = S.player, A = g.shopA; if (!A || P.car || P.z || flOf(P) !== g.shopF) return false; const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  if (tx < A.x0 || tx > A.x1 || ty < A.y0 || ty > A.y1) return false;
  const D = S.elevs?.get(g.shopB)?.door; if (D && dist(P.x, P.y, D.x, D.y) < 52) return false;
  const st = PLANS[g.shopB]?.[g.shopF]?.stair; if (st && dist(P.x, P.y, tc(st[0]), tc(st[1])) < 56) return false;
  return true;
}
function staffTalk(dt) {
  const P = S.player, armed = (typeof wpnOn === 'function' && wpnOn()) || (typeof knifeOn === 'function' && knifeOn());
  for (const list of S.staffB.values()) for (const g of list) {
    if (!npcAlive(g) || g.off || g.state !== 'PATROL') continue; const inn = staffInShop(g), d = dist(g.x, g.y, P.x, P.y);
    if (inn && !g.custIn) { g.custIn = S.t; g.stillT = 0; if (!g.greetT || S.t - g.greetT > 25) { g.greetT = S.t; saysLine(g, g.staff, 'greet'); } }
    else if (!inn && g.custIn) { if (S.t - g.custIn > 2 && !g.scared && (!g.byeT || S.t - g.byeT > 25)) { g.byeT = S.t; saysLine(g, g.staff, 'bye'); } g.custIn = 0; }
    if (!inn) continue;
    if (armed && !g.scared) { g.scared = true; saysLine(g, g.staff, 'weapon', 2.6); g.want = Math.atan2(P.y - g.y, P.x - g.x); continue; }
    if (!armed) g.scared = false;
    g.stillT = d < 80 && !P.moving ? (g.stillT || 0) + 0.5 : 0;   // staffUpdate는 0.5초마다
    if (g.stillT >= 1 && (!g.nearT || S.t - g.nearT > 12)) { g.nearT = S.t; g.want = Math.atan2(P.y - g.y, P.x - g.x); saysLine(g, g.staff, 'near'); }
  }
}
