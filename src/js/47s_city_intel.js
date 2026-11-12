// ---------------------------------------------------------------- 자유 모드 정보원 (의뢰 정찰)
// 의뢰 중에 아무 공중전화나 걸면 정보원이 받는다. 100만을 내면:
//   · 표적이 도는 길(미니맵에 붉은 점선)과 경호원 위치를 끝날 때까지 보여 준다. 사진 의뢰면 얼굴도 확인된 셈이다.
//   · '빈틈'을 알려 준다: 40초 뒤 표적이 길 모퉁이에서 혼자 담배를 피운다(25초). 경호원은 차를 가지러 떨어져 간다.
// 돈이 없으면 정보도 없다. 한 의뢰에 한 번.
const INFORMANT = { note: '정보원' };
const INTEL_PRICE = 100, INTEL_WAIT = 40, INTEL_BREAK = 25;
function intelLines(h) {
  if (h.intel) return [['hero', '...신호음뿐이다. 정보원은 이미 할 말을 다 했다.']];
  if ((S.cash || 0) < INTEL_PRICE) return [[INFORMANT, `${h.name}? 알지. 근데 ${INTEL_PRICE}만 없으면 입이 안 떨어지는데.`], ['hero', '...끊는다.']];
  const corner = h.intelCorner = intelCorner(h), dir = corner ? DIR8[((Math.round(Math.atan2(corner.y - S.player.y, corner.x - S.player.x) / (Math.PI / 4)) % 8) + 8) % 8] : '';
  return [[INFORMANT, `${h.name}? ${INTEL_PRICE}만. ...좋아, 받았다.`], [INFORMANT, `그놈 도는 길을 네 지도에 찍어 줬다. 경호원 ${h.escorts.length}명 자리도.`],
    [INFORMANT, `그리고 하나 더. ${INTEL_WAIT}초 뒤에 ${dir} 블록, 그때 제일 가까운 모퉁이에서 혼자 담배를 피운다. 경호원은 차 가지러 간다. ${INTEL_BREAK}초다.`], ['hero', '...충분해.']];
}
// 빈틈 자리: 표적이 도는 길의 모퉁이 중 지금 표적에서 두 칸 앞
function intelCorner(h) { const r = h.g.route || []; if (!r.length) return null; const p = r[((h.g.ri || 0) + 2) % r.length]; return { x: p.x, y: p.y }; }
function intelBuy(h) {
  if (h.intel || (S.cash || 0) < INTEL_PRICE) return false;
  S.cash -= INTEL_PRICE; h.intel = true; h.spotted = true; fstat('intel');
  const c = h.intelCorner || intelCorner(h); if (c) h.brk = { at: S.t + INTEL_WAIT, dur: INTEL_BREAK, x: c.x, y: c.y, on: false, done: false };
  play('loot', 0.4); return true;
}
function intelUpdate() {
  const h = S.hit, B = h && h.brk; if (!B || B.done) return; const g = h.g;
  if (!npcAlive(g)) { B.done = true; return; }
  if (!B.on && S.t >= B.at && !['PATROL', 'RETURN'].includes(g.state)) { B.done = true; evBanner(`${h.name}이(가) 경계 중이다 — 빈틈은 없다`, '#c8c0b0'); return; }  // 이미 들켰으면 담배는 없다
  if (!B.on && S.t >= B.at) {
    B.on = true; B.route = g.route; B.ri = g.ri;
    { let bd = 1e9; for (const q of g.route || []) { const d = dist(q.x, q.y, g.x, g.y); if (d < bd) { bd = d; B.x = q.x; B.y = q.y; } } }  // 그때 가장 가까운 모퉁이
    g.route = [{ x: B.x, y: B.y, pause: 999 }]; g.ri = 0; g.wait = 0; g.path = null;
    B.esc = h.escorts.map(e => ({ e, follow: e.follow, route: e.route }));
    h.escorts.forEach((e, i) => { if (!npcAlive(e)) return; const a = Math.atan2(e.y - B.y, e.x - B.x) + (i - 0.5) * 0.6; e.follow = null; e.route = [{ x: B.x + Math.cos(a) * 520, y: B.y + Math.sin(a) * 520, pause: 999 }]; e.ri = 0; e.wait = 0; e.path = null; });
    gsay(g, '먼저 가 있어. 한 대 피우고 간다.', 2.4); evBanner(`빈틈 — ${h.name}이(가) 혼자 담배를 피운다 · ${B.dur}초`, '#ffd76a'); play('click', 0.5, 0.8);
  }
  if (B.on && S.t >= B.at + B.dur) {
    B.done = true; if (npcAlive(g) && g.state !== 'ALERT') { g.route = B.route; g.ri = B.ri || 0; g.wait = 0; g.path = null; gsay(g, '가자.', 1.4); }
    for (const o of B.esc || []) if (npcAlive(o.e) && o.e.state !== 'ALERT') { o.e.follow = o.follow; o.e.route = o.route; o.e.path = null; o.e.wait = 0; }
    if (!S.hit || S.hit === h) evBanner('빈틈이 닫혔다 — 경호원이 돌아온다', '#c8c0b0');
  }
}
// 담배 연기 (빈틈 동안 표적 머리 위)
function drawIntel() {
  const h = S.hit, B = h && h.brk; if (!B || !B.on || B.done || !npcAlive(h.g)) return; const g = h.g; if (!inView(g.x, g.y, 60)) return;
  fxFrame('cig', S.t + g.id * 0.3, g.x + 6, g.y - 25, 1, 1);  // 도트 담배 연기 (PixelFX 연기 퍼프)
}
// 미니맵: 표적 길(붉은 점선) · 경호원 점 · 빈틈 자리
function drawMiniIntel(x, T) {
  const h = S.hit; if (!h || !h.intel || !npcAlive(h.g)) return; const r = h.brk && h.brk.on && !h.brk.done ? h.brk.route : h.g.route;
  if (r && r.length > 1) { x.save(); x.strokeStyle = 'rgba(255,110,90,.85)'; x.lineWidth = 1.5; x.setLineDash([3, 3]); x.beginPath(); r.forEach((p, i) => i ? x.lineTo(T(p.x), T(p.y)) : x.moveTo(T(p.x), T(p.y))); x.closePath(); x.stroke(); x.restore(); }
  x.fillStyle = '#ff5a46'; for (const e of h.escorts) if (npcAlive(e)) x.fillRect(T(e.x) - 1.5, T(e.y) - 1.5, 3, 3);
  if (h.brk && !h.brk.done) { x.strokeStyle = '#ffd76a'; x.lineWidth = 1.5; x.beginPath(); x.arc(T(h.brk.x), T(h.brk.y), 4, 0, TAU); x.stroke(); }
}
