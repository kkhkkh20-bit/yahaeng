// ---------------------------------------------------------------- 자유 모드 비밀 루트: 뒷골목 총포 밀매상 '박씨'
// 이 도시에서 총은 귀하다. 경찰 권총만 돌고, 그건 뒷골목 박씨한테서만 산다 — 간단하다: 찾아가서 사면 끝.
// 박씨는 건물 뒤편 골목(차도·큰 보도가 아닌 곳)에 서 있다. 강 형사가 첫 통화에서 귀띔하면 미니맵에 검은 점으로 뜬다.
// 파는 것: 경찰 권총(+12) · 권총 탄 12발 · 방탄조끼. 박씨가 죽으면 3분 뒤 같은 자리에 '조카'가 나온다.
const DEALER_ITEMS = [
  { k: 'pistol', name: '경찰 권총 (+12발) — 출처는 묻지 마', price: 600, can: () => S.guns.pistol == null, buy: () => { S.guns.pistol = (S.guns.pistol || 0) + 12; if (!S.wpn) S.wpn = 'pistol'; } },
  { k: 'ammo', name: '권총 탄 12발', price: 80, can: () => S.guns.pistol != null, buy: () => { S.guns.pistol = (S.guns.pistol || 0) + 12; } },
  { k: 'knife', name: '회칼 — 소리 없이, 가깝게', price: 50, can: () => !(S.guns.knife > 0), buy: () => { S.guns.knife = 1; S.wpn = 'knife'; } },
  { k: 'armor', name: `방탄조끼 (${typeof ARMOR_MAX !== 'undefined' ? ARMOR_MAX : 3}번 막는다)`, price: 250, can: () => (S.player.armor | 0) < ARMOR_MAX, buy: () => { S.player.armor = ARMOR_MAX; } },
];
function dealerInit() {
  S.dealer2 = null; if (!STAGE.cityLife) return;
  const spot = dealerSpot(); if (!spot) return; S.dealer2 = { x: spot.x, y: spot.y, g: null, respawn: 0 }; dealerSpawn();
}
// 건물 뒤편 골목: 건물 위쪽 한 칸(뒷벽 앞)이 걸을 수 있고 차도가 아닌 자리. 지도마다 같은 자리(결정적).
function dealerSpot() {
  const P = S.player;
  for (let k = 0; k < BLD.length; k++) { const b = BLD[(k * 29 + 5) % BLD.length]; if (b.vacant || b.kind === 'shop') continue; const ty = b.y0 - 1;
    for (let tx = b.x0 + 1; tx < b.x1; tx++) { if (!inMap(tx, ty) || solidAt(tx, ty) || G0[ty][tx] === '.' || bldAt(tx, ty) >= 0) continue;
      const x = tc(tx), y = tc(ty); const d = dist(P.x, P.y, x, y); if (d > 700 && d < 2600) return { x, y }; } }
  return null;
}
function dealerSpawn() {
  const D = S.dealer2; if (!D) return; const gi = cityGuardSlot(), g = makeGuard({ kind: 'civ', at: [Math.floor(D.x / TILE), Math.floor(D.y / TILE)], radio: false, body: 'big' }, gi);
  g.x = D.x; g.y = D.y; g.route = [{ x: D.x, y: D.y, pause: 999 }]; g.wait = 999; g.dealer = true; g.smoker = true; placeGuard(g, gi); D.g = g;
}
function dealerUpdate(dt = 1 / 60) {
  const D = S.dealer2; if (!D) return;
  if (D.g && !npcAlive(D.g) && !D.respawn) D.respawn = S.t + 180;
  if (D.respawn && S.t > D.respawn && !inView(D.x, D.y, 80)) { D.respawn = 0; dealerSpawn(); }
  const g = D.g;
  // 박씨는 총을 찬다: 맞서기 시작하면(협박이 틀어졌거나 내가 먼저 때렸다) 주먹 대신 권총을 뽑는다. 내가 멀어지거나 놈이 쓰러질 때까지
  if (g && npcAlive(g) && !g.off && g.fist) { D.sulkUntil = Math.max(D.sulkUntil || 0, S.t + 600); const P = S.player, d = dist(g.x, g.y, P.x, P.y);
    if (!g.drew) { g.drew = true; g.drawT = S.t + 0.9; gsay(g, ['내 골목에서?', '...후회하게 될 거다.', '총은 너만 있는 줄 알았냐.'][(D.threats || 0) % 3], 1.8); play('click', 0.6 * proxVol(g)); }
    if (d < 420 && (g.shootT || 0) < S.t && S.t > (g.drawT || 0) && los(g.x, g.y, P.x, P.y)) { g.shootT = S.t + 1.1; npcShoot(g, P); }
    g.aim = 1;
    g.fistT = Math.max(g.fistT || 0, S.t + 0.5); }   /* 주먹 대신 총 (47zp 의 주먹질은 미룬다) */
  else if (g) { g.drew = false; if (g.aim) g.aim = 0; }
  // 제자리로: 태워 갔다 내려 주면 걸어서 골목으로 돌아온다 (타는 중엔 건드리지 않는다)
  if (g && npcAlive(g) && g.state === 'PATROL' && !g.off && !g.rideTo && !g.rideIn && !g.fist) { let d = dist(g.x, g.y, D.x, D.y);
    if (d > 8) { const moved = dist(g.x, g.y, g.lastX ?? 0, g.lastY ?? 0) > 0.5; g.lastX = g.x; g.lastY = g.y; g.stuckT = moved ? 0 : (g.stuckT || 0) + dt;
      if (g.stuckT > 4 || (!inView(g.x, g.y, 80) && !inView(D.x, D.y, 80))) d = 0; else evRun(g, D.x, D.y, 90, dt); }  /* 막혔거나 아무도 안 보면 제자리로 */
    if (d <= 8) { g.x = D.x; g.y = D.y; g.route = [{ x: D.x, y: D.y, pause: 999 }]; g.path = null; g.stuckT = 0; } }
}
function dealerAction() {
  const D = S.dealer2, P = S.player, g = D && D.g; if (!g || !npcAlive(g) || g.off || g.fist || P.car || dist(g.x, g.y, D.x, D.y) > 30 || dist(P.x, P.y, D.x, D.y) > 54) return null;  /* 골목 제자리에 있을 때만 장사 */
  if ((D.sulkUntil || 0) > S.t) return { k: 'evAct', label: '박씨 — 눈도 안 마주친다', at: { x: D.x, y: D.y - 50 }, fn: () => gsay(g, ['꺼져.', '너한텐 안 팔아.', '총 들이댄 거 안 잊었다.'][(S.t | 0) % 3], 2) };
  if (typeof wpnOn === 'function' && wpnOn()) return { k: 'evAct', label: `박씨 협박하기 (${WEAPONS[S.wpn].name})`, at: { x: D.x, y: D.y - 50 }, fn: () => dealerThreat(D) };
  return { k: 'evAct', label: '박씨와 거래', at: { x: D.x, y: D.y - 50 }, fn: openDealer2 };
}
// 협박: 무기를 들고 다가가면 [협박] — 권총 한 자루(있으면 탄 12발)를 빼앗는다. 대신 박씨는 10분 동안 안 판다.
// 박씨도 권총을 찬다: 칼만 들고 오면 대개 맞받아 총을 뽑고, 총을 들이대도 세 번째엔 뽑는다. 누가 보면 수배.
function dealerThreat(D) {
  const P = S.player, g = D.g; P.a = Math.atan2(g.y - P.y, g.x - P.x); g.a = P.a + Math.PI; fstat('dealerThreat');
  gsay(g, '...이봐, 진정해.', 1.4);
  doMotion({ dur: 1.2, pose: 'idle', at: [[0.3, () => play('click', 0.5)]], end: () => {
    if (!npcAlive(g)) return; D.sulkUntil = S.t + 600;
    const n = D.threats = (D.threats || 0) + 1, melee = WEAPONS[S.wpn]?.melee;
    // 총 든 사람한테 칼로? 셋 중 둘은 총을 뽑는다. 총을 들이대도 셋째 번엔 맞받아 뽑는다
    if (melee ? n % 3 !== 0 : n % 3 === 0) { g.fist = true; gsay(g, melee ? '칼? 칼 가지고 날?' : '두 번은 안 당해!', 1.8); evBanner('(...뽑았다. 엎드려.)', '#ff9a86'); return; }
    const had = S.guns.pistol != null; S.guns.pistol = (S.guns.pistol || 0) + 12; if (!S.wpn) S.wpn = 'pistol'; if (typeof gunChip === 'function') gunChip(); play('loot', 0.5); saveFreeProgress(true);
    gsay(g, ['가져가. 가져가라고.', '...얼굴 기억해 둔다.'][D.threats % 2], 2.2);
    evBanner(had ? '권총 탄 +12 · (빌린 거야. 갚을 생각은 없지만.)' : '경찰 권총 +12발 · (공짜가 제일 비싸다던데.)', '#e8d8a8');
    if (witnessed(P.x, P.y, 260)) addWanted(1, '골목에서 사람을 협박하는 걸 봤다'); } });
}
function openDealer2() {
  const D = S.dealer2; S.gunTip = true; if (D && D.g) gsay(D.g, ['조용히 골라.', '현금만.', '어디서 났는지는 묻지 말고.'][(S.t | 0) % 3], 2);
  const show = () => shopPanel('뒷골목 · 박씨', DEALER_ITEMS.map(it => ({ name: it.name, price: it.price, ok: (S.cash || 0) >= it.price && it.can(), buy: () => { if (!it.can() || !pay(it.price)) return; it.buy(); fstat('dealerBuys'); if (typeof gunChip === 'function') gunChip(); saveFreeProgress(true); show(); } })));
  show();
}
// 미니맵: 귀띔을 받았거나 한 번 찾아간 뒤에만 (검은 점 + 흰 테두리)
function drawMiniDealer(x, T) {
  const D = S.dealer2; if (!D || !S.gunTip) return; x.fillStyle = '#000'; x.fillRect(T(D.x) - 3, T(D.y) - 3, 6, 6); x.strokeStyle = '#e8e8e8'; x.lineWidth = 1; x.strokeRect(T(D.x) - 3.5, T(D.y) - 3.5, 7, 7);
}
