// ---------------------------------------------------------------- 세력: 의뢰 조직(A) · 라이벌 건달파(B) · 주민
// 두 조직은 서로 적이다. 마주치면 시비가 붙고(가끔 싸움), '전쟁'이 나면 보는 즉시 싸운다.
// 전쟁은 내가 일으킬 수 있다: 한쪽 옷을 입고 다른 쪽 조직원을 치는 걸 그쪽이 보면 / 싸움에 진 쪽 동료가 시체를 찾으면.
// 조직원은 주민도 해친다: ① 자기들 범행(싸움)을 본 주민을 쫓아가 입막음 ② 자기 구역(출입 금지)에 들어온 주민을 때려 눕힘 ③ 싸움에 휘말림.
// 조직이 해친 주민은 내 감점이 아니다 — 대신 소란이 커져 사람들 눈이 그쪽으로 쏠린다.
OUTFITS.rival = '건달파 점퍼';
OUTFIT_PAL.rival = ['#dba57e', '#141414', '#b3262a', '#1a1a1e', '#e8e8e2']; PR_PAL.rival = OUTFIT_PAL.rival;  // 빨간 점퍼 · 흰 운동화 — 의뢰 조직과 한눈에 갈린다
const FAC_NAME = { A: '조직', B: '건달파' };
const TAUNT = ['어이, 여기가 어디라고 기어 와?', '건달 새끼들이 왜 여기 있어.', '눈 깔아라.', '한판 붙자는 거냐?'];
const TAUNT_B = ['너네 구역이 언제부터 여기였냐?', '어깨 펴고 다니네?', '오늘 좀 맞아 볼래?', '비켜, 우리 길이다.'];
const npcAlive = o => o && o.state !== 'DEAD' && o.state !== 'CAPTIVE' && !o.yank && !o.doomed;
const sameNpcLevel = (a, b) => flOf(a) === flOf(b) && (a.z || 0) === (b.z || 0) && !a.climb && !b.climb;
const npcContact = (a, b, range) => sameNpcLevel(a, b) && dist(a.x, a.y, b.x, b.y) <= range && los(a.x, a.y, b.x, b.y, a.z || 0);
const factionAvoids = (g, o) => g.facAvoid && g.facAvoid.id === o.id && S.t < g.facAvoid.until;
function factionBlocked(g, dt) {
  g.facBlocked = g.moving ? 0 : (g.facBlocked || 0) + dt;
  return g.facBlocked > 2;
}
function endFactionMove(g, other) {
  if (other) g.facAvoid = { id: other.id, until: S.t + 8 };
  g.brawl = g.hunt = g.raid = g.incident = null; g.path = null; g.facBlocked = 0;
  g.state = 'RETURN'; g.moving = false;
}
function rivalTurfRect(b) {
  let r = [Math.max(1, b.x0 - 4), Math.max(1, b.y0 - 3), Math.min(MW - 2, b.x1 + 4), Math.min(MH - 2, b.y1 + 4)];
  const blockers = BLD.filter(o => o !== b).map(o => [o.x0, o.y0, o.x1, o.y1]).concat(S.turf.A);
  const area = a => (a[2] - a[0] + 1) * (a[3] - a[1] + 1);
  for (const q of blockers) {
    if (q[2] < r[0] || q[0] > r[2] || q[3] < r[1] || q[1] > r[3]) continue;
    const options = [];
    if (q[2] < b.x0) options.push([Math.max(r[0], q[2] + 1), r[1], r[2], r[3]]);
    if (q[0] > b.x1) options.push([r[0], r[1], Math.min(r[2], q[0] - 1), r[3]]);
    if (q[3] < b.y0) options.push([r[0], Math.max(r[1], q[3] + 1), r[2], r[3]]);
    if (q[1] > b.y1) options.push([r[0], r[1], r[2], Math.min(r[3], q[1] - 1)]);
    if (!options.length) return null;
    options.sort((a, b) => area(b) - area(a)); r = options[0];
  }
  return r;
}
// 이전 체크포인트도 현재 건물 소속에 맞춘다. NPC 위치·전투 상태는 유지한다.
function syncDynamicTurf() {
  if (!S.turf) return;
  for (const r of S.turf.B || []) {
    if ((STAGE.zones || []).some(z => (z[7] || []).includes('rival') && r.every((v, i) => v === z[i]))) continue;
    const owned = BLD.filter(b => b.gang === 'B' && !b.vacant);
    const b = owned.find(b => b.x0 >= r[0] && b.y0 >= r[1] && b.x1 <= r[2] && b.y1 <= r[3]) || (owned.length === 1 ? owned[0] : null), next = b && rivalTurfRect(b);
    if (!next) continue;
    for (let i = 0; i < 4; i++) r[i] = next[i]; r.dyn = true;
    const L0 = CUR_F; setLayer(0); const pub = [];
    for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++) if (!solidAt(x, y) && bldAt(x, y) < 0 && zoneAt(tc(x), tc(y), 0) === Z_PUB) pub.push({ x: tc(x), y: tc(y) });
    if (pub.length) for (const g of S.guards) if (g.rival && !g.brawl && !g.hunt && ['PATROL', 'RETURN'].includes(g.state) && g.route.some(p => !inTurf('B', p.x, p.y))) {
      g.route = g.route.map(p => inTurf('B', p.x, p.y) ? p : Object.assign({}, p, pub.reduce((a, b) => dist(p.x, p.y, a.x, a.y) < dist(p.x, p.y, b.x, b.y) ? a : b)));
      g.path = null; buildRouteLine(g);
    }
    setLayer(L0);
  }
}
// 라이벌 배치: 구역이 있는 판(의뢰 2~5)에 셋이 한 무리로 거리를 돈다. STAGE.rivals = 0 이면 없음, 숫자면 그만큼
function factionsInit() {
  S.war = false; S.facOn = !!STAGE.zones && !STAGE.tutorial;
  // 판에 적힌 소속: police: true = 경찰(제복) · fac: 'B' = 건달파(빨간 점퍼) · 나머지 조직원은 의뢰 조직(A)
  for (const g of S.guards) { if (g.civ || g.dog) continue; const d = (STAGE._g || [])[g.id];
    if (d && d.police) { g.police = true; g.fac = 'P'; g.outfit = 'police'; g.torch = true; } else { g.fac = (d && d.fac) || 'A'; if (g.fac === 'B') { g.outfit = 'rival'; g.rival = true; } } }
  turfInit();
  if (!S.facOn) return;
  const n = STAGE.rivals != null ? STAGE.rivals : 3; if (!n) return;
  const P = S.player, pubAt = (tx, ty) => tx > 0 && ty > 0 && tx < MW - 1 && ty < MH - 1 && !solidAt(tx, ty) && bldAt(tx, ty) < 0 && zoneAt(tc(tx), tc(ty), 0) === Z_PUB;
  // 건달파 구역: 조직(A) 사람들이 다니는 길에서 가장 먼 건물 하나와 그 둘레 거리. 거기서만 돈다
  const aPts = []; for (const g of S.guards) if (g.fac === 'A' && !g.civ && !g.dog) { aPts.push([g.x, g.y]); for (const p of g.route || []) aPts.push([p.x, p.y]); }
  let best = null, bs = -1;
  BLD.forEach((b, bi) => { if (b.gang || b.piloti || b.vacant || (STAGE.rivalBuilding != null && bi !== STAGE.rivalBuilding)) return; const cx = (b.x0 + b.x1 + 1) / 2 * TILE, cy = (b.y0 + b.y1 + 1) / 2 * TILE; if (STAGE.rivalBuilding == null && dist(cx, cy, P.x, P.y) < 600) return;
    if ((S.items || []).some(it => bldAt(Math.floor(it.x / TILE), Math.floor(it.y / TILE)) === BLD.indexOf(b)) || S.guards.some(g => g.target && bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)) === BLD.indexOf(b))) return;
    const sc = aPts.length ? Math.min(...aPts.map(([x, y]) => dist(cx, cy, x, y))) : 9999; if (sc > bs) { bs = sc; best = b; } });
  if (!best) return;
  const rect = rivalTurfRect(best), pub = []; if (!rect) return;
  const rivalPubAt = (x, y) => x >= rect[0] && x <= rect[2] && y >= rect[1] && y <= rect[3] && pubAt(x, y);
  for (let ty = rect[1]; ty <= rect[3]; ty++) for (let tx = rect[0]; tx <= rect[2]; tx++) if (pubAt(tx, ty)) pub.push([tx, ty]);
  if (pub.length < 8) return;
  best.gang = 'B'; rect.dyn = true; S.turf.B.push(rect);
  const pick = (arr, k) => arr[(k * 7919 + S.guards.length * 31) % arr.length];
  const a = pick(pub, 1), wps = [a];
  for (let k = 2; wps.length < 3 && k < 60; k++) { const c = pick(pub, k * 13); if (wps.every(w => Math.hypot(w[0] - c[0], w[1] - c[1]) > 4)) wps.push(c); }
  for (let i = 0; i < n; i++) {
    const off = [[0, 0], [1, 0], [0, 1], [-1, 0]][i % 4], sx = a[0] + off[0], sy = a[1] + off[1], st = rivalPubAt(sx, sy) ? [sx, sy] : a;
    const g = makeGuard({ kind: i === 0 ? 'g2' : 'g1', at: st, route: wps.map((w, j) => [w[0] + (j && rivalPubAt(w[0] + off[0], w[1]) ? off[0] : 0), w[1], 4 + i]), radio: false }, S.guards.length);
    g.fac = 'B'; g.outfit = 'rival'; g.rival = true; g.radio = false; g.torch = false; g.x = tc(st[0]); g.y = tc(st[1]);
    setLayer(0); buildRouteLine(g); S.guards.push(g);
  }
}
// 세력 구역: 조직(A) = 판에 적힌 출입 금지·적진 구역(건달파·경찰 전용은 빼고) · 건달파(B) = 'rival' 허가 구역 (없으면 위에서 정한 건물 둘레)
function turfInit() {
  S.turf = { A: [], B: [] }; BLD.forEach(b => { b.gang = null; });
  for (const r of STAGE.zones || []) { if (r[4] === 'pub' || r[5] === 'roof') continue; const al = r[7] || [];
    if (al.includes('rival')) S.turf.B.push([r[0], r[1], r[2], r[3]]); else if (!al.includes('police')) S.turf.A.push([r[0], r[1], r[2], r[3]]); }
  BLD.forEach(b => { if (b.vacant) return; for (const f of ['B', 'A']) if (!b.gang && S.turf[f].some(r => !(b.x1 < r[0] || b.x0 > r[2] || b.y1 < r[1] || b.y0 > r[3]))) b.gang = f; });
}
const inTurf = (f, x, y) => { if (!S.turf || !S.turf[f]) return false; const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return S.turf[f].some(r => tx >= r[0] && tx <= r[2] && ty >= r[1] && ty <= r[3]); };
// 건물 소속 깃발: 옥상 왼쪽 위 모서리에 조직(검정·금색) / 건달파(빨강) 깃발, 가까우면 이름
const GANG_COL = { A: ['#1b1d24', '#e0b450'], B: ['#c3302c', '#ffe9e4'] };
function drawGangFlags(P) {
  if (!S.turf) return;
  BLD.forEach(b => { if (!b.gang || (!tactical && flOf(P) && bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) === BLD.indexOf(b))) return; const x = b.x0 * TILE + 10, y = b.y0 * TILE + 8; if (!inView(x, y, 80)) return;
    const [bg, fg] = GANG_COL[b.gang], w = Math.sin(S.t * 3 + b.x0) * 2;
    ctx.strokeStyle = '#c9ccd3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 34); ctx.lineTo(x, y - 14); ctx.stroke();
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 36, y - 3 + w); ctx.lineTo(x, y + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = fg; ctx.lineWidth = 2; ctx.stroke();
    if (dist(P.x, P.y, x, y) < 700 || tactical) tag(x + 44, y - 4, b.gang === 'B' ? '건달파 건물' : '조직 건물', b.gang === 'B' ? '#ff8a76' : '#e0b450', 0.9);
  });
  for (const r of S.turf.B) { if (!r.dyn) continue;  // 건달파 거리 구역: 붉은 점선 (가까울 때)
    const x = r[0] * TILE, y = r[1] * TILE, w = (r[2] - r[0] + 1) * TILE, h = (r[3] - r[1] + 1) * TILE, d = Math.hypot(clamp(P.x, x, x + w) - P.x, clamp(P.y, y, y + h) - P.y); if (d > 520 && !tactical) continue;
    ctx.strokeStyle = 'rgba(200,60,50,.45)'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 7]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
    if (d < 300 || tactical) tag(clamp(P.x, x + 80, x + w - 80), y + h - 12, '건달파 구역 · 적대 조직 발견 시 공격', '#ff8a76', 0.85); }
}
const aFits = o => !!o && o !== 'rival' && S.guards.some(g => g.fac === 'A' && outfitOf(g) === o);  // 이 옷이 의뢰 조직 옷인가
function startBrawl(a, b, why) {
  if (!npcAlive(a) || !npcAlive(b) || !sameNpcLevel(a, b) || a.brawl || a.target || b.target) return;
  a.facBlocked = 0; a.brawl = { o: b, cd: rnd(0.2, 0.6) }; if (!b.brawl && !b.civ) { b.facBlocked = 0; b.brawl = { o: a, cd: rnd(0.5, 0.9) }; }
  a.state = a.state === 'ALERT' ? a.state : 'PATROL'; a.path = null; a.chat = null; a.say = null;
  S.stats.fights = (S.stats.fights || 0) + 1; noise(a.x, a.y, 220, 'fight', flOf(a));
  gsay(a, why || (a.fac === 'P' ? '경찰이다! 그만둬!' : (a.fac === 'B' ? TAUNT_B : TAUNT)[(a.id + S.stats.fights) % 4]), 1.8);
  if (a.fac !== 'P' && b.fac !== 'P') policeCall(a.x, a.y, a);  // 도시: 패싸움은 누군가 경찰에 신고한다
  for (const c of S.guards) if (c.civ && npcAlive(c) && !c.child && flOf(c) === flOf(a) && dist(c.x, c.y, a.x, a.y) < 260) civPanic(c, a.x, a.y, 7);
  const P = S.player; if (dist(P.x, P.y, a.x, a.y) < 700 && a.fac !== 'P') { toast(b.civ ? '조직원이 주민을 때린다' : `${withJosa(FAC_NAME[a.fac], '과/와')} ${FAC_NAME[b.fac]}의 싸움 · 주변 시선이 쏠린다`, 2.4, 'warn'); hint('fight', '두 조직은 싸우는 동안 서로에게 집중한다. 상대 조직 복장으로 공격하는 모습을 보이면 전쟁을 유도할 수 있다'); }
}
function civPanic(c, x, y, t) { if (!npcAlive(c) || c.child && c.treatT > 0) return; c.state = 'PANIC'; c.fear = { x, y }; c.panicT = t; c.cowered = false; c.path = null; c.chat = null; setIcon(c, '!'); }
// 다트 누명: 들키지 않고 한쪽 조직원을 다트로 쓰러뜨리면, 곁의 동료가 가까이 있는 상대 조직을 범인으로 알고 덤빈다
function dartBlame(v) {
  if (!S.facOn || S.war || (v.fac !== 'A' && v.fac !== 'B')) return;
  const R = v.fac === 'A' ? 'B' : 'A', near = o => npcAlive(o) && sameNpcLevel(o, v) && !o.target && los(o.x, o.y, v.x, v.y, v.z || 0);
  const allies = S.guards.filter(o => o.fac === v.fac && near(o) && dist(o.x, o.y, v.x, v.y) < 450);
  if (!allies.length || allies.some(o => o.state === 'ALERT')) return;  // 나를 이미 보고 있으면 누명이 안 통한다
  const r = S.guards.filter(o => o.fac === R && near(o) && dist(o.x, o.y, v.x, v.y) < 480).sort((a, b) => dist(a.x, a.y, v.x, v.y) - dist(b.x, b.y, v.x, v.y))[0];
  if (!r) return;
  const c = S.corpses[S.corpses.length - 1]; if (c && c.x === v.x && c.y === v.y) c.blamed = R;
  allies.slice(0, 3).forEach((o, i) => { o.state = 'PATROL'; o.meter = 0; startBrawl(o, r, i ? null : '저 새끼들 짓이다!'); });
  toast(R === 'B' ? '조직원들이 건달파 짓으로 알고 덤빈다' : '건달파가 조직 짓으로 알고 덤빈다', 2.4, 'good');
}
// 소문 흘리기: 거리의 주민에게 '저쪽이 너네 구역을 노린다'는 말을 흘리면, 한쪽 조직원 몇이 상대 구역으로 몰려간다
const rumorTarget = () => {
  const P = S.player; if (!S.facOn || S.war || P.z || flOf(P) || P.carrying || P.captive || (S.rumorT && S.t - S.rumorT < 60) || !S.turf || !S.turf.A.length || !S.turf.B.length) return null;
  if (!S.guards.some(o => o.fac === 'A' && npcAlive(o)) || !S.guards.some(o => o.fac === 'B' && npcAlive(o)) || pZone() !== Z_PUB) return null;
  return S.guards.find(c => c.civ && !c.child && !c.outfit && !c.enforcer && npcAlive(c) && ['PATROL', 'IDLE', 'RETURN'].includes(c.state) && !flOf(c) && dist(c.x, c.y, P.x, P.y) < 46) || null;
};
function spreadRumor(c) {
  S.rumorT = S.t; const X = S.rumorNext || (Math.random() < 0.5 ? 'A' : 'B'), R = X === 'A' ? 'B' : 'A'; S.rumorNext = R;
  c.want = Math.atan2(S.player.y - c.y, S.player.x - c.x);
  say([['hero', X === 'A' ? '건달파가 오늘 밤 조직 구역을 친다던데요.' : '조직이 오늘 밤 건달파 구역을 친다던데요.'], [c, '정말요? …아는 사람한테 말해 줘야겠네.']]);
  after(6, () => {
    if (!S || S.war) return; const rect = S.turf[R][0]; if (!rect) return;
    let tx = Math.round((rect[0] + rect[2]) / 2), ty = Math.round((rect[1] + rect[3]) / 2), bd = 1e9, pt = null;
    for (let y = rect[1] - 1; y <= rect[3] + 1; y++) for (let x = rect[0] - 1; x <= rect[2] + 1; x++) if (!solidAt(x, y) && inTurf(R, tc(x), tc(y))) { const d = Math.hypot(x - tx, y - ty); if (d < bd) { bd = d; pt = [x, y]; } }
    if (!pt) return;
    const goers = S.guards.filter(o => o.fac === X && npcAlive(o) && !o.target && !(o.z || 0) && !flOf(o) && o.state !== 'ALERT').sort((a, b) => dist(a.x, a.y, tc(pt[0]), tc(pt[1])) - dist(b.x, b.y, tc(pt[0]), tc(pt[1]))).slice(0, 3);
    goers.forEach((o, i) => { o.raid = { x: tc(pt[0]), y: tc(pt[1]), t0: S.t }; o.state = 'PATROL'; o.path = null; if (!i) gsay(o, X === 'A' ? '건달 놈들이 우리를 노린다고? 먼저 친다!' : '조직 놈들이 온다고? 먼저 쳐들어가!', 2.6); });
    if (goers.length) toast(X === 'A' ? '소문이 돌았다 — 조직원들이 건달파 구역으로 몰려간다' : '소문이 돌았다 — 건달파가 조직 구역으로 몰려간다', 2.8, 'good');
  });
}
function declareWar(why) {
  if (S.war) return; S.war = true; S.stats.war = 1;
  toast(why || '두 조직 사이에 전쟁이 났다 — 마주치면 바로 싸운다', 3, 'warn'); play('alert', 0.35);
}
// 조직원이 쓰러뜨린 사람 (내 통계와 따로): 처치 또는 기절. 기절한 조직원은 25초 뒤 깨어난다
function npcDown(o, by, lethal) {
  if (!npcAlive(o) || o.child) return;
  const blamed = by && ['A', 'B'].includes(by.fac) && ['A', 'B'].includes(o.fac) && by.fac !== o.fac && S.guards.some(w => w !== o && w !== by && w.fac === o.fac && npcAlive(w) && sameNpcLevel(w, by) && canSee(w, by.x, by.y, Math.max(.4, lightAt(by.x, by.y)), false, false, by.z || 0) > 0) ? by.fac : null;
  o.state = 'DEAD'; o.icon = null; o.path = null; o.say = null; o.brawl = null; o.hunt = null; o.moving = false;
  play(lethal ? 'kill' : 'thud', 0.5 * proxVol(o)); noise(o.x, o.y, 90, 'fight', flOf(o));
  const c = { fl: flOf(o), z: o.z || 0, ch: charOf(o), g: o, ko: !lethal, byNpc: true, by: by && by.fac, fac: o.fac, civ: !!o.civ, outfit: outfitOf(o), tag: o.tag, x: o.x, y: o.y, a: o.a, kind: o.kind, hidden: false, discovered: false, carried: false, stashed: false, light: lightAt(o.x, o.y), t0: S.t };
  S.corpses.push(c); S.stats.npcDown = (S.stats.npcDown || 0) + 1; if (o.civ) S.stats.npcCiv = (S.stats.npcCiv || 0) + 1;
  if (blamed) c.blamed = blamed;  // 실제 목격된 조직만 현장 증거로 남긴다
  if (by && by.fac && by.fac !== 'P' && o.civ) policeCall(o.x, o.y, by);
  if (S.fuseGuard === o) S.fuseGuard = null;
  if (o.hasKey) { const k = o.hasKey; o.hasKey = null; S.keyDrop = { x: c.x + 14, y: c.y + 10, key: k, fl: c.fl || 0 }; }
  if (!lethal && !o.civ) after(25, () => { const i = S.corpses.indexOf(c); if (i < 0 || c.carried || c.stashed || !c.ko) return; S.corpses.splice(i, 1); o.state = 'PATROL'; o.x = c.x; o.y = c.y; o.meter = 0.3; o.path = null; gsay(o, '으… 어디 갔어, 그 새끼들.'); });
  // 범행을 본 주민: 이긴 쪽이 쫓아가 입을 막는다
  if (by && !by.civ && npcAlive(by)) {
    const w = S.guards.filter(q => q.civ && npcAlive(q) && !q.child && flOf(q) === flOf(o) && dist(q.x, q.y, o.x, o.y) < 300 && ((q.state === 'PANIC' && q.fear && dist(q.fear.x, q.fear.y, o.x, o.y) < 220) || canSee(q, o.x, o.y, Math.max(0.4, lightAt(o.x, o.y)), false, false, 0) > 0))
      .sort((p, q) => dist(p.x, p.y, by.x, by.y) - dist(q.x, q.y, by.x, by.y))[0];
    if (w) { by.hunt = { c: w, t0: S.t }; civPanic(w, by.x, by.y, 14); gsay(by, ['본 놈 있네. 거기 서!', '너 봤지? 이리 와.', '입 다물게 해 줄게.'][by.id % 3], 2);
      if (dist(S.player.x, S.player.y, w.x, w.y) < 700) toast('조직원이 목격자를 쫓는다', 2); }
  }
}
// 내가 쓰러뜨린 조직원: 옷으로 누구 짓인지 착각하게 만들 수 있다 (한쪽 옷을 입고 다른 쪽을 쳤는데 그쪽 조직원이 봤으면 전쟁)
function facWitness(victim) {
  if (!S.facOn || !victim || !victim.fac) return;
  const P = S.player, ow = disguised() ? P.outfit : null;
  const blamed = victim.fac === 'B' && aFits(ow) ? 'A' : victim.fac === 'A' && ow === 'rival' ? 'B' : null; if (!blamed) return;
  const seen = S.guards.some(o => o !== victim && o.fac === victim.fac && npcAlive(o) && sameNpcLevel(o, P) && dist(o.x, o.y, P.x, P.y) < 450 && canSee(o, P.x, P.y, Math.max(0.35, P.light || 0), P.hidden, P.mode === 'sneak', P.z) > 0);
  if (seen) declareWar(victim.fac === 'B' ? '건달파가 조직 짓으로 안다 — 전쟁이 났다' : '조직이 건달파 짓으로 안다 — 전쟁이 났다');
}
// 매 프레임 (updateGuard 맨 앞): 싸움·입막음·구역 단속이 평소 행동보다 먼저. true 면 이번 프레임은 이걸로 끝
function updateFaction(g, dt) {
  if (!S.facOn || g.civ || g.dog || g.target || g.child || g.climb || g.x < 0 || g.y < 0 || g.off) return false;  // 지도 밖(시험용으로 치워 둔 사람)은 세력 행동 없음
  if (g.state === 'ALERT' || g.state === 'TERROR' || g.state === 'FLEE') { g.brawl = null; g.hunt = null; return false; }
  if (g.brawl) return brawlStep(g, dt);
  if (g.hunt) return huntStep(g, dt);
  if (g.fac === 'P') return copWatch(g, dt);  // 경찰: 보이는 범행에 끼어든다 (시비는 걸지 않는다)
  if (g.raid) {  // 소문을 듣고 상대 구역으로 몰려가는 중: 걸어가며 계속 둘러본다 (상대 구역에 들어서면 그쪽이 덤빈다)
    const r = g.raid;
    if (dist(g.x, g.y, r.x, r.y) < 70 || S.t - r.t0 > 45) { g.raid = null; g.state = 'RETURN'; g.path = null; }
    else { if (!g.path || (g.repathF = (g.repathF || 0) - dt) <= 0) { g.repathF = 0.8; pathTo(g, r.x, r.y); } moveAlong(g, SPD.gAlert * 0.8 * spdMul(), dt);
      if (factionBlocked(g, dt)) { endFactionMove(g); return false; }
      if ((g.facT = (g.facT || 0) - dt) <= 0) { g.facT = 0.4; facScan(g); } return true; }
  }
  if ((g.facT = (g.facT || 0) - dt) > 0) return false; g.facT = 0.4;
  return facScan(g);
}
function facScan(g) {
  const P = S.player;
  if (g.fac !== 'P' && S.guards.some(c => c.fac === 'P' && c.brawl && npcAlive(c) && dist(c.x, c.y, g.x, g.y) < 260)) return false;  // 경찰이 바로 옆에서 제압 중이면 새 싸움을 걸지 않는다
  for (const o of S.guards) {
    if (!o.fac || o.fac === g.fac || o.fac === 'P' || o.x < 0 || o.y < 0 || !npcAlive(o) || factionAvoids(g, o) || o.target || flOf(o) !== flOf(g) || (o.z || 0) !== (g.z || 0)) continue;
    const d = dist(g.x, g.y, o.x, o.y); if (d > (S.war ? 280 : 150) || !los(g.x, g.y, o.x, o.y)) continue;
    // 싸움은 구역이 정한다: 우리 구역(또는 적진)에 들어온 상대 · 동료가 이미 붙은 상대 · 전쟁 중이면 보는 즉시. 구역 밖에서 마주치면 말로만 시비
    const inHos = g.fac === 'A' && STAGE.zones && zoneAt(o.x, o.y, o.z) === Z_HOS;
    if (S.war || inHos || inTurf(g.fac, o.x, o.y) || (o.brawl && o.brawl.o && o.brawl.o.fac === g.fac)) { startBrawl(g, o, inTurf(g.fac, o.x, o.y) ? (g.fac === 'B' ? '여기 우리 구역이다, 꺼져!' : '어딜 들어와!') : null); return true; }
    if (copNear(g, 380)) continue;  // 경찰이 보고 있으면 먼저 시비 걸지 않는다
    if (!g.tauntT || S.t - g.tauntT > 18) { g.tauntT = S.t; o.tauntT = S.t; g.want = Math.atan2(o.y - g.y, o.x - g.x); gsay(g, (g.fac === 'B' ? TAUNT_B : TAUNT)[g.id % 4], 2.2); }
  }
  // 건달 점퍼를 입은 나: 조직원이 가까이서 보면 시비, 전쟁 중이면 덤빈다
  if (g.fac === 'A' && disguised() && P.outfit === 'rival' && flOf(P) === flOf(g) && dist(P.x, P.y, g.x, g.y) < 160 && g.seen) {
    if (S.war) { goAlert(g); return false; }
    if (!g.tauntP || S.t - g.tauntP > 10) { g.tauntP = S.t; gsay(g, '건달이 여기 왜 왔어? 꺼져.', 2.2); }
  }
  // 자기 구역(출입 금지·적진)에 들어온 주민: 나가라고 하고, 그래도 있으면 때려 눕힌다
  if (g.fac === 'A' && STAGE.zones) for (const c of S.guards) {
    if (!c.civ || c.child || !npcAlive(c) || factionAvoids(g, c) || c.outfit || c.enforcer || flOf(c) !== flOf(g) || dist(c.x, c.y, g.x, g.y) > 170 || zoneAt(c.x, c.y, 0) === Z_PUB || !los(g.x, g.y, c.x, c.y)) continue;
    if (!c.shooT) { c.shooT = S.t; gsay(g, '여기 들어오지 말라 했지!', 2); continue; }
    if (S.t - c.shooT > 4) { g.hunt = { c, t0: S.t, beat: true }; civPanic(c, g.x, g.y, 6); return true; }
  }
  return false;
}
function closeIn(g, o, dt, spd) {
  const d = dist(g.x, g.y, o.x, o.y);
  if (d > 30 || !npcContact(g, o, 34)) { if (!g.path || (g.repathF = (g.repathF || 0) - dt) <= 0) { g.repathF = 0.5; pathTo(g, o.x, o.y); } moveAlong(g, spd * spdMul(), dt); }
  else { g.moving = false; g.path = null; }
  g.a += clamp(angDiff(g.a, Math.atan2(o.y - g.y, o.x - g.x)), -8 * dt, 8 * dt); g.want = g.a;
  return d;
}
function brawlStep(g, dt) {
  const b = g.brawl, o = b.o;
  if (!npcAlive(o) || !sameNpcLevel(o, g)) { g.brawl = null; g.state = 'RETURN'; g.path = null; return false; }
  // 경찰이 싸움에 끼어들면 조직원끼리는 손을 뗀다 (경찰이 붙잡은 쪽만 남아 제압당한다)
  if (g.fac !== 'P' && S.guards.some(c => c.fac === 'P' && c.brawl && c.brawl.o !== g && (c.brawl.o === o || dist(c.x, c.y, g.x, g.y) < 140) && npcAlive(c))) { g.brawl = null; g.state = 'RETURN'; g.path = null; gsay(g, '짭새다, 빠져!', 1.6); return false; }
  if (g.fac !== 'P' && S.guards.some(c => c.fac === 'P' && c.brawl && c.brawl.o === g && npcAlive(c))) { g.brawl = null; g.state = 'RETURN'; g.path = null; return false; }
  const d = closeIn(g, o, dt, SPD.gAlert * 0.95), contact = npcContact(g, o, 34);
  if (!contact && factionBlocked(g, dt)) { endFactionMove(g, o); return false; }
  if (d > 600) { g.brawl = null; g.state = 'RETURN'; return false; }
  if (contact && (b.cd -= dt) <= 0) {
    b.cd = rnd(0.8, 1.3); g.swingT = 0.3; play('thud', 0.3 * proxVol(g)); noise(g.x, g.y, 140, 'fight', flOf(g));
    const cop = g.fac === 'P';  // 경찰 곤봉: 더 자주, 더 세게 (끼어든 싸움은 경찰이 끝낸다)
    if (Math.random() < (cop ? 0.75 : 0.55)) { o.fhp = (o.fhp == null ? 3 : o.fhp) - (cop ? 2 : 1); o.startle = { a: Math.atan2(g.y - o.y, g.x - o.x) }; if (o.fhp <= 0) { npcDown(o, g, g.fac === 'P' ? false : Math.random() < (o.civ ? 0.5 : 0.4)); if (g.fac === 'P') gsay(g, '제압했다. 꼼짝 마.', 2); g.brawl = null; g.state = 'RETURN'; g.path = null; return true; } }
    // 싸움에 휘말리는 주민
    for (const c of S.guards) if (c.civ && npcAlive(c) && !c.child && npcContact(g, c, 48) && Math.random() < 0.18) { npcDown(c, g, Math.random() < 0.3); if (dist(S.player.x, S.player.y, c.x, c.y) < 700) toast('지나가던 주민이 싸움에 휘말렸다', 2); }
  }
  return true;
}
function huntStep(g, dt) {
  const h = g.hunt, c = h.c;
  if (!npcAlive(c) || S.t - h.t0 > 16 || !sameNpcLevel(c, g)) { g.hunt = null; g.state = 'RETURN'; g.path = null; return false; }
  const d = closeIn(g, c, dt, SPD.gAlert * (h.beat ? 0.8 : 1)), contact = npcContact(g, c, 32);
  if (!contact && factionBlocked(g, dt)) { endFactionMove(g, c); return false; }
  if (d > 650) { g.hunt = null; g.state = 'RETURN'; return false; }
  if (contact) { g.swingT = 0.3; npcDown(c, g, !h.beat || Math.random() < 0.2); gsay(g, h.beat ? '다신 얼씬대지 마.' : '본 놈은 없어야지.', 2); g.hunt = null; g.state = 'RETURN'; g.path = null; }
  return true;
}
// 시체를 찾았을 때: 조직끼리 생긴 시체는 경보 대신 세력 반응 (내 탓으로 돌리지 않는다)
function facBody(g, c) {
  if (!S.facOn) return false;
  if (c.accident) return false;  // 사고는 상대 구역에서도 조직 범행의 증거가 아니다
  if (c.byNpc) { c.discovered = true;
    if (!c.civ && c.fac === g.fac && c.blamed && c.blamed !== g.fac) { declareWar(g.fac === 'A' ? '조직원이 목격된 범행을 확인했다 — 건달파와 전쟁이다' : '건달파가 목격된 범행을 확인했다 — 조직과 전쟁이다'); gsay(g, '건드렸겠다… 다 죽었어.', 2.4); }
    else if (!c.civ && c.fac === g.fac) { goSuspicious(g, c.x, c.y, 4); gsay(g, '누가 한 짓이야… 주변을 확인해.', 2); }
    else if (!c.civ && c.fac !== g.fac) gsay(g, ['하나 뻗었네.', '꼴좋다.'][g.id % 2], 1.8);
    return true; }
  // 다트로 쓰러뜨린 걸 상대 조직 탓으로 안 시체: 내 탓이 아니다
  if (c.blamed && c.fac === g.fac) { c.discovered = true; gsay(g, '저 새끼들 짓이야…', 2); return true; }
  // 상대 구역에 버려진 동료 시체: 상대 짓으로 알고 전쟁 (시체를 끌어다 놓아 싸움을 붙일 수 있다)
  if (!c.civ && (c.fac === 'A' || c.fac === 'B') && c.fac === g.fac) { const R = c.fac === 'A' ? 'B' : 'A';
    if (inTurf(R, c.x, c.y)) { c.discovered = true; gsay(g, R === 'B' ? '건달 놈들 구역에서… 가만 안 둬.' : '조직 놈들 구역이잖아… 가만 안 둬.', 2.4); declareWar(R === 'B' ? '조직원이 건달파 구역에서 동료 시체를 찾았다 — 전쟁이다' : '건달파가 조직 구역에서 동료 시체를 찾았다 — 전쟁이다'); return true; } }
  // 상대편 조직원: 우리 일이 아니다
  if (c.fac && c.fac !== g.fac) { c.discovered = true; gsay(g, ['누가 건달 하나 손봤네.', '쟤넨 원래 저래.'][g.id % 2], 1.8); return true; }
  // 범행·누명·상대 구역이라는 단서가 없으면 양쪽 모두 현장을 수색한다.
  // 근처에 있다는 이유로 벽·층 너머 조직원을 범인으로 확정하지 않는다.
  return false;
}
// ---- 경찰 (도시): 조직의 범행에 끼어든다. 내 수배와는 따로 — 경찰이 조직을 제압해도 내 감점·수배는 없다
const copNear = (g, r) => S.guards.some(o => o.police && !o.off && npcAlive(o) && flOf(o) === flOf(g) && dist(o.x, o.y, g.x, g.y) < r && los(o.x, o.y, g.x, g.y));
function copWatch(g, dt) {
  const inc = g.incident;
  if ((g.cwT = (g.cwT || 0) - dt) <= 0) { g.cwT = 0.35;
    // 눈앞에서 싸우거나 주민을 쫓는 조직원: 끼어들어 제압한다
    for (const o of S.guards) {
      if (o === g || o.fac === 'P' || o.civ || !npcAlive(o) || !(o.brawl || o.hunt) || flOf(o) !== flOf(g) || dist(o.x, o.y, g.x, g.y) > 420 || !los(g.x, g.y, o.x, o.y)) continue;
      if (!inc && Math.abs(angDiff(g.a, Math.atan2(o.y - g.y, o.x - g.x))) > 1.4 && dist(o.x, o.y, g.x, g.y) > 320) continue;  // 등 뒤라도 가까운 싸움(320px)은 소리로 안다. 출동 중이면 둘러본다
      o.hunt = null; g.incident = null; startBrawl(g, o); return true;
    }
    if (inc && npcAlive(inc.by) && dist(g.x, g.y, inc.by.x, inc.by.y) < 300 && los(g.x, g.y, inc.by.x, inc.by.y)) { g.incident = null; inc.by.hunt = null; startBrawl(g, inc.by, '경찰이다! 엎드려!'); return true; }
  }
  // 신고받은 사건: 그 자리로 뛰어간다. 가 봤는데 아무도 없으면 돌아간다
  if (!inc) return false;
  if (S.t - inc.t0 > 40 || dist(g.x, g.y, inc.x, inc.y) < 60) { g.incident = null; g.state = 'RETURN'; g.path = null; if (!npcAlive(inc.by)) gsay(g, '이미 끝났군.', 1.6); return false; }
  if (!g.path || (g.incT = (g.incT || 0) - dt) <= 0) { g.incT = 1; pathTo(g, inc.x, inc.y); }
  moveAlong(g, SPD.gAlert * 0.9 * spdMul(), dt);
  if (factionBlocked(g, dt)) { endFactionMove(g, inc.by); return false; }
  return true;
}
// 경찰 신고: 가까운 한가한 경찰이 출동한다. 없으면 화면 밖에서 하나 온다 (사건 하나에 경찰 둘까지)
function policeCall(x, y, by) {
  if (!(STAGE.city || STAGE.copBeats) || !by) return; if ((S.incT || 0) > S.t) return; S.incT = S.t + 4;
  const idle = S.guards.filter(o => o.police && !o.off && npcAlive(o) && o.state !== 'ALERT' && !o.brawl && !o.incident).sort((p, q) => dist(p.x, p.y, x, y) - dist(q.x, q.y, x, y));
  let n = 0; for (const o of idle.slice(0, 2)) { o.incident = { x, y, by, t0: S.t }; o.state = 'PATROL'; o.path = null; n++; }
  if (!n) { const c = spawnCop(true); if (c) { c.incident = { x, y, by, t0: S.t }; n = 1; } }
  if (n && dist(S.player.x, S.player.y, x, y) < 800) toast('누군가 경찰에 신고했다 — 경찰이 조직원을 잡으러 온다', 2.4);
}
