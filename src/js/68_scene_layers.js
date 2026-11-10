// 열린 실내 위에 옥상·거리 그래픽을 덮지 않는다. 사물 좌표와 상호작용은 바꾸지 않는다.
function clipExteriorFromInterior(bi, fl) {
  if (tactical || !fl || bi < 0 || !BLD[bi]) return false;
  const b = BLD[bi], w = W / SCALE, h = H / SCALE;
  ctx.save(); ctx.beginPath();
  ctx.rect(cam.x - w / 2 - TILE, cam.y - h / 2 - TILE, w + 2 * TILE, h + 2 * TILE);
  ctx.rect(b.x0 * TILE, b.y0 * TILE, (b.x1 - b.x0 + 1) * TILE, (b.y1 - b.y0 + 1) * TILE);
  ctx.clip('evenodd'); return true;
}
// The purchased stair hut already contains the door. Extra floor rectangles
// and floating entrance plaques duplicated it and covered its lower pixels.
function drawRoofEntrances(P) {}
