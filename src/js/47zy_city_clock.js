// ---------------------------------------------------------------- 자유 모드 밤 시계: 20:00 → 05:00 (실제 30분에 한 밤)
// 시간이 흐르면 도시가 바뀐다 — 다시 같은 골목에 와도 다르게 보이게.
//  · 가게: 업종마다 문 닫는 시각 (철물·인쇄 22시, 학원 22시, 분식 23시, 약국·헬스 0시, 식당 1시, 당구 3시, 포차·호프·노래방 4시, 편의점·PC방·국밥·클럽은 밤새)
//    닫으면 1층 셔터가 내려오고(문 칸은 반쯤) 간판 불이 죽고, 직원·손님이 없고, 계산대에서 살 수 없다
//  · 창문: 집·사무실 불이 밤이 깊을수록 하나둘 꺼진다 (건물·층·세대마다 정해진 순서), 새벽엔 일찍 일어난 집 몇이 켜진다
//  · 사람: 초저녁엔 붐비고 새벽 1시 넘으면 한산 · 술 취한 사람이 포차 앞을 비틀거리고 · 새벽 4시 반 넘으면 환경미화원이 쓸고 하늘이 조금 밝아진다
// 시계는 자유 모드 진행 저장(10분 단위)에 같이 남는다. 처음 열면 21:00. 05:00 이 지나면 다음 날 20:00 으로 넘어간다.
const NIGHT_H0 = 20, NIGHT_H1 = 29, NIGHT_REAL = 1800, CLOCK_START = 21;
const clockHash = (a, b, c) => { let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791); h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
function clockInit() {
  S.clock = null; S.nightPpl = null; if (!STAGE.cityLife) return;
  let h = CLOCK_START; try { const d = JSON.parse(localStorage.getItem(FREE_SAVE) || 'null'); if (d && typeof d.clock === 'number' && d.clock >= NIGHT_H0 && d.clock < NIGHT_H1) h = d.clock; } catch (e) {}
  if (STAGE._shade0 == null) STAGE._shade0 = STAGE.nightShade ?? 0.55;
  S.clock = { h, bucket: -1, rate: 1, said: {} }; S.nightPpl = { drunks: [], sweep: null, t: 0 };
  for (const l of S.lamps || []) l.nightOff = false;
  clockApply();
}
const clockHour = () => (S && S.clock ? S.clock.h : CLOCK_START);
function clockText(h = clockHour()) { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
const hourText = h => (Math.floor(h) % 24) + '시';
// 층마다 문 닫는 시각 (20~29 = 20시~다음 날 5시, 99 = 밤새)
function closeHour(b, f) {
  if (b.collapsed) return 0; if (b.plateName) return 99;   // 병원·지구대·본부·클럽 같은 이름 붙은 곳은 밤새 연다
  const bi = b._bi ?? (b._bi = BLD.indexOf(b)), p = PLANS[bi]?.[f], use = p?.store?.use, sign = ((b.signs || [])[f] || '').trim();
  if (!use) return 99;
  if (use === 'store') return /편의점|마트|24/.test(sign) ? 99 : /약국/.test(sign) ? 24 : /철물|공구|타일|조명|전파|지물|인쇄|자재|문구|수선|세탁|꽃집|정육|반찬|상회/.test(sign) ? 22 : 23;
  if (use === 'food') return /국밥|순댓국|해장|24/.test(sign) ? 99 : /포차|호프|곱창|골뱅이|노가리|치킨|족발|주점|횟집/.test(sign) ? 28 : /분식|백반|김밥/.test(sign) ? 23 : 25;
  if (use === 'pc' || use === 'club' || use === 'vip') return 99;
  if (use === 'karaoke') return 28; if (use === 'billiards') return 27; if (use === 'gym') return 24; if (use === 'academy') return 22;
  if (use === 'office') return clockHash(bi, f, 7) < 0.2 ? 24.5 : 22;   // 사무실: 야근하는 층 몇
  return 99;
}
function floorOpen(b, f) { return !STAGE.cityLife || !S || !S.clock || !b || clockHour() < closeHour(b, f); }
// 집·사무실 창 불: 밤이 깊을수록 줄고 새벽에 몇 집이 다시 켠다
function litFrac(h) { return h < 21.5 ? 1 : h < 23 ? 0.8 : h < 24.5 ? 0.55 : h < 26 ? 0.35 : h < 28 ? 0.18 : 0.28; }
// 창 하나(건물·층·세로 칸)가 켜져 있나 — 다른 그림(창 안 사람 그림자 등)에서도 쓴다
function windowLit(b, fl, tx) {
  if (!STAGE.cityLife || !S || !S.clock || !b) return true;
  const bi = b._bi ?? (b._bi = BLD.indexOf(b));
  if (PLANS[bi]?.[fl]?.store) return floorOpen(b, fl) || clockHash(bi, fl, 3) < 0.08;   // 닫은 가게 층: 대부분 꺼지고 몇은 보안등
  const unit = tx == null ? 0 : Math.floor((tx - b.x0) / 5);
  return clockHash(bi, fl, unit + 11) < litFrac(clockHour());
}
// 사람 수: 초저녁 1, 자정 넘어 줄고 새벽엔 한산
function nightCrowdK() { const h = clockHour(); return !S?.clock ? 1 : h < 23 ? 1 : h < 25 ? 0.85 : h < 27 ? 0.55 : 0.42; }
// 15분마다: 실내 등 켜고 끄기 · 하늘 밝기 · 시각 알림
function clockApply() {
  const C = S.clock, h = C.h, P = S.player, pb = bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)), pf = flOf(P);
  let changed = false;
  for (const l of S.lamps || []) { if (l.outdoor || l.hearth) continue; const tx = Math.floor(l.x / TILE), bi = bldAt(tx, Math.floor(l.y / TILE)); if (bi < 0) continue;
    if (bi === pb && flOf(l) === pf) continue;   // 내가 있는 층은 그대로 (눈앞에서 갑자기 꺼지지 않게)
    const off = !windowLit(BLD[bi], flOf(l), tx); if (!!l.nightOff !== off) { l.nightOff = off; changed = true; } }
  if (changed && typeof refreshBodyLighting === 'function') refreshBodyLighting();
  const s0 = STAGE._shade0 ?? 0.55;   // 초저녁(20시)은 조금 덜 어둡고, 4시 반부터 동이 튼다
  STAGE.nightShade = s0 * (h < 20.75 ? 0.86 + 0.14 * (h - 20) / 0.75 : h > 28.5 ? 1 - 0.3 * (h - 28.5) / 0.5 : 1);
  const say = (k, at, txt, col) => { if (h >= at && h < at + 0.5 && !C.said[k]) { C.said[k] = 1; if (typeof evBanner === 'function') evBanner(txt, col); } };
  say('shut', 22, '22:00 · 골목 가게들이 하나둘 셔터를 내린다', '#c8c2b0');
  say('mid', 24, '자정 · 막차가 끊겼다. 남은 건 술집과 편의점', '#b8a8e0');
  say('late', 26, '새벽 2시 · 거리가 비었다', '#9fb0c8');
  say('dawn', 28.5, '04:30 · 동이 트기 시작한다', '#ffc890');
}
function clockUpdate(dt) {
  const C = S.clock; if (!C) return;
  C.h += dt * C.rate * (NIGHT_H1 - NIGHT_H0) / NIGHT_REAL;
  if (C.h >= NIGHT_H1) { C.h = NIGHT_H0; C.said = {}; C.bucket = -1; }   // 아침은 건너뛰고 다음 날 밤으로
  const bk = Math.floor(C.h * 4); if (bk !== C.bucket) { C.bucket = bk; clockApply(); }
}
// ---- 밤 사람들: 술 취한 사람 (0:30~4:30, 포차·호프 앞) · 환경미화원 (4:30~)
const DRUNK_LINES = ['(딸꾹)', '한 잔만 더 하자니까...', '택시! 어이, 택시!', '나 안 취했다고...', '집이 어디였더라', '부장님이 뭐라셨더라...'];
function nightPut(x, y, o) {
  const gi = cityGuardSlot(), g = makeGuard(Object.assign({ kind: 'civ', at: [Math.floor(x / TILE), Math.floor(y / TILE)], radio: false }, o.body ? { body: o.body } : {}), gi);
  g.evt = '__night'; g.x = x; g.y = y; g.fl = 0; g.homeFl = 0; g.route = o.route; g.ri = 0; g.wait = 0; placeGuard(g, gi); if (PR) prWarm([charOf(g)], true); return g;
}
const walkable = (x, y) => !solidAt(Math.floor(x / TILE), Math.floor(y / TILE)) && bldAt(Math.floor(x / TILE), Math.floor(y / TILE)) < 0;
function nightPeople() {
  const N = S.nightPpl, L = S.life, P = S.player, h = clockHour(); if (!N || !L) return;
  const gone = g => { if (g && !g.off && npcAlive(g)) evGone(g); };
  N.drunks = N.drunks.filter(g => { const keep = npcAlive(g) && !g.off && g.evt === '__night' && dist(g.x, g.y, P.x, P.y) < 1900 && (h >= 24.5 && h < 28.75 || inView(g.x, g.y, 80)); if (!keep) gone(g); return keep; });
  if (N.sweep && !(npcAlive(N.sweep) && !N.sweep.off && dist(N.sweep.x, N.sweep.y, P.x, P.y) < 1900 && (h >= 28.5 || inView(N.sweep.x, N.sweep.y, 80)))) { gone(N.sweep); N.sweep = null; }
  if (flOf(P) || S.wanted >= 2) return;
  for (const g of N.drunks) if (dist(g.x, g.y, P.x, P.y) < 420 && S.t > (g.drunkT || 0)) { g.drunkT = S.t + 5 + (g.id % 4); gsay(g, DRUNK_LINES[(g.id + Math.floor(S.t / 5)) % DRUNK_LINES.length], 2.2); }
  // 경로 찾기: 앞 칸(아래로 22·34·46px)에서 좌우 ±150·±100·±60px 중 걸을 수 있는 두 점
  const lane = (c, dys, dxs) => { for (const dy of dys) for (const dx of dxs) { const y = c.y + dy, a = { x: c.x - dx, y }, b = { x: c.x + dx, y }; if (walkable(c.x, y) && walkable(a.x, y) && walkable(b.x, y)) return [a, b]; } return null; };
  if (h >= 24.5 && h < 28.5 && N.drunks.length < 2) {   // 문 연 포차·호프 앞 (화면 밖)
    const cs = (L.cands || []).filter(c => c.kind === 'food' && floorOpen(BLD[c.bi], 0) && /포차|호프|곱창|골뱅이|노가리|치킨|족발|주점/.test(BLD[c.bi].signs?.[0] || '') && !N.drunks.some(g => g.drunkAt === c.bi))
      .map(c => ({ c, d: dist(c.x, c.y, P.x, P.y) })).filter(o => o.d > 450 && o.d < 1500 && !inView(o.c.x, o.c.y, 120)).sort((a, b) => a.d - b.d);
    for (const { c } of cs) { const r = lane(c, [22, 34, 46], [150, 100, 60]); if (!r) continue;
      r[0].pause = 2.5; r[1].pause = 3.5; const g = nightPut(c.x, r[0].y, { body: ['suit', 'jacket', 'vest', 'hoodieCasual'][(c.bi + N.drunks.length) % 4], route: r }); g.drunk = true; g.drunkAt = c.bi; g.spdK = 0.5; N.drunks.push(g); break; }
  }
  if (h >= 28.5 && !N.sweep) {   // 환경미화원: 길가를 천천히 쓸며 지나간다
    const cs = (L.tcands || []).map(c => ({ c, d: dist(c.x, c.y, P.x, P.y) })).filter(o => o.d > 400 && o.d < 1500 && !inView(o.c.x, o.c.y, 120)).sort((a, b) => a.d - b.d);
    for (const { c } of cs) { const r = lane(c, [30, 22, 42], [240, 160, 100]); if (!r) continue;
      r[0].pause = 1; r[1].pause = 1; const g = nightPut(c.x, r[0].y, { body: 'worker', route: r }); g.sweeper = true; g.outfit = 'staff'; g.spdK = 0.38; N.sweep = g; break; }
  }
}
// ---- 그림: 닫은 가게 셔터 (1층 정면, 문 칸은 반쯤 올림) · 술 취한 사람 흔들림 · 환경미화원 빗자루 · 미니맵 시계
function drawClosedShutters(b) {
  if (b.kind !== 'shop' || !(b.signs?.[0] || '').trim() || floorOpen(b, 0)) return;
  const y = b.y1 * TILE, door = b.x0 + 3, sh = typeof studyReady === 'function' && studyReady() && studyArt.frames.shopShutter?.rect;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for (let tx = b.x0 + 1; tx < b.x1; tx++) { const half = tx === door, hgt = half ? Math.round(TILE * 0.55) : TILE, x = tx * TILE, col = (tx - b.x0) % 3;
    if (sh) ctx.drawImage(studyAtlas, sh[0] + col * 32, sh[1], 32, half ? 18 : 32, x, y, TILE, hgt);
    else { ctx.fillStyle = '#5c6068'; ctx.fillRect(x, y, TILE, hgt); ctx.fillStyle = '#474a52'; for (let k = 3; k < hgt; k += 6) ctx.fillRect(x, y + k, TILE, 2); }
    ctx.fillStyle = 'rgba(4,8,22,.35)'; ctx.fillRect(x, y, TILE, hgt);
    if (half) { ctx.fillStyle = '#2a2c30'; ctx.fillRect(x + 2, y + hgt, TILE - 4, 3); } }
  ctx.restore();
}
function clockDrawMini(x) {
  if (!S.clock) return; const c = x.canvas, t = clockText(), w = 46, h = 17, px = c.width - w - 4, py = c.height - h - 4;
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = 'rgba(8,10,18,.82)'; x.fillRect(px, py, w, h); x.fillStyle = clockHour() >= 28.5 ? '#ffc890' : '#e8e2cc';
  x.font = '700 12px ' + UI_FONT_FAMILY; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, px + w / 2, py + h / 2 + 1); x.restore();
}
// ---- 이어 붙이기 (가게 일꾼·거리 생활과 같은 갈고리)
if (typeof staffInit === 'function') { const _ci = staffInit; staffInit = function () { _ci(); clockInit(); }; }
if (typeof staffUpdate === 'function') { const _cu = staffUpdate; staffUpdate = function (dt) { _cu(dt); if (!STAGE.cityLife || !S.clock) return; clockUpdate(dt); if ((S.nightPpl.t -= dt) <= 0) { S.nightPpl.t = 2; nightPeople(); } }; }
if (typeof drawMiniCity === 'function') { const _dm = drawMiniCity; drawMiniCity = function (x, T) { _dm(x, T); if (STAGE.cityLife) clockDrawMini(x); }; }
if (typeof drawGuard === 'function') { const _dg = drawGuard; drawGuard = function (g) {
  if (!g.drunk && !g.sweeper) return _dg(g);
  if (g.drunk) { ctx.save(); ctx.translate(Math.round(Math.sin(S.t * 2.2 + g.id) * 4), 0); const r = _dg(g); ctx.restore(); return r; }
  const r = _dg(g), sw = Math.sin(S.t * 5 + g.id) * 3, x = Math.round(g.x + 10 + sw), y = Math.round(g.y - 22);   // 빗자루: 자루 + 솔
  ctx.fillStyle = '#8a6a3a'; for (let k = 0; k < 9; k++) ctx.fillRect(x + Math.round(k * 0.6), y + k * 3, 2, 3);
  ctx.fillStyle = '#c8b070'; ctx.fillRect(x + 2, y + 26, 9, 4); ctx.fillStyle = '#9a8450'; ctx.fillRect(x + 3, y + 30, 7, 2); return r; }; }
if (typeof shopAction === 'function') { const _sa = shopAction; shopAction = function () { const r = _sa(); const C = r && r.k === 'shop' && STAGE.cityLife && BLD[r.s.b];
  if (C && !floorOpen(C, 0)) return { k: 'evAct', at: r.at, label: `${r.s.name} · 영업 끝`, fn: () => toast(`${r.s.name}은 문을 닫았다. 저녁 8시에 다시 연다`, 2.4) };
  return r; }; }
