// 대청소 빌라 한 채에서만 시험한다. 기존 평면·좌표·그림 캐시를 그대로 쓴다.
function hasHeightCues(bi) {
  return !!(STAGE.heightCueBuildings && STAGE.heightCueBuildings.includes(bi) && BLD[bi]);
}
function paintInteriorCuts(x, b, fl) {
  if (!fl) return;
  const grid = GF[fl]; if (!grid) return;
  const wall = (tx, ty) => grid[ty] && grid[ty][tx] === '#';
  x.save();
  for (let ty = b.y0; ty <= b.y1; ty++) for (let tx = b.x0; tx <= b.x1; tx++) {
    if (!wall(tx, ty)) continue;
    const px = tx * TILE, py = ty * TILE;
    // 잘린 벽의 윗면. 앞면은 실제 막힌 칸 안에서만 깊이를 준다.
    x.fillStyle = '#525853'; x.fillRect(px, py, TILE, TILE);
    x.fillStyle = '#73786f'; x.fillRect(px, py + 3, TILE, 5);
    if (!wall(tx, ty + 1)) {
      if (kitOk(kitTex.wall)) x.drawImage(kitTex.wall, 0, 16, 64, 48, px, py + 28, TILE, 20);
      else { x.fillStyle = '#474943'; x.fillRect(px, py + 28, TILE, 20); }
      x.fillStyle = 'rgba(19,25,25,.25)'; x.fillRect(px, py + 28, TILE, 20);
      x.fillStyle = '#b2b2a3'; x.fillRect(px, py + 23, TILE, 5);
      x.fillStyle = '#797e73'; x.fillRect(px, py + 28, TILE, 2);
      x.fillStyle = '#232b2c'; x.fillRect(px, py + TILE - 3, TILE, 3);
    }
    if (!wall(tx - 1, ty)) { x.fillStyle = '#a1a494'; x.fillRect(px + 2, py + 3, 3, TILE - 4); }
    if (!wall(tx + 1, ty)) { x.fillStyle = '#303b3b'; x.fillRect(px + TILE - 6, py + 3, 6, TILE - 3); }
  }
  x.restore();
}
function drawFloorThickness(b, fl) {
  const x = b.x0 * TILE, y = (b.y1 + 1) * TILE, w = (b.x1 - b.x0 + 1) * TILE, depth = Math.min(20, 8 + fl * 4);
  ctx.save();
  // 바닥 아래 단면만 더한다. 방·창문·계단·발 위치를 이동시키지 않는다.
  ctx.fillStyle = 'rgba(0,0,0,.48)'; ctx.fillRect(x + 7, y + depth, w - 3, 6);
  ctx.fillStyle = '#343f43'; ctx.fillRect(x, y, w, depth);
  ctx.fillStyle = '#6f7978'; ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = '#242f35'; ctx.fillRect(x, y + depth - 4, w, 4);
  ctx.strokeStyle = 'rgba(17,24,29,.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); for (let sx = x + TILE * 2; sx < x + w; sx += TILE * 2) { ctx.moveTo(sx, y + 4); ctx.lineTo(sx, y + depth - 4); } ctx.stroke();
  ctx.restore();
}
function drawRoofCoping(b) {
  const x = b.x0 * TILE, y = b.y0 * TILE, w = (b.x1 - b.x0 + 1) * TILE, h = b.roofC.rh;
  ctx.save();
  // 낮은 난간의 윗면과 안쪽 그림자. 정면의 두께는 원래 외벽 줄에 놓인다.
  ctx.fillStyle = 'rgba(0,0,0,.33)';
  ctx.fillRect(x + 7, y + 7, w - 14, 5); ctx.fillRect(x + 7, y + 7, 5, h - 16);
  ctx.fillRect(x + w - 12, y + 7, 5, h - 16); ctx.fillRect(x + 7, y + h - 12, w - 14, 5);
  ctx.fillStyle = '#697370'; ctx.fillRect(x + 1, y + 1, w - 2, 5);
  ctx.fillRect(x + 1, y + 1, 5, h - 2); ctx.fillRect(x + w - 6, y + 1, 5, h - 2);
  ctx.fillStyle = '#93998b'; ctx.fillRect(x + 2, y + 1, w - 4, 2); ctx.fillRect(x + 1, y + 2, 2, h - 4);
  ctx.fillStyle = '#354247'; ctx.fillRect(x + 1, y + h - 2, w - 2, 9);
  ctx.fillStyle = '#9c9f91'; ctx.fillRect(x + 1, y + h - 5, w - 2, 4);
  ctx.fillStyle = '#606e6c'; ctx.fillRect(x + 1, y + h - 1, w - 2, 2);
  ctx.fillStyle = 'rgba(18,25,27,.55)';
  for (let sx = x + TILE; sx < x + w; sx += TILE) { ctx.fillRect(sx, y + 1, 1, 5); ctx.fillRect(sx, y + h - 5, 1, 12); }
  ctx.restore();
}
