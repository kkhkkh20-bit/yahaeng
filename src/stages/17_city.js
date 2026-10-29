// ───────── 도시 (시제품): GTA2식 자유 이동. 도로 격자 위로 차가 다니고, 차를 빼앗아 몰 수 있다. 의뢰 장소에 들어가면 의뢰가 시작된다
// 블록 12개(가로 4 × 세로 3). 블록마다 16칸, 도로는 4칸(양방향 2차선, 우측 통행). 블록 가장자리 한 칸은 보도
// 의뢰 조직(A) 구역: 북동 창고 · 남동 본부 · 건달파(B)는 거리를 돈다. 주민은 보도를 따라 블록을 돈다
{
  id: 'city', no: '도시', name: '밤의 도시', sub: '도시 · 자유 이동 (시제품)', fee: '',
  city: true, mission: '도시를 돌아다니다 의뢰 장소(빨간 표시)에 들어가 의뢰를 받는다. 차를 빼앗아 몰 수 있다',
  itemName: '', itemNames: [],
  brief: '도시는 열려 있다. 보도는 행인의 길, 차도는 차의 길이다. 차를 세우고 운전자를 끌어내 몰 수 있다 — 사람들이 보면 수배가 붙는다. 수배 별이 붙으면 경찰이 쫓아온다. 시야에서 벗어나 버티면 별이 내려간다. 빨간 표시가 의뢰 장소다.',
  W: 84, H: 64, start: [10, 19], exit: [10, 19], exitName: '', startA: 0, noRefine: true, floors: true, pspd: 1.3, gspd: 1.0, residents: 0, rivals: 3,
  roadsX: [0, 20, 40, 60, 80], roadsY: [0, 20, 40, 60], traffic: 16,
  build(m) {
    m.fill(0, 0, 83, 63, '.');
    const B = (bx, by) => [4 + bx * 20, 4 + by * 20];
    // 블록: 바깥 한 칸 보도, 안쪽은 흙·콘크리트
    for (let by = 0; by < 3; by++) for (let bx = 0; bx < 4; bx++) { const [x0, y0] = B(bx, by); m.fill(x0, y0, x0 + 15, y0 + 15, '='); m.fill(x0 + 1, y0 + 1, x0 + 14, y0 + 14, ','); }
    const q4 = (x0, y0, f) => [[x0 + 1, y0 + 1, x0 + 6, y0 + 6], [x0 + 9, y0 + 1, x0 + 14, y0 + 6], [x0 + 1, y0 + 9, x0 + 6, y0 + 14], [x0 + 9, y0 + 9, x0 + 14, y0 + 14]].forEach((r, i) => f && f(r, i));
    let [x, y] = B(0, 0);  // 북서: 주택가
    m.villa(x + 1, y + 1, x + 6, y + 6, 2); m.villa(x + 9, y + 1, x + 14, y + 6, 3); m.villa(x + 1, y + 9, x + 6, y + 14, 2, { kind: 'house' }); m.villa(x + 9, y + 9, x + 14, y + 14, 2);
    [x, y] = B(1, 0);  // 북쪽 상가
    m.villa(x + 1, y + 1, x + 14, y + 6, 2, { kind: 'shop', use: ['store', 'office'], signs: ['편의점', ''], name: '상가' });
    m.villa(x + 1, y + 9, x + 6, y + 14, 1, { kind: 'shop', use: ['food'], signs: ['국밥'] }); m.villa(x + 9, y + 9, x + 14, y + 14, 2, { kind: 'shop', use: ['pc', 'office'], signs: ['PC방', ''] });
    [x, y] = B(2, 0);  // 북동: 조직 창고 (의뢰 1)
    m.villa(x + 1, y + 1, x + 14, y + 6, 1, { kind: 'shop', use: ['store'], signs: ['창고 상회'], name: '창고 상회', back: true });
    m.villa(x + 1, y + 9, x + 8, y + 14, 2, { kind: 'shop', use: ['office', 'office'], signs: ['', ''], plate: '사무동', name: '사무동' });
    m.fill(x + 10, y + 9, x + 14, y + 14, '.'); m.car(x + 11, y + 10, 1); m.car(x + 13, y + 10, 3);
    [x, y] = B(3, 0);  // 클럽 거리
    m.villa(x + 1, y + 1, x + 14, y + 8, 2, { kind: 'shop', use: ['club', 'vip'], signs: ['CLUB', ''], name: '클럽' });
    m.villa(x + 1, y + 10, x + 6, y + 14, 1, { kind: 'shop', use: ['food'], signs: ['포차'] }); m.villa(x + 9, y + 10, x + 14, y + 14, 2, { kind: 'house' });
    [x, y] = B(0, 1);  // 공원: 나무·화단 (숨을 곳)
    m.fill(x + 1, y + 1, x + 14, y + 14, 'g'); m.fill(x + 7, y + 1, x + 8, y + 14, '='); m.fill(x + 1, y + 7, x + 14, y + 8, '=');
    m.many('T', [[x + 2, y + 2], [x + 5, y + 3], [x + 12, y + 2], [x + 3, y + 11], [x + 11, y + 12], [x + 13, y + 5]]);
    m.many('B', [[x + 4, y + 5], [x + 10, y + 4], [x + 2, y + 9], [x + 12, y + 10], [x + 5, y + 13], [x + 10, y + 13]]); m.set(x + 9, y + 9, 'W');
    [x, y] = B(1, 1);  // 시장 골목: 노점 천막
    m.villa(x + 1, y + 1, x + 6, y + 6, 2, { kind: 'shop', use: ['food', 'office'], signs: ['분식', ''] }); m.villa(x + 9, y + 1, x + 14, y + 6, 2);
    [[x + 2, y + 9, 'R'], [x + 5, y + 9, 'B'], [x + 9, y + 9, 'G'], [x + 12, y + 9, 'R']].forEach(([a, b, c]) => m.tent(a, b, c));
    m.villa(x + 1, y + 12, x + 14, y + 14, 1, { kind: 'shop', use: ['store'], signs: ['시장'] });
    [x, y] = B(2, 1);  // 건달파 동네: 빌라와 주차장
    m.villa(x + 1, y + 1, x + 6, y + 6, 3); m.villa(x + 9, y + 1, x + 14, y + 6, 2, { kind: 'shop', use: ['pc', 'office'], signs: ['당구장', ''] });
    m.fill(x + 1, y + 9, x + 14, y + 14, '.'); [[x + 2, y + 10, 0], [x + 4, y + 10, 2], [x + 8, y + 10, 1], [x + 12, y + 12, 3]].forEach(([a, b, c]) => m.car(a, b, c));
    [x, y] = B(3, 1);  // 동쪽 주택
    q4(x, y, (r, i) => m.villa(r[0], r[1], r[2], r[3], 2 + (i % 2), i === 2 ? { kind: 'house' } : {}));
    [x, y] = B(0, 2);  // 병원 (쓰러지면 여기서 깨어난다)
    m.villa(x + 1, y + 1, x + 14, y + 7, 2, { kind: 'shop', use: ['office', 'office'], signs: ['', ''], plate: '시립 병원', name: '병원' });
    m.villa(x + 1, y + 10, x + 6, y + 14, 2); m.fill(x + 8, y + 10, x + 14, y + 14, 'g'); m.many('T', [[x + 9, y + 11], [x + 13, y + 13]]);
    [x, y] = B(1, 2);  // 경찰 지구대 + 주차장
    m.villa(x + 1, y + 1, x + 8, y + 6, 2, { kind: 'shop', use: ['office', 'office'], signs: ['', ''], plate: '지구대', name: '지구대' });
    m.fill(x + 1, y + 9, x + 14, y + 14, '.'); [[x + 3, y + 10, 0], [x + 6, y + 10, 1], [x + 9, y + 10, 2], [x + 12, y + 12, 0]].forEach(([a, b, c]) => m.car(a, b, c));
    [x, y] = B(2, 2);  // 공사장·컨테이너
    m.fill(x + 3, y + 3, x + 5, y + 4, 'U'); m.set(x + 6, y + 4, 'L'); m.fill(x + 9, y + 8, x + 11, y + 9, 'U'); m.set(x + 8, y + 9, 'L');
    m.many('H', [[x + 2, y + 12], [x + 13, y + 2]]); m.many('O', [[x + 4, y + 12], [x + 12, y + 13]]); mat(m, 'r', [[x + 6, y + 6], [x + 7, y + 6], [x + 6, y + 7]]);
    m.villa(x + 9, y + 11, x + 14, y + 14, 1, { kind: 'shop', use: ['store'], signs: ['자재'] });
    [x, y] = B(3, 2);  // 조직 본부
    m.villa(x + 1, y + 1, x + 14, y + 8, 3, { kind: 'shop', use: ['office', 'office', 'vip'], signs: ['', '', ''], plate: '본부', name: '조직 본부', back: true });
    m.villa(x + 1, y + 11, x + 6, y + 14, 1, { kind: 'shop', use: ['store'], signs: [''], plate: '차고' }); m.fill(x + 8, y + 10, x + 14, y + 14, '.'); m.car(x + 10, y + 11, 1); m.car(x + 13, y + 11, 3);
    // 맨홀 (도로 한가운데 말고 보도)
    m.many('W', [[24, 13], [44, 33], [64, 53], [4, 44]]);
    m.many('O', [[19, 5], [39, 25], [59, 45]]); m.many('H', [[24, 30], [63, 9]]);
  },
  // 구역: 거리·가게 1층은 공개. 조직 창고·본부는 조직원만
  zones: [[25, 5, 38, 18, 'pub'], [65, 5, 78, 11, 'pub'], [5, 45, 18, 51, 'pub'], [25, 25, 30, 30, 'pub'], [25, 36, 38, 38, 'pub'],
          [45, 5, 58, 18, 'res', null, '창고 상회 · 조직원만'], [65, 45, 78, 58, 'hos', null, '조직 본부 · 적진']],
  zoneAllow: ['crew'],
  roofs: ['cRoofA', 'cRoofG', 'cRoofB'], bricks: [1, 0, 1],
  // 가로등: 블록 모서리마다 (셋 중 하나는 네온 빛)
  lamps: (() => { const L = []; for (let by = 0; by < 3; by++) for (let bx = 0; bx < 4; bx++) { const x0 = 4 + bx * 20, y0 = 4 + by * 20; L.push([x0, y0, 180, 1], [x0 + 15, y0 + 15, 180, 1, 0, (bx + by) % 3 === 1 ? '255,90,190' : (bx + by) % 3 === 2 ? '90,220,255' : null]); } return L; })(),
  cams: [], radios: [],
  // 의뢰 장소: 이 앞에서 [행동] → 의뢰가 시작된다 (끝나면 도시로 돌아온다)
  contracts: [{ id: 'm1', at: [52, 19], name: '창고 상회' }, { id: 'm2', at: [70, 12], name: '클럽' }, { id: 'm3', at: [9, 4], name: '주택가 빌라' },
              { id: 'm4', at: [30, 19], name: '상가' }, { id: 'm5', at: [70, 44], name: '조직 본부' }, { id: 'm6', at: [50, 59], name: '공사장' }],
  hospital: [10, 52], police: [28, 44],
  guards: (() => {
    const out = [], ring = (bx, by, d) => { const x0 = 4 + bx * 20, y0 = 4 + by * 20, c = [[x0, y0], [x0 + 15, y0], [x0 + 15, y0 + 15], [x0, y0 + 15]]; const r = d ? c.slice().reverse() : c; return r.map(([a, b]) => [a, b, 0.5]); };
    // 행인: 블록 둘레 보도를 돈다 (반은 반대 방향)
    for (let by = 0; by < 3; by++) for (let bx = 0; bx < 4; bx++) { out.push({ kind: 'civ', route: ring(bx, by, (bx + by) % 2) }); if ((bx * 3 + by) % 2 === 0) out.push({ kind: 'civ', body: 'fBob', route: ring(bx, by, (bx + by + 1) % 2).slice(2).concat(ring(bx, by, (bx + by + 1) % 2).slice(0, 2)) }); }
    // 공원·시장 사람들
    out.push({ kind: 'civ', wander: [5, 25, 18, 38], at: [11, 28] }, { kind: 'civ', body: 'fTail', wander: [25, 33, 38, 35], at: [32, 35] }, { kind: 'civ', wander: [5, 25, 18, 38], at: [11, 33] });
    // 의뢰 조직(A): 창고 앞 · 본부 마당
    out.push({ kind: 'g1', route: [[54, 13, 2], [58, 17, 2]] }, { kind: 'g2', at: [53, 17], post: 90 }, { kind: 'g2', route: [[65, 54, 2], [78, 54, 2]] }, { kind: 'g1', at: [71, 53], post: 90 }, { kind: 'g2', at: [75, 58], post: 0 });
    return out;
  })(),
  items: [], traps: [],
  well: 'manhole', kunai: 3, coins: 3,
  hints: ['도로에 선 차 옆에서 [행동] — 운전자를 끌어내고 탄다. 사람들이 보면 수배가 붙는다.', '빨간 표시는 의뢰 장소다. 앞에서 [행동]을 누르면 의뢰가 시작된다.']
},
