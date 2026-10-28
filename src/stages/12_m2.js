// ───────── 임무 2 (보통): VIP — 히트맨식. 클럽 1층 홀·거리·야시장·포차·약국은 손님으로 드나든다.
// 표적(클럽 실장)에게 가는 길 셋: 간판 사고 · 배탈약 → 혼자 공중화장실 · 금고(장부·파랑 카드) → VIP룸 뒷문
{
  id: 'm2', no: '02', name: 'VIP', sub: '임무 2 · 암살 + 훔치기', fee: '80만',
  mission: '클럽 실장을 처리하고 사무동 금고의 장부를 챙겨 동쪽 큰길 끝으로',
  itemName: '장부', itemNames: ['장부'],
  brief: '클럽 실장이 가게 돈을 장부째 들고 튈 준비 중이다. 장부는 사무동 1층 금고에 있다. 거리·야시장·포차·약국·클럽 1층 홀은 손님으로 드나든다 — 걸으면 아무도 신경 쓰지 않는다. VIP룸·뒷골목·직원 복도는 클럽 직원만, 사무동은 조직원만 다닌다. 사람들 이야기를 들어 보면 실장에게 가는 길이 여럿 보인다.',
  W: 56, H: 36, start: [0, 21], exit: [55.5, 21.5], startA: 0, noRefine: true, floors: true, pspd: 1.3, gspd: 1.05, residents: 0,
  build(m) {
    m.fill(0, 0, 55, 35, ','); for (let x = 0; x < 56; x++) m.set(x, 0, '#');
    // 바닥 먼저: 큰길(보도 19·24, 차도 20~23) · 사무동 앞마당 · 야시장 · 네온 골목 · 동쪽 샛길 · 빌라 앞마당
    m.fill(0, 20, 55, 23, '.'); m.fill(0, 19, 55, 19, '='); m.fill(0, 24, 55, 24, '=');
    m.fill(1, 14, 12, 18, '=');
    m.fill(22, 15, 37, 17, '='); m.fill(22, 18, 43, 18, '#'); m.set(29, 18, '='); m.set(30, 18, '=');   // 네온 골목: 남쪽 담에 두 칸 입구, 동쪽은 샛길로 트였다
    m.fill(13, 18, 21, 18, '#'); m.set(17, 18, '=');                                                     // 야시장 남쪽 담: 가운데 한 칸으로 큰길과 이어진다
    // 북쪽 줄: 사무동 · 야시장 · 클럽 · 공중화장실 · 빌라
    m.villa(2, 4, 12, 13, 3, { kind: 'shop', use: ['vault', 'office', 'office'], signs: ['', '', ''], plate: '사무동', name: '사무동', back: true });   // 0
    m.villa(22, 4, 36, 14, 2, { kind: 'shop', use: ['vip', 'office'], signs: ['CLUB', '사무실'], name: '클럽', back: true });                   // 1
    m.bld(38, 5, 42, 8, 1); m.set(40, 8, 'd'); m.pipe(42, 7);                                                                                                   // 2 공중화장실 (칸막이 하나)
    m.villa(44, 4, 54, 12, 2);                                                                                                                     // 3
    // 남쪽 줄: 포차 · 약국 · 빌라 · 단독
    m.villa(2, 26, 11, 32, 1, { kind: 'shop', use: ['food'], signs: ['포차'], name: '포차' });                                                       // 4
    m.villa(13, 26, 22, 32, 1, { kind: 'shop', use: ['store'], signs: ['약국'], name: '약국' });                                                    // 5
    m.villa(25, 26, 37, 33, 2);                                                                                                                    // 6
    m.villa(41, 26, 51, 32, 2, { kind: 'house' });                                                                                                 // 7
    // 야시장 노점 천막과 물건
    [[14, 4], [17, 4], [14, 10], [18, 7], [16, 13], [19, 12]].forEach(([x, y], i) => m.tent(x, y, 'RBGYRB'[i]));
    m.many('O', [[13, 7], [20, 4], [16, 9], [13, 16], [21, 16]]); m.many('H', [[20, 10]]);
    m.fill(21, 6, 21, 7, 'U'); m.set(21, 8, 'L'); m.pipe(22, 6);                                                     // 클럽 옆 컨테이너 → 배관 → 클럽 옥상
    m.many('T', [[47, 15], [53, 14]]); m.many('B', [[45, 13], [52, 13], [44, 17]]);
    [6, 24, 40, 52].forEach(x => m.pole(x, 19, 2));
    m.many('H', [[1, 15], [37, 2], [43, 16], [12, 34], [38, 34], [22, 17], [37, 15], [6, 1], [25, 1]]);   // 22,17·37,15 = 네온 골목 양 끝 (문지기·순찰 처리 뒤 숨길 곳) · 6,1 = 사무동 뒷골목 · 25,1 = 클럽 뒷골목 서쪽
    m.fill(30, 1, 30, 2, 'C');                                                                                     // 클럽 뒷골목 가운데 상자 더미: 서쪽·동쪽 순찰의 시선을 끊는다 (3칸으로 지나간다) m.many('O', [[12, 19], [33, 25]]);
    m.many('W', [[6, 16], [31, 21], [54, 2], [41, 13]]); m.set(36, 18, 'F');
    mat(m, 'p', [[26, 16], [27, 16], [17, 11]]); mat(m, 'x', [[38, 10], [38, 11]]); mat(m, 'r', [[15, 15], [16, 15]]);
    [[10, 20, 0], [33, 22, 2], [46, 20, 1]].forEach(([x, y, c]) => m.car(x, y, c));
    shrubs(m, [[14, 2], [19, 1], [41, 1], [47, 2], [52, 1], [38, 12], [42, 14], [1, 10], [12, 17], [49, 17], [28, 25], [39, 25], [23, 3]]);   // 숨을 화단: 뒷골목·샛길·큰길 가
  },
  wires: [...chain(19, [6, 24, 40, 52])],
  roofs: ['cRoofB', 'cRoofA', 'cRoofG', 'cRoofA', 'cRoofG', 'cRoofB', 'cRoofA', 'cRoofG'], bricks: [0, 1, 0, 1, 0, 1, 0, 1],
  ventB: [{ b: 1, at: [26, 6] }],
  locks: [{ b: 0, door: 'vault', key: 'code' }, { b: 1, door: 'vipBack', key: 'blue' }], code: '0417',
  // 구역: 거리·야시장·네온 골목은 공개(기본). 클럽 홀·포차·약국·공중화장실 안도 공개. 클럽 뒷골목·직원 복도·VIP룸은 클럽 직원만, 사무동은 조직원만
  zones: [[22, 1, 37, 3, 'res', null, '클럽 뒷골목 · 직원 외 출입 금지', ['waiter', 'crew']],
          [23, 9, 32, 13, 'pub'],                                                    // 클럽 1층 홀 (바·춤추는 자리)
          [23, 9, 32, 9, 'res', null, '바 안쪽 · 직원만', ['waiter']],                 // 바 줄: 직원 옷이면 술병을 만져도 자연스럽다
          [33, 5, 35, 13, 'res', null, '직원 계단 복도', ['waiter', 'crew']],
          [23, 5, 32, 7, 'res', null, 'VIP룸', ['waiter']],
          [3, 27, 10, 31, 'pub'], [14, 27, 21, 31, 'pub'], [39, 6, 41, 7, 'pub']],    // 포차 · 약국 · 공중화장실
  zoneAllow: ['crew'],
  props: [{ id: 'emetic', name: '배탈약', at: [16, 30] }],
  uses: [{ need: 'emetic', at: [27, 9], label: '실장 술병에 배탈약 타기', permit: 'waiter', done: '실장 술병에 배탈약을 탔다 — 다음 잔부터 배가 아플 거다',
           act: (S, h) => { h.detour('vip', 40, 6, 32, '공중화장실', '배탈'); h.say('vip', '으윽… 배가 왜 이래…'); } }],
  intel: [
    { g: [9, 10], key: 1, gives: 'code', learn: '사무동 금고 비번 0417', every: 25, first: 4, lines: [[0, '오늘 금고 비번 또 바뀌었다며?'], [1, '0417. 사장 딸 생일이래.'], [0, '그걸 또 그렇게 정하냐…'], [1, '외우기 쉽잖아. 너 잊어버리지나 마.']] },
    { g: [14, 15], key: 1, gives: 'emetic', learn: '실장은 배가 약하다 — 술에 배탈약만 들어가도 골목 공중화장실로 뛰어간다', every: 28, first: 5,
      lines: [[0, '실장님 오늘도 VIP룸에서 양주 드시더라.'], [1, '그 양반 장 약해서 뭐 하나만 잘못 들어가도 골목 공중화장실로 뛰어가잖아.'], [0, 'VIP룸 화장실은 언제 고쳐?'], [1, '고칠 돈으로 양주 사 드시겠지.']] },
    { g: [2, 3], key: 1, gives: 'sign', learn: '실장은 가끔 클럽 앞 간판 밑에 나와 담배를 피운다', every: 26, first: 8,
      lines: [[0, '실장님 또 나오시겠네.'], [1, '간판 밑에서 담배 한 대. 그게 하루 낙이래.'], [0, '저 간판 나사 빠진 거 아무도 말 안 했지?'], [1, '말하면 나보고 고치라고 할 거잖아.']] }
  ],
  // 붙잡은 조직원 심문: 아직 모르는 것부터 하나씩 분다
  interrogate: [{ gives: 'sign', learn: '실장은 가끔 클럽 앞 간판 밑에 나와 담배를 피운다', say: '실장님? 간판 밑에서 담배 피우실 땐 혼자야!' },
                { gives: 'code', learn: '사무동 금고 비번 0417', say: '비, 비번은 0417! 사장 딸 생일이야!' },
                { gives: 'emetic', learn: '실장은 배가 약하다 — 술에 배탈약만 들어가도 골목 공중화장실로 뛰어간다', say: '실장님 배 약해! 술에 뭐 들어가면 바로 화장실로 뛰어가!' }],
  notes: [{ b: 0, fl: 1, at: 'L', title: '책상 밑 메모', lines: ['금고 0417', '(사장님 따님 생신)'], gives: 'code', learn: '사무동 금고 비번 0417' }],
  traps: [{ k: 'drop', at: [27, 12], hit: [25, 15, 29, 16], text: 'CLUB', noOpp: true }], codeOpp: false,   // 간판·금고 비번은 아래 단계형 기회가 안내한다
  stories: [
    { id: 'sign', name: '간판 밑 담배', reveal: (S, h) => h.knows('간판') || (S.player.z > 0 && h.dist(S.player.x, S.player.y, h.tc(27), h.tc(12)) < 200),
      steps: [{ text: '클럽 옥상 간판 뒤로 — 야시장 컨테이너에서 배관을 타거나 전깃줄로', at: [27, 12, 0], done: (S, h) => (S.player.z > 0 && h.dist(S.player.x, S.player.y, h.tc(27), h.tc(12)) < 160) || h.npc('vip').state === 'DEAD' },
              { text: '실장이 간판 밑에 나오면 [간판 떨어뜨리기]', at: [27, 15, 0], done: (S, h) => h.npc('vip').state === 'DEAD' }] },
    { id: 'emetic', name: '약한 배', reveal: (S, h) => h.knows('배탈') || !!(S.player.item && S.player.item.id === 'emetic'),
      steps: [{ text: '약국 진열대에서 배탈약 집기', at: [16, 30, 0], done: S => (S.player.item && S.player.item.id === 'emetic') || !!S.usesDone[0] },
              { text: '클럽 직원 옷 구하기 — 뒷골목에서 혼자 담배 피우는 직원이나 포차에서 쉬는 직원', at: [32, 3, 0], done: S => (S.player.outfit === 'waiter' && !S.player.disguiseBlown) || !!S.usesDone[0] },
              { text: '바 안쪽 실장 술병에 배탈약 타기 (직원 옷이면 자연스럽다)', at: [27, 10, 0], done: S => !!S.usesDone[0] },
              { text: '공중화장실에 혼자 들어간 실장 처리', at: [40, 7, 0], done: (S, h) => h.npc('vip').state === 'DEAD' }] },
    { id: 'vault', name: '금고와 뒷문', reveal: (S, h) => h.knows('비번'),
      steps: [{ text: '사무동 1층 금고에서 장부와 파랑 카드 챙기기', at: [7, 6, 0], done: S => S.items.every(i => i.got) && !!(S.player.keys || {}).blue },
              { text: '뒷골목 → 클럽 직원 복도 → 파랑 카드로 VIP룸 뒷문', at: [33, 6, 0], done: (S, h) => h.inRect(S.player, [23, 5, 32, 7, 0]) || h.npc('vip').state === 'DEAD' },
              { text: 'VIP룸 소파의 실장 처리', at: [25, 6, 0], done: (S, h) => h.npc('vip').state === 'DEAD' }] }
  ],
  challenges: ['accident', 'intel', 'purge', 'streak3', 'clean', 'nobody'],
  entries: [{ name: '서쪽 큰길', desc: '기본 출발', at: [0, 21] }, { name: '빌라 옥상', desc: '별 3개 — 옥상에서 시작', at: [48, 6], z: 2, need: 3 },
            { name: '클럽 직원', desc: '별 5개 — 직원 옷을 입고 뒷골목에서', at: [40, 2], need: 5, outfit: 'waiter' }],
  keyItems: [{ key: 'blue', b: 0, fl: 0, at: 'VC' }],
  well: 'manhole', kunai: 3, coins: 3, reinf: [55, 21],
  lamps: [[24, 15, 150, 1, 0, '255,90,190'], [32, 16, 150, 1, 0, '90,220,255'], [7, 17, 150, 1], [16, 8, 120, 1, 0, '255,200,120'], [19, 14, 110, 1, 0, '255,200,120'],
          [35, 2, 90, 1], [40, 10, 100, 1], [6, 25, 140, 1], [18, 25, 140, 1]],
  fuse: [36, 18, 36, 17],
  cams: [[22, 15, 0, 20], [12, 15, 0, 45]],
  radios: [1, 3, 6, 9, 27],  // 무전기를 든 조직원 (guards 순번) — 무리마다 하나, 먼저 처리하면 경보가 퍼지지 않는다
  guards: [
    // 0 표적: 클럽 실장. VIP룸에서 술 → 클럽 앞 간판 밑에서 담배 → 홀 바에서 수다
    { kind: 't', target: true, tag: 'vip', schedKey: 'sign', sched: [{ at: [25, 6], stay: 30, name: 'VIP룸', act: '양주' }, { at: [27, 15], stay: 16, name: '클럽 앞 간판 밑', act: '담배' }, { at: [29, 10], stay: 16, name: '클럽 홀 바', act: '수다' }] },
    { kind: 'g2', b: 1, fl: 0, at: 'VD', post: 90, elite: true },                     // 1 VIP룸 앞문 경호 (얼굴을 안다 — 변장도 알아본다)
    { kind: 'g1', tag: 'bouncer', at: [24, 16], post: 90 },                            // 2 클럽 문지기
    { kind: 'g2', route: [[23, 16, 6], [36, 16, 6]] },                                // 3 네온 골목 순찰 (문지기와 간판 이야기)
    { kind: 'g1', route: [[23, 2, 4], [29, 2, 4]] },                                  // 4 클럽 뒷골목 서쪽 (상자 더미 앞까지)
    { kind: 'g1', at: [7, 15], post: 90 },                                            // 5 사무동 정문
    { kind: 'g2', b: 0, at: 'VB', post: 90 },                                         // 6 금고 앞
    { kind: 'g1', b: 0, fl: 1, patrol: true, from: 'L', to: 'R' },                    // 7 사무동 2층
    { kind: 'g2', b: 0, fl: 2, at: 'S', post: 270 },                                  // 8 사무동 3층
    { kind: 'g1', at: [15, 9], post: 0 }, { kind: 'g2', at: [17, 9], post: 180 },     // 9·10 야시장에서 쉬는 조직원 둘 — 금고 비번 이야기
    { kind: 'g1', route: [[3, 21, 2], [52, 21, 2]] },                                  // 11 큰길 순찰
    // 클럽 직원 (옷이 곧 신분)
    { kind: 'civ', tag: 'bartender', outfit: 'waiter', body: 'fTail', enforcer: true, wander: [24, 10, 31, 12], at: [28, 11] },                                                       // 12 바텐더
    { kind: 'civ', tag: 'waiter', outfit: 'waiter', sched: [{ at: [30, 11], stay: 20, name: '클럽 홀', act: '서빙' }, { at: [32, 3], stay: 18, name: '뒷골목', act: '담배' }] },   // 13 담배 피우러 나가는 직원
    { kind: 'civ', outfit: 'waiter', at: [5, 30], post: 0 }, { kind: 'civ', outfit: 'waiter', body: 'fBob', at: [6, 30], post: 180 },                                 // 14·15 포차에서 쉬는 직원 둘 — 실장 배탈 이야기
    // 동네 사람들
    { kind: 'civ', tag: 'pharm', body: 'old', at: [18, 28], post: 180 },             // 16 약사
    { kind: 'civ', route: [[1, 19, 1], [54, 19, 1]] },                               // 17·18 큰길 행인
    { kind: 'civ', route: [[54, 24, 2], [1, 24, 2]] },
    { kind: 'civ', wander: [13, 5, 21, 17], at: [15, 7] }, { kind: 'civ', wander: [13, 5, 21, 17], at: [19, 15] }, { kind: 'civ', body: 'fLong', wander: [13, 5, 21, 17], at: [14, 13] },   // 19~21 야시장 손님
    { kind: 'civ', wander: [3, 28, 7, 29], at: [6, 28] },                           // 22 포차 손님
    { kind: 'civ', route: [[38, 15, 3], [38, 4, 2], [54, 2, 2]] },                   // 23 샛길로 지나가는 사람
    { kind: 'civ', tag: 'mom', body: 'fBob', at: [20, 14], post: 180 },              // 24 엄마
    { kind: 'civ', tag: 'child', child: true, parent: 'mom', wander: [17, 14, 21, 16], at: [18, 15] },   // 25 아이 (손댈 수 없다 — 사탕)
    // 조직원 더: 뒤쪽은 조직 땅이다 (메탈기어식으로 하나씩 처리하며 나아갈 수 있게)
    { kind: 'g2', route: [[31, 2, 4], [37, 1, 4]] },                         // 26 클럽 뒷골목 동쪽 (뒷문 앞)
    { kind: 'g1', route: [[2, 2, 4], [11, 2, 4]] },                          // 27 사무동 뒷골목 (어둡다 · 6,1 수거함)
    { kind: 'g2', route: [[1, 7, 3], [1, 17, 3]] }                           // 28 사무동 서쪽 골목
  ],
  items: [{ b: 0, fl: 0, at: 'VA' }],
  hints: ['거리·야시장·클럽 홀은 손님으로 드나든다. 대화하는 둘 가까이 서 있으면 엿듣는다 — 들은 말은 기회가 된다.', '클럽 직원 옷이면 뒷골목·직원 복도·바 안쪽을 지나다닐 수 있다. VIP룸 경호는 얼굴을 알아본다.']
},
