// 열린 실내 위에 옥상·거리 그래픽을 덮지 않는다. 사물 좌표와 상호작용은 바꾸지 않는다.
function clipExteriorFromInterior(bi, fl) {
  if (tactical || !fl || bi < 0 || !BLD[bi]) return false;
  const b = BLD[bi], w = W / SCALE, h = H / SCALE;
  ctx.save(); ctx.beginPath();
  ctx.rect(cam.x - w / 2 - TILE, cam.y - h / 2 - TILE, w + 2 * TILE, h + 2 * TILE);
  ctx.rect(b.x0 * TILE, b.y0 * TILE, (b.x1 - b.x0 + 1) * TILE, (b.y1 - b.y0 + 1) * TILE);
  ctx.clip('evenodd'); return true;
}
// 옆면 문도 입구로 읽히게 한다. 실제 문턱과 진입 방향을 그대로 사용한다.
function drawRoofEntrances(P) {
  if (!P.z || flOf(P) || tactical) return;
  for (const l of S.ladders) {
    const d = l.roofDoor;
    if (!d || l.tz !== P.z || dist(P.x, P.y, d.x, d.y) > 300) continue;
    const nx = d.dx, ny = d.dy, tx = -ny, ty = nx;
    ctx.save(); ctx.translate(d.x, d.y); ctx.transform(nx, ny, tx, ty, 0, 0);
    ctx.fillStyle = '#686d68'; ctx.fillRect(3, -15, 29, 30);
    ctx.strokeStyle = '#a8b2a4'; ctx.lineWidth = 1; ctx.strokeRect(3.5, -14.5, 28, 29);
    ctx.strokeStyle = '#d1d4bc'; ctx.lineWidth = 2;
    ctx.beginPath(); for (const u of [7, 13, 19]) { ctx.moveTo(u, -8); ctx.lineTo(u, 8); } ctx.stroke();
    ctx.fillStyle = '#e1e6d2'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(10, -4); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill(); ctx.restore();
    const k = Math.max(1, .9 / SCALE), x = d.x, y = d.y - 48;
    ctx.fillStyle = '#202c2c'; ctx.fillRect(x - 20 * k, y - 8 * k, 40 * k, 16 * k);
    ctx.strokeStyle = '#a5b3a1'; ctx.lineWidth = 1; ctx.strokeRect(x - 20 * k, y - 8 * k, 40 * k, 16 * k);
    ctx.fillStyle = '#dce4d5'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = uiFont(11 * k); ctx.fillText('↓ '+((l.bfl||0)+1)+'층', x, y); ctx.restore();
  }
}
