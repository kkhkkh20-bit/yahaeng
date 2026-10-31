];
// 쉬운 것부터: 장부 털기 → VIP → 잔칫날 → 대청소 → 본부 (구역 규칙 판이 앞, 수고비도 이 순서로 오른다. 데모 의뢰 1~3이 이어진다)
(o => STAGES.sort((a, b) => (a.city ? 99 : o.indexOf(a.id)) - (b.city ? 99 : o.indexOf(b.id))))(['m1', 'm2', 'm3', 'm4', 'm5', 'm6']);
STAGES.forEach((st, i) => { st.no = String(i + 1).padStart(2, '0'); st.sub = st.sub.replace(/^임무( \d)? ·/, `임무 ${i + 1} ·`); });
// ───────── 연습: 훈련장 — 한 칸씩 기술을 익힌다 (목록 맨 앞에 보인다)
// 연습은 둘로 나눈다: 기본(약 3분, 첫 의뢰 전에 필요한 것만)과 고급(선택). 같은 지도를 쓰고, 쓰지 않는 자경대원은 빼 둔다
const TUT = {
  id: 't0', no: '00', name: '연습', sub: '연습 · 훈련장', tutorial: true,
  mission: '기술을 하나씩 익힌다: 지도·웅크리기·기절과 처치·시체 숨기기·상호작용·엄폐·유인·전깃줄·락픽', itemName: '연습 장부', itemNames: ['연습 장부'],
  brief: '서쪽에서 동쪽으로 한 칸씩 나아가며 기술을 익힌다. 목표 목록 맨 위의 "연습" 줄이 지금 할 일이고, 대상 위에 "여기" 화살표가 뜬다. 들켜도 그 단계부터 다시 한다.',
  W: 41, H: 15, start: [1, 9], exit: [40.5, 9], startA: 0, noRefine: true, floors: false, pspd: 1.25, gspd: 0.9, residents: 0,
  build(m) {
    m.fill(0, 0, 40, 14, ','); for (let x = 0; x < 41; x++) { m.set(x, 0, '#'); m.set(x, 14, '#'); }
    m.fill(0, 8, 40, 10, '.'); m.fill(0, 7, 40, 7, '='); m.fill(0, 11, 40, 11, '=');
    m.villa(11, 2, 18, 6, 1, { kind: 'house', name: '연습 벽집' });                                       // 0 기대기 벽 · 엿보기 창문
    m.villa(33, 1, 38, 6, 1, { kind: 'shop', use: ['store'], signs: ['연습 창고'], name: '연습 창고' });    // 1 락픽
    m.fill(26, 3, 30, 5, 'U'); m.set(25, 5, 'L');                                                           // 컨테이너 + 사다리
    m.set(9, 7, 'H'); m.set(15, 12, 'H');                                                                   // 쓰레기통 (시체 숨기기)
    m.many('T', [[4, 12], [22, 4], [31, 12]]); m.many('B', [[2, 12], [8, 12], [24, 12]]);
    [20, 27].forEach(x => m.pole(x, 11, 2));                                                                 // 전봇대 둘 + 전깃줄
    m.car(36, 12, 1);
  },
  wires: [[[20, 11], [27, 11]]],
  roofs: ['cRoofG', 'cRoofA'], bricks: [1, 0],
  keyBld: [1],
  well: 'manhole', kunai: 2, coins: 2,
  lamps: [[5, 11, 120, 1], [39, 9, 120, 1]],
  guards: [
    { kind: 'g1', at: [8, 9], post: 0, still: true },                       // 0 등 돌린 자경대원 (뒤에서 암살) — 돌아보지 않는다
    { kind: 'g1', route: [[19, 8, 1.5], [11, 8, 1.5]], still: true },      // 1 벽 앞을 오가는 자경대원 (기대서 끌어당기기)
    { kind: 'g1', at: [24, 9], post: 180, still: true },                   // 2 이쪽을 보는 자경대원 (빈 캔으로 유인)
    { kind: 'g2', route: [[27, 6, 1.2], [31, 6, 1.2]], still: true }       // 3 컨테이너 아래 (낙하 암살)
  ],
  items: [{ b: 1, fl: 0, at: 'L' }],
  challenges: [],
  steps: [
    ['{이동} 동쪽으로 걸어 보자', (S, P) => P.x > 3 * 48, () => ({ x: 4 * 48 + 24, y: 9 * 48 + 24 })],
    ['{지도} 전술 지도 열기 — 멈춘 채 순찰로가 보인다. 다시 눌러 닫기', S => !!S.usedMap],
    ['{살금} 몸 낮추기 — 발소리와 노출 감소', (S, P, I) => I.sneakToggle],
    ['등 돌린 자경대원 뒤에서 {공격} — 톡 누르면 기절, 계속 누르면 처치', S => S.guards[0].state === 'DEAD', S => S.guards[0]],
    ['쓰러진 사람을 {행동}으로 메고, 수거함 앞에서 다시 {행동}', S => (S.stats.stashed || 0) >= 1, S => S.player.carrying ? { x: 9 * 48 + 24, y: 7 * 48 + 24 } : S.corpses.find(c => !c.stashed)],
    ['문·벽에 가까이 가서 {행동} 안내 확인하기', (S,P)=>Math.hypot(P.x-(15*48+24),P.y-(7*48+12))<88||S.guards[1].state==='DEAD',()=>({x:15*48+24,y:7*48+12})],
    ['벽 쪽으로 0.5초 밀기 — 등을 바짝 붙인다', (S, P) => !!P.cover || S.guards[1].state === 'DEAD', () => ({ x: 15 * 48 + 24, y: 7 * 48 + 12 })],
    ['붙은 채 기다렸다가 지나가는 자경대원에게 {공격}', S => S.guards[1].state === 'DEAD', S => S.guards[1]],
    ['창문 쪽을 바라보면 안이 보인다 — 엿보기', S => !!S.peek, () => ({ x: 16 * 48 + 24, y: 7 * 48 + 24 })],
    ['{바꾸기} 빈 캔을 고르고 {도구} 누른 채 겨누고 떼서 던지기 — 소리 난 곳을 보러 간다', S => ['SUSPICIOUS', 'LURE', 'CHECK'].includes(S.guards[2].state) || S.guards[2].state === 'DEAD', S => S.guards[2]],
    ['한눈판 자경대원 뒤로 돌아가 {공격}', S => S.guards[2].state === 'DEAD', S => S.guards[2]],
    ['전봇대 앞에서 {행동} — 전깃줄에 매달리기', (S, P) => !!P.wire || P.x > 26 * 48, () => ({ x: 20 * 48 + 24, y: 11 * 48 + 24 })],
    ['줄을 따라 동쪽 전봇대까지 가서 {행동} — 내려오기', (S, P) => !P.wire && P.x > 25 * 48, () => ({ x: 27 * 48 + 24, y: 11 * 48 + 24 })],
    ['컨테이너 사다리 앞에서 {행동} — 오르기', (S, P) => P.z > 0 || S.guards[3].state === 'DEAD', () => ({ x: 25 * 48 + 24, y: 5 * 48 + 24 })],
    ['아래로 자경대원이 오면 {공격} — 위에서 덮치기', S => S.guards[3].state === 'DEAD', S => S.guards[3]],
    ['잠긴 창고 문 앞에서 {행동} — 락픽으로 따기(가만히)', S => (S.stats.picks || 0) >= 1, () => ({ x: 36 * 48 + 24, y: 6 * 48 + 24 })],
    ['장부를 줍고 동쪽 노란 원으로 나가기', S => S.items.every(i => i.got), S => S.items[0]]
  ]
};
STAGES.push(Object.assign({}, TUT, { id: 't0', name: '연습 2 · 잠입 기초', sub: '연습 · 잠입 기초 (선택, 약 3분)', exit: [21.5, 9], items: [], itemName: '', itemNames: [], dropGuards: [2, 3],
  mission: '잠입 기초: 걷기·전술 지도·웅크리기·뒤에서 제압·시체 숨기기·엄폐',
  brief: '서쪽에서 동쪽으로 나아가며 첫 의뢰에 필요한 기술만 익힌다. 목표 목록 맨 위 "연습" 줄이 지금 할 일이고, 대상 위에 화살표가 뜬다. 들켜도 그 단계부터 다시 한다.',
  steps: TUT.steps.slice(0, 8).concat([['동쪽 노란 원으로 나가면 끝', () => false, S => S.exit]]) }));
STAGES.push(Object.assign({}, TUT, { id: 't1', kitId: 't0', name: '연습 3 · 고급', sub: '연습 · 고급 (선택)', start: [20, 9], dropGuards: [0, 1],
  mission: '고급 기술: 엿보기 · 빈 캔 유인 · 전깃줄 · 위에서 덮치기 · 락픽',
  brief: '기본 연습 다음 구간. 창문 엿보기, 빈 캔으로 꾀어내기, 전깃줄 타기, 위에서 덮치기, 잠긴 문 따기를 익힌다. 들켜도 그 단계부터 다시 한다.',
  steps: TUT.steps.slice(8) }));


// ───────── 연습 1 · 신분 (히트맨식 기본): 거리에선 행인 · 출입 금지는 경고 · 엿듣기 · 기절 · 옷 · 숨기기 · 초록 경계선 · 눈썰미
const npcT = (S, t) => S.guards.find(g => g.tag === t);
const inR = (P, r) => P.x >= r[0] * 48 && P.x < (r[2] + 1) * 48 && P.y >= r[1] * 48 && P.y < (r[3] + 1) * 48;
STAGES.push({
  id: 'tI', no: '00', name: '연습 1 · 신분', sub: '연습 · 신분 (약 4분, 먼저 하기)', tutorial: true, kitId: 't0',
  mission: '이 게임의 기본 규칙: 공개·출입 금지 구역 구분, 엿듣기·기절·변장·은신·신원 확인', itemName: '', itemNames: [],
  brief: '서쪽에서 동쪽으로 걸으며 이 게임의 규칙을 익힌다. 거리(공개 구역)에선 나는 그냥 행인이다. 주황 경계선 안은 출입 금지 — 그곳 사람의 옷을 입으면 경계선이 초록으로 바뀌고 지나다닐 수 있다. 목표 목록 맨 위 "연습" 줄이 지금 할 일이다.',
  W: 44, H: 16, start: [1, 10], exit: [43.5, 10], startA: 0, noRefine: true, floors: false, pspd: 1.25, gspd: 0.9, residents: 0, candy: 0,
  build(m) {
    m.fill(0, 0, 43, 15, ','); for (let x = 0; x < 44; x++) { m.set(x, 0, '#'); m.set(x, 15, '#'); }
    m.fill(0, 9, 43, 11, '.'); m.fill(0, 8, 43, 8, '='); m.fill(0, 12, 22, 12, '='); m.fill(29, 12, 43, 12, '=');
    m.fill(11, 3, 16, 7, '.'); m.fill(10, 2, 17, 2, '#'); m.fill(10, 2, 10, 7, '#'); m.fill(17, 2, 17, 7, '#');            // 북쪽 마당 (출입 금지)
    m.fill(23, 12, 28, 14, '.'); m.fill(22, 12, 22, 14, '#'); m.fill(29, 12, 29, 14, '#'); m.set(24, 14, 'H');            // 남쪽 골목 + 수거함
    m.fill(30, 3, 37, 7, '.'); m.fill(29, 2, 38, 2, '#'); m.fill(29, 2, 29, 7, '#'); m.fill(38, 2, 38, 7, '#');            // 동쪽 자경대원 마당
    m.many('T', [[3, 5], [6, 3], [20, 4], [41, 4], [40, 13]]); m.many('B', [[2, 13], [8, 13], [19, 13], [33, 13]]);
    m.car(39, 13, 1);
  },
  wires: [], roofs: [], bricks: [],
  well: 'manhole', kunai: 0, coins: 0,
  lamps: [[5, 9, 140, 1], [13, 8, 120, 1], [20, 9, 140, 1], [26, 13, 90, 1], [33, 8, 140, 1], [41, 10, 140, 1]],
  zones: [[11, 3, 16, 7, 'res', null, '출입 금지 마당'], [30, 3, 37, 7, 'res', null, '자경대원 마당 · 자경대원 옷이면 통과']],
  intel: [{ g: [2, 3], key: 1, learn: '골목 안 자경대원은 늘 혼자 담배를 피운다', every: 3, first: 1, lines: [[0, '골목 안에 그 사람 또 혼자 있더라.'], [1, '맨날 혼자 담배 피우잖아. 등 돌리고.'], [0, '누가 뒤에서 오면 모르겠네.']] }],
  guards: [
    { kind: 'g1', tag: 'street', at: [7, 10], post: 180, still: true },          // 0 거리의 자경대원 (나를 보고 있지만 거리에선 행인)
    { kind: 'g2', tag: 'yard', at: [14, 5], post: 90, still: true },             // 1 북쪽 마당 (경고)
    { kind: 'civ', at: [19, 8], post: 0, body: 'fBob' }, { kind: 'civ', at: [20, 8], post: 180, body: 'coat' },   // 2·3 수다 (엿듣기)
    { kind: 'g1', tag: 'lone', at: [26, 13], post: 0, still: true },             // 4 골목에서 혼자 (암살 → 옷)
    { kind: 'g2', tag: 'chief', at: [32, 4], post: 90, still: true, enforcer: true }   // 5 반장 (눈썰미)
  ],
  items: [], challenges: [],
  steps: [
    ['{이동} 동쪽으로 — 거리에선 나는 그냥 행인', (S, P) => P.x > 4 * 48, () => ({ x: 5 * 48 + 24, y: 10 * 48 + 24 })],
    ['자경대원 옆을 그냥 걸어서 지나가 보자', (S, P) => P.x > 9 * 48, S => npcT(S, 'street')],
    ['북쪽 마당(주황 = 출입 금지)에 들어가 경고를 받고 다시 나오기', (S, P) => npcT(S, 'yard').warned && P.y > 8 * 48, S => npcT(S, 'yard').warned ? { x: 14 * 48 + 24, y: 10 * 48 + 24 } : { x: 14 * 48 + 24, y: 6 * 48 + 24 }],
    ['수다 떠는 두 사람 곁에서 엿듣기', S => (S.learned || []).length > 0, () => ({ x: 19 * 48 + 48, y: 9 * 48 + 24 })],
    ['남쪽 골목 혼자인 자경대원 뒤에서 {공격} — 기절', S => npcT(S, 'lone').state === 'DEAD', S => npcT(S, 'lone')],
    ['{행동} 옷 갈아입기 · 다른 행동이 보이면 {대상}', (S, P) => P.outfit === 'crew', S => S.corpses.find(c => c.tag === 'lone') || npcT(S, 'lone')],
    ['{행동}으로 메고 수거함에 넣기 — 발견되지 않도록 숨기기', S => S.corpses.some(c => c.tag === 'lone' && c.stashed), (S) => S.player.carrying ? { x: 24 * 48 + 24, y: 14 * 48 + 24 } : S.corpses.find(c => c.tag === 'lone')],
    ['초록 경계선 마당은 이 옷이면 통과 — 안쪽 끝까지 걸어가기', (S, P) => inR(P, [35, 3, 37, 5]), () => ({ x: 36 * 48 + 24, y: 4 * 48 + 24 })],
    ['눈 표시 반장의 시야를 피해 노란 탈출 지점으로 이동하기', () => false, S => S.exit]
  ]
});
