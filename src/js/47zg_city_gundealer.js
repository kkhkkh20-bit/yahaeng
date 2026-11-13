// ---------------------------------------------------------------- 자유 모드 비밀 루트: 뒷골목 총포 밀매상 '박씨'
// 이 도시에서 총은 귀하다. 경찰 권총만 돌고, 그건 뒷골목 박씨한테서만 산다 — 간단하다: 찾아가서 사면 끝.
// 박씨는 건물 뒤편 골목(차도·큰 보도가 아닌 곳)에 서 있다. 강 형사가 첫 통화에서 귀띔하면 미니맵에 검은 점으로 뜬다.
// 파는 것: 경찰 권총(+12) · 권총 탄 12발 · 방탄조끼. 박씨가 죽으면 3분 뒤 같은 자리에 '조카'가 나온다.
const DEALER_ITEMS = [
  { k: 'pistol', name: '경찰 권총 (+12발) — 출처는 묻지 마', price: 600, can: () => !(S.guns.pistol > 0), buy: () => { S.guns.pistol = (S.guns.pistol || 0) + 12; if (!S.wpn) S.wpn = 'pistol'; } },
  { k: 'ammo', name: '권총 탄 12발', price: 80, can: () => S.guns.pistol > 0 || S.wpn === 'pistol', buy: () => { S.guns.pistol = (S.guns.pistol || 0) + 12; } },
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
function dealerUpdate() {
  const D = S.dealer2; if (!D) return;
  if (D.g && !npcAlive(D.g) && !D.respawn) D.respawn = S.t + 180;
  if (D.respawn && S.t > D.respawn && !inView(D.x, D.y, 80)) { D.respawn = 0; dealerSpawn(); }
  if (D.g && npcAlive(D.g) && D.g.state === 'PATROL') { D.g.x = D.x; D.g.y = D.y; }
}
function dealerAction() {
  const D = S.dealer2, P = S.player; if (!D || !D.g || !npcAlive(D.g) || P.car || dist(P.x, P.y, D.x, D.y) > 54) return null;
  return { k: 'evAct', label: '박씨와 거래', at: { x: D.x, y: D.y - 50 }, fn: openDealer2 };
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
