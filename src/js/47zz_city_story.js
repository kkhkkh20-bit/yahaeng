// ---------------------------------------------------------------- 자유 모드 이야기: 은퇴한 전직 요원 '올빼미'
// 설정: 올빼미는 국가 비밀 처리반에서 은퇴한 요원이다. 지금은 아무 소속도 없다 — 경찰 눈에는 그냥 범죄자다.
// 광역수사대 강 형사가 공중전화로 연락한다. 법으로는 못 잡는 놈들, 위에서 사건을 덮어 주는 놈들을 넘긴다.
// 강 형사가 제일 싫어하는 건 배지 단 쓰레기다 — 마지막 장의 표적.
//   · 메인 이야기(공중전화): 짧은 장(에피소드)이 차례로. 한 장 = 표적 하나. 장마다 처치 방법이 정해져 있다. 실패하면 다시.
//   · 조직 이야기(연락책): 조직마다 세 걸음. 연락책 메뉴 맨 위에 '[이야기 n/3]'.
//   · 보이스피싱 사기단(공중전화, 메인 장 사이): 아래 PHISH.
// 진행은 자유 모드 저장에 함께 남는다 (47e saveFreeProgress · loadFreeProgress).

// 메인 이야기 — 배지 뒤의 놈들 (장마다 짧게: 지령 두세 줄, 결과 한 줄)
const STORY_MAIN = [
  { title: '불법 추심', ctr: 'plain', fac: 'A', target: '문태식', escorts: 1, pay: 400,
    brief: [['master', '은퇴했다며. 하나만 보자. 사채업자 문태식 — 이자를 열 배로 뜯고, 못 갚으면 애 학교로 찾아간다.'], ['master', '신고가 열두 건인데 다 흐지부지. 방법은 네가 고른다.'], ['master', '총이 필요하면 뒷골목 박씨를 찾아. 경찰 권총이 거기서 돈다. 지도에 찍어 둔다 — 비밀이다.'], ['hero', '은퇴는 다음 주부터 하지.']],
    debrief: [['master', '문태식 장부에 매달 "노 계장 몫"이라는 줄이 있더라. 일단 넘어가자.']] },
  { title: '상습 뺑소니', ctr: 'roadkill', fac: 'B', target: '오정길', escorts: 1, pay: 500,
    brief: [['master', '오정길. 음주 뺑소니만 세 번, 매번 합의금이랑 "아는 형님"으로 빠져나왔다.'], ['master', '같은 방식으로 돌려줘. 차로. 치고 바로 빠져.'], ['hero', '교통사고는 흔하지.']],
    debrief: [['master', '오정길 사건 세 개 다 같은 계장 결재였다. 노기석.']] },
  { title: '그의 차', ctr: 'stage', fac: 'C', target: '백상만', escorts: 1, pay: 600,
    brief: [['master', '백상만 사장. 직원 때리고 월급 떼먹고, 신고하면 경찰이 먼저 사장한테 전화한다.'], ['master', '습관이 많은 놈이다. 곁에 붙어 엿들어 — 틈은 놈이 알려 준다. 4분 뒤엔 차 타고 뜬다. 총은 쓰지 마.'], ['hero', '사고는 원래 습관에서 난다.']],
    debrief: [['master', '백상만 차에서 수사 기록 사본이 나왔다. 누가 안에서 흘린다.']] },
  { title: '떨어지는 간판', ctr: 'sign', fac: 'D', target: '한두철', escorts: 1, pay: 700,
    brief: [['master', '한두철. 깡통전세로 세입자 마흔 명 보증금을 날리고 바지사장 뒤에 숨었다.'], ['master', '놈 도는 길에 낡은 간판이 걸려 있다. 배관 타고 옥상에 올라가 밑을 지날 때 줄을 풀어.'], ['hero', '을지로 간판은 원래 위험하지.']],
    debrief: [['master', '한두철이 마지막으로 통화한 놈 — 사건 무마 브로커 유창배. 얼굴 사진 한 장뿐이다.']] },
  { title: '얼굴 없는 브로커', ctr: 'photo', fac: 'A', target: '유창배', escorts: 2, pay: 800,
    brief: [['master', '유창배는 업자 돈 받아서 경찰 쪽에 사건을 꺼 주는 놈이다. 기록이 없어.'], ['master', '그 블록 어딘가를 돈다. 얼굴 확인하기 전엔 아무도 건드리지 마.'], ['hero', '얼굴은 한 번 보면 안 잊는다.']],
    debrief: [['master', '유창배 수첩. 돈은 결국 한 사람한테 간다. 우리 서 강력계장, 노기석.'], ['master', '…이번 건 나도 같이 묻히는 거다.']] },
  { title: '배지 단 놈', ctr: 'snipe', fac: 'B', target: '노기석', escorts: 2, pay: 1200,
    brief: [['master', '노기석 계장. 지금까지 네가 치운 놈들 전부 이 사람이 덮어 줬다.'], ['master', '사람 많은 데서만 다니고 조직 애들이 붙어 다닌다. 500픽셀 밖에서 한 발로. 압수품 저격총을 하나 빼 놨다.'], ['hero', '배지는 방탄이 아니지.']],
    debrief: [['master', '감찰이 움직이기 시작했다. 덮였던 사건들이 다시 열린다.'], ['master', '…고맙다. 이 번호는 당분간 꺼 둔다.'], ['hero', '은퇴는 다음 주에 다시 하지.']] },
];
// 조직 이야기 (연락책): 조직마다 세 걸음
const STORY_SIDE = {
  A: { title: '조직 — 빚', steps: [
    { title: '장부 운반', kind: 'parcel', pay: 220, intro: ['너 말 많다던데. 입 무거우면 일 하나 준다.', '장부를 사무실까지 옮겨. 열어 보면 죽는다.'], outro: ['안 열었구나. 좋아. 다음은 진짜 일이다.'] },
    { title: '건달파 수금원 처리', kind: 'hit', fac: 'B', ctr: 'blade', pay: 320, intro: ['건달파 놈 하나가 우리 빚쟁이 돈을 가로챘다.', '총 쓰지 마. 칼로 조용히. 소문 나면 안 된다.'], outro: ['깔끔하네. 회장님이 너를 보고 싶어 한다.'] },
    { title: '회장님 차', kind: 'car', pay: 450, intro: ['회장님 차를 누가 끌고 갔다. 찾아서 본부 앞으로 가져와.', '긁히면 네 몸으로 갚는 거다.'], outro: ['회장님이 고맙다신다. 조직은 빚을 잊지 않는다 — 좋은 쪽으로도.'] }] },
  B: { title: '건달파 — 당구장 전쟁', steps: [
    { title: '도난차 회수', kind: 'car', pay: 200, intro: ['당구장 앞에 세워 둔 내 차를 청계파 애들이 끌고 갔다.', '찾아서 당구장 앞으로 가져와.'], outro: ['역시 손이 빠르네. 근데 이걸로 안 끝난다.'] },
    { title: '청계파 행동대장', kind: 'hit', fac: 'C', ctr: 'accident', pay: 350, intro: ['청계파 행동대장이 우리 당구장을 노린다.', '사고로 보이게. 전쟁 나는 건 싫다.'], outro: ['청계파가 조용해졌다. 근데 위에서 누가 이 판을 짜는 것 같아.'] },
    { title: '판을 짠 놈', kind: 'hit', fac: 'D', ctr: 'plain', pay: 500, intro: ['알아냈다. 종로파 중간 보스가 양쪽에 기름을 붓고 있었어.', '이번엔 방법 안 가린다. 끝내.'], outro: ['당구장 전쟁 끝. 우리 구역에선 네가 형님이다.'] }] },
  C: { title: '청계파 — 물길', steps: [
    { title: '물길 상자', kind: 'parcel', pay: 220, intro: ['청계천 밑으로 물건이 다닌다. 상자 하나 옮겨 줘.', '늦으면 물이 불어. 서둘러.'], outro: ['잘 왔다. 물길을 아는 놈이 하나 늘었네.'] },
    { title: '밀고자', kind: 'hit', fac: 'A', ctr: 'roadkill', pay: 380, intro: ['우리 물길을 조직에 판 놈이 있다.', '차로. 뺑소니처럼. 그리고 사라져.'], outro: ['밀고자가 없으니 물길이 다시 흐른다.'] },
    { title: '다리 위의 간판', kind: 'hit', fac: 'B', ctr: 'sign', pay: 520, intro: ['건달파 감시꾼이 매일 같은 길로 다닌다. 그 위에 낡은 간판이 있어.', '철거 안 한 간판이 떨어지는 일, 을지로에선 흔하지.'], outro: ['청계천은 이제 우리 거다. 고맙다, 형씨.'] }] },
  D: { title: '종로파 — 밤의 시장', steps: [
    { title: '돈가방 경주', kind: 'race', pay: 200, intro: ['밤 시장 판돈을 교차로마다 돌려야 한다.', '시간 안에 못 돌면 판이 깨져.'], outro: ['빠르네. 밤 시장은 빠른 놈을 좋아한다.'] },
    { title: '야간 배달', kind: 'parcel', pay: 260, intro: ['이번 물건은 깨지는 거다. 조심해서, 빨리.'], outro: ['한 병도 안 깨졌군. 이제 큰일을 맡기지.'] },
    { title: '얼굴 없는 손님', kind: 'hit', fac: 'C', ctr: 'photo', pay: 540, intro: ['시장에서 매번 판을 털어 가는 놈이 있다. 사진 한 장뿐이야.', '그 블록을 돌며 얼굴을 찾아서 끝내.'], outro: ['밤 시장이 다시 열린다. 넌 이제 이 시장의 손님이 아니라 주인이다.'] }] },
};
function storyInit() { S.story = Object.assign({ ch: 0, side: {}, failed: false }, S.storySaved || {}); if (!S.story.side) S.story.side = {}; S.story.nextT = 0; }
const storyMainLeft = () => STAGE.cityLife && S.story && S.story.ch < STORY_MAIN.length;
// 전화 한 통: 메인 이야기가 남았으면 그 장 (앞 장 결과 보고 + 이번 지령). 없으면 null → 평소 일거리
function storyCall() {
  if (!storyMainLeft() || S.t < (S.story.nextT || 0)) return phishCall() || dtrCall();  /* 보이스피싱 줄기와 「사라진 딸」 줄기가 번갈아 온다 (47zm) */  /* 장과 장 사이엔 보이스피싱 추적이나 평소 일거리 전화가 온다 */
  const n = S.story.ch, C = STORY_MAIN[n];
  let plan = planHit(); if (!plan) return null;
  if (C.ctr === 'stage' || C.ctr === 'sign') for (let k = 0; k < 12 && !signCands(plan.route).length; k++) plan = planHit() || plan;  /* 무대: 간판을 걸 수 있는 블록을 고른다 */
  Object.assign(plan, { kind: 'hit', name: C.target, fac: C.fac, escorts: C.escorts, ctr: C.ctr, pay: C.pay, story: n });
  if (n === 0) S.gunTip = true;  /* 첫 통화에서 밀매상 귀띔 → 미니맵에 뜬다 (47zg) */
  const prev = n > 0 ? STORY_MAIN[n - 1].debrief : [], retry = S.story.failed ? [['master', '지난번 일은 틀어졌다. 한 번 더 기회를 주지.']] : [];
  const head = [[{ note: '제보' }, `메인 이야기 ${n + 1}/${STORY_MAIN.length} · ${C.title}`]];
  return { plan, lines: [...head, ...(S.story.failed ? retry : prev), ...C.brief] };
}
function storyMainDone(h, ok) {
  if (h.story == null || !S.story) return;
  if (!ok) { S.story.failed = true; return; }
  S.story.failed = false; S.story.ch = Math.max(S.story.ch, h.story + 1); fstat('storyCh');
  const R = (S.story.rec || (S.story.rec = {}))[h.story] || (S.story.rec[h.story] = { ways: [], best: null });
  if (h.cause && !R.ways.includes(h.cause)) R.ways.push(h.cause);
  if (h.gradeG && (!R.best || 'SABC'.indexOf(h.gradeG) < 'SABC'.indexOf(R.best))) R.best = h.gradeG;
  const C = STORY_MAIN[h.story];
  evBanner(`메인 이야기 ${h.story + 1}/${STORY_MAIN.length} 완료 — ${C.title}`, '#c9a2ff');
  storyCard(h.story, true);
  if (S.story.ch >= STORY_MAIN.length) after(2.5, () => say(C.debrief, true));  // 마지막 장: 바로 결말 무전
  S.story.nextT = S.t + 150; S.ringNext = S.t + 18; saveFreeProgress(true);
}
// 조직 이야기: 연락책 메뉴 맨 위 항목
function storySideItem(f) {
  const ch = STORY_SIDE[f]; if (!ch || !S.story) return null; const n = S.story.side[f] | 0; if (n >= ch.steps.length) return { name: `[이야기 끝] ${ch.title}`, tag: '완료', done: true };
  const st = ch.steps[n], c = S.contacts[f];
  return { name: `[이야기 ${n + 1}/${ch.steps.length}] ${st.title}`, tag: `${st.pay}만`, story: true, go: () => {
    const sp = { note: `${STAND_NAME[f]} 연락책` }, intro = st.intro.map(t => [sp, t]);
    let ok = false;
    if (st.kind === 'hit') { const p = planHit(); if (!p) return false; Object.assign(p, { kind: 'hit', fac: st.fac, ctr: st.ctr, pay: st.pay, stand: { [f]: 10, [st.fac]: -12, P: -2 }, name: `${STAND_NAME[st.fac]} ${p.name}`, chain: { f, n } }); startJob(p); ok = !!S.hit; }
    else if (st.kind === 'parcel') { const p = planParcel(); if (!p) return false; Object.assign(p, { kind: 'parcel', from: { x: c.x + 30, y: c.y + 20 }, fromSign: CONTACT_BLD[f] }); startJob(p); ok = !!S.job; if (ok) Object.assign(S.job, { pay: st.pay, stand: { [f]: 6, P: -1 }, chain: { f, n } }); }
    else if (st.kind === 'car') { const p = planCarJob(); if (!p) return false; p.kind = 'car'; startJob(p); ok = !!S.job; if (ok) Object.assign(S.job, { drop: { x: c.x, y: c.y, label: CONTACT_BLD[f] }, pay: st.pay, stand: { [f]: 7, P: -2 }, chain: { f, n } }); }
    else { const p = planRace(); if (!p) return false; p.kind = 'race'; startJob(p); ok = !!S.job; if (ok) Object.assign(S.job, { pay: st.pay, stand: { [f]: 5 }, chain: { f, n } }); }
    if (ok) say(intro, true);
    return ok;
  } };
}
function storySideDone(chain, ok) {
  if (!chain || !S.story || !ok) return;
  const ch = STORY_SIDE[chain.f]; if (!ch) return; const st = ch.steps[chain.n]; if (!st) return;
  S.story.side[chain.f] = Math.max(S.story.side[chain.f] | 0, chain.n + 1); fstat('storySide');
  const last = S.story.side[chain.f] >= ch.steps.length;
  evBanner(`${ch.title} ${chain.n + 1}/${ch.steps.length} 완료${last ? ' — 이야기 끝' : ' — 연락책에게 가면 다음 이야기'}`, STAND_COL[chain.f]);
  after(1.6, () => say(st.outro.map(t => [{ note: `${STAND_NAME[chain.f]} 연락책` }, t]), true));
  saveFreeProgress(true);
}
// 장 제목 카드: 장이 시작될 때와 끝날 때 화면 위아래를 검은 띠로 덮고 제목을 띄운다 (조작은 막지 않는다)
function storyCard(n, done) {
  const C = STORY_MAIN[n]; if (!C) return; let el = document.getElementById('storyCard');
  if (!el) { el = document.createElement('div'); el.id = 'storyCard'; el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;inset:0;z-index:40;pointer-events:none;opacity:0;transition:opacity .6s;display:flex;flex-direction:column;justify-content:center;align-items:center;font-family:"Yahaeng UI",sans-serif;text-align:center;color:#f2e7c8;text-shadow:0 2px 0 #000,0 0 14px rgba(0,0,0,.9);'
      + 'background:linear-gradient(#000 0 13%,rgba(0,0,0,.35) 13% 87%,#000 87%)';
    el.innerHTML = '<div data-k style="font-size:15px;font-weight:600;letter-spacing:.3em;color:#c9a2ff"></div><div data-t style="font-size:40px;font-weight:700;line-height:1.3;margin:.2em 0"></div><div data-s style="font-size:16px;color:#cfc6b2;max-width:86vw"></div>';
    document.body.appendChild(el); }
  const last = done && n === STORY_MAIN.length - 1, K = CONTRACTS[C.ctr];
  el.querySelector('[data-k]').textContent = last ? '이야기 · 끝' : `제 ${n + 1} 장${done ? ' · 완료' : ''}`;
  el.querySelector('[data-t]').textContent = C.title;
  const R = S.story && S.story.rec && S.story.rec[n], how = R && R.ways.length ? ` · 처리: ${R.ways.map(storyWayName).join(', ')}${R.best ? ' · 최고 ' + R.best : ''}` : '';
  el.querySelector('[data-s]').textContent = done ? (last ? '배지 뒤에 숨은 놈까지 끝났다. 을지로의 밤은 계속된다.' : '다음 지령은 공중전화로 온다.') + how : `표적 ${C.target}${K && C.ctr !== 'plain' ? ' · ' + K.name : ''}`;
  el.style.opacity = '1'; clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, last ? 5200 : 2800);
}
const STORY_WAY = { blast: '차량 폭탄', sign: '간판 사고', poison: '독침', car: '차로 침', fire: '불', gun: '총', blade: '칼' };
function storyWayName(c) { return STORY_WAY[c] || c; }

// ---------------------------------------------------------------- 보이스피싱 사기단 추적 (전화 이야기 5장)
// 메인 1장을 끝낸 뒤부터, 메인 장과 장 사이에 들어온다(각 장 뒤 2분 쉬고). 조직은 범죄로 정의된다: '상황실'이라 부르는
// 사기단 — 해외 콜센터가 '검찰·금융감독원'을 사칭해 전화를 걸고, 국내에선 수거책·모집책·관리자·세탁책이 움직인다.
// 아래에서 위로 거슬러 올라가 끝에 총책을 처치한다. 피해자 사연이 각 장의 이유다.
const PHISH = [
  { title: '수거책', ctr: 'photo', target: '문광호', escorts: 0, pay: 400,
    brief: [[{ note: '제보' }, '보이스피싱 사기단 "상황실" 1/5 · 수거책'], ['master', '오늘 오후, 일흔여섯 할머니가 "검찰 수사관"에게 현금 삼천만 원을 건넨다. 평생 모은 돈이다.'],
      ['master', '받으러 나오는 놈은 수거책. 얼굴 사진뿐이다. 그 블록에서 찾아.'], ['hero', '심부름꾼부터 시작이군.']],
    debrief: [['master', '수거책 휴대폰에 "통장 삽니다" 연락처가 남아 있었다. 대포통장 모집책, 석재민.']] },
  { title: '모집책', ctr: 'accident', target: '석재민', escorts: 1, pay: 500,
    brief: [['master', '석재민은 대학생·노인 명의로 통장과 유심을 사 모은다. 명의를 판 사람들까지 공범이 된다.'], ['master', '사고처럼 보여야 한다. 사기단이 눈치채면 다 숨는다.'], ['hero', '사고는 늘 갑자기 나지.']],
    debrief: [['master', '모집책 장부에 통장 묶음을 받아 간 차 번호가 있다. 국내 관리자, 염태수.']] },
  { title: '국내 관리자', ctr: 'carbomb', target: '염태수', escorts: 1, pay: 600,
    brief: [['master', '염태수는 수거책들한테 지시를 내리고 매일 같은 차로 돈을 걷는다.'], ['master', '차에 폭약을 심어. 그 돈이 다시 누군가의 전 재산이었다.'], ['hero', '돈 걷는 길이 마지막 길이군.']],
    debrief: [['master', '관리자 차 트렁크에서 환전 영수증이 나왔다. 돈을 해외로 빼는 세탁책 곽도윤이 오늘 밤 출국한다.']] },
  { title: '세탁책 납치·심문', ctr: 'capture', target: '곽도윤', escorts: 1, pay: 800,
    brief: [['master', '세탁책 곽도윤. 피해자 돈을 해외로 빼돌리는 놈이다. 이번엔 죽이지 마.'], ['master', '총책이 어디 숨었는지, 거점이 어딘지 아는 건 이놈뿐이다. 기절시켜서 근처 차 트렁크에 싣고 네 집 지하실로 데려와.'],
      ['master', '입을 열게 만드는 건 네 몫이다. 다 끝나면 우리 서 앞에 묶어 두고 가. 나머진 내가 처리한다.'], ['hero', '오늘 밤은 대화가 길어지겠군.']],
    debrief: [['master', '녹음 잘 들었다. 국내 거점 주소, 그리고 "사장" 진석호. 먼저 거점부터 치운다.']] },
  { title: '콜센터 거점', ctr: 'demolish', target: '왕재필', escorts: 2, pay: 900,
    brief: [['master', '작은 건물 한 채를 통째로 "상황실"로 쓴다. 대포폰 수백 대, 피해자 명단이 다 거기 있다.'],
      ['master', '밤엔 현장 관리자 왕재필과 상담원 둘만 남는다. 건물 벽에 폭약을 붙여 무너뜨려. 증거째로.'], ['master', '폭약 하나는 압수품에서 빼 놨다. 모자라면 철물점. 붙이고 나면 5초 — 멀리 뛰어.'], ['hero', '전화 걸 데가 없어지겠군.']],
    debrief: [['master', '거점이 무너지면서 해외 콜센터와의 연락이 끊겼다. 당황한 총책이 직접 서울로 들어왔다.']] },
  { title: '총책', ctr: 'snipe', target: '진석호', escorts: 2, pay: 1500,
    brief: [['master', '진석호. 해외에 콜센터를 차려 놓고 수천 명의 노후를 털었다. 서울엔 거래를 정리하러 들어왔다.'], ['master', '경호원이 둘이다. 멀리서 한 발로.'], ['hero', '전화는 내가 끊는다.']],
    debrief: [['master', '상황실은 끝났다. 압수된 장부로 피해금 일부가 돌아간다 — 그 할머니 돈도.'], ['hero', '...그거면 됐다.']] },
];
const PHISH_NEWS = [
  '[속보] 노인 상대 현금 수거책, 돈 받으러 나왔다 숨진 채 발견… 할머니 삼천만 원 그대로',
  '[속보] 대포통장 모집책 "사고사"… 장부에서 명의 대여자 수백 명 드러나',
  '[속보] 보이스피싱 국내 관리자 차량 폭발… 트렁크에서 현금 다발·환전 영수증',
  '[속보] 보이스피싱 자금 세탁책, 손발 묶인 채 경찰서 앞에서 발견… 품속에 자백 녹음 파일·해외 계좌 목록',
  '[속보] 보이스피싱 국내 거점 건물 폭발·붕괴… 잔해서 대포폰 수백 대·피해자 명단 발견',
  '[속보] 해외 콜센터 총책 서울서 피격… "상황실" 사기단 와해, 피해금 환수 시작',
];
function phishCall() {
  const st = S.story; if (!STAGE.cityLife || !st || st.ch < 1) return null;
  const n = st.ph || 0; if (n >= PHISH.length || S.t < (st.phNextT || 0)) return null;
  const C = PHISH[n]; const plan = planHit(); if (!plan) return null;
  Object.assign(plan, { kind: 'hit', name: C.target, fac: 'X', escorts: C.escorts, ctr: C.ctr, pay: C.pay, phish: n });
  if (C.ctr === 'demolish' && !demolishPlan(plan)) return null;
  const prev = n > 0 ? PHISH[n - 1].debrief : [], retry = st.phFailed ? [['master', '상황실 일이 틀어졌다. 놈들이 더 숨기 전에 다시 가.']] : [];
  const brief = n === 0 ? C.brief : [[{ note: '제보' }, `보이스피싱 사기단 "상황실" ${n + 1}/${PHISH.length} · ${C.title}`], ...C.brief];
  return { plan, lines: [...(st.phFailed ? retry : prev), ...brief] };
}
function phishDone(h, ok) {
  const st = S.story; if (h.phish == null || !st) return;
  if (!ok) { st.phFailed = true; return; }
  st.phFailed = false; st.ph = Math.max(st.ph || 0, h.phish + 1); st.phNextT = S.t + 120; fstat('phishCh');
  const C = PHISH[h.phish]; evBanner(`보이스피싱 사기단 ${h.phish + 1}/${PHISH.length} 처치 — ${C.title}`, '#ffcf8a');
  const g = h.g || S.player; justiceMoment(`보이스피싱 ${C.title} 처치`, PHISH_NEWS[h.phish], g.x, g.y, { thank: false });
  if (st.ph >= PHISH.length) after(2.5, () => say([...C.debrief, [{ note: '문자 메시지 · 모르는 번호' }, '"돈이 돌아왔어요. 누군지 모르지만, 고맙습니다. 손주 대학 등록금이었어요."']], true));
  S.ringNext = S.t + 18; saveFreeProgress(true);
}

// 콜센터 거점 폭파 ('demolish'): 작은 건물 한 채 안에 현장 관리자(표적)와 상담원들이 있다. 건물이 무너지면 성공.
function demolishPlan(plan) {
  const P = S.player, c = BLD.map((b, i) => ({ b, i })).filter(({ b }) => smallBld(b) && !b.vacant && !b.collapsed && b.x1 - b.x0 >= 3 && b.y1 - b.y0 >= 3)
    .map(o => ({ ...o, d: dist(P.x, P.y, (o.b.x0 + o.b.x1 + 1) * TILE / 2, (o.b.y0 + o.b.y1 + 1) * TILE / 2) })).filter(o => o.d > 900 && o.d < 3200);
  for (const { b, i } of c.sort(() => Math.random() - .5)) {
    for (let ty = b.y0 + 1; ty < b.y1; ty++) for (let tx = b.x0 + 1; tx < b.x1; tx++) if (!solidAt(tx, ty) && bldAt(tx, ty) === i) {
      plan.route = [[tx, ty, 999]]; plan.bld = i; plan.cx = tc(tx); plan.cy = tc(ty); return true; }
  }
  return false;
}
function demolishStart(h, plan) { h.bld = BLD[plan.bld]; S.player.bombs = (S.player.bombs || 0) + 1; for (const e of h.escorts) { e.x = h.g.x + rnd(-30, 30); e.y = h.g.y + rnd(-20, 20); e.route = [{ x: e.x, y: e.y, pause: 999 }]; e.follow = null; } }
function drawMiniDemolish(x, T) {
  const h = S.hit; if (!h || h.ctr !== 'demolish' || !h.bld || h.bld.collapsed) return; const b = h.bld;
  x.strokeStyle = '#ff7a3a'; x.lineWidth = 2; x.strokeRect(T(b.x0 * TILE), T(b.y0 * TILE), T((b.x1 + 1) * TILE) - T(b.x0 * TILE), T((b.y1 + 1) * TILE) - T(b.y0 * TILE));
}

// ---------------------------------------------------------------- 납치·심문 ('capture')
// 표적을 죽이지 않고 기절시킨다 → 140px 안의 차 트렁크에 싣는다 → 그 차로 내 집(첫 은신처)까지 → 지하실 심문.
// 심문: 방법을 하나씩 골라 압박을 100까지 채우면 자백. 같은 방법은 한 번만(주먹은 두 번까지, 세 번째엔 기절해서 시간만 간다).
// 표적이 죽으면(총·차·폭발) 입을 못 연다 → 의뢰 실패(다시 받는다). 자백하면 경찰서 앞에 묶어 두고 끝 — 참교육 속보.
const ASK = [
  { k: 'evidence', name: '증거를 들이민다 — 장부 사본·계좌 내역', p: 30, say: ['...그, 그걸 어떻게.', '내 이름이 다 적혀 있네. 그래서 뭐.'] },
  { k: 'gun', name: '겁을 준다 — 빈 총을 관자놀이에, 방아쇠', p: 35, say: ['찰칵—! 히, 히익... 미쳤어?!', '...다음 칸엔 들어 있을지도 모르지.'] },
  { k: 'deal', name: '거래를 건다 — 진술하면 살려 준다', p: 20, say: ['...살려 준다는 보장 있어?', '내가 불면 그쪽이 나를 죽여.'] },
  { k: 'fist', name: '주먹', p: 25, max: 2, say: ['퍽. 의자째 넘어간다.', '퍽. "그, 그만... 그만해..."'] },
  { k: 'victim', name: '피해자 녹취를 틀어 준다 — 삼천만 원 할머니 목소리', p: 25, say: ['...꺼. 꺼 달라고.', '(한참 말이 없다)'] },
];
function captureUpdate(h, ko) {
  const g = h.g, P = S.player;
  if (g.state === 'DEAD' && !ko && !h.done) { contractFail(h, `${h.name}이(가) 죽었다 — 입을 열 사람이 없다. 의뢰 실패`); return true; }
  if (!h.trunk) { const c = (S.corpses || []).find(c => c.g === g && c.inTrunk); if (c) { h.trunk = c.inTrunk; c.inTrunk.trunk = c.inTrunk.trunk.filter(o => o !== c); c.stashed = true; c.hidden = true; g.off = true; } }  /* 일반 [트렁크에 싣기]로 실어도 같다 */
  if (h.trunk) { const v = h.trunk; if (v.dead) { contractFail(h, `트렁크째 터졌다 — ${h.name}도 끝. 의뢰 실패`); return true; }
    g.x = v.x; g.y = v.y; const home = S.safes && S.safes[0];
    if (home && !h.asking && P.car === v && dist(v.x, v.y, home.x, home.y) < 200 && Math.abs(v.v) < 40) { h.asking = true; h.press = 0; h.used = {}; askOpen(h); } }
  return true;
}
function captureAction() {
  const h = S.hit, P = S.player; if (!h || h.ctr !== 'capture' || h.trunk || P.car) return null; const g = h.g;
  const ko = g.unconscious || (S.corpses || []).some(c => c.g === g && c.ko); if (!ko || dist(P.x, P.y, g.x, g.y) > 70) return null;
  const v = S.vehicles.filter(o => !o.dead && !o.ai && !o.police && dist(o.x, o.y, g.x, g.y) < 140).sort((a, b) => dist(a.x, a.y, g.x, g.y) - dist(b.x, b.y, g.x, g.y))[0];
  if (!v) return { k: 'evAct', label: '트렁크에 실을 차가 없다 — 차를 140px 안에 세워라', fn: () => evBanner('기절한 놈 곁에 차를 세워라', '#ffb070') };
  return { k: 'evAct', label: `${h.name} 트렁크에 싣기`, at: { x: g.x, y: g.y - 50 }, fn: () => { const s = standBy(P, g, 22);
    doMotion({ x: s.x, y: s.y, face: s.face, pose: 'grab', dur: 1.6, at: [[0.5, () => play('cloth', 0.6)], [1.2, () => play('thud', 0.5)]],
      end: () => { if (S.hit !== h) return; h.trunk = v; v.unlocked = true; v.locked = false; g.off = true; for (const c of S.corpses || []) if (c.g === g) c.hidden = true;
        evBanner(`${h.name} 트렁크로 · (집 지하실까지 조용히.)`, '#9fc4ff'); if (witnessed(g.x, g.y, 300)) addWanted(1, '사람을 트렁크에 싣는 걸 봤다'); } }); } };
}
function captureGoal(h) {
  const g = h.g, home = S.safes && S.safes[0];
  if (h.asking) return { text: `지하실 심문 — ${h.name} · 압박 ${h.press | 0}%`, x: home.x, y: home.y, fl: 0 };
  if (h.trunk) return { text: `트렁크에 ${h.name} — 그 차로 내 집(초록 집)까지`, x: home.x, y: home.y, fl: 0 };
  const ko = g.unconscious || (S.corpses || []).some(c => c.g === g && c.ko);
  return { text: ko ? `${h.name} 기절 — 곁에 차를 세우고 트렁크에 싣기` : `${h.name} 납치 — 죽이지 말고 기절시켜라`, x: g.x, y: g.y, fl: flOf(g), g };
}
function askOpen(h) {
  if (S.hit !== h) return; const used = h.used;
  shopPanel(`지하실 · ${h.name} 심문 — 압박 ${h.press | 0}%`, ASK.map(a0 => { const a = a0.k === 'victim' && h.victimLine ? { ...a0, name: h.victimLine, say: ['...그, 그 애는...', '(눈을 피한다)'] } : a0; const n = used[a.k] | 0, max = a.max || 1;
    return { name: a.name, price: null, tag: n >= max ? '했다' : `+${a.p}`, ok: n < max + (a.k === 'fist' ? 1 : 0), buy: () => askPick(h, a) }; }), () => { if (S.hit === h && !h.picking && !h.done) after(0.2, () => askOpen(h)); }); h.picking = false;
}
function askPick(h, a) {
  h.picking = true; closeShopPanel(); const n = h.used[a.k] | 0; h.used[a.k] = n + 1; play(a.k === 'fist' ? 'thud' : a.k === 'gun' ? 'click' : 'cloth', 0.5);
  if (a.k === 'fist' && n >= 2) { say([[{ note: h.name }, '(축 늘어진다. 기절했다 — 깨어날 때까지 기다린다)']], true, () => after(1.5, () => askOpen(h))); return; }
  h.press = Math.min(100, (h.press || 0) + a.p);
  const line = a.say[Math.min(n, a.say.length - 1)];
  if (h.press >= 100 && h.confess) { say([[{ note: h.name }, line], ...h.confess], true, () => captureDone(h)); return; }
  if (h.press >= 100) { say([[{ note: h.name }, line], [{ note: h.name }, '...알았어, 말할게! 거점은 작은 건물 하나야. 대포폰이랑 명단 다 거기 있어.'], [{ note: h.name }, '사장... 진석호. 서울에 들어와 있어. 거래 끝나면 바로 나간대.'], ['hero', '녹음 끝. 이제 경찰서 앞으로 간다.']], true, () => captureDone(h)); return; }
  say([[{ note: h.name }, line]], true, () => askOpen(h));
}
function captureDone(h) {
  if (S.hit !== h) return; h.done = true; const g = h.g; evGone(g); fstat('confessions');
  S.cash = (S.cash || 0) + h.pay; S.hitN++; S.hit = null; evBanner(`자백 확보 · +${h.pay}만 · ${h.name}은(는) 경찰서 앞 기둥에`, '#9fe0b0');
  if (h.phish != null) phishDone(h, true); if (h.dtr != null) dtrDone(h, true); saveFreeProgress(true);
}
