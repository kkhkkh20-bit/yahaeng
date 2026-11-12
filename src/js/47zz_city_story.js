// ---------------------------------------------------------------- 자유 모드 이야기: 극비 요원 '올빼미'
// 설정: 올빼미는 어느 기관에도 이름이 없는 처리반 '야행'의 요원이다. 경찰도 그 존재를 모른다 — 경찰 눈에는 그냥 범죄자다.
// 담당관 '까마귀'가 공중전화로 지령을 준다.
//   · 메인 이야기(공중전화): 장(章)이 차례로 이어진다. 한 장을 끝내야 다음 전화가 온다. 장마다 처치 방법이 정해져 있다.
//     실패하면 같은 장을 다시 준다. 마지막 장을 끝내면 그 뒤로는 평소 일거리(무작위 의뢰)가 온다.
//   · 조직 이야기(연락책): 조직마다 세 걸음짜리 이야기. 연락책 메뉴 맨 위에 '[이야기 n/3]'. 한 걸음을 끝내야 다음 걸음이 열린다.
// 진행은 자유 모드 저장에 함께 남는다 (47e saveFreeProgress · loadFreeProgress).

// 메인 이야기 — 흑장미
const STORY_MAIN = [
  { title: '첫 지령', ctr: 'plain', fac: 'A', target: '문태식', escorts: 1, pay: 400,
    brief: [['master', '올빼미. 오늘부터 을지로는 네 구역이다.'], ['master', '경찰은 우리를 모른다. 들키면 너는 그냥 살인범이다. 도와줄 사람은 없어.'],
      ['master', '첫 표적은 문태식. 조직의 돈을 세탁하는 놈이다. 방법은 네가 고른다.'], ['hero', '이름 없는 일이 체질이라서.']],
    debrief: [['master', '문태식 장부를 털었다. 돈이 한 군데로 모인다 — 장부마다 검은 장미 도장이 찍혀 있어.']] },
  { title: '교통사고', ctr: 'roadkill', fac: 'B', target: '오정길', escorts: 1, pay: 500,
    brief: [['master', '장미 도장 돈을 실어 나르는 운반책, 오정길.'], ['master', '이번엔 총도 칼도 안 된다. 길에서 차에 치인 사고여야 해.'],
      ['master', '치고 나서 그 자리에 서 있지 마라. 목격자가 번호판을 외우기 전에 빠져.'], ['hero', '운전은 자신 있다.']],
    debrief: [['master', '오정길 휴대폰에서 이름이 하나 나왔다. 청계파 간부 백상만. 장미 쪽 돈줄을 쥐고 있다.']] },
  { title: '그의 차', ctr: 'carbomb', fac: 'C', target: '백상만', escorts: 1, pay: 600,
    brief: [['master', '백상만은 늘 같은 차를 탄다. 그 블록 길가에 세워 둔다.'], ['master', '폭약 하나 줬다. 그놈이 시동을 거는 순간 끝나게 해.'],
      ['master', '타기 전에 터지면 안 된다. 그놈이 탈 때까지 멀리서 기다려.'], ['hero', '기다리는 건 일도 아니지.']],
    debrief: [['master', '백상만 차 트렁크에서 경찰 수사 기록 사본이 나왔다. 누가 안에서 흘리고 있어.'], ['master', '경찰은 여전히 우리를 모른다. 그런데 장미는 경찰을 안다.']] },
  { title: '떨어지는 간판', ctr: 'sign', fac: 'D', target: '한두철', escorts: 1, pay: 700,
    brief: [['master', '한두철. 종로파 쪽 해결사인데, 경찰 수사 기록을 장미에게 넘기는 통로다.'], ['master', '이놈이 죽으면 경찰이 들쑤신다. 사고여야 한다 — 철거 안 한 낡은 간판이 떨어진 사고.'],
      ['master', '그놈 도는 길에 간판이 매달려 있다. 배관을 타고 옥상에 올라가 고정줄을 풀어. 밑을 지날 때.'], ['hero', '을지로 간판은 원래 위험하지.']],
    debrief: [['master', '한두철이 마지막으로 통화한 번호를 추적했다. 장미의 회계사, 유창배.'], ['master', '그런데 얼굴 기록이 없다. 사진 한 장뿐이야.']] },
  { title: '얼굴 없는 회계사', ctr: 'photo', fac: 'A', target: '유창배', escorts: 2, pay: 800,
    brief: [['master', '유창배는 장부를 머리에 넣고 다닌다. 기록이 없는 놈이야.'], ['master', '그 블록 어딘가를 돈다. 사진 속 얼굴을 직접 찾아서 확인해.'],
      ['master', '경호원이 둘이다. 얼굴을 확인하기 전엔 아무도 건드리지 마.'], ['hero', '얼굴은 한 번 보면 안 잊는다.']],
    debrief: [['master', '유창배가 남긴 메모. 장미의 주인은 노기석 — 표면상 을지로 상가 번영회장이다.'], ['master', '마지막이다, 올빼미.']] },
  { title: '흑장미', ctr: 'snipe', fac: 'B', target: '노기석', escorts: 2, pay: 1200,
    brief: [['master', '노기석은 사람 많은 곳에서만 움직인다. 가까이 가면 경호원이 먼저 너를 본다.'], ['master', '멀리서 한 발로 끝내라. 500미터… 아니 500픽셀 밖에서. 저격총은 조직 연락책이 판다.'],
      ['master', '끝나면 이 번호는 잊어. 한동안 전화하지 않겠다.'], ['hero', '…한 발이면 된다.']],
    debrief: [['master', '흑장미는 끝났다. 수고했다, 올빼미.'], ['master', '…야행에는 은퇴가 없다. 다음 전화를 기다려.'], ['hero', '언제나 그랬지.']] },
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
  if (!storyMainLeft() || S.t < (S.story.nextT || 0)) return null;  /* 장과 장 사이엔 평소 일거리 전화가 온다 */
  const n = S.story.ch, C = STORY_MAIN[n], plan = planHit(); if (!plan) return null;
  Object.assign(plan, { kind: 'hit', name: C.target, fac: C.fac, escorts: C.escorts, ctr: C.ctr, pay: C.pay, story: n });
  const prev = n > 0 ? STORY_MAIN[n - 1].debrief : [], retry = S.story.failed ? [['master', '지난번 일은 틀어졌다. 한 번 더 기회를 주지.']] : [];
  const head = [[{ note: '야행 지령' }, `메인 이야기 ${n + 1}/${STORY_MAIN.length} · ${C.title}`]];
  return { plan, lines: [...head, ...(S.story.failed ? retry : prev), ...C.brief] };
}
function storyMainDone(h, ok) {
  if (h.story == null || !S.story) return;
  if (!ok) { S.story.failed = true; return; }
  S.story.failed = false; S.story.ch = Math.max(S.story.ch, h.story + 1); fstat('storyCh');
  const C = STORY_MAIN[h.story];
  evBanner(`메인 이야기 ${h.story + 1}/${STORY_MAIN.length} 완료 — ${C.title}`, '#c9a2ff');
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
