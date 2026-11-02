const ROOF_SOLID = { okt: 1, tank: 1, stair: 1 };
function roofProps(b, bi) {
  if (!b.facade || b.fh !== b.h || b.piloti) return [];
  const x0 = b.x0, x1 = b.x1, ry0 = b.y0, ry1 = b.y1 - b.fh, w = x1 - x0 + 1, dr = ry1 - ry0 + 1, L = lvAt(x0, ry0);
  if (dr < 2 || L <= 0) return [];
  for (let y = ry0; y <= ry1; y++) for (let x = x0; x <= x1; x++) if (rLv(x, y) !== L || bldAt(x, y) !== bi) return [];
  const house = b.kind === 'house', shop = b.kind === 'shop', glass = !!b.glass, mansard = false, fr = 0, uy1 = ry1 - fr, hs = hN(x0, ry0, w, b.h);
  const K = (x, y) => x + ',' + y, hard = new Set(), soft = new Set();
  const mark = (x, y) => { if (x >= x0 && x <= x1 && y >= ry0 && y <= ry1) hard.add(K(x, y)); };
  // 옥상 계단실: 건물 안 계단('Y') 바로 위에 선다. 문은 걸을 수 있는 옥상 칸 쪽(남·서·동·북 순)으로, 오르내리는 자리는 문 앞
  const shs = [];
  (S.ladders || []).forEach(l => {
    if (l.kind !== 'stair' || l.tz !== L || bldAt(l.tx, l.ty) !== bi || rLv(l.tx, l.ty) !== L) return;
    const okc = (x, y) => x >= x0 && x <= x1 && y >= ry0 && y <= ry1 && rLv(x, y) === L;
    const dirs = [['S', 0, 1], ['W', -1, 0], ['E', 1, 0], ['N', 0, -1]], d = dirs.find(([, dx, dy]) => okc(l.tx + dx, l.ty + dy)); if (!d) return;
    const [dn, ddx, ddy] = d, side = ddy ? [[1, 0], [-1, 0]] : [[0, -1], [0, 1]];
    const ex = side.map(([sx, sy]) => [l.tx + sx, l.ty + sy]).find(([x, y]) => okc(x, y) && !(x === l.tx + ddx && y === l.ty + ddy));
    shs.push({ l, dn, door: [l.tx + ddx, l.ty + ddy], cells: ex ? [[l.tx, l.ty], ex] : [[l.tx, l.ty]] });
  });
  const shSet = new Set(shs.map(h => h.l));
  (S.ladders || []).forEach(l => { if (shSet.has(l)) { const h = shs.find(q => q.l === l); mark(h.door[0], h.door[1]); return; } if (l.tz === L || l.tz > 0) mark(l.tx, l.ty); if (l.bz > 0) mark(l.bx, l.by); });
  (S.vents || []).forEach(v => { if (v.roof) mark(v.tx, v.ty); });
  PLANKS.forEach(p => { for (let x = p.x0; x <= p.x1; x++) for (let y = p.y0; y <= p.y1; y++) mark(x, y); for (const e of [p.a, p.b]) if (e) mark(e.x, e.y); });
  (S.traps || []).forEach(t => { [t.at, t.sw].forEach(p => p && mark(p[0], p[1])); });
  (S.wires || []).forEach(wi => [wi.a, wi.b].forEach(n => n && !n.pole && mark(n.tx, n.ty)));
  [STAGE.start, STAGE.exit].forEach(p => p && mark(Math.floor(p[0]), Math.floor(p[1])));
  const roofSol = (x, y) => rLv(x, y) !== L;
  (S.guards || []).forEach(g => {
    if ((g.z || 0) !== L || bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)) !== bi) return;
    const pts = (g.route || []).map(p => [Math.floor(p.x / TILE), Math.floor(p.y / TILE)]); pts.push([Math.floor(g.x / TILE), Math.floor(g.y / TILE)]);
    pts.forEach(p => mark(p[0], p[1]));
    for (let i = 0; i + 1 < pts.length; i++) astar(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], roofSol).forEach(p => mark(Math.floor(p.x / TILE), Math.floor(p.y / TILE)));
    if (pts.length > 2) astar(pts[pts.length - 2][0], pts[pts.length - 2][1], pts[0][0], pts[0][1], roofSol).forEach(p => mark(Math.floor(p.x / TILE), Math.floor(p.y / TILE)));
  });
  hard.forEach(k => { const [x, y] = k.split(',').map(Number); for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) soft.add(K(x + ox, y + oy)); });
  const occ = new Set(), sol = new Set(), out = [];
  const connected = () => {  // 막힘을 넣어도 옥상이 한 덩어리로 이어져 있는가
    let st = null, n = 0; for (let y = ry0; y <= ry1; y++) for (let x = x0; x <= x1; x++) if (!sol.has(K(x, y))) { n++; if (!st) st = [x, y]; }
    const seen = new Set([K(...st)]), q = [st];
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = K(nx, ny); if (nx < x0 || nx > x1 || ny < ry0 || ny > ry1 || seen.has(k) || sol.has(k)) continue; seen.add(k); q.push([nx, ny]); } }
    return seen.size === n;
  };
  const take = (cw, cd, cands, solid) => {
    for (const [cx, cy] of cands) {
      if (cx < x0 || cx + cw - 1 > x1 || cy < ry0 || cy + cd - 1 > uy1) continue;
      if (solid && (cx < x0 + 1 || cx + cw - 1 > x1 - 1 || cy < ry0 + 1 || cy + cd - 1 > ry1 - 1)) continue;
      const cells = []; for (let a = cx; a < cx + cw; a++) for (let c = cy; c < cy + cd; c++) cells.push(K(a, c));
      if (cells.some(k => occ.has(k) || hard.has(k) || (solid && soft.has(k)))) continue;
      if (solid) { cells.forEach(k => sol.add(k)); if (!connected()) { cells.forEach(k => sol.delete(k)); continue; } }
      cells.forEach(k => occ.add(k)); return [cx, cy];
    }
    return null;
  };
  const mix = (seed, rows) => { const r = []; for (const y of rows || (function* () { for (let y = ry0; y <= uy1; y++) yield y; })()) for (let x = x0; x <= x1; x++) r.push([x, y]); return r.sort((p, q) => hN(p[0], p[1], seed, hs) - hN(q[0], q[1], seed, hs)); };
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  for (const h of shs) {  // 계단실 = 옥탑방 (막힘). 옥상이 끊기면 한 칸짜리로, 그래도 끊기면 놓지 않는다
    for (const cells of [h.cells, h.cells.slice(0, 1)]) {
      const ks = cells.map(([x, y]) => K(x, y)); if (ks.some(k => occ.has(k))) continue;
      ks.forEach(k => sol.add(k)); if (!connected()) { ks.forEach(k => sol.delete(k)); continue; }
      ks.forEach(k => occ.add(k)); occ.add(K(h.door[0], h.door[1]));
      out.push({ t: 'sh', cells, door: h.door, dir: h.dn, sx: h.l.tx, sy: h.l.ty, lit: hN(h.l.tx, h.l.ty, 5) % 3 !== 0 }); break;
    }
  }
  const okt = out.some(p => p.t === 'sh');
  if (!house && !glass && w >= 6 && hs % 3) { const s = take(4, 1, mix(1, [ry1]), false); if (s) out.push({ t: 'sign', x: s[0], y: s[1] }); }
  if (b.h >= 2 && hs % 3 === 0 && w >= 4 && dr - fr >= 3) { const s = take(1, 1, mix(3), true); if (s) out.push({ t: 'tank', x: s[0], y: s[1] }); }
  if (w >= 8 && dr - fr >= 4 && hN(hs, 2) % 2) { const s = take(3, 2, mix(4), false); if (s) out.push({ t: 'solar', x: s[0], y: s[1] }); }
  if (!glass && dr - fr >= 3 && w >= 5 && hN(hs, 3) % 3) { const s = take(4, 1, mix(5), false); if (s) out.push({ t: 'line', x: s[0], y: s[1], m: hs & 15 }); }
  if (!glass) for (let k = 0; k < Math.max(1, w >> 2); k++) { const s = take(1, 1, mix(10 + k, range(ry0 + 2, uy1)), false); if (s) out.push({ t: 'sky', x: s[0], y: s[1] }); }
  if (!glass && !mansard && w >= 4) { const s = take(4, 1, mix(6, [ry1]), false); if (s) out.push({ t: 'plant', x: s[0], y: s[1] }); }
  for (let k = 0; k < Math.max(1, (w / 3) | 0); k++) { const s = take(1, 1, mix(20 + k), false); if (s) out.push({ t: 'ac', x: s[0], y: s[1], r: (hs >> k) & 3 }); }
  for (let k = 0; k < Math.max(1, w >> 2); k++) { const s = take(1, 1, mix(30 + k), false); if (s) out.push({ t: 'vent', x: s[0], y: s[1] }); }
  return STAGE.kitStyle === 'industrial' ? out.filter(p => p.t !== 'sign') : out;
}
// 구운 kit.json의 옥상 살림 목록 → 옥상 막힘 칸
let ROB = null;
const robAt = (tx, ty) => !!(ROB && inMap(tx, ty) && ROB[ty * MW + tx]);
function robBuild() {
  ROB = new Uint8Array(MW * MH); let n = 0;
  BLD.forEach(b => (b.kitProps || []).forEach(p => {
    if (p.t === 'sh') {
      p.cells.forEach(([x, y]) => { if (inMap(x, y)) { ROB[y * MW + x] = 1; n++; } });
      const l = S && S.ladders && S.ladders.find(q => q.kind === 'stair' && q.tx === p.sx && q.ty === p.sy);
      if (l) {
        l.rx = tc(p.door[0]); l.ry = tc(p.door[1]); l.shDir = p.dir;
        const [dx, dy] = { S: [0, 1], W: [-1, 0], E: [1, 0], N: [0, -1] }[p.dir];
        const xs = p.cells.map(c => c[0]), ys = p.cells.map(c => c[1]);
        // bake_mk의 실제 문 벽면(.08~.92) 바닥점. 앞 타일 중심은 서는 자리일 뿐 안내 위치가 아니다.
        l.roofDoor = { x: dx ? (dx < 0 ? Math.min(...xs) + 0.08 : Math.max(...xs) + 0.92) * TILE : tc(p.sx),
          y: dy ? (dy < 0 ? Math.min(...ys) + 0.1 : Math.max(...ys) + 0.92) * TILE : tc(p.sy), dx, dy, z: l.tz };
      }
      return;
    }
    if (!ROB_SOLID_DIM[p.t]) return; const [cw, cd] = ROB_SOLID_DIM[p.t]; for (let y = p.y; y < p.y + cd; y++) for (let x = p.x; x < p.x + cw; x++) if (inMap(x, y)) { ROB[y * MW + x] = 1; n++; } }));
  if (!n) ROB = null;
  if (S && S.hides) S.hides = S.hides.filter(h => h.type !== 'okt');
}
const ROB_SOLID_DIM = { tank: [1, 1] };
function kitSpec() {
  return { id: STAGE.id, W: MW, H: MH, furn: [...new Set(FURN.map(furnKey))], b: BLD.map((b, i) => ({ i, style: STAGE.kitStyle || '', props: roofProps(b, i), x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, h: b.h, fh: b.fh || 0, facade: !!b.facade, kind: b.kind || '', glass: !!b.glass, piloti: !!b.piloti, alt: b.alt || 0, balc: b.balc || [], gas: b.gas || [], name: b.name || '',
    front: Array.from({ length: b.fh || 0 }, (_, f) => { const g = f ? GF[f] : G0, row = []; for (let x = b.x0; x <= b.x1; x++) { const ch = g && g[b.y1] ? g[b.y1][x] : null; row.push(!f && S.doors.some(d => d.tx === x && d.ty === b.y1) ? 'D' : ch || '?'); } return row; }) })) };
}
// 3/4 정면벽: 건물 남쪽 벽 줄을 정면에서 본 벽으로 그린다 (실제 문·창문 그림)
