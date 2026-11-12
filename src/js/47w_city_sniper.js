// ---------------------------------------------------------------- 자유 모드 저격총 조준경
// 저격총을 든 채 걸어서 0.3초 멈추면 조준경: 시야가 넓어지고(1000px), 앞쪽 좁은 부채꼴(약 50°) 안 가장 가까운 사람(의뢰 표적 먼저)에 붉은 십자선.
// 움직이면 풀린다. 옥상에서 쏘면 건물 벽 위로 날아간다. 500px 넘게 떨어진 한 방은 짧은 느린 화면.
function scopeReady() { return !!S.scope; }
function sniperUpdate(dt) {
  if (!STAGE.cityLife) return; const P = S.player;
  const hold = S.wpn === 'sniper' && (S.guns?.sniper || 0) > 0 && !P.car && !P.trav && !P.hide && !P.moving && !S.downing && !S.cuffs && !S.safeIn;
  S.stillT = hold ? (S.stillT || 0) + dt : 0;
  const on = S.stillT > 0.3; if (on && !S.scope) play('click', 0.35, 1.6); S.scope = on;
  if (on && (S.scopeT = (S.scopeT || 0) - dt) <= 0) { S.scopeT = 0.12; S.snipeAim = true; S.scopeTgt = gunAim(); S.snipeAim = false; }
  if (!on) S.scopeTgt = null;
}
// 카메라 앞보기: 표적(없으면 바라보는 쪽 600px)까지의 45%
function scopeLead() { const P = S.player, g = S.scopeTgt, x = g ? g.x : P.x + Math.cos(P.a) * 600, y = g ? g.y : P.y + Math.sin(P.a) * 600; return { x: (x - P.x) * 0.45, y: (y - P.y) * 0.45 }; }
function drawScope() {
  if (!S.scope) return; const P = S.player, g = S.scopeTgt;
  const x = g ? g.x : P.x + Math.cos(P.a) * 600, y = g ? g.y - 14 : P.y + Math.sin(P.a) * 600, r = g ? 16 : 22;
  ctx.save(); ctx.strokeStyle = g ? 'rgba(255,60,50,.9)' : 'rgba(255,240,220,.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.beginPath(); ctx.moveTo(x + dx * (r - 6), y + dy * (r - 6)); ctx.lineTo(x + dx * (r + 8), y + dy * (r + 8)); ctx.stroke(); }
  ctx.setLineDash([2, 6]); ctx.strokeStyle = 'rgba(255,80,60,.35)'; ctx.beginPath(); ctx.moveTo(P.x, P.y - 14); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
}
