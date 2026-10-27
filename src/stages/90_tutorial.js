];
// 쉬운 것부터: 금고 털기 → VIP → 본부(변장) → 정전 → 대청소
(o => STAGES.sort((a, b) => o.indexOf(a.id) - o.indexOf(b.id)))(['m1', 'm2', 'm5', 'm3', 'm4']);
STAGES.forEach((st, i) => { st.no = String(i + 1).padStart(2, '0'); st.sub = st.sub.replace(/^임무( \d)? ·/, `임무 ${i + 1} ·`); });
// ───────── 연습: 훈련장 — 한 칸씩 기술을 익힌다 (목록 맨 앞에 보인다)
// 연습은 둘로 나눈다: 기본(약 3분, 첫 의뢰 전에 필요한 것만)과 고급(선택). 같은 지도를 쓰고, 쓰지 않는 자경대원은 빼 둔다
const TUT = {
  id: 't0', no: '00', name: '연습', sub: '연습 · 훈련장', tutorial: true,
  mission: '기술을 하나씩 익힌다: 지도·살금·암살·시체 숨기·살피기·기대기·엿보기·유인·전깃줄·낙하 암살·락픽', itemName: '연습 장부', itemNames: ['연습 장부'],
  brief: '서쪽에서 동쪽으로 한 칸씩 나아가며 기술을 익힌다. 임무 칸 맨 위의 "연습" 줄이 지금 할 일이고, 대상 위에 "여기" 화살표가 뜬다. 들켜도 그 단계부터 다시 한다.',
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
    ['방향키(모바일은 화면을 끌어서)로 걸어 동쪽으로 가 보자', (S, P) => P.x > 3 * 48, () => ({ x: 4 * 48 + 24, y: 9 * 48 + 24 })],
    ['M(모바일은 미니맵을 눌러)으로 전술 지도 열기 — 게임이 멈추고 자경대원·순찰선·시야가 보인다. 다시 눌러 닫기', S => !!S.usedMap],
    ['Ctrl(모바일은 [살금])로 살금 모드 켜기 — 발소리가 아주 작아진다', (S, P, I) => I.sneakToggle],
    ['등 돌린 자경대원 뒤로 다가가 Space(행동 버튼) — 암살', S => S.guards[0].state === 'DEAD', S => S.guards[0]],
    ['시체 옆에서 Z(특수 버튼)로 메고, 쓰레기통 앞에서 Space로 넣기', S => (S.stats.stashed || 0) >= 1, S => S.player.carrying ? { x: 9 * 48 + 24, y: 7 * 48 + 24 } : S.corpses.find(c => !c.stashed)],
    ['Alt(모바일은 [살피기])를 누르고 있으면 숨을 곳·오를 곳·창문이 색으로 보인다', (S, P, I) => I.scan || S.guards[1].state === 'DEAD'],
    ['벽에 붙어 멈추면 저절로 기댄다 — 위쪽 상태 칸이 "숨음"(파랑)인지 보자', (S, P) => !!P.cover || S.guards[1].state === 'DEAD', () => ({ x: 15 * 48 + 24, y: 7 * 48 + 12 })],
    ['기댄 채 기다리다가 앞을 지나는 자경대원에게 Space — 끌어당겨 암살', S => S.guards[1].state === 'DEAD', S => S.guards[1]],
    ['창문 앞에서 창문 쪽을 바라보면 건물 안이 보인다 — 엿보기', S => !!S.peek, () => ({ x: 16 * 48 + 24, y: 7 * 48 + 24 })],
    ['이쪽을 보는 자경대원: X(빈 캔 버튼)를 누른 채 방향키로 겨누고(그동안 시간이 멈춘다) 떼면 던진다. 소리 난 곳을 보러 간다', S => ['SUSPICIOUS', 'LURE', 'CHECK'].includes(S.guards[2].state) || S.guards[2].state === 'DEAD', S => S.guards[2]],
    ['한눈판 자경대원 뒤로 돌아가 처치', S => S.guards[2].state === 'DEAD', S => S.guards[2]],
    ['전봇대 앞에서 Space — 올라가 전깃줄에 매달린다 (아래 자경대원 위에서 낙하 암살도 된다)', (S, P) => !!P.wire || P.x > 26 * 48, () => ({ x: 20 * 48 + 24, y: 11 * 48 + 24 })],
    ['방향키로 줄을 따라 동쪽 전봇대까지 가서 Space — 내려오기', (S, P) => !P.wire && P.x > 25 * 48, () => ({ x: 27 * 48 + 24, y: 11 * 48 + 24 })],
    ['컨테이너 옆 사다리 앞에서 Space — 위로 오르기', (S, P) => P.z > 0 || S.guards[3].state === 'DEAD', () => ({ x: 25 * 48 + 24, y: 5 * 48 + 24 })],
    ['아래를 지나는 자경대원이 가까워지면 Space — 낙하 암살', S => S.guards[3].state === 'DEAD', S => S.guards[3]],
    ['연습 창고는 잠겨 있다. 창문이나 문 앞에서 Space — 락픽으로 따기 (움직이지 말고 기다린다)', S => (S.stats.picks || 0) >= 1, () => ({ x: 36 * 48 + 24, y: 6 * 48 + 24 })],
    ['연습 장부를 줍고 동쪽 끝(노란 원)으로 나가기', S => S.items.every(i => i.got), S => S.items[0]]
  ]
};
STAGES.push(Object.assign({}, TUT, { id: 't0', name: '연습 1 · 기본', sub: '연습 · 기본 (약 3분)', exit: [21.5, 9], items: [], itemName: '', itemNames: [], dropGuards: [2, 3],
  mission: '기본 기술: 걷기 · 전술 지도 · 살금 · 뒤에서 암살 · 시체 숨기 · 살피기 · 벽에 기대 끌어당기기',
  brief: '서쪽에서 동쪽으로 나아가며 첫 의뢰에 필요한 기술만 익힌다. 임무 칸 맨 위 "연습" 줄이 지금 할 일이고, 대상 위에 화살표가 뜬다. 들켜도 그 단계부터 다시 한다.',
  steps: TUT.steps.slice(0, 8).concat([['동쪽 노란 원(출구)으로 나가면 기본 연습 끝', () => false, S => S.exit]]) }));
STAGES.push(Object.assign({}, TUT, { id: 't1', kitId: 't0', name: '연습 2 · 고급', sub: '연습 · 고급 (선택)', start: [20, 9], dropGuards: [0, 1],
  mission: '고급 기술: 엿보기 · 빈 캔 유인 · 전깃줄 · 낙하 암살 · 락픽',
  brief: '기본 연습 다음 구간. 창문 엿보기, 빈 캔으로 꾀어내기, 전깃줄 타기, 위에서 덮치기, 잠긴 문 따기를 익힌다. 들켜도 그 단계부터 다시 한다.',
  steps: TUT.steps.slice(8) }));

