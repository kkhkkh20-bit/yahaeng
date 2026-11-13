// ---------------------------------------------------------------- 자유 모드 은신처
// 도시 곳곳의 다세대·빌라 세 곳(서로 1500px 넘게 떨어진). 첫 곳은 내 집(차고 있는 집) 옆 현관이라 처음부터 내 것.
// 나머지는 문 앞에서 산다(800만 · 1200만, 저장).
// 들어가기: 경찰이나 헬기 불빛이 나를 보고 있으면 못 들어간다(문을 부순다). 안 보이면 3초 숨어서
//   수배 해제 · 쫓던 경찰 철수 · 체력 회복 · 진행 저장. 화면이 어두워졌다가 문 앞으로 나온다.
// 미니맵·큰 지도에 내 은신처(초록 집), 아직 안 산 곳(흐린 집).
const SAFE_PRICES = [0, 800, 1200], SAFE_HIDE = 3;
function safehouseInit() {
  S.safes = []; if (!STAGE.cityLife) return;
  const G = S.garage, owned = S.safesSaved || {};
  const cands = BLD.filter(b => (b.kind === 'house' || b.kind === 'villa') && !b.vacant && b.x1 - b.x0 >= 3).map(b => ({ b, p: shopFront(b) })).filter(o => o.p);
  const pick = [];
  if (G) pick.push({ b: G.b, p: { x: G.x - 90, y: G.base + 30 } });  // 내 집: 차고 셔터 옆 현관
  for (let i = 0; i < cands.length && pick.length < 3; i++) { const o = cands[(i * 53 + 7) % cands.length]; if (pick.every(q => q.b !== o.b && dist(q.p.x, q.p.y, o.p.x, o.p.y) > 1500)) pick.push(o); }
  pick.forEach((o, i) => S.safes.push({ i, b: o.b, x: o.p.x, y: o.p.y, price: SAFE_PRICES[i] || 1200, owned: i === 0 || !!owned[i] }));
  S.safeIn = null;
}
function safehouseAction() {
  const P = S.player; if (P.car || P.trav || S.safeIn || !S.safes) return null;
  for (const s of S.safes) { if (dist(P.x, P.y, s.x, s.y) > 46) continue;
    if (!s.owned) return { k: 'evAct', label: `은신처 사기 (${s.price}만)`, at: { x: s.x, y: s.y - 50 }, fn: () => safeBuy(s) };
    return { k: 'evAct', label: S.wanted ? '은신처에 숨기 — 열기 식히기' : '은신처 — 쉬고 저장하기', at: { x: s.x, y: s.y - 50 }, fn: () => safeEnter(s) }; }
  return null;
}
function safeBuy(s) {
  if ((S.cash || 0) < s.price) { evBanner(`돈이 모자란다 — ${s.price}만`, '#ff9a86'); return; }
  S.cash -= s.price; s.owned = true; play('loot', 0.5); play('click', 0.5, 0.7); evBanner('은신처를 얻었다 — 쫓기면 여기 숨어라', '#9fe0b0'); fstat('safes'); saveFreeProgress(true);
}
// 지금 나를 보는 눈: 경찰(520px 안, 시야) · 헬기 불빛
function safeWatched() {
  const P = S.player;
  if (S.heli && S.heli.lit) return '헬기 불빛';
  for (const g of S.guards) if (g.police && !g.contact && npcAlive(g) && !g.off && dist(g.x, g.y, P.x, P.y) < 520 && los(g.x, g.y, P.x, P.y)) return '경찰';
  return null;
}
function safeEnter(s) {
  const P = S.player;
  if (S.wanted && !(s.i === 0 && homeHas('cctv'))) { const w = safeWatched(); if (w) { evBanner(`${w}이(가) 보고 있다 — 지금 들어가면 문을 부순다. 따돌려라`, '#ff9a86'); play('thud', 0.4); return; } }
  S.safeIn = s; P.hide = null; P.cover = null; input.aiming = null;
  startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: s.x, y: s.y - 14, f: 0.12 }, { x: s.x, y: s.y - 14, f: 1 }], dur: SAFE_HIDE, phases: [{ to: 1, pose: 'walk' }], face: -Math.PI / 2 });
  play('click', 0.6); after(0.3, () => { S.fade = SAFE_HIDE - 0.4; P.hidden = true; });
  P.trav.end = () => safeLeave(s);
}
const NIGHT_NEWS = ['[어젯밤] 을지로 일대 순찰 강화… 경찰 "야간 신고 늘어"', '[어젯밤] 청계천 산책로 CCTV 추가 설치 결정', '[어젯밤] 인쇄골목 상인회 "밤길이 무섭다"… 구청에 가로등 요청',
  '[어젯밤] 종로 유흥가 단속, 불법 영업 3곳 적발', '[어젯밤] 시민 제보 "모자 쓴 여자를 봤다"… 경찰, 신빙성 낮다고', '[어젯밤] 비 그친 을지로, 새벽까지 택시 잡기 전쟁'];
function safeLeave(s) {
  const P = S.player; S.safeIn = null; P.hidden = false;
  const had = S.wanted || 0;
  S.wanted = 0; S.wantLost = 0; S.alevel = 0; S.alevelT = 0; if (S.heli) S.heli.leave = true;
  for (const g of S.guards) { if (g.police && !g.off && !g.contact && !g.beat && typeof despawnCop === 'function' && !inView(g.x, g.y, 40)) despawnCop(g); else if (['ALERT', 'SEARCH', 'SUSPICIOUS', 'CHECK'].includes(g.state) && (g.police || !g.hit)) { g.state = 'RETURN'; g.path = null; g.icon = null; g.meter = 0; } }
  P.hp = P.hpMax; P.x = s.x; P.y = s.y + 6; play('click', 0.5);
  if (typeof cityDisguiseOff === 'function' && had) cityDisguiseOff();
  saveFreeProgress(true); fstat('safeUses');
  // 자고 나면 다음 날 밤 (이 도시는 밤에만 움직인다): 며칠째인지 세고, 그동안 일어난 일이 뉴스로 지나간다
  const n = S.night = (S.night || 1) + 1; if (S.dealer2) S.dealer2.sulkUntil = 0;
  const extra = homeRest(s); saveFreeProgress(true);
  evBanner(`${n}일째 밤 · ` + (had ? '열기 식힘 — 수배 해제 · 체력 회복 · 저장됨' : '체력 회복 · 저장됨') + extra, '#9fe0b0');
  newsTicker(NIGHT_NEWS[n % NIGHT_NEWS.length]);
}
// 문 앞 표시 (가까울 때): 초록 문패 / 안 산 곳은 흐린 '매물'
function drawSafes() {
  if (!S.safes) return; const P = S.player;
  for (const s of S.safes) { if (!inView(s.x, s.y, 60) || dist(P.x, P.y, s.x, s.y) > 360) continue;
    const pu = .45 + .3 * Math.sin(S.t * 3 + s.i);
    ctx.strokeStyle = s.owned ? `rgba(120,230,150,${pu})` : `rgba(220,220,200,${pu * 0.6})`; ctx.lineWidth = 2; ctx.setLineDash(s.owned ? [] : [4, 4]);
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 20, 8, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (!STAGE.noPrompts) infoTag(s.x, s.y + 20, s.owned ? '은신처' : `은신처 매물 ${s.price}만`, s.owned ? '#8fe0a8' : '#cfcab8', .9); }
}
function drawMiniSafes(x, T) {
  for (const s of S.safes || []) { x.fillStyle = s.owned ? '#78e696' : 'rgba(200,200,190,.45)'; const px = T(s.x), py = T(s.y);
    x.beginPath(); x.moveTo(px, py - 4); x.lineTo(px + 4, py); x.lineTo(px + 3, py); x.lineTo(px + 3, py + 3); x.lineTo(px - 3, py + 3); x.lineTo(px - 3, py); x.lineTo(px - 4, py); x.closePath(); x.fill(); }
}
