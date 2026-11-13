// ---------------------------------------------------------------- 자유 모드 엘리베이터 (빌라·상가 계단 칸)
// 계단 칸 앞에서 [엘리베이터]: 층 고르는 판이 뜬다 — 1층 · 2층 · … · 옥상. 고르면 문이 닫히고(딩) 그 층 같은 자리로.
// 한 층씩 오르내리던 계단 표시(↑·↓ 두 개가 한 칸에 겹치던 것) 대신 한 번에 고른다. 옥상은 꼭대기 층에서 계단실로 걸어 나간다.
// 수배 중에도 탈 수 있다 — 다만 문 앞에 경찰이 보고 있으면 같이 탄 셈 (그 층에서 바로 다시 붙는다).
function elevStack(tx, ty) {
  const L = (S.ladders || []).filter(l => (l.kind === 'fstair' || l.kind === 'stair') && l.tx === tx && l.ty === ty);
  if (!L.length) return null; const fl = L.filter(l => l.kind === 'fstair'), roof = L.find(l => l.kind === 'stair');
  const top = Math.max(0, ...fl.map(l => l.tfl)); return { tx, ty, top, roof, fl };
}
function nearElevator() {
  const P = S.player; if (P.z || P.car || P.carrying?.fly) return null; let best = null, bd = 40;
  for (const l of S.ladders || []) { if ((l.kind !== 'fstair' && l.kind !== 'stair') || (l.bfl || 0) > flOf(P) || (l.kind === 'fstair' ? l.tfl < flOf(P) : l.bfl !== flOf(P))) continue;
    const d = dist(P.x, P.y, l.x, l.y); if (d < bd) { bd = d; best = l; } }
  return best ? elevStack(best.tx, best.ty) : null;
}
function elevatorAction() {
  if (!STAGE.cityLife) return null; const P = S.player; if (P.car || P.trav || P.hide || P.vent || P.wire || P.captive || actionBusy(P)) return null;
  const E = nearElevator(); if (!E || (E.top < 1 && !E.roof)) return null;
  return { k: 'evAct', label: `엘리베이터 · 지금 ${flOf(P) + 1}층`, at: { x: tc(E.tx), y: tc(E.ty) - 46 }, fn: () => elevatorPanel(E) };
}
function elevatorPanel(E) {
  const P = S.player, cur = flOf(P), rows = [];
  if (E.roof) rows.push({ name: '옥상', price: null, tag: '↑ 계단실', ok: true, buy: () => { close(); elevatorGo(E, 'roof'); } });
  for (let f = E.top; f >= 0; f--) rows.push({ name: `${f + 1}층`, price: null, tag: f === cur ? '여기' : f > cur ? '↑' : '↓', ok: f !== cur, buy: () => { close(); elevatorGo(E, f); } });
  const close = shopPanel('엘리베이터', rows); play('click', 0.4);
}
function elevatorGo(E, to) {
  const P = S.player, x = tc(E.tx), y = tc(E.ty), seen = S.wanted > 0 && S.guards.some(g => g.police && npcAlive(g) && !g.off && flOf(g) === flOf(P) && dist(g.x, g.y, P.x, P.y) < 260);
  doMotion({ x, y: y + 4, dur: 0.7, pose: 'idle', at: [[0.1, () => play('door', 0.45)]], end: () => {
    S.fade = 0.45; play('bell', 0.3, 1.6); fstat('elevator');
    const f = to === 'roof' ? E.roof.bfl : to; P.fl = f; P.z = 0; setLayer(f); P.x = x; P.y = y + 4; P.path = null; P.moving = false;
    if (P.carrying) { P.carrying.fl = f; P.carrying.x = P.x; P.carrying.y = P.y; }
    if (to === 'roof') { after(0.35, () => { if (flOf(S.player) === f && !S.player.trav) beginStairTravel(E.roof, true); }); evBanner('(옥상으로.)', '#c8c0b0'); }
    else evBanner(`${f + 1}층`, '#c8c0b0');
    if (seen) after(1, () => { for (const g of S.guards) if (g.police && npcAlive(g) && !g.off && dist(g.x, g.y, S.player.x, S.player.y) < 900) copChase(g); }); } });
}
