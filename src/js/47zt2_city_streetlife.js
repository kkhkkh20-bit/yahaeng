// ---------------------------------------------------------------- 자유 모드 거리 사람들 (을지로 밤거리처럼)
// · 같이 걷는 사람: 블록을 도는 행인 몇은 친구·연인과 나란히 걷는다 (짝은 앞사람 옆에 붙어 따라간다)
// · 걸음이 다른 사람: 휴대폰 보며 천천히 걷는 사람(화면 불빛), 지팡이 짚은 노인은 더 천천히, 청계천 산책로엔 뛰는 사람
// · 가게 앞: 내 둘레의 호프·포차·골뱅이집 앞엔 담배 피우며 떠드는 손님 둘, 가끔 가게 앞에 선 배달 기사, 편의점 앞엔 휴대폰 보는 사람
//   (가게 직원처럼 가까이 가면 세우고 멀어지면 들여보낸다 — 거리 전체 인원은 거의 그대로)
// · 비: 우산을 쓴 사람이 많아지고, 우산 없는 사람은 걸음을 재촉한다
// 무작위는 게임 시드 난수를 쓰지 않는다 (사람 번호로 정한다 — 다른 장면이 바뀌지 않게)
const LIFE_K = id => ((((id | 0) + 7) * 2654435761) >>> 0) % 100;
const FRONT_R = 900, FRONT_DROP = 1500, FRONT_MAX = 4;
const FOOD_RE = /호프|포차|골뱅이|노가리|곱창|치킨|주점|국밥|순댓국|백반|분식|족발|횟집|반점/, CS_RE = /편의점|마트|슈퍼/;
function streetLifeInit() {
  if (!STAGE.cityLife) return; const L = S.life = { t: 0, fronts: new Map(), grp: [], cands: [] };
  const R = STAGE.river, ry0 = R ? (R.y - 1) * TILE : -1e9, ry1 = R ? (R.y + R.rows) * TILE : -1e9;
  const plain = g => g.civ && !g.evt && !g.dog && !g.child && !g.staff && !g.police && !g.crew && !g.wander && !g.student && !g.outfit && g.route && g.route.length >= 2;
  const rings = [];
  for (const g of S.guards) { if (!plain(g)) continue; const k = LIFE_K(g.id);
    if (g.route.every(p => p.y >= ry0 && p.y <= ry1)) { if (k % 2 === 0) { g.jogger = true; g.spdB = 2.1; } continue; }   // 청계천 산책로: 둘 중 하나는 뛴다
    if (g.body === 'old') g.spdB = 0.62;                                   // 노인: 지팡이 짚고 천천히
    else if (k < 16) { g.phone = true; g.spdB = 0.72; }                    // 휴대폰 보며 걷는 사람
    g.umb = k % 10 < 6;                                                     // 비 올 때 우산 (열에 여섯)
    if (g.route.length === 4) rings.push(g); }
  // 같이 걷기: 블록 도는 사람 넷 중 하나는 짝을 데리고 (짝은 원래 다른 길을 돌던 사람이라 전체 인원은 같다)
  for (let i = 0; i + 1 < rings.length; i += 4) { const A = rings[i], C = rings[i + 1]; if (C.phone || A.body === 'old' || C.body === 'old') continue;
    C.grp = { L: A, side: ((i >> 2) & 1) ? 1 : -1 }; C.spdB = A.spdB || 1; C.umb = A.umb; C.wait = 999; C.still = true; groupSnap(C); L.grp.push(C); }
  // 길 건너는 행인: 짝 없는 블록 행인 몇은 모퉁이에서 옆 블록 모퉁이까지 횡단보도로 건넜다 돌아온다 (빨간불엔 연석에서 기다린다 — pedWaits)
  for (let i = 2; i < rings.length; i += 4) { const g = rings[i]; if (g.grp || g.phone || LIFE_K(g.id) % 2) continue;
    const T = g.route.map(p => [Math.floor(p.x / TILE), Math.floor(p.y / TILE)]); let ci = 0; T.forEach(([x, y], j) => { if (x - y > T[ci][0] - T[ci][1]) ci = j; });   // 오른쪽 위 모퉁이
    const [cx, cy] = T[ci]; let nb = null; for (const dx of [5, -5]) { const nx = (dx > 0 ? cx : T.reduce((a, t) => t[0] < a[0] ? t : a, T[0])[0]) + dx, ny = cy; if (inMap(nx, ny) && G0[ny][nx] === '=' && bldAt(nx, ny) < 0) { nb = { x: tc(nx), y: tc(ny), at: dx > 0 ? ci : T.findIndex(t => t[0] === nx - dx && t[1] === ny) }; break; } }
    if (!nb || nb.at < 0) continue; const R = g.route, c = R[nb.at];
    g.route = R.slice(0, nb.at + 1).concat([{ x: nb.x, y: nb.y, pause: 1.5 }, { x: c.x, y: c.y, pause: 0.3 }], R.slice(nb.at + 1)); g.crosser = true; }
  L.vend = new Map(); L.trash = []; L.bags = []; L.trashT = 8;
  // 가게 앞 자리: 1층이 술집·식당이거나 편의점인 건물
  BLD.forEach((b, bi) => { if (b.kind !== 'shop' || b.vacant) return; const s = (b.signs?.[0] || '').trim(); const kind = FOOD_RE.test(s) ? 'food' : CS_RE.test(s) ? 'cs' : null; if (!kind) return;
    const p = shopFront(b); if (p) L.cands.push({ bi, kind, x: p.x, y: p.y }); });
  L.tcands = []; BLD.forEach((b, bi) => { if (b.kind !== 'shop' || b.vacant || !(b.signs?.[0] || '').trim()) return; const p = shopFront(b); if (p) L.tcands.push({ bi, x: p.x, y: p.y }); });   // 쓰레기 내놓는 가게: 간판 단 1층 가게 모두
}
// 짝: 앞사람 옆(어깨 너비)에 붙인다. 앞사람이 멈추면(대화·신호) 같이 멈춘다
// 옆자리가 벽·건물이면 반대편으로, 그것도 막혔으면 한 걸음 뒤에 (짝이 벽 속에 그려지던 것)
function groupSnap(C) { const o = C.grp, A = o.L, a = A.a || 0, free = (x, y) => !solidAt(Math.floor(x / TILE), Math.floor(y / TILE));
  let x = A.x, y = A.y;
  for (const s of [o.side * 22, -o.side * 22]) { const px = A.x + Math.cos(a + Math.PI / 2) * s - Math.cos(a) * 4, py = A.y + Math.sin(a + Math.PI / 2) * s - Math.sin(a) * 4; if (free(px, py)) { x = px; y = py; break; } x = null; }
  if (x == null) { x = A.x - Math.cos(a) * 26; y = A.y - Math.sin(a) * 26; if (!free(x, y)) { x = A.x; y = A.y; } }
  C.x = x; C.y = y; C.a = C.want = a; C.moving = A.moving; C.fl = A.fl; C.z = A.z || 0; }
function groupRelease(C) { const A = C.grp?.L; C.grp = null; C.wait = 0; C.still = false; C.path = null;
  if (A && A.route?.length) { C.route = A.route.map(p => ({ x: p.x, y: p.y, pause: p.pause })); C.ri = A.ri || 0; } }
function lifeGroups() {
  const G = S.life?.grp; if (!G?.length) return;
  for (let i = G.length - 1; i >= 0; i--) { const C = G[i], A = C.grp?.L;
    const ok = C.grp && A && npcAlive(A) && npcAlive(C) && !A.off && !C.off && A.state === 'PATROL' && C.state === 'PATROL' && flOf(A) === flOf(C) && !C.chat?.with?.grp
      && dist(C.x, C.y, A.x, A.y) < 90;   // 누가 짝을 옮겼거나(사건·시험) 떨어졌으면 각자 걷는다
    if (!ok) { if (C.grp) groupRelease(C); G.splice(i, 1); continue; }
    groupSnap(C); }
}
// 가게 앞 사람들: 가까운 가게 앞에 화면 밖일 때 세우고, 멀어지면 들여보낸다
function frontSpawn(c) {
  const out = [], put = (x, y, a, o = {}) => { const gi = cityGuardSlot(), g = makeGuard(Object.assign({ kind: 'civ', at: [Math.floor(x / TILE), Math.floor(y / TILE)], radio: false }, o.body ? { body: o.body } : {}), gi);
    g.evt = '__front'; g.x = x; g.y = y; g.fl = 0; g.a = g.want = a; g.post = a; g.route = [{ x, y, pause: 999 }]; g.ri = 0; g.wait = 999; placeGuard(g, gi); out.push(g); return g; };
  const k = LIFE_K(c.bi);
  if (c.kind === 'food') {
    const s = put(c.x - 20, c.y + 6, 0); s.smoker = true; s.idleT = 1 + (k % 4);        // 담배 피우는 손님 (가끔 한 모금)
    const t = put(c.x + 20, c.y + 6, Math.PI); t.chatter = true;                          // 맞은편에서 떠드는 일행
    if (k % 3 === 0) { const r = put(c.x + 66, c.y + 30, -Math.PI / 2, { body: 'helmet' }); r.outfit = 'courier'; r.phone = true; }   // 가게 앞에서 기다리는 배달 기사
  } else { const p = put(c.x + 30, c.y + 10, -Math.PI / 2); p.phone = true; }             // 편의점 앞: 휴대폰 보는 사람
  if (PR && out.length) prWarm(out.map(charOf), true);
  return out;
}
function lifeFronts() {
  const L = S.life, P = S.player;
  for (const [bi, f] of L.fronts) if (dist(f.c.x, f.c.y, P.x, P.y) > FRONT_DROP) { for (const g of f.gs) if (!g.off && npcAlive(g)) evGone(g); L.fronts.delete(bi); }
  if (L.fronts.size >= FRONT_MAX || flOf(P) || S.wanted >= 3) return;
  let best = null, bd = FRONT_R;
  for (const c of L.cands) { if (L.fronts.has(c.bi) || BLD[c.bi].collapsed) continue; const d = dist(c.x, c.y, P.x, P.y); if (d < bd && (L.jump || !inView(c.x, c.y, 80))) { bd = d; best = c; } }
  if (best) L.fronts.set(best.bi, { c: best, gs: frontSpawn(best) });
  if (best && L.jump && L.fronts.size < FRONT_MAX) lifeFronts();   // 막 도착했으면 둘레 가게 앞을 한꺼번에
}
// 걸음 빠르기: 사람마다 기본 + 비 올 때 우산 없는 사람은 재촉 (guards.js 순찰 속도에 g.spdK 를 곱한다)
function lifePace() {
  const rain = rainK() > 0.3;
  for (const g of S.guards) { if (!g.civ || g.off || g.evt) continue; const b = g.spdB || 1;
    g.spdK = rain && !g.umb && !g.jogger && g.body !== 'old' ? b * 1.35 : b; }
}
// 내 둘레 인파: 멀리(화면 밖 2600px 넘게) 블록을 돌던 행인 몇을 내 둘레 블록 둘레로 옮긴다 (화면 밖 자리에, 짝과 함께). 전체 인원은 그대로
const ROAM_R = 1600, ROAM_WANT = 18;
function lifeRoam() {
  const P = S.player, B0 = STAGE.blockOrigin, BS = STAGE.blockSize, [BX, BY] = STAGE.blockCount || [0, 0]; if (!B0 || !BS || flOf(P)) return;
  const ring = g => g.civ && !g.evt && !g.grp && !g.dog && !g.child && !g.staff && !g.police && !g.crew && !g.wander && !g.student && !g.outfit && g.route?.length === 4 && g.state === 'PATROL' && !g.off && !flOf(g);
  let near = 0; const far = [];
  for (const g of S.guards) { if (!ring(g)) continue; const d = dist(g.x, g.y, P.x, P.y); if (d < ROAM_R) near++; else if (d > 2600 && !inView(g.x, g.y, 200)) far.push(g); }
  if (near >= ROAM_WANT || !far.length) return;
  const mates = new Map(S.life.grp.map(C => [C.grp.L, C]));
  // 내 둘레 3×3 블록 중 하나 (번갈아)
  let pbx = 0, pby = 0, bd = 1e9; for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) { const [x0, y0] = B0(bx, by), cx = (x0 + BS / 2) * TILE, cy = (y0 + BS / 2) * TILE, d = dist(cx, cy, P.x, P.y); if (d < bd) { bd = d; pbx = bx; pby = by; } }
  for (let k = 0; k < (S.life.jump ? 6 : 2) && far.length; k++) {   // 막 도착했으면 한꺼번에
    const n = (S.life.roamN = (S.life.roamN || 0) + 1), bx = Math.max(0, Math.min(BX - 1, pbx + (n % 3) - 1)), by = Math.max(0, Math.min(BY - 1, pby + ((n / 3 | 0) % 3) - 1));
    const [x0, y0] = B0(bx, by), e = BS - 1, cs = [[x0, y0], [x0 + e, y0], [x0 + e, y0 + e], [x0, y0 + e]], route = (n % 2 ? cs.slice().reverse() : cs).map(([a, b]) => ({ x: tc(a), y: tc(b), pause: 0.5 }));
    // 화면 밖이고 너무 가깝지 않은 둘레 위 자리 (모서리 사이 가운데도 본다)
    const spots = []; route.forEach((p, i) => { const q = route[(i + 1) % 4]; spots.push({ x: p.x, y: p.y, ri: (i + 1) % 4 }, { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, ri: (i + 1) % 4 }); });
    const at = spots.filter(p => !inView(p.x, p.y, 120) && dist(p.x, p.y, P.x, P.y) > 550).sort((p, q) => dist(p.x, p.y, P.x, P.y) - dist(q.x, q.y, P.x, P.y))[0]; if (!at) continue;   // 화면 밖에서 가장 가까운 자리
    const g = far.pop(); g.route = route; g.ri = at.ri; g.x = at.x; g.y = at.y; g.path = null; g.wait = 0; if (g.chat) { const o = g.chat.with; g.chat = null; g.say = null; if (o?.chat?.with === g) { o.chat = null; o.say = null; } }   /* endChat 은 게임 난수를 쓴다: 직접 끊는다 */
    const C = mates.get(g); if (C) groupSnap(C); }
}
// 노점: 내 둘레 술집·식당 거리의 연석에 손수레(떡볶이·붕어빵·어묵) 하나와 장사하는 사람. 화면 밖일 때 세우고, 멀어지면 걷는다 (둘까지)
const lifeOpen = (tx, ty) => inMap(tx, ty) && '=,g'.includes(G0[ty][tx]) && bldAt(tx, ty) < 0 && !solidAt(tx, ty);   // 가게 앞 빈 바닥 (보도·마당·풀밭)
const VEND_MAX = 2, VEND_KIND = ['떡볶이', '붕어빵', '어묵'];
function lifeVendors() {
  const L = S.life, P = S.player;
  for (const [bi, v] of L.vend) if (dist(v.x, v.y, P.x, P.y) > 1700 || !npcAlive(v.g) || v.g.off) { if (npcAlive(v.g) && !v.g.off) evGone(v.g); L.vend.delete(bi); }
  if (L.vend.size >= VEND_MAX || flOf(P) || S.wanted >= 2) return;
  for (const c of L.cands) { if (c.kind !== 'food' || LIFE_K(c.bi) % 3 || L.vend.has(c.bi)) continue;
    const x = c.x + 110, y = c.y + 12; if (dist(x, y, P.x, P.y) > 1100 || (!L.jump && inView(x, y, 100))) continue;   // 가게 문 옆 연석 (문 앞 손님 자리와 겹치지 않게)
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); if (!lifeOpen(tx, ty)) continue;
    const gi = cityGuardSlot(), g = makeGuard({ kind: 'civ', at: [tx, ty], radio: false, body: LIFE_K(c.bi) % 2 ? 'old' : 'workApron' }, gi);
    g.evt = '__vendor'; g.x = x; g.y = y - 6; g.fl = 0; g.a = g.want = Math.PI / 2; g.post = g.a; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.ri = 0; g.wait = 999; g.chatter = true;
    g.vendor = VEND_KIND[LIFE_K(c.bi + 7) % VEND_KIND.length]; placeGuard(g, gi); if (PR) prWarm([charOf(g)], true);
    L.vend.set(c.bi, { g, x, y }); if (L.vend.size >= VEND_MAX) break; }
}
// 쓰레기 내놓기: 가끔 내 둘레 식당·편의점 문에서 직원이 상자를 들고 나와 연석에 내려놓고 들어간다
function lifeTrash() {
  const L = S.life, P = S.player;
  for (let i = L.trash.length - 1; i >= 0; i--) { const t = L.trash[i], g = t.g;
    if (!npcAlive(g) || g.off || g.state !== 'PATROL' || S.t - t.t0 > 40) { if (npcAlive(g) && !g.off && g.state === 'PATROL') evGone(g); L.trash.splice(i, 1); continue; }   // 놀라 달아난 직원은 그대로 둔다(보통 행인처럼)
    if (t.ph === 0 && dist(g.x, g.y, t.cx, t.cy) < 14) { t.ph = 1; g.carryTo = null; L.bags.push({ x: t.cx + (LIFE_K(g.id) % 3 - 1) * 8, y: t.cy + 4, t: S.t, k: LIFE_K(g.id) % 2 }); if (L.bags.length > 24) L.bags.shift(); }
    else if (t.ph === 1 && dist(g.x, g.y, t.dx, t.dy) < 14) { evGone(g); L.trash.splice(i, 1); } }   // 다시 가게로 들어갔다
  if ((L.trashT -= 0.5) > 0 || L.trash.length || flOf(P) || S.wanted || S.ev) return;   // 동네 사건 중엔 내놓지 않는다 (경찰·행인 반응에 끼어들지 않게) L.trashT = 3;   // 알맞은 가게가 없으면 곧 다시 본다
  const spot = c => [-70, 70, -44, 44].map(dx => [c.x + dx, c.y + 16]).find(([x, y]) => lifeOpen(Math.floor(x / TILE), Math.floor(y / TILE)));
  const c = (L.tcands || []).filter(c => !BLD[c.bi].collapsed && dist(c.x, c.y, P.x, P.y) < 900 && dist(c.x, c.y, P.x, P.y) > 260 && spot(c))
    .sort((a, b) => LIFE_K(a.bi + (S.t | 0)) - LIFE_K(b.bi + (S.t | 0)))[0]; if (!c) return;
  L.trashT = 18 + (S.t % 7); const [cx, cy] = spot(c);
  const gi = cityGuardSlot(), g = makeGuard({ kind: 'civ', at: [Math.floor(c.x / TILE), Math.floor(c.y / TILE)], radio: false }, gi);
  g.evt = '__trash'; g.outfit = 'staff'; g.x = c.x; g.y = c.y - 10; g.fl = 0; g.route = [{ x: g.x, y: g.y, pause: 0 }, { x: cx, y: cy, pause: 1.2 }, { x: c.x, y: c.y - 10, pause: 999 }]; g.ri = 1; g.wait = 0; g.carryTo = 1; placeGuard(g, gi);
  if (PR) prWarm([charOf(g)], true); L.trash.push({ g, ph: 0, cx, cy, dx: c.x, dy: c.y - 10, t0: S.t });
}
function streetLifeUpdate(dt) {
  const L = S.life; if (!STAGE.cityLife || !L) return;
  lifeGroups();
  if ((L.t -= dt) > 0) return; L.t = 0.5;
  const P = S.player, jump = L.lp && dist(L.lp.x, L.lp.y, P.x, P.y) > 600; L.lp = { x: P.x, y: P.y }; L.jump = jump;   // 순간이동(병원·엘리베이터·집): 그 둘레는 화면 안이라도 바로 채운다
  lifeFronts(); lifePace(); lifeVendors(); lifeTrash();
  if ((L.roamT = (L.roamT || 0) - 0.5) <= 0 || jump) { L.roamT = 2; lifeRoam(); }
}
// ---- 그림: 우산(비 올 때) · 휴대폰 불빛 (사람 위에 작은 도트)
const UMB_ART = (() => { const rows = ['....#######....', '..###########..', '.#############.', '###############', '#.#.#.#.#.#.#.#'], cols = ['#1d2840', '#222226', '#c8d6e2', '#7a2630', '#2f4a34'];
  return cols.map(col => { const c = document.createElement('canvas'); c.width = 15; c.height = 12; const x = c.getContext('2d'); x.fillStyle = col;
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') x.fillRect(i, y, 1, 1); });
    x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(4, 1, 5, 1);   // 윗면 반사
    x.fillStyle = '#3a3a40'; x.fillRect(7, 5, 1, 6); x.fillRect(6, 10, 1, 1); return c; }); })();
// 노점 손수레 (장사하는 사람 앞, 2px 도트): 바퀴 · 나무 몸통 · 판 위 음식 · 줄무늬 차양 · 김
function drawVendorCart(g) {
  const x = Math.round(g.x), y = Math.round(g.y) + 6, R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  R(-20, 12, 40, 3, 'rgba(0,0,0,.35)');                                                   // 그림자
  R(-16, 10, 6, 6, '#1c1c20'); R(10, 10, 6, 6, '#1c1c20'); R(-14, 12, 2, 2, '#55565c'); R(12, 12, 2, 2, '#55565c');   // 바퀴
  R(-19, -4, 38, 14, '#7a4a28'); R(-19, 6, 38, 4, '#5a3418'); R(-19, -4, 38, 2, '#9a6a3c');   // 나무 몸통
  R(-20, -8, 40, 4, '#b9b3a8'); R(-20, -8, 40, 1, '#dcd6ca');                             // 스테인리스 판
  const k = g.vendor;
  if (k === '떡볶이') { R(-14, -11, 16, 4, '#2a2a2e'); for (let i = 0; i < 6; i++) R(-13 + i * 2.5 | 0, -10, 2, 2, i % 2 ? '#e0452a' : '#c8321e'); R(6, -10, 8, 2, '#d8c8a0'); }
  else if (k === '붕어빵') { R(-15, -10, 30, 3, '#3a3a40'); for (let i = 0; i < 4; i++) { R(-13 + i * 7, -12, 5, 3, '#d89a3a'); R(-9 + i * 7, -11, 1, 1, '#a8682a'); } }
  else { R(-14, -11, 18, 4, '#5a5048'); for (let i = 0; i < 5; i++) { R(-12 + i * 3, -16, 1, 6, '#c8a878'); R(-13 + i * 3, -13, 3, 2, '#e8c890'); } R(8, -11, 6, 3, '#e8e2d2'); }
  R(-20, -40, 2, 32, '#3a3a40'); R(18, -40, 2, 32, '#3a3a40');                             // 차양 기둥
  for (let i = 0; i < 10; i++) R(-22 + i * 4.4 | 0, -46, 5, 6, i % 2 ? '#f2efe6' : '#c8322e'); R(-22, -40, 44, 1, 'rgba(0,0,0,.35)');   // 줄무늬 차양 (머리 위)
  const t = S.t + LIFE_K(g.id); for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1, a = 0.35 * (1 - ph); ctx.fillStyle = `rgba(230,236,240,${a.toFixed(2)})`; ctx.fillRect(x - 8 + i * 6 + Math.round(Math.sin(t * 2 + i) * 2), y - 14 - Math.round(ph * 14), 3, 3); }   // 김
  ctx.fillStyle = '#f6e9b8'; ctx.font = '700 8px ' + UI_FONT_FAMILY; ctx.textAlign = 'center'; ctx.fillText(k, x, y + 5);   // 몸통 글자
}
// 내놓은 쓰레기봉투·상자 (연석 위, 1분쯤 지나면 치워진다)
function drawLifeBags() {
  const L = S.life; if (!STAGE.cityLife || !L?.bags?.length || flOf(S.player)) return;
  for (let i = L.bags.length - 1; i >= 0; i--) { const b = L.bags[i]; if (S.t - b.t > 70) { L.bags.splice(i, 1); continue; } if (!inView(b.x, b.y, 30)) continue;
    const x = Math.round(b.x), y = Math.round(b.y), R = (a, c, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + c, w, h); };
    R(-6, 4, 13, 2, 'rgba(0,0,0,.3)');
    if (b.k) { R(-5, -6, 10, 10, '#1e2026'); R(-4, -8, 8, 2, '#1e2026'); R(-1, -10, 2, 2, '#2e3038'); R(-3, -5, 2, 4, '#3a3d46'); }   // 검은 종량제 봉투
    else { R(-6, -5, 12, 9, '#b48a52'); R(-6, -5, 12, 2, '#cfa66a'); R(-1, -5, 2, 9, '#e6dcc4'); } }   // 납작한 상자
}
function drawLifeExtras(g) {
  if (g.vendor && !g.off && npcAlive(g) && !flOf(g)) drawVendorCart(g);
  if (!g.civ || g.off || g.state === 'DEAD' || g.state === 'SLEEP' || flOf(g)) return;
  if (g.umb && rainK() > 0.3 && !g.evt) { const art = UMB_ART[LIFE_K(g.id) % UMB_ART.length]; ctx.save(); ctx.imageSmoothingEnabled = false; if (art === UMB_ART[2]) ctx.globalAlpha = 0.8;
    ctx.drawImage(art, Math.round(g.x - 15), Math.round(g.y - 48), 30, 24); /* 머리 바로 위 (손잡이는 손 높이) */ ctx.restore(); }
  else if (g.phone && (g.moving || g.evt === '__front')) { const hx = Math.round(g.x + Math.cos(g.a || 0) * 7), hy = Math.round(g.y - 24);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(120,200,255,.22)'; ctx.fillRect(hx - 4, hy - 9, 9, 9); ctx.restore();
    ctx.fillStyle = '#bfefff'; ctx.fillRect(hx - 1, hy - 2, 2, 3); }
}
if (typeof drawGuard === 'function') { const _dg = drawGuard; drawGuard = function (g) { const r = _dg(g); if (STAGE.cityLife) drawLifeExtras(g); return r; }; }
if (typeof drawCarScorch === 'function') { const _dc = drawCarScorch; drawCarScorch = function () { _dc(); drawLifeBags(); }; }   // 바닥 그림 차례(차보다 먼저)
if (typeof staffInit === 'function') { const _si = staffInit; staffInit = function () { _si(); streetLifeInit(); }; }
if (typeof staffUpdate === 'function') { const _su = staffUpdate; staffUpdate = function (dt) { _su(dt); streetLifeUpdate(dt); }; }
