function killBlockReason() {
  const P = S.player; if (P.ledge || actionBusy(P) || P.hide || P.vent || P.under || P.wire) return null;
  let best = null, bd = 78;
  for (const g of S.guards) { if (g.civ || g.dog || g.doomed || g.dropped || ['DEAD', 'CAPTIVE'].includes(g.state) || g.climb || flOf(g) !== flOf(P)) continue; const d = dist(P.x, P.y, g.x, g.y); if (d < bd) { bd = d; best = g; } }
  if (!best || canKill(best, P) || canKill(best, P, LUNGE)) return null;
  const g = best, behind = Math.abs(angDiff(g.a, Math.atan2(P.y - g.y, P.x - g.x))) > 1.75;
  const why = P.carrying || P.captive ? '운반 중에는 공격할 수 없다' : (g.z || 0) !== (P.z || 0) ? '높이가 다르다' : g.state === 'ALERT' && !radioBusy(g) ? (g.seen?'교전 중 · 시야를 끊기':'경계 중 · 뒤로 접근') : !behind ? '정면에서는 불가 · 등 뒤로 접근' : !los(P.x, P.y, g.x, g.y) ? '장애물에 가려져 있다' : '접근 경로가 막혀 있다';
  return { g, why };
}
function drawKillBlock() {
  const r = killBlockReason(); if (!r || grabAction().near) return; const ka = attackAction(); if (ka.k !== 'none') return;  // [공격]이 할 수 있는 게 있으면 이유는 보이지 않는다
  const k = Math.max(1, 0.9 / SCALE); tag(r.g.x, r.g.y + 40 * k, '× ' + r.why, '#ff9a86', 0.95, null, 2);
}
// 어쌔신 크리드식 머리 위 발견 표시: 아래를 향한 삼각형이 밑에서부터 찬다. 흰색 = 눈치, 노랑 = 의심, 빨강 = 발각
function drawAwareMark(g) {
  const awareness=guardAwareness(g), al=awareness.phase==='seen', m=awareness.progress, col=awareness.color, k = Math.max(1, 0.9 / SCALE), x = g.x, y = g.y - 40 * k, w = 13 * k, h = 15 * k;
  MARK_R.push([x - w - 2, y - h - 4, x + w + 2, y + h + 2]);
  const pulse = al ? 1 : m > 0.75 ? 0.75 + 0.25 * Math.sin(S.t * 14) : 1;
  ctx.save(); ctx.globalAlpha = pulse;
  ctx.beginPath(); ctx.moveTo(x - w, y - h); ctx.lineTo(x + w, y - h); ctx.lineTo(x, y + h * 0.55); ctx.closePath();
  ctx.fillStyle = 'rgba(7,10,18,.78)'; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = col; const top = y + h * 0.55 - (h * 1.55) * m; ctx.fillRect(x - w, top, w * 2, y + h * 0.55 - top); ctx.restore();
  ctx.lineWidth = 2 * k; ctx.strokeStyle = col; ctx.stroke();
  const glyph = al ? '!' : awareness.phase==='search'||awareness.phase==='suspect' ? '?' : '';
  if (glyph) { ctx.font = uiFont(Math.round(13 * k)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = m > 0.55 ? '#140d08' : col; ctx.fillText(glyph, x, y - h * 0.32); ctx.textBaseline = 'alphabetic'; }
  ctx.restore();
}
// 내 둘레의 방향 표시: 나를 보고 있는 사람 쪽으로 호가 생기고 게이지만큼 길고 진해진다. 시야에서 놓친 자리에는 흐린 그림자(마지막으로 본 곳)
function drawAwareness(P) {
  if (P.hide || P.vent || P.under) return;
  const k = Math.max(1, 0.9 / SCALE), R = 34 * k;
  if (S.guards.some(g => !g.civ && g.meter > 0.08 && g.state !== 'ALERT')) hint('aware', '경비 머리 위 표시: 흰색은 주시, 노랑은 의심, 빨강은 발각. 시야를 벗어나면 게이지가 줄어든다');
  const hw = W / SCALE / 2 - 10, hh = H / SCALE / 2 - 10; let ring = false;
  for (const g of S.guards) {
    if (g.civ || g.dog || g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) !== flOf(P) || dist(g.x, g.y, P.x, P.y) > 1100) continue;  // 다른 층은 표시하지 않는다
    const aw=guardAwareness(g),al=aw.phase==='seen',m=aw.progress;if(!aw.direct||m<.03)continue;
    if (!ring) { ring = true; ctx.strokeStyle = 'rgba(244,241,234,.14)'; ctx.lineWidth = 1.5 * k; ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.stroke(); }  // 고리 바탕 (어쌔신 크리드 유니티식)
    const a = Math.atan2(g.y - P.y, g.x - P.x), span = 0.22 + 0.5 * m;
    ctx.strokeStyle = awareCol(g); ctx.globalAlpha = 0.35 + 0.6 * m; ctx.lineWidth = (3 + 3 * m) * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(P.x, P.y, R, a - span / 2, a + span / 2); ctx.stroke(); ctx.lineCap = 'butt';
    if (Math.abs(g.x - cam.x) > hw || Math.abs(g.y - cam.y) > hh) {  // 화면 밖 사람: 바깥쪽 삼각형으로 '그쪽에서 본다'
      const tx = P.x + Math.cos(a) * (R + 9 * k), ty = P.y + Math.sin(a) * (R + 9 * k), r6 = 6 * k;
      ctx.fillStyle = awareCol(g); ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * r6, ty + Math.sin(a) * r6); ctx.lineTo(tx + Math.cos(a + 2) * r6 * 0.8, ty + Math.sin(a + 2) * r6 * 0.8); ctx.lineTo(tx + Math.cos(a - 2) * r6 * 0.8, ty + Math.sin(a - 2) * r6 * 0.8); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
// ---- 프리렌더 캐릭터 (3D 모델을 8방향으로 미리 찍은 시트, Commandos 방식). 색 키 시트 한 장을 역할별 옷 색으로 바꿔 쓴다
