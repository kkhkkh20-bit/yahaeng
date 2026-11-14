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
  plans.forEach((p, f) => { const A = p && p.store; if (!A || (typeof floorOpen === 'function' && !floorOpen(b, f))) return; const o = staffOutfit(b, f, A.use);   /* 문 닫은 층(47zy 밤 시계)엔 아무도 없다 */ if (!o) return; const t = staffSpot(f, A, p.counter); if (!t) return;
    const gi = cityGuardSlot(), g = makeGuard({ kind: 'civ', at: t, fl: f, radio: false }, gi);
    g.evt = '__staff'; g.staff = o; g.shopA = A; g.shopB = bi; g.shopF = f; g.outfit = o; g.fl = f; g.homeFl = f; g.x = tc(t[0]); g.y = tc(t[1]); g.route = t[2] ? [{ x: g.x, y: g.y, pause: 999 }] : [{ x: g.x, y: g.y, pause: 6 }, { x: g.x + (t[0] > A.x0 ? -TILE : TILE), y: g.y, pause: 4 }]; g.ri = 0; g.a = Math.PI / 2;
    placeGuard(g, gi); out.push(g); });
  plans.forEach((p, f) => { const A = p && p.store; if (A && (typeof floorOpen !== 'function' || floorOpen(b, f))) for (const g of castSpawn(b, bi, f, A, p)) out.push(g); });
  if (PR && out.length) prWarm(out.map(charOf), true);
  return out;
}
// 손님이 설 자리: 가구 바로 아래(앞) 칸 중 걸을 수 있는 곳 (계산대 뒤·엘리베이터 문 앞은 빼고)
function shopperSpots(f, A, C) {
  const old = CUR_F; setLayer(f); const out = [];
  for (let ty = A.y0 + 1; ty <= A.y1; ty++) for (let tx = A.x0; tx <= A.x1; tx++) {
    if (solidAt(tx, ty) || furnAt(f, tx, ty) || !furnAt(f, tx, ty - 1)) continue; if (C && ty === C.y - 1 && tx >= C.x - 1 && tx <= C.x + 2) continue;
    if (tx === A.x0 && ty <= A.y0 + 1) continue; out.push([tx, ty]); }
  setLayer(old); return out;
}
function staffUpdate(dt) {
  if (!STAGE.cityLife || !S.staffB || (S.staffT -= dt) > 0) return; S.staffT = 0.5; const P = S.player; staffTalk(dt); civTalkUpdate(); villainTalk();   // 나가며 인사가 일꾼을 들여보내기 전에
  // 실내는 들어가야 보인다: 내가 들어간 건물에만 일꾼을 세우고, 나오면 들여보낸다 (바깥 사람 수·목격자 수는 그대로)
  const inB = P.z ? -1 : bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
  for (const [bi, have] of S.staffB) if (bi !== inB && !have.some(g => g.state === 'CAPTIVE')) {   /* 붙잡혀 끌려 나온 직원이 있으면 풀려날 때까지 기다린다 */ for (const g of have) if (!g.off && g.evt === '__staff') { if (npcAlive(g)) evGone(g); else g.keep = false; } S.staffB.delete(bi); }
  if (inB >= 0 && PLANS[inB] && !BLD[inB].vacant && !S.staffB.has(inB)) S.staffB.set(inB, staffSpawn(inB));
}
// 직원 대사 (대사집 47zt0): 상황이 맞을 때만 —
//  · 들어옴: 내가 그 층 매장 안으로 들어섰을 때 (엘리베이터 문·계단 앞은 매장이 아니다 — 지나가는 길)
//  · 가까이: 매장 안에서 그 직원 곁에 1초 넘게 멈춰 있을 때만 일 얘기 ("라면 드릴까요?")
//  · 나감: 매장에 있다가 나갈 때 · 무기: 매장 안에서 총·칼을 꺼내 들었을 때 (겁먹고 뒤로)
function staffInShop(g) {
  const P = S.player, A = g.shopA; if (!A || P.car || P.z || P.hide || flOf(P) !== g.shopF) return false; const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  if (tx < A.x0 || tx > A.x1 || ty < A.y0 || ty > A.y1) return false;
  const D = S.elevs?.get(g.shopB)?.door; if (D && dist(P.x, P.y, D.x, D.y) < 52) return false;
  const st = PLANS[g.shopB]?.[g.shopF]?.stair; if (st && dist(P.x, P.y, tc(st[0]), tc(st[1])) < 56) return false;
  return true;
}
function staffTalk(dt) {
  const P = S.player, armed = (typeof wpnOn === 'function' && wpnOn()) || (typeof knifeOn === 'function' && knifeOn());
  for (const list of S.staffB.values()) for (const g of list) {
    if (!g.staff || !npcAlive(g) || g.off || g.state !== 'PATROL') continue; const inn = staffInShop(g), d = dist(g.x, g.y, P.x, P.y);
    if (inn && !g.custIn) { g.custIn = S.t; g.stillT = 0; if (!g.greetT || S.t - g.greetT > 25) { g.greetT = S.t; saysLine(g, g.staff, 'greet'); } }
    else if (!inn && g.custIn) { if (S.t - g.custIn > 2 && !g.scared && (!g.byeT || S.t - g.byeT > 25)) { g.byeT = S.t; saysLine(g, g.staff, 'bye'); } g.custIn = 0; }
    if (!inn) continue;
    if (armed && !g.scared) { g.scared = true; saysLine(g, g.staff, 'weapon', 2.6); g.want = Math.atan2(P.y - g.y, P.x - g.x); continue; }
    if (!armed) g.scared = false;
    g.stillT = d < 80 && !P.moving ? (g.stillT || 0) + 0.5 : 0;   // staffUpdate는 0.5초마다
    if (g.stillT >= 1 && (!g.nearT || S.t - g.nearT > 12)) { g.nearT = S.t; g.want = Math.atan2(P.y - g.y, P.x - g.x); saysLine(g, g.staff, 'near'); }
    else if (d > 120 && S.t - Math.max(g.custIn, g.nearT || 0, g.idleT || 0) > 18) { g.idleT = S.t; saysLine(g, g.staff, 'idle', 2.4); }   // 손님이 멀리 둘러보는 동안 혼잣말
  }
}
// ---- 가게마다 '누가 어떻게 있는가' (실제 동네처럼): 가구를 보고 사람을 앉히고 세운다. 무작위 없이 가구 순서로 고른다.
//  식당·호프: 식탁 의자에 손님 · PC방: 컴퓨터 앞 의자에 게이머 · 학원: 책상에 학생 · 사무실: 책상에 직원 · 노래방: 소파에 손님
//  당구장: 당구대 옆에서 큐를 겨누는 둘 · 헬스장: 러닝머신 위 · 랙 앞 · 미용실: 의자에 앉은 손님
//  편의점·철물: 진열대 앞에서 물건을 보는 손님(손 뻗기) · 약국: 계산대 앞에서 약사와 이야기하는 어르신
const SEATS = new Set(['chair', 'chairD', 'sofa', 'sofaV']), FACES = new Set(['table', 'tableS', 'pc', 'desk', 'desk2', 'board', 'kscreen', 'counter']);
function castSpawn(b, bi, f, A, p) {
  const use = A.use, sign = (b.signs || [])[f] || '', items = FURN.filter(it => (it.fl || 0) === f && it.x >= A.x0 - 1 && it.x <= A.x1 + 1 && it.y >= A.y0 && it.y <= A.y1);
  const at = (tx, ty) => items.find(it => tx >= it.x && tx < it.x + it.w && ty >= it.y && ty < it.y + it.h);
  const faceOf = (tx, ty) => { for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const it = at(tx + dx, ty + dy); if (it && FACES.has(it.t)) return Math.atan2(dy, dx); } return -Math.PI / 2; };
  const people = [], put = (tx, ty, o) => people.push(Object.assign({ tx, ty }, o));
  const seats = items.filter(it => SEATS.has(it.t)), pick = (L, every) => L.filter((_, i) => i % every === 0);
  if (['food', 'pc', 'academy', 'office', 'karaoke'].includes(use) || /미용|헤어/.test(sign)) {   // 앉은 사람
    const every = use === 'office' ? 2 : use === 'karaoke' ? 2 : use === 'food' ? 2 : 1; let n = 0, max = use === 'karaoke' ? 3 : 8;
    for (const it of pick(seats, every)) { if (n++ >= max) break; put(it.x, it.y, { seat: true, a: faceOf(it.x, it.y) }); } }
  if (use === 'billiards') { let k = 0; for (const it of items.filter(it => it.t === 'pool')) { if (k++ >= 2) break;   // 당구대 양끝에서 겨누는 둘
      for (const [tx, ty] of [[it.x - 1, it.y], [it.x + it.w, it.y + it.h - 1]]) put(tx, ty, { act: 'workLow', a: Math.atan2(it.y - ty, (it.x + it.w / 2) - tx) }); } }
  if (use === 'gym') { let k = 0; for (const it of items.filter(it => it.t === 'tread' || it.t === 'rack')) { if (k++ >= 3) break;
      if (it.t === 'tread') put(it.x, it.y, { jog: true, a: -Math.PI / 2 }); else put(it.x, it.y + it.h, { act: 'workHigh', a: -Math.PI / 2 }); } }
  if (use === 'store') {
    if (/약국/.test(sign) && p.counter) put(p.counter.x, p.counter.y + 1, { body: 'old', talk: true, a: -Math.PI / 2 });   // 약사와 이야기하는 어르신
    const spots = shopperSpots(f, A, p.counter), n = Math.min(3, Math.max(1, Math.floor(spots.length / 4)));
    for (let k = 0; k < n && spots.length; k++) { const s = spots[(k * 7 + 2) % spots.length]; put(s[0], s[1], { act: 'workHigh', a: -Math.PI / 2 }); } }
  const out = [];
  for (const q of people) { if (!inMap(q.tx, q.ty)) continue;
    const gi = cityGuardSlot(), g = makeGuard(Object.assign({ kind: 'civ', at: [q.tx, q.ty], fl: f, radio: false }, q.body ? { body: q.body } : {}), gi);
    g.evt = '__staff'; g.shopper = true; g.shopA = A; g.shopB = bi; g.shopF = f; g.fl = f; g.homeFl = f; g.x = tc(q.tx); g.y = tc(q.ty) - (q.seat ? 6 : 0); g.a = g.want = q.a || 0;
    g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.ri = 0; g.seat = !!q.seat; g.jog = !!q.jog; g.act = q.act || null; if (q.talk) g.chatter = true; placeGuard(g, gi); out.push(g); }
  return out;
}
