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
let BLD = [], PIPES = [], TENTS = [], RL = null, BI = null, UG = null, VG = null;  // 건물 목록, 배관, 칸별 옥상 높이, 칸별 건물 번호
function buildMap(st) {
  PLANKS = []; PLANK_MASK = null;
  MW = st.W; MH = st.H; G = []; BLD = []; PIPES = []; TENTS = []; POLES = []; CARS = []; FURN = []; PLANS = []; AUTO_LAMPS = [];
  for (let y = 0; y < MH; y++) G.push(new Array(MW).fill('.'));
  const m = {
    set: (x, y, c) => { if (y >= 0 && y < MH && x >= 0 && x < MW) G[y][x] = c; },
    get: (x, y) => (y >= 0 && y < MH && x >= 0 && x < MW) ? G[y][x] : '#',
    fill: (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.set(x, y, c); },
    rect: (x0, y0, x1, y1) => { for (let x = x0; x <= x1; x++) { m.set(x, y0, '#'); m.set(x, y1, '#'); } for (let y = y0; y <= y1; y++) { m.set(x0, y, '#'); m.set(x1, y, '#'); } },
    many: (c, list) => list.forEach(p => m.set(p[0], p[1], c)),
    // 건물: 바닥·벽·문을 그리고 옥상(높이 h)을 기록
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
