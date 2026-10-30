// ───────── 임무 4 (어려움): 대청소 — 표적 둘, 금고 둘, 카드 셋이 얽힌다
{
  id: 'm4', no: '04', name: '대청소', sub: '의뢰 02', fee: '150만',
  mission: '수금원·VIP 처치 · 창고 현금과 사무동 계약서 회수 후 탈출',
  itemName: '현금 가방', itemNames: ['현금 가방', '계약서'],
  brief: '큰길·포차·남쪽 골목은 사람들이 다니는 거리다 — 걸으면 아무도 신경 쓰지 않는다. 창고·사무동·클럽·빌라·뒷골목은 조직원만 다닌다. 수금원은 빨간 카드키를 지니고 경호원과 큰길을 돈다. 창고 금고는 빨간 카드키로 열린다. 금고 안에는 현금 가방과 VIP룸 뒷문용 파란 카드키가 있다. 사무동 출입 비밀번호는 북서쪽 폐사무소 연락책의 메모에 있다. 사무동 2층 보안실에서 초록 카드키를 확보한 뒤 1층 금고의 계약서를 챙긴다. 남쪽 공터의 차량·컨테이너 뒤에는 숨을 수 있고, 하수구로 탈출할 수 있다. 창고 금고와 VIP룸 천장엔 환풍구가 지난다. 신원이 CCTV에 녹화되면 보안실에서 기록을 지워야 탈출할 수 있다. 카메라를 피하거나 먼저 꺼 두면 기록 삭제는 필요 없다.',
  W: 48, H: 28, start: [47, 26], exit: [0.5, 13.5], startA: Math.PI, noRefine: true, floors: true, pspd: 1.3, gspd: 1.15, residents: 0,
  heightCueBuildings: [2, 3, 4],
  // 구역: 큰길·포차·남쪽 골목은 공개(기본). 건물 안과 북쪽 뒷골목은 조직원만
  zones: [[1, 2, 8, 10, 'res', null, '폐사무소 · 연락책 거점', ['crew']], [10, 2, 20, 10, 'res', null, '창고 · 조직원만'], [22, 2, 32, 10, 'res', null, '사무동 · 조직원만'], [34, 2, 46, 10, 'res', null, '클럽 · 조직원만'],
          [1, 17, 12, 24, 'res', null, '빌라 · 조직원 숙소'], [0, 1, 47, 1, 'res', null, '뒷골목 · 조직원만']],
  zoneAllow: ['crew'],
  build(m) {
    m.fill(0, 0, 47, 27, '.'); for (let x = 0; x < 48; x++) m.set(x, 0, '#');
    m.fill(0, 11, 47, 11, '='); m.fill(0, 16, 47, 16, '='); m.fill(0, 25, 47, 27, '=');
    m.vacant(1, 2, 8, 10, 'ruin', '폐사무소'); // 0 연락책의 은신처: 지붕 없는 벽·잔해 사이로 잠입한다
    m.fill(1, 2, 5, 2, '#'); m.fill(8, 2, 8, 6, '#'); m.fill(1, 5, 1, 10, '#');
    m.fill(4, 5, 4, 8, '#'); m.set(4, 7, 'r'); m.fill(5, 10, 8, 10, '#');
    m.many('R', [[2, 3], [6, 3], [7, 7], [2, 9]]); m.many('B', [[6, 9], [3, 8]]); m.set(2, 7, 'H');
    m.villa(10, 2, 20, 10, 1, { kind: 'shop', use: ['vault'], signs: ['창고'], name: '창고', back: true });              // 1 금고(빨강)
    m.villa(22, 2, 32, 10, 2, { kind: 'shop', use: ['vault', 'office'], signs: ['', ''], plate: '사무동', name: '사무동', back: true });  // 2 금고(초록)
    m.villa(34, 2, 46, 10, 2, { kind: 'shop', use: ['vip', 'office'], signs: ['CLUB', ''], name: '클럽', back: true });  // 3 VIP(파랑 뒷문)
    m.villa(1, 17, 12, 24, 3, { name: '빌라' });                                                                       // 4 3층에 초록 카드키
    m.vacant(14, 17, 20, 24, 'lot', '공터 적치장'); // 5 잠입용 은폐·탈출로. 건물 그림과 옥상 판정이 없다
    m.car(15, 19, 1); m.fill(18, 21, 19, 21, 'U'); m.set(20, 21, 'L');
    m.many('B', [[18, 18], [19, 24]]); m.set(17, 23, 'W'); m.set(19, 19, 'H');
    m.villa(22, 17, 33, 24, 1, { kind: 'shop', use: ['food'], signs: ['포차'] });                                      // 6
    m.villa(35, 17, 42, 24, 2, { kind: 'house', name: '건달파 보급처' }); // 7 위험을 감수하면 예비 도구와 변장 경로 확보
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
  planks: [[33, 5, 33, 5, 2]],  // 사무동 ↔ 클럽. 1층 창고와는 옥상 높이가 다르다.
  gates: [{ at: [13, 19], open: 's' }, { at: [21, 19], open: 's' }, { at: [43, 22], open: 'e' }],
  // 빗장 북쪽에서도 큰길로 빠져나올 수 있게 골목 입구의 시설물을 옆으로 옮긴다.
  fixtureMoves: [{ from: [21, 16], to: [20, 16], tile: 'F', floor: '=' }, { from: [13, 17], to: [12, 16], tile: 'H', floor: '.' }],
  wires: [], drops: [],
  roofs: ['cRoofA', 'cRoofG', 'cRoofB', 'cRoofA', 'cRoofG', 'cRoofB', 'cRoofA', 'cRoofG'], bricks: [1, 0, 1, 0, 1, 0, 1, 0],
  ventB: [{ b: 1, at: [15, 4] }, { b: 3, at: [41, 5] }], disguise: true,
  shift: { every: 80, first: 100, add: [{ kind: 'g2', route: [[2, 13, 2], [45, 13, 2]] }, { kind: 'g1', route: [[46, 2, 2], [46, 24, 2]] }, { kind: 'g2', route: [[9, 1, 2], [33, 1, 2]] }], msg: '교대 시간 · 순찰 경비 1명 추가' },
  challenges: ['unrecorded', 'accident', 'intel', 'ghost', 'clean', 'nobody', 'fast'], fastT: 660,
  layoutVersion: 1, rebuiltSites: [0, 5], rivalBuilding: 7,
  locks: [{ b: 1, door: 'vault', key: 'red' }, { b: 2, door: 'vault', key: 'green' }, { b: 3, door: 'vipBack', key: 'blue' }, { b: 2, door: 'front', key: 'code' }, { b: 2, door: 'back', key: 'code' }],
  code: '7316', codeOpp: false,
  notes: [{ pos: [6, 6], title: '연락책의 출입 메모', lines: ['사무동 앞문·뒷문 7316.', '2층 보안실에 초록 카드키. 계약서 금고는 1층.', '이번 정산 끝나면 이 메모는 태워.'], gives: 'code', learn: '사무동 출입 비밀번호 7316 — 2층 보안실의 초록 카드키로 1층 계약서 금고를 연다' }],
  keyItems: [{ key: 'blue', pos: [12, 5], fl: 0 }, { key: 'green', b: 2, fl: 1, at: 'S' }, { key: 'supplies', b: 7, fl: 0, at: 'R' }],
  exits: [{ at: [17, 23], r: 42, name: '공터 하수구' }],
  well: 'manhole', kunai: 4, coins: 3, reinf: [47, 13],
  lamps: [[8, 11, 160, 1], [20, 11, 170, 1, 0, '255,90,190'], [33, 11, 170, 1, 0, '90,220,255'], [44, 11, 160, 1], [8, 16, 150, 1], [33, 16, 150, 1, 0, '255,60,170']],
  fuse: [20, 16, 20, 15],
  securityEvidence: true, camRoom: { b: 2, fl: 1, at: 'S' },
  cams: [[21, 12, 90, 70], [34, 1, 180, 40], { b: 1, fl: 0, at: 'VB', sweep: 35 }, { b: 2, fl: 0, at: 'VB', sweep: 35 }],
  radios: [3, 6, 9, 10],  // 무전기를 든 조직원 (guards 순번) — 무리마다 하나, 먼저 처리하면 경보가 퍼지지 않는다
  guards: [
    { kind: 't', target: true, tag: 'collector', route: [[10, 13, 2], [33, 13, 2], [33, 14, 1], [10, 14, 1]], key: 'red' },   // 0 수금원 — 빨간 카드키
    { kind: 'g2', follow: 0 },                                                   // 1 수금원 경호
    { kind: 't', target: true, tag: 'vip', b: 3, fl: 0, at: 'V', post: 180 },     // 2 VIP
    { kind: 'g2', b: 3, fl: 0, at: 'VD', post: 90, elite: true },                // 3 VIP 앞문 정예
    { kind: 'g1', b: 1, at: 'VB', post: 90 },                                    // 4 창고 금고 앞
    { kind: 'g2', b: 2, at: 'VB', post: 90 },                                    // 5 사무동 금고 앞
    { kind: 'g1', b: 2, fl: 1, patrol: true },                                   // 6
    { kind: 'dog', route: [[2, 1, 1.5], [46, 1, 1.5]] },                          // 7 뒷골목 개
    { kind: 'g2', b: 4, fl: 2, at: 'L', post: 0 },                               // 8 빌라 3층
    { kind: 'g1', b: 4, patrol: true },                                          // 9
    { kind: 'g2', at: [45, 12], post: 180, lookout: true },                      // 10 동쪽 망꾼
    { kind: 'g1', route: [[2, 15, 2], [45, 15, 2]] },                            // 11 큰길 순찰
    { kind: 'g2', b: 4, fl: 1, patrol: true },
    // 13~18 거리 사람들: 큰길을 오가는 행인 · 포차 손님 (둘은 사무동 간판 이야기를 한다)
    { kind: 'civ', wander: [2, 12, 10, 15], at: [6, 14] }, { kind: 'civ', body: 'fBob', wander: [18, 12, 26, 15], at: [21, 14] }, { kind: 'civ', wander: [31, 12, 39, 15], at: [35, 15] },
    { kind: 'civ', at: [24, 21], post: 0 }, { kind: 'civ', body: 'fTail', at: [25, 21], post: 180 }, { kind: 'civ', wander: [23, 18, 32, 23], at: [29, 21] },
    { kind: 'g2', tag: 'vipEscort', b: 3, fl: 0, at: 'VD', follow: 2 },
    { kind: 'g1', tag: 'camop', b: 2, fl: 1, at: 'S', post: 180, enforcer: true },
    { kind: 'g1', tag: 'contact', route: [[6, 6, 5], [7, 9, 3], [3, 6, 4]], key: 'code', enforcer: true }
  ],
  items: [{ b: 1, fl: 0, at: 'VA' }, { b: 2, fl: 0, at: 'VA' }],
  // 사고: 사무동 옥상의 헐거운 간판. 수금원과 경호원이 그 밑 큰길을 지난다
  traps: [{ k: 'drop', at: [27, 8], hit: [25, 11, 29, 14], text: '금성상사', noOpp: true }],
  intel: [{ g: [16, 17], key: 3, gives: 'sign', learn: '사무동 간판이 헐겁다 — 수금원이 그 밑을 지난다. 출입 비밀번호는 북서쪽 폐사무소 연락책에게, 초록 카드키는 사무동 2층 보안실에 있다', every: 32, first: 6,
            lines: [[0, '사무동 출입번호 또 바뀌었대.'], [1, '북서쪽 폐사무소 연락책이 갖고 있어. 초록 카드키는 사무동 2층 보안실이고.'], [0, '그 카드로 아래층 계약서 금고 열면 되지? 간판은 아직 덜렁거리던데.'], [1, '맞아. 수금원 매일 그 밑으로 다니잖아. 떨어지면 딱 맞겠어.']] }],
  interrogate: [{ gives: 'sign', learn: '사무동 간판이 헐겁다 — 수금원은 매일 그 밑 큰길을 지난다', say: '사무동 간판! 수금원 형님이 매일 그 밑으로 다녀!' }],
  stories: [
    { id: 'sign', targetTag: 'collector', name: '헐거운 간판', reveal: (S, h) => h.knows('간판') || (S.player.z > 0 && h.dist(S.player.x, S.player.y, h.tc(27), h.tc(8)) < 220),
      steps: [{ text: '사무동 계단이나 배관으로 옥상 간판 뒤로', at: [27, 8, 0], done: (S, h) => (S.player.z > 0 && h.dist(S.player.x, S.player.y, h.tc(27), h.tc(8)) < 160) || h.eliminated('collector') },
              { text: '수금원이 간판 밑을 지날 때 [간판 떨어뜨리기]', at: [27, 13, 0], done: (S, h) => h.eliminated('collector') }] },
    { id: 'red', targetTag: 'vip', name: '빨간 카드키', reveal: () => true,
      steps: [{ text: '수금원을 쓰러뜨려 빨간 카드키 얻기 (경호원이 붙어 다닌다)', at: [20, 13, 0], done: (S, h) => !!(S.player.keys || {}).red || h.eliminated('collector') },
              { text: '창고 금고에서 현금 가방과 파란 카드키 챙기기', at: [13, 4, 0], done: S => S.items[0].got && !!(S.player.keys || {}).blue },
              { text: '파란 카드키로 VIP룸 뒷문을 열고 VIP 처치하기', at: [40, 4, 0], done: (S, h) => h.eliminated('vip') }] },
    { id: 'green', name: '사무동 출입', reveal: (S, h) => h.knows('폐사무소') || h.knows('사무동 출입') || !!S.player.keys.code,
      steps: [{ text: '북서쪽 폐사무소에서 연락책의 출입 메모 확인', at: [6, 6, 0], done: S => !!(S.player.keys || {}).code || S.items[1].got },
              { text: '비밀번호로 사무동에 들어가 2층 보안실의 초록 카드키 챙기기', at: [25, 6, 1], done: S => !!(S.player.keys || {}).green || S.items[1].got },
              { text: '사무동 1층 금고에서 계약서 챙기기', at: [25, 4, 0], done: S => S.items[1].got }] }
  ],
  hints: ['수금원에게서 빨간 카드키를 얻을 수 있다. 경호원을 따돌리거나 함께 제압할 기회를 노릴 수 있다.', '포차 손님들 이야기를 들어 보면 수금원을 사고로 처리할 길이 보인다.', '창고 금고와 VIP룸은 옥상 환풍구로도 들어간다.']
},
