// ───────── 임무 4 (어려움): 대청소 — 표적 둘, 금고 둘, 카드 셋이 얽힌다
{
  id: 'm4', no: '04', name: '대청소', sub: '임무 4 · 어려움 · 암살 2 + 훔치기 2',
  mission: '표적 둘(큰길 수금원 · 클럽 VIP) 처치, 창고·사무동 금고의 물건 회수 후 서쪽 큰길 끝으로',
  itemName: '현금 가방', itemNames: ['현금 가방', '계약서'],
  brief: '수금원은 빨강 카드를 지니고 경호원과 큰길을 돈다. 창고 금고(빨강)에 현금 가방과 파랑 카드. 파랑은 클럽 VIP룸 뒷문을 연다. 사무동 금고(초록)에 계약서 — 초록 카드는 남쪽 빌라 3층에 있다. 창고 금고와 VIP룸 천장엔 환풍구가 지난다.',
  W: 48, H: 28, start: [47, 26], exit: [0.5, 13.5], startA: Math.PI, noRefine: true, floors: true, pspd: 1.3, gspd: 1.15, residents: 0,
  build(m) {
    m.fill(0, 0, 47, 27, '.'); for (let x = 0; x < 48; x++) m.set(x, 0, '#');
    m.fill(0, 11, 47, 11, '='); m.fill(0, 16, 47, 16, '='); m.fill(0, 25, 47, 27, '=');
    m.villa(1, 2, 8, 10, 2, { kind: 'house' });                                                                       // 0
    m.villa(10, 2, 20, 10, 1, { kind: 'shop', use: ['vault'], signs: ['창고'], name: '창고', back: true });              // 1 금고(빨강)
    m.villa(22, 2, 32, 10, 2, { kind: 'shop', use: ['vault', 'office'], signs: ['', ''], plate: '사무동', name: '사무동', back: true });  // 2 금고(초록)
    m.villa(34, 2, 46, 10, 2, { kind: 'shop', use: ['vip', 'office'], signs: ['CLUB', ''], name: '클럽', back: true });  // 3 VIP(파랑 뒷문)
    m.villa(1, 17, 12, 24, 3, { name: '빌라' });                                                                       // 4 3층에 초록 카드
    m.villa(14, 17, 20, 24, 2, { kind: 'house' });                                                                    // 5
    m.villa(22, 17, 33, 24, 1, { kind: 'shop', use: ['food'], signs: ['포차'] });                                      // 6
    m.villa(35, 17, 42, 24, 2, { kind: 'house' });                                                                    // 7
    m.fill(44, 17, 47, 24, ','); m.many('T', [[45, 18], [46, 22]]); m.many('B', [[44, 20], [47, 17]]);
    m.many('H', [[9, 1], [21, 1], [33, 1], [13, 17], [34, 17]]); m.many('O', [[0, 17], [43, 17]]);
    m.many('W', [[6, 13], [27, 1], [40, 26], [17, 26]]); m.set(21, 16, 'F');
    mat(m, 'p', [[15, 14], [16, 14], [36, 13]]); mat(m, 'x', [[21, 2], [21, 3], [33, 2]]); mat(m, 'r', [[44, 23], [45, 23], [46, 24]]);
    [[24, 12, 1], [38, 14, 3]].forEach(([x, y, c]) => m.car(x, y, c));
    // 큰길을 컨테이너 더미가 끊는다: 위아래로 꺾어 지나가야 한다 (컨테이너 위로 넘을 수도)
    m.fill(14, 12, 16, 13, 'U'); m.set(17, 12, 'L'); m.fill(28, 14, 30, 15, 'U'); m.set(27, 15, 'L'); m.fill(40, 12, 41, 13, 'U'); m.set(42, 13, 'L');
    m.fill(12, 11, 12, 14, '#'); m.fill(36, 13, 36, 16, '#');                                                          // 담이 길을 끊는다
    // 남쪽 건물 사이 골목: 빗장 쪽문 (남쪽에서만 푼다) · 정원 담장
    m.set(13, 19, '.'); m.set(21, 19, '.');
    m.fill(43, 17, 43, 24, '#'); m.set(43, 22, ',');
  },
  planks: [[33, 5, 33, 5, 2], [21, 5, 21, 5, 2]],
  gates: [{ at: [13, 19], open: 's' }, { at: [21, 19], open: 's' }, { at: [43, 22], open: 'e' }],
  wires: [], drops: [],
  roofs: ['cRoofA', 'cRoofG', 'cRoofB', 'cRoofA', 'cRoofG', 'cRoofB', 'cRoofA', 'cRoofG'], bricks: [1, 0, 1, 0, 1, 0, 1, 0],
  ventB: [{ b: 1, at: [15, 4] }, { b: 3, at: [41, 5] }], disguise: true,
  shift: { every: 80, first: 100, add: [{ kind: 'g2', route: [[2, 13, 2], [45, 13, 2]] }, { kind: 'g1', route: [[46, 2, 2], [46, 24, 2]] }, { kind: 'g2', route: [[9, 1, 2], [33, 1, 2]] }], msg: '교대 시간 — 순찰이 하나 늘었다' },
  challenges: ['ghost', 'clean', 'nobody', 'fast'], fastT: 480,
  locks: [{ b: 1, door: 'vault', key: 'red' }, { b: 2, door: 'vault', key: 'green' }, { b: 3, door: 'vipBack', key: 'blue' }],
  keyItems: [{ key: 'blue', pos: [12, 5], fl: 0 }, { key: 'green', b: 4, fl: 2, at: 'bed', alt: [{ b: 4, fl: 2, at: 'room2' }, { b: 7, fl: 1, at: 'bed' }] }],
  well: 'manhole', kunai: 4, coins: 3, reinf: [47, 13],
  lamps: [[8, 11, 160, 1], [20, 11, 170, 1, 0, '255,90,190'], [33, 11, 170, 1, 0, '90,220,255'], [44, 11, 160, 1], [8, 16, 150, 1], [33, 16, 150, 1, 0, '255,60,170']],
  fuse: [21, 16, 21, 15],
  cams: [[21, 12, 90, 70], [34, 1, 180, 40]],
  guards: [
    { kind: 't', target: true, route: [[10, 13, 2], [33, 13, 2], [33, 14, 1], [10, 14, 1]], key: 'red' },   // 0 수금원 — 빨강 카드
    { kind: 'g2', follow: 0 },                                                   // 1 수금원 경호
    { kind: 't', target: true, b: 3, fl: 0, at: 'V', post: 180 },                // 2 VIP
    { kind: 'g2', b: 3, fl: 0, at: 'VD', post: 90, elite: true },                // 3 VIP 앞문 정예
    { kind: 'g1', b: 1, at: 'VB', post: 90 },                                    // 4 창고 금고 앞
    { kind: 'g2', b: 2, at: 'VB', post: 90 },                                    // 5 사무동 금고 앞
    { kind: 'g1', b: 2, fl: 1, patrol: true },                                   // 6
    { kind: 'dog', route: [[2, 1, 1.5], [46, 1, 1.5]] },                          // 7 뒷골목 개
    { kind: 'g2', b: 4, fl: 2, at: 'L', post: 0 },                               // 8 빌라 3층
    { kind: 'g1', b: 4, patrol: true },                                          // 9
    { kind: 'g2', at: [45, 12], post: 180, lookout: true },                      // 10 동쪽 망꾼
    { kind: 'g1', route: [[2, 15, 2], [45, 15, 2]] },                            // 11 큰길 순찰
    { kind: 'g2', b: 4, fl: 1, patrol: true }
  ],
  items: [{ b: 1, fl: 0, at: 'VA' }, { b: 2, fl: 0, at: 'VA' }],
  hints: ['수금원을 쓰러뜨리면 빨강 카드를 떨어뜨린다. 경호원이 붙어 다닌다 — 둘을 떼어 놓거나 어둠에서 한꺼번에.', '큰길 두꺼비집을 내리면 가로등이 꺼진다. 고치러 오는 자경대원을 조심.', '창고 금고와 VIP룸은 옥상 환풍구로도 들어간다.']
},
