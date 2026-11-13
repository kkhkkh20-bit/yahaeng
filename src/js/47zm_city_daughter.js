// ---------------------------------------------------------------- 자유 모드 복수극 「사라진 딸」 (전화로 이어지는 6장)
// 은퇴한 전직 요원인 나(엄마)의 딸 서연(17)이 사라졌다. 경찰은 '가출'로 덮었다. 강 형사만 몰래 흔적을 넘긴다.
// 노래방 실장 → 사채업자 → 용역 깡패 → 시행사 실장 → 시의원 비서관 → 시의원. 마지막에 딸을 찾는다.
// 메인 1장 뒤부터, 보이스피싱 줄기와 번갈아 공중전화로 온다 (storyCall → phishCall → dtrCall). 진행은 S.story.dt 에 저장된다.
const DTR = [
  { title: '노래방 실장 납치·심문', ctr: 'capture', target: '마현철', escorts: 1, pay: 300,
    brief: [[{ note: '제보 · 강 형사' }, '「사라진 딸」 1/6'], ['master', '서연이 마지막으로 찍힌 CCTV가 을지로 노래방 앞이다. 새벽 두 시, 실장 차에 탔어.'],
      ['master', '위에선 가출로 덮으래. ...난 못 덮겠다. 실장 마현철, 기절시켜서 네 집 지하실로 데려가.'], ['hero', '...살아만 있어, 서연아.']],
    victimLine: '서연이 사진을 눈앞에 들이민다 · "이 얼굴 기억 안 나?"',
    confess: [[{ note: '마현철' }, '...알았어! 그 애 아빠 빚이 있었어. 사채업자 표만식한테 넘겼다고!'], [{ note: '마현철' }, '차용증에 그 애 이름 써서... 난 운전만 했어, 진짜야!'], ['hero', '운전만. 그래, 운전만.']],
    debrief: [['master', '표만식. 을지로에서 일수 찍는 놈이다. 피해자가 몇인지 세다 말았어.']] },
  { title: '사채업자', ctr: 'stage', target: '표만식', escorts: 1, pay: 500,
    brief: [['master', '표만식은 매일 같은 길로 수금을 돈다. 차에 손대든, 간판을 떨구든, 담배 피우러 혼자 빠질 때든.'], ['master', '사고로 보여야 한다. 놈 장부를 털어야 하니까.'], ['hero', '수금은 오늘이 마지막이다.']],
    debrief: [['master', '장부에 서연 이름 옆에 "현장 인력 · 문석구"라고 적혀 있다. 철거 용역 깡패다.']] },
  { title: '용역 깡패', ctr: 'plain', target: '문석구', escorts: 3, pay: 600,
    brief: [['master', '문석구. 재개발 철거 현장마다 나타나서 버티는 주민들을 두들겨 팬다. 지난달엔 할머니 한 분이 돌아가셨지.'], ['master', '부하들을 달고 다닌다. 조용히 할 필요 없다.'], ['hero', '몇 명이든 상관없어.']],
    debrief: [['master', '문석구 휴대폰에 서연 사진이 있다. 보낸 사람은 시행사 실장 오재민. "창고에 보관 중".']] },
  { title: '시행사 실장', ctr: 'carbomb', target: '오재민', escorts: 1, pay: 700,
    brief: [['master', '오재민은 재개발 시행사 실장이다. 철거도, 용역도, 사람 "보관"도 이놈이 지시했다.'], ['master', '매일 같은 차로 현장을 돈다. 차에 폭약을 심어.'], ['hero', '보관. 그 단어 다시는 못 쓰게 해 주지.']],
    debrief: [['master', '오재민 차 블랙박스에 시의원 비서관 차가 같이 찍혀 있다. 비서관 탁성훈. 돈 심부름꾼이다.']] },
  { title: '시의원 비서관', ctr: 'accident', target: '탁성훈', escorts: 1, pay: 800,
    brief: [['master', '탁성훈. 시행사 돈을 시의원한테 나르고, 문제가 생기면 "정리"한다.'], ['master', '경찰이 덮어 주는 놈이다. 사고로 끝내.'], ['hero', '덮어 줄 사람이 없어지겠군.']],
    debrief: [['master', '비서관 수첩에 별장 주소가 있다. ...서연이 거기 있다. 살아 있어.'], ['hero', '...']] },
  { title: '시의원', ctr: 'snipe', target: '도경환', escorts: 2, pay: 1500,
    brief: [['master', '시의원 도경환. 재개발을 밀어붙이고, 빚진 집 아이들을 "손님 접대"에 썼다.'], ['master', '오늘 밤 별장 앞에서 경호원 둘을 달고 기자 회견 연습을 한다. 멀리서 한 발.'], ['master', '그다음은 내가 별장 문을 연다. 서연이는 내가 데리고 나온다.'], ['hero', '...한 발이면 돼.']],
    debrief: [['master', '별장 지하에서 아이 넷이 나왔다. 서연이도. 많이 말랐지만... 걸을 수 있다.'], [{ note: '서연' }, '...엄마?'], ['hero', '응. 엄마 왔어. 집에 가자.']] },
];
const DTR_NEWS = [
  '[속보] 노래방 실장, 손발 묶인 채 경찰서 앞에서 발견… 품에 미성년자 연락처 수십 개',
  '[속보] 을지로 불법 사채업자 "사고사"… 장부서 빚 대신 넘겨진 사람들 이름 나와',
  '[속보] 재개발 철거 용역 깡패들 현장서 쓰러진 채 발견… 주민 폭행 영상 공개',
  '[속보] 재개발 시행사 실장 차량 폭발… 트렁크서 "인력 보관" 장부',
  '[속보] 시의원 비서관 "사고사"… 수첩에 별장 주소와 현금 전달 기록',
  '[속보] 현직 시의원 별장 앞 피격… 별장 지하서 실종 청소년 4명 구조',
];
function dtrCall() {
  const st = S.story; if (!STAGE.cityLife || !st || st.ch < 1) return null;
  const n = st.dt || 0; if (n >= DTR.length || S.t < (st.dtNextT || 0)) return null;
  const C = DTR[n]; const plan = planHit(); if (!plan) return null;
  Object.assign(plan, { kind: 'hit', name: C.target, fac: 'X', escorts: C.escorts, ctr: C.ctr, pay: C.pay, dtr: n, confess: C.confess, victimLine: C.victimLine });
  const prev = n > 0 ? DTR[n - 1].debrief : [], retry = st.dtFailed ? [['master', '놓쳤다. 놈들이 서연이를 옮기기 전에 다시 가.']] : [];
  const brief = n === 0 ? C.brief : [[{ note: '제보 · 강 형사' }, `「사라진 딸」 ${n + 1}/${DTR.length} · ${C.title}`], ...C.brief];
  return { plan, lines: [...(st.dtFailed ? retry : prev), ...brief] };
}
function dtrDone(h, ok) {
  const st = S.story; if (h.dtr == null || !st) return;
  if (!ok) { st.dtFailed = true; return; }
  st.dtFailed = false; st.dt = Math.max(st.dt || 0, h.dtr + 1); st.dtNextT = S.t + 120; fstat('dtrCh');
  const C = DTR[h.dtr]; evBanner(`「사라진 딸」 ${h.dtr + 1}/${DTR.length} · ${C.title}`, '#ffcf8a');
  const g = h.g || S.player; justiceMoment(`${C.title} 처리`, DTR_NEWS[h.dtr], g.x, g.y);
  if (st.dt >= DTR.length) after(2.5, () => say(C.debrief, true));
  S.ringNext = S.t + 18; saveFreeProgress(true);
}
