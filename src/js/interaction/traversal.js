function wallUpSpot() {
  if(STAGE.interiorOnly || groundedWorld())return null;
  const P = S.player, z0 = P.z || 0; if (flOf(P) || P.carrying || P.captive || P.jump || P.hide || P.trav || P.wire || P.under || P.vent || P.ledge) return null;
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE), fx = P.x - tx * TILE, fy = P.y - ty * TILE, z1 = z0 + 1;
  // 실내 가구·안쪽 벽은 외벽 등반 지점이 아니다. 지붕 없는 공터의 컨테이너는 유지한다.
  const inside = bldAt(tx, ty);
  if (!z0 && inside >= 0 && !BLD[inside].vacant) return null;
  const ok1 = (x, y) => inMap(x, y) && rLv(x, y) === z1 && !robAt(x, y);
  let best = null, bs = -9;
  for (const [nx, ny] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
    const ex = tx + nx, ey = ty + ny; if (z0 ? rLv(ex, ey) === z0 : !groundSolidP(ex, ey)) continue;
    // 벽(막힌 칸)이고 그 위가 한 층 높은 옥상 — 땅에서 볼 때 남쪽 정면벽 줄은 옥상 높이가 0으로 적혀 있으니 한 칸 안쪽을 본다
    const bi = bldAt(ex, ey), facade = !z0 && !ok1(ex, ey) && bi >= 0 && BLD[bi].h === 1 && ok1(ex + nx, ey + ny);
    if (!ok1(ex, ey) && !facade) continue;
    const gap = nx > 0 ? TILE - fx : nx < 0 ? fx : ny > 0 ? TILE - fy : fy; if (gap > 26) continue;  // 벽에 바짝
    const face = Math.cos(P.a) * nx + Math.sin(P.a) * ny; if (face < 0.3) continue;  // 벽을 보고 있을 때만
    if (face > bs) { bs = face; const ix = ok1(ex + nx, ey + ny) ? ex + nx : ex, iy = ok1(ex + nx, ey + ny) ? ey + ny : ey;
      best = { n: [nx, ny], z: z1, edge: { x: P.x + nx * gap, y: P.y + ny * gap }, top: { x: tc(ix), y: tc(iy) }, at: { x: P.x + nx * (gap + 10), y: P.y + ny * (gap + 10) } }; }
  }
  return best;
}
