// ---------------------------------------------------------------- 실내 평면 (도시: 빌라·단독·상가)
// 빌라: 가운데 계단실 + 좌우 두 세대(뒤쪽 방·욕실, 앞쪽 거실·주방). 좁으면 한 세대. 상가: 오른쪽 계단실 + 층마다 용도(가게·PC방·학원·사무실·식당)
let FURN = [], PLANS = [], AUTO_LAMPS = [];
function planInterior(g, b, bi, f) {
  const ix0 = b.x0 + 1, ix1 = b.x1 - 1, iy0 = b.y0 + 1, iy1 = b.y1 - 1, W = ix1 - ix0 + 1, D = iy1 - iy0 + 1;
  const rec = { units: [], stair: null, store: null };
  const keep = new Set(), K = (x, y) => keep.add(x + ',' + y);
  const floorCh = c => c === 'w' || c === 'v' || c === 't' || c === 'h' || c === ',';
  const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c; };
  let needWall = false;  // 집 안 가구는 벽에 붙여 놓는다 (방 한가운데 동선을 막지 않게)
  const isW = c => c === '#' || c === 'N' || c === 'V';
  const wallSide = (x, y, w, h) => { const row = yy => { for (let xx = x; xx < x + w; xx++) if (!isW(g[yy][xx])) return false; return true; }, col = xx => { for (let yy = y; yy < y + h; yy++) if (!isW(g[yy][xx])) return false; return true; }; return row(y - 1) || row(y + h) || col(x - 1) || col(x + w); };
  // 가구 놓기: r = 바라보는 쪽(0 남·1 동·2 북·3 서), clear = 쓰려면 비어 있어야 하는 칸(침대 옆·의자 자리·싱크대 앞). 놓으면 그 칸은 다른 가구가 못 쓴다
  const furn = (x, y, w, h, t, solid = true, r = 0, clear = []) => {
    solid = !FURN_FLAT.has(t);  // 밟고 지나갈 수 있는 건 바닥 깔개뿐 (화분·칠판도 막는다)
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { if (xx < ix0 || xx > ix1 || yy < iy0 || yy > iy1 || !floorCh(g[yy][xx]) || keep.has(xx + ',' + yy)) return false; }
    for (const [cx, cy] of clear) if (cx < ix0 || cx > ix1 || cy < iy0 || cy > iy1 || !floorCh(g[cy][cx])) return false;
    if (needWall && t !== 'rug' && !wallSide(x, y, w, h)) return false;
    if (solid) {
      const old = []; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { old.push([xx, yy, g[yy][xx]]); g[yy][xx] = FURN_TALL.has(t) ? 'E' : 'K'; }
      if (!connected()) { old.forEach(([xx, yy, c]) => { g[yy][xx] = c; }); return false; }  // 길을 막으면 놓지 않는다
    }
    clear.forEach(([cx, cy]) => K(cx, cy));
    FURN.push({ x, y, w, h, t, r, fl: f, seed: (x * 31 + y * 17 + f * 7 + bi) >>> 0 });
    return true;
  };
  // 계단에서 모든 문틈·창문 안쪽·바닥 칸까지 이어져 있는지
  function connected() {
    if (!rec.stair) return true;
    const seen = new Set(), q = [rec.stair], ok = (x, y) => x >= ix0 && x <= ix1 && y >= iy0 && y <= iy1 && !SOLID.has(g[y][x]);
    seen.add(rec.stair[0] + ',' + rec.stair[1]);
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (!seen.has(k) && ok(nx, ny)) { seen.add(k); q.push([nx, ny]); } } }
    for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) if (!SOLID.has(g[y][x]) && !seen.has(x + ',' + y)) return false;
    return true;
  }
  const gap = (x, y, c) => { g[y][x] = c; K(x, y); K(x + 1, y); K(x - 1, y); K(x, y + 1); K(x, y - 1); };
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) g[y][x] = (x === b.x0 || x === b.x1 || y === b.y0 || y === b.y1) ? '#' : 'w';
  const kind = b.kind || 'villa';
  const lampAt = (x0, y0, x1, y1, p) => { const h = ((x0 * 92821) ^ (y0 * 68917) ^ (f * 131) ^ bi) >>> 0; if ((h % 100) < p * 100) AUTO_LAMPS.push([Math.floor((x0 + x1) / 2), Math.floor((y0 + y1) / 2), 115, 0, f]); };
  // 한 세대 (실제 빌라·단독 평면처럼): 앞(정면 창 쪽) = 거실과 주방(계단·현관 쪽), 뒤 = 욕실(현관 쪽)·안방(먼 쪽)·작은방
  // side: 'R' = 계단·현관이 오른쪽, 'L' = 왼쪽
  const unit = (ux0, ux1, side) => {
    const uw = ux1 - ux0 + 1, rb = D >= 9 ? 4 : D >= 7 ? 3 : D >= 6 ? 2 : 0, yb = iy0 + rb;  // 방 깊이: 거실·주방이 적어도 세 줄은 되게
    const u = { living: { x0: ux0, y0: rb ? yb + 1 : iy0, x1: ux1, y1: iy1 }, rooms: [], bath: null, side };
    fill(ux0, u.living.y0, ux1, iy1, 'w');
    if ((!rb || uw < 5) && uw >= 10 && D >= 4) {  // 얕고 넓은 집: 방을 옆으로 (계단에서 먼 쪽 끝에 방 하나, 문은 가운데 줄)
      const bw = Math.min(5, Math.max(4, Math.floor(uw * 0.35))), wxc = side === 'R' ? ux0 + bw : ux1 - bw, a = side === 'R' ? ux0 : wxc + 1, z = side === 'R' ? wxc - 1 : ux1;
      for (let y = iy0; y <= iy1; y++) g[y][wxc] = '#'; fill(a, iy0, z, iy1, 'v');
      const dy = iy0 + Math.floor(D / 2); gap(wxc, dy, 'w');
      u.rooms.push({ x0: a, y0: iy0, x1: z, y1: iy1, door: [wxc, dy], side: true });
      u.living = { x0: side === 'R' ? wxc + 1 : ux0, y0: iy0, x1: side === 'R' ? ux1 : wxc - 1, y1: iy1 };
      return (rec.units.push(u), u);
    }
    if (!rb || uw < 4) { u.living.y0 = iy0; return (rec.units.push(u), u); }
    for (let x = ux0; x <= ux1; x++) g[yb][x] = '#';
    let rx0 = ux0, rx1 = ux1;
    if (uw >= 7) {  // 욕실: 현관 쪽 뒤, 두 칸 폭
      const bx0 = side === 'L' ? ux0 : ux1 - 1, wx = side === 'L' ? ux0 + 2 : ux1 - 2;
      fill(bx0, iy0, bx0 + 1, yb - 1, 't'); for (let y = iy0; y < yb; y++) g[y][wx] = '#';
      const dx = bx0 + (side === 'L' ? 1 : 0);
      u.bath = { x0: bx0, y0: iy0, x1: bx0 + 1, y1: yb - 1, door: [dx, yb] }; gap(dx, yb, 'w');
      if (side === 'L') rx0 = ux0 + 3; else rx1 = ux1 - 3;
    }
    const rw = rx1 - rx0 + 1, two = rw >= 8, big = two ? Math.ceil((rw - 1) * 0.55) : rw;
    // 안방은 계단에서 먼 쪽, 작은방은 욕실 옆
    const spans = !two ? [[rx0, rx1]] : side === 'R' ? [[rx0, rx0 + big - 1], [rx0 + big + 1, rx1]] : [[rx1 - big + 1, rx1], [rx0, rx1 - big - 1]];
    if (two) { const wxm = side === 'R' ? rx0 + big : rx1 - big; for (let y = iy0; y < yb; y++) g[y][wxm] = '#'; }
    const cx = (ux0 + ux1) / 2;
    spans.forEach(([a, z]) => { fill(a, iy0, z, yb - 1, 'v'); const dx = Math.max(a, Math.min(z, Math.round(cx) < a ? a : Math.round(cx) > z ? z : (Math.abs(a - cx) < Math.abs(z - cx) ? a : z))); u.rooms.push({ x0: a, y0: iy0, x1: z, y1: yb - 1, door: [dx, yb] }); gap(dx, yb, 'w'); });
    rec.units.push(u); return u;
  };
  const inR = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
  // 방: 침대 머리는 안쪽 벽, 침대 옆·발치는 비워 둔다. 안방은 넓으면 2인 침대 + 협탁 둘, 옷장은 안쪽 벽 다른 쪽
  const bedroom = (r, master) => {
    const rw = r.x1 - r.x0 + 1, rh = r.y1 - r.y0 + 1, far = r.door[0] - r.x0 > r.x1 - r.door[0] ? 'L' : 'R';  // 문에서 먼 쪽
    let bedX = null;
    if (master && rw >= 4 && rh >= 3) {
      const xs = []; for (let x = r.x0 + 1; x + 1 <= r.x1 - 1; x++) xs.push(x); xs.sort((a, b) => far === 'L' ? a - b : b - a);
      for (const x of xs) if (furn(x, r.y0, 2, 2, 'bedD', true, 0, [[x, r.y0 + 2], [x + 1, r.y0 + 2], [x - 1, r.y0 + 1], [x + 2, r.y0 + 1]].filter(c => inR(r, c[0], c[1])))) { bedX = [x, x + 1];
        furn(x - 1, r.y0, 1, 1, 'nstand'); furn(x + 2, r.y0, 1, 1, 'nstand'); break; }
    }
    if (!bedX) { const order = far === 'L' ? [r.x0, r.x1] : [r.x1, r.x0];
      for (const x of order) { const sx = x === r.x0 ? x + 1 : x - 1; if (furn(x, r.y0, 1, 2, 'bed', true, 0, [[sx, r.y0], [sx, r.y0 + 1]])) { bedX = [x, x]; break; } } }
    // 옷장: 안쪽 벽, 침대와 떨어진 쪽
    const wxs = []; for (let x = r.x0; x + 1 <= r.x1; x++) wxs.push(x); wxs.sort((a, b) => (bedX ? Math.abs(b - bedX[0]) - Math.abs(a - bedX[0]) : 0));
    let wd = false; for (const x of wxs) if (furn(x, r.y0, 2, 1, 'wardrobe', true, 0, [[x, r.y0 + 1], [x + 1, r.y0 + 1]])) { wd = true; break; }
    if (!wd) for (const x of wxs) if (furn(x, r.y0, 1, 1, 'wardrobe', true, 0, [[x, r.y0 + 1]])) break;
    if (!master) {  // 작은방: 벽에 붙인 책상 + 의자(책상을 바라본다)
      for (let x = r.x0; x <= r.x1; x++) if (furn(x, r.y1 - 1, 1, 1, 'chairD', true, 0) && !furn(x, r.y1, 1, 1, 'desk', true, 2)) { const it = FURN.pop(); g[it.y][it.x] = 'v'; } else if (FURN[FURN.length - 1].t === 'desk') break;
    } else for (const [x, y] of [[r.x0, r.y1], [r.x1, r.y1]]) if (furn(x, y, 1, 1, 'plant')) break;
  };
  // 욕실: 안쪽 벽에 욕조, 옆벽에 변기·세면대, 문 앞은 비운다
  const bathroom = (bt) => {
    furn(bt.x0, bt.y0, 2, 1, 'bath', true, 0, []);
    const outer = bt.door[0] === bt.x0 ? bt.x1 : bt.x0, rr = outer === bt.x0 ? 1 : 3;
    furn(outer, bt.y0 + 1, 1, 1, 'toilet', true, rr) || furn(bt.door[0], bt.y0 + 1, 1, 1, 'toilet', true, rr);
    furn(outer, bt.y0 + 2, 1, 1, 'bsink', true, rr);
    if (bt.y1 - bt.y0 >= 3) furn(outer, bt.y1, 1, 1, 'washer', true, rr);
  };
  // 거실·주방: 주방은 현관 쪽 — 안쪽 벽을 따라 냉장고·싱크대·가스레인지·수납장(앞은 비움), 그 앞에 식탁과 의자.
  // 거실은 창 쪽 — 안쪽 벽에 TV, 마주 보는 소파(사이에 깔개), 소파 옆 스탠드, 구석 화분
  const ldk = (u) => {
    const L = u.living, uw = L.x1 - L.x0 + 1, fd = L.y1 - L.y0 + 1, R = u.side !== 'L';
    const kw = uw >= 7 ? Math.max(3, Math.min(5, Math.round(uw * 0.42))) : uw >= 5 ? 3 : uw >= 4 ? 2 : 0;
    const K0 = R ? L.x1 - kw + 1 : L.x0, K1 = R ? L.x1 : L.x0 + kw - 1, V0 = R ? L.x0 : L.x0 + kw, V1 = R ? L.x1 - kw : L.x1;
    if (kw) {
      const run = ['fridge', 'ksink', 'stove', 'kcab'], xs = []; for (let x = K0; x <= K1; x++) xs.push(x); if (!R) xs.reverse();  // 바깥벽 쪽에서부터
      let k = 0; for (const x of xs) { if (k >= run.length) break; if (furn(x, L.y0, 1, 1, run[k], true, 0, fd > 1 ? [[x, L.y0 + 1]] : [])) k++; }
      if (fd >= 4) {  // 식탁: 의자는 아래(위를 바라봄) 또는 양 끝
        for (let x = K0; x + 1 <= K1; x++) if (furn(x, L.y0 + 2, 2, 1, 'table', true, 0)) {
          if (!(furn(x, L.y0 + 3, 1, 1, 'chair', true, 2) && furn(x + 1, L.y0 + 3, 1, 1, 'chair', true, 2))) { furn(x - 1, L.y0 + 2, 1, 1, 'chair', true, 1); furn(x + 2, L.y0 + 2, 1, 1, 'chair', true, 3); }
          break; }
      } else if (fd >= 3) for (let x = K0; x <= K1; x++) if (furn(x, L.y0 + 2, 1, 1, 'tableS')) break;
    }
    const vw = V1 - V0 + 1;
    if (vw >= 2 && fd >= 3) {
      const xs = []; for (let x = V0; x + 1 <= V1; x++) xs.push(x); const mid = (V0 + V1 - 1) / 2; xs.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
      for (const x of xs) {
        const sy = fd >= 5 ? L.y0 + 3 : L.y0 + fd - 1 - (fd >= 4 ? 1 : 0);
        if (!furn(x, L.y0, 2, 1, 'tv', true, 0, [])) continue;
        if (furn(x, sy, 2, 1, 'sofa', true, 2, sy + 1 <= L.y1 ? [[x, sy + 1], [x + 1, sy + 1]] : [])) {
          if (sy - L.y0 >= 3) furn(x, L.y0 + 1, 2, 2, 'rug', false);
          furn(x + 2, sy, 1, 1, 'lamp') || furn(x - 1, sy, 1, 1, 'lamp');
        }
        break;
      }
      for (const [x, y] of [[V0, L.y0], [V1, L.y0], [V0, L.y1], [V1, L.y1]]) if (furn(x, y, 1, 1, 'plant')) break;
      for (const [x, y] of [[R ? V0 : V1, L.y0 + 1], [R ? V0 : V1, L.y0 + 2]]) if (furn(x, y, 1, 1, 'shelfS', true, R ? 1 : 3)) break;
    }
    lampAt(L.x0, L.y0, L.x1, L.y1, f === 0 ? 0.45 : 0.3);
  };
  // 원룸(방을 따로 못 나누는 작은 집): 안쪽 벽 먼 구석에 침대와 옷장, 나머지는 주방·거실 규칙
  const studio = (u) => {
    const L = u.living, far = u.side === 'L' ? 'R' : 'L', xs = far === 'L' ? [L.x0, L.x1] : [L.x1, L.x0];
    for (const x of xs) { const sx = x === L.x0 ? x + 1 : x - 1; if (furn(x, L.y0, 1, 2, 'bed', true, 0, [[sx, L.y0], [sx, L.y0 + 1]])) { const wx = x === L.x0 ? x + 2 : x - 2; furn(wx, L.y0, 1, 1, 'wardrobe', true, 0, [[wx, L.y0 + 1]]); u.studioBed = true; break; } }
    if (L.x1 - L.x0 + 1 < 4) { const ks = far === 'L' ? [L.x1, L.x1 - 1] : [L.x0, L.x0 + 1]; furn(ks[0], L.y0, 1, 1, 'fridge', true, 0, [[ks[0], L.y0 + 1]]); furn(ks[1], L.y0, 1, 1, 'ksink', true, 0, [[ks[1], L.y0 + 1]]); }
  };
  const furnishUnit = (u) => { needWall = false; if (!u.rooms.length) studio(u); u.rooms.forEach((r, i) => bedroom(r, i === 0)); if (u.bath) bathroom(u.bath); ldk(u); };
  if (kind === 'shop') {
    const cx0 = ix1 - 1; for (let y = iy0; y <= iy1; y++) g[y][cx0 - 1] = '#'; fill(cx0, iy0, ix1, iy1, 'h'); g[iy0][ix1] = 'Y'; rec.stair = [ix1, iy0]; K(ix1, iy0 + 1); K(cx0, iy0);
    gap(cx0 - 1, iy1 - 1, 'h'); if (f === 0) { g[b.y1][cx0] = 'h'; K(cx0, iy1); if (b.backDoor) { g[b.y0][cx0] = 'h'; K(cx0, iy0); } }
    const use = (b.floorsUse || [])[f] || (f === 0 ? 'store' : 'office');
    const sx0 = ix0, sx1 = cx0 - 2; fill(sx0, iy0, sx1, iy1, use === 'store' || use === 'food' ? 't' : use === 'pc' ? 'h' : 'w');
    rec.store = { x0: sx0, y0: iy0, x1: sx1, y1: iy1, use };
    if (f === 0) { const dx = sx0 + 2; g[b.y1][dx] = 't'; K(dx, iy1); K(dx, iy1 - 1); }
    for (let x = sx0; x <= sx1; x++) K(x, iy1);  // 앞줄 비움(창문 쪽 통로)
    K(ix0, iy1 - 1); K(ix1, iy1 - 1);  // 옆 창문 안쪽 비움 (옆 건물 창문 건너기)
    if (use === 'heist') {  // 미션 1 창고 상회 1층: 뒤 = 창고(높은 선반 사이로 숨어 지나간다)·사무실(책상 = 낮은 엄폐, 장부) / 앞 = 매장(낮은 진열대)
      const vy = iy0 + 5, xm = sx0 + 7;
      fill(sx0, iy0, sx1, vy - 1, 'w'); fill(sx0, vy + 1, sx1, iy1, 't');
      for (let x = sx0; x <= sx1; x++) g[vy][x] = '#';
      for (let y = iy0; y < vy; y++) g[y][xm] = '#';
      gap(sx0 + 3, vy, 'w'); gap(sx1 - 1, vy, 'w'); gap(xm, iy0 + 3, 'w');   // 창고↔매장 · 사무실↔매장 · 창고↔사무실
      gap(cx0 - 1, iy0 + 1, 'w');                                            // 계단 복도 ↔ 사무실 (옥상 길로 오면 바로 사무실)
      if (f === 0) { g[b.y0][sx0 + 3] = 'w'; K(sx0 + 3, iy0); K(sx0 + 3, iy0 + 1); }   // 뒷문: 잠기지 않았다
      rec.store = { x0: sx0, y0: vy + 1, x1: sx1, y1: iy1, use }; rec.office = { x0: xm + 1, y0: iy0, x1: sx1, y1: vy - 1 };
      for (const y of [iy0 + 1, iy0 + 3]) for (let x = sx0 + 1; x + 1 <= xm - 2; x += 3) { furn(x, y, 1, 1, 'boxes'); furn(x + 1, y, 1, 1, 'boxes'); }  // 창고: 택배 상자 더미 (높아서 사이로 숨어 지나간다)
      furn(xm + 1, iy0 + 1, 2, 1, 'desk2'); furn(sx1 - 1, iy0 + 3, 2, 1, 'desk2'); furn(sx1, iy0, 1, 1, 'cab');
      for (let x = sx0 + 1; x + 2 <= sx1 - 1; x += 4) furn(x, vy + 2, 3, 1, 'disp');
      furn(sx1 - 2, vy + 2, 2, 1, 'disp');
    }
    else if (use === 'store') { furn(sx0, iy0, 1, 1, 'fridge'); furn(sx0 + 1, iy0, 1, 1, 'fridge'); for (let y = iy0 + 2; y < iy1 - 1; y += 2) for (let x = sx0 + 1; x + 2 <= sx1 - 1; x += 4) furn(x, y, 3, 1, 'shelf'); if (furn(sx1 - 1, iy1 - 1, 2, 1, 'counter', true, 0)) furn(sx1, iy1 - 2, 1, 1, 'chairD', true, 0); }  // 가게: 안쪽 벽 음료 냉장고, 진열대 줄, 계산대와 점원 의자
    else if (use === 'pc') { for (let y = iy0; y + 1 < iy1; y += 3) for (let x = sx0; x <= sx1; x++) if ((x - sx0) % 4 !== 3 && furn(x, y, 1, 1, 'pc', true, 0)) furn(x, y + 1, 1, 1, 'chairD', true, 2); }  // 줄마다 컴퓨터 + 의자, 그 아래 통로
    else if (use === 'academy') { furn(sx0 + 1, iy0, Math.max(2, sx1 - sx0 - 1), 1, 'board'); for (let y = iy0 + 2; y + 1 < iy1; y += 3) for (let x = sx0; x <= sx1; x += 2) if (furn(x, y, 1, 1, 'desk', true, 0)) furn(x, y + 1, 1, 1, 'chairD', true, 2); }  // 칠판을 보는 책상·의자 줄
    else if (use === 'club') {  // 클럽: 바·디제이 부스·스피커, 가운데 춤추는 자리, 색 조명
      fill(sx0, iy0, sx1, iy1, 'h');
      furn(sx0 + 1, iy0, Math.min(5, sx1 - sx0 - 3), 1, 'bar'); furn(sx1 - 1, iy0, 2, 1, 'dj'); furn(sx0, iy0, 1, 1, 'spk'); furn(sx1, iy1 - 1, 1, 1, 'spk');
      for (let y = iy0 + 2; y < iy1 - 1; y += 3) furn(sx0, y, 1, 2, 'sofaV');
      furn(sx1, iy0 + 2, 1, 1, 'locker');  // 클럽 직원 사물함
      const dx0 = sx0 + 2, dy0 = iy0 + 2, dx1 = sx1 - 1, dy1 = iy1 - 2; if (dx1 > dx0 && dy1 > dy0) FURN.push({ x: dx0, y: dy0, w: dx1 - dx0 + 1, h: dy1 - dy0 + 1, t: 'dance', fl: f, seed: bi });
      const cols = ['255,60,170', '60,220,255', '190,90,255']; [[0.3, 0.45], [0.7, 0.45], [0.5, 0.8]].forEach(([u, v], k) => AUTO_LAMPS.push([Math.round(sx0 + (sx1 - sx0) * u), Math.round(iy0 + (iy1 - iy0) * v), 150, 0, f, cols[k]]));
    }
    else if (use === 'vault') {  // 금고방: 위쪽은 문 하나 달린 금고방(보통 카드키로 잠긴다), 아래쪽은 사무실
      fill(sx0, iy0, sx1, iy1, 'w');
      const vy = iy0 + 3, dxm = Math.floor((sx0 + sx1) / 2);
      for (let x = sx0; x <= sx1; x++) g[vy][x] = '#';
      fill(sx0, iy0, sx1, vy - 1, 'h');
      gap(dxm, vy, 'w');
      rec.vault = { x0: sx0, y0: iy0, x1: sx1, y1: vy - 1, door: [dxm, vy] };
      furn(dxm, iy0, 1, 1, 'safe'); furn(sx0, iy0, 1, 1, 'boxes'); furn(sx1, iy0, 1, 1, 'boxes'); furn(sx0 + 1, iy0, 1, 1, 'cab'); furn(sx1 - 1, iy0, 1, 1, 'cab');
      for (let y = vy + 2; y < iy1; y += 2) for (let x = sx0; x <= sx1; x += 3) furn(x, y, 1, 1, 'desk');
      furn(sx1, vy + 1, 1, 1, 'locker');
      rec.store = { x0: sx0, y0: vy + 1, x1: sx1, y1: iy1, use };
    }
    else if (use === 'vip') {  // VIP 라운지: 위쪽은 문 달린 어둑한 VIP 방(뒷문은 계단 복도로), 아래쪽은 작은 바와 춤추는 자리
      fill(sx0, iy0, sx1, iy1, 'h');
      const vy = iy0 + 3, dxm = Math.floor((sx0 + sx1) / 2);
      for (let x = sx0; x <= sx1; x++) g[vy][x] = '#';
      fill(sx0, iy0, sx1, vy - 1, 'v');
      gap(dxm, vy, 'h');                 // 앞문: 춤추는 쪽
      gap(cx0 - 1, iy0 + 1, 'v');        // 뒷문: 직원 계단 복도
      rec.vip = { x0: sx0, y0: iy0, x1: sx1, y1: vy - 1, door: [dxm, vy], back: [cx0 - 1, iy0 + 1] };
      furn(sx0, iy0, 2, 1, 'sofa'); furn(sx0 + 3, iy0, 2, 1, 'sofa'); furn(sx0, iy0 + 2, 1, 1, 'tableS'); furn(sx1, iy0 + 2, 1, 1, 'plant', false);
      furn(sx0 + 1, vy + 1, Math.min(4, sx1 - sx0 - 3), 1, 'bar'); furn(sx1, vy + 1, 1, 1, 'spk'); furn(sx0, iy1 - 1, 1, 1, 'spk');
      for (let y = vy + 2; y < iy1; y += 3) furn(sx0, y, 1, 2, 'sofaV');
      const dx0 = sx0 + 2, dy0 = vy + 2, dx1 = sx1 - 1, dy1 = iy1 - 1; if (dx1 > dx0 && dy1 > dy0) FURN.push({ x: dx0, y: dy0, w: dx1 - dx0 + 1, h: dy1 - dy0 + 1, t: 'dance', fl: f, seed: bi });
      const cols = ['255,60,170', '60,220,255']; [[0.3, 0.75], [0.75, 0.75]].forEach(([u, v], k) => AUTO_LAMPS.push([Math.round(sx0 + (sx1 - sx0) * u), Math.round(iy0 + (iy1 - iy0) * v), 140, 0, f, cols[k]]));
      rec.store = { x0: sx0, y0: vy + 1, x1: sx1, y1: iy1, use };
    }
    else if (use === 'food') { furn(sx0, iy0, 2, 1, 'sink', true, 0, [[sx0, iy0 + 1], [sx0 + 1, iy0 + 1]]); for (let y = iy0 + 2; y + 1 < iy1; y += 3) for (let x = sx0 + 1; x + 1 <= sx1; x += 4) if (furn(x, y, 2, 1, 'table', true, 0)) { furn(x - 1, y, 1, 1, 'chair', true, 1); furn(x + 2, y, 1, 1, 'chair', true, 3); } }  // 식당: 주방 싱크대, 양 끝에 의자 놓인 식탁
    else { furn(sx0, iy0, 1, 1, 'locker'); furn(sx0 + 1, iy0, 1, 1, 'cab'); furn(sx1 - 1, iy0, 2, 1, 'sofa', true, 0, [[sx1 - 1, iy0 + 1], [sx1, iy0 + 1]]);  // 사무실: 벽에 사물함·서류장·소파, 가운데 책상 줄(책상마다 의자, 줄 사이 통로)
      for (let y = iy0 + 2; y + 1 < iy1; y += 3) for (let x = sx0 + 1; x + 1 <= sx1 - 1; x += 3) if (furn(x, y, 2, 1, 'desk2', true, 0)) furn(x, y + 1, 1, 1, 'chairD', true, 2); furn(sx0, iy1 - 1, 1, 1, 'locker'); }
    if (use !== 'club') lampAt(sx0, iy0, sx1, iy1, f === 0 ? 0.9 : 0.5);
  } else if (kind === 'villa' && (W >= 20 || b.piloti)) {  // 두 세대: 한 세대가 8칸은 되어야 방·거실이 제대로 들어간다
    const xs = ix0 + Math.floor((W - 2) / 2);
    for (let y = iy0; y <= iy1; y++) { g[y][xs - 1] = '#'; g[y][xs + 2] = '#'; }
    fill(xs, iy0, xs + 1, iy1, 'h'); g[iy0][xs] = 'Y'; rec.stair = [xs, iy0]; K(xs, iy0 + 1); K(xs + 1, iy0);
    if (f === 0 && b.piloti) {
      fill(ix0, iy0, xs - 2, iy1, ','); fill(xs + 3, iy0, ix1, iy1, ',');
      for (let x = b.x0; x <= b.x1; x++) if (x < xs - 1 || x > xs + 2) g[b.y1][x] = (x - b.x0) % 3 === 0 || x === b.x1 || x === xs - 2 || x === xs + 3 ? 'I' : ',';
      g[b.y1][xs] = 'h'; g[b.y1][xs + 1] = 'h'; g[b.y1][xs - 1] = '#'; g[b.y1][xs + 2] = '#';
      rec.units.push({ living: { x0: ix0, y0: iy0, x1: xs - 2, y1: iy1 }, rooms: [] }, { living: { x0: xs + 3, y0: iy0, x1: ix1, y1: iy1 }, rooms: [] });
    } else {
      gap(xs - 1, iy1 - 1, 'w'); gap(xs + 2, iy1 - 1, 'w');
      if (f === 0) { g[b.y1][xs] = 'h'; K(xs, iy1); if (b.backDoor) { g[b.y0][xs + 1] = 'h'; K(xs + 1, iy0); } }
      const uL = unit(ix0, xs - 2, 'R'), uR = unit(xs + 3, ix1, 'L');
      winAndSide(); story(); furnishUnit(uL); furnishUnit(uR);
      return rec;
    }
  } else {
    // 한 세대 집 (단독·좁은 빌라): 계단은 앞쪽 오른쪽 구석
    const u = unit(ix0, ix1, 'R');
    // 계단은 거실 오른쪽 끝, 바로 위가 걸을 수 있는 옥상 칸인 줄에 둔다 (옥상 계단실이 그 칸 위에 선다)
    const fhE = Math.max(1, Math.min(b.h || 1, b.y1 - b.y0 - 1)), sy = Math.max(u.living.y0, Math.min(iy1, b.y1 - fhE - (b.kind === 'house' ? 1 : 0)));  // 단독주택은 옥상 앞줄이 경사(맨사드)라 한 줄 뒤
    g[sy][ix1] = 'Y'; rec.stair = [ix1, sy]; K(ix1 - 1, sy); K(ix1, sy - 1); if (sy < iy1) K(ix1, sy + 1);
    if (f === 0) { const dx = Math.floor((ix0 + ix1) / 2); g[b.y1][dx] = 'w'; K(dx, iy1); K(dx, iy1 - 1); if (b.backDoor) { g[b.y0][ix0 + 1] = 'w'; K(ix0 + 1, iy0); K(ix0 + 1, iy0 + 1); } }
    winAndSide(); story(); furnishUnit(u);
    return rec;
  }
  winAndSide();
  return rec;
  // 사연 있는 집: 정해 둔 가구를 먼저 놓는다 (진료 침대, 약장, 큰 솥, 금고 …)
  function story() {
    const list = (b.story || {})[f] || [];
    list.forEach(t => { const [w, h] = { cbed: [1, 2], medcab: [2, 1], pot: [1, 1], boxes: [1, 1], safe: [1, 1] }[t] || [1, 1];
      for (let y = iy0; y + h - 1 <= iy1; y++) for (let x = ix0; x + w - 1 <= ix1; x++) if (furn(x, y, w, h, t)) return; });
  }
  // 정면 창(정면벽 그림과 같은 칸) + 양옆 창(옆 건물 창과 마주 보는 줄)
  function winAndSide() {
    for (let x = b.x0 + 1; x < b.x1; x++) if ((x - b.x0) % 2 === 1 && g[b.y1][x] === '#' && floorCh(g[b.y1 - 1][x])) { g[b.y1][x] = 'N'; K(x, b.y1 - 1); }
    const sy = iy1 - 1;
    if (floorCh(g[sy][ix0])) { g[sy][b.x0] = 'N'; K(ix0, sy); }
    if (floorCh(g[sy][ix1])) { g[sy][b.x1] = 'N'; K(ix1, sy); }
  }
}
const USE_NAME = { store: '가게', food: '식당', pc: 'PC방', academy: '학원', office: '사무실' };
function drawRoomLabels(x, f, rx0, ry0, rx1, ry1) {
  x.font = '700 13px "IBM Plex Sans KR", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(232,227,214,.3)';
  const lab = (r, t) => { if (!r || r.x1 < rx0 || r.x0 > rx1 || r.y1 < ry0 || r.y0 > ry1) return; x.fillText(t, (r.x0 + r.x1 + 1) / 2 * TILE, (r.y0 + r.y1 + 1) / 2 * TILE); };
  PLANS.forEach((fls, bi) => { const p = fls && fls[f]; if (!p) return; const b = BLD[bi];if(INK_STUDY&&STAGE.id==='m2'&&b.name==='클럽')return;
    p.units.forEach(u => { if (!u.rooms.length && f === 0 && b.piloti) { lab(u.living, '주차장'); return; } lab(u.living, '거실'); u.rooms.forEach((r, i) => lab(r, i ? '작은방' : '안방')); lab(u.bath, '욕실'); });
    if (p.store) lab(p.store, (b.signs && b.signs[f]) || USE_NAME[p.store.use] || '');
  });
  x.textBaseline = 'alphabetic';
}
// 가구 그리기 (위에서 본 단순한 픽셀 모양)
// 가구: 막힌 칸은 어두운 판(그림자) 위에 그린다. 막힘·엄폐 구분 테두리는 살피기(Alt) 때만
function drawFurn(x, it) {
  const flat = FURN_FLAT.has(it.t), T = TILE, px = it.x * T, py = it.y * T, w = it.w * T, h = it.h * T, tall = FURN_TALL.has(it.t);
  if (!flat) { x.fillStyle = 'rgba(0,0,0,.38)'; x.fillRect(px + 1, py + 1, w - 2, h - 2); }
  drawFurnArt(x, it);
}  // 칸 테두리(파랑·주황)는 평소엔 그리지 않는다 — 살피기(Alt)·전술 지도에서만 보인다
const furnKey = it => it.t + '_' + it.w + 'x' + it.h + (it.r ? '_r' + it.r : '');  // 구운 가구 그림 열쇠: 종류_가로x세로(_r방향)
function drawFurnArt(x, it) {
  if(it.t==='locker'||it.t==='wardrobe'){drawCabinet({type:it.t,tx:it.x,ty:it.y,w:it.w,h:it.h,furn:true,fl:it.fl||0},'all',x,0);return;}
  if(INK_STUDY&&STAGE.id==='m2'&&it.t==='dance'){drawInkDance(x,it);return;}
  if (KIT) { const k = kitFurn[furnKey(it)]; if (k && kitOk(k.img)) { x.drawImage(k.img, it.x * TILE + k.ox, it.y * TILE + k.oy); return; } }
  const T = TILE, px = it.x * T, py = it.y * T, w = it.w * T, h = it.h * T, s = it.seed;
  const R = (a, b, c, d, col) => { x.fillStyle = col; x.fillRect(px + a, py + b, c, d); };
  const sh = () => { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(px + 5, py + 6, w - 4, h - 4); };
  switch (it.t) {
    case 'dance': for (let yy = 0; yy < it.h; yy++) for (let xx = 0; xx < it.w; xx++) { const c = ['rgba(255,60,170,.32)', 'rgba(60,220,255,.30)', 'rgba(190,90,255,.30)', 'rgba(255,220,80,.26)'][(xx + yy * 3 + s) % 4]; R(xx * T + 2, yy * T + 2, T - 4, T - 4, c); } break;
    case 'bar': sh(); R(2, 8, w - 4, h - 12, '#3a2418'); R(2, 8, w - 4, 6, '#6a4a30'); for (let k = 10; k < w - 10; k += 14) { R(k, 2, 5, 12, ['#5aa86a', '#c8a040', '#a84a4a', '#6aa0d8'][(k + s) % 4]); } break;
    case 'dj': sh(); R(2, 6, w - 4, h - 10, '#16181e'); x.fillStyle = '#3a3e48'; for (const cx of [px + 22, px + w - 22]) { x.beginPath(); x.arc(cx, py + 24, 12, 0, TAU); x.fill(); } R(w / 2 - 8, 14, 16, 18, '#ff3ca8'); break;
    case 'spk': sh(); R(6, 4, w - 12, h - 8, '#0e1014'); x.fillStyle = '#2a2e36'; x.beginPath(); x.arc(px + 24, py + 30, 9, 0, TAU); x.fill(); x.beginPath(); x.arc(px + 24, py + 13, 5, 0, TAU); x.fill(); break;
    case 'sofaV': sh(); R(6, 2, w - 12, h - 4, '#5a2a4a'); R(6, 2, 10, h - 4, 'rgba(0,0,0,.25)'); break;
    case 'rug': R(4, 4, w - 8, h - 8, ['#8a4a4a', '#4a5f8a', '#7a6a3a'][s % 3]); R(8, 8, w - 16, h - 16, 'rgba(255,255,255,.12)'); break;
    case 'bed': sh(); R(3, 2, w - 6, h - 4, '#6b4a32'); R(6, 5, w - 12, h - 10, '#e8e6e0'); R(6, 26, w - 12, h - 31, ['#4a6fa8', '#a84a5a', '#5a8a5a', '#8a6aa8'][s % 4]); R(10, 7, w - 20, 12, '#ffffff'); break;
    case 'sofa': sh(); { const c = ['#5a6e4a', '#7a4a3a', '#4a5a7a'][s % 3]; R(2, 6, w - 4, h - 10, c); R(2, 6, w - 4, 10, 'rgba(0,0,0,.25)'); R(2, 6, 7, h - 10, 'rgba(0,0,0,.2)'); R(w - 9, 6, 7, h - 10, 'rgba(0,0,0,.2)'); R(12, 20, w / 2 - 14, 16, 'rgba(255,255,255,.12)'); } break;
    case 'tv': sh(); R(4, 16, w - 8, 18, '#5a4030'); R(10, 14, w - 20, 6, '#111318'); R(12, 15, w - 24, 2, '#3a4a5a'); break;
    case 'sink': sh(); R(2, 4, w - 4, h - 10, '#c8ccd2'); R(8, 10, 22, 18, '#8e98a4'); R(12, 13, 14, 12, '#6a7a8a'); R(w - 36, 10, 26, 22, '#3a3d44'); for (const [a, b] of [[w - 30, 15], [w - 19, 15], [w - 30, 25], [w - 19, 25]]) { x.strokeStyle = '#8a8f98'; x.lineWidth = 1.5; x.beginPath(); x.arc(px + a + 3, py + b, 4, 0, TAU); x.stroke(); } break;
    case 'fridge': sh(); R(6, 4, w - 12, h - 8, '#e8eaee'); R(6, 18, w - 12, 2, '#a8acb4'); R(w - 12, 8, 2, 8, '#8a8f98'); break;
    case 'bath': sh(); R(3, 4, w - 6, h - 8, '#f2f4f6'); R(9, 10, w - 18, h - 20, '#9cc8e2'); R(12, 12, 10, 4, 'rgba(255,255,255,.6)'); break;
    case 'toilet': sh(); R(14, 4, 20, 10, '#f2f4f6'); x.fillStyle = '#f2f4f6'; x.beginPath(); x.ellipse(px + 24, py + 28, 11, 14, 0, 0, TAU); x.fill(); x.fillStyle = '#b8d4e4'; x.beginPath(); x.ellipse(px + 24, py + 29, 6, 8, 0, 0, TAU); x.fill(); break;
    case 'wardrobe': sh(); R(2, 4, w - 4, h - 12, '#5a3e2a'); R(w / 2 - 1, 6, 2, h - 16, '#3a2618'); R(w / 2 - 6, 18, 3, 6, '#c8a060'); R(w / 2 + 3, 18, 3, 6, '#c8a060'); break;
    case 'desk': sh(); R(5, 8, w - 10, h - 16, '#a07850'); R(12, 12, 16, 10, '#2a2d34'); R(14, 13, 12, 7, '#5a7a9a'); R(30, 14, 8, 10, '#e8e4d8'); break;
    case 'desk2': sh(); R(3, 8, w - 6, h - 16, '#b0b4ba'); R(10, 12, 16, 10, '#2a2d34'); R(w - 30, 12, 16, 10, '#2a2d34'); R(32, 14, 12, 8, '#e8e4d8'); break;
    case 'pc': sh(); R(4, 6, w - 8, h - 12, '#3a3d44'); R(10, 8, 28, 16, '#111318'); R(12, 10, 24, 12, ['#2a6a9a', '#6a2a8a', '#2a8a5a'][s % 3]); R(12, 28, 24, 6, '#5a5d64'); break;
    case 'shelf': sh(); R(2, 8, w - 4, h - 16, '#8a8f98'); for (let k = 0; k < it.w * 4; k++) R(6 + k * 11, 12, 8, 10, ['#d85a4a', '#e8c25a', '#5aa86a', '#5a7ad8', '#e8e8e8'][(k + s) % 5]); break;
    case 'shelfS': sh(); R(6, 4, w - 12, h - 10, '#6a4a32'); for (let k = 0; k < 3; k++) R(10 + k * 9, 8, 6, 14, ['#a84a4a', '#4a6a9a', '#c8a050'][(k + s) % 3]); break;
    case 'disp': sh(); R(3, 10, w - 6, h - 18, '#8a8f98'); for (let k = 0; k < it.w * 3; k++) R(6 + k * 15, 13, 11, h - 26, ['#d85a4a', '#e8c25a', '#5aa86a', '#5a7ad8', '#e8e8e8'][(k + s) % 5]); break;  // 낮은 진열대
    case 'counter': sh(); R(2, 6, w - 4, h - 12, '#d8d0c0'); R(10, 12, 16, 12, '#3a3d44'); R(12, 14, 12, 6, '#7ac85a'); break;
    case 'table': sh(); R(6, 10, w - 12, h - 20, '#b08860'); for (const a of [10, w - 22]) { R(a, 2, 12, 6, '#7a5a3a'); R(a, h - 8, 12, 6, '#7a5a3a'); } R(w / 2 - 8, h / 2 - 4, 16, 8, '#c8c0b0'); break;
    case 'tableS': R(8, 10, w - 16, h - 20, '#a07850'); R(18, 18, 12, 8, '#e8e4d8'); break;
    case 'locker': sh(); R(8, 2, w - 16, h - 6, '#5e6f86'); R(8, 2, w - 16, 4, '#7d8fa6'); R(w / 2 - 1, 4, 2, h - 10, '#3e4a5a'); for (let k = 0; k < 3; k++) { R(12, 10 + k * 5, 8, 2, '#3e4a5a'); R(w - 20, 10 + k * 5, 8, 2, '#3e4a5a'); } break;
    case 'cab': sh(); R(8, 4, w - 16, h - 8, '#8e939c'); for (let k = 0; k < 3; k++) R(10, 8 + k * 12, w - 20, 2, '#5d626c'); break;
    case 'plant': x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.arc(px + 27, py + 29, 13, 0, TAU); x.fill(); x.fillStyle = '#8a5a3a'; x.beginPath(); x.arc(px + 24, py + 26, 11, 0, TAU); x.fill(); x.fillStyle = '#4a8a4a'; x.beginPath(); x.arc(px + 24, py + 24, 13, 0, TAU); x.fill(); x.fillStyle = '#6ab06a'; x.beginPath(); x.arc(px + 20, py + 20, 6, 0, TAU); x.fill(); break;
    case 'board': R(4, 2, w - 8, 10, '#e8ecee'); R(4, 10, w - 8, 3, '#8a8f98'); break;
    case 'medcab': sh(); R(4, 4, w - 8, h - 10, '#e8ecee'); R(4, 4, w - 8, 6, '#c8ccd2'); R(w / 2 - 3, 14, 6, 18, '#d8402e'); R(w / 2 - 9, 20, 18, 6, '#d8402e'); for (let k = 0; k < it.w; k++) R(8 + k * 48, h - 12, 32, 3, '#a8acb4'); break;
    case 'cbed': sh(); R(4, 2, w - 8, h - 4, '#c8ccd2'); R(7, 5, w - 14, h - 10, '#e8f0ec'); R(7, 26, w - 14, h - 31, '#6aa88a'); R(11, 7, w - 22, 12, '#ffffff'); break;
    case 'pot': sh(); x.fillStyle = '#3a3d44'; x.beginPath(); x.arc(px + 24, py + 25, 17, 0, TAU); x.fill(); x.fillStyle = '#8a8f98'; x.beginPath(); x.arc(px + 24, py + 25, 13, 0, TAU); x.fill(); x.fillStyle = '#e8e4d8'; x.beginPath(); x.arc(px + 24, py + 25, 10, 0, TAU); x.fill(); R(20, 4, 8, 6, '#5d626c'); break;
    case 'boxes': sh(); for (let k = 0; k < 3; k++) { R(4 + (k % 2) * 20, 4 + (k > 1 ? 20 : 0), 20, 18, '#b0885a'); R(4 + (k % 2) * 20, 11 + (k > 1 ? 20 : 0), 20, 3, '#8a6a42'); } break;
    case 'bedD': sh(); R(3, 2, w - 6, h - 4, '#6b4a32'); R(6, 5, w - 12, h - 10, '#e8e6e0'); R(6, 30, w - 12, h - 35, ['#4a6fa8', '#a84a5a', '#5a8a5a'][s % 3]); R(10, 8, w / 2 - 14, 14, '#ffffff'); R(w / 2 + 4, 8, w / 2 - 14, 14, '#ffffff'); break;
    case 'nstand': case 'kcab': sh(); R(8, 8, w - 16, h - 14, it.t === 'kcab' ? '#d8d0c0' : '#8a6a4a'); R(12, 18, w - 24, 2, 'rgba(0,0,0,.3)'); break;
    case 'ksink': case 'bsink': sh(); R(4, 6, w - 8, h - 12, '#c8ccd2'); R(12, 12, w - 24, 14, '#8e98a4'); break;
    case 'stove': sh(); R(4, 6, w - 8, h - 12, '#3a3d44'); for (const [a, b] of [[14, 16], [30, 16], [14, 30], [30, 30]]) { x.strokeStyle = '#8a8f98'; x.lineWidth = 1.5; x.beginPath(); x.arc(px + a, py + b, 5, 0, TAU); x.stroke(); } break;
    case 'washer': sh(); R(6, 6, w - 12, h - 12, '#e8eaee'); x.strokeStyle = '#8a8f98'; x.lineWidth = 3; x.beginPath(); x.arc(px + 24, py + 26, 10, 0, TAU); x.stroke(); break;
    case 'chair': case 'chairD': R(14, 14, 20, 20, '#a07850'); R(14, it.r === 2 ? 30 : 12, 20, 5, '#6a4a32'); break;
    case 'lamp': x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.arc(px + 27, py + 29, 9, 0, TAU); x.fill(); x.fillStyle = '#e8dcc0'; x.beginPath(); x.arc(px + 24, py + 22, 10, 0, TAU); x.fill(); break;
    case 'safe': sh(); R(6, 4, w - 12, h - 10, '#3a3d44'); R(9, 7, w - 18, h - 16, '#55585f'); x.strokeStyle = '#c8ccd2'; x.lineWidth = 2; x.beginPath(); x.arc(px + 24, py + 22, 7, 0, TAU); x.stroke(); R(30, 30, 6, 3, '#c8ccd2'); break;
  }
}
// 위층 실내: 바깥벽 + 바닥 + 같은 자리 계단 + 칸막이 하나 + 정면 창(정면벽 그림과 같은 칸)
// 꺾인 계단실: 위층의 계단 칸('Y') 옆 한 줄(계단 칸과 들어서는 칸, 세로 두 칸)은 아래층에서 올라오는 계단 구멍이다 — 난간으로 막혀 못 들어간다
// (낮은 난간이라 시선은 지나간다: 'K'). 막아도 건물 안 길이 끊기지 않을 때만, 어느 쪽인지 STAIRW 에 적어 둔다
let STAIRW = {};
function stairWells(g, f) {
  BLD.forEach(b => {
    if (b.h <= f) return;
    for (let ty = b.y0 + 1; ty < b.y1; ty++) for (let tx = b.x0 + 1; tx < b.x1; tx++) {
      if (g[ty][tx] !== 'Y') continue;
      const walk = (x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1 && !SOLID.has(g[y][x]);
      let done = false;
      // 1층 계단이 놓인 방향(들어서는 쪽)을 먼저 — 층마다 계단 방향이 바뀌지 않게 (1층은 상하인데 2층은 좌우이던 문제)
      const DIRS = [[0, 1], [0, -1], [-1, 0], [1, 0]], d0 = DIRS.find(([dx, dy]) => { const nx = tx + dx, ny = ty + dy; return nx > b.x0 && nx < b.x1 && ny > b.y0 && ny < b.y1 && !SOLID.has(G0[ny][nx]) && G0[ny][nx] !== 'Y'; });
      const order = d0 ? [d0].concat(DIRS.filter(d => d !== d0)) : DIRS;
      for (const d of order) { if (done || !walk(tx + d[0], ty + d[1]) || g[ty + d[1]][tx + d[0]] === 'Y') continue;  // 들어서는 쪽: 1층과 같은 방향부터, 안 되면 남·북·서·동 순
      const sides = d[0] ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
      const reach = () => { const seen = new Set(), st = [[tx, ty]]; seen.add(tx + ',' + ty); while (st.length) { const [x, y] = st.pop(); for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + ox, ny = y + oy, k = nx + ',' + ny; if (!seen.has(k) && walk(nx, ny)) { seen.add(k); st.push([nx, ny]); } } } return seen; };
      const count = () => reach().size;
      for (const [sx, sy] of sides) {
        const c1 = [tx + sx, ty + sy], c2 = [tx + sx + d[0], ty + sy + d[1]], floorC = c => walk(c[0], c[1]) && g[c[1]][c[0]] !== 'Y' && !FURN.some(it => (it.fl || 0) === f && c[0] >= it.x && c[0] < it.x + it.w && c[1] >= it.y && c[1] < it.y + it.h);
        const tp = [tx + sx + 2 * d[0], ty + sy + 2 * d[1]];
        if (!floorC(c1) || !floorC(c2) || !floorC(tp)) continue;  // 내려가는 자리(구멍 바닥 쪽 끝 앞 칸)가 벽·가구면 이 방향은 쓰지 않는다 (구석 계단에서 내려가지 못하던 문제)
        const before = reach(), o1 = g[c1[1]][c1[0]], o2 = g[c2[1]][c2[0]]; g[c1[1]][c1[0]] = 'K'; g[c2[1]][c2[0]] = 'K';
        const after = reach(), lost = [...before].filter(k => !after.has(k) && k !== c1.join(',') && k !== c2.join(','));
        // 막혀 떨어져 나간 구석이 1~3칸이고 문·창문에 붙어 있지 않으면 그 자리에 짐 상자를 쌓는다 (계단 밑 창고). 아니면 이 방향은 포기
        const nearOpen = k => { const [x, y] = k.split(',').map(Number); return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => 'NSDdh'.includes(g[y + oy][x + ox]) || (g[y + oy][x + ox] === 'w' && (y + oy === b.y0 || y + oy === b.y1 || x + ox === b.x0 || x + ox === b.x1))); };
        if (lost.length) {  // 먼저 길을 막은 작은 가구(1~2칸)를 계단에서 가까운 것부터 하나씩 치워 본다 — 길이 다시 이어지면 그것만 치운다
          const fc = g[+lost[0].split(',')[1]][+lost[0].split(',')[0]];
          const near = lost.concat([c1.join(','), c2.join(','), (tx + d[0]) + ',' + (ty + d[1])]).map(k => k.split(',').map(Number)), adj = it => near.some(([x, y]) => x >= it.x - 1 && x <= it.x + it.w && y >= it.y - 1 && y <= it.y + it.h);
          const cand = FURN.filter(it => (it.fl || 0) === f && it.w * it.h <= 2 && it.x >= b.x0 && it.x <= b.x1 && it.y >= b.y0 && it.y <= b.y1 && adj(it)).sort((p, q) => (Math.abs(p.x - tx) + Math.abs(p.y - ty)) - (Math.abs(q.x - tx) + Math.abs(q.y - ty)));
          const removed = [];
          for (const it of cand) { const cells = []; for (let yy = it.y; yy < it.y + it.h; yy++) for (let xx = it.x; xx < it.x + it.w; xx++) { cells.push([xx, yy, g[yy][xx]]); g[yy][xx] = fc; } removed.push([it, cells]);
            const a2 = reach(); if (lost.every(k => a2.has(k))) { lost.length = 0; break; } if (removed.length >= 3) break; }
          if (lost.length) removed.forEach(([it, cells]) => cells.forEach(([xx, yy, c]) => { g[yy][xx] = c; }));
          else removed.forEach(([it]) => FURN.splice(FURN.indexOf(it), 1));
        }
        if (lost.includes(tp.join(',')) || lost.length > 3 || lost.some(nearOpen)) { g[c1[1]][c1[0]] = o1; g[c2[1]][c2[0]] = o2; continue; }
        lost.forEach(k => { const [x, y] = k.split(',').map(Number); g[y][x] = 'E'; FURN.push({ x, y, w: 1, h: 1, t: 'boxes', fl: f, seed: (x * 31 + y * 17 + f * 7) >>> 0 }); });
        STAIRW[f + ':' + tx + ',' + ty] = { d, s: [sx, sy] }; done = true; break;
      } }
    }
  });
}
function buildFloors(st) {
  GF = [null]; STAIRW = {}; if (!st.floors) return;  // 위층 실내는 floors: true 인 의뢰만
  const maxH = BLD.reduce((m, b) => Math.max(m, b.h), 1);
  for (let f = 1; f < maxH; f++) {
    const g = []; for (let y = 0; y < MH; y++) g.push(new Array(MW).fill('V'));
    BLD.forEach((b, bi) => {
      if (b.h <= f || b.y1 - b.y0 < 3) return;
      if (b.plan) { (PLANS[bi] = PLANS[bi] || [])[f] = planInterior(g, b, bi, f); return; }
      const fc = f % 2 ? 'v' : 'w';
      for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) g[y][x] = (x === b.x0 || x === b.x1 || y === b.y0 || y === b.y1) ? '#' : fc;
      const stairs = []; for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (G0[y][x] === 'Y') { g[y][x] = 'Y'; stairs.push([x, y]); }
      if (b.x1 - b.x0 >= 6) {
        let xm = b.x0 + 2 * Math.floor((b.x1 - b.x0) / 4); if (stairs.some(s => s[0] === xm)) xm += 2;
        if (xm < b.x1 - 1) { const yg = b.y0 + Math.floor((b.y1 - b.y0) / 2); for (let y = b.y0 + 1; y < b.y1; y++) if (y !== yg && y !== yg + 1 && !stairs.some(s => s[0] === xm && s[1] === y)) g[y][xm] = '#'; }
      }
      for (let x = b.x0 + 1; x < b.x1; x++) if ((x - b.x0) % 2 === 1) { g[b.y1][x] = 'N'; if (g[b.y1 - 1][x] === '#') g[b.y1][x] = '#'; }
      const free = (x, y) => g[y][x] === fc && !stairs.some(s => Math.abs(s[0] - x) + Math.abs(s[1] - y) <= 1) && y < b.y1 - 1;
      [[b.x0 + 1, b.y0 + 1], [b.x1 - 1, b.y0 + 1]].forEach(([x, y]) => { if (free(x, y) && ((x * 7 + y * 3 + f) % 3)) { g[y][x] = 'E'; FURN.push({ x, y, w: 1, h: 1, t: 'boxes', fl: f, seed: (x * 31 + y * 17 + f * 7) >>> 0 }); } });
    });
    (st.floorTiles || []).forEach(([ff, x, y, c]) => { if (ff === f) g[y][x] = c; });
    stairWells(g, f);
    GF[f] = g;
  }
}
// 못 지나가는 장애물을 줄이고, 풀숲과 창문을 늘린다 (같은 지도는 항상 같은 결과)
function refineMap(st) {
  const hsh = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);
  const inB = (x, y) => BLD.some(b => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
  const ok = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
  const FLOORS = ['.', ',', '=', 'w', 'v'];
  const floorOf = (x, y) => { const c = {}; for (const o of N8) { const v = ok(x + o[0], y + o[1]) && G[y + o[1]][x + o[0]]; if (FLOORS.includes(v)) c[v] = (c[v] || 0) + 1; } let best = '.', n = 0; for (const k in c) if (c[k] > n) { n = c[k]; best = k; } return best; };
  const keep = [[st.start[0], st.start[1]], [Math.floor(st.exit[0]), Math.floor(st.exit[1])]].concat(st.items || []);
  const nearKeep = (x, y, r) => keep.some(k => Math.abs(k[0] - x) + Math.abs(k[1] - y) < r);
  if (!st.noRefine) for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const ch = G[y][x], h = hsh(x, y) % 10;
    if (ch === 'C' || ch === 'O' || ch === 'R') {
      if (inB(x, y)) { if (h >= 3) G[y][x] = floorOf(x, y); }
      else if (h >= 4) G[y][x] = (h < 7 && !nearKeep(x, y, 2)) ? 'B' : floorOf(x, y);
      else if (h === 3 && !nearKeep(x, y, 2)) G[y][x] = 'Z';
    } else if (ch === 'T' && hsh(x, y) % 2) G[y][x] = 'B';
  }
  if (!st.noRefine) for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    const ch = G[y][x]; if (!(ch === '.' || ch === '=' || ch === ',') || inB(x, y) || nearKeep(x, y, 3)) continue;
    const nearWall = N8.slice(0, 4).some(o => { const v = G[y + o[1]][x + o[0]]; return v === '#' || v === 'U'; });
    const h = hsh(x + 7, y + 3);
    if ((nearWall && h % 4 === 0) || (ch === '.' && h % 13 === 0) || (ch !== '.' && h % 31 === 0)) G[y][x] = 'B';
  }
  const pipeAt = (x, y) => PIPES.some(p => p[0] === x && p[1] === y);
  const wallish = v => v === '#' || v === 'N' || v === 'S';
  BLD.forEach(b => {
    if (b.plan) return;  // 평면 건물은 창을 스스로 낸다
    const sides = [];
    for (let x = b.x0 + 1; x < b.x1; x++) { sides.push([x, b.y0, 0, -1, 'h0']); sides.push([x, b.y1, 0, 1, 'h1']); }
    for (let y = b.y0 + 1; y < b.y1; y++) { sides.push([b.x0, y, -1, 0, 'v0']); sides.push([b.x1, y, 1, 0, 'v1']); }
    const cnt = {};
    sides.forEach(([x, y, dx, dy, k]) => { if (G[y][x] === 'N') cnt[k] = (cnt[k] || 0) + 1; });
    sides.forEach(([x, y, dx, dy, k], i) => {
      if ((cnt[k] || 0) >= 3 || G[y][x] !== '#' || pipeAt(x, y)) return;
      if ((dx ? y : x) % 2 !== 1) return;
      const ox = x + dx, oy = y + dy, ix = x - dx, iy = y - dy;
      if (!ok(ox, oy) || SOLID.has(G[oy][ox]) || inB(ox, oy) || SOLID.has(G[iy][ix])) return;
      const ax = dy ? 1 : 0, ay = dx ? 1 : 0;
      if (!wallish(G[y - ay][x - ax]) || !wallish(G[y + ay][x + ax])) return;
      G[y][x] = 'N'; cnt[k] = (cnt[k] || 0) + 1;
    });
  });
}
const inMap = (tx, ty) => tx >= 0 && ty >= 0 && tx < MW && ty < MH;
const solidAt = (tx, ty) => !inMap(tx, ty) || SOLID.has(G[ty][tx]);
const lvAt = (tx, ty) => inMap(tx, ty) ? RL[ty * MW + tx] : 0;
const roofAt = (tx, ty) => lvAt(tx, ty) > 0;
// 도시: 옥상 위로 걸을 수 있는 칸은 옥상 그림 부분뿐 (남쪽 정면벽 줄은 건물 옆면이라 못 걷는다)
let FRM = null;
const facadeRow = (tx, ty) => !!(FRM && inMap(tx, ty) && FRM[ty * MW + tx] && !plankAt(tx, ty));
const rLv = (tx, ty) => facadeRow(tx, ty) ? 0 : lvAt(tx, ty);
function buildFRM(exact) {
  FRM = new Uint8Array(MW * MH);
  BLD.forEach(b => {
    let fh = b.fh; if (b.vacant) return;
    if (!exact) { let n = 0; for (let x = b.x0; x <= b.x1; x++) { const ch = G0[b.y1][x]; if ('#NSX'.includes(ch) || (!SOLID.has(ch) && !b.piloti)) n++; } fh = (n === b.x1 - b.x0 + 1 || b.piloti) && b.y1 - b.y0 >= 2 ? clamp(b.h, 1, b.y1 - b.y0 - 1) : 0; }
    for (let y = b.y1 - fh + 1; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) FRM[y * MW + x] = 1;
  });
  buildPlanks();
}
const roofEdgeY = (tx, ty) => { const b = BLD[bldAt(tx, ty)]; return (b.y1 - b.fh) * TILE + TILE - 14; };
const bldAt = (tx, ty) => inMap(tx, ty) ? BI[ty * MW + tx] : -1;
// 플레이어만 비밀 통로('S')를 지나갈 수 있다
const groundSolidP = (tx, ty) => solidAt(tx, ty) && !(inMap(tx, ty) && G[ty][tx] === 'S');
const solidFor = z => z ? (tx, ty) => rLv(tx, ty) !== z || robAt(tx, ty) : groundSolidP;
const opaqueAt = (tx, ty, ign) => !inMap(tx, ty) || (OPAQUE.has(G[ty][tx]) && !(ign && RL[ty * MW + tx] > 0)) || (ign > 0 && robAt(tx, ty) && RL[ty * MW + tx] === ign);  // 옥탑방·물탱크는 옥상 위 시선을 가린다
const tileAt0 = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return inMap(tx, ty) ? G0[ty][tx] : '#'; };
const tileAt = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return inMap(tx, ty) ? G[ty][tx] : '#'; };

// ign = 옥상을 무시 (옥상 위 대상과의 시선)
function castRay(x, y, ang, max, ign) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(TILE / dx) : Infinity, tdy = dy !== 0 ? Math.abs(TILE / dy) : Infinity;
  let tmx = dx > 0 ? ((tx + 1) * TILE - x) / dx : dx < 0 ? (tx * TILE - x) / dx : Infinity;
  let tmy = dy > 0 ? ((ty + 1) * TILE - y) / dy : dy < 0 ? (ty * TILE - y) / dy : Infinity;
  for (let i = 0; i < 80; i++) {
    let t;
    if (tmx < tmy) { t = tmx; tmx += tdx; tx += sx; } else { t = tmy; tmy += tdy; ty += sy; }
    if (t >= max) return max;
    if (opaqueAt(tx, ty, ign)) return t;
  }
  return max;
}
function los(x0, y0, x1, y1, ign) { const d = dist(x0, y0, x1, y1); if (d < 2) return true; return castRay(x0, y0, Math.atan2(y1 - y0, x1 - x0), d, ign) >= d - 1; }

function astar(sx, sy, gx, gy, solidAt = solidAtG) {
  if (solidAt(gx, gy)) {
    let best = null;
    for (let r = 1; r < 3 && !best; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) if (!solidAt(gx + ox, gy + oy) && !best) best = [gx + ox, gy + oy];
    if (!best) return [];
    gx = best[0]; gy = best[1];
  }
  const N = MW * MH, gS = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const startI = sy * MW + sx, goal = gy * MW + gx;
  const open = [startI]; gS[startI] = 0;
  const h = i => { const x = i % MW, y = (i / MW) | 0; const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
  while (open.length) {
    let bi = 0, bf = 1e9;
    for (let k = 0; k < open.length; k++) { const f = gS[open[k]] + h(open[k]); if (f < bf) { bf = f; bi = k; } }
    const cur = open[bi]; open.splice(bi, 1);
    if (cur === goal) break;
    if (closed[cur]) continue; closed[cur] = 1;
    const cx = cur % MW, cy = (cur / MW) | 0;
    for (const o of N8) {
      const nx = cx + o[0], ny = cy + o[1];
      if (solidAt(nx, ny)) continue;
      if (o[0] && o[1] && (solidAt(cx + o[0], cy) || solidAt(cx, cy + o[1]))) continue;
      const ni = ny * MW + nx; if (closed[ni]) continue;
      const ng = gS[cur] + (o[0] && o[1] ? 1.414 : 1);
      if (ng < gS[ni]) { gS[ni] = ng; from[ni] = cur; open.push(ni); }
    }
  }
  if (from[goal] < 0 && goal !== startI) return [];
  const path = []; let c = goal;
  while (c >= 0 && c !== startI) { path.push({ x: tc(c % MW), y: tc((c / MW) | 0) }); c = from[c]; }
  return path.reverse();
}

