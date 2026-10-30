// ───────── 임무 6 (스토리): 배신 — 까마귀가 올빼미와 제비를 조직에 넘겼다. 감방에서 맨손으로 깨어나 빠져나간다
// 길: 감방 탈출(침대 밑 머리핀으로 따기 · 천장 환풍구) → 압수품 되찾기(선택) → 2층 사무실의 제비 무전기 → 동쪽 정문 또는 남쪽 담 개구멍
{
  id: 'm6', no: '06', name: '배신', sub: '의뢰 03', fee: '',
  mission: '감방 탈출 후 감금동 2층에서 제비의 무전기를 회수하고 탈출',
  itemName: '제비의 무전기', itemNames: ['제비의 무전기'],
  brief: '까마귀가 우리를 넘겼다. 장비는 모두 빼앗겼고 감방 문 열쇠는 간수가 차고 있다. 감방 바닥 어딘가에 머리핀이 떨어져 있을 거다. 압수품은 경비실 어딘가에 있다. 제비의 무전기는 감금동 2층 사무실에 있다 — 그것만은 두고 갈 수 없다. 신원이 CCTV에 녹화되면 보안실에서 기록을 지워야 탈출할 수 있다. 카메라를 피하거나 먼저 꺼 두면 기록 삭제는 필요 없다.',
  W: 44, H: 28, startAt: { b: 0, fl: 0, at: 'VC' }, start: [10, 6], exit: [43.5, 20.5], exitName: '동쪽 정문 밖', startA: Math.PI / 2, noRefine: true, floors: true, pspd: 1.3, gspd: 1.05, residents: 0,
  bare: true, candy: 0, itemVerb: '챙기기', briefBy: '상황', kitStyle: 'industrial',
  firstGoal: { text: '감방에서 나가기 — 바닥의 머리핀으로 문 따기', where: '감금동 1층 감방', at: [9, 5, 0], done: (S, h) => !h.inRect(S.player, [4, 4, 15, 6, 0]) },
  build(m) {
    m.fill(0, 0, 43, 27, ','); for (let x = 0; x < 44; x++) { m.set(x, 0, '#'); m.set(x, 27, '#'); } for (let y = 0; y < 28; y++) m.set(0, y, '#');
    for (let y = 0; y < 28; y++) if (y < 18 || y > 23) m.set(43, y, '#');                              // 동쪽 담: 정문(18~23)만 트였다
    m.fill(39, 18, 43, 23, '.');                                                                          // 정문 앞 길
    m.villa(3, 3, 19, 12, 2, { kind: 'shop', use: ['vault', 'office'], signs: ['', ''], plate: '감금동', name: '감금동', back: true });   // 0 감방(금고 방) · 2층 사무실
    m.villa(24, 3, 37, 11, 1, { kind: 'shop', use: ['office'], signs: [''], plate: '경비실', name: '경비실' });                        // 1 압수품
    m.villa(24, 16, 34, 24, 1, { kind: 'shop', use: ['store'], signs: ['자재'], name: '자재 창고' });                                  // 2
    m.villa(3, 16, 14, 24, 2, { kind: 'house', name: '숙소' });                                                                      // 3
    m.fill(16, 14, 18, 15, 'U'); m.set(19, 15, 'L'); m.fill(36, 13, 37, 14, 'U');                                       // 컨테이너 더미: 마당 시선을 끊는다
    m.many('H', [[21, 2], [38, 15], [21, 25], [36, 25]]); m.many('O', [[22, 13], [35, 15]]); m.many('B', [[40, 2], [41, 10]]);
    [[27, 13, 1], [30, 13, 0]].forEach(([x, y, c]) => m.car(x, y, c));
    m.set(17, 27, ',');                                                                                    // 남쪽 담 개구멍 (빗장 대신 무너진 틈)
    m.set(22, 14, 'F');
  },
  gates: [], wires: [], drops: [],
  roofs: ['cRoofB', 'cRoofA', 'cRoofG', 'cRoofA'], bricks: [1, 0, 1, 0],
  exits: [{ at: [17, 26.4], name: '남쪽 담 개구멍', r: 46 }],
  // 구역: 단지 전체가 조직 땅 — 조직원 옷이면 걸어서 지나간다
  zones: [[1, 1, 42, 26, 'hos', null, '조직 창고 단지 · 적진']],  // 적진: 보이면 경고 없이 바로 쫓는다 (조직원 옷이면 통과)
  zoneAllow: ['crew'],
  locks: [{ b: 0, door: 'vault', key: 'gold' }],
  keyItems: [{ key: 'pin', b: 0, fl: 0, at: 'VA' }, { key: 'gear', b: 1, fl: 0, at: 'R' }],
  fuse: [22, 14, 22, 15],
  lamps: [[11, 13, 160, 1], [30, 12, 170, 1], [40, 20, 160, 1], [20, 25, 140, 1], [17, 26, 110, 1]],
  layoutVersion: 1, securityEvidence: true,
  cams: [[39, 17, 180, 50], [19, 13, 0, 50], [23, 12, 90, 45], { b: 0, fl: 1, at: 'R', sweep: 35 }],
  camRoom: { pos: [27, 4], fl: 0 },                                                                     // 경비실 관리실 화면
  searchlights: [[38, 13, 180, 60], [24, 25, 180, 35]],                                                 // 마당 망루 · 남쪽 담 (개구멍 쪽)
  radios: [1, 4, 7],
  guards: [
    { kind: 'g1', tag: 'jailer', route: [[5, 8, 4], [14, 8, 4]], key: 'gold' },                         // 0 간수 — 감방 앞 복도를 오간다 (감방 열쇠·빨강)
    { kind: 'g2', b: 0, fl: 0, at: 'L', post: 0 },                                                      // 1 감금동 1층
    { kind: 'g1', at: [11, 8], fl: 1, post: 0 }, { kind: 'g2', at: [13, 8], fl: 1, post: 180 },           // 2·3 2층 사무실 — 제비 이야기
    { kind: 'g2', tag: 'camop', at: [27, 5], post: 270, still: true },                                  // 4 경비실 관리실 — CCTV 화면을 본다
    { kind: 'g1', route: [[22, 4, 2], [22, 24, 2]] },                                                   // 5 마당 남북 순찰
    { kind: 'g2', route: [[4, 14, 2], [38, 14, 2]] },                                                   // 6 마당 동서 순찰
    { kind: 'g1', at: [41, 18], post: 180, elite: true }, { kind: 'g2', at: [41, 23], post: 180 },       // 7·8 정문
    { kind: 'g1', b: 3, fl: 1, at: 'bed', post: 90, sleep: true },                                      // 9 숙소에서 자는 조직원
    { kind: 'dog', route: [[9, 26, 1.5], [27, 26, 1.5]] }                                               // 10 남쪽 담 개
  ],
  items: [{ b: 0, fl: 1, at: 'R' }],
  intel: [{ g: [2, 3], key: 2, gives: 'truth', learn: '까마귀가 올빼미와 제비를 함께 넘겼다 — 제비는 어젯밤 죽었다', every: 24, first: 4,
            lines: [[0, '까마귀가 직접 넘겼다며? 둘 다.'], [1, '어. 돈 받고 깔끔하게.'], [1, '제비라는 여자는 어젯밤에 끝났고.'], [0, '남은 하나는 아래층 감방에 있지. 내일 처리한대.']] }],
  interrogate: [{ gives: 'truth', learn: '까마귀가 올빼미와 제비를 함께 넘겼다 — 제비는 어젯밤 죽었다', say: '까, 까마귀가 넘겼어! 그 여자는 어제 죽었고!' }],
  stories: [
    { id: 'cell', name: '감방 나가기', moot: (S, h) => !h.inRect(S.player, [4, 4, 15, 6, 0]), reveal: () => true,
      steps: [{ text: '감방 바닥에서 머리핀 찾기 — 락픽 대신 쓴다', at: null, done: S => !!(S.player.got || {}).pin || S.player.picks > 0 || !!S.player.keys.red },
              { text: '감방 문 따기 — 간수가 등을 돌렸을 때', at: null, done: (S, h) => !h.inRect(S.player, [4, 4, 15, 6, 0]) }] },
    { id: 'gear', name: '압수품', reveal: (S, h) => !h.inRect(S.player, [3, 3, 19, 12, 0]) || h.knows('압수품'),
      steps: [{ text: '경비실에서 빼앗긴 장비 되찾기 (락픽·빈 캔·다트)', at: null, done: S => !!(S.player.got || {}).gear }] },
    { id: 'radio', name: '제비의 무전기', reveal: () => true,
      steps: [{ text: '감금동 2층 사무실에서 제비의 무전기 챙기기', at: null, done: S => S.items.every(i => i.got) }] }
  ],
  endText: '제비의 무전기를 챙겨 빠져나왔다. 무전기에는 마지막 메시지가 남아 있다 — "올빼미, 까마귀를 믿지 마." 이제 까마귀를 찾아간다.',
  challenges: ['ghost', 'untouched', 'clean', 'fast'], fastT: 210,
  well: 'manhole', kunai: 3, coins: 0, reinf: [43, 20],
  hints: ['감방 바닥의 머리핀으로 문을 딸 수 있다. 간수가 등을 돌릴 때 딴다 — 긁는 소리가 난다.', '경비실의 압수품 가방에서 락픽·빈 캔·다트를 되찾을 수 있다. 장비 없이도 휘파람과 맨손을 쓸 수 있다.', '조직원을 쓰러뜨려 옷을 입으면 단지 안을 걸어서 지나갈 수 있다. 정문 정예는 얼굴을 안다.']
},
