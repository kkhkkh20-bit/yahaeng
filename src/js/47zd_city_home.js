// ---------------------------------------------------------------- 자유 모드 내 집 꾸미기
// 첫 은신처(차고 옆 내 집) 문 앞에서 [집 꾸미기]. 돈을 들여 하나씩 들인다(한 번 사면 끝, 저장).
//   화분·네온 문패: 문 앞에 보이는 꾸밈
//   새 침대: 최대 체력 +1
//   무기 보관함: 집에서 쉬면 가진 총·투척물 탄약이 가득 찬다
//   보안 카메라: 경찰이 보고 있어도 내 집엔 들어갈 수 있다(뒷문으로)
//   벽 금고: 잡혀갈 때 뺏기는 돈이 절반(30% → 15%)
const HOME_ITEMS = [
  { k: 'pots', name: '화분 두 개', price: 30, note: '문 앞이 조금 사람 사는 집 같아진다' },
  { k: 'neon', name: '네온 문패', price: 80, note: '밤에 문 위가 은은하게 빛난다' },
  { k: 'bed', name: '새 침대', price: 150, note: '최대 체력 +1' },
  { k: 'locker', name: '무기 보관함', price: 250, note: '집에서 쉬면 탄약이 가득 찬다' },
  { k: 'cctv', name: '보안 카메라', price: 300, note: '경찰이 보고 있어도 집엔 뒷문으로 들어간다' },
  { k: 'safe', name: '벽 금고', price: 400, note: '잡혀가도 뺏기는 돈이 절반' },
];
const homeHas = k => !!(S.home && S.home[k]);
function homeInit() { S.home = Object.assign({}, S.homeSaved || {}); S.gunTip = !!S.gunTipSaved; homeApply(); }
function homeApply() { const P = S.player; if (!P) return; const base = P.hpMaxBase || (P.hpMaxBase = P.hpMax); P.hpMax = base + (homeHas('bed') ? 1 : 0); P.hp = Math.min(P.hp, P.hpMax); }
function homeAction() {
  const P = S.player, s = S.safes && S.safes[0]; if (!STAGE.cityLife || !s || P.car || P.trav || S.safeIn) return null;
  if (dist(P.x, P.y, s.x, s.y) > 46) return null;
  const n = HOME_ITEMS.filter(it => homeHas(it.k)).length;
  return { k: 'evAct', label: `집 꾸미기 (${n}/${HOME_ITEMS.length})`, at: { x: s.x + 40, y: s.y - 50 }, fn: openHome };
}
function openHome() {
  const show = () => shopPanel('내 집 꾸미기', HOME_ITEMS.map(it => ({ name: `${it.name} — ${it.note}`, price: homeHas(it.k) ? null : it.price, tag: '들였다', ok: !homeHas(it.k) && (S.cash || 0) >= it.price,
    buy: () => { if (homeHas(it.k) || !pay(it.price)) return; S.home[it.k] = 1; homeApply(); fstat('homeItems'); evBanner(`${it.name} — ${it.note}`, '#9fe0b0'); saveFreeProgress(true); show(); } })));
  show();
}
// 집에서 쉴 때 (47u safeLeave)
function homeRest(s) {
  if (s.i !== 0 || !homeHas('locker') || !S.guns) return '';
  let n = 0; for (const k of Object.keys(S.guns)) { const W = WEAPONS[k]; if (W && S.guns[k] < W.ammo * 3) { S.guns[k] = W.ammo * 3; n++; } }
  return n ? ' · 탄약 보충' : '';
}
// 문 앞 꾸밈 (땅 위, 사람보다 먼저)
function drawHome() {
  const s = S.safes && S.safes[0]; if (!s || !inView(s.x, s.y, 80)) return;
  if (homeHas('pots')) for (const dx of [-30, 30]) { const x = s.x + dx, y = s.y - 6;
    ctx.fillStyle = '#7a4a2e'; ctx.fillRect(x - 6, y - 2, 12, 9); ctx.fillStyle = '#3f8a44'; ctx.beginPath(); ctx.ellipse(x, y - 6, 9, 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#5fb35c'; ctx.fillRect(x - 2, y - 11, 4, 4); }
  if (homeHas('neon')) { const k = .65 + .2 * Math.sin(S.t * 2.4); ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = '#ff5fa2'; ctx.shadowColor = '#ff5fa2'; ctx.shadowBlur = 14; ctx.fillRect(s.x - 18, s.y - 58, 36, 7); ctx.restore(); }
  if (homeHas('cctv')) { ctx.fillStyle = '#d8dde4'; ctx.fillRect(s.x + 22, s.y - 66, 10, 6); ctx.fillStyle = (S.t * 2 | 0) % 2 ? '#ff3b30' : '#5a1a16'; ctx.fillRect(s.x + 23, s.y - 64, 2, 2); }
}
