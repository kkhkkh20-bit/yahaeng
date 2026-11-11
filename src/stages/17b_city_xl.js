// ───────── 도시 2배 시험 구역: 기존 도시(4×3 블록, 84×64칸)의 블록 설계를 그대로 써서 8×6 블록(168×128칸)으로 넓혔다.
// 가로·세로 각 2배라 같은 속도로 끝에서 끝까지 두 배 걸린다. 캠페인·저장과 분리: 주소에 ?study=city-xl 일 때만 들어간다.
// 블록 하나 = 16칸(바깥 한 칸 보도), 도로 4칸. 블록 종류는 기존 도시 12종을 다시 배치했다.
...(new URLSearchParams(location.search).get('study') === 'city-xl' ? [(() => {
  // 강: 셋째 블록 줄 아래 가로 도로(y 60~63) 바로 밑을 가로지른다(y 64~74). 넷째 줄부터는 강 폭만큼 남쪽으로 밀린다
  // 블록 24칸(바깥 한 칸 보도) + 도로 4칸 = 28칸 주기. 건물이 커지고 맵도 커졌다(232×199칸)
  const BX = 8, BY = 6, BS = 24, P = BS + 4, RIVER_ROWS = 11, RS = RIVER_ROWS + 4, RIVER_Y = 3 * P + 4, W = BX * P + 8, H = BY * P + 8 + RS;
  const B = (bx, by) => [4 + bx * P, 4 + by * P + (by >= 3 ? RS : 0)];
  const RIVER = window.__ASSETS__ && window.__ASSETS__.cityRiver;
  // 간판 이름: 을지로 골목 가게들 (블록 자리마다 다르게)
  const pick = (list, x, y, k = 0) => list[((x * 7 + y * 13 + k * 5) >>> 0) % list.length];
  const FOOD = ['국밥', '노가리', '호프', '골뱅이', '곱창', '순댓국', '백반', '분식', '포차'];
  const STORE = ['편의점', '철물', '공구', '타일', '조명', '인쇄', '전파사', '약국', '지물포'];
  const PLAY = ['PC방', '당구장', '노래방', '다방', '기원'];
  // 필지: 사각형 안을 한두 줄로 나누고, 줄마다 폭이 다른 건물(6~11칸)과 1~2칸 틈 · 빈터를 놓는다.
  // 같은 블록은 언제나 같은 모양이다(블록 좌표로 정한 난수). kind: 'shop' 상가 골목 · 'res' 주택가 · 'dense' 다세대·사무실 밀집
  const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };  // mulberry32
  const UPPER = ['office', 'office', 'gym', 'pc', 'academy'], UPPER_SIGN = { office: ['', '세무사', '법무사', '부동산'], gym: ['헬스장'], pc: ['PC방', '당구장', '노래방'], academy: ['학원'] };
  function genLots(m, X0, Y0, X1, Y1, kind, r) {
    const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
    const yard = (x0, y0, x1, y1) => {  // 빈터: 주차장 · 마당 · 쉼터 · 노점
      const t = r(), w = x1 - x0 + 1, h = y1 - y0 + 1; if (w < 1 || h < 1) return;
      if (t < 0.3 && w >= 2 && h >= 3) { m.fill(x0, y0, x1, y1, '.'); for (let cx = x0; cx <= x1 && cx <= x0 + 6; cx += 2) if (r() < 0.7) m.car(cx, y0 + (h > 3 ? 1 : 0), ri(0, 4)); }
      else if (t < 0.55) { m.fill(x0, y0, x1, y1, 'g'); for (let k = 0; k < Math.max(1, (w * h) >> 3); k++) m.set(ri(x0, x1), ri(y0, y1), r() < 0.5 ? 'T' : 'B'); }
      else if (t < 0.7 && w >= 2 && h >= 2 && kind === 'shop') m.tent(x0, y0, ['R', 'B', 'G'][ri(0, 2)]);
      else for (let k = 0; k < Math.max(1, (w * h) >> 4); k++) m.set(ri(x0, x1), ri(y0, y1), r() < 0.6 ? 'O' : 'B');
    };
    const tall = kind === 'shop' ? [2, 5] : kind === 'dense' ? [3, 5] : [1, 3];
    const building = (x0, y0, x1, y1, front) => {
      const d = y1 - y0 + 1, h = Math.max(1, Math.min(ri(tall[0], tall[1]), d - 2));
      if (front && kind !== 'res') {  // 1층 가게(식당 · 가게), 위층은 사무실 · 헬스장 · PC방 · 학원
        const use = Array.from({ length: h }, (_, f) => f ? UPPER[ri(0, UPPER.length - 1)] : r() < 0.55 ? 'food' : 'store');
        m.villa(x0, y0, x1, y1, h, { kind: 'shop', use, signs: use.map((u, f) => f === 0 ? pick(u === 'food' ? FOOD : STORE, x0, y0) : f <= 2 ? pick(UPPER_SIGN[u] || [''], x0, y0, f) : '') });
      } else m.villa(x0, y0, x1, y1, h, r() < 0.35 ? { kind: 'house' } : {});
    };
    const row = (y0, y1, front) => {
      let cx = X0; if (r() < 0.15) { const w = ri(1, 2); yard(cx, y0, cx + w - 1, y1); cx += w; }
      while (X1 - cx + 1 >= 6) {
        const left = X1 - cx + 1; let w = Math.min(left, ri(6, 11)); if (left - w > 0 && left - w < 7) w = left - w <= 2 ? left : Math.max(6, left - 7);  // 끝에 애매한 자투리가 남지 않게
        const sb = r() < 0.3 ? 1 : 0;
        if (r() < (kind === 'res' ? 0.12 : 0.05)) yard(cx, y0, cx + w - 1, y1); else building(cx, front ? y0 : y0 + sb, cx + w - 1, front ? y1 - sb : y1, front);
        if (sb) yard(cx, front ? y1 : y0, cx + w - 1, front ? y1 : y0);
        cx += w; const g = r() < 0.7 ? 1 : 2; if (cx <= X1) { yard(cx, y0, Math.min(X1, cx + g - 1), y1); cx += g; }
      }
      if (cx <= X1) yard(cx, y0, X1, y1);
    };
    const Hh = Y1 - Y0 + 1;
    if (Hh >= 16) { const dN = ri(7, 10), dS = ri(7, Math.min(10, Hh - dN - 2)); row(Y0, Y0 + dN - 1, false); m.fill(X0, Y0 + dN, X1, Y1 - dS, ','); row(Y1 - dS + 1, Y1, true); }
    else if (Hh >= 5 && X1 - X0 + 1 >= 6) row(Y0, Y1, true); else yard(X0, Y0, X1, Y1);
  }
  function genBlock(m, x, y, kind) {
    const r = rng(x * 7919 + y * 104729 + kind.length * 13), ri = (a, b) => a + Math.floor(r() * (b - a + 1));
    if (r() < 0.2) {  // 한쪽은 깊은 큰 건물, 나머지는 필지
      const w = ri(9, 12), left = r() < 0.5, bx0 = left ? x + 1 : x + BS - 1 - w;
      m.villa(bx0, y + 3, bx0 + w - 1, y + BS - 2, ri(3, 6), kind === 'res' ? {} : { kind: 'shop', use: ['food', 'gym', 'office', 'office', 'office', 'office'], signs: [pick(FOOD, x, y), '헬스장', pick(UPPER_SIGN.office, x, y)] });
      genLots(m, left ? bx0 + w + 1 : x + 1, y + 1, left ? x + BS - 2 : bx0 - 2, y + BS - 2, kind, r); m.fill(bx0, y + 1, bx0 + w - 1, y + 2, ',');
      return;
    }
    genLots(m, x + 1, y + 1, x + BS - 2, y + BS - 2, kind, r);
  }
  // 특수 블록(조직 구역 · 본부 · 클럽 · 병원 · 지구대 · 공원 · 시장 · 공사장)은 왼쪽 위 16칸에 그대로 두고, 남은 ㄱ자 땅을 필지로 채운다
  function fillAround(m, x, y, kind) {
    const r = rng(x * 3571 + y * 7349 + 7);
    m.fill(x + 15, y + 1, x + 15, y + BS - 2, ','); m.fill(x + 1, y + 15, x + 14, y + 15, ',');
    genLots(m, x + 16, y + 1, x + BS - 2, y + BS - 2, kind, r); genLots(m, x + 1, y + 16, x + 14, y + BS - 2, kind, r);
  }
  // 블록 배치 (기존 도시 종류): h 주택가 · s 상가 · w 조직 창고 · c 클럽 거리 · p 공원 · m 시장 · r 건달파 동네 · e 주택 · H 병원 · P 지구대 · k 공사장 · q 조직 본부
  // 조직 세력: A 조직(본부 q) · B 건달파(r 동네) · C 청계파(w 창고 상회) · D 종로파(c 클럽 거리 뒤 사무실)
  const LAYOUT = [
    'hsweshcs',
    'pmrkemrh',
    'eshcpsep',
    'HPmhrkqe',
    'skepmhsc',
    'hewrPkHq'
  ];
  const zones = [], gangs = []; let collecting = true;
  const Z = z => { if (collecting) zones.push(z); }, Gp = (...g) => { if (collecting) gangs.push(...g); };
  const T = {
    h(m, x, y) { genBlock(m, x, y, 'res'); },
    s(m, x, y) { genBlock(m, x, y, 'shop'); Z([x + 1, y + 1, x + BS - 2, y + BS - 2, 'pub']); },
    w(m, x, y) {
      m.villa(x + 1, y + 1, x + 14, y + 6, 1, { kind: 'shop', use: ['store'], signs: ['청계 상회'], name: '청계 상회', back: true });
      m.villa(x + 1, y + 9, x + 8, y + 14, 2, { kind: 'shop', use: ['office', 'office'], signs: ['', ''], plate: '청계파 사무실', name: '청계파 사무실' });
      m.fill(x + 10, y + 9, x + 14, y + 14, '.'); m.car(x + 11, y + 10, 1); m.car(x + 13, y + 10, 3);
      Z([x + 1, y + 1, x + 14, y + 14, 'res', null, '청계 상회 · 청계파 구역', ['gangC']]);
      Gp({ kind: 'g1', fac: 'C', route: [[x + 10, y + 9, 2], [x + 14, y + 13, 2]] }, { kind: 'g2', fac: 'C', at: [x + 9, y + 13], post: 90 }, { kind: 'g1', fac: 'C', at: [x + 7, y + 7], post: 180 });
    },
    c(m, x, y) {
      m.villa(x + 1, y + 1, x + 14, y + 8, 2, { kind: 'shop', use: ['club', 'vip'], signs: ['CLUB', ''], name: '클럽' });
      m.villa(x + 1, y + 10, x + 6, y + 14, 1, { kind: 'shop', use: ['food'], signs: [pick(FOOD, x, y)] }); m.villa(x + 9, y + 10, x + 14, y + 14, 2, { kind: 'shop', use: ['office', 'office'], signs: ['', ''], plate: '종로파 사무실', name: '종로파 사무실' });
      Z([x + 1, y + 1, x + 14, y + 7, 'pub']); Z([x + 8, y + 9, x + 14, y + 14, 'res', null, '종로파 사무실', ['gangD']]);
      Gp({ kind: 'g2', fac: 'D', at: [x + 8, y + 9], post: 90 }, { kind: 'g1', fac: 'D', route: [[x + 7, y + 9, 3], [x + 14, y + 9, 3]] }, { kind: 'g1', fac: 'D', at: [x + 11, y + 15], post: 90 });
    },
    p(m, x, y) {
      m.fill(x + 1, y + 1, x + 14, y + 14, 'g'); m.fill(x + 7, y + 1, x + 8, y + 14, '='); m.fill(x + 1, y + 7, x + 14, y + 8, '=');
      m.many('T', [[x + 2, y + 2], [x + 5, y + 3], [x + 12, y + 2], [x + 3, y + 11], [x + 11, y + 12], [x + 13, y + 5]]);
      m.many('B', [[x + 4, y + 5], [x + 10, y + 4], [x + 2, y + 9], [x + 12, y + 10], [x + 5, y + 13], [x + 10, y + 13]]); m.set(x + 9, y + 9, 'W');
    },
    m(m, x, y) {
      m.villa(x + 1, y + 1, x + 6, y + 6, 3, { kind: 'shop', use: ['food', 'office', 'office'], signs: [pick(FOOD, x, y), '', ''] }); m.villa(x + 9, y + 1, x + 14, y + 6, 3, { kind: 'shop', use: ['store', 'office', 'office'], signs: [pick(STORE, x, y), '', ''] });
      [[x + 2, y + 9, 'R'], [x + 5, y + 9, 'B'], [x + 9, y + 9, 'G'], [x + 12, y + 9, 'R']].forEach(([a, b, c]) => m.tent(a, b, c));
      m.villa(x + 1, y + 12, x + 14, y + 14, 1, { kind: 'shop', use: ['store'], signs: ['시장'] });
      Z([x + 1, y + 7, x + 14, y + 11, 'pub']);
    },
    r(m, x, y) {
      m.villa(x + 1, y + 1, x + 6, y + 6, 3); m.villa(x + 9, y + 1, x + 14, y + 6, 2, { kind: 'shop', use: ['pc', 'office'], signs: ['당구장', ''], plate: '건달파 당구장', name: '건달파 당구장' });
      m.fill(x + 1, y + 9, x + 14, y + 14, '.'); [[x + 2, y + 10, 0], [x + 4, y + 10, 2], [x + 8, y + 10, 1], [x + 12, y + 12, 3]].forEach(([a, b, c]) => m.car(a, b, c));
      Z([x + 9, y + 1, x + 14, y + 8, 'res', null, '건달파 당구장', ['rival']]);
      Gp({ kind: 'g2', fac: 'B', at: [x + 11, y + 8], post: 90 }, { kind: 'g1', fac: 'B', route: [[x + 1, y + 8, 3], [x + 14, y + 8, 3]] });
    },
    e(m, x, y) { genBlock(m, x, y, 'dense'); },
    H(m, x, y) {
      m.villa(x + 1, y + 1, x + 14, y + 7, 2, { kind: 'shop', use: ['office', 'office'], signs: ['', ''], plate: '시립 병원', name: '병원' });
      m.villa(x + 1, y + 10, x + 6, y + 14, 2); m.fill(x + 8, y + 10, x + 14, y + 14, 'g'); m.many('T', [[x + 9, y + 11], [x + 13, y + 13]]);
    },
    P(m, x, y) {
      m.villa(x + 1, y + 1, x + 8, y + 6, 2, { kind: 'shop', use: ['office', 'office'], signs: ['', ''], plate: '지구대', name: '지구대' });
      m.fill(x + 1, y + 9, x + 14, y + 14, '.'); [[x + 3, y + 10, 0], [x + 6, y + 10, 1], [x + 9, y + 10, 2], [x + 12, y + 12, 0]].forEach(([a, b, c]) => m.car(a, b, c));
    },
    k(m, x, y) {
      m.fill(x + 3, y + 3, x + 5, y + 4, 'U'); m.set(x + 6, y + 4, ','); m.fill(x + 9, y + 8, x + 11, y + 9, 'U'); m.set(x + 8, y + 9, ',');
      m.many('H', [[x + 2, y + 12], [x + 13, y + 2]]); m.many('O', [[x + 4, y + 12], [x + 12, y + 13]]); mat(m, 'r', [[x + 6, y + 6], [x + 7, y + 6], [x + 6, y + 7]]);
      m.villa(x + 9, y + 11, x + 14, y + 14, 1, { kind: 'shop', use: ['store'], signs: ['자재'] });
    },
    q(m, x, y) {
      m.villa(x + 1, y + 1, x + 14, y + 8, 3, { kind: 'shop', use: ['office', 'office', 'vip'], signs: ['', '', ''], plate: '본부', name: '조직 본부', back: true });
      m.villa(x + 1, y + 11, x + 6, y + 14, 1, { kind: 'shop', use: ['store'], signs: [''], plate: '차고' }); m.fill(x + 8, y + 10, x + 14, y + 14, '.'); m.car(x + 10, y + 11, 1); m.car(x + 13, y + 11, 3);
      Z([x + 1, y + 1, x + 14, y + 14, 'hos', null, '조직 본부 · 적진']);
      Gp({ kind: 'g2', route: [[x + 1, y + 10, 2], [x + 14, y + 10, 2]] }, { kind: 'g1', at: [x + 7, y + 9], post: 90 }, { kind: 'g2', at: [x + 11, y + 14], post: 0 });
    }
  };
  // 강 칸 열: 세로 도로는 그대로 다리, 그 양옆은 다리 난간, 나머지는 4칸 주기 축대(다섯 주기마다 사다리)
  const riverCol = x => { for (const r of st.roadsX) { if (x >= r && x < r + 4) return 'road'; if (x === r - 1 || x === r + 4) return 'rail'; } return Math.floor(x / 4) % 5 === 2 && x % 4 === 2 ? 'ladder' : 'quay'; };
  // 블록 하나: 일반 블록(h s e)은 통째로 필지, 특수 블록은 16칸 설계 + 남은 땅 필지
  const AROUND = { w: 'dense', c: 'shop', p: 'res', m: 'shop', r: 'dense', H: 'dense', P: 'dense', k: 'res', q: 'dense' };
  function buildBlock(m, bx, by) { const [x0, y0] = B(bx, by), t = LAYOUT[by][bx]; T[t](m, x0, y0); if (AROUND[t]) fillAround(m, x0, y0, AROUND[t]); }
  const find = ch => { for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) if (LAYOUT[by][bx] === ch) return B(bx, by); return B(0, 0); };
  const ring = (bx, by, d) => { const [x0, y0] = B(bx, by), e = BS - 1, c = [[x0, y0], [x0 + e, y0], [x0 + e, y0 + e], [x0, y0 + e]]; return (d ? c.slice().reverse() : c).map(([a, b]) => [a, b, 0.5]); };
  const st = {
    id: 'cityXL', no: 'TEST', name: '밤의 도시 · 큰 도시 시험', sub: '도시 · 2배 크기 시험 구역', fee: '',
    city: true, retiredCampaign: true, study: 'city-xl', freeCityExteriors: true,
    mission: '큰 도시 시험: 공중전화에서 의뢰를 받고 도시 안에서 표적을 처치한다',
    itemName: '', itemNames: [],
    brief: '기존 도시를 가로·세로 2배로 넓힌 시험 구역이다. 차를 빼앗아 끝에서 끝까지 달려 보고, 수배가 붙었을 때 따돌릴 공간이 충분한지 확인한다.',
    W, H, start: [10, 4 + BS - 1], exit: [10, 4 + BS - 1], exitName: '', startA: 0, noRefine: true, floors: true, pspd: 1.3, gspd: 1.0, residents: 0.6, rivals: 3,
    roadsX: Array.from({ length: BX + 1 }, (_, i) => i * P), roadsY: [0, P, 2 * P, 3 * P, 3 * P + RS, 4 * P + RS, 5 * P + RS, 6 * P + RS], traffic: 84,  // 강 남쪽 둑길도 도로
    blockCount: [BX, BY], blockSize: BS,
    blockOrigin: B, signals: true, cityLife: true, gangWar: true, noPrompts: true, river: { y: RIVER_Y, rows: RIVER_ROWS, name: '청계천' }, nightShade: 0.55,
    build(m) {
      m.fill(0, 0, W - 1, H - 1, '.');
      for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) {
        const [x0, y0] = B(bx, by), e = BS - 1; m.fill(x0, y0, x0 + e, y0 + e, '='); m.fill(x0 + 1, y0 + 1, x0 + e - 1, y0 + e - 1, ',');
        buildBlock(m, bx, by);
        // 보도 소품: 맨홀·봉투·수거함을 블록마다 돌려 가며
        const k = (bx * 3 + by * 5) % 4;
        if (k === 0) m.set(x0, y0 + 9, 'W'); else if (k === 1) m.set(x0 + e, y0 + 1, 'O'); else if (k === 2) m.set(x0, y0 + 6, 'H'); else m.set(x0 + 9, y0 + e, 'W');
      }
      // 강: 축대 길('=') · 축대 벽·난간('¦') · 물('~'). 도로 칸은 다리라서 그대로 둔다
      const grid = (RIVER && RIVER.grid) || ['=', '¦', '=', '¦', '~', '~', '~', '¦', '=', '=', '='];
      for (let x = 0; x < W; x++) { const k = riverCol(x); if (k === 'road') continue;
        for (let r = 0; r < RIVER_ROWS; r++) m.set(x, RIVER_Y + r, k === 'rail' ? '¦' : k === 'ladder' && r === 1 ? '=' : grid[r]); }
    },
    zones, zoneAllow: ['crew'],
    roofs: ['cRoofA', 'cRoofG', 'cRoofB'], bricks: [1, 0, 1],
    lamps: (() => { const L = []; for (let x = 6; x < W - 2; x += 10) L.push([x, RIVER_Y, 200, 1, 0, '255,214,160', null, true], [x + 5, RIVER_Y + RIVER_ROWS - 2, 190, 1, 0, null, null, true]);  // 강: 축대 등과 다리 등 (기둥은 그림에 있다)
      for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) { const [x0, y0] = B(bx, by); L.push([x0, y0, 180, 1], [x0 + BS - 1, y0 + BS - 1, 180, 1, 0, (bx + by) % 3 === 1 ? '255,90,190' : (bx + by) % 3 === 2 ? '90,220,255' : null]); } return L; })(),
    cams: [], radios: [], contracts: [],
    // 도시 안 의뢰: 공중전화(블록 동쪽 보도 가운데)에서 의뢰를 받으면 표적이 도시 어딘가를 돈다
    hits: true,
    phones: [[0, 0], [3, 1], [6, 0], [1, 3], [5, 3], [2, 5], [7, 5], [4, 2]].map(([bx, by]) => { const [x0, y0] = B(bx, by); return [x0 + BS - 1, y0 + 9]; }),
    copBeats: [],
    guards: [], items: [], traps: [],
    well: 'manhole', kunai: 3, coins: 3,
    hints: ['도로에 선 차 옆에서 [행동] — 운전자를 끌어내고 탄다. 사람들이 보면 수배가 붙는다.', '2배 시험 구역: 의뢰 장소는 없다.']
  };
  // 블록 배치는 build 전에 한 번 돌려 구역·조직원 목록을 채운다 (build 는 같은 배치를 다시 그린다)
  // 건물 정면 설계: 판 짓기와 같은 순서로 건물마다 하나 (BLD 번호 = 배열 번호). 구매 팩 정면 · 옥상 · 한글 간판
  const FRONTS = [['frontBrick', [0, 1, 1, 1, 1], 'brick'], ['frontGlass', [1, 1, 1, 1], 'office'], ['frontSilver', [1, 1, 1], 'stone'],
    ['frontWood', [1, [0, 1, 0], [0, 1, 0], 0], 'brick'], ['frontGreen', [1, 0, 0, 0, 0, 0], 'green'], ['frontRetail', [1, 0, 0], 'stone']];
  const SIGN_KEY = { 국밥: 'gukbap', 노가리: 'nogari', 호프: 'hof', 골뱅이: 'golbaengi', 곱창: 'gopchang', 순댓국: 'sundae', 백반: 'baekban', 분식: 'bunsik', 포차: 'pocha',
    편의점: 'store', 철물: 'hardware', 공구: 'tools', 타일: 'tile', 조명: 'lighting', 인쇄: 'printshop', 전파사: 'radio', 약국: 'drug', 지물포: 'paper',
    PC방: 'pcroom', 당구장: 'billiards', 노래방: 'karaoke', 다방: 'dabang', 기원: 'baduk', 동진인쇄: 'dongjin', 선일전기: 'sunil', 백송상사: 'baeksong2', 을지공업사: 'euljigong',
    '청계 상회': 'cheonggye', '종로파 사무실': 'jongno', '건달파 당구장': 'rival', 시장: 'market', CLUB: 'club', '시립 병원': 'hospital', 지구대: 'police', 자재: 'material', '조직 본부': 'hq', 본부: 'hq', '청계파 사무실': 'cheonggye' };
  const specs = [], homeLocks = [];
  const dry = { villa(x0, y0, x1, y1, h, o = {}) {
      const i = specs.length, f = FRONTS[(x0 * 3 + y0 * 7 + i) % FRONTS.length], w = x1 - x0 + 1, txt = [o.plate, o.name, ...(o.signs || [])].find(s => s && SIGN_KEY[s]);
      // 대형 광고판: 넓은 상가는 옥상에 큰 판 + 정면에 대게 간판, 좁은 상가는 둘에 하나꼴로 정면 오른쪽에 세로 판
      const shop = o.kind === 'shop', fh = Math.max(1, Math.min(h, y1 - y0 - 1)), boards = [];
      if (!shop) homeLocks.push({ b: i, door: 'front', key: 'gold' }, { b: i, door: 'back', key: 'gold' });  // 일반 주택은 앞뒤 문이 잠겨 있다: 창문으로 들어간다
      if (shop && w >= 12) { boards.push({ image: ['can', 'chimaek', 'soju'][i % 3], mode: 'roof', x: 1 + (i % 2) * 4 }); if (fh >= 2) boards.push({ image: 'crab', mode: 'face', x: w - 6, fl: Math.min(fh - 1, 2) }); }
      else if (shop && w >= 8 && fh >= 2 && i % 2 === 1) boards.push({ image: ['chimaek', 'soju', 'can'][(i >> 1) % 3], mode: 'roof', x: 1 });
      else if (shop && fh >= 3 && i % 2 === 0) boards.push({ image: ['octopus', 'face', 'karaoke', 'octopus'][(i >> 1) % 4], mode: 'face', x: w - 2, fl: 1 });
      specs.push({ box: [x0, y0, x1, y1], h, front: f[0], windows: f[1], style: f[2], roof: i % 2 ? 'roofStone' : 'roofMetal', boards: boards.length ? boards : null,
        ad: txt && SIGN_KEY[txt] && (!shop || o.plate || o.name) ? { image: SIGN_KEY[txt], x: 1, fl: h > 1 ? 1 : 0, w: Math.min(w - (boards.some(d => d.mode === 'face') ? 4 : 2), 4), h: 1 } : null }); },
    fill() {}, set() {}, many() {}, car() {}, tent() {}, get() { return '.'; } };
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) buildBlock(dry, bx, by);
  collecting = false;
  st.locks = homeLocks; st.studyFacades = true; st.referenceBuildings = specs; st.studyStyles = specs.map(s => s.style);
  st.referenceRow = function (i, fl) { const s = this.referenceBuildings[i], n = s.windows.length; return fl === s.h - 1 ? 0 : fl < n - 1 ? n - 1 - fl : 1; };
  st.referenceWindow = function (i, tx, fl) { const s = this.referenceBuildings[i], row = s.windows[this.referenceRow(i, fl)]; return Array.isArray(row) ? !!row[(tx - s.box[0] - 1) % 3] : !!row; };
  const [hx, hy] = find('H'), [px, py] = find('P');
  st.hospital = [hx + 6, hy + 8]; st.police = [px + 4, py];
  // 순찰 경찰: 지구대 블록마다 둘레 보도 하나씩, 그리고 지도 중앙 블록 하나
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) if (LAYOUT[by][bx] === 'P') st.copBeats.push(ring(bx, by, 0));
  st.copBeats.push(ring(3, 2, 1), ring(5, 4, 0));
  // 행인: 블록 둘레 보도 (기존 도시와 같은 규칙) · 공원과 시장 사람들 · 조직원
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) {
    st.guards.push({ kind: 'civ', route: ring(bx, by, (bx + by) % 2) });
    if ((bx * 3 + by) % 2 === 0) { const r = ring(bx, by, (bx + by + 1) % 2); st.guards.push({ kind: 'civ', body: 'fBob', route: r.slice(2).concat(r.slice(0, 2)) }); }
    const [x0, y0] = B(bx, by), t = LAYOUT[by][bx];
    if (t === 'p') st.guards.push({ kind: 'civ', wander: [x0 + 1, y0 + 1, x0 + 14, y0 + 14], at: [x0 + 7, y0 + 4] });
    if (t === 'm') st.guards.push({ kind: 'civ', body: 'fTail', wander: [x0 + 1, y0 + 8, x0 + 14, y0 + 10], at: [x0 + 8, y0 + 10] });
  }
  // 일반인을 더: 블록마다 보도를 반대로 도는 사람 하나와, 다른 모퉁이에서 출발하는 사람 하나 (조직보다 훨씬 많게)
  const BODIES = ['fBob', 'fTail', 'fLong', undefined, undefined, 'jacket'];
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) {
    const r = ring(bx, by, (bx + by + 1) % 2), k = (bx * 5 + by * 3) % 4;
    st.guards.push({ kind: 'civ', body: BODIES[(bx + by * 3) % BODIES.length], route: r.slice(k).concat(r.slice(0, k)) });
    const r2 = ring(bx, by, (bx + by) % 2), k2 = (k + 2) % 4;
    st.guards.push({ kind: 'civ', body: BODIES[(bx * 2 + by + 1) % BODIES.length], route: r2.slice(k2).concat(r2.slice(0, k2)) });
  }
  // 길 건너는 사람: 블록마다 하나, 오른쪽(또는 아래쪽) 이웃 블록 모퉁이까지 횡단보도로 건너 오간다
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) {
    const [x0, y0] = B(bx, by), e = BS - 1, right = bx + 1 < BX && (bx + by) % 2 === 0, down = !right && by + 1 < BY && by !== 2;
    if (!right && !down) continue; const [nx0, ny0] = B(right ? bx + 1 : bx, down ? by + 1 : by);
    const a = [x0 + e, y0 + e], c = right ? [nx0, y0 + e] : [x0 + e, ny0];  // 블록 모퉁이 줄 = 교차로 앞 횡단보도
    st.guards.push({ kind: 'civ', body: BODIES[(bx * 3 + by) % BODIES.length], route: [[a[0], a[1], 2], [c[0], c[1], 2]] });
  }
  // 조직끼리 마주치게: 조직마다 두 패가 자기 동네와 다른 조직 동네 사이를 오간다 (경찰이 보면 싸움을 말린다)
  const homes = { A: 'q', B: 'r', C: 'w', D: 'c' }, keys = Object.keys(homes);
  keys.forEach((f, i) => { const [hx0, hy0] = find(homes[f]), [ox0, oy0] = find(homes[keys[(i + 1) % 4]]), [px0, py0] = find(homes[keys[(i + 3) % 4]]);
    st.guards.push({ kind: 'g2', fac: f, route: [[hx0, hy0 + BS - 1, 3], [ox0 + BS - 1, oy0, 3]], radio: false }, { kind: 'g1', fac: f, route: [[hx0 + BS - 1, hy0, 3], [px0, py0 + BS - 1, 3]], radio: false }); });
  // 청계천 산책로: 북쪽 축대 길과 남쪽 둔치를 걷는 사람들
  for (let i = 0; i < 8; i++) { const x0 = 6 + i * 28, y = i % 2 ? RIVER_Y + RIVER_ROWS - 2 : RIVER_Y;
    st.guards.push({ kind: 'civ', body: i % 2 ? 'fBob' : undefined, route: [[x0, y, 2], [Math.min(W - 6, x0 + 34), y, 2]] }); }
  st.guards.push(...gangs);
  return st;
})()] : []),
