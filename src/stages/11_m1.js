// ───────── 임무 1 (쉬움): 금고 털기 — 첫 의뢰. 밝은 정문은 막혀 있고, 어두운 뒷골목으로 돌면 길이 있다. 옥상 길(전깃줄→계단실)은 두 번째 판의 숙제
{
  id: 'm1', no: '01', name: '장부 털기', sub: '임무 1 · 훔치기', fee: '30만',
  mission: '창고 상회 1층 사무실의 장부를 훔쳐 서쪽 길 끝으로 빠져나간다', itemName: '장부', itemNames: ['장부'],
  brief: '창고 상회 1층 사무실 책상에 장부가 있다. 거리·편의점·상회 매장은 누구나 드나드는 곳 — 걸으면 아무도 신경 쓰지 않는다. 뒷마당·창고·사무실은 출입 금지지만, 그곳에 드나드는 사람의 차림이면 지나다닐 수 있다. 아무도 해칠 필요는 없다. 장부를 챙기면 서쪽 길 끝이나 상회 옆 맨홀(하수도)로 빠져나간다.',
  W: 64, H: 42, start: [63, 27], exit: [0.5, 31.5], exitName: '서쪽 길 끝', exits: [{ at: [44, 13], name: '상회 옆 맨홀 — 하수도로 빠지기', r: 46 }], startA: Math.PI, noRefine: true, floors: true, pspd: 1.3, gspd: 1.0, residents: 0,
  build(m) {
    m.fill(0, 0, 63, 41, ','); for (let x = 0; x < 64; x++) m.set(x, 0, '#');
    m.fill(0, 2, 52, 4, '.');                                                      // 뒷골목 (가로등 없음 — 어둡다)
    m.fill(20, 25, 63, 29, '.'); m.fill(20, 24, 63, 24, '='); m.fill(20, 30, 63, 30, '=');   // 동쪽 큰길
    m.fill(24, 18, 44, 23, '=');                                                   // 상회 앞 광장 (밝다)
    m.fill(0, 5, 3, 33, '=');                                                      // 서쪽 길 (출구)
    m.fill(4, 30, 22, 33, ',');
    m.villa(5, 6, 20, 16, 2);                                                                                  // 0 빌라
    m.villa(26, 6, 42, 17, 2, { kind: 'shop', use: ['heist', 'office'], signs: ['창고 상회', ''], name: '창고 상회' });   // 1 표적 건물
    m.villa(48, 6, 57, 15, 2, { kind: 'house' });                                                              // 2
    m.villa(5, 20, 18, 28, 1, { kind: 'shop', use: ['store'], signs: ['편의점'] });                             // 3
    m.villa(26, 32, 37, 39, 2);                                                                                // 4
    m.villa(42, 32, 56, 39, 1, { kind: 'house' });                                                             // 5
    m.pole(52, 24, 2); m.pole(46, 24, 2);                                                                      // 큰길 전봇대 → 상회 옥상 전깃줄
    m.many('H', [[34, 4], [12, 4], [45, 22], [2, 12], [19, 2]]);                                               // 의류수거함 (숨기·시체). 19,2 = 막내 담배 자리 옆
    m.car(47, 26, 2);                                                                                          // 택배 트럭
    m.many('W', [[9, 3], [44, 13], [21, 31]]);                                                                 // 맨홀
    m.many('B', [[24, 18], [44, 18], [24, 23]]); m.many('T', [[60, 33], [62, 36], [59, 39]]);
    m.car(34, 26, 0); m.car(50, 28, 1);
    shrubs(m, [[10, 4], [23, 4], [45, 4], [2, 10], [2, 16], [2, 24], [36, 24], [58, 30], [44, 30], [21, 18], [46, 2]]);   // 숨을 화단: 뒷골목·서쪽 길·큰길 가
  },
  wires: [[[52, 24], [46, 24]], [[46, 24], [42, 14]]],                   // 출발하자마자 보이는 길: 전봇대 → 상회 옥상 동쪽 끝
  roofs: ['cRoofG', 'cRoofA', 'cRoofB', 'cRoofA', 'cRoofG', 'cRoofB'], bricks: [1, 0, 1, 0, 1, 0],
  challenges: ['ghost', 'courier', 'staff', 'roof', 'untouched', 'fast'], fastT: 210,
  entries: [{ name: '동쪽 큰길', desc: '기본 출발', at: [63, 27] }, { name: '집 옥상', desc: '별 2개 — 옥상에서 시작', at: [52, 8], z: 2, need: 2 },
            { name: '택배 트럭', desc: '별 4개 — 택배 기사 옷을 입고 트럭 옆에서', at: [49, 28], need: 4, outfit: 'courier' }],
  well: 'manhole', kunai: 3, coins: 3,
  lamps: [[30, 20, 150, 1], [39, 20, 150, 1], [57, 27, 140, 1], [25, 27, 140, 1], [2, 19, 90, 1], [31, 5, 110, 1]],   // 마지막: 뒷문 위 등 (뒷마당이 아주 깜깜하지는 않게)
  // 구역: 거리·광장·골목은 공개(나는 행인), 상회 건물 안·뒷마당·모든 옥상은 출입 금지
  // 허가 옷: 뒷마당·창고는 자경대원·직원·택배, 사무실·계단 복도(기본)는 자경대원·직원
  zones: [[26, 2, 42, 5, 'res', null, '창고 상회 뒷마당 · 출입 금지', ['crew', 'staff', 'courier', 'parcel']], [27, 7, 33, 11, 'res', null, '상회 창고', ['crew', 'staff', 'courier', 'parcel']],
          [35, 7, 38, 11, 'res', null, '사무실', ['crew', 'staff', 'courier']],   // 택배 기사 옷이면 '서명 받으러' 사무실까지. 상자만 들었으면 창고까지
          [6, 21, 17, 27, 'pub'],                                         // 편의점 안은 손님으로 드나든다
          [27, 13, 38, 17, 'pub']],                                       // 상회 매장(정문 포함)도 손님 공간 — 사무실·창고·계단 복도부터 출입 금지
  zoneAllow: ['crew', 'staff'],
  props: [{ id: 'box', name: '택배 상자', at: [48, 28], permit: 'parcel' }],
  intel: [
    { g: [6, 7], key: 2, gives: 'smoke', learn: '상회 막내는 뒷골목 서쪽 어두운 데서 혼자 담배를 피운다', every: 24, first: 3, lines: [[0, '상회 막내 또 뒷골목 가서 담배 피우더라.'], [1, '사장한테 걸리면 혼날 텐데.'], [0, '서쪽 끝 어두운 데서 혼자 피워. 아무도 안 봐.'], [1, '하긴 거긴 가로등도 없지.']] },
    { g: [12, 13], key: 2, gives: 'bossOut', learn: '사장은 장부를 책상에 두고 편의점에 담배 사러 간다', every: 30, first: 6, lines: [[0, '김 군, 오늘 장부는 책상에 둬.'], [1, '네 사장님. 금고에 안 넣으세요?'], [0, '담배 사 와서 넣을게. 금방 와.'], [1, '(또 편의점이구먼…)']] }
  ],
  stories: [
    { id: 'courier', name: '택배 왔습니다', reveal: (S, h) => h.dist(S.player.x, S.player.y, h.tc(48), h.tc(27)) < 340,
      steps: [{ text: '트럭 옆 택배 상자를 들거나, 혼자인 기사를 기절시켜 옷 입기', at: [48, 28, 0], done: S => (S.player.item && S.player.item.id === 'box') || (S.player.outfit === 'courier' && !S.player.disguiseBlown) },
              { text: '뒷마당을 지나 뒷문으로 창고에 들어가기', at: [30, 6, 0], done: (S, h) => h.inRect(S.player, [27, 7, 33, 11, 0]) },
              { text: '사무실 책상의 장부 — 상자만 들었으면 자경대원이 등을 돌릴 때, 택배 기사 옷이면 서명 받으러 왔다며 걸어 들어간다', at: [36, 9, 0], done: S => S.items.every(i => i.got) }] },
    { id: 'smoke', name: '담배 타임', reveal: (S, h) => h.knows('막내'),
      steps: [{ text: '뒷골목 서쪽에서 혼자 담배 피우는 막내를 기절', at: [21, 3, 0], done: (S, h) => h.npc('kid').state === 'DEAD' },
              { text: '쓰러진 막내의 직원 조끼 입기', at: [21, 3, 0], done: S => S.player.outfit === 'staff' && !S.player.disguiseBlown },  // 옷 먼저 — 수거함에 넣은 사람은 옷을 벗길 수 없다
              { text: '막내를 의류수거함에 숨기기', at: [19, 2, 0], done: S => S.corpses.some(c => c.tag === 'kid' && (c.stashed || c.hidden)) },
              { text: '사장 눈을 피해 사무실 책상의 장부', at: [36, 9, 0], done: S => S.items.every(i => i.got) }] },
    { id: 'boss', name: '사장의 외출', reveal: (S, h) => h.knows('사장은'),
      steps: [{ text: '사장이 편의점에 담배 사러 갈 때까지 기다리기', at: [10, 25, 0], done: (S, h) => h.inRect(h.npc('boss'), [5, 20, 18, 28, 0]) || h.npc('boss').state === 'DEAD' },
              { text: '사무실 앞 자경대원을 빼내고(빈 캔·두꺼비집) 사무실로', at: [37, 12, 0], done: (S, h) => h.inRect(S.player, [35, 7, 38, 11, 0]) },
              { text: '책상의 장부', at: [36, 9, 0], done: S => S.items.every(i => i.got) }] }
  ],
  radios: [0],  // 무전기를 든 조직원 (guards 순번) — 무리마다 하나, 먼저 처리하면 경보가 퍼지지 않는다
  guards: [
    { kind: 'g1', at: [41, 13], post: 90, enforcer: true, tag: 'chief' },     // ① 계단 복도 반장: 남쪽을 보고 선다. 눈썰미 — 자경대원 옷을 알아본다
    { kind: 'g2', route: [[28, 13, 1.5], [37, 13, 1], [37, 9, 2]] },         // ② 매장 ↔ 사무실
    { kind: 'g1', route: [[27, 3, 2.5], [41, 3, 2.5]] },                     // ③ 뒷마당 순찰 (빈 캔으로 꾈 자리)
    // 행인: 거리는 사람 사는 길이다
    { kind: 'civ', route: [[22, 27, 1], [62, 27, 1]] },                      // 큰길을 오가는 사람
    { kind: 'civ', route: [[61, 28, 2], [23, 28, 2]] },
    { kind: 'civ', wander: [25, 19, 43, 23], at: [33, 21] },                 // 광장을 서성이는 사람
    { kind: 'civ', at: [19, 25], post: 0 }, { kind: 'civ', at: [20, 25], post: 180 },   // 편의점 앞에서 담배 피우며 이야기하는 둘
    { kind: 'civ', route: [[1, 8, 2], [1, 30, 2]] },                         // 서쪽 길을 걷는 사람
    { kind: 'civ', route: [[46, 5, 1], [46, 23, 3]] },                       // 샛길로 지나가는 사람
    { kind: 'civ', wander: [27, 15, 38, 16], at: [31, 15] }, { kind: 'civ', wander: [27, 13, 33, 16], at: [28, 16] },   // 10·11 매장 손님
    // 상회 사람들 (히트맨식): 일과가 있고, 옷이 곧 신분이다
    { kind: 'civ', tag: 'boss', outfit: 'staff', body: 'big', enforcer: true, schedKey: 'bossOut', sched: [{ at: [37, 9], stay: 35, name: '사무실', act: '장부 정리' }, { at: [33, 13], stay: 22, name: '매장 카운터', act: '손님 응대' }, { at: [10, 25], stay: 18, name: '편의점', act: '담배 사기' }] },   // 12 사장 (눈썰미: 직원 옷)
    { kind: 'civ', tag: 'clerk', outfit: 'staff', body: 'fTail', wander: [29, 14, 36, 15], at: [32, 15] },                                                                      // 13 직원
    { kind: 'civ', tag: 'kid', outfit: 'staff', body: null, sched: [{ at: [31, 9], stay: 22, name: '창고', act: '짐 정리' }, { at: [21, 3], stay: 18, name: '뒷골목', act: '담배' }] },   // 14 막내
    { kind: 'civ', tag: 'courier', outfit: 'courier', body: 'helmet', carryTo: 1, sched: [{ at: [48, 27], stay: 14, name: '택배 트럭', act: '상자 내리기' }, { at: [30, 8], stay: 8, name: '상회 창고', act: '배달' }] },   // 15 택배 기사
    // 광장의 엄마와 아이: 아이는 손댈 수 없다. 범죄를 보면 엄마에게 달려가고, 엄마가 신고하러 간다. 사탕(Z)으로 달랠 수 있다
    { kind: 'civ', tag: 'mom', body: 'fBob', at: [37, 21], post: 180 },                                                                                         // 16 엄마
    { kind: 'civ', tag: 'child', child: true, parent: 'mom', wander: [33, 20, 39, 22], at: [35, 21] }                                                                        // 17 아이
  ],
  items: [[36, 9, 0, 1]],
  hints: ['거리와 상회 매장은 손님으로 드나든다. 출입 금지 구역은 그곳에 드나드는 사람 차림이면 지나다닐 수 있다 — 경계선이 초록이면 통과.', '동네 사람들의 대화와 일과를 지켜보자. 길은 하나가 아니다.']
},
