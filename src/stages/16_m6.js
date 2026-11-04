// ───────── 임무 6 (스토리): 배신 — 까마귀가 올빼미와 제비를 조직에 넘겼다. 감방에서 맨손으로 깨어나 빠져나간다
// 길: 감방 탈출(침대 밑 머리핀으로 따기 · 천장 환풍구) → 압수품 되찾기(선택) → 2층 사무실의 제비 무전기 → 동쪽 정문 또는 남쪽 담 개구멍
{
  id: 'm6', no: '06', name: '배신', sub: '의뢰 03', fee: '',
  mission: '감방 탈출 후 감금동 2층에서 제비의 무전기를 회수하고 탈출',
  itemName: '제비의 무전기', itemNames: ['제비의 무전기'],
  heightCueBuildings: [0, 1],
  fixedFurn:[{x:15,y:9,t:'locker',fl:1}],
  brief: '까마귀가 우리를 넘겼다. 감방 바닥의 머리핀으로 간수가 등을 돌렸을 때 문을 딸 수 있다. 압수품은 동쪽 경비실에 있다. 되찾을지는 선택이다. 제비의 무전기는 감금동 동쪽 계단으로 올라가는 2층 사무실에 있다 — 그것만은 두고 갈 수 없다. 2층은 보안구역이라 조직원 옷으로도 통과할 수 없다. 경비의 시선을 피하거나 유인·제압할 기회를 만든다. 신원이 CCTV에 녹화되면 경비실에서 기록을 지워야 탈출할 수 있다.',
  physicalAreas: [[19, 15, 19, 15]],
  powerArea: [15, 12, 38, 25], powerName: "창고 마당 조명",
  W: 44, H: 28, startAt: { b: 0, fl: 0, at: 'VC' }, start: [10, 6], exit: [43.5, 20.5], exitName: '동쪽 정문 밖', startA: Math.PI / 2, noRefine: true, floors: true, pspd: 1.3, gspd: 1.05, residents: 0,
  bare: true, candy: 0, noSupport: true, itemVerb: '챙기기', briefBy: '상황', kitStyle: 'industrial',
  firstGoal: { text: '감방에서 나가기', where: '감금동 1층 감방',
    guide:S=>{const pin=S.keyItems.find(k=>k.key==='pin'&&!k.got),P=S.player;if(pin&&!(P.picks>0))return{text:'바닥의 머리핀 줍기',x:pin.x,y:pin.y,fl:pin.fl||0};const door=S.doors.filter(d=>d.locked&&d.keyLock&&!(d.fl||0)).sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y))[0];return door?{text:'간수가 등을 돌리면 감방 문 앞에서 행동',x:door.x,y:door.y,fl:0}:null;},
    done: (S, h) => !h.inRect(S.player, [4, 4, 15, 6, 0]) },
  build(m) {
    m.fill(0, 0, 43, 27, ','); for (let x = 0; x < 44; x++) { m.set(x, 0, '#'); m.set(x, 27, '#'); } for (let y = 0; y < 28; y++) m.set(0, y, '#');
    for (let y = 0; y < 28; y++) if (y < 18 || y > 23) m.set(43, y, '#');                              // 동쪽 담: 정문(18~23)만 트였다
    m.fill(39, 18, 43, 23, '.');                                                                          // 정문 앞 길
    m.villa(3, 3, 19, 12, 2, { kind: 'shop', use: ['vault', 'office'], signs: ['', ''], plate: '감금동', name: '감금동', back: true });   // 0 감방(금고 방) · 2층 사무실
    // Screening the cell exit leaves the jailer to read before the office guard.
    m.fill(8,8,8,9,'C');
    m.villa(24, 3, 37, 11, 1, { kind: 'shop', use: ['office'], signs: [''], plate: '경비실', name: '경비실' });                        // 1 압수품
    m.villa(24, 16, 34, 24, 1, { kind: 'shop', use: ['store'], signs: ['자재'], name: '자재 창고' });                                  // 2
    m.villa(3, 16, 14, 24, 2, { kind: 'house', name: '숙소' });                                                                      // 3
    m.fill(16, 14, 18, 15, 'U'); m.set(19, 15, ','); m.fill(36, 13, 37, 14, 'U');                                       // 컨테이너 더미: 마당 시선을 끊는다
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
  secureFloors: [[0, 1]],
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
    { kind: 'g1', at: [11, 8], fl: 1, post: 0 }, { kind: 'g2', enforcer: true, at: [13, 8], fl: 1, post: 180 },           // 2·3 2층 사무실 — 제비 이야기
    { kind: 'g2', tag: 'camop', at: [27, 5], post: 270, still: true },                                  // 4 경비실 관리실 — CCTV 화면을 본다
    { kind: 'g1', route: [[22, 4, 2], [22, 24, 2]] },                                                   // 5 마당 남북 순찰
    { kind: 'g2', route: [[4, 14, 2], [38, 14, 2]] },                                                   // 6 마당 동서 순찰
    { kind: 'g1', at: [41, 18], post: 180, elite: true }, { kind: 'g2', at: [41, 23], post: 180 },       // 7·8 정문
    { kind: 'g1', b: 3, fl: 1, at: 'bed', post: 90, sleep: true },                                      // 9 숙소에서 자는 조직원
    { kind: 'dog', route: [[9, 26, 1.5], [27, 26, 1.5]] }                                               // 10 남쪽 담 개
  ],
  items: [{ b: 0, fl: 1, at: 'R' }],
  intel: [{ g: [2, 3], key: 2, gives: 'truth', learn: '까마귀가 올빼미와 제비를 함께 넘겼다 — 제비는 어젯밤 죽었다', every: 24, first: 4,
            lines: [[0, '두 사람 넘긴 게 까마귀라며?'], [1, '응. 그쪽 연락 받고 우리가 인수했잖아.'], [1, '여자는 어젯밤에 죽었대. 무전기는 여기 보관하고.'], [0, '남자는 아래 감방에 있어. 내일 이송한대.']] }],
  interrogate: [{ gives: 'truth', learn: '까마귀가 올빼미와 제비를 함께 넘겼다 — 제비는 어젯밤 죽었다', say: '까마귀가 넘겼어. 여자는 어제 죽었고, 무전기는 2층에 있어.' }],
  stories: [
    { id: 'cell', name: '감방 나가기', moot: (S, h) => !h.inRect(S.player, [4, 4, 15, 6, 0]), reveal: () => true,
      steps: [{ text: '감방 바닥에서 머리핀 찾기 — 락픽 대신 쓴다', at: null, done: S => !!(S.player.got || {}).pin || S.player.picks > 0 || !!S.player.keys.red },
              { text: '감방 문 따기 — 간수가 등을 돌렸을 때', at: null, done: (S, h) => !h.inRect(S.player, [4, 4, 15, 6, 0]) }] },
    { id: 'gear', name: '압수품 · 선택 경로', reveal: (S, h) => !h.inRect(S.player, [4, 4, 15, 6, 0]) || h.knows('압수품'),
      steps: [{ text: '동쪽 경비실에서 압수품 되찾기 · 배운 투척 기술도 사용 가능', at: [33,7,0], done: S => !!(S.player.got || {}).gear }] },
    { id: 'radio', name: '제비의 무전기', reveal: (S,h) => !h.inRect(S.player,[4,4,15,6,0]),
      steps: [{ text:'동쪽 계단으로 2층 진입 · 보안구역은 복장 통행 불가',at:[17,6,1],done:S=>(S.player.fl||0)===1||S.items.every(i=>i.got)},
              { text: '감금동 2층 사무실에서 제비의 무전기 챙기기', at: [13,6,1], done: S => S.items.every(i => i.got) }] }
  ],
  endText: '제비의 무전기를 회수해 빠져나왔다. 이제 이곳에 잡혀온 경위를 확인해야 한다.',
  challenges: ['unrecorded', 'ghost', 'untouched', 'clean', 'fast'], fastT: 210,
  well: 'manhole', kunai: 2, coins: 0, reinf: [43, 20],
  hints: ['감방 바닥의 머리핀으로 문을 딸 수 있다. 간수가 등을 돌릴 때 딴다 — 긁는 소리가 난다.', '압수품 회수는 선택이다. 락픽·빈 캔을 되찾고, 배운 투척 기술도 사용할 수 있다. 맨손과 휘파람은 장비 없이도 쓴다.', '조직원 옷은 마당에서 통하지만 감금동 2층 보안구역과 정문 정예는 피해야 한다.']
},
