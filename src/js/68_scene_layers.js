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
    // 경첩에서 옥상 쪽으로 열린 철문. 기존 옆벽은 시점 때문에 폭이 거의 보이지 않았다.
    const hx = d.x + tx * 13, hy = d.y + ty * 13, ex = hx + nx * 19 + tx * 9, ey = hy + ny * 19 + ty * 9;
    ctx.save(); ctx.fillStyle = '#566671'; ctx.strokeStyle = '#a4b4b8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.lineTo(ex, ey - 34); ctx.lineTo(hx, hy - 34); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d2d6bd'; ctx.fillRect(ex - 2, ey - 15, 3, 3);
    const k = Math.max(1, .9 / SCALE), x = d.x, y = d.y - 48;
    ctx.fillStyle = '#202c2c'; ctx.fillRect(x - 20 * k, y - 8 * k, 40 * k, 16 * k);
    ctx.strokeStyle = '#a5b3a1'; ctx.lineWidth = 1; ctx.strokeRect(x - 20 * k, y - 8 * k, 40 * k, 16 * k);
    ctx.fillStyle = '#dce4d5'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${11 * k}px "IBM Plex Sans KR",sans-serif`; ctx.fillText('계단', x, y); ctx.restore();
  }
}
