// ---------------------------------------------------------------- 자유 모드 높은 수배: 경찰 헬기 · 도로 검문 / 자유 모드 기록 · 업적
// 헬기(★4 이상): 화면 밖에서 날아와 나를 쫓는다. 서치라이트(땅의 밝은 원)가 나를 비추는 동안에는 수배가 줄지 않고,
//   근처 경찰이 내 자리를 안다. 수배가 3 아래로 내려가면 돌아간다. 회전날개 소리는 거리만큼.
// 검문(★3 이상, 차를 몰 때 25초마다): 내 앞 600~800px 도로를 경찰차 두 대가 가로로 막고 경찰 둘이 선다.
// 기록: 훔친 차·운행·환자·승객·검거·폭발·체포·쓰러짐·최고 수배·운전 거리·번 돈. 업적을 이루면 보너스. 진행 저장에 함께 남는다.
const HELI_SPD = 330, HELI_SPOT = 72;
function heatInit() { S.heli = null; S.blockT = S.t + 8; S.fst = Object.assign({}, S.fstSaved || {}); S.fach = Object.assign({}, S.fachSaved || {}); S.cashSeen = S.cash || 0; }
const fstat = (k, n = 1) => { if (S.fst) S.fst[k] = (S.fst[k] || 0) + n; };
function heatUpdate(dt) {
  if (!STAGE.cityLife || !S.player) return;
  const P = S.player;
  // 번 돈: 가진 돈이 늘어난 만큼
  if ((S.cash || 0) > S.cashSeen) fstat('earned', S.cash - S.cashSeen); S.cashSeen = S.cash || 0;
  if (S.wanted > (S.fst.maxWanted || 0)) S.fst.maxWanted = S.wanted;
  if (P.car && !P.car.dead) fstat('dist', Math.abs(P.car.v) * dt);
  heliUpdate(dt); roadblockUpdate(); achCheck();
}
// ---------- 헬기
function heliUpdate(dt) {
  const P = S.player; let H = S.heli;
  // 헬기는 마지막 카드: 별 다섯을 20초 넘게 버텨야 뜬다 (그 전엔 순찰차·검문으로)
  if (S.wanted >= 5) S.w5T = (S.w5T || 0) + dt; else S.w5T = 0;
  if (!H && S.wanted >= 5 && S.w5T > 20) { const a = Math.random() * TAU; H = S.heli = { x: P.x + Math.cos(a) * 1100, y: P.y + Math.sin(a) * 1100, a: a + Math.PI, sx: P.x, sy: P.y, leave: false }; evBanner('경찰 헬기가 떴다. 서치라이트를 피해라', '#9fc4ff'); }
  if (!H) { heliSound(0); return; }
  if (S.wanted < 4) H.leave = true; else if (S.wanted >= 5) H.leave = false;   // 다시 별 다섯이면 돌아온다
  const tv = P.car ? P.car : null, lead = tv ? 0.6 : 0.3, tx = H.leave ? H.x + Math.cos(H.a) * 900 : P.x + (tv ? Math.cos(tv.a) * tv.v * lead : 0), ty = H.leave ? H.y + Math.sin(H.a) * 900 : P.y + (tv ? Math.sin(tv.a) * tv.v * lead : 0);
  const d = dist(H.x, H.y, tx, ty), want = Math.atan2(ty - H.y, tx - H.x);
  if (d > 30) { H.a += angDiff(H.a, want) * Math.min(1, dt * 2.2); const sp = Math.min(HELI_SPD * (H.leave ? 1.3 : 1), d * 1.5); H.x += Math.cos(H.a) * sp * dt; H.y += Math.sin(H.a) * sp * dt; }
  // 서치라이트: 헬기 밑에서 나를 향해 따라오되 조금 늦다
  const k = Math.min(1, dt * 2.4); H.sx += ((H.leave ? H.x : P.x) - H.sx) * k; H.sy += ((H.leave ? H.y : P.y) - H.sy) * k;
  const lit = !H.leave && !flOf(P) && !P.hide && !P.booth && !P.under && dist(H.sx, H.sy, P.x, P.y) < HELI_SPOT;
  H.lit = lit;
  if (lit) { S.wantLost = 0; if ((H.callT = (H.callT || 0) - dt) <= 0) { H.callT = 1.5; for (const g of S.guards) if (g.police && !g.off && g.state !== 'ALERT' && g.state !== 'DEAD' && dist(g.x, g.y, P.x, P.y) < 900) copChase(g); } }
  heliSound(clamp(1 - dist(H.x, H.y, P.x, P.y) / 1400, 0, 1));
  if (H.leave && dist(H.x, H.y, P.x, P.y) > 1600) { S.heli = null; heliSound(0); }
}
let HELI_SND = null;
function heliSound(k) {
  if (!AC || muted) return;
  if (!HELI_SND) { if (k <= 0) return; const sr = AC.sampleRate, n = Math.floor(sr * 1.4), b = AC.createBuffer(1, n, sr), d = b.getChannelData(0); let lp = 0;
    for (let i = 0; i < n; i++) { const t = i / sr, chop = Math.pow(0.5 + 0.5 * Math.cos(t * 2 * Math.PI * 12.86), 6); lp += 0.08 * ((Math.random() * 2 - 1) - lp); d[i] = lp * (0.25 + 1.6 * chop) + Math.sin(t * 2 * Math.PI * 38.6) * 0.15 * chop; }
    const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = b; s.loop = true; g.gain.value = 0; s.connect(g); g.connect(master); s.start(); HELI_SND = { g }; }
  HELI_SND.g.gain.setTargetAtTime(k * 0.35, AC.currentTime, 0.3);
}
// 그리기 (어둠 위): 땅의 서치라이트 → 헬기 그림자 → 헬기(위에서 본 모습: 몸통·꼬리·꼬리날개·돌아가는 주날개·경광등)
function drawHeli() {
  const H = S.heli; if (!H || flOf(S.player)) return;
  if (!H.leave && inView(H.sx, H.sy, 120)) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(H.sx, H.sy, 0, H.sx, H.sy, HELI_SPOT * 1.25);
    g.addColorStop(0, `rgba(235,240,255,${H.lit ? 0.42 : 0.3})`); g.addColorStop(0.75, 'rgba(225,232,255,.18)'); g.addColorStop(1, 'rgba(225,232,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(H.sx, H.sy, HELI_SPOT * 1.25, 0, TAU); ctx.fill(); ctx.restore(); }
  if (!inView(H.x, H.y, 200)) return;
  // 그림자 (높이 떠 있다 — 북서쪽 빛) · 몸체(도트, 경찰 남색) · 회전 날개(정지/흐림 두 장을 돌린다) · 경광등
  ctx.save(); ctx.globalAlpha = 0.35; ctx.filter = 'brightness(0)'; drawItem('heli', H.x + 70, H.y + 100, 1.7, H.a + Math.PI / 2); ctx.restore();
  if (!drawItem('heli', H.x, H.y, 1.7, H.a + Math.PI / 2)) { ctx.fillStyle = '#20305a'; ctx.beginPath(); ctx.ellipse(H.x, H.y, 30, 16, H.a, 0, TAU); ctx.fill(); }
  drawItem('rotorBlur', H.x + Math.cos(H.a) * 8, H.y + Math.sin(H.a) * 8, 1.7, S.t * 21, 0.75);
  drawItem('rotor', H.x + Math.cos(H.a) * 8, H.y + Math.sin(H.a) * 8, 1.7, S.t * 21 + 0.4, 0.25);
  const blink = (S.t * 3 | 0) % 2, nx = Math.cos(H.a + Math.PI / 2), ny = Math.sin(H.a + Math.PI / 2);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [s, col] of [[1, blink ? '#ff3a3a' : '#3a6aff'], [-1, blink ? '#3a6aff' : '#ff3a3a']]) { const lx = H.x + nx * 22 * s - Math.cos(H.a) * 4, ly = H.y + ny * 22 * s - Math.sin(H.a) * 4;
    const gr = ctx.createRadialGradient(lx, ly, 0, lx, ly, 14); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(lx - 14, ly - 14, 28, 28); }
  ctx.restore();
}
// ---------- 도로 검문
function roadblockUpdate() {
  const P = S.player, v = P.car; if (S.wanted < 3 || !v || S.t < S.blockT) return; S.blockT = S.t + 25;
  // 앞쪽 560~1300px를 차례로 훑어 처음 닿는 길목에 세운다 (블록이 넓어 한 거리만 보면 블록 한가운데일 수 있다). 고가 밑·옆은 피한다
  const underDeck = q => (S.decks || []).some(d => inR(d.top, q.x, q.y, 120) || inR(d.rampA, q.x, q.y, 120) || inR(d.rampB, q.x, q.y, 120));
  let p = null; for (let R = 560; R <= 1300 && !p; R += 80) { const q = roadNear(v.x + Math.cos(v.a) * R, v.y + Math.sin(v.a) * R, 4); if (q && !inView(q.x, q.y, 60) && !underDeck(q)) p = q; }
  if (!p) { S.blockT = S.t + 3; return; }
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE), isR = (x, y) => inMap(x, y) && G0[y][x] === '=';
  let hx = 0, vy = 0; for (let k = -4; k <= 4; k++) { if (isR(tx + k, ty)) hx++; if (isR(tx, ty + k)) vy++; }
  const along = hx >= vy ? 'x' : 'y';  // 도로가 뻗은 방향
  // 막을 폭: 보도 옆 차도('.')를 건너는 길이 (보도 한 칸 폭으로 재면 차가 벽에 붙어 모두 빠졌다)
  const isA = (x, y) => inMap(x, y) && G0[y][x] === '.' && bldAt(x, y) < 0, at = c => along === 'x' ? isA(tx, c) : isA(c, ty), c00 = along === 'x' ? ty : tx;
  const sd = at(c00 + 1) ? 1 : at(c00 - 1) ? -1 : 0; if (!sd) { S.blockT = S.t + 3; return; }
  let c0 = c00 + sd, c1 = c0; while (at(c0 - 1)) c0--; while (at(c1 + 1)) c1++;
  const mid = (c0 + c1 + 1) / 2 * TILE, span = (c1 - c0 + 1) * TILE, n = Math.max(2, Math.min(3, Math.round(span / 100)));
  for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * (span / n), x = along === 'x' ? p.x : mid + off, y = along === 'x' ? mid + off : p.y;
    const car = makeVehicle({ type: 'police', x, y, a: (along === 'x' ? Math.PI / 2 : 0) + (i % 2 ? 0.28 : -0.28), parked: true, police: true }); car.roadblock = true; car.ai = false; car.driver = false; if (carOverlap(car) === true) continue; S.vehicles.push(car); }  // 비스듬히 엇갈린 바리케이드 (벽과 겹칠 때만 뺀다)
  for (let i = 0; i < 2; i++) { const g = spawnCop(); if (g) { g.x = (along === 'x' ? p.x - 60 : mid + (i ? 60 : -60)); g.y = (along === 'x' ? mid + (i ? 60 : -60) : p.y - 60); g.path = null; } }
  evBanner('앞에 경찰 검문. 돌아가거나 들이받아라', '#9fc4ff');
}
// ---------- 기록 · 업적
const FREE_ACH = [
  ['firstCar', '첫 차', '차를 처음 훔쳤다', s => s.carsStolen >= 1, 20], ['thief', '차도둑', '차 10대를 훔쳤다', s => s.carsStolen >= 10, 100],
  ['cabbie', '택시 기사', '택시 손님 5명', s => s.taxi >= 5, 80], ['medic', '생명의 은인', '환자 3명을 병원으로', s => s.patients >= 3, 100],
  ['busman', '버스 운전사', '버스 승객 20명', s => s.busRiders >= 20, 80], ['vigil', '정의의 사도', '도주 차량 3대 검거', s => s.perps >= 3, 120],
  ['boom', '불꽃놀이', '차 5대 폭발', s => s.explosions >= 5, 50], ['five', '공공의 적', '수배 ★★★★★', s => s.maxWanted >= 5, 100],
  ['pro', '청부업자', '조건 의뢰 5건 성공', s => s.ctrDone >= 5, 200], ['hunted', '사냥꾼 사냥', '킬러 3명 처리', s => s.huntersDown >= 3, 150], ['ghost', '유령', '의뢰 등급 S 3번', s => s.ghost >= 3, 200], ['gunner', '총잡이', '총으로 50명', s => s.gunKills >= 50, 100],
  ['road', '장거리 운전', '20km 운전', s => (s.dist || 0) / 1000 >= 20, 100], ['rich', '부자', '모두 5,000만 벌기', s => s.earned >= 5000, 300]];
function achCheck() {
  if ((S.achT = (S.achT || 0) + 1) % 30) return; const st = S.fst;
  for (const [id, name, desc, test, bonus] of FREE_ACH) if (!S.fach[id] && test(st)) { S.fach[id] = 1; S.cash = (S.cash || 0) + bonus; S.cashSeen = S.cash; play('bell', 0.5); evBanner(`업적 · ${name} (${desc}) · +${bonus}만`, '#ffd76a'); saveFreeProgress(true); }
}
function freeStatsPanel() {
  const s = S.fst || {}, km = ((s.dist || 0) / 1000).toFixed(1), row = (n, v) => ({ name: n, price: null, tag: String(v), ok: false, buy: () => {} });
  const done = FREE_ACH.filter(a => S.fach[a[0]]).length;
  shopPanel(`자유 모드 기록 · 업적 ${done}/${FREE_ACH.length}`, [
    row('번 돈', `${s.earned || 0}만`), row('훔친 차', s.carsStolen || 0), row('운전 거리', `${km}km`), row('택시 손님 · 환자 · 버스 승객', `${s.taxi || 0} · ${s.patients || 0} · ${s.busRiders || 0}`),
    row('도주 차량 검거', s.perps || 0), row('폭발시킨 차', s.explosions || 0), row('총으로 쓰러뜨림', s.gunKills || 0), row('체포 · 쓰러짐', `${s.arrests || 0} · ${s.downs || 0}`), row('최고 수배', '★'.repeat(s.maxWanted || 0) || '없음'),
    ...FREE_ACH.map(([id, name, desc, , bonus]) => ({ name: `${S.fach[id] ? '✔' : '○'} ${name} — ${desc}`, price: null, tag: S.fach[id] ? '달성' : `+${bonus}만`, ok: false, buy: () => {} }))]);
}
