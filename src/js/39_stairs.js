// 계단 그림·입구·이동·도착·NPC 길찾기가 함께 쓰는 층별 구조.
let STAIR_LAYOUT = [];
function stairsInit(capture = false) {
  // 구버전 저장의 고정 계단 타일만 이관한다. 열린 문·창과 진행 상태는 유지한다.
  if (capture) {
    const cells = new Map();
    for (const l of S.ladders.filter(l => l.kind === 'fstair')) {
      const grid = GF[l.tfl]; if (!grid) continue;
      for (let y = l.ty - 3; y <= l.ty + 3; y++) for (let x = l.tx - 3; x <= l.tx + 3; x++) {
        if (grid[y] && 'KYEwv'.includes(grid[y][x])) cells.set(l.tfl + ':' + x + ',' + y, { fl: l.tfl, x, y, ch: grid[y][x] });
      }
    }
    STAIR_LAYOUT = [...cells.values()];
  } else if (S.stairVersion !== 2) {
    for (const c of STAIR_LAYOUT) if (GF[c.fl] && 'KYEwv'.includes(GF[c.fl][c.y][c.x])) GF[c.fl][c.y][c.x] = c.ch;
  }
  S.stairVersion = 2; S.stairPlan = {};
  for (const l of S.ladders) if (l.kind === 'fstair' || l.kind === 'stair') {
    stairFloor(l.tx, l.ty, l.bfl || 0);
    if (l.kind === 'fstair') stairFloor(l.tx, l.ty, l.tfl);
  }
  S.lvl = null;
}
function stairFloor(tx, ty, fl) {
  const key = fl + ':' + tx + ',' + ty;
  if (S.stairPlan && S.stairPlan[key]) return S.stairPlan[key];
  const L0 = CUR_F; setLayer(fl);
  const w = STAIRW[key], d = w ? w.d : stairDir(tx, ty), shaft = { x: tc(tx), y: tc(ty) };
  const entry = { x: shaft.x + d[0] * TILE, y: shaft.y + d[1] * TILE };
  const incoming = S.ladders.some(l => l.kind === 'fstair' && l.tx === tx && l.ty === ty && l.tfl === fl);
  const g = { fl, d: d.slice(), shaft, up: { entry, marker: { x: (shaft.x + entry.x) / 2, y: (shaft.y + entry.y) / 2 } }, compact: incoming && !w, well: null };
  if (w) {
    const c1 = { x: tc(tx + w.s[0]), y: tc(ty + w.s[1]) }, c2 = { x: c1.x + d[0] * TILE, y: c1.y + d[1] * TILE };
    g.well = { c1, c2, s: w.s.slice(), d: d.slice(), e: { tx: tx + d[0], ty: ty + d[1] }, top: { tx: tx + w.s[0] + 2 * d[0], ty: ty + w.s[1] + 2 * d[1] } };
    g.down = { entry: { x: c2.x + d[0] * TILE, y: c2.y + d[1] * TILE }, marker: { x: c2.x + d[0] * TILE / 2, y: c2.y + d[1] * TILE / 2 } };
  } else g.down = { entry: Object.assign({}, entry), marker: Object.assign({}, entry) };
  setLayer(L0);
  (S.stairPlan || (S.stairPlan = {}))[key] = g; return g;
}
const stairLower = l => stairFloor(l.tx, l.ty, l.bfl || 0);
const stairUpper = l => stairFloor(l.tx, l.ty, l.tfl);
function roofStairAccess(l, P = S.player) {
  const d = l.roofDoor;
  if (l.kind !== 'stair' || !d || P.z !== l.tz || flOf(P)) return false;
  const x = P.x - d.x, y = P.y - d.y, depth = x * d.dx + y * d.dy;
  return depth >= -4 && depth <= 24 && Math.abs(x * -d.dy + y * d.dx) <= 18 && objectReachable(d, 34);
}
function stairAccess(l, up, P = S.player) {
  if (P.z || flOf(P) !== (up ? l.bfl || 0 : l.tfl)) return false;
  const g = up ? stairLower(l) : stairUpper(l), d = g.d;
  if (up) {
    const vx = P.x - g.shaft.x, vy = P.y - g.shaft.y, along = vx * d[0] + vy * d[1], side = Math.abs(vx * -d[1] + vy * d[0]);
    if (along < -8 || along > (g.compact ? 23 : TILE * 1.5) || side > 23) return false;
    const a = clamp(along, 0, TILE);
    return objectReachable({ x: g.shaft.x + a * d[0], y: g.shaft.y + a * d[1], fl: g.fl }, TILE);
  }
  const e = g.down.entry, m = g.down.marker, vx = P.x - m.x, vy = P.y - m.y, depth = vx * d[0] + vy * d[1];
  if (Math.abs(vx * -d[1] + vy * d[0]) > 23 || depth < (g.well ? 10 : -10) || depth > (g.well ? 52 : 30)) return false;
  return objectReachable({ x: e.x, y: e.y, fl: g.fl }, 60);
}
function stairTravel(l, actor, up) {
  const lower = stairLower(l), roof = l.kind === 'stair', upper = !roof && stairUpper(l), start = { x: actor.x, y: actor.y };
  const pad = roof ? { x: l.rx != null ? l.rx : l.ux, y: l.ry != null ? l.ry : l.uy } : upper.down.entry;
  const door = roof ? l.roofDoor || { x: l.ux, y: l.uy } : null;
  let nodes, cross;
  if (roof) {
    nodes = up ? [[start, 'walk'], [lower.shaft, 'walk'], [door, 'stairHidden'], [pad, 'walk']]
      : [[start, 'walk'], [door, 'walk'], [lower.shaft, 'stairHidden'], [lower.up.entry, 'walk']];
    cross = up ? 1 : 2;
  } else if (upper.well) {
    const h = upper.well;
    nodes = up ? [[start, 'walk'], [lower.shaft, 'walk'], [h.c1, 'stairHidden'], [h.c2, 'stairRise'], [pad, 'walk']]
      : [[start, 'walk'], [h.c2, 'walk'], [h.c1, 'stairSink'], [lower.shaft, 'stairHidden'], [lower.up.entry, 'walk']];
    cross = up ? 2 : 3;
  } else {
    nodes = up ? [[start, 'walk'], [lower.shaft, 'walk'], [upper.shaft, 'stairHidden'], [pad, 'stairRise']]
      : [[start, 'walk'], [upper.shaft, 'stairSink'], [lower.shaft, 'stairHidden'], [lower.up.entry, 'walk']];
    cross = 2;
  }
  let total = 0; const lengths = [0];
  for (let i = 1; i < nodes.length; i++) { total += Math.max(16, dist(nodes[i-1][0].x, nodes[i-1][0].y, nodes[i][0].x, nodes[i][0].y)); lengths.push(total); }
  const pts = nodes.map(([p], i) => ({ x: p.x, y: p.y, f: lengths[i] / total }));
  const dest = up ? { fl: roof ? 0 : l.tfl, z: roof ? l.tz : 0 } : { fl: l.bfl || 0, z: 0 };
  return { pts, phases: nodes.slice(1).map((n, i) => ({ to: pts[i+1].f, pose: n[1] })), dur: Math.max(.75, total / (actor.carrying || actor.captive ? 100 : 135)),
    crossing: { at: pts[cross].f, fl: dest.fl, z: dest.z }, stairs: { up, roof, dest, lower: lower.up.entry, upper: pad } };
}
function crossStairLevel(actor, T, f) {
  if (!T.crossing || T.crossed || f < T.crossing.at) return;
  T.crossed = true; actor.fl = T.crossing.fl; actor.z = T.crossing.z; setLayer(flOf(actor));
  if (actor === S.player) S.fade = Math.max(S.fade || 0, .12);
}
function beginStairTravel(l, up) {
  const P = S.player, plan = stairTravel(l, P, up), end = plan.pts[plan.pts.length - 1];
  P.cover = null; P.snap = null;
  let mx = (S.keys.ArrowRight ? 1 : 0) - (S.keys.ArrowLeft ? 1 : 0), my = (S.keys.ArrowDown ? 1 : 0) - (S.keys.ArrowUp ? 1 : 0);
  if (input.joy && input.joy.mag > .1) { mx = input.joy.x; my = input.joy.y; }
  const mag = Math.hypot(mx, my); S.stairArm = mag <= .1; S.stairDir = mag > .1 ? [mx / mag, my / mag] : [0, 0];
  startTrav(Object.assign(plan, { end: () => {
    P.fl = plan.stairs.dest.fl; P.z = plan.stairs.dest.z; P.x = end.x; P.y = end.y; P.vx = P.vy = 0; setLayer(flOf(P));
    play(up ? 'step_w1' : 'step_w0', .3);
    if (up && l.kind === 'fstair') hint('floors', '계단 입구로 들어가면 아래층으로 내려간다');
  } }));
}
