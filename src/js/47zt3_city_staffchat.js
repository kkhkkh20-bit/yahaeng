// ---------------------------------------------------------------- 자유 모드 알바생과 말하기 (47zt 가게 일꾼)
// 가게 안 일꾼 곁에서 [말 걸기]: 인사 → 잡담 · 동네 소문 · 물건 사기 · 부탁 중에서 고른다 (가게 창 shopPanel 을 대화 창으로 쓴다 — 터치도 된다).
// 일꾼은 건물에 들어갈 때마다 새로 서므로, 기억은 '그 건물 그 층의 일꾼' 자리(건물·층)로 한다: 말 건 횟수 · 산 횟수 · 겁준 일 · 다친 일.
// 단골(말 세 번 이상, 또는 두 번 넘게 산 손님)은 그 가게에서 5~10% 깎아 준다. 무기를 들고 말을 걸면 겁먹고 대꾸하지 않는다.
const CHAT_ROLE = { staff: '점원', pharm: '약사', hardware: '철물점 사장', chef: '주방장', cater: '홀 직원', gamer: '카운터 알바', karaoke: '노래방 알바', trainer: '트레이너', teacher: '학원 선생님', clerk: '사무실 직원' };
// 역할마다: 처음 · 다시 · 단골 인사 / 잡담 / 늦은 밤 / 마감 직전
const CHAT = {
  staff: { hi: ['어서 오세요. 찾는 거 있으면 말씀하세요.', '네, 계산은 여기서 해요.', '봉투 필요하시면 말씀하시고요.'],
    again: ['또 오셨네요. 아까 그거 괜찮았어요?', '아, 아까 그분. 뭐 빠뜨리셨어요?', '자주 보네요. 이 동네 사세요?'],
    reg: ['단골이시잖아요. 컵라면은 제가 물 부어 드릴게요.', '오셨어요? 오늘 삼각김밥 새로 들어왔어요.', '형님 오셨네. 늘 사시던 걸로요?'],
    chat: ['폐기 도시락 먹는 게 제 저녁이에요. 오늘은 제육.', '사장님이 CCTV로 저 보고 있어요. 진짜로요.', '택배 맡기는 사람이 왜 다 밤에 와요?', '여기 얼음컵이 제일 잘 나가요. 겨울에도요.'],
    late: ['이 시간엔 손님 없어요. 취한 분들 빼고.', '새벽엔 라면 물 끓는 소리밖에 없어요.', '세 시 넘으면 진열 다시 해요. 혼자서.'] },
  pharm: { hi: ['어디가 불편하세요?', '처방전 있으세요?', '네, 증상 말씀해 주세요.'],
    again: ['아까 드린 약은 드셨어요?', '또 오셨네요. 좀 나아지셨어요?', '밥 먹고 드시라고 했죠?'],
    reg: ['단골 손님이니까 파스 하나 더 넣어 드릴게요.', '요즘 자주 다치시네요. 조심하세요.', '요즘 자주 오시네요. 잠은 좀 주무세요.'],
    chat: ['이 동네는 숙취해소제가 제일 잘 나가요.', '밤에 손 베여서 오는 사람이 많아요. 인쇄소 칼이요.', '진통제만 사 가는 사람은 다 사연이 있어요.', '박카스 한 병 드릴까요? 서비스예요.'],
    late: ['열두 시면 문 닫아요. 급하면 지금 사세요.', '이 시간에 오는 분들은 다 급하더라고요.'] },
  hardware: { hi: ['뭐 찾아요? 말만 해요.', '규격 알고 왔어요? 몇 미리?', '어, 들어와요. 발밑 조심.'],
    again: ['아까 그 나사 안 맞았죠? 바꿔 줄게.', '또 왔네. 뭐 또 망가졌어?', '지난번 그 공구 잘 쓰고 있어?'],
    reg: ['단골이니까 이건 그냥 가져가.', '자네는 볼 때마다 뭘 고치고 있네.', '오늘은 뭘 부수러 가나.'],
    chat: ['이 골목에서 삼십 년 했어. 인쇄소 기계 다 내가 고쳤지.', '요즘 애들은 드라이버도 인터넷으로 사더라.', '을지로 셔터 소리만 들어도 어느 가게인지 알아.', '연장은 비싼 거 사. 그래야 안 다쳐.'],
    late: ['열 시에 내려. 셔터 무거워.', '이 시간엔 문 열어 놔도 술 취한 사람만 와.'] },
  chef: { hi: ['주문은 홀에 하세요. 아, 저한테 해도 되고.', '불 앞이라 말 잘 안 들려요!', '뭐 드실래요? 오늘 국물 진해요.'],
    again: ['또 오셨네! 아까 맛있었죠?', '아까 남기셨던데. 짰어요?', '입맛에 맞았나 보네요.'],
    reg: ['단골이니까 곱빼기로 해 줄게요.', '오늘은 반찬 하나 더 놨어요.', '늘 드시던 걸로 할까요?'],
    chat: ['육수는 새벽 다섯 시부터 끓여요.', '이 동네 사람들은 소주를 국처럼 마셔요.', '불 쓰는 일은 여름이 지옥이에요.', '칼은 남한테 안 빌려줘요. 그게 규칙이에요.'],
    late: ['막차 손님 받고 불 끌 거예요.', '이 시간엔 해장하러 오는 사람뿐이에요.'] },
  cater: { hi: ['몇 분이세요? 편한 데 앉으세요.', '어서 오세요! 메뉴판 드릴게요.', '여기 앉으세요. 물 갖다 드릴게요.'],
    again: ['아, 또 오셨네요! 아까 그 자리 비었어요.', '이번엔 혼자 오셨어요?', '아까 계산 잘 하셨죠?'],
    reg: ['단골이시니까 계란말이 서비스예요.', '사장님이 서비스 주래요. 쉿.', '오늘도 소주 하나죠?'],
    chat: ['저쪽 테이블 아저씨들 세 시간째예요.', '주말엔 줄 서요. 오늘은 한가한 편.', '팁 주는 손님은 처음 봤어요. 농담이에요.', '알바 끝나면 저도 여기서 먹고 가요.'],
    late: ['라스트 오더 끝났어요. 술만 돼요.', '이 시간엔 다들 취해서 같은 얘기만 해요.'] },
  gamer: { hi: ['자리 아무 데나 앉으시면 돼요. 회원이세요?', '선불이에요. 몇 시간 하실 거예요?', '어서 오세요. 라면은 저기서 시키시면 돼요.'],
    again: ['아까 그 자리 아직 비어 있어요.', '또 오셨네요. 시간 남으셨어요?', '아, 아까 그 손님. 충전하실래요?'],
    reg: ['단골이시니까 한 시간 더 넣어 드릴게요.', '형 오셨어요? 그 자리 맡아 놨어요.', '늘 하시던 걸로요?'],
    chat: ['저 구석 자리는 사흘째 안 일어나요.', '밤엔 다들 조용히 욕해요. 헤드셋 끼고.', '라면 물 조절은 제가 동네에서 제일 잘해요.', '키보드 부수면 물어내셔야 돼요. 진짜로.'],
    late: ['새벽 요금 따로예요. 야간 정액 있어요.', '이 시간에 오는 사람은 다 집에 가기 싫은 사람이에요.'] },
  karaoke: { hi: ['몇 분이세요? 방 금방 나요.', '한 시간에 이만이에요. 서비스 줄게요.', '어서 오세요. 마이크는 방에 있어요.'],
    again: ['또 오셨네요! 아까 노래 잘 하시던데.', '이번엔 몇 분이에요?', '아까 그 방 또 드릴까요?'],
    reg: ['단골이니까 서비스 삼십 분 넣어 드릴게요.', '오늘도 그 노래 부르실 거죠?', '형 오셨네. 제일 큰 방 비었어요.'],
    chat: ['3번 방은 마이크가 좀 울려요. 그게 매력이래요.', '밤에 혼자 오는 사람이 은근 많아요.', '탬버린 깨 먹는 손님이 한 달에 하나는 있어요.', '옆방 노래 들으면 그 사람 인생이 보여요.'],
    late: ['네 시면 문 닫아요. 마지막 방이에요.', '이 시간엔 다들 발라드만 불러요.'] },
  trainer: { hi: ['운동하러 오셨어요? 등록은 카운터에서.', '오늘 무슨 날이에요? 하체?', '어서 오세요. 물은 저기 있어요.'],
    again: ['또 오셨네! 근육통 괜찮아요?', '아까 자세 좋던데요.', '오늘 두 번째네요. 무리하지 마요.'],
    reg: ['단골이니까 PT 한 번 공짜로 봐 드릴게요.', '형님 몸 좋아졌네요. 진짜로.', '오늘도 데드 하시죠?'],
    chat: ['밤 운동이 제일 잘 돼요. 사람이 없어서.', '단백질은 닭가슴살로 드세요. 맛없어도.', '무게보다 자세예요. 이건 꼭 기억하세요.', '저 러닝머신은 끝까지 올리면 소리 나요.'],
    late: ['열두 시에 문 닫아요. 마지막 세트예요.', '이 시간에 운동하는 사람이 진짜예요.'] },
  teacher: { hi: ['학부모세요? 상담은 낮에 해요.', '수업 중이라 조용히 부탁드려요.', '네, 무슨 일로 오셨어요?'],
    again: ['또 오셨네요. 아까 말씀드린 그 시간표요?', '아, 아까 그분. 자리 났어요.', '애가 이 반으로 온대요?'],
    reg: ['자주 오시니까 교재는 그냥 드릴게요.', '이번 달 등록하시면 할인돼요.', '애가 요즘 많이 늘었어요.'],
    chat: ['밤 열 시까지 수업이에요. 애들이 더 힘들죠.', '칠판 지우개는 제가 제일 많이 털어요.', '숙제 안 해 오는 핑계는 다 들어 봤어요.', '여기서 십 년 가르쳤어요. 졸업생이 선생 됐어요.'],
    late: ['열 시면 끝나요. 애들 데리러 오셨어요?'] },
  clerk: { hi: ['무슨 일로 오셨어요? 약속하셨어요?', '담당자 지금 자리에 없어요.', '네, 말씀하세요.'],
    again: ['또 오셨네요. 아까 그 서류요?', '담당자 아직이에요. 기다리시겠어요?', '아까 그분이시죠?'],
    reg: ['자주 오시니까 커피 한 잔 드릴게요.', '오늘은 담당자 있어요. 불러 드릴까요?', '서류는 제가 먼저 봐 드릴게요.'],
    chat: ['야근은 커피로 버텨요. 오늘 네 잔째.', '이 건물 엘리베이터는 3층에서 꼭 덜컹해요.', '창밖 보면 을지로 불이 하나씩 꺼져요.', '팩스 쓰는 회사가 아직 여기 있어요. 저희요.'],
    late: ['저도 곧 퇴근해요. 막차 전에요.', '이 시간까지 남은 건 저랑 경비 아저씨뿐이에요.'] },
};
const CHAT_COMMON = {
  closing: ['마감 삼십 분 전이에요. 서두르세요.', '곧 문 닫아요. 필요한 거 있으면 지금요.'],
  scared: ['...가져가세요. 다 가져가도 돼요.', '그거 내려놔요. 제발요.', '저 그냥 알바예요. 아무것도 몰라요.'],
  grudge: ['아까 그 사람이죠? ...말 안 해요.', '저번 일 신고했어요. 가세요.', '얼굴 기억해요. 나가 주세요.'],
  rumorNone: ['요즘은 조용해요. 너무 조용해서 이상할 정도로.', '별일 없어요. 그게 제일 좋은 거예요.'],
  favorAsk: ['저기, 부탁 하나만 해도 돼요? 이거 {to}에 좀 갖다주실래요? 사례할게요.', '배달 기사가 안 와서요. {to}까지만 들어 주실래요? 수고비 드릴게요.'],
  favorThanks: ['진짜요? 고마워요. {to} 사장님한테 제 이름 대면 알아요.', '살았다. {to}에서 기다리고 있을 거예요.'],
  favorBusy: ['아까 그 배달부터 부탁드려요. {to}요.'],
};
const chatPick = (L, n) => L[((n || 0) % L.length + L.length) % L.length];
const chatKey = g => g.shopB + ':' + g.shopF;
function chatMem(k) { S.staffMem = S.staffMem || new Map(); let m = S.staffMem.get(k); if (!m) { m = { talk: 0, buy: 0, threat: 0, threatT: -1e9, hurt: 0, n: 0, rumorN: 0 }; S.staffMem.set(k, m); } return m; }
const chatRegular = m => m.buy >= 2 || m.talk >= 3;
const chatShopOf = g => g.shopF === 0 ? (S.shops || []).find(s => s.b === g.shopB) : null;
// 이 가게 단골 할인 (openShop 가격에 곱한다): 단골 10%, 한 번 산 손님 5%
function staffDiscount(s) { const m = S.staffMem && S.staffMem.get(s.b + ':0'); return !m || m.hurt || m.threat ? 1 : chatRegular(m) ? 0.9 : m.buy >= 1 ? 0.95 : 1; }
function staffBought(s) { if (!STAGE.cityLife || !s) return; chatMem(s.b + ':0').buy++; }
// 말 걸기: 매장 안, 같은 층, 일꾼 곁 70px
function staffChatTarget() {
  const P = S.player; if (!STAGE.cityLife || !S.staffB || P.car || P.z || P.hide || S.shopOpen) return null;
  const inB = bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)), list = S.staffB.get(inB); if (!list) return null;
  let best = null, bd = 70; for (const g of list) { if (!g.staff || g.off || !npcAlive(g) || g.state !== 'PATROL' || g.shopF !== flOf(P)) continue; const d = dist(g.x, g.y, P.x, P.y); if (d < bd) { bd = d; best = g; } }
  return best;
}
function staffChatAction() { const g = staffChatTarget(); if (!g) return null; return { k: 'evAct', label: `말 걸기 · ${CHAT_ROLE[g.staff] || '직원'}`, at: { x: g.x, y: g.y - 50 }, fn: () => staffChatOpen(g) }; }
// 방향 말로: 북쪽 · 남동쪽 …, 거리: 바로 근처 · 좀 걸어가면 · 멀리
function chatWhere(x, y) { const P = S.player, dx = x - P.x, dy = y - P.y, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  const dirs = ['동쪽', '남동쪽', '남쪽', '남서쪽', '서쪽', '북서쪽', '북쪽', '북동쪽'], dir = dirs[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  return (d < 500 ? '바로 근처 ' : d < 1500 ? '' : '좀 멀리 ') + dir; }
// 동네 소문: 지금 이 도시에 실제로 있는 것 하나를 가리키고, 지도에 표시한다 (사건 · 총 파는 박씨 · 우는 공중전화 · 조직 구역 · 동네 명소)
function staffRumor(g, m) {
  const P = S.player, out = [], near = (x, y, r = 2600) => dist(x, y, P.x, P.y) < r;
  const E = S.ev; if (E && !E.done && E.def) { const f = E.def.focus?.(E), p = f && f.x != null ? f : E.p || (E.x != null ? E : null); if (p && near(p.x, p.y)) out.push({ k: 'event', x: p.x, y: p.y, t: `${chatWhere(p.x, p.y)}에서 ${E.def.name} 났대요. 괜히 끼지 마요.` }); }
  const D = S.dealer2; if (D && near(D.x, D.y, 4000)) out.push({ k: 'dealer', x: D.x, y: D.y, t: `${chatWhere(D.x, D.y)} 뒷골목에 박씨라는 사람이 '물건'을 판대요. 저는 못 들은 거예요.` });
  const ph = (S.phones || []).filter(p => near(p.x, p.y, 2200)).sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))[0];
  if (ph) out.push({ k: 'phone', x: ph.x, y: ph.y, t: `${chatWhere(ph.x, ph.y)} 공중전화 있잖아요. 밤마다 울린대요. 받으면 일거리 준다던데.` });
  const Z = (STAGE.zones || []).filter(z => z[6] && /파|조직/.test(z[6])).map(z => ({ z, x: (z[0] + z[2] + 1) / 2 * TILE, y: (z[1] + z[3] + 1) / 2 * TILE })).sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))[0];
  if (Z) out.push({ k: 'turf', x: Z.x, y: Z.y, t: `${chatWhere(Z.x, Z.y)}, ${Z.z[6].split('·')[0].trim()} 쪽은 밤에 가지 마요. 애들이 진 치고 있어요.` });
  const LMS = typeof window.__cityLandmarks === 'function' ? window.__cityLandmarks()?.LM?.sets || [] : [], LMD = { pocha: '포장마차 줄', print: '오래된 인쇄소 마당', loading: '새벽 하역장', falls: '청계천 작은 폭포', tteok: '떡볶이 골목', plaza: '동상 있는 광장', cafe: '창고 카페' };
  const L = LMS.filter(s => LMD[s.k]).sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))[0];
  if (L) out.push({ k: 'landmark', x: L.x + (L.w || 1) * TILE / 2, y: L.y + (L.h || 1) * TILE / 2, t: `${chatWhere(L.x, L.y)}에 ${LMD[L.k]} 가 봤어요? 밤에 가면 좋아요.` });
  if (!out.length) return null;
  const r = out[(m.rumorN++) % out.length]; S.wp = { x: r.x, y: r.y }; S.wpT = 0; S.wpPath = null; S.lastRumor = r; return r;
}
// 부탁: 가까운 다른 가게까지 봉투 하나 배달 (도착하면 사례)
function staffFavorMake(g) { const P = S.player, s0 = chatShopOf(g);
  const to = (S.shops || []).filter(s => s !== s0 && s.b !== g.shopB && dist(s.x, s.y, P.x, P.y) > 450 && dist(s.x, s.y, P.x, P.y) < 1500).sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))[0];
  return to ? { key: chatKey(g), to: to.name, x: to.x, y: to.y, pay: 15 + Math.round(dist(to.x, to.y, P.x, P.y) / 100), t0: S.t } : null; }
function staffFavorUpdate() {
  const F = S.staffFavor; if (!F) return; const P = S.player;
  if (S.t - F.t0 > 240) { S.staffFavor = null; evBanner('배달 부탁 · 너무 늦었다', '#c8b48a'); return; }
  if (dist(P.x, P.y, F.x, F.y) < 70 && !flOf(P)) { S.staffFavor = null; S.cash = (S.cash || 0) + F.pay; play('loot', 0.6); if (typeof hudCache !== 'undefined') hudCache.objH = null;
    const m = S.staffMem?.get(F.key); if (m) { m.favor = (m.favor || 0) + 1; m.talk++; } if (S.wp && Math.hypot(S.wp.x - F.x, S.wp.y - F.y) < 80) { S.wp = null; S.wpPath = null; }
    evBanner(`배달 완료 · ${F.to} · 수고비 ${F.pay}만`, '#9fe0b0'); }
}
// 대화 창: 일꾼 말 한 줄 + 고를 것들 (가게 창을 그대로 쓴다)
function staffChatOpen(g, line) {
  const m = chatMem(chatKey(g)), role = g.staff, R = CHAT[role] || CHAT.staff, who = `${CHAT_ROLE[role] || '직원'} · ${(BLD[g.shopB].signs || [])[g.shopF] || '가게'}`;
  const say = t => { gsay(g, t, 3); g.want = Math.atan2(S.player.y - g.y, S.player.x - g.x); return t; };
  const armed = typeof wpnOn === 'function' && wpnOn();
  if (!line) {   // 처음 열 때: 겁먹었나 · 원한 · 인사
    if (armed) { m.threat++; m.threatT = S.t; g.scared = true; m.n++; S.staffChat = { g, mode: 'scared' }; return shopPanel(who, [{ name: '겁먹고 뒤로 물러선다', price: null, tag: '', ok: false, buy: () => {} }], null, say(chatPick(CHAT_COMMON.scared, m.n))); }
    if (m.hurt || S.t - m.threatT < 90) { m.n++; S.staffChat = { g, mode: 'grudge' }; return shopPanel(who, [{ name: '상대해 주지 않는다', price: null, tag: '', ok: false, buy: () => {} }], null, say(chatPick(CHAT_COMMON.grudge, m.n))); }
    m.talk++; m.n++;
    const ch = typeof closeHour === 'function' ? closeHour(BLD[g.shopB], g.shopF) : 99, h = typeof clockHour === 'function' && S.clock ? clockHour() : 21;
    line = ch < 90 && ch - h > 0 && ch - h <= 0.5 ? chatPick(CHAT_COMMON.closing, m.n) : chatPick(chatRegular(m) ? R.reg : m.talk > 1 ? R.again : R.hi, m.n);
  }
  say(line); S.staffChat = { g, mode: 'talk', line };
  const h = typeof clockHour === 'function' && S.clock ? clockHour() : 21, shop = chatShopOf(g), rows = [];
  rows.push({ name: '잡담', price: null, tag: '', ok: true, buy: () => { m.n++; staffChatOpen(g, chatPick(h >= 24 && R.late ? (m.n % 2 ? R.late : R.chat) : R.chat, m.n)); } });
  rows.push({ name: '동네 소문', price: null, tag: '지도에 표시', ok: true, buy: () => { const r = staffRumor(g, m); staffChatOpen(g, r ? r.t : chatPick(CHAT_COMMON.rumorNone, m.n++)); } });
  if (shop && SHOP_ITEMS[shop.name]?.length) rows.push({ name: '물건 사기', price: null, tag: staffDiscount(shop) < 1 ? `단골 ${Math.round((1 - staffDiscount(shop)) * 100)}% 할인` : '', ok: true, buy: () => { closeShopPanel(); openShop(shop); } });
  if (m.talk >= 2 && ['staff', 'pharm', 'hardware', 'chef', 'cater'].includes(role)) {
    const F = S.staffFavor;
    rows.push({ name: F ? '부탁 · 배달 중' : '부탁 들어주기', price: null, tag: F ? F.to : '', ok: true, buy: () => {
      if (S.staffFavor) { staffChatOpen(g, chatPick(CHAT_COMMON.favorBusy, m.n).replace('{to}', S.staffFavor.to)); return; }
      const f = staffFavorMake(g); if (!f) { staffChatOpen(g, chatPick(CHAT_COMMON.rumorNone, m.n++)); return; }
      S.staffFavor = f; S.wp = { x: f.x, y: f.y }; S.wpT = 0; S.wpPath = null; evBanner(`배달 부탁 · ${f.to}까지 · ${f.pay}만`, '#f2e7c8'); staffChatOpen(g, chatPick(CHAT_COMMON.favorThanks, m.n++).replace('{to}', f.to)); } });
  }
  return shopPanel(who, rows, () => { S.staffChat = null; }, line);
}
// 일꾼이 다치면(죽거나 기절) 그 동네 평판이 떨어지고, 그 자리 일꾼은 다음에도 기억한다
function staffChatWatch() {
  if (!STAGE.cityLife || !S.staffB) return; const P = S.player;
  for (const list of S.staffB.values()) for (const g of list) { if (!g.staff || g.chatHurt || npcAlive(g) || g.off) continue; if (g.state === 'CAPTIVE') continue;
    g.chatHurt = true; const m = chatMem(chatKey(g)); m.hurt++; if (dist(g.x, g.y, P.x, P.y) < 500 && typeof addRep === 'function') addRep(evDist(g.x, g.y), -6); }
  staffFavorUpdate();
}
if (typeof cityActionList === 'function') { const _cal = cityActionList; cityActionList = function () { const out = _cal.apply(this, arguments); if (STAGE.cityLife && !S.player.car) { const a = staffChatAction(); if (a) out.push(a); } return out; }; }
if (typeof staffInit === 'function') { const _si = staffInit; staffInit = function () { _si.apply(this, arguments); S.staffMem = new Map(); S.staffFavor = null; S.staffChat = null; }; }
if (typeof staffUpdate === 'function') { const _su = staffUpdate; staffUpdate = function (dt) { const r = _su.apply(this, arguments); if (STAGE.cityLife) staffChatWatch(); return r; }; }
