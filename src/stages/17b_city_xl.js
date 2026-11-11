// ───────── 도시 2배 시험 구역: 기존 도시(4×3 블록, 84×64칸)의 블록 설계를 그대로 써서 8×6 블록(168×128칸)으로 넓혔다.
// 가로·세로 각 2배라 같은 속도로 끝에서 끝까지 두 배 걸린다. 캠페인·저장과 분리: 주소에 ?study=city-xl 일 때만 들어간다.
// 블록 하나 = 16칸(바깥 한 칸 보도), 도로 4칸. 블록 종류는 기존 도시 12종을 다시 배치했다.
...(new URLSearchParams(location.search).get('study') === 'city-xl' ? [(() => {
  const BX = 8, BY = 6, W = BX * 20 + 8, H = BY * 20 + 8;
  const B = (bx, by) => [4 + bx * 20, 4 + by * 20];
  // 블록 배치 (기존 도시 종류): h 주택가 · s 상가 · w 조직 창고 · c 클럽 거리 · p 공원 · m 시장 · r 건달파 동네 · e 주택 · H 병원 · P 지구대 · k 공사장 · q 조직 본부
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
    h(m, x, y) { m.villa(x + 1, y + 1, x + 6, y + 6, 2); m.villa(x + 9, y + 1, x + 14, y + 6, 3); m.villa(x + 1, y + 9, x + 6, y + 14, 2, { kind: 'house' }); m.villa(x + 9, y + 9, x + 14, y + 14, 2); },
    s(m, x, y) {
      m.villa(x + 1, y + 1, x + 14, y + 6, 2, { kind: 'shop', use: ['store', 'office'], signs: ['편의점', ''], name: '상가' });
      m.villa(x + 1, y + 9, x + 6, y + 14, 1, { kind: 'shop', use: ['food'], signs: ['국밥'] }); m.villa(x + 9, y + 9, x + 14, y + 14, 2, { kind: 'shop', use: ['pc', 'office'], signs: ['PC방', ''] });
      Z([x + 1, y + 1, x + 14, y + 14, 'pub']);
    },
    w(m, x, y) {
      m.villa(x + 1, y + 1, x + 14, y + 6, 1, { kind: 'shop', use: ['store'], signs: ['창고 상회'], name: '창고 상회', back: true });
      m.villa(x + 1, y + 9, x + 8, y + 14, 2, { kind: 'shop', use: ['office', 'office'], signs: ['', ''], plate: '사무동', name: '사무동' });
      m.fill(x + 10, y + 9, x + 14, y + 14, '.'); m.car(x + 11, y + 10, 1); m.car(x + 13, y + 10, 3);
      Z([x + 1, y + 1, x + 14, y + 14, 'res', null, '창고 상회 · 조직원만']);
      Gp({ kind: 'g1', route: [[x + 10, y + 9, 2], [x + 14, y + 13, 2]] }, { kind: 'g2', at: [x + 9, y + 13], post: 90 });
    },
    c(m, x, y) {
      m.villa(x + 1, y + 1, x + 14, y + 8, 2, { kind: 'shop', use: ['club', 'vip'], signs: ['CLUB', ''], name: '클럽' });
      m.villa(x + 1, y + 10, x + 6, y + 14, 1, { kind: 'shop', use: ['food'], signs: ['포차'] }); m.villa(x + 9, y + 10, x + 14, y + 14, 2, { kind: 'house' });
      Z([x + 1, y + 1, x + 14, y + 7, 'pub']);
    },
    p(m, x, y) {
      m.fill(x + 1, y + 1, x + 14, y + 14, 'g'); m.fill(x + 7, y + 1, x + 8, y + 14, '='); m.fill(x + 1, y + 7, x + 14, y + 8, '=');
      m.many('T', [[x + 2, y + 2], [x + 5, y + 3], [x + 12, y + 2], [x + 3, y + 11], [x + 11, y + 12], [x + 13, y + 5]]);
      m.many('B', [[x + 4, y + 5], [x + 10, y + 4], [x + 2, y + 9], [x + 12, y + 10], [x + 5, y + 13], [x + 10, y + 13]]); m.set(x + 9, y + 9, 'W');
    },
    m(m, x, y) {
      m.villa(x + 1, y + 1, x + 6, y + 6, 2, { kind: 'shop', use: ['food', 'office'], signs: ['분식', ''] }); m.villa(x + 9, y + 1, x + 14, y + 6, 2);
      [[x + 2, y + 9, 'R'], [x + 5, y + 9, 'B'], [x + 9, y + 9, 'G'], [x + 12, y + 9, 'R']].forEach(([a, b, c]) => m.tent(a, b, c));
      m.villa(x + 1, y + 12, x + 14, y + 14, 1, { kind: 'shop', use: ['store'], signs: ['시장'] });
      Z([x + 1, y + 7, x + 14, y + 11, 'pub']);
    },
    r(m, x, y) {
      m.villa(x + 1, y + 1, x + 6, y + 6, 3); m.villa(x + 9, y + 1, x + 14, y + 6, 2, { kind: 'shop', use: ['pc', 'office'], signs: ['당구장', ''] });
      m.fill(x + 1, y + 9, x + 14, y + 14, '.'); [[x + 2, y + 10, 0], [x + 4, y + 10, 2], [x + 8, y + 10, 1], [x + 12, y + 12, 3]].forEach(([a, b, c]) => m.car(a, b, c));
    },
    e(m, x, y) { [[x + 1, y + 1, x + 6, y + 6], [x + 9, y + 1, x + 14, y + 6], [x + 1, y + 9, x + 6, y + 14], [x + 9, y + 9, x + 14, y + 14]].forEach((r, i) => m.villa(r[0], r[1], r[2], r[3], 2 + (i % 2), i === 2 ? { kind: 'house' } : {})); },
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
  const find = ch => { for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) if (LAYOUT[by][bx] === ch) return B(bx, by); return B(0, 0); };
  const ring = (bx, by, d) => { const [x0, y0] = B(bx, by), c = [[x0, y0], [x0 + 15, y0], [x0 + 15, y0 + 15], [x0, y0 + 15]]; return (d ? c.slice().reverse() : c).map(([a, b]) => [a, b, 0.5]); };
  const st = {
    id: 'cityXL', no: 'TEST', name: '밤의 도시 · 큰 도시 시험', sub: '도시 · 2배 크기 시험 구역', fee: '',
    city: true, retiredCampaign: true, study: 'city-xl',
    mission: '큰 도시 시험: 공중전화에서 의뢰를 받고 도시 안에서 표적을 처치한다',
    itemName: '', itemNames: [],
    brief: '기존 도시를 가로·세로 2배로 넓힌 시험 구역이다. 차를 빼앗아 끝에서 끝까지 달려 보고, 수배가 붙었을 때 따돌릴 공간이 충분한지 확인한다.',
    W, H, start: [10, 19], exit: [10, 19], exitName: '', startA: 0, noRefine: true, floors: true, pspd: 1.3, gspd: 1.0, residents: 0, rivals: 6,
    roadsX: Array.from({ length: BX + 1 }, (_, i) => i * 20), roadsY: Array.from({ length: BY + 1 }, (_, i) => i * 20), traffic: 48,
    build(m) {
      m.fill(0, 0, W - 1, H - 1, '.');
      for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) {
        const [x0, y0] = B(bx, by); m.fill(x0, y0, x0 + 15, y0 + 15, '='); m.fill(x0 + 1, y0 + 1, x0 + 14, y0 + 14, ',');
        T[LAYOUT[by][bx]](m, x0, y0);
        // 보도 소품: 맨홀·봉투·수거함을 블록마다 돌려 가며
        const k = (bx * 3 + by * 5) % 4;
        if (k === 0) m.set(x0, y0 + 9, 'W'); else if (k === 1) m.set(x0 + 15, y0 + 1, 'O'); else if (k === 2) m.set(x0, y0 + 6, 'H'); else m.set(x0 + 9, y0 + 15, 'W');
      }
    },
    zones, zoneAllow: ['crew'],
    roofs: ['cRoofA', 'cRoofG', 'cRoofB'], bricks: [1, 0, 1],
    lamps: (() => { const L = []; for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) { const [x0, y0] = B(bx, by); L.push([x0, y0, 180, 1], [x0 + 15, y0 + 15, 180, 1, 0, (bx + by) % 3 === 1 ? '255,90,190' : (bx + by) % 3 === 2 ? '90,220,255' : null]); } return L; })(),
    cams: [], radios: [], contracts: [],
    // 도시 안 의뢰: 공중전화(블록 동쪽 보도 가운데)에서 의뢰를 받으면 표적이 도시 어딘가를 돈다
    hits: true,
    phones: [[0, 0], [3, 1], [6, 0], [1, 3], [5, 3], [2, 5], [7, 5], [4, 2]].map(([bx, by]) => [4 + bx * 20 + 15, 4 + by * 20 + 7]),
    copBeats: [],
    guards: [], items: [], traps: [],
    well: 'manhole', kunai: 3, coins: 3,
    hints: ['도로에 선 차 옆에서 [행동] — 운전자를 끌어내고 탄다. 사람들이 보면 수배가 붙는다.', '2배 시험 구역: 의뢰 장소는 없다.']
  };
  // 블록 배치는 build 전에 한 번 돌려 구역·조직원 목록을 채운다 (build 는 같은 배치를 다시 그린다)
  const dry = { villa() {}, fill() {}, set() {}, many() {}, car() {}, tent() {}, get() { return '.'; } };
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) { const [x0, y0] = B(bx, by); T[LAYOUT[by][bx]](dry, x0, y0); }
  collecting = false;
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
  st.guards.push(...gangs);
  return st;
})()] : []),
