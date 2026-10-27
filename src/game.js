'use strict';
(function () {
const A = window.__ASSETS__;
const NEO = window.__THEME === 'neo';  // 네온·스티커 시험판
const JOSEON = window.__THEME === 'joseon' || NEO;
const NEONY = () => NEO || !!(STAGE && STAGE.neon);  // 네온 동네(강남 등): 건물 윤곽·간판·조명이 네온
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
const CITY = window.__THEME === 'city';  // 현대 도시(빌라촌) 시안
if (A.font && window.FontFace) { try { const ff = new FontFace('Galmuri', `url(${A.font})`); ff.load().then(f => document.fonts.add(f)).catch(() => {}); } catch (e) {} }
const TILE = 48;
let MW = 44, MH = 30;
// 땅(z=0)에서 막히는 칸 / 시야를 가리는 칸
const SOLID = new Set(['#', 'C', 'O', 'F', 'T', 'K', 'E', 'R', '~', 'H', 'U', 'W', 'S', 'N', 'X', 'Z', 'M', 'Q', 'q', 'P', 'V', 'A', 'I']);  // 'A' 주차된 차 'I' 필로티 기둥  // 'V' 위층 바깥(허공)  // 'Q' 불 땐 아궁이 'q' 찬 아궁이 'P' 전봇대
const OPAQUE = new Set(['#', 'C', 'O', 'T', 'H', 'U', 'S', 'X', 'M', 'V', 'E']);
// 가구는 두 가지뿐: 높은 가구('E') = 막힘 + 시선 가림, 낮은 가구('K') = 막힘 + 시선 통과(웅크리면 뒤에 숨는다). 깔개·춤추는 자리만 밟고 지나간다
const FURN_TALL = new Set(['wardrobe', 'shelf', 'shelfS', 'locker', 'fridge', 'cab', 'boxes', 'plant', 'spk']);
const FURN_FLAT = new Set(['rug', 'dance']);
if (CITY) SOLID.delete('W');  // 도시: 맨홀 뚜껑은 밟고 지나간다 (막히면 도망치다 멈춘다)  // 'X' = 잠긴 문
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const tc = t => t * TILE + TILE / 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const N8 = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];

// 난이도
const DIFFS = {
  easy: { hp: 4, name: '쉬움', range: 0.9, rate: 0.8, spd: 0.95, stones: 5, coins: 3, picks: 5, kunaiAdd: 1, roll: 0, reinf: 1, time: 1.35 },
  normal: { hp: 3, name: '보통', range: 1.0, rate: 1.08, spd: 1.0, stones: 3, coins: 2, picks: 3, kunaiAdd: 0, roll: 80, reinf: 2, time: 1.0 },
  hard: { hp: 2, name: '어려움', range: 1.12, rate: 1.32, spd: 1.08, stones: 2, coins: 1, picks: 2, kunaiAdd: -1, roll: 55, reinf: 3, time: 0.85 }
};
let DKEY = 'normal'; try { const d = localStorage.getItem('yahaeng.diff'); if (DIFFS[d]) DKEY = d; } catch (e) {}
const D = () => DIFFS[DKEY];
// 속도(픽셀/초) — 경비는 플레이어보다 확실히 느리게
const SPD = { sneak: 84, walk: 130, run: 215, gPatrol: 48, gSusp: 60, gBody: 66, gAlert: 128, target: 36, flee: 92 };

// ---------------------------------------------------------------- 지도
let G, STAGE, STAGE_I = 0;
let POLES = [], CARS = [], CROWD = [];
// 시끄러운 곳: 클럽 안(음악) → 내 소리 35%만 퍼진다. 클럽 건물 다른 층·바로 바깥(새어 나오는 베이스) → 60%
function loudMul(x, y, fl) {
  let m = 1; const tx = x / TILE, ty = y / TILE;
  for (const c of CROWD) { if (!c.club) continue;
    if (c.fl === fl && tx >= c.x0 && tx < c.x1 + 1 && ty >= c.y0 - 1 && ty < c.y1 + 1) return 0.35;
    const B = BLD[c.b]; if (B && tx >= B.x0 - 3 && tx < B.x1 + 4 && ty >= B.y0 - 3 && ty < B.y1 + 4 && (fl === 0 || (tx >= B.x0 && tx < B.x1 + 1 && ty >= B.y0 && ty < B.y1 + 1))) m = Math.min(m, 0.6); }
  return m;
}
const inCrowd = (x, y, fl) => CROWD.some(c => c.fl === fl && x >= c.x0 * TILE && x < (c.x1 + 1) * TILE && y >= c.y0 * TILE && y < (c.y1 + 1) * TILE);
// 층: G0 = 땅(1층) 지도, GF[f] = f층 위(2층=1, 3층=2) 지도. G 는 지금 계산 중인 층을 가리킨다
let G0 = null, GF = [null], CUR_F = 0;
const flOf = o => (o && o.fl) || 0;
function setLayer(f) { CUR_F = f || 0; G = CUR_F && GF[CUR_F] ? GF[CUR_F] : G0; }
let BLD = [], PIPES = [], TENTS = [], RL = null, BI = null, UG = null, VG = null;  // 건물 목록, 배관, 칸별 지붕 높이, 칸별 건물 번호
function buildMap(st) {
  MW = st.W; MH = st.H; G = []; BLD = []; PIPES = []; TENTS = []; POLES = []; CARS = []; FURN = []; PLANS = []; AUTO_LAMPS = [];
  for (let y = 0; y < MH; y++) G.push(new Array(MW).fill('.'));
  const m = {
    set: (x, y, c) => { if (y >= 0 && y < MH && x >= 0 && x < MW) G[y][x] = c; },
    get: (x, y) => (y >= 0 && y < MH && x >= 0 && x < MW) ? G[y][x] : '#',
    fill: (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.set(x, y, c); },
    rect: (x0, y0, x1, y1) => { for (let x = x0; x <= x1; x++) { m.set(x, y0, '#'); m.set(x, y1, '#'); } for (let y = y0; y <= y1; y++) { m.set(x0, y, '#'); m.set(x1, y, '#'); } },
    many: (c, list) => list.forEach(p => m.set(p[0], p[1], c)),
    // 건물: 바닥·벽·문을 그리고 지붕(높이 h)을 기록
    bld: (x0, y0, x1, y1, h, doors, floor) => { m.fill(x0, y0, x1, y1, floor || 'w'); m.rect(x0, y0, x1, y1); (doors || []).forEach(d => m.set(d[0], d[1], floor || 'w')); BLD.push({ x0, y0, x1, y1, h }); },
    // 필로티 빌라: 1층은 기둥만 있는 주차장(앞쪽이 트임), 2층부터 집
    piloti: (x0, y0, x1, y1, h) => {
      m.fill(x0, y0, x1, y1, ','); for (let x = x0; x <= x1; x++) m.set(x, y0, '#'); for (let y = y0; y < y1; y++) { m.set(x0, y, '#'); m.set(x1, y, '#'); }
      for (let x = x0; x <= x1; x++) if ((x - x0) % 3 === 0 || x === x1) m.set(x, y1, 'I');
      BLD.push({ x0, y0, x1, y1, h, piloti: true });
    },
    // 평면이 자동으로 짜이는 건물: kind 'villa'(빌라) · 'house'(단독) · 'shop'(상가, use = 층별 용도, signs = 간판)
    villa: (x0, y0, x1, y1, h, o = {}) => { const b = { x0, y0, x1, y1, h, plan: true, kind: o.kind || 'villa', piloti: !!o.piloti, floorsUse: o.use, signs: o.signs, story: o.story, name: o.name, glass: !!o.glass, plateName: o.plate, backDoor: !!o.back }; const bi = BLD.length; BLD.push(b); PLANS[bi] = [planInterior(G, b, bi, 0)]; return bi; },
    car: (x, y, c) => { m.set(x, y, 'A'); m.set(x, y + 1, 'A'); CARS.push([x, y, c || 0]); },
    roof: (x0, y0, x1, y1, h) => BLD.push({ x0, y0, x1, y1, h }),
    pipe: (x, y) => PIPES.push([x, y]),
    pole: (x, y, h) => { m.set(x, y, 'P'); POLES.push([x, y, h || 2]); },
    tent: (x, y, c) => { m.fill(x, y, x + 1, y + 1, 'M'); TENTS.push([x, y, c || 'R']); }
  };
  st.build(m);
  // 평면 건물 1층 창문인데 바깥이 막혀 있으면(전봇대·맨홀·지도 끝) 벽으로
  BLD.forEach(b => { if (!b.plan) return; for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (G[y][x] === 'N') { const ox = x === b.x0 ? x - 1 : x === b.x1 ? x + 1 : x, oy = y === b.y1 ? y + 1 : y === b.y0 ? y - 1 : y; if (!inMap(ox, oy) || SOLID.has(G[oy][ox])) G[y][x] = '#'; } });
  refineMap(st);
  RL = new Uint8Array(MW * MH); BI = new Int16Array(MW * MH).fill(-1);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (G[y][x] === 'U') RL[y * MW + x] = 1;
  BLD.forEach((b, i) => { for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { RL[y * MW + x] = b.h; BI[y * MW + x] = i; } });
  (st.planks || []).forEach(([x0, y0, x1, y1, z]) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inMap(x, y) && RL[y * MW + x] < z) RL[y * MW + x] = z; });
  G0 = G; buildFloors(st); CUR_F = 0;
}
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
  const furn = (x, y, w, h, t, solid = true) => {
    solid = !FURN_FLAT.has(t);  // 밟고 지나갈 수 있는 건 바닥 깔개뿐 (화분·칠판도 막는다)
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { if (xx < ix0 || xx > ix1 || yy < iy0 || yy > iy1 || !floorCh(g[yy][xx]) || keep.has(xx + ',' + yy)) return false; }
    if (needWall && t !== 'rug' && !wallSide(x, y, w, h)) return false;
    if (solid) {
      const old = []; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { old.push([xx, yy, g[yy][xx]]); g[yy][xx] = FURN_TALL.has(t) ? 'E' : 'K'; }
      if (!connected()) { old.forEach(([xx, yy, c]) => { g[yy][xx] = c; }); return false; }  // 길을 막으면 놓지 않는다
    }
    FURN.push({ x, y, w, h, t, fl: f, seed: (x * 31 + y * 17 + f * 7 + bi) >>> 0 });
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
  // 한 세대
  const unit = (ux0, ux1, side) => {
    const uw = ux1 - ux0 + 1, rd = Math.max(2, Math.floor((D - 1) / 2)), yb = iy0 + rd;
    const u = { living: { x0: ux0, y0: yb + 1, x1: ux1, y1: iy1 }, rooms: [], bath: null };
    fill(ux0, yb + 1, ux1, iy1, 'w');
    if (D >= 5 && uw >= 3) {
      for (let x = ux0; x <= ux1; x++) g[yb][x] = '#';
      let rx0 = ux0, rx1 = ux1;
      if (uw >= 6) {
        const bx0 = side === 'L' ? ux0 : ux1 - 1, wx = side === 'L' ? ux0 + 2 : ux1 - 2;
        fill(bx0, iy0, bx0 + 1, yb - 1, 't'); for (let y = iy0; y < yb; y++) g[y][wx] = '#';
        u.bath = { x0: bx0, y0: iy0, x1: bx0 + 1, y1: yb - 1 }; gap(bx0 + (side === 'L' ? 1 : 0), yb, 'w');
        if (side === 'L') rx0 = ux0 + 3; else rx1 = ux1 - 3;
      }
      const rw = rx1 - rx0 + 1;
      const splits = rw >= 7 ? [[rx0, rx0 + Math.floor(rw / 2) - 1], [rx0 + Math.floor(rw / 2) + 1, rx1]] : [[rx0, rx1]];
      if (splits.length === 2) for (let y = iy0; y < yb; y++) g[y][splits[0][1] + 1] = '#';
      splits.forEach(([a, z]) => { fill(a, iy0, z, yb - 1, 'v'); u.rooms.push({ x0: a, y0: iy0, x1: z, y1: yb - 1 }); gap(Math.floor((a + z + 1) / 2), yb, 'w'); });
    } else u.living.y0 = iy0;
    rec.units.push(u); return u;
  };
  const furnishUnit = (u, side) => {
    needWall = true;
    u.rooms.forEach((r, i) => {
      if (i === 0) { furn(r.x0, r.y0, 1, 2, 'bed') || furn(r.x1, r.y0, 1, 2, 'bed'); furn(r.x1, r.y0, 1, 1, 'desk') || furn(r.x1 - 1, r.y0, 1, 1, 'plant', false); if (r.x1 - r.x0 >= 3) furn(r.x0 + 1, r.y0, 2, 1, 'wardrobe') || furn(r.x0 + 1, r.y0, 1, 1, 'wardrobe'); else furn(r.x0, r.y1, 1, 1, 'wardrobe'); }
      else { furn(r.x1, r.y0, 1, 2, 'bed') || furn(r.x0, r.y0, 1, 2, 'bed'); furn(r.x0, r.y0, 1, 1, 'desk'); furn(r.x0 + 1, r.y0, 2, 1, 'wardrobe') || furn(r.x0 + 1, r.y0, 1, 1, 'wardrobe') || furn(r.x0, r.y1, 1, 1, 'wardrobe'); }
    });
    if (u.bath) { furn(u.bath.x0, u.bath.y0, 2, 1, 'bath'); furn(u.bath.x0 + (side === 'L' ? 0 : 1), u.bath.y1, 1, 1, 'toilet'); }
    const L = u.living;
    // 자리 찾기: 선호하는 쪽(core = 계단실 쪽, far = 바깥쪽)에서부터 들어갈 곳을 훑는다
    const place = (w, h, t, pref, rows, solid = true) => {
      const xs = []; for (let x = L.x0; x + w - 1 <= L.x1; x++) xs.push(x);
      const coreFirst = (pref === 'core') === (side === 'L');
      xs.sort((a, b) => coreFirst ? a - b : b - a);
      for (const y of rows) for (const x of xs) if (y >= L.y0 && y + h - 1 <= L.y1 && furn(x, y, w, h, t, solid)) return true;
      return false;
    };
    const R0 = [L.y0, L.y0 + 1, L.y1 - 1, L.y1], RM = [L.y0 + 1, L.y0, L.y1 - 1];
    place(2, 1, 'sink', 'core', R0) || place(1, 1, 'sink', 'core', R0);
    place(1, 1, 'fridge', 'core', R0);
    place(2, 2, 'rug', 'mid', [L.y0 + 1, L.y0], false);
    place(2, 1, 'sofa', 'far', RM);
    place(2, 1, 'tv', 'far', [L.y1 - 1, L.y1, L.y0]) || place(1, 1, 'tv', 'far', [L.y1 - 1, L.y1]);
    place(2, 1, 'table', 'core', [L.y0 + 1, L.y1 - 1]) || place(1, 1, 'tableS', 'core', RM);
    place(1, 1, 'wardrobe', 'far', [L.y0, L.y1]);  // 거실 붙박이장
    place(1, 1, 'plant', 'far', [L.y1, L.y0], false);
    lampAt(L.x0, L.y0, L.x1, L.y1, f === 0 ? 0.45 : 0.3);
    needWall = false;
  };
  if (kind === 'shop') {
    const cx0 = ix1 - 1; for (let y = iy0; y <= iy1; y++) g[y][cx0 - 1] = '#'; fill(cx0, iy0, ix1, iy1, 'h'); g[iy0][ix1] = 'Y'; rec.stair = [ix1, iy0]; K(ix1, iy0 + 1); K(cx0, iy0);
    gap(cx0 - 1, iy1 - 1, 'h'); if (f === 0) { g[b.y1][cx0] = 'h'; K(cx0, iy1); if (b.backDoor) { g[b.y0][cx0] = 'h'; K(cx0, iy0); } }
    const use = (b.floorsUse || [])[f] || (f === 0 ? 'store' : 'office');
    const sx0 = ix0, sx1 = cx0 - 2; fill(sx0, iy0, sx1, iy1, use === 'store' || use === 'food' ? 't' : use === 'pc' ? 'h' : 'w');
    rec.store = { x0: sx0, y0: iy0, x1: sx1, y1: iy1, use };
    if (f === 0) { const dx = sx0 + 2; g[b.y1][dx] = 't'; K(dx, iy1); K(dx, iy1 - 1); }
    for (let x = sx0; x <= sx1; x++) K(x, iy1);  // 앞줄 비움(창문 쪽 통로)
    K(ix0, iy1 - 1); K(ix1, iy1 - 1);  // 옆 창문 안쪽 비움 (옆 건물 창문 건너기)
    if (use === 'store') { for (let y = iy0 + 1; y < iy1 - 1; y += 2) for (let x = sx0 + 1; x + 2 <= sx1 - 1; x += 4) furn(x, y, 3, 1, 'shelf'); furn(sx1 - 1, iy1 - 1, 2, 1, 'counter'); furn(sx0, iy0, 1, 1, 'fridge'); furn(sx0 + 1, iy0, 1, 1, 'locker'); }
    else if (use === 'pc') { for (let y = iy0; y < iy1; y += 2) for (let x = sx0; x <= sx1; x++) if ((x - sx0) % 4 !== 3) furn(x, y, 1, 1, 'pc'); }
    else if (use === 'academy') { furn(sx0 + 1, iy0, Math.max(2, sx1 - sx0 - 1), 1, 'board'); for (let y = iy0 + 2; y < iy1; y += 2) for (let x = sx0; x <= sx1; x += 2) furn(x, y, 1, 1, 'desk'); }
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
    else if (use === 'food') { for (let y = iy0 + 1; y < iy1; y += 2) for (let x = sx0 + 1; x + 1 <= sx1; x += 3) furn(x, y, 2, 1, 'table'); furn(sx0, iy0, 2, 1, 'sink'); }
    else { for (let y = iy0 + 1; y < iy1; y += 2) for (let x = sx0 + 1; x + 1 <= sx1 - 1; x += 3) furn(x, y, 2, 1, 'desk2'); furn(sx0, iy0, 1, 1, 'locker'); furn(sx0 + 1, iy0, 1, 1, 'cab'); furn(sx1 - 1, iy0, 2, 1, 'sofa'); furn(sx0, iy1 - 1, 1, 1, 'locker'); }
    if (use !== 'club') lampAt(sx0, iy0, sx1, iy1, f === 0 ? 0.9 : 0.5);
  } else if (kind === 'villa' && W >= 12) {
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
      winAndSide(); story(); furnishUnit(uL, 'R'); furnishUnit(uR, 'L');
      return rec;
    }
  } else {
    // 한 세대 집 (단독·좁은 빌라): 계단은 앞쪽 오른쪽 구석
    const u = unit(ix0, ix1, 'R');
    // 계단은 거실 오른쪽 끝, 바로 위가 걸을 수 있는 지붕 칸인 줄에 둔다 (옥상 계단실이 그 칸 위에 선다)
    const fhE = Math.max(1, Math.min(b.h || 1, b.y1 - b.y0 - 1)), sy = Math.max(u.living.y0, Math.min(iy1, b.y1 - fhE - (b.kind === 'house' ? 1 : 0)));  // 단독주택은 지붕 앞줄이 경사(맨사드)라 한 줄 뒤
    g[sy][ix1] = 'Y'; rec.stair = [ix1, sy]; K(ix1 - 1, sy); K(ix1, sy - 1); if (sy < iy1) K(ix1, sy + 1);
    if (f === 0) { const dx = Math.floor((ix0 + ix1) / 2); g[b.y1][dx] = 'w'; K(dx, iy1); K(dx, iy1 - 1); if (b.backDoor) { g[b.y0][ix0 + 1] = 'w'; K(ix0 + 1, iy0); K(ix0 + 1, iy0 + 1); } }
    winAndSide(); story(); furnishUnit(u, 'R');
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
  if (!CITY) return;
  x.font = '700 13px Galmuri, "IBM Plex Sans KR", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(232,227,214,.3)';
  const lab = (r, t) => { if (!r || r.x1 < rx0 || r.x0 > rx1 || r.y1 < ry0 || r.y0 > ry1) return; x.fillText(t, (r.x0 + r.x1 + 1) / 2 * TILE, (r.y0 + r.y1 + 1) / 2 * TILE); };
  PLANS.forEach((fls, bi) => { const p = fls && fls[f]; if (!p) return; const b = BLD[bi];
    p.units.forEach(u => { if (!u.rooms.length && f === 0 && b.piloti) { lab(u.living, '주차장'); return; } lab(u.living, '거실'); u.rooms.forEach((r, i) => lab(r, i ? '작은방' : '안방')); lab(u.bath, '욕실'); });
    if (p.store) lab(p.store, (b.signs && b.signs[f]) || USE_NAME[p.store.use] || '');
  });
  x.textBaseline = 'alphabetic';
}
// 가구 그리기 (위에서 본 단순한 픽셀 모양)
// 가구: 막힌 칸은 어두운 판 위에 그리고, 그림 위에 칸 테두리를 덧그린다 (높은 가구는 파랑, 낮은 가구는 주황). 깔개는 테두리 없음
function drawFurn(x, it) {
  const flat = FURN_FLAT.has(it.t), T = TILE, px = it.x * T, py = it.y * T, w = it.w * T, h = it.h * T, tall = FURN_TALL.has(it.t);
  if (!flat) { x.fillStyle = 'rgba(0,0,0,.38)'; x.fillRect(px + 1, py + 1, w - 2, h - 2); }
  drawFurnArt(x, it);
  if (!flat) {
    x.strokeStyle = tall ? 'rgba(150,190,240,.62)' : 'rgba(236,190,120,.55)'; x.lineWidth = 2; x.strokeRect(px + 2, py + 2, w - 4, h - 4);
    if (tall) { x.fillStyle = 'rgba(150,190,240,.62)'; for (const [cx, cy] of [[px + 2, py + 2], [px + w - 2, py + 2], [px + 2, py + h - 2], [px + w - 2, py + h - 2]]) x.fillRect(cx - 3, cy - 3, 6, 6); }
  }
}
function drawFurnArt(x, it) {
  if (CITY && KIT) { const k = kitFurn[it.t + '_' + it.w + 'x' + it.h]; if (k && kitOk(k.img)) { x.drawImage(k.img, it.x * TILE + k.ox, it.y * TILE + k.oy); return; } }
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
    case 'safe': sh(); R(6, 4, w - 12, h - 10, '#3a3d44'); R(9, 7, w - 18, h - 16, '#55585f'); x.strokeStyle = '#c8ccd2'; x.lineWidth = 2; x.beginPath(); x.arc(px + 24, py + 22, 7, 0, TAU); x.stroke(); R(30, 30, 6, 3, '#c8ccd2'); break;
  }
}
// 위층 실내: 바깥벽 + 바닥 + 같은 자리 계단 + 칸막이 하나 + 정면 창(정면벽 그림과 같은 칸)
function buildFloors(st) {
  GF = [null]; if (!st.floors) return;  // 위층 실내는 floors: true 인 작전만
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
// 도시: 지붕 위로 걸을 수 있는 칸은 지붕 그림 부분뿐 (남쪽 정면벽 줄은 건물 옆면이라 못 걷는다)
let FRM = null;
const facadeRow = (tx, ty) => !!(FRM && inMap(tx, ty) && FRM[ty * MW + tx]);
const rLv = (tx, ty) => facadeRow(tx, ty) ? 0 : lvAt(tx, ty);
function buildFRM(exact) {
  if (!CITY) { FRM = null; return; }
  FRM = new Uint8Array(MW * MH);
  BLD.forEach(b => {
    let fh = b.fh;
    if (!exact) { let n = 0; for (let x = b.x0; x <= b.x1; x++) { const ch = G0[b.y1][x]; if ('#NSX'.includes(ch) || (!SOLID.has(ch) && !b.piloti)) n++; } fh = (n === b.x1 - b.x0 + 1 || b.piloti) && b.y1 - b.y0 >= 2 ? clamp(b.h, 1, b.y1 - b.y0 - 1) : 0; }
    for (let y = b.y1 - fh + 1; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) FRM[y * MW + x] = 1;
  });
}
const roofEdgeY = (tx, ty) => { const b = BLD[bldAt(tx, ty)]; return (b.y1 - b.fh) * TILE + TILE - 14; };
const bldAt = (tx, ty) => inMap(tx, ty) ? BI[ty * MW + tx] : -1;
// 플레이어만 비밀 통로('S')를 지나갈 수 있다
const groundSolidP = (tx, ty) => solidAt(tx, ty) && !(inMap(tx, ty) && G[ty][tx] === 'S');
const solidFor = z => z ? (tx, ty) => rLv(tx, ty) !== z || robAt(tx, ty) : groundSolidP;
const opaqueAt = (tx, ty, ign) => !inMap(tx, ty) || (OPAQUE.has(G[ty][tx]) && !(ign && RL[ty * MW + tx] > 0)) || (ign > 0 && robAt(tx, ty) && RL[ty * MW + tx] === ign);  // 옥탑방·물탱크는 지붕 위 시선을 가린다
const tileAt0 = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return inMap(tx, ty) ? G0[ty][tx] : '#'; };
const tileAt = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return inMap(tx, ty) ? G[ty][tx] : '#'; };

// ign = 지붕을 무시 (지붕 위 대상과의 시선)
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

// ---------------------------------------------------------------- 그래픽
const atlas = new Image();
const F = A.frames;
const spr = {};
// 픽셀 아트 그리기 도우미 (16px 원본을 3배로)
function blit(c, name, dx, dy, dw, dh, sx = 0, sy = 0, sw, sh) { const f = F[name]; if (!f) return; c.drawImage(atlas, f[0] + sx, f[1] + sy, sw || f[2], sh || f[3], dx, dy, dw, dh); }
const dirOf = a => { const c = Math.cos(a), s = Math.sin(a); return Math.abs(c) > Math.abs(s) ? (c > 0 ? 3 : 2) : (s > 0 ? 0 : 1); };
const charOf = g => g.doc ? 'doc' : g.civ ? 'civ' + (window.__PR ? ((g.look || 0) + g.id * 3) % 10 : (g.look || 0)) : g.dog ? 'dog' : g.lookout ? 'hunter' : g.target ? (g.id % 2 ? 'old' : 'noble') : g.kind === 'g3' ? 'samR' : g.kind === 'g2' ? 'samB' : 'sam';
// ---- 프리렌더 배경 (Kenney Retro Urban Kit, CC0): 건물 외관 · 바닥 · 나무를 같은 3/4 투영으로 미리 찍은 그림
const KIT_PROP = {};  // 키트 거리 소품 (쓰레기통 등)
if (window.__KIT && window.__KIT.props) for (const k in window.__KIT.props) { const e = window.__KIT.props[k]; KIT_PROP[k] = { img: Object.assign(new Image(), { src: e.src }), ox: e.ox, oy: e.oy }; }
const KIT = window.__KIT || null, kitG = {}, kitT = [], kitB = {}, kitBush = KIT && KIT.bush ? Object.assign(new Image(), { src: KIT.bush }) : null;
if (KIT) {
  for (const [k, src] of Object.entries(KIT.ground || {})) { const im = new Image(); im.src = src; kitG[k] = im; }
  (KIT.trees || []).forEach(src => { const im = new Image(); im.src = src; kitT.push(im); });
}
const kitOk = im => im && im.complete && im.naturalWidth > 0;
const kitTex = {}, kitFurn = {};
if (KIT) {
  for (const [k, src] of Object.entries(KIT.tex || {})) kitTex[k] = Object.assign(new Image(), { src });
  for (const [k, v] of Object.entries(KIT.furn || {})) kitFurn[k] = { img: Object.assign(new Image(), { src: v.src }), ox: v.ox, oy: v.oy };
}
// 실내 바닥 재질 (64px 텍스처를 한 칸으로): 나무 마루 · 짙은 마루(가로결) · 타일 · 콘크리트
const kitFloorC = {};
function kitFloor(k) {
  if (kitFloorC[k]) return kitFloorC[k];
  const src = kitTex[k === 'planks2' ? 'planks' : k]; if (!kitOk(src)) return null;
  const c = document.createElement('canvas'); c.width = c.height = TILE; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  if (k === 'planks2') { x.translate(TILE, 0); x.rotate(Math.PI / 2); }
  x.drawImage(src, 0, 0, TILE, TILE); x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = k === 'planks2' ? 'rgba(30,18,10,.35)' : k === 'tiles' ? 'rgba(220,230,240,.08)' : 'rgba(0,0,0,.08)'; x.fillRect(0, 0, TILE, TILE);
  return (kitFloorC[k] = c);
}
// 판이 시작될 때: 구운 건물 그림을 이 판 건물에 붙인다 (지도 모양이 바뀌었으면 붙이지 않고 기존 그림을 쓴다)
function kitAttach() {
  ROB = null; BLD.forEach(b => { b.kitProps = null; });
  if (!KIT || !KIT.bld || !KIT.bld[STAGE.id]) return;
  const cache = kitB[STAGE.id] || (kitB[STAGE.id] = {});
  for (const e of KIT.bld[STAGE.id]) {
    const b = BLD[e.i]; if (!b || [b.x0, b.y0, b.x1, b.y1, b.h].join() !== e.key.join()) continue;
    let k = cache[e.i];
    if (!k) { k = cache[e.i] = { img: new Image(), ox: e.ox, oy: e.oy, w: e.w, h: e.h, c: null, gl: e.gl || [], g: null }; k.img.src = e.src; }
    b.kit = k; b.kitProps = e.props || null;
  }
  robBuild();
}
// 지붕 부분만 밤빛으로 한 번 어둡게 칠한 사본 (정면 벽은 매 프레임 조명에 따라 칠한다)
function kitCanvas(b) {
  const k = b.kit; if (k.c) return k.c; if (!kitOk(k.img)) return null;
  const c = document.createElement('canvas'); c.width = k.w; c.height = k.h; const x = c.getContext('2d'); x.drawImage(k.img, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = NEONY() ? 'rgba(26,8,56,.42)' : 'rgba(4,8,22,.46)';
  x.fillRect(0, 0, k.w, (b.y1 - b.fh + 1) * TILE - k.oy);
  // 옥상 발광체(간판·옥탑방 창·채광창)는 어둡게 칠한 뒤 다시 밝힌다. 간판에는 글자를 쓴다
  x.globalCompositeOperation = 'source-over';
  k.gl.forEach(([gx, gy, gw, gh, col, t], i) => {
    if (t === 's') {
      x.fillStyle = col; x.fillRect(gx, gy, gw, gh);
      const words = ['노래방', 'PC방', '호프', '당구장', '24시', '모텔', '사우나', '찜질방', '치킨', '소주방'], wd = words[(b.x0 * 7 + b.y0 * 13 + i) % words.length];
      x.font = `700 ${Math.round(gh * 0.72)}px Galmuri, "IBM Plex Sans KR", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 3; x.strokeStyle = 'rgba(20,6,30,.85)'; x.strokeText(wd, gx + gw / 2, gy + gh / 2 + 1); x.fillStyle = '#fff6fb'; x.fillText(wd, gx + gw / 2, gy + gh / 2 + 1);
    } else { x.fillStyle = t === 'w' ? '#ffd8a0' : 'rgba(255,214,150,.3)'; x.fillRect(gx, gy, gw, gh); }  // 채광창은 바닥에 깔린 유리라 은은하게
  });
  return (k.c = c);
}
// 옥상 발광체 둘레의 번짐(한 번만 그려 두고 매 프레임 더하기 합성)
function kitGlow(k) {
  if (k.g !== null) return k.g; if (!k.gl.length) return (k.g = false);
  const c = document.createElement('canvas'); c.width = k.w; c.height = k.h; const x = c.getContext('2d');
  k.gl.forEach(([gx, gy, gw, gh, col, t]) => {
    const cx = gx + gw / 2, cy = gy + gh / 2, r = t === 's' ? Math.max(gw, gh) * 0.75 : 26, g = x.createRadialGradient(cx, cy, 2, cx, cy, r);
    const rgb = t === 's' ? col : t === 'w' ? '#ffb060' : '#ffc070', al = t === 's' ? 0.55 : t === 'w' ? 0.4 : 0.12;
    g.addColorStop(0, rgb + Math.round(al * 255).toString(16).padStart(2, '0')); g.addColorStop(1, rgb + '00');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  });
  return (k.g = c);
}
function drawKitBuilding(b) {
  const c = kitCanvas(b); if (!c) return false;
  const k = b.kit; ctx.drawImage(c, k.ox, k.oy);
  const gw = kitGlow(k);
  if (gw && !(b.wsT > S.t - 0.2)) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8 + 0.2 * Math.sin(S.t * 2.3 + b.x0); ctx.drawImage(gw, k.ox, k.oy); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  const y = b.y1 * TILE;
  if (!b.fl || S.t - b.flT > 0.3) { b.flT = S.t; b.fl = []; for (let tx = b.x0; tx <= b.x1; tx++) b.fl.push(lightAt(tc(tx), y + TILE + 14)); }
  for (let r = 0; r < b.fh; r++) {
    const yy = (b.y1 - r) * TILE, g = r ? GF[r] : G0;
    for (let tx = b.x0; tx <= b.x1; tx++) {
      const x = tx * TILE, l = b.fl[tx - b.x0];
      ctx.fillStyle = `rgba(4,8,22,${(r ? 0.66 : 0.6) * (1 - clamp(l, 0, 1)) + 0.05 * r})`; ctx.fillRect(x, yy, TILE, TILE);
      const win = g && g[b.y1] ? g[b.y1][tx] === 'N' : (tx > b.x0 && tx < b.x1 && (tx - b.x0) % 2 === 1);
      if (win && b.kind !== 'shop') { const h = ((tx * 92821) ^ ((b.y1 - r) * 68917) ^ (b.x0 * 31)) >>> 0; if (h % 5 === 0) { const fl = 0.85 + 0.15 * Math.sin(S.t * 3 + tx); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,170,80,${0.4 * fl})`; ctx.fillRect(x + 12, yy + 13, 24, 21); ctx.globalCompositeOperation = 'source-over'; } }
    }
  }
  if (b.kind === 'shop') drawShopSigns(b);
  return true;
}
// 내 둘레 가구의 막힌 칸: 어두운 방에서도 어디로 지나갈 수 있는지 보이게 (가까울수록 진하게)
function drawNearFurn(P, openB) {
  if (P.z || P.vent || P.under || P.hide) return; const fP = flOf(P), R = 230;
  for (const it of FURN) {
    if ((it.fl || 0) !== fP || FURN_FLAT.has(it.t)) continue; const bi = bldAt(it.x, it.y); if (bi >= 0 && bi !== openB) continue;
    const x = it.x * TILE, y = it.y * TILE, w = it.w * TILE, h = it.h * TILE, d = Math.hypot(clamp(P.x, x, x + w) - P.x, clamp(P.y, y, y + h) - P.y); if (d > R) continue;
    const a = 0.75 * (1 - d / R), tall = FURN_TALL.has(it.t);
    ctx.strokeStyle = tall ? `rgba(150,190,240,${a})` : `rgba(240,196,120,${a})`; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    if (tall) { ctx.fillStyle = `rgba(150,190,240,${a})`; for (const [cx, cy] of [[x + 2, y + 2], [x + w - 2, y + 2], [x + 2, y + h - 2], [x + w - 2, y + h - 2]]) ctx.fillRect(cx - 3, cy - 3, 6, 6); }
  }
}
// 어쌔신 크리드식 머리 위 발견 표시: 아래를 향한 삼각형이 밑에서부터 찬다. 흰색 = 눈치, 노랑 = 의심, 빨강 = 발각
function drawAwareMark(g) {
  const al = g.state === 'ALERT', m = al ? 1 : clamp(g.meter, 0, 1), col = awareCol(g), k = Math.max(1, 0.9 / SCALE), x = g.x, y = g.y - 40 * k, w = 13 * k, h = 15 * k;
  const pulse = al ? 1 : m > 0.75 ? 0.75 + 0.25 * Math.sin(S.t * 14) : 1;
  ctx.save(); ctx.globalAlpha = pulse;
  ctx.beginPath(); ctx.moveTo(x - w, y - h); ctx.lineTo(x + w, y - h); ctx.lineTo(x, y + h * 0.55); ctx.closePath();
  ctx.fillStyle = 'rgba(7,10,18,.78)'; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = col; const top = y + h * 0.55 - (h * 1.55) * m; ctx.fillRect(x - w, top, w * 2, y + h * 0.55 - top); ctx.restore();
  ctx.lineWidth = 2 * k; ctx.strokeStyle = col; ctx.stroke();
  const glyph = al ? '!' : (g.meter >= NOTICE_AT || g.icon === '?') ? '?' : '';
  if (glyph) { ctx.font = `900 ${Math.round(13 * k)}px Galmuri, "IBM Plex Sans KR", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = m > 0.55 ? '#140d08' : col; ctx.fillText(glyph, x, y - h * 0.32); ctx.textBaseline = 'alphabetic'; }
  ctx.restore();
}
// 내 둘레의 방향 표시: 나를 보고 있는 사람 쪽으로 호가 생기고 게이지만큼 길고 진해진다. 시야에서 놓친 자리에는 흐린 그림자(마지막으로 본 곳)
function drawAwareness(P) {
  if (P.hide || P.vent || P.under) return;
  const k = Math.max(1, 0.9 / SCALE), R = 34 * k;
  if (S.guards.some(g => !g.civ && g.meter > 0.08 && g.state !== 'ALERT')) hint('aware', '경비 머리 위 삼각형이 차오르면 들키는 중이다. 흰색 = 눈치, 노랑 = 의심해서 확인하러 온다, 빨강 = 발각. 시야에서 벗어나면 다시 줄어든다');
  for (const g of S.guards) {
    if (g.civ || g.dog || g.state === 'DEAD' || g.state === 'CAPTIVE' || dist(g.x, g.y, P.x, P.y) > 1100) continue;
    const al = g.state === 'ALERT', m = al ? 1 : g.meter; if (m < 0.03) continue;
    const a = Math.atan2(g.y - P.y, g.x - P.x), span = 0.22 + 0.5 * m;
    ctx.strokeStyle = awareCol(g); ctx.globalAlpha = 0.35 + 0.6 * m; ctx.lineWidth = (3 + 3 * m) * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(P.x, P.y, R, a - span / 2, a + span / 2); ctx.stroke(); ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
  }
  const seenBy = S.guards.find(g => !g.civ && g.state !== 'DEAD' && ((g.state === 'ALERT' && g.lostT > 0.4) || (g.state === 'SEARCH' && g.why !== 'heard')) && g.lastSeen);
  if (seenBy && dist(seenBy.lastSeen.x, seenBy.lastSeen.y, P.x, P.y) > 60) {
    const L = seenBy.lastSeen; ctx.save(); ctx.globalAlpha = 0.3 + 0.08 * Math.sin(S.t * 4); drawChar('ninja', L.x, L.y, 0, false, 0.5); ctx.restore();
    ctx.font = '700 11px Galmuri, "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(190,210,235,.75)'; ctx.fillText('마지막으로 들킨 곳', L.x, L.y + 34);
  }
}
// ---- 프리렌더 캐릭터 (3D 모델을 8방향으로 미리 찍은 시트, Commandos 방식). 색 키 시트 한 장을 역할별 옷 색으로 바꿔 쓴다
const PR = window.__PR || null;
const PR_PAL = {
  ninja: ['#e6b38a', '#141414', '#17191f', '#1f2537', '#0c0c0e'], sam: ['#ddaa80', '#3a2a1c', '#56603c', '#3e3a2c', '#2a241c'], samB: ['#c79470', '#1d1d1d', '#2a3654', '#1d1f26', '#141416'],
  samR: ['#e4b28a', '#0f0f0f', '#121317', '#121317', '#0c0c0c'], hunter: ['#d4a078', '#2b1d12', '#3d4a2e', '#5a4630', '#3a2a1a'], noble: ['#efc49e', '#2b2b2b', '#e6e2d8', '#3a3a44', '#1a1a1a'],
  old: ['#e6bd9a', '#c4c4c4', '#6a2a2a', '#2e2e36', '#3a2e24'], doc: ['#edc6a2', '#4a3a2a', '#f0f0ea', '#8a7f6a', '#4a3a2a'], civ0: ['#efbf98', '#6a4020', '#b84a3a', '#3a4a6a', '#d8d8d4'],
  civ1: ['#c48961', '#1a1a1a', '#d6ae48', '#5a5040', '#3a2a1a'], civ2: ['#e6b68e', '#2a2a2a', '#3a8a8a', '#6a6a72', '#c8c8c0'], civ3: ['#f2caa6', '#7a2a2a', '#d27a9e', '#20222a', '#202020'],
  civ4: ['#e8b890', '#3a2a20', '#2f5a8a', '#2a2a2e', '#e0e0dc'], civ5: ['#d9a47e', '#121212', '#ececec', '#3c4c6c', '#2a2a2a'], civ6: ['#f0c8a4', '#8a5a2a', '#7a3a8a', '#2a2a30', '#1a1a1a'],
  civ7: ['#c99068', '#1a1a1a', '#2a2a2a', '#2a2a2a', '#d0d0c8'], strip: ['#ddaa80', '#2a2a2a', '#d8d4c8', '#4a4a52', '#2a2a2a'], civ8: ['#eabd96', '#5a3a1a', '#c8b48a', '#5a4a3a', '#3a2a1a'], civ9: ['#e2b088', '#202020', '#4a7a4a', '#c8c0b0', '#2a2a2a'],
};
const prImg = PR ? new Image() : null, prVar = {};
let prBase = null;  // {w,h,src:Uint8ClampedArray, cls:Uint8Array, wgt:Float32Array, shd:Float32Array}
if (PR) { prImg.onload = () => { try { prPrep(); } catch (e) { console.warn('PR', e); } }; prImg.src = PR.src; }
function prPrep() {
  const w = prImg.width, h = prImg.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(prImg, 0, 0); const d = x.getImageData(0, 0, w, h).data;
  const n = w * h, cls = new Uint8Array(n), wgt = new Float32Array(n), shd = new Float32Array(n);
  const K = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1]];  // 피부·머리·윗옷·바지·신발
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; if (!d[i * 4 + 3]) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn; if (ch < 20 || !mx) continue;
    const nr = r / mx, ng = g / mx, nb = b / mx; let best = 0, bd = 9;
    for (let k = 0; k < 5; k++) { const q = (nr - K[k][0]) ** 2 + (ng - K[k][1]) ** 2 + (nb - K[k][2]) ** 2; if (q < bd) { bd = q; best = k; } }
    cls[i] = best; wgt[i] = Math.min(1, (ch - 20) / 60); shd[i] = Math.min(1.35, mx / 255 * 1.25);
  }
  prBase = { w, h, src: d, cls, wgt, shd };
}
function prSheet(key) {
  if (!prBase) return null; if (prVar[key]) return prVar[key];
  const pal = PR_PAL[key]; if (!pal) return null;
  const { w, h, src, cls, wgt, shd } = prBase, P4 = pal.map(h => hexRgb(h).split(',').map(Number));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const id = x.createImageData(w, h), o = id.data; o.set(src);
  for (let i = 0, n = w * h; i < n; i++) {
    const wt = wgt[i]; if (!wt) continue; const p = P4[cls[i]], s = shd[i], j = i * 4;
    o[j] = p[0] * s * wt + src[j] * (1 - wt); o[j + 1] = p[1] * s * wt + src[j + 1] * (1 - wt); o[j + 2] = p[2] * s * wt + src[j + 2] * (1 - wt);
  }
  x.putImageData(id, 0, 0);
  // 숨었을 때 쓰는 밝은 외곽선 실루엣 (주인공만)
  if (key === 'ninja') {
    const s = document.createElement('canvas'); s.width = w; s.height = h; const sx = s.getContext('2d');
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) sx.drawImage(c, dx, dy);
    sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#a8e8ff'; sx.fillRect(0, 0, w, h);
    sx.globalCompositeOperation = 'destination-out'; sx.drawImage(c, 0, 0); prVar.ninja_ol = s;
  }
  return (prVar[key] = c);
}
const prDir = a => ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
// anim: idle walk run sneak crouch death punch / t: 경과 시간(초)
function drawPR(key, x, y, a, anim, t, alpha = 1, scale = 1, lift = 0, frame = -1) {
  const sh = prSheet(key); if (!sh) return false;
  const [c0, nf] = PR.anims[anim] || PR.anims.idle, fps = anim === 'run' ? 12.7 : anim === 'sneak' ? 7 : anim === 'walk' ? 9 : anim === 'punch' ? 12 : anim === 'carry' || anim === 'carried' ? 7 : anim === 'grab' || anim === 'held' ? 6 : anim === 'climb' ? 7 : 1.6;
  const fi = frame >= 0 ? Math.min(nf - 1, frame) : Math.floor(t * fps) % nf;
  const fr = PR.fr, dw = fr * scale, gy = PR.groundY * scale;
  ctx.globalAlpha = alpha; ctx.drawImage(sh, (c0 + fi) * fr, prDir(a) * fr, fr, fr, x - dw / 2, y + 13 - gy - lift, dw, dw); ctx.globalAlpha = 1;
  return true;
}
const usePR = key => !!(PR && prBase && (PR_PAL[key] || (key === 'ninja_ol' && prVar.ninja_ol)));
const PAIR = () => !!(PR && PR.anims.carry && PR.anims.held);
const carryKey = c => c && !c.dog && (c.stripped ? 'strip' : c.ch);
const pairCarry = P => P.carrying && PAIR() && usePR(carryKey(P.carrying)) && usePR('ninja');
const pairGrab = P => P.captive && PAIR() && usePR(charOf(P.captive)) && usePR('ninja');
function drawBody(c, lift = 0) {
  if (c.hideT > S.t) return;  // 목 조르는 동안은 주인공과 함께 그린다
  const fr = c.t0 != null && S.t - c.t0 < 1 ? Math.floor((S.t - c.t0) * 10) : 9;  // 쓰러지는 동작
  if (c.stripped && usePR('strip')) { drawPR('strip', c.x, c.y - 6, c.a || 0, 'death', 0, ctx.globalAlpha, 1, lift, 9); return; }
  if (usePR(c.ch)) { drawPR(c.ch, c.x, c.y - 6, c.a || 0, 'death', 0, ctx.globalAlpha, 1, lift, fr); return; }
  blit(ctx, 'dead_' + c.ch, c.x - 24, c.y - 26 - lift, 48, 48);
}
function guardAnim(g) {
  if (g.swingT > 0) return 'punch';
  if (!(g.moving || g.state === 'CAPTIVE')) return g.state === 'PANIC' && g.cowered ? 'crouch' : 'idle';
  return g.state === 'ALERT' || g.state === 'FLEE' || g.state === 'PANIC' ? 'run' : 'walk';
}
function drawChar(key, x, y, a, moving, alpha = 1, scale = 3, attack = false, lift = 0) {
  if (key === 'dog') return drawDog(x, y, a, moving, alpha);
  if (usePR(key)) { drawPR(key, x, y, a, attack ? 'punch' : moving ? 'walk' : 'idle', S.t + (x + y) * 0.013, alpha, scale / 3, lift); return; }
  const d = dirOf(a), row = attack ? 4 : moving ? (Math.floor(S.t * 8 + (x + y) * 0.013) % 4) : 0;
  ctx.globalAlpha = alpha; blit(ctx, 'ch_' + key, x - 8 * scale, y - 11 * scale - lift, 16 * scale, 16 * scale, d * 16, row * 16, 16, 16); ctx.globalAlpha = 1;
}
// 마지막 목격 지점(Mark of the Ninja): 경비가 의심하거나 쫓는 자리에 내 잔상을 남겨, 놈들이 어디를 보는지 알려 준다
function drawMarked() {
  const g = S.marked; if (!g) return; if (g.state === 'DEAD') { S.marked = null; return; }
  if (flOf(g) !== flOf(S.player)) return;
  const pts = g.routeLine ? g.routeLine.concat([g.routeLine[0]]) : null;
  if (pts) { ctx.strokeStyle = 'rgba(255,214,90,.85)'; ctx.lineWidth = 3.5; ctx.setLineDash([10, 6]); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([]); for (const p of g.routeLine) if (p.stop) { ctx.fillStyle = 'rgba(255,214,90,.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill(); } }
  // 시야: 지금 보는 방향의 원뿔 테두리를 진하게
  const rg = guardRanges(g), fov = guardFov(g), R = Math.max(rg.lit, rg.dark);
  ctx.strokeStyle = 'rgba(255,214,90,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(g.x, g.y);
  for (let k = 0; k <= 16; k++) { const a = g.a - fov + (2 * fov) * k / 16; const d = castRay(g.x, g.y, a, R); ctx.lineTo(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d); }
  ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,214,90,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 26, 0, TAU); ctx.stroke();
}
function drawGhosts() {
  drawMarked();
  const P = S.player, pts = [];
  for (const g of S.guards) {
    if (g.civ || g.dog || g.state === 'DEAD' || flOf(g) !== flOf(P)) continue;
    const q = g.state === 'ALERT' ? g.lastSeen : ['SUSPICIOUS', 'SEARCH', 'NOTICE'].includes(g.state) && g.why ? g.poi : null;
    if (!q || pts.some(o => dist(o.x, o.y, q.x, q.y) < 40)) continue;
    pts.push({ x: q.x, y: q.y, hot: g.state === 'ALERT' || g.state === 'NOTICE' });
  }
  for (const q of pts) {
    if (dist(q.x, q.y, P.x, P.y) < 30) continue;
    const pulse = 0.5 + 0.2 * Math.sin(S.t * 4);
    if (usePR('ninja') && prVar.ninja_ol) { drawPR('ninja_ol', q.x, q.y, Math.PI / 2, 'idle', 0, pulse, 1, 0, 0); drawPR('ninja', q.x, q.y, Math.PI / 2, 'idle', 0, 0.18, 1, 0, 0); }
    else { ctx.strokeStyle = `rgba(168,232,255,${pulse})`; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(q.x, q.y, 14, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = q.hot ? 'rgba(232,90,70,.9)' : 'rgba(242,196,107,.9)'; ctx.font = '700 14px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(q.hot ? '!' : '?', q.x, q.y - 40);
  }
}
function drawGuard(g) {
  if (g.state === 'CAPTIVE' && S.player.captive === g && pairGrab(S.player)) return;
  if (g.civ && g.state === 'SLEEP') { drawBody({ ch: charOf(g), x: g.x, y: g.y, a: g.a }); drawEmote('zz', g.x + 16, g.y - 6); return; }
  const k = charOf(g);
  if (g.climb && usePR(k) && PR.anims.climb) {  // 배관·벽을 타는 중
    const c = g.climb;
    if (c.kind === 'stair') { drawPR(k, g.x, g.y, g.a, 'walk', S.t + g.id * 0.37, 0.4 + 0.6 * Math.abs(1 - 2 * Math.min(1, c.t / c.dur))); return; }
    drawPR(k, g.x, g.y, -Math.PI / 2, 'climb', 0, 1, 1, 14, ((Math.floor(c.t * 7) * (c.up ? 1 : -1)) % 4 + 4) % 4); return;
  }
  if (g.z) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(g.x + 4 + g.z * 2, g.y + 6 + g.z * 3, 15, 11, 0, 0, TAU); ctx.fill(); }
  if (usePR(k)) { drawPR(k, g.x, g.y, g.a, guardAnim(g), S.t + g.id * 0.37, 1, 1 + (g.z || 0) * 0.05); return; }
  drawChar(k, g.x, g.y, g.a, g.moving || g.state === 'CAPTIVE', 1, 3, g.swingT > 0);
}
function drawDog(x, y, a, moving, alpha = 1, dead = false) {
  const fr = moving ? Math.floor(S.t * 9) % 2 : 0;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
  if (dead) ctx.rotate(Math.PI / 2);
  if (Math.cos(a) < 0) ctx.scale(-1, 1);
  blit(ctx, 'dog', -24, -32, 48, 48, fr * 16, 0, 16, 16); ctx.restore();
}
const EMOTE = { 'zz': 'em_zz', '?': 'em_q', '!': 'em_ex', '!?': 'em_exq', '...': 'em_dots', '흥': 'em_meh', '잡담…': 'em_chat', '후—': 'em_dots', '하암': 'em_zz', '엽전?': 'em_q', '멍!': 'em_ex' };
function drawEmote(txt, x, y) { const n = EMOTE[txt] || 'em_q'; blit(ctx, n, x - 21, y - 40, 42, 39); }
const roofPats = {};
function roofPattern(name) {
  if (roofPats[name]) return roofPats[name];
  const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  blit(x, name, 0, 0, 48, 48);
  return (roofPats[name] = ctx.createPattern(c, 'repeat'));
}
const GIWA = new Set(['roofRed', 'roofGreen', 'roofSlate']);
// 건물 지붕을 한 장으로 미리 그린다. 조선 테마의 기와는 남쪽·북쪽 비탈 + 용마루 + 막새 끝선 + 들린 처마 끝
function buildRoofCanvas(b, i) {
  const w = (b.x1 - b.x0 + 1) * TILE, h = (b.y1 - b.y0 + 1 - (b.fh || 0)) * TILE, hang = 22;
  const c = document.createElement('canvas'); c.width = w; c.height = h + hang;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const key = roofOf(i);
  if (CITY && F[key] && key.startsWith('cRoof')) {
    // 평지붕 옥상: 난간 9칸 조각 + 물탱크·실외기·빨랫줄·계단실(옥탑)
    const f = F[key], pc = (sx, sy, dx, dy) => x.drawImage(atlas, f[0] + sx, f[1] + sy, 16, 16, dx, dy, 48, 48);
    for (let yy = 48; yy < h - 48; yy += 48) for (let xx = 48; xx < w - 48; xx += 48) pc(16, 16, xx, yy);
    for (let xx = 48; xx < w - 48; xx += 48) { pc(16, 0, xx, 0); pc(16, 32, xx, h - 48); }
    for (let yy = 48; yy < h - 48; yy += 48) { pc(0, 16, 0, yy); pc(32, 16, w - 48, yy); }
    pc(0, 0, 0, 0); pc(32, 0, w - 48, 0); pc(0, 32, 0, h - 48); pc(32, 32, w - 48, h - 48);
    const hs = (((b.x0 * 73856093) ^ (b.y0 * 19349663)) >>> 0);
    // 계단실(옥탑): 건물 안 계단 'Y' 칸 위
    let stair = null;
    for (let ty = b.y0; ty <= b.y1 && !stair; ty++) for (let tx = b.x0; tx <= b.x1; tx++) if (G[ty][tx] === 'Y') { stair = [(tx - b.x0) * TILE, (ty - b.y0) * TILE]; break; }
    // 물탱크 (파란 원통, 위에서 본 모습)
    if (b.h >= 2) {
      const tx = w - 44, ty = 38;
      if (!stair || Math.abs(stair[0] - tx) > 60 || Math.abs(stair[1] - ty) > 60) {
        x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(tx + 5, ty + 6, 19, 19, 0, 0, TAU); x.fill();
        x.fillStyle = hs % 3 === 0 ? '#c9a646' : '#3e78b8'; x.beginPath(); x.arc(tx, ty, 18, 0, TAU); x.fill();
        x.strokeStyle = hs % 3 === 0 ? '#e8cc72' : '#6aa2dc'; x.lineWidth = 3; x.beginPath(); x.arc(tx, ty, 13, 0, TAU); x.stroke();
        x.fillStyle = '#2a3440'; x.beginPath(); x.arc(tx, ty, 6, 0, TAU); x.fill();
      }
    }
    // 실외기 두 대
    for (let k = 0; k < 2; k++) {
      const ax = 34 + k * 34, ay = h - 50;
      if (stair && Math.abs(stair[0] + 24 - ax) < 50 && Math.abs(stair[1] + 24 - ay) < 50) continue;
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ax + 3, ay + 4, 28, 20);
      x.fillStyle = '#c9ccd2'; x.fillRect(ax, ay, 28, 20); x.strokeStyle = '#7d828c'; x.lineWidth = 2; x.strokeRect(ax + 1, ay + 1, 26, 18);
      x.fillStyle = '#4a4f58'; x.beginPath(); x.arc(ax + 10, ay + 10, 7, 0, TAU); x.fill(); x.strokeStyle = '#9aa0aa'; x.lineWidth = 1; x.beginPath(); x.moveTo(ax + 4, ay + 10); x.lineTo(ax + 16, ay + 10); x.moveTo(ax + 10, ay + 4); x.lineTo(ax + 10, ay + 16); x.stroke();
    }
    // 장독대 · 스티로폼 상자 텃밭 (옥상마다 하나)
    const kind = (hs >> 3) % 5, ox = 30, oy = 28;
    if (kind === 0 && !(stair && stair[0] < 140 && stair[1] < 100)) {
      for (let k = 0; k < 5; k++) { const jx = ox + 10 + (k % 3) * 22 + (k > 2 ? 11 : 0), jy = oy + 10 + (k > 2 ? 20 : 0), r = k % 2 ? 8 : 10;
        x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.arc(jx + 3, jy + 4, r, 0, TAU); x.fill();
        x.fillStyle = '#6b3a22'; x.beginPath(); x.arc(jx, jy, r, 0, TAU); x.fill(); x.fillStyle = '#8a4e2e'; x.beginPath(); x.arc(jx - 2, jy - 2, r * 0.55, 0, TAU); x.fill(); x.fillStyle = '#3a2016'; x.beginPath(); x.arc(jx, jy, r * 0.3, 0, TAU); x.fill(); }
    } else if (kind === 1 && !(stair && stair[0] < 140 && stair[1] < 100)) {
      for (let k = 0; k < 3; k++) { const bx2 = ox + 4 + k * 30, by2 = oy + 2;
        x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(bx2 + 3, by2 + 4, 26, 18); x.fillStyle = '#e6e8ea'; x.fillRect(bx2, by2, 26, 18); x.fillStyle = '#5d4a36'; x.fillRect(bx2 + 3, by2 + 3, 20, 12);
        x.fillStyle = '#5fa04e'; for (let q = 0; q < 4; q++) { x.beginPath(); x.arc(bx2 + 7 + (q % 2) * 10, by2 + 7 + (q > 1 ? 5 : 0), 3.5, 0, TAU); x.fill(); } }
    }
    else if (kind === 3 && !(stair && stair[0] < 160 && stair[1] < 110)) {  // 평상 + 돗자리
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ox + 6, oy + 6, 96, 60); x.fillStyle = '#8a6a44'; x.fillRect(ox, oy, 96, 60); x.fillStyle = '#6e5234'; for (let q = 0; q < 96; q += 12) x.fillRect(ox + q, oy, 2, 60);
      x.fillStyle = '#b8443a'; x.fillRect(ox + 14, oy + 10, 50, 36); x.fillStyle = '#d8c070'; for (let q = 0; q < 50; q += 10) x.fillRect(ox + 14 + q, oy + 10, 3, 36);
    } else if (kind === 4 && w >= 200 && !(stair && stair[1] < 110)) {  // 태양광 판
      for (let k = 0; k < 3; k++) { const px2 = ox + k * 42, py2 = oy; x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px2 + 4, py2 + 5, 36, 50); x.fillStyle = '#1f2f4a'; x.fillRect(px2, py2, 36, 50); x.strokeStyle = '#6a86b0'; x.lineWidth = 1; for (let q = 1; q < 3; q++) { x.beginPath(); x.moveTo(px2 + q * 12, py2); x.lineTo(px2 + q * 12, py2 + 50); x.stroke(); } for (let q = 1; q < 4; q++) { x.beginPath(); x.moveTo(px2, py2 + q * 12.5); x.lineTo(px2 + 36, py2 + q * 12.5); x.stroke(); } }
    }
    if (b.church) {  // 옥상 붉은 네온 십자가
      const cx2 = w / 2, cy2 = Math.min(h / 2, 90);
      x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(cx2 - 4, cy2 - 26, 14, 64); x.fillRect(cx2 - 18, cy2 - 8, 42, 14);
      x.fillStyle = 'rgba(255,60,60,.25)'; x.beginPath(); x.arc(cx2, cy2, 44, 0, TAU); x.fill();
      x.fillStyle = '#ff4a4a'; x.fillRect(cx2 - 5, cy2 - 30, 10, 62); x.fillRect(cx2 - 20, cy2 - 12, 40, 10);
      x.fillStyle = '#ffd0d0'; x.fillRect(cx2 - 2, cy2 - 28, 4, 58); x.fillRect(cx2 - 18, cy2 - 9, 36, 4);
    }
    // 빨랫줄
    if (w >= 240 && h >= 144 && hs % 2) {
      const lx0 = 60, lx1 = Math.min(w - 90, 200), ly = h / 2 - 6;
      x.fillStyle = '#6d727c'; x.fillRect(lx0 - 2, ly - 4, 4, 8); x.fillRect(lx1 - 2, ly - 4, 4, 8);
      x.strokeStyle = 'rgba(210,214,220,.8)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(lx0, ly); x.quadraticCurveTo((lx0 + lx1) / 2, ly + 8, lx1, ly); x.stroke();
      const cols = ['#d8d4c8', '#b84a4a', '#5a7ab0', '#e2c25a'];
      for (let c = 0; c < 4; c++) { const cx = lx0 + 18 + c * ((lx1 - lx0 - 36) / 3); x.fillStyle = cols[(c + hs) % 4]; x.fillRect(cx - 7, ly + 2, 14, 12); }
    }
    if (stair) {
      const [sx, sy] = stair;
      x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(sx + 6, sy - 12, 46, 50);
      x.fillStyle = '#b9b3a6'; x.fillRect(sx + 1, sy - 18, 46, 46); x.fillStyle = '#8e887c'; x.fillRect(sx + 1, sy - 18, 46, 8);
      x.fillStyle = '#4f6b8a'; x.fillRect(sx + 15, sy + 8, 18, 20); x.fillStyle = '#e2c25a'; x.fillRect(sx + 28, sy + 17, 2, 3);
      x.strokeStyle = '#5d584f'; x.lineWidth = 2; x.strokeRect(sx + 1, sy - 18, 46, 46);
    }
    c.flat = true;
  } else if (JOSEON && GIWA.has(key) && F.gw_field) {
    const f = F.gw_field, e = F.gw_eave, rd = F.gw_ridge;
    const mid = Math.max(24, Math.round(h * 0.42 / 6) * 6);
    for (let yy = mid; yy < h; yy += 96) for (let xx = 0; xx < w; xx += 48) x.drawImage(atlas, f[0], f[1], 16, 32, xx, yy, 48, 96);
    x.save(); x.translate(0, mid); x.scale(1, -1); for (let yy = 0; yy < mid; yy += 96) for (let xx = 0; xx < w; xx += 48) x.drawImage(atlas, f[0], f[1], 16, 32, xx, yy, 48, 96); x.restore();
    x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 0, w, mid);  // 북쪽 비탈은 그늘
    if (key === 'roofGreen') { x.fillStyle = 'rgba(40,80,110,.2)'; x.fillRect(0, 0, w, h); }
    if (key === 'roofSlate') { x.fillStyle = 'rgba(235,238,245,.1)'; x.fillRect(0, 0, w, h); }
    for (let xx = 0; xx < w; xx += 48) x.drawImage(atlas, e[0], e[1], 16, 20, xx, h - 38, 48, 60);           // 남쪽 막새
    x.save(); x.translate(0, 38); x.scale(1, -1); for (let xx = 0; xx < w; xx += 48) x.drawImage(atlas, e[0], e[1], 16, 20, xx, 0, 48, 60); x.restore();  // 북쪽 막새
    for (let xx = 0; xx < w; xx += 48) x.drawImage(atlas, rd[0], rd[1], 16, 20, xx, mid - 22, 48, 40);     // 용마루
    const cl = F.gw_cornerL, cr = F.gw_cornerR;
    x.drawImage(atlas, cl[0], cl[1], 32, 38, -6, h - 58, 64, 76); x.drawImage(atlas, cr[0], cr[1], 32, 38, w - 58, h - 58, 64, 76);  // 들린 처마 끝
    x.save(); x.translate(0, 58); x.scale(1, -1); x.drawImage(atlas, cl[0], cl[1], 32, 38, -6, -18, 64, 76); x.drawImage(atlas, cr[0], cr[1], 32, 38, w - 58, -18, 64, 76); x.restore();
    c.giwa = true;
  } else {
    x.fillStyle = roofPattern(key); x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(0,0,0,.35)'; if (w >= h) x.fillRect(0, h / 2 - 3, w, 6); else x.fillRect(w / 2 - 3, 0, 6, h);
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, h - 5, w, 5);
  }
  c.rh = h;
  return c;
}
const roofOf = i => STAGE.roofs ? STAGE.roofs[i % STAGE.roofs.length] : (STAGE.roofTex || 'roofRed');
function makeSprite(name, tint) {
  const f = F[name]; const c = document.createElement('canvas'); c.width = f[2]; c.height = f[3];
  const x = c.getContext('2d'); x.drawImage(atlas, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
  if (tint) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = tint; x.fillRect(0, 0, f[2], f[3]); }
  return c;
}

// ---------------------------------------------------------------- 사운드
let AC = null, master = null, muted = false; const SB = {};
function b64ToBuf(d) { const s = atob(d.split(',')[1]); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b.buffer; }
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination);
    for (const k in A.sounds) AC.decodeAudioData(b64ToBuf(A.sounds[k]), buf => { SB[k] = buf; }, () => {});
    const len = AC.sampleRate * 4, nb = AC.createBuffer(1, len, AC.sampleRate), d = nb.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3; }
    const src = AC.createBufferSource(); src.buffer = nb; src.loop = true;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = AC.createGain(); g.gain.value = 0.05; src.connect(lp); lp.connect(g); g.connect(master); src.start();
  } catch (e) { AC = null; }
}
const MB = {}; let musicGain = null, musicSrc = null, musicKey = null;
function setMusic(k) {
  if (!AC || musicKey === k) return;
  if (k.startsWith('n_') && !MB[k]) MB[k] = makeNeonLoop(k);
  if (!MB[k]) { if (A.music && A.music[k] && !MB['_' + k]) { MB['_' + k] = 1; AC.decodeAudioData(b64ToBuf(A.music[k]), b => { MB[k] = b; if (musicKey === '__want_' + k) { musicKey = null; setMusic(k); } }, () => {}); } musicKey = '__want_' + k; return; }
  if (!musicGain) { musicGain = AC.createGain(); musicGain.connect(master); }
  const now = AC.currentTime;
  if (musicSrc) { const old = musicSrc; const og = old._g; og.gain.setTargetAtTime(0, now, 0.4); setTimeout(() => { try { old.stop(); } catch (e) {} }, 2000); }
  const src = AC.createBufferSource(); src.buffer = MB[k]; src.loop = true;
  const g = AC.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(muted ? 0 : (k === 'calm' ? 0.16 : k === 'n_calm' ? 0.08 : k === 'n_tense' ? 0.17 : 0.2), now, k === 'n_fight' ? 0.15 : 0.5);
  src.connect(g); g.connect(musicGain); src._g = g; src.start(); musicSrc = src; musicKey = k;
}
// 도시 음악: 네온 신스 3단계 (평상시 · 의심 · 발각) — 직접 합성, 루프
function makeNeonLoop(kind) {
  const sr = AC.sampleRate, BPM = kind === 'n_calm' ? 72 : kind === 'n_tense' ? 96 : 132, beat = 60 / BPM, bars = 8, len = Math.floor(sr * beat * 4 * bars);
  const buf = AC.createBuffer(2, len, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12), at = b => Math.floor(b * beat * sr);
  const add = (i, l, r) => { i %= len; L[i] += l; R[i] += r == null ? l : r; };
  const saw = ph => 2 * (ph - Math.floor(ph + 0.5)), tri = ph => 1 - 4 * Math.abs(ph - Math.floor(ph + 0.5));
  // 음 하나: 파형, 길이, 볼륨, 저역 통과, 좌우, 엔벨로프(공격·감쇠)
  const note = (b0, durB, m, o) => {
    const f = hz(m), n = Math.floor(durB * beat * sr), s0 = at(b0), A = (o.att || 0.005) * sr, dec = o.dec || 0, cut = o.cut || 4000, pan = o.pan || 0, vol = o.vol || 0.2, det = o.det || 0;
    let y = 0, y2 = 0, ph1 = Math.random(), ph2 = Math.random();
    for (let i = 0; i < n + sr * (o.rel || 0.05); i++) {
      const tt = i / sr, env = Math.min(1, i / A) * (dec ? Math.exp(-tt * dec) : 1) * (i > n ? Math.exp(-(i - n) / sr / (o.rel || 0.05) * 4) : 1);
      ph1 += f * (1 + det) / sr; ph2 += f * (1 - det) / sr;
      let x = o.wave === 'tri' ? tri(ph1) : o.wave === 'sin' ? Math.sin(TAU * ph1) : o.wave === 'sq' ? (ph1 % 1 < 0.5 ? 1 : -1) * 0.6 : (saw(ph1) + saw(ph2)) * 0.5;
      const fc = o.sweep ? cut * (1 + o.sweep * Math.exp(-tt * 10)) : cut, a = 1 - Math.exp(-TAU * fc / sr); y += a * (x - y); y2 += a * (y - y2);
      const v = y2 * env * vol; add(s0 + i, v * (1 - pan) , v * (1 + pan));
    }
  };
  const kick = (b, v = 0.9) => { const s0 = at(b); for (let i = 0; i < sr * 0.32; i++) { const tt = i / sr, ph = TAU * (46 * tt + 120 * (1 - Math.exp(-tt * 30)) / 30); add(s0 + i, Math.sin(ph) * Math.exp(-tt * 9) * v); } };
  const noiseHit = (b, durS, v, hp, pan = 0) => { const s0 = at(b); let pv = 0, y = 0; for (let i = 0; i < sr * durS; i++) { const n = Math.random() * 2 - 1, h = hp ? n - pv : n; pv = n; y += 0.5 * (h - y); const e = v * Math.exp(-i / sr / durS * 5); add(s0 + i, (hp ? h : y) * e * (1 - pan), (hp ? h : y) * e * (1 + pan)); } };
  const delay = (sec, fb, mix) => { const d = Math.floor(sec * sr); for (let i = 0; i < len; i++) { const j = (i + d) % len; L[j] += R[i] * fb * mix; R[j] += L[i] * fb * mix; } };
  const B = bars * 4;
  if (kind === 'n_calm') {
    const prog = [[45, 57, 60, 64], [41, 57, 60, 64], [38, 57, 60, 65], [40, 55, 59, 64]];
    for (let c = 0; c < 4; c++) { const ch = prog[c], b0 = c * 8;
      for (const m of ch.slice(1)) note(b0, 8, m, { att: 1.6, rel: 1.2, cut: 600, vol: 0.07, det: 0.004, pan: (m % 3 - 1) * 0.4 });
      note(b0, 8, ch[0] - 12, { wave: 'sin', att: 0.4, rel: 0.6, cut: 300, vol: 0.32 });
      const arp = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12, ch[1] + 24, ch[3] + 12];
      for (let k = 0; k < 5; k++) note(b0 + k * 1.5 + 0.5, 0.4, arp[k % arp.length], { wave: 'tri', dec: 5, cut: 3200, vol: 0.11, pan: k % 2 ? 0.5 : -0.5, rel: 0.2 });
    }
    for (let b = 0; b < B; b += 2) noiseHit(b + 1, 0.05, 0.03, true, 0.3);
    delay(beat * 0.75, 0.5, 0.55);
  } else if (kind === 'n_tense') {
    for (let c = 0; c < 2; c++) note(c * 16, 16, 33, { att: 2, rel: 1, cut: 260, vol: 0.28, det: 0.006 });
    const pat = [45, 45, 57, 45, 48, 45, 57, 51];
    for (let k = 0; k < B * 4; k++) { const m = pat[k % 8] + (k >= B * 2 ? 1 : 0) * (k % 16 > 11 ? -2 : 0); note(k / 4, 0.2, m, { wave: 'sq', dec: 14, cut: 500 + 1400 * ((k % 64) / 64), vol: 0.09, pan: k % 2 ? 0.25 : -0.25, rel: 0.03 }); }
    for (let k = 0; k < B * 4; k++) noiseHit(k / 4, 0.03, k % 4 === 2 ? 0.07 : 0.035, true, 0.4);
    for (let b = 0; b < B; b += 4) { kick(b, 0.55); kick(b + 0.75, 0.35); }
    for (let c = 0; c < 4; c++) for (const m of [57, 60, 63]) note(c * 8 + 6, 2, m, { att: 0.6, rel: 0.6, cut: 1200, vol: 0.05, det: 0.008 });
    delay(beat * 0.5, 0.35, 0.4);
  } else {
    for (let b = 0; b < B; b++) kick(b, 0.85);
    for (let b = 1; b < B; b += 2) { noiseHit(b, 0.16, 0.32, false); note(b, 0.1, 50, { wave: 'sin', dec: 30, vol: 0.25 }); }
    for (let k = 0; k < B * 2; k++) noiseHit(k / 2 + 0.25, 0.04, 0.08, true, 0.3);
    const bass = [45, 45, 45, 57, 43, 43, 55, 43, 41, 41, 53, 41, 40, 40, 52, 47];
    for (let k = 0; k < B * 2; k++) note(k / 2, 0.42, bass[Math.floor(k / 2) % 16] - 12, { cut: 700, sweep: 2, vol: 0.2, det: 0.005 });
    const lead = [69, 72, 76, 74, 72, 71, 67, 69];
    for (let bar = 0; bar < bars; bar++) { note(bar * 4 + 2.5, 0.35, lead[bar], { wave: 'sq', dec: 6, cut: 2600, vol: 0.08, pan: 0.3 }); note(bar * 4 + 3, 0.35, lead[bar] - 5, { wave: 'sq', dec: 6, cut: 2600, vol: 0.07, pan: -0.3 }); }
    delay(beat * 0.75, 0.25, 0.3);
  }
  let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); const nm = 0.9 / (pk || 1); for (let i = 0; i < len; i++) { L[i] *= nm; R[i] *= nm; }
  return buf;
}
function prepNeonMusic() { if (!AC || !CITY) return; ['n_calm', 'n_tense', 'n_fight'].forEach((k, i) => setTimeout(() => { if (!MB[k]) MB[k] = makeNeonLoop(k); }, 60 + i * 400)); }
// 클럽 음악: 124BPM 4박 킥 + 오프비트 하이햇 + 베이스 + 화음 (직접 합성, 2마디 반복)
const CLUB_BPM = 124; let club = null;
function makeClubLoop() {
  const sr = AC.sampleRate, beat = 60 / CLUB_BPM, len = Math.floor(sr * beat * 8), buf = AC.createBuffer(2, len, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const add = (i, l, r) => { if (i >= 0 && i < len) { L[i] += l; R[i] += r == null ? l : r; } };
  for (let b = 0; b < 8; b++) { const s0 = Math.floor(b * beat * sr); for (let i = 0; i < sr * 0.3; i++) { const t = i / sr, ph = 2 * Math.PI * (48 * t + 110 * (1 - Math.exp(-t * 28)) / 28); add(s0 + i, Math.sin(ph) * Math.exp(-t * 8) * 0.95); } }
  let pv = 0; for (let b = 0; b < 8; b++) { const s0 = Math.floor((b + 0.5) * beat * sr); for (let i = 0; i < sr * 0.09; i++) { const n = Math.random() * 2 - 1, hp = n - pv; pv = n; const e = 0.16 * Math.exp(-i / sr * 38); add(s0 + i, hp * e * 0.8, hp * e); } }
  for (let b = 0; b < 8; b++) if (b % 2) { const s0 = Math.floor(b * beat * sr); for (let i = 0; i < sr * 0.12; i++) { const n = Math.random() * 2 - 1; add(s0 + i, n * 0.22 * Math.exp(-i / sr * 22)); } }  // 클랩
  const bass = [45, 0, 45, 57, 45, 0, 48, 50, 45, 0, 45, 57, 52, 0, 50, 48];
  for (let k = 0; k < 16; k++) { const m = bass[k]; if (!m) continue; const f = 440 * Math.pow(2, (m - 69) / 12), s0 = Math.floor(k * beat / 2 * sr); let y = 0; for (let i = 0; i < sr * beat / 2 * 0.85; i++) { const t = i / sr, saw = 2 * ((t * f) % 1) - 1; y += (saw - y) * 0.06; const duck = 0.35 + 0.65 * Math.min(1, ((i / sr + (k % 2) * beat / 2) % beat) / (beat * 0.35)); add(s0 + i, y * 0.5 * Math.min(1, i / 120) * duck); } }
  const chord = [57, 60, 64]; for (let bar = 0; bar < 2; bar++) for (const off of [1.5, 3.5]) { const s0 = Math.floor((bar * 4 + off) * beat * sr); for (const m of chord) { const f = 440 * Math.pow(2, (m - 69) / 12); for (let i = 0; i < sr * 0.18; i++) { const t = i / sr; add(s0 + i, (2 * ((t * f) % 1) - 1) * 0.045 * Math.exp(-t * 14), (2 * ((t * f * 1.003) % 1) - 1) * 0.045 * Math.exp(-t * 14)); } } }
  let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); const nm = 0.9 / (pk || 1); for (let i = 0; i < len; i++) { L[i] *= nm; R[i] *= nm; }
  return buf;
}
function updateClubMusic() {
  if (!AC || !S) return;
  const zones = CROWD.filter(c => c.club); if (!zones.length) { if (club) { club.g.gain.setTargetAtTime(0, AC.currentTime, 0.3); } return; }
  if (!club) { const src = AC.createBufferSource(); src.buffer = makeClubLoop(); src.loop = true; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; const g = AC.createGain(); g.gain.value = 0; src.connect(lp); lp.connect(g); g.connect(master); src.start(); club = { src, lp, g, t0: AC.currentTime }; }
  const P = S.player, fl = flOf(P); let vol = 0, open = false;
  for (const c of zones) {
    const inside = c.fl === fl && P.x >= c.x0 * TILE && P.x < (c.x1 + 1) * TILE && P.y >= (c.y0 - 1) * TILE && P.y < (c.y1 + 1) * TILE;
    if (inside) { vol = 0.55; open = true; hint('loud', '클럽 안: 음악이 커서 내 발소리·격투 소리가 35%만 퍼진다(분홍 음파). 클럽 건물 근처 바깥은 60%. 손님 사이에 섞이면 눈에도 덜 띈다'); break; }
    const B = BLD[c.b], cx = (B.x0 + B.x1 + 1) / 2 * TILE, cy = (B.y0 + B.y1 + 1) / 2 * TILE, d = dist(P.x, P.y, cx, cy);
    vol = Math.max(vol, clamp(1 - d / 900, 0, 1) * (bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) === c.b ? 0.4 : 0.28));
  }
  const now = AC.currentTime; club.g.gain.setTargetAtTime(muted || S.over ? 0 : vol, now, 0.25); club.lp.frequency.setTargetAtTime(open ? 16000 : 380, now, 0.25);
}
const clubBeat = () => club && AC ? ((AC.currentTime - club.t0) * CLUB_BPM / 60) % 1 : (S.t * CLUB_BPM / 60) % 1;
// 클럽 안: 박자에 맞춰 퍼지는 음파 (내 발소리가 묻히는 곳)
function drawLoud(fl) {
  const b = clubBeat();
  for (const c of CROWD) { if (!c.club || c.fl !== fl) continue;
    const cx = (c.x0 + c.x1 + 1) / 2 * TILE, cy = (c.y0 + c.y1 + 1) / 2 * TILE, rr = Math.max(c.x1 - c.x0, c.y1 - c.y0) * TILE * 0.6;
    for (let k = 0; k < 2; k++) { const f = (b + k * 0.5) % 1; ctx.strokeStyle = `rgba(255,90,200,${0.45 * (1 - f)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 20 + rr * f, 0, TAU); ctx.stroke(); }
  }
}
function play(name, vol = 0.6, rate = 1) {
  if (!AC || muted || !SB[name]) return;
  const s = AC.createBufferSource(); s.buffer = SB[name]; s.playbackRate.value = rate * rnd(0.94, 1.06);
  const g = AC.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start();
}

// ---------------------------------------------------------------- 기록
const RANKS = ['소란꾼', '침입자', '암살자', '그림자'];
// 임무별 도전과제 (Hitman식): 깨면 별 하나 + 과제마다 별 하나. 모은 별로 다른 진입로가 열린다
const CH = {
  ghost: ['한 번도 들키지 않기', () => S.stats.detected === 0],
  clean: ['표적 말고는 아무도 죽이지 않기', () => S.stats.extraKills === 0],
  nobody: ['시체가 한 번도 발견되지 않기', () => S.stats.bodies === 0],
  accident: ['표적을 모두 사고로 처리', () => S.corpses.filter(c => c.target).length > 0 && S.corpses.filter(c => c.target).every(c => c.accident)],
  nokey: ['카드·비번 없이 깨기', () => !S.stats.keyDoors],
  vent: ['환풍구를 한 번 이상 쓰기', () => (S.stats.vents || 0) > 0],
  intel: ['엿듣기나 쪽지로 정보 얻기', () => (S.learned || []).length > 0],
  nolure: ['던지는 도구 안 쓰기', () => S.stats.stonesUsed === 0 && S.stats.kunaiUsed === 0],
  fast: ['빨리 깨기', () => S.t < (STAGE.fastT || 240)],
  disguise: ['변장한 채로 표적 처치', () => !!S.stats.disguiseKill],
  noalarm: ['경보를 한 번도 울리지 않기', () => S.stats.alarms === 0]
};
const chName = id => id === 'fast' ? `${Math.round((STAGE.fastT || 240) / 60)}분 안에 깨기` : (CH[id] || ['?'])[0];
function loadCh() { try { return JSON.parse(localStorage.getItem('yahaeng.ch') || '{}') || {}; } catch (e) { return {}; } }
function saveCh(o) { try { localStorage.setItem('yahaeng.ch', JSON.stringify(o)); } catch (e) {} }
// 별점 해금 장비 (도시): 모든 의뢰의 별을 합친 수로 열린다
const PERKS = [[3, 'pick', '락픽 +1'], [6, 'dart', '다트 +1'], [9, 'sole', '고무 밑창 — 걷는 소리 25% 작게'], [12, 'can', '빈 캔 +2'], [16, 'reach', '긴 팔 — 끌어당기기·달려들기 거리 +20%'], [20, 'shadow', '그림자 걸음 — 웅크려 걷기 20% 빠르게']];
const totalStars = () => STAGES.reduce((n, s) => n + (s.challenges ? starsOf(s) : 0), 0);
const perkOn = k => !!(S && S.perks && S.perks[k]);
function applyPerks() {
  S.perks = {}; if (!CITY) return; const n = totalStars(); S.stars0 = n; for (const [need, k] of PERKS) if (n >= need) S.perks[k] = true;
  const P = S.player; if (S.perks.pick) P.picks++; if (S.perks.dart) P.kunai++; if (S.perks.can) P.stones += 2;
}
function starsOf(st) { const c = loadCh()[st.id] || {}; return (c._clear ? 1 : 0) + (st.challenges || []).filter(id => c[id]).length; }
function loadBest() { try { return JSON.parse(localStorage.getItem('yahaeng.best') || '{}') || {}; } catch (e) { return {}; } }
function saveBest(id, rank) {
  const b = loadBest(); if (b[id] && RANKS.indexOf(b[id]) >= RANKS.indexOf(rank)) return;
  b[id] = rank; try { localStorage.setItem('yahaeng.best', JSON.stringify(b)); } catch (e) {}
}

// ---------------------------------------------------------------- 상태
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const darkC = document.createElement('canvas'); const dctx = darkC.getContext('2d');
let mapC = null, ugC = null, ventC = null, S_ugC = null, stripePat = {};
let W = 0, H = 0, DPR = 1, SCALE = 1, BASE_SCALE = 1;
let userZoom = 0.8, showRoutes = true, tactical = false, showOpps = true;
try { if (localStorage.getItem('yahaeng.opps') === '0') showOpps = false; } catch (e) {}
try { const z = parseFloat(localStorage.getItem('yahaeng.zoom')); if (z > 0.4 && z < 1.6) userZoom = z; const r = localStorage.getItem('yahaeng.routes'); if (r === '0') showRoutes = false; } catch (e) {}
let cam = { x: 0, y: 0 };
let S = null;
let running = false, paused = false;

// 의뢰 변형 (깬 의뢰에만): 같은 지도를 다른 조건으로 다시 (히트맨 에스컬레이션 방식)
const MODS = { reinf: ['순찰 증원', '순찰 경비가 둘 늘어난다 (반대 방향으로 돈다)'], timer: ['제한 시간', '6분 안에 끝내야 한다'], bright: ['환한 밤', '어둠 속에서도 경비가 1.5배 멀리 본다'], bare: ['맨손', '락픽·빈 캔·다트 없이 시작한다'] };
let MOD = ''; try { const m = localStorage.getItem('yahaeng.mod'); if (MODS[m]) MOD = m; } catch (e) {}
const stageCleared = st => !!(loadCh()[st.id] || {})._clear;
function newGame(si) {
  STAGE_I = si; STAGE = STAGES[si]; CP = null;
  const modNow = CITY && MOD && !STAGE.tutorial && stageCleared(STAGE) ? MOD : '';
  pickAlts(STAGE);
  buildMap(STAGE); setLayer(0); buildFRM(false);
  const lamps = STAGE.lamps.concat(AUTO_LAMPS).map(l => ({ x: tc(l[0]), y: tc(l[1]), r: l[2], outdoor: !!l[3], poly: null, broken: false, fl: l[4] || 0, col: l[5] || null }));
  // 도시: 전봇대마다 보안등 (셋 중 하나는 고장 나 꺼져 있다 — 어두운 틈)
  if (CITY) POLES.forEach(([px, py], i) => { if ((px * 7 + py * 3) % 3 === 2) return; const oy = !SOLID.has(G0[py + 1] && G0[py + 1][px]) ? 0.55 : -0.55; lamps.push({ x: tc(px), y: tc(py) + oy * TILE, r: 170, outdoor: true, poly: null, broken: false, fl: 0, pole: true, flk: (px + py) % 4 === 0 ? { f: 2.3 + (px % 3), p: py } : null }); });
  if (CITY && STAGE.neon) lamps.forEach((l, i) => { if (l.outdoor && l.col && i % 3 === 1) l.flk = { f: 3.1 + (i % 4), p: i }; });
  // 아궁이(벽난로): 방을 밝히는 불. 지붕의 굴뚝과 이어진다
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (G[ty][tx] === 'Q' || G[ty][tx] === 'q') lamps.push({ x: tc(tx), y: tc(ty), r: 135, outdoor: false, poly: null, broken: false, hearth: true, cold: G[ty][tx] === 'q', off: G[ty][tx] === 'q', tx, ty });
  lamps.forEach(l => { setLayer(l.fl); l.poly = []; for (let i = 0; i < 180; i++) { const a = i / 180 * TAU; const d = Math.min(l.r, castRay(l.x, l.y, a, l.r) + 20); l.poly.push(l.x + Math.cos(a) * d, l.y + Math.sin(a) * d); } }); setLayer(0);
  // 군중: 클럽 안(층마다)과 지정한 바깥 자리. 사람들이 돌아다니고, 그 사이에 섞이면 잘 안 보이고 소리도 묻힌다
  CROWD = [];
  PLANS.forEach((fls, bi) => (fls || []).forEach((p, f) => { if (p && p.store && (p.store.use === 'club' || p.store.use === 'vip')) CROWD.push({ x0: p.store.x0, y0: p.store.y0 + 1, x1: p.store.x1, y1: p.store.y1, fl: f, n: p.store.use === 'vip' ? 5 : 7, club: true, b: bi }); }));
  (STAGE.crowd || []).forEach(c => CROWD.push({ x0: c[0], y0: c[1], x1: c[2], y1: c[3], fl: c[4] || 0, n: c[5] || 5 }));
  const crowdGuys = []; CROWD.forEach((c, ci) => { const g = c.fl ? GF[c.fl] : G0; for (let k = 0; k < c.n; k++) { for (let t = 0; t < 30; t++) { const h = ((ci * 7919) ^ (k * 104729) ^ (t * 1299709)) >>> 0, x = c.x0 + h % (c.x1 - c.x0 + 1), y = c.y0 + (h >> 8) % (c.y1 - c.y0 + 1); if (!SOLID.has(g[y][x]) && g[y][x] !== 'Y') { crowdGuys.push({ kind: 'civ', look: (h >> 4) % 4, fl: c.fl, at: [x, y], post: ((h >> 6) % 4) * 90, wander: [c.x0, c.y0, c.x1, c.y1], club: true }); break; } } } });
  STAGE._g = STAGE.guards.map(resolveGuard).concat(autoResidents(), crowdGuys);
  STAGE._items = (STAGE.items || []).map(p => Array.isArray(p) ? p : (q => [q[0], q[1], p.fl || 0, p.b])(planPt(p.b, p.fl || 0, p.at || 'bed')));
  const guards = STAGE._g.map((d, i) => makeGuard(d, i));
  if (modNow === 'reinf') STAGE._g.filter(d => d.route && d.route.length > 1 && d.kind !== 'civ' && d.kind !== 'dog' && !d.target).slice(0, 2).forEach(d => { const g = makeGuard(Object.assign({}, d, { route: d.route.slice().reverse(), key: null }), guards.length); g.reinf = true; guards.push(g); });
  guards.forEach(g => { setLayer(g.fl); buildRouteLine(g); if (g.civ && g.sleep) g.state = 'SLEEP'; }); setLayer(0);
  if (CITY) guards.forEach(g => { if (!g.civ && !g.dog && !g.target && !g.elite && g.id % 2 === 0) g.torch = true; });  // 경비 절반은 손전등
  // 주민의 '집': 자기 세대(거실·방·욕실) 칸 범위. 계단실·가게·클럽 같은 공용 공간은 집이 아니다
  guards.forEach(g => {
    if (!g.civ || g.club) return; const tx = Math.floor(g.x / TILE), ty = Math.floor(g.y / TILE), bi = bldAt(tx, ty), p = bi >= 0 && PLANS[bi] && PLANS[bi][g.fl]; if (!p) return;
    for (const u of p.units) { const rs = [u.living, u.bath, ...u.rooms].filter(Boolean); const bx = { x0: Math.min(...rs.map(r => r.x0)), y0: Math.min(...rs.map(r => r.y0)), x1: Math.max(...rs.map(r => r.x1)), y1: Math.max(...rs.map(r => r.y1)) };
      if (tx >= bx.x0 && tx <= bx.x1 && ty >= bx.y0 && ty <= bx.y1) { g.home = Object.assign({ b: bi, fl: g.fl }, bx); break; } }
  });
  const hides = [], ladders = [];
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    if (G[ty][tx] === 'H') hides.push({ type: 'box', tx, ty, x: tc(tx), y: tc(ty), bodies: 0, cap: 2 });
    if (G[ty][tx] === 'W') hides.push({ type: 'well', tx, ty, x: tc(tx), y: tc(ty), bodies: 0, cap: 99 });
    if (G[ty][tx] === 'L') {
      const o = N8.slice(0, 4).find(o => roofAt(tx + o[0], ty + o[1])) || N8.find(o => roofAt(tx + o[0], ty + o[1]));
      if (o) ladders.push({ kind: 'ladder', bx: tx, by: ty, bz: 0, tx: tx + o[0], ty: ty + o[1], tz: lvAt(tx + o[0], ty + o[1]) });
    }
  }
  PIPES.forEach(([px, py]) => {
    const tz = lvAt(px, py);
    for (const o of N8.slice(0, 4)) {
      const bx = px + o[0], by = py + o[1], bl = lvAt(bx, by);
      if (bl < tz && (bl > 0 || !solidAt(bx, by))) { ladders.push({ kind: 'pipe', bx, by, bz: bl, tx: px, ty: py, tz }); break; }
    }
  });
  ladders.forEach(l => { l.x = tc(l.bx); l.y = tc(l.by); l.ux = tc(l.tx); l.uy = tc(l.ty); });
  // 실내 가구 은신처: 옷장 · 침대 밑 · 사물함 (층마다)
  FURN.forEach(it => { const t = it.t === 'cbed' ? 'bed' : it.t; if (!FURN_HIDE[t]) return; hides.push({ type: t, furn: true, tx: it.x, ty: it.y, x: (it.x + it.w / 2) * TILE, y: (it.y + it.h / 2) * TILE, fl: it.fl || 0, bodies: 0, cap: 1 }); });
  S_ugC = null;
  const wells = hides.filter(h => h.type === 'well');
  wells.forEach((w, i) => { w.next = wells.length > 1 ? wells[(i + 1) % wells.length] : null; });
  buildSewers(wells);
  // 실내 계단: 건물 안 'Y' 칸에서 그 건물 옥상으로
  // 층계: 1층 → 2층 → … → 꼭대기 층 → 옥상 (같은 칸)
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (G[ty][tx] === 'Y' && lvAt(tx, ty) > 0) {
    const top = lvAt(tx, ty);
    let f = 0; for (; f < top - 1 && GF[f + 1] && GF[f + 1][ty][tx] === 'Y'; f++) ladders.push({ kind: 'fstair', bx: tx, by: ty, bz: 0, bfl: f, tfl: f + 1, tx, ty, tz: 0, x: tc(tx), y: tc(ty), ux: tc(tx), uy: tc(ty) });
    ladders.push({ kind: 'stair', bx: tx, by: ty, bz: 0, bfl: f, tx, ty, tz: top, x: tc(tx), y: tc(ty), ux: tc(tx), uy: tc(ty) });
  }
  // 굴뚝: 지붕 위 굴뚝(아궁이 칸 바로 위) ↔ 아궁이 앞 바닥
  lamps.filter(l => l.hearth).forEach(l => {
    const tz = lvAt(l.tx, l.ty), b = bldAt(l.tx, l.ty); if (!tz || b < 0) return;
    const o = N8.find(o => !solidAt(l.tx + o[0], l.ty + o[1]) && bldAt(l.tx + o[0], l.ty + o[1]) === b); if (!o) return;
    ladders.push({ kind: 'chimney', lamp: l, bx: l.tx + o[0], by: l.ty + o[1], bz: 0, tx: l.tx, ty: l.ty, tz, x: tc(l.tx + o[0]), y: tc(l.ty + o[1]), ux: l.x, uy: l.y });
  });
  // 환풍구: 같은 무리의 창살끼리 덕트로 잇는다 ('r' = 지붕 환기구, 없으면 방 천장 창살)
  VG = new Uint8Array(MW * MH); const vents = [];
  const VSPEC = (STAGE.vents || []).concat(CITY ? (STAGE.ventB || []).map(sp => autoVents(typeof sp === 'number' ? { b: sp } : sp, hides, ladders, lamps)).filter(Boolean) : []);
  VSPEC.forEach((grp, gi) => {
    const vs = grp.map(([tx, ty, k]) => ({ tx, ty, x: tc(tx), y: tc(ty), roof: k === 'r', street: k === 's', z: k === 'r' ? lvAt(tx, ty) : 0, group: gi, open: false }));
    carveNet(VG, vs); vents.push(...vs);
  });
  S = {
    t: 0, lamps, lightsOn: true, guards, corpses: [], decals: [], noises: [], stones: [], kunais: [], toasts: [], hides, ladders,
    items: STAGE._items.map(p => ({ b: p[3], x: tc(p[0]), y: tc(p[1]), got: false, fl: p[2] || 0 })),
    player: { x: tc(STAGE.start[0]), y: tc(STAGE.start[1]), z: 0, under: false, coins: D().coins, picks: CITY ? D().picks : 0, jump: null, hasKey: false, keys: {}, hp: D().hp, hpMax: D().hp, hurtT: 0, a: STAGE.startA != null ? STAGE.startA : -Math.PI / 2, mode: 'walk', carrying: null, stones: D().stones, kunai: Math.max(1, (STAGE.kunai || 3) + D().kunaiAdd), hidden: false, light: 0, stepT: 0, strikeT: 0, moving: false, hide: null },
    rollT: D().roll, rollWarn: false, timeLeft: STAGE.timeLimit ? STAGE.timeLimit * D().time : 0,
    alevel: 0, alevelT: 0, unseenT: 0, lures: [], reinforced: false, fx: [], keyDrop: null, fuseGuard: null, fuseT: 0, fleeing: false, windows: [],
    stats: { kills: 0, extraKills: 0, bodies: 0, detected: 0, stonesUsed: 0, kunaiUsed: 0, alarms: 0, stashed: 0, special: 0 },
    over: false, hints: {}, keys: {}, exitOpen: false, vents
  };
  S.exit = { x: tc(STAGE.exit[0]), y: STAGE.exit[1] * TILE + TILE / 2, r: 70 };
  S.mod = modNow; applyPerks(); if (STAGE.tutorial) S.cpWant = true;
  if (S.mod === 'timer') S.timeLeft = 360 * D().time;
  if (S.mod === 'bare') { S.player.picks = 0; S.player.stones = 0; S.player.kunai = 0; }
  trapsInit(); S.intel = []; S.learned = []; S.shiftI = 0; S.shiftT = STAGE.shift ? STAGE.shift.first || STAGE.shift.every : 0;
  // 전봇대와 전깃줄: 줄 끝은 전봇대 꼭대기 또는 옥상 가장자리
  S.poles = POLES.map(([tx, ty, z]) => ({ tx, ty, x: tc(tx), y: tc(ty), z, top: 26 + z * 10 }));
  // 인입선: [전봇대 x, y, 층] → 그 전봇대에서 가장 가까운, 그 층 정면 창문으로
  const drops = [];
  (STAGE.drops || []).forEach(([px, py, f]) => {
    if (!GF[f]) return; let best = null, bd = 1e9;
    BLD.forEach(b => { if (b.h <= f || b.y1 >= py || py - b.y1 > 4) return; for (let x = b.x0 + 1; x < b.x1; x++) if (GF[f][b.y1][x] === 'N') { const d = Math.abs(x - px) * 1.3 + (py - b.y1); if (d < bd && !drops.some(w => w[1][0] === x && w[1][1] === b.y1 && (CITY || w[1][2] === f))) { bd = d; best = [x, b.y1]; } } });
    if (best) drops.push(CITY ? [[px, py], [best[0], best[1]]] : [[px, py], [best[0], best[1], f]]);  // 도시: 인입선은 창문이 아니라 옥상 난간 밑 벽에 붙는다
  });
  S.wires = (STAGE.wires || []).concat(drops).map(([p, q]) => {
    const node = ([tx, ty, f]) => { if (f != null) return { win: true, fl: f, b: bldAt(tx, ty), tx, ty, x: tc(tx), y: (ty + 1) * TILE + 10, z: f, dx: tc(tx), dy: (ty - f) * TILE + 22 }; const pole = S.poles.find(o => o.tx === tx && o.ty === ty); return pole ? { x: pole.x, y: pole.y, z: pole.z, pole, dx: pole.x, dy: pole.y - pole.top + 3 } : { x: tc(tx), y: tc(ty), z: lvAt(tx, ty), roof: true, tx, ty, dx: tc(tx), dy: tc(ty) - 4 }; };
    const a = node(p), b = node(q), L = Math.hypot(b.dx - a.dx, b.dy - a.dy);
    return { a, b, L, sag: Math.min(24, L * 0.07) };
  });
  S.poles.forEach(o => { o.wires = S.wires.filter(w => w.a.pole === o || w.b.pole === o); });
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (G[ty][tx] === 'N') S.windows.push({ tx, ty, x: tc(tx), y: tc(ty) });
  S.fwindows = []; for (let f = 1; f < GF.length; f++) for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (GF[f][ty][tx] === 'N') S.fwindows.push({ tx, ty, x: tc(tx), y: tc(ty), fl: f });
  // 읽을 수 있는 쪽지·장부: { b, fl, at, title, lines }
  S.notes = (STAGE.notes || []).map(n => { const q = n.pos || planPt(n.b, n.fl || 0, n.at || 'bed'); return { x: tc(q[0]), y: tc(q[1]), fl: n.fl || 0, title: n.title, lines: n.lines, key: n.key, gives: n.gives, learn: n.learn, read: false }; });
  // 옆 건물 같은 층 창문과 마주 보면 건너뛸 수 있다 (틈 1~3칸)
  S.fwindows.forEach(w => {
    const A = bldAt(w.tx, w.ty); if (A < 0) return; const dir = w.tx === BLD[A].x0 ? -1 : w.tx === BLD[A].x1 ? 1 : 0; if (!dir) return;
    for (let n = 2; n <= 4; n++) { const t2 = w.tx + dir * n; if (!inMap(t2, w.ty)) break; const B = bldAt(t2, w.ty); if (B === A) break; if (B >= 0) { if (GF[w.fl][w.ty][t2] === 'N' && !SOLID.has(GF[w.fl][w.ty][t2 + dir])) w.link = { tx: t2, ty: w.ty, dir, b: B }; break; } }
  });
  // 문: 건물 테두리의 바닥 칸, 또는 양옆이 벽인 건물 안 바닥 칸
  S.doors = [];
  const wallish = v => v === '#' || v === 'N' || v === 'S';
  BLD.forEach(b => {
    if (b.piloti) return;  // 필로티 주차장 입구는 문이 아니다
    for (let ty = b.y0; ty <= b.y1; ty++) for (let tx = b.x0; tx <= b.x1; tx++) {
      const ch = G[ty][tx]; if (SOLID.has(ch)) continue;
      const border = tx === b.x0 || tx === b.x1 || ty === b.y0 || ty === b.y1;
      const lr = wallish(G[ty][tx - 1]) && wallish(G[ty][tx + 1]), ud = wallish((G[ty - 1] || [])[tx]) && wallish((G[ty + 1] || [])[tx]);
      if (!border && !lr && !ud) continue;
      if (S.doors.some(d => d.tx === tx && d.ty === ty)) continue;
      const horiz = (border && (ty === b.y0 || ty === b.y1)) || (!border && lr);
      S.doors.push({ tx, ty, x: tc(tx), y: tc(ty), orig: ch, locked: false, horiz });
    }
  });
  S.doors.forEach(d => { d.group = S.doors.filter(o => Math.abs(o.tx - d.tx) + Math.abs(o.ty - d.ty) <= 1 && o.horiz === d.horiz); });
  // 빗장 쪽문: 담장에 난 문. open 쪽(n·s·e·w)에서만 풀 수 있다
  (STAGE.gates || []).forEach(gt => { const [tx, ty] = gt.at; const horiz = G[ty][tx - 1] === '#' || G[ty][tx + 1] === '#'; const d = { tx, ty, x: tc(tx), y: tc(ty), orig: G[ty][tx] === 'X' ? '.' : G[ty][tx], locked: false, horiz, gate: gt.open }; d.group = [d]; S.doors.push(d); setDoor(d, true); });
  (STAGE.keyBld || []).forEach(bi => { const b = BLD[bi]; const d = S.doors.find(d => d.ty === b.y1 && d.tx > b.x0 && d.tx < b.x1); if (d) { d.group.forEach(t => t.keyLock = 'gold'); setDoor(d, true); } });
  (STAGE.keyDoors || []).forEach(([kx, ky]) => { const d = S.doors.find(d => d.tx === kx && d.ty === ky); if (d) { d.group.forEach(t => t.keyLock = 'gold'); setDoor(d, true); } });
  // 색 잠금: { b, door: 'front'|'back'|'vip'|'vipBack'|'vault', key } 또는 { at: [x, y], key }
  (STAGE.locks || []).forEach(L => {
    const pts = []; const b = BLD[L.b], p = b && (PLANS[L.b] || [])[0];
    if (L.at) pts.push(L.at);
    else if (L.door === 'front') S.doors.filter(d => d.ty === b.y1 && d.tx >= b.x0 && d.tx <= b.x1).forEach(d => pts.push([d.tx, d.ty]));
    else if (L.door === 'back') S.doors.filter(d => d.ty === b.y0 && d.tx >= b.x0 && d.tx <= b.x1).forEach(d => pts.push([d.tx, d.ty]));
    else if (p && L.door === 'vip' && p.vip) pts.push(p.vip.door); else if (p && L.door === 'vipBack' && p.vip) pts.push(p.vip.back); else if (p && L.door === 'vault' && p.vault) pts.push(p.vault.door);
    pts.forEach(([kx, ky]) => { const d = S.doors.find(d => d.tx === kx && d.ty === ky); if (d) { d.group.forEach(t => t.keyLock = L.key || 'gold'); setDoor(d, true); } });
  });
  // 바닥에 놓인 카드키: { key, b, fl, at } 또는 { key, pos: [x, y], fl }
  S.keyItems = (STAGE.keyItems || []).map(k => { const q = k.pos || planPt(k.b, k.fl || 0, k.at || 'bed'); return { key: k.key, x: tc(q[0]), y: tc(q[1]), fl: k.fl || 0, got: false }; });
  BLD.forEach(b => { let n = 0; for (let x = b.x0; x <= b.x1; x++) if ('#NSX'.includes(G[b.y1][x]) || S.doors.some(d => d.tx === x && d.ty === b.y1)) n++; b.facade = (n === b.x1 - b.x0 + 1 || b.piloti) && b.y1 - b.y0 >= 2; b.fh = b.facade ? clamp(b.h, 1, b.y1 - b.y0 - 1) : 0; b.fl = null; });
  buildFRM(true);
  // CCTV: [x, y, 방향°, 좌우°, 층] 또는 { b, fl, at, sweep } (실내: 그 자리에서 위쪽 벽에 달고 아래를 본다)
  S.cams = (STAGE.cams || []).map(c => {
    let x, y, fl, base, sweep;
    if (Array.isArray(c)) { [x, y, base, sweep, fl] = c; fl = fl || 0; base = base * Math.PI / 180; }
    else { const p = planPt(c.b, c.fl || 0, c.at || 'S'); if (!p) return null; fl = c.fl || 0; const g = fl ? GF[fl] : G0; x = p[0]; y = p[1]; while (y > 0 && !SOLID.has(g[y - 1][x])) y--; base = Math.PI / 2; sweep = c.sweep || 55; }
    const cx = tc(x) - Math.cos(base) * 18, cy = tc(y) - Math.sin(base) * 18;
    return { x: cx, y: cy, tx: x, ty: y, fl, base, sweep: sweep * Math.PI / 180, period: 7 + ((x * 7 + y * 3) % 5), ph: (x + y) % 7, a: base, meter: 0, broken: false, cool: 0, b: bldAt(x, y), outdoor: bldAt(x, y) < 0 };
  }).filter(Boolean);  if (FRM) {
    // 정면 벽 가스관(노란 배관): 땅 → 옥상. 2층 베란다: 땅에서 난간을 타고 2층으로
    const occ = new Set(S.ladders.map(l => l.bx + ',' + l.by)); S.poles.forEach(o => occ.add(o.tx + ',' + o.ty));
    const reach = new Uint8Array(MW * MH), rq = [[STAGE.start[0] | 0, STAGE.start[1] | 0]]; reach[(STAGE.start[1] | 0) * MW + (STAGE.start[0] | 0)] = 1;
    const isDoor = (x, y) => S.doors.some(d => d.tx === x && d.ty === y);
    S.poles.forEach(o => { for (const [dx, dy] of N8) occ.add((o.tx + dx) + ',' + (o.ty + dy)); });
    while (rq.length) { const [x, y] = rq.pop(); for (const [dx, dy] of N8.slice(0, 4)) { const nx = x + dx, ny = y + dy; if (inMap(nx, ny) && !reach[ny * MW + nx] && (!groundSolidP(nx, ny) || isDoor(nx, ny))) { reach[ny * MW + nx] = 1; rq.push([nx, ny]); } } }
    const groundOk = (x, y) => inMap(x, y) && reach[y * MW + x] && !groundSolidP(x, y) && bldAt(x, y) < 0 && !occ.has(x + ',' + y) && !S.doors.some(d => d.tx === x && Math.abs(d.ty - y) <= 1);
    BLD.forEach((b, bi) => {
      if (!b.plan || !b.facade || b.piloti || b.h < 2) return;
      b.gas = []; b.balc = [];
      for (const x of (b.glass ? [] : [b.x0, b.x1, b.x0 + 1, b.x1 - 1])) {
        if (G0[b.y1][x] !== '#' || !groundOk(x, b.y1 + 1)) continue;
        S.ladders.push({ kind: 'pipe', gas: true, bx: x, by: b.y1 + 1, bz: 0, tx: x, ty: b.y1, tz: b.h, x: tc(x), y: tc(b.y1 + 1), ux: tc(x), uy: tc(b.y1) });
        occ.add(x + ',' + (b.y1 + 1)); b.gas.push(x); break;
      }
      if (b.kind === 'shop' || b.h < 3 || !GF[1]) return;
      const cand = []; for (let x = b.x0 + 2; x <= b.x1 - 2; x++) if (GF[1][b.y1][x] === 'N' && !SOLID.has(GF[1][b.y1 - 1][x]) && groundOk(x, b.y1 + 1) && !b.gas.includes(x) && !b.gas.includes(x + 1) && !b.gas.includes(x - 1)) cand.push(x);
      const pick = cand.length > 4 ? [cand[0], cand[cand.length - 1]] : cand.length ? [cand[Math.floor(cand.length / 2)]] : [];
      pick.forEach(x => { S.ladders.push({ kind: 'balc', bx: x, by: b.y1 + 1, bz: 0, bfl: 0, tfl: 1, tx: x, ty: b.y1 - 1, tz: 0, x: tc(x), y: tc(b.y1 + 1), ux: tc(x), uy: tc(b.y1 - 1), b: bi }); occ.add(x + ',' + (b.y1 + 1)); b.balc.push(x); });
    });
    // 두꺼비집(계량기함): 정면 벽 1층, 문 가까운 벽 칸 바깥
    S.bfuses = [];
    BLD.forEach((b, bi) => {
      if (!b.plan || !b.facade || b.piloti || STAGE.tutorial) return;
      const door = S.doors.find(d => d.ty === b.y1 && d.tx > b.x0 && d.tx < b.x1); const cx = door ? door.tx : (b.x0 + b.x1) >> 1;
      const xs = []; for (let x = b.x0 + 1; x < b.x1; x++) xs.push(x); xs.sort((p, q) => Math.abs(p - cx) - Math.abs(q - cx));
      for (const x of xs) { if (Math.abs(x - cx) < 1 || G0[b.y1][x] !== '#' || !groundOk(x, b.y1 + 1)) continue; S.bfuses.push({ b: bi, tx: x, ty: b.y1, x: tc(x), y: tc(b.y1 + 1), at: [x, b.y1, x, b.y1 + 1], cut: false, t: 5, guard: null }); occ.add(x + ',' + (b.y1 + 1)); b.fuse = x; break; }
    });
    S.ladders.forEach(l => { if (l.tz > 0 && facadeRow(l.tx, l.ty)) { l.rx = l.ux; l.ry = roofEdgeY(l.tx, l.ty); } });
    S.wires.forEach(w => [w.a, w.b].forEach(n => { if (n.roof && facadeRow(n.tx, n.ty)) { n.y = roofEdgeY(n.tx, n.ty); n.dy = n.y - 4; n.ty = Math.floor(n.y / TILE); } }));
    S.wires.forEach(w => { w.L = Math.hypot(w.b.dx - w.a.dx, w.b.dy - w.a.dy); w.sag = Math.min(24, w.L * 0.07); });
    for (const g of S.guards) if (g.z && g.route) g.route.forEach(r => { const tx = Math.floor(r.x / TILE), ty = Math.floor(r.y / TILE); if (facadeRow(tx, ty)) r.y = roofEdgeY(tx, ty); });
    for (const g of S.guards) if (g.z && facadeRow(Math.floor(g.x / TILE), Math.floor(g.y / TILE))) g.y = roofEdgeY(Math.floor(g.x / TILE), Math.floor(g.y / TILE));
  }
  if (CITY) {  // 건물마다 이름판·외벽 색·옥상 물건을 달리해 구분되게
    const PL = ['그린빌라', '한솔하이츠', '삼익맨션', '우성빌라', '동원파크빌', '명성하이빌', '대림빌라', '은하맨션', '청솔빌', '현대빌라', '새한주택', '해맑은빌', '금호빌라', '성원하이츠', '다복빌라', '소망빌라'];
    const hsh = (b, k) => ((b.x0 * 73856093) ^ (b.y0 * 19349663) ^ (STAGE_I * 83492791) ^ k) >>> 0;
    let church = null; BLD.forEach(b => { if (b.plan && b.kind !== 'shop' && b.kind !== 'house' && !b.name && b.h >= 3 && (!church || b.h > church.h)) church = b; });
    const HL = ['감나무집', '파란대문집', '구멍가게집', '옥상텃밭집', '대추나무집', '빨간벽돌집', '연탄집', '평상집', '장독대집', '담쟁이집'];
    let pk = (STAGE_I * 5 + 3) % PL.length, hk = STAGE_I % HL.length;
    BLD.forEach((b, i) => {
      b.tint = ['', '242,222,196', '200,212,228', '236,204,196', '214,226,204', '226,226,232'][hsh(b, 1) % 6];
      if (!b.plan) return;
      b.plate = b.kind === 'shop' ? (b.plateName || ((b.signs || [])[0] || '상가') + ' 빌딩') : b.kind === 'house' ? (b.name || b.plateName || HL[(hk++) % HL.length]) : (b.plateName || PL[(pk++) % PL.length]);
      if (b === church) { b.church = true; b.plate = '새빛교회'; }
    });
  }
  BLD.forEach((b, i) => { b.alt = CITY ? (STAGE.bricks ? STAGE.bricks[i % STAGE.bricks.length] : i % 2) : 0; b.roofC = buildRoofCanvas(b, i); });
  if (CITY) kitAttach();
  S.bushes = []; for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (G[ty][tx] === 'B') S.bushes.push({ type: 'bush', tx, ty, x: tc(tx), y: tc(ty) });
  mapC = renderMap(); ugC = renderSewers(); ventC = renderVents();
  S.floorC = {};
  cam.x = S.player.x; cam.y = S.player.y;
  toast(STAGE.name + ' — ' + STAGE.mission, 2.6);
  clearTimeout(window.__hintT); clearTimeout(window.__hintT2);
  window.__hintT = setTimeout(() => S && !S.over && running && STAGE.hints && hint('stage', STAGE.hints[0]), 4500);
  if (STAGE.hints && STAGE.hints[1]) window.__hintT2 = setTimeout(() => S && !S.over && running && hint('stage2', STAGE.hints[1]), 10000);
  updateHUD(true);
}

// 평면 건물 안의 자리 찾기: where = 'L'(왼쪽 세대 거실) 'R'(오른쪽 세대 거실) 'S'(가게·사무실) 'bed'(첫 방) 'bath'
// 배치 무작위: 열쇠·물건·쪽지·경비에 alt 후보가 있으면 판마다 하나를 고른다 (window.__randPick 으로 고정 가능)
function pickAlts(st) {
  st._base = st._base || { keyItems: st.keyItems, notes: st.notes, items: st.items, guards: st.guards };
  const pick = arr => arr && arr.map(o => { if (!o || !o.alt) return o; const n = window.__randPick != null ? window.__randPick % (o.alt.length + 1) : Math.floor(Math.random() * (o.alt.length + 1)); return n ? Object.assign({}, o, o.alt[n - 1]) : o; });
  for (const k of ['keyItems', 'notes', 'items', 'guards']) if (st._base[k]) st[k] = pick(st._base[k]);
}
function planPt(bi, f, where) {
  const p = (PLANS[bi] || [])[f]; if (!p) return null;
  if ((where === 'L' || where === 'R') && !p.units.length && p.store) {  // 상가 층: 가게 자리 양 끝
    const st = p.store, y = Math.floor((st.y0 + st.y1) / 2), g = f ? GF[f] : G0;
    for (let k = 0; k <= st.x1 - st.x0; k++) { const x = where === 'L' ? st.x0 + k : st.x1 - k; for (const yy of [y, y + 1, y - 1, st.y1, st.y0]) if (yy >= st.y0 && yy <= st.y1 && !SOLID.has(g[yy][x])) return [x, yy]; }
  }
  if (where === 'VA' && p.vault) return [p.vault.door[0], p.vault.y0 + 1];
  if (where === 'VB' && p.vault) return [p.vault.door[0], p.vault.door[1] + 1];
  if (where === 'VC' && p.vault) { const g = f ? GF[f] : G0; for (let x = p.vault.x0; x <= p.vault.x1; x++) for (let y = p.vault.y0; y <= p.vault.y1; y++) if (!SOLID.has(g[y][x]) && !(x === p.vault.door[0] && y === p.vault.y0)) return [x, y]; }
  if (where === 'V' && p.vip) return [p.vip.x0 + Math.floor((p.vip.x1 - p.vip.x0) / 2), p.vip.y0 + 1];
  if (where === 'VD' && p.vip) return [p.vip.door[0], p.vip.door[1] + 1];
  const u0 = p.units[0], u1 = p.units[1] || p.units[0];
  const r = where === 'S' ? p.store : where === 'R' ? u1 && u1.living : where === 'room2' ? (u0 && (u0.rooms[1] || u0.rooms[0] || u0.living)) : where === 'bed' ? (u0 && (u0.rooms[0] || u0.living)) : where === 'bed2' ? (u1 && (u1.rooms[0] || u1.living)) : where === 'bath' ? (u0 && (u0.bath || u0.living)) : (u0 ? u0.living : p.store);
  if (!r) return null;
  const g = f ? GF[f] : G0, cx = Math.floor((r.x0 + r.x1) / 2), cy = Math.floor((r.y0 + r.y1) / 2);
  for (let k = 0; k < 4; k++) for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) { const x = cx + dx, y = cy + dy; if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1 && !SOLID.has(g[y][x]) && g[y][x] !== 'Y') return [x, y]; }
  return [cx, cy];
}
function resolveGuard(d) {
  if (d.b == null) return d;
  const f = d.fl || 0, o = Object.assign({}, d);
  if (d.patrol) { const a = planPt(d.b, f, d.from || 'L'), c = planPt(d.b, f, d.to || 'R'); o.route = [[a[0], a[1], 2], [c[0], c[1], 2]]; delete o.at; }
  else o.at = planPt(d.b, f, d.at || 'L');
  return o;
}
// 빌라 세대마다 확률로 주민을 둔다: 방에서 자는 사람 또는 거실에서 TV 보는 사람
function autoResidents() {
  const rate = STAGE.residents || 0, out = []; if (!rate) return out;
  PLANS.forEach((fls, bi) => { if (!fls || (STAGE.noResidents || []).includes(bi)) return; const b = BLD[bi]; if (b.kind === 'shop') return;
    fls.forEach((p, f) => { if (!p || (f === 0 && b.piloti)) return; p.units.forEach((u, ui) => {
      const h = ((bi * 7919) ^ (f * 104729) ^ (ui * 1299709) ^ 0x5bd1) >>> 0; if ((h % 100) >= rate * 100) return;
      const sleep = (h >> 3) % 2 === 0 && u.rooms.length;
      const r = sleep ? u.rooms[0] : u.living, g = f ? GF[f] : G0; let pt = null;
      for (let y = r.y0; y <= r.y1 && !pt; y++) for (let x = r.x0; x <= r.x1; x++) { const c = g[y][x]; if (!SOLID.has(c) && c !== 'Y' && (sleep ? true : y > r.y0)) { pt = [x, y]; if (!sleep) break; } }
      if (!pt) return;
      out.push({ kind: 'civ', look: (h >> 5) % 4, fl: f, at: pt, post: sleep ? 90 : ((h >> 7) % 4) * 90, sleep: !!sleep });
    }); });
  });
  return out;
}
function floorCanvas(bi, f) {
  const k = bi + '_' + f; if (S.floorC[k]) return S.floorC[k];
  const b = BLD[bi], L0 = CUR_F; setLayer(f); const c = renderMap({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }); setLayer(L0);
  return (S.floorC[k] = c);
}
function makeGuard(d, i) {
  let sx, sy;
  if (d.at) { sx = d.at[0]; sy = d.at[1]; }
  else if (d.route) { sx = d.route[0][0]; sy = d.route[0][1]; }
  else { const leader = (STAGE._g || STAGE.guards)[d.follow]; sx = leader.route[0][0] - 1; sy = leader.route[0][1]; }
  const post = d.post != null ? d.post * Math.PI / 180 : null;
  return {
    id: i, fl: d.fl || 0, civ: d.kind === 'civ', wander: d.wander || null, club: !!d.club, look: d.look || 0, doc: !!d.doc, sleep: !!d.sleep, kind: d.elite ? 'g3' : d.kind, elite: !!d.elite, lookout: !!d.lookout, dog: d.kind === 'dog', hasKey: d.key ? (d.key === true ? 'gold' : d.key) : null, target: !!d.target, follow: d.follow, x: tc(sx), y: tc(sy), a: post != null ? post : 0, want: post != null ? post : 0,
    route: d.route ? d.route.map(r => ({ x: tc(r[0]), y: tc(r[1]), pause: r[2] })) : [{ x: tc(sx), y: tc(sy), pause: 999 }],
    post, ri: d.route ? 1 % d.route.length : 0, path: null, z: 0, homeFl: d.fl || 0, radio: d.kind !== 'civ' && d.kind !== 'dog' && !d.target && (d.radio != null ? !!d.radio : !!d.elite || i % 3 === 0), wait: d.route ? 0 : 999, waitBase: 0,
    state: 'PATROL', meter: 0, poi: null, lostT: 0, still: !!d.still, glanceT: d.elite ? rnd(5, 9) : rnd(12, 24), glance: 0, glanceA: 0, stepT: 0, icon: null, iconT: 0, repath: 0, seen: false
  };
}
function buildRouteLine(g) {
  if (g.route.length < 2) return;
  g.routeLine = [];
  for (let i = 0; i < g.route.length; i++) {
    const a = g.route[i], b = g.route[(i + 1) % g.route.length];
    const seg = astar(Math.floor(a.x / TILE), Math.floor(a.y / TILE), Math.floor(b.x / TILE), Math.floor(b.y / TILE));
    g.routeLine.push({ x: a.x, y: a.y, stop: true }); seg.forEach(p => g.routeLine.push(p));
  }
}
// 지하 수로: 맨홀·우물끼리 최소 신장 트리로 잇고 고리 하나를 더한다
function buildSewers(wells) {
  UG = new Uint8Array(MW * MH);
  if (wells.length < 2) return;
  const carve = (a, b) => {
    let x = a.tx, y = a.ty;
    const hFirst = ((a.tx * 7 + b.ty * 3) % 2) === 0;
    const stepTo = (tx, ty) => { while (x !== tx) { UG[y * MW + x] = 1; x += Math.sign(tx - x); } while (y !== ty) { UG[y * MW + x] = 1; y += Math.sign(ty - y); } UG[y * MW + x] = 1; };
    if (hFirst) { stepTo(b.tx, a.ty); stepTo(b.tx, b.ty); } else { stepTo(a.tx, b.ty); stepTo(b.tx, b.ty); }
  };
  const inTree = [wells[0]], rest = wells.slice(1), edges = [];
  while (rest.length) {
    let bi = 0, bj = 0, bd = 1e9;
    rest.forEach((w, i) => inTree.forEach((t, j) => { const d = Math.abs(w.tx - t.tx) + Math.abs(w.ty - t.ty); if (d < bd) { bd = d; bi = i; bj = j; } }));
    edges.push([inTree[bj], rest[bi]]); inTree.push(rest[bi]); rest.splice(bi, 1);
  }
  if (wells.length > 3) edges.push([wells[0], wells[wells.length - 1]]);
  edges.forEach(([a, b]) => carve(a, b));
  // 넓은 방(집수실) 몇 곳
  wells.forEach((w, i) => { if (i % 2) return; for (let y = w.ty - 1; y <= w.ty + 1; y++) for (let x = w.tx - 1; x <= w.tx + 1; x++) if (x > 0 && y > 0 && x < MW - 1 && y < MH - 1) UG[y * MW + x] = 1; });
}
const ugAt = (tx, ty) => inMap(tx, ty) && UG && UG[ty * MW + tx] === 1;
const ventAt = (tx, ty) => inMap(tx, ty) && VG && VG[ty * MW + tx] === 1;
// 도시 건물 덕트 자동 배치: 옥상 환기구 1 + 1층 방 천장 창살 2~3 (+ 건물 뒤 거리 환기구)
function autoVents(sp, hides, ladders, lamps) {
  const B = BLD[sp.b]; if (!B) return null;
  const busy = (tx, ty) => hides.some(h => !h.fl && Math.abs(h.tx - tx) <= 1 && Math.abs(h.ty - ty) <= 1) || lamps.some(l => !l.fl && l.tx === tx && l.ty === ty)
    || ladders.some(l => (l.bx === tx && l.by === ty) || (l.tx === tx && l.ty === ty));
  const pick = (cands, score) => { let best = null, bs = 1e9; for (const c of cands) { const v = score(c); if (v < bs) { bs = v; best = c; } } return best; };
  // 옥상: 걸을 수 있는 칸, 계단실·사다리·물탱크(오른쪽 위)를 피해 왼쪽 위 안쪽
  const roofC = [];
  for (let ty = B.y0; ty <= B.y1; ty++) for (let tx = B.x0 + 1; tx < B.x1; tx++) if (rLv(tx, ty) > 0 && bldAt(tx, ty) === sp.b && G[ty][tx] !== 'Y' && !busy(tx, ty) && !ladders.some(l => Math.abs(l.tx - tx) <= 1 && Math.abs(l.ty - ty) <= 1)) roofC.push([tx, ty]);
  const r = pick(roofC, ([x, y]) => Math.abs(x - (B.x0 + 2)) + Math.abs(y - (B.y0 + 1)) * 1.2); if (!r) return null;
  // 1층 바닥: 바깥벽 안쪽, 가구·계단·조명 없는 칸
  const fl = [];
  for (let ty = B.y0 + 1; ty < B.y1; ty++) for (let tx = B.x0 + 1; tx < B.x1; tx++) if (!groundSolidP(tx, ty) && G[ty][tx] !== 'Y' && bldAt(tx, ty) === sp.b && !busy(tx, ty)
    && N8.slice(0, 4).filter(o => !groundSolidP(tx + o[0], ty + o[1])).length >= 3) fl.push([tx, ty]);
  if (!fl.length) return null;
  const a = pick(fl, ([x, y]) => (x - B.x0) + (y - B.y0) * 0.8), b = pick(fl, ([x, y]) => (B.x1 - x) + (y - B.y0) * 0.8);
  const out = [[r[0], r[1], 'r'], a]; if (b && Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) >= 4) out.push(b);
  if (sp.at) { const c = pick(fl, ([x, y]) => Math.hypot(x - sp.at[0], y - sp.at[1]) + (Math.hypot(x - sp.at[0], y - sp.at[1]) < 1.5 ? 9 : 0)); if (c && !out.some(o => o[0] === c[0] && o[1] === c[1])) out.push(c); }
  // 거리 쪽 환기구: 건물 뒤(북쪽) 또는 옆 골목 바닥
  if (sp.street) {
    const sc = []; const mx = (B.x0 + B.x1) / 2;
    for (let tx = B.x0 - 1; tx <= B.x1 + 1; tx++) for (const ty of [B.y0 - 1]) if (inMap(tx, ty) && !groundSolidP(tx, ty) && bldAt(tx, ty) < 0 && !busy(tx, ty) && G[ty][tx] !== 'W') sc.push([tx, ty, Math.abs(tx - mx)]);
    for (let ty = B.y0; ty <= B.y1; ty++) for (const tx of [B.x0 - 1, B.x1 + 1]) if (inMap(tx, ty) && !groundSolidP(tx, ty) && bldAt(tx, ty) < 0 && !busy(tx, ty) && G[ty][tx] !== 'W') sc.push([tx, ty, 6 + Math.abs(ty - B.y0)]);
    const st = pick(sc, c => c[2]); if (st) out.push([st[0], st[1], 's']);
  }
  return out;
}
// 점들을 최소 신장 트리로 잇는 ㄱ자 통로를 grid에 판다
function carveNet(grid, nodes) {
  if (!nodes.length) return;
  const carve = (a, b) => { let x = a.tx, y = a.ty; const step = (tx, ty) => { while (x !== tx) { grid[y * MW + x] = 1; x += Math.sign(tx - x); } while (y !== ty) { grid[y * MW + x] = 1; y += Math.sign(ty - y); } grid[y * MW + x] = 1; }; if (a.street) { step(a.tx, b.ty); step(b.tx, b.ty); } else { step(b.tx, a.ty); step(b.tx, b.ty); } };  // 거리 환기구에서는 먼저 건물 안쪽으로
  const inT = [nodes[0]], rest = nodes.slice(1); grid[nodes[0].ty * MW + nodes[0].tx] = 1;
  while (rest.length) { let bi = 0, bj = 0, bd = 1e9; rest.forEach((w, i) => inT.forEach((t, j) => { const d = Math.abs(w.tx - t.tx) + Math.abs(w.ty - t.ty); if (d < bd) { bd = d; bi = i; bj = j; } })); carve(inT[bj], rest[bi]); inT.push(rest[bi]); rest.splice(bi, 1); }
}
function renderVents() {
  const c = document.createElement('canvas'); c.width = MW * TILE; c.height = MH * TILE;
  const x = c.getContext('2d');
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    if (!ventAt(tx, ty)) continue;
    const px = tx * TILE, py = ty * TILE, m = 9;
    const n = ventAt(tx, ty - 1), so = ventAt(tx, ty + 1), w = ventAt(tx - 1, ty), e = ventAt(tx + 1, ty);
    x.fillStyle = '#3f5a60';
    x.fillRect(px + m, py + m, TILE - 2 * m, TILE - 2 * m);
    if (n) x.fillRect(px + m, py, TILE - 2 * m, m); if (so) x.fillRect(px + m, py + TILE - m, TILE - 2 * m, m);
    if (w) x.fillRect(px, py + m, m, TILE - 2 * m); if (e) x.fillRect(px + TILE - m, py + m, m, TILE - 2 * m);
    x.fillStyle = 'rgba(160,220,215,.25)'; x.fillRect(px + m + 2, py + m + 2, TILE - 2 * m - 4, 3);
    x.fillStyle = 'rgba(0,0,0,.35)';
    for (const [k, on] of [[0, n], [1, so], [2, w], [3, e]]) if (!on) { if (k === 0) x.fillRect(px + m, py + m, TILE - 2 * m, 3); if (k === 1) x.fillRect(px + m, py + TILE - m - 3, TILE - 2 * m, 3); if (k === 2) x.fillRect(px + m, py + m, 3, TILE - 2 * m); if (k === 3) x.fillRect(px + TILE - m - 3, py + m, 3, TILE - 2 * m); }
    x.fillStyle = 'rgba(200,230,228,.35)'; for (const [dx, dy] of [[m + 4, m + 4], [TILE - m - 6, m + 4], [m + 4, TILE - m - 6], [TILE - m - 6, TILE - m - 6]]) x.fillRect(px + dx, py + dy, 2, 2);
  }
  return c;
}
function renderSewers() {
  const c = document.createElement('canvas'); c.width = MW * TILE; c.height = MH * TILE;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; const f = F.stone0;
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    if (!ugAt(tx, ty)) continue;
    const px = tx * TILE, py = ty * TILE;
    x.drawImage(atlas, f[0], f[1], f[2], f[3], px, py, TILE, TILE);
    x.fillStyle = 'rgba(20,28,36,.55)'; x.fillRect(px, py, TILE, TILE);
    const hz = ugAt(tx - 1, ty) || ugAt(tx + 1, ty), vt = ugAt(tx, ty - 1) || ugAt(tx, ty + 1);
    x.fillStyle = 'rgba(70,110,120,.55)';
    if (hz) x.fillRect(px, py + 18, TILE, 12); if (vt) x.fillRect(px + 18, py, 12, TILE);
    x.fillStyle = 'rgba(0,0,0,.5)';
    if (!ugAt(tx, ty - 1)) x.fillRect(px, py, TILE, 5); if (!ugAt(tx, ty + 1)) x.fillRect(px, py + TILE - 5, TILE, 5);
    if (!ugAt(tx - 1, ty)) x.fillRect(px, py, 5, TILE); if (!ugAt(tx + 1, ty)) x.fillRect(px + TILE - 5, py, 5, TILE);
  }
  return c;
}
// 도시판 바닥: 구운 키트 타일 (아스팔트 · 보도 · 흙 · 잔디). 없으면 기존 그림
function kitGround(ch, tx, ty) {
  const h = (((tx * 73856093) ^ (ty * 19349663)) >>> 0) % 100;
  if (ch === 'T' || ch === 'B') { const n = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(o => G[ty + o[1]] && G[ty + o[1]][tx + o[0]]); ch = n.includes('g') ? 'g' : n.includes('d') ? 'd' : n.includes('=') ? '=' : '.'; }
  if (ch === 'w' || ch === 'K' || ch === 'E') return kitFloor('planks'); if (ch === 'v') return kitFloor('planks2'); if (ch === 't') return kitFloor('tiles'); if (ch === 'h') return kitFloor('concrete');
  const k = ch === '.' || ch === 'R' ? 'asph0' : ch === '=' || ch === 'F' ? 'pave0' : ch === 'd' ? (h < 80 ? 'dirt0' : 'dirt1') : ch === 'g' ? 'grass0' : null;
  return k && kitOk(kitG[k]) ? kitG[k] : null;
}
// 실내 계단: 계단 칸('Y')과 올라오는 쪽 칸, 두 칸에 걸친 한 줄 계단. 위(계단 칸 쪽)로 갈수록 밝고, 칸마다 디딤판 그림자·코, 양옆 난간
function stairDir(tx, ty) {
  const bi = bldAt(tx, ty);
  for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) { const nx = tx + dx, ny = ty + dy; if (inMap(nx, ny) && bldAt(nx, ny) === bi && !SOLID.has(G[ny][nx]) && G[ny][nx] !== 'Y') return [dx, dy]; }
  return [0, 1];
}
function drawStairs(x, tx, ty) {
  const [dx, dy] = stairDir(tx, ty), cx = (tx + 0.5 + dx / 2) * TILE, cy = (ty + 0.5 + dy / 2) * TILE;
  x.save(); x.translate(cx, cy); x.rotate(Math.atan2(-dy, -dx) + Math.PI / 2);  // 기준: 위쪽(-y)이 계단 칸, 아래쪽이 올라오는 칸
  const hw = TILE / 2 - 3, hl = TILE, N = 8, st = (hl * 2) / N;
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(-hw - 3, -hl, hw * 2 + 6, hl * 2);
  for (let i = 0; i < N; i++) {  // i = 0 이 맨 위 디딤판
    const y0 = -hl + i * st, k = 1 - i / (N - 1), c = (a, b) => Math.round(a + (b - a) * k);
    x.fillStyle = `rgb(${c(96, 196)},${c(84, 172)},${c(70, 140)})`; x.fillRect(-hw, y0, hw * 2, st);
    x.fillStyle = 'rgba(255,240,215,.35)'; x.fillRect(-hw, y0, hw * 2, 2);            // 디딤판 코 (빛)
    x.fillStyle = 'rgba(0,0,0,.38)'; x.fillRect(-hw, y0 + st - 3, hw * 2, 3);          // 아래 단으로 떨어지는 그림자
  }
  x.fillStyle = '#2e2a28'; x.fillRect(-hw - 3, -hl, 4, hl * 2); x.fillRect(hw - 1, -hl, 4, hl * 2);   // 옆판
  x.fillStyle = '#aeb6c0'; x.fillRect(hw - 1, -hl + 2, 2, hl * 2 - 4);                              // 난간
  for (let i = 0; i <= 3; i++) x.fillRect(hw - 2, -hl + 4 + i * ((hl * 2 - 10) / 3), 4, 3);
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(-hw - 3, -hl, hw * 2 + 6, 3);                          // 위층 바닥 끝
  x.restore();
}
function renderMap(R) {
  // R = {x0, y0, x1, y1}: 그 사각형(칸)만 그린다 (위층 평면 캐시용)
  const rx0 = R ? R.x0 : 0, ry0 = R ? R.y0 : 0, rx1 = R ? R.x1 : MW - 1, ry1 = R ? R.y1 : MH - 1;
  const c = document.createElement('canvas'); c.width = (rx1 - rx0 + 1) * TILE; c.height = (ry1 - ry0 + 1) * TILE;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.translate(-rx0 * TILE, -ry0 * TILE);
  const hs = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 100;
  const base = (ch, tx, ty) => {
    const h = hs(tx, ty);
    switch (ch) {
      case '.': case 'T': case 'R': return h < 70 ? 'grass0' : h < 85 ? 'grass1' : 'grass2';
      case ',': return h < 75 ? 'dirt0' : 'dirt1';
      case 'g': return F.lawn0 ? (h < 70 ? 'lawn0' : h < 85 ? 'lawn1' : 'lawn2') : 'grass0';
      case 'J': return 'stone1';
      case 'x': case 'p': return 'grass0';
      case 'r': return F.fdirt0 ? 'fdirt1' : 'dirt1';
      case 'm': return 'stone1';
      case 'd': return F.fdirt0 ? (h < 75 ? 'fdirt0' : 'fdirt1') : 'dirt0';
      case '=': case 'F': return h < 80 ? 'stone0' : 'stone1';
      case 'w': case 'K': case 'E': return 'wood';
      case 'v': return 'wood2';
      case 'h': return 'stone1';
      case 't': return F.tileB ? 'tileB' : 'stone0';
      case '~': return 'water';
      default: return null;
    }
  };
  const draw = (name, dx, dy, dw = TILE, dh = TILE) => blit(x, name, dx, dy, dw, dh);
  const wallish = v => v === '#' || v === 'S' || v === 'N';
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
    const ch = G[ty][tx]; let b = base(ch, tx, ty);
    if (!b) { const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(o => G[ty + o[1]] && G[ty + o[1]][tx + o[0]]).find(v => v && !wallish(v) && v !== '~' && base(v, tx, ty)); b = base(n || '=', tx, ty) || 'stone0'; }
    const kg = KIT && CITY ? kitGround(ch, tx, ty) : null;
    if (kg) x.drawImage(kg, tx * TILE, ty * TILE, TILE, TILE); else draw(b, tx * TILE, ty * TILE);
  }
  x.strokeStyle = 'rgba(200,225,245,.35)'; x.lineWidth = 2;
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) if (G[ty][tx] === '~' && G[ty + 1] && G[ty + 1][tx] !== '~' && G[ty + 1][tx] != null) { x.beginPath(); x.moveTo(tx * TILE, ty * TILE + TILE - 1); x.lineTo(tx * TILE + TILE, ty * TILE + TILE - 1); x.stroke(); }
  // 도시: 개울('~')은 물빛과 잔물결, 물 위 보도블록('=')은 나무 다리
  if (CITY) for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
    const ch = G[ty][tx], px = tx * TILE, py = ty * TILE, hh = hs(tx, ty);
    if (ch === '~') { x.fillStyle = '#163650'; x.fillRect(px, py, TILE, TILE); x.fillStyle = '#1f4a6a'; x.fillRect(px, py + (hh % 3) * 6, TILE, 10); x.strokeStyle = 'rgba(170,215,240,.35)'; x.lineWidth = 2; for (let k = 0; k < 2; k++) { const yy = py + 12 + k * 20 + (hh % 5); x.beginPath(); x.moveTo(px + 4 + (hh % 7), yy); x.quadraticCurveTo(px + 16, yy - 4, px + 28 + (hh % 9), yy); x.stroke(); } }
    const water = (ox, oy) => G[ty + oy] && G[ty + oy][tx + ox] === '~';
    if (ch === '=' && (water(-1, 0) || water(1, 0) || water(0, -1) || water(0, 1))) { x.fillStyle = '#163650'; x.fillRect(px, py, TILE, TILE); x.fillStyle = '#7a5a3a'; x.fillRect(px, py + 2, TILE, TILE - 4); x.fillStyle = '#5a3e26'; for (let k = 0; k < TILE; k += 8) x.fillRect(px + k, py + 2, 2, TILE - 4); x.fillStyle = '#4a3220'; x.fillRect(px, py + 2, TILE, 3); x.fillRect(px, py + TILE - 5, TILE, 3); }
  }
  // 바닥 재질 그림
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
    const ch = G[ty][tx], px = tx * TILE, py = ty * TILE, hh = hs(tx, ty); if (!MAT[ch]) continue;
    if (ch === 'p') { x.fillStyle = 'rgba(40,70,110,.75)'; x.beginPath(); x.ellipse(px + 24, py + 26, 20, 12, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(170,210,240,.35)'; x.beginPath(); x.ellipse(px + 18, py + 22, 8, 3, 0, 0, TAU); x.fill(); }
    if (ch === 'x') { for (let k = 0; k < 9; k++) { const a = (hh + k * 37) % 40, b2 = (hh * 3 + k * 23) % 40; x.fillStyle = k % 2 ? 'rgba(200,235,255,.85)' : 'rgba(120,180,210,.8)'; x.beginPath(); x.moveTo(px + 4 + a, py + 4 + b2); x.lineTo(px + 9 + a, py + 6 + b2); x.lineTo(px + 6 + a, py + 10 + b2); x.fill(); } }
    if (ch === 'r') { for (let k = 0; k < 16; k++) { x.fillStyle = k % 3 ? '#8a8378' : '#5e594f'; x.fillRect(px + (hh + k * 29) % 44 + 2, py + (hh * 7 + k * 17) % 44 + 2, 4, 3); } }
    if (ch === 'm') { x.fillStyle = '#5d636e'; x.fillRect(px + 1, py + 1, TILE - 2, TILE - 2); x.fillStyle = '#7a818e'; for (let a = 0; a < 6; a++) for (let b2 = 0; b2 < 6; b2++) if ((a + b2) % 2 === 0) x.fillRect(px + 4 + a * 7, py + 4 + b2 * 7, 4, 2); x.strokeStyle = '#3a3f48'; x.lineWidth = 2; x.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2); }
  }
  // 돌계단('J'): 계단 줄무늬
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) if (G[ty][tx] === 'J') { const px = tx * TILE, py = ty * TILE; for (let k = 0; k < 4; k++) { x.fillStyle = 'rgba(0,0,0,.32)'; x.fillRect(px, py + k * 12 + 9, TILE, 3); x.fillStyle = 'rgba(255,255,255,.10)'; x.fillRect(px, py + k * 12, TILE, 2); } }
  if (CITY) {
    // 보도 경계석: 보도블록('=')이 아스팔트('.')와 맞닿는 곳
    for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
      if (G[ty][tx] !== '=') continue; const px = tx * TILE, py = ty * TILE;
      const asph = (ox, oy) => G[ty + oy] && G[ty + oy][tx + ox] === '.';
      x.fillStyle = '#b4b6c4'; if (asph(0, 1)) x.fillRect(px, py + TILE - 6, TILE, 6); if (asph(0, -1)) x.fillRect(px, py, TILE, 5); if (asph(-1, 0)) x.fillRect(px, py, 5, TILE); if (asph(1, 0)) x.fillRect(px + TILE - 5, py, 5, TILE);
      x.fillStyle = 'rgba(0,0,0,.35)'; if (asph(0, 1)) x.fillRect(px, py + TILE, TILE, 3);
    }
  }
  if (!CUR_F) (STAGE.decor || []).forEach(d => {
    if (d[0] === 'shade') { x.fillStyle = `rgba(${d[6] || '0,0,0'},${d[5]})`; x.fillRect(d[1] * TILE, d[2] * TILE, (d[3] - d[1] + 1) * TILE, (d[4] - d[2] + 1) * TILE); return; }
    if (d[0] === 'lane') { x.fillStyle = 'rgba(232,196,90,.75)'; for (let xx = d[1] * TILE; xx < (d[3] + 1) * TILE; xx += 48) x.fillRect(xx + 6, d[2] * TILE - 2, 28, 4); return; }
    if (d[0] === 'zebra') { x.fillStyle = 'rgba(226,228,236,.7)'; const vert = d[4] === 'v'; for (let k = 0; k < d[3]; k++) { if (vert) x.fillRect(d[1] * TILE + 4, (d[2] + k) * TILE + 8, TILE * 2 - 8, 14); else x.fillRect((d[1] + k) * TILE + 8, d[2] * TILE + 4, 14, TILE * 2 - 8); } return; }
    if (d[0] === 'park') { x.strokeStyle = 'rgba(226,228,236,.45)'; x.lineWidth = 3; for (let k = 0; k <= d[3]; k++) { x.beginPath(); x.moveTo((d[1] + k * 2) * TILE, d[2] * TILE); x.lineTo((d[1] + k * 2) * TILE, (d[2] + 2) * TILE); x.stroke(); } return; }
    if (d[0] === 'rug') { for (let yy = 0; yy < d[4]; yy++) for (let xx = 0; xx < d[3]; xx++) draw('wood2', (d[1] + xx) * TILE, (d[2] + yy) * TILE); }
    else draw('bench', d[1] * TILE, d[2] * TILE + 6, d[3] * TILE, TILE - 8);
  });
  TENTS.forEach(([tx, ty, cc]) => {
    const px = tx * TILE, py = ty * TILE, nm = cc === 'B' ? 'roofSlate' : 'roofRed';
    for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) draw(nm, px + xx * TILE, py + yy * TILE);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px, py + TILE * 2 - 8, TILE * 2, 8); x.fillRect(px + TILE - 2, py, 4, TILE * 2);
    x.strokeStyle = '#2a1a14'; x.lineWidth = 3; x.strokeRect(px + 1.5, py + 1.5, TILE * 2 - 3, TILE * 2 - 3);
  });
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
    const ch = G[ty][tx], px = tx * TILE, py = ty * TILE;
    if (wallish(ch)) {
      const n = wallish((G[ty - 1] || [])[tx]), so = wallish((G[ty + 1] || [])[tx]), e = wallish(G[ty][tx + 1]), w = wallish(G[ty][tx - 1]);
      let piece = 'wallH';
      if (e && so && !n && !w) piece = 'wallTL'; else if (w && so && !n && !e) piece = 'wallTR';
      else if (e && n && !so && !w) piece = 'wallBL'; else if (w && n && !so && !e) piece = 'wallBR';
      else if ((n || so) && !e && !w) piece = 'wallV';
      if (CITY && kitOk(kitTex.wall)) {
        x.fillStyle = '#2a2622'; x.fillRect(px, py, TILE, TILE); x.fillStyle = '#3e3832'; x.fillRect(px + 2, py + 2, TILE - 4, TILE - 4); x.fillStyle = '#2a2622'; x.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
        if (!so) {  // 앞(남쪽)이 열려 있으면 벽 앞면
          x.drawImage(kitTex.wall, 0, 16, 64, 48, px, py + 20, TILE, 28);
          x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px, py + TILE, TILE, 4);
        }  // 옆벽 창문은 drawWindow가 위에 그린다
      } else draw(piece, px, py);
      if (ch === 'S') { x.strokeStyle = 'rgba(15,10,8,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(px + 22, py + 6); x.lineTo(px + 18, py + 20); x.lineTo(px + 26, py + 30); x.lineTo(px + 21, py + 42); x.stroke(); }
    }
    if (ch === 'Y' && !CITY) {
      x.fillStyle = '#3c2a1e'; x.fillRect(px + 3, py + 3, 42, 42);
      x.fillStyle = '#b08458'; for (let i = 0; i < 5; i++) x.fillRect(px + 6, py + 6 + i * 8, 36 - i * 5, 5);
    }
    if (ch === 'Z') draw('sack', px, py);
    if (ch === 'I') { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px + 14, py + 14, 24, 24); x.fillStyle = '#8c8f97'; x.fillRect(px + 10, py + 10, 26, 26); x.fillStyle = '#b3b6bd'; x.fillRect(px + 10, py + 10, 26, 5); }
    if (ch === 'Q' || ch === 'q') {
      x.fillStyle = '#4a4a50'; x.fillRect(px + 3, py + 5, 42, 38); x.fillStyle = '#6c6c74'; x.fillRect(px + 6, py + 8, 36, 6);
      x.fillStyle = '#141014'; x.beginPath(); x.moveTo(px + 11, py + 40); x.lineTo(px + 11, py + 24); x.arc(px + 24, py + 24, 13, Math.PI, 0); x.lineTo(px + 37, py + 40); x.closePath(); x.fill();
      x.strokeStyle = '#2a2a30'; x.lineWidth = 2; x.strokeRect(px + 3, py + 5, 42, 38);
    }
    if (ch === 'C') draw(hs(tx, ty) % 3 ? 'crate' : 'crate2', px, py);
    if (ch === 'O') draw(tx % 2 ? 'pot0' : 'pot1', px, py);
    if (ch === 'R') draw('rock', px, py);
    if (ch === 'H' && CITY && KIT_PROP.dumpster) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px + 4, py + 8, TILE - 6, TILE - 8); }
    else if (ch === 'H') { draw('box', px, py); x.strokeStyle = 'rgba(242,196,107,.5)'; x.lineWidth = 2; x.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4); }
    if (ch === 'U' && CITY) {  // 컨테이너·창고 지붕 (높이 1): 골함석, 남쪽 끝은 앞면
      const hh = ((tx * 73856093) ^ (ty * 19349663)) >>> 0, cols = ['#5a82a8', '#a84e40', '#55906c', '#b88e3e'];
      let gx = tx; while (G[ty][gx - 1] === 'U') gx--; const base = cols[(gx * 7 + ty * 3) % 4];
      x.fillStyle = base; x.fillRect(px, py, TILE, TILE);
      x.fillStyle = 'rgba(255,255,255,.10)'; for (let k = 2; k < TILE; k += 6) x.fillRect(px + k, py, 2, TILE);
      x.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 5; k < TILE; k += 6) x.fillRect(px + k, py, 1, TILE);
      if (G[ty + 1] && G[ty + 1][tx] !== 'U') { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px, py + TILE - 12, TILE, 12); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(px, py + TILE - 12, TILE, 2); }
      if (G[ty - 1] && G[ty - 1][tx] !== 'U') { x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(px, py, TILE, 2); }
      if (G[ty][tx - 1] !== 'U') { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(px, py, 3, TILE); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(px + 3, py, 1, TILE); }
      if (G[ty][tx + 1] !== 'U') { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(px + TILE - 3, py, 3, TILE); }
      if (hh % 9 === 0) { x.fillStyle = 'rgba(120,60,30,.35)'; x.fillRect(px + (hh % 20), py + (hh % 17), 10, 8); }
    } else if (ch === 'U') {
      draw(roofOf(0), px, py);
      x.fillStyle = 'rgba(0,0,0,.4)';
      if (!roofAt(tx, ty + 1)) x.fillRect(px, py + TILE - 6, TILE, 6);
      if (!roofAt(tx, ty - 1)) x.fillRect(px, py, TILE, 3);
      if (!roofAt(tx - 1, ty)) x.fillRect(px, py, 3, TILE);
      if (!roofAt(tx + 1, ty)) x.fillRect(px + TILE - 3, py, 3, TILE);
    }
    if (ch === 'L') {
      x.strokeStyle = CITY ? '#9aa1aa' : '#b08458'; x.lineWidth = 5; x.beginPath(); x.moveTo(px + 14, py + 3); x.lineTo(px + 14, py + 45); x.moveTo(px + 34, py + 3); x.lineTo(px + 34, py + 45); x.stroke();
      x.lineWidth = 4; x.beginPath(); for (let i = 0; i < 5; i++) { x.moveTo(px + 14, py + 7 + i * 9); x.lineTo(px + 34, py + 7 + i * 9); } x.stroke();
    }
    if (ch === 'W') {
      const man = STAGE.well === 'manhole';
      if (man) {
        // 주철 맨홀 뚜껑: 밝은 테두리, 격자 무늬, 아래쪽 그림자 (밤에도 바닥에서 구분되게)
        x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(px + 25, py + 27, 21, 0, TAU); x.fill();
        x.fillStyle = '#8a8c94'; x.beginPath(); x.arc(px + 24, py + 24, 21, 0, TAU); x.fill();
        x.fillStyle = '#4a4c54'; x.beginPath(); x.arc(px + 24, py + 24, 17, 0, TAU); x.fill();
        x.save(); x.beginPath(); x.arc(px + 24, py + 24, 15, 0, TAU); x.clip();
        x.strokeStyle = '#6e7078'; x.lineWidth = 2; for (let i = -15; i <= 15; i += 6) { x.beginPath(); x.moveTo(px + 9, py + 24 + i); x.lineTo(px + 39, py + 24 + i); x.stroke(); x.beginPath(); x.moveTo(px + 24 + i, py + 9); x.lineTo(px + 24 + i, py + 39); x.stroke(); }
        x.restore();
        x.strokeStyle = '#b4b6be'; x.lineWidth = 2; x.beginPath(); x.arc(px + 24, py + 24, 20, Math.PI * 1.05, Math.PI * 1.75); x.stroke();
        x.fillStyle = '#2a2c32'; x.fillRect(px + 20, py + 10, 8, 3);
      } else {
        x.fillStyle = '#7c776c'; x.beginPath(); x.arc(px + 24, py + 24, 21, 0, TAU); x.fill();
        x.fillStyle = '#58544c'; x.beginPath(); x.arc(px + 24, py + 24, 16, 0, TAU); x.fill();
        x.fillStyle = '#05070b'; x.beginPath(); x.arc(px + 24, py + 24, 12, 0, TAU); x.fill();
      }
    }
    if (ch === 'F') {
      x.fillStyle = '#3e3a36'; x.fillRect(px + 10, py + 8, 28, 32); x.strokeStyle = '#1c1a18'; x.lineWidth = 3; x.strokeRect(px + 10, py + 8, 28, 32);
      x.fillStyle = '#f2c46b'; x.beginPath(); x.moveTo(px + 26, py + 12); x.lineTo(px + 18, py + 26); x.lineTo(px + 24, py + 26); x.lineTo(px + 21, py + 36); x.lineTo(px + 30, py + 21); x.lineTo(px + 24, py + 21); x.closePath(); x.fill();
    }
  }
  // 방 이름 (Monaco처럼 바닥에 흐리게)
  drawRoomLabels(x, CUR_F, rx0, ry0, rx1, ry1);
  // 가구 (이 층 것만)
  if (CITY) for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) if (G[ty][tx] === 'Y') drawStairs(x, tx, ty);
  FURN.filter(f => f.fl === CUR_F && f.x + f.w > rx0 && f.x <= rx1 && f.y + f.h > ry0 && f.y <= ry1).sort((a, b) => (a.y + a.h) - (b.y + b.h)).forEach(f => drawFurn(x, f));
  // 주차된 차 · 필로티 아래 그늘
  if (!CUR_F) {
    BLD.forEach(b => { if (b.piloti) { x.fillStyle = 'rgba(0,0,0,.38)'; x.fillRect((b.x0 + 1) * TILE, (b.y0 + 1) * TILE, (b.x1 - b.x0 - 1) * TILE, (b.y1 - b.y0) * TILE); } });
    CARS.forEach(([cx, cy, c]) => { x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(cx * TILE + 8, cy * TILE + 10, 38, 88); blit(x, 'car' + c, cx * TILE, cy * TILE, TILE, TILE * 2); });
  }
  // 정면벽 아래 땅 그림자
  if (!CUR_F) BLD.forEach(b => { if (!b.facade) return; const sl = 9 + 8 * (b.h - 1); const g = x.createLinearGradient(0, (b.y1 + 1) * TILE, 0, (b.y1 + 1) * TILE + sl); g.addColorStop(0, 'rgba(0,0,0,.34)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(b.x0 * TILE + 4, (b.y1 + 1) * TILE, (b.x1 - b.x0 + 1) * TILE, sl); });
  // 석등
  S.lamps.forEach(l => { if (l.hearth || flOf(l) !== CUR_F) return; if (CITY) { if (G[Math.floor(l.y / TILE)][Math.floor(l.x / TILE)] === 'P') return; x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(l.x - 3, l.y + 2, 9, 9); x.fillStyle = '#5d626c'; x.fillRect(l.x - 4, l.y - 4, 8, 8); x.fillStyle = '#9aa0aa'; x.fillRect(l.x - 2, l.y - 2, 4, 4); return; } x.fillStyle = '#4a4640'; x.fillRect(l.x - 7, l.y - 7, 14, 14); x.fillStyle = '#7a746a'; x.fillRect(l.x - 5, l.y - 5, 10, 10); x.fillStyle = '#2a2622'; x.fillRect(l.x - 2, l.y - 2, 4, 4); });
  return c;
}

// ---------------------------------------------------------------- 빛
const TORCH_R = 210;
const flickOff = l => !!l.flk && ((Math.sin(S.t * l.flk.f + l.flk.p) > 0.62) || ((S.t * 6.3 + l.flk.p) % 7 < 0.35));  // 깜빡이는 보안등·간판: 잠깐씩 꺼진다
const lampOn = l => !l.broken && !l.off && !(l.outdoor && !S.lightsOn) && !flickOff(l);
function lightAt(x, y, elev) {
  let l = elev ? 0.1 : 0.04;
  for (const lp of S.lamps) {
    if (!lampOn(lp) || flOf(lp) !== CUR_F) continue;
    const d = dist(lp.x, lp.y, x, y);
    if (d < lp.r && los(lp.x, lp.y, x, y, elev)) l = Math.max(l, clamp((1 - d / lp.r) * 1.8, 0, 1));
  }
  // 손전등: 비추는 경비 앞 원뿔 안은 밝다 (어둠 속이어도 들킨다)
  if (S.guards) for (const g of S.guards) { if (!g.torch || g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) !== CUR_F) continue; const d = dist(g.x, g.y, x, y); if (d > TORCH_R || d < 4) continue; if (Math.abs(angDiff(g.a, Math.atan2(y - g.y, x - g.x))) > 0.32) continue; if (!los(g.x, g.y, x, y, elev)) continue; l = Math.max(l, 0.85 * (1 - d / TORCH_R) + 0.2); }
  return l;
}

// ---------------------------------------------------------------- 메시지
const toastEl = document.getElementById('toasts');
function toast(text, sec = 2.6, kind = '') { if (kind === 'hint') return showHint(text, sec); S.toasts.push({ text, t: sec, kind }); if (S.toasts.length > 4) S.toasts.shift(); renderToasts(); }
function hint(key, text) { if (S.hints[key]) return; S.hints[key] = true; showHint(text); }
// 도움말은 화면 가운데 대신 왼쪽 아래 카드 한 장 (새 도움말이 오면 바꿔 끼운다)
let hintTimer = null;
function showHint(text, sec) {
  const card = document.getElementById('hintCard'); if (!card) return;
  document.getElementById('hintText').textContent = text; card.classList.remove('off');
  clearTimeout(hintTimer); hintTimer = setTimeout(() => card.classList.add('off'), Math.max(5500, (sec || 0) * 1000, text.length * 75));
}
function renderToasts() {
  toastEl.innerHTML = '';
  S.toasts.slice(-2).forEach(m => { const d = document.createElement('div'); d.className = 'toast ' + m.kind; d.textContent = m.text; toastEl.appendChild(d); });
}

// ---------------------------------------------------------------- 소음
// 벽이 소리를 막는다: 소리와 듣는 사람 사이의 벽 한 겹마다 크게 줄어든다 (창문·잠긴 문은 조금 덜)
function soundThrough(x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 10); let f = 1, lt = -1;
  for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), k = ty * MW + tx; if (k === lt) continue; lt = k;
    const c = inMap(tx, ty) ? G[ty][tx] : '#';
    if (c === '#' || c === 'V' || c === 'U') f *= 0.28; else if (c === 'N' || c === 'X') f *= 0.55; else if (c === 'T' || c === 'M') f *= 0.85;
    if (f < 0.05) break; }
  return f;
}
function noise(x, y, r, src, fl) {
  if (fl == null) fl = CUR_F;
  if (src !== 'scream') r *= loudMul(x, y, fl);  // 클럽 음악에 묻힌다
  const nz = { x, y, r, t: 0, src, fl }; S.noises.push(nz);
  const L0 = CUR_F; setLayer(fl);
  for (const g of S.guards) {
    if (flOf(g) !== fl) continue;
    if (g.state === 'DEAD' || g.state === 'ALERT' || g.state === 'FLEE' || g.state === 'CAPTIVE' || g.state === 'TERROR') continue;
    const d = dist(g.x, g.y, x, y);
    const rr = d > r ? 0 : r * soundThrough(x, y, g.x, g.y);
    if (g.civ) { if (d < rr && src !== 'scream') { if (g.state === 'SLEEP') { if (d < rr * 0.6) civWake(g, x, y); } else if (g.state === 'PATROL') { g.meter = Math.min(0.9, g.meter + 0.25); g.want = Math.atan2(y - g.y, x - g.x); setIcon(g, '?'); } } continue; }
    if (d < rr) {
      if (g.state === 'FUSE' && src !== 'stone') continue;
      if (g.state === 'BODY' || g.state === 'LURE') continue;
      if (g.elite && src === 'stone') { g.glance = 1.6; g.glanceA = Math.atan2(y - g.y, x - g.x); setIcon(g, '흥'); continue; }
      // 발소리: 바로 돌아보지 않고 잠깐 멈칫한다 (그 사이 등 뒤에서 덮칠 수 있다)
      if (src === 'step' || src === 'whistle') nz.heard = true;
      if (src === 'whistle' && !g.dog) { gsay(g, ['누구야?', '휘파람…? 거기 누구 있어?', '뭐야, 이쪽인가?'][(g.id + (S.stats.whistles || 0)) % 3]); }
      if (src === 'step' && !g.dog && (g.state === 'PATROL' || g.state === 'RETURN')) { if (!(g.hearT > 0)) { g.hearT = S.player.mode === 'run' ? 0.3 : 0.6; setIcon(g, '?'); play('question', 0.3 * proxVol(g)); } g.hearP = { x, y }; continue; }
      goSuspicious(g, x + rnd(-20, 20), y + rnd(-20, 20), src === 'stone' ? 3 : 3.5); g.why = 'heard';
    }
  }
  setLayer(L0);
}
function goSuspicious(g, x, y, look) {
  endChat(g); g.act = null; g.bubble = null;
  if (g.lure) { g.lure.claim = null; g.lure = null; }
  if (g.state !== 'SUSPICIOUS') { setIcon(g, '?'); play('question', 0.35 * proxVol(g)); }
  g.state = 'SUSPICIOUS'; g.poi = { x, y }; g.path = null; g.wait = 0; g.waitBase = look || 3.5; g.reached = false; g.glance = 0;
}
function setIcon(g, ic) { g.icon = ic; g.iconT = 2.2; }
function proxVol(g) { return clamp(1 - dist(g.x, g.y, S.player.x, S.player.y) / 700, 0.25, 1); }

// ---------------------------------------------------------------- 경비 AI
// 멈춰 서서 둘러보기: 정면 → 한쪽 → 정면 → 반대쪽, 매번 잠깐씩 멈춰서 본다 (계속 고개를 흔들지 않는다)
function lookAround(g, dt, base, amp, hold) {
  if (g.lookT == null) { g.lookT = rnd(hold[0], hold[1]); g.lookI = 0; g.lookOff = 0; }
  g.lookT -= dt;
  if (g.lookT <= 0) { g.lookI = (g.lookI + 1) % 4; g.lookOff = [0, 1, 0, -1][g.lookI] * amp * rnd(0.8, 1.15) * (g.lookSide || (g.lookSide = Math.random() < 0.5 ? 1 : -1)); g.lookT = rnd(hold[0], hold[1]); }
  g.want = base + g.lookOff;
}
function moveAlong(g, speed, dt) {
  if (!g.path || !g.path.length) return true;
  // 비켜 걷기: 앞에 서 있는 사람은 옆으로 돌아가고, 마주 오면 서로 오른쪽으로, 같은 방향이면 속도를 맞춰 뒤따른다
  if (g.detourT > 0) g.detourT -= dt;
  if (S.guards.length > 1) {
    const p0 = g.path[0], dd = dist(g.x, g.y, p0.x, p0.y);
    if (dd > 1) {
      const ux = (p0.x - g.x) / dd, uy = (p0.y - g.y) / dd, rxv = -uy, ryv = ux; let sx = 0, sy = 0, slow = 1;
      const P = S.player, others = [P].concat(S.guards);
      for (const o of others) {
        if (o === g || o.state === 'DEAD' || o.state === 'CAPTIVE' || o.climb || o.trav || o.hide || o.vent || o.under || flOf(o) !== flOf(g) || (o.z || 0) !== (g.z || 0)) continue;
        if (o === P && (P.wire || P.jump || P.ledge)) continue;
        const ox = o.x - g.x, oy = o.y - g.y, d = Math.hypot(ox, oy); if (d > 48 || d < 0.01) continue;
        const ahead = (ox * ux + oy * uy) / d; if (ahead < 0.25) continue;
        const w = (48 - d) / 48 * ahead, oa = o === P ? Math.atan2(P.vy || 0, P.vx || 0) : o.a, om = o === P ? P.moving : o.moving;
        const rel = om ? Math.cos(angDiff(oa, Math.atan2(uy, ux))) : 0;
        if (rel > 0.55 && o !== P) { slow = Math.min(slow, Math.max(0.1, (d - 28) / 20)); continue; }  // 같은 방향: 뒤따르기
        const side = ox * rxv + oy * ryv, sg = rel < -0.55 ? 1 : side > 0 ? -1 : 1;  // 마주 오면 오른쪽, 서 있으면 반대쪽
        sx += rxv * sg * w; sy += ryv * sg * w; if (d < 30) slow = Math.min(slow, 0.55);
        // 우회 지점: 상대 옆 36px로 돌아갈 점을 경로 앞에 끼운다 (막힌 칸이면 반대쪽)
        if (!(g.detourT > 0) && d < 58) {
          const sol = g.z ? solidFor(g.z) : solidAt;
          for (const s2 of [sg, -sg]) {
            const dx = o.x + rxv * s2 * 38 + ux * 8, dy = o.y + ryv * s2 * 38 + uy * 8;
            const ex = o.x + rxv * s2 * 34 + ux * 40, ey = o.y + ryv * s2 * 34 + uy * 40;
            if (!sol(Math.floor(dx / TILE), Math.floor(dy / TILE)) && !sol(Math.floor(ex / TILE), Math.floor(ey / TILE)) && !sol(Math.floor((g.x + dx) / 2 / TILE), Math.floor((g.y + dy) / 2 / TILE))) {
              const last = g.path[g.path.length - 1];
              g.path = g.path.filter(q => q === last || dist(q.x, q.y, o.x, o.y) > 44);  // 상대가 선 칸은 건너뛴다
              g.path.unshift({ x: dx, y: dy, detour: true }, { x: ex, y: ey, detour: true }); g.detourT = 1.2; break;
            }
          }
        }
      }
      if (sx || sy) {
        const k = speed * dt * 1.1, nx = g.x + sx * k, ny = g.y + sy * k, sol = g.z ? solidFor(g.z) : solidAt;
        if (!sol(Math.floor(nx / TILE), Math.floor(ny / TILE))) { g.x = nx; g.y = ny; }
      }
      speed *= slow;
    }
  }
  let step = speed * dt;
  while (step > 0 && g.path.length) {
    const p = g.path[0]; const d = dist(g.x, g.y, p.x, p.y);
    if (d <= step) { g.x = p.x; g.y = p.y; step -= d; g.path.shift(); }
    else { const q = g.path[1] || p; g.want = Math.atan2((p.y + q.y) / 2 - g.y, (p.x + q.x) / 2 - g.x); g.x += (p.x - g.x) / d * step; g.y += (p.y - g.y) / d * step; step = 0; }
  }
  g.moving = true;
  return !g.path.length;
}
const solidAtG = (tx, ty) => solidAt(tx, ty);
function pathTo(g, x, y) {
  if (g.z) { g.path = astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), Math.floor(x / TILE), Math.floor(y / TILE), solidFor(g.z)); if (g.path.length) { const last = g.path[g.path.length - 1]; if (rLv(Math.floor(x / TILE), Math.floor(y / TILE)) === g.z) { last.x = x; last.y = y; } } return; }
  g.path = astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), Math.floor(x / TILE), Math.floor(y / TILE));
  // 쫓거나 뒤지는 중인데 길이 막혔으면 가까운 잠긴 문을 부수고 연다
  if (!g.path.length && dist(g.x, g.y, x, y) > 60 && ['ALERT', 'SEARCH', 'CHECK', 'BODY', 'SUSPICIOUS'].includes(g.state)) {
    const d = S.doors.filter(d => d.locked).sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y))[0];
    if (d && dist(d.x, d.y, g.x, g.y) < 360) {
      setDoor(d, false); play('thud', 0.6 * proxVol(g)); noise(d.x, d.y, 160, 'door');
      if (dist(d.x, d.y, S.player.x, S.player.y) < 700) toast('경비가 잠긴 문을 부수고 열었다', 2.2, 'warn');
      g.path = astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), Math.floor(x / TILE), Math.floor(y / TILE));
    }
  }
  if (g.path.length && !solidAt(Math.floor(x / TILE), Math.floor(y / TILE))) { const last = g.path[g.path.length - 1]; last.x = x; last.y = y; }
}
// ---- 높이 단계: 땅(g) · 건물 위층(f층_건물) · 옥상(r구역). 경비는 계단·배관·베란다로 단계를 옮겨 쫓는다
function lvlInit() {
  const RC = new Int32Array(MW * MH).fill(-1); let n = 0;
  for (let i = 0; i < MW * MH; i++) {
    const tx = i % MW, ty = (i / MW) | 0, z = rLv(tx, ty); if (z <= 0 || RC[i] >= 0) continue;
    const st = [i]; RC[i] = n;
    while (st.length) { const c = st.pop(), cx = c % MW, cy = (c / MW) | 0; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + ox, ny = cy + oy; if (!inMap(nx, ny)) continue; const j = ny * MW + nx; if (RC[j] < 0 && rLv(nx, ny) === z) { RC[j] = n; st.push(j); } } }
    n++;
  }
  S.lvl = { RC, ends: [] };
  for (const l of S.ladders) {
    if (l.kind === 'chimney') continue;
    const A = { fl: l.bfl || 0, z: l.bz || 0, x: l.x, y: l.y };
    const B = l.kind === 'fstair' || l.kind === 'balc' ? { fl: l.tfl, z: 0, x: l.ux, y: l.uy } : { fl: 0, z: l.tz, x: l.rx != null ? l.rx : l.ux, y: l.ry != null ? l.ry : l.uy };
    A.k = lvlKey(A); B.k = lvlKey(B); if (A.k !== B.k) S.lvl.ends.push({ l, A, B });
  }
}
function lvlKey(o) {
  const tx = Math.floor(o.x / TILE), ty = Math.floor(o.y / TILE);
  if (o.z) return 'r' + (inMap(tx, ty) ? S.lvl.RC[ty * MW + tx] : -1);
  if (o.fl) return 'f' + o.fl + '_' + bldAt(tx, ty);
  return 'g';
}
const gSpot = g => ({ fl: flOf(g), z: g.z || 0, x: g.x, y: g.y });
const pSpot = () => { const P = S.player; return { x: P.x, y: P.y, fl: flOf(P), z: P.wire || P.under || P.vent ? 0 : P.jump ? P.jump.z1 || 0 : P.z || 0 }; };
// 다음에 탈 사다리 (가장 적게 갈아타는 길의 첫 칸, 같은 연결이면 가까운 것)
function nextHop(g, fromK, toK) {
  const E = S.lvl.ends, prev = { [fromK]: null }, q = [fromK];
  while (q.length) {
    const k = q.shift(); if (k === toK) break;
    for (const e of E) for (const [a, b] of [[e.A, e.B], [e.B, e.A]]) if (a.k === k && !(b.k in prev)) { prev[b.k] = { k, e, from: a, to: b }; q.push(b.k); }
  }
  if (!(toK in prev) || !prev[toK]) return null;
  let h = prev[toK]; while (h.k !== fromK) h = prev[h.k];
  let best = h, bd = dist(g.x, g.y, h.from.x, h.from.y);
  for (const e of E) for (const [a, b] of [[e.A, e.B], [e.B, e.A]]) if (a.k === fromK && b.k === h.to.k) { const d = dist(g.x, g.y, a.x, a.y); if (d < bd) { bd = d; best = { e, from: a, to: b }; } }
  return best;
}
// 목표 지점(높이 포함)으로 길 찾기: 다른 단계면 사다리 입구로 먼저 간다
function routeTo(g, t) {
  if (!S.lvl) lvlInit();
  g.hop = null;
  if (g.civ || g.dog || t.fl == null) { pathTo(g, t.x, t.y); return; }
  const gk = lvlKey(gSpot(g)), tk = lvlKey(t);
  if (gk === tk) { pathTo(g, t.x, t.y); return; }
  const h = nextHop(g, gk, tk);
  if (!h) { pathTo(g, t.x, t.y); return; }
  g.hop = h; pathTo(g, h.from.x, h.from.y);
}
// 사다리 입구에 닿았으면 실제로 올라타(내려가) 움직인다. 올라타면 true
function hopClimb(g, arrived) {
  const h = g.hop; if (!h || g.climb) return !!g.climb;
  const d = dist(g.x, g.y, h.from.x, h.from.y);
  if (d > (arrived ? 90 : 22)) { if (arrived) g.hop = null; return false; }
  g.x = h.from.x; g.y = h.from.y;
  const lv = Math.max(Math.abs((h.to.z || 0) - (h.from.z || 0)), Math.abs((h.to.fl || 0) - (h.from.fl || 0)), 1);
  const k = h.e.l.kind, kind = k === 'fstair' || k === 'stair' ? 'stair' : 'climb';
  g.climb = { from: h.from, to: h.to, t: 0, dur: kind === 'stair' ? 0.7 : 0.25 + lv * 0.5, kind, up: (h.to.z || 0) + (h.to.fl || 0) > (h.from.z || 0) + (h.from.fl || 0) };
  g.hop = null; g.path = null;
  if (kind === 'climb') play('metal', 0.3 * proxVol(g));
  return true;
}
function updateClimbG(g, dt) {
  const c = g.climb; c.t += dt; const f = Math.min(1, c.t / c.dur);
  g.x = c.from.x + (c.to.x - c.from.x) * f; g.y = c.from.y + (c.to.y - c.from.y) * f; g.moving = true;
  if (c.kind === 'climb') g.a = c.up ? -Math.PI / 2 : Math.PI / 2;
  if (f >= 1) { g.climb = null; g.fl = c.to.fl || 0; g.z = c.to.z || 0; g.x = c.to.x; g.y = c.to.y; g.path = null; g.repath = 0; setLayer(flOf(g)); }
}
// 경계 단계: 0 평온 · 1 경계 · 2 수색 · 3 발각
const A_RANGE = [1, 1.12, 1.22, 1.3], A_SPEED = [1, 1.06, 1.12, 1.18], A_FOV = [1, 1.05, 1.12, 1.15];
const A_NAME = ['평온', '경계', '수색', '발각'];
function setAlert(lv, dur, msg) {
  if (lv >= 2 && S.alevel < 2) { S.stats.alarms++; if (CITY) setTimeout(roofCheck, 400); }
  if (lv > S.alevel) {
    S.alevel = lv; if (lv === 3) { S.unseenT = 0; if (!S.reinforced && STAGE.reinf) { S.reinforced = true; setTimeout(spawnReinforcements, 2500); } }
    if (lv >= 2) play('alarm', 0.55);
    if (STAGE.flee && lv >= 2) startFlee();
  }
  if (lv === S.alevel && dur) S.alevelT = Math.max(S.alevelT, dur);
  if (msg) toast(msg, 3, 'warn');
}
// 수색이 시작되면 가까운 경비 둘이 배관·계단으로 옥상에 올라가 둘러본다
function roofCheck() {
  if (!S || S.over) return; if (!S.lvl) lvlInit();
  const tops = S.lvl.ends.filter(e => e.A.k === 'g' && e.B.z > 0), used = new Set(), P = S.player;
  const cand = S.guards.filter(g => !g.civ && !g.dog && !g.target && !g.elite && !(g.z || 0) && !flOf(g) && ['PATROL', 'RETURN', 'SUSPICIOUS', 'SEARCH'].includes(g.state));
  let n = 0;
  for (const g of cand.sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))) {
    if (n >= 2) break;
    const e = tops.filter(e => !used.has(e)).sort((a, b) => dist(g.x, g.y, a.A.x, a.A.y) - dist(g.x, g.y, b.A.x, b.A.y))[0];
    if (!e || dist(g.x, g.y, e.A.x, e.A.y) > 640) continue;
    used.add(e); n++;
    g.state = 'SEARCH'; g.poi = { x: e.B.x, y: e.B.y - 30, fl: 0, z: e.B.z }; g.reached = false; g.path = null; g.waitBase = 4; setIcon(g, '?'); gsay(g, '옥상도 확인해!');
  }
}
const distracted = g => !!(g.chat || g.act === 'smoke' || g.act === 'yawn' || g.act === 'pickup');
function spawnReinforcements() {
  if (!S || S.over) return;
  const P = S.player, [rx, ry] = STAGE.reinf;
  const lt = [Math.floor(P.x / TILE), Math.floor(P.y / TILE)];
  for (let k = 0; k < D().reinf; k++) {
    const g = makeGuard({ kind: 'g2', route: [[rx, ry, 2], [lt[0], lt[1], 3]] }, S.guards.length);
    g.x += k * 30; g.reinf = true; buildRouteLine(g);
    if (S.alevel >= 2) { g.state = 'SEARCH'; g.poi = { x: P.x, y: P.y }; g.reached = false; g.waitBase = 3; g.icon = '!'; g.iconT = 2; }
    S.guards.push(g);
  }
  play('alarm', 0.5); toast(`증원 경비 ${D().reinf}명이 도착했다`, 3, 'warn');
}
function guardFov(g) { if (g.civ) return 0.55; if (g.dog) return 1.15; return (g.state === 'ALERT' ? 0.66 : 0.5) * A_FOV[S.alevel] * (distracted(g) ? (g.act === 'pickup' ? 0.4 : 0.6) : 1) * (g.elite ? 1.1 : 1); }
function guardRanges(g) {
  if (g.civ) return { lit: 175 * D().range, dark: 62 * D().range };
  if (g.dog) return { lit: 170 * D().range, dark: 85 * D().range };
  const m = D().range * A_RANGE[S.alevel] * (g.state === 'SUSPICIOUS' || g.state === 'ALERT' || g.state === 'CHECK' ? 1.1 : 1) * (g.target ? 0.85 : 1);
  const dm = distracted(g) ? 0.65 : 1;
  return { lit: 250 * m * dm, dark: 95 * m * dm * (S.mod === 'bright' ? 1.5 : 1) };
}
// elev = 대상이 지붕 위 (경비는 위를 잘 올려다보지 않는다)
function canSee(g, x, y, light, hidden, sneak, elev) {
  // 높이: 지붕 밑(건물 안)에서는 지붕 위를 못 보고, 지붕 위에서는 지붕 밑을 못 본다
  const gz = g.z || 0; elev = elev || 0;
  if (elev > gz && !gz && roofAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE))) return 0;
  if (gz && elev < gz && !elev && roofAt(Math.floor(x / TILE), Math.floor(y / TILE))) return 0;
  const ign = elev || gz; elev = elev > gz ? elev - gz : 0;
  const d = dist(g.x, g.y, x, y);
  const r = guardRanges(g);
  const watch = g.lookout && elev;  // 감시병: 지붕 위 사람은 하늘을 배경으로 실루엣이 드러난다
  let eff = r.dark + (r.lit - r.dark) * (watch ? Math.max(light, 0.6) : light);
  if (hidden) eff = Math.min(eff, 36);
  if (elev) eff *= g.lookout ? (elev >= 3 ? 0.8 : 1.05) : elev >= 3 ? 0.35 : elev >= 2 ? 0.45 : 0.55;  // 감시병은 지붕을 본다
  if (g.elite) eff *= 1.1;
  if (sneak === 2) eff *= 0.42;  // 벽에 기댐: 몸을 붙여 훨씬 덜 보인다
  if (d > eff) return 0;
  const near = !elev && (d < 24 || (!sneak && !hidden && d < 34));
  if (!near && Math.abs(angDiff(g.a, Math.atan2(y - g.y, x - g.x))) > guardFov(g)) return 0;
  if (!los(g.x, g.y, x, y, ign)) return 0;
  // 쉐도우 택틱스식 줄무늬 구역: 시야 바깥쪽 45%에서는 웅크리면 보이지 않는다
  if (sneak && !watch && g.state !== 'ALERT' && d > eff * 0.55) return 0;
  // 코만도스식 낮은 엄폐: 모래주머니 바로 뒤에서 웅크리면 가려진다
  if (sneak && !elev && lowCovered(g.x, g.y, x, y)) return 0;
  return 1 - d / eff;
}
// 지금 내가 얼마나 드러나 있나: 0 숨음(누가 돌아봐도 안 보인다) · 1 들킬 수 있음(누가 이쪽을 보면 보인다) · 2 보이고 있다
function exposure() {
  const P = S.player;
  if (S.guards.some(g => g.seen && g.state !== 'DEAD' && g.state !== 'CAPTIVE')) return 2;
  if (P.hide || P.under || P.vent || P.ledge) return 0;
  const pv = (P.trav && P.trav.base) || P, sneak = P.cover ? 2 : P.mode === 'sneak' && !P.trav, elev = P.jump ? Math.max(1, P.z) : P.trav ? P.trav.elev || 0 : P.z;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.state === 'TERROR' || g.climb || g.doomed) continue;
    if (flOf(g) !== flOf(P) || (flOf(P) && P.wire) || dist(g.x, g.y, pv.x, pv.y) > 560) continue;
    const gg = Object.create(g); gg.a = Math.atan2(pv.y - g.y, pv.x - g.x);  // 이쪽으로 돌아본다면
    if (canSee(gg, pv.x, pv.y, P.light, P.hidden, sneak, elev) > 0) return 1;
  }
  return 0;
}
function lowCovered(x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1); if (d < 50) return false;
  const ux = (x0 - x1) / d, uy = (y0 - y1) / d;
  for (let s = 10; s <= 66; s += 8) { const t = tileAt(x1 + ux * s, y1 + uy * s); if (t === 'Z' || t === 'A' || t === 'K') return true; }
  return false;
}
const spdMul = () => A_SPEED[S.alevel] * D().spd * (STAGE.gspd || 1);

// 주민: 싸우지 않는다. 보거나 시체를 보면 비명을 질러 자경대원을 부르고 달아난다
function civWake(g, x, y) { g.state = 'PATROL'; g.meter = Math.max(g.meter, 0.45); g.want = Math.atan2(y - g.y, x - g.x); setIcon(g, '!?'); play('question', 0.3 * proxVol(g)); }
function civScream(g, x, y) {
  if (g.state === 'PANIC') return;
  endChat(g); g.state = 'PANIC'; g.panicT = rnd(6, 9); g.fear = { x, y }; g.path = null; g.cowered = false; g.meter = 1; S.stats.screams = (S.stats.screams || 0) + 1;
  say([[g, ['도둑이야!', '누, 누구세요!', '사람 살려!'][(Math.random() * 3) | 0]]]);
  play('call', 0.7 * proxVol(g), 1.6); noise(g.x, g.y, 380, 'scream', flOf(g));
  for (const o of S.guards) { if (o.civ || o.dog || o.target || ['DEAD', 'CAPTIVE', 'ALERT', 'FLEE', 'TERROR'].includes(o.state)) continue; if (flOf(o) !== flOf(g) && dist(o.x, o.y, g.x, g.y) < 520) goSuspicious(o, g.x + rnd(-30, 30), g.y + rnd(-30, 30), 5); }
  setAlert(2, 30, '주민이 비명을 질렀다 — 자경대원이 몰려온다');
}
// 사람끼리 겹치지 않게: 가까우면 서로 밀어낸다 (벽 안으로는 밀지 않는다). 나도 사람을 뚫고 지나가지 못한다
// CCTV: 좌우로 천천히 돌며(끝에서 잠깐 멈춤) 빨간 시야 안의 나·시체를 찍는다. 다트로 부수거나, 두꺼비집·전체 조명을 내리면 꺼진다
const camOn = c => !c.broken && !(c.outdoor ? !S.lightsOn : (S.bfuses || []).some(f => f.b === c.b && f.cut));
const CAM_FOV = 0.42;
function camRange(c, light) { return light > 0.3 ? 300 : 135; }
function updateCams(dt) {
  const P = S.player, L0 = CUR_F;
  for (const c of S.cams || []) {
    if (!camOn(c)) { c.meter = Math.max(0, c.meter - dt); continue; }
    const s = Math.sin((S.t + c.ph) * TAU / c.period); c.a = c.base + c.sweep * clamp(s * 1.35, -1, 1);
    if (c.cool > 0) { c.cool -= dt; continue; }
    setLayer(c.fl);
    const sees = (x, y, light) => { const d = dist(c.x, c.y, x, y); if (d > camRange(c, light)) return 0; if (Math.abs(angDiff(c.a, Math.atan2(y - c.y, x - c.x))) > CAM_FOV) return 0; if (castRay(c.x, c.y, Math.atan2(y - c.y, x - c.x), d) < d - 6) return 0; return 1 - d / 360; };
    let v = 0;
    if (flOf(P) === c.fl && !P.hide && !P.under && !P.vent && !P.z && !P.wire) v = sees(P.x, P.y, P.light);
    c.seen = v > 0;
    if (v > 0) { c.meter = Math.min(1, c.meter + dt * (0.9 + v * 1.8) * (S.player.disguise && !S.player.disguiseBlown && S.player.mode !== 'run' ? 0.12 : 1)); if (c.meter >= 1) {
      c.meter = 0; c.cool = 6; play('alarm', 0.4); setAlert(2, 40, 'CCTV에 찍혔다 — 자경대원이 몰려온다');
      for (const g of S.guards) if (!g.civ && !g.dog && flOf(g) === c.fl && !['DEAD', 'CAPTIVE', 'ALERT'].includes(g.state) && dist(g.x, g.y, c.x, c.y) < 800) goSuspicious(g, P.x, P.y, 5);
    } } else c.meter = Math.max(0, c.meter - dt * 0.4);
    for (const k of S.corpses) { if (k.stashed || k.carried || k.discovered || k.camSeen || flOf(k) !== c.fl) continue; if (k.accident && sees(k.x, k.y, Math.max(0.5, k.light || 0))) { k.camSeen = true; continue; }  // 사고로 보이는 시체는 CCTV도 경보를 울리지 않는다
      if (sees(k.x, k.y, Math.max(0.5, k.light || 0))) { k.camSeen = true; k.discovered = true; S.stats.bodies++; setAlert(2, 40, 'CCTV에 쓰러진 사람이 찍혔다 — 수색 시작'); for (const g of S.guards) if (!g.civ && !g.dog && flOf(g) === c.fl && !['DEAD', 'CAPTIVE', 'ALERT'].includes(g.state) && dist(g.x, g.y, k.x, k.y) < 900) goSuspicious(g, k.x, k.y, 6); } }
  }
  setLayer(L0);
  if ((S.cams || []).some(c => camOn(c) && c.fl === flOf(P) && dist(c.x, c.y, P.x, P.y) < 420)) hint('cctv', 'CCTV: 빨간 시야가 좌우로 천천히 돈다. 끝에서 잠깐 멈춘다. 찍히면 경보. 다트로 부수거나 두꺼비집을 내리면 꺼진다. 부서진 카메라를 경비가 보면 의심한다');
}
function drawCams(fl) {
  for (const c of S.cams || []) {
    if (c.fl !== fl) continue; const on = camOn(c);
    if (on) {
      setLayer(fl); const pts = []; const R = camRange(c, 1); for (let i = 0; i <= 14; i++) { const a = c.a - CAM_FOV + 2 * CAM_FOV * i / 14; pts.push([a, castRay(c.x, c.y, a, R)]); } setLayer(flOf(S.player));
      const path = r => { ctx.beginPath(); ctx.moveTo(c.x, c.y); for (const [a, d] of pts) { const dd = Math.min(d, r); ctx.lineTo(c.x + Math.cos(a) * dd, c.y + Math.sin(a) * dd); } ctx.closePath(); };
      ctx.fillStyle = `rgba(255,60,60,${0.17 + c.meter * 0.2})`; path(R); ctx.fill();  // CCTV 시야: 경비 원뿔만큼 또렷하게
      ctx.fillStyle = `rgba(255,60,60,${0.24 + c.meter * 0.25})`; path(135); ctx.fill();
      ctx.strokeStyle = `rgba(255,110,110,${0.85 + c.meter * 0.15})`; ctx.lineWidth = 2.2; ctx.setLineDash([5, 5]); path(R); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-7, -5, 20, 12); ctx.fillStyle = c.broken ? '#4a4d55' : '#d8dbe2'; ctx.fillRect(-9, -6, 18, 11); ctx.fillStyle = '#2a2d34'; ctx.fillRect(7, -4, 5, 7);
    ctx.fillStyle = c.broken ? '#666' : on && Math.floor(S.t * 2) % 2 ? '#ff3b3b' : '#601818'; ctx.beginPath(); ctx.arc(-4, 0, 2.2, 0, TAU); ctx.fill(); ctx.restore();
    if (c.broken && Math.random() < 0.05) S.fx.push({ k: 'smoke', x: c.x, y: c.y, t: 0 });
    if (c.meter > 0.02 && on) { ctx.strokeStyle = 'rgba(255,90,90,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * c.meter); ctx.stroke(); }
  }
}
function separateBodies(dt) {
  const R = 26, L = S.guards.filter(g => g.state !== 'DEAD' && g.state !== 'CAPTIVE' && !g.doomed), k = Math.min(1, dt * 6), L0 = CUR_F;
  const push = (o, dx, dy) => { setLayer(flOf(o)); const sol = o.z ? solidFor(o.z) : solidAt, nx = o.x + dx, ny = o.y + dy; if (!sol(Math.floor(nx / TILE), Math.floor(o.y / TILE))) o.x = nx; if (!sol(Math.floor(o.x / TILE), Math.floor(ny / TILE))) o.y = ny; };
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j]; if (flOf(a) !== flOf(b) || (a.z || 0) !== (b.z || 0) || a.climb || b.climb) continue;
    let dx = b.x - a.x, dy = b.y - a.y; if (Math.abs(dx) > R || Math.abs(dy) > R) continue;
    let d = Math.hypot(dx, dy); if (d >= R) continue; if (d < 0.01) { dx = Math.cos(a.id + j); dy = Math.sin(a.id + j); d = 1; }
    const m = (R - d) / 2 * k / d; push(a, -dx * m, -dy * m); push(b, dx * m, dy * m);
  }
  const P = S.player;
  if (!P.hide && !P.wire && !P.jump && !P.vent && !P.under && !P.trav && !P.ledge) for (const g of L) {
    if (flOf(g) !== flOf(P) || (g.z || 0) !== (P.z || 0) || g.climb || g === P.captive) continue; let dx = P.x - g.x, dy = P.y - g.y; if (Math.abs(dx) > 24 || Math.abs(dy) > 24) continue;
    const d = Math.hypot(dx, dy) || 1; if (d >= 24) continue; const m = (24 - d) / d * Math.min(1, dt * 10); push(g, -dx * m, -dy * m);
  }
  setLayer(L0);
}
function updateCiv(g, dt) {
  const P = S.player; g.moving = false;
  if (g.iconT > 0) { g.iconT -= dt; if (g.iconT <= 0) g.icon = null; }
  const sameF = flOf(g) === flOf(P) && !P.wire;
  if (!g.club && sameF && dist(g.x, g.y, P.x, P.y) < 220) hint('civ2', '주민은 조직원이 아니다. 길·계단실·가게·클럽 같은 공용 공간에서 마주치는 건 상관없다. 자기 집(세대) 안에 들어온 낯선 사람, 사람을 해치거나 끌고 가는 모습, 시체를 보면 비명을 질러 조직원을 부른다');
  if (g.club && sameF && dist(g.x, g.y, P.x, P.y) < 220) hint('crowd', '군중: 걷거나 살금살금 다니면 사람들 사이에 섞여 자경대원 눈에 잘 안 띄고, 음악에 소리도 묻힌다. 뛰면 소용없다. 손님도 쓰러진 사람을 보면 비명을 지른다');
  if (g.state === 'SLEEP') {
    g.seen = false;
    if (sameF && !P.hide && dist(g.x, g.y, P.x, P.y) < (P.mode === 'run' ? 100 : P.mode === 'walk' ? 55 : 0)) civWake(g, P.x, P.y);
    return;
  }
  if (g.state === 'PANIC') {
    if ((!g.path || !g.path.length) && !g.cowered) { const a = Math.atan2(g.y - g.fear.y, g.x - g.fear.x); pathTo(g, g.x + Math.cos(a) * 160, g.y + Math.sin(a) * 160); g.cowered = true; }
    moveAlong(g, SPD.flee * 0.8, dt); g.panicT -= dt; g.icon = '!'; g.iconT = 0.5;
    if (g.panicT <= 0) { g.state = 'PATROL'; g.cowered = false; g.meter = 0.3; g.path = null; g.icon = null; g.wait = 0; }
  } else {
    // 일반 주민은 조직원이 아니다: 길에서 마주친 사람은 신경 쓰지 않는다.
    // 비명을 지르는 건 ① 자기 집 안에 들어온 낯선 사람 ② 사람을 끌고 가거나 붙잡고 있거나 막 해치는 모습 (③ 시체는 아래에서 따로)
    const gb = bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)), pb = bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
    const H = g.home, ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
    g.wary = !!(H && gb === H.b && pb === H.b && flOf(P) === H.fl && !P.z && !P.wire && ptx >= H.x0 && ptx <= H.x1 && pty >= H.y0 && pty <= H.y1) || !!(P.carrying || P.captive || P.strikeT > 0);
    const vis0 = (P.hide || P.under || P.vent || !sameF) ? 0 : canSee(g, P.x, P.y, P.light, P.hidden, P.mode === 'sneak', P.jump ? Math.max(1, P.z) : P.z);
    if (vis0 > 0 && !g.wary && dist(g.x, g.y, P.x, P.y) < 110 && Math.random() < dt * 0.6) g.want = Math.atan2(P.y - g.y, P.x - g.x);  // 힐끔 쳐다볼 뿐
    const vis = g.wary ? vis0 : 0;
    g.seen = vis > 0;
    if (g.seen) { g.meter = Math.min(1, g.meter + D().rate * (0.35 + vis * 1.4) * (g.club ? 0.35 : 1) * dt); g.want = Math.atan2(P.y - g.y, P.x - g.x); if (!g.icon) setIcon(g, '?'); if (g.meter >= 1) { civScream(g, P.x, P.y); return; } }
    else g.meter = Math.max(0, g.meter - dt * 0.25);
    for (const c of S.corpses) { if (c.stashed || c.carried || c.hidden || c.civSeen || flOf(c) !== flOf(g)) continue; if (canSee(g, c.x, c.y, Math.max(0.45, c.light), false, false, false) > 0) { c.civSeen = true; if (c.accident) { setIcon(g, '!?'); continue; } civScream(g, c.x, c.y); return; } }
    if (g.seen && g.chat) endChat(g);
    if (!g.seen && g.chat) { const o = g.chat.with; g.want = Math.atan2(o.y - g.y, o.x - g.x); g.path = null; if (o.state !== 'PATROL' || dist(g.x, g.y, o.x, o.y) > 220) endChat(g); }
    else if (!g.seen) {
      if (g.wander) {  // 군중: 구역 안에서 이리저리
        if (g.wait > 0) g.wait -= dt;
        else { if (!g.path) { const [x0, y0, x1, y1] = g.wander; for (let t = 0; t < 8; t++) { const tx = x0 + Math.floor(Math.random() * (x1 - x0 + 1)), ty = y0 + Math.floor(Math.random() * (y1 - y0 + 1)); if (!solidAt(tx, ty)) { pathTo(g, tc(tx), tc(ty)); break; } } if (!g.path) g.wait = 1; }
          if (g.path && moveAlong(g, SPD.gPatrol * 0.7, dt)) { g.wait = rnd(1.5, 5); g.path = null; g.want = g.a + rnd(-2, 2); } }
      } else if (g.route.length > 1) { const wp = g.route[g.ri] || g.route[(g.ri = 0)]; if (g.wait > 0) g.wait -= dt; else { if (!g.path) pathTo(g, wp.x, wp.y); if (moveAlong(g, SPD.gPatrol * 0.8, dt)) { g.wait = wp.pause; g.ri = (g.ri + 1) % g.route.length; g.path = null; } } }
      else { g.glanceT -= dt; if (g.glanceT <= 0) { g.glanceT = rnd(8, 16); g.want = (g.post != null ? g.post : g.a) + rnd(-0.9, 0.9); } }
    }
  }
  const tr = (g.state === 'PANIC' ? 4 : 1.8) * dt; g.a += clamp(angDiff(g.a, g.want), -tr, tr);
}
const NOTICE_AT = 0.35;  // 이 아래(흰색)는 '눈치' 단계, 넘으면 노랑(의심 — 멈춰 보고 확인하러 온다), 1이면 빨강(발각)
const awareCol = g => g.state === 'ALERT' ? '#ff4a3c' : g.meter >= NOTICE_AT || ['SUSPICIOUS', 'SEARCH', 'NOTICE', 'CHECK', 'BODY'].includes(g.state) ? '#f2c46b' : '#f4f1ea';
function updateGuard(g, dt) {
  if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.doomed) { if (g.doomed) g.moving = false; return; }
  if (g.civ) { updateCiv(g, dt); return; }
  if (g.climb) { g.seen = false; if (g.iconT > 0) g.iconT -= dt; updateClimbG(g, dt); if (g.state === 'ALERT' && S.player) g.lostT = 0; return; }
  const P = S.player;
  g.moving = false;
  if (g.iconT > 0) { g.iconT -= dt; if (g.iconT <= 0 && g.state !== 'ALERT') g.icon = null; }
  if (radioBusy(g)) { g.lastSeen = pSpot(); g.lostT = 0; g.path = null; return; }  // 무전 보고 중: 멈춰 선다
  const spd = (g.target ? SPD.target : SPD.gPatrol * (S.alevel ? 1 : 0.85) * (g.dog ? 1.25 : 1)) * spdMul();
  if (S.alevel && (g.chat || g.act)) { endChat(g); g.act = null; }
  // 공포: 겁에 질려 달아난다. 주변을 못 보고, 가까운 동료를 잘못 벨 수 있다
  if (g.state === 'TERROR') {
    g.seen = false; g.terrorT -= dt;
    if (!g.path || !g.path.length) { const a = Math.atan2(g.y - g.fearFrom.y, g.x - g.fearFrom.x) + rnd(-0.6, 0.6); pathTo(g, g.x + Math.cos(a) * 220, g.y + Math.sin(a) * 220); }
    moveAlong(g, SPD.flee * spdMul(), dt);
    if (!g.slashed && !g.dog) for (const o of S.guards) {
      if (o === g || o.state === 'DEAD' || o.state === 'CAPTIVE' || dist(o.x, o.y, g.x, g.y) > 40) continue;
      g.slashed = true;
      if (Math.random() < 0.35) { killGuard(o, null, null, false); S.stats.kills--; if (!o.target) S.stats.extraKills--; S.stats.friendly = (S.stats.friendly || 0) + 1; if (dist(g.x, g.y, P.x, P.y) < 800) toast('겁에 질린 경비가 동료를 베었다!', 2.4, 'good'); }
      break;
    }
    if (g.terrorT <= 0) { g.state = 'SEARCH'; g.poi = { x: g.fearFrom.x, y: g.fearFrom.y }; g.reached = false; g.path = null; g.waitBase = 3; setIcon(g, '?'); }
    return;
  }

  const sameF = flOf(g) === flOf(P) && !(flOf(P) && P.wire);
  const pv = (P.trav && P.trav.base) || P, onLedge = P.ledge && (g.z || 0) === (P.z || 0);
  let vis = (P.hide || P.under || P.vent || !sameF || onLedge) ? 0 : canSee(g, pv.x, pv.y, P.light, P.hidden, P.cover ? 2 : P.mode === 'sneak' && !P.trav, P.jump ? Math.max(1, P.z) : P.trav ? P.trav.elev || 0 : P.z);
  if (g.dog && sameF && !vis && !P.hide && !P.under && !P.vent && !P.z && !P.jump && dist(g.x, g.y, P.x, P.y) < 100 && los(g.x, g.y, P.x, P.y)) vis = 0.5;  // 냄새
  g.seen = vis > 0; g.sense = null;
  if (g.seen && g.state !== 'FLEE') {
    // 어쌔신 크리드식 발견: 한 번에 들키지 않고 게이지가 찬다. 보통 거리 2~3초, 코앞·밝은 곳은 1초 남짓
    const wary = ['SUSPICIOUS', 'SEARCH', 'NOTICE', 'CHECK', 'BODY'].includes(g.state);
    const rate = disguiseMul(g) * D().rate * (0.08 + vis * 0.6) * (P.carrying || P.captive ? 1.8 : 1) * (g.state === 'SUSPICIOUS' || g.state === 'SEARCH' ? 1.3 : 1) * (P.mode !== 'run' && !P.carrying && inCrowd(P.x, P.y, flOf(P)) ? 0.35 : 1);
    g.meter = Math.min(1, g.meter + rate * dt); g.holdT = 0.8;
    if (g.state !== 'ALERT') {
      if (g.meter >= 1) goAlert(g);
      else if (g.meter < NOTICE_AT && !wary) g.sense = Math.atan2(P.y - g.y, P.x - g.x);  // 흰색: 아직 확신이 없다 — 하던 걸 하며 고개만 돌린다
      else if (g.state !== 'NOTICE') {
        if (g.state !== 'SUSPICIOUS') { setIcon(g, '?'); play('question', 0.35); }
        endChat(g); g.act = null; g.bubble = null;
        g.state = 'NOTICE'; g.poi = { x: P.x, y: P.y }; g.noticeT = 0; g.why = 'saw';
      } else g.poi = { x: P.x, y: P.y };
    }
  } else if (g.state !== 'ALERT') { if (g.holdT > 0) g.holdT -= dt; else g.meter = Math.max(0, g.meter - dt * 0.3); }  // 시야에서 벗어나도 잠깐은 게이지가 남는다
  const sx0 = g.x, sy0 = g.y;
  if (g.hearT > 0) {
    if (g.state !== 'PATROL' && g.state !== 'RETURN') g.hearT = 0;
    else { g.hearT -= dt; if (g.hearT > 0) return; g.hearT = 0; goSuspicious(g, g.hearP.x + rnd(-20, 20), g.hearP.y + rnd(-20, 20), 3.5); g.why = 'heard'; }
  }

  if ((g.state === 'PATROL' || g.state === 'RETURN') && !g.dog && S.decals.length && (g.bloodT = (g.bloodT || 0) - dt) <= 0) {  // 핏자국을 보면 다가가 살핀다
    g.bloodT = 0.35;
    for (const d of S.decals) { if (d.seen || flOf(d) !== flOf(g) || (g.z || 0) || dist(g.x, g.y, d.x, d.y) > 170) continue;
      if (canSee(g, d.x, d.y, Math.max(0.45, lightAt(d.x, d.y)), false, false, 0) > 0) { d.seen = true; goSuspicious(g, d.x, d.y, 5); g.why = 'saw'; gsay(g, ['피…? 이게 뭐야.', '바닥에 피가 있어.', '누가 다쳤나?'][g.id % 3]); setAlert(1, 20); break; } }
  }
  if ((g.state === 'PATROL' || g.state === 'RETURN') && !g.dog && !g.target && S.vents.length) {
    for (const v of S.vents) if (v.open && !v.roof && dist(g.x, g.y, v.x, v.y) < 150 && Math.abs(angDiff(g.a, Math.atan2(v.y - g.y, v.x - g.x))) < guardFov(g) && los(g.x, g.y, v.x, v.y)) {
      v.open = false; goSuspicious(g, v.x, v.y, 3); if (dist(g.x, g.y, P.x, P.y) < 600) toast('경비가 열린 환풍구 창살을 보고 다가간다', 2.2, 'warn'); break;
    }
  }
  if (g.state !== 'ALERT' && g.state !== 'BODY' && g.state !== 'FLEE' && !g.target) {
    for (const c of S.corpses) {
      if ((c.hidden && !g.dog) || c.discovered || c.carried || c.stashed || flOf(c) !== flOf(g)) continue;
      if (canSee(g, c.x, c.y, c.light, false, false, false) > 0 || (g.dog && dist(g.x, g.y, c.x, c.y) < 90)) { if (g.dog) { play('bark', 0.5 * proxVol(g)); noise(g.x, g.y, 260, 'bark'); } g.state = 'BODY'; g.body = c; g.path = null; setIcon(g, '!?'); play('question', 0.5); break; }
    }
  }

  switch (g.state) {
    case 'PATROL': {
      if (g.relight) {
        const l = g.relight.l; g.want = Math.atan2(l.y - g.y, l.x - g.x); g.relight.t -= dt;
        if (g.relight.t <= 0) { l.off = false; g.relight = null; g.icon = null; play('switch', 0.4 * proxVol(g)); for (const c of S.corpses) c.light = lightAt(c.x, c.y); if (dist(g.x, g.y, P.x, P.y) < 700) toast('경비가 꺼진 조명을 다시 켰다', 2); setAlert(1, 20); }
        break;
      }
      g.lampScan = (g.lampScan || 0) - dt;
      if (g.lampScan <= 0 && !g.target) {
        g.lampScan = 0.6;
        const l = g.dog ? null : S.lamps.find(l => l.off && !l.broken && !l.cold && l.cut == null && flOf(l) === flOf(g) && dist(l.x, l.y, g.x, g.y) < 95 && los(g.x, g.y, l.x, l.y));
        if (l) { g.relight = { l, t: 1.8 }; g.path = null; setIcon(g, '?'); break; }
        const bc = g.dog ? null : (S.cams || []).find(c => c.broken && !c.noticed && c.fl === flOf(g) && dist(c.x, c.y, g.x, g.y) < 170 && los(g.x, g.y, c.x, c.y));
        if (bc) { bc.noticed = true; goSuspicious(g, bc.x, bc.y + 30, 4); bark(g, 'calm'); if (dist(g.x, g.y, S.player.x, S.player.y) < 700) toast('자경대원이 부서진 CCTV를 발견했다', 2.2, 'warn'); break; }
      }
      if (g.follow != null) { followLeader(g, dt, spd); break; }
      if (!g.elite && !g.target && !g.dog && S.lures.length) {
        g.lureScan = (g.lureScan || 0) - dt;
        if (g.lureScan <= 0) {
          g.lureScan = 0.4;
          const l = S.lures.find(l => !l.claim && l.landed && flOf(l) === flOf(g) && canSee(g, l.x, l.y, Math.max(0.5, lightAt(l.x, l.y)), false, false, 0) > 0);
          if (l) { endChat(g); g.act = null; l.claim = g; g.lure = l; g.state = 'LURE'; g.path = null; g.lureT = null; setIcon(g, '?'); break; }
        }
      }
      if (g.chat) {
        const o = g.chat.with; g.want = Math.atan2(o.y - g.y, o.x - g.x); g.bubble = null;
        if (o.state !== 'PATROL' || dist(g.x, g.y, o.x, o.y) > 200) endChat(g);
        break;
      }
      if (g.glance > 0) { g.glance -= dt; g.want = g.glanceA; if (g.glance <= 0) g.glanceT = g.elite ? rnd(5, 9) : S.alevel ? rnd(3.5, 7) : rnd(14, 26); break; }
      if (S.alevel >= 1 && !g.target && g.post == null) {
        g.peekT = (g.peekT == null ? rnd(6, 14) : g.peekT) - dt;
        if (g.peekT <= 0) { g.peekT = S.alevel >= 2 ? rnd(8, 14) : rnd(16, 26); if (startCheck(g, { x: g.x, y: g.y }, 1, 230)) break; }
      }
      if (g.wait > 0) {
        g.wait -= dt;
        // 딴짓: 담배 · 하품 (평상시에만)
        if (g.act) {
          g.actT -= dt; g.bubble = g.act === 'smoke' ? '후—' : '하암';
          if (g.actT <= 0) { g.act = null; g.bubble = null; g.idleT = rnd(10, 22); }
        } else if (!S.alevel && !g.target && !g.elite && !g.dog) {
          g.idleT = (g.idleT == null ? rnd(4, 14) : g.idleT) - dt;
          if (g.idleT <= 0) { g.act = Math.random() < 0.6 ? 'smoke' : 'yawn'; g.actT = g.act === 'smoke' ? rnd(5, 8) : rnd(1.6, 2.4); }
        }
        if (g.post != null) {
          g.want = g.act === 'smoke' ? g.post + 0.5 : g.post;
          g.glanceT -= dt; if (g.glanceT <= 0 && !g.act && !g.still) { g.glance = rnd(1.4, 2.2); g.glanceA = g.post + (Math.random() < 0.3 ? Math.PI : (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2); }
        } else if (!g.act && !g.still) lookAround(g, dt, g.waitBase, 1.1, [1.8, 3.2]);
        break;
      }
      const wp = g.route[g.ri] || g.route[(g.ri = 0)];
      if (!g.path) pathTo(g, wp.x, wp.y);
      g.glanceT -= dt;
      if (g.glanceT <= 0 && g.route.length > 1 && !g.still) { g.glance = rnd(2.2, 3.2); g.glanceA = g.a + Math.PI; break; }  // 걷다가 멈춰 뒤돌아보기
      if (moveAlong(g, spd, dt)) {
        g.wait = wp.pause * (S.alevel ? 1 : 1.8); g.waitBase = g.a; g.waitT = 0; g.path = null; g.lookT = null;
        if (g.route.length > 1) g.ri = (g.ri + 1) % g.route.length; else g.wait = 999;
      }
      break;
    }
    case 'LURE': {
      const l = g.lure;
      if (!l) { g.state = 'RETURN'; break; }
      if (g.lureT == null) {
        if (!g.path) pathTo(g, l.x, l.y);
        if (moveAlong(g, SPD.gSusp, dt) || dist(g.x, g.y, l.x, l.y) < 30) { g.lureT = 3.4; g.act = 'pickup'; g.path = null; }
      } else {
        g.want = Math.atan2(l.y - g.y, l.x - g.x); g.bubble = '엽전?'; g.lureT -= dt;
        if (g.lureT <= 0) { S.lures = S.lures.filter(o => o !== l); g.lure = null; g.act = null; g.bubble = null; g.state = 'RETURN'; g.path = null; }
      }
      break;
    }
    case 'NOTICE': {
      g.want = Math.atan2(g.poi.y - g.y, g.poi.x - g.x);
      if (!g.seen) { g.noticeT += dt; if (g.noticeT > 0.9 || g.meter <= 0) goSuspicious(g, g.poi.x, g.poi.y, 4); }
      break;
    }
    case 'SUSPICIOUS': case 'SEARCH': {
      if (!g.reached) {
        if (!g.path) routeTo(g, g.poi);
        const arr = moveAlong(g, SPD.gSusp * spdMul(), dt) || !g.path.length;
        if (hopClimb(g, arr)) break;
        if (arr) { g.reached = true; g.wait = g.waitBase; g.waitBase2 = g.a; g.waitT = 0; g.path = null; g.lookT = null; }
      } else {
        g.waitT += dt; lookAround(g, dt, g.waitBase2, 1.4, [0.9, 1.5]);
        g.wait -= dt;
        if (g.wait <= 0) {
          if (S.alevel >= 2 && !g.target) startCheck(g, g.poi, 4); else { g.state = 'RETURN'; g.path = null; g.icon = null; }
        }
      }
      break;
    }
    case 'CHECK': {
      const spot = g.checks[0];
      if (!spot || g.z || flOf(g) !== g.homeFl) { g.state = 'RETURN'; g.path = null; g.icon = null; break; }
      if (g.inspect == null) {
        if (!g.path) pathTo(g, spot.x, spot.y);
        if (moveAlong(g, SPD.gSusp * spdMul(), dt) || dist(g.x, g.y, spot.x, spot.y) < 54) { g.path = null; g.inspect = 1.6; setIcon(g, '?'); }
      } else {
        g.want = Math.atan2(spot.y - g.y, spot.x - g.x);
        g.inspect -= dt;
        if (g.inspect <= 0) {
          g.inspect = null; g.checks.shift();
          const inThis = (P.hide && P.hide === spot) || (spot.type === 'bush' && P.hidden && dist(P.x, P.y, spot.x, spot.y) < 44);
          if (inThis) { dragOut(g, spot.type === 'bush' ? '덤불을 헤치던 경비에게 들켰다.' : spot.type === 'well' ? '우물 안을 비추던 경비에게 들켰다.' : `${hideIn(spot)}을 뒤지던 경비에게 들켰다.`); if (S.over) return; break; }
          if (spot.bodies > 0 && !spot.found) { spot.found = true; S.stats.bodies++; setIcon(g, '!?'); setAlert(2, 35, '숨겨둔 시체가 발견됐다'); }
          if (spot.type === 'bush') for (const c of S.corpses) if (c.hidden && !c.discovered && !c.stashed && dist(c.x, c.y, spot.x, spot.y) < 50) { c.discovered = true; c.hidden = false; S.stats.bodies++; setAlert(2, 35, '덤불 속 시체가 발견됐다'); }
        }
      }
      break;
    }
    case 'RETURN': {
      if (g.follow != null) { g.state = 'PATROL'; break; }
      const wp = g.route[g.ri] || g.route[(g.ri = 0)];
      if (!g.path) routeTo(g, { x: wp.x, y: wp.y, fl: g.homeFl, z: 0 });
      const arr = moveAlong(g, spd, dt);
      if (hopClimb(g, arr)) break;
      if (arr) { g.state = 'PATROL'; g.path = null; g.wait = g.post != null ? 999 : 0.5; g.waitBase = g.a; }
      break;
    }
    case 'ALERT': {
      if (g.seen) { g.lastSeen = pSpot(); g.lostT = 0; } else g.lostT += dt;
      if (g.target) { if (STAGE.flee) { goFlee(g); break; } g.want = Math.atan2(P.y - g.y, P.x - g.x); if (g.lostT > 5) { g.state = 'RETURN'; g.path = null; g.icon = null; g.meter = 0.4; } break; }
      g.repath -= dt;
      if (g.repath <= 0 || !g.path) { routeTo(g, g.lastSeen); g.repath = 0.4; }
      if (hopClimb(g, moveAlong(g, SPD.gAlert * spdMul() * (g.dog ? 1.2 : 1), dt))) break;
      if (g.seen) g.want = Math.atan2(P.y - g.y, P.x - g.x);
      // 가까이 오면 칼을 들었다가(예비 동작) 내려친다 — 그 사이 피하면 산다
      g.atkCd = Math.max(0, (g.atkCd || 0) - dt);
      if (g.atkT > 0) {
        g.atkT -= dt; g.want = Math.atan2(P.y - g.y, P.x - g.x);
        if (g.atkT <= 0) { g.swingT = 0.2; g.atkCd = 1.1; if (sameF && !P.hide && !P.under && !P.vent && (P.z || 0) === (g.z || 0) && !P.jump && !P.wire && !P.trav && dist(g.x, g.y, P.x, P.y) < 54 && los(g.x, g.y, P.x, P.y)) hurtPlayer(g, g.dog ? '경비견에게 물렸다.' : '경비의 칼에 베였다.'); else play('throw', 0.4 * proxVol(g)); }
      } else if (g.seen && (P.z || 0) === (g.z || 0) && !P.trav && !g.atkCd && dist(g.x, g.y, P.x, P.y) < 46) { g.atkT = g.dog ? 0.35 : 0.55; play('knife', 0.4); }
      if (g.swingT > 0) g.swingT -= dt;
      if (g.seen && P.z > (g.z || 0) && !roofAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)) && dist(g.x, g.y, P.x, P.y) < (g.lookout ? 260 : 130) && (g.shootT = (g.shootT || 0) + dt) > 2.2) { g.shootT = 0; play('kunai', 0.5); hurtPlayer(null, g.lookout ? '지붕 위에서 화살에 맞았다.' : (CITY ? '지붕 위로 던진 병에 맞았다.' : '지붕 위로 던진 창에 맞았다.')); if (S.over) return; }
      if (P.hide && P.hide.spotted && dist(g.x, g.y, P.hide.x, P.hide.y) < 60) { P.hide.spotted = false; dragOut(g, P.hide.type === 'well' ? '숨는 모습을 들켜 우물에서 끌려 나왔다.' : '숨는 모습을 들켜 궤짝에서 끌려 나왔다.'); if (S.over) return; }
      if (g.lostT > 4.5) { g.state = 'SEARCH'; g.poi = g.lastSeen; g.reached = false; g.path = null; g.waitBase = 3; g.meter = 0.5; g.shootT = 0; setIcon(g, '?'); }
      break;
    }
    case 'BODY': {
      const c = g.body;
      if (!c || c.carried || (c.hidden && !g.dog) || c.stashed) { g.state = 'RETURN'; g.path = null; break; }
      if (!g.path) pathTo(g, c.x, c.y);
      if (moveAlong(g, SPD.gBody * spdMul(), dt) || dist(g.x, g.y, c.x, c.y) < 40) {
        if (c.accident) { c.discovered = true; g.state = 'RETURN'; g.path = null; g.icon = null; gsay(g, ['사고가 났네…', '감전됐나 봐. 손대지 마.', '저런, 재수도 없지.'][(g.id + S.corpses.indexOf(c)) % 3]); break; }
        c.discovered = true; S.stats.bodies++; logEv('found', c.x, c.y); setAlert(2, 35, '경비가 시체를 발견했다 — 수색 시작');
        for (const o of S.guards) if (o !== g && o.state !== 'DEAD' && o.state !== 'ALERT' && !o.target && o.state !== 'FLEE' && dist(o.x, o.y, c.x, c.y) < 520) goSuspicious(o, c.x + rnd(-40, 40), c.y + rnd(-40, 40), 5);
        g.state = 'SEARCH'; g.poi = { x: c.x, y: c.y }; g.reached = true; g.wait = 5; g.waitBase2 = g.a; g.waitT = 0; g.path = null;
      }
      break;
    }
    case 'FUSE': {
      const fs = g.fuseAt ? g.fuseAt.at : STAGE.fuse;
      if (!g.path && !g.atFuse) pathTo(g, tc(fs[2]), tc(fs[3]));
      if (!g.atFuse) { if (moveAlong(g, spd, dt)) { g.atFuse = true; g.fuseWork = 2.8; } }
      else {
        g.want = Math.atan2(tc(fs[1]) - g.y, tc(fs[0]) - g.x); g.fuseWork -= dt;
        if (g.fuseWork <= 0 && g.fuseAt) { bldPower(g.fuseAt, true); g.fuseAt.guard = null; g.fuseAt = null; g.atFuse = false; g.state = 'RETURN'; g.path = null; g.icon = null; play('switch', 0.5 * proxVol(g)); break; }
        if (g.fuseWork <= 0) { S.lightsOn = true; S.fuseGuard = null; g.atFuse = false; g.state = 'RETURN'; g.path = null; g.icon = null; play('switch', 0.5 * proxVol(g)); toast('경비가 조명을 다시 켰다', 2.4); }
      }
      break;
    }
    case 'FLEE': {
      const fp = STAGE.flee;
      if (!g.path) pathTo(g, tc(fp[0]), tc(fp[1]));
      if (moveAlong(g, SPD.flee, dt) || dist(g.x, g.y, tc(fp[0]), tc(fp[1])) < 30) { endGame(false, '표적이 북문으로 달아났다.'); return; }
      break;
    }
  }
  if (g.sense != null && (g.state === 'PATROL' || g.state === 'RETURN')) { g.want = g.sense; g.x = sx0 + (g.x - sx0) * 0.4; g.y = sy0 + (g.y - sy0) * 0.4; }  // 흰색 단계: 걸음이 느려지고 이쪽으로 고개를 돌린다
  const tr = (g.state === 'ALERT' || g.state === 'NOTICE' ? 5.5 : ['SEARCH', 'SUSPICIOUS', 'CHECK', 'BODY'].includes(g.state) ? 3 : 1.7 + S.alevel * 0.35) * dt;  // 평소엔 천천히 고개를 돌린다
  g.a += clamp(angDiff(g.a, g.want), -tr, tr);
  if (g.moving) {
    g.stepT -= dt;
    if (g.stepT <= 0) {
      g.stepT = g.state === 'ALERT' || g.state === 'FLEE' ? 0.32 : 0.58;
      const d = dist(g.x, g.y, P.x, P.y);
      if (d < 360) play(stepSound(g.x, g.y), (1 - d / 360) * (g.state === 'ALERT' ? 0.5 : 0.28));
    }
  }
}
// 숨을 만한 곳 목록을 만들어 하나씩 확인하러 간다
function startCheck(g, at, max, radius) {
  const R = radius || 330;
  const gf = flOf(g);
  const cand = S.hides.filter(h => (h.fl || 0) === gf && (h.z || 0) === (g.z || 0) && dist(h.x, h.y, at.x, at.y) < R);
  const bushes = gf ? [] : S.bushes.filter(b => dist(b.x, b.y, at.x, at.y) < Math.min(R, 240)).sort((a, b) => dist(a.x, a.y, at.x, at.y) - dist(b.x, b.y, at.x, at.y));
  const picked = []; for (const b of bushes) if (!picked.some(p => dist(p.x, p.y, b.x, b.y) < 80)) picked.push(b);
  const list = cand.concat(picked.slice(0, 2)).filter(s => astar(Math.floor(g.x / TILE), Math.floor(g.y / TILE), s.tx, s.ty).length || dist(g.x, g.y, s.x, s.y) < 60)
    .sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y)).slice(0, max);
  if (!list.length) { g.state = 'RETURN'; g.path = null; g.icon = null; return false; }
  g.state = 'CHECK'; g.checks = list; g.inspect = null; g.path = null; setIcon(g, '?');
  return true;
}
// 평상시 두 경비가 가까이 서 있으면 잠시 잡담 — 서로를 보느라 주변을 덜 본다
function endChat(g) { if (!g.chat) return; const o = g.chat.with; g.chat = null; g.bubble = null; g.say = null; g.chatCd = rnd(20, 40); if (o.chat && o.chat.with === g) endChat(o); }

// 대화: 가까이 선 둘이 멈춰 서서 말풍선으로 주고받는다 (엿들으면 정보가 나오기도 한다)
const TALK_GUARD = [
  [[0, '오늘도 통조림 반 개야.'], [1, '총대 쪽은 고기 먹는다더라.'], [0, '…목소리 낮춰.']],
  [[0, '어젯밤 3동에서 비명 들었어?'], [1, '고양이겠지.'], [0, '고양이가 문을 열고 다니냐.']],
  [[0, '교대 언제야?'], [1, '새벽 네 시.'], [0, '그때까지 버티면 담배 한 갑이다.']],
  [[0, '옥상도 봐야 하나?'], [1, '위엔 아무도 없어. 올라가기 귀찮아.'], [0, '그러다 당한다.']],
  [[0, '전깃줄에 뭐가 매달린 것 같던데.'], [1, '까마귀야.'], [0, '까마귀치곤 컸어.']],
  [[0, '열쇠는 누가 갖고 있어?'], [1, '순찰 도는 놈이 차고 다녀.'], [0, '그놈 또 졸겠네.']],
  [[0, '전쟁 끝난 거 맞아?'], [1, '누가 이겼는지 아무도 몰라.'], [0, '그럼 우린 누구 편인데.']],
  [[0, '두꺼비집 근처는 네가 봐.'], [1, '불 꺼지면 우리만 손해지.'], [0, '그러니까.']],
  [[0, 'CCTV 하나 또 나갔대.'], [1, '부품이 없어. 그냥 둬.'], [0, '그러다 찍힐 것도 못 찍지.']]
];
const TALK_CIV = [
  [[0, '쌀 좀 남았어요?'], [1, '한 되요. 애들 먹여야지.']],
  [[0, '밤엔 나가지 마요. 자경대 눈이 벌개요.'], [1, '알아요. 문 잠갔어요.']],
  [[0, '한 선생님 댁 가 봤어요?'], [1, '어제 약 받아 왔어요. 돈도 안 받으시더라.']],
  [[0, '담배 한 갑에 통조림 셋이래.'], [1, '지난주엔 둘이었는데.']],
  [[0, '옆 동 할머니 괜찮으세요?'], [1, '기침이 안 멎어요.']]
];
const TALK_CLUB = [
  [[0, '여기 술은 어디서 나는 거야?'], [1, '묻지 마. 그냥 마셔.']],
  [[0, '강 실장 왔대.'], [1, 'VIP석? 또 총대 손님 데려왔겠지.']],
  [[0, '노래 좋다!'], [1, '뭐라고? 안 들려!']],
  [[0, '강 건너는 굶는다던데.'], [1, '여긴 남쪽이잖아.']],
  [[0, '2층 올라가 봤어?'], [1, '경호원이 막아. 계단 옆에 서 있어.']]
];
function startTalk(a, b) {
  const pool = a.civ ? (a.club && STAGE.neon ? TALK_CLUB : TALK_CIV).concat((STAGE.talks || {})[a.club ? 'club' : 'civ'] || []) : TALK_GUARD.concat((STAGE.talks || {}).guard || []);
  const lines = pool[(Math.random() * pool.length) | 0];
  const C = { a, b, lines, i: -1, lt: 0.4 }; a.chat = { with: b, C, t: 99 }; b.chat = { with: a, C, t: 99 }; a.path = null; b.path = null;
}
function updateTalks(dt) {
  const seen = new Set();
  for (const g of S.guards) { const C = g.chat && g.chat.C; if (!C || seen.has(C)) continue; seen.add(C);
    C.lt -= dt; if (C.lt > 0) continue;
    C.i++; C.a.say = C.b.say = null;
    if (C.i >= C.lines.length) { endChat(C.a); continue; }
    const [who, text] = C.lines[C.i], sp = who ? C.b : C.a; sp.say = text; C.lt = 1.6 + text.length * 0.07;
  }
}
// 말풍선 (어둠 위에 그린다): 같은 층, 가까이 있을 때만 (들리는 거리)
function drawSpeech() {
  const P = S.player;
  for (const g of S.guards) {
    if (!g.say || g.state === 'DEAD' || flOf(g) !== flOf(P) || dist(g.x, g.y, P.x, P.y) > 560) continue;
    ctx.font = '700 13px Galmuri, "IBM Plex Sans KR", sans-serif'; const tw = Math.min(220, ctx.measureText(g.say).width), w = tw + 16, h = 24, x = g.x - w / 2, y = g.y - 62;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 2, y + 3, w, h);
    ctx.fillStyle = g.civ ? '#f4f1e6' : '#e8ecf4'; ctx.fillRect(x, y, w, h); ctx.beginPath(); ctx.moveTo(g.x - 5, y + h); ctx.lineTo(g.x + 5, y + h); ctx.lineTo(g.x, y + h + 7); ctx.fill();
    ctx.strokeStyle = g.civ ? '#7a9a6a' : '#5a6478'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = '#1a1c22'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(g.say, g.x, y + h / 2 + 1, 220); ctx.textBaseline = 'alphabetic';
  }
}
function updateChats(dt) {
  updateTalks(dt);
  const gs = S.guards.filter(g => g.state === 'PATROL' && !g.target && !g.dog && g.follow == null && !g.relight && !(g.civ && (g.sleep || g.seen)) && !(g.elite && !g.civ));
  for (const g of gs) g.chatCd = (g.chatCd == null ? rnd(4, 14) : g.chatCd) - dt;
  for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
    const a = gs[i], b = gs[j];
    if (a.civ !== b.civ || (S.alevel && !a.civ)) continue;
    if (a.chat || b.chat || a.chatCd > 0 || b.chatCd > 0 || flOf(a) !== flOf(b)) continue;
    if (dist(a.x, a.y, b.x, b.y) > (a.civ ? 170 : 200)) continue;
    setLayer(flOf(a)); const ok = los(a.x, a.y, b.x, b.y); setLayer(flOf(S.player)); if (!ok) continue;
    startTalk(a, b);
  }
}
function followLeader(g, dt, spd) {
  const L = S.guards[g.follow];
  if (!L || L.state === 'DEAD') {  // 앞서 가던 짝이 사라졌다: 마지막 자리로 찾으러 간다
    g.follow = null; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.ri = 0; g.wait = 999; g.post = g.a;
    if (L && !g.civ && !g.dog) { goSuspicious(g, L.x, L.y, 6); g.why = 'saw'; gsay(g, ['어디 갔어? 대답해!', '야… 어디 간 거야?', '방금까지 앞에 있었는데…'][g.id % 3]); setIcon(g, '?'); }
    return;
  }
  const bx = L.x - Math.cos(L.a) * 52, by = L.y - Math.sin(L.a) * 52;
  const d = dist(g.x, g.y, bx, by);
  g.repath -= dt;
  if (d > 30) {
    if (g.repath <= 0 || !g.path) { pathTo(g, bx, by); g.repath = 0.6; }
    moveAlong(g, Math.max(spd, SPD.target * 1.5), dt);
  } else {
    g.path = null;
    g.glanceT -= dt;
    if (g.glance > 0) { g.glance -= dt; g.want = g.glanceA; if (g.glance <= 0) g.glanceT = rnd(5, 9); }
    else if (g.glanceT <= 0) { g.glance = rnd(1.2, 1.8); g.glanceA = L.a + Math.PI + rnd(-0.6, 0.6); }
    else g.want = L.a;
  }
}
// 순라꾼에게 맞음: 체력 1 감소, 뒤로 밀림, 잠깐 무적. 체력이 다하면 실패
function hurtPlayer(g, why) {
  const P = S.player; if (P.hurtT > 0 || S.over) return;
  if (!S.saidHurt && P.hp > 1) { S.saidHurt = true; setTimeout(() => S && !S.over && bark('hero', 'hurt'), 600); }
  P.hp--; P.hurtT = 1.3; S.flash = 0.28; play(Math.random() < 0.5 ? 'kill' : 'kill2', 0.6); play('thud', 0.5);
  if (g) { const a = Math.atan2(P.y - g.y, P.x - g.x); P.x += Math.cos(a) * 30; P.y += Math.sin(a) * 30; if (!P.z) { collide(P, 13, groundSolidP); collide(P, 13, groundSolidP); } }
  if (P.carrying) { const c = P.carrying; c.carried = false; c.hidden = false; P.carrying = null; }
  if (P.captive) { const c = P.captive; P.captive = null; c.state = 'PATROL'; goAlert(c); }
  if (P.hp <= 0) { endGame(false, why); return; }
  toast(`${why.replace(/\.$/, '')} — 체력 ${P.hp}/${P.hpMax}. 시야를 끊고 숨어라`, 2.6, 'warn');
}
// 숨은 곳에서 끌려 나옴
function dragOut(g, why) {
  const P = S.player; const b = P.hide; if (b) { leaveHide({ x: P.x - g.x, y: P.y - g.y }); }
  goAlert(g); hurtPlayer(g, why);
}
// 시체를 던져 겁주기 (Mark of the Ninja의 공포): 떨어진 곳 주변의 경비가 비명을 지르고 달아난다
function terrorAt(x, y) {
  let n = 0;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.target || flOf(g) || dist(g.x, g.y, x, y) > 190 || !los(g.x, g.y, x, y)) continue;
    if (g.civ) { civScream(g, x, y); continue; }
    if (g.elite) { goSuspicious(g, x, y, 4); setIcon(g, '흥'); continue; }
    endChat(g); g.act = null; g.state = 'TERROR'; g.terrorT = rnd(3.5, 4.8); g.fearFrom = { x, y }; g.path = null; g.slashed = false; g.icon = '!?'; g.iconT = 4; g.meter = 0; n++;
    if (g.dog) play('bark', 0.6 * proxVol(g));
  }
  play('call', 0.7, 1.45); play('question', 0.5, 0.8); noise(x, y, 260, 'terror');
  if (n) { S.stats.terror = (S.stats.terror || 0) + n; setAlert(2, 30, `공포! 경비 ${n}명이 겁에 질려 달아난다`); bark(anyGuard(g => g.state === 'TERROR'), 'terror'); hint('terror', '겁에 질린 경비는 잠시 아무것도 못 보고 달아난다. 그 틈에 지나가거나 처리하라'); }
  else toast('시체가 떨어졌지만 본 경비가 없다', 2);
}
function goAlert(g) {
  if (g.dog && g.state !== 'ALERT') { play('bark', 0.7); noise(g.x, g.y, 320, 'bark'); }
  const P = S.player; endChat(g); g.act = null; g.bubble = null;
  if (g.lure) { g.lure.claim = null; g.lure = null; }
  if (g.state !== 'ALERT') { S.stats.detected++; logEv('seen', S.player.x, S.player.y); play('alert', 0.65); if (S.alevel < 3) { if (g.dog) say([[g, '멍! 멍멍!']]); else bark(g, 'alert'); } }
  if (P.disguise && !P.disguiseBlown) { P.disguiseBlown = true; toast('변장이 들통났다', 2.4, 'warn'); }
  g.state = 'ALERT'; g.icon = '!'; g.iconT = 99; g.lastSeen = pSpot(); g.lostT = 0; g.path = null; g.repath = 0; g.meter = 1; g.shootT = 0;
  if (S.fuseGuard === g) { S.fuseGuard = null; g.atFuse = false; }
  if (g.target) toast('표적이 소리쳤다 — 경비가 몰려온다', 2.6, 'warn');
  let radio = !!g.radio;
  for (const o of S.guards) {
    if (o === g || o.civ || o.state === 'DEAD' || o.state === 'ALERT' || o.target || o.state === 'FLEE' || o.state === 'CAPTIVE' || o.state === 'TERROR' || flOf(o) !== flOf(g)) continue;
    if (dist(o.x, o.y, g.x, g.y) < (g.target ? 650 : 340)) { o.state = 'ALERT'; o.icon = '!'; o.iconT = 99; o.lastSeen = pSpot(); o.lostT = 0.5; o.path = null; o.repath = 0; o.meter = 1; o.shootT = 0; if (o.radio) radio = true; }
  }
  if (CITY && !radio && !g.target) {  // 무전기를 가진 경비가 없으면 경보가 근처에만 머문다 (증원·전체 경보 없음)
    if (S.alevel < 2) toast('근처 경비만 알아챘다 — 무전기 경비가 없다', 2.4);
    setAlert(2, 30);
  } else if (CITY && !g.target) {  // 무전: 바로 퍼지지 않는다. 무전기 경비가 몇 초간 보고하는 사이 처치하면 끊긴다
    if (S.alevel < 3 && !S.radioCall) {
      const rg = g.radio ? g : S.guards.filter(o => o.radio && o.state === 'ALERT' && o.state !== 'DEAD').sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y))[0];
      if (rg) { const dur = DKEY === 'easy' ? 3.4 : DKEY === 'hard' ? 2.2 : 2.8; S.radioCall = { g: rg, t: dur, dur, at: pSpot() }; rg.icon = '!'; rg.iconT = 99;
        toast('무전기 경비가 보고한다 — ' + dur.toFixed(1) + '초 안에 처치하면 끊긴다', 2.4, 'warn'); play('metal', 0.25, 1.9); hint('radioCall', '무전 중인 경비는 멈춰 서 있다. 등 뒤가 아니어도 붙으면 처치할 수 있고, 다트로도 맞힐 수 있다'); }
    }
    setAlert(2, 30);
  } else {
    setAlert(3);
  }
  hint('alert', '발각! 경비들이 몰려와 칼을 휘두른다. 시야를 끊고 숨어 15초 버티면 수색으로, 수색이 끝나면 모두 제자리로 돌아간다');
}
function radioSpread(at) {
  toast('무전으로 경보가 퍼졌다', 2.4, 'warn');
  for (const o of S.guards) if (!o.civ && !o.dog && !o.target && o.state !== 'DEAD' && o.state !== 'ALERT' && o.state !== 'CAPTIVE' && dist(o.x, o.y, at.x, at.y) < 1100) { o.state = 'SEARCH'; o.poi = { x: at.x + rnd(-60, 60), y: at.y + rnd(-60, 60), fl: at.fl, z: at.z }; o.reached = false; o.path = null; o.waitBase = 4; setIcon(o, '!'); }
  setAlert(3);
}
const radioBusy = g => !!(S.radioCall && S.radioCall.g === g);
function updateRadioCall(dt) {
  const R = S.radioCall; if (!R) return;
  const g = R.g;
  if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.state === 'TERROR' || g.doomed) { S.radioCall = null; S.stats.radioCut = (S.stats.radioCut || 0) + 1; toast('무전을 끊었다 — 경보가 퍼지지 않았다', 2.4, 'good'); logEv && logEv('radioCut', g.x, g.y); return; }
  if (g.state !== 'ALERT') { S.radioCall = null; return; }
  if ((R.t -= dt) <= 0) { S.radioCall = null; radioSpread(R.at); }
}
// 벽 너머 발소리: 보이지 않는 경비가 들리는 거리 안에서 움직이면 발밑에 작은 소리 원 (마크 오브 더 닌자 방식)
function drawHeardSteps(P, openB, gVis) {
  if (P.under || P.vent) return;
  const fP = flOf(P);
  for (const g of S.guards) {
    if (g.civ || g.state === 'DEAD' || g.state === 'CAPTIVE' || g.z || g.climb || !g.moving) continue;
    const fG = flOf(g), hidden = coveredG(g, openB) || !gVis(g) || fG !== fP; if (!hidden) continue;
    const d = dist(P.x, P.y, g.x, g.y), R = (fG === fP ? 330 : 230) * (g.state === 'ALERT' || g.state === 'SEARCH' ? 1.3 : 1); if (d > R) continue;
    const per = g.state === 'ALERT' ? 0.34 : 0.5, f = ((S.t + (g.id || 0) * 0.37) % per) / per, a = (1 - f) * (1 - d / R * 0.6);
    ctx.strokeStyle = g.state === 'ALERT' || g.state === 'SEARCH' ? `rgba(255,140,110,${0.75 * a})` : `rgba(160,210,255,${0.9 * a})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(g.x, g.y + 6, 5 + 15 * f, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgba(150,200,255,${0.55 * (1 - d / R * 0.5)})`; ctx.beginPath(); ctx.arc(g.x, g.y + 6, 2.2, 0, TAU); ctx.fill();
    if (fG !== fP) { ctx.font = '700 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(150,200,255,.75)'; ctx.fillText((fG + 1) + 'F', g.x, g.y - 10); ctx.textAlign = 'left'; }
  }
}
function drawRadioCall() {
  const R = S.radioCall; if (!R) return; const g = R.g; if (flOf(g) !== flOf(S.player)) return;
  const k = 1 - R.t / R.dur, x = g.x + 34, y = g.y - 30;
  ctx.fillStyle = 'rgba(8,11,18,.8)'; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#e8473c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
  drawRadio(x, y + 4);
  ctx.strokeStyle = `rgba(232,71,60,${0.5 + 0.4 * Math.sin(S.t * 12)})`; ctx.lineWidth = 2;
  for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(x + 4, y - 8, 6 * i, -1.2, -0.2); ctx.stroke(); }
  ctx.font = '700 11px "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffb3a8'; ctx.fillText('무전 중', x + 6, y - 21); ctx.textAlign = 'left';
}
function startFlee() {
  if (S.fleeing) return; S.fleeing = true;
  for (const g of S.guards) if (g.target && g.state !== 'DEAD') goFlee(g);
  toast('표적이 북문으로 도주한다 — 빠져나가기 전에 막아라', 3.5, 'warn');
}
function goFlee(g) { g.state = 'FLEE'; g.path = null; g.icon = '!'; g.iconT = 99; }

// ---------------------------------------------------------------- 플레이어
function stepSound(x, y) {
  const t = tileAt(x, y); const v = (Math.random() * 3) | 0;
  if (t === 'w' || t === 'v' || t === 'K' || t === 'E' || t === 'U') return 'step_w' + v;
  if (t === '.' || t === 'B' || t === 'T') return 'step_g' + v;
  if (t === ',' || t === 'r') return 'step_d' + v;
  if (t === 'm') return 'step_w' + v;
  return 'step_c' + v;
}
// 바닥 재질: 유리 조각(x) · 철판(m) · 물웅덩이(p) · 자갈(r) 은 발소리가 커진다
const MAT = { x: 2.3, m: 1.8, p: 1.7, r: 1.45 };
const MAT_NAME = { x: '유리 조각', m: '철판', p: '물웅덩이', r: '자갈' };
function floorMul(x, y, z) { if (z) return 0.6; const t = tileAt(x, y); if (MAT[t]) return MAT[t]; return (t === 'w' || t === 'v') ? 1.25 : (t === '.' || t === 'B') ? 0.75 : t === ',' ? 0.9 : 1; }
function collide(o, r, solid) {
  const tx0 = Math.floor((o.x - r) / TILE), tx1 = Math.floor((o.x + r) / TILE), ty0 = Math.floor((o.y - r) / TILE), ty1 = Math.floor((o.y + r) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (!solid(tx, ty)) continue;
    const cx = clamp(o.x, tx * TILE, tx * TILE + TILE), cy = clamp(o.y, ty * TILE, ty * TILE + TILE);
    const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
    if (d < r) { if (d > 0.001) { o.x += dx / d * (r - d); o.y += dy / d * (r - d); } else o.y += r; }
  }
}

const input = { walkLock: (() => { try { return localStorage.getItem('yh_walkLock') === '1'; } catch (e) { return false; } })(), sneakToggle: (() => { try { return localStorage.getItem('yh_sneak') === '1'; } catch (e) { return false; } })(), joy: null, tool: 'stone', aiming: null, scan: false };
const TOOLS = ['stone', 'coin', 'kunai'], TOOL_NAME = { stone: '돌', coin: '엽전', kunai: '쿠나이' };
const toolCount = t => { const P = S.player; return t === 'stone' ? P.stones : t === 'coin' ? P.coins : P.kunai; };
function selectTool(t) { if (!TOOLS.includes(t)) return; input.tool = t; if (input.aiming) input.aiming.t0 = performance.now(); syncTools(); play('click', 0.2); }
function cycleTool() { selectTool(TOOLS[(TOOLS.indexOf(input.tool) + 1) % TOOLS.length]); }
function canAim() { const P = S.player; return S && running && !S.over && !paused && !P.hide && !P.jump && !P.trav && !P.under && !P.vent && !P.captive; }
// 도구: 누르고 있으면 조준(이동 입력으로 방향, 오래 누를수록 멀리), 떼면 사용
function startAim(src) { if (!canAim()) return; input.aiming = { t0: performance.now(), src }; }
function cancelAim() { input.aiming = null; input.queue = []; }
// 동시 행동 예약 (Desperados III 방식): 시간이 멈춘 조준 중 [특수]로 지금 조준을 예약 → 손을 떼면 예약한 것까지 한꺼번에 던진다
function queueAim() {
  const P = S.player; if (!input.aiming) return; input.queue = input.queue || [];
  if (input.queue.length >= 2) { toast('예약은 두 개까지 — 손을 떼면 한꺼번에 실행', 1.6); return; }
  const tool = input.tool, used = input.queue.filter(q => q.tool === tool).length + 1;
  const have = tool === 'stone' ? P.stones : tool === 'coin' ? P.coins : P.kunai;
  if (have - used < 1) { toast(`${TOOL_NAME[tool]}이(가) 모자라다`, 1.4); return; }
  const it = { tool, a: P.a, pt: aimPoint() };
  if (tool === 'kunai') { it.tgt = kunaiTarget(); if (!it.tgt) { toast('노릴 대상이 없다', 1.4); return; }
    if (input.queue.some(q => q.tgt && q.tgt.ref === it.tgt.ref)) { toast('이미 예약한 대상이다', 1.4); return; } }
  input.queue.push(it); play('click', 0.35); input.aiming.t0 = performance.now();
  toast(`행동 예약 ${input.queue.length} — 다른 곳을 겨누고 손을 떼면 한꺼번에`, 1.8);
  hint('queue', '동시 실행: 시간이 멈춘 조준 중 [특수]로 겨눈 것을 예약하고, 다른 곳을 겨눈 뒤 손을 떼면 모두 한꺼번에 던진다 (쿠나이 둘로 경비 둘을 동시에)');
}
function runQueued(it) {
  const P = S.player; P.a = it.a;
  if (it.tool === 'stone') actThrow(it.pt); else if (it.tool === 'coin') actCoin(it.pt);
  else if (it.tgt && !(it.tgt.ref && (it.tgt.ref.state === 'DEAD' || it.tgt.ref.broken))) { const g = it.tgt.ref; if (g && g.x != null && it.tgt.type !== 'cam' && it.tgt.type !== 'lamp') { it.tgt.x = g.x; it.tgt.y = g.y; } actKunai(it.tgt); }
}
function aimPoint() {
  const P = S.player, a = input.aiming; if (!a) return null;
  const charge = input.joy && input.joy.mag > 0.15 ? clamp((input.joy.mag - 0.15) / 0.8, 0, 1) : clamp((performance.now() - a.t0) / 900, 0, 1);
  const [lo, hi] = input.tool === 'coin' ? [50, 160] : [90, 330];
  let d = lo + (hi - lo) * charge;
  d = Math.max(16, Math.min(d, castRay(P.x, P.y, P.a, d, input.tool === 'stone' && P.z > 0) - 8));
  return { x: P.x + Math.cos(P.a) * d, y: P.y + Math.sin(P.a) * d, d };
}
function releaseAim() {
  if (!input.aiming) return;
  const pt = aimPoint(); input.aiming = null;
  const q = input.queue || []; input.queue = [];
  if (!canAim()) return;
  if (input.tool === 'stone') actThrow(pt); else if (input.tool === 'coin') actCoin(pt); else actKunai();
  if (q.length) { S.qRun = q; S.qRunT = 0.1; }
  syncTools();
}
// 조이스틱: 살짝 = 살금살금, 반쯤 = 걷기, 끝까지 = 달리기
const JOY_WALK = 0.38, JOY_RUN = 0.86;

function drawRadio(x, y) {  // 무전기: 이 경비가 경보를 맵 전체에 퍼뜨린다
  ctx.fillStyle = 'rgba(8,11,18,.85)'; ctx.fillRect(x - 6, y - 8, 12, 15); ctx.fillStyle = '#3a3f48'; ctx.fillRect(x - 4, y - 6, 8, 11);
  ctx.strokeStyle = '#c9cfd8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 2, y - 6); ctx.lineTo(x + 2, y - 14); ctx.stroke();
  ctx.fillStyle = Math.floor(S.t * 2) % 2 ? '#7fe08a' : '#2f6a38'; ctx.fillRect(x - 3, y - 4, 3, 3);
}
// 발소리 반경: 지금 걸음으로 내는 소리가 닿는 거리. 경비가 그 안에 있으면 붉게
function drawStepRing(P) {
  const m = P.cover ? 'sneak' : P.mode, r = ({ sneak: 22, walk: 110, run: 250 }[m] + (P.carrying ? 35 : 0)) * (m === 'walk' && perkOn('sole') ? 0.75 : 1) * floorMul(P.x, P.y, P.z) * loudMul(P.x, P.y, flOf(P));
  let heard = false;
  for (const g of S.guards) if (!g.civ && g.state !== 'DEAD' && g.state !== 'CAPTIVE' && flOf(g) === flOf(P) && !(g.z || 0) && dist(g.x, g.y, P.x, P.y) < r * soundThrough(P.x, P.y, g.x, g.y)) { heard = true; break; }
  const a = P.moving ? 1 : 0.55;
  ctx.strokeStyle = heard ? `rgba(240,100,70,${0.6 * a})` : `rgba(220,226,240,${0.2 * a})`; ctx.lineWidth = heard ? 2.5 : 1.5; ctx.setLineDash([5, 7]);
  ctx.beginPath(); ctx.ellipse(P.x, P.y + 6, r, r * 0.92, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  if (heard && P.moving) { ctx.font = '700 11px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(240,100,70,.9)'; ctx.fillText('발소리가 들린다', P.x, P.y + 6 + r * 0.92 + 14); }
}
// 화면 밖에서 나를 보거나 쫓는 경비: 화면 가장자리에 화살표
function drawOffscreen() {
  const hw = W / SCALE / 2, hh = H / SCALE / 2, m = 30 / SCALE, sz = 11 / SCALE;
  for (const g of S.guards) {
    if (g.civ || g.state === 'DEAD' || g.state === 'CAPTIVE') continue;
    if (!(g.seen || g.state === 'ALERT' || g.state === 'NOTICE')) continue;
    const dx = g.x - cam.x, dy = g.y - cam.y; if (Math.abs(dx) < hw - m && Math.abs(dy) < hh - m) continue;
    const k = Math.min((hw - m) / Math.max(1e-6, Math.abs(dx)), (hh - m) / Math.max(1e-6, Math.abs(dy))), ex = cam.x + dx * k, ey = cam.y + dy * k, a = Math.atan2(dy, dx);
    const col = g.state === 'ALERT' ? '232,71,60' : '242,196,107', pz = 0.65 + 0.35 * Math.sin(S.t * 8);
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = `rgba(${col},${pz})`; ctx.beginPath(); ctx.moveTo(sz * 1.4, 0); ctx.lineTo(-sz, -sz); ctx.lineTo(-sz * 0.4, 0); ctx.lineTo(-sz, sz); ctx.closePath(); ctx.fill(); ctx.restore();
  }
}
// ---- 휘파람: 공짜 유인. 들은 경비가 이 자리를 확인하러 온다 (숨은 채·벽에 기댄 채로도 분다)
function sfxWhistle() {
  if (!AC || muted) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(1350, t); o.frequency.linearRampToValueAtTime(1950, t + 0.12); o.frequency.linearRampToValueAtTime(1500, t + 0.32);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13, t + 0.03); g.gain.setValueAtTime(0.13, t + 0.26); g.gain.linearRampToValueAtTime(0, t + 0.36);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.4);
}
function whistle() {
  if (!S || S.over || paused || !running || DLG.modal) return;
  const P = S.player; if (P.under || P.vent || P.trav || P.jump || P.wire || P.captive) return;
  if (S.whistleT > 0) return;
  S.whistleT = 2.5; sfxWhistle();
  const x = P.hide ? P.hide.x : P.x, y = P.hide ? P.hide.y : P.y;
  noise(x, y, 230, 'whistle'); S.stats.whistles = (S.stats.whistles || 0) + 1;
  hint('whistle', '휘파람: 들은 경비가 이 자리를 확인하러 온다. 덤불·쓰레기통·벽 모서리에서 불고 기다렸다가 처치하라');
}
// ---- 지붕 가장자리에 매달리기 · 끌어내리기 · 배관에서 밀어 떨어뜨리기
function ledgeAt(P) {
  if (!P.z || P.wire || P.jump || P.trav || P.carrying || P.captive) return null;
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE), fx = P.x - tx * TILE, fy = P.y - ty * TILE, c = [];
  if (rLv(tx, ty + 1) < P.z && fy > TILE - 24) c.push({ x: 0, y: 1, d: TILE - fy });
  if (rLv(tx, ty - 1) < P.z && fy < 24) c.push({ x: 0, y: -1, d: fy });
  if (rLv(tx + 1, ty) < P.z && fx > TILE - 24) c.push({ x: 1, y: 0, d: TILE - fx });
  if (rLv(tx - 1, ty) < P.z && fx < 24) c.push({ x: -1, y: 0, d: fx });
  c.sort((a, b) => a.d - b.d); return c[0] || null;
}
function groundBelow(x, y, n) {  // 가장자리 바깥으로 처음 나오는 땅 칸
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  for (let k = 1; k <= 4; k++) { const gx = tx + n.x * k, gy = ty + n.y * k; if (inMap(gx, gy) && !rLv(gx, gy) && !roofAt(gx, gy) && !groundSolidP(gx, gy)) return { x: tc(gx), y: tc(gy) }; }
  return null;
}
const ledgeDraw = P => { const n = P.ledge; return { x: P.x + n.x * 20, y: P.y + (n.y > 0 ? 34 : n.y < 0 ? -8 : 10) }; };
function ledgeTarget() {
  const P = S.player; if (!P.ledge) return null; let best = null, bd = 60;
  for (const g of S.guards) { if (['DEAD', 'CAPTIVE', 'ALERT', 'FLEE'].includes(g.state) || g.dog || (g.z || 0) !== P.z || g.climb || g.doomed) continue; const d = dist(P.x, P.y, g.x, g.y); if (d < bd) { bd = d; best = g; } }
  return best;
}
function pushOffTarget() {
  const P = S.player; if (!P.z || P.ledge || P.trav) return null;
  for (const g of S.guards) { const c = g.climb; if (!c || c.kind !== 'climb' || !c.up || (c.to.z || 0) !== P.z || g.state === 'DEAD') continue; if (dist(P.x, P.y, c.to.x, c.to.y) < 72) return g; }
  return null;
}
// 떨어뜨리기: 사고(추락사)로 처리. 몸은 아래 땅으로 떨어진다
function fallKill(g, from, to) {
  g.climb = null; g.z = 0; g.fl = 0; g.x = to.x; g.y = to.y; accidentKill(g, 'fall');
  const c = S.corpses[S.corpses.length - 1]; if (c) { c.x = from.x; c.y = from.y; c.fly = { x0: from.x, y0: from.y, x1: to.x, y1: to.y, t: 0, dur: 0.45 }; }
  S.stats.special++; S.hitStop = 0.06;
}
// ---- 벽에 기대기 · 끌어당겨 암살
function coverAt(P, prev) {
  if (P.wire || P.jump || P.hide || P.vent || P.under || P.trav || P.ledge) return null;
  // 지붕 위: 옥탑방·물탱크·계단실 벽에만 기댄다 (지붕 끝은 기댈 벽이 아니다)
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE), fx = P.x - tx * TILE, fy = P.y - ty * TILE, sol = P.z ? (x, y) => robAt(x, y) && lvAt(x, y) === P.z : groundSolidP, c = [];
  const kd = (x, y) => { if (P.z) return 'wall'; const ch = inMap(x, y) ? G0[y][x] : '#'; return ch === 'T' ? 'tree' : ch === 'A' ? 'car' : 'wall'; };
  if (sol(tx, ty - 1) && fy < 22) c.push({ x: 0, y: 1, d: fy, kind: kd(tx, ty - 1) });
  if (sol(tx, ty + 1) && fy > TILE - 22) c.push({ x: 0, y: -1, d: TILE - fy, kind: kd(tx, ty + 1) });
  if (sol(tx - 1, ty) && fx < 22) c.push({ x: 1, y: 0, d: fx, kind: kd(tx - 1, ty) });
  if (sol(tx + 1, ty) && fx > TILE - 22) c.push({ x: -1, y: 0, d: TILE - fx, kind: kd(tx + 1, ty) });
  if (prev) { const same = c.find(o => o.x === prev.x && o.y === prev.y); if (same) return same; }
  c.sort((a, b) => a.d - b.d); return c[0] || null;
}
function enterCover(n, quiet) {
  const P = S.player; P.cover = { x: n.x, y: n.y, kind: n.kind }; P.coverPush = 0; P.idleWall = 0; P.vx = 0; P.vy = 0; P.a = Math.atan2(n.y, n.x); play('cloth', quiet ? 0.12 : 0.22);
  hint('cover', '벽에 기댐: 몸을 붙여 덜 보인다. 벽을 따라 옆걸음만 하고, 벽 반대쪽으로 밀면 떨어진다. 나를 못 본 채 옆을 지나는 사람은 [끌어당겨 암살]');
}
// 기댄 자리 옆을 지나는, 나를 보지 못한 사람
function coverTarget() {
  const P = S.player; if (!P.cover || P.strikeT > 0 || S.pull) return null;
  let best = null, bd = perkOn('reach') ? 120 : 100;
  for (const g of S.guards) {
    if (['DEAD', 'CAPTIVE', 'ALERT', 'FLEE', 'TERROR'].includes(g.state) || g.dog || (g.z || 0) !== (P.z || 0) || g.climb || g.doomed || (g.seen && g.meter > 0.6) || flOf(g) !== flOf(P)) continue;
    const d = dist(P.x, P.y, g.x, g.y); if (d < bd && los(P.x, P.y, g.x, g.y, P.z || 0)) { bd = d; best = g; }
  }
  return best;
}
function updatePull(dt) {
  const L = S.pull; L.t += dt; const f = Math.min(1, L.t / L.dur), e = f * f, g = L.g;
  g.x = L.x0 + (L.x1 - L.x0) * e; g.y = L.y0 + (L.y1 - L.y0) * e;
  if (f >= 1) {
    S.pull = null; g.doomed = false;
    if (g.state !== 'DEAD') { killGuard(g, null, null, true); S.hitStop = 0.08; if (!g.civ) { S.stats.special++; toast('벽 뒤로 끌어당겨 암살', 1.6, 'good'); } }
  }
}
// 몸으로 오르고 넘는 동작: 순간이동하지 않고 정해진 길을 따라 시간을 들여 움직인다
// o: { pts: [{x, y, f}], dur, phases: [{to, pose}], face, base: {x, y}, step, end }
function startTrav(o) {
  const P = S.player; P.trav = Object.assign({ t: 0, st: 0 }, o); P.vx = 0; P.vy = 0; P.moving = true; S.qBuf = 0;
}
function travPose(T) {
  const f = Math.min(1, T.t / T.dur); let lo = 0;
  for (const ph of T.phases) { if (f <= ph.to + 1e-6) return { pose: ph.pose, g: (f - lo) / Math.max(1e-6, ph.to - lo) }; lo = ph.to; }
  const ph = T.phases[T.phases.length - 1]; return { pose: ph.pose, g: 1 };
}
function updateLedge(P, dt) {
  const k = S.keys, n = P.ledge; let mx = 0, my = 0;
  if (k.ArrowLeft) mx -= 1; if (k.ArrowRight) mx += 1; if (k.ArrowUp) my -= 1; if (k.ArrowDown) my += 1;
  if (input.joy && input.joy.mag > 0.1) { mx = input.joy.x; my = input.joy.y; }
  const mag = Math.hypot(mx, my); P.moving = false; P.hidden = false; P.light = lightAt(P.x, P.y, true);
  if (mag < 0.15) { P.ledgeLock = false; return; }
  const into = (mx * -n.x + my * -n.y) / mag, out = -into;
  if (into > 0.6 && !P.ledgeLock) { const n0 = P.ledge, d = ledgeDraw(P); P.ledge = null; play('cloth', 0.3);  // 다시 올라서기
    startTrav({ pts: [{ x: d.x, y: d.y, f: 0 }, { x: P.x - n0.x * 6, y: P.y - n0.y * 6, f: 1 }], dur: 0.38, phases: [{ to: 1, pose: 'vault' }], face: Math.atan2(-n0.y, -n0.x) }); return; }
  if (out > 0.6 && !P.ledgeLock) { const gb = P.z === 1 ? groundBelow(P.x, P.y, n) : null;  // 1층 지붕이면 손을 놓고 내려간다
    if (gb) { const d = ledgeDraw(P); P.ledge = null; P.jump = { x0: d.x, y0: d.y, x1: gb.x, y1: gb.y, t: 0, dur: 0.3, z1: 0, arc: 4, noise: 70 }; P.z = 0; } return; }
  const al = mx * -n.y + my * n.x; if (Math.abs(al) / mag < 0.4) return;  // 옆으로 이동 (가장자리가 이어지는 곳까지)
  const nx = P.x + -n.y * Math.sign(al) * 52 * dt, ny = P.y + n.x * Math.sign(al) * 52 * dt, ox = P.x, oy = P.y;
  P.x = nx; P.y = ny; const e = ledgeAt(P);
  if (!e || e.x !== n.x || e.y !== n.y || rLv(Math.floor(nx / TILE), Math.floor(ny / TILE)) !== P.z) { P.x = ox; P.y = oy; return; }
  P.moving = true; P.stepT -= dt; if (P.stepT <= 0) { P.stepT = 0.5; play('cloth', 0.08); }
}
function updateTrav(P, dt) {
  const T = P.trav; T.t += dt; const f = Math.min(1, T.t / T.dur), pts = T.pts;
  let i = 0; while (i < pts.length - 2 && f > pts[i + 1].f) i++;
  const a = pts[i], b = pts[i + 1], r = Math.max(0, Math.min(1, (f - a.f) / Math.max(1e-6, b.f - a.f)));
  P.x = a.x + (b.x - a.x) * r; P.y = a.y + (b.y - a.y) * r; P.moving = true; P.hidden = false;
  const bp = T.base || P; P.light = lightAt(bp.x, bp.y, false);
  if (T.step && (T.st -= dt) <= 0 && travPose(T).pose === 'climb') { T.st = 0.3; play(T.step, 0.16); noise(bp.x, bp.y, T.loud || 40, 'climb'); }
  if (f >= 1) { P.trav = null; P.moving = false; if (T.end) T.end(); }
}
function updatePlayer(dt) {
  const P = S.player, k = S.keys;
  if (S.keypad) { P.moving = false; if (dist(P.x, P.y, S.keypad.d.x, S.keypad.d.y) > 90 || S.over) closeKeypad(); return; }
  if (P.trav) { updateTrav(P, dt); return; }
  if (P.ledge) { updateLedge(P, dt); return; }
  if (P.lunge) {
    const L = P.lunge; L.t += dt; const f = Math.min(1, L.t / L.dur), e = 1 - (1 - f) * (1 - f);
    P.x = L.x0 + (L.x1 - L.x0) * e; P.y = L.y0 + (L.y1 - L.y0) * e; P.moving = true; P.mode = 'run'; P.vx = 0; P.vy = 0;
    if (f >= 1) { P.lunge = null; P.moving = false; collide(P, P.z ? 10 : 13, solidFor(P.z || 0)); if (L.list.every(g => g.state !== 'DEAD')) strikeKill(L.list, L.two); else L.list.forEach(g => { g.doomed = false; }); }
    return;
  }
  let mx = 0, my = 0;
  if (k.ArrowLeft) mx -= 1; if (k.ArrowRight) mx += 1;
  if (k.ArrowUp) my -= 1; if (k.ArrowDown) my += 1;
  let mag = Math.hypot(mx, my);
  // 기본은 걷기. 살금 모드를 켜 두면 계속 살금살금 (키보드 Shift만 잠깐 달리기)
  const shiftRun = (k.ShiftLeft || k.ShiftRight) && mag > 0;
  let mode = shiftRun ? 'run' : 'walk';
  if (input.joy && input.joy.mag > 0.1) {
    mx = input.joy.x; my = input.joy.y; mag = input.joy.mag;
    mode = mag < JOY_RUN ? 'walk' : 'run';
  }
  if (input.sneakToggle && !shiftRun) mode = 'sneak';
  if (input.walkLock && mode === 'run') mode = 'walk';  // 걷기 고정: 뛰지 않는다
  if ((P.carrying || P.captive) && mode === 'run') mode = 'walk';
  if (P.captive) {
    const g = P.captive; g.captT += dt;
    if ((g.squirm = (g.squirm || 0) - dt) <= 0) { g.squirm = 1.4; noise(g.x, g.y, 55, 'struggle'); play('cloth', 0.25); }
    if (g.captT > 9) { P.captive = null; g.state = 'PATROL'; g.meter = 1; goAlert(g); toast('붙잡은 경비가 몸부림쳐 빠져나갔다!', 2.6, 'warn'); }
  }
  if (P.wire || P.jump || P.under || P.vent || P.hide) { P.vx = 0; P.vy = 0; }
  if (P.z > 0 && !P.wire && !P.jump && facadeRow(Math.floor(P.x / TILE), Math.floor(P.y / TILE))) P.y = roofEdgeY(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
  if (P.wire && !P.jump) { updateWire(P, mx, my, mag, mode, dt); return; }
  if (P.pick) { updatePick(P, mag, dt); return; }
  if (P.jump) {
    const j = P.jump; j.t += dt; const f = Math.min(1, j.t / j.dur);
    P.x = j.x0 + (j.x1 - j.x0) * f; P.y = j.y0 + (j.y1 - j.y0) * f;
    if (f >= 1) { P.jump = null; P.z = j.z1; play('land', j.noise ? 0.25 : 0.4); noise(P.x, P.y, (j.noise || (j.z1 ? 70 : 120)) * floorMul(P.x, P.y, j.z1), 'land'); if (j.killG && j.killG.state !== 'DEAD') { const g = j.killG; P.strikeT = 0.35; P.a = Math.atan2(g.y - P.y, g.x - P.x); killGuard(g); if (!g.civ) { S.stats.special++; toast('창문 넘어 암살', 1.8, 'good'); } collide(P, 13, groundSolidP); } }
    P.light = lightAt(P.x, P.y, true); P.hidden = false; P.moving = true;
    return;
  }
  if (P.under) {
    P.mode = mode === 'run' ? 'walk' : mode; P.hidden = true; P.light = 0;
    P.moving = mag > 0.05;
    if (P.moving) {
      const nx = mx / mag, ny = my / mag, sp = SPD[P.mode] * 1.05;
      P.x += nx * sp * dt; P.y += ny * sp * dt;
      const sol = (tx, ty) => !ugAt(tx, ty);
      collide(P, 11, sol); collide(P, 11, sol);
      P.a += clamp(angDiff(P.a, Math.atan2(ny, nx)), -12 * dt, 12 * dt);
      P.stepT -= dt; if (P.stepT <= 0) { P.stepT = 0.45; play('step_c' + ((Math.random() * 3) | 0), 0.12, 0.8); }
    }
    hint('sewer', '지하 수로: 경비는 내려오지 않는다. 다른 맨홀 아래에서 [올라가기]');
    return;
  }
  if (P.vent) {
    const fast = mode !== 'sneak'; P.mode = fast ? 'walk' : 'sneak'; P.hidden = true; P.light = 0;
    P.moving = mag > 0.05;
    if (P.moving) {
      const nx = mx / mag, ny = my / mag, sp = fast ? 92 : 52;
      P.x += nx * sp * dt; P.y += ny * sp * dt;
      const sol = (tx, ty) => !ventAt(tx, ty);
      collide(P, 10, sol); collide(P, 10, sol);
      P.a += clamp(angDiff(P.a, Math.atan2(ny, nx)), -12 * dt, 12 * dt);
      P.stepT -= dt; if (P.stepT <= 0) { P.stepT = fast ? 0.4 : 0.62; if (fast) { play('step_m' + ((Math.random() * 3) | 0), 0.4); noise(P.x, P.y, 150, 'vent'); } else play('step_m' + ((Math.random() * 3) | 0), 0.06, 0.8); }
    }
    hint('vent', '환풍구: 살금살금(조이스틱 살짝)은 조용하다. 서두르면 쇠 덕트가 울려 아래 경비가 듣는다. 창살 밑을 지나는 경비는 [끌어올려 암살]');
    return;
  }
  if (P.hide) {
    P.mode = 'sneak'; P.moving = false; P.hidden = true; P.light = 0;
    if (mag > 0.5 && !S.hideExitLock) leaveHide({ x: mx / mag, y: my / mag });
    hint('hideDir', '숨은 상태에서 조이스틱(방향키)을 밀면 그 방향으로 빠져나온다');
    if (mag < 0.1) S.hideExitLock = false;
    if (P.hide && P.hide.type === 'well') hint('well', '맨홀·우물 안: 지나가는 경비를 끌어들여 암살하거나, [지하로]를 눌러 지하 수로를 걸어서 이동한다');
    return;
  }
  if (P.hurtT > 0) P.hurtT -= dt;
  P.mode = mode;
  if (input.aiming) {
    if (!canAim()) input.aiming = null;
    else { if (mag > 0.05) P.a += clamp(angDiff(P.a, Math.atan2(my, mx)), -9 * dt, 9 * dt); mag = 0; hint('aim', '집중: 조준하는 동안 시간이 멈춘다. 방향을 잡고, 오래 누를수록 멀리 던진다. 떼면 사용'); }
  }
  if (P.strikeT > 0) { P.strikeT = Math.max(0, P.strikeT - dt); mag = 0; }  // 0 아래로 내려가면 '공격 중'으로 남아 벽 기대기가 막혔다
  // 벽에 기대기: 벽(가구·차 포함) 쪽으로 잠깐 밀면 등을 붙인다. 기댄 채로는 벽을 따라 옆걸음만, 벽에서 떨어지는 쪽으로 밀면 나온다
  if (P.cover) {
    const n = coverAt(P, P.cover), away = mag > 0.05 ? (mx * P.cover.x + my * P.cover.y) / mag : 0;
    const into = mag > 0.05 ? -(mx * P.cover.x + my * P.cover.y) / mag : 0;
    if (!n || away > 0.45 || P.carrying || P.captive || mode === 'run' || (P.cover.auto && mag > 0.05 && into < 0.7)) { P.cover = null; }
    else { P.cover = Object.assign(n, { auto: P.cover.auto && !(mag > 0.05 && into >= 0.7) }); mode = 'sneak'; P.mode = 'sneak'; if (mag > 0.05) { const al = mx * -n.y + my * n.x; mx = -n.y * al; my = n.x * al; mag = Math.abs(al); if (mag < 0.2) mag = 0; } }
  } else if (mag > 0.05 && mode !== 'run' && !P.carrying && !P.captive && (!P.z || ROB) && !P.strikeT) {
    P.idleWall = 0;
    const n = coverAt(P); if (n && (mx * n.x + my * n.y) / mag < -0.92) { P.coverPush = (P.coverPush || 0) + dt; if (P.coverPush > 0.42) { enterCover(n); mag = 0; } } else P.coverPush = 0;  // 벽을 향해 거의 똑바로 잠깐 밀어야 기댄다 (비스듬히 걸을 땐 안 걸린다)
  } else {
    P.coverPush = 0;
    // 벽에 붙어 멈추면 저절로 기댄다 (움직이면 바로 떨어진다)
    if (mag <= 0.05 && mode !== 'run' && !P.carrying && !P.captive && (!P.z || ROB) && !P.strikeT && !P.pick && !input.aiming) {
      const n = coverAt(P); if (n) { P.idleWall = (P.idleWall || 0) + dt; if (P.idleWall > 0.22) { enterCover(n, true); P.cover.auto = true; } } else P.idleWall = 0;
    } else P.idleWall = 0;
  }
  // 조작감: 아주 짧은 가속·감속(무게감), 모서리에 걸리면 옆으로 미끄러져 빠져나간다
  const sp0 = SPD[mode] * (mode === 'sneak' && perkOn('shadow') ? 1.2 : 1) * (P.carrying ? 0.6 : P.captive ? 0.55 : 1) * (STAGE.pspd || 1);
  const tvx = mag > 0.05 ? mx / mag * sp0 : 0, tvy = mag > 0.05 ? my / mag * sp0 : 0;
  const kk = 1 - Math.exp(-dt * (mag > 0.05 ? 24 : 30));
  P.vx = (P.vx || 0) + (tvx - (P.vx || 0)) * kk; P.vy = (P.vy || 0) + (tvy - (P.vy || 0)) * kk;
  if (Math.hypot(P.vx, P.vy) < 4 && mag <= 0.05) { P.vx = 0; P.vy = 0; }
  P.moving = mag > 0.05;
  if (P.moving || P.vx || P.vy) {
    const nx = mag > 0.05 ? mx / mag : 0, ny = mag > 0.05 ? my / mag : 0;
    const sp = sp0;
    const solid = solidFor(P.z), rad = P.z ? 10 : 13, ox = P.x, oy = P.y;
    P.x += P.vx * dt; P.y += P.vy * dt;
    collide(P, rad, solid); collide(P, rad, solid);
    if (P.moving && Math.hypot(P.x - ox, P.y - oy) < sp * dt * 0.35) {
      // 막힌 방향의 양옆을 살펴 비어 있는 쪽으로 밀어 준다 (문틀·골목 입구에서 걸리지 않게)
      const ax = Math.abs(nx) >= Math.abs(ny), px = ax ? 0 : 1, py = ax ? 1 : 0, fx = ax ? Math.sign(nx) : 0, fy = ax ? 0 : Math.sign(ny);
      for (const sgn of [1, -1]) {
        const tx = Math.floor((P.x + fx * (rad + 6) + px * sgn * 18) / TILE), ty = Math.floor((P.y + fy * (rad + 6) + py * sgn * 18) / TILE);
        const sx2 = Math.floor((P.x + px * sgn * 18) / TILE), sy2 = Math.floor((P.y + py * sgn * 18) / TILE);
        if (!solid(tx, ty) && !solid(sx2, sy2)) { P.x += px * sgn * sp * dt * 0.9; P.y += py * sgn * sp * dt * 0.9; collide(P, rad, solid); break; }
      }
    }
    if (!P.moving) { P.x = clamp(P.x, 14, MW * TILE - 14); P.y = clamp(P.y, 14, MH * TILE - 14); }
    P.x = clamp(P.x, 14, MW * TILE - 14); P.y = clamp(P.y, 14, MH * TILE - 14);
    if (P.moving) P.a += clamp(angDiff(P.a, Math.atan2(ny, nx)), -14 * dt, 14 * dt);
    P.stepT -= dt;
    if (P.moving && P.stepT <= 0) {
      P.stepT = { sneak: 0.56, walk: 0.4, run: 0.28 }[mode];
      const r = ({ sneak: 22, walk: 110, run: 250 }[mode] + (P.carrying ? 35 : 0)) * (mode === 'walk' && perkOn('sole') ? 0.75 : 1) * floorMul(P.x, P.y, P.z);
      play(P.z ? 'step_w' + ((Math.random() * 3) | 0) : stepSound(P.x, P.y), { sneak: 0.12, walk: 0.32, run: 0.55 }[mode] * (P.z ? 0.7 : 1));
      { const mt = P.z ? null : tileAt(P.x, P.y); if (MAT[mt]) { play(mt === 'x' ? 'glass' : mt === 'm' ? 'metal' : mt === 'p' ? 'drop' : 'step_d0', mt === 'x' ? 0.18 : 0.14, mt === 'p' ? 1.7 : 1.5); hint('mat', '바닥 재질: 유리 조각·철판·물웅덩이·자갈은 발소리가 커진다(살금살금이어도 유리는 들린다). 돌아가거나 천천히'); } }
      if (P.carrying) play('cloth', 0.12);
      noise(P.x, P.y, r, 'step');
    }
  }
  P.hidden = P.z === 0 && tileAt(P.x, P.y) === 'B';
  P.light = lightAt(P.x, P.y, P.z > 0);
  if (P.captive) { const g = P.captive, o = pairGrab(P) ? 10 : 22; g.x = P.x + Math.cos(P.a) * o; g.y = P.y + Math.sin(P.a) * o; g.a = P.a; }
  if (P.carrying) {
    const c = P.carrying; c.fl = flOf(P); const sh = pairCarry(P), bx = sh ? P.x : P.x - Math.cos(P.a) * 24, by = sh ? P.y - 1 : P.y - Math.sin(P.a) * 24;
    c.x += (bx - c.x) * Math.min(1, dt * (sh ? 30 : 10)); c.y += (by - c.y) * Math.min(1, dt * (sh ? 30 : 10)); c.a = P.a + Math.PI;
    c.light = lightAt(c.x, c.y);
  }
  if (S.keyDrop && P.z === 0 && flOf(P) === (S.keyDrop.fl || 0) && dist(P.x, P.y, S.keyDrop.x, S.keyDrop.y) < 34) { const k = S.keyDrop.key || 'gold'; S.keyDrop = null; giveKey(k, keyName(k) + '을(를) 주웠다'); bark('hero', 'key'); }
  for (const it of S.keyItems || []) if (!it.got && !P.z && !P.under && !P.vent && flOf(P) === it.fl && dist(P.x, P.y, it.x, it.y) < 34) { it.got = true; giveKey(it.key, keyName(it.key) + '을(를) 찾았다'); }
  for (const it of S.items) if (!it.got && P.z === 0 && flOf(it) === flOf(P) && dist(P.x, P.y, it.x, it.y) < 32) {
    it.got = true; play('switch', 0.6); play('cloth', 0.3);
    const left = S.items.filter(i => !i.got).length;
    toast(left ? `밀서 회수 — 남은 ${left}장` : '밀서를 모두 회수했다. 탈출 지점으로', 3, 'good');
  }
  if (P.z >= 3) hint('top', '3층 옥상: 멀리 보이고 경비가 거의 올려다보지 못한다. 너무 높아서 낙하 암살은 안 된다');
  if (P.z) {
    hint('roof', '지붕 위: 경비는 위를 잘 보지 않는다. 단, 활을 든 감시병은 지붕을 똑바로 본다. 아래 경비 가까이 가면 [낙하 암살]');
    if (jumpTarget()) hint('gap', '골목 건너편 지붕을 향해 서면 [건너뛰기]로 넘어간다 (같은 높이나 한 층 아래만)');
    if (P.z === 2) hint('high', '2층 지붕: 땅으로 바로 뛰어내릴 수 없다. 1층 지붕으로 내려가거나 배관을 이용하라');
  }
  else {
    if (P.hidden) hint('bush', '덤불 속에선 바로 옆이 아니면 보이지 않는다');
    if (P.light < 0.25 && !P.hidden) hint('dark', '어둠 속에선 경비 시야가 크게 줄어든다 (원뿔의 진한 안쪽만 위험)');
    const nh = nearHide();
    if (nh && nh.furn) hint('furnHide', '옷장·침대 밑·사물함: [숨기]로 들어가고, 시체를 메고 [넣기]로 하나씩 숨긴다. 지나가는 사람을 끌어들여 처치할 수도 있다. 수색하는 경비는 가까운 가구도 열어 본다');
    if (nh && nh.type === 'box') hint('box', CITY ? '쓰레기통: [숨기]로 들어가 숨고, 시체를 메고 와서 [넣기]로 버린다 (2구까지)' : '은신 궤짝: [숨기]로 들어가고, 시체를 업고 [넣기]로 보관한다');
    if (nh && nh.type === 'well') hint('well0', STAGE.well === 'manhole' ? '맨홀: 숨어서 기습 암살하거나 다른 맨홀로 이동할 수 있다' : '우물·땅굴: 숨어서 기습 암살하거나 다른 출구로 이동할 수 있다');
    const cl = nearClimb(); if (cl) hint(cl.gas ? 'gas' : cl.kind, cl.kind === 'balc' ? '베란다: 난간을 붙잡고 2층으로 오른다. 안에서는 같은 창 앞에서 [베란다로 나가 내려가기]' : cl.gas ? '가스관: 정면 벽 노란 배관을 타고 옥상까지 오른다' : cl.kind === 'pipe' ? '배관: [오르기]로 건물 지붕까지 타고 오른다' : '사다리: [오르기]로 지붕에 올라간다');
    const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
    if (N8.some(o => inMap(tx + o[0], ty + o[1]) && G[ty + o[1]][tx + o[0]] === 'S')) hint('secret', '벽에 금이 간 곳은 숨겨진 통로다. 그대로 걸어 들어가면 지나갈 수 있다 (경비는 모른다)');
    if (bldAt(tx, ty) >= 0) hint('inside', '건물 안은 들어와야 보인다. 밖에서는 안에 누가 있는지 소리로만 알 수 있다');
  }
  updateWindowView(P);
  checkObjective();
  if (S.exitOpen && P.z === 0 && !flOf(P) && dist(P.x, P.y, S.exit.x, S.exit.y) < S.exit.r && !S.over) endGame(true);
}
// 창문 앞에서 창문 쪽을 바라보고 있으면 그 건물 안이 보인다
function updateWindowView(P) {
  const was = S.peek; S.peek = null;
  if (P.z || P.fl || P.hide || P.vent || P.under || P.jump) return;
  if (bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) >= 0) return;
  let best = null, bd = 76;
  for (const w of S.windows) {
    const b = bldAt(w.tx, w.ty); if (b < 0) continue;
    const d = dist(P.x, P.y, w.x, w.y); if (d >= bd) continue;
    if (Math.abs(angDiff(P.a, Math.atan2(w.y - P.y, w.x - P.x))) > 0.9) continue;
    bd = d; best = { w, b };
  }
  S.peek = best;
  if (best && !was) { play('cloth', 0.12); hint('peek', '창문 쪽을 바라보면 안이 보인다. 고개를 돌리면 다시 가려진다'); }
}
// ---------------------------------------------------------------- 기회 (Hitman식): 직접 보거나 엿들어 알게 된 암살 수단을 임무 칸에 모은다
function oppsInit() {
  S.opps = [];
  (S.traps || []).forEach((tr, i) => { const p = tr.k === 'shock' ? tr.sw : tr.at; S.opps.push({ k: 'trap', ref: i, x: tc(p[0]), y: tc(p[1]), fl: 0, roof: tr.k === 'drop', text: tr.k === 'shock' ? '전선을 끊어 물웅덩이 감전시키기' : '옥상 간판을 떨어뜨려 아래를 덮치기' }); });
  if (STAGE.fuse) S.opps.push({ k: 'fuse', x: tc(STAGE.fuse[0]), y: tc(STAGE.fuse[1]), fl: 0, text: '두꺼비집을 내려 동네 조명 전부 끄기' });
  const cds = []; for (const d of S.doors) if (d.keyLock === 'code' && !cds.some(o => dist(o.x, o.y, d.x, d.y) < 120)) cds.push(d);
  cds.forEach(d => S.opps.push({ k: 'code', d, x: d.x, y: d.y, fl: d.fl || 0, text: '' }));
  if (STAGE.disguise) S.opps.push({ k: 'dress', seen: true, text: '조직원을 쓰러뜨려 옷을 빼앗아 변장하기' });
}
function oppText(o) { if (o.k === 'trap' && S.traps[o.ref] && S.traps[o.ref].tip) return o.text + ' — ' + S.traps[o.ref].tip; return o.k === 'code' ? (S.player.keys.code ? `비번 ${STAGE.code || ''}로 잠긴 문 열기` : '잠긴 문 비번 알아내기 — 엿듣거나 쪽지 찾기') : o.text; }
function oppDone(o) { return o.k === 'trap' ? !!(S.traps[o.ref] && S.traps[o.ref].used) : o.k === 'fuse' ? !S.lightsOn : o.k === 'code' ? !o.d.locked : o.k === 'dress' ? !!S.player.disguise : false; }
function updateOpps(dt) {
  if (!S.opps) oppsInit();
  if ((S.oppT = (S.oppT || 0) - dt) > 0) return; S.oppT = 0.3;
  const P = S.player, fP = flOf(P);
  for (const o of S.opps) {
    if (o.seen || o.x == null) continue;
    const got = (o.k === 'code' && P.keys.code) || (fP === o.fl && !P.under && !P.vent && dist(P.x, P.y, o.x, o.y) < (o.roof ? 380 : 300) && (o.roof || los(P.x, P.y, o.x, o.y, true)));
    if (got) { o.seen = true; if (!oppDone(o)) { toast('기회 발견 — ' + oppText(o), 3, 'good'); play('click', 0.35, 1.3); } }
  }
}
function drawCorpseRisk() {
  for (const c of S.corpses) {
    if (c.stashed || flOf(c) !== flOf(S.player)) continue;
    if (c.risk && !c.carried && dist(c.x, c.y, S.player.x, S.player.y) < 700) { const pu = 0.45 + 0.35 * Math.sin(S.t * 6); ctx.strokeStyle = `rgba(240,90,70,${pu})`; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.ellipse(c.x, c.y + 4, 26, 15, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '700 11px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(7,10,18,.8)'; ctx.fillRect(c.x - 34, c.y - 34, 68, 15); ctx.fillStyle = '#ff9a86'; ctx.fillText('눈에 띄는 시체', c.x, c.y - 23); ctx.textAlign = 'left'; hint('corpseRisk', '붉은 점선 시체: 경비가 그쪽을 보면 발견한다. 메고(특수) 수거함·맨홀·어두운 구석으로 옮겨라'); }
  }
}
function drawOpps(P) {
  if (!showOpps || !S.opps) return; const fP = flOf(P), k = Math.max(1, 0.95 / SCALE);
  for (const o of S.opps) {
    if (!o.seen || o.x == null || oppDone(o) || (o.fl !== fP && !tactical)) continue;
    if (!tactical && dist(P.x, P.y, o.x, o.y) > 760) continue;
    const x = o.x, y = o.y - 34 * k, s = 7 * k, pulse = 0.7 + 0.3 * Math.sin(S.t * 3);
    ctx.fillStyle = `rgba(242,196,107,${0.9 * pulse})`; ctx.strokeStyle = 'rgba(7,10,18,.9)'; ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.font = `700 ${Math.round(11 * k)}px "IBM Plex Sans KR", sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(7,10,18,.85)';
    const lab = '기회', tw = ctx.measureText(lab).width + 8 * k; ctx.fillRect(x - tw / 2, y - s - 17 * k, tw, 15 * k); ctx.fillStyle = '#f2c46b'; ctx.fillText(lab, x, y - s - 6 * k); ctx.textAlign = 'left';
  }
}
// ---------------------------------------------------------------- 체크포인트 (목표를 이룰 때마다, 조용해지면 저장)
let CP = null;
function cloneDeep(o, memo = new Map()) {
  if (o === null || typeof o !== 'object') return o;
  if (memo.has(o)) return memo.get(o);
  if (ArrayBuffer.isView(o)) { const c = o.slice(); memo.set(o, c); return c; }
  const ct = o.constructor; if (ct && ct !== Object && ct !== Array) return o;
  const c = Array.isArray(o) ? new Array(o.length) : {}; memo.set(o, c);
  for (const k of Object.keys(o)) c[k] = cloneDeep(o[k], memo);
  return c;
}
const cpOn = () => DKEY !== 'hard' || !!(STAGE && STAGE.tutorial);
function cpProgress() { return S.guards.filter(g => g.target && g.state === 'DEAD').length + S.items.filter(i => i.got).length + (S.keyItems || []).filter(i => i.got).length + (S.exitOpen ? 1 : 0); }
function updateCheckpoint(dt) {
  if (!cpOn() || S.over) return;
  const pr = cpProgress(); if (pr > (S.cpProg || 0)) { S.cpProg = pr; S.cpWant = true; }
  if (!S.cpWant || (S.cpT = (S.cpT || 0) - dt) > 0) return; S.cpT = 0.5;
  const P = S.player;
  if (S.alevel >= 2 || S.radioCall || P.trav || P.jump || P.lunge || P.captive || P.wire || P.ledge || P.strikeT > 0 || S.keypad) return;
  if (S.guards.some(g => !g.civ && ['ALERT', 'NOTICE', 'BODY'].includes(g.state))) return;
  S.cpWant = false; saveCheckpoint();
}
function saveCheckpoint() {
  CP = { si: STAGE_I, diff: DKEY, S: cloneDeep(S), grids: [G0.map(r => r.slice())].concat(GF.slice(1).map(g => g ? g.map(r => r.slice()) : null)), used: CP && CP.si === STAGE_I ? CP.used : 0 };
  if (!STAGE.tutorial) { toast('체크포인트 저장 — 죽으면 여기서 다시 시작할 수 있다', 2.4, 'good'); play('switch', 0.3, 1.6); }
}
const cpReady = () => !!(CP && CP.si === STAGE_I && CP.diff === DKEY && cpOn());
function loadCheckpoint() {
  if (!cpReady()) return false;
  initAudio();
  CP.used++; S = cloneDeep(CP.S); S.stats.cpUsed = CP.used;
  CP.grids.forEach((g, f) => { const dst = f ? GF[f] : G0; if (!g || !dst) return; for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) dst[y][x] = g[y][x]; });
  setLayer(flOf(S.player)); cam.x = S.player.x; cam.y = S.player.y; hudCache = {}; miniBase = null;
  tactical = false; $('tacBanner').hidden = true; input.aiming = null; input.scan = false; if (input.queue) input.queue.length = 0;
  S.keypad = null; const kp = $('keypad'); if (kp) kp.hidden = true;
  resetDialog(); running = true; paused = false;
  $('end').hidden = true; $('pause').hidden = true; $('hud').hidden = false;
  toast('체크포인트에서 다시 시작 (' + CP.used + '번째)', 2.4); syncTools();
  return true;
}
function checkObjective() {
  if (S.exitOpen) return;
  const targetsLeft = S.spare ? 0 : S.guards.filter(g => g.target && g.state !== 'DEAD').length;
  const itemsLeft = S.items.filter(i => !i.got).length;
  if (!targetsLeft && !itemsLeft) { S.exitOpen = true; if (S.guards.some(g => g.target)) toast('목표 완료. 탈출 지점으로', 3.5, 'good'); bark('master', 'done'); }
}

// ---------------------------------------------------------------- 전깃줄
function wirePt(w, s) { const cx = (w.a.dx + w.b.dx) / 2, cy = (w.a.dy + w.b.dy) / 2 + w.sag * 2, u = 1 - s; return { x: u * u * w.a.dx + 2 * u * s * cx + s * s * w.b.dx, y: u * u * w.a.dy + 2 * u * s * cy + s * s * w.b.dy }; }
function wireGround(w, s) { return { x: w.a.x + (w.b.x - w.a.x) * s, y: w.a.y + (w.b.y - w.a.y) * s }; }
// 옥상 가장자리의 줄 끝에 서 있으면 [전깃줄 타기]
function nearWireMount() {
  const P = S.player; if (!S.wires.length || !P.z || P.wire || P.jump || P.carrying || P.captive) return null;
  let best = null, bd = 46;
  for (const w of S.wires) for (const [n, s] of [[w.a, 0], [w.b, 1]]) { if (!n.roof || n.z !== P.z) continue; const d = dist(P.x, P.y, n.x, n.y); if (d < bd) { bd = d; best = { w, s, at: { x: n.dx, y: n.dy } }; } }
  if (best) return best;
  // 줄 중간: 옥상 가장자리 바로 옆을 지나는 줄(높이 차 한 층 이내)은 손을 뻗어 잡는다
  bd = 40;
  for (const w of S.wires) for (let i = 2; i <= 38; i++) {
    const s = i / 40, h = wirePt(w, s), z = w.a.z + (w.b.z - w.a.z) * s; if (Math.abs(z - P.z) > 1.01) continue;
    const d = dist(P.x, P.y, h.x, h.y); if (d < bd) { bd = d; best = { w, s, at: { x: h.x, y: h.y }, mid: true }; }
  }
  return best;
}
// 전봇대 밑에 서 있으면 [전봇대 오르기] — 바라보는 방향의 줄로
function nearPole() {
  const P = S.player; if (!S.poles.length || P.z || P.fl || P.wire || P.jump || P.carrying || P.captive || P.hide) return null;
  let best = null, bd = 56;
  for (const o of S.poles) {
    if (!o.wires.length) continue; const d = dist(P.x, P.y, o.x, o.y); if (d >= bd) continue;
    let bw = null, bs = -9;
    for (const w of o.wires) { const far = w.a.pole === o ? w.b : w.a; const sc = Math.cos(angDiff(P.a, Math.atan2(far.y - o.y, far.x - o.x))); if (sc > bs) { bs = sc; bw = w; } }
    bd = d; best = { w: bw, s: bw.a.pole === o ? 0 : 1, pole: o, at: { x: o.x, y: o.y - 30 } };
  }
  return best;
}
// 줄 위(그려진 위치) 바로 옆에 같은 높이쯤의 옥상이 있으면 그리로 내려선다
function wireNearRoof(h, z) {
  const tx0 = Math.floor(h.x / TILE), ty0 = Math.floor(h.y / TILE); let best = null, bd = 34;
  for (let ty = ty0 - 1; ty <= ty0 + 1; ty++) for (let tx = tx0 - 1; tx <= tx0 + 1; tx++) {
    const lv = rLv(tx, ty); if (!lv || lv < z - 1 || lv > z + 1) continue;
    const cx = clamp(h.x, tx * TILE + 14, tx * TILE + TILE - 14), cy = clamp(h.y, ty * TILE + 14, ty * TILE + TILE - 14), d = dist(h.x, h.y, cx, cy);
    if (d < bd) { bd = d; best = { x: cx, y: cy, lv }; }
  }
  return best;
}
function wireEnd() { const P = S.player, W_ = P.wire; if (!W_) return null; const tol = 44 / W_.w.L; return W_.s <= tol ? W_.w.a : W_.s >= 1 - tol ? W_.w.b : null; }
// 줄 아래(실외, 맨땅)를 지나는 경비 위로 떨어진다
function wireDropTarget() {
  const P = S.player; if (!P.wire || P.strikeT > 0) return null;
  let best = null, bd = 74;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || (g.state === 'ALERT' && !g.target) || flOf(g)) continue;
    const gx = Math.floor(g.x / TILE), gy = Math.floor(g.y / TILE); if (roofAt(gx, gy) || bldAt(gx, gy) >= 0) continue;
    const d = dist(P.x, P.y, g.x, g.y); if (d < bd) { bd = d; best = g; }
  }
  return best;
}
function wireFallOk() { const P = S.player, tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE); return !groundSolidP(tx, ty) && !roofAt(tx, ty) && bldAt(tx, ty) < 0; }
// 전깃줄에서 내리기: 옥상 끝 → 옥상 / 창문 끝 → 그 층 실내 / 전봇대 → 땅
function wireDismount(n) {
  const P = S.player, h = wirePt(P.wire.w, P.wire.s), hx = h.x, hy = h.y + 36; P.wire = null; play('cloth', 0.35);
  if (n.roof) { startTrav({ pts: [{ x: hx, y: hy, f: 0 }, { x: n.x, y: n.y, f: 1 }], dur: 0.45, phases: [{ to: 1, pose: 'vault' }], end: () => { P.z = n.z; P.x = n.x; P.y = n.y; setLayer(0); } }); return; }
  if (n.win) { const wx = tc(n.tx), wy = tc(n.ty - 1);
    startTrav({ pts: [{ x: hx, y: hy, f: 0 }, { x: wx, y: wy, f: 1 }], dur: 0.55, phases: [{ to: 1, pose: 'vault' }], face: -Math.PI / 2,
      end: () => { P.z = 0; P.fl = n.fl; setLayer(P.fl); P.x = wx; P.y = wy; P.a = -Math.PI / 2; noise(P.x, P.y, 35, 'window'); S.fade = 0.2; toast(`${n.fl + 1}층 창문으로 들어왔다`, 1.8); } }); return; }
  setLayer(0); const o = n.pole; let best = null, bs = 1e9;
  for (const d of N8) { const tx = o.tx + d[0], ty = o.ty + d[1]; if (groundSolidP(tx, ty) || roofAt(tx, ty) || bldAt(tx, ty) >= 0) continue; const sc = Math.abs(d[0]) + Math.abs(d[1]) + (d[1] > 0 ? -0.5 : 0); if (sc < bs) { bs = sc; best = [tx, ty]; } }
  const gx = best ? tc(best[0]) : o.x, gy = best ? tc(best[1]) : o.y + 20;
  startTrav({ pts: [{ x: hx, y: hy, f: 0 }, { x: o.x, y: o.y + 4, f: 0.85 }, { x: gx, y: gy, f: 1 }], dur: 1.0, phases: [{ to: 0.85, pose: 'climb' }, { to: 1, pose: 'walk' }], face: -Math.PI / 2, down: true, base: { x: o.x, y: o.y }, step: 'metal', loud: 40,
    end: () => { P.z = 0; P.x = gx; P.y = gy; noise(P.x, P.y, 40, 'climb'); } });
}
function updateWire(P, mx, my, mag, mode, dt) {
  const W_ = P.wire; let w = W_.w;
  P.moving = false; P.mode = mode;
  if (mag > 0.15) {
    const ux = (w.b.dx - w.a.dx) / w.L, uy = (w.b.dy - w.a.dy) / w.L, d = (mx * ux + my * uy) / mag;
    if (Math.abs(d) > 0.2) {
      let s = W_.s + Math.sign(d) * ({ sneak: 46, walk: 72, run: 104 }[mode]) * (STAGE.pspd || 1) / w.L * dt;
      if (s < 0 || s > 1) {
        const end = s < 0 ? w.a : w.b; s = clamp(s, 0, 1);
        if (end.roof || end.win) { wireDismount(end); return; }  // 옥상·창문 끝에 닿으면 바로 내려선다
        if (end.pole) {  // 전봇대에서 미는 방향의 다른 줄로 갈아탄다
          let best = null, bs = 0.35;
          for (const o of end.pole.wires) { if (o === w) continue; const far = o.a.pole === end.pole ? o.b : o.a; const fx = far.dx - end.dx, fy = far.dy - end.dy, fl = Math.hypot(fx, fy) || 1; const sc = (mx * fx + my * fy) / (fl * mag); if (sc > bs) { bs = sc; best = o; } }
          if (best) { W_.w = w = best; s = best.a.pole === end.pole ? 0 : 1; play('metal', 0.15); }
        }
      }
      W_.s = s; P.moving = true; W_.fa = Math.atan2(uy * Math.sign(d), ux * Math.sign(d));
      P.stepT -= dt; if (P.stepT <= 0) { P.stepT = mode === 'run' ? 0.3 : 0.5; play('cloth', mode === 'run' ? 0.22 : 0.08, 1.2); if (mode === 'run') noise(P.x, P.y, 90, 'wire'); }
    }
  }
  const g = wireGround(W_.w, W_.s); P.x = g.x; P.y = g.y;
  P.z = Math.max(1, Math.round(W_.w.a.z + (W_.w.b.z - W_.w.a.z) * W_.s));
  P.light = lightAt(P.x, P.y, true); P.hidden = false; P.a = -Math.PI / 2;
  hint('wire', '전깃줄: 방향키로 줄을 따라 이동한다. 아래를 지나는 경비 위에서 [낙하 암살]. 끝에서 옥상에 올라서거나 전봇대로 내려간다. 뛰면 줄이 출렁여 소리가 난다');
  checkObjective();
}

// ---------------------------------------------------------------- 상호작용 대상 찾기
// 숨을 곳 이름: 궤짝(수거함) · 우물(맨홀) · 옷장 · 침대 밑 · 사물함
const FURN_HIDE = { wardrobe: '옷장', bed: '침대 밑', locker: '사물함', okt: '옥탑방' };
// 열쇠·카드키: 색마다 맞는 문만 연다 (gold = 예전 판의 그냥 열쇠)
const KEYS = { gold: ['열쇠', '#f2c46b'], red: ['빨강 카드', '#ff5a5a'], blue: ['파랑 카드', '#5aa8ff'], green: ['초록 카드', '#5ad88a'], code: ['비번', '#c8ccd2'] };
const keyName = k => k === 'code' ? (hasK('code') ? '비번 ' + (STAGE.code || '') : '숫자 자물쇠') : (KEYS[k] || KEYS.gold)[0], keyCol = k => (KEYS[k] || KEYS.gold)[1];
const hasK = k => !!(S.player.keys && S.player.keys[k]);
function giveKey(k, msg) { S.player.keys[k] = true; S.player.hasKey = true; play('click', 0.5); toast(msg || keyName(k) + '을(를) 챙겼다', 2.2, 'good'); }
const hideName = h => FURN_HIDE[h.type] || (h.type === 'well' ? (STAGE.well === 'manhole' ? '맨홀' : '우물') : h.type === 'bush' ? '덤불' : CITY ? '쓰레기통' : '궤짝');
const hideIn = h => h.type === 'bed' ? '침대 밑' : hideName(h) + ' 안';
function nearHide() {
  const P = S.player; if (P.wire || P.jump) return null; let best = null, bd = 60;
  for (const b of S.hides) { if ((b.fl || 0) !== flOf(P) || (b.z || 0) !== (P.z || 0)) continue; const d = dist(P.x, P.y, b.x, b.y); if (d < bd) { bd = d; best = b; } }
  return best;
}
// 오르기: 바닥 쪽(b)에 서 있으면 / 내려가기: 위쪽(u)에 서 있으면
function nearClimb() {
  const P = S.player; if (P.carrying || P.captive || P.jump) return null; let best = null, bd = 44;
  for (const l of S.ladders) { if (l.bz !== P.z || (P.z === 0 && (l.bfl || 0) !== flOf(P)) || (l.kind === 'chimney' && lampOn(l.lamp))) continue; const d = dist(P.x, P.y, l.x, l.y); if (d < bd) { bd = d; best = l; } }
  return best;
}
// 위층에서 아래층으로 (같은 층계 칸)
function nearFloorDown() {
  const P = S.player; if (P.z || !flOf(P) || P.jump || P.carrying || P.captive) return null; let best = null, bd = 44;
  for (const l of S.ladders) { if ((l.kind !== 'fstair' && l.kind !== 'balc') || l.tfl !== flOf(P)) continue; const d = l.kind === 'balc' ? dist(P.x, P.y, l.ux, l.uy) : dist(P.x, P.y, l.x, l.y); if (d < bd) { bd = d; best = l; } }
  return best;
}
function nearNote() {
  const P = S.player; if (P.z || P.wire || P.jump || P.hide || !S.notes) return null; let best = null, bd = 44;
  for (const n of S.notes) { if (n.fl !== flOf(P)) continue; const d = dist(P.x, P.y, n.x, n.y); if (d < bd) { bd = d; best = n; } }
  return best;
}
// 쪽지를 읽는다. 표적을 살려 둘 근거(spare)가 되는 쪽지면 선택이 열린다
function readNote(n) {
  const first = !n.read; n.read = true; play('cloth', 0.35);
  if (first && n.gives) { S.player.keys[n.gives] = true; S.player.hasKey = true; if (n.learn) S.learned.push(n.learn); toast('알아냈다 — ' + (n.learn || keyName(n.gives)), 3, 'good'); }
  const lines = n.lines.map(t => [{ note: n.title }, t]);
  const sp = STAGE.spare, tgt = S.guards.find(g => g.target);
  if (first && sp && n.key === sp.note && tgt) {
    if (tgt.state === 'DEAD') { S.realized = true; lines.push(['hero', sp.after]); }
    else { S.spare = true; lines.push(['hero', sp.before]); }
  }
  say(lines, true, () => { if (S.spare && tgt && tgt.state !== 'DEAD') { toast(sp.toast, 4.5, 'good'); checkObjective(); } });
}
// 위층 옆 창문 → 마주 보는 옆 건물 창문
// 넘어 들어가는 곳 바로 앞에 있는 사람(같은 층) — 착지와 함께 처리한다
function landingVictim(x, y, fl) {
  const L0 = CUR_F; setLayer(fl); let best = null, bd = 78;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) !== fl || g.z || g.climb || g.dog || (g.state === 'ALERT' && !g.target)) continue;
    const d = dist(x, y, g.x, g.y); if (d < bd && los(x, y, g.x, g.y)) { bd = d; best = g; }
  }
  setLayer(L0); return best;
}
function nearSideWin() {
  const P = S.player; if (P.z || !flOf(P) || P.wire || P.jump || P.carrying || P.captive) return null; let best = null, bd = 46;
  for (const w of S.fwindows) { if (!w.link || w.fl !== flOf(P)) continue; const ix = tc(w.tx - w.link.dir), d = dist(P.x, P.y, ix, w.y); if (d < bd) { bd = d; best = w; } }
  return best;
}
// 위층 창문 안쪽에서 창밖 전깃줄로
function nearWinWire() {
  const P = S.player; if (P.z || !flOf(P) || P.wire || P.jump || P.carrying || P.captive) return null; let best = null, bd = 52;
  for (const w of S.wires) for (const [n, s] of [[w.a, 0], [w.b, 1]]) { if (!n.win || n.fl !== flOf(P)) continue; const d = dist(P.x, P.y, tc(n.tx), tc(n.ty - 1)); if (d < bd) { bd = d; best = { w, s, at: { x: tc(n.tx), y: tc(n.ty) } }; } }
  return best;
}
function nearClimbDown() {
  const P = S.player; if (!P.z || P.jump) return null; let best = null, bd = 52;
  for (const l of S.ladders) { if (l.tz !== P.z) continue; const d = dist(P.x, P.y, l.rx != null ? l.rx : l.ux, l.ry != null ? l.ry : l.uy); if (d < bd) { bd = d; best = l; } }
  return best;
}
// 골목 건너뛰기: 바라보는 방향으로 1~2칸 틈 너머의 같은 높이(또는 한 층 아래) 지붕
function jumpTarget() {
  const P = S.player; if (!P.z || P.jump) return null;
  const k = Math.round(P.a / (Math.PI / 4)), a = k * Math.PI / 4;
  const dx = Math.round(Math.cos(a)), dy = Math.round(Math.sin(a));
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  if (rLv(tx + dx, ty + dy) >= P.z) return null;
  const ex = tc(tx) + dx * TILE / 2, ey = tc(ty) + dy * TILE / 2;
  if (dist(P.x, P.y, ex, ey) > 34) return null;
  // 정면벽 줄(건물 옆면)은 거리에 넣지 않는다: 실제 틈은 골목 폭이다
  let real = 0;
  for (let n = 1; n <= 12; n++) {
    const lx = tx + dx * n, ly = ty + dy * n; if (!inMap(lx, ly)) return null;
    const lv = rLv(lx, ly);
    if (n > 1 && lv > 0 && (lv === P.z || lv === P.z - 1) && real >= 1) return { tx: lx, ty: ly, z: lv };
    if (lv >= P.z) return null;
    if (!facadeRow(lx, ly)) real++;
    if (real > 1) return null;  // 사람 한 칸 정도 틈만 건너뛴다
  }
  return null;
}
function canKill(g, P, reach = 56) {
  if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.doomed || g.climb || flOf(g) !== flOf(P) || (g.z || 0) !== (P.z || 0)) return false;
  const d = dist(P.x, P.y, g.x, g.y); if (d > reach) return false;
  if (g.state === 'ALERT' && !g.target && !radioBusy(g)) return false;
  const behind = Math.abs(angDiff(g.a, Math.atan2(P.y - g.y, P.x - g.x))) > 1.75;
  if (g.civ) return (behind || g.state === 'SLEEP' || g.state === 'PANIC') && los(P.x, P.y, g.x, g.y);
  if (!behind && !(g.target && (g.state === 'FLEE' || (g.state !== 'ALERT' && d < 36))) && !(radioBusy(g) && d <= 56)) return false;
  return los(P.x, P.y, g.x, g.y) && (d <= 56 || lungeClear(P, g));
}
// 돌진 경로: 가는 길에 벽·가구가 없어야 한다
function lungeClear(P, g) {
  const n = Math.ceil(dist(P.x, P.y, g.x, g.y) / 12), sol = solidFor(P.z || 0);
  for (let i = 1; i < n; i++) { const x = P.x + (g.x - P.x) * i / n, y = P.y + (g.y - P.y) * i / n; if (sol(Math.floor(x / TILE), Math.floor(y / TILE))) return false; }
  return true;
}
const LUNGE = 112;  // 등 뒤에서 이 거리 안이면 달려들어 암살
// 땅 위 암살 대상 (최대 2명 — 붙어 있으면 동시 암살)
function killList() {
  const P = S.player; if (P.carrying || P.captive || P.strikeT > 0 || P.hide || P.jump || P.wire || P.trav || P.under || P.vent) return [];
  if (P.lunge) return [];
  let list = S.guards.filter(g => canKill(g, P)).sort((a, b) => dist(P.x, P.y, a.x, a.y) - dist(P.x, P.y, b.x, b.y));
  if (!list.length && !P.carrying) list = S.guards.filter(g => !g.civ && canKill(g, P, (P.mode === 'run' && P.moving ? 64 : LUNGE) * (perkOn('reach') ? 1.2 : 1))).sort((a, b) => dist(P.x, P.y, a.x, a.y) - dist(P.x, P.y, b.x, b.y)).slice(0, 1);
  if (list.length >= 2 && dist(list[0].x, list[0].y, list[1].x, list[1].y) < 112) return [list[0], list[1]];
  return list.slice(0, 1);
}
// 지붕 위에서 아래로 떨어지며 암살
function dropTarget() {
  const P = S.player; if (!P.z || P.z >= 3 || P.strikeT > 0 || P.jump) return null;
  // 지붕 가장자리 바깥의 맨땅 칸(뛰어내릴 자리)을 먼저 찾는다
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  const edges = N8.map(o => [tx + o[0], ty + o[1]]).filter(([x, y]) => !roofAt(x, y) && bldAt(x, y) < 0 && !groundSolidP(x, y));
  if (!edges.length) return null;
  let best = null, bd = P.z >= 2 ? 132 : 118;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || (g.state === 'ALERT' && !g.target) || flOf(g) || g.z || g.climb) continue;
    // 지붕 아래(건물 안)에 있는 사람은 지붕 위에서 칠 수 없다
    const gx = Math.floor(g.x / TILE), gy = Math.floor(g.y / TILE);
    if (roofAt(gx, gy) || bldAt(gx, gy) >= 0) continue;
    const d = dist(P.x, P.y, g.x, g.y); if (d >= bd) continue;
    // 뛰어내릴 자리에서 표적까지 벽에 막히지 않아야 한다
    if (!edges.some(([x, y]) => dist(tc(x), tc(y), g.x, g.y) < 100 && los(tc(x), tc(y), g.x, g.y))) continue;
    bd = d; best = g;
  }
  return best;
}
// 우물 속에서 끌어들이는 기습 암살
// 숨은 곳(궤짝·우물·덤불)에서 지나가는 경비를 끌어들여 암살 — 등 뒤일 필요 없음
function ambushTarget() {
  const P = S.player;
  const from = P.hide ? P.hide : (P.hidden && P.z === 0 && !P.carrying && !P.captive ? P : null);
  if (!from || P.strikeT > 0) return null;
  let best = null, bd = P.hide ? 80 : 60;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'ALERT' || g.state === 'FLEE' || g.state === 'CAPTIVE' || flOf(g) !== flOf(P) || g.z || g.climb) continue;
    const d = dist(from.x, from.y, g.x, g.y); if (d < bd && los(from.x, from.y, g.x, g.y)) { bd = d; best = g; }
  }
  return best;
}
// 창문 넘기: 창문 옆에 서 있고 반대편이 비어 있으면
// 창문 상태 (도시): open 열림 · lock 잠김(밖에서는 락픽, 안에서는 걸쇠를 풀면 열린다) · bar 방범창(못 지나간다, 엿보기는 된다)
// 건물마다 하나만 열려 있고, 물건·열쇠가 있는 방의 창문은 방범창
// 경비가 알아채는 흔적: 원래 잠겨 있던 창문·문이 열려 있으면 다가가 다시 잠근다 (인비저블 Inc 방식)
function noteChange(kind, ref, key) { if (!CITY) return; S.changes = S.changes || []; if (S.changes.some(c => c.ref === ref && !c.done)) return; S.changes.push({ kind, ref, key: key || null, x: ref.x, y: ref.y, fl: ref.fl || 0, by: null, done: false }); }
function changeOpen(c) { return c.kind === 'win' ? winSt(c.ref) === 'open' : !c.ref.locked; }
function updateChanges(dt) {
  if (!S.changes || !S.changes.length || (S.chgT = (S.chgT || 0) - dt) > 0) return; S.chgT = 0.25;
  const P = S.player;
  for (const c of S.changes) {
    if (c.done) continue; if (!changeOpen(c)) { c.done = true; continue; }
    if (c.by && (c.by.state === 'DEAD' || c.by.state === 'CAPTIVE' || c.by.state === 'ALERT' || c.by.state === 'FLEE' || c.by.state === 'TERROR')) c.by = null;
    if (!c.by) {
      for (const g of S.guards) {
        if (g.civ || g.dog || g.target || g.climb || g.z || !['PATROL', 'RETURN', 'CHECK'].includes(g.state) || flOf(g) !== c.fl) continue;
        const d = dist(g.x, g.y, c.x, c.y); if (d > 230 || Math.abs(angDiff(g.a, Math.atan2(c.y - g.y, c.x - g.x))) > guardFov(g) * 1.2) continue;
        setLayer(c.fl); const ok = los(g.x, g.y, c.x, c.y, true); setLayer(flOf(P)); if (!ok) continue;
        // 경비 쪽 칸으로 가서 본다
        let tx = Math.floor(c.x / TILE), ty = Math.floor(c.y / TILE), best = null, bd = 1e9;
        setLayer(c.fl); const sol = []; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) sol.push(solidAt(tx + dx, ty + dy)); setLayer(flOf(P));
        for (const [i, [dx, dy]] of [[1, 0], [-1, 0], [0, 1], [0, -1]].entries()) { const x = tx + dx, y = ty + dy; if (sol[i]) continue; const dd = dist(g.x, g.y, tc(x), tc(y)); if (dd < bd) { bd = dd; best = { x: tc(x), y: tc(y) }; } }
        c.by = g; c.at = best || { x: c.x, y: c.y }; goSuspicious(g, c.at.x, c.at.y, 2.2); gsay(g, c.kind === 'win' ? '창문이 왜 열려 있지?' : '이 문이 왜 열려 있어?', 2.4);
        if (dist(P.x, P.y, g.x, g.y) < 700) toast(c.kind === 'win' ? '경비가 열린 창문을 알아챘다 — 다시 잠그러 간다' : '경비가 열린 문을 알아챘다 — 다시 잠그러 간다', 2.4, 'warn');
        break;
      }
    } else {
      const g = c.by;
      if (g.state !== 'SUSPICIOUS' && g.state !== 'NOTICE') { if (dist(g.x, g.y, c.at.x, c.at.y) > 70) goSuspicious(g, c.at.x, c.at.y, 2.2); }
      if (dist(g.x, g.y, c.at.x, c.at.y) < 46 && dist(P.x, P.y, c.x, c.y) > 40) {
        if (c.kind === 'win') c.ref.st = 'lock'; else { if (doorBlocked(c.ref)) continue; if (c.key) c.ref.group.forEach(t => t.keyLock = c.key); setDoor(c.ref, true); for (const o of S.guards) if (o.path) o.path = null; }
        c.done = true; play('metal', 0.35 * proxVol(g)); noise(c.x, c.y, 40, 'door');
        if (dist(P.x, P.y, g.x, g.y) < 700) toast(c.kind === 'win' ? '창문이 다시 잠겼다' : '문이 다시 잠겼다', 1.8);
      }
    }
  }
}
// 연습(훈련장): 단계를 차례로 확인하고 다음 할 일을 알려 준다
function updateTutorial() {
  const st = STAGE.steps; if (!st || S.over) return; S.tutI = S.tutI || 0;
  while (S.tutI < st.length && st[S.tutI][1](S, S.player, input)) {
    S.tutI++; S.cpWant = true; play('switch', 0.45, 1.5);
    if (S.tutI < st.length) toast('잘했다 — 다음: ' + st[S.tutI][0], 3.4, 'good'); else toast('연습 끝 — 이제 실제 의뢰로', 3, 'good');
  }
}
function winInit() {
  S.winInit = true; if (!CITY) return;
  if (STAGE.tutorial) { for (const w of S.windows) w.st = bldAt(w.tx, w.ty) >= 0 ? 'lock' : 'open'; for (const w of S.windows) w.b = bldAt(w.tx, w.ty); return; }
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], doorT = new Set(S.doors.map(d => d.tx + ',' + d.ty));
  const keyPts = S.items.filter(i => !i.fl).concat((S.keyItems || []).filter(i => !i.fl)).map(i => [Math.floor(i.x / TILE), Math.floor(i.y / TILE)]);
  const byB = {};
  for (const w of S.windows) {
    const b = bldAt(w.tx, w.ty); w.b = b; if (b < 0) { w.st = 'open'; continue; }
    let inner = null; for (const [dx, dy] of N4) { const x = w.tx + dx, y = w.ty + dy; if (bldAt(x, y) === b && !groundSolidP(x, y)) { inner = [x, y]; break; } }
    if (inner) {  // 창문 안쪽 방(문에서 끊긴다)에 물건·열쇠가 있으면 방범창
      const seen = new Set([inner + '']), q = [inner]; let hit = false, door = false;
      while (q.length && seen.size < 260) { const [x, y] = q.shift(); if (keyPts.some(([kx, ky]) => Math.abs(kx - x) <= 1 && Math.abs(ky - y) <= 1)) hit = true;
        for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (doorT.has(k)) door = true; if (seen.has(k) || bldAt(nx, ny) !== b || doorT.has(k) || groundSolidP(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } }
      if (hit) w.st = door ? 'bar' : 'lock';  // 문이 없는 방이면 창문이 유일한 길이니 막지 않고 잠가 둔다
    }
    (byB[b] = byB[b] || []).push(w);
  }
  for (const b in byB) { const ws = byB[b].filter(w => !w.st).sort(() => Math.random() - 0.5); ws.forEach((w, i) => { w.st = i === 0 ? 'open' : Math.random() < 0.6 ? 'lock' : 'bar'; }); }
}
const winSt = w => w.st || 'open';
const pickDur = kind => (kind === 'door' ? 3.2 : kind === 'latch' ? 0.7 : 1.6) * (DKEY === 'easy' ? 0.8 : DKEY === 'hard' ? 1.25 : 1);
function startPick(o) { const P = S.player; P.pick = Object.assign({ t: 0, nt: 0.2 }, o, { dur: pickDur(o.kind) }); P.vx = P.vy = 0; P.cover = null; play('metal', 0.18, 1.8); hint('pick', '락픽: 따는 동안 움직이면 멈춘다(락픽은 성공해야 줄어든다). 긁는 소리가 조금씩 난다. 잠긴 창문은 안쪽에서라면 락픽 없이 걸쇠만 풀면 열린다'); }
function updatePick(P, mag, dt) {
  const K = P.pick; P.moving = false; P.mode = 'sneak'; P.light = lightAt(P.x, P.y, false); P.hidden = false;
  if (mag > 0.25 || P.hurtT > 0.4) { P.pick = null; toast('그만뒀다', 1.2); return; }
  K.t += dt; if ((K.nt -= dt) <= 0) { K.nt = 0.55; play('click', 0.14, 1.6 + Math.random() * 0.4); if (K.kind !== 'latch') noise(K.x, K.y, K.kind === 'door' ? 80 : 55, 'pick'); }
  if (K.t < K.dur) return;
  P.pick = null;
  if (K.kind === 'latch') { K.w.st = 'open'; noteChange('win', K.w); play('cloth', 0.3); toast('걸쇠를 풀었다 — 이 창문은 이제 열려 있다', 2); return; }
  P.picks--; S.stats.picks = (S.stats.picks || 0) + 1; play('switch', 0.5, 1.4);
  if (K.kind === 'win') { K.w.st = 'open'; noteChange('win', K.w); toast(`창문을 땄다 — 락픽 ${P.picks}개 남음`, 2.2, 'good'); }
  else { const d = K.d; noteChange('door', d, d.keyLock); d.keyLock = null; setDoor(d, false); toast(`잠금장치를 땄다 — 락픽 ${P.picks}개 남음`, 2.2, 'good'); }
}
function drawPickProgress(P) {
  const K = P.pick; if (!K) return; const k = Math.max(1, 0.95 / SCALE), f = Math.min(1, K.t / K.dur), x = P.x, y = P.y - 44 * k;
  ctx.fillStyle = 'rgba(7,10,18,.8)'; ctx.beginPath(); ctx.arc(x, y, 13 * k, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#f2c46b'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.arc(x, y, 13 * k, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
  ctx.font = `700 ${Math.round(11 * k)}px "IBM Plex Sans KR", sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#f2c46b'; ctx.fillText(K.kind === 'latch' ? '걸쇠' : '락픽', x, y + 4 * k); ctx.textAlign = 'left';
}
const onFacadeW = w => { const b = w.b != null ? w.b : bldAt(w.tx, w.ty); return b >= 0 && BLD[b].facade && w.ty >= BLD[b].y1 - BLD[b].fh + 1; };
// 방범창: 창살
function drawWinBars(w) {
  const vert = winVert(w), L = 40, T = 18;
  ctx.save(); ctx.translate(w.x, w.y + (vert ? 0 : 5)); if (vert) ctx.rotate(Math.PI / 2);
  ctx.strokeStyle = 'rgba(40,44,52,.95)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let i = -2; i <= 2; i++) { ctx.moveTo(i * 8, -T / 2 - 1); ctx.lineTo(i * 8, T / 2 + 1); } ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(170,176,186,.75)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(i * 8 - 1, -T / 2); ctx.lineTo(i * 8 - 1, T / 2); } ctx.stroke();
  ctx.restore();
}
function nearWindow() {
  const P = S.player; if (P.z || P.fl || P.jump || P.carrying || P.captive || P.hide) return null;
  for (const w of S.windows) {
    if (dist(P.x, P.y, w.x, w.y) > 52) continue;
    const dx = Math.abs(P.x - w.x) > Math.abs(P.y - w.y) ? Math.sign(w.x - P.x) : 0, dy = dx ? 0 : Math.sign(w.y - P.y);
    const ox = w.tx + dx, oy = w.ty + dy;
    if (winSt(w) === 'bar') continue;
    if (!groundSolidP(ox, oy)) return { w, tx: ox, ty: oy };
  }
  return null;
}
function dropSpot() {
  const P = S.player; if (!P.z || P.jump) return null;
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  let best = null, bd = 1e9;
  for (const o of N8) {
    const nx = tx + o[0], ny = ty + o[1];
    if (P.z === 1 ? (solidAt(nx, ny) || roofAt(nx, ny)) : lvAt(nx, ny) !== P.z - 1) continue;
    const d = dist(P.x + Math.cos(P.a) * 40, P.y + Math.sin(P.a) * 40, tc(nx), tc(ny));
    if (d < bd) { bd = d; best = [nx, ny]; }
  }
  if (!best || dist(P.x, P.y, tc(best[0]), tc(best[1])) > 72) return null;
  return [best[0], best[1], P.z - 1];
}
function kunaiTarget() {
  const P = S.player; if (P.kunai <= 0 || P.hide || P.under || P.vent || P.carrying || P.captive || P.strikeT > 0 || P.jump) return null;
  const elev = P.z > 0;
  const aimOn = false;
  let best = null, bs = 1e9;
  const consider = (x, y, ref, type, maxD) => {
    if (flOf(ref) !== flOf(P)) return;
    const d = dist(P.x, P.y, x, y); if (d > maxD || d < 20) return;
    const ad = Math.abs(angDiff(P.a, Math.atan2(y - P.y, x - P.x)));
    if (!aimOn && ad > 1.2) return;
    if (elev && roofAt(Math.floor(x / TILE), Math.floor(y / TILE))) return;  // 지붕 위에서 지붕 아래(건물 안)는 못 맞힌다
    if (!los(P.x, P.y, x, y, elev || type === 'lamp')) return;
    const score = aimOn ? dist(input.aim.x, input.aim.y, x, y) : ad * 160 + d * 0.4;
    if (aimOn && score > 70) return;
    if (score < bs) { bs = score; best = { type, ref, x, y }; }
  };
  for (const g of S.guards) if (g.state !== 'DEAD' && g.state !== 'CAPTIVE' && (g.state !== 'ALERT' || g.target || radioBusy(g))) consider(g.x, g.y, g, 'guard', 270 * (1 + P.z * 0.2));
  for (const l of S.lamps) if (lampOn(l) && !l.hearth) consider(l.x, l.y, l, 'lamp', 330);
  for (const c of S.cams || []) if (!c.broken) consider(c.x, c.y, c, 'cam', 330);
  return best;
}
function nearCorpse() {
  const P = S.player; if (P.z || P.jump) return null; let best = null, bd = 46;
  for (const c of S.corpses) { if (c.carried || c.stashed || flOf(c) !== flOf(P)) continue; const d = dist(P.x, P.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  return best;
}
function nearLamp() {
  const P = S.player; if (P.z || P.jump || P.hide) return null; let best = null, bd = 48;
  for (const l of S.lamps) { if (l.broken || l.pole || l.cut != null || !(l.off || lampOn(l)) || flOf(l) !== flOf(P)) continue; const d = dist(P.x, P.y, l.x, l.y); if (d < bd) { bd = d; best = l; } }
  return best;
}
function nearDoor() {
  const P = S.player; if (P.z || P.fl || P.jump || P.hide) return null; let best = null, bd = 58;
  for (const d of S.doors) { const dd = dist(P.x, P.y, d.x, d.y); if (dd < bd) { bd = dd; best = d; } }
  if (!best) return null;
  const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
  if (best.group.some(d => d.tx === ptx && d.ty === pty)) return null;
  return best;
}
function doorBlocked(d) { return d.group.some(t => S.guards.some(g => g.state !== 'DEAD' && Math.floor(g.x / TILE) === t.tx && Math.floor(g.y / TILE) === t.ty) || S.corpses.some(c => !c.stashed && !c.carried && Math.floor(c.x / TILE) === t.tx && Math.floor(c.y / TILE) === t.ty)); }
function setDoor(d, lock) { d.group.forEach(t => { t.locked = lock; G[t.ty][t.tx] = lock ? 'X' : t.orig; }); }
function nearBushSpot() {
  const P = S.player; if (P.fl) return null; let best = null, bd = 64;
  for (const b of S.bushes) { const d = dist(P.x, P.y, b.x, b.y); if (d < bd) { bd = d; best = b; } }
  return best;
}
function nearFuse() { const P = S.player; return !P.z && !P.fl && STAGE.fuse && S.lightsOn && dist(P.x, P.y, tc(STAGE.fuse[0]), tc(STAGE.fuse[1])) < 62; }

function nearVent() {
  const P = S.player; if (P.jump || P.carrying || P.captive || P.hide || P.under || P.fl) return null;
  let best = null, bd = P.vent ? 34 : 42;
  for (const v of S.vents) { if (!P.vent && v.z !== P.z) continue; const d = dist(P.x, P.y, v.x, v.y); if (d < bd) { bd = d; best = v; } }
  return best;
}
// 환풍구 창살 바로 밑을 지나는 경비를 끌어올린다
function ventAmbushTarget() {
  const P = S.player; if (!P.vent) return null;
  const v = S.vents.filter(v => !v.roof && dist(P.x, P.y, v.x, v.y) < 34)[0]; if (!v) return null;
  let best = null, bd = 50;
  for (const g of S.guards) {
    if (['DEAD', 'CAPTIVE', 'ALERT', 'FLEE'].includes(g.state) || g.elite || g.dog || g.z || g.climb) continue;
    const d = dist(g.x, g.y, v.x, v.y); if (d < bd) { bd = d; best = g; }
  }
  return best ? { g: best, v } : null;
}
// 주 행동 버튼에 무엇이 걸려 있는지
function nearSewerExit() {
  const P = S.player; let best = null, bd = 50;
  for (const h of S.hides) if (h.type === 'well') { const d = dist(P.x, P.y, h.x, h.y); if (d < bd) { bd = d; best = h; } }
  return best;
}
const winUsable = w => !!w.link || S.wires.some(x => [x.a, x.b].some(n => n.win && n.fl === w.fl && n.tx === w.tx && n.ty === w.ty));
// 문 행동: 색 잠금 · 한쪽에서만 풀리는 빗장(지름길) · 보통 문
// 숫자판: 비번 문 앞에서 직접 눌러 연다. 틀리면 삑 소리가 퍼진다
function openKeypad(d) {
  const el = document.getElementById('keypad'); if (!el) { if (hasK('code')) { setDoor(d, false); d.group.forEach(t => t.keyLock = false); } return; }
  S.keypad = { d, buf: '', bad: 0 }; el.hidden = false; S.player.vx = 0; S.player.vy = 0; input.aiming = null;
  document.getElementById('kpHint').textContent = hasK('code') ? '메모: 알아낸 비번 ' + STAGE.code : '비번을 모른다 — 엿듣거나 쪽지를 찾아라';
  kpShow(); play('click', 0.3);
}
function kpShow() { const k = S.keypad; if (!k) return; const n = (STAGE.code || '0000').length; document.getElementById('kpDisp').textContent = Array.from({ length: n }, (_, i) => k.buf[i] || '·').join(' '); }
function closeKeypad() { const el = document.getElementById('keypad'); if (el) el.hidden = true; if (S) S.keypad = null; }
// 들킬 듯할 때 짧게 똑딱 — 알아채는 정도가 오를수록 높고 빠르게
function warnTick(m) { if (!AC || muted) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = 520 + 760 * m; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.1); }
function updateWarn(dt) {
  let m = 0; for (const g of S.guards) if (!g.civ && g.seen && g.state !== 'ALERT' && g.state !== 'DEAD') m = Math.max(m, g.meter || 0);
  if (m < 0.15) { S.warnT = 0; return; }
  if ((S.warnT = (S.warnT || 0) - dt) <= 0) { S.warnT = 0.55 - 0.4 * Math.min(1, m); warnTick(m); }
}
// 시체가 경비 눈에 띌 수 있는 자리인가 (누가 그쪽을 보면 보인다)
function updateCorpseRisk(dt) {
  if ((S.crT = (S.crT || 0) - dt) > 0) return; S.crT = 0.3;
  for (const c of S.corpses) {
    c.risk = false; if (c.stashed || c.carried || c.discovered || c.hidden || c.accident) continue;
    for (const g of S.guards) { if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.climb || flOf(g) !== flOf(c) || dist(g.x, g.y, c.x, c.y) > 520) continue;
      const gg = Object.create(g); gg.a = Math.atan2(c.y - g.y, c.x - g.x); if (canSee(gg, c.x, c.y, c.light, false, false, false) > 0) { c.risk = true; break; } }
  }
}
function kpBeep(ok) { if (!AC || muted) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = ok ? 'sine' : 'square'; o.frequency.value = ok ? 1320 : 220; g.gain.setValueAtTime(0.08, t); g.gain.linearRampToValueAtTime(0, t + (ok ? 0.12 : 0.35)); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.4); }
function kpPress(v) {
  const k = S && S.keypad; if (!k) return; const n = (STAGE.code || '0000').length;
  if (v === 'x') { closeKeypad(); return; }
  if (v === '<') { k.buf = k.buf.slice(0, -1); kpShow(); play('click', 0.15); return; }
  if (v === 'ok' || (v.length === 1 && k.buf.length + 1 === n && (k.buf += v))) {
    if (v !== 'ok' && v.length === 1) kpShow();
    if (k.buf.length < n) return;
    if (k.buf === STAGE.code) {
      const d = k.d; kpBeep(true); setTimeout(() => { if (!S) return; d.group.forEach(t => t.keyLock = false); setDoor(d, false); S.stats.keyDoors = (S.stats.keyDoors || 0) + 1; play('metal', 0.4); toast('비번이 맞았다 — 문이 열렸다', 1.8, 'good'); closeKeypad(); }, 260);
    } else {
      kpBeep(false); k.bad++; noise(k.d.x, k.d.y, 70 + k.bad * 30, 'beep', k.d.fl || 0);
      const el = document.getElementById('kpDisp'); el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad');
      toast(k.bad >= 2 ? '틀렸다 — 삑 소리가 커진다' : '틀렸다', 1.4, 'warn'); k.buf = ''; setTimeout(kpShow, 350);
    }
    return;
  }
  if (/^[0-9]$/.test(v) && k.buf.length < n) { k.buf += v; play('click', 0.2); kpShow(); }
}
function doorAct(dr) {
  const P = S.player;
  if (dr.gate && dr.locked) {
    const dx = P.x - dr.x, dy = P.y - dr.y, ok = dr.gate === 'n' ? dy < 0 : dr.gate === 's' ? dy > 0 : dr.gate === 'w' ? dx < 0 : dx > 0;
    return ok ? { k: 'door', d: dr, label: '빗장 풀기' } : { k: 'keymsg', d: dr, label: '반대편에 빗장이 걸렸다' };
  }
  if (dr.keyLock === 'code' && dr.locked) return { k: 'keypad', d: dr, label: '비번 입력' };
  if (dr.keyLock && dr.locked && !hasK(dr.keyLock) && CITY && P.picks > 0) return { k: 'pick', d: dr, o: { kind: 'door', d: dr, x: dr.x, y: dr.y }, label: `락픽으로 따기 (${keyName(dr.keyLock)} 대신 · ${P.picks}개)` };
  return dr.keyLock && dr.locked ? { k: hasK(dr.keyLock) ? 'door' : 'keymsg', d: dr, label: hasK(dr.keyLock) ? keyName(dr.keyLock) + '로 열기' : '잠김 (' + keyName(dr.keyLock) + ')' + (CITY ? ' — 락픽도 없다' : '') } : { k: 'door', d: dr, label: dr.locked ? '문 열기' : '문 잠그기' };
}
// 암살하려고 다가가는 중에는 Space가 문·비번·조명·두꺼비집·쪽지 같은 다른 행동을 하지 않는다 (그 행동은 Z로 넘긴다)
const RISKY_K = new Set(['door', 'keypad', 'lamp', 'bfuse', 'fuse', 'read', 'keymsg', 'pick']);
const KILL_K = new Set(['kill', 'kill2', 'drop', 'ambush', 'pull', 'ventKill', 'ledgeKill', 'pushOff', 'winJump']);
function stalkGuard() {
  const P = S.player; if (P.z || P.carrying || P.captive || P.hide || P.under || P.vent || P.wire) return null;
  let best = null, bd = 190;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.state === 'FLEE' || g.state === 'TERROR' || g.climb || (g.state === 'ALERT' && !radioBusy(g))) continue;
    if (flOf(g) !== flOf(P) || (g.z || 0) !== (P.z || 0)) continue;
    const d = dist(P.x, P.y, g.x, g.y); if (d < bd && los(P.x, P.y, g.x, g.y)) { bd = d; best = g; }
  }
  return best;
}
function primaryAction() {
  const a = primaryActionRaw();
  if (RISKY_K.has(a.k)) { const sg = stalkGuard(); if (sg) return { k: 'none', stalk: sg, held: a, label: sg.civ ? '기절시키기' : '암살' }; }
  return a;
}
function primaryActionRaw() {
  const P = S.player;
  if (P.trav || P.lunge) return { k: 'none', label: '…' };
  if (P.under) { const w = nearSewerExit(); return w ? { k: 'surface', w, label: '올라가기' } : { k: 'none', label: '지하' }; }
  if (P.vent) { const t = ventAmbushTarget(); if (t) return { k: 'ventKill', g: t.g, v: t.v, label: '끌어올려 암살' }; const v = nearVent(); return v ? { k: 'ventOut', v, label: v.roof ? '옥상으로 나가기' : v.street ? '거리로 나가기' : '방으로 내려가기' } : { k: 'none', label: '환풍구' }; }
  if (P.hide) { const g = ambushTarget(); return g ? { k: 'ambush', g, label: '끌어들여 암살' } : { k: 'leave', label: '나오기' }; }
  if (P.jump) return { k: 'none', label: '…' };
  if (P.wire) {
    const h = wirePt(P.wire.w, P.wire.s), at = { x: h.x, y: h.y - 6 };
    const g = wireDropTarget(); if (g) return { k: 'drop', g, label: '낙하 암살' };
    const e = wireEnd(); if (e) return { k: 'wireOff', n: e, at, label: e.roof ? '옥상에 올라서기' : e.win ? `${e.fl + 1}층 창문으로 들어가기` : '전봇대 내려가기' };
    const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE), lv = rLv(ptx, pty);
    if (lv > 0 && lv <= P.z + 1) return { k: 'wireRoof', lv, at, label: '옥상에 내리기' };
    const nr = wireNearRoof(h, P.z); if (nr) return { k: 'wireRoof', lv: nr.lv, to: nr, at, label: '옆 옥상으로 내려서기' };
    if (wireFallOk()) return { k: 'wireFall', at, label: '뛰어내리기' };
    return { k: 'none', label: '전깃줄' };
  }
  if (P.ledge) { const lg = ledgeTarget(); return lg ? { k: 'ledgeKill', g: lg, label: lg.civ ? '끌어내리기' : '끌어내려 떨어뜨리기' } : { k: 'ledgeUp', label: '올라서기' }; }
  if (P.z) {
    const po = pushOffTarget(); if (po) return { k: 'pushOff', g: po, at: po.climb.to, label: '배관에서 밀어 떨어뜨리기' };
    const kz = killList(); if (kz.length) return { k: kz.length === 2 && !kz.some(g => g.civ) ? 'kill2' : 'kill', list: kz.length === 2 && kz.some(g => g.civ) ? kz.slice(0, 1) : kz, label: (dist(P.x, P.y, kz[0].x, kz[0].y) > 56 ? '달려들어 ' : '') + (kz[0].target ? '표적 암살' : '암살') };
    if (P.cover) { const cg = coverTarget(); if (cg) return { k: 'pull', g: cg, label: cg.civ ? '끌어당겨 기절시키기' : '끌어당겨 암살' }; }  // 옥탑방 벽에 기대 있을 때
    const tz = nearTrap(); if (tz) return { k: 'trap', tp: tz, label: tz.label };
    const hz = nearHide(); if (hz) return P.carrying ? { k: 'stash', label: '넣기' } : { k: 'hide', h: hz, label: `${hideName(hz)}에 숨기` };  // 옥탑방
    const g = dropTarget(); if (g) return { k: 'drop', g, label: '낙하 암살' };
    const wm = nearWireMount(); if (wm) return { k: 'wireOn', w: wm.w, s: wm.s, at: wm.at, label: wm.mid ? '손 뻗어 전깃줄 잡기' : '전깃줄 타기' };
    const cd = nearClimbDown(); if (cd) return cd.kind === 'chimney' ? (lampOn(cd.lamp) ? { k: 'smother', l: cd, label: '굴뚝 막기 (불 끄기)' } : { k: 'down', l: cd, label: '굴뚝으로 내려가기' }) : { k: 'down', l: cd, label: cd.kind === 'stair' ? '계단 내려가기' : '내려가기' };
    const rv = nearVent(); if (rv) return { k: 'ventIn', v: rv, label: '환풍구로 들어가기' };
    const jt = jumpTarget(); if (jt) return { k: 'leap', j: jt, label: '건너뛰기' };
    const ds = dropSpot(); if (ds) return { k: 'jump', s: ds, label: P.z >= 2 ? '1층 지붕으로' : '뛰어내리기' };
    return { k: 'none', label: '암살' };
  }
  if (P.captive) {
    const h = nearHide();
    if (h && h.bodies < h.cap) return { k: 'drag', h, label: h.type === 'well' ? '우물로 끌고 가 처치' : `${hideName(h)}${h.type === 'bed' ? '으로' : '으로'} 끌고 가 처치` };
    const bs = nearBushSpot(); if (bs) return { k: 'drag', h: bs, label: '덤불로 끌고 가 처치' };
    return { k: 'execute', label: '처치' };
  }
  if (P.hidden) { const ag = ambushTarget(); if (ag) return { k: 'ambush', g: ag, label: '끌어들여 암살' }; }
  if (P.cover) { const cg = coverTarget(); if (cg) return { k: 'pull', g: cg, label: cg.civ ? '끌어당겨 기절시키기' : '끌어당겨 암살' }; }
  const kl = killList();
  if (kl.length === 2 && !kl.some(g => g.civ)) return { k: 'kill2', list: kl, label: '동시 암살' };
  if (kl.length === 2) kl.length = 1;
  if (kl.length === 1) return { k: 'kill', list: kl, label: kl[0].civ ? '기절시키기' : (dist(P.x, P.y, kl[0].x, kl[0].y) > 56 ? '달려들어 ' : '') + (kl[0].target ? '표적 암살' : '암살') };
  const nt = nearNote(); if (nt) return { k: 'read', n: nt, at: { x: nt.x, y: nt.y }, label: nt.read ? '다시 읽기' : '읽기' };
  const sw = nearSideWin(); if (sw) { const L = sw.link, v = landingVictim(tc(L.tx + L.dir), tc(L.ty), sw.fl); if (v) return { k: 'winJump', w: sw, kill: v, at: { x: v.x, y: v.y }, label: v.civ ? '창문 넘어 기절시키기' : '창문 넘어 암살' }; return { k: 'winJump', w: sw, at: { x: sw.x, y: sw.y }, label: `창문 건너 옆 건물 ${sw.fl + 1}층으로` }; }
  const ww = nearWinWire(); if (ww) return { k: 'wireOn', w: ww.w, s: ww.s, at: ww.at, label: '창밖 전깃줄 타기' };
  const pw = nearPole(); if (pw) return { k: 'wireOn', w: pw.w, s: pw.s, at: pw.at, pole: true, label: '전봇대 올라 전깃줄로' };
  const cu = nearClimb(); if (cu && cu.kind === 'balc') { const v = landingVictim(cu.ux, cu.uy, cu.tfl); if (v) return { k: 'up', l: cu, kill: v, at: { x: cu.x, y: cu.y - 30 }, label: v.civ ? '베란다 넘어 기절시키기' : '베란다 넘어 암살' }; }
  if (cu) return { k: 'up', l: cu, label: cu.kind === 'balc' ? '베란다 타고 2층으로' : cu.gas ? '가스관 타고 옥상으로' : cu.kind === 'pipe' ? '배관 오르기' : cu.kind === 'fstair' ? `계단 올라 ${cu.tfl + 1}층` : cu.kind === 'stair' ? '계단 올라 옥상' : cu.kind === 'chimney' ? '굴뚝으로 오르기' : '오르기' };
  const gv = nearVent(); if (gv) return { k: 'ventIn', v: gv, label: '환풍구로 들어가기' };
  const fd = nearFloorDown(); if (fd) return { k: 'fdown', l: fd, label: fd.kind === 'balc' ? '베란다로 나가 내려가기' : `계단 내려가 ${fd.bfl + 1}층` };
  const nw = nearWindow(); if (nw) {
    if (winSt(nw.w) === 'lock') { const inside = bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) === nw.w.b;
      if (inside) return { k: 'pick', at: { x: nw.w.x, y: nw.w.y }, o: { kind: 'latch', w: nw.w, x: nw.w.x, y: nw.w.y }, label: '창문 걸쇠 풀기' };
      return P.picks > 0 ? { k: 'pick', at: { x: nw.w.x, y: nw.w.y }, o: { kind: 'win', w: nw.w, x: nw.w.x, y: nw.w.y }, label: `잠긴 창문 — 락픽으로 따기 (${P.picks}개)` } : { k: 'keymsg', at: { x: nw.w.x, y: nw.w.y }, label: '잠긴 창문 — 락픽이 없다' }; }
    return { k: 'window', wv: nw, label: '창문 넘기' };
  }
  const h = nearHide();
  if (h && !P.carrying) return { k: 'hide', h, label: '숨기' };
  if (h && P.carrying) return { k: 'stash', label: '넣기' };
  const tp = nearTrap(); if (tp) return { k: 'trap', tp, label: tp.label };
  if (nearFuse()) return { k: 'fuse', label: '전체 조명 끄기' };
  // 문과 두꺼비집·조명이 함께 가까우면 더 가까운 쪽
  // 문·두꺼비집·조명이 함께 가까우면: 가까운 쪽, 단 방금 고른 것은 24px 더 멀어질 때까지 유지 (몇 픽셀 차이로 바뀌지 않게). 다른 하나는 Z로
  const dr = nearDoor(), bf = nearBFuse(), lp = nearLamp(), cands = [];
  if (dr && !P.carrying) cands.push({ k: 'door', d: dist(P.x, P.y, dr.x, dr.y), a: () => doorAct(dr) });
  if (bf) cands.push({ k: 'bfuse', d: dist(P.x, P.y, bf.x, bf.y), a: () => ({ k: 'bfuse', fb: bf, label: '두꺼비집 내리기 (이 건물 전등)' }) });
  if (lp) cands.push({ k: 'lamp', d: dist(P.x, P.y, lp.x, lp.y), a: () => ({ k: 'lamp', l: lp, label: lp.hearth ? (lp.off ? '불 피우기' : '아궁이 불 끄기') : lp.off ? '조명 켜기' : '조명 끄기' }) });
  if (cands.length) {
    cands.sort((a, b) => a.d - b.d); let pick = cands[0];
    const pref = cands.find(c => c.k === S.ikPref); if (pref && pref !== pick && pref.d - pick.d < 24) pick = pref;
    S.ikPref = pick.k; const res = pick.a(), other = cands.find(c => c !== pick); if (other) res.alt = other.a();
    return res;
  }
  return { k: 'none', label: '암살' };
}
function actPrimary(force) {
  if (!S || S.over || paused || !running) return;
  if (DLG.modal) { advanceDialog(); return; }
  const a = force && force.viaZ ? force : primaryAction(), P = S.player;
  // 입력 버퍼: 지금 할 수 있는 게 없으면 잠깐 안에 생기는 행동을 대신 실행 (암살하러 다가가는 중이면 암살만 기다린다)
  if (a.k === 'none') { S.qBuf = a.stalk ? 0.5 : 0.25; S.qKill = !!a.stalk; if (a.stalk) hint('stalk', '경비가 가까이 있으면 Space(행동 버튼)는 암살만 한다. 문·비번·조명·두꺼비집·쪽지는 Z(특수 버튼)로 한다'); return; }
  S.qBuf = 0; S.qKill = false; P.vx = 0; P.vy = 0;
  switch (a.k) {
    case 'leave': leaveHide(); break;
    case 'surface': {
      const w = a.w; P.under = false; P.x = w.x; P.y = w.y; P.hide = w; P.hideFrom = null; w.spotted = false; S.hideExitLock = true;
      play('metal', 0.35); S.fade = 0.35; toast('맨홀 아래로 올라왔다 — 아직 숨어 있다', 2); break;
    }
    case 'ambush': {
      const g = a.g, h = P.hide;
      if (h) {
        if (h.bodies < h.cap) { killGuard(g, 'stash', h); toast(h.type === 'well' ? '우물 속으로 끌어들였다' : `${hideIn(h)}으로 끌어들였다`, 2, 'good'); }
        else { killGuard(g); toast('끌어들였지만 궤짝이 꽉 차 시체가 밖에 남았다', 2.4, 'warn'); }
      } else { killGuard(g, 'bush', P); toast('덤불 속으로 끌어들였다', 2, 'good'); }
      S.stats.special++; break;
    }
    case 'window': {
      const v = a.wv;
      P.jump = { x0: P.x, y0: P.y, x1: tc(v.tx), y1: tc(v.ty), t: 0, dur: 0.6, z1: 0, arc: 14, noise: 45, vault: true };
      P.a = Math.atan2(P.jump.y1 - P.y, P.jump.x1 - P.x); play('cloth', 0.4);
      hint('window', '창문은 경비가 지나다니지 않는다. 안팎을 몰래 드나드는 길로 써라');
      break;
    }
    case 'drop': {
      const g = a.g; P.z = 0; P.jump = null; P.wire = null; P.x = g.x; P.y = g.y; P.strikeT = 0.4; P.a = g.a;
      play('land', 0.5); killGuard(g); S.stats.special++;
      toast('낙하 암살', 1.8, 'good'); collide(P, 13, groundSolidP); break;
    }
    case 'wireOn': {
      const grab = () => { if (P.fl) { P.fl = 0; setLayer(0); S.fade = 0.15; }
        P.wire = { w: a.w, s: a.s }; P.z = Math.max(1, Math.round(a.w.a.z + (a.w.b.z - a.w.a.z) * a.s)); const h = wirePt(a.w, a.s); P.x = h.x; P.y = h.y + 40; };
      play(a.pole ? 'metal' : 'cloth', 0.3); noise(P.x, P.y, a.pole ? 45 : 25, 'climb');
      if (a.pole) {  // 전봇대를 붙잡고 꼭대기까지 기어오른다
        const o = { x: a.at.x, y: a.at.y + 30 }, h = wirePt(a.w, a.s);
        startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: o.x, y: o.y + 4, f: 0.15 }, { x: h.x, y: h.y + 36, f: 1 }], dur: 0.75, phases: [{ to: 1, pose: 'climb' }], face: -Math.PI / 2, base: { x: o.x, y: o.y }, step: 'metal', loud: 40, end: grab });
        hint('pole', '전봇대: 땅에서 올라 바로 전깃줄로 옮겨 탄다. 전봇대 끝에서 방향키를 밀면 다른 줄로 갈아탄다');
      } else grab();
      break;
    }
    case 'wireOff': wireDismount(a.n); break;
    case 'wireRoof': { P.wire = null; P.z = a.lv; if (a.to) { P.x = a.to.x; P.y = a.to.y; } play('land', 0.3); noise(P.x, P.y, 50 * floorMul(P.x, P.y, 1), 'land'); break; }
    case 'wireFall': {
      const h = wirePt(P.wire.w, P.wire.s); P.wire = null;
      P.jump = { x0: P.x, y0: P.y, x1: P.x, y1: P.y, t: 0, dur: 0.32, z1: 0, arc: 8, noise: 130 };
      play('throw', 0.3); break;
    }
    case 'down': {
      const l = a.l, fin = () => { P.z = l.bz; P.fl = l.bfl || 0; setLayer(P.fl); P.x = l.x; P.y = l.y;
        if (l.kind === 'chimney') { noise(l.ux, l.uy, 70, 'soot'); S.fx.push({ k: 'smoke', x: l.ux, y: l.uy, t: 0 }); toast('굴뚝을 타고 아궁이로 내려왔다 (그을음 소리가 조금 났다)', 2.2); } };
      play(l.kind === 'pipe' ? 'metal' : 'cloth', 0.3);
      if (l.kind === 'pipe' || l.kind === 'ladder') {  // 배관·사다리를 붙잡고 한 칸씩 내려간다
        const top = { x: l.rx != null ? l.rx : l.ux, y: l.ry != null ? l.ry : l.uy }, lv = Math.max(1, (l.tz || 1) - (l.bz || 0));
        startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: top.x, y: top.y + 18, f: 0.14 }, { x: l.x, y: l.y, f: 1 }], dur: 0.4 + lv * 0.36, phases: [{ to: 0.14, pose: 'vault' }, { to: 1, pose: 'climb' }], face: -Math.PI / 2, down: true, base: { x: l.x, y: l.y }, step: 'metal', loud: 45, end: fin });
      } else startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y, f: 1 }], dur: 0.45, phases: [{ to: 1, pose: 'walk' }], end: () => { fin(); S.fade = 0.12; } });
      break;
    }
    case 'read': readNote(a.n); break;
    case 'winJump': {
      const w = a.w, L = w.link, tx = tc(L.tx + L.dir), ty = tc(L.ty);
      P.jump = { x0: P.x, y0: P.y, x1: a.kill ? a.kill.x - L.dir * 26 : tx, y1: a.kill ? a.kill.y : ty, t: 0, dur: 0.62, z1: 0, arc: 22, noise: a.kill ? 20 : 45, killG: a.kill || null, vault: true };
      P.a = L.dir > 0 ? 0 : Math.PI; play('throw', 0.3); play('cloth', 0.3);
      hint('winJump', '창문 건너기: 붙어 있는 빌라는 같은 층 옆 창문끼리 건너뛴다. 착지 소리가 조금 난다');
      break;
    }
    case 'fdown': { const l = a.l;
      if (l.kind === 'balc') {  // 난간을 넘어 밖으로 나가 기둥을 타고 내려간다
        P.fl = 0; setLayer(0); S.fade = 0.12; play('cloth', 0.35);
        startTrav({ pts: [{ x: l.ux, y: l.uy - 10, f: 0 }, { x: l.ux, y: l.uy + 24, f: 0.28 }, { x: l.x, y: l.y, f: 1 }], dur: 1.0, phases: [{ to: 0.28, pose: 'vault' }, { to: 1, pose: 'climb' }], face: -Math.PI / 2, down: true, base: { x: l.x, y: l.y }, step: 'cloth', loud: 40,
          end: () => { P.z = 0; P.x = l.x; P.y = l.y; P.a = Math.PI / 2; noise(l.x, l.y, 45, 'climb'); } });
        break;
      }
      startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y + 8, f: 1 }], dur: 0.4, phases: [{ to: 1, pose: 'walk' }], end: () => { P.fl = l.bfl; setLayer(P.fl); P.x = l.x; P.y = l.y; play('step_w0', 0.3); S.fade = 0.15; } });
      break; }
    case 'up': {
      const l = a.l, top = { x: l.rx != null ? l.rx : l.ux, y: l.ry != null ? l.ry : l.uy };
      if (l.kind === 'balc') {  // 베란다: 난간까지 기어올라 넘어 들어간다
        const v = a.kill && a.kill.state !== 'DEAD' ? a.kill : null;
        play('cloth', 0.35); noise(l.x, l.y, v ? 30 : 55, 'climb');
        startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y, f: 0.12 }, { x: l.ux, y: l.uy + 26, f: 0.72 }, { x: l.ux, y: l.uy, f: 1 }], dur: 1.05, phases: [{ to: 0.72, pose: 'climb' }, { to: 1, pose: 'vault' }], face: -Math.PI / 2, base: { x: l.x, y: l.y }, step: 'cloth',
          end: () => { P.fl = 1; setLayer(1); P.x = l.ux; P.y = l.uy; P.a = -Math.PI / 2; S.fade = 0.12;
            if (v && v.state !== 'DEAD') { const g = v; P.x = g.x; P.y = g.y + 22; collide(P, 13, groundSolidP); P.strikeT = 0.35; P.a = Math.atan2(g.y - P.y, g.x - P.x); killGuard(g); if (!g.civ) { S.stats.special++; toast('베란다 넘어 암살', 1.8, 'good'); } }
            else toast('베란다 난간을 타고 2층으로 들어왔다', 1.8); } });
        break;
      }
      if (l.kind === 'fstair') {  // 실내 계단: 계단 칸으로 걸어 올라간다
        startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y - 8, f: 1 }], dur: 0.42, phases: [{ to: 1, pose: 'walk' }],
          end: () => { P.fl = l.tfl; setLayer(P.fl); P.x = l.x; P.y = l.y; play('step_w1', 0.3); S.fade = 0.15; hint('floors', '위층: 같은 자리 계단으로 오르내린다. 위층 사람은 아래층·바깥에서 보이지 않고, 정면 창문 밖 전깃줄로 바로 나갈 수 있다'); } });
        break;
      }
      const climb = l.kind === 'pipe' || l.kind === 'chimney' || l.kind === 'ladder', lv = Math.max(1, (l.tz || 1) - (l.bz || 0));
      play(l.kind === 'pipe' ? 'metal' : 'cloth', 0.35); if (l.kind === 'chimney') noise(l.ux, l.uy, 60, 'soot');
      startTrav(climb ? { pts: [{ x: P.x, y: P.y, f: 0 }, { x: l.x, y: l.y, f: 0.1 }, { x: top.x, y: top.y + 18, f: 0.86 }, { x: top.x, y: top.y, f: 1 }], dur: 0.45 + lv * 0.42, phases: [{ to: 0.86, pose: 'climb' }, { to: 1, pose: 'vault' }], face: -Math.PI / 2, base: { x: l.x, y: l.y }, step: l.kind === 'pipe' ? 'metal' : 'cloth', loud: l.kind === 'pipe' ? 45 : 30 }
        : { pts: [{ x: P.x, y: P.y, f: 0 }, { x: top.x, y: top.y, f: 1 }], dur: 0.5, phases: [{ to: 1, pose: 'walk' }] },
        { end: null });
      P.trav.end = () => { P.fl = 0; setLayer(0); P.z = l.tz; P.x = top.x; P.y = top.y; };
      break;
    }
    case 'smother': {
      const l = a.l.lamp; l.off = true; play('cloth', 0.45); noise(l.x, l.y, 130, 'smoke');
      S.fx.push({ k: 'smoke', x: a.l.ux, y: a.l.uy, t: 0 });
      for (const c of S.corpses) c.light = lightAt(c.x, c.y);
      toast('굴뚝을 막았다 — 연기가 방에 차며 불이 꺼졌다. 안의 경비가 다시 불을 피우러 온다', 3, 'good');
      break;
    }
    case 'ventIn': { S.stats.vents = (S.stats.vents || 0) + 1;
      const v = a.v; P.vent = true; P.z = 0; P.x = v.x; P.y = v.y; v.open = !v.roof; play('metal', 0.3); noise(v.x, v.y, 40, 'vent'); S.fade = 0.3;
      toast('환풍구로 들어갔다', 1.6); break;
    }
    case 'ventOut': {
      const v = a.v; P.vent = false; P.z = v.z; P.x = v.x; P.y = v.y; v.open = !v.roof; play('metal', 0.3); noise(v.x, v.y, 40, 'vent'); S.fade = 0.25;
      if (!v.roof && v.z === 0) { const tx = v.tx, ty = v.ty; if (groundSolidP(tx, ty)) { const o = N8.find(o => !groundSolidP(tx + o[0], ty + o[1])); if (o) { P.x = tc(tx + o[0]); P.y = tc(ty + o[1]); } } }
      hint('ventOpen', '열어 둔 창살은 지나가던 경비가 보면 의심한다');
      break;
    }
    case 'ventKill': {
      const g = a.g; killGuard(g, 'stash', { bodies: 0 }); a.v.open = true; P.strikeT = 0.3; S.stats.special++;
      toast('창살 밑의 경비를 환풍구로 끌어올렸다', 2.2, 'good'); break;
    }
    case 'leap': case 'jump': {
      const t = a.k === 'leap' ? [a.j.tx, a.j.ty, a.j.z] : a.s;
      P.jump = { x0: P.x, y0: P.y, x1: tc(t[0]), y1: tc(t[1]), t: 0, dur: a.k === 'leap' ? 0.42 : 0.3, z1: t[2], arc: a.k === 'leap' ? 26 : 10 };
      P.a = Math.atan2(P.jump.y1 - P.y, P.jump.x1 - P.x); play('throw', 0.35);
      break;
    }
    case 'ledgeKill': {
      const g = a.g, n = P.ledge, from = { x: g.x, y: g.y }, to = groundBelow(P.x, P.y, n) || groundBelow(g.x, g.y, n) || { x: P.x + n.x * 60, y: P.y + n.y * 60 };
      P.strikeT = 0.3; play('cloth', 0.5); fallKill(g, from, to); toast('가장자리에서 끌어내렸다 — 추락사로 보인다', 2, 'good');
      break;
    }
    case 'ledgeUp': { const n0 = P.ledge, d = ledgeDraw(P); P.ledge = null; play('cloth', 0.3); startTrav({ pts: [{ x: d.x, y: d.y, f: 0 }, { x: P.x - n0.x * 6, y: P.y - n0.y * 6, f: 1 }], dur: 0.38, phases: [{ to: 1, pose: 'vault' }], face: Math.atan2(-n0.y, -n0.x) }); break; }
    case 'pushOff': {
      const g = a.g, c = g.climb; P.strikeT = 0.3; P.a = Math.atan2(g.y - P.y, g.x - P.x); play('metal', 0.5);
      fallKill(g, { x: g.x, y: g.y }, { x: c.from.x, y: c.from.y + 6 }); toast('배관에서 밀어 떨어뜨렸다 — 추락사로 보인다', 2, 'good');
      break;
    }
    case 'pull': {
      const g = a.g, n = P.cover || { x: 0, y: 0 };
      g.doomed = true; g.moving = false; g.path = null;
      const pd = dist(P.x, P.y, g.x, g.y), k = Math.min(0.35, 30 / Math.max(1, pd)); S.pull = { g, x0: g.x, y0: g.y, x1: P.x + (g.x - P.x) * k + n.x * 4, y1: P.y + (g.y - P.y) * k + n.y * 4, t: 0, dur: 0.16 + pd / 900 };
      P.a = Math.atan2(g.y - P.y, g.x - P.x); P.strikeT = 0.34; play('cloth', 0.55);
      break;
    }
    case 'kill': case 'kill2': {
      const g0 = a.list[0], d0 = dist(P.x, P.y, g0.x, g0.y);
      P.a = Math.atan2(g0.y - P.y, g0.x - P.x);
      if (d0 > 40) {  // 달려들기: 짧게 돌진해 등 뒤에 붙은 뒤 처치
        const ux = (g0.x - P.x) / d0, uy = (g0.y - P.y) / d0;
        a.list.forEach(g => { g.doomed = true; g.moving = false; });
        P.lunge = { x0: P.x, y0: P.y, x1: g0.x - ux * 26, y1: g0.y - uy * 26, t: 0, dur: Math.min(0.2, 0.07 + d0 / 900), list: a.list, two: a.k === 'kill2' };
        play('cloth', 0.35); break;
      }
      strikeKill(a.list, a.k === 'kill2');
      break;
    }
    case 'fuse': cutLights(); break;
    case 'trap': fireTrap(a.tp); break;
    case 'bfuse': { bldPower(a.fb, false); play('fuse', 0.5); noise(a.fb.x, a.fb.y, 60, 'switch'); const B = BLD[a.fb.b]; toast(`${B.plate || B.name || '건물'} 전등이 모두 꺼졌다 — 곧 누가 두꺼비집을 올리러 온다`, 3); hint('bfuse', '두꺼비집: 건물 하나의 전등(모든 층)을 한 번에 끈다. 손으로 끈 등과 달리 지나가던 사람이 다시 켤 수 없고, 누군가 직접 두꺼비집까지 와야 한다'); break; }
    case 'lamp': {
      const l = a.l; l.off = !l.off; play('switch', 0.45); noise(l.x, l.y, 25, 'switch');
      for (const c of S.corpses) c.light = lightAt(c.x, c.y);
      if (l.off) hint('lampHand', '손으로 끈 조명은 지나가던 경비가 다시 켠다. 영영 끄려면 쿠나이로 깨라');
      break;
    }
    case 'keypad': openKeypad(a.d); break;
    case 'pick': startPick(a.o); break;
    case 'keymsg': if (!a.d) { toast(a.label, 1.8); break; } if (a.d.gate) { toast('반대편에서 빗장을 걸어 둔 쪽문이다. 안쪽으로 돌아 들어가 풀면 지름길이 된다', 2.6); break; } toast((a.d.keyLock === 'gold' && STAGE.keyHint) || '잠긴 문이다. ' + keyName(a.d.keyLock) + '이(가) 필요하다 — 아니면 창문·옥상·환풍구', 2.4); break;
    case 'door': {
      const d = a.d; if (d.gate && d.locked) { d.gate = null; toast('빗장을 풀었다 — 지름길이 열렸다', 2, 'good'); S.stats.gates = (S.stats.gates || 0) + 1; }
      if (d.keyLock && d.locked) { const kn = keyName(d.keyLock); noteChange('door', d, d.keyLock); S.stats.keyDoors = (S.stats.keyDoors || 0) + 1; d.group.forEach(t => t.keyLock = false); toast(kn + '로 문을 열었다', 1.8, 'good'); }
      if (!d.locked && doorBlocked(d)) { toast('문 앞에 무언가 있어 잠글 수 없다', 1.6); break; }
      setDoor(d, !d.locked); play(d.locked ? 'metal' : 'cloth', 0.45); noise(d.x, d.y, 35, 'door');
      for (const g of S.guards) if (g.path) g.path = null;
      if (d.locked) hint('lock', '잠긴 문은 경비가 돌아서 간다. 쫓기거나 수색 중인 경비는 문을 부순다');
      break;
    }
    case 'execute': {
      const g = P.captive; P.captive = null; P.strikeT = 0.3;
      if (solidAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE))) { g.x = P.x; g.y = P.y; }
      killGuard(g, null, null, true); S.stats.special++; break;
    }
    case 'drag': {
      const g = P.captive, h = a.h; P.captive = null; S.stats.special++;
      if (h.type === 'bush') { P.x = h.x; P.y = h.y; killGuard(g, 'bush', h, true); toast('덤불 속으로 끌고 들어가 처치했다', 2, 'good'); }
      else { killGuard(g, 'stash', h, true); enterHide(h); toast(h.type === 'well' ? '우물 속으로 끌고 들어가 처치했다' : `${hideIn(h)}으로 끌고 들어가 처치했다`, 2.2, 'good'); }
      break;
    }
    case 'hide': enterHide(a.h); break;
    case 'stash': actCarry(); break;
  }
}
function grab(g) {
  const P = S.player;
  P.captive = g; g.state = 'CAPTIVE'; g.captT = 0; g.squirm = 1; g.seen = false; g.icon = null; g.path = null;
  if (S.fuseGuard === g) S.fuseGuard = null;
  play('cloth', 0.55); play('thud', 0.3);
  hint('grab', '붙잡았다: 숨을 곳(덤불·궤짝·우물) 옆에서 [끌고 가 처치]. 9초 넘게 끌면 빠져나간다');
}
function enterHide(b) {
  const P = S.player;
  b.spotted = S.guards.some(g => g.seen && g.state !== 'DEAD' && g.state !== 'CAPTIVE');
  P.hide = b; P.hideFrom = { x: P.x, y: P.y }; P.x = b.x; P.y = b.y; S.hideExitLock = true; S.fx.push({ k: 'smoke', x: b.x, y: b.y, t: 0 });
  play('cloth', 0.4); play('drop', 0.15);
  const where = hideIn(b);
  toast(b.spotted ? '숨는 모습을 들켰을지도 모른다…' : `${where}에 숨었다`, 2.2, b.spotted ? 'warn' : '');
}
// dir 가 있으면 그 방향에 가장 가까운 빈 칸으로 나온다 (조이스틱 방향 탈출)
function leaveHide(dir) {
  const P = S.player, b = P.hide; if (!b) return;
  b.spotted = false; P.hide = null;
  if (!dir) dir = b.type === 'well' || !P.hideFrom ? { x: Math.cos(P.a), y: Math.sin(P.a) } : { x: P.hideFrom.x - b.x, y: P.hideFrom.y - b.y };
  const dl = Math.hypot(dir.x, dir.y) || 1;
  let best = null, bs = -9;
  for (const o of N8) {
    const sol = b.z ? solidFor(b.z) : groundSolidP, tx = b.tx + o[0], ty = b.ty + o[1]; if (sol(tx, ty)) continue;
    if (o[0] && o[1] && (sol(b.tx + o[0], b.ty) && sol(b.tx, b.ty + o[1]))) continue;
    const sc = (o[0] * dir.x + o[1] * dir.y) / (Math.hypot(o[0], o[1]) * dl);
    if (sc > bs) { bs = sc; best = [tx, ty]; }
  }
  if (best) { P.x = tc(best[0]); P.y = tc(best[1]); P.a = Math.atan2(best[1] - b.ty, best[0] - b.tx); }
  play('cloth', 0.35);
}
function travelTunnel() {
  const P = S.player; const w = P.hide; if (!w || w.type !== 'well' || !ugAt(w.tx, w.ty)) return;
  if (P.carrying || P.captive) return;
  w.spotted = false; P.hide = null; P.under = true; P.x = w.x; P.y = w.y;
  play('metal', 0.35); play('cloth', 0.3); S.fade = 0.4;
  toast('지하 수로로 내려왔다', 1.8);
}
function koCiv(g, mode, where) {
  g.state = 'DEAD'; g.icon = null; play('thud', 0.45); play('cloth', 0.4);
  const c = { fl: flOf(g), ch: charOf(g), ko: true, x: g.x, y: g.y, a: g.a, kind: g.kind, hidden: tileAt(g.x, g.y) === 'B', discovered: false, carried: false, stashed: false, light: lightAt(g.x, g.y) };
  S.corpses.push(c); S.stats.ko = (S.stats.ko || 0) + 1;
  if (mode === 'stash') { c.stashed = true; where.bodies++; S.stats.stashed++; }
  noise(g.x, g.y, 30, 'ko', flOf(g));
  toast('주민을 기절시켰다 — 죽이지 않았다. 다른 사람 눈에 띄면 시체처럼 소란이 난다', 2.6);
}
function strikeKill(list, two) {
  const P = S.player; P.strikeT = 0.32;
  const choke = !two && PAIR() && !list[0].civ && !list[0].dog && (S.stats.kills % 2 === 1);
  if (choke) { P.strikeT = 0.42; P.killAnim = { ch: charOf(list[0]), t0: S.t }; P.a = list[0].a; }
  list.forEach(g => {
    g.doomed = false;
    if (choke) { g.x = P.x + Math.cos(P.a) * 12; g.y = P.y + Math.sin(P.a) * 12; const nd = S.decals.length, nf = S.fx.length; killGuard(g); S.decals.length = nd; S.fx.length = nf;  // 목 조르기: 피·칼자국 없음
      const c = S.corpses[S.corpses.length - 1]; if (c) { c.hideT = S.t + 0.42; c.t0 = S.t + 0.42; } }
    else killGuard(g);
  });
  S.hitStop = 0.07;
  if (two) { S.stats.special++; toast('동시 암살', 1.8, 'good'); }
}
const logEv = (k, x, y) => { (S.events = S.events || []).push({ k, x, y, t: S.t }); };
function killGuard(g, mode, where, quiet) {
  if (g.civ) return koCiv(g, mode, where);
  logEv(g.target ? 'target' : 'kill', g.x, g.y);
  g.state = 'DEAD'; g.icon = null;
  play(Math.random() < 0.5 ? 'kill' : 'kill2', quiet ? 0.45 : 0.7); setTimeout(() => play('thud', 0.45), 180); if (CITY) S.shakeT = quiet ? 0.12 : 0.18;  // 처치 손맛: 짧은 화면 흔들림
  S.stats.kills++; if (!g.target) S.stats.extraKills++;
  S.fx.push({ k: 'slash', x: g.x, y: g.y, t: 0 });
  const c = { fl: flOf(g), ch: charOf(g), dog: !!g.dog, x: g.x, y: g.y, a: g.a, kind: g.kind, hidden: tileAt(g.x, g.y) === 'B', discovered: false, carried: false, stashed: false, light: lightAt(g.x, g.y), target: g.target, t0: S.t };
  S.corpses.push(c);
  const intoWell = mode === 'stash';
  if (mode === 'stash') { c.stashed = true; where.bodies++; S.stats.stashed++; noise(g.x, g.y, 40, 'kill'); }
  else if (mode === 'bush') { c.x = where.x + rnd(-6, 6); c.y = where.y + rnd(-6, 6); c.hidden = true; S.stats.stashed++; noise(g.x, g.y, 40, 'kill'); }
  else { S.decals.push({ x: g.x + rnd(-6, 6), y: g.y + rnd(-6, 6), r: rnd(14, 19), rot: rnd(0, TAU), fl: flOf(g) }); noise(g.x, g.y, 60, 'kill', flOf(g)); }
  S.flash = 0.25;
  if (g.target) {
    if (S.player.disguise && !S.player.disguiseBlown) S.stats.disguiseKill = true;
    const left = S.guards.filter(o => o.target && o.state !== 'DEAD').length;
    toast(left ? `표적 제거 — 남은 표적 ${left}` : '표적 제거', 3, 'good'); if (left) bark('hero', 'kill');
  } else if (!mode) hint('body', '시체가 발견되면 경보가 울린다. [운반]해서 덤불·궤짝·우물에 숨겨라');
  if (S.fuseGuard === g) S.fuseGuard = null;
  if (g.hasKey) { const k = g.hasKey; g.hasKey = null; if (mode) giveKey(k, '끌어들인 경비에게서 ' + keyName(k) + '을(를) 챙겼다'); else S.keyDrop = { x: c.x + 14, y: c.y + 10, key: k, fl: c.fl || 0 }; }
  if (g.dog) c.dog = true;
  checkObjective();
}
// 사고사: 칼자국 없이 죽는다. 시체를 봐도 '사고'로 여겨 수색·비명이 없다 (옮기면 사고로 보이지 않는다)
function accidentKill(g, how) {
  if (g.state === 'DEAD') return;
  logEv('accident', g.x, g.y);
  g.state = 'DEAD'; g.icon = null; g.path = null; play('thud', 0.6);
  S.stats.kills++; S.stats.accidents = (S.stats.accidents || 0) + 1; if (!g.target) S.stats.extraKills++;
  const c = { fl: flOf(g), ch: charOf(g), dog: !!g.dog, x: g.x, y: g.y, a: g.a, kind: g.kind, hidden: false, discovered: false, carried: false, stashed: false, light: lightAt(g.x, g.y), target: g.target, accident: how, t0: S.t };
  S.corpses.push(c);
  if (g.target) { const left = S.guards.filter(o => o.target && o.state !== 'DEAD').length; toast(left ? `표적 제거(사고) — 남은 표적 ${left}` : '표적 제거 — 사고로 보인다', 3, 'good'); }
  if (S.fuseGuard === g) S.fuseGuard = null;
  if (g.hasKey) { const k = g.hasKey; g.hasKey = null; S.keyDrop = { x: c.x + 14, y: c.y + 10, key: k, fl: c.fl || 0 }; }
  checkObjective();
}
// 함정: { k: 'shock', sw: [x, y], zone: [x0, y0, x1, y1] } 전선 끊어 물웅덩이 감전 · { k: 'drop', at: [x, y], hit: [x0, y0, x1, y1] } 옥상 간판 떨어뜨리기
function trapsInit() {
  S.traps = (STAGE.traps || []).map((t, i) => Object.assign({ i, used: false }, t));
  S.carAlarms = CARS.map(([x, y]) => ({ x: tc(x), y: (y + 1) * TILE, tx: x, ty: y, used: false, t: 0 }));
}
const inZone = (g, z) => g.x >= z[0] * TILE && g.x < (z[2] + 1) * TILE && g.y >= z[1] * TILE && g.y < (z[3] + 1) * TILE;
function nearTrap() {
  const P = S.player; if (P.wire || P.jump || P.hide || P.carrying || P.vent || P.under || P.fl) return null;
  for (const t of S.traps || []) {
    if (t.used) continue;
    if (t.k === 'shock' && !P.z && dist(P.x, P.y, tc(t.sw[0]), tc(t.sw[1])) < 52) return { t, label: '전선 끊기 — 물웅덩이 감전' };
    if (t.k === 'drop' && P.z && dist(P.x, P.y, tc(t.at[0]), tc(t.at[1])) < 52) return { t, label: '간판 떨어뜨리기' };
  }
  if (!P.z) for (const c of S.carAlarms || []) if (!c.used && dist(P.x, P.y, c.x, c.y) < 56) return { car: c, label: '차 경보 울리기' };
  return null;
}
function fireTrap(a) {
  if (a.car) { a.car.used = true; a.car.t = 7; play('metal', 0.4); toast('차 경보가 울린다 — 근처 경비가 보러 온다', 2.2); return; }
  const t = a.t; t.used = true;
  if (t.k === 'shock') {
    const z = t.zone, cx = (z[0] + z[2] + 1) / 2 * TILE, cy = (z[1] + z[3] + 1) / 2 * TILE; let n = 0;
    for (const g of S.guards) if (!g.civ && !flOf(g) && g.state !== 'DEAD' && inZone(g, z)) { accidentKill(g, 'shock'); n++; }
    t.fx = 1.6; play('fuse', 0.7); noise(cx, cy, 150, 'switch'); S.flash = 0.2;
    toast(n ? `감전 — ${n}명 쓰러졌다 (사고로 보인다)` : '물웅덩이에 전기가 흘렀지만 아무도 없었다', 2.6, n ? 'good' : '');
  } else if (t.k === 'drop') {
    const z = t.hit, cx = (z[0] + z[2] + 1) / 2 * TILE, cy = (z[1] + z[3] + 1) / 2 * TILE; let n = 0;
    for (const g of S.guards) if (!g.civ && !flOf(g) && g.state !== 'DEAD' && inZone(g, z)) { accidentKill(g, 'fall'); n++; }
    t.wreck = { x: cx, y: cy }; play('thud', 0.9); play('metal', 0.6); noise(cx, cy, 260, 'crash'); S.flash = 0.15;
    toast(n ? `간판이 떨어졌다 — ${n}명 깔렸다 (사고로 보인다)` : '간판이 떨어졌다 — 아무도 없었다. 소리에 사람들이 온다', 2.6, n ? 'good' : '');
  }
}
function updateIntel(dt) {
  const P = S.player;
  (STAGE.intel || []).forEach((it, k) => {
    const st = S.intel[k] || (S.intel[k] = { t: it.first || 6, i: -1, lt: 0, done: false });
    const a = S.guards[it.g[0]], b = S.guards[it.g[1]];
    if (!a || !b || a.state === 'DEAD' || b.state === 'DEAD') return;
    const calm = g => ['PATROL', 'RETURN'].includes(g.state);
    a.chatCd = b.chatCd = 99;  // 정해진 대화를 하는 둘은 잡담을 하지 않는다
    if (st.i < 0) { st.t -= dt; if (st.t <= 0 && calm(a) && calm(b) && dist(a.x, a.y, b.x, b.y) < 230) { st.i = 0; st.lt = 0; } else return; }
    if (!calm(a) || !calm(b)) { a.say = b.say = null; st.i = -1; st.t = 8; return; }
    st.lt -= dt; if (st.lt > 0) return;
    if (st.i >= it.lines.length) { a.say = b.say = null; st.i = -1; st.t = it.every || 30; return; }
    const [who, text] = it.lines[st.i], sp = who ? b : a, ot = who ? a : b; ot.say = null; sp.say = text; st.lt = 2 + text.length * 0.07;
    sp.want = Math.atan2(ot.y - sp.y, ot.x - sp.x);
    // 엿듣기: 같은 층, 가까이(벽 너머는 더 가까이), 그 줄을 말할 때
    if (st.i === it.key && !st.done && flOf(P) === flOf(sp) && !P.under && !P.vent) {
      const d = dist(P.x, P.y, sp.x, sp.y), near = d < 190 * soundThrough(sp.x, sp.y, P.x, P.y) + 40;
      if (near) { st.done = true; if (it.gives) { S.player.keys[it.gives] = true; S.player.hasKey = true; } S.learned.push(it.learn); play('click', 0.4); toast('엿들었다 — ' + it.learn, 3.2, 'good'); }
    }
    st.i++;
  });
}
function disguiseMul(g) {
  const P = S.player; if (!P.disguise || P.disguiseBlown || g.dog) return 1;
  const d = dist(g.x, g.y, P.x, P.y);
  if (g.elite || g.target) return d < 220 ? 1.25 : 0.4;      // 얼굴을 아는 사람
  if (P.mode === 'run' || P.carrying || P.captive || P.z || P.strikeT > 0 || P.wire) return 1;  // 수상한 짓
  return d < 64 ? 0.45 : 0.07;
}
function gsay(g, text, t = 2.6) { if (g.chat) return; g.say = text; g.sayT = t; }
function updateShift(dt) {
  const sh = STAGE.shift; if (!sh || S.shiftI >= sh.add.length) return;
  S.shiftT -= dt; if (S.shiftT > 0) return;
  const d = sh.add[S.shiftI++], g = makeGuard(d, S.guards.length); g.reinf = true; buildRouteLine(g); S.guards.push(g);
  S.shiftT = sh.every; play('bell', 0.4); toast(sh.msg || '교대 시간 — 순찰이 하나 늘었다', 2.8, 'warn');
}
function updateTraps(dt) {
  updateShift(dt);
  updateIntel(dt);
  for (const g of S.guards) if (g.sayT > 0) { g.sayT -= dt; if (g.sayT <= 0 && !g.chat) g.say = null; }
  for (const c of S.carAlarms || []) if (c.t > 0) { c.t -= dt; c.beep = (c.beep || 0) - dt; if (c.beep <= 0) { c.beep = 0.9; noise(c.x, c.y, 300, 'alarm'); play('metal', 0.18 * proxVol({ x: c.x, y: c.y })); } }
  for (const t of S.traps || []) if (t.fx > 0) t.fx -= dt;
}
function drawTrapsGround() {
  for (const t of S.traps || []) {
    if (t.k === 'shock') {
      const x = t.sw[0] * TILE, y = t.sw[1] * TILE;
      ctx.fillStyle = '#2a2d33'; ctx.fillRect(x + 12, y + 6, 24, 30); ctx.fillStyle = t.used ? '#55585f' : '#e8c23a'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 12, y + 8 + k * 7, 24, 3);
      ctx.strokeStyle = t.used ? '#3a3d44' : '#1a1c20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 24, y + 36); ctx.lineTo(x + 24, y + 46); ctx.stroke();
      if (t.fx > 0) { const z = t.zone; ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 14; k++) { const px = (z[0] + Math.random() * (z[2] - z[0] + 1)) * TILE, py = (z[1] + Math.random() * (z[3] - z[1] + 1)) * TILE; ctx.strokeStyle = `rgba(160,220,255,${t.fx / 1.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + rnd(-14, 14), py + rnd(-14, 14)); ctx.lineTo(px + rnd(-14, 14), py + rnd(-14, 14)); ctx.stroke(); } ctx.globalCompositeOperation = 'source-over'; }
    }
    if (t.k === 'drop' && t.wreck) { const w = t.wreck; ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(0.18); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-40, -12, 84, 30); ctx.fillStyle = '#3a2a3a'; ctx.fillRect(-42, -16, 84, 28); ctx.strokeStyle = '#ff3ca8'; ctx.lineWidth = 2; ctx.strokeRect(-40, -14, 80, 24); ctx.fillStyle = '#ff9ad2'; ctx.font = '700 12px Galmuri, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.text || '간판', 0, 3); ctx.restore(); }
  }
  for (const c of S.carAlarms || []) if (c.t > 0 && Math.floor(S.t * 3) % 2) { ctx.fillStyle = 'rgba(255,170,60,.55)'; ctx.beginPath(); ctx.arc(c.x - 14, c.y - 30, 7, 0, TAU); ctx.arc(c.x + 14, c.y - 30, 7, 0, TAU); ctx.fill(); }
}
function drawTrapsRoof() {
  for (const t of S.traps || []) if (t.k === 'drop' && !t.used) {
    const x = t.at[0] * TILE, y = t.at[1] * TILE + 26;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - 18, y + 4, 86, 22); ctx.fillStyle = '#2a1830'; ctx.fillRect(x - 20, y, 86, 22); ctx.strokeStyle = '#ff3ca8'; ctx.lineWidth = 2; ctx.strokeRect(x - 18, y + 2, 82, 18);
    ctx.fillStyle = '#ff9ad2'; ctx.font = '700 12px Galmuri, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.text || '간판', x + 23, y + 15);
    const P = S.player; if (P.z && dist(P.x, P.y, tc(t.at[0]), tc(t.at[1])) < 200) { const z = t.hit; ctx.strokeStyle = 'rgba(255,90,170,.6)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.strokeRect(z[0] * TILE, z[1] * TILE, (z[2] - z[0] + 1) * TILE, (z[3] - z[1] + 1) * TILE); ctx.setLineDash([]); }
  }
}
function bldPower(fb, on) {
  fb.cut = !on; fb.t = 5;
  for (const l of S.lamps) if (!l.outdoor && !l.hearth && bldAt(Math.floor(l.x / TILE), Math.floor(l.y / TILE)) === fb.b) { if (on) { if (l.cut != null) { l.off = l.cutWas; l.cut = null; } } else if (l.cut == null) { l.cutWas = l.off; l.off = true; l.cut = fb.b; } }
  for (const c of S.corpses) c.light = lightAt(c.x, c.y);
  if (on) { const B = BLD[fb.b]; if (dist(S.player.x, S.player.y, fb.x, fb.y) < 900) toast(`${B.plate || B.name || '건물'} 전기가 다시 들어왔다`, 2.2); }
}
function nearBFuse() { const P = S.player; if (P.z || P.fl || P.wire || P.jump || P.hide || P.carrying || P.captive) return null; let best = null, bd = 50; for (const fb of S.bfuses || []) { if (fb.cut) continue; const d = dist(P.x, P.y, fb.x, fb.y); if (d < bd) { bd = d; best = fb; } } return best; }
function cutLights() {
  S.lightsOn = false; play('fuse', 0.6); setTimeout(() => play('switch', 0.5), 120);
  toast('바깥 조명이 꺼졌다 — 곧 누군가 확인하러 온다', 3); setAlert(1, 30);
  S.fuseT = 2.5;
  for (const c of S.corpses) c.light = lightAt(c.x, c.y);
}
function actCarry() {
  if (!S || S.over || paused || !running) return;
  const P = S.player;
  if (P.hide) { if (P.hide.type === 'well') travelTunnel(); return; }
  if (P.z && !P.jump && !P.trav && !P.lunge && !P.wire) { const sa = secondaryAction(); if (sa.k === 'ledge') { P.ledge = { x: sa.n.x, y: sa.n.y }; P.ledgeLock = true; P.vx = P.vy = 0; play('cloth', 0.3); hint('ledge', '매달림: 옥상 경비에게 보이지 않는다. 옆으로 이동하고, 위로 밀면 올라서고, 1층 지붕이면 아래로 밀어 내려간다. 가까이 온 옥상 경비는 [끌어내려 떨어뜨리기]'); } return; }
  if (P.z || P.jump || P.trav || P.lunge || P.vent || P.under) return;
  if (P.captive) { actPrimaryForce('execute'); return; }
  const sa = secondaryAction();
  if (sa.viaZ) { actPrimary(sa); return; }
  if (sa.k === 'cover') { enterCover(sa.n); return; }
  if (sa.k === 'ledge') { P.ledge = { x: sa.n.x, y: sa.n.y }; P.ledgeLock = true; P.vx = P.vy = 0; play('cloth', 0.3); hint('ledge', '매달림: 옥상 경비에게 보이지 않는다. 옆으로 이동하고, 위로 밀면 올라서고, 1층 지붕이면 아래로 밀어 내려간다. 가까이 온 옥상 경비는 [끌어내려 떨어뜨리기]'); return; }
  if (sa.k === 'uncover') { P.cover = null; play('cloth', 0.15); return; }
  if (sa.k === 'fdown') { const l = sa.l; P.fl = l.bfl; setLayer(P.fl); P.x = l.x; P.y = l.y; play('step_w0', 0.3); S.fade = 0.15; return; }
  if (sa.k === 'grab') { grab(sa.g); return; }
  if (sa.k === 'dress') {  // 변장: 조직원 옷을 입으면 멀리서는 같은 편으로 보인다. 정예·표적은 얼굴을 알아보고, 뛰거나 가까이 붙으면 들킨다
    const c = sa.c; c.stripped = true; P.disguise = c.ch; P.disguiseBlown = false; play('cloth', 0.6); noise(P.x, P.y, 30, 'cloth'); S.fade = 0.25;
    toast('조직원 옷으로 갈아입었다 — 걸어 다니면 멀리서는 의심받지 않는다. 정예·표적은 얼굴을 안다', 3.2, 'good'); hint('disguise', '변장: 뛰거나, 시체를 들거나, 옥상에 있거나, 너무 가까이 붙으면 의심받는다. 한 번 들키면 변장은 끝'); return;
  }
  if (sa.k === 'throwBody') {
    const c = P.carrying, g = sa.g; P.carrying = null; c.carried = false; c.discovered = true; S.stats.bodies++;
    const a = Math.atan2(g.y - P.y, g.x - P.x), d = Math.max(30, dist(P.x, P.y, g.x, g.y) - 26);
    c.fly = { x0: P.x, y0: P.y, x1: P.x + Math.cos(a) * d, y1: P.y + Math.sin(a) * d, t: 0, dur: 0.35 + d / 900 };
    P.strikeT = 0.25; play('throw', 0.6); return;
  }
  if (sa.k === 'steal') {
    const g = sa.g; const sk = g.hasKey; g.hasKey = null; P.keys[sk] = true; P.hasKey = true; play('click', 0.4); S.stats.steal = (S.stats.steal || 0) + 1;
    if (P.mode !== 'sneak' && Math.random() < 0.5) { g.meter = 0.75; g.want = Math.atan2(P.y - g.y, P.x - g.x); g.state = 'NOTICE'; g.poi = { x: P.x, y: P.y }; g.noticeT = 0; setIcon(g, '?'); toast('열쇠를 훔쳤다 — 그런데 눈치챈 것 같다!', 2.4, 'warn'); }
    else { toast('열쇠를 훔쳤다 (웅크린 채라 들키지 않았다)', 2.4, 'good'); bark('hero', 'key'); }
    return;
  }
  if (P.carrying) {
    const c = P.carrying; const b = nearHide();
    if (b && b.bodies < b.cap) {
      c.carried = false; c.stashed = true; P.carrying = null; b.bodies++; S.stats.stashed++;
      play('drop', 0.4); play('cloth', 0.3);
      toast(b.type === 'well' ? '시체를 우물 속에 떨어뜨렸다' : `${hideIn(b)}에 시체를 숨겼다 (${b.bodies}/${b.cap})`, 2.2, 'good');
      return;
    }
    if (b && b.bodies >= b.cap) toast(`${hideName(b)}은 꽉 찼다`, 1.6);
    if (pairCarry(P)) { const ox = P.x - Math.sin(P.a) * 22, oy = P.y + Math.cos(P.a) * 22; c.x = ox; c.y = oy; c.td = S.t; c.t0 = null; }
    c.carried = false; P.carrying = null;
    c.hidden = tileAt(c.x, c.y) === 'B';
    if (!c.hidden && solidAt(Math.floor(c.x / TILE), Math.floor(c.y / TILE))) { c.x = P.x; c.y = P.y; c.hidden = P.hidden; }
    c.light = lightAt(c.x, c.y);
    play('drop', 0.5); noise(c.x, c.y, 70, 'drop');
    toast(c.hidden ? '시체를 덤불에 숨겼다' : '시체를 내려놓았다 (눈에 띌 수 있음)', 2.2, c.hidden ? 'good' : '');
    return;
  }
  const c = nearCorpse();
  if (c) { c.carried = true; c.hidden = false; c.accident = null; P.carrying = c; play('cloth', 0.5); hint('carry', '운반 중엔 느리고 뛸 수 없다. 덤불 위나 궤짝·우물 옆에서 다시 누르면 숨긴다'); }
}
function actPrimaryForce(k) { const a = { k }; const keep = primaryAction; if (k === 'execute') { const P = S.player; const g = P.captive; P.captive = null; P.strikeT = 0.3; if (solidAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE))) { g.x = P.x; g.y = P.y; } killGuard(g, null, null, true); S.stats.special++; } }
// 보조 버튼에 걸린 행동: 열쇠 훔치기 > 붙잡기 > 운반
function secondaryAction() {
  const P = S.player;
  if (P.trav || P.lunge) return { k: 'none', label: '…' };
  if (P.under || P.vent) return { k: 'none', label: '특수' };
  if (P.cover && !P.captive && !P.carrying) return { k: 'uncover', label: '벽에서 떨어지기' };
  if (P.ledge) return { k: 'none', label: '매달림' };
  if (P.z && !P.wire && !P.jump) { const lg = ledgeAt(P); if (lg) return { k: 'ledge', n: lg, label: '가장자리에 매달리기' }; }
  if (P.hide) return P.hide.type === 'well' && ugAt(P.hide.tx, P.hide.ty) ? { k: 'tunnel', label: '지하로' } : { k: 'none', label: '—' };
  if (P.captive) return { k: 'execute', label: '처치' };
  if (P.carrying) {
    if (!nearHide()) { const tg = S.guards.filter(g => g.state !== 'DEAD' && g.state !== 'CAPTIVE' && !g.target && flOf(g) === flOf(P) && dist(g.x, g.y, P.x, P.y) < 300 && dist(g.x, g.y, P.x, P.y) > 70 && los(P.x, P.y, g.x, g.y) && Math.abs(angDiff(P.a, Math.atan2(g.y - P.y, g.x - P.x))) < 1.0).sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))[0]; if (tg) return { k: 'throwBody', g: tg, label: '시체 던지기 (겁주기)' }; }
    return { k: 'carry', label: nearHide() ? '넣기' : '내려놓기' };
  }
  if (P.z || P.jump) return { k: 'none', label: '특수' };
  const fd = nearFloorDown(); if (fd && nearClimb()) return { k: 'fdown', l: fd, label: `계단 내려가 ${fd.bfl + 1}층` };
  const kl = killList().filter(g => dist(g.x, g.y, P.x, P.y) <= 60); const kh = kl.find(g => g.hasKey); if (kh) return { k: 'steal', g: kh, label: keyName(kh.hasKey) + ' 훔치기' };
  const kg = kl.filter(g => !g.elite && !g.dog); if (kg.length) return { k: 'grab', g: kg[0], label: '붙잡기' };
  const nc = nearCorpse(); if (nc && STAGE.disguise && !nc.dog && !nc.stripped && !nc.target && !(nc.ch || '').startsWith('civ') && !nc.ko && !(P.disguise && !P.disguiseBlown)) return { k: 'dress', c: nc, label: '옷 갈아입기' };
  if (nc) return { k: 'carry', label: '운반' };
  const hp = primaryAction(); if (hp.held) return Object.assign({}, hp.held, { viaZ: true }); if (hp.alt && hp.alt.k !== 'keymsg') return Object.assign({}, hp.alt, { viaZ: true });
  const cv = !P.z && !P.carrying && !P.captive && coverAt(P); if (cv) return { k: 'cover', n: cv, label: '벽에 기대기' };
  return { k: 'none', label: '특수' };
}
function actThrow(pt) {
  if (!S || S.over || paused || !running) return;
  const P = S.player; if (P.hide || P.jump || P.trav || P.under || P.vent) return;
  if (P.stones <= 0) { toast('돌이 없다', 1.4); return; }
  const tx = pt ? pt.x : P.x + Math.cos(P.a) * 230, ty = pt ? pt.y : P.y + Math.sin(P.a) * 230;
  const ang = Math.atan2(ty - P.y, tx - P.x); let d = Math.min(330, dist(P.x, P.y, tx, ty));
  d = Math.max(20, Math.min(d, castRay(P.x, P.y, ang, d, P.z > 0) - 6));
  P.stones--; S.stats.stonesUsed++;
  S.stones.push({ x0: P.x, y0: P.y, x1: P.x + Math.cos(ang) * d, y1: P.y + Math.sin(ang) * d, t: 0, dur: 0.25 + d / 900, fl: flOf(P) });
  play('throw', 0.4);
  hint('stone', '돌이 떨어진 곳으로 근처 경비가 확인하러 간다');
}
function actCoin(pt) {
  if (!S || S.over || paused || !running) return;
  const P = S.player; if (P.hide || P.jump || P.under || P.vent) return;
  if (P.z) { toast('지붕 위에서는 엽전을 던질 수 없다', 1.6); return; }
  if (P.coins <= 0) { toast('엽전이 없다', 1.4); return; }
  const tx = pt ? pt.x : P.x + Math.cos(P.a) * 110, ty = pt ? pt.y : P.y + Math.sin(P.a) * 110;
  const ang = Math.atan2(ty - P.y, tx - P.x); let d = Math.min(160, dist(P.x, P.y, tx, ty));
  d = Math.max(16, Math.min(d, castRay(P.x, P.y, ang, d) - 8));
  const lx = P.x + Math.cos(ang) * d, ly = P.y + Math.sin(ang) * d;
  if (solidAt(Math.floor(lx / TILE), Math.floor(ly / TILE))) return;
  P.coins--; S.stats.coins = (S.stats.coins || 0) + 1;
  const l = { x: lx, y: ly, x0: P.x, y0: P.y, t: 0, landed: false, claim: null, fl: flOf(P) };
  S.lures.push(l); play('throw', 0.25);
  hint('coin', '엽전: 떨어진 엽전을 본 경비가 주우러 와서 잠시 고개를 숙인다. 정예(파란 옷)는 넘어가지 않는다');
}
function actKunai(forced) {
  if (!S || S.over || paused || !running) return;
  const P = S.player;
  if (P.kunai <= 0) { toast('쿠나이가 없다', 1.4); return; }
  const t = forced || kunaiTarget();
  if (!t) { toast('사거리 안에 노릴 경비나 조명이 없다', 1.6); return; }
  P.kunai--; S.stats.kunaiUsed++;
  P.a = Math.atan2(t.y - P.y, t.x - P.x);
  const d = dist(P.x, P.y, t.x, t.y);
  S.kunais.push({ x0: P.x, y0: P.y, t: 0, dur: 0.08 + d / 1400, tgt: t });
  play('kunai', 0.55);
}
function kunaiHit(k) {
  const t = k.tgt;
  if (t.type === 'cam') {
    if (t.ref.broken) return; t.ref.broken = true; play('glass', 0.5); play('metal', 0.3); noise(t.x, t.y, 90, 'glass', t.ref.fl);
    for (let i = 0; i < 3; i++) S.fx.push({ k: 'smoke', x: t.x, y: t.y, t: -i * 0.1 }); toast('다트로 CCTV를 부쉈다', 1.8, 'good'); return;
  }
  if (t.type === 'lamp') {
    if (t.ref.broken) return;
    t.ref.broken = true; play('glass', 0.6);
    for (const c of S.corpses) c.light = lightAt(c.x, c.y);
    noise(t.x, t.y, 150, 'glass');
    toast('쿠나이로 조명을 깨뜨렸다', 1.8, 'good'); setAlert(1, 30);
    hint('kunaiLamp', '깨진 조명은 다시 켜지지 않는다. 깨지는 소리에 근처 경비가 다가온다');
  } else {
    const g = t.ref; if (g.state === 'DEAD') { play('metal', 0.4); return; }
    killGuard(g); S.stats.special++;
    toast('원격 암살', 1.6, 'good');
  }
}

// ---------------------------------------------------------------- 갱신
function update(dt) {
  updateTraps(dt);
  S.t += dt;
  updatePlayer(dt);
  { const P = S.player; S.trail = S.trail || []; S.trailT = (S.trailT || 0) - dt;  // 임무 경로 기록
    if (S.trailT <= 0) { S.trailT = 0.35; const l = S.trail[S.trail.length - 1]; if (!l || dist(l.x, l.y, P.x, P.y) > 20) S.trail.push({ x: P.x, y: P.y, z: P.z || 0, fl: flOf(P) }); } }
  if (S.qRun && S.qRun.length && (S.qRunT -= dt) <= 0) { runQueued(S.qRun.shift()); S.qRunT = 0.1; syncTools(); }
  if (S.whistleT > 0) S.whistleT -= dt;
  if (S.pull) updatePull(dt);
  if (S.qBuf > 0) { S.qBuf -= dt; const qa = primaryAction(); if (qa.k !== 'none' && (!S.qKill || KILL_K.has(qa.k))) { S.qBuf = 0; actPrimary(); } }
  updateChats(dt);
  for (const g of S.guards) { setLayer(flOf(g)); updateGuard(g, dt); setLayer(flOf(S.player)); if (S.over) return; }
  separateBodies(dt); updateClubMusic(); updateCams(dt);
  if (S.shakeT > 0) S.shakeT = Math.max(0, S.shakeT - dt);
  updateRadioCall(dt); updateAlert(dt); updateCheckpoint(dt); if (CITY) { updateWarn(dt); updateCorpseRisk(dt); } if ((S.expoT = (S.expoT || 0) - dt) <= 0) { S.expoT = 0.1; const e = exposure(); if (e === 1 && S.expo === 0) hint('expo', '발밑 고리: 파랑 = 숨음(누가 돌아봐도 안 보인다) · 노랑 = 누가 이쪽을 보면 보인다 · 빨강 = 보고 있다. 노랑이면 어둠·벽·나무 뒤로 붙거나 웅크려라'); S.expo = e; } if (CITY) { updateOpps(dt); if (!S.winInit) winInit(); updateChanges(dt); if (STAGE.steps) updateTutorial(); }
  if (D().roll && !CITY) {  // 도시: 무전·점호 없음 — 쓰러진 사람을 직접 봐야 수색한다
    S.rollT -= dt;
    if (S.rollT <= 10 && !S.rollWarn) { S.rollWarn = true; toast('10초 뒤 점호 — 쓰러진 경비가 있으면 들킨다', 2.6, 'warn'); }
    if (S.rollT <= 0) { S.rollT = D().roll; S.rollWarn = false; rollCall(); }
  }
  if (S.timeLeft) {
    const active = !S.exitOpen && (!STAGE.timeTarget || S.guards.some(g => g.target && g.state !== 'DEAD'));
    if (active) { S.timeLeft -= dt; if (S.timeLeft <= 0) { S.timeLeft = 0; endGame(false, STAGE.timeFail || '시간이 다 됐다.'); return; } }
  }
  { let mood = S.alevel >= 3 || S.radioCall ? 2 : S.alevel === 2 ? 1 : 0;
    if (CITY) { for (const g of S.guards) { if (g.civ || g.state === 'DEAD' || g.state === 'CAPTIVE') continue; if (g.state === 'ALERT') { mood = 2; break; } if (['NOTICE', 'SUSPICIOUS', 'SEARCH', 'BODY'].includes(g.state) || g.meter > 0.15) mood = Math.max(mood, 1); }
      if (mood >= (S.moodHi || 0)) { S.moodHi = mood; S.moodT = 4; } else if ((S.moodT -= dt) <= 0) S.moodHi = mood;
      setMusic(['n_calm', 'n_tense', 'n_fight'][S.moodHi]); }
    else setMusic(mood === 2 ? 'fight' : mood === 1 ? 'tense' : 'calm'); }
  if (STAGE.fuse) {
    if (S.fuseGuard && S.fuseGuard.state !== 'FUSE') { S.fuseGuard.atFuse = false; S.fuseGuard = null; }
    if (!S.lightsOn && !S.fuseGuard && S.fuseT <= 0) S.fuseT = 3;
    if (S.fuseT > 0) {
      S.fuseT -= dt;
      if (S.fuseT <= 0 && !S.lightsOn) {
        let best = null, bd = 1e9;
        for (const g of S.guards) { if ((g.state !== 'PATROL' && g.state !== 'RETURN') || flOf(g) || g.civ || g.target || g.dog || g.post != null || g.follow != null) continue; const d = dist(g.x, g.y, tc(STAGE.fuse[2]), tc(STAGE.fuse[3])); if (d < bd) { bd = d; best = g; } }
        if (best) { best.state = 'FUSE'; best.path = null; best.atFuse = false; setIcon(best, '?'); S.fuseGuard = best; }
      }
    }
  }
  // 건물 두꺼비집: 내린 지 몇 초 뒤 근처 자경대원 하나가 올리러 온다
  for (const fb of S.bfuses || []) {
    if (!fb.cut) continue;
    if (fb.guard && (fb.guard.state !== 'FUSE' || fb.guard.fuseAt !== fb)) fb.guard = null;
    if (fb.guard) continue;
    fb.t -= dt; if (fb.t > 0) continue; fb.t = 4;
    let best = null, bd = 900;
    for (const g of S.guards) { if ((g.state !== 'PATROL' && g.state !== 'RETURN') || flOf(g) || g.civ || g.target || g.dog || g.post != null || g.follow != null) continue; const d = dist(g.x, g.y, fb.x, fb.y); if (d < bd) { bd = d; best = g; } }
    if (best) { best.state = 'FUSE'; best.fuseAt = fb; best.path = null; best.atFuse = false; setIcon(best, '?'); fb.guard = best; }
  }
  if (S._lightsWas !== S.lightsOn) { S._lightsWas = S.lightsOn; for (const c of S.corpses) c.light = lightAt(c.x, c.y); }
  for (const c of S.corpses) if (c.fly) { const f = c.fly; f.t += dt; const k = Math.min(1, f.t / f.dur); c.x = f.x0 + (f.x1 - f.x0) * k; c.y = f.y0 + (f.y1 - f.y0) * k; if (k >= 1) { c.fly = null; c.light = lightAt(c.x, c.y); play('thud', 0.7); S.decals.push({ x: c.x, y: c.y, r: 16, rot: rnd(0, TAU) }); terrorAt(c.x, c.y); } }
  for (const s of S.stones) { s.t += dt; if (s.t >= s.dur && !s.done) { s.done = true; play('stone', 0.5 * clamp(1 - dist(s.x1, s.y1, S.player.x, S.player.y) / 600, 0.2, 1)); noise(s.x1, s.y1, 240, 'stone', flOf(s)); } }
  S.stones = S.stones.filter(s => s.t < s.dur + 0.6);
  for (const f of S.fx) f.t += dt; S.fx = S.fx.filter(f => f.t < 0.45);
  for (const l of S.lures) if (!l.landed) { l.t += dt; if (l.t > 0.35) { l.landed = true; play('click', 0.2); } }
  for (const k of S.kunais) { k.t += dt; if (k.t >= k.dur && !k.done) { k.done = true; kunaiHit(k); } }
  S.kunais = S.kunais.filter(k => !k.done);
  for (const n of S.noises) n.t += dt;
  S.noises = S.noises.filter(n => n.t < 0.7);
  let changed = false;
  for (const m of S.toasts) { m.t -= dt; if (m.t <= 0) changed = true; }
  if (changed) { S.toasts = S.toasts.filter(m => m.t > 0); renderToasts(); }
  if (S.flash > 0) S.flash -= dt;
  if (S.fade > 0) S.fade -= dt;
  moveCamera(dt);
  updateHUD();
}
// 집중(조준) 중: 주인공 방향만 돌고 세상은 멈춘다
function focusUpdate(dt) {
  updatePlayer(dt);
  for (const m of S.toasts) m.t -= dt * 0.5;
  moveCamera(dt); updateHUD();
}
// 점호: 정해진 간격마다 경비들이 서로 확인한다. 쓰러진 경비가 있으면 경계가 오른다
function rollCall() {
  const missing = S.guards.filter(g => g.state === 'DEAD' && !g.target && !g.dog && !g.civ && !g.rollDone);
  missing.forEach(g => g.rollDone = true);
  play('call', 0.5);
  if (missing.length) bark(anyGuard(), 'roll');
  if (missing.length >= 2) setAlert(2, 40, `점호: ${missing.length}명이 대답하지 않는다 — 수색 시작`);
  else if (missing.length === 1) setAlert(1, 40, '점호: 한 명이 대답하지 않는다 — 경계');
  else toast('점호 — 이상 없음', 1.8);
}
function updateAlert(dt) {
  if (S.alevel === 3) {
    const seenNow = S.guards.some(g => g.seen && g.state === 'ALERT');
    S.unseenT = seenNow ? 0 : S.unseenT + dt;
    if (S.unseenT >= 15) {
      S.alevel = 2; S.alevelT = 30; S.unseenT = 0;
      for (const g of S.guards) if (g.state === 'ALERT' && !g.target) { g.state = 'SEARCH'; g.poi = g.lastSeen; g.reached = false; g.path = null; g.waitBase = 2; g.icon = '?'; g.iconT = 2; g.meter = 0.3; }
      toast('추적을 놓쳤다 — 경비들이 숨을 만한 곳을 뒤진다', 3, 'warn'); bark(anyGuard(g => g.state === 'SEARCH') || anyGuard(), 'lost');
    }
  } else if (S.alevel > 0) {
    S.alevelT -= dt;
    if (S.alevelT <= 0) {
      const was = S.alevel; S.alevel--; S.alevelT = S.alevel === 1 ? 45 : 0;
      if (was === 2) for (const g of S.guards) if (['SEARCH', 'CHECK', 'SUSPICIOUS', 'ALERT'].includes(g.state) && !g.target) { g.state = 'RETURN'; g.path = null; g.checks = []; g.inspect = null; g.icon = null; }
      toast(was === 2 ? '수색이 끝났다 — 경비들이 제자리로 돌아간다 (경계는 유지)' : '경계가 풀렸다', 2.6); if (was === 2) bark(anyGuard(), 'calm');
    }
  }
}
function moveCamera(dt) {
  const k = 1 - Math.pow(0.0015, dt);
  SCALE += (targetScale() - SCALE) * Math.min(1, dt * 6);
  const vw = W / SCALE, vh = H / SCALE;
  if (tactical) { cam.x += (MW * TILE / 2 - cam.x) * k; cam.y += (MH * TILE / 2 + 40 / SCALE - cam.y) * k; return; }
  if (isTouch) {
    cam.x += (S.player.x - cam.x) * k;
    cam.y += (S.player.y + vh * 0.12 - cam.y) * k;
    // 가장자리: 맵 밖 빈 화면은 좌우 8%·위 10%까지만, 아래는 조작 버튼 자리(28%)만큼 허용
    cam.x = clamp(cam.x, Math.min(vw * 0.42, MW * TILE / 2), Math.max(MW * TILE - vw * 0.42, MW * TILE / 2));
    cam.y = clamp(cam.y, Math.min(vh * 0.4, MH * TILE / 2), MH * TILE - vh * 0.22);
  } else {
    // 앞보기: 보는 방향(조준 중이면 겨누는 곳)으로 화면을 조금 앞세운다
    const P = S.player, ap = input.aiming && aimPoint();
    const lx = ap ? (ap.x - P.x) * 0.35 : Math.cos(P.a) * (P.moving ? 70 : 30), ly = ap ? (ap.y - P.y) * 0.35 : Math.sin(P.a) * (P.moving ? 55 : 24);
    S.lead = S.lead || { x: 0, y: 0 }; const lk = 1 - Math.exp(-dt * 2.5); S.lead.x += (lx - S.lead.x) * lk; S.lead.y += (ly - S.lead.y) * lk;
    cam.x += (P.x + S.lead.x - cam.x) * k; cam.y += (P.y + S.lead.y - cam.y) * k;
    // 가장자리: 캐릭터가 화면 구석의 HUD(도움말·조작 안내) 밑에 깔리지 않도록 맵 밖으로 조금 더 따라간다
    const ox = vw * 0.16, oy = vh * 0.2;
    cam.x = vw >= MW * TILE ? MW * TILE / 2 : clamp(cam.x, vw / 2 - ox, MW * TILE - vw / 2 + ox);
    cam.y = vh >= MH * TILE ? MH * TILE / 2 : clamp(cam.y, vh / 2 - oy, MH * TILE - vh / 2 + oy);
  }
}

// ---------------------------------------------------------------- 그리기
function drawSprite(c, x, y, a, s = 0.78, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = alpha;
  ctx.drawImage(c, -c.width * s * 0.42, -c.height * s / 2, c.width * s, c.height * s);
  ctx.restore();
}
function worldTransform(c, scale) { let sx = 0, sy = 0; if (S && S.shakeT > 0) { const a = S.shakeT * 22 * DPR; sx = Math.sin(S.t * 91) * a; sy = Math.cos(S.t * 73) * a * 0.7; } c.setTransform(scale, 0, 0, scale, W / 2 * DPR - cam.x * scale + sx, H / 2 * DPR - cam.y * scale + sy); }
function drawKeyIcon(k, x, y, ring) {
  if (!k || k === 'gold') return drawItemIcon('it_key', x, y, S.t, ring);
  const bob = Math.sin(S.t * 3) * 2, c = keyCol(k);
  if (ring) { ctx.strokeStyle = c; ctx.globalAlpha = 0.8; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18 + Math.sin(S.t * 4) * 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - 11, y - 7 + bob, 24, 17);
  ctx.fillStyle = c; ctx.fillRect(x - 12, y - 9 + bob, 24, 16); ctx.fillStyle = '#f4f2ea'; ctx.fillRect(x - 9, y - 6 + bob, 7, 5); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 12, y + 3 + bob, 24, 3);
}
function drawItemIcon(name, x, y, t, ring) {
  const bob = Math.sin(t * 3) * 2;
  if (ring) { ctx.strokeStyle = 'rgba(242,196,107,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18 + Math.sin(t * 4) * 2, 0, TAU); ctx.stroke(); }
  const f = F[name]; const k = 32 / Math.max(f[2], f[3]); blit(ctx, name, x - f[2] * k / 2, y - f[3] * k / 2 + bob, f[2] * k, f[3] * k);
}
function drawNote(n) {
  const x = n.x, y = n.y;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 9, y - 6, 22, 16);
  ctx.fillStyle = n.read ? '#c8c2b0' : '#f2ecd8'; ctx.fillRect(x - 11, y - 9, 22, 16); ctx.fillStyle = '#8a8070'; for (let k = 0; k < 3; k++) ctx.fillRect(x - 8, y - 5 + k * 4, 16, 1.5);
  if (!n.read) { ctx.strokeStyle = `rgba(160,220,255,${0.5 + 0.3 * Math.sin(S.t * 4)})`; ctx.lineWidth = 2; ctx.strokeRect(x - 14, y - 12, 28, 22); }
}
function drawScroll(x, y, t) { drawItemIcon('it_scroll', x, y, t, true); }
function drawScrollOld(x, y, t) {
  const bob = Math.sin(t * 3) * 2;
  ctx.save(); ctx.translate(x, y + bob);
  ctx.strokeStyle = 'rgba(242,196,107,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 18 + Math.sin(t * 4) * 2, 0, TAU); ctx.stroke();
  ctx.rotate(-0.25); ctx.fillStyle = '#e9dcc0'; ctx.fillRect(-10, -7, 20, 14);
  ctx.fillStyle = '#c9b48a'; ctx.fillRect(-12, -8, 4, 16); ctx.fillRect(8, -8, 4, 16);
  ctx.fillStyle = '#c2362b'; ctx.beginPath(); ctx.arc(2, 1, 3.5, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawPlayer(P) {
  if (P.wire) {
    // 전깃줄에 두 손으로 매달린 모습 (땅에는 그림자)
    const h = wirePt(P.wire.w, P.wire.s), sw = P.moving ? Math.sin(S.t * 9) * 2 : 0, dim = P.light < 0.3;
    const blinkW = P.hurtT > 0 && Math.floor(P.hurtT * 12) % 2;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 8, 13, 7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,230,255,.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(h.x, h.y + 40); ctx.lineTo(P.x, P.y + 4); ctx.stroke(); ctx.setLineDash([]);
    if (usePR('ninja') && PR.anims.hang && PR.hangHand) {  // 프리렌더 매달림: 두 손을 줄에 맞추고, 움직이면 다리를 흔들며 옮겨 간다
      const sh = prSheet('ninja'), [c0, nf] = PR.anims.hang, fi = P.moving ? Math.floor(S.t * 6) % nf : 0, fr = PR.fr;
      ctx.globalAlpha = blinkW ? 0.3 : dim ? 0.75 : 1;
      const row = prDir(P.wire.fa != null ? P.wire.fa : -Math.PI / 2);
      ctx.drawImage(sh, (c0 + fi) * fr, row * fr, fr, fr, h.x + sw - PR.hangHand[0], h.y + 2 - PR.hangHand[1], fr, fr);
      if (dim && prVar.ninja_ol) { ctx.globalAlpha = 0.85; ctx.drawImage(prVar.ninja_ol, (c0 + fi) * fr, row * fr, fr, fr, h.x + sw - PR.hangHand[0], h.y + 2 - PR.hangHand[1], fr, fr); }
      ctx.globalAlpha = 1; return;
    }
    ctx.strokeStyle = '#2c3040'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(h.x - 8 + sw, h.y + 18); ctx.lineTo(h.x - 5, h.y + 1); ctx.moveTo(h.x + 8 + sw, h.y + 18); ctx.lineTo(h.x + 5, h.y + 1); ctx.stroke();
    drawChar('ninja', h.x + sw, h.y + 36, -Math.PI / 2, P.moving, blinkW ? 0.3 : dim ? 0.6 : 1, 3);
    if (F.ch_ninja_ol) drawChar('ninja_ol', h.x + sw, h.y + 36, -Math.PI / 2, P.moving, dim ? 0.95 : 0.6, 3);
    ctx.fillStyle = '#f1b089'; ctx.fillRect(h.x - 8, h.y - 3, 5, 5); ctx.fillRect(h.x + 3, h.y - 3, 5, 5);
    return;
  }
  let lift = P.z ? 1 + P.z * 0.05 : 1, yo = 0;
  if (P.jump) { const f = Math.min(1, P.jump.t / P.jump.dur); yo = -Math.sin(f * Math.PI) * P.jump.arc; lift += Math.sin(f * Math.PI) * 0.25; }
  if (P.z || P.jump) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(P.x + 4 + P.z * 2, P.y + 6 + P.z * 3, 15, 11, 0, 0, TAU); ctx.fill(); }
  // 숨은 상태(어둠·덤불): 몸은 반투명, 밝은 외곽선과 발밑 고리로 내 위치는 늘 보이게
  const concealed = !P.jump && !P.under && (CITY && S.expo != null ? S.expo === 0 : (P.hidden || P.light < 0.3));
  if (CITY && !P.jump && !P.z && !P.under && S.expo > 0) {  // 드러남 고리: 노랑(돌아보면 보인다) · 빨강(보고 있다)
    const red = S.expo === 2, pu = red ? 0.6 + 0.35 * Math.sin(S.t * 10) : 0.75;
    ctx.strokeStyle = red ? `rgba(240,80,60,${pu})` : `rgba(242,196,107,${pu})`; ctx.lineWidth = red ? 3 : 2;
    ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 21, 10, 0, 0, TAU); ctx.stroke();
  }
  const blink = P.hurtT > 0 && Math.floor(P.hurtT * 12) % 2;
  const sc = 3 * lift, mv = P.moving || !!P.jump;
  // 자세: 살금살금 = 몸을 낮춤(납작·넓게, 발밑 그림자 큼) / 달리기 = 뒤로 흩날리는 속도선
  const crouch = P.mode === 'sneak' && !P.jump && !P.carrying && !P.captive, runP = P.mode === 'run' && P.moving && !P.jump;
  if (runP) { const bx = -Math.cos(P.a), by = -Math.sin(P.a); ctx.lineWidth = 2.5; for (const o of [-8, 0, 8]) { const ph = (S.t * 5 + o * 0.05) % 1, px = P.x - by * o, py = P.y + 6 + bx * o; ctx.strokeStyle = `rgba(232,238,248,${0.5 * (1 - ph)})`; ctx.beginPath(); ctx.moveTo(px + bx * (18 + ph * 8), py + by * (18 + ph * 8)); ctx.lineTo(px + bx * (36 + ph * 14), py + by * (36 + ph * 14)); ctx.stroke(); } }
  if (P.ledge && usePR('ninja') && PR.anims.hang && PR.hangHand) {  // 지붕 끝에 두 손으로 매달림
    const n = P.ledge, hx = P.x + n.x * 14, hy = P.y + n.y * 14 + (n.y > 0 ? 6 : 0), sh = prSheet(P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja'), [c0, nf] = PR.anims.hang, fr = PR.fr, fi = P.moving ? Math.floor(S.t * 6) % nf : 0;
    ctx.save(); if (n.y < 0) { ctx.beginPath(); ctx.rect(hx - 60, hy - 200, 120, 206); ctx.clip(); }
    ctx.globalAlpha = n.y < 0 ? 0.75 : 1; ctx.drawImage(sh, (c0 + fi) * fr, 6 * fr, fr, fr, hx - PR.hangHand[0], hy + 2 - PR.hangHand[1], fr, fr); ctx.restore(); ctx.globalAlpha = 1;
    return;
  }
  if (usePR('ninja') && PR.anims.climb && (P.trav || (P.jump && P.jump.vault))) {
    // 오르기·넘기: 배관·벽을 붙잡고 팔다리를 번갈아 / 창턱을 짚고 몸을 접어 넘는다
    const PK = P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja', s1 = sc / 3, al = blink ? 0.35 : 1;
    if (P.jump) { const f = Math.min(1, P.jump.t / P.jump.dur); drawPR(PK, P.x, P.y, P.a, 'vault', 0, al, s1, -yo, f < 0.28 ? 0 : f < 0.78 ? 1 : 2); return; }
    const T = P.trav, tp = travPose(T);
    if (tp.pose === 'climb') { drawPR(PK, P.x, P.y, T.face != null ? T.face : P.a, 'climb', 0, al, s1, 14, ((Math.floor(T.t * 7) * (T.down ? -1 : 1)) % 4 + 4) % 4); return; }
    if (tp.pose === 'vault') { drawPR(PK, P.x, P.y, T.face != null ? T.face : P.a, 'vault', 0, al, s1, Math.sin(tp.g * Math.PI) * 10, tp.g < 0.3 ? 0 : tp.g < 0.75 ? 1 : 2); return; }
  }
  if (usePR('ninja')) {
    // 프리렌더: 자세가 애니메이션으로 구분된다 (서기·걷기·달리기·웅크려 걷기·웅크림·찌르기)
    if (P.killAnim && P.strikeT > 0 && PAIR() && usePR(P.killAnim.ch)) {  // 뒤에서 목 조르기
      const PK1 = P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja', s1 = sc / 3, j = Math.sin(S.t * 40) * 1.5;
      drawPR(PK1, P.x, P.y, P.a, 'grabI', 0, 1, s1, -yo); drawPR(P.killAnim.ch, P.x + j, P.y, P.a, 'heldI', 0, 1, s1, -yo); return;
    }
    if (P.killAnim && P.strikeT <= 0) P.killAnim = null;
    const pc = pairCarry(P), pg = !pc && pairGrab(P);
    if (P.cover && PR.anims.lean && !P.strikeT) {  // 벽에 기댐: 등 뒤 벽에 옅은 선, 기댄 자세 (옆걸음은 웅크려 걷기)
      const n = P.cover, wx = P.x - n.x * 15, wy = P.y - n.y * 15;
      ctx.strokeStyle = 'rgba(150,220,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx - n.y * 18, wy + n.x * 18); ctx.lineTo(wx + n.y * 18, wy - n.x * 18); ctx.stroke();
      const PK0 = P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja', s0 = sc / 3, aa = mv ? P.a : Math.atan2(n.y, n.x);
      drawPR(PK0, P.x, P.y, aa, mv ? 'sneak' : 'lean', S.t, blink ? 0.35 : concealed ? 0.6 : 1, s0, -yo, mv ? -1 : (Math.floor(S.t * 0.4) % 2));
      if (concealed && prVar.ninja_ol) drawPR('ninja_ol', P.x, P.y, aa, mv ? 'sneak' : 'lean', S.t, 0.85, s0, -yo, mv ? -1 : (Math.floor(S.t * 0.4) % 2));
      return;
    }
    const anim = pc ? (mv ? 'carry' : 'carryI') : pg ? (mv ? 'grab' : 'grabI') : P.strikeT > 0 ? 'punch' : crouch ? (mv ? 'sneak' : 'crouch') : !mv ? 'idle' : (runP || P.jump) ? 'run' : 'walk';
    const t = S.t, s = sc / 3, PK = P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja';
    // 메고 있는 시체·붙잡은 사람: 같은 프레임으로 겹쳐 그린다 (서로 가린 채 렌더링돼 있다)
    const other = pc ? [carryKey(P.carrying), mv ? 'carried' : 'carriedI'] : pg ? [charOf(P.captive), mv ? 'held' : 'heldI'] : null;
    const shake = pg ? Math.sin(S.t * 31) * 1.2 : 0;
    if (concealed) {
      const pulse = 0.55 + 0.25 * Math.sin(S.t * 3);
      ctx.fillStyle = 'rgba(120,200,255,.10)'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(160,230,255,${pulse})`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      drawPR(PK, P.x, P.y, P.a, anim, t, blink ? 0.25 : 0.55, s, -yo);
      if (other) drawPR(other[0], P.x + shake, P.y, P.a, other[1], t, blink ? 0.3 : 0.92, s, -yo);
      if (prVar.ninja_ol) drawPR('ninja_ol', P.x, P.y, P.a, anim, t, blink ? 0.3 : 0.9, s, -yo);
    } else { drawPR(PK, P.x, P.y, P.a, anim, t, blink ? 0.35 : 1, s, -yo); if (other) drawPR(other[0], P.x + shake, P.y, P.a, other[1], t, blink ? 0.35 : 1, s, -yo); }
    if (P.disguise && !P.disguiseBlown) { ctx.fillStyle = 'rgba(127,174,134,.9)'; ctx.font = '700 11px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('변장', P.x, P.y - 44 * s); }
    return;
  }
  if (crouch) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 14, 19, 8, 0, 0, TAU); ctx.fill(); }
  ctx.save(); if (crouch) { ctx.translate(P.x, P.y + 16); ctx.scale(1.14, 0.72); ctx.translate(-P.x, -(P.y + 16)); }
  if (concealed) {
    const pulse = 0.55 + 0.25 * Math.sin(S.t * 3);
    ctx.fillStyle = 'rgba(120,200,255,.10)'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(160,230,255,${pulse})`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    drawChar('ninja', P.x, P.y, P.a, mv, blink ? 0.25 : 0.5, sc, P.strikeT > 0, -yo);
    if (F.ch_ninja_ol) drawChar('ninja_ol', P.x, P.y, P.a, mv, blink ? 0.3 : 0.95, sc, P.strikeT > 0, -yo);
  } else drawChar('ninja', P.x, P.y, P.a, mv, blink ? 0.35 : 1, sc, P.strikeT > 0, -yo);
  ctx.restore();
}
// 도면 시야 (Monaco): 바깥 땅에 서 있으면, 창문·열린 문으로 시선이 닿는 방 안만 보인다
function drawWindowSight(P, openB) {
  if (P.z || P.wire || P.jump || P.trav || P.hide || P.vent || P.under || flOf(P)) return;
  const R = 430, poly = [];
  for (let i = 0; i < 180; i++) { const a = i / 180 * TAU, d = castRay(P.x, P.y, a, R); poly.push(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d); }
  const path = () => { ctx.beginPath(); for (let i = 0; i < poly.length; i += 2) i ? ctx.lineTo(poly[i], poly[i + 1]) : ctx.moveTo(poly[i], poly[i + 1]); ctx.closePath(); };
  BLD.forEach((b, bi) => {
    if (bi === openB || b.piloti) return;
    const bx = b.x0 * TILE, by = b.y0 * TILE, bw = (b.x1 - b.x0 + 1) * TILE, bh = (b.y1 - b.y0 + 1) * TILE;
    if (P.x < bx - R || P.x > bx + bw + R || P.y < by - R || P.y > by + bh + R) return;
    // 바깥벽 안쪽으로 시선이 들어가는지 (안쪽 칸 하나라도)
    let inside = false; for (let i = 0; i < poly.length && !inside; i += 2) { const tx = Math.floor((poly[i] - Math.cos(i / poly.length * TAU) * 2) / TILE), ty = Math.floor((poly[i + 1] - Math.sin(i / poly.length * TAU) * 2) / TILE); if (tx > b.x0 && tx < b.x1 && ty > b.y0 && ty < b.y1) inside = true; }
    if (!inside) return;
    b.wsT = S.t;  // 이번 프레임 창문 시선으로 들여다보는 중 (지붕 발광은 쉰다)
    // 도면: 건물 평면을 흐리게 (사람은 안 보임)
    ctx.save(); ctx.globalAlpha = 0.5; ctx.drawImage(mapC, bx, by, bw, bh, bx, by, bw, bh); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(20,34,52,.45)'; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(160,200,235,.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2); ctx.setLineDash([]); ctx.restore();
    // 시선이 닿는 곳: 또렷하게 + 사람까지
    ctx.save(); ctx.beginPath(); ctx.rect(bx + TILE, by + TILE, bw - 2 * TILE, bh - 2 * TILE); ctx.clip(); path(); ctx.clip();
    ctx.drawImage(mapC, bx, by, bw, bh, bx, by, bw, bh);
    for (const c of S.corpses) if (!c.stashed && !flOf(c) && bldAt(Math.floor(c.x / TILE), Math.floor(c.y / TILE)) === bi) drawBody(c);
    for (const g of S.guards) if (g.state !== 'DEAD' && !flOf(g) && !g.z && !g.climb && bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)) === bi) { drawGuard(g); if (g.icon) drawEmote(g.icon, g.x, g.y - 30); }
    for (const it of S.items) if (!it.got && !flOf(it) && bldAt(Math.floor(it.x / TILE), Math.floor(it.y / TILE)) === bi) drawScroll(it.x, it.y, S.t);
    ctx.fillStyle = 'rgba(255,230,170,.06)'; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(190,235,255,.7)'; ctx.lineWidth = 2; path(); ctx.stroke();
    ctx.restore();
    hint('winsight', '창문과 열린 문으로 시선이 닿는 방 안은 바깥에서도 보인다. 들어가기 전에 창가를 돌며 살펴라');
  });
}
// 살피기(Tab): 가까운 건물의 1층 평면(방 이름)을 흐리게 겹쳐 보인다
function drawPlansFaint(P, openB) {
  BLD.forEach((b, bi) => {
    if (bi === openB || !b.plan) return; const bx = b.x0 * TILE, by = b.y0 * TILE, bw = (b.x1 - b.x0 + 1) * TILE, bh = (b.y1 - b.y0 + 1) * TILE;
    if (Math.abs(P.x - (bx + bw / 2)) > bw / 2 + 520 || Math.abs(P.y - (by + bh / 2)) > bh / 2 + 420) return;
    ctx.globalAlpha = 0.42; ctx.drawImage(mapC, bx, by, bw, bh, bx, by, bw, bh); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(160,200,235,.6)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2); ctx.setLineDash([]);
    if (b.name) tag(bx + bw / 2, by - 12, b.name, '#a0c8eb');
  });
}
// 전봇대: 회색 콘크리트 기둥 + 노랑·검정 띠 + 완금(가로대)·애자 (+ 변압기)
function drawPole(o) {
  const x = o.x, y = o.y, top = y - o.top, lt = lightAt(x, y + 10);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 15, 10, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#7d8088'; ctx.fillRect(x - 5, top, 10, y + 14 - top); ctx.fillStyle = '#a7aab2'; ctx.fillRect(x - 5, top, 3, y + 14 - top);
  for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#1c1c20' : '#d8b636'; ctx.fillRect(x - 5, y + 8 - k * 6, 10, 6); }
  ctx.fillStyle = '#55585f'; ctx.fillRect(x - 20, top + 6, 40, 5); ctx.fillStyle = '#d9dde4'; for (const k of [-16, 0, 16]) ctx.fillRect(x + k - 2, top + 1, 4, 6);
  if ((o.tx + o.ty) % 2 === 0) { ctx.fillStyle = '#8e939c'; ctx.fillRect(x + 5, top + 15, 11, 17); ctx.fillStyle = '#62666e'; ctx.fillRect(x + 5, top + 15, 11, 3); }
  if (!tactical) { ctx.fillStyle = `rgba(4,8,22,${0.62 * (1 - clamp(lt * 1.3, 0, 1))})`; ctx.fillRect(x - 21, top, 42, y + 16 - top); }
}
function drawWires() {
  for (const w of S.wires) {
    const cx = (w.a.dx + w.b.dx) / 2, cy = (w.a.dy + w.b.dy) / 2 + w.sag * 2;
    for (const [off, col, lw] of [[6, '#101218', 2], [0, '#14161c', 3], [-1.5, 'rgba(176,186,206,.45)', 1]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(w.a.dx, w.a.dy + off); ctx.quadraticCurveTo(cx, cy + off * 1.4, w.b.dx, w.b.dy + off); ctx.stroke(); }
    for (const n of [w.a, w.b]) if (n.roof) { ctx.fillStyle = '#2e3138'; ctx.fillRect(n.dx - 5, n.dy - 5, 10, 10); ctx.fillStyle = '#9aa0aa'; ctx.fillRect(n.dx - 2, n.dy - 2, 4, 4); }
  }
}
// 건물 지붕 덮개 (안에 들어가 있는 건물만 열어 보인다)
// 판자 다리: 지붕과 지붕 사이에 걸친 널빤지 (위를 걸을 수 있고, 아래 골목은 그대로 지나다닌다)
function drawPlanks() {
  for (const [x0, y0, x1, y1] of STAGE.planks || []) {
    const ew = (x1 - x0) >= (y1 - y0);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (BI[y * MW + x] >= 0) continue; const px = x * TILE, py = y * TILE;
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(px + 6, py + 14, TILE, TILE - 6);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#7a5a3a' : '#8a6744'; if (ew) ctx.fillRect(px + k * 8, py + 6, 7, TILE - 12); else ctx.fillRect(px + 6, py + k * 8, TILE - 12, 7); }
      ctx.fillStyle = '#3a2a1a'; if (ew) { ctx.fillRect(px, py + 4, TILE, 3); ctx.fillRect(px, py + TILE - 7, TILE, 3); } else { ctx.fillRect(px + 4, py, 3, TILE); ctx.fillRect(px + TILE - 7, py, 3, TILE); }
    }
  }
}
function drawRoofs(openB) {
  const roof = STAGE.roof || ['#444a55', '#545b68'];
  BLD.forEach((b, i) => {
    if (i === openB) {
      ctx.strokeStyle = 'rgba(242,196,107,.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.strokeRect(b.x0 * TILE + 1, b.y0 * TILE + 1, (b.x1 - b.x0 + 1) * TILE - 2, (b.y1 - b.y0 + 1) * TILE - 2); ctx.setLineDash([]);
      if (CITY && !flOf(S.player)) drawFacadeExtras(b, true);
      return;
    }
    const x = b.x0 * TILE, y = b.y0 * TILE, w = (b.x1 - b.x0 + 1) * TILE, h = b.roofC.rh;
    if (b.kit && drawKitBuilding(b)) {
      drawFacadeExtras(b, false, true);
      ctx.fillStyle = 'rgba(232,227,214,.55)'; ctx.font = '700 11px "IBM Plex Mono",monospace'; ctx.textAlign = 'left'; ctx.fillText(b.h + 'F', x + 6, y + 14);
      return;
    }
    const sh = b.h * 6;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x + sh, y + sh, w, h);
    if (b.facade) { drawFacade(b); if (CITY) drawFacadeExtras(b); }
    ctx.drawImage(b.roofC, x, y);
    if (b.h >= 2 && !b.roofC.giwa && !b.roofC.flat) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4); }
    ctx.fillStyle = NEONY() ? 'rgba(26,8,56,.4)' : 'rgba(4,8,22,.5)'; ctx.fillRect(x, y, w, h + (b.roofC.giwa && b.facade ? 20 : 0));
    if (NEONY()) { ctx.strokeStyle = 'rgba(255,46,136,.85)'; ctx.lineWidth = 2.5; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h + (b.facade ? b.fh * TILE : 0) - 3); if (b.facade) { ctx.strokeStyle = 'rgba(46,242,255,.8)'; ctx.beginPath(); ctx.moveTo(x, (b.y1 + 1) * TILE - 1); ctx.lineTo(x + w, (b.y1 + 1) * TILE - 1); ctx.stroke(); } }
    ctx.fillStyle = 'rgba(232,227,214,.55)'; ctx.font = '700 11px "IBM Plex Mono",monospace'; ctx.textAlign = 'left';
    ctx.fillText(b.h + 'F', x + 6, y + 14);
    if (b.h >= 3 && !b.roofC.giwa && !b.roofC.flat) { ctx.strokeStyle = 'rgba(232,227,214,.18)'; ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 8, w - 16, h - 16); }
  });
  const onFacade = (tx, ty) => { const b = bldAt(tx, ty); return b >= 0 && BLD[b].facade && ty >= BLD[b].y1 - BLD[b].fh + 1; };
  for (const w of S.windows) { const b = bldAt(w.tx, w.ty); if (b >= 0 && b !== openB && !onFacade(w.tx, w.ty)) { if (CITY && BLD[b].kit) drawWindowEdge(w, BLD[b]); else drawWindow(w, CITY ? 0.5 : 0.9); } }
  for (const d of S.doors) { const b = bldAt(d.tx, d.ty); if (b >= 0 && b !== openB && !onFacade(d.tx, d.ty) && !BLD[b].plan) drawDoor(d, true); }
  for (const l of S.ladders) if (l.kind === 'pipe' && !l.gas) drawPipe(l);
  for (const l of S.ladders) if (l.kind === 'chimney' && bldAt(l.tx, l.ty) !== openB) drawChimney(l);
  for (const v of S.vents) if (v.roof && bldAt(v.tx, v.ty) !== openB) drawGrate(v, 1);
  drawTrapsRoof();
}
// 가스관과 2층 베란다 (정면 벽 위에 그린다)
function drawFacadeExtras(b, flat, kit) {
  if (b.fuse != null) { const fb = (S.bfuses || []).find(f => f.b === BLD.indexOf(b)); const fx = b.fuse * TILE + 12, fy = (b.y1 + 1) * TILE - (flat ? 12 : 34);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(fx + 3, fy + 3, 24, 22); ctx.fillStyle = '#8d939c'; ctx.fillRect(fx, fy, 24, 22); ctx.strokeStyle = '#4a4f58'; ctx.lineWidth = 2; ctx.strokeRect(fx + 1, fy + 1, 22, 20);
    ctx.fillStyle = fb && fb.cut ? '#e8473c' : '#e2c25a'; ctx.fillRect(fx + 9, fy + 6, 6, 9); }
  if (flat) {  // 안이 열려 보일 때(평면): 벽 바깥에 난간·배관 자리만 표시
    for (const tx of b.gas || []) {  // 위에서 본 가스관: 벽 바깥에 붙은 노란 관 단면 + 고정쇠 + 계량기 함
      const px = tx * TILE + (tx === b.x0 ? 9 : tx === b.x1 ? TILE - 9 : TILE / 2), py = (b.y1 + 1) * TILE + 5, ins = px < (b.x0 + b.x1 + 1) * TILE / 2 ? 1 : -1;
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(px + 2, py + 3, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5c6068'; ctx.fillRect(px - 8, py - 6, 16, 4);
      ctx.fillStyle = '#9ea3ab'; ctx.fillRect(px + ins * 9 - (ins < 0 ? 14 : 0), py - 6, 14, 9); ctx.fillStyle = '#2a2d33'; ctx.fillRect(px + ins * 9 - (ins < 0 ? 14 : 0) + 3, py - 3, 8, 3);
      const g = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, 7); g.addColorStop(0, '#ffe58a'); g.addColorStop(0.6, '#d6ad2c'); g.addColorStop(1, '#7a5e12');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#3a2e0a'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const tx of b.balc || []) { const x0 = tx * TILE - 18, w = TILE + 36, y = (b.y1 + 1) * TILE - 2; ctx.fillStyle = '#6b6f78'; ctx.fillRect(x0, y, w, 7); ctx.fillStyle = '#2b2f37'; for (let x = x0 + 2; x < x0 + w - 1; x += 7) ctx.fillRect(x, y + 1, 2, 5); ctx.fillStyle = 'rgba(242,196,107,.8)'; ctx.font = '700 10px "IBM Plex Mono",monospace'; ctx.textAlign = 'center'; ctx.fillText('2F 베란다', tx * TILE + TILE / 2, y + 17); }
    return;
  }
  const top = (b.y1 - b.fh + 1) * TILE - 4, bot = (b.y1 + 1) * TILE + 6;
  if (b.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${b.tint})`; ctx.fillRect(b.x0 * TILE, top + 4, (b.x1 - b.x0 + 1) * TILE, bot - top - 10); ctx.globalCompositeOperation = 'source-over'; }
  if (b.plate && b.kind !== 'shop' && b.fh >= 2) {  // 건물 이름판 (꼭대기 층 벽)
    ctx.font = '700 15px Galmuri, "IBM Plex Sans KR", sans-serif'; const tw = ctx.measureText(b.plate).width + 18, cx = (b.x0 + b.x1 + 1) * TILE / 2, py = top + 8;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(cx - tw / 2 + 3, py + 3, tw, 22);
    ctx.fillStyle = b.church ? '#5a1418' : '#23303a'; ctx.fillRect(cx - tw / 2, py, tw, 22);
    ctx.strokeStyle = b.church ? '#ff6a6a' : '#c9a646'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - tw / 2 + 1, py + 1, tw - 2, 20);
    ctx.fillStyle = b.church ? '#ffd0d0' : '#f0d890'; ctx.textAlign = 'center'; ctx.fillText(b.plate, cx, py + 16);
  }
  if (!kit) for (const tx of b.gas || []) {  // 키트 건물은 3D로 구운 배관이 그림에 들어 있다
    const px = tx * TILE + (tx === b.x0 ? 9 : tx === b.x1 ? TILE - 9 : TILE / 2);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(px - 1, top, 7, bot - top);
    ctx.fillStyle = '#c9a43a'; ctx.fillRect(px - 3, top, 6, bot - top);
    ctx.fillStyle = '#f0d070'; ctx.fillRect(px - 2, top, 2, bot - top);
    ctx.fillStyle = '#5a5e66'; for (let y = top + 10; y < bot - 6; y += 22) ctx.fillRect(px - 5, y, 10, 3);
    ctx.fillStyle = '#7d828c'; ctx.fillRect(px - 7, bot - 30, 14, 12); ctx.fillStyle = '#2a2d33'; ctx.fillRect(px - 4, bot - 27, 8, 5);  // 계량기
  }
  if (!kit) for (const tx of b.balc || []) {
    const yy = (b.y1 - 1) * TILE, x0 = tx * TILE - 18, w = TILE + 36;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x0 + 3, yy + TILE - 2, w, 6);
    ctx.fillStyle = '#6b6f78'; ctx.fillRect(x0, yy + TILE - 8, w, 8);
    ctx.fillStyle = '#8a8f98'; ctx.fillRect(x0, yy + TILE - 8, w, 2);
    ctx.fillStyle = '#2b2f37'; ctx.fillRect(x0, yy + 16, w, 4);
    for (let x = x0 + 2; x < x0 + w - 1; x += 7) ctx.fillRect(x, yy + 18, 2, TILE - 26);
    ctx.fillStyle = '#4a7a46'; ctx.beginPath(); ctx.arc(x0 + 10, yy + 14, 7, 0, TAU); ctx.fill();  // 난간 화분
    ctx.fillStyle = '#a8a39a'; ctx.fillRect(x0 + w - 22, yy + 12, 14, 4);  // 빨래
  }
}
// 키트 굽기용: 건물마다 정면 줄(층별)의 창·문·기둥 자리
// ---- 옥상 살림: 옥탑방·물탱크·계단실(막힘) + 간판·채광창·텃밭·빨랫줄·태양광판·실외기·환기관(그림만)
// 배치는 여기서 정하고 kitSpec으로 굽기에 넘긴다. 구운 kit.json에 같은 목록이 들어 있으면 막힘 칸이 된다
const hN = (...a) => { let h = 2166136261 >>> 0; for (const v of a) { h = Math.imul(h ^ (v & 0xffff), 16777619) >>> 0; h = Math.imul(h ^ ((v >>> 16) & 0xffff), 16777619) >>> 0; } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; return (h ^ (h >>> 15)) >>> 0; };
const ROOF_SOLID = { okt: 1, tank: 1, stair: 1 };
function roofProps(b, bi) {
  if (!CITY || !b.facade || b.fh !== b.h || b.piloti) return [];
  const x0 = b.x0, x1 = b.x1, ry0 = b.y0, ry1 = b.y1 - b.fh, w = x1 - x0 + 1, dr = ry1 - ry0 + 1, L = lvAt(x0, ry0);
  if (dr < 2 || L <= 0) return [];
  for (let y = ry0; y <= ry1; y++) for (let x = x0; x <= x1; x++) if (rLv(x, y) !== L || bldAt(x, y) !== bi) return [];
  const house = b.kind === 'house', shop = b.kind === 'shop', glass = !!b.glass, mansard = house && dr >= 2, fr = mansard ? 1 : 0, uy1 = ry1 - fr, hs = hN(x0, ry0, w, b.h);
  const K = (x, y) => x + ',' + y, hard = new Set(), soft = new Set();
  const mark = (x, y) => { if (x >= x0 && x <= x1 && y >= ry0 && y <= ry1) hard.add(K(x, y)); };
  // 옥상 계단실: 건물 안 계단('Y') 바로 위에 선다. 문은 걸을 수 있는 지붕 칸 쪽(남·서·동·북 순)으로, 오르내리는 자리는 문 앞
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
  (STAGE.planks || []).forEach(([ax, ay, bx, by]) => { for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) mark(x, y); mark(ax - 1, ay); mark(ax + 1, ay); mark(bx - 1, by); mark(bx + 1, by); mark(ax, ay - 1); mark(ax, ay + 1); mark(bx, by - 1); mark(bx, by + 1); });
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
  const connected = () => {  // 막힘을 넣어도 지붕이 한 덩어리로 이어져 있는가
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
  for (const h of shs) {  // 계단실 = 옥탑방 (막힘). 지붕이 끊기면 한 칸짜리로, 그래도 끊기면 놓지 않는다
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
  return out;
}
// 구운 kit.json의 옥상 살림 목록 → 지붕 막힘 칸
let ROB = null;
const robAt = (tx, ty) => !!(ROB && inMap(tx, ty) && ROB[ty * MW + tx]);
function robBuild() {
  ROB = new Uint8Array(MW * MH); let n = 0;
  BLD.forEach(b => (b.kitProps || []).forEach(p => {
    if (p.t === 'sh') {
      p.cells.forEach(([x, y]) => { if (inMap(x, y)) { ROB[y * MW + x] = 1; n++; } });
      const l = S && S.ladders && S.ladders.find(q => q.kind === 'stair' && q.tx === p.sx && q.ty === p.sy);
      if (l) { l.rx = tc(p.door[0]); l.ry = tc(p.door[1]); l.shDir = p.dir; }
      return;
    }
    if (!ROB_SOLID_DIM[p.t]) return; const [cw, cd] = ROB_SOLID_DIM[p.t]; for (let y = p.y; y < p.y + cd; y++) for (let x = p.x; x < p.x + cw; x++) if (inMap(x, y)) { ROB[y * MW + x] = 1; n++; } }));
  if (!n) ROB = null;
  if (S && S.hides) S.hides = S.hides.filter(h => h.type !== 'okt');
}
const ROB_SOLID_DIM = { tank: [1, 1] };
function kitSpec() {
  return { id: STAGE.id, W: MW, H: MH, furn: [...new Set(FURN.map(f => f.t + '_' + f.w + 'x' + f.h))], b: BLD.map((b, i) => ({ i, props: roofProps(b, i), x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, h: b.h, fh: b.fh || 0, facade: !!b.facade, kind: b.kind || '', glass: !!b.glass, piloti: !!b.piloti, alt: b.alt || 0, balc: b.balc || [], gas: b.gas || [], name: b.name || '',
    front: Array.from({ length: b.fh || 0 }, (_, f) => { const g = f ? GF[f] : G0, row = []; for (let x = b.x0; x <= b.x1; x++) { const ch = g && g[b.y1] ? g[b.y1][x] : null; row.push(!f && S.doors.some(d => d.tx === x && d.ty === b.y1) ? 'D' : ch || '?'); } return row; }) })) };
}
// 3/4 정면벽: 건물 남쪽 벽 줄을 정면에서 본 벽으로 그린다 (실제 문·창문 그림)
function drawFacade(b) {
  const y = b.y1 * TILE;
  if (!b.fl || S.t - b.flT > 0.3) { b.flT = S.t; b.fl = []; for (let tx = b.x0; tx <= b.x1; tx++) b.fl.push(lightAt(tc(tx), y + TILE + 14)); }
  if (CITY && b.kind === 'shop') return drawShopFacade(b);
  const wn = n => (CITY && b.alt ? n + 'B' : n);
  const glow = (x, yy, tx, r) => {  // 도시: 불 켜진 창 몇 개 (촛불·등잔빛)
    if (!CITY) return; const h = ((tx * 92821) ^ ((b.y1 - r) * 68917) ^ (b.x0 * 31)) >>> 0;
    if (h % 5) return; const fl = 0.85 + 0.15 * Math.sin(S.t * 3 + tx);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,170,80,${0.42 * fl})`; ctx.fillRect(x + 12, yy + 10, 24, 26); ctx.globalCompositeOperation = 'source-over';
  };
  // 위층 벽: 한 칸 걸러 창, 층 사이에 작은 처마(도시는 띠)
  for (let r = 1; r < b.fh; r++) {
    const yy = (b.y1 - r) * TILE;
    for (let tx = b.x0; tx <= b.x1; tx++) {
      const x = tx * TILE;
      blit(ctx, wn(tx === b.x0 ? 'fWallL' : tx === b.x1 ? 'fWallR' : 'fWall'), x, yy, TILE, TILE);
      const win = tx > b.x0 && tx < b.x1 && (tx - b.x0) % 2 === 1;
      if (win && CITY) blit(ctx, b.alt ? 'fWinB' : 'fWin', x, yy, TILE, TILE);
      else if (win) { ctx.fillStyle = '#1d2733'; ctx.fillRect(x + 7, yy + 6, 34, 30); blit(ctx, 'fWin', x + 9, yy + 8, 30, 26); ctx.strokeStyle = '#8fc3e6'; ctx.lineWidth = 2; ctx.strokeRect(x + 7, yy + 6, 34, 30); if (NEO) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = (tx + b.y1) % 3 ? 'rgba(46,242,255,.32)' : 'rgba(255,46,136,.32)'; ctx.fillRect(x + 7, yy + 6, 34, 30); ctx.globalCompositeOperation = 'source-over'; } }
      const l = b.fl[tx - b.x0]; ctx.fillStyle = `rgba(4,8,22,${0.68 * (1 - clamp(l, 0, 1)) + 0.06 * r})`; ctx.fillRect(x, yy, TILE, TILE);
      if (win) glow(x, yy, tx, r);
    }
    const by = yy + TILE;  // 층 사이 처마 띠
    if (CITY) { for (let tx = b.x0; tx <= b.x1; tx++) blit(ctx, wn('fBand'), tx * TILE, by - 13, TILE, 26, 0, 3, 16, 9); ctx.fillStyle = 'rgba(4,8,22,.45)'; ctx.fillRect(b.x0 * TILE, by - 13, (b.x1 - b.x0 + 1) * TILE, 26); }
    else if (JOSEON && F.gw_eave) { const e = F.gw_eave; for (let x = b.x0 * TILE; x < (b.x1 + 1) * TILE; x += 32) ctx.drawImage(atlas, e[0], e[1], 16, 20, x, by - 22, 32, 30); ctx.fillStyle = 'rgba(4,8,22,.45)'; ctx.fillRect(b.x0 * TILE, by - 14, (b.x1 - b.x0 + 1) * TILE, 22); }
    else { ctx.fillStyle = '#2a1a14'; ctx.fillRect(b.x0 * TILE, by - 5, (b.x1 - b.x0 + 1) * TILE, 9); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(b.x0 * TILE, by + 4, (b.x1 - b.x0 + 1) * TILE, 5); }
  }
  for (let tx = b.x0; tx <= b.x1; tx++) {
    const x = tx * TILE, ch = G[b.y1][tx];
    const door = S.doors.find(d => d.tx === tx && d.ty === b.y1);
    if (b.piloti) {  // 필로티: 어두운 주차장 입구 + 콘크리트 기둥 + 위층 바닥판
      ctx.fillStyle = '#0b0d12'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(70,74,84,.5)'; ctx.fillRect(x, y + 6, TILE, 4);
      if (ch === 'I') { ctx.fillStyle = '#8c8f97'; ctx.fillRect(x + 14, y, 20, TILE); ctx.fillStyle = '#b3b6bd'; ctx.fillRect(x + 14, y, 5, TILE); ctx.fillStyle = '#5d6068'; ctx.fillRect(x + 29, y, 5, TILE); }
      ctx.fillStyle = '#9a9ca3'; ctx.fillRect(x, y, TILE, 6);
    } else if (door) { blit(ctx, wn('fWall'), x, y, TILE, TILE); blit(ctx, door.locked ? 'fDoor' : 'fDoorOpen', x, y, TILE, TILE); if (door.locked && door.keyLock) { ctx.fillStyle = keyCol(door.keyLock); ctx.fillRect(x + 19, y + 22, 10, 10); } }
    else {
      blit(ctx, wn(tx === b.x0 ? 'fWallL' : tx === b.x1 ? 'fWallR' : (tx * 7 + b.y1) % 5 === 0 ? 'fWall2' : 'fWall'), x, y, TILE, TILE);
      if (ch === 'N' && CITY) blit(ctx, b.alt ? 'fWinB' : 'fWin', x, y, TILE, TILE);
      else if (ch === 'N') { ctx.fillStyle = '#1d2733'; ctx.fillRect(x + 5, y + 4, 38, 38); blit(ctx, 'fWin', x + 7, y + 6, 34, 34); if (NEO) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = (tx + b.y1) % 3 ? 'rgba(46,242,255,.32)' : 'rgba(255,46,136,.32)'; ctx.fillRect(x + 5, y + 4, 38, 38); ctx.globalCompositeOperation = 'source-over'; } ctx.strokeStyle = '#8fc3e6'; ctx.lineWidth = 2; ctx.strokeRect(x + 5, y + 4, 38, 38); ctx.fillStyle = '#e8eef2'; ctx.fillRect(x + 3, y + 42, 42, 3); }
      if (ch === 'S') { ctx.strokeStyle = 'rgba(40,24,14,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 22, y + 6); ctx.lineTo(x + 17, y + 20); ctx.lineTo(x + 27, y + 30); ctx.lineTo(x + 21, y + 44); ctx.stroke(); }
    }
    const l = b.fl[tx - b.x0]; ctx.fillStyle = `rgba(4,8,22,${0.62 * (1 - clamp(l, 0, 1))})`; ctx.fillRect(x, y, TILE, TILE);
  }
  const top = (b.y1 - b.fh + 1) * TILE;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(b.x0 * TILE, top, (b.x1 - b.x0 + 1) * TILE, 6);
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.strokeRect(b.x0 * TILE + 1, top, (b.x1 - b.x0 + 1) * TILE - 2, b.fh * TILE);
}
// 상가 건물 정면: 회색 콘크리트 + 층마다 띠창 + 간판 (전쟁 뒤라 몇 개는 꺼지거나 글자가 빠졌다)
// 네온 간판: 어둠 위에 다시 그리고 번지는 빛을 더한다 (깜빡이는 것도 있다) + 빌딩 세로 간판
function drawNeonSigns() {
  const t = S.t;
  BLD.forEach((b, i) => {
    if (!b.facade || b.kind !== 'shop' || i === S.openB) return;
    const list = (b.signRects || []).slice();
    if (b.fh >= 3) { const txt = (b.plate || b.name || '').replace(/\s/g, ''); if (txt) { const vx = b.x1 * TILE + 8, vy = (b.y1 - b.fh + 1) * TILE + 10, vh = Math.min(txt.length * 22 + 14, (b.fh - 1) * TILE - 10); list.push({ x: vx, y: vy, w: 30, h: vh, c: [['#ff3ca8', '#ffe0f4'], ['#3ce0ff', '#e0fbff'], ['#b45aff', '#f2e0ff']][i % 3], txt, on: true, vert: true, k: 9 }); } }
    for (const r of list) {
      const flick = r.on ? (((i * 7 + r.k * 13 + Math.floor(t * 9)) % 53 === 0) ? 0.25 : 1) : (Math.sin(t * 23 + i) > 0.6 ? 0.6 : 0.12);
      const rgb = hexRgb(r.c[0]);
      ctx.globalCompositeOperation = 'lighter';
      for (const [pad, a] of [[22, 0.08], [12, 0.15], [4, 0.28]]) { ctx.fillStyle = `rgba(${rgb},${a * flick})`; ctx.fillRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35 + 0.65 * flick; ctx.fillStyle = '#0c0a12'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = r.c[0]; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.fillStyle = r.c[1]; ctx.font = '700 15px Galmuri, "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (r.vert) { [...r.txt].forEach((ch, k) => { if (14 + k * 22 < r.h) ctx.fillText(ch, r.x + r.w / 2, r.y + 14 + k * 22); }); } else ctx.fillText(r.txt, r.x + r.w / 2, r.y + r.h / 2 + 1);
      ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
    }
  });
}
function drawShopFacade(b) {
  const x0 = b.x0 * TILE, wAll = (b.x1 - b.x0 + 1) * TILE, hs = ((b.x0 * 73856093) ^ (b.y0 * 19349663)) >>> 0;
  b.signRects = []; const club = (b.floorsUse || []).includes('club');
  const COLS = [['#c8402e', '#fff4d8'], ['#2a5aa8', '#ffffff'], ['#f2c02a', '#2a2018'], ['#2a8a5a', '#ffffff'], ['#6a2a8a', '#ffe8ff'], ['#e86a2a', '#ffffff']];
  for (let r = b.fh - 1; r >= 0; r--) {
    const yy = (b.y1 - r) * TILE;
    ctx.fillStyle = club ? '#16121c' : '#80858f'; ctx.fillRect(x0, yy, wAll, TILE); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x0, yy, wAll, 3);
    if (r === 0) {
      // 1층: 유리 진열창 + 문 + 차양
      ctx.fillStyle = '#18222c'; ctx.fillRect(x0 + 6, yy + 12, wAll - 12, TILE - 12);
      for (let tx = b.x0; tx <= b.x1; tx++) { ctx.fillStyle = '#9aa0aa'; ctx.fillRect(tx * TILE, yy + 12, 3, TILE - 12); }
      for (const d of S.doors) if (d.ty === b.y1 && d.tx >= b.x0 && d.tx <= b.x1) { const dx = d.tx * TILE; ctx.fillStyle = d.locked ? '#3a4656' : '#05070a'; ctx.fillRect(dx + 6, yy + 14, 36, TILE - 14); ctx.fillStyle = '#c8ccd2'; ctx.fillRect(dx + 22, yy + 26, 4, 10); if (d.locked && d.keyLock) { ctx.fillStyle = keyCol(d.keyLock); ctx.fillRect(dx + 18, yy + 34, 12, 9); } }
      if ((hs + r) % 4 !== 0 && S.lightsOn) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,230,255,.10)'; ctx.fillRect(x0 + 6, yy + 12, wAll - 12, TILE - 12); ctx.globalCompositeOperation = 'source-over'; }
      for (let k = 0; k * 16 < wAll; k++) { ctx.fillStyle = k % 2 ? '#e8e4dc' : COLS[hs % COLS.length][0]; ctx.fillRect(x0 + k * 16, yy, 16, 12); }
    } else {
      if (b.glass) {  // 유리 외벽(커튼월): 칸마다 유리, 몇 칸은 사무실 불이 켜져 있다
        for (let tx = b.x0; tx <= b.x1; tx++) { const px = tx * TILE, hh = ((tx * 92821) ^ (r * 68917) ^ hs) >>> 0;
          const g2 = ctx.createLinearGradient(px, yy, px + TILE, yy + TILE); g2.addColorStop(0, '#1c3a52'); g2.addColorStop(1, '#0e1c2c'); ctx.fillStyle = g2; ctx.fillRect(px, yy + 2, TILE, TILE - 2);
          if (hh % 5 === 0 && S.lightsOn) { ctx.fillStyle = hh % 2 ? 'rgba(255,236,190,.55)' : 'rgba(210,235,255,.5)'; ctx.fillRect(px + 3, yy + 6, TILE - 6, TILE - 12); }
          ctx.fillStyle = 'rgba(160,210,240,.16)'; ctx.beginPath(); ctx.moveTo(px + 6, yy + TILE - 4); ctx.lineTo(px + 20, yy + 4); ctx.lineTo(px + 28, yy + 4); ctx.lineTo(px + 14, yy + TILE - 4); ctx.fill();
          ctx.fillStyle = '#8a929e'; ctx.fillRect(px, yy, TILE, 3); ctx.fillRect(px, yy, 2, TILE); }
      } else
      for (let tx = b.x0 + 1; tx < b.x1; tx++) { const px = tx * TILE; ctx.fillStyle = '#1e2a36'; ctx.fillRect(px, yy + 16, TILE, 26); ctx.fillStyle = 'rgba(160,200,230,.18)'; ctx.fillRect(px + 4, yy + 18, 10, 22); ctx.fillStyle = '#5d626c'; ctx.fillRect(px, yy + 16, 2, 26); }
    }
    const l = b.fl[Math.floor((b.x1 - b.x0) / 2)]; ctx.fillStyle = `rgba(4,8,22,${0.6 * (1 - clamp(l, 0, 1)) + 0.05 * r})`; ctx.fillRect(x0, yy, wAll, TILE);
  }
  drawShopSigns(b);
  const top = (b.y1 - b.fh + 1) * TILE;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x0, top, wAll, 6);
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, top, wAll - 2, b.fh * TILE);
}
// 상가 간판 (층마다 하나, 몇 개는 꺼져 있다) — 네온 빛은 drawNeonSigns 가 어둠 위에 더한다
function drawShopSigns(b) {
  const x0 = b.x0 * TILE, wAll = (b.x1 - b.x0 + 1) * TILE, hs = ((b.x0 * 73856093) ^ (b.y0 * 19349663)) >>> 0;
  b.signRects = []; const club = (b.floorsUse || []).includes('club');
  const COLS = [['#c8402e', '#fff4d8'], ['#2a5aa8', '#ffffff'], ['#f2c02a', '#2a2018'], ['#2a8a5a', '#ffffff'], ['#6a2a8a', '#ffe8ff'], ['#e86a2a', '#ffffff']];
  for (let r = b.fh - 1; r >= 0; r--) {
    const yy = (b.y1 - r) * TILE;
    // 간판
    const txt = (b.signs || [])[r]; if (!txt) continue;
    const c = COLS[(hs + r * 3) % COLS.length], on = ((hs >> (r + 2)) % 3) !== 0;
    const bw = Math.min(wAll - 24, Math.max(110, txt.length * 26 + 30)), bx = x0 + 12 + ((hs + r * 7) % Math.max(1, wAll - 24 - bw)), by = r === 0 ? yy - 22 : yy + 1;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(bx + 3, by + 3, bw, 20);
    ctx.fillStyle = c[0]; ctx.fillRect(bx, by, bw, 20); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(bx + 1, by + 1, bw - 2, 18);
    ctx.font = '700 15px Galmuri, "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = c[1]; ctx.fillText(txt, bx + bw / 2, by + 11); ctx.textBaseline = 'alphabetic'; b.signRects.push({ x: bx, y: by, w: bw, h: 20, c, txt, on: on || club, k: r });
    if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,200,.12)'; ctx.fillRect(bx, by, bw, 20); ctx.globalCompositeOperation = 'source-over'; }
    else { ctx.fillStyle = 'rgba(4,8,22,.45)'; ctx.fillRect(bx, by, bw, 20); }
  }
}
// 굴뚝: 지붕 위 벽돌 기둥. 불이 타면 연기가 오른다
function drawChimney(l) {
  const x = l.ux, y = l.uy, lit = lampOn(l.lamp);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - 13, y - 9, 30, 28);
  ctx.fillStyle = '#9a4a32'; ctx.fillRect(x - 16, y - 18, 30, 30);
  ctx.fillStyle = '#7a3624'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 16, y - 18 + i * 8, 30, 1.5);
  ctx.fillStyle = '#b8603f'; ctx.fillRect(x - 16, y - 18, 30, 4);
  ctx.fillStyle = '#120c0a'; ctx.fillRect(x - 9, y - 11, 16, 14);
  ctx.strokeStyle = '#2a1410'; ctx.lineWidth = 2; ctx.strokeRect(x - 16, y - 18, 30, 30);
  if (lit) { ctx.fillStyle = 'rgba(255,150,60,.55)'; ctx.fillRect(x - 7, y - 3, 12, 5); const t = S.t * 0.9; for (let i = 0; i < 4; i++) { const f = (t + i / 4) % 1; ctx.fillStyle = `rgba(200,200,205,${0.45 * (1 - f)})`; ctx.beginPath(); ctx.arc(x - 1 + Math.sin(f * 5 + i) * 6 + f * 10, y - 8 - f * 46, 5 + f * 9, 0, TAU); ctx.fill(); } }
}
// 환풍구 창살: 청록 테두리 + 가로 창살. 열려 있으면 검은 구멍
function drawGrate(v, alpha) {
  const x = v.x, y = v.y; ctx.globalAlpha = alpha;
  ctx.fillStyle = '#1a2a2e'; ctx.fillRect(x - 15, y - 15, 30, 30);
  if (v.open) { ctx.fillStyle = '#050708'; ctx.fillRect(x - 12, y - 12, 24, 24); ctx.strokeStyle = '#7fd6cc'; ctx.lineWidth = 2; ctx.strokeRect(x - 15, y - 15, 30, 30); ctx.fillStyle = '#5f8f8a'; ctx.fillRect(x + 15, y - 15, 6, 30); }
  else { ctx.fillStyle = '#6fa6a0'; for (let i = 0; i < 5; i++) ctx.fillRect(x - 12, y - 11 + i * 5, 24, 2.5); ctx.strokeStyle = '#7fd6cc'; ctx.lineWidth = 2; ctx.strokeRect(x - 15, y - 15, 30, 30); }
  ctx.globalAlpha = 1;
}
function stripeFor(col) {
  if (stripePat[col]) return stripePat[col];
  const c = document.createElement('canvas'); c.width = c.height = 12; const x = c.getContext('2d');
  x.strokeStyle = `rgba(${col},.55)`; x.lineWidth = 3; x.beginPath(); x.moveTo(-3, 15); x.lineTo(15, -3); x.moveTo(-3, 3); x.lineTo(3, -3); x.moveTo(9, 15); x.lineTo(15, 9); x.stroke();
  return (stripePat[col] = ctx.createPattern(c, 'repeat'));
}
// 순찰로: 바닥 점선 + 방향 화살표 + 멈추는 곳 / 고정 경비는 지키는 방향 표시
function drawRoutes(P) {
  const openB = (P.z === 0 && !P.jump) ? bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) : -1;
  const hiddenPt = p => { const b = bldAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)); return b >= 0 && b !== openB && !(S.peek && S.peek.b === b) && !tactical; };
  const vf = (!P.z && !P.wire && !P.jump) ? flOf(P) : 0;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.civ || flOf(g) !== vf) continue;
    const col = g.target ? '232,71,60' : '200,214,235';
    if (g.routeLine) {
      ctx.strokeStyle = `rgba(${col},${tactical ? 0.7 : 0.38})`; ctx.lineWidth = tactical ? 3 : 2.5; ctx.setLineDash([8, 7]);
      ctx.beginPath(); let pen = false;
      const pts = g.routeLine.concat([g.routeLine[0]]);
      for (const p of pts) { if (hiddenPt(p)) { pen = false; continue; } pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); pen = true; }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(${col},${tactical ? 0.85 : 0.5})`;
      for (let i = 0; i < pts.length - 1; i += 4) {
        const a = pts[i], b = pts[i + 1]; if (!b || hiddenPt(a)) continue;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.save(); ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      for (const p of g.routeLine) if (p.stop && !hiddenPt(p)) { ctx.strokeStyle = `rgba(${col},${tactical ? 0.7 : 0.35})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, TAU); ctx.stroke(); }
    } else if (g.post != null && !hiddenPt(g.route[0])) {
      const p = g.route[0];
      ctx.fillStyle = `rgba(${col},${tactical ? 0.35 : 0.14})`; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, 60, g.post - 0.5, g.post + 0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(${col},${tactical ? 0.7 : 0.35})`; ctx.lineWidth = 2; ctx.strokeRect(p.x - 9, p.y - 9, 18, 18);
    }
  }
}
// 창문: 하늘색 유리 + 흰 십자 창살
const winVert = w => (G[w.ty - 1] && G[w.ty - 1][w.tx] === '#') || (G[w.ty + 1] && G[w.ty + 1][w.tx] === '#');
// 창문 (평면도): 벽에 난 창틀 + 미닫이 유리 두 짝 + 창턱. 방 불이 켜져 있으면 유리가 따뜻하게 빛난다
function drawWindowOld(w, alpha) {
  const vert = winVert(w), ww = vert ? 18 : 40, hh = vert ? 40 : 18;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#e8eef2'; if (vert) ctx.fillRect(w.x - ww / 2 - 6, w.y - hh / 2 - 3, 3, hh + 6); else ctx.fillRect(w.x - ww / 2 - 3, w.y + hh / 2 + 3, ww + 6, 3);
  ctx.fillStyle = '#1d2733'; ctx.fillRect(w.x - ww / 2 - 3, w.y - hh / 2 - 3, ww + 6, hh + 6);
  ctx.fillStyle = '#8fc3e6'; ctx.fillRect(w.x - ww / 2, w.y - hh / 2, ww, hh);
  ctx.fillStyle = '#eef6fb'; ctx.fillRect(w.x - 1.5, w.y - hh / 2, 3, hh); ctx.fillRect(w.x - ww / 2, w.y - 1.5, ww, 3);
  ctx.globalAlpha = 1;
}
function drawWindow(w, alpha) {
  if (!CITY) return drawWindowOld(w, alpha);
  const vert = winVert(w), L = 42, T = 14;
  const lit = lightAt(w.x, w.y) > 0.45;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(w.x, w.y); if (vert) ctx.rotate(Math.PI / 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-L / 2 + 2, -T / 2 + 3, L, T);
  ctx.fillStyle = '#5d636d'; ctx.fillRect(-L / 2, -T / 2, L, T);                    // 창틀 (샤시)
  ctx.fillStyle = '#c3c8cf'; ctx.fillRect(-L / 2, -T / 2, L, 2); ctx.fillRect(-L / 2, T / 2 - 2, L, 2);
  const g = ctx.createLinearGradient(-L / 2, -T / 2, L / 2, T / 2);
  if (lit) { g.addColorStop(0, '#ffe2a8'); g.addColorStop(1, '#e0a85a'); } else { g.addColorStop(0, '#7fb6d6'); g.addColorStop(1, '#3d6680'); }
  ctx.fillStyle = g; ctx.fillRect(-L / 2 + 3, -T / 2 + 3, L / 2 - 2, T - 7); ctx.fillRect(1, -T / 2 + 4, L / 2 - 4, T - 7);  // 두 짝이 살짝 어긋난 미닫이
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
  ctx.moveTo(-L / 2 + 6, T / 2 - 5); ctx.lineTo(-L / 2 + 11, -T / 2 + 4); ctx.moveTo(6, T / 2 - 4); ctx.lineTo(11, -T / 2 + 5); ctx.stroke();
  ctx.fillStyle = '#8b919a'; ctx.fillRect(-1, -T / 2 + 2, 2, T - 4);
  ctx.fillStyle = '#d9d4c8'; ctx.fillRect(-L / 2 - 3, T / 2, L + 6, 3);              // 창턱
  ctx.restore(); ctx.globalAlpha = 1;
}
// 지붕이 덮인 건물의 옆·뒷벽 창문: 위에서는 벽 끝의 좁은 창틀과 바깥으로 새는 불빛만 보인다
function drawWindowEdge(w, b) {
  const vert = winVert(w); let ox = 0, oy = 0;
  if (vert) ox = w.tx <= b.x0 ? -1 : w.tx >= b.x1 ? 1 : 0; else oy = w.ty <= b.y0 ? -1 : 0;
  if (!ox && !oy) return;
  const lit = lightAt(w.x - ox * 30, w.y - oy * 30) > 0.45, ex = w.x + ox * (TILE / 2 - 3), ey = w.y + oy * (TILE / 2 - 3);
  if (lit) {  // 바닥에 떨어지는 창 불빛
    const gx = ex + ox * 26, gy = ey + oy * 26, gr = ctx.createRadialGradient(gx, gy, 2, gx, gy, 44);
    gr.addColorStop(0, 'rgba(255,206,130,.32)'); gr.addColorStop(1, 'rgba(255,206,130,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(gx, gy, vert ? 34 : 44, vert ? 44 : 30, 0, 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.translate(ex, ey); if (vert) ctx.rotate(Math.PI / 2);
  const near = !S.player.z && dist(S.player.x, S.player.y, ex, ey) < 150, pz = near ? 0.6 + 0.4 * Math.sin(S.t * 4) : 0;
  if (near) { ctx.strokeStyle = `rgba(143,195,230,${0.5 + 0.4 * pz})`; ctx.lineWidth = 3; ctx.strokeRect(-24, -8, 48, 15); }
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(-19, -1, 40, 7);
  ctx.fillStyle = near ? '#dfe6ee' : '#9aa0a8'; ctx.fillRect(-20, -4, 40, 7);
  ctx.fillStyle = lit ? '#ffd38a' : near ? '#8fc3e6' : '#33485a'; ctx.fillRect(-17, -2, 34, 3);
  ctx.fillStyle = '#6a7079'; ctx.fillRect(-1, -3, 2, 5);
  ctx.restore();
}
// 문: 갈색 문짝 (열림 = 한쪽으로 젖혀짐, 잠김 = 막힘 + 자물쇠)
function drawDoor(d, onRoof) {
  const x = d.x, y = d.y;
  ctx.save(); ctx.translate(x, y); if (!d.horiz) ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#3a2618'; ctx.fillRect(-24, -7, 5, 14); ctx.fillRect(19, -7, 5, 14);
  if (d.locked) {
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(-19, -6, 38, 12); ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 2; ctx.strokeRect(-19, -6, 38, 12);
    ctx.fillStyle = '#f2c46b'; ctx.fillRect(-4, -4, 8, 8); ctx.fillStyle = '#3a2618'; ctx.fillRect(-1, -1, 2, 3);
  } else if (onRoof) {
    // 지붕 위에서 보는 문: 벽에 뚫린 검은 출입구 + 열린 문짝 + 손잡이
    ctx.fillStyle = '#140d08'; ctx.fillRect(-19, -7, 38, 14);
    ctx.fillStyle = '#a8703f'; ctx.fillRect(-19, -7, 9, 14); ctx.fillStyle = '#f2c46b'; ctx.fillRect(-13, -1.5, 3, 3);
    ctx.strokeStyle = 'rgba(224,176,112,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-19, 7, 22, -Math.PI / 2, 0); ctx.stroke();
  } else {
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(-19, -6, 6, 34); ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 1.5; ctx.strokeRect(-19, -6, 6, 34);
  }
  ctx.restore();
}
// 배관: 회색 관(벽에 붙음) + 바닥 쪽 오르기 표시
function drawPipe(l) {
  const vert = l.bx === l.tx;
  const ox = (l.x - l.ux) / TILE, oy = (l.y - l.uy) / TILE;
  const cx = l.ux + ox * 20, cy = l.uy + oy * 20;
  ctx.strokeStyle = '#b8c0ca'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
  if (vert) { ctx.moveTo(cx, cy - 18 * oy); ctx.lineTo(cx, cy + 10 * oy); } else { ctx.moveTo(cx - 18 * ox, cy); ctx.lineTo(cx + 10 * ox, cy); }
  ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#6b737e'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill();
}
function drawPipeBase(l) {
  const a = Math.atan2(l.uy - l.y, l.ux - l.x);
  ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(a);
  ctx.strokeStyle = 'rgba(184,192,202,.75)'; ctx.lineWidth = 3;
  for (const k of [-6, 4]) { ctx.beginPath(); ctx.moveTo(k - 4, -7); ctx.lineTo(k + 3, 0); ctx.lineTo(k - 4, 7); ctx.stroke(); }
  ctx.restore();
}
// 상호작용 대상의 색: 문 갈색 · 창문 하늘색 · 배관 회색 · 사다리/계단 황토 · 굴뚝 주황 · 환풍구 청록 · 숨을 곳 초록 · 맨홀 파랑 · 비밀 통로 보라
const SCAN = { door: '#d39a5c', window: '#8fc3e6', pipe: '#c4ccd6', ladder: '#e0b070', chimney: '#f08a3c', vent: '#7fd6cc', hide: '#8fcf95', well: '#7fb0ff', secret: '#c9a0ff', lamp: '#f2c46b', fuse: '#f2c46b' };
function tag(x, y, text, col, alpha = 1, key) {
  const k = Math.max(1, 0.95 / SCALE);  // 화면이 축소돼 있어도 글자는 읽을 수 있는 크기로
  ctx.globalAlpha = alpha; ctx.font = `700 ${12 * k}px "IBM Plex Sans KR",sans-serif`; ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 12 * k, h = 18 * k;
  ctx.font = `800 ${11 * k}px "IBM Plex Mono",monospace`; const kcw = key ? Math.max(h, ctx.measureText(key).width + 9 * k) : 0, kw = key ? kcw + 2 * k : 0;
  ctx.font = `700 ${12 * k}px "IBM Plex Sans KR",sans-serif`;
  ctx.fillStyle = 'rgba(8,11,18,.86)'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = col; ctx.fillRect(x - w / 2, y - h / 2, 3 * k, h);
  ctx.fillStyle = '#efeadf'; ctx.fillText(text, x + k, y + 4.5 * k);
  if (key) {  // 누를 키를 작은 키캡으로
    const kx = x - w / 2 - kw; ctx.fillStyle = col; ctx.fillRect(kx, y - h / 2, kcw, h); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(kx, y + h / 2 - 3 * k, kcw, 3 * k);
    ctx.fillStyle = '#0b0d12'; ctx.font = `800 ${11 * k}px "IBM Plex Mono",monospace`; ctx.fillText(key, kx + kcw / 2, y + 4 * k);
  }
  ctx.globalAlpha = 1;
}
// 살피기(Tab / 살피기 버튼): 쓸 수 있는 물체를 모두 색 테두리와 이름으로 보여준다
// 지나갈 수 없는 경계: 걸을 수 있는 칸과 막힌 칸 사이에 선을 긋는다 (평소엔 내 주변만 옅게, 살피기 중엔 화면 전체 + 막힌 칸 빗금)
function drawBlockEdges(P, all) {
  const sol = P.z ? (tx, ty) => rLv(tx, ty) !== P.z : groundSolidP, ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE), R = 6;
  const hx = W / SCALE / 2 / TILE + 1, hy = H / SCALE / 2 / TILE + 1;
  const x0 = all ? Math.floor(cam.x / TILE - hx) : ptx - R, x1 = all ? Math.ceil(cam.x / TILE + hx) : ptx + R;
  const y0 = all ? Math.floor(cam.y / TILE - hy) : pty - R, y1 = all ? Math.ceil(cam.y / TILE + hy) : pty + R;
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let ty = Math.max(0, y0); ty <= Math.min(MH - 1, y1); ty++) for (let tx = Math.max(0, x0); tx <= Math.min(MW - 1, x1); tx++) {
    if (sol(tx, ty)) {
      if (all && !(P.z === 0 && roofAt(tx, ty) && bldAt(tx, ty) !== S.openB)) {  // 막힌 칸 빗금
        ctx.strokeStyle = 'rgba(255,96,72,.28)'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let k = -TILE; k < TILE; k += 12) { ctx.moveTo(tx * TILE + Math.max(0, k), ty * TILE + Math.max(0, -k)); ctx.lineTo(tx * TILE + Math.min(TILE, TILE + k), ty * TILE + Math.min(TILE, TILE - k)); }
        ctx.stroke(); ctx.lineWidth = 2;
      }
      continue;
    }
    const dd = Math.hypot(tx - ptx, ty - pty), a = all ? 0.7 : Math.max(0, 1 - dd / R) * 0.75; if (a < 0.03) continue;
    ctx.strokeStyle = `rgba(255,150,110,${a})`; ctx.beginPath();
    const X = tx * TILE, Y = ty * TILE;
    if (sol(tx, ty - 1)) { ctx.moveTo(X + 2, Y + 1); ctx.lineTo(X + TILE - 2, Y + 1); }
    if (sol(tx, ty + 1)) { ctx.moveTo(X + 2, Y + TILE - 1); ctx.lineTo(X + TILE - 2, Y + TILE - 1); }
    if (sol(tx - 1, ty)) { ctx.moveTo(X + 1, Y + 2); ctx.lineTo(X + 1, Y + TILE - 2); }
    if (sol(tx + 1, ty)) { ctx.moveTo(X + TILE - 1, Y + 2); ctx.lineTo(X + TILE - 1, Y + TILE - 2); }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
// 가까운 상호작용 지점을 작은 표식으로 늘 보여 준다 (숨을 곳 · 오르는 곳 · 창문 · 환풍구 · 잠긴 문)
function drawNearMarks(P, openB) {
  if (P.hide || P.vent || P.under || P.wire || P.trav || P.jump) return;
  const R = 300, fP = flOf(P), k = Math.max(1, 0.95 / SCALE), list = [];
  const hidden = (tx, ty) => { const b = bldAt(tx, ty); return !P.z && !fP && b >= 0 && b !== openB; };
  const add = (x, y, col, g, lab, tx, ty) => { const d = dist(P.x, P.y, x, y); if (d > R) return; if (tx != null && hidden(tx, ty)) return; list.push({ x, y, col, g, lab, d }); };
  if (!P.z) {
    for (const h of S.hides) if ((h.fl || 0) === fP && (h.z || 0) === (S.player.z || 0)) add(h.x, h.y, h.type === 'well' ? SCAN.well : SCAN.hide, h.type === 'well' ? '맨' : '숨', hideName(h), h.tx, h.ty);
    for (const l of S.ladders) {
      if (l.kind === 'chimney') continue;
      if ((l.bfl || 0) === fP && !(l.bz || 0)) add(l.x, l.y, SCAN.ladder, '↑', l.kind === 'pipe' ? (l.gas ? '가스관' : '배관') : l.kind === 'balc' ? '베란다' : '계단', l.kind === 'fstair' || l.kind === 'stair' ? l.bx : null, l.by);
      if (l.kind === 'fstair' && l.tfl === fP && fP) add(l.x, l.y + 10, SCAN.ladder, '↓', '계단');
    }
    if (!fP) { for (const o of S.poles) if (o.wires.length) add(o.x, o.y, SCAN.ladder, '↑', '전봇대');
      for (const w of S.windows) { const st = winSt(w); if (st !== 'bar') add(w.x, w.y, st === 'lock' ? '#9aa6b4' : SCAN.window, st === 'lock' ? '잠' : '창', st === 'lock' ? '잠긴 창문' : '창문'); } }
    else for (const w of S.fwindows) if (w.fl === fP && winUsable(w)) add(w.x, w.y, SCAN.window, '창', w.link ? '옆 건물로' : '창밖 전깃줄');
    for (const v of S.vents) if (!v.roof) add(v.x, v.y, SCAN.vent, '환', '환풍구', v.street ? null : v.tx, v.ty);
    for (const d of S.doors) if (d.keyLock && d.locked && (d.fl || 0) === fP) add(d.x, d.y, keyCol(d.keyLock), '잠', keyName(d.keyLock), d.tx, d.ty);
  } else {
    for (const l of S.ladders) if (l.tz === P.z) add(l.rx != null ? l.rx : l.ux, l.ry != null ? l.ry : l.uy, SCAN.ladder, '↓', l.kind === 'pipe' ? '내려가기' : '계단');
    for (const v of S.vents) if (v.roof) add(v.x, v.y, SCAN.vent, '환', '환기구');
    for (const w of S.wires) for (const n of [w.a, w.b]) if (n.roof && n.z === P.z) add(n.dx, n.dy, SCAN.ladder, '줄', '전깃줄');
  }
  for (const m of list) {
    const a = Math.max(0.35, 1 - m.d / R) * (0.85 + 0.15 * Math.sin(S.t * 3)), r = 9 * k, y = m.y - 22 * k;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(8,11,18,.85)'; ctx.beginPath(); ctx.arc(m.x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = m.col; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = m.col; ctx.font = `700 ${11 * k}px "IBM Plex Sans KR",sans-serif`; ctx.textAlign = 'center'; ctx.fillText(m.g, m.x, y + 4 * k);
    if (m.d < 130 && m.lab) { ctx.font = `600 ${10 * k}px "IBM Plex Sans KR",sans-serif`; const tw = ctx.measureText(m.lab).width + 8 * k; ctx.fillStyle = 'rgba(8,11,18,.8)'; ctx.fillRect(m.x + r + 2 * k, y - 7 * k, tw, 14 * k); ctx.fillStyle = m.col; ctx.textAlign = 'left'; ctx.fillText(m.lab, m.x + r + 6 * k, y + 4 * k); }
  }
  ctx.globalAlpha = 1;
}
function drawScan(openB) {
  const vx0 = cam.x - W / SCALE / 2 - 60, vx1 = cam.x + W / SCALE / 2 + 60, vy0 = cam.y - H / SCALE / 2 - 60, vy1 = cam.y + H / SCALE / 2 + 60;
  const on = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
  const pulse = 0.75 + 0.25 * Math.sin(S.t * 5);
  // 글자는 가까운 것부터, 겹치면 건너뛴다 (상자는 다 그린다). 닫힌 건물 안의 것은 흐리게, 글자 없이
  const labs = [], kS = Math.max(1, 0.95 / SCALE);
  const box = (x, y, col, text, sz = 40, a = 1) => { if (!on(x, y)) return; ctx.globalAlpha = a * pulse; ctx.strokeStyle = col; ctx.lineWidth = a < 1 ? 1.5 : 2.5; ctx.strokeRect(x - sz / 2, y - sz / 2, sz, sz); ctx.globalAlpha = 1;
    const d = dist(x, y, S.player.x, S.player.y); if (text && a >= 0.9 && (tactical || d < 340)) labs.push({ x, y: y - sz / 2 - 11 * kS, text, col, d }); };
  const inner = (tx, ty) => { const b = bldAt(tx, ty); return b >= 0 && b !== openB ? 0.55 : 1; };
  const seen = new Set(), fP = flOf(S.player);
  for (const d of S.doors) { const k = d.group.map(t => t.tx + ',' + t.ty).sort()[0]; if (seen.has(k)) continue; seen.add(k); if ((d.fl || 0) !== fP && !tactical) continue; const keyed = d.locked && d.keyLock; box(d.x, d.y, keyed ? keyCol(d.keyLock) : SCAN.door, keyed ? '잠긴 문(' + keyName(d.keyLock) + ')' : '문', 40, keyed ? 1 : inner(d.tx, d.ty)); }
  if (fP) for (const w of S.fwindows) { if (w.fl === fP && winUsable(w)) box(w.x, w.y, SCAN.window, S.wires.some(x => [x.a, x.b].some(n => n.win && n.fl === fP && n.tx === w.tx && n.ty === w.ty)) ? '창문(전깃줄)' : '창문'); }
  else for (const w of S.windows) { const st = winSt(w); box(w.x, w.y, st === 'bar' ? '#5a606a' : st === 'lock' ? '#9aa6b4' : SCAN.window, st === 'bar' ? '' : st === 'lock' ? '잠긴 창문' : '창문', st === 'bar' ? 30 : 40, st === 'bar' ? 0.5 : 1); }
  for (const l of S.ladders) {
    if ((l.kind === 'stair' || l.kind === 'fstair') && !S.player.z) { if ((l.bfl || 0) === fP) box(l.x, l.y, SCAN.ladder, l.kind === 'fstair' ? `계단 ↑${l.tfl + 1}층` : '계단 ↑옥상', 36); if (l.kind === 'fstair' && l.tfl === fP) tag(l.x, l.y + 30, `↓${l.bfl + 1}층`, SCAN.ladder); continue; }
    if (fP) continue;
    if (l.kind === 'pipe') { box(l.x, l.y, SCAN.pipe, '배관 ↑', 36, l.bz ? 0.8 : 1); }
    else if (l.kind === 'ladder') box(l.x, l.y, SCAN.ladder, '사다리 ↑', 36);
    else if (l.kind === 'stair') box(l.x, l.y, SCAN.ladder, '계단 ↑', 36, inner(l.bx, l.by));
    else if (l.kind === 'chimney') { const lit = lampOn(l.lamp); box(l.ux, l.uy, SCAN.chimney, lit ? '굴뚝(불 땜)' : '굴뚝', 40); }
  }
  for (const v of S.vents) box(v.x, v.y, SCAN.vent, v.roof ? '옥상 환기구' : v.street ? '거리 환기구' : '환풍구', 34, v.roof ? 1 : inner(v.tx, v.ty));
  for (const h of S.hides) { if ((h.fl || 0) !== flOf(S.player) || (h.z || 0) !== (S.player.z || 0)) continue; box(h.x, h.y, h.type === 'well' ? SCAN.well : SCAN.hide, hideName(h), 42, inner(h.tx, h.ty)); }
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (G[ty][tx] === 'S') box(tc(tx), tc(ty), SCAN.secret, '비밀 통로', 40);
  if (STAGE.fuse && S.lightsOn) box(tc(STAGE.fuse[0]), tc(STAGE.fuse[1]), SCAN.fuse, '퓨즈 상자', 40);
  if (!flOf(S.player)) for (const fb of S.bfuses || []) if (!fb.cut) box(fb.x, fb.y - 26, SCAN.fuse, '두꺼비집', 30);
  for (const c of S.cams || []) if (c.fl === flOf(S.player) && !c.broken) box(c.x, c.y, '#ff5a5a', 'CCTV', 28);
  for (const l of S.lamps) if (!l.hearth && !l.broken && on(l.x, l.y)) { ctx.strokeStyle = SCAN.lamp; ctx.lineWidth = 2; ctx.globalAlpha = 0.8 * pulse; ctx.beginPath(); ctx.arc(l.x, l.y, 13, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  for (const o of S.poles) if (o.wires.length) box(o.x, o.y, SCAN.ladder, '전봇대 ↑', 36);
  for (const w of S.wires) for (const n of [w.a, w.b]) if (n.roof) box(n.dx, n.dy, SCAN.ladder, '전깃줄', 26);
  for (const g of S.guards) if (g.lookout && g.state !== 'DEAD') labs.push({ x: g.x, y: g.y + 34, text: '감시병: 지붕을 본다', col: '#f2c46b', d: 0 });
  if (!S.player.z) for (const it of FURN) {  // 가구: 파랑 = 높은 가구(막힘·시선 가림), 노랑 점선 = 낮은 가구(막힘·웅크리면 엄폐)
    if ((it.fl || 0) !== fP || FURN_FLAT.has(it.t)) continue; const bi = bldAt(it.x, it.y); if (bi >= 0 && bi !== openB && !tactical) continue;
    const x = it.x * TILE, y = it.y * TILE, w = it.w * TILE, h = it.h * TILE; if (!on(x + w / 2, y + h / 2)) continue;
    if (FURN_TALL.has(it.t)) { ctx.fillStyle = 'rgba(110,150,220,.22)'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6); ctx.strokeStyle = 'rgba(140,180,240,.85)'; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 3, w - 6, h - 6); }
    else { ctx.strokeStyle = 'rgba(242,196,107,.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.strokeRect(x + 3, y + 3, w - 6, h - 6); ctx.setLineDash([]); }
  }
  labs.sort((a, b) => a.d - b.d); const placed = []; ctx.font = `700 ${12 * kS}px "IBM Plex Sans KR",sans-serif`;
  for (const L of labs) { const w = ctx.measureText(L.text).width + 14 * kS, h = 19 * kS, r = [L.x - w / 2, L.y - h / 2, L.x + w / 2, L.y + h / 2];
    if (placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) continue; placed.push(r); tag(L.x, L.y, L.text, L.col); if (placed.length >= 18) break; }
}
// 지금 누를 수 있는 행동을 대상 위에 글자로 띄운다
function drawActLabels(pa, P) {
  const key = '';
  let x = P.x, y = P.y - 44;
  const at = o => { x = o.x; y = o.y - 34; };
  let zKey = false;
  if (pa.k === 'none') { if (!pa.held) return; pa = pa.held; zKey = true; }
  if (pa.at) { x = pa.at.x; y = pa.at.y - 30; } else if (pa.d) at(pa.d); else if (pa.wv) at(pa.wv.w); else if (pa.v) at(pa.v); else if (pa.h) at(pa.h); else if (pa.g) at(pa.g); else if (pa.list) at(pa.list[0]);
  else if (pa.l && pa.k === 'up') { x = pa.l.x; y = pa.l.y - 34; } else if (pa.l && (pa.k === 'down' || pa.k === 'smother')) { x = pa.l.rx != null ? pa.l.rx : pa.l.ux; y = (pa.l.ry != null ? pa.l.ry : pa.l.uy) - 40; } else if (pa.l) at(pa.l);
  const col = pa.list || pa.g ? '#e8473c' : pa.k === 'window' ? SCAN.window : pa.k === 'door' || pa.k === 'keymsg' ? SCAN.door : pa.v ? SCAN.vent : pa.k === 'smother' || (pa.l && pa.l.kind === 'chimney') ? SCAN.chimney : pa.k === 'hide' || pa.k === 'drag' ? SCAN.hide : '#f2c46b';
  let lab = pa.label;
  if ((pa.k === 'up' && pa.l && pa.l.kind !== 'fstair') || pa.k === 'wireOn' || pa.k === 'down') {  // 오르내리는 동안 보일 자리: 지금 그곳을 보고 있는 경비
    const bx = pa.l ? pa.l.x : pa.at ? pa.at.x : P.x, by = pa.l ? pa.l.y : pa.at ? pa.at.y + 30 : P.y; let n = 0;
    for (const g of S.guards) { if (g.civ || g.state === 'DEAD' || g.state === 'CAPTIVE' || g.climb || flOf(g) || (g.z || 0)) continue;
      if (canSee(g, bx, by, Math.max(0.35, lightAt(bx, by)), false, false, 0) > 0) { n++; ctx.strokeStyle = 'rgba(232,90,70,.7)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, g.y - 20); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]); } }
    if (n) lab += ` — 보는 눈 ${n}`;
  }
  if (zKey) { tag(x, y, lab + ' (경비 근처 — Space는 암살)', '#c4ccd6', 1, isTouch ? null : 'Z'); return; }
  tag(x, y, key + lab, col, 1, isTouch ? null : 'Space');
  const sa = secondaryAction();
  if (['grab', 'steal', 'tunnel', 'fdown'].includes(sa.k) || sa.viaZ) tag(x, y + 21 * Math.max(1, 0.95 / SCALE), sa.label, '#c4ccd6', 1, isTouch ? null : 'Z');
}
const coveredG = (g, openB) => { const b = bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)); return b >= 0 && b !== openB; };

function drawUnderground() {
  const sc = SCALE * DPR, P = S.player;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#030406'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  worldTransform(ctx, sc); ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.14; ctx.drawImage(mapC, 0, 0); ctx.globalAlpha = 1;
  ctx.drawImage(ugC, 0, 0);
  // 맨홀 아래 빛줄기
  for (const h of S.hides) if (h.type === 'well' && ugAt(h.tx, h.ty)) {
    const gr = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 40); gr.addColorStop(0, 'rgba(200,215,230,.35)'); gr.addColorStop(1, 'rgba(200,215,230,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(h.x, h.y, 40, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,215,230,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, 14, 0, TAU); ctx.stroke();
  }
  // 위층 경비는 발소리처럼 희미한 점으로
  for (const g of S.guards) if (g.state !== 'DEAD' && g.state !== 'CAPTIVE' && dist(g.x, g.y, P.x, P.y) < 420) { ctx.fillStyle = 'rgba(232,120,100,.35)'; ctx.beginPath(); ctx.arc(g.x, g.y, 7, 0, TAU); ctx.fill(); }
  drawPlayer(P);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g2 = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 60 * sc, canvas.width / 2, canvas.height / 2, 300 * sc);
  const px = (P.x - cam.x) * sc + canvas.width / 2, py = (P.y - cam.y) * sc + canvas.height / 2;
  const lg = ctx.createRadialGradient(px, py, 50 * sc, px, py, 280 * sc); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.85)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (S.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${S.fade * 1.6})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  worldTransform(ctx, sc);
  const pa = primaryAction();
  if (pa.k === 'surface') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.strokeRect(pa.w.x - 24, pa.w.y - 24, 48, 48); }
}
// 어둠 한 겹: lamps 의 빛만 뚫린다. clip 이 있으면 그 사각형(월드 좌표) 안에만 덮는다
function darkPass(sc, lamps, clip) {
  const P = S.player;
  const ds = 0.5;
  const dw = Math.ceil(canvas.width * ds), dh = Math.ceil(canvas.height * ds);
  if (darkC.width !== dw || darkC.height !== dh) { darkC.width = dw; darkC.height = dh; }
  dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, dw, dh);
  dctx.fillStyle = tactical ? 'rgba(4,8,22,0.5)' : NEONY() ? 'rgba(16,6,40,0.86)' : 'rgba(4,8,22,0.84)'; dctx.fillRect(0, 0, dw, dh);
  dctx.setTransform(sc * ds, 0, 0, sc * ds, (W / 2 * DPR - cam.x * sc) * ds, (H / 2 * DPR - cam.y * sc) * ds);
  dctx.globalCompositeOperation = 'destination-out';
  const flick = 1 + Math.sin(S.t * 13) * 0.012 + Math.sin(S.t * 7.3) * 0.01;
  for (const l of lamps) {
    if (!lampOn(l)) continue;
    if (Math.abs(l.x - cam.x) > W / SCALE / 2 + l.r || Math.abs(l.y - cam.y) > H / SCALE / 2 + l.r) continue;
    dctx.save(); dctx.beginPath(); for (let i = 0; i < l.poly.length; i += 2) i ? dctx.lineTo(l.poly[i], l.poly[i + 1]) : dctx.moveTo(l.poly[i], l.poly[i + 1]); dctx.closePath(); dctx.clip();
    const gr = dctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * flick);
    gr.addColorStop(0, 'rgba(0,0,0,.8)'); gr.addColorStop(0.55, 'rgba(0,0,0,.66)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = gr; dctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); dctx.restore();
  }
  const pg = dctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 120);
  pg.addColorStop(0, 'rgba(0,0,0,.42)'); pg.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = pg; dctx.fillRect(P.x - 120, P.y - 120, 240, 240);
  if (clip) { ctx.save(); ctx.beginPath(); ctx.rect(clip[0], clip[1], clip[2], clip[3]); ctx.clip(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(darkC, 0, 0, canvas.width, canvas.height); ctx.imageSmoothingEnabled = false;
  worldTransform(ctx, sc);
  if (clip) ctx.restore();
}
function draw() {
  if (S.player.under && !tactical) { drawUnderground(); return; }
  const sc = SCALE * DPR;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  worldTransform(ctx, sc);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mapC, 0, 0);
  const P = S.player;
  setLayer(0);
  // 위층에 있으면 그 건물 자리에 그 층 평면을 덮어 그린다
  const VF = (!P.z && !P.wire && !P.jump && !P.vent && !P.under) ? flOf(P) : 0;
  const VB = VF ? bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) : -1;
  const inVB = o => VB >= 0 && bldAt(Math.floor(o.x / TILE), Math.floor(o.y / TILE)) === VB;
  const onGround = o => !flOf(o) && !(VF && inVB(o));
  const onFloor = o => !!VF && flOf(o) === VF && inVB(o);
  const gVis = o => onGround(o) || onFloor(o);
  for (const l of S.lures) {
    const f = l.landed ? 1 : l.t / 0.35, x = l.x0 + (l.x - l.x0) * f, y = l.y0 + (l.y - l.y0) * f - Math.sin(f * Math.PI) * 14;
    blit(ctx, 'it_coin', x - 10, y - 10, 20, 20);
    if (l.landed) { ctx.strokeStyle = `rgba(242,196,107,${0.4 + 0.3 * Math.sin(S.t * 6)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.stroke(); }
  }
  for (const w of S.windows) drawWindow(w, 1);
  for (const d of S.doors) drawDoor(d, false);
  for (const l of S.ladders) if (l.kind === 'pipe' && l.bz === 0) drawPipeBase(l);
  for (const v of S.vents) if (!v.roof) drawGrate(v, 0.85);
  for (const l of S.lamps) if (l.hearth && lampOn(l)) { const fl = 0.75 + 0.25 * Math.sin(S.t * 17 + l.x); ctx.fillStyle = `rgba(255,140,50,${0.85 * fl})`; ctx.beginPath(); ctx.moveTo(l.x - 9, l.y + 14); ctx.quadraticCurveTo(l.x - 6, l.y - 2 * fl, l.x, l.y - 8 * fl); ctx.quadraticCurveTo(l.x + 6, l.y - 2 * fl, l.x + 9, l.y + 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.beginPath(); ctx.arc(l.x, l.y + 9, 4 * fl, 0, TAU); ctx.fill(); }
  for (const b of S.hides) if (b.bodies && b.type !== 'well' && (b.fl || 0) === flOf(S.player)) { ctx.fillStyle = 'rgba(110,14,18,.9)'; for (let i = 0; i < b.bodies; i++) { ctx.beginPath(); ctx.arc(b.x - 6 + i * 12, b.y - 14, 3, 0, TAU); ctx.fill(); } }
  if (S.exitOpen) {
    const p = 0.5 + 0.5 * Math.sin(S.t * 4);
    ctx.strokeStyle = `rgba(242,196,107,${0.5 + p * 0.4})`; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.arc(S.exit.x, S.exit.y, S.exit.r - 8 + p * 6, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  if (STAGE.flee && S.fleeing) {
    const fx = tc(STAGE.flee[0]), fy = tc(STAGE.flee[1]);
    ctx.strokeStyle = 'rgba(232,71,60,.7)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(fx, fy, 40, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  if (showRoutes || tactical) drawRoutes(P);
  drawTrapsGround();
  for (const d of S.decals) { if (!onGround(d)) continue; ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.fillStyle = 'rgba(110,14,18,.82)'; ctx.beginPath(); ctx.ellipse(0, 0, d.r, d.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(d.r * 0.8, d.r * 0.4, d.r * 0.3, 0, TAU); ctx.fill(); ctx.restore(); }
  for (const it of S.items) if (!it.got && onGround(it)) drawScroll(it.x, it.y, S.t);
  for (const n of S.notes || []) if (onGround(n)) drawNote(n);
  drawLoud(0); drawCams(0);
  if (CITY && KIT_PROP.dumpster && kitOk(KIT_PROP.dumpster.img)) { const D = KIT_PROP.dumpster; for (const h of S.hides) if (h.type === 'box' && !(h.fl || 0)) ctx.drawImage(D.img, h.tx * TILE + D.ox, h.ty * TILE + D.oy); }
  if (!tactical && !P.z && !flOf(P) && !input.scan) drawBlockEdges(P, false);
  for (const n of S.noises) {
    const k = n.t / 0.7; ctx.strokeStyle = n.heard ? `rgba(240,80,60,${(1 - k) * 0.75})` : n.src === 'stone' || n.src === 'glass' ? `rgba(242,196,107,${(1 - k) * 0.6})` : `rgba(220,226,240,${(1 - k) * 0.38})`;
    ctx.lineWidth = n.heard ? 3 : 2; ctx.beginPath(); ctx.arc(n.x, n.y, Math.max(1, n.r * (0.25 + 0.75 * k)), 0, TAU); ctx.stroke();
  }
  for (const c of S.corpses) {
    if (c.stashed || !onGround(c)) continue;
    if (c.dog) drawDog(c.x, c.y, c.a, false, c.hidden ? 0.5 : 0.9, true);
    else { if (c.carried && pairCarry(S.player)) continue; const lift = c.fly ? Math.sin(Math.min(1, c.fly.t / c.fly.dur) * Math.PI) * 40 : c.td != null && S.t - c.td < 0.22 ? (1 - (S.t - c.td) / 0.22) * 30 : 0; ctx.globalAlpha = c.hidden ? 0.5 : 1; drawBody(c, lift); ctx.globalAlpha = 1; }
    if (c.ko && !c.carried) drawEmote('zz', c.x + 16, c.y - 6);
    if (c.discovered && !c.carried) { ctx.fillStyle = 'rgba(194,54,43,.9)'; ctx.font = '700 13px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('발견됨', c.x, c.y - 24); }
  }
  for (const g of S.guards) {
    if (g.state === 'DEAD' || !onGround(g) || g.z || g.climb) continue;
    drawGuard(g);
    if (g.atkT > 0) { const k = 1 - g.atkT / (g.dog ? 0.35 : 0.55); ctx.strokeStyle = `rgba(232,71,60,${0.4 + 0.5 * k})`; ctx.lineWidth = 3 + 3 * k; ctx.beginPath(); ctx.arc(g.x, g.y, 30 + 16 * k, g.a - 0.8, g.a + 0.8); ctx.stroke(); }
    if (g.hasKey && dist(g.x, g.y, P.x, P.y) < 320) drawKeyIcon(g.hasKey, g.x + 18, g.y - 30, false);
    if (CITY && g.radio && dist(g.x, g.y, P.x, P.y) < 460) drawRadio(g.x - 19, g.y - 34);
    if (P.disguise && !P.disguiseBlown && (g.elite || g.target) && dist(g.x, g.y, P.x, P.y) < 380) {  // 변장: 이 사람은 얼굴을 안다 (원 안에서 보이면 들킨다)
      ctx.strokeStyle = 'rgba(232,90,70,.4)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(g.x, g.y, 220, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      tag(g.x, g.y + 34, '얼굴을 안다', '#e85a46', 0.9);
    }
    if (g.lookout && !g.icon) { ctx.strokeStyle = '#f2c46b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(g.x - 7, g.y - 36); ctx.lineTo(g.x, g.y - 43); ctx.lineTo(g.x + 7, g.y - 36); ctx.moveTo(g.x - 7, g.y - 42); ctx.lineTo(g.x, g.y - 49); ctx.lineTo(g.x + 7, g.y - 42); ctx.stroke(); }
    if (g.elite) { ctx.fillStyle = '#e8473c'; ctx.beginPath(); ctx.moveTo(g.x, g.y - 34); ctx.lineTo(g.x - 6, g.y - 43); ctx.lineTo(g.x + 6, g.y - 43); ctx.closePath(); ctx.fill(); }
    if (g.state === 'CAPTIVE') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 20, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - g.captT / 9)); ctx.stroke(); }
    if (g.target) { ctx.strokeStyle = 'rgba(194,54,43,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.x, g.y, 24, 0, TAU); ctx.stroke(); }
  }
  drawGhosts();
  if (P.hide) { ctx.strokeStyle = 'rgba(127,174,134,.9)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(P.hide.x - 22, P.hide.y - 22, 44, 44); ctx.setLineDash([]); }
  // (땅 위 주인공은 어둠·덤불 위에 그린다 — 아래쪽 참고)
  const vx0 = Math.max(0, Math.floor((cam.x - W / SCALE / 2) / TILE) - 2), vx1 = Math.min(MW - 1, Math.ceil((cam.x + W / SCALE / 2) / TILE) + 2);
  const vy0 = Math.max(0, Math.floor((cam.y - H / SCALE / 2) / TILE) - 2), vy1 = Math.min(MH - 1, Math.ceil((cam.y + H / SCALE / 2) / TILE) + 4);
  const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
  for (let ty = vy0; ty <= vy1; ty++) for (let tx = vx0; tx <= vx1; tx++) {
    const ch = G[ty][tx];
    if (ch === 'B') { const near = Math.abs(tx - ptx) <= 1 && Math.abs(ty - pty) <= 1 && P.hidden; if (CITY && kitOk(kitBush)) { ctx.globalAlpha = near ? 0.5 : 0.96; ctx.drawImage(kitBush, tx * TILE - TILE / 2, (ty - 0.9) * TILE); ctx.globalAlpha = 1; continue; } const v = (tx * 7 + ty * 3) % 3; ctx.globalAlpha = near ? 0.5 : 0.96; blit(ctx, 'bush' + v, tx * TILE - 6, ty * TILE - 10, 60, 60); ctx.globalAlpha = 1; }
    if (ch === 'T') {
      if (CITY && kitT.length) {  // 키트 나무: 숲은 침엽수가 많고, 시내는 활엽수
        const hh = ((tx * 92821) ^ (ty * 68917)) >>> 0, pine = hh % 4 === 0;
        const im = kitT[pine ? 2 : hh % 3 === 0 ? 3 : 0];
        if (kitOk(im)) { ctx.drawImage(im, tx * TILE - TILE, (ty + 0.5 - 3.6) * TILE); continue; }
      }
      const v = (tx * 5 + ty * 3) % 3; blit(ctx, v === 0 ? 'treeR' : v === 1 ? 'pine' : 'treeP', tx * TILE - 24, ty * TILE - 52, 96, 96); }
  }
  for (const f of S.fx) {
    if (f.k === 'slash') { const fr = Math.min(3, Math.floor(f.t / 0.06)); blit(ctx, 'fx_slash', f.x - 48, f.y - 48, 96, 96, fr * 32, 0, 32, 32); }
    if (f.k === 'smoke') { const fr = Math.min(5, Math.floor(f.t / 0.07)); blit(ctx, 'fx_smoke', f.x - 36, f.y - 44, 72, 72, fr * 32, 0, 32, 32); }
  }
  if (S.keyDrop && (S.keyDrop.fl || 0) === flOf(S.player)) drawKeyIcon(S.keyDrop.key, S.keyDrop.x, S.keyDrop.y, true);
  for (const it of S.keyItems || []) if (!it.got && it.fl === flOf(S.player)) drawKeyIcon(it.key, it.x, it.y, true);
  for (const s of S.stones) {
    const k = Math.min(1, s.t / s.dur); const x = s.x0 + (s.x1 - s.x0) * k, y = s.y0 + (s.y1 - s.y0) * k - Math.sin(k * Math.PI) * 30;
    ctx.fillStyle = '#c9ccd3'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
  }
  for (const k of S.kunais) {
    const f = Math.min(1, k.t / k.dur); const x = k.x0 + (k.tgt.x - k.x0) * f, y = k.y0 + (k.tgt.y - k.y0) * f;
    const a = Math.atan2(k.tgt.y - k.y0, k.tgt.x - k.x0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#d7dbe2'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -3); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(-10, -1.5, 6, 3); ctx.restore();
  }

  // 어둠
  darkPass(sc, S.lamps.filter(l => !flOf(l)), null);
  worldTransform(ctx, sc);
  ctx.globalCompositeOperation = 'lighter';
  for (const l of S.lamps) {
    if (!lampOn(l) || flOf(l)) continue;
    const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.7);
    const nn = NEONY() || !!l.col, lc = l.col || (NEONY() ? (Math.round(l.x + l.y) % 2 ? '255,60,170' : '60,236,255') : '255,186,105');
    gr.addColorStop(0, `rgba(${lc},${nn ? 0.14 : 0.07})`); gr.addColorStop(1, `rgba(${lc},0)`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = nn ? `rgba(${lc},.95)` : 'rgba(255,214,150,.9)'; ctx.beginPath(); ctx.arc(l.x, l.y, nn ? 4.5 : 3.5, 0, TAU); ctx.fill();
  }
  // 손전등 빛줄기
  for (const g of S.guards) { if (!g.torch || g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) !== flOf(S.player) || !gVis(g)) continue;
    setLayer(flOf(g)); ctx.beginPath(); ctx.moveTo(g.x, g.y); for (let i = 0; i <= 12; i++) { const a = g.a - 0.32 + 0.64 * i / 12, d = castRay(g.x, g.y, a, TORCH_R); ctx.lineTo(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d); } ctx.closePath(); setLayer(flOf(S.player));
    const gr = ctx.createRadialGradient(g.x, g.y, 6, g.x, g.y, TORCH_R); gr.addColorStop(0, 'rgba(255,244,200,.32)'); gr.addColorStop(1, 'rgba(255,244,200,0)'); ctx.fillStyle = gr; ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  if (NEONY() && CITY) drawNeonSigns();
  drawSpeech();
  ctx.globalCompositeOperation = 'source-over';
  // 깨진 조명 표시
  for (const l of S.lamps) if (l.off && !l.broken) { ctx.strokeStyle = 'rgba(232,227,214,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(l.x, l.y, 6, 0, TAU); ctx.stroke(); }
  for (const l of S.lamps) if (l.broken) { ctx.strokeStyle = 'rgba(232,227,214,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(l.x - 5, l.y - 5); ctx.lineTo(l.x + 5, l.y + 5); ctx.moveTo(l.x + 5, l.y - 5); ctx.lineTo(l.x - 5, l.y + 5); ctx.stroke(); }

  // 내 모습은 어둠과 덤불 위에 그려 언제나 확인할 수 있게 (숨은 상태면 반투명 + 외곽선)
  if (VF && VB >= 0 && GF[VF]) {
    const b = BLD[VB], bx = b.x0 * TILE, by = b.y0 * TILE, bw = (b.x1 - b.x0 + 1) * TILE, bh = (b.y1 - b.y0 + 1) * TILE;
    setLayer(VF);
    // 높이감: 바깥(땅)은 층이 높을수록 더 어둡게 가라앉고, 건물 그림자는 길어진다
    ctx.fillStyle = `rgba(4,6,12,${Math.min(0.62, 0.3 + VF * 0.1)})`; ctx.beginPath(); ctx.rect(cam.x - 6000, cam.y - 6000, 12000, 12000); ctx.rect(bx, by, bw, bh); ctx.fill('evenodd');
    const shd = 8 + VF * 7; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(bx + shd, by + shd, bw, bh);
    ctx.drawImage(floorCanvas(VB, VF), bx, by);
    { const tint = ['', '255,196,130', '140,196,255', '160,230,170', '226,170,255', '255,150,150'][VF] || '200,200,200'; ctx.fillStyle = `rgba(${tint},.09)`; ctx.fillRect(bx, by, bw, bh); }
    for (const w of S.fwindows) if (w.fl === VF && bldAt(w.tx, w.ty) === VB) drawWindow(w, 1);
    for (const d of S.decals) if (onFloor(d)) { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.fillStyle = 'rgba(110,14,18,.82)'; ctx.beginPath(); ctx.ellipse(0, 0, d.r, d.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    for (const it of S.items) if (!it.got && onFloor(it)) drawScroll(it.x, it.y, S.t);
    for (const n of S.notes || []) if (onFloor(n)) drawNote(n);
    for (const c of S.corpses) if (!c.stashed && onFloor(c)) { ctx.globalAlpha = c.hidden ? 0.5 : 1; drawBody(c); ctx.globalAlpha = 1; }
    drawLoud(VF); drawCams(VF);
    if (!tactical && flOf(P) === VF) drawBlockEdges(P, input.scan);
    for (const g of S.guards) if (g.state !== 'DEAD' && onFloor(g) && !g.climb) drawGuard(g);
    darkPass(sc, S.lamps.filter(l => flOf(l) === VF), [bx, by, bw, bh]);
    ctx.globalCompositeOperation = 'lighter';
    for (const l of S.lamps) if (flOf(l) === VF && lampOn(l)) { const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.7), lc = l.col || '255,186,105'; gr.addColorStop(0, `rgba(${lc},${l.col ? 0.2 : 0.08})`); gr.addColorStop(1, `rgba(${lc},0)`); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.7, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    drawSpeech();
    ctx.strokeStyle = 'rgba(242,196,107,.55)'; ctx.lineWidth = 3; ctx.strokeRect(bx + 1.5, by + 1.5, bw - 3, bh - 3);
    { const lab = `${VF + 1}층` + (BLD[VB].plate ? ' · ' + BLD[VB].plate : ''); ctx.font = '700 17px Galmuri, "IBM Plex Sans KR", sans-serif'; const tw = ctx.measureText(lab).width; ctx.fillStyle = 'rgba(7,10,18,.85)'; ctx.fillRect(bx, by - 30, tw + 18, 26); ctx.fillStyle = '#f2c46b'; ctx.fillRect(bx, by - 30, 4, 26); ctx.textAlign = 'left'; ctx.fillText(lab, bx + 10, by - 11); }
    setLayer(0);
  }
  const travUp = !!(P.trav && P.trav.phases.some(ph => ph.pose !== 'walk'));
  if (!P.hide && !P.z && !P.jump && !P.vent && !P.trav && !P.under && running && !tactical) drawStepRing(P);
  if (!P.hide && !P.z && !P.jump && !P.vent && !travUp) drawPlayer(P);
  // 키트 나무·덤불: 주인공이 그 뒤(위쪽)에 있으면 잎을 반투명하게 한 번 더 덮어 '뒤에 숨은' 모습으로
  if (CITY && !P.z && !P.jump && !P.vent && !P.hide && !flOf(P)) {
    const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
    for (let ty = pty; ty <= pty + 3; ty++) for (let tx = ptx - 1; tx <= ptx + 1; tx++) {
      const ch = G[ty] && G[ty][tx];
      if (ch === 'T' && ty > pty && kitT.length) { const hh = ((tx * 92821) ^ (ty * 68917)) >>> 0, pine = hh % 4 === 0, im = kitT[pine ? 2 : hh % 3 === 0 ? 3 : 0]; if (kitOk(im)) { ctx.globalAlpha = 0.55; ctx.drawImage(im, tx * TILE - TILE, (ty + 0.5 - 3.6) * TILE); ctx.globalAlpha = 1; } }
      if (ch === 'B' && P.hidden && tx === ptx && ty === pty && kitOk(kitBush)) { ctx.globalAlpha = 0.6; ctx.drawImage(kitBush, tx * TILE - TILE / 2, (ty - 0.9) * TILE); ctx.globalAlpha = 1; }
    }
  }
  let openB = (P.z === 0 && !P.jump && !travUp) ? bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) : -1;  // 환풍구 안이면 그 건물 안이 보인다
  if (openB < 0 && S.peek && !travUp) openB = S.peek.b; S.openB = openB;
  // 경비 시야·표시 (옥상 위 경비는 지붕을 그린 뒤에 따로)
  const guardOverlay = g => {
    const fov = guardFov(g), rg = guardRanges(g);
    if (g.civ && g.state === 'SLEEP') { if (g.icon) drawEmote(g.icon, g.x, g.y - 30); return; }
    if (g.state === 'TERROR') { ctx.strokeStyle = `rgba(190,120,255,${0.5 + 0.4 * Math.sin(S.t * 14)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 22, 0, TAU); ctx.stroke(); if (g.icon) drawEmote(g.icon, g.x, g.y - 30); return; }
    const col = g.civ ? (g.state === 'PANIC' ? '232,90,80' : '196,236,190') : g.state === 'ALERT' || g.state === 'FLEE' ? (NEO ? '255,46,136' : '230,70,60') : (g.state === 'NOTICE' || g.state === 'SUSPICIOUS' || g.state === 'SEARCH' || g.state === 'BODY' || g.state === 'CHECK') ? (NEO ? '255,220,60' : '242,196,107') : (NEO ? '70,236,255' : '170,200,235');
    const N = 34, pts = [];
    setLayer(flOf(g)); for (let i = 0; i <= N; i++) { const a = g.a - fov + (2 * fov) * i / N; pts.push(a, castRay(g.x, g.y, a, rg.lit, g.z || 0)); } setLayer(0);
    // 바깥(빛 속에서만 보임) · 줄무늬(웅크리면 안전) · 안쪽(항상 보임)
    const conePath = rmax => { ctx.beginPath(); ctx.moveTo(g.x, g.y); for (let i = 0; i < pts.length; i += 2) { const d = Math.min(pts[i + 1], rmax); ctx.lineTo(g.x + Math.cos(pts[i]) * d, g.y + Math.sin(pts[i]) * d); } ctx.closePath(); };
    if (g.civ && !g.wary && g.state !== 'PANIC') {  // 경계하지 않는 주민: 시선만 옅게
      ctx.fillStyle = 'rgba(196,236,190,.035)'; conePath(Math.min(rg.lit, 120)); ctx.fill();
      if (g.bubble && !g.icon) drawEmote(g.bubble, g.x, g.y - 30); if (g.icon) drawEmote(g.icon, g.x, g.y - 30); return;
    }
    ctx.fillStyle = `rgba(${col},.07)`; conePath(rg.lit); ctx.fill();
    if (g.state !== 'ALERT') { ctx.save(); conePath(rg.lit); ctx.clip(); ctx.globalAlpha = 0.5; ctx.fillStyle = stripeFor(col); ctx.beginPath(); ctx.arc(g.x, g.y, rg.lit, 0, TAU); ctx.arc(g.x, g.y, rg.lit * 0.55, 0, TAU, true); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = `rgba(${col},.2)`; conePath(g.state === 'ALERT' ? rg.dark : Math.min(rg.dark, rg.lit * 0.55)); ctx.fill();
    ctx.fillStyle = `rgba(${col},.1)`; conePath(rg.lit * 0.55); ctx.fill();
    ctx.strokeStyle = `rgba(${col},.45)`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(g.x, g.y, rg.dark, g.a - fov, g.a + fov); ctx.stroke(); ctx.setLineDash([]);
    if (g.bubble && !g.icon) drawEmote(g.bubble, g.x, g.y - 30);
    if (g.act === 'smoke') { const t = S.t * 1.5 + g.id; for (let i = 0; i < 3; i++) { const f = (t + i / 3) % 1; ctx.fillStyle = `rgba(210,215,222,${0.35 * (1 - f)})`; ctx.beginPath(); ctx.arc(g.x + Math.cos(g.a) * 14 + f * 8, g.y + Math.sin(g.a) * 14 - f * 16, 3 + f * 5, 0, TAU); ctx.fill(); } }
    // 왜 의심하는지: 들은 곳(귀) / 본 곳(눈) 으로 점선과 표시
    if (g.poi && !g.civ && ['NOTICE', 'SUSPICIOUS', 'SEARCH'].includes(g.state) && !g.reached) {
      ctx.strokeStyle = g.why === 'saw' ? 'rgba(255,120,90,.7)' : 'rgba(242,196,107,.7)'; ctx.setLineDash([3, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.poi.x, g.poi.y); ctx.stroke(); ctx.setLineDash([]);
      const lab = g.why === 'saw' ? '봤다' : '들었다'; ctx.font = '700 11px Galmuri, "IBM Plex Sans KR", sans-serif'; const tw = ctx.measureText(lab).width + 10;
      ctx.fillStyle = 'rgba(7,10,18,.85)'; ctx.fillRect(g.poi.x - tw / 2, g.poi.y - 9, tw, 18); ctx.fillStyle = g.why === 'saw' ? '#ff8a6a' : '#f2c46b'; ctx.textAlign = 'center'; ctx.fillText(lab, g.poi.x, g.poi.y + 4);
    }
    if (g.state === 'CHECK' && g.checks[0]) { const c = g.checks[0]; ctx.strokeStyle = 'rgba(242,196,107,.6)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]); }
    const mk = !g.civ && !g.dog && (g.state === 'ALERT' || g.meter > 0.02 || g.icon === '?' || g.icon === '!');
    if (mk) drawAwareMark(g); else if (g.icon) drawEmote(g.icon, g.x, g.y - 30);
    if (mk && g.icon && g.icon !== '?' && g.icon !== '!') drawEmote(g.icon, g.x + 26, g.y - 30);
  };
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.z || g.climb || !gVis(g) || (!tactical && coveredG(g, openB))) continue;
    guardOverlay(g);
  }
  if (!tactical) {
    drawRoofs(openB); drawPlanks();
    if (CITY) drawHeardSteps(P, openB, gVis);
    const front = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return BLD.some((b, i) => b.facade && i !== openB && ty === b.y1 + 1 && tx >= b.x0 - 1 && tx <= b.x1 + 1); };
    for (const g of S.guards) if (g.state !== 'DEAD' && !flOf(g) && !g.z && !g.climb && !coveredG(g, openB) && front(g.x, g.y)) drawGuard(g);
    // 옥상 위·벽을 타는 경비
    for (const g of S.guards) if (g.state !== 'DEAD' && (g.z || g.climb) && (!flOf(g) || (g.climb && !(g.climb.to.fl && g.climb.from.fl)))) { drawGuard(g); if (!g.climb && g.state !== 'CAPTIVE') guardOverlay(g); else if (g.icon) drawEmote(g.icon, g.x, g.y - 30); }
    if (CITY) drawWindowSight(P, openB);
    if (input.scan && CITY) drawPlansFaint(P, openB);
    if (!P.z && !P.jump && !P.hide && !P.vent && !travUp && front(P.x, P.y)) drawPlayer(P);
  }
  if (S.poles.length) {
    const vx = W / SCALE / 2 + 80, vy = H / SCALE / 2 + 120;
    for (const o of S.poles) if (Math.abs(o.x - cam.x) < vx && Math.abs(o.y - cam.y) < vy) drawPole(o);
    drawWires();
  }
  if (P.z && !P.wire && !P.jump && !P.trav && !tactical && !input.scan) drawBlockEdges(P, false);
  if ((P.z || P.jump || P.wire || travUp) && !P.hide) drawPlayer(P);
  if (P.vent && !tactical) {
    // 환풍구 층: 아래(방)는 어둡게 비치고, 덕트와 창살만 또렷하게
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(3,6,10,.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
    ctx.globalAlpha = 0.92; ctx.drawImage(ventC, 0, 0); ctx.globalAlpha = 1;
    for (const v of S.vents) { ctx.strokeStyle = v.roof ? 'rgba(242,196,107,.8)' : 'rgba(127,214,204,.9)'; ctx.lineWidth = 2; ctx.strokeRect(v.x - 13, v.y - 13, 26, 26); ctx.fillStyle = v.roof ? 'rgba(242,196,107,.25)' : 'rgba(127,214,204,.18)'; ctx.fillRect(v.x - 13, v.y - 13, 26, 26); }
    drawPlayer(P);
  }
  setLayer(flOf(P));
  if (S.entrySel) STAGE.entries.forEach((e, i) => { const p = entryPos(e), pulse = 0.6 + 0.4 * Math.sin(S.t * 5 + i); ctx.strokeStyle = `rgba(242,196,107,${pulse})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(242,196,107,.95)'; ctx.font = '700 30px Galmuri, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), p.x, p.y + 10); tag(p.x, p.y - 52, e.name, '#f2c46b'); });
  // 맨홀 속에 숨어 있거나 살피기 중이면 지하 수로·덕트 길을 비춰 보여 준다
  { const P = S.player, inWell = P.hide && P.hide.type === 'well';
    if (running && !P.under && !P.vent && (input.scan || tactical || inWell)) {
      const k = inWell ? 0.5 : 0.36; ctx.globalAlpha = k * (0.8 + 0.2 * Math.sin(S.t * 3)); if (ugC) ctx.drawImage(ugC, 0, 0);
      if (!inWell && ventC) { ctx.globalAlpha = 0.42; ctx.drawImage(ventC, 0, 0); } ctx.globalAlpha = 1;
      if (inWell) for (const h of S.hides) if (h.type === 'well' && h !== P.hide && ugAt(h.tx, h.ty)) { ctx.strokeStyle = 'rgba(150,200,255,.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(h.x, h.y, 22, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    } }
  if (input.scan && running && !tactical && !flOf(P)) drawBlockEdges(P, true);
  if ((input.scan || tactical) && running) drawScan(openB);
  else if (running && !tactical) { drawNearMarks(P, openB); drawNearFurn(P, openB); }
  if (running && !tactical) { drawAwareness(S.player); drawRadioCall(); drawPickProgress(S.player); if (CITY && !flOf(P)) for (const w of S.windows) if (w.st === 'bar' && dist(P.x, P.y, w.x, w.y) < 700 && (onFacadeW(w) || w.b === openB)) drawWinBars(w); }
  if (running && CITY) { drawOpps(P); if (!tactical) drawCorpseRisk(); }
  if (running && !tactical && STAGE.steps && (S.tutI || 0) < STAGE.steps.length) {  // 연습: 지금 단계의 대상 위에 화살표
    const tg = STAGE.steps[S.tutI][2] && STAGE.steps[S.tutI][2](S); if (tg && tg.x != null) { const k = Math.max(1, 0.95 / SCALE), b = Math.sin(S.t * 5) * 5 * k, y = tg.y - 52 * k + b;
      ctx.fillStyle = '#f2c46b'; ctx.strokeStyle = 'rgba(7,10,18,.9)'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(tg.x - 10 * k, y - 12 * k); ctx.lineTo(tg.x + 10 * k, y - 12 * k); ctx.lineTo(tg.x, y); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.font = `700 ${Math.round(11 * k)}px "IBM Plex Sans KR",sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(7,10,18,.85)'; ctx.fillRect(tg.x - 16 * k, y - 30 * k, 32 * k, 15 * k); ctx.fillStyle = '#f2c46b'; ctx.fillText('여기', tg.x, y - 19 * k); ctx.textAlign = 'left'; } }
  if (running && !tactical) drawOffscreen();
  // 행동 표시
  if (running && !S.over && !S.entrySel) {
    const pa = primaryAction();
    const ring = (g, col) => { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 25 + Math.sin(S.t * 10) * 2, 0, TAU); ctx.stroke(); };
    if (pa.list) pa.list.forEach(g => ring(g, '#e8473c'));
    if (pa.k === 'drop' || pa.k === 'ambush' || pa.k === 'ventKill') ring(pa.g, '#e8473c');
    if (pa.k === 'ventIn' || pa.k === 'ventOut') { ctx.strokeStyle = 'rgba(127,214,204,.95)'; ctx.lineWidth = 2.5; ctx.strokeRect(pa.v.x - 20, pa.v.y - 20, 40, 40); }
    if (pa.k === 'smother') { ctx.strokeStyle = 'rgba(240,138,60,.95)'; ctx.lineWidth = 2.5; ctx.strokeRect(pa.l.ux - 22, pa.l.uy - 24, 40, 40); }
    if (pa.k === 'lamp') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pa.l.x, pa.l.y, 16, 0, TAU); ctx.stroke(); }
    if (pa.k === 'door') { ctx.strokeStyle = 'rgba(232,227,214,.85)'; ctx.lineWidth = 2; ctx.strokeRect(pa.d.x - 24, pa.d.y - 24, 48, 48); }
    if (pa.k === 'drag' && pa.h) { ctx.strokeStyle = 'rgba(127,174,134,.9)'; ctx.lineWidth = 2; ctx.strokeRect(pa.h.x - 24, pa.h.y - 24, 48, 48); }
    if (pa.k === 'window') { ctx.strokeStyle = 'rgba(140,190,225,.95)'; ctx.lineWidth = 2; ctx.strokeRect(pa.wv.w.x - 24, pa.wv.w.y - 24, 48, 48); }
    if (pa.k === 'hide') { ctx.strokeStyle = 'rgba(127,174,134,.9)'; ctx.lineWidth = 2; ctx.strokeRect(pa.h.x - 25, pa.h.y - 25, 50, 50); }
    if (pa.k === 'up' || pa.k === 'down') { const l = pa.l; const x = pa.k === 'up' ? l.x : (l.rx != null ? l.rx : l.ux), y = pa.k === 'up' ? l.y : (l.ry != null ? l.ry : l.uy); ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.strokeRect(x - 24, y - 24, 48, 48); }
    if (pa.k === 'leap') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.quadraticCurveTo((P.x + tc(pa.j.tx)) / 2, (P.y + tc(pa.j.ty)) / 2 - 40, tc(pa.j.tx), tc(pa.j.ty)); ctx.stroke(); ctx.setLineDash([]); ctx.strokeRect(pa.j.tx * TILE + 6, pa.j.ty * TILE + 6, 36, 36); }
    if (pa.k === 'jump') { const s = pa.s; ctx.strokeStyle = 'rgba(232,227,214,.6)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.strokeRect(s[0] * TILE + 6, s[1] * TILE + 6, 36, 36); ctx.setLineDash([]); }
    if (pa.k === 'wireOn') { ctx.strokeStyle = 'rgba(224,176,112,.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pa.at.x, pa.at.y, 16 + Math.sin(S.t * 8) * 2, 0, TAU); ctx.stroke(); }
    if (pa.k === 'fuse') { ctx.strokeStyle = '#f2c46b'; ctx.lineWidth = 2; ctx.strokeRect(STAGE.fuse[0] * TILE + 4, STAGE.fuse[1] * TILE + 4, 40, 40); }
    drawActLabels(pa, P);
    const nc = !P.carrying && nearCorpse();
    if (nc) { ctx.strokeStyle = 'rgba(232,227,214,.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(nc.x, nc.y, 26, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    if (input.aiming && input.tool !== 'kunai') {
      const ap = aimPoint();
      if (ap) {
        const col = input.tool === 'coin' ? '242,196,107' : '215,220,230';
        ctx.strokeStyle = `rgba(${col},.85)`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.quadraticCurveTo((P.x + ap.x) / 2, (P.y + ap.y) / 2 - ap.d * 0.25, ap.x, ap.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ap.x, ap.y, 12, 0, TAU); ctx.stroke();
        if (input.tool === 'stone') { ctx.strokeStyle = `rgba(${col},.25)`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ap.x, ap.y, 240, 0, TAU); ctx.stroke(); }
        tag(ap.x, ap.y - 26, `${TOOL_NAME[input.tool]} — 놓으면 던짐`, `rgb(${col})`);
      }
    }
    if (input.aiming && input.queue && input.queue.length) input.queue.forEach((q, i) => {  // 예약한 행동
      const tx = q.tgt ? q.tgt.x : q.pt ? q.pt.x : P.x, ty = q.tgt ? q.tgt.y : q.pt ? q.pt.y : P.y;
      ctx.strokeStyle = 'rgba(127,214,204,.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(tx, ty, 14, 0, TAU); ctx.stroke(); tag(tx, ty - 26, `예약 ${i + 1} · ${TOOL_NAME[q.tool]}`, '#7fd6cc');
    });
    const kt = (input.tool === 'kunai' || input.aiming) ? kunaiTarget() : null;
    if (kt && input.aiming && input.tool === 'kunai') { ctx.strokeStyle = 'rgba(215,219,226,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(kt.x, kt.y); ctx.stroke(); ctx.setLineDash([]); tag(kt.x, kt.y - 28, kt.type === 'lamp' ? '쿠나이 — 조명 깨기' : '쿠나이 — 원격 암살', '#d7dbe2'); }
    if (kt) {
      ctx.save(); ctx.translate(kt.x, kt.y); ctx.rotate(S.t * 1.5); ctx.strokeStyle = 'rgba(215,219,226,.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(14, 0); ctx.lineTo(0, 14); ctx.lineTo(-14, 0); ctx.closePath(); ctx.stroke(); ctx.restore();
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (input.aiming && running && !S.over) {  // 조준하는 동안 세상은 멈춰 있다 — 화면 테두리와 글로 알려 준다
    ctx.strokeStyle = 'rgba(120,190,255,.45)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.fillStyle = 'rgba(8,14,26,.72)'; const lw = 170 * DPR; ctx.fillRect(canvas.width / 2 - lw / 2, canvas.height - 150 * DPR, lw, 26 * DPR);
    ctx.fillStyle = 'rgba(168,220,255,.95)'; ctx.font = `700 ${13 * DPR}px "IBM Plex Sans KR",sans-serif`; ctx.textAlign = 'center'; ctx.fillText('시간 멈춤 · 조준 중', canvas.width / 2, canvas.height - 132 * DPR);
  }
  const tgts = [];
  if (S.exitOpen) tgts.push({ x: S.exit.x, y: S.exit.y, c: '#f2c46b' });
  else {
    for (const g of S.guards) if (g.target && g.state !== 'DEAD') tgts.push({ x: g.x, y: g.y, c: '#e8473c' });
    for (const it of S.items) if (!it.got) tgts.push({ x: it.x, y: it.y, c: '#f2c46b' });
  }
  // 화면 밖에서 나를 의심하는 자경대원 방향 (노랑 = 의심, 빨강 = 발각)
  for (const g of S.guards) { if (g.civ || g.state === 'DEAD' || dist(g.x, g.y, S.player.x, S.player.y) > 1100) continue; const al = g.state === 'ALERT'; if (al || g.meter > 0.05 || ['SUSPICIOUS', 'SEARCH', 'NOTICE'].includes(g.state)) tgts.push({ x: g.x, y: g.y, c: awareCol(g), small: true }); }
  for (const t of tgts) {
    const sx = (t.x - cam.x) * SCALE + W / 2, sy = (t.y - cam.y) * SCALE + H / 2, m = t.small ? 30 : 46;
    if (sx < m || sy < m + 70 || sx > W - m || sy > H - m) {
      const a = Math.atan2(sy - H / 2, sx - W / 2);
      const ex = clamp(sx, m, W - m), ey = clamp(sy, m + 70, H - m);
      ctx.save(); ctx.scale(DPR, DPR); ctx.translate(ex, ey); ctx.rotate(a); if (t.small) ctx.scale(0.7, 0.7);
      ctx.fillStyle = t.c; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  if (input.aiming && running && !S.over) {
    ctx.fillStyle = 'rgba(30,60,110,.22)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const vg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.3, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,10,30,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(DPR, DPR); ctx.font = '700 13px Galmuri, "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(190,220,255,.9)'; ctx.fillText('집중 — 시간이 멈췄다', W / 2, H - (isTouch ? 230 : 70)); ctx.restore();
  }
  if (S.flash > 0) { ctx.fillStyle = `rgba(140,10,16,${S.flash * 1.2})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  if (S.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${S.fade * 1.6})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
}

// ---------------------------------------------------------------- 대사
const DLG = { q: [], cur: null, modal: false, onEnd: null };
function speakerOf(w) {
  if (w === 'hero') return { name: '나', face: 'fc_ninja' };
  if (w && w.note) return { name: w.note, face: null };
  if (w === 'master') return { name: '스승', face: 'fc_master' };
  if (w && w.civ) return { name: '주민', face: 'fc_civ' + (w.look || 0) };
  if (w && w.doc) return { name: '한 선생', face: 'fc_doc' };
  if (w && w.kind) return { name: w.dog ? '경비견' : w.lookout ? '감시병' : w.elite ? '정예' : w.target ? '표적' : '경비', face: w.dog ? null : 'fc_' + charOf(w) };
  return { name: '', face: null };
}
function say(lines, modal, onEnd) {
  if (!lines || !lines.length || (DLG.modal && !modal)) return;
  DLG.q = lines.slice(); DLG.modal = !!modal; DLG.onEnd = onEnd || null; nextLine();
}
function bark(who, key) { const arr = BARKS[key]; if (!arr || !who) return; say([[who, arr[(Math.random() * arr.length) | 0]]]); }
const anyGuard = pred => S.guards.find(g => g.state !== 'DEAD' && g.state !== 'CAPTIVE' && !g.dog && !g.target && (!pred || pred(g)));
function nextLine() {
  const l = DLG.q.shift(), el = $('dlg');
  if (!l) { DLG.cur = null; DLG.modal = false; el.hidden = true; const cb = DLG.onEnd; DLG.onEnd = null; if (cb) cb(); return; }
  const sp = speakerOf(l[0]); DLG.cur = { text: l[1], shown: 0, t: 0 };
  $('dlgName').textContent = sp.name; $('dlgName').hidden = !sp.name;
  const fc = $('dlgFace').getContext('2d'); fc.imageSmoothingEnabled = false; fc.clearRect(0, 0, 38, 38);
  const f = sp.face && F[sp.face]; $('dlgFaceBox').hidden = !f; if (f) fc.drawImage(atlas, f[0], f[1], f[2], f[3], 0, 0, 38, 38);
  $('dlgText').textContent = ''; $('dlgHint').textContent = DLG.modal ? (isTouch ? '탭하면 다음 ▸' : 'Q · Space 다음 ▸   Esc 건너뛰기') : '';
  el.classList.toggle('modal', DLG.modal); el.hidden = false;
}
function advanceDialog() { const c = DLG.cur; if (!c) return; if (c.shown < c.text.length) { c.shown = c.text.length; $('dlgText').textContent = c.text; } else nextLine(); }
function skipDialog() { DLG.q = []; nextLine(); }
function resetDialog() { DLG.q = []; DLG.cur = null; DLG.modal = false; DLG.onEnd = null; $('dlg').hidden = true; }
function updateDialog(dt) {
  const c = DLG.cur; if (!c) return; c.t += dt;
  if (c.shown < c.text.length) { c.shown = Math.min(c.text.length, c.shown + dt * 38); $('dlgText').textContent = c.text.slice(0, Math.floor(c.shown)); }
  else if (!DLG.modal && c.t > c.text.length / 38 + 2.2) nextLine();
}
{ const el = document.getElementById('dlg'); el.addEventListener('pointerdown', e => { e.preventDefault(); advanceDialog(); });
  if (A.ui) { el.querySelector('.dlg-box').style.borderImage = `url(${A.ui.dialog}) 6 fill / 14px / 0 stretch`; document.getElementById('dlgFaceBox').style.backgroundImage = `url(${A.ui.facebox})`; } }
// 밤 소리(귀뚜라미) 반복
let ambSrc = null;
function startAmb() {
  if (!AC || ambSrc) return;
  const go = buf => { if (ambSrc) return; const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; const g = AC.createGain(); g.gain.value = muted ? 0 : 0.1; s.connect(g); g.connect(master); s.start(); s._g = g; ambSrc = s; };
  if (MB.crickets) go(MB.crickets); else if (A.music && A.music.crickets) AC.decodeAudioData(b64ToBuf(A.music.crickets), b => { MB.crickets = b; go(b); }, () => {});
}
// ---------------------------------------------------------------- HUD
const $ = id => document.getElementById(id);
const hud = { tool: $('btnTool'), pips: [...document.querySelectorAll('#alertPips i')], obj: $('objective'), objT: $('objTitle'), light: $('lightFill'), lightLbl: $('lightLbl'), mode: $('modeLbl'), alarm: $('alarmChip'), act: $('btnAct'), carry: $('btnCarry'), kills: $('killsLbl'), layer: $('layerLbl'), hp: $('hpPips') };
let hudCache = {};
function setText(el, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; el.textContent = v; } }
// 미니맵: 건물·골목, 나, 목표, 탈출구, 내가 볼 수 있는 사람만
let miniBase = null, miniT = 0;
function buildMiniBase(mw = 200, mh = 140) {
  const s = Math.min(mw / MW, mh / MH), c = document.createElement('canvas'); c.width = Math.ceil(MW * s); c.height = Math.ceil(MH * s);
  const x = c.getContext('2d');
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const ch = G0[ty][tx], b = bldAt(tx, ty);
    x.fillStyle = b >= 0 ? (ch === '#' || ch === 'N' ? '#6a7486' : '#3e4758') : ch === '#' ? '#4a5262' : ch === '=' ? '#2c3343' : ch === ',' ? '#2a2e28' : ch === 'g' ? '#1f3020' : ch === 'd' ? '#3a3024' : ch === 'x' ? '#6a8aa0' : ch === 'p' ? '#28405a' : ch === 'm' ? '#5d636e' : ch === 'r' ? '#4a463e' : ch === 'J' ? '#3a3e48' : ch === '~' ? '#1e3a5a' : ch === 'B' || ch === 'T' ? '#2f4a34' : ch === 'P' ? '#8a8f98' : ch === 'M' ? '#6a3a3a' : ch === 'A' ? '#5a6070' : '#181d28';
    x.fillRect(tx * s, ty * s, Math.ceil(s), Math.ceil(s));
  }
  S.wires.forEach(w => { x.strokeStyle = 'rgba(160,170,190,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(w.a.x / TILE * s, w.a.y / TILE * s); x.lineTo(w.b.x / TILE * s, w.b.y / TILE * s); x.stroke(); });
  c.s = s; return c;
}
function drawMini() {
  const cv = document.getElementById('mini'); if (!cv || !S) return;
  if (S.t - miniT < 0.12 && S.t >= miniT) return; miniT = S.t;
  { const tp = document.querySelector('#hud .top'), hc = document.getElementById('hintCard'); if (tp) { const tb = Math.round(tp.getBoundingClientRect().bottom); if (tb !== drawMini.tb) { drawMini.tb = tb; document.documentElement.style.setProperty('--topb', tb + 'px'); } }
    const v = S.entrySel ? 'hidden' : ''; if (cv.style.visibility !== v) { cv.style.visibility = v; if (hc) hc.style.visibility = v; } }
  // 주인공(과 행동 표시)이 미니맵·목표·도움말 밑에 들어가면 그 판을 옅게 한다
  { const cr = canvas.getBoundingClientRect(), px = cr.left + (S.player.x - cam.x) * SCALE + W / 2, py = cr.top + (S.player.y - cam.y) * SCALE + H / 2;
    for (const el of [cv, document.querySelector('#hud .obj'), document.getElementById('hintCard')]) { if (!el) continue; const r = el.getBoundingClientRect(); const over = r.width > 0 && px > r.left - 40 && px < r.right + 40 && py > r.top - 70 && py < r.bottom + 40; el.classList.toggle('hudfade', over); } }
  if (!miniBase || miniBase.stage !== S) { miniBase = buildMiniBase(); miniBase.stage = S; cv.width = miniBase.width; cv.height = miniBase.height; }
  const x = cv.getContext('2d'), s = miniBase.s, P = S.player, T = v => v / TILE * s;
  x.drawImage(miniBase, 0, 0);
  // 화면에 보이는 범위
  x.strokeStyle = 'rgba(232,227,214,.45)'; x.lineWidth = 1; x.strokeRect(T(cam.x - W / SCALE / 2), T(cam.y - H / SCALE / 2), T(W / SCALE), T(H / SCALE));
  if (S.exitOpen) { x.strokeStyle = '#f2c46b'; x.lineWidth = 2; x.beginPath(); x.arc(T(S.exit.x), T(S.exit.y), 5, 0, TAU); x.stroke(); }
  for (const it of S.items) if (!it.got) { x.fillStyle = '#f2c46b'; x.fillRect(T(it.x) - 2.5, T(it.y) - 2.5, 5, 5); if (it.fl) { x.fillStyle = '#0b0d12'; x.font = '700 7px monospace'; x.textAlign = 'center'; x.fillText(String(it.fl + 1), T(it.x), T(it.y) + 2.5); } }
  // 보이는 사람만: 같은 층·시선이 닿는 자경대원(경계 단계 색), 주민은 초록
  for (const g of S.guards) {
    if (g.state === 'DEAD') continue;
    const same = flOf(g) === flOf(P) && !P.under && !P.vent;
    const seen = g.target || (same && dist(g.x, g.y, P.x, P.y) < 560 && los(P.x, P.y, g.x, g.y, P.z > 0)) || g.state === 'ALERT';
    if (!seen) continue;
    x.fillStyle = g.target ? '#ff5a4a' : g.civ ? '#9ad69a' : g.state === 'ALERT' ? '#e8473c' : ['SUSPICIOUS', 'SEARCH', 'NOTICE', 'CHECK', 'BODY'].includes(g.state) ? '#f2c46b' : '#c8d2e6';
    x.beginPath(); x.arc(T(g.x), T(g.y), g.target ? 3 : 2.2, 0, TAU); x.fill();
  }
  for (const c of S.cams || []) if (!c.broken && c.fl === flOf(P)) { x.fillStyle = camOn(c) ? '#ff4a4a' : '#6a6a6a'; x.fillRect(T(c.x) - 2, T(c.y) - 2, 4, 4); }
  // 나
  x.save(); x.translate(T(P.x), T(P.y)); x.rotate(P.a); x.fillStyle = '#7fe3ff'; x.beginPath(); x.moveTo(5, 0); x.lineTo(-3.5, -3.5); x.lineTo(-2, 0); x.lineTo(-3.5, 3.5); x.closePath(); x.fill(); x.restore();
  if (P.fl || P.z) { x.fillStyle = '#7fe3ff'; x.font = '700 9px monospace'; x.textAlign = 'left'; x.fillText(P.fl ? (P.fl + 1) + 'F' : 'R', T(P.x) + 5, T(P.y) - 4); }
}
// 목표 목록: 무엇을 어디서 (건물 이름·층) — 한 줄씩, 끝낸 것은 줄 긋기
function objectiveLines() {
  const L = [], P = S.player;
  const place = (x, y, fl, b) => { const bi = b != null ? b : bldAt(Math.floor(x / TILE), Math.floor(y / TILE)); if (bi < 0) return '바깥'; const B = BLD[bi]; const nm = B.name ? B.name + (B.plate && !B.plate.includes(B.name) && !B.name.includes(B.plate) ? '(' + B.plate + ')' : '') : B.plate || (B.kind === 'shop' ? ((B.signs || [])[fl || 0] || '상가') + ' 건물' : B.kind === 'house' ? '단독주택' : '빌라'); return nm + ' ' + ((fl || 0) + 1) + '층'; };
  if (S.mod) L.push(['info', '변형: ' + MODS[S.mod][0] + ' — ' + MODS[S.mod][1]]);
  if (STAGE.steps && (S.tutI || 0) < STAGE.steps.length) L.push(['go', `연습 ${(S.tutI || 0) + 1}/${STAGE.steps.length}: ${STAGE.steps[S.tutI || 0][0]}`]);
  if (S.exitOpen) L.push(['go', '탈출 지점(노란 원)으로']);
  if ((STAGE.keyBld || STAGE.keyDoors) && !STAGE.tutorial) { if (S.doors.some(d => d.keyLock)) L.push([P.hasKey || !S.doors.some(d => d.keyLock && d.locked) ? 'done' : '', P.hasKey ? '열쇠 있음' : '열쇠 확보 (또는 창문·옥상으로)']); }
  else { const ks = Object.keys(P.keys || {}); if (ks.length) L.push(['info', '가진 것: ' + ks.map(keyName).join(', ')]); }
  (S.learned || []).forEach(t => L.push(['info', '알아낸 것: ' + t]));
  if (P.disguise) L.push([P.disguiseBlown ? 'go' : 'info', P.disguiseBlown ? '변장 들통남 — 다시 갈아입을 옷을 찾아라' : '변장 중 — 걸으면 멀리서는 안 들킨다']);
  if (STAGE.shift && S.shiftI < STAGE.shift.add.length) L.push(['', `다음 교대까지 ${Math.max(0, Math.ceil(S.shiftT))}초 — 순찰이 늘어난다`]);
  for (const g of S.guards) if (g.target) { const r = g.route[0]; L.push([g.state === 'DEAD' ? 'done' : S.spare ? 'done' : '', (g.doc ? '한 선생' : '표적') + (S.spare && g.state !== 'DEAD' ? ' — 살려 둘 수 있다' : ' — ' + place(r.x, r.y, g.fl))]); }
  S.items.forEach((it, i) => L.push([it.got ? 'done' : '', ((STAGE.itemNames || [])[i] || STAGE.itemName || '밀서') + ' — ' + place(it.x, it.y, it.fl, it.b)]));
  if (showOpps) for (const o of S.opps || []) if (o.seen) { const pl = o.x != null ? (o.roof ? place(o.x, o.y, o.fl).replace(/ \d+층$/, ' 옥상') : place(o.x, o.y, o.fl)) : ''; L.push([oppDone(o) ? 'opp done' : 'opp', '기회: ' + oppText(o) + (pl && pl !== '바깥' ? ' — ' + pl : '')]); }
  if (S.timeLeft) L.push([S.timeLeft < 60 ? 'go' : '', `남은 시간 ${Math.floor(S.timeLeft / 60)}:${String(Math.floor(S.timeLeft % 60)).padStart(2, '0')}`]);
  return L;
}
function objectiveText() {
  if (S.exitOpen) return '탈출 지점(노란 원)으로 이동';
  const tg = S.guards.filter(g => g.target), td = tg.filter(g => g.state === 'DEAD').length;
  const parts = [];
  if (STAGE.keyDoors && S.doors.some(d => d.keyLock && d.locked) && !S.player.hasKey) parts.push('열쇠 확보(또는 다른 길)');
  if (tg.length) parts.push(S.spare && td < tg.length ? '표적: 살려 둘 수 있다' : `표적 제거 ${td}/${tg.length}`);
  if (S.items.length) parts.push(`${STAGE.itemName || '밀서'} 회수 ${S.items.filter(i => i.got).length}/${S.items.length}`);
  return parts.join(' · ');
}
function updateHUD(force) {
  if (force) hudCache = {};
  const P = S.player;
  setText(hud.objT, 'objT', STAGE.sub);
  if (CITY) { const html = objectiveLines().map(([c, t]) => `<span class="ol ${c}">${c.includes('done') ? (c.includes('opp') ? '◆' : '●') : c === 'go' ? '▶' : c === 'opp' ? '◇' : '○'} ${t}</span>`).join(''); if (hudCache.objH !== html) { hudCache.objH = html; hud.obj.innerHTML = html; } }
  else setText(hud.obj, 'obj', objectiveText() + (S.timeLeft ? ` · ${Math.floor(S.timeLeft / 60)}:${String(Math.floor(S.timeLeft % 60)).padStart(2, '0')}` : '') + (P.hasKey ? ' · 열쇠 있음' : ''));
  if (CITY) drawMini();
  hud.obj.classList.toggle('urgent', !!S.timeLeft && S.timeLeft < 60);
  const lv = P.hidden ? 0 : P.light;
  hud.light.style.width = Math.round(lv * 100) + '%';
  const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
  const bnm = !P.z && !P.wire && bldAt(ptx, pty) >= 0 && BLD[bldAt(ptx, pty)].name ? ' · ' + BLD[bldAt(ptx, pty)].name : '';
  setText(hud.layer, 'layer', (P.vent ? '환풍구' : P.under ? '지하 수로' : P.wire ? '전깃줄' : P.fl ? `실내 ${P.fl + 1}층` : P.z ? `지붕 ${P.z}층` : bldAt(ptx, pty) >= 0 ? '실내 1층' : '지상') + bnm);
  hud.layer.dataset.l = P.vent ? 'vent' : P.under ? 'under' : P.z ? 'roof' : bldAt(ptx, pty) >= 0 ? 'in' : 'out';
  setText(hud.lightLbl, 'll', P.vent ? '덕트 안' : P.under ? '지하 수로' : P.hide ? (P.hide.type === 'well' ? (STAGE.well === 'manhole' ? '맨홀 은신' : '땅굴 은신') : hideName(P.hide) + ' 은신') : P.hidden ? '덤불 은신' : P.jump ? '공중' : P.wire ? '전깃줄' + (lv > 0.4 ? '·노출' : '') : P.z ? P.z + '층 지붕' + (lv > 0.4 ? '·노출' : '') : lv > 0.55 ? '빛 노출' : lv > 0.22 ? '어스름' : '어둠');
  hud.light.dataset.level = P.hidden ? 'hid' : lv > 0.55 ? 'hi' : lv > 0.22 ? 'mid' : 'lo';
  setText(hud.mode, 'mode', input.aiming ? TOOL_NAME[input.tool] + ' 조준' : P.hide ? '숨는 중' : P.captive ? '붙잡는 중 ' + Math.max(0, Math.ceil(9 - P.captive.captT)) + '초' : P.carrying ? '운반 중' : P.cover ? (P.cover.kind === 'tree' ? '나무에 기댐' : P.cover.kind === 'car' ? '차 뒤에 붙음' : '벽에 기댐') : P.trav ? '오르는 중' : (input.sneakToggle ? '[살금 모드] ' : input.walkLock ? '[항상 걷기] ' : '') + { sneak: '살금살금', walk: '걷기', run: '달리기' }[P.mode] + (CITY && loudMul(P.x, P.y, flOf(P)) < 1 ? (loudMul(P.x, P.y, flOf(P)) < 0.5 ? ' · 음악에 묻힘' : ' · 음악 소리') : ''));
  syncTools();
  setText(hud.kills, 'k', '제거 ' + S.stats.kills);
  const fleeNow = S.fleeing && S.guards.some(g => g.state === 'FLEE');
  hud.alarm.hidden = !(S.alevel || fleeNow);
  hud.alarm.dataset.lv = S.alevel;
  if (S.alevel || fleeNow) {
    const t = S.alevel === 3 ? '발각 — 숨어서 ' + Math.max(0, Math.ceil(15 - S.unseenT)) + '초 버티기' : A_NAME[S.alevel] + ' ' + Math.ceil(S.alevelT) + '초';
    setText(hud.alarm, 'al', (fleeNow ? '표적 도주 · ' : '') + t);
  }
  hud.pips.forEach((p, i) => p.classList.toggle('on', i < S.alevel));
  const hpKey = P.hp + '/' + P.hpMax; if (hudCache.hp !== hpKey) { hudCache.hp = hpKey; hud.hp.innerHTML = Array.from({ length: P.hpMax }, (_, i) => `<i class="${i < P.hp ? 'on' : ''}"></i>`).join(''); }
  { const el = $('expoLbl'); if (el) { el.hidden = !CITY; if (CITY) { const e = P.hide || P.under || P.vent ? 0 : S.expo || 0; if (hudCache.expo !== e) { hudCache.expo = e; el.dataset.e = e; el.textContent = e === 2 ? '보인다!' : e === 1 ? '들킬 수 있음' : '숨음'; } } } }
  { const hc = $('hintCard'), dl = $('dlg'); if (hc && dl) hc.style.visibility = dl.hidden ? '' : 'hidden'; }
  { const pl = $('pickLbl'); if (pl) { pl.hidden = !CITY; if (CITY) setText(pl, 'picks', '락픽 ' + (P.picks || 0)); } }
  const pa = primaryAction();
  setText(hud.act.querySelector('b'), 'act', pa.k === 'none' && !pa.stalk ? '행동' : pa.label);
  hud.act.classList.toggle('ready', pa.k !== 'none');
  const sa = secondaryAction();
  setText(hud.carry.querySelector('b'), 'carry', sa.label);
  hud.carry.classList.toggle('ready', sa.k !== 'none');
  hud.act.classList.toggle('kill', ['kill', 'kill2', 'drop', 'ambush', 'ventKill'].includes(pa.k));
}
// 도구 선택 표시 (아래 오른쪽 작은 칸 + 도구 버튼 글자)
function syncTools() {
  if (!S) return; const P = S.player;
  document.querySelectorAll('#tools .tool').forEach(b => {
    const t = b.dataset.t; b.classList.toggle('on', t === input.tool); b.classList.toggle('empty', toolCount(t) <= 0);
    setText(b.querySelector('span'), 'tc_' + t, String(toolCount(t)));
  });
  setText(hud.tool.querySelector('b'), 'toolb', TOOL_NAME[input.tool] + ' ' + toolCount(input.tool));
  hud.tool.classList.toggle('aiming', !!input.aiming);
  hud.tool.classList.toggle('ready', input.tool === 'kunai' ? !!kunaiTarget() : toolCount(input.tool) > 0);
}

function endGame(win, reason) {
  if (S.over) return;
  S.over = true;
  if (!win && STAGE.tutorial && cpReady()) { play('lose', 0.5); toast('들켰다 — 이 단계부터 다시 한다', 2); const run = S; setTimeout(() => { if (S === run && S.over) loadCheckpoint(); }, 1300); return; }  // 연습: 죽어도 그 자리에서 다시
  play(win ? 'win' : 'lose', 0.7); resetDialog();
  const run = S; setTimeout(() => { if (S === run) showEnd(win, reason); }, win ? 500 : 800);
}
// 임무 경로 지도 (Hitman식): 지나간 길·처치·발각·시체 발견 위치
function drawEndMap() {
  const cv = document.getElementById('endMap'); if (!cv || !S) return;
  const wmax = Math.min(560, (window.innerWidth || 600) - 40), base = buildMiniBase(wmax, 300), s = base.s, T = v => v / TILE * s;
  cv.width = base.width; cv.height = base.height; const x = cv.getContext('2d');
  x.globalAlpha = 0.85; x.drawImage(base, 0, 0); x.globalAlpha = 1;
  const tr = S.trail || [];
  if (tr.length > 1) { x.lineWidth = 2; x.lineJoin = 'round';
    for (let i = 1; i < tr.length; i++) { const a = tr[i - 1], b = tr[i]; if (dist(a.x, a.y, b.x, b.y) > 300) continue; x.strokeStyle = b.z || b.fl ? 'rgba(242,196,107,.9)' : 'rgba(120,210,255,.85)'; x.beginPath(); x.moveTo(T(a.x), T(a.y)); x.lineTo(T(b.x), T(b.y)); x.stroke(); } }
  if (tr[0]) { x.fillStyle = '#78d2ff'; x.beginPath(); x.arc(T(tr[0].x), T(tr[0].y), 4, 0, TAU); x.fill(); }
  const ex = S.exit; if (ex) { x.strokeStyle = '#f2c46b'; x.lineWidth = 2; x.beginPath(); x.arc(T(ex.x), T(ex.y), 6, 0, TAU); x.stroke(); }
  for (const e of S.events || []) {
    const px = T(e.x), py = T(e.y);
    if (e.k === 'seen') { x.fillStyle = '#ff9a3c'; x.font = '800 13px monospace'; x.textAlign = 'center'; x.fillText('!', px, py + 4); continue; }
    if (e.k === 'found') { x.strokeStyle = '#ff5a4a'; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, 6, 0, TAU); x.stroke(); continue; }
    x.strokeStyle = e.k === 'accident' ? '#f2c46b' : e.k === 'target' ? '#ff3a3a' : '#e8473c'; x.lineWidth = e.k === 'target' ? 3 : 2;
    x.beginPath(); x.moveTo(px - 4, py - 4); x.lineTo(px + 4, py + 4); x.moveTo(px + 4, py - 4); x.lineTo(px - 4, py + 4); x.stroke();
  }
}
function showEnd(win, reason) {
  running = false;
  const st = S.stats, t = Math.floor(S.t);
  const hasTargets = S.guards.some(g => g.target);
  let rank = '';
  if (win) {
    const bonus = [['발각되지 않기', st.detected === 0], ['시체 발견 0', st.bodies === 0], ['수색 경보 0', st.alarms === 0], [hasTargets ? '표적 외 살상 0' : '아무도 죽이지 않기', hasTargets ? st.extraKills === 0 : st.kills === 0]];
    S.bonus = bonus;
    if (STAGE.challenges) {
      const all = loadCh(), mine = all[STAGE.id] || (all[STAGE.id] = {}); mine._clear = true; if (S.mod) mine['mod_' + S.mod] = true;
      S.chRes = STAGE.challenges.map(id => { const ok = !!(CH[id] && CH[id][1]()), fresh = ok && !mine[id]; if (ok) mine[id] = true; return [id, ok, fresh, !!mine[id]]; });
      saveCh(all);
    }
    const n = bonus.filter(b => b[1]).length;
    rank = n === 4 ? '그림자' : n === 3 ? '암살자' : n === 2 ? '침입자' : '소란꾼';
    saveBest(STAGE.id + '_' + DKEY, rank); saveBest(STAGE.id, rank);
  }
  $('endTitle').textContent = win ? '임무 완료' : '실패';
  $('endSub').textContent = win ? '등급: ' + rank : (reason || '') + ' 경로와 타이밍을 바꿔 다시 시도해 보자.';
  if (win && STAGE.spare) { const tg = S.guards.find(g => g.target); $('endSub').textContent += ' · ' + (tg && tg.state !== 'DEAD' ? STAGE.spare.endSpared : S.realized ? STAGE.spare.endRealized : STAGE.spare.endKilled); }
  $('endStats').innerHTML = [
    ['소요 시간', Math.floor(t / 60) + '분 ' + String(t % 60).padStart(2, '0') + '초'], ['제거', st.kills + '명'], ['특수 암살', st.special + '회'], ['발각 횟수', st.detected + '회'],
    ['발견된 시체', st.bodies + '구'], ['숨긴 시체', st.stashed + '구'], ['기절시킨 주민', (st.ko || 0) + '명'], ['주민 비명', (st.screams || 0) + '회'], ['돌·쿠나이', st.stonesUsed + ' · ' + st.kunaiUsed]
  ].concat(st.cpUsed ? [['체크포인트 재시작', st.cpUsed + '회']] : []).map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');
  $('endRankNote').innerHTML = !win ? '' : STAGE.challenges ? (() => { const n = starsOf(STAGE), max = 1 + STAGE.challenges.length;
      return `<div class="stars">${'★'.repeat(n)}${'☆'.repeat(max - n)} <small>별 ${n}/${max}</small></div>` + S.chRes.map(([id, ok, fresh, ever]) => `<span class="bn ${ok ? 'ok' : ''}">${ok ? '●' : ever ? '◐' : '○'} ${chName(id)}${fresh ? ' <b>새로 달성</b>' : ''}</span>`).join(' ')
        + ((STAGE.entries || []).some(e => e.need && e.need <= n) ? `<div class="ent">열린 진입로: ${(STAGE.entries || []).filter(e => (e.need || 0) <= n).map(e => e.name).join(' · ')}</div>` : ''); })()
      : '난이도 ' + D().name + ' · 보너스 목표 ' + S.bonus.map(b => `<span class="bn ${b[1] ? 'ok' : ''}">${b[1] ? '●' : '○'} ${b[0]}</span>`).join(' ');
  if (S.mod) $('endRankNote').innerHTML += `<div class="ent">변형: ${MODS[S.mod][0]}${win ? ' — 깼다' : ''}</div>`;
  if (CITY && win && S.stars0 != null) { const n = totalStars(), nw = PERKS.filter(([need]) => need > S.stars0 && need <= n); if (nw.length) $('endRankNote').innerHTML += `<div class="ent">새 장비 해금: ${nw.map(p => p[2]).join(' · ')}</div>`; }
  drawEndMap();
  $('btnNext').hidden = !(win && (STAGE.tutorial || (STAGE_I < STAGES.length - 1 && !STAGES[STAGE_I + 1].tutorial)));
  $('btnCP').hidden = win || !cpReady();
  $('hud').hidden = true; $('joy').hidden = true; $('end').hidden = false; $('end').dataset.win = win ? '1' : '0';
  renderStageList();
}

if (!CITY) document.querySelectorAll('.cityonly').forEach(e => e.remove());
function renderStageList() {
  const best = loadBest();
  $('stageList').innerHTML = STAGES.map((s, i) => [s, i]).sort((a, b) => (b[0].tutorial ? 1 : 0) - (a[0].tutorial ? 1 : 0)).map(([s, i]) => `
    <button class="stage" type="button" data-i="${i}">
      <span class="st-no">${s.no}</span>
      <span class="st-body"><span class="st-name">${s.name}</span><span class="st-mis">${s.mission}</span></span>
      <span class="st-best ${best[s.id + '_' + DKEY] || starsOf(s) ? 'has' : ''}">${CITY && !s.tutorial && stageCleared(s) ? `<small class="modc">변형 ${Object.keys(MODS).filter(k => (loadCh()[s.id] || {})['mod_' + k]).length}/4</small> ` : ''}${s.challenges ? '★'.repeat(starsOf(s)) + '☆'.repeat(1 + s.challenges.length - starsOf(s)) : best[s.id + '_' + DKEY] ? D().name + ' 최고 ' + best[s.id + '_' + DKEY] : D().name + ' 미완료'}</span>
    </button>`).join('');
  $('stageList').querySelectorAll('.stage').forEach(b => b.addEventListener('click', () => start(+b.dataset.i)));
  { const pl = $('perkList'); if (pl) { pl.hidden = !CITY; if (CITY) { const n = totalStars(); pl.innerHTML = `<h3>장비 <small>별 ${n}개</small></h3>` + PERKS.map(([need, k, name]) => `<span class="perk ${n >= need ? 'on' : ''}"><b>★${need}</b> ${name}</span>`).join(''); } } }
  document.querySelectorAll('#diffSel button').forEach(b => b.classList.toggle('on', b.dataset.d === DKEY));
  { const mb = $('modBox'); if (mb) { mb.hidden = !CITY; document.querySelectorAll('#modSel button').forEach(b => b.classList.toggle('on', b.dataset.m === MOD)); const mn = $('modNote'); if (mn) mn.textContent = MOD ? MODS[MOD][1] + ' — 한 번 깬 의뢰에만 적용된다.' : '한 번 깬 의뢰는 조건을 바꿔 다시 할 수 있다. 깬 변형은 목록에 표시된다.'; } }
}

// ---------------------------------------------------------------- 루프
let lastT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const rawDt = (t - lastT) / 1000 || 0, dt = Math.min(0.05, rawDt); lastT = t; perfWatch(rawDt);
  if (!S || !mapC) return;
  if (running && !paused) updateDialog(dt);
  document.body.classList.toggle('scanning', !!(input.scan && running && !tactical));
  { const wb = document.getElementById('btnWhistle'); if (wb && S) wb.classList.toggle('cool', S.whistleT > 0); }
  if (running && !paused && !S.over && !tactical && !DLG.modal) { let ud = dt; if (S.hitStop > 0) { S.hitStop -= dt; ud = dt * 0.06; } if (input.aiming) focusUpdate(ud); else update(ud); }
  else if (running && DLG.modal && !S.over) { moveCamera(dt); updateHUD(); }
  else if (tactical) { moveCamera(dt); updateHUD(); }
  else if (S.over) { for (const n of S.noises) n.t += dt; }
  else if (!running) { S.t += dt; const P = S.player, kx = P.x, ky = P.y; P.x = -9999; P.y = -9999; for (const g of S.guards) updateGuard(g, dt); P.x = kx; P.y = ky; }
  draw();
}
// 느린 기기: 3초 동안 평균 40fps 아래면 해상도를 한 단계(0.5배) 낮춘다 (다시 올리지는 않는다)
let dprCap = 2, perfN = 0, perfSum = 0;
function perfWatch(rawDt) {
  if (!running || paused || !S || S.over || DPR <= 1 || rawDt <= 0 || rawDt > 0.25) return;
  perfN++; perfSum += rawDt; if (perfSum < 3) return;
  const fps = perfN / perfSum; perfN = 0; perfSum = 0;
  if (fps < 40) { dprCap = Math.max(1, DPR - 0.5); resize(); miniBase = null; toast(`화면이 느려 해상도를 낮췄다 (${Math.round(fps)}fps)`, 2.2); }
}
function resize() {
  DPR = Math.min(dprCap, 2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  BASE_SCALE = clamp(Math.min(W, H * 1.45) / ((W < 640 ? 11.5 : 15) * TILE), 0.6, 1.35);
  if (!SCALE || SCALE === 1) SCALE = BASE_SCALE * userZoom;
}
function targetScale() {
  if (tactical) return Math.min(W / (MW * TILE), (H - 90) / (MH * TILE)) * 0.96;
  const P = S && S.player;
  return BASE_SCALE * userZoom * (P && P.z >= 3 ? 0.68 : P && (P.z || P.jump) ? 0.8 : 1);
}
function setZoom(z) { userZoom = clamp(z, 0.45, 1.5); try { localStorage.setItem('yahaeng.zoom', String(userZoom)); } catch (e) {} }
function toggleTactical() {
  if (!running || !S || S.over || S.entrySel) return;
  tactical = !tactical; $('tacBanner').hidden = !tactical; $('btnMap').classList.toggle('on', tactical); if (tactical) S.usedMap = true;
  if (tactical) hint('tac', '전술 지도: 게임이 멈춘 상태에서 경비 위치와 순찰로를 볼 수 있다');
}
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- 입력
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', isTouch);
window.addEventListener('keydown', e => {
  if (!S) return;
  if (S.entrySel && running) { const m = /^Digit([1-9])$/.exec(e.code); if (m) { e.preventDefault(); chooseEntry(+m[1] - 1); } return; }
  if (S.keypad && running) { e.preventDefault(); const m = /^(?:Digit|Numpad)([0-9])$/.exec(e.code); if (m && !e.repeat) kpPress(m[1]); else if (e.code === 'Backspace') kpPress('<'); else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') kpPress('ok'); else if (e.code === 'Escape') kpPress('x'); return; }
  if (e.code === 'KeyH' && !e.repeat) { const k = document.querySelector('.keys'); if (k) k.classList.toggle('mini'); return; }
  if (DLG.modal && running) { if (['KeyQ', 'Space', 'Enter'].includes(e.code)) { e.preventDefault(); if (!e.repeat) advanceDialog(); return; } if (e.code === 'Escape') { skipDialog(); return; } }
  if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault();  // 브라우저 메뉴로 넘어가지 않게
  if (e.code === 'Tab' || e.code === 'Digit4' || e.code === 'AltLeft' || e.code === 'AltRight') { e.preventDefault(); if (running) { input.scan = true; $('btnScan').classList.add('on'); hint('scan', '살피기: 문·창문·배관·굴뚝·환풍구·숨을 곳이 색으로 표시된다'); } return; }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && running) e.preventDefault();
  if (e.repeat) return;
  S.keys[e.code] = true;
  if (!running || S.over) return;
  // 왼손: Space 행동 · Z 특수 · X 도구(누르고 겨누기) · C 도구 바꾸기 · Ctrl 살금 모드 · Shift 달리기 · Alt 살피기 (Q W E는 예전 키로 남겨 둔다)
  if (e.code === 'KeyQ' || e.code === 'Space') actPrimary();
  if (e.code === 'KeyW' || e.code === 'KeyZ') { if (input.aiming) queueAim(); else actCarry(); }
  if (e.code === 'KeyE' || e.code === 'KeyX') startAim('key');
  if (e.code === 'KeyC') selectTool(TOOLS[(TOOLS.indexOf(input.tool) + 1) % TOOLS.length]);
  if (e.code === 'KeyR') cycleMoveLock();
  if (e.code === 'Digit1') selectTool('stone');
  if (e.code === 'Digit2') selectTool('coin');
  if (e.code === 'Digit3') selectTool('kunai');
  if (e.code === 'ControlLeft' || e.code === 'ControlRight') toggleSneak();
  if (e.code === 'KeyN') toggleMute();
  if (e.code === 'KeyM') toggleTactical();
  if (e.code === 'KeyV') whistle();
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') setZoom(userZoom - 0.1);
  if (e.code === 'Equal' || e.code === 'NumpadAdd') setZoom(userZoom + 0.1);
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
});
window.addEventListener('keyup', e => { if (S) S.keys[e.code] = false; if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault(); if ((e.code === 'KeyE' || e.code === 'KeyX') && input.aiming && input.aiming.src === 'key') releaseAim(); if (e.code === 'Tab' || e.code === 'Digit4' || e.code === 'AltLeft' || e.code === 'AltRight') { input.scan = false; $('btnScan').classList.remove('on'); } });
window.addEventListener('blur', () => { cancelAim(); if (S) S.keys = {}; if (running && !S.over) setPause(true); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => { if (!running) return; e.preventDefault(); setZoom(userZoom * (e.deltaY > 0 ? 0.92 : 1.08)); }, { passive: false });

const joyEl = $('joy'), joyKnob = $('joyKnob'), JOY_R = 60;
let joyId = null, joyO = null;
canvas.addEventListener('touchstart', e => {
  for (const t of e.changedTouches) {
    if (joyId === null && t.clientX < W * 0.6 && running) {
      document.body.classList.add('joyused');
      joyId = t.identifier; joyO = { x: t.clientX, y: t.clientY };
      joyEl.style.left = (t.clientX - JOY_R) + 'px'; joyEl.style.top = (t.clientY - JOY_R) + 'px'; joyEl.hidden = false;
      joyKnob.style.transform = 'translate(0,0)'; input.joy = { x: 0, y: 0, mag: 0 }; joyEl.dataset.mode = input.sneakToggle ? 'sneak' : 'walk';
    }
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) if (t.identifier === joyId) {
    let dx = t.clientX - joyO.x, dy = t.clientY - joyO.y; const d = Math.hypot(dx, dy);
    const m = Math.min(1, d / JOY_R);
    if (d > JOY_R) { dx = dx / d * JOY_R; dy = dy / d * JOY_R; }
    input.joy = { x: dx / JOY_R, y: dy / JOY_R, mag: m };  // 방향×세기 (이동 쪽에서 한 번만 정규화)
    joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
    joyEl.dataset.mode = input.sneakToggle ? 'sneak' : input.walkLock || m < JOY_RUN ? 'walk' : 'run';
  }
  e.preventDefault();
}, { passive: false });
// 경비 주시(Desperados III): 경비를 누르면 그 경비의 순찰로·시야를 굵게 고정 표시한다. 다시 누르면 해제
function markAt(cx, cy) {
  if (!S || !running || S.over) return false;
  const r = canvas.getBoundingClientRect(), wx = cam.x + (cx - r.left - W / 2) / SCALE, wy = cam.y + (cy - r.top - H / 2) / SCALE;
  let best = null, bd = 34; for (const g of S.guards) { if (g.state === 'DEAD' || flOf(g) !== flOf(S.player)) continue; const d = dist(g.x, g.y - 14, wx, wy); if (d < bd) { bd = d; best = g; } }
  if (!best) return false;
  S.marked = S.marked === best ? null : best; play('click', 0.25);
  if (S.marked) toast((best.target ? '표적' : best.civ ? '주민' : best.elite ? '정예' : best.dog ? '개' : '경비') + ' 주시 — 순찰로와 시야를 고정 표시한다', 1.8);
  return true;
}
canvas.addEventListener('mousedown', e => { if (e.button === 0 && !isTouch) markAt(e.clientX, e.clientY); });
const touchT = {};
canvas.addEventListener('touchstart', e => { for (const t of e.changedTouches) touchT[t.identifier] = { x: t.clientX, y: t.clientY, t: performance.now() }; }, { passive: true });
const endJoy = e => {
  for (const t of e.changedTouches) {
    const o = touchT[t.identifier]; delete touchT[t.identifier];
    if (o && Math.hypot(t.clientX - o.x, t.clientY - o.y) < 10 && performance.now() - o.t < 320) markAt(t.clientX, t.clientY);
    if (t.identifier === joyId) { joyId = null; input.joy = null; joyEl.hidden = true; }
  }
};
canvas.addEventListener('touchend', endJoy); canvas.addEventListener('touchcancel', endJoy);

function bindBtn(id, fn) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); fn(); b.classList.add('down'); });
  const up = () => b.classList.remove('down');
  b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
}
bindBtn('btnAct', actPrimary);
bindBtn('btnCarry', () => { if (input.aiming) queueAim(); else actCarry(); });
{
  const b = $('btnTool');
  b.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); b.classList.add('down'); try { b.setPointerCapture(e.pointerId); } catch (er) {} startAim('btn'); });
  b.addEventListener('pointerup', () => { b.classList.remove('down'); releaseAim(); });
  b.addEventListener('pointercancel', () => { b.classList.remove('down'); cancelAim(); });
}
document.querySelectorAll('#tools .tool').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); if (b.dataset.t === input.tool) selectTool(TOOLS[(TOOLS.indexOf(input.tool) + 1) % TOOLS.length]); else selectTool(b.dataset.t); }));  // 고른 도구만 보이고, 누르면 다음 도구로
function syncSneakBtn() {
  const el = document.getElementById('modeLbl'); if (el) el.classList.toggle('lock', !!(input.sneakToggle || input.walkLock));
  const b = document.getElementById('btnWalk'); if (b) { b.classList.toggle('on', !!input.walkLock); b.setAttribute('aria-pressed', input.walkLock ? 'true' : 'false'); }
  const s = document.getElementById('btnSneak'); if (s) { s.classList.toggle('on', !!input.sneakToggle); s.setAttribute('aria-pressed', input.sneakToggle ? 'true' : 'false'); }
  const je = document.getElementById('joy'); if (je) je.dataset.mode = input.sneakToggle ? 'sneak' : 'walk';
}
// 살금 모드: 켜 두면 판이 바뀌어도 계속 살금살금으로 다닌다 (Ctrl 키 또는 위쪽 [살금] 버튼)
function toggleSneak() {
  input.sneakToggle = !input.sneakToggle; if (input.sneakToggle) { input.walkLock = false; try { localStorage.setItem('yh_walkLock', '0'); } catch (e) {} }
  try { localStorage.setItem('yh_sneak', input.sneakToggle ? '1' : '0'); } catch (e) {}
  syncSneakBtn(); toast(input.sneakToggle ? '살금 모드 — 발소리가 아주 작다 (끄기 전까지 유지)' : '살금 모드 해제 — 기본 걷기', 1.6);
}
// 항상 걷기: 켜 두면 Shift·조이스틱 끝까지도 뛰지 않는다 (R 키 또는 위쪽 [항상 걷기] 버튼)
function toggleWalkLock() {
  input.walkLock = !input.walkLock; if (input.walkLock) { input.sneakToggle = false; try { localStorage.setItem('yh_sneak', '0'); } catch (e) {} }
  try { localStorage.setItem('yh_walkLock', input.walkLock ? '1' : '0'); } catch (e) {}
  syncSneakBtn(); toast(input.walkLock ? '항상 걷기 — 뛰지 않는다' : '항상 걷기 해제 — 다시 뛸 수 있다', 1.4);
}
function cycleMoveLock() { toggleWalkLock(); }
{ const o = document.querySelector('#hud .obj'); if (o) o.addEventListener('click', e => { e.stopPropagation(); o.classList.toggle('open'); }); }  // 휴대폰: 목표 펼치기
{ const b = document.getElementById('btnWalk'); if (b) b.addEventListener('click', e => { e.stopPropagation(); if (running) toggleWalkLock(); b.blur(); }); }
{ const kp = document.getElementById('keypad'); if (kp) kp.addEventListener('pointerdown', e => { const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); e.stopPropagation(); initAudio(); kpPress(b.dataset.k); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 120); }); }
{ const b = document.getElementById('btnWhistle'); if (b) b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); whistle(); }); }
{ const b = document.getElementById('btnSneak'); if (b) b.addEventListener('click', e => { e.stopPropagation(); if (running) toggleSneak(); b.blur(); }); }
{ const ml = document.getElementById('modeLbl'); if (ml) { ml.style.pointerEvents = 'auto'; ml.style.cursor = 'pointer'; ml.title = '누르면 살금 모드 켜고 끄기 (C)'; ml.addEventListener('click', () => { if (running) toggleSneak(); }); } }
function toggleMute() { muted = !muted; if (musicSrc) musicSrc._g.gain.value = muted ? 0 : 0.16; if (ambSrc) ambSrc._g.gain.value = muted ? 0 : 0.1; $('btnMute').textContent = muted ? '소리 켜기' : '소리 끄기'; }
function setPause(v) { if (!running) return; paused = v; $('pause').hidden = !paused; }
function togglePause() { setPause(!paused); }
$('btnMute').addEventListener('click', toggleMute);
$('btnPause').addEventListener('click', togglePause);
$('btnMap').addEventListener('click', toggleTactical);
{ const mi = $('mini'); if (mi) { if (!CITY) mi.style.display = 'none'; else $('btnMap').style.display = 'none'; mi.addEventListener('click', toggleTactical); } }  // 도시: 지도 버튼 대신 미니맵을 누른다
$('btnScan').addEventListener('click', () => { input.scan = !input.scan; $('btnScan').classList.toggle('on', input.scan); });
$('btnZoomOut').addEventListener('click', () => setZoom(userZoom - 0.12));
$('btnZoomIn').addEventListener('click', () => setZoom(userZoom + 0.12));
$('btnRoutes').addEventListener('click', () => { showRoutes = !showRoutes; $('btnRoutes').classList.toggle('on', showRoutes); try { localStorage.setItem('yahaeng.routes', showRoutes ? '1' : '0'); } catch (e) {} });
$('btnRoutes').classList.toggle('on', showRoutes);
{ const bo = $('btnOpps'); if (bo) { bo.classList.toggle('on', showOpps); bo.addEventListener('click', () => { showOpps = !showOpps; bo.classList.toggle('on', showOpps); hudCache.objH = null; try { localStorage.setItem('yahaeng.opps', showOpps ? '1' : '0'); } catch (e) {} }); } }
$('tacBanner').addEventListener('click', toggleTactical);
$('btnResume').addEventListener('click', () => setPause(false));
$('btnRestart2').addEventListener('click', () => { setPause(false); start(STAGE_I); });
$('btnMenu2').addEventListener('click', () => { setPause(false); toMenu(); });
$('btnMenu').addEventListener('click', toMenu);
$('btnRetry').addEventListener('click', () => start(STAGE_I));
$('btnCP').addEventListener('click', () => loadCheckpoint());
$('btnNext').addEventListener('click', () => start(STAGE.tutorial ? 0 : STAGE_I + 1));
document.addEventListener('visibilitychange', () => { if (document.hidden && running) setPause(true); });

document.querySelectorAll('#modSel button').forEach(b => b.addEventListener('click', () => { MOD = b.dataset.m; try { localStorage.setItem('yahaeng.mod', MOD); } catch (e) {} renderStageList(); }));
document.querySelectorAll('#diffSel button').forEach(b => b.addEventListener('click', () => { DKEY = b.dataset.d; try { localStorage.setItem('yahaeng.diff', DKEY); } catch (e) {} renderStageList(); }));
function start(i) {
  initAudio(); play('knife', 0.5); prepNeonMusic(); setTimeout(() => setMusic(CITY ? 'n_calm' : 'calm'), 300);
  tactical = false; $('tacBanner').hidden = true; $('btnMap').classList.remove('on');
  syncSneakBtn(); input.scan = false; input.aiming = null; input.tool = 'stone'; $('btnScan').classList.remove('on');  // 항상 걷기는 판이 바뀌어도 유지
  running = true; paused = false;
  newGame(i); resetDialog(); miniBase = null;
  const keysEl = document.querySelector('.keys'); if (keysEl) keysEl.classList.add('mini');
  const hc = document.getElementById('hintCard'); if (hc) hc.classList.add('off');
  $('intro').hidden = true; $('end').hidden = true; $('pause').hidden = true; $('hud').hidden = false;
  say(DIALOGUE[STAGE.id], true, () => { if (STAGE.entries && STAGE.entries.filter(e => (e.need || 0) <= starsOf(STAGE)).length > 1) beginEntry(); else { play('bell', 0.6); startAmb(); if (CITY) toast('출발 지점은 안전하다. 길은 직접 고른다 — ' + (isTouch ? '미니맵을 눌러' : '[M] 지도로') + ' 순찰로 확인', 4); } });
}
// 시작 전 정찰: 전술 지도에서 진입로를 고른다 (골목 · 옥상 · 전깃줄)
function beginEntry() {
  S.entrySel = true; tactical = true;
  let box = $('entryBox');
  if (!box) {
    box = document.createElement('div'); box.id = 'entryBox';
    box.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:60;background:rgba(10,12,20,.92);border:1px solid #3a4250;padding:12px 14px;max-width:min(680px,94vw);font-family:Galmuri,"IBM Plex Sans KR",sans-serif;color:#e8e3d6;box-shadow:0 6px 24px rgba(0,0,0,.5)';
    document.body.appendChild(box);
  }
  box.innerHTML = '<div style="font-size:13px;letter-spacing:.12em;color:#f2c46b;margin-bottom:8px">정찰 — 진입로를 고른다' + (isTouch ? '' : ' (숫자 키)') + '</div>' +
    STAGE.entries.map((e, i) => (e.need || 0) > starsOf(STAGE) ? `<div style="margin:4px 0;padding:8px 10px;border:1px dashed #3a4250;color:#7a8294">${i + 1}. 잠김 — 별 ${e.need}개 필요</div>` : `<button type="button" data-i="${i}" style="display:block;width:100%;text-align:left;margin:4px 0;padding:8px 10px;background:#161b26;border:1px solid #3a4250;color:#e8e3d6;font:inherit;cursor:pointer"><b style="color:#f2c46b">${i + 1}. ${e.name}</b> <span style="font-size:12px;color:#b8b2a4">— ${e.desc}</span></button>`).join('');
  box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => chooseEntry(+b.dataset.i)));
  box.hidden = false;
  toast('전술 지도: 경비 순찰로와 목표를 보고 들어갈 길을 고른다', 4);
}
function chooseEntry(i) {
  const e = STAGE.entries[i]; if (!e || !S.entrySel || (e.need || 0) > starsOf(STAGE)) return;
  const P = S.player; P.wire = null; P.z = 0; P.fl = 0; setLayer(0); P.jump = null;
  if (e.pole) { const o = S.poles.find(o => o.tx === e.pole[0] && o.ty === e.pole[1]); const w = o.wires.find(w => !e.toward || (w.a.pole === o ? w.b : w.a).tx === e.toward) || o.wires[0]; P.wire = { w, s: w.a.pole === o ? 0 : 1 }; P.z = o.z; P.x = o.x; P.y = o.y; }
  else { P.x = tc(e.at[0]); P.y = tc(e.at[1]); P.z = e.z || 0; }
  S.entrySel = false; tactical = false; $('entryBox').hidden = true; $('tacBanner').hidden = true; $('btnMap').classList.remove('on'); S.toasts.length = 0; P.vx = 0; P.vy = 0;
  cam.x = P.x; cam.y = P.y; play('bell', 0.6); startAmb(); toast('진입: ' + e.name, 2.2);
}
function entryPos(e) { if (e.pole) { const o = S.poles.find(o => o.tx === e.pole[0] && o.ty === e.pole[1]); return { x: o.x, y: o.y - o.top }; } return { x: tc(e.at[0]), y: tc(e.at[1]) }; }
function toMenu() {
  if (club && AC) club.g.gain.setTargetAtTime(0, AC.currentTime, 0.2);
  running = false; paused = false; resetDialog(); if ($('entryBox')) $('entryBox').hidden = true;
  $('end').hidden = true; $('pause').hidden = true; $('hud').hidden = true; $('intro').hidden = false;
  renderStageList();
  newGame(STAGE_I);
}

atlas.onload = () => {
  resize();
  renderStageList();
  newGame(0);
  requestAnimationFrame(frame);
  window.__game = {
    get S() { return S; }, get DLG() { return DLG; }, kitSpec, robAt, solidFor, roofProps, get BLD() { return BLD; }, lightAt, loudMul, noise, musicKey: () => musicKey, tileAt, saveCheckpoint, loadCheckpoint, cpReady, endGame, get CP() { return CP; }, neonTest: k => { initAudio(); const t0 = performance.now(); const b = makeNeonLoop(k); const d = b.getChannelData(0); let nan = 0, rms = 0; for (let i = 0; i < d.length; i++) { if (!isFinite(d[i])) nan++; rms += d[i] * d[i]; } return [Math.round(performance.now() - t0), b.duration.toFixed(1), nan, Math.sqrt(rms / d.length).toFixed(3)]; }, neonWav: k => { initAudio(); const b = makeNeonLoop(k), n = b.length, sr = b.sampleRate, L = b.getChannelData(0), R = b.getChannelData(1), out = new Int16Array(n * 2); for (let i = 0; i < n; i++) { out[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; out[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; } let s = ''; const u = new Uint8Array(out.buffer); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return [sr, btoa(s)]; }, clubInfo: () => club ? { vol: club.g.gain.value, lp: club.lp.frequency.value, ctx: AC.state } : null, rLv, facadeRow, jumpTarget, lvAt, bldAt, primaryAction, actPrimary, showEnd, whistle, fallKill, planPt, astar, canSee, advanceDialog, say, rollCall, nearVent, ventAmbushTarget, ventAt, drawScan, input, setDiff(k) { DKEY = k; }, actCoin, ugAt, spawnReinforcements, get SCALE() { return SCALE; }, setZoom, toggleTactical, updateChats, setAlert, secondaryAction, grab, nearDoor, nearLamp, nearWindow, ambushTarget, get BLD() { return BLD; }, jumpTarget, nearClimb, start, actPrimary, actCarry, actThrow, actKunai, primaryAction, kunaiTarget, newGame, castRay, tileG(x, y) { return G[y][x]; }, get GF() { return GF; }, setLayer, nearFloorDown, nearWinWire, nearPole, nearWireMount, wireDropTarget, wirePt,
    mapImage() { return mapC.toDataURL(); },
    validate() {
      const issues = [];
      STAGES.forEach((st, si) => {
        newGame(si);
        const sx = st.start[0], sy = st.start[1];
        S.doors.filter(d => d.keyLock || d.gate).forEach(d => setDoor(d, false));
        (st.keyDoors || []).forEach(([kx, ky]) => { const d = S.doors.find(d => d.tx === kx && d.ty === ky); if (!d) issues.push(`${st.id}: 열쇠 문 (${kx},${ky}) 문 아님`); else setDoor(d, false); });  // 열쇠는 얻을 수 있으므로 연 상태로 검사
        const reach = (x, y, label) => { if (solidAt(x, y)) { issues.push(`${st.id}: ${label} (${x},${y}) 막힌 칸`); return; } if (!(x === sx && y === sy) && !astar(sx, sy, x, y).length) issues.push(`${st.id}: ${label} (${x},${y}) 도달 불가`); };
        reach(Math.floor(st.exit[0]), Math.floor(st.exit[1]), '출구');
        STAGE._items.forEach(p => { if (!p[2]) reach(p[0], p[1], '밀서'); });
        STAGE._g.forEach((g, gi) => { if (!g.fl) (g.route || (g.at ? [g.at] : [])).forEach(r => reach(r[0], r[1], `경비${gi}`)); });
        // 위층: 그 층으로 올라오는 계단에서 닿는지
        const fromStair = (f, x, y, label) => { const b = bldAt(x, y); const l = S.ladders.find(l => l.kind === 'fstair' && l.tfl === f && bldAt(l.tx, l.ty) === b); setLayer(f); if (!l) issues.push(`${st.id}: ${label} (${x},${y},${f + 1}층) 올라올 계단 없음`); else if (solidAt(x, y) || (!(l.bx === x && l.by === y) && !astar(l.bx, l.by, x, y).length)) issues.push(`${st.id}: ${label} (${x},${y},${f + 1}층) 도달 불가`); setLayer(0); };
        STAGE._items.forEach(p => { if (p[2]) fromStair(p[2], p[0], p[1], '물건'); });
        STAGE._g.forEach((g, gi) => { if (g.fl) (g.route || [g.at]).forEach(r => fromStair(g.fl, r[0], r[1], `경비${gi}`)); });
        S.wires.forEach((w, wi) => [w.a, w.b].forEach(n => { if (n.win && (!GF[n.fl] || GF[n.fl][n.ty][n.tx] !== 'N')) issues.push(`${st.id}: 전깃줄${wi} 창문 (${n.tx},${n.ty},${n.fl + 1}층) 창문 아님`); }));
        if (st.fuse) reach(st.fuse[2], st.fuse[3], '퓨즈 앞');
        if (st.flee) st.guards.forEach((g, gi) => { if (g.target) { const r = g.route[0]; if (!astar(r[0], r[1], st.flee[0], st.flee[1]).length) issues.push(`${st.id}: 표적${gi} 도주로 없음`); } });
        S.hides.filter(b => !b.furn).forEach(b => { const ok = N8.slice(0, 4).filter(o => !solidAt(b.tx + o[0], b.ty + o[1])); if (!ok.length || !astar(sx, sy, b.tx + ok[0][0], b.ty + ok[0][1]).length) issues.push(`${st.id}: ${b.type} (${b.tx},${b.ty}) 접근 불가`); });
        S.ladders.forEach(l => { if (l.bz === 0) reach(l.bx, l.by, l.kind === 'pipe' ? '배관 밑' : '사다리'); });
        PIPES.forEach(p => { if (!S.ladders.some(l => l.kind === 'pipe' && l.tx === p[0] && l.ty === p[1])) issues.push(`${st.id}: 배관 (${p[0]},${p[1]}) 디딜 곳 없음`); });
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (G[y][x] === 'L' && !S.ladders.some(l => l.kind === 'ladder' && l.bx === x && l.by === y)) issues.push(`${st.id}: 사다리 (${x},${y}) 옆에 지붕 없음`);
        if (st.reinf) reach(st.reinf[0], st.reinf[1], '증원 지점');
        S.ladders.filter(l => l.kind === 'stair' || l.kind === 'fstair').forEach(l => { if (!l.bfl) reach(l.bx, l.by, '계단'); });
        S.lamps.filter(l => l.hearth).forEach(l => { if (!S.ladders.some(c => c.kind === 'chimney' && c.lamp === l)) issues.push(`${st.id}: 아궁이 (${l.tx},${l.ty}) 굴뚝 없음`); });
        S.vents.forEach(v => { if (v.roof ? !v.z : groundSolidP(v.tx, v.ty)) issues.push(`${st.id}: 환풍구 (${v.tx},${v.ty}) 자리 잘못됨`); else if (!v.roof) reach(v.tx, v.ty, '환풍구'); if (!ventAt(v.tx, v.ty)) issues.push(`${st.id}: 환풍구 (${v.tx},${v.ty}) 덕트 없음`); });
        (S.cams || []).forEach(c => { const g = c.fl ? GF[c.fl] : G0; if (SOLID.has(g[c.ty][c.tx])) issues.push(`${st.id}: CCTV (${c.tx},${c.ty}) 벽 안`); });
        S.hides.filter(h => h.type === 'well').forEach(h => { if (!ugAt(h.tx, h.ty)) issues.push(`${st.id}: 맨홀 (${h.tx},${h.ty}) 지하와 안 이어짐`); });
        S.windows.forEach(w => { const ok = [[1, 0], [0, 1]].some(([dx, dy]) => !groundSolidP(w.tx + dx, w.ty + dy) && !groundSolidP(w.tx - dx, w.ty - dy)); if (!ok) issues.push(`${st.id}: 창문 (${w.tx},${w.ty}) 양쪽이 막힘`); });
        S.wires.forEach((w, wi) => [w.a, w.b].forEach(n => { if (n.roof && !n.z) issues.push(`${st.id}: 전깃줄${wi} 끝 (${n.tx},${n.ty}) 옥상 아님`); }));
        S.poles.forEach(o => { if (!o.wires.length) issues.push(`${st.id}: 전봇대 (${o.tx},${o.ty}) 줄 없음`); const ok = N8.slice(0, 4).filter(d => !solidAt(o.tx + d[0], o.ty + d[1])); if (!ok.length || !astar(sx, sy, o.tx + ok[0][0], o.ty + ok[0][1]).length) issues.push(`${st.id}: 전봇대 (${o.tx},${o.ty}) 접근 불가`); });
        BLD.forEach((b, bi) => { if (!S.ladders.some(l => bldAt(l.tx, l.ty) === bi) && !S.wires.some(w => [w.a, w.b].some(n => n.roof && bldAt(n.tx, n.ty) === bi))) issues.push(`${st.id}: 건물${bi} 직접 오를 곳 없음`); });
      });
      newGame(0);
      return issues;
    }
  };
};
atlas.src = A.atlas;
})();
