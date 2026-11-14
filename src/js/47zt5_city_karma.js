// ---------------------------------------------------------------- 자유 모드 성향: 선택이 쌓여 사람이 된다 (비질란테 ↔ 무법자)
// 정해진 길은 없다. 한 일이 쌓이면 도시가 나를 그렇게 대한다.
//  착한 쪽: 악당 혼내기(시비꾼·묻지마 폭행범·칼부림·연쇄살인), 민폐 크루 해산, 도주 차량 검거, 자백 받아 경찰서 앞에 묶기
//  나쁜 쪽: 죄 없는 행인·직원을 쓰러뜨리거나 죽이기, 돈 뺏기, 계산대·지구대 털기, 동네 비우기, 차 훔치기
// 성향(-100~100)은 자유 모드 기록(S.fst.karma)에 같이 저장된다. 단계가 바뀌면 강 형사가 공중전화 대신 문자로 한마디 한다.
// 성향이 바꾸는 것: 지나가는 행인의 한마디·반응(인사 / 수군거림 / 비켜섬) · 신고 (영웅은 덜, 무법자는 더) · 가게 값 · 조직과 경찰의 호감도
const KARMA_TIER = [   // [최소값, 이름, 색]
  [60, '동네 영웅', '#9fe0b0'], [25, '정의로운 이웃', '#c8e8b0'], [-24, '이름 없는 사람', '#e8e0c8'], [-59, '위험한 인물', '#ffb28a'], [-101, '무법자', '#ff7a66']];
const KARMA_STAT = { rudeTaught: 3, perps: 4, crewBroken: 4, justice: 5, confessions: 5, skSolved: 8, cellar: -2,
  mugged: -4, wallets: -2, tills: -6, stationRob: -3, stationArms: -2, emptied: -25, carsStolen: -1, driveBy: -3 };
const KARMA_TEXT = {   // 강 형사 문자: 단계가 오를 때 / 내릴 때
  up: { 4: '요즘 네 얘기가 돈다. 나쁜 얘기는 아니야. 그래도 조심해.', 3: '...없던 일로 해 줄 수는 없어. 그래도 다시 이쪽으로 오는 건 봤다.', 2: '이제 좀 사람 같네. 계속 그렇게 해.', 1: '동네 사람들이 네 얼굴을 기억하더라. 좋은 쪽으로.', 0: '시장 골목 할머니가 너 밥 한 끼 먹이고 싶대. 내가 다 부끄럽다.' },
  down: { 1: '그 동네에서 무슨 일 있었어? 소문이 안 좋다.', 2: '선 넘지 마라. 네가 잡던 놈들이랑 똑같아지고 있어.', 3: '...이제 너도 내 수첩에 있다. 다음엔 내가 직접 간다.', 4: '연락하지 마라.' } };
const KARMA_LINES = {
  0: ['어, 그분이다! 지난번엔 고마웠어요.', '사장님이 그러던데, 이 동네 지켜 주는 분이라고.', '오늘도 순찰 도세요? 조심하세요!', '저번에 그 시비꾼 혼낸 거 봤어요. 속이 시원하던데.'],
  1: ['저 사람, 그 사람 아니야? 나쁜 놈들만 골라 잡는다는.', '...수고 많으세요.', '저분 덕에 요즘 밤길이 좀 낫대.'],
  3: ['저 사람이야. 쳐다보지 마.', '저 사람 지나가면 그냥 비켜.', '...뉴스에 나온 그 사람 아니야?'],
  4: ['도망가! 저 사람이야!', '애들 데리고 들어가요, 빨리!', '제발 그냥 지나가세요…'] };
const karmaOf = () => clamp((S.fst && S.fst.karma) || 0, -100, 100);
const karmaTier = (k = karmaOf()) => KARMA_TIER.findIndex(t => k >= t[0]);
const karmaName = () => KARMA_TIER[karmaTier()][1];
function karmaAdd(d, why) {
  if (!STAGE.cityLife || !S.fst || !d) return; const t0 = karmaTier(); S.fst.karma = clamp((S.fst.karma || 0) + d, -100, 100); const t1 = karmaTier();
  if (t1 !== t0) karmaTierChange(t0, t1);
}
function karmaTierChange(t0, t1) {
  const up = t1 < t0, [, name, col] = KARMA_TIER[t1], txt = (up ? KARMA_TEXT.up : KARMA_TEXT.down)[t1];
  evBanner(`${up ? '▲' : '▼'} 소문이 바뀌었다 · ${name}`, col); play(up ? 'bell' : 'alarm', 0.35);
  if (txt) after(2.6, () => evBanner(`강 형사 문자 · "${txt}"`, '#cfe0ff'));
  if (typeof applyStanding === 'function') {   // 조직은 무법자에게 손을 내밀고, 경찰은 영웅을 봐준다
    if (!up && t1 >= 3) after(5, () => applyStanding({ A: 6, B: 6, C: 6, D: 6, P: -8 }));
    if (up && t1 <= 1) after(5, () => applyStanding({ P: 6, A: -4, B: -4 })); }
  if (typeof saveFreeProgress === 'function') saveFreeProgress(true);
}
function karmaFromStat(k, n) { const d = KARMA_STAT[k]; if (d && n > 0) karmaAdd(d); }
// 쓰러진 사람을 보고: 누구였나 (악당·조직원 ↔ 죄 없는 사람·경찰)
function karmaCriminal(g) { return !!g && (g.assailant || g.knifeman || g.skReal || g.rude || g === S.hit?.g || g.target || g.fac && g.fac !== 'P' && !g.civ || (typeof villainOf === 'function' && villainOf(g))); }
function karmaCorpses() {
  const C = S.corpses || []; let i = S.kmCi || 0; if (i > C.length) i = 0;
  for (; i < C.length; i++) { const c = C[i], g = c.g; if (!g || c.by || c.kmBy || c.kmSeen) continue; c.kmSeen = true;   // 조직끼리·경찰이 쓰러뜨린 건 내 일이 아니다
    if (karmaCriminal(g)) { if (g.assailant || g.knifeman || g.skReal) karmaAdd(c.ko ? 4 : 3); continue; }
    if (g.police) karmaAdd(c.ko ? -2 : -6); else if (c.civ || g.staff) karmaAdd(c.ko ? -2 : -6); }
  S.kmCi = i;
}
// 지나가는 행인: 성향 따라 한마디 · 무법자면 비켜서거나 피한다 (몇 초에 한 명)
function karmaStreet() {
  const P = S.player; if (P.car || P.hide || flOf(P) || S.t < (S.kmSayT || 0)) return; const t = karmaTier(); if (t === 2) return;
  let best = null, bd = 120;
  for (const g of S.guards) { if (!g.civ || g.off || g.evt || g.staff || g.child || g.dog || g.police || !npcAlive(g) || g.state !== 'PATROL' || flOf(g) || g.chat) continue;
    const d = dist(g.x, g.y, P.x, P.y); if (d < bd && d > 30 && los(g.x, g.y - 10, P.x, P.y - 10)) { bd = d; best = g; } }
  S.kmSayT = S.t + (t <= 1 ? 7 : 5) + Math.random() * 6; if (!best) return;
  const L = KARMA_LINES[t]; gsay(best, L[(Math.random() * L.length) | 0], 2.2); best.a = Math.atan2(P.y - best.y, P.x - best.x);
  if (t === 4 || t === 3 && Math.random() < 0.4) civPanic(best, P.x, P.y, t === 4 ? 8 : 3);
}
function karmaUpdate() {
  if (!STAGE.cityLife || !S.fst) return; if ((S.kmT = (S.kmT || 0) - 1) > 0) return; S.kmT = 30;   // 0.5초쯤마다
  karmaCorpses(); karmaStreet();
}
if (typeof npcDown === 'function') { const _nd = npcDown; npcDown = function (o, by) { const n = (S.corpses || []).length, r = _nd.apply(this, arguments); const c = S.corpses && S.corpses[S.corpses.length - 1]; if (c && S.corpses.length > n && c.g === o) c.kmBy = by || null; return r; }; }   // 누가 쓰러뜨렸나 (다른 사람이 한 일은 내 성향이 아니다)
// 신고 · 가게 값
if (typeof repWitnessMul === 'function') { const _rw = repWitnessMul; repWitnessMul = function (x, y) { const r = _rw.apply(this, arguments); if (!STAGE.cityLife) return r; const t = karmaTier(); return r * [0.75, 0.9, 1, 1.15, 1.3][t]; }; }
if (typeof repPrice === 'function') { const _rp = repPrice; repPrice = function (p) { const r = _rp.apply(this, arguments); if (!STAGE.cityLife) return r; const t = karmaTier(); return Math.max(1, Math.round(r * [0.9, 0.95, 1, 1.1, 1.2][t])); }; }
if (typeof staffUpdate === 'function') { const _su = staffUpdate; staffUpdate = function (dt) { const r = _su.apply(this, arguments); karmaUpdate(); return r; }; }
if (typeof staffInit === 'function') { const _si = staffInit; staffInit = function () { _si.apply(this, arguments); S.kmCi = (S.corpses || []).length; S.kmSayT = S.t + 20; }; }
