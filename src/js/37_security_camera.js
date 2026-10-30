// 실내 CCTV는 담당 경비의 작업점이 아닌, 같은 방의 벽 모서리에 설치한다.
// 문을 경계로 방을 나누고 실제 벽 시야로 후보를 평가한다. 외부 카메라·서치라이트는 유지한다.
function mountIndoorCamera(c, mounted) {
  if (c.search || c.tx == null || c.ty == null || c.wallMount) return;
  const bi = bldAt(c.tx, c.ty), B = BLD[bi], f = c.fl || 0, grid = f ? GF[f] : G0;
  if (!B || B.vacant || !grid) return;
  const door = (x, y) => !f && S.doors.some(d => d.tx === x && d.ty === y);
  const free = (x, y) => inMap(x, y) && bldAt(x, y) === bi && !SOLID.has(grid[y][x]) && !door(x, y);
  if (!free(c.tx, c.ty)) return;
  const room = [[c.tx, c.ty]], visited = new Set([c.tx + ',' + c.ty]);
  for (let i = 0; i < room.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = room[i][0] + dx, y = room[i][1] + dy, k = x + ',' + y;
    if (free(x, y) && !visited.has(k)) { visited.add(k); room.push([x, y]); }
  }
  const wall = (x, y) => !inMap(x, y) || '#NSXV'.includes(grid[y][x]);
  const L0 = CUR_F; setLayer(f); let best = null;
  for (const [tx, ty] of room) for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    if (!wall(tx + sx, ty) || !wall(tx, ty + sy)) continue;
    const x = tc(tx) + sx * (TILE / 2 - 9), y = tc(ty) + sy * (TILE / 2 - 9), base = Math.atan2(-sy, -sx), sweep = Math.min(c.sweep, Math.PI / 6);
    let seen = 0;
    for (const [rx, ry] of room) {
      const px = tc(rx), py = tc(ry), d = dist(x, y, px, py), a = Math.atan2(py - y, px - x);
      if (d <= 360 && Math.abs(angDiff(base, a)) <= sweep + camFov(c) && castRay(x, y, a, d) >= d - 6) seen++;
    }
    const post = Math.min(180, ...S.guards.filter(g => flOf(g) === f && !g.civ && !g.dog).map(g => dist(x, y, g.x, g.y)));
    const separation = (mounted || []).some(o => o.fl === f && dist(o.x, o.y, x, y) < 80) ? 8 : 0;
    const score = seen / room.length * 20 + post / 90 - separation;
    if (!best || score > best.score) best = { x, y, tx, ty, base, sweep, score, sx, sy };
  }
  setLayer(L0);
  if (!best) return;
  Object.assign(c, { x: best.x, y: best.y, tx: best.tx, ty: best.ty, base: best.base, a: best.base, sweep: best.sweep, b: bi, outdoor: false,
    wallMount: { rev: 1, sx: best.sx, sy: best.sy, roomTiles: room.length } });
}
function syncCameraLayout() {
  const mounted = [];
  for (const c of S.cams || []) { mountIndoorCamera(c, mounted); mounted.push(c); }
}
