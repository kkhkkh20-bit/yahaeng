// ---------------------------------------------------------------- 자유 모드 동네 얼굴: 구역마다 다른 벽 붙이 · 명소 · 작은 장면
// 1) 1층 벽(문·창 사이 맨벽)에 붙은 것: 포스터·구인/분실 쪽지(뜯는 꼬리표)·낙서 태그·손글씨 간판·스티커·빛바랜 광고·벽화(성수). 구역마다 다른 꾸러미.
//    정면 그림(drawStudyFacade) 바로 뒤, 간판과 같은 단계에서 그린다 — 자리는 칸 좌표로 정해져 매번 같다.
// 2) 구역 명소 한두 곳: 종로 포장마차 줄 · 을지로 인쇄소 마당 · 동대문 새벽 하차장 · 청계천 작은 폭포 · 신당 떡볶이 골목 · 관청가 광장 · 성수 창고 카페.
//    블록 안 빈 땅(맨땅·아스팔트·풀밭)에 바닥 장식으로 놓는다 (충돌 없음, 길을 막지 않는다).
// 3) 작은 장면: 공원 바둑 두는 노인 둘 · 청계천 버스킹과 구경꾼 · 오토바이에 앉아 야식 먹는 배달 기사 · 사진 찍는 둘 · 벤치에서 잠든 사람.
//    내 둘레 화면 밖에 세우고, 멀어지면 들여보낸다 (임시 인물 자리를 다시 쓴다). 글자는 모두 지어낸 것이다.
const LM_PX = 3;   // 명소 그림 도트 한 칸 = 3 월드 px (거리 소품과 같은 굵기)
const LM_SPR = {};
const lmHash = (a, b, k = 0) => ((((a * 92837111) ^ (b * 689287499) ^ (k * 283923481)) >>> 0) % 1000) / 1000;
// 그림 캔버스: 사각형(R)·글씨(T)로 그린 뒤 반투명 가장자리를 잘라 또렷한 도트로 (글씨도 번지지 않게)
function lmCanvas(key, w, h, paint, crisp = true) {
  if (LM_SPR[key]) return LM_SPR[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const R = (a, b, ww, hh, col) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); };
  const T = (s, a, b, px, col, al = 'center') => { x.font = '700 ' + px + 'px ' + UI_FONT_FAMILY; x.textAlign = al; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(s, a, b); };
  paint(R, T, x);
  if (crisp) { const im = x.getImageData(0, 0, w, h), d = im.data; for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 110 ? 0 : 255; x.putImageData(im, 0, 0); }
  return (LM_SPR[key] = c);
}
// ---- 1) 벽 붙이: 구역별 꾸러미 (t 큰 글씨 · bg 바탕 · fg 글씨 · tabs 뜯는 꼬리표 · pic 작은 그림 · fade 빛바램)
const LM_WALL = {
  '종로 유흥가': { posters: [{ t: '라이브', bg: '#1a1430', fg: '#ff5ab0', pic: 'guitar' }, { t: '오늘밤', bg: '#f2d23a', fg: '#1a1a1a', ac: '#c8202a' }, { t: '공연', bg: '#24242c', fg: '#5ae0ff', pic: 'mic' }, { t: '클럽', bg: '#5a1a6a', fg: '#ffd84a' }],
    tag: 0.45, sticker: 0.35, hand: ['노래', '맥주'] },
  '을지로 인쇄골목': { posters: [{ t: '명함', bg: '#d8cfb4', fg: '#7a3a2a', fade: true }, { t: '전단', bg: '#cfd6c4', fg: '#2a4a6a', fade: true }, { t: '코팅', bg: '#e0d2b8', fg: '#6a2a4a', fade: true }, { t: '구인', bg: '#f4f0e2', fg: '#1a1a1a', tabs: true }],
    tag: 0.15, sticker: 0.2, hand: ['제본', '인쇄', '도장'], ads: ['인쇄 · 제본', '종이 도매', '당일 출력'] },
  '동대문 시장': { posters: [{ t: '도매', bg: '#ffffff', fg: '#c8202a' }, { t: '원단', bg: '#2a5aa8', fg: '#ffffff' }, { t: '급구', bg: '#f2e640', fg: '#1a1a1a', tabs: true }, { t: '택배', bg: '#3a8a4a', fg: '#ffffff' }],
    tag: 0.2, sticker: 0.3, hand: ['미싱', '단추', '지퍼'] },
  '청계천 상가': { posters: [{ t: '수리', bg: '#e8e2d2', fg: '#2a2a2a' }, { t: '매입', bg: '#ffffff', fg: '#1a4aa0' }, { t: '부품', bg: '#f0c040', fg: '#1a1a1a' }, { t: '중고', bg: '#2a2a30', fg: '#7af0a0' }],
    tag: 0.25, sticker: 0.45, hand: ['전파사', '수리', '열쇠'] },
  '신당동 주택가': { posters: [{ t: '찾아요', bg: '#ffffff', fg: '#1a1a1a', pic: 'cat', tabs: true }, { t: '알바', bg: '#f2e640', fg: '#1a1a1a', tabs: true }, { t: '과외', bg: '#e8f0ff', fg: '#1a3a8a', tabs: true }, { t: '반찬', bg: '#fff2e0', fg: '#a83a1a' }],
    tag: 0.15, sticker: 0.15, hand: ['세탁', '수선', '방앗간'], paint: true },
  '중구 관청가': { posters: [{ t: '공고', bg: '#ffffff', fg: '#1a3a8a', seal: true }, { t: '안내', bg: '#f4f6f8', fg: '#2a2a2a', seal: true }, { t: '단속', bg: '#ffffff', fg: '#c8202a' }, { t: '민원', bg: '#e8f0e8', fg: '#2a5a3a' }],
    tag: 0.05, sticker: 0.05, hand: ['대서방', '복사'] },
  '성수 공장지대': { posters: [{ t: '전시', bg: '#1a1a1a', fg: '#f2f2f2' }, { t: '팝업', bg: '#ff7a3a', fg: '#ffffff' }, { t: '공방', bg: '#e8dcc8', fg: '#3a2a1a' }, { t: '임대', bg: '#ffffff', fg: '#c8202a' }],
    tag: 0.55, sticker: 0.3, hand: ['철공', '용접'], mural: true },
};
function lmPoster(p, v) {
  return lmCanvas('po' + p.t + v, 30, 39, (R, T) => {
    R(0, 0, 30, 39, '#101014'); R(1, 1, 28, 37, p.bg); R(1, 1, 28, 3, p.ac || p.fg);   // 테두리 · 윗띠
    T(p.t, 15, p.pic ? 26 : 13, p.t.length > 2 ? 9 : 11, p.fg);
    if (p.pic === 'guitar') { R(10, 6, 9, 9, p.fg); R(13, 3, 3, 6, p.fg); R(13, 9, 3, 3, p.bg); }
    else if (p.pic === 'mic') { R(13, 5, 5, 6, p.fg); R(15, 11, 1, 5, p.fg); }
    else if (p.pic === 'cat') { R(10, 8, 10, 8, '#3a3a40'); R(10, 5, 3, 3, '#3a3a40'); R(17, 5, 3, 3, '#3a3a40'); R(12, 10, 2, 2, '#f0d040'); R(16, 10, 2, 2, '#f0d040'); }
    if (!p.pic) { R(5, 21, 20, 2, p.fg); R(5, 25, 16, 2, p.fg); R(5, 29, 18, 2, p.fg); }
    if (p.seal) { R(21, 30, 6, 6, '#c8202a'); R(22, 31, 4, 4, p.bg); }
    if (p.tabs) for (let k = 0; k < 6; k++) { R(2 + k * 4 + (v & 1), 33, 3, 6, k % 2 ? '#f4f0e2' : '#e8e2d2'); R(3 + k * 4 + (v & 1), 34, 1, 4, p.fg); }   // 뜯는 꼬리표 (몇 개는 이미 뜯겼다)
    if (p.fade) { R(1, 1 + (v % 3) * 9, 28, 3, 'rgba(240,236,220,.85)'); }
  }); }
function lmTag(v) {   // 낙서 태그: 굵은 외곽선 글자 (뜻 없는 지어낸 글자)
  const W = ['ZEK', 'MOA', 'K7', 'NUL', 'RAE', 'B2', 'OHO', 'TIK'][v % 8], c = [['#ff4ab0', '#ffd84a'], ['#5ae0ff', '#1a1a1a'], ['#7af05a', '#1a1a1a'], ['#ffffff', '#c8202a'], ['#ffa53a', '#2a2a6a']][v % 5];
  return lmCanvas('tag' + v, 48, 22, (R, T, x) => { x.save(); x.translate(24, 11); x.rotate(((v % 5) - 2) * 0.06); x.font = '900 17px ' + UI_FONT_FAMILY; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 4; x.strokeStyle = c[1]; x.strokeText(W, 0, 1); x.fillStyle = c[0]; x.fillText(W, 0, 1); x.restore(); if (v % 3 === 0) { R(40, 14, 2, 6, c[0]); R(12, 15, 2, 4, c[0]); } }); }   // 흘러내린 물감
function lmHand(t, v) {   // 손글씨 간판: 나무판에 붓 글씨
  const bg = ['#c8a06a', '#e8e2d2', '#2a4a3a'][v % 3], fg = v % 3 === 2 ? '#f2e6c0' : '#7a1a1a';
  return lmCanvas('hd' + t + v, 42, 18, (R, T) => { R(0, 0, 42, 18, '#1a1410'); R(1, 1, 40, 16, bg); R(1, 15, 40, 2, 'rgba(0,0,0,.35)'); T(t, 21, 9, t.length > 2 ? 10 : 12, fg); R(3, 3, 1, 1, '#5a4a3a'); R(38, 3, 1, 1, '#5a4a3a'); }); }
function lmStickers(v) { return lmCanvas('st' + v, 24, 18, R => { const C = ['#ff4a4a', '#ffd84a', '#5ae0ff', '#ffffff', '#7af05a', '#ff9ad8'];
  for (let k = 0; k < 5; k++) { const a = (v * 7 + k * 5) % 16, b = (v * 3 + k * 7) % 11; R(a, b, 7, 6, '#101014'); R(a + 1, b + 1, 5, 4, C[(v + k) % 6]); R(a + 2, b + 2, 3, 1, '#101014'); } }); }
function lmAd(t, v) { return lmCanvas('ad' + t + v, 132, 26, (R, T) => {   // 빛바랜 칠 광고 (을지로)
  R(0, 0, 132, 26, 'rgba(232,222,196,.55)'); R(0, 0, 132, 2, 'rgba(160,60,40,.55)'); T(t, 66, 14, 15, ['rgba(140,40,30,.8)', 'rgba(30,60,110,.8)', 'rgba(40,90,50,.8)'][v % 3]); }); }
function lmMural(n, v) {   // 성수 벽화: 칸 n개 폭 (도트 띠로 그린 노을 도시 · 물결 · 꽃 · 기하 무늬)
  const w = n * TILE - 10, h = 40;
  return lmCanvas('mu' + n + v, w, h, R => {
    const th = v % 4;
    if (th === 0) { const sky = ['#2a1a4a', '#5a2a6a', '#a83a5a', '#e86a4a', '#f2b04a']; for (let k = 0; k < 5; k++) R(0, k * 6, w, 6, sky[k]); R(w * 0.6, 12, 12, 12, '#ffe08a');
      for (let x = 0; x < w; x += 9) { const bh = 8 + ((x * 37) % 17); R(x, h - bh, 8, bh, '#1a1430'); if (x % 18 === 0) R(x + 3, h - bh + 3, 2, 2, '#ffd84a'); } }
    else if (th === 1) { R(0, 0, w, h, '#1a3a6a'); for (let y = 0; y < h; y += 6) for (let x = 0; x < w; x += 6) if (((x / 6 + (y / 6) * 2) | 0) % 5 < 2) R(x + ((y / 6) % 2) * 3, y, 6, 3, ['#3a8ad8', '#8ad8f0', '#ffffff'][((x + y) / 6 | 0) % 3]); }
    else if (th === 2) { R(0, 0, w, h, '#f2e2c8'); for (let k = 0; k < Math.max(2, n); k++) { const cx = 20 + k * (w - 40) / Math.max(1, n - 1), cy = 20; R(cx - 9, cy - 3, 18, 6, '#e84a6a'); R(cx - 3, cy - 9, 6, 18, '#e84a6a'); R(cx - 3, cy - 3, 6, 6, '#ffd84a'); R(cx - 1, cy + 9, 2, 11, '#3a8a4a'); } }
    else { for (let x = 0; x < w; x += 12) for (let y = 0; y < h; y += 12) R(x, y, 12, 12, ['#ff7a3a', '#1a1a1a', '#f2f2f2', '#3a6ad8'][((x + y) / 12 + v) % 4 | 0]); }
    R(0, 0, w, 2, 'rgba(0,0,0,.4)'); R(0, h - 2, w, 2, 'rgba(0,0,0,.4)');
  }, false); }
function lmGroundText(t) { return lmCanvas('gt' + t, 84, 22, (R, T) => { R(0, 0, 84, 22, 'rgba(242,214,58,.0)'); R(0, 0, 84, 2, '#e8c83a'); R(0, 20, 84, 2, '#e8c83a'); T(t, 42, 11, 14, '#e8c83a'); }); }
// ---- 2) 명소 그림 (도트 칸 단위 · LM_PX배로 그린다)
const LM_SET = {
  pocha: () => lmCanvas('L_pocha', 96, 34, R => {   // 종로 포장마차 줄: 주황 천막 셋 · 안에 탁자와 의자 · 알전구
    for (let k = 0; k < 3; k++) { const x = k * 32 + 1;
      R(x, 2, 30, 4, '#c85a1a'); R(x + 1, 0, 28, 3, '#e8782a'); R(x, 6, 30, 18, 'rgba(232,120,42,.55)'); R(x, 6, 2, 24, '#7a3a14'); R(x + 28, 6, 2, 24, '#7a3a14');
      R(x + 6, 16, 18, 7, '#1a1a20'); R(x + 6, 15, 18, 6, '#c9c4b8'); R(x + 9, 16, 2, 3, '#3a9a5a'); R(x + 17, 17, 3, 2, '#e8e2d2');
      for (const sx of [x + 3, x + 25]) { R(sx, 22, 3, 3, '#c23a36'); R(sx, 27, 3, 3, '#2f62b0'); }
      for (let j = 0; j < 5; j++) R(x + 3 + j * 6, 7, 1, 1, '#ffe6a0'); } }),
  print: () => lmCanvas('L_print', 64, 34, R => {   // 을지로 인쇄소 마당: 낡은 인쇄기 · 종이 더미 · 흩어진 종이 · 리어카
    R(2, 6, 22, 20, '#14141a'); R(3, 6, 20, 18, '#2f5a4a'); R(5, 9, 16, 4, '#1a2a24'); R(6, 10, 14, 2, '#8a9a94'); R(8, 16, 10, 6, '#3a6a5a'); R(20, 4, 3, 6, '#5a5a60');
    for (let k = 0; k < 4; k++) { const x = 28 + k * 8, y = 12 - (k % 2) * 3; for (let j = 0; j < 3; j++) { R(x, y + j * 5, 7, 5, '#14141a'); R(x, y + j * 5, 7, 4, j % 2 ? '#e8e2d2' : '#f4f0e6'); R(x + 3, y + j * 5, 1, 4, '#c84a3a'); } }
    for (let k = 0; k < 9; k++) R(22 + (k * 11) % 36, 26 + (k * 5) % 7, 4, 3, k % 3 ? '#f4f0e6' : '#e0d8c4');
    R(44, 22, 18, 6, '#6a4a2a'); R(46, 18, 14, 4, '#e8e2d2'); R(46, 27, 4, 4, '#14141a'); R(56, 27, 4, 4, '#14141a'); R(60, 20, 4, 2, '#4a3a2a'); }),
  loading: () => lmCanvas('L_load', 64, 34, R => {   // 동대문 새벽 하차장: 천으로 싼 짐 더미 · 손수레 · 상자
    const C = [['#2a5aa8', '#4a7ad8'], ['#c84a8a', '#e86aaa'], ['#3a8a4a', '#5aaa6a'], ['#d8a12a', '#f0c04a']];
    for (let k = 0; k < 6; k++) { const x = 2 + (k % 3) * 13, y = 4 + Math.floor(k / 3) * 12, c = C[(k + 1) % 4]; R(x, y + 1, 12, 11, '#14141a'); R(x, y, 12, 10, c[0]); R(x + 1, y + 1, 10, 2, c[1]); R(x + 5, y, 2, 10, '#e8e2d2'); }
    R(46, 6, 3, 22, '#5a5a62'); R(46, 26, 12, 3, '#5a5a62'); R(47, 28, 4, 4, '#14141a'); R(48, 10, 9, 8, '#b0844e'); R(48, 18, 9, 8, '#a0743e');
    for (let k = 0; k < 3; k++) { R(60 - k, 4 + k * 9, 4, 8, '#b0844e'); } }),
  tteok: () => lmCanvas('L_tteok', 80, 34, R => {   // 신당 떡볶이 골목: 노점 셋 · 빨간 떡볶이 판 · 어묵 꼬치 · 플라스틱 의자
    for (let k = 0; k < 3; k++) { const x = k * 27 + 1;
      R(x, 2, 24, 3, ['#c83a3a', '#2a5aa8', '#3a8a4a'][k]); R(x, 5, 24, 2, '#f4f0e6'); R(x + 1, 7, 1, 12, '#5a5a62'); R(x + 22, 7, 1, 12, '#5a5a62');
      R(x, 16, 24, 10, '#14141a'); R(x, 15, 24, 9, '#8a5a3a'); R(x + 2, 12, 12, 5, '#3a3a40'); R(x + 3, 13, 10, 3, '#d8302a'); R(x + 4, 13, 2, 1, '#f2e6c0'); R(x + 8, 14, 2, 1, '#f2e6c0');
      for (let j = 0; j < 3; j++) R(x + 16 + j * 2, 9, 1, 6, '#e8d8b0');
      R(x + 3, 27, 3, 3, '#2f62b0'); R(x + 17, 27, 3, 3, '#c23a36'); } }),
  plaza: () => lmCanvas('L_plaza', 64, 50, R => {   // 관청가 광장: 돌바닥 · 받침돌 위 책 읽는 사람 동상(지어낸 인물) · 깃대 셋 · 꽃밭
    for (let y = 18; y < 50; y += 4) for (let x = 0; x < 64; x += 8) R(x + ((y / 4) % 2) * 4, y, 7, 3, (x + y) % 3 ? '#8a8e96' : '#9aa0a8');
    R(26, 30, 12, 10, '#14141a'); R(27, 30, 10, 9, '#c8c4bc'); R(27, 30, 10, 2, '#e8e4dc');
    R(29, 16, 6, 14, '#4a6a5a'); R(30, 12, 4, 4, '#4a6a5a'); R(27, 20, 4, 3, '#3a5a4a'); R(33, 20, 4, 3, '#3a5a4a'); R(28, 21, 8, 2, '#c8b880');   // 동상 · 펼친 책
    for (let k = 0; k < 3; k++) { const x = 6 + k * 4; R(x, 0, 1, 30, '#c8ccd2'); R(x + 1, 1, 7, 5, ['#f2f2f2', '#2a5aa8', '#3a8a4a'][k]); R(x + 3, 2, 2, 2, ['#2a5aa8', '#ffffff', '#ffffff'][k]); }
    for (const [x, y] of [[44, 22], [52, 22], [44, 40], [52, 40], [2, 40]]) { R(x, y, 8, 6, '#3a5a2a'); R(x + 1, y + 1, 2, 2, '#e84a6a'); R(x + 4, y + 2, 2, 2, '#ffd84a'); R(x + 6, y, 1, 2, '#e84a6a'); } }),
  cafe: () => lmCanvas('L_cafe', 64, 50, R => {   // 성수 창고 카페 마당: 벽돌 바닥 · 둥근 탁자와 의자 · 접힌 파라솔 · 칠판 간판 · 화분
    for (let y = 14; y < 50; y += 4) for (let x = 0; x < 64; x += 8) R(x + ((y / 4) % 2) * 4, y, 7, 3, '#7a4a3a');
    for (const [x, y] of [[8, 20], [30, 30], [48, 18]]) { R(x - 1, y + 7, 12, 2, 'rgba(0,0,0,.35)'); R(x, y, 10, 6, '#e8e2d6'); R(x + 4, y + 6, 2, 3, '#3a3a40'); R(x - 4, y + 2, 3, 5, '#2a2a30'); R(x + 11, y + 2, 3, 5, '#2a2a30'); R(x + 4, y - 12, 2, 12, '#5a5a60'); R(x + 2, y - 14, 6, 4, '#2a6a5a'); }
    R(2, 2, 12, 12, '#3a2a1a'); R(3, 3, 10, 9, '#1a2420'); R(4, 5, 7, 1, '#f2f2e8'); R(4, 8, 5, 1, '#f2f2e8'); R(5, 12, 1, 3, '#3a2a1a'); R(11, 12, 1, 3, '#3a2a1a');   // 칠판 입간판
    for (const x of [22, 58]) { R(x, 40, 5, 6, '#b06a3a'); R(x - 1, 35, 7, 6, '#3a8a4a'); } }),
  falls: () => lmCanvas('L_falls', 32, 22, R => {   // 청계천 작은 폭포: 아래 축대 벽 틈에서 물로 떨어진다 (흐름 줄무늬는 그릴 때 움직인다)
    R(0, 0, 32, 4, '#4a4e56'); R(0, 0, 32, 1, '#7a7e86'); R(2, 4, 28, 1, '#2a2e36'); R(5, 4, 22, 13, 'rgba(120,180,230,.55)');
    R(1, 16, 30, 4, 'rgba(225,242,255,.9)'); R(0, 18, 4, 3, '#e8f4ff'); R(28, 18, 4, 3, '#e8f4ff'); R(9, 20, 14, 2, 'rgba(225,242,255,.6)'); }, false),
};
const LM_DIST = {   // 구역 → 명소 (칸 크기 w×h · 바닥 · 밤 불빛 자리)
  '종로 유흥가': { k: 'pocha', w: 6, h: 2, glow: 'bulbs' }, '을지로 인쇄골목': { k: 'print', w: 4, h: 2 }, '동대문 시장': { k: 'loading', w: 4, h: 2 },
  '신당동 주택가': { k: 'tteok', w: 5, h: 2, glow: 'stall' }, '중구 관청가': { k: 'plaza', w: 4, h: 3 }, '성수 공장지대': { k: 'cafe', w: 4, h: 3, glow: 'string' },
};
// ---- 배치 (판마다 한 번, 칸 좌표로만 정하므로 매번 같다)
let LM = null;
function lmInit() {
  if (typeof sdInit === 'function' && (!SD || SD.stage !== STAGE.id)) sdInit();
  const at = (x, y) => inMap(x, y) ? G0[y][x] : '#', wallCh = c => '#NSXV'.includes(c), dname = (x, y) => STAGE.districtAt?.(x, y) || '';
  const used = new Set((SD?.list || []).map(o => Math.floor(o.x / TILE) + ',' + Math.floor(o.y / TILE)));
  const booths = (STAGE.phones || []).map(([x, y]) => [Math.floor(x), Math.floor(y)]), nearBooth = (x, y) => booths.some(([a, b]) => Math.abs(a - x) <= 2 && Math.abs(b - y) <= 2);
  const wall = [], ground = [], sets = [];
  // 1) 1층 정면 맨벽 칸마다 (문·창 칸은 건너뛴다) 구역 꾸러미에서 하나씩, 건물마다 많아야 셋
  BLD.forEach((b, bi) => {
    if (b.vacant || !b.fh) return; const D = LM_WALL[dname(Math.floor((b.x0 + b.x1) / 2), b.y1 + 1)]; if (!D) return;
    const cols = []; for (let x = b.x0 + 1; x <= b.x1 - 1; x++) if (wallCh(at(x, b.y1)) && !used.has(x + ',' + (b.y1 + 1))) cols.push(x);
    if (!cols.length) return; let n = 0;
    if (D.mural && b.kind !== 'shop' || D.mural && lmHash(bi, 1) < 0.35) {   // 성수: 연달아 맨벽 셋 이상이면 벽화
      for (let i = 0; i < cols.length; i++) { let j = i; while (j + 1 < cols.length && cols[j + 1] === cols[j] + 1) j++; if (j - i + 1 >= 3) { wall.push({ k: 'mural', b: bi, x: cols[i] * TILE + 5, y: b.y1 * TILE + 4, n: Math.min(5, j - i + 1), v: bi % 4 }); n = 9; break; } i = j; } }
    if (D.ads && lmHash(bi, 2) < 0.35) { for (let i = 0; i + 2 < cols.length; i++) if (cols[i + 2] === cols[i] + 2) { wall.push({ k: 'ad', b: bi, x: cols[i] * TILE + 6, y: b.y1 * TILE + 4, t: D.ads[bi % D.ads.length], v: bi % 3 }); cols.splice(i, 3); n++; break; } }
    for (const x of cols) { if (n >= 3) break; const h = lmHash(x, b.y1, 3); if (h > 0.62) continue; n++;
      const r = lmHash(x, b.y1, 5);
      if (r < 0.5) wall.push({ k: 'poster', b: bi, x: x * TILE + 9, y: b.y1 * TILE + 5, p: D.posters[Math.floor(lmHash(x, bi, 6) * D.posters.length)], v: (x + bi) % 4 });
      else if (r < 0.5 + D.tag) wall.push({ k: 'tag', b: bi, x: x * TILE, y: b.y1 * TILE + 18, v: (x * 3 + b.y1) % 40 });
      else if (r < 0.5 + D.tag + D.sticker) wall.push({ k: 'sticker', b: bi, x: x * TILE + 12, y: b.y1 * TILE + 20, v: (x + b.y1) % 12 });
      else wall.push({ k: 'hand', b: bi, x: x * TILE + 3, y: b.y1 * TILE + 8, t: D.hand[(x + bi) % D.hand.length], v: (x + bi) % 3 }); }
    // 바닥 칠: 주택가 집 앞 맨땅에 '주차금지'
    if (D.paint && b.kind !== 'shop' && lmHash(bi, 7) < 0.5) for (const x of [b.x0 + 2, b.x1 - 3]) { const y = b.y1 + 1; if (at(x, y) === '.' || at(x, y) === ',') { if (!used.has(x + ',' + y) && !used.has((x + 1) + ',' + y)) { ground.push({ k: 'nopark', x: x * TILE + 6, y: y * TILE + 14 }); used.add(x + ',' + y); used.add((x + 1) + ',' + y); break; } } }
  });
  // 2) 구역 명소: 그 구역 블록 안 빈 땅에서 처음 맞는 자리 (보도에 닿는 자리를 먼저)
  const [BX, BY] = STAGE.blockCount || [0, 0], BS = STAGE.blockSize || 0, cars = S.vehicles || [];
  const okCh = c => c === ',' || c === '.' || c === 'g';
  const fits = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const tx = x + i, ty = y + j; if (!okCh(at(tx, ty)) || bldAt(tx, ty) >= 0 || used.has(tx + ',' + ty) || nearBooth(tx, ty)) return false; }
    return !cars.some(v => v.x > (x - 1) * TILE && v.x < (x + w + 1) * TILE && v.y > (y - 1) * TILE && v.y < (y + h + 1) * TILE); };
  const special = (x, y) => { const d = STAGE.dealer, r = STAGE.respray; const inR = (q, a, b) => q && a >= q[0] - 1 && a <= q[2] + 1 && b >= q[1] - 1 && b <= q[3] + 1; return inR(d?.lot, x, y) || inR(r?.bay, x, y); };
  for (const [name, L] of Object.entries(LM_DIST)) {
    let best = null, bs = -1;
    for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) { const [x0, y0] = STAGE.blockOrigin(bx, by); if (dname(x0 + 2, y0 + 2) !== name) continue;
      for (let y = y0 + 1; y + L.h <= y0 + BS - 1; y++) for (let x = x0 + 1; x + L.w <= x0 + BS - 1; x++) {
        if (special(x, y) || special(x + L.w - 1, y + L.h - 1) || !fits(x, y, L.w, L.h)) continue;
        let side = 0; for (let i = 0; i < L.w; i++) { if (at(x + i, y + L.h) === '=') side += 2; if (at(x + i, y - 1) === '=') side++; }
        const sc = side * 10 + lmHash(x, y, 9); if (sc > bs) { bs = sc; best = { x, y }; } } }
    if (!best) continue; for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) used.add((best.x + i) + ',' + (best.y + j));
    sets.push({ k: L.k, name, x: best.x * TILE, y: best.y * TILE, w: L.w, h: L.h, glow: L.glow });
  }
  // 청계천 작은 폭포: 북쪽 축대 벽에서 물로 떨어진다 (다리 칸이 아닌 곳 둘)
  const Rv = STAGE.river; if (Rv) for (const fx of [Math.floor(MW * 0.3), Math.floor(MW * 0.72)]) { let x = fx; while (x < MW - 4 && (STAGE.roadsX || []).some(r => x >= r - 2 && x < r + 6)) x++;
    sets.push({ k: 'falls', name: '청계천 상가', x: x * TILE, y: (Rv.y + 3) * TILE - 6, w: 2, h: 1, anim: true }); }
  // 3) 작은 장면 후보 자리
  const benches = (SD?.list || []).filter(o => o.k === 'bench'), riverY = Rv ? Rv.y : -99;
  const scenes = [];
  for (const o of benches) { const onRiver = o.y >= riverY * TILE && o.y < (riverY + (Rv?.rows || 0)) * TILE; scenes.push({ k: onRiver ? 'sleep' : (lmHash(o.x, o.y, 2) < 0.5 ? 'baduk' : 'sleep'), x: o.x + TILE, y: o.y + TILE * 0.6 }); }
  if (Rv) for (let x = 12; x < MW - 12; x += 23) { if ((STAGE.roadsX || []).some(r => x >= r - 3 && x < r + 7)) continue; const y = (Rv.y + Rv.rows - 3) * TILE + 20;   // 남쪽 산책로 첫 줄(난간 앞): 구경꾼은 그 아래 두 줄에 선다
    scenes.push({ k: lmHash(x, 1, 4) < 0.55 ? 'busk' : 'photo', x: x * TILE + TILE / 2, y }); }
  BLD.forEach((b, bi) => { if (b.vacant || b.kind !== 'shop' || !/포차|호프|분식|국밥|치킨|백반|곱창|골뱅이/.test((b.signs?.[0] || ''))) return; if (lmHash(bi, 12) > 0.3) return;
    const x = (b.x1 - 1) * TILE, y = (b.y1 + 1) * TILE + TILE * 0.55; scenes.push({ k: 'rider', x, y }); });
  const grid = new Map(), put = o => { const key = Math.floor(o.x / TILE / 16) + ',' + Math.floor(o.y / TILE / 16); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(o); };
  ground.forEach(put); sets.forEach(put);
  const wallBy = new Map(); for (const o of wall) { if (!wallBy.has(o.b)) wallBy.set(o.b, []); wallBy.get(o.b).push(o); }
  LM = { stage: STAGE.id, wallBy, wall, ground, sets, grid, scenes };
}
let LM_OFF = false;   // 시험용 끄개 (그리기 비용 비교)
const lmReady = () => !LM_OFF && STAGE.cityLife && G0 && (LM && LM.stage === STAGE.id || (lmInit(), true));
function lmVisible(fn) {
  const vw = W / SCALE / 2 + 400, vh = H / SCALE / 2 + 400, cx0 = Math.floor((cam.x - vw) / TILE / 16), cx1 = Math.floor((cam.x + vw) / TILE / 16), cy0 = Math.floor((cam.y - vh) / TILE / 16), cy1 = Math.floor((cam.y + vh) / TILE / 16);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const a = LM.grid.get(cx + ',' + cy); if (a) for (const o of a) fn(o); }
}
// ---- 그리기: 땅 단계(명소·바닥 칠·장면 소품) · 정면 단계(벽 붙이) · 어둠 뒤 단계(명소 불빛)
function drawLandmarksGround() {
  if (CUR_F || !lmReady()) return; ctx.save(); ctx.imageSmoothingEnabled = false;
  lmVisible(o => {
    if (o.k === 'nopark') { if (inView(o.x, o.y, 60)) ctx.drawImage(lmGroundText('주차금지'), o.x, o.y); return; }
    const s = LM_SET[o.k]?.(); if (!s) return; const w = s.width * LM_PX, h = s.height * LM_PX; if (!inView(o.x + w / 2, o.y + h / 2, w)) return;
    if (o.k === 'falls') { ctx.drawImage(s, o.x, o.y, w, h); ctx.fillStyle = 'rgba(214,238,255,.8)'; const ph = (S.t * 54) % 12;   // 흐름: 3px 줄무늬가 아래로
      for (let k = 0; k < 7; k++) for (let j = 0; j < 3; j++) { const yy = o.y + 15 + ((j * 12 + ph + k * 5) % 36); ctx.fillRect(o.x + 18 + k * 9, yy, 3, 6); } return; }
    const oy = o.y + o.h * TILE - h;   // 밑동을 자리 아래 끝에 맞춘다 (천막·깃대는 위로 솟는다)
    ctx.drawImage(s, o.x + Math.round((o.w * TILE - w) / 2), oy, w, h);
  });
  for (const sc of S.lm?.active || []) if (sc.prop && inView(sc.prop.x, sc.prop.y, 80)) drawSceneProp(sc.prop);
  ctx.restore();
}
function drawSceneProp(p) {
  if (p.k === 'board') { ctx.fillStyle = '#14141a'; ctx.fillRect(p.x - 18, p.y - 6, 36, 21); ctx.fillStyle = '#c8a060'; ctx.fillRect(p.x - 15, p.y - 9, 30, 21); ctx.fillStyle = '#7a5a30';   // 바둑판 · 돌
    for (let k = 1; k < 5; k++) { ctx.fillRect(p.x - 15 + k * 6, p.y - 9, 1, 21); ctx.fillRect(p.x - 15, p.y - 9 + k * 4, 30, 1); }
    for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? '#f2f2f2' : '#1a1a1a'; ctx.fillRect(p.x - 12 + (k * 13) % 24, p.y - 6 + (k * 7) % 15, 3, 3); } }
  else if (p.k === 'case') { ctx.fillStyle = '#14141a'; ctx.fillRect(p.x - 21, p.y - 3, 42, 15); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(p.x - 20, p.y - 4, 40, 12); ctx.fillStyle = '#7a1a2a'; ctx.fillRect(p.x - 17, p.y - 1, 34, 6);   // 기타 가방 · 동전
    ctx.fillStyle = '#e8c83a'; ctx.fillRect(p.x - 9, p.y, 3, 3); ctx.fillRect(p.x + 3, p.y + 1, 3, 3); ctx.fillStyle = '#c8ccd2'; ctx.fillRect(p.x + 9, p.y, 3, 3);
    ctx.fillStyle = '#1a1a20'; ctx.fillRect(p.x + 27, p.y - 15, 15, 21); ctx.fillStyle = '#3a3a44'; ctx.fillRect(p.x + 30, p.y - 12, 9, 9); }   // 작은 앰프
  else if (p.k === 'scoot') { const s = SD_ART?.scooter?.(1); if (s) ctx.drawImage(s, p.x - 24, p.y - 24, 48, 30);
    ctx.fillStyle = '#e8e2d2'; ctx.fillRect(p.x + 27, p.y - 3, 9, 6); ctx.fillStyle = '#d8302a'; ctx.fillRect(p.x + 28, p.y - 2, 7, 3); }   // 길바닥 위 야식 그릇
}
function drawLandmarkWall(b) {
  if (!lmReady() || b.collapsed) return; const L = LM.wallBy.get(BLD.indexOf(b)); if (!L) return;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.textAlign = 'left';
  for (const o of L) { if (!inView(o.x, o.y, 120)) continue;
    if (o.k === 'poster') ctx.drawImage(lmPoster(o.p, o.v), o.x, o.y);
    else if (o.k === 'tag') ctx.drawImage(lmTag(o.v), o.x, o.y);
    else if (o.k === 'sticker') ctx.drawImage(lmStickers(o.v), o.x, o.y);
    else if (o.k === 'hand') ctx.drawImage(lmHand(o.t, o.v), o.x, o.y);
    else if (o.k === 'ad') ctx.drawImage(lmAd(o.t, o.v), o.x, o.y);
    else if (o.k === 'mural') ctx.drawImage(lmMural(o.n, o.v), o.x, o.y); }
  ctx.restore();
}
function drawLandmarksGlow() {
  if (CUR_F || !lmReady() || (STAGE.nightShade ?? 0.6) <= 0.3) return; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  lmVisible(o => { if (!o.glow) return; const s = LM_SET[o.k](), w = s.width * LM_PX, h = s.height * LM_PX, x = o.x + Math.round((o.w * TILE - w) / 2), y = o.y + o.h * TILE - h; if (!inView(x + w / 2, y + h / 2, w)) return;
    if (o.glow === 'bulbs') { ctx.fillStyle = 'rgba(255,170,90,.12)'; ctx.fillRect(x, y + 6 * LM_PX, w, 24 * LM_PX); ctx.fillStyle = 'rgba(255,232,170,.7)'; for (let k = 0; k < 3; k++) for (let j = 0; j < 5; j++) ctx.fillRect(x + (k * 32 + 4 + j * 6) * LM_PX, y + 7 * LM_PX, LM_PX * 2, LM_PX * 2); }
    else if (o.glow === 'stall') { ctx.fillStyle = 'rgba(255,200,130,.14)'; for (let k = 0; k < 3; k++) ctx.fillRect(x + (k * 27) * LM_PX, y + 5 * LM_PX, 26 * LM_PX, 22 * LM_PX); }
    else if (o.glow === 'string') { ctx.fillStyle = 'rgba(255,226,160,.8)'; for (let j = 0; j < 16; j++) ctx.fillRect(x + (2 + j * 4) * LM_PX, y + (8 + (j % 2)) * LM_PX, LM_PX, LM_PX); ctx.fillStyle = 'rgba(255,214,140,.07)'; ctx.fillRect(x, y + 10 * LM_PX, w, h - 10 * LM_PX); } });
  ctx.restore();
}
// ---- 3) 작은 장면: 내 둘레 화면 밖에 세우고(동시에 셋까지) 멀어지면 들여보낸다
const SCENE_MAX = 3, SCENE_R = 1500, SCENE_DROP = 2000;
function sceneSpawn(c) {
  const out = [], put = (x, y, a, o = {}) => { const gi = cityGuardSlot(), g = makeGuard(Object.assign({ kind: 'civ', at: [Math.floor(x / TILE), Math.floor(y / TILE)], radio: false }, o.body ? { body: o.body } : {}), gi);
    g.evt = '__scene'; g.x = x; g.y = y; g.fl = 0; g.a = g.want = a; g.post = a; g.route = [{ x, y, pause: 999 }]; g.ri = 0; g.wait = 999; placeGuard(g, gi); out.push(g); return g; };
  let prop = null;
  if (c.k === 'baduk') { prop = { k: 'board', x: c.x, y: c.y + 10 }; const a = put(c.x - 30, c.y, 0, { body: 'old' }), b = put(c.x + 30, c.y, Math.PI, { body: 'old' }); a.seat = b.seat = true; }   // 공원 바둑: 마주 앉은 노인 둘
  else if (c.k === 'sleep') { const g = put(c.x, c.y, 0); g.state = 'SLEEP'; g.sleep = true; }   // 벤치에서 잠든 사람 (zz)
  else if (c.k === 'busk') { prop = { k: 'case', x: c.x, y: c.y + 24 }; const s = put(c.x, c.y, Math.PI / 2, { body: 'jacket' }); s.chatter = true;   // 버스킹: 노래하는 사람과 멈춰 선 구경꾼
    for (let k = 0; k < 2 + (Math.floor(c.x / TILE) % 2); k++) { const ax = c.x + (k - 1) * 46, ay = c.y + 66 + (k % 2) * 16; put(ax, ay, Math.atan2(c.y - ay, c.x - ax)); } }
  else if (c.k === 'photo') { const p = put(c.x - 36, c.y, 0); p.shopper = true; p.act = 'workHigh'; const q = put(c.x + 36, c.y, Math.PI); q.chatter = true; }   // 사진 찍는 둘: 휴대폰을 든 사람 · 포즈 잡는 사람
  else if (c.k === 'rider') { prop = { k: 'scoot', x: c.x, y: c.y }; const r = put(c.x - 6, c.y - 6, Math.PI / 2, { body: 'helmet' }); r.outfit = 'courier'; r.seat = true; }   // 오토바이 옆에 앉아 야식 먹는 배달 기사
  if (PR && out.length) prWarm(out.map(charOf), true);
  return { c, gs: out, prop };
}
function lmSceneUpdate() {
  if (!STAGE.cityLife || !lmReady()) return; const L = S.lm || (S.lm = { active: [], t: 0 }), P = S.player;
  for (let i = L.active.length - 1; i >= 0; i--) { const s = L.active[i]; if (dist(s.c.x, s.c.y, P.x, P.y) > SCENE_DROP || s.gs.some(g => g.state === 'PANIC' || g.state === 'FLEE')) {   // 멀어졌거나 놀라 달아나면 장면을 접는다
      for (const g of s.gs) if (!g.off && npcAlive(g) && g.state !== 'PANIC' && g.state !== 'FLEE') evGone(g); s.prop = null; L.active.splice(i, 1); } }   // 놀란 사람은 그대로 둔다 (임시 인물이라 멀어지면 정리된다)
  if (L.active.length >= SCENE_MAX || flOf(P) || P.car && Math.abs(P.car.v || 0) > 300 || S.wanted >= 2) return;
  let best = null, bd = SCENE_R;
  for (const c of LM.scenes) { if (L.active.some(s => s.c === c || dist(s.c.x, s.c.y, c.x, c.y) < 900)) continue; const d = dist(c.x, c.y, P.x, P.y); if (d > 420 && d < bd && !inView(c.x, c.y, 120)) { bd = d; best = c; } }
  if (best) L.active.push(sceneSpawn(best));
}
// ---- 이어 붙이기: 땅 소품 앞, 정면 간판 뒤, 어둠 뒤 불빛, 직원 갱신(0.5초마다 장면)
if (typeof drawStreetDeco === 'function') { const _d = drawStreetDeco; drawStreetDeco = function () { drawLandmarksGround(); return _d.apply(this, arguments); }; }
if (typeof drawStreetDecoGlow === 'function') { const _g = drawStreetDecoGlow; drawStreetDecoGlow = function () { const r = _g.apply(this, arguments); drawLandmarksGlow(); return r; }; }
if (typeof drawStoreSigns === 'function') { const _s = drawStoreSigns; drawStoreSigns = function (b) { drawLandmarkWall(b); return _s.apply(this, arguments); }; }
if (typeof staffUpdate === 'function') { const _u = staffUpdate; staffUpdate = function (dt) { const r = _u.apply(this, arguments); if (STAGE.cityLife && S && ((S.lmT = (S.lmT || 0) - (dt || 0)) <= 0)) { S.lmT = 1; lmSceneUpdate(); } return r; }; }
window.__cityLandmarks = () => ({ LM, active: S?.lm?.active || [], off: v => { LM_OFF = !!v; } });   // 시험·점검용
