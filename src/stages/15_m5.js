// ───────── 임무 5 (보통): 본부 — 옷을 빼앗아 입고 정면으로 걸어 들어간다
{
  id: 'm5', no: '05', name: '본부', sub: '임무 5 · 변장 · 암살 + 훔치기', fee: '200만',
  mission: '조직 본부 2층의 보스 처치, 1층 금고(비번)의 장부 회수 후 동쪽 큰길 끝으로',
  itemName: '장부', itemNames: ['장부'],
  brief: '남쪽 큰길·국밥집·골목은 사람들이 다니는 거리다. 본부와 본부 앞길·차고·뒷골목은 조직원만 다닌다. 본부 앞은 조직원 천지다. 남쪽 골목에서 혼자 담배 피우는 조직원의 옷을 빼앗아 입으면 걸어서 지나갈 수 있다 — 뛰거나 너무 붙으면 들킨다. 정문 정예와 보스는 얼굴을 안다. 금고 비번은 본부 1층 사무실에서 떠드는 둘에게서 듣는다.',
  W: 40, H: 26, start: [0, 24], exit: [39.5, 13], startA: 0, noRefine: true, floors: true, pspd: 1.3, gspd: 1.05, residents: 0,
  // 구역: 남쪽 거리·국밥집·골목은 공개(기본). 본부·본부 앞길·차고·뒷골목은 조직원만 — 조직원 옷이면 걸어서 지나간다
  zones: [[12, 2, 27, 10, 'hos', null, '조직 본부 · 적진'], [12, 11, 27, 14, 'res', null, '본부 앞길 · 조직원만'], [29, 2, 38, 10, 'hos', null, '차고 · 적진'], [0, 1, 39, 1, 'res', null, '뒷골목 · 조직원만']],
  zoneAllow: ['crew'],
  build(m) {
    m.fill(0, 0, 39, 25, '.'); for (let x = 0; x < 40; x++) m.set(x, 0, '#');
    m.fill(0, 11, 39, 11, '='); m.fill(0, 15, 39, 15, '='); m.fill(0, 24, 39, 25, '=');
    m.villa(12, 2, 27, 10, 2, { kind: 'shop', use: ['vault', 'office'], signs: ['', ''], plate: '본부', name: '조직 본부', back: true });   // 0
    m.villa(1, 2, 10, 10, 2);                                                                                         // 1
    // 동쪽 차고 마당 (담 · 입구 하나)
    for (let x = 29; x <= 38; x++) { m.set(x, 2, '#'); m.set(x, 10, '#'); } for (let y = 2; y <= 10; y++) { m.set(29, y, '#'); m.set(38, y, '#'); }
    m.fill(30, 3, 37, 9, ','); m.set(33, 10, ','); m.set(34, 10, ',');
    [[31, 4, 0], [35, 4, 2]].forEach(([x, y, c]) => m.car(x, y, c));
    m.villa(1, 16, 10, 23, 2, { kind: 'house' });                                                                     // 2
    m.villa(12, 16, 22, 23, 2);                                                                                       // 3
    m.villa(24, 16, 32, 23, 1, { kind: 'shop', use: ['food'], signs: ['국밥'] });                                       // 4
    m.fill(34, 16, 39, 23, ','); m.many('T', [[35, 17], [38, 21]]); m.many('B', [[34, 20], [37, 16]]);
    m.many('H', [[31, 8], [23, 17]]); m.many('O', [[33, 16]]);
    m.many('W', [[9, 14], [33, 24], [27, 1]]); m.set(23, 16, 'F');
    [[7, 12, 1], [20, 13, 3]].forEach(([x, y, c]) => m.car(x, y, c));
    mat(m, 'p', [[16, 13], [17, 13]]);
    // 본부 앞길: 컨테이너 더미로 꺾인 길
    m.fill(2, 12, 4, 13, 'U'); m.set(5, 13, 'L'); m.fill(32, 12, 34, 13, 'U'); m.set(35, 13, 'L');
    m.fill(11, 13, 11, 15, '#'); m.fill(28, 11, 28, 13, '#');                                                       // 담이 길을 끊는다: 북쪽·남쪽으로 번갈아 돌아간다
    // 차고 마당: 서쪽 쪽문은 안에서만 열린다 · 북쪽 담 위로 넘는 컨테이너
    m.set(29, 6, ','); m.fill(36, 1, 37, 1, 'U'); m.set(35, 1, 'L'); m.fill(36, 2, 37, 2, 'U');
  },
  planks: [[11, 4, 11, 4, 2]],                                                                                         // 서쪽 빌라 ↔ 본부 옥상
  gates: [{ at: [29, 6], open: 'e' }],
  wires: [], drops: [],
  roofs: ['cRoofB', 'cRoofA', 'cRoofG', 'cRoofA', 'cRoofB'], bricks: [0, 1, 0, 1, 0],
  ventB: [{ b: 0, at: [21, 4] }],
  locks: [{ b: 0, door: 'vault', key: 'code' }], code: '2580', codeOpp: false,
  interrogate: [{ gives: 'code', learn: '본부 금고 비번 2580', say: '2580! 금고 비번은 2580이야!' }],
  intel: [{ g: [2, 3], key: 2, gives: 'code', learn: '본부 금고 비번 2580', every: 22, first: 5, lines: [[0, '금고 비번 아직도 그거야?'], [1, '어. 전화기 가운데 줄 그대로.'], [1, '2, 5, 8, 0. 바보도 외운다.'], [0, '보스가 알면 난리 나겠다.']] }],
  well: 'manhole', kunai: 3, coins: 3, reinf: [39, 13],
  lamps: [[15, 11, 170, 1], [26, 11, 170, 1], [33, 11, 160, 1], [6, 15, 140, 1], [20, 15, 150, 1], [33, 6, 150, 1]],
  fuse: [23, 16, 23, 15],
  cams: [[19, 12, 270, 60], [33, 11, 90, 50], [22, 7, 180, 35, 0], [22, 4, 180, 40, 1], [30, 3, 45, 40], [11, 1, 0, 50], [10, 14, 180, 50]],
  camRoom: { pos: [15, 3], fl: 1 },                                                                     // 본부 2층 관리실 화면
  searchlights: [[28, 14, 180, 60], [24, 1, 180, 25]],                                                  // 본부 앞길 · 뒷골목
  radios: [3, 4, 6, 9],  // 무전기를 든 조직원 (guards 순번) — 무리마다 하나, 먼저 처리하면 경보가 퍼지지 않는다
  guards: [
    { kind: 't', target: true, tag: 'boss', b: 0, fl: 1, patrol: true, from: 'L', to: 'R' },   // 0 보스 (얼굴을 안다)
    { kind: 'g1', follow: 0, fl: 1, at: [15, 7] },  // 보스와 같은 2층에서 따라붙는다                                                   // 1 보스 경호
    { kind: 'g1', at: [15, 9], post: 0 }, { kind: 'g2', at: [17, 9], post: 180 },  // 2·3 1층 사무실 — 비번 이야기
    { kind: 'g2', at: [15, 12], post: 90, elite: true },                          // 4 정문 정예
    { kind: 'g1', at: [11, 20], post: 90 },                                       // 5 남쪽 골목에서 혼자 담배 — 옷 주인
    { kind: 'g2', at: [21, 12], post: 0 }, { kind: 'g1', at: [23, 12], post: 180 },  // 6·7 길가 잡담
    { kind: 'g1', at: [32, 7], post: 90 }, { kind: 'g2', route: [[30, 3, 2], [37, 3, 2], [37, 9, 2], [30, 9, 2]] },   // 8·9 차고
    { kind: 'dog', route: [[2, 1, 1.5], [34, 1, 1.5]] },                          // 10 뒷골목 개 (변장이 안 통한다)
    { kind: 'g2', route: [[6, 14, 2], [37, 12, 2]] },                             // 11 큰길 순찰
    { kind: 'g2', b: 0, fl: 1, at: 'S', post: 90 },                               // 12 본부 2층
    { kind: 'g1', at: [26, 12], post: 90 },                                       // 13 본부 계단실 문 앞
    // 14~18 거리 사람들: 큰길·남쪽 길 행인 · 국밥집 손님
    { kind: 'civ', wander: [0, 12, 10, 14], at: [6, 13] }, { kind: 'civ', body: 'fBob', wander: [29, 12, 39, 14], at: [36, 14] }, { kind: 'civ', wander: [2, 24, 38, 25], at: [20, 24] },
    { kind: 'civ', b: 4, fl: 0, at: 'L', post: 0 }, { kind: 'civ', body: 'fTail', b: 4, fl: 0, at: 'R', post: 180 },
    { kind: 'g2', tag: 'camop', at: [15, 4], fl: 1, post: 270, still: true }      // 19 관리실 — CCTV 화면을 본다
  ],
  items: [{ b: 0, fl: 0, at: 'VA' }],
  stories: [
    { id: 'dress', name: '조직원 옷', reveal: () => true,
      steps: [{ text: '남쪽 골목에서 혼자 담배 피우는 조직원의 옷 빼앗기', at: [11, 20, 0], done: S => (S.player.outfit === 'crew' && !S.player.disguiseBlown) || S.items.every(i => i.got) },
              { text: '조직원 옷으로 본부 앞길을 걸어서 지나 본부로 (정문 정예·보스는 얼굴을 안다 — 정면은 피한다)', at: [26, 12, 0], done: (S, h) => h.inRect(S.player, [12, 2, 27, 10, 0]) || h.inRect(S.player, [12, 2, 27, 10, 1]) || S.items.every(i => i.got) }] },
    { id: 'code', name: '금고 비번', reveal: (S, h) => h.knows('비번'),
      steps: [{ text: '본부 1층 금고에서 장부 챙기기', at: [18, 4, 0], done: S => S.items.every(i => i.got) }] },
    { id: 'purge', name: '본부 몰살', keepOpen: true, reveal: (S, h) => S.guards.some(g => g.radio && (g.state === 'DEAD' || g.state === 'CAPTIVE')) || (S.stats.crewKills || 0) >= 2,
      steps: [{ text: '무전기를 든 조직원부터 — 무전이 끊기면 아무도 지원을 못 부른다', at: null, done: S => S.guards.filter(g => g.radio && !g.reinf).every(g => g.state === 'DEAD' || g.state === 'CAPTIVE') },
              { text: '남은 조직원 정리 — 어둠·휘파람·수거함으로 하나씩 (몰살하면 수고비 +50만)', at: null, done: S => S.guards.filter(g => !g.civ && !g.dog && !g.reinf).every(g => g.state === 'DEAD' || g.state === 'CAPTIVE') }] },
    { id: 'boss', targetTag: 'boss', name: '2층 보스', reveal: (S, h) => h.inRect(S.player, [12, 2, 27, 10, 0]) || h.inRect(S.player, [12, 2, 27, 10, 1]),
      steps: [{ text: '본부 2층을 오가는 보스 처리 — 경호원이 따라붙는다', at: [19, 6, 1], done: (S, h) => h.eliminated('boss') }] }
  ],
  challenges: ['disguise', 'intel', 'purge', 'streak3', 'ghost', 'clean'],
  purgeBonus: 50,  // 본부 몰살: 조직원을 모두 처리하면 수고비 +50만
  entries: [{ name: '남서쪽 골목', desc: '기본 출발', at: [0, 24] }, { name: '서쪽 빌라 옥상', desc: '별 3개', at: [5, 4], z: 2, need: 3 }],
  hints: ['몰살도 길이다: 무전기를 든 조직원(머리 위 무전기)부터 끊으면 지원이 오지 않는다. 다 처리하면 수고비가 늘어난다.', '쓰러뜨린 조직원 옆에서 [행동] → 옷 갈아입기. 걸어 다니면 조직원은 멀리서 의심하지 않는다.', '뛰기 · 시체 들기 · 옥상 · 너무 가까이 붙기는 변장이 안 통한다. 정예·보스·개는 속지 않는다.', '자경대원을 누르면 그 자경대원의 순찰로와 시야를 고정 표시한다.']
},
